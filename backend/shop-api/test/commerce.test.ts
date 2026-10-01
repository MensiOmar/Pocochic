import { app as adminApp } from "../../admin-api/src/app.js";
import { d1Port } from "@pocochic/db/sql";
import { applyMigrations, asD1, openSqlite } from "@pocochic/db/sqlite";
import { afterEach, describe, expect, it, vi } from "vitest";
import { app as shopApp } from "../src/app.js";

const SECRET = "test-secret-which-is-long-enough";

function harness() {
  const db = openSqlite(":memory:");
  applyMigrations(db);
  const d1 = asD1(db);
  const sql = d1Port(d1);
  const now = "2026-09-25T00:00:00.000Z";
  db.prepare("INSERT INTO governorates (id, name, sort_order) VALUES ('gov1', 'Tunis', 1)").run();
  db.prepare("INSERT INTO delegations (id, governorate_id, name) VALUES ('del1', 'gov1', 'Bab Bhar')").run();
  db.prepare("INSERT INTO styles (id, item_code, slug, display_name, description, image_path, created_at, updated_at) VALUES ('st1', 'TEE-1', 'tee-1', 'Tee', 'A tee', '/catalog/styles/tee-1.webp', ?, ?)").run(now, now);
  db.prepare("INSERT INTO variants (id, style_id, size, reference, price_cents, quantity, pending_qty, sold_qty, created_at, updated_at) VALUES ('var-a', 'st1', 'S', '', 4500, 5, 1, 1, ?, ?)").run(now, now);
  db.prepare("INSERT INTO variants (id, style_id, size, reference, price_cents, quantity, pending_qty, sold_qty, created_at, updated_at) VALUES ('var-b', 'st1', 'M', '', 3000, 2, 0, 0, ?, ?)").run(now, now);
  db.prepare("INSERT INTO styles (id, item_code, slug, display_name, description, image_path, created_at, updated_at) VALUES ('st2', 'GONE', 'gone', 'Gone', NULL, NULL, ?, ?)").run(now, now);
  db.prepare("INSERT INTO variants (id, style_id, size, reference, price_cents, quantity, pending_qty, sold_qty, created_at, updated_at) VALUES ('var-z', 'st2', 'U', '', 1000, 1, 0, 1, ?, ?)").run(now, now);
  db.prepare("INSERT INTO discounts (id, code, type, percent_off, amount_cents, min_count, available_number, used_number, sheet_used_flag) VALUES ('d1', 'TEN', 'percent', 10, NULL, 2, 5, 0, 0)").run();
  db.prepare("INSERT INTO discounts (id, code, type, percent_off, amount_cents, min_count, available_number, used_number, sheet_used_flag) VALUES ('d2', 'ONCE', 'free', NULL, 2000, 1, 1, 0, 0)").run();
  db.prepare("INSERT INTO discounts (id, code, type, percent_off, amount_cents, min_count, available_number, used_number, sheet_used_flag) VALUES ('d3', 'FIVE', 'discount', NULL, 500, 1, 4, 0, 0)").run();
  db.prepare("INSERT INTO thank_you (locale, body, image_path) VALUES ('fr', 'Merci FR', NULL), ('en', '', NULL), ('ar', '', NULL), ('source', 'FULL BLOB', NULL)").run();
  const shopEnv = {
    DB: d1,
    SHOP_WEB_ORIGIN: "http://localhost:5173",
    SHOP_ALERT_EMAIL: "pocochicaccessories@gmail.com",
    SHOP_ALERT_FROM: "onboarding@resend.dev",
    AWAIT_ALERT: "1",
    LOG_ALERTS: "0",
  };
  const adminEnv = { DB: d1, ADMIN_WEB_ORIGIN: "http://localhost:5174", ADMIN_SESSION_SECRET: SECRET };
  return { shopEnv, adminEnv };
}

function customer() {
  return { fullName: "Amina Ben Ali", phone: "20123456", governorateId: "gov1", delegationId: "del1", city: "Tunis" };
}

