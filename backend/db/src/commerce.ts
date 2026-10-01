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

export const MAX_CART_LINES = 50;
export const MAX_LINE_QUANTITY = 99;

export function validateCartLines(
  lines: { variantId: string; quantity: number }[],
): { ok: true } | { ok: false; code: "validation" } {
  if (lines.length < 1 || lines.length > MAX_CART_LINES) return { ok: false, code: "validation" };
  const seen = new Set<string>();
  for (const line of lines) {
    if (!line.variantId || seen.has(line.variantId)) return { ok: false, code: "validation" };
    if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > MAX_LINE_QUANTITY) {
      return { ok: false, code: "validation" };
    }
    seen.add(line.variantId);
  }
  return { ok: true };
}

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

function isPromoType(value: string): value is PromoType {
  return value === "percent" || value === "free" || value === "discount";
}

function discountAmount(discount: DiscountRow, lines: QuoteLine[], itemsCents: number): number | null {
  if (!isPromoType(discount.type)) return null;
  if (discount.type === "percent") {
    const percent = discount.percent_off;
    if (percent === null || !Number.isInteger(percent) || percent < 0 || percent > 100) return null;
    const scaled = itemsCents * percent;
    if (!Number.isSafeInteger(scaled)) return null;
    return Math.min(Math.floor(scaled / 100), itemsCents);
  }
  const cap = discount.amount_cents;
  if (cap === null || !Number.isInteger(cap) || cap < 0) return null;
  if (discount.type === "free") {
    let cheapest = Number.POSITIVE_INFINITY;
    for (const line of lines) {
      if (!Number.isInteger(line.unitPriceCents) || line.unitPriceCents < 0) return null;
      if (line.unitPriceCents < cheapest) cheapest = line.unitPriceCents;
    }
    if (!Number.isFinite(cheapest)) return 0;
    return Math.min(cheapest, cap, itemsCents);
  }
  return Math.min(cap, itemsCents);
}

export function quotePromo(discount: DiscountRow | null, lines: QuoteLine[], code: string): QuoteOk | QuoteFail {
  if (!discount || discount.code !== code || !isPromoType(discount.type)) return { ok: false, code: "promo_unknown" };
  if (!Number.isInteger(discount.min_count) || discount.min_count < 0) return { ok: false, code: "promo_unknown" };
  if (!Number.isInteger(discount.used_number) || !Number.isInteger(discount.available_number)) {
    return { ok: false, code: "promo_unknown" };
  }
  if (discount.used_number >= discount.available_number) return { ok: false, code: "promo_exhausted" };
  const qty = lines.reduce((sum, line) => sum + line.quantity, 0);
  if (!Number.isSafeInteger(qty) || qty < discount.min_count) return { ok: false, code: "promo_min_count" };
  const itemsCents = itemsCentsOf(lines);
  if (!Number.isSafeInteger(itemsCents)) return { ok: false, code: "promo_unknown" };
  const discountCents = discountAmount(discount, lines, itemsCents);
  if (discountCents === null) return { ok: false, code: "promo_unknown" };
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
  idempotencyKey?: string;
  now?: string;
};

export type PlacedOrder = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
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
  | { ok: true; order: PlacedOrder; replayed: boolean }
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

function errorText(err: unknown): string {
  const parts: string[] = [];
  const seen = new Set<unknown>();
  let current: unknown = err;
  while (current && !seen.has(current) && parts.length < 6) {
    seen.add(current);
    if (current instanceof Error) {
      parts.push(current.message);
      current = current.cause;
      continue;
    }
    parts.push(String(current));
    break;
  }
  return parts.join("\n");
}

function isGuard(err: unknown, token: string): boolean {
  return errorText(err).includes(token);
}

function customerOk(customer: PlaceOrderInput["customer"]): boolean {
  const name = customer.fullName.trim();
  const city = customer.city.trim();
  const social = customer.socialHandle?.trim() ?? "";
  const comment = customer.comment?.trim() ?? "";
  return name.length >= 1
    && name.length <= 120
    && /^\d{8}$/.test(customer.phone)
    && customer.governorateId.length > 0
    && customer.delegationId.length > 0
    && city.length >= 1
    && city.length <= 80
    && social.length <= 160
    && comment.length <= 500;
}

const IDEMPOTENCY_KEY = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type StoredLine = {
  variant_id: string;
  item_code: string;
  display_name: string;
  size: string;
  reference: string;
  quantity: number;
  unit_price_cents: number;
  line_total_cents: number;
};

type StoredOrder = {
  id: string;
  order_number: string;
  status: OrderStatus;
  full_name: string;
  phone: string;
  governorate_id: string;
  delegation_id: string;
  city: string;
  social_handle: string | null;
  locale: Locale;
  items_cents: number;
  delivery_cents: number;
  discount_cents: number;
  total_cents: number;
  promo_code: string | null;
  lines: StoredLine[];
};

async function readStoredOrder(sql: SqlPort, key: string): Promise<StoredOrder | undefined> {
  const header = await sql.get<Omit<StoredOrder, "lines">>(
    `SELECT id, order_number, status, full_name, phone, governorate_id, delegation_id, city,
            social_handle, locale, items_cents, delivery_cents, discount_cents, total_cents, promo_code
     FROM orders WHERE idempotency_key = ?`,
    [key],
  );
  if (!header) return undefined;
  const lines = await sql.all<StoredLine>(
    `SELECT variant_id, item_code, display_name, size, reference, quantity, unit_price_cents, line_total_cents
     FROM order_lines WHERE order_id = ?`,
    [header.id],
  );
  return { ...header, lines };
}

