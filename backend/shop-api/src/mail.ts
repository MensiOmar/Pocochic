import type { SqlPort } from "@pocochic/db/sql";
import type { PlacedOrder } from "@pocochic/db/commerce";
import type { Bindings } from "./env.js";

function tnd(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")} TND`;
}

function oneLine(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

export async function notifyShopOfOrder(env: Bindings, sql: SqlPort, order: PlacedOrder): Promise<void> {
  const place = await sql.get<{
    full_name: string;
    phone: string;
    city: string;
    social_handle: string | null;
    governorate: string;
    delegation: string;
  }>(
    `SELECT o.full_name, o.phone, o.city, o.social_handle, g.name AS governorate, d.name AS delegation
     FROM orders o
     JOIN governorates g ON g.id = o.governorate_id
     JOIN delegations d ON d.id = o.delegation_id
     WHERE o.id = ?`,
    [order.id],
  );
  const text = [
    `New POCOCHIC order ${order.orderNumber}`,
    `Name: ${oneLine(place?.full_name ?? "")}`,
    `Phone: ${place?.phone ?? ""}`,
    `Governorate: ${oneLine(place?.governorate ?? "")}`,
    `Delegation: ${oneLine(place?.delegation ?? "")}`,
    `Address: ${oneLine(place?.city ?? "")}`,
    `Instagram/Facebook: ${oneLine(place?.social_handle ?? "") || "none"}`,
    `Items: ${tnd(order.itemsCents)}`,
    `Delivery: ${tnd(order.deliveryCents)}`,
    `Discount: ${tnd(order.discountCents)}`,
    `Total: ${tnd(order.totalCents)}`,
    order.promoCode ? `Promo: ${oneLine(order.promoCode)}` : "Promo: none",
    ...order.lines.map((line) => `- ${oneLine(line.displayName)} ${oneLine(line.size)} ${oneLine(line.reference)} x${line.quantity} ${tnd(line.lineTotalCents)}`),
  ].join("\n");
  try {
    if (!env.RESEND_API_KEY) {
      console.info(`shop-alert ${order.orderNumber}`);
      if (env.LOG_ALERTS === "1") {
        await sql.run("UPDATE orders SET alert_sent_at = ? WHERE id = ?", [new Date().toISOString(), order.id]);
      }
      return;
    }
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.SHOP_ALERT_FROM,
        to: [env.SHOP_ALERT_EMAIL],
        subject: `New order ${order.orderNumber}`,
        text,
      }),
    });
    if (!res.ok) return;
    await sql.run("UPDATE orders SET alert_sent_at = ? WHERE id = ?", [new Date().toISOString(), order.id]);
  } catch {
    // A failed send never rolls back the order. alert_sent_at stays null.
  }
}
