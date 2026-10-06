# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm start` — run `index.ts` via `tsx`, loading `.env` (missing `.env` is tolerated). Starts the Express server and the interactive console.
- `npm run dev` — same, restarting on file changes.
- `npm run typecheck` — `tsc --noEmit`. Run this after edits; there is no linter.
- `npm run build` — compile to `dist/` (gitignored). Not needed for `npm start`.
- No test framework yet (`npm test` is the npm placeholder).

Config: `ANTHROPIC_API_KEY` (required for chat), optional `ANTHROPIC_MODEL` (default `claude-sonnet-5-5`) and `PORT` (default 3000), all read from `.env`.

## Architecture

Two layers, deliberately separated so new front ends (web chat, public API) can reuse the AI logic:

- `src/chat.ts` — all Anthropic API logic. `createChat(options)` returns a chat session `{ send, reset }` that owns its own message history, so use one chat per conversation/user rather than sharing one. `send()` appends the user message, calls `messages.create`, appends the assistant reply, and returns the concatenated text blocks; on failure it pops the user message (keeping history valid) and rethrows so the caller decides how to report it. Options: `model`, `maxTokens`, `systemPrompt`. Keep this module free of Express/readline imports.
- `index.ts` — entry point: Express app (`GET /`, `POST /echo`) plus `startConsole()`, a readline REPL that creates a chat and prints `claude: <reply>`. Type `exit` to quit. New transports should call `createChat()` rather than touching the SDK directly.

## Conventions

- TypeScript, strict, `module: nodenext` with CommonJS package type. Relative imports use the output extension (`"./src/chat.js"`), which resolves to the `.ts` file under both `tsc` and `tsx`.
- Double quotes, trailing commas (Prettier-style formatting).
- History helpers `addUserMessage` / `addAssistantMessage` are module-level functions in `src/chat.ts` that take the `history` array as their first argument; use them instead of calling `history.push` directly.
