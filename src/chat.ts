import Anthropic from "@anthropic-ai/sdk";

import {
  getOrderStatus,
  type GetOrderStatusInput,
} from "./tools/getOrderStatus.js";

// uses ANTHROPIC_API_KEY from the environment (.env)
const anthropic = new Anthropic();

const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
const DEFAULT_MAX_TOKENS = 20000;
const MAX_TOOL_ROUNDS = 10;
const DEFAULT_TOOL_STATUS = "Working on it...";
const TOOL_STATUS_MESSAGES: Record<string, string> = {
  getOrderStatus: "Looking up your order...",
};

export interface ChatOptions {
  model?: string;
  maxTokens?: number;
  systemPrompt?: string;
  tools?: Anthropic.Tool[];
  // Called with a customer-friendly message when a tool starts running.
  onStatus?: (message: string) => void;
}

export interface Chat {
  send(userInput: string): Promise<string>;
  reset(): void;
}

// One chat = one conversation with its own history.
export function createChat(options: ChatOptions = {}): Chat {
  const model = options.model ?? DEFAULT_MODEL;
  const maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;
  const history: Anthropic.MessageParam[] = [];

  return {
    async send(userInput) {
      const startLength = history.length;

      addUserMessage(history, userInput);

      try {
        const params: Anthropic.MessageCreateParams = {
          model,
          max_tokens: maxTokens,
          messages: history,
          // temperature: 0.7,
        };

        if (options.systemPrompt) {
          params.system = options.systemPrompt;
        }

        if (options.tools) {
          params.tools = options.tools;
        }

        // const stream = await anthropic.messages.stream(params);
        let response = await anthropic.messages.create(params);

        /*
        for await (const chunk of stream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            process.stdout.write(chunk.delta.text);
          }
        }

        const msg = await stream.finalMessage();
        */

        addAssistantMessage(history, response.content);

        // Run requested tools and send results back until Claude gives a final answer.
        for (let round = 0; response.stop_reason === "tool_use"; round++) {
          if (round >= MAX_TOOL_ROUNDS) {
            throw new Error("Too many tool-use rounds in one turn");
          }
          addUserMessage(history, await runTools(response, options.onStatus));
          response = await anthropic.messages.create(params);
          addAssistantMessage(history, response.content);
        }

        return response.content
          .filter(
            (block): block is Anthropic.TextBlock => block.type === "text",
          )
          .map((block) => block.text)
          .join("");
      } catch (err) {
        history.length = startLength; // drop the failed turn so the next request stays valid
        throw err;
      }
    },

    reset() {
      history.length = 0;
    },
  };
}

function addUserMessage(
  history: Anthropic.MessageParam[],
  message: string | Anthropic.ToolResultBlockParam[],
): void {
  history.push({ role: "user", content: message });
}

function addAssistantMessage(
  history: Anthropic.MessageParam[],
  message: Anthropic.ContentBlock[],
): void {
  history.push({ role: "assistant", content: message });
}

// Tool calls from one response run concurrently; results keep request order.
async function runTools(
  response: Anthropic.Message,
  onStatus?: (message: string) => void,
): Promise<Anthropic.ToolResultBlockParam[]> {
  const toolRequests = response.content.filter(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
  );

  return Promise.all(
    toolRequests.map(
      async (toolRequest): Promise<Anthropic.ToolResultBlockParam> => {
        onStatus?.(
          TOOL_STATUS_MESSAGES[toolRequest.name] ?? DEFAULT_TOOL_STATUS,
        );
        try {
          const callResult = await runTool(toolRequest.name, toolRequest.input);
          return {
            type: "tool_result",
            tool_use_id: toolRequest.id,
            content: JSON.stringify(callResult),
            is_error: false,
          };
        } catch (e) {
          console.error(`Failed to run tool ${toolRequest.name}:`, e);
          return {
            type: "tool_result",
            tool_use_id: toolRequest.id,
            content: e instanceof Error ? e.message : String(e),
            is_error: true,
          };
        }
      },
    ),
  );
}

// TODO: harden tool execution for real DB / network calls:
//  - timeout: race the handler against a timer (AbortSignal.timeout) so a hung call fails fast;
//    try `getOrderStatus` with ORD-TIMEOUT to simulate.
//  - error classification: map timeouts / network errors (ORD-NETERR) / 5xx to a
//    customer-friendly is_error message instead of leaking raw error text (hosts, stack traces) to the model.
//  - retry: retry transient failures (timeout, ECONNREFUSED, 503) with a small backoff; never retry validation errors.
async function runTool(name: string, input: unknown): Promise<unknown> {
  switch (name) {
    case "getOrderStatus":
      return await getOrderStatus(input as GetOrderStatusInput);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
