# Open WebUI Theme

A standalone AI console for Panyakorn's VPS-hosted Ollama stack, using a Claude-like workspace layout with the `panyakorn.com` dark emerald visual system.

## Goals

- Match the visual language of `panyakorn.com`:
  - dark emerald background
  - Geist/Noto Sans Thai typography
  - Claude-like left rail, centered conversation canvas, and floating composer
  - soft green accent glow
  - clean developer-dashboard layout
- Prototype an Open WebUI-style chat interface.
- Connect the composer to `portfolio-backend-2026` at `/api/ai/chat`.

## Local development

```bash
pnpm install
pnpm dev
```

Open:

```text
http://localhost:3000
```

By default the production UI calls the same-origin Caddy proxy:

```text
/api/ai/chat
```

Override for local backend testing:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8888 pnpm dev
```

## Verification

```bash
pnpm lint
NEXT_PUBLIC_API_URL= pnpm build
```

## Current scope

Included:
- live chat UI using TanStack AI React state with a custom backend SSE fetcher calling `NEXT_PUBLIC_API_URL/api/ai/chat/stream`
- local chat sessions/recents persisted in `localStorage`, with New chat creating a fresh session
- sidebar navigation
- model/status panel
- skills/context panel mock
- prompt composer
- responsive layout

Not included yet:
- authentication
- persistence
- real chat streaming

## Production integration

Current production stack:

```text
ai.panyakorn.com/api/* -> backend:8888 -> http://ollama:11434 -> panyakorn-local:latest
```

Production domain:

```text
https://ai.panyakorn.com
```

Ollama should remain internal-only and should not be exposed publicly.
