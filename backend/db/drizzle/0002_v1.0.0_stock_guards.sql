CREATE TRIGGER variants_guard_update
BEFORE UPDATE OF quantity, pending_qty, sold_qty ON variants
WHEN NEW.quantity < 0
  OR NEW.pending_qty < 0
  OR NEW.sold_qty < 0
  OR NEW.pending_qty + NEW.sold_qty > NEW.quantity
BEGIN
  SELECT RAISE(ABORT, 'stock_guard');
END;
--> statement-breakpoint
CREATE TRIGGER discounts_guard_update
BEFORE UPDATE OF used_number ON discounts
WHEN NEW.used_number < 0 OR NEW.used_number > NEW.available_number
BEGIN
  SELECT RAISE(ABORT, 'promo_guard');
END;
