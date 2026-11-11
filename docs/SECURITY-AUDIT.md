# Dependency audit notes

Counts from `npm audit` after `npm ci`. Policy: `npm run audit:check` (fails on **any** critical/high in full or production trees).

## Audit timeline

| Milestone | All deps | Production (`--omit=dev`) |
|-----------|----------|---------------------------|
| main @ `b723f57` | 22 — 2 crit, 7 high, 11 mod, 2 low | 8 — 6 high, 2 mod |
| PR #2 first pass @ `57194cb` | 10 — 2 crit, 0 high, 8 mod | **0** |
| PR #2 + Vitest 5 @ current | **7 moderate only** | **0** |

Critical/high cleared by upgrading runtime packages (Fastify stack, React Router, Zod 4, Vite) and **Vitest 5.1.0** (removes `tinypool` / vulnerable `@vitest/mocker` path from Vitest 3.x). **Passing CI does not mean zero advisories** — 7 **moderate** items remain.

## Residual moderate (honest boundary)

| Advisory | Path | Exposure |
|----------|------|----------|
| `minimatch` ReDoS/DoS (GHSA-g3hv-75wg-m249) | `typescript-eslint` → `@typescript-eslint/typescript-estree` → `minimatch@9.x` | **Lint/dev only** — not loaded by API or production bundle; npm reports no fixed `typescript-eslint` release without downgrade |

No `npm audit ignore` entries. No overrides that hide audit IDs.

## `cookie` package paths (verified via `npm ls cookie`)

| Version | Introduced by | Used for |
|---------|---------------|----------|
| `cookie@2.0.2` | **`@fastify/cookie`** (registered in `app.ts` for session cookies) | **Primary auth session path** |
| `cookie@2.0.2` | `fastify` → `light-my-request` (deduped) | Fastify HTTP test/inject helpers; same major as server cookie parsing — **not** the separate SPA router |
| `cookie@1.1.1` | `react-router` (web production dep) | Client router cookie utilities |

Node **22+** is required because `cookie@2.0.2` declares `engines.node: '>=22'`, pulled by **`@fastify/cookie`** and Fastify’s dependency chain.

## Vitest 5 migration notes

- Both workspaces use `vitest@5.1.0` with `vite@6.4.6` (root `overrides` prevent npm from resolving Vitest’s optional `vite@8` peer during install).
- `packages/api` adds `vite` devDependency for Vitest’s runner.
- `vitest.config.ts` **`include: src/**`** — Vitest 5 otherwise re-ran compiled `dist/*.test.js`, doubling tests (8 → 13).

## Policy script

`scripts/npm-audit-policy.mjs` exits non-zero on critical/high in **either** full or production audits; warns on moderate count only.
