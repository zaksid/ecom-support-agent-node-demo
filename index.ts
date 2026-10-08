import express from "express";
import readline from "node:readline";

import { createChat } from "./src/chat.js";
import { getOrderStatusTool } from "./src/tools/getOrderStatus.js";

const CLI_CUSTOMER_PROMPT = "customer> ";
const CLI_ASSISTANT_PROMPT = "assistant> ";
const PORT = process.env.PORT || 3000;
const WELCOME_MESSAGE =
  "\n\nHi! I'm the support assistant for our online store. I can help with your order-related requests, such as checking an order's status. Just tell me what you need.\n\n";
const BASE_SYSTEM_PROMPT =
  `You are a friendly, concise customer support assistant for an online store.

You can help customers with three things: order status, shipment tracking, and refunds.

Right now you have only the getOrderStatus tool. You cannot verify identity, or issue refunds.\n\n` +
  // + `Because of that:
  // - Never invent order details, statuses, tracking numbers, dates, or amounts.
  // - If a customer asks about a specific order (for example "where is order ORD-123456?"), say honestly that you can't look it up yet, and that once lookups are available they will first need to verify their identity.
  // - You may explain in general terms what you can help with.`

  `Keep replies short: a few sentences at most. Be warm and direct, and ask a question only when you need one.`;

const app = express();

app.use(express.json());

app.get("/", (req, res) => res.send("Echo server is running"));

app.post("/echo", (req, res) => {
  res.json({ echo: req.body.message ?? "" });
});

const server = app.listen(PORT, () => {
  // console.log(`Express listening on http://localhost:${PORT}`);
  startConsole();
});

function startConsole() {
  const chat = createChat({
    systemPrompt: BASE_SYSTEM_PROMPT,
    tools: [getOrderStatusTool],
    onStatus: (message) => console.log(`${CLI_ASSISTANT_PROMPT} ${message}`),
  });
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: CLI_CUSTOMER_PROMPT,
  });

  console.log(`====================${WELCOME_MESSAGE}====================`);
  rl.prompt();

  rl.on("line", async (line: string) => {
    const input = line.trim();

    if (input === "exit") return rl.close();

    if (input) {
      try {
        console.log(`${CLI_ASSISTANT_PROMPT} ${await chat.send(input)}`);
      } catch (err) {
        console.error(`error: ${err instanceof Error ? err.message : err}`);
      }
    }

    rl.prompt();
  });

  rl.on("close", () => {
    console.log("Bye!");
    server.close();
    process.exit(0);
  });
}
