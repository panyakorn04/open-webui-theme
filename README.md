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
bun install
bun run dev
```

Open:

```text
http://localhost:3000
```

By default the production UI calls the same-origin Caddy proxy:

```text
/api/ai/chat
```

Override for local backend testing and local model menu testing:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8888 \
NEXT_PUBLIC_AI_MODELS=panyakorn-local:latest,qwen2.5-coder:7b \
bun run dev
```

## Verification

```bash
bun run lint
bun run test
NEXT_PUBLIC_API_URL= bun run build
```

## Current scope

Included:
- live chat UI using TanStack AI React state with a custom backend SSE fetcher calling `NEXT_PUBLIC_API_URL/api/ai/chat/stream`
- model selector populated from `NEXT_PUBLIC_AI_MODELS` and sent to the backend as `model`
- local chat sessions/recents persisted in `localStorage`, with New chat creating a fresh session
- sidebar navigation
- model/status panel
- skills/context panel mock
- prompt composer
- responsive layout

Not included yet:
- authentication
- backend persistence

## Production integration

Current production stack:

```text
chat.panyakorn.com/api/* -> allowlisted chat routes -> backend:8888 -> http://ollama:11434 -> selected allowed Ollama model
```

Production domain:

```text
https://chat.panyakorn.com
```

Ollama should remain internal-only and should not be exposed publicly.

The production environment requires these GitHub Actions secrets:

- `VPS_HOST`
- `VPS_USER`
- `VPS_SSH_KEY`
- `VPS_HOST_KEY` containing the pinned SSH key type and public key, for example `ssh-ed25519 AAAA...`

`chat.panyakorn.com` must resolve to the production VPS before the deploy job starts so Caddy can provision and verify TLS without deploying an unrouteable release.
