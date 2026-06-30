# Open WebUI Theme

A standalone AI console for Panyakorn's VPS-hosted Ollama stack, inspired by the current `panyakorn.com` dark emerald terminal theme.

## Goals

- Match the visual language of `panyakorn.com`:
  - dark emerald background
  - Geist/Noto Sans Thai typography
  - terminal-like panels
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

By default the UI calls:

```text
https://api.panyakorn.com/api/ai/chat
```

Override for local backend testing:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8888 pnpm dev
```

## Verification

```bash
pnpm lint
NEXT_PUBLIC_API_URL=https://api.panyakorn.com pnpm build
```

## Current scope

Included:
- live chat UI calling `NEXT_PUBLIC_API_URL/api/ai/chat`
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
ai.panyakorn.com -> https://api.panyakorn.com/api/ai/chat -> http://ollama:11434 -> panyakorn-local:latest
```

Production domain:

```text
https://ai.panyakorn.com
```

Ollama should remain internal-only and should not be exposed publicly.
