# Dependency audit notes

Counts from `npm audit` after `npm ci` — re-run locally to refresh.

## Before / after (main @ `b723f57` → remediation branch)

| Scope | Before | After | Notes |
|-------|--------|-------|-------|
| **All deps** | 22 total — 2 critical, 7 high, 11 moderate, 2 low | 10 total — 2 critical, 0 high, 8 moderate, 0 low | Critical dev-only (`tinypool` via Vitest 3.x) remains |
| **Production** (`--omit=dev`) | 8 total — 0 critical, 6 high, 2 moderate | **0** | Fastify, static, React Router, Zod, Vite runtime paths upgraded |

**Not claimed as “fixed” because tests pass** — production tree is clean per `npm audit --omit=dev`; full tree still lists dev-toolchain advisories with no non-breaking npm fix (Vitest → 5.x would be a major test-runner migration; Vitest 4.x hit an npm peer-resolution error in this workspace).

## Policy (`npm run audit:check`)

| Scope | CI behavior |
|-------|-------------|
| **Production** (`npm audit --omit=dev`) | **Fail** on `critical` or `high` |
| **All dependencies** | Report counts; dev `critical` may remain documented |

Passing `audit:check` means production tree met the gate at lockfile time — **not** a guarantee every transitive dev tool advisory is eliminated.

## Node.js `cookie@2.x` engine

`fastify` → `light-my-request` depends on `cookie@2.x`, which declares `engines.node: >=22`. The repo pins **Node 22** (`.nvmrc`, `package.json` `engines`, Docker) so CI matches runtime declarations.

## Runtime relevance (before remediation baseline)

| Advisory bucket | Typical path | Runtime exposure in this repo |
|-----------------|--------------|------------------------------|
| `tinypool` / `vitest` critical | dev test runner | **None** in production deploy (tests only) |
| `esbuild` moderate | Vite/tsx dev servers | **None** in production API process |
| `eslint` / `minimatch` | lint | **None** at runtime |
| `fastify` / `@fastify/static` | API + Docker static | **Yes** — upgraded intentionally |
| `react-router` / `zod` | browser + request validation | **Yes** — upgraded intentionally |

## Residual risk (honest)

After supported upgrades, some advisories may remain where npm reports **no fixed version** (e.g. certain `minimatch` paths inside ESLint tooling) or where fixes require major migrations we deferred. Those are **dev-toolchain** or **low practical risk** for this demo’s threat model — still listed by `npm audit` until upstream publishes fixes.

See PR description for **before/after** vulnerability counts.
