import Anthropic from "@anthropic-ai/sdk";

// uses ANTHROPIC_API_KEY from the environment (.env)
const anthropic = new Anthropic();

const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
const DEFAULT_MAX_TOKENS = 20000;

export interface ChatOptions {
  model?: string;
  maxTokens?: number;
  systemPrompt?: string;
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

        // const stream = await anthropic.messages.stream(params);
        const msg = await anthropic.messages.create(params);

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

        addAssistantMessage(history, msg.content);
        return msg.content
          .filter(
            (block): block is Anthropic.TextBlock => block.type === "text",
          )
          .map((block) => block.text)
          .join("");
      } catch (err) {
        history.pop(); // drop the failed turn so the next request stays valid
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
  message: string,
): void {
  history.push({ role: "user", content: message });
}

function addAssistantMessage(
  history: Anthropic.MessageParam[],
  message: Anthropic.ContentBlock[],
): void {
  history.push({ role: "assistant", content: message });
}
