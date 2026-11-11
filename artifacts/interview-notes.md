# Interview notes — Platform Ops Console (Habib Noor)

Portfolio artifact for discussing webhook/event **delivery operations** patterns (live streaming + marketplace payments **domains only** — synthetic data, no employer affiliation).

## Module map

| Module | Path | Responsibility |
|--------|------|----------------|
| Shared types | `packages/shared/src/index.ts` | Delivery/audit DTOs, `SYNTHETIC_FIXTURE` provenance |
| DB + migrations | `packages/api/src/db.ts` | SQLite schema, auto-seed on empty DB |
| Fixtures | `packages/api/src/seed.ts` | Synthetic deliveries, dead letters, seed audit row |
| Auth | `packages/api/src/auth.ts` | Demo credential check, signed cookie sessions |
| Deliveries service | `packages/api/src/services/deliveries.ts` | Filtered list + detail |
| Replay service | `packages/api/src/services/replay.ts` | Simulated replay + idempotency persistence |
| HTTP routes | `packages/api/src/routes.ts` | Fastify handlers, Zod validation |
| SPA | `packages/web/src/pages/*` | Overview, table filters, detail, replay UI |
| API client | `packages/web/src/api/client.ts` | `fetch` wrapper, `ApiError` |

## Design tradeoffs

1. **SQLite vs in-memory** — Chose SQLite so replay/idempotency survive refresh; honestly documented file path vs pretending durability.
2. **Cookie vs JWT** — Cookies reduce XSS token exposure compared to localStorage JWT for this demo; tradeoff is harder cross-domain deployment (acceptable locally/Docker).
3. **Monolithic static serve in Docker** — `SERVE_WEB=true` serves Vite build from API to keep compose one container; dev keeps Vite HMR proxy.
4. **Simulation-only replay** — Avoids accidental real HTTP; interview talking point for safe sandboxes.
5. **Idempotency-Key header** — Mirrors payment APIs; stored result prevents duplicate audit rows on retry.

## Failure experiments (run locally)

| Experiment | Steps | Expected |
|------------|-------|----------|
| Auth rejection | Login with wrong password | 401, no session cookie |
| Protected route | `GET /api/overview` without cookie | 401 |
| Filter edge | `status=dead_letter` | Only 2 fixture rows |
| Replay idempotency | Same `Idempotency-Key` twice | Second response `duplicate: true`, one audit row |
| Replay conflict | Replay after success (`replay_eligible=0`) | 400/409 style error |
| Missing delivery | `GET /api/deliveries/nope` | 404 UI error state |
| DB reset | `npm run db:seed` | Fresh synthetic data |

## Talking points for TikTok LIVE / Shopee-style domains (generic)

- **At-least-once delivery** → retries increase `attempt_count`; dead letter after max attempts.
- **Idempotent consumers** → `Idempotency-Key` on operator replay (analogous to payment webhooks).
- **Audit trail** → who replayed what, when, with explicit simulation wording.
- **Operator UX** — filter noisy failure queues, inspect payload preview before action.

---

## Practice Q&A (35)

### Architecture & product

1. **What problem does this console solve?**  
   Gives operators visibility into webhook delivery health and a controlled path to re-queue dead-lettered events, with auditability.

2. **Why synthetic data?**  
   Demonstrates patterns without leaking real metrics or implying production access.

3. **How is this relevant to live streaming ops?**  
   Live room/gift/moderation event types show high-volume fan-out and urgency; status filters mimic triaging failed fan-out.

4. **How is this relevant to marketplace payments?**  
   Settlement/refund events emphasize idempotency and dead-letter handling common in payment webhooks.

5. **What would you add for production?**  
   Real queue (Kafka/SQS), worker pool, signature verification, RBAC, metrics, paging cursors, OTel tracing.

### Frontend

6. **Why React Router layout routes?**  
   Shared nav/shell with nested pages; auth gate at layout boundary.