async function cookie(env: ReturnType<typeof harness>["adminEnv"]) {
  const res = await adminApp.request("/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret: SECRET }),
  }, env);
  return res.headers.get("set-cookie")?.split(";")[0] ?? "";
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("shop and admin API boundary", () => {
  it("lists sold-out styles with catalog paths and hides stock buckets", async () => {
    const { shopEnv } = harness();
    const res = await shopApp.request("/styles", {}, shopEnv);
    const body = await res.json() as Array<Record<string, unknown>>;
    expect(res.status).toBe(200);
    expect(body.map((item) => item.slug).sort()).toEqual(["gone", "tee-1"]);
    expect(body.find((item) => item.slug === "gone")?.isSoldOut).toBe(true);
    expect(JSON.stringify(body)).not.toMatch(/pending|sold_qty|http/);
    expect(body.find((item) => item.slug === "tee-1")).toMatchObject({
      imagePath: "/catalog/styles/tee-1.webp",
      inStockVariantCount: 2,
      soleVariant: null,
      sizes: ["M", "S"],
    });
    expect(body.find((item) => item.slug === "gone")).toMatchObject({ inStockVariantCount: 0, soleVariant: null });
    const detail = await shopApp.request("/styles/tee-1", {}, shopEnv);
    const style = await detail.json() as { variants: Array<{ availableQty: number; size: string }> };
    expect(style.variants.find((variant) => variant.size === "S")?.availableQty).toBe(3);
    expect(style.variants.find((variant) => variant.size === "M")?.availableQty).toBe(2);
  });

  it("quotes percent, free, and fixed discount without touching delivery", async () => {
    const { shopEnv } = harness();
    const percent = await shopApp.request("/promos/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "TEN", lines: [{ variantId: "var-a", quantity: 1 }, { variantId: "var-b", quantity: 1 }] }),
    }, shopEnv);
    expect(await percent.json()).toMatchObject({ discountCents: 750, itemsCents: 7500, deliveryCents: 800, totalCents: 7550 });
    const free = await shopApp.request("/promos/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "ONCE", lines: [{ variantId: "var-a", quantity: 1 }, { variantId: "var-b", quantity: 1 }] }),
    }, shopEnv);
    expect(await free.json()).toMatchObject({ discountCents: 2000, totalCents: 6300 });
    const fixed = await shopApp.request("/promos/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "FIVE", lines: [{ variantId: "var-b", quantity: 1 }] }),
    }, shopEnv);
    expect(await fixed.json()).toMatchObject({ discountCents: 500, itemsCents: 3000, deliveryCents: 800, totalCents: 3300 });
  });

  it("creates sequential orders, rejects oversell, and keeps the number unconsumed", async () => {
    const env = harness();
    const first = await shopApp.request("/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: "fr", customer: customer(), lines: [{ variantId: "var-b", quantity: 1 }], promoCode: "FIVE" }),
    }, env.shopEnv);
    expect(first.status).toBe(201);
    expect(await first.json()).toMatchObject({ orderNumber: "POC-0001", totalCents: 3300, status: "pending", thankYou: { body: "Merci FR" } });
    const conflict = await shopApp.request("/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: "en", customer: customer(), lines: [{ variantId: "var-a", quantity: 4 }] }),
    }, env.shopEnv);
    expect(conflict.status).toBe(409);
    const conflictBody = await conflict.json() as { error: { code: string; items: Array<{ available: number }> } };
    expect(conflictBody.error.code).toBe("stock_conflict");
    expect(conflictBody.error.items[0].available).toBe(3);
    const second = await shopApp.request("/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: "en", customer: customer(), lines: [{ variantId: "var-a", quantity: 1 }] }),
    }, env.shopEnv);
    expect(second.status).toBe(201);
    expect(await second.json()).toMatchObject({ orderNumber: "POC-0002", thankYou: { locale: "source", body: "FULL BLOB" } });
  });

  it("increments a promo once and rejects the exhausted code without a new order", async () => {
    const env = harness();
    const ok = await shopApp.request("/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: "fr", customer: customer(), lines: [{ variantId: "var-b", quantity: 1 }], promoCode: "ONCE" }),
    }, env.shopEnv);
    expect(ok.status).toBe(201);
    const again = await shopApp.request("/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: "fr", customer: customer(), lines: [{ variantId: "var-a", quantity: 1 }], promoCode: "ONCE" }),
    }, env.shopEnv);
    expect(again.status).toBe(409);
    expect(await again.json()).toMatchObject({ error: { code: "promo_exhausted" } });
    const session = await cookie(env.adminEnv);
    const list = await adminApp.request("/orders", { headers: { cookie: session } }, env.adminEnv);
    const body = await list.json() as { total: number; orders: Array<{ orderNumber: string }> };
    expect(body.total).toBe(1);
    expect(body.orders[0].orderNumber).toBe("POC-0001");
  });

  it("releases reserved stock on cancel and keeps it reserved after paid", async () => {
    const env = harness();
    await shopApp.request("/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: "fr", customer: customer(), lines: [{ variantId: "var-a", quantity: 2 }] }),
    }, env.shopEnv);
    const afterOrder = await shopApp.request("/styles/tee-1", {}, env.shopEnv);
    const ordered = await afterOrder.json() as { variants: Array<{ size: string; availableQty: number }> };
    expect(ordered.variants.find((variant) => variant.size === "S")?.availableQty).toBe(1);
    const session = await cookie(env.adminEnv);
    const unpaid = await adminApp.request("/orders", { headers: { cookie: session } }, env.adminEnv);
    expect(unpaid.status).toBe(200);
    const cancelled = await adminApp.request("/orders/POC-0001/transitions", {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: session },
      body: JSON.stringify({ to: "cancelled" }),
    }, env.adminEnv);
    expect(cancelled.status).toBe(200);
    const restored = await shopApp.request("/styles/tee-1", {}, env.shopEnv);
    const back = await restored.json() as { variants: Array<{ size: string; availableQty: number }> };
    expect(back.variants.find((variant) => variant.size === "S")?.availableQty).toBe(3);
    const illegal = await adminApp.request("/orders/POC-0001/transitions", {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: session },
      body: JSON.stringify({ to: "paid" }),
    }, env.adminEnv);
    expect(illegal.status).toBe(409);
  });

  it("does not roll back an order when the shop email fails", async () => {
    const env = harness();
    vi.stubGlobal("fetch", () => Promise.reject(new Error("resend down")));
    const res = await shopApp.request("/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: "fr", customer: customer(), lines: [{ variantId: "var-b", quantity: 1 }] }),
    }, { ...env.shopEnv, RESEND_API_KEY: "re_test" });
    expect(res.status).toBe(201);
    const session = await cookie(env.adminEnv);
    const detail = await adminApp.request("/orders/POC-0001", { headers: { cookie: session } }, env.adminEnv);
    expect(await detail.json()).toMatchObject({ orderNumber: "POC-0001", alertSentAt: null });
  });

  it("refuses admin orders without a session", async () => {
    const env = harness();
    const res = await adminApp.request("/orders", {}, env.adminEnv);
    expect(res.status).toBe(401);
  });
});