function sameCheckout(stored: StoredOrder, input: PlaceOrderInput): boolean {
  const social = input.customer.socialHandle?.trim() || null;
  const promo = input.promoCode?.trim() || null;
  if (stored.locale !== input.locale) return false;
  if (stored.full_name !== input.customer.fullName.trim()) return false;
  if (stored.phone !== input.customer.phone) return false;
  if (stored.governorate_id !== input.customer.governorateId) return false;
  if (stored.delegation_id !== input.customer.delegationId) return false;
  if (stored.city !== input.customer.city.trim()) return false;
  if ((stored.social_handle ?? null) !== social) return false;
  if ((stored.promo_code ?? null) !== promo) return false;
  const wanted = [...input.lines].sort((a, b) => a.variantId.localeCompare(b.variantId));
  const got = [...stored.lines].sort((a, b) => a.variant_id.localeCompare(b.variant_id));
  if (wanted.length !== got.length) return false;
  return wanted.every((line, index) => line.variantId === got[index]?.variant_id && line.quantity === got[index]?.quantity);
}

function toPlaced(stored: StoredOrder): PlacedOrder {
  return {
    id: stored.id,
    orderNumber: stored.order_number,
    status: stored.status,
    itemsCents: stored.items_cents,
    deliveryCents: stored.delivery_cents,
    discountCents: stored.discount_cents,
    totalCents: stored.total_cents,
    promoCode: stored.promo_code,
    lines: stored.lines.map((line) => ({
      variantId: line.variant_id,
      itemCode: line.item_code,
      displayName: line.display_name,
      size: line.size,
      reference: line.reference,
      quantity: line.quantity,
      unitPriceCents: line.unit_price_cents,
      lineTotalCents: line.line_total_cents,
    })),
  };
}

export async function placeOrder(sql: SqlPort, input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const linesOk = validateCartLines(input.lines);
  if (!linesOk.ok || !customerOk(input.customer)) return { ok: false, code: "validation" };
  const idempotencyKey = input.idempotencyKey?.trim() || undefined;
  if (idempotencyKey && !IDEMPOTENCY_KEY.test(idempotencyKey)) return { ok: false, code: "validation" };
  if (idempotencyKey) {
    const existing = await readStoredOrder(sql, idempotencyKey);
    if (existing) {
      if (!sameCheckout(existing, input)) return { ok: false, code: "validation" };
      return { ok: true, order: toPlaced(existing), replayed: true };
    }
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
  if (rows.some((row) => !Number.isInteger(row.price_cents) || row.price_cents < 0 || !Number.isSafeInteger(row.price_cents))) {
    return { ok: false, code: "validation" };
  }
  const conflicts = conflictItems(rows, input.lines);
  if (conflicts.length > 0) return { ok: false, code: "stock_conflict", items: conflicts };

  let discountCents = 0;
  let promoCode: string | null = null;
  const promoCodeInput = input.promoCode?.trim() || undefined;
  if (promoCodeInput) {
    const discount = await sql.get<DiscountRow>(
      `SELECT code, type, percent_off, amount_cents, min_count, available_number, used_number
       FROM discounts WHERE code = ?`,
      [promoCodeInput],
    );
    const quote = quotePromo(
      discount && isPromoType(discount.type) ? { ...discount, type: discount.type } : null,
      input.lines.map((line) => {
        const row = rows.find((item) => item.id === line.variantId)!;
        return { unitPriceCents: row.price_cents, quantity: line.quantity };
      }),
      promoCodeInput,
    );
    if (!quote.ok) return quote;
    discountCents = quote.discountCents;
    promoCode = promoCodeInput;
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
        promo_code, idempotency_key, alert_sent_at, created_at, updated_at
      ) VALUES (
        ?, (SELECT printf('POC-%04d', last_value) FROM order_counters WHERE id = 'order'),
        'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?
      )`,
      params: [
        orderId,
        input.customer.fullName.trim(),
        input.customer.phone,
        input.customer.governorateId,
        input.customer.delegationId,
        input.customer.city.trim(),
        input.customer.socialHandle?.trim() || null,
        input.customer.comment?.trim() || null,
        input.locale,
        itemsCents,
        DELIVERY_FEE_CENTS,
        discountCents,
        itemsCents + DELIVERY_FEE_CENTS - discountCents,
        promoCode,
        idempotencyKey ?? null,
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
    if (idempotencyKey && isGuard(err, "idempotency_key")) {
      const raced = await readStoredOrder(sql, idempotencyKey);
      if (raced && sameCheckout(raced, input)) return { ok: true, order: toPlaced(raced), replayed: true };
      return { ok: false, code: "validation" };
    }
    throw err;
  }

  const stored = await sql.get<{ order_number: string }>("SELECT order_number FROM orders WHERE id = ?", [orderId]);
  if (!stored) {
    if (idempotencyKey) {
      const raced = await readStoredOrder(sql, idempotencyKey);
      if (raced && sameCheckout(raced, input)) return { ok: true, order: toPlaced(raced), replayed: true };
    }
    return { ok: false, code: "validation" };
  }
  return {
    ok: true,
    replayed: false,
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
