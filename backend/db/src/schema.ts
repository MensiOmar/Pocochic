import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// Placeholder schema - will be expanded per tickets / architect proposals
// See obsidian/05-Architecture/Stack.md for column rules (INTEGER/TEXT/REAL/BLOB, price_cents, 0/1 flags, UTC ISO TEXT timestamps, TEXT IDs)

export const products = sqliteTable("products", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  priceCents: integer("price_cents").notNull(),
  published: integer("published", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const categories = sqliteTable("categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
});

export const media = sqliteTable("media", {
  id: text("id").primaryKey(),
  productId: text("product_id").notNull().references(() => products.id),
  url: text("url").notNull(),
  alt: text("alt"),
  sortOrder: integer("sort_order").notNull().default(0),
});
