import { factory } from "../env.js";
import { errorJson } from "../http.js";

type FlatRow = {
  slug: string;
  item_code: string;
  display_name: string;
  image_path: string | null;
  variant_id: string;
  size: string;
  reference: string;
  price_cents: number;
  available_qty: number;
};

const flatSql = `
  SELECT s.slug, s.item_code, s.display_name, s.image_path,
         v.id AS variant_id, v.size, v.reference, v.price_cents,
         (v.quantity - v.pending_qty - v.sold_qty) AS available_qty
  FROM styles s
  JOIN variants v ON v.style_id = s.id
`;

const flatOrder = " ORDER BY s.display_name COLLATE NOCASE, v.size, v.reference";

function toListItem(rows: FlatRow[]) {
  const first = rows[0];
  const prices = rows.map((row) => row.price_cents);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const inStock = rows.filter((row) => row.available_qty > 0);
  const sole = inStock.length === 1 ? inStock[0] : null;
  const sizes: string[] = [];
  for (const row of rows) {
    const size = row.size.trim();
    if (size && !sizes.includes(size)) sizes.push(size);
  }
  return {
    slug: first.slug,
    itemCode: first.item_code,
    displayName: first.display_name,
    imagePath: first.image_path,
    priceCents: min,
    priceVaries: min !== max,
    isAvailable: inStock.length > 0,
    isSoldOut: inStock.length === 0,
    sizes,
    inStockVariantCount: inStock.length,
    soleVariant: sole
      ? {
          id: sole.variant_id,
          size: sole.size,
          reference: sole.reference,
          priceCents: sole.price_cents,
          availableQty: sole.available_qty,
        }
      : null,
  };
}

function groupStyles(rows: FlatRow[]) {
  const order: string[] = [];
  const bySlug = new Map<string, FlatRow[]>();
  for (const row of rows) {
    const group = bySlug.get(row.slug);
    if (group) group.push(row);
    else {
      bySlug.set(row.slug, [row]);
      order.push(row.slug);
    }
  }
  return order.map((slug) => toListItem(bySlug.get(slug) ?? []));
}

export const styleRoutes = factory.createApp()
  .get("/styles", async (c) => {
    const rows = await c.var.sql.all<FlatRow>(flatSql + flatOrder);
    return c.json(groupStyles(rows));
  })
  .get("/styles/:slug", async (c) => {
    const slug = c.req.param("slug");
    const rows = await c.var.sql.all<FlatRow>(`${flatSql} WHERE s.slug = ?${flatOrder}`, [slug]);
    const row = rows.length ? toListItem(rows) : null;
    if (!row) return errorJson(c, 404, "not_found", "Style not found");
    const style = await c.var.sql.get<{ id: string; description: string | null }>(
      "SELECT id, description FROM styles WHERE slug = ?",
      [slug],
    );
    const variants = await c.var.sql.all<{
      id: string;
      size: string;
      reference: string;
      price_cents: number;
      available_qty: number;
    }>(
      `SELECT id, size, reference, price_cents, (quantity - pending_qty - sold_qty) AS available_qty
       FROM variants WHERE style_id = ? ORDER BY size, reference`,
      [style?.id],
    );
    return c.json({
      ...row,
      description: style?.description ?? null,
      variants: variants.map((variant) => ({
        id: variant.id,
        size: variant.size,
        reference: variant.reference,
        priceCents: variant.price_cents,
        availableQty: variant.available_qty,
      })),
    });
  });
