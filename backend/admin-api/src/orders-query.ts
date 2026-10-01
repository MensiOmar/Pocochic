import type { OrderDetail, OrderSummary } from "@pocochic/contracts";
import type { SqlPort } from "@pocochic/db/sql";

type SummaryRow = {
  id: string;
  order_number: string;
  created_at: string;
  full_name: string;
  phone: string;
  governorate: string;
  delegation: string;
  city: string;
  item_count: number;
  total_cents: number;
  promo_code: string | null;
  status: OrderSummary["status"];
};

const summarySelect = `
  SELECT o.id, o.order_number, o.created_at, o.full_name, o.phone,
         g.name AS governorate, d.name AS delegation, o.city,
         (SELECT COALESCE(SUM(quantity), 0) FROM order_lines WHERE order_id = o.id) AS item_count,
         o.total_cents, o.promo_code, o.status
  FROM orders o
  JOIN governorates g ON g.id = o.governorate_id
  JOIN delegations d ON d.id = o.delegation_id
`;

function toSummary(row: SummaryRow): OrderSummary {
  return {
    id: row.id,
    orderNumber: row.order_number,
    createdAt: row.created_at,
    fullName: row.full_name,
    phone: row.phone,
    governorate: row.governorate,
    delegation: row.delegation,
    city: row.city,
    itemCount: row.item_count,
    totalCents: row.total_cents,
    promoCode: row.promo_code,
    status: row.status,
  };
}

export async function listOrders(sql: SqlPort, status: string, limit: number, offset: number) {
  const where = status ? "WHERE o.status = ?" : "";
  const params = status ? [status, limit, offset] : [limit, offset];
  const rows = await sql.all<SummaryRow>(
    `${summarySelect} ${where} ORDER BY o.created_at DESC LIMIT ? OFFSET ?`,
    params,
  );
  const totalRow = await sql.get<{ n: number }>(
    `SELECT COUNT(*) AS n FROM orders ${status ? "WHERE status = ?" : ""}`,
    status ? [status] : [],
  );
  return { orders: rows.map(toSummary), total: totalRow?.n ?? 0 };
}

export async function getOrder(sql: SqlPort, idOrNumber: string): Promise<OrderDetail | undefined> {
  const row = await sql.get<SummaryRow & {
    social_handle: string | null;
    comment: string | null;
    locale: OrderDetail["locale"];
    items_cents: number;
    delivery_cents: number;
    discount_cents: number;
    alert_sent_at: string | null;
  }>(
    `${summarySelect.replace(
      "o.total_cents, o.promo_code, o.status",
      `o.total_cents, o.promo_code, o.status, o.social_handle, o.comment, o.locale,
       o.items_cents, o.delivery_cents, o.discount_cents, o.alert_sent_at`,
    )} WHERE o.id = ? OR o.order_number = ?`,
    [idOrNumber, idOrNumber],
  );
  if (!row) return undefined;
  const lines = await sql.all<{
    variant_id: string;
    item_code: string;
    display_name: string;
    size: string;
    reference: string;
    quantity: number;
    unit_price_cents: number;
    line_total_cents: number;
    image_path: string | null;
  }>(
    `SELECT ol.variant_id, ol.item_code, ol.display_name, ol.size, ol.reference, ol.quantity,
            ol.unit_price_cents, ol.line_total_cents, s.image_path
     FROM order_lines ol
     JOIN variants v ON v.id = ol.variant_id
     JOIN styles s ON s.id = v.style_id
     WHERE ol.order_id = ?`,
    [row.id],
  );
  return {
    ...toSummary(row),
    socialHandle: row.social_handle,
    comment: row.comment,
    locale: row.locale,
    itemsCents: row.items_cents,
    deliveryCents: row.delivery_cents,
    discountCents: row.discount_cents,
    alertSentAt: row.alert_sent_at,
    lines: lines.map((line) => ({
      variantId: line.variant_id,
      itemCode: line.item_code,
      displayName: line.display_name,
      size: line.size,
      reference: line.reference,
      quantity: line.quantity,
      unitPriceCents: line.unit_price_cents,
      lineTotalCents: line.line_total_cents,
      imagePath: line.image_path,
    })),
  };
}
