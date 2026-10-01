import type { SqlPort } from "@pocochic/db/sql";
import type { PlacedOrder } from "@pocochic/db/commerce";
import type { Bindings } from "./env.js";

export async function notifyShopOfOrder(env: Bindings, sql: SqlPort, order: PlacedOrder): Promise<void> {
  const text = [
    `New POCOCHIC order ${order.orderNumber}`,
    `Items: ${(order.itemsCents / 100).toFixed(2)} TND`,
    `Delivery: ${(order.deliveryCents / 100).toFixed(2)} TND`,
    `Discount: ${(order.discountCents / 100).toFixed(2)} TND`,
    `Total: ${(order.totalCents / 100).toFixed(2)} TND`,
    order.promoCode ? `Promo: ${order.promoCode}` : "Promo: none",
    ...order.lines.map((line) => `- ${line.displayName} ${line.size} ${line.reference} x${line.quantity}`),
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
