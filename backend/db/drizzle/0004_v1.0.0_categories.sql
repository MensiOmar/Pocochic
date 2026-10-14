CREATE TABLE `categories` (
  `slug` text PRIMARY KEY NOT NULL,
  `parent_slug` text,
  `sort_order` integer NOT NULL,
  FOREIGN KEY (`parent_slug`) REFERENCES `categories`(`slug`)
);
--> statement-breakpoint
INSERT INTO `categories` (`slug`, `parent_slug`, `sort_order`) VALUES
  ('clothing', NULL, 1),
  ('accessories', NULL, 2),
  ('bags', NULL, 3),
  ('makeup', NULL, 4);
--> statement-breakpoint
INSERT INTO `categories` (`slug`, `parent_slug`, `sort_order`) VALUES
  ('t-shirt', 'clothing', 1),
  ('hoodie', 'clothing', 2),
  ('zip-hoodie', 'clothing', 3),
  ('sweatshirt', 'clothing', 4),
  ('socks', 'clothing', 5),
  ('earrings', 'accessories', 1),
  ('earring-set', 'accessories', 2),
  ('necklaces', 'accessories', 3),
  ('rings', 'accessories', 4),
  ('bracelet', 'accessories', 5),
  ('pins', 'accessories', 6),
  ('keychains', 'accessories', 7),
  ('phone-chain', 'accessories', 8),
  ('hair-clips', 'accessories', 9),
  ('charm', 'accessories', 10),
  ('pack', 'accessories', 11),
  ('tote', 'bags', 1),
  ('wallet', 'bags', 2),
  ('lips', 'makeup', 1),
  ('cheeks', 'makeup', 2),
  ('eyes', 'makeup', 3),
  ('face', 'makeup', 4),
  ('body', 'makeup', 5);
--> statement-breakpoint
ALTER TABLE `styles` ADD `category_slug` text REFERENCES `categories`(`slug`);
--> statement-breakpoint
CREATE INDEX `styles_category_slug_idx` ON `styles` (`category_slug`);
