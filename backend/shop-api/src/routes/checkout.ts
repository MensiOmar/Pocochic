import { zValidator } from "@hono/zod-validator";
import { checkoutRequestSchema } from "@pocochic/contracts";
import { placeOrder } from "@pocochic/db/commerce";
import { factory } from "../env.js";
import { errorJson, validationHook } from "../http.js";
import { notifyShopOfOrder } from "../mail.js";

async function thankYou(sql: { get<T>(sql: string, params?: readonly unknown[]): Promise<T | undefined> }, locale: string) {
  const row = await sql.get<{ body: string; image_path: string | null }>(
    "SELECT body, image_path FROM thank_you WHERE locale = ?",
    [locale],
  );
  if (row?.body.trim()) return { locale: locale as "fr" | "ar" | "en", body: row.body, imagePath: row.image_path };
  const source = await sql.get<{ body: string; image_path: string | null }>(
    "SELECT body, image_path FROM thank_you WHERE locale = 'source'",
  );
  return { locale: "source" as const, body: source?.body ?? "", imagePath: source?.image_path ?? null };
}

export const checkoutRoutes = factory.createApp().post(
  "/checkout",
  zValidator("json", checkoutRequestSchema, validationHook),
  async (c) => {
    const body = c.req.valid("json");
    const result = await placeOrder(c.var.sql, {
      locale: body.locale,
      customer: body.customer,
      lines: body.lines,
      promoCode: body.promoCode,
      idempotencyKey: body.idempotencyKey,
    });
    if (!result.ok) {
      const status = result.code === "stock_conflict" || result.code === "promo_exhausted" ? 409 : 400;
      return errorJson(c, status, result.code, result.code, result.items);
    }
    if (!result.replayed) {
      const job = notifyShopOfOrder(c.env, c.var.sql, result.order);
      if (c.env.AWAIT_ALERT === "1" || !c.executionCtx) await job;
      else c.executionCtx.waitUntil(job);
    }
    return c.json({
      ...result.order,
      thankYou: await thankYou(c.var.sql, body.locale),
    }, 201);
  },
);
