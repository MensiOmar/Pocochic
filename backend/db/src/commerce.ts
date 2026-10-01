import { DELIVERY_FEE_CENTS, type Locale, type OrderStatus, type StockConflictItem } from "@pocochic/contracts";
import type { SqlPort } from "./sql-port.js";
import { ulid } from "./ulid.js";

export type PromoType = "percent" | "free" | "discount";

export type DiscountRow = {
  code: string;
  type: PromoType;
  percent_off: number | null;
  amount_cents: number | null;
  min_count: number;
  available_number: number;
  used_number: number;
};

export type QuoteLine = { unitPriceCents: number; quantity: number };

export type QuoteOk = {
  ok: true;
  discountCents: number;
  itemsCents: number;
  deliveryCents: number;
  totalCents: number;
  type: PromoType;
};

export type QuoteFail = {
  ok: false;
  code: "promo_unknown" | "promo_exhausted" | "promo_min_count";
};

export function itemsCentsOf(lines: QuoteLine[]): number {
  return lines.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0);
}

export function quotePromo(discount: DiscountRow | null, lines: QuoteLine[], code: string): QuoteOk | QuoteFail {
  if (!discount) return { ok: false, code: "promo_unknown" };
  if (discount.used_number >= discount.available_number) return { ok: false, code: "promo_exhausted" };
  const qty = lines.reduce((sum, line) => sum + line.quantity, 0);
  if (qty < discount.min_count) return { ok: false, code: "promo_min_count" };
  const itemsCents = itemsCentsOf(lines);
  let discountCents = 0;
  if (discount.type === "percent") {
    const percent = discount.percent_off ?? 0;
    discountCents = Math.floor((itemsCents * percent) / 100);
  } else if (discount.type === "free") {
    const cheapest = lines.reduce((min, line) => Math.min(min, line.unitPriceCents), Number.POSITIVE_INFINITY);
    const cap = discount.amount_cents ?? 0;
    discountCents = Number.isFinite(cheapest) ? Math.min(cheapest, cap) : 0;
  } else {
    discountCents = Math.min(discount.amount_cents ?? 0, itemsCents);
  }
  discountCents = Math.min(Math.max(discountCents, 0), itemsCents);
  return {
    ok: true,
    type: discount.type,
    discountCents,
    itemsCents,
    deliveryCents: DELIVERY_FEE_CENTS,
    totalCents: itemsCents + DELIVERY_FEE_CENTS - discountCents,
  };
}

type VariantRow = {
  id: string;
  style_id: string;
  size: string;
  reference: string;
  price_cents: number;
  quantity: number;
  pending_qty: number;
  sold_qty: number;
  item_code: string;
  display_name: string;
};

export type PlaceOrderInput = {
  locale: Locale;
  customer: {
    fullName: string;
    phone: string;
    governorateId: string;
    delegationId: string;
    city: string;
    socialHandle?: string;
    comment?: string;
  };
  lines: { variantId: string; quantity: number }[];
  promoCode?: string;
  now?: string;
};

export type PlacedOrder = {
  id: string;
  orderNumber: string;
  status: "pending";
  itemsCents: number;
  deliveryCents: number;
  discountCents: number;
  totalCents: number;
  promoCode: string | null;
  lines: {
    variantId: string;
    itemCode: string;
    displayName: string;
    size: string;
    reference: string;
    quantity: number;
    unitPriceCents: number;
    lineTotalCents: number;
  }[];
};

export type PlaceOrderResult =
  | { ok: true; order: PlacedOrder }
  | { ok: false; code: "validation" | "stock_conflict" | "promo_unknown" | "promo_exhausted" | "promo_min_count"; items?: StockConflictItem[] };

function availableOf(row: VariantRow): number {
  return row.quantity - row.pending_qty - row.sold_qty;
}

function conflictItems(rows: VariantRow[], lines: { variantId: string; quantity: number }[]): StockConflictItem[] {
  return lines.flatMap((line) => {
    const row = rows.find((item) => item.id === line.variantId);
    if (!row) return [];
    const available = availableOf(row);
    if (line.quantity <= available) return [];
    return [{
      variantId: row.id,
      itemCode: row.item_code,
      displayName: row.display_name,
      size: row.size,
      reference: row.reference,
      requested: line.quantity,
      available: Math.max(available, 0),
    }];
  });
}

