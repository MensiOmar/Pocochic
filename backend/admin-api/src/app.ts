import { zValidator } from "@hono/zod-validator";
import { sessionRequestSchema, transitionRequestSchema } from "@pocochic/contracts";
import { transitionOrder } from "@pocochic/db/commerce";
import { d1Port } from "@pocochic/db/sql";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { factory } from "./env.js";
import { getOrder, listOrders } from "./orders-query.js";
import { clearSession, issueSession, readSession, safeEqual, sessionToken } from "./session-cookie.js";

function error(c: { json: (body: unknown, status?: number) => Response }, status: number, code: string) {
  return c.json({ error: { code, message: code } }, status);
}

export const app = factory.createApp()
  .use("*", logger())
  .use("*", secureHeaders())
  .use("*", cors({
    origin: (origin, c) => {
      const allowed = c.env.ADMIN_WEB_ORIGIN;
      if (!origin || origin === allowed) return origin || allowed;
      return "";
    },
    credentials: true,
    allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type"],
  }))
  .use("*", async (c, next) => {
    c.set("requestId", crypto.randomUUID());
    if (c.req.path !== "/health") c.set("sql", d1Port(c.env.DB));
    await next();
  })
  .get("/health", (c) => c.json({ status: "ok", service: "admin-api" }))
  .post("/session", zValidator("json", sessionRequestSchema), async (c) => {
    const secret = c.env.ADMIN_SESSION_SECRET ?? "";
    if (!secret || !safeEqual(c.req.valid("json").secret, secret)) {
      return error(c, 401, "unauthorized");
    }
    await issueSession(c, secret);
    return c.json({ ok: true });
  })
  .delete("/session", (c) => {
    clearSession(c);
    return c.json({ ok: true });
  })
  .use("*", async (c, next) => {
    if (!c.req.path.startsWith("/orders")) return next();
    if (!(await readSession(c.env.ADMIN_SESSION_SECRET, sessionToken(c)))) {
      return error(c, 401, "unauthorized");
    }
    await next();
  })
  .get("/orders", async (c) => {
    const status = c.req.query("status") ?? "";
    const limit = Math.min(Number(c.req.query("limit") ?? "50") || 50, 100);
    const offset = Number(c.req.query("offset") ?? "0") || 0;
    return c.json(await listOrders(c.var.sql, status, limit, offset));
  })
  .get("/orders/:id", async (c) => {
    const order = await getOrder(c.var.sql, c.req.param("id"));
    if (!order) return error(c, 404, "not_found");
    return c.json(order);
  })
  .post("/orders/:id/transitions", zValidator("json", transitionRequestSchema), async (c) => {
    const result = await transitionOrder(c.var.sql, {
      orderId: c.req.param("id"),
      to: c.req.valid("json").to,
    });
    if (!result.ok) return error(c, result.code === "not_found" ? 404 : 409, result.code);
    const order = await getOrder(c.var.sql, c.req.param("id"));
    return c.json(order);
  });

export type AdminAppType = typeof app;
