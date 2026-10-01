CREATE TABLE `styles` (
  `id` text PRIMARY KEY NOT NULL,
  `item_code` text NOT NULL,
  `slug` text NOT NULL,
  `display_name` text NOT NULL,
  `description` text,
  `image_path` text,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `styles_item_code_unique` ON `styles` (`item_code`);
--> statement-breakpoint
CREATE UNIQUE INDEX `styles_slug_unique` ON `styles` (`slug`);
--> statement-breakpoint
CREATE TABLE `variants` (
  `id` text PRIMARY KEY NOT NULL,
  `style_id` text NOT NULL,
  `size` text NOT NULL,
  `reference` text DEFAULT '' NOT NULL,
  `price_cents` integer NOT NULL,
  `quantity` integer NOT NULL,
  `pending_qty` integer NOT NULL,
  `sold_qty` integer NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL,
  FOREIGN KEY (`style_id`) REFERENCES `styles`(`id`),
  CONSTRAINT `variants_price_nonneg` CHECK(`price_cents` >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `variants_style_size_ref` ON `variants` (`style_id`,`size`,`reference`);
--> statement-breakpoint
CREATE INDEX `variants_style_id_idx` ON `variants` (`style_id`);
--> statement-breakpoint
CREATE TABLE `order_counters` (
  `id` text PRIMARY KEY NOT NULL,
  `last_value` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `order_counters` (`id`, `last_value`) VALUES ('order', 0);
--> statement-breakpoint
CREATE TABLE `governorates` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `sort_order` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `governorates_name_unique` ON `governorates` (`name`);
--> statement-breakpoint
CREATE TABLE `delegations` (
  `id` text PRIMARY KEY NOT NULL,
  `governorate_id` text NOT NULL,
  `name` text NOT NULL,
  FOREIGN KEY (`governorate_id`) REFERENCES `governorates`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `delegations_gov_name` ON `delegations` (`governorate_id`,`name`);
--> statement-breakpoint
CREATE INDEX `delegations_governorate_id_idx` ON `delegations` (`governorate_id`);
--> statement-breakpoint
CREATE TABLE `discounts` (
  `id` text PRIMARY KEY NOT NULL,
  `code` text NOT NULL,
  `type` text NOT NULL,
  `percent_off` integer,
  `amount_cents` integer,
  `min_count` integer DEFAULT 0 NOT NULL,
  `available_number` integer NOT NULL,
  `used_number` integer NOT NULL,
  `sheet_used_flag` integer DEFAULT 0 NOT NULL,
  CONSTRAINT `discounts_type_check` CHECK(`type` IN ('percent', 'free', 'discount')),
  CONSTRAINT `discounts_available_nonneg` CHECK(`available_number` >= 0),
  CONSTRAINT `discounts_used_nonneg` CHECK(`used_number` >= 0),
  CONSTRAINT `discounts_shape` CHECK(
    (`type` = 'percent' AND `percent_off` IS NOT NULL AND `amount_cents` IS NULL)
    OR (`type` IN ('free', 'discount') AND `amount_cents` IS NOT NULL AND `percent_off` IS NULL)
  )
);
--> statement-breakpoint
CREATE UNIQUE INDEX `discounts_code_unique` ON `discounts` (`code`);
--> statement-breakpoint
CREATE TABLE `orders` (
  `id` text PRIMARY KEY NOT NULL,
  `order_number` text NOT NULL,
  `status` text NOT NULL,
  `full_name` text NOT NULL,
  `phone` text NOT NULL,
  `governorate_id` text NOT NULL,
  `delegation_id` text NOT NULL,
  `city` text NOT NULL,
  `social_handle` text,
  `comment` text,
  `locale` text NOT NULL,
  `items_cents` integer NOT NULL,
  `delivery_cents` integer NOT NULL,
  `discount_cents` integer NOT NULL,
  `total_cents` integer NOT NULL,
  `promo_code` text,
  `alert_sent_at` text,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL,
  FOREIGN KEY (`governorate_id`) REFERENCES `governorates`(`id`),
  FOREIGN KEY (`delegation_id`) REFERENCES `delegations`(`id`),
  CONSTRAINT `orders_status_check` CHECK(`status` IN ('pending', 'paid', 'in_transit', 'cancelled')),
  CONSTRAINT `orders_phone_check` CHECK(length(`phone`) = 8 AND `phone` NOT GLOB '*[^0-9]*'),
  CONSTRAINT `orders_locale_check` CHECK(`locale` IN ('fr', 'ar', 'en'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_order_number_unique` ON `orders` (`order_number`);
--> statement-breakpoint
CREATE INDEX `orders_created_at_idx` ON `orders` (`created_at`);
--> statement-breakpoint
CREATE TABLE `order_lines` (
  `id` text PRIMARY KEY NOT NULL,
  `order_id` text NOT NULL,
  `variant_id` text NOT NULL,
  `item_code` text NOT NULL,
  `display_name` text NOT NULL,
  `size` text NOT NULL,
  `reference` text NOT NULL,
  `quantity` integer NOT NULL,
  `unit_price_cents` integer NOT NULL,
  `line_total_cents` integer NOT NULL,
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`),
  FOREIGN KEY (`variant_id`) REFERENCES `variants`(`id`),
  CONSTRAINT `order_lines_qty_check` CHECK(`quantity` > 0)
);
--> statement-breakpoint
CREATE INDEX `order_lines_order_id_idx` ON `order_lines` (`order_id`);
--> statement-breakpoint
CREATE TABLE `thank_you` (
  `locale` text PRIMARY KEY NOT NULL,
  `body` text NOT NULL,
  `image_path` text
);
