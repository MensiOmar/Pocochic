import { describe, expect, it } from "vitest";
import { app } from "../src/app.js";

describe("admin health", () => {
  it("is open without a session", async () => {
    const res = await app.request("/health", {}, {
      DB: { prepare: () => { throw new Error("unused"); }, batch: async () => [] },
      ADMIN_WEB_ORIGIN: "http://localhost:5174",
      ADMIN_SESSION_SECRET: "test-secret-which-is-long-enough",
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: "ok", service: "admin-api" });
  });
});
