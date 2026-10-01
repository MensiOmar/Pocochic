import { zValidator } from "@hono/zod-validator";
import { promoQuoteRequestSchema } from "@pocochic/contracts";
import { quotePromo, type DiscountRow, type PromoType } from "@pocochic/db/commerce";
import { factory } from "../env.js";
import { errorJson, validationHook } from "../http.js";

export const promoRoutes = factory.createApp().post(
  "/promos/quote",
  zValidator("json", promoQuoteRequestSchema, validationHook),
  async (c) => {
    const body = c.req.valid("json");
    const ids = body.lines.map((line) => line.variantId);
    const marks = ids.map(() => "?").join(", ");
    const variants = await c.var.sql.all<{ id: string; price_cents: number }>(
      `SELECT id, price_cents FROM variants WHERE id IN (${marks})`,
      ids,
    );
    if (variants.length !== new Set(ids).size) return errorJson(c, 400, "validation", "Unknown variant");
    const discount = await c.var.sql.get<DiscountRow>(
      "SELECT code, type, percent_off, amount_cents, min_count, available_number, used_number FROM discounts WHERE code = ?",
      [body.code],
    );
    const quote = quotePromo(
      discount ? { ...discount, type: discount.type as PromoType } : null,
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
