# Repository Agent Instructions

## Skills

- This repository keeps project agent skills under `.agents/skills/`.
- Before reviewing or changing Next.js code, read `.agents/skills/nextjs-best-practices/SKILL.md`, `.agents/skills/nextjs-code-review/SKILL.md`, and their references.
- Before running a production build, make sure the required Next.js skills exist by running `bun run skills:check`.
- The `build` script already runs `bun run skills:check` before `next build`, so CI and local `bun run build` fail fast if required Next.js skills are missing.

## Package manager

- Use Bun for this repo: `bun install`, `bun run lint`, `bun run build`.
- Do not use npm/pnpm commands for verification unless explicitly requested.
