import { beforeEach, describe, expect, it } from "vitest";
import "./test-setup.js";
import { resetDbForTests } from "./db.js";
import { buildApp } from "./app.js";
import { DEMO_CREDENTIALS } from "./config.js";

describe("API", () => {
  beforeEach(() => {
    resetDbForTests();
  });

  it("rejects unauthenticated overview", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/api/overview" });
    expect(res.statusCode).toBe(401);
  });

  it("accepts demo login and rejects bad password", async () => {
    const app = await buildApp();
    const bad = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: DEMO_CREDENTIALS.email, password: "wrong" },
    });
    expect(bad.statusCode).toBe(401);

    const good = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: {
        email: DEMO_CREDENTIALS.email,
        password: DEMO_CREDENTIALS.password,
      },
    });
    expect(good.statusCode).toBe(200);
    const cookie = good.headers["set-cookie"];
    expect(cookie).toBeDefined();

    const overview = await app.inject({
      method: "GET",
      url: "/api/overview",
      headers: { cookie: String(cookie) },
    });
    expect(overview.statusCode).toBe(200);
    const body = overview.json();
    expect(body.provenance).toBe("SYNTHETIC_FIXTURE");
    expect(body.totalDeliveries).toBeGreaterThan(0);
  });

  it("filters deliveries by status", async () => {
    const app = await buildApp();
    const login = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: {
        email: DEMO_CREDENTIALS.email,
        password: DEMO_CREDENTIALS.password,
      },
    });
    const cookie = login.headers["set-cookie"];

    const res = await app.inject({
      method: "GET",
      url: "/api/deliveries?status=dead_letter",
      headers: { cookie: String(cookie) },
    });
    expect(res.statusCode).toBe(200);
    const data = res.json() as { items: Array<{ status: string }> };
    expect(data.items.every((d) => d.status === "dead_letter")).toBe(true);
  });

  it("replays dead letter with idempotency", async () => {
    const app = await buildApp();
    const login = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: {
        email: DEMO_CREDENTIALS.email,
        password: DEMO_CREDENTIALS.password,
      },
    });
    const cookie = login.headers["set-cookie"];
    const key = "test-idem-key-001";

    const first = await app.inject({
      method: "POST",
      url: "/api/dead-letters/dl_syn_001/replay",
      headers: { cookie: String(cookie), "idempotency-key": key },
    });
    expect(first.statusCode).toBe(200);
    const firstBody = first.json();
    expect(firstBody.simulated).toBe(true);
    expect(firstBody.duplicate).toBe(false);

    const second = await app.inject({
      method: "POST",
      url: "/api/dead-letters/dl_syn_001/replay",
      headers: { cookie: String(cookie), "idempotency-key": key },
    });
    expect(second.statusCode).toBe(200);
    expect(second.json().duplicate).toBe(true);

    const audit = await app.inject({
      method: "GET",
      url: "/api/audit",
      headers: { cookie: String(cookie) },
    });
    const auditBody = audit.json() as { items: Array<{ action: string }> };
    const replays = auditBody.items.filter((a) => a.action === "DEAD_LETTER_REPLAY_SIMULATED");
    expect(replays.length).toBe(1);
  });

  it("returns 404 for missing delivery", async () => {
    const app = await buildApp();
    const login = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: {
        email: DEMO_CREDENTIALS.email,
        password: DEMO_CREDENTIALS.password,
      },
    });
    const res = await app.inject({
      method: "GET",
      url: "/api/deliveries/does-not-exist",
      headers: { cookie: String(login.headers["set-cookie"]) },
    });
    expect(res.statusCode).toBe(404);
  });
});
