import { zValidator } from "@hono/zod-validator";
import { promoQuoteRequestSchema } from "@pocochic/contracts";
import { quotePromo, validateCartLines, type DiscountRow } from "@pocochic/db/commerce";
import { factory } from "../env.js";
import { errorJson, validationHook } from "../http.js";

export const promoRoutes = factory.createApp().post(
  "/promos/quote",
  zValidator("json", promoQuoteRequestSchema, validationHook),
  async (c) => {
    const body = c.req.valid("json");
    if (!validateCartLines(body.lines).ok) return errorJson(c, 400, "validation", "Invalid request");
    const ids = body.lines.map((line) => line.variantId);
    const marks = ids.map(() => "?").join(", ");
    const variants = await c.var.sql.all<{ id: string; price_cents: number }>(
      `SELECT id, price_cents FROM variants WHERE id IN (${marks})`,
      ids,
    );
    if (variants.length !== ids.length) return errorJson(c, 400, "validation", "Unknown variant");
    if (variants.some((variant) => !Number.isInteger(variant.price_cents) || variant.price_cents < 0)) {
      return errorJson(c, 400, "validation", "Invalid request");
    }
    const discount = await c.var.sql.get<DiscountRow>(
      "SELECT code, type, percent_off, amount_cents, min_count, available_number, used_number FROM discounts WHERE code = ?",
      [body.code],
    );
    const quote = quotePromo(
      discount,
      body.lines.map((line) => ({
        unitPriceCents: variants.find((variant) => variant.id === line.variantId)!.price_cents,
        quantity: line.quantity,
      })),
      body.code,
    );
    if (!quote.ok) {
      const status = quote.code === "promo_exhausted" ? 409 : 400;
      return errorJson(c, status, quote.code, quote.code);
    }
    return c.json({
      code: body.code,
      type: quote.type,
      discountCents: quote.discountCents,
      itemsCents: quote.itemsCents,
      deliveryCents: quote.deliveryCents,
      totalCents: quote.totalCents,
    });
  },
);
