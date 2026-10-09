# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm start` — run `index.ts` via `tsx`, loading `.env` (missing `.env` is tolerated). Starts the Express server and the interactive console.
- `npm run dev` — same, restarting on file changes.
- `npm run typecheck` — `tsc --noEmit`. Run this after edits.
- `npm run lint` / `npm run lint:fix` — ESLint (flat config in `eslint.config.mjs`, `typescript-eslint` recommended + `eslint-config-prettier`). TypeScript is pinned to `~6.0.0` because `typescript-eslint` doesn't support TS 7 yet; revisit when it does.
- `npm run build` — compile to `dist/` (gitignored). Not needed for `npm start`.
- No test framework yet (`npm test` is the npm placeholder), so there is no single-test command.

Config: `ANTHROPIC_API_KEY` (required for chat), optional `ANTHROPIC_MODEL` (default `claude-sonnet-5-5`) and `PORT` (default 3000), all read from `.env`.

## Architecture

An e-commerce customer support assistant. Layers are deliberately separated so new front ends (web chat, public API) can reuse the AI logic:

- `src/chat.ts` — all Anthropic API logic. `createChat(options)` returns a chat session `{ send, reset }` that owns its own message history, so use one chat per conversation/user rather than sharing one. Options: `model`, `maxTokens`, `systemPrompt`, `tools` (`Anthropic.Tool[]`), `onStatus` (callback with a customer-friendly "Looking up your order..." message when a tool starts; messages live in `TOOL_STATUS_MESSAGES`). Keep this module free of Express/readline imports.
  - `send()` appends the user message and calls `messages.create`. While `stop_reason === "tool_use"` it runs the requested tools (`runTools` → `runTool`), appends the `tool_result` blocks as a user message, and calls the API again (capped by `MAX_TOOL_ROUNDS`). It returns the concatenated text blocks of the final response.
  - On failure, history is truncated back to its length before the turn (a turn can add several messages) and the error is rethrown so the caller decides how to report it.
- `src/tools/<toolName>.ts` — one file per tool, exporting the tool definition (`<toolName>Tool`) and its handler (`<toolName>`). Handlers return structured JSON-serializable results (e.g. `{ error: true, message }` for expected failures such as an unknown order), which `runTools` stringifies. Adding a tool = new file + pass the definition in `createChat({ tools })` + add a `case` in `runTool` in `src/chat.ts`.
- `src/mockOrders.ts` — in-memory mock order data (`ORD-1000xx`) backing `getOrderStatus`. Swap for a real data source later.
- `index.ts` — entry point: Express app (`GET /`, `POST /echo`) plus `startConsole()`, a readline REPL that creates a chat (with `BASE_SYSTEM_PROMPT` and the registered tools) and prints a static `WELCOME_MESSAGE` on start, then `assistant> <reply>`. Type `exit` to quit. New transports should call `createChat()` rather than touching the SDK directly.

No guardrails (e.g. customer identity verification) exist on tools yet; they are planned to be added later.

## Conventions

- TypeScript, strict, `module: nodenext` with CommonJS package type. Relative imports use the output extension (`"./src/chat.js"`), which resolves to the `.ts` file under both `tsc` and `tsx`.
- Double quotes, trailing commas (Prettier-style formatting).
- History helpers `addUserMessage` / `addAssistantMessage` are module-level functions in `src/chat.ts` that take the `history` array as their first argument; use them instead of calling `history.push` directly.
- Naming, editing and tool-layout rules (camelCase everywhere, never delete commented-out code, keep diffs scoped) are in `.claude/rules/code-conventions.md`.
