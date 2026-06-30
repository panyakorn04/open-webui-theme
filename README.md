# Open WebUI Theme

A standalone UI shell for Panyakorn's future Open WebUI experience, inspired by the current `panyakorn.com` dark emerald terminal theme.

This repo intentionally does not connect to Open WebUI, Ollama, or any backend API yet. It is a visual/theme foundation only.

## Goals

- Match the visual language of `panyakorn.com`:
  - dark emerald background
  - Geist/Noto Sans Thai typography
  - terminal-like panels
  - soft green accent glow
  - clean developer-dashboard layout
- Prototype an Open WebUI-style chat interface.
- Keep API integration out of scope until the design shell is approved.

## Local development

```bash
pnpm install
pnpm dev
```

Open:

```text
http://localhost:3000
```

## Verification

```bash
pnpm lint
pnpm build
```

## Current scope

Included:
- static chat UI shell
- sidebar navigation
- model selector mock
- skills/context panel mock
- prompt composer mock
- responsive layout

Not included yet:
- Open WebUI API integration
- Ollama API integration
- authentication
- persistence
- real chat streaming
- deployment workflow

## Future integration notes

Expected eventual internal Open WebUI/Ollama stack:

```text
Open WebUI -> http://ollama:11434 -> panyakorn-glm:latest
```

The production domain may be something like:

```text
https://ai.panyakorn.com
```

Ollama should remain internal-only and should not be exposed publicly.
