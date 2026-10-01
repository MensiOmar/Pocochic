import {
  errorBodySchema,
  promoQuoteSchema,
  styleDetailSchema,
  type PromoQuote,
  type StoredCartLine,
  type StyleDetail,
} from "@pocochic/contracts";
import { api } from "./api";

export type StyleLoad =
  | { slug: string; status: "ok"; style: StyleDetail }
  | { slug: string; status: "missing" }
  | { slug: string; status: "failed" };

export type LinePatch = {
  variantId: string;
  availableQty: number;
  unitPriceCents: number;
  displayName: string;
  itemCode: string;
  size: string;
  reference: string;
  imagePath: string | null;
};

export type RefreshPlan = {
  patches: LinePatch[];
  removeIds: string[];
  complete: boolean;
  priceChanged: boolean;
  qtyLowered: boolean;
  removed: boolean;
};

export type PromoErrorKind = "promo_unknown" | "promo_exhausted" | "promo_min_count" | "unavailable" | "unconfirmed";

export function lineMeta(line: { itemCode: string; reference: string; size: string }): string {
  return [`#${line.itemCode}`, line.reference.trim(), line.size.trim()].filter((part) => part.length > 0).join(" · ");
}

export function planRefresh(lines: StoredCartLine[], results: StyleLoad[]): RefreshPlan {
  const bySlug = new Map(results.map((result) => [result.slug, result]));
  const plan: RefreshPlan = {
    patches: [],
    removeIds: [],
    complete: true,
    priceChanged: false,
    qtyLowered: false,
    removed: false,
  };
  for (const line of lines) {
    const result = bySlug.get(line.slug);
    if (!result || result.status === "failed") {
      plan.complete = false;
      continue;
    }
    if (result.status === "missing") {
      plan.removeIds.push(line.variantId);
      plan.removed = true;
      continue;
    }
    const variant = result.style.variants.find((item) => item.id === line.variantId);
    if (!variant || variant.availableQty <= 0) {
      plan.removeIds.push(line.variantId);
      plan.removed = true;
      continue;
    }
    if (variant.priceCents !== line.unitPriceCents) plan.priceChanged = true;
    if (line.quantity > variant.availableQty) plan.qtyLowered = true;
    plan.patches.push({
      variantId: line.variantId,
      availableQty: variant.availableQty,
      unitPriceCents: variant.priceCents,
      displayName: result.style.displayName,
      itemCode: result.style.itemCode,
      size: variant.size,
      reference: variant.reference,
      imagePath: result.style.imagePath,
    });
  }
  return plan;
}

export async function refreshCart(lines: StoredCartLine[]): Promise<RefreshPlan> {
  const slugs = [...new Set(lines.map((line) => line.slug))];
  const results = await Promise.all(slugs.map(loadStyle));
  return planRefresh(lines, results);
}

async function loadStyle(slug: string): Promise<StyleLoad> {
  try {
    const res = await api.styles[":slug"].$get({ param: { slug } });
    if (res.status === 404) return { slug, status: "missing" };
    if (!res.ok) return { slug, status: "failed" };
    const style = styleDetailSchema.safeParse(await res.json());
    if (!style.success) return { slug, status: "failed" };
    return { slug, status: "ok", style: style.data };
  } catch {
    return { slug, status: "failed" };
  }
}

export async function requestPromoQuote(
  code: string,
  lines: Array<{ variantId: string; quantity: number }>,
): Promise<{ ok: true; quote: PromoQuote } | { ok: false; kind: PromoErrorKind }> {
  try {
    const res = await api.promos.quote.$post({ json: { code, lines } });
    if (res.ok) return { ok: true, quote: promoQuoteSchema.parse(await res.json()) };
    const body = errorBodySchema.safeParse(await res.json());
    const codeName = body.success ? body.data.error.code : "validation";
    if (codeName === "promo_unknown" || codeName === "promo_exhausted" || codeName === "promo_min_count") {
      return { ok: false, kind: codeName };
    }
    return { ok: false, kind: "unavailable" };
  } catch {
    return { ok: false, kind: "unavailable" };
  }
}
