import { serve } from "@hono/node-server";
import { applyMigrations, asD1, openSqlite } from "@pocochic/db/sqlite";
import { app } from "../../../backend/shop-api/src/app.js";

const db = openSqlite(":memory:");
applyMigrations(db);
const now = "2026-09-25T00:00:00.000Z";
db.prepare("INSERT INTO governorates (id, name, sort_order) VALUES ('gov1', 'Tunis', 1)").run();
db.prepare("INSERT INTO delegations (id, governorate_id, name) VALUES ('del1', 'gov1', 'Bab Bhar')").run();
db.prepare("INSERT INTO styles (id, item_code, slug, display_name, description, image_path, created_at, updated_at) VALUES ('st1', 'TEE-1', 'tee-1', 'Cassette Tee', 'Soft tee', '/catalog/styles/tee-1.webp', ?, ?)").run(now, now);
db.prepare("INSERT INTO variants (id, style_id, size, reference, price_cents, quantity, pending_qty, sold_qty, created_at, updated_at) VALUES ('var-a', 'st1', 'S', '', 4500, 2, 0, 0, ?, ?)").run(now, now);
db.prepare("INSERT INTO styles (id, item_code, slug, display_name, description, image_path, created_at, updated_at) VALUES ('st2', 'GONE', 'gone', 'Gone Pin', NULL, NULL, ?, ?)").run(now, now);
db.prepare("INSERT INTO variants (id, style_id, size, reference, price_cents, quantity, pending_qty, sold_qty, created_at, updated_at) VALUES ('var-z', 'st2', 'U', '', 1000, 0, 0, 0, ?, ?)").run(now, now);
db.prepare("INSERT INTO styles (id, item_code, slug, display_name, description, image_path, created_at, updated_at) VALUES ('st3', 'CAT', 'night-cat', 'Night Cat Tee', NULL, '/catalog/styles/night-cat.webp', ?, ?)").run(now, now);
db.prepare("INSERT INTO variants (id, style_id, size, reference, price_cents, quantity, pending_qty, sold_qty, created_at, updated_at) VALUES ('var-c1', 'st3', 'S', '', 4000, 1, 0, 0, ?, ?)").run(now, now);
db.prepare("INSERT INTO variants (id, style_id, size, reference, price_cents, quantity, pending_qty, sold_qty, created_at, updated_at) VALUES ('var-c2', 'st3', 'M', '', 4000, 1, 0, 0, ?, ?)").run(now, now);
db.prepare("INSERT INTO styles (id, item_code, slug, display_name, description, image_path, created_at, updated_at) VALUES ('st4', 'Hello Hoodie', 'hello-hoodie', 'Hello Hoodie', 'Soft fleece', NULL, ?, ?)").run(now, now);
db.prepare("INSERT INTO variants (id, style_id, size, reference, price_cents, quantity, pending_qty, sold_qty, created_at, updated_at) VALUES ('hh-s', 'st4', 'S', '', 6000, 1, 0, 0, ?, ?)").run(now, now);
db.prepare("INSERT INTO variants (id, style_id, size, reference, price_cents, quantity, pending_qty, sold_qty, created_at, updated_at) VALUES ('hh-m', 'st4', 'M', '', 6200, 1, 0, 0, ?, ?)").run(now, now);
db.prepare("INSERT INTO variants (id, style_id, size, reference, price_cents, quantity, pending_qty, sold_qty, created_at, updated_at) VALUES ('hh-l', 'st4', 'L Oversize', '', 7000, 0, 0, 0, ?, ?)").run(now, now);
db.prepare("INSERT INTO styles (id, item_code, slug, display_name, description, image_path, created_at, updated_at) VALUES ('st5', 'SHEGLAM Hello Kitty - Cream Blush', 'friends-trip', 'Friends Trip', NULL, NULL, ?, ?)").run(now, now);
db.prepare("INSERT INTO variants (id, style_id, size, reference, price_cents, quantity, pending_qty, sold_qty, created_at, updated_at) VALUES ('ft', 'st5', '', 'Friends Trip', 3900, 1, 0, 0, ?, ?)").run(now, now);
db.prepare("INSERT INTO styles (id, item_code, slug, display_name, description, image_path, created_at, updated_at) VALUES ('st6', 'Pin Set', 'pin-set', 'Pin Set', NULL, NULL, ?, ?)").run(now, now);
db.prepare("INSERT INTO variants (id, style_id, size, reference, price_cents, quantity, pending_qty, sold_qty, created_at, updated_at) VALUES ('pin-axe', 'st6', '', 'Axe', 1500, 1, 0, 0, ?, ?)").run(now, now);
db.prepare("INSERT INTO variants (id, style_id, size, reference, price_cents, quantity, pending_qty, sold_qty, created_at, updated_at) VALUES ('pin-wood', 'st6', '', 'Wood Block', 1500, 0, 0, 0, ?, ?)").run(now, now);
db.prepare("INSERT INTO styles (id, item_code, slug, display_name, description, image_path, created_at, updated_at) VALUES ('st7', 'Sold Tee', 'sold-tee', 'Sold Tee', NULL, NULL, ?, ?)").run(now, now);
db.prepare("INSERT INTO variants (id, style_id, size, reference, price_cents, quantity, pending_qty, sold_qty, created_at, updated_at) VALUES ('sold-s', 'st7', 'S', '', 5000, 0, 0, 0, ?, ?)").run(now, now);
db.prepare("INSERT INTO variants (id, style_id, size, reference, price_cents, quantity, pending_qty, sold_qty, created_at, updated_at) VALUES ('sold-m', 'st7', 'M', '', 4500, 0, 0, 0, ?, ?)").run(now, now);
for (let n = 1; n <= 12; n += 1) {
  const id = `extra-${n}`;
  const label = `Paged ${String(n).padStart(2, "0")}`;
  db.prepare("INSERT INTO styles (id, item_code, slug, display_name, description, image_path, created_at, updated_at) VALUES (?, ?, ?, ?, NULL, NULL, ?, ?)").run(id, label, `paged-${n}`, label, now, now);
  db.prepare("INSERT INTO variants (id, style_id, size, reference, price_cents, quantity, pending_qty, sold_qty, created_at, updated_at) VALUES (?, ?, '', '', 1000, 1, 0, 0, ?, ?)").run(`vx-${n}`, id, now, now);
}
db.prepare("INSERT INTO thank_you (locale, body, image_path) VALUES ('fr', 'Merci pour ta commande', NULL), ('en', '', NULL), ('ar', '', NULL), ('source', 'FULL', NULL)").run();
db.prepare("INSERT INTO discounts (id, code, type, percent_off, amount_cents, min_count, available_number, used_number, sheet_used_flag) VALUES ('disc-five', 'FIVE', 'discount', NULL, 500, 0, 5, 0, 0)").run();
db.prepare("INSERT INTO discounts (id, code, type, percent_off, amount_cents, min_count, available_number, used_number, sheet_used_flag) VALUES ('disc-min', 'NEED2', 'discount', NULL, 100, 2, 5, 0, 0)").run();

serve({
  fetch: (req) => app.fetch(req, {
    DB: asD1(db),
    SHOP_WEB_ORIGIN: "http://127.0.0.1:4173",
    SHOP_ALERT_EMAIL: "pocochicaccessories@gmail.com",
    SHOP_ALERT_FROM: "onboarding@resend.dev",
    AWAIT_ALERT: "1",
    LOG_ALERTS: "1",
  }),
  port: 8799,
});