async function loadVariants(sql: SqlPort, ids: string[]): Promise<VariantRow[]> {
  if (ids.length === 0) return [];
  const marks = ids.map(() => "?").join(", ");
  return sql.all<VariantRow>(
    `SELECT v.id, v.style_id, v.size, v.reference, v.price_cents, v.quantity, v.pending_qty, v.sold_qty,
            s.item_code, s.display_name
     FROM variants v
     JOIN styles s ON s.id = v.style_id
     WHERE v.id IN (${marks})`,
    ids,
  );
}

function isGuard(err: unknown, token: string): boolean {
  return err instanceof Error && err.message.includes(token);
}

export async function placeOrder(sql: SqlPort, input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const seen = new Set<string>();
  for (const line of input.lines) {
    if (seen.has(line.variantId) || line.quantity < 1) {
      return { ok: false, code: "validation" };
    }
    seen.add(line.variantId);
  }
  const delegation = await sql.get<{ id: string; governorate_id: string }>(
    "SELECT id, governorate_id FROM delegations WHERE id = ?",
    [input.customer.delegationId],
  );
  if (!delegation || delegation.governorate_id !== input.customer.governorateId) {
    return { ok: false, code: "validation" };
  }

  const rows = await loadVariants(sql, input.lines.map((line) => line.variantId));
  if (rows.length !== input.lines.length) return { ok: false, code: "validation" };
  const conflicts = conflictItems(rows, input.lines);
  if (conflicts.length > 0) return { ok: false, code: "stock_conflict", items: conflicts };

  let discountCents = 0;
  let promoCode: string | null = null;
  if (input.promoCode) {
    const discount = await sql.get<DiscountRow>(
      `SELECT code, type, percent_off, amount_cents, min_count, available_number, used_number
       FROM discounts WHERE code = ?`,
      [input.promoCode],
    );
    const quote = quotePromo(
      discount ? { ...discount, type: discount.type as PromoType } : null,
      input.lines.map((line) => {
        const row = rows.find((item) => item.id === line.variantId)!;
        return { unitPriceCents: row.price_cents, quantity: line.quantity };
      }),
      input.promoCode,
    );
    if (!quote.ok) return quote;
    discountCents = quote.discountCents;
    promoCode = input.promoCode;
  }

  const priced = input.lines.map((line) => {
    const row = rows.find((item) => item.id === line.variantId)!;
    return {
      variantId: row.id,
      itemCode: row.item_code,
      displayName: row.display_name,
      size: row.size,
      reference: row.reference,
      quantity: line.quantity,
      unitPriceCents: row.price_cents,
      lineTotalCents: row.price_cents * line.quantity,
    };
  });
  const itemsCents = priced.reduce((sum, line) => sum + line.lineTotalCents, 0);
  const now = input.now ?? new Date().toISOString();
  const orderId = ulid();
  const statements = [
    ...input.lines.map((line) => ({
      sql: "UPDATE variants SET pending_qty = pending_qty + ?, updated_at = ? WHERE id = ?",
      params: [line.quantity, now, line.variantId],
    })),
    ...(promoCode
      ? [{
          sql: "UPDATE discounts SET used_number = used_number + 1 WHERE code = ?",
          params: [promoCode],
        }]
      : []),
    {
      sql: "UPDATE order_counters SET last_value = last_value + 1 WHERE id = 'order'",
      params: [],
    },
    {
      sql: `INSERT INTO orders (
        id, order_number, status, full_name, phone, governorate_id, delegation_id, city,
        social_handle, comment, locale, items_cents, delivery_cents, discount_cents, total_cents,
        promo_code, alert_sent_at, created_at, updated_at
      ) VALUES (
        ?, (SELECT printf('POC-%04d', last_value) FROM order_counters WHERE id = 'order'),
        'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?
      )`,
      params: [
        orderId,
        input.customer.fullName,
        input.customer.phone,
        input.customer.governorateId,
        input.customer.delegationId,
        input.customer.city,
        input.customer.socialHandle?.trim() || null,
        input.customer.comment?.trim() || null,
        input.locale,
        itemsCents,
        DELIVERY_FEE_CENTS,
        discountCents,
        itemsCents + DELIVERY_FEE_CENTS - discountCents,
        promoCode,
        now,
        now,
      ],
    },
    ...priced.map((line) => ({
      sql: `INSERT INTO order_lines (
        id, order_id, variant_id, item_code, display_name, size, reference, quantity, unit_price_cents, line_total_cents
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [
        ulid(),
        orderId,
        line.variantId,
        line.itemCode,
        line.displayName,
        line.size,
        line.reference,
        line.quantity,
        line.unitPriceCents,
        line.lineTotalCents,
      ],
    })),
  ];

  try {
    await sql.batch(statements);
  } catch (err) {
    if (isGuard(err, "promo_guard")) return { ok: false, code: "promo_exhausted" };
    if (isGuard(err, "stock_guard")) {
      const fresh = await loadVariants(sql, input.lines.map((line) => line.variantId));
      return { ok: false, code: "stock_conflict", items: conflictItems(fresh, input.lines) };
    }
    throw err;
  }

  const stored = await sql.get<{ order_number: string }>("SELECT order_number FROM orders WHERE id = ?", [orderId]);
  if (!stored) return { ok: false, code: "validation" };
  return {
    ok: true,
    order: {
      id: orderId,
      orderNumber: stored.order_number,
      status: "pending",
      itemsCents,
      deliveryCents: DELIVERY_FEE_CENTS,
      discountCents,
      totalCents: itemsCents + DELIVERY_FEE_CENTS - discountCents,
      promoCode,
      lines: priced,
    },
  };
}

const TRANSITIONS: Record<string, OrderStatus[]> = {
  pending: ["paid", "cancelled"],
  paid: ["in_transit"],
  in_transit: [],
  cancelled: [],
};

export async function transitionOrder(
  sql: SqlPort,
  input: { orderId: string; to: "paid" | "in_transit" | "cancelled"; now?: string },
): Promise<{ ok: true; status: OrderStatus } | { ok: false; code: "not_found" | "illegal_transition" }> {
  const current = await sql.get<{ id: string; status: OrderStatus }>(
    "SELECT id, status FROM orders WHERE id = ? OR order_number = ?",
    [input.orderId, input.orderId],
  );
  if (!current) return { ok: false, code: "not_found" };
  if (!TRANSITIONS[current.status]?.includes(input.to)) return { ok: false, code: "illegal_transition" };
  const now = input.now ?? new Date().toISOString();
  const id = current.id;
  const statements = [];
  if (current.status === "pending" && input.to === "paid") {
    statements.push({
      sql: `UPDATE variants
            SET pending_qty = pending_qty - (
                  SELECT COALESCE(SUM(quantity), 0) FROM order_lines WHERE order_id = ? AND variant_id = variants.id
                ),
                sold_qty = sold_qty + (
                  SELECT COALESCE(SUM(quantity), 0) FROM order_lines WHERE order_id = ? AND variant_id = variants.id
                ),
                updated_at = ?
            WHERE id IN (SELECT variant_id FROM order_lines WHERE order_id = ?)
              AND EXISTS (SELECT 1 FROM orders WHERE id = ? AND status = 'pending')`,
      params: [id, id, now, id, id],
    });
  }
  if (current.status === "pending" && input.to === "cancelled") {
    statements.push({
      sql: `UPDATE variants
            SET pending_qty = pending_qty - (
                  SELECT COALESCE(SUM(quantity), 0) FROM order_lines WHERE order_id = ? AND variant_id = variants.id
                ),
                updated_at = ?
            WHERE id IN (SELECT variant_id FROM order_lines WHERE order_id = ?)
              AND EXISTS (SELECT 1 FROM orders WHERE id = ? AND status = 'pending')`,
      params: [id, now, id, id],
    });
  }
  statements.push({
    sql: "UPDATE orders SET status = ?, updated_at = ? WHERE id = ? AND status = ?",
    params: [input.to, now, id, current.status],
  });
  await sql.batch(statements);
  const after = await sql.get<{ status: OrderStatus }>("SELECT status FROM orders WHERE id = ?", [id]);
  if (!after || after.status !== input.to) return { ok: false, code: "illegal_transition" };
  return { ok: true, status: after.status };
}
