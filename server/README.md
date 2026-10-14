# Hive Block Producer reference server

Small Node service for versus play and Hive login. See [../docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md).

- `relay.js`: HTTP endpoints `GET /auth/challenge` and `POST /auth/verify`, plus a WebSocket relay that forwards
  protocol v1 messages between players in the same room.
- `hive-verify.js`: checks that a Keychain signature recovers to one of the account's posting keys on chain.
- `test.js`: end-to-end checks with a throwaway key and a fake chain lookup.

Environment: `PORT` (default 8787), `ALLOWED_ORIGIN` (default `https://d-bot-2026.github.io`).
Sessions and rooms live in memory; restart clears them. Use a database before running more than one instance.
