import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const styles = sqliteTable("styles", {
  id: text("id").primaryKey(),
  itemCode: text("item_code").notNull().unique(),
  slug: text("slug").notNull().unique(),
  displayName: text("display_name").notNull(),
  description: text("description"),
  imagePath: text("image_path"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const variants = sqliteTable(
  "variants",
  {
    id: text("id").primaryKey(),
    styleId: text("style_id")
      .notNull()
      .references(() => styles.id),
    size: text("size").notNull(),
    reference: text("reference").notNull().default(""),
    priceCents: integer("price_cents").notNull(),
    quantity: integer("quantity").notNull(),
    pendingQty: integer("pending_qty").notNull(),
    soldQty: integer("sold_qty").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => ({
    styleSizeRef: uniqueIndex("variants_style_size_ref").on(t.styleId, t.size, t.reference),
    styleIdx: index("variants_style_id_idx").on(t.styleId),
    priceNonNeg: check("variants_price_nonneg", sql`${t.priceCents} >= 0`),
  }),
);

export const orderCounters = sqliteTable("order_counters", {
  id: text("id").primaryKey(),
  lastValue: integer("last_value").notNull(),
});

export const governorates = sqliteTable("governorates", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  sortOrder: integer("sort_order").notNull(),
});

export const delegations = sqliteTable(
  "delegations",
  {
    id: text("id").primaryKey(),
    governorateId: text("governorate_id")
      .notNull()
      .references(() => governorates.id),
    name: text("name").notNull(),
  },
  (t) => ({
    govName: uniqueIndex("delegations_gov_name").on(t.governorateId, t.name),
    govIdx: index("delegations_governorate_id_idx").on(t.governorateId),
  }),
);

export const discounts = sqliteTable("discounts", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  type: text("type").notNull(),
  percentOff: integer("percent_off"),
  amountCents: integer("amount_cents"),
  minCount: integer("min_count").notNull().default(0),
  availableNumber: integer("available_number").notNull(),
  usedNumber: integer("used_number").notNull(),
  sheetUsedFlag: integer("sheet_used_flag").notNull().default(0),
});

export const orders = sqliteTable(
  "orders",
  {
    id: text("id").primaryKey(),
    orderNumber: text("order_number").notNull().unique(),
    status: text("status").notNull(),
    fullName: text("full_name").notNull(),
    phone: text("phone").notNull(),
    governorateId: text("governorate_id")
      .notNull()
      .references(() => governorates.id),
    delegationId: text("delegation_id")
      .notNull()
      .references(() => delegations.id),
    city: text("city").notNull(),
    socialHandle: text("social_handle"),
    comment: text("comment"),
    locale: text("locale").notNull(),
    itemsCents: integer("items_cents").notNull(),
    deliveryCents: integer("delivery_cents").notNull(),
    discountCents: integer("discount_cents").notNull(),
    totalCents: integer("total_cents").notNull(),
    promoCode: text("promo_code"),
    alertSentAt: text("alert_sent_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => ({
    createdIdx: index("orders_created_at_idx").on(t.createdAt),
  }),
);

export const orderLines = sqliteTable(
  "order_lines",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id),
    variantId: text("variant_id")
      .notNull()
      .references(() => variants.id),
    itemCode: text("item_code").notNull(),
    displayName: text("display_name").notNull(),
    size: text("size").notNull(),
    reference: text("reference").notNull(),
    quantity: integer("quantity").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    lineTotalCents: integer("line_total_cents").notNull(),
  },
  (t) => ({
    orderIdx: index("order_lines_order_id_idx").on(t.orderId),
  }),
);

export const thankYou = sqliteTable("thank_you", {
  locale: text("locale").primaryKey(),
  body: text("body").notNull(),
  imagePath: text("image_path"),
});