7. **How do you keep the table accessible?**  
   Semantic `<table>`, `scope` on headers, `aria-labelledby`, status badges with `aria-label`.

8. **How does filtering work?**  
   Controlled inputs → query params → API validates with Zod → SQL `WHERE` clauses.

9. **How do you surface errors?**  
   `ApiError` with `role="alert"`; loading states with `role="status"`.

10. **Why a global banner?**  
    Persistent disclaimer about synthetic data and simulated replay.

11. **How would you test UI further?**  
    Integration tests with MSW mocking `/api`; a11y axe checks; visual regression for tables.

12. **Why Vite?**  
    Fast dev feedback, simple proxy to API, small config surface.

### Backend & API

13. **Why Fastify?**  
    Lightweight, schema-friendly, excellent `inject()` for tests without binding ports.

14. **How is auth enforced?**  
    `preHandler: requireAuth` on protected routes; session stored server-side in SQLite.

15. **Are demo credentials secret?**  
    No — documented in README; still validated server-side with timing-safe compare.

16. **Why store sessions in SQLite?**  
    Keeps demo simple and inspectable; production might use Redis with TTL.

17. **How do you bound requests?**  
    Zod limits on `limit`, `offset`, string lengths; max page size 100.

18. **Why Zod over manual checks?**  
    Single source for validation errors and type narrowing.

19. **What does health endpoint return?**  
    `persistence: sqlite` and data provenance constant — honest about stack.

20. **How would you structure logs?**  
    Structured JSON, redact cookies/passwords (already redacted in prod logger config).

### Data & replay

21. **Explain dead-letter state.**  
    Delivery exhausted retries; row mirrored in `dead_letters` for operator focus.

22. **What happens on simulated replay?**  
    Delivery → `pending`, dead letter ineligible, audit entry, idempotency record — no HTTP.

23. **Why idempotency keys?**  
    Network retries must not double-apply operator actions or duplicate audits.

24. **How do you detect duplicate replay?**  
    Primary key on `idempotency_key`; return stored JSON with `duplicate: true`.

25. **Why mark `replay_eligible=0` after success?**  
    Prevents repeated operator replay on same dead letter without new failure cycle.

26. **SQLite WAL — why?**  
    Readers don’t block writers as harshly during local demos.

27. **How to reset demo?**  
    `npm run db:seed` deletes DB file and re-seeds.

### Testing & CI

28. **What do API tests cover?**  
    Auth success/failure, filter, idempotent replay, 404.

29. **What do UI tests cover?**  
    Status badge a11y, table empty + row render.

30. **Why build shared before tests?**  
    NodeNext resolution needs `dist` types for workspace imports.

31. **What does CI run?**  
    `npm ci`, typecheck, lint, test, build, Docker image build.

32. **How would you test replay concurrency?**  
    Transaction boundaries in `replayDeadLetter`; stress test two parallel POSTs same key.

### Security

33. **CSRF considerations?**  
    Cookie `SameSite=Lax`; demo scope; production needs CSRF tokens for mutations if cross-site.

34. **SQL injection?**  
    Prepared statements throughout; dynamic WHERE uses named params only.

35. **Would you log payloads?**  
    Only short previews in fixtures; avoid PII; redact secrets.

### Behavioral / system design extras

36. **Compare push vs pull recovery.**  
    Replay pushes back to pending queue; alternative is object store re-drive batch.

37. **How to shard this by tenant?**  
    Add `tenant_id` column + composite indexes; enforce in auth middleware.

38. **Backpressure signal?**  
    Rising `pending` + `failed` counts on overview; alert thresholds in real system.

39. **Ordering guarantees?**  
    This demo doesn’t guarantee per-partition ordering; discuss Kafka partition keys in interview.

40. **How to document AI assistance honestly?**  
    README states generic AI help and that author may not have reviewed every line.

---

## Quick command cheat sheet

```bash
npm ci && npm run dev
npm test
docker compose up --build
```

Demo login: `demo@platform-ops.local` / `demo-ops-console-2026`
