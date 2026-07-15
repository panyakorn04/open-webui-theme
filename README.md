# Open WebUI Theme

[![CI and Deploy Open WebUI Theme](https://github.com/panyakorn04/open-webui-theme/actions/workflows/deploy-vps.yml/badge.svg)](https://github.com/panyakorn04/open-webui-theme/actions/workflows/deploy-vps.yml)

A standalone, responsive AI console for Panyakorn's VPS-hosted AI stack. The interface combines a Claude-style workspace with the dark emerald visual language of [panyakorn.com](https://panyakorn.com), while chat requests flow through `portfolio-backend-2026` instead of exposing a model provider directly.

- Production: [https://chat.panyakorn.com](https://chat.panyakorn.com)
- Repository: [https://github.com/panyakorn04/open-webui-theme](https://github.com/panyakorn04/open-webui-theme)
- Package manager: Bun 1.3.14
- Current application version: see `package.json`

## What is shipped

- Streaming AI chat powered by TanStack AI and the backend SSE endpoint.
- Automatic JSON fallback when streaming returns `404`, `405`, `415`, `501`, or no response body.
- Runtime model selection from the configured `NEXT_PUBLIC_AI_MODELS` list.
- Per-message model labels and visible connection, loading, stop, timeout, and error states.
- Local conversation history with create, reopen, and delete actions.
- Cross-tab session synchronization, deletion tombstones, and guarded storage writes.
- Quick prompts for Docker Compose, deployment, and n8n tasks.
- Responsive three-panel workspace with a keyboard-accessible mobile drawer.
- Visual viewport handling for mobile browser and virtual-keyboard resizing.
- Dark emerald glass UI using Geist, Geist Mono, and Noto Sans Thai.
- Version display sourced from `package.json`.

This repository currently does **not** provide user authentication or server-side conversation persistence. Chat history is stored in the browser's `localStorage`.

## Architecture

```text
Browser
  ├─ Next.js 16 / React 19 UI
  ├─ TanStack AI chat state
  └─ localStorage conversation history
           │
           │ POST /api/ai/chat/stream
           │ fallback: POST /api/ai/chat
           ▼
Caddy on chat.panyakorn.com
  ├─ allows only the two public chat routes
  ├─ returns 404 for other /api/* routes
  └─ proxies chat requests to backend:8888
           │
           ▼
portfolio-backend-2026
  ├─ owns request validation and model policy
  └─ owns the model-provider integration
           │
           ▼
Model provider (must remain behind the backend boundary)
```

In production, `NEXT_PUBLIC_API_URL` is intentionally empty so the browser uses same-origin `/api/...` paths. This repository configures Caddy's public routing boundary through its deployment script; the backend repository and production Compose configuration own downstream model validation, provider routing, and network isolation.

## Technology

| Area | Implementation |
| --- | --- |
| Framework | Next.js 16 App Router, standalone output |
| UI | React 19, TypeScript 5, custom CSS |
| AI client | TanStack AI React/client packages |
| Package manager | Bun 1.3.14 with `bun.lock` |
| Tests | Bun test |
| Type checking | `tsc --noEmit` |
| Container build | Multi-stage Bun builder and non-root Node 22 Alpine runtime, with base-image digest pins and an application health check |
| Registry | GitHub Container Registry (GHCR) |
| Edge proxy | Caddy |
| CI/CD | GitHub Actions, Buildx cache, Trivy, native SSH deployment |

## Requirements

- Bun 1.3.14
- Node-compatible environment for Next.js tooling
- A compatible backend exposing the chat endpoints described below
- Docker for the optional local container flow; Docker Compose for the VPS deployment topology

## Local development

```bash
git clone https://github.com/panyakorn04/open-webui-theme.git
cd open-webui-theme
bun install
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

The default configuration renders the UI but local chat calls same-origin endpoints that this frontend does not implement. Start a compatible backend separately, then configure its public base URL for chat and model-menu testing:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8888 \
NEXT_PUBLIC_AI_MODELS=panyakorn-local:latest,qwen2.5-coder:7b,llama3.2:3b \
bun run dev
```

When the backend runs on a different origin, it must allow browser requests from `http://localhost:3000` through its CORS policy. Alternatively, place a same-origin development reverse proxy in front of both services. There is no committed `.env.example`; both variables are optional for rendering the UI, but a reachable backend is required for working chat.

## Environment contract

| Variable | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | empty / same-origin | Public backend base URL used before `/api/ai/...`. Production keeps this empty and routes through Caddy. |
| `NEXT_PUBLIC_AI_MODELS` | `panyakorn-local:latest` | Comma-separated models shown in the selector. The first entry is the default model. |

These are `NEXT_PUBLIC_*` values: they are embedded into the browser bundle at build time and must never contain secrets. The backend must independently enforce its own model allowlist; the frontend selector is not a security boundary.

## Backend API contract

### Streaming request

```http
POST /api/ai/chat/stream
Content-Type: application/json
```

```json
{
  "model": "panyakorn-local:latest",
  "messages": [
    { "role": "user", "content": "Hello" }
  ],
  "runId": "generated-by-tanstack-ai",
  "threadId": "local-session-id"
}
```

The response must be an SSE stream containing TanStack AI-compatible event payloads in `data:` frames and ending with `RUN_FINISHED` or `RUN_ERROR`. The client accepts LF, CRLF, and CR event boundaries, skips malformed JSON frames, and rejects incomplete streams.

### Non-streaming fallback

When the stream endpoint returns `404`, `405`, `415`, or `501`, or returns no body, the client retries:

```http
POST /api/ai/chat
Content-Type: application/json
```

```json
{
  "model": "panyakorn-local:latest",
  "messages": [
    { "role": "user", "content": "Hello" }
  ]
}
```

Expected response shape:

```json
{
  "ok": true,
  "data": {
    "model": "panyakorn-local:latest",
    "message": {
      "role": "assistant",
      "content": "Hello"
    },
    "done": true
  }
}
```

Only the latest ten non-empty system, user, and assistant messages are sent. Each request has a 120-second timeout and can be cancelled from the composer.

## Commands

| Command | Purpose |
| --- | --- |
| `bun run dev` | Start the Next.js development server. |
| `bun run lint` | Run TypeScript checking with `tsc --noEmit`. |
| `bun run test` | Run Bun unit tests. |
| `bun run skills:check` | Verify required repository agent skills are installed. |
| `bun run build` | Check required skills and create the production build. |
| `bun run verify` | Run lint, tests, and production build. |
| `bun run start` | Start a standard local Next.js production server. |
| `bun run hooks:install` | Configure Git to use the repository-managed hooks. |
| `bun run versign` | Increment and stage the patch version manually. |

`bun install` runs the guarded `prepare` script, which installs `.githooks` only when Git and a worktree are available. The pre-commit hook increments `package.json`'s patch version, while pre-push runs lint, tests, and build. Set `SKIP_VERIFY=1` only when intentionally bypassing the local pre-push gate.

## Tests

The current test suite covers:

- selected-model forwarding at request time;
- the 120-second timeout behavior with short injected test timeouts;
- CRLF-compatible and malformed-frame-tolerant SSE parsing;
- streaming-to-JSON fallback behavior and terminal errors;
- local chat-session parsing, migration, merging, deletion, and storage locking.

Run the complete local gate with:

```bash
bun run verify
```

## Docker

Build the same standalone production image used by CI:

```bash
docker build \
  --build-arg NEXT_PUBLIC_API_URL= \
  --build-arg NEXT_PUBLIC_AI_MODELS=panyakorn-local:latest \
  -t open-webui-theme:local .

docker run --rm -p 3000:3000 open-webui-theme:local
```

The Dockerfile pins both base-image digests, caches Bun downloads with BuildKit, builds the application with Bun, and copies only Next.js standalone output into a minimal Node 22 Alpine runtime. The final container runs as the unprivileged `nextjs` user, does not include npm or npx, handles `SIGTERM`, and exposes a Node-based HTTP health check without adding curl to the runtime image.

## CI/CD

The `CI and Deploy Open WebUI Theme` workflow runs on pull requests, pushes to `main`, and manual dispatches.

### Pull requests

1. Install dependencies with the frozen Bun lockfile.
2. Run TypeScript checks, tests, required-skill validation, and a production build.
3. Build and start a Linux/amd64 production Docker image.
4. Wait for the image-defined health check, run an external HTTP probe, and always remove the test container.
5. Publish explicit validation commit statuses.

### Pushes to `main` and manual deployments

1. Run the same application validation gate with third-party actions pinned to immutable commit SHAs.
2. Build an immutable `ghcr.io/panyakorn04/open-webui-theme:<commit-sha>` image plus `latest` using the GitHub Actions cache.
3. Start the exact release image, wait for its Docker health check, run an external HTTP probe, and always clean up the test container.
4. Scan OS and library dependencies with Trivy; fixed HIGH or CRITICAL findings block publishing.
5. Push the tested and scanned image to GHCR.
6. Verify production DNS before connecting to the VPS.
7. Deploy over pinned-host-key native SSH using a short-lived GHCR token.
8. Update the Compose overlay and Caddy route, start/recreate the application and Caddy services, then validate and reload Caddy.
9. Check container reachability, public TLS, the two allowlisted API routes, and the `/api/*` deny boundary.
10. Roll back Compose, Caddy, and the previous immutable image if deployment or health checks fail.
11. Retain recent images, prune old layers, set the commit status, and optionally notify Discord.

### GitHub configuration

Required repository or production-environment secrets:

- `VPS_HOST`
- `VPS_USER`
- `VPS_SSH_KEY`
- `VPS_HOST_KEY` — pinned SSH key type and public key, for example `ssh-ed25519 AAAA...`

Optional configuration:

- Repository variable `NEXT_PUBLIC_AI_MODELS`
- Secret `DISCORD_WEBHOOK_URL` for success and failure notifications

`GITHUB_TOKEN` is used for GHCR publishing and the short-lived production pull; no long-lived registry token is required. `chat.panyakorn.com` must resolve to the configured VPS before deployment starts.

On the VPS, the deployment user must be able to read `/opt/apps/.env`, write the Compose overlay and Caddyfile, and access Docker. A typical least-privilege `.env` ownership is `root:deploy` with mode `640` when the deployment account belongs to the `deploy` group.

## Project structure

```text
app/
├── _components/             # Workspace, sidebar, composer, messages, context UI
├── _hooks/                  # Chat state, auto-scroll, and responsive drawer behavior
├── error.tsx                # App Router error boundary
├── loading.tsx              # Route loading state
├── layout.tsx               # Fonts and metadata
├── page.tsx                 # Minimal workspace composition entry
└── globals.css              # Dark emerald responsive design system
lib/
├── backend-chat-fetcher.ts  # SSE client, timeout, model forwarding, JSON fallback
├── chat-sessions.ts         # Versioned local persistence and cross-tab merge helpers
├── chat-message-utils.ts    # Message text/title utilities
├── version.ts               # Package-version export
└── *.test.ts                # Bun unit tests
.github/
├── scripts/                 # VPS deployment and rollback script
└── workflows/               # Validation, image publishing, and production deployment
.githooks/                   # Version bump and pre-push verification
Dockerfile                   # Multi-stage standalone production image
```

## Security boundaries

- The frontend has no authentication and must not receive private credentials.
- The two chat routes are publicly reachable at the Caddy edge. The backend must enforce the intended access policy plus rate limits, payload/token limits, model allowlists, and other resource controls before forwarding expensive inference requests.
- `NEXT_PUBLIC_*` values are public build-time configuration.
- The backend, not the model selector, is responsible for model authorization and request validation.
- Caddy exposes only `/api/ai/chat` and `/api/ai/chat/stream`; other `/api/*` paths return `404`.
- Any Ollama or other model-provider endpoint must remain behind the backend boundary and must not be exposed directly by this frontend deployment.
- GHCR credentials are held in a temporary Docker config and removed after deployment.
- SSH host verification is pinned through `VPS_HOST_KEY`.
- Conversation content remains in each browser's `localStorage`; clearing site data removes it.

## Related project

- [`portfolio-backend-2026`](https://github.com/panyakorn04/portfolio-backend-2026) — separate backend repository serving the production chat routes.

## License

No license file is currently included. Copyright remains with the repository owner unless a license is added.
