import express from "express";
import readline from "node:readline";

import { createChat } from "./src/chat.js";

const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json());

app.get("/", (req, res) => res.send("Echo server is running"));

app.post("/echo", (req, res) => {
  res.json({ echo: req.body.message ?? "" });
});

const server = app.listen(PORT, () => {
  console.log(`Express listening on http://localhost:${PORT}`);
  startConsole();
});

function startConsole(): void {
  const chat = createChat();
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "you> ",
  });

  console.log(
    'Interactive mode: type a message and press Enter. Type "exit" to quit.',
  );
  rl.prompt();

  rl.on("line", async (line: string) => {
    const input = line.trim();

    if (input === "exit") return rl.close();

    if (input) {
      try {
        console.log(`claude: ${await chat.send(input)}`);
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
