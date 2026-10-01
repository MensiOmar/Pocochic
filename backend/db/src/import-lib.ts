import type Database from "better-sqlite3";
import { ulid } from "./ulid.js";

export type Report = {
  ok: boolean;
  counts: Record<string, number>;
  expected: Record<string, number>;
  warnings: string[];
  errors: string[];
  openingPending: { itemCode: string; pendingQty: number }[];
  missingImages: string[];
  availableMismatches: string[];
  usedFlagMismatches: string[];
};

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((item) => item.some((value) => value.trim() !== ""));
}

export function records(text: string): Record<string, string>[] {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];
  const headers = rows[0].map((header) => header.trim());
  return rows.slice(1).map((values) => {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = values[index] ?? "";
    });
    return record;
  });
}

export function tndToCents(raw: string): number {
  const value = raw.trim().replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(value)) {
    throw new Error(`price not convertible to integer cents: ${raw}`);
  }
  const [whole, frac = ""] = value.split(".");
  if (frac.length > 2) {
    throw new Error(`price has a third decimal: ${raw}`);
  }
  return Number(whole) * 100 + Number(frac.padEnd(2, "0"));
}

export function slugify(item: string): string {
  const slug = item
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.slice(0, 80) || "style";
}

export function splitThankYou(blob: string): { ar: string; en: string; fr: string; source: string; warned: boolean } {
  const parts = blob
    .split(/\r?\n/)
    .reduce<{ chunks: string[]; current: string[] }>((acc, line) => {
      if (/^\*{3,}$/.test(line.trim())) {
        acc.chunks.push(acc.current.join("\n").trim());
        acc.current = [];
      } else {
        acc.current.push(line);
      }
      return acc;
    }, { chunks: [], current: [] });
  if (parts.current.length > 0) parts.chunks.push(parts.current.join("\n").trim());
  const chunks = parts.chunks.filter((chunk) => chunk.length > 0);
  if (chunks.length !== 3) {
    return { ar: "", en: "", fr: "", source: blob, warned: true };
  }
  return { ar: chunks[0], en: chunks[1], fr: chunks[2], source: blob, warned: false };
}

type StyleDraft = {
  itemCode: string;
  slug: string;
  displayName: string;
  description: string | null;
  imageFile: string | null;
  variants: {
    size: string;
    reference: string;
    priceCents: number;
    quantity: number;
    pendingQty: number;
    soldQty: number;
    sheetAvailable: number | null;
  }[];
};

export function buildInventory(text: string): { styles: StyleDraft[]; errors: string[] } {
  const errors: string[] = [];
  const grouped = new Map<string, StyleDraft>();
  const seen = new Set<string>();
  for (const row of records(text)) {
    const itemCode = (row.Item ?? "").trim();
    if (!itemCode) continue;
    const size = (row.Sizes ?? "").trim();
    const reference = (row.Reference ?? "").trim();
    const key = `${itemCode}\u0000${size}\u0000${reference}`;
    if (seen.has(key)) {
      errors.push(`duplicated natural key: ${itemCode} / ${size} / ${reference}`);
      continue;
    }
    seen.add(key);
    let priceCents = 0;
    try {
      priceCents = tndToCents(row.Price ?? "");
    } catch (err) {
      errors.push(`${itemCode}: ${err instanceof Error ? err.message : "bad price"}`);
      continue;
    }
    const quantity = Number(row.Quantity ?? "0");
    const pendingQty = Number(row["Pending Quantity"] ?? "0");
    const soldQty = Number(row["Sold Quantity"] ?? "0");
    if (![quantity, pendingQty, soldQty].every((n) => Number.isInteger(n) && n >= 0)) {
      errors.push(`${itemCode}: stock buckets must be non-negative integers`);
      continue;
    }
    if (pendingQty + soldQty > quantity) {
      errors.push(`${itemCode}: pending + sold exceeds quantity`);
      continue;
    }
    const sheetAvailable = row["Available Qty"]?.trim() ? Number(row["Available Qty"]) : null;
    let style = grouped.get(itemCode);
    if (!style) {
      style = {
        itemCode,
        slug: slugify(itemCode),
        displayName: itemCode,
        description: null,
        imageFile: (row.Image ?? "").trim() || null,
        variants: [],
      };
      grouped.set(itemCode, style);
    }
    const description = (row.Description ?? "").trim();
    if (description && !style.description) style.description = description;
    style.variants.push({ size, reference, priceCents, quantity, pendingQty, soldQty, sheetAvailable });
  }
  const slugs = new Map<string, string>();
  for (const style of grouped.values()) {
    const refs = style.variants.map((variant) => variant.reference);
    const filled = refs.filter(Boolean);
    if (filled.length === refs.length && new Set(filled).size === 1) style.displayName = filled[0];
    let slug = style.slug;
    let n = 2;
    while (slugs.has(slug) && slugs.get(slug) !== style.itemCode) {
      slug = `${style.slug}-${n}`;
      n += 1;
    }
    style.slug = slug;
    slugs.set(slug, style.itemCode);
  }
  return { styles: [...grouped.values()], errors };
}

export type StoragePort = {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
};

export async function applyImport(
  db: Database.Database,
  input: {
    inventoryCsv: string;
    discountsCsv: string;
    governoratesCsv: string;
    delegationsCsv: string;
    tkCsv: string;
    expected?: Record<string, number>;
    forceStock?: boolean;
    releaseOpeningPending?: boolean;
    imageFor?: (itemCode: string, imageColumn: string | null) => Buffer | null;
    storage?: StoragePort;
    now?: string;
  },
): Promise<Report> {
  const now = input.now ?? new Date().toISOString();
  const warnings: string[] = [];
  const errors: string[] = [];
  const missingImages: string[] = [];
  const availableMismatches: string[] = [];
  const usedFlagMismatches: string[] = [];
  const inventory = buildInventory(input.inventoryCsv);
  errors.push(...inventory.errors);
  const discountRows = records(input.discountsCsv).filter((row) => (row.Discount_ID ?? "").trim());
  const governorateRows = records(input.governoratesCsv).filter((row) => (row.name ?? "").trim());
  const delegationRows = records(input.delegationsCsv).filter((row) => (row.name ?? "").trim());
  const tkRows = records(input.tkCsv);
  const expected = input.expected ?? {
    styles: inventory.styles.length,
    variants: inventory.styles.reduce((sum, style) => sum + style.variants.length, 0),
    discounts: discountRows.length,
    governorates: governorateRows.length,
    delegations: delegationRows.length,
  };

  const orderCount = Number((db.prepare("SELECT COUNT(*) AS n FROM orders").get() as { n: number }).n);
  const overwriteStock = orderCount === 0 || input.forceStock === true;
  if (!overwriteStock) warnings.push("orders exist; stock buckets left unchanged (pass --force-stock to overwrite)");

  const tx = db.transaction(() => {
    const govIds = new Map<string, string>();
    governorateRows.forEach((row, index) => {
      const name = row.name.trim();
      const existing = db.prepare("SELECT id FROM governorates WHERE name = ?").get(name) as { id: string } | undefined;
      const id = existing?.id ?? ulid();
      db.prepare(
        `INSERT INTO governorates (id, name, sort_order) VALUES (?, ?, ?)
         ON CONFLICT(name) DO UPDATE SET sort_order = excluded.sort_order`,
      ).run(id, name, index + 1);
      govIds.set(name, id);
    });
    for (const row of delegationRows) {
      const govName = (row.governorate ?? "").trim();
      const govId = govIds.get(govName);
      if (!govId) {
        errors.push(`delegation ${row.name} points at unknown governorate ${govName}`);
        continue;
      }
      const existing = db.prepare(
        "SELECT id FROM delegations WHERE governorate_id = ? AND name = ?",
      ).get(govId, row.name.trim()) as { id: string } | undefined;
      db.prepare(
        `INSERT INTO delegations (id, governorate_id, name) VALUES (?, ?, ?)
         ON CONFLICT(governorate_id, name) DO NOTHING`,
      ).run(existing?.id ?? ulid(), govId, row.name.trim());
    }
    for (const row of discountRows) {
      const code = row.Discount_ID.trim();
      const type = (row.Type ?? "").trim().toLowerCase();
      if (type !== "percent" && type !== "free" && type !== "discount") {
        errors.push(`discount ${code} has unknown type ${type}`);
        continue;
      }
      let percentOff: number | null = null;
      let amountCents: number | null = null;
      try {
        if (type === "percent") percentOff = Number(row.Amount);
        else amountCents = tndToCents(row.Amount ?? "0");
      } catch (err) {
        errors.push(`${code}: ${err instanceof Error ? err.message : "bad amount"}`);
        continue;
      }
      const usedNumber = Number(row["Used Number"] ?? "0");
      const availableNumber = Number(row["Available Number"] ?? "0");
      const sheetUsed = /^(1|true|yes)$/i.test((row["Used?"] ?? "").trim()) ? 1 : 0;
      const sheetSaysUsed = sheetUsed === 1;
      const countersSayUsed = usedNumber >= availableNumber;
      if (sheetSaysUsed !== countersSayUsed) {
        usedFlagMismatches.push(`${code}: Used?=${row["Used?"]} but used ${usedNumber} / available ${availableNumber}`);
      }
      const existing = db.prepare("SELECT id, used_number FROM discounts WHERE code = ?").get(code) as
        | { id: string; used_number: number }
        | undefined;
      const used = existing && orderCount > 0 ? existing.used_number : usedNumber;
      db.prepare(
        `INSERT INTO discounts (
          id, code, type, percent_off, amount_cents, min_count, available_number, used_number, sheet_used_flag
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(code) DO UPDATE SET
          type = excluded.type,
          percent_off = excluded.percent_off,
          amount_cents = excluded.amount_cents,
          min_count = excluded.min_count,
          available_number = excluded.available_number,
          used_number = ?,
          sheet_used_flag = excluded.sheet_used_flag`,
      ).run(
        existing?.id ?? ulid(),
        code,
        type,
        percentOff,
        amountCents,
        Number(row.Min_count || "0"),
        availableNumber,
        used,
        sheetUsed,
        used,
      );
    }
    for (const style of inventory.styles) {
      const existing = db.prepare("SELECT id FROM styles WHERE item_code = ?").get(style.itemCode) as { id: string } | undefined;
      const styleId = existing?.id ?? ulid();
      db.prepare(
        `INSERT INTO styles (id, item_code, slug, display_name, description, image_path, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, NULL, ?, ?)
         ON CONFLICT(item_code) DO UPDATE SET
           slug = excluded.slug,
           display_name = excluded.display_name,
           description = excluded.description,
           updated_at = excluded.updated_at`,
      ).run(styleId, style.itemCode, style.slug, style.displayName, style.description, now, now);
      for (const variant of style.variants) {
        const recomputed = variant.quantity - variant.pendingQty - variant.soldQty;
        if (variant.sheetAvailable !== null && variant.sheetAvailable !== recomputed) {
          availableMismatches.push(
            `${style.itemCode} ${variant.size} ${variant.reference}: sheet ${variant.sheetAvailable} vs recomputed ${recomputed}`,
          );
        }
        const current = db.prepare(
          "SELECT id FROM variants WHERE style_id = ? AND size = ? AND reference = ?",
        ).get(styleId, variant.size, variant.reference) as { id: string } | undefined;
        db.prepare(
          `INSERT INTO variants (
            id, style_id, size, reference, price_cents, quantity, pending_qty, sold_qty, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(style_id, size, reference) DO UPDATE SET
            price_cents = excluded.price_cents,
            quantity = CASE WHEN ? = 1 THEN excluded.quantity ELSE variants.quantity END,
            pending_qty = CASE WHEN ? = 1 THEN excluded.pending_qty ELSE variants.pending_qty END,
            sold_qty = CASE WHEN ? = 1 THEN excluded.sold_qty ELSE variants.sold_qty END,
            updated_at = excluded.updated_at`,
        ).run(
          current?.id ?? ulid(),
          styleId,
          variant.size,
          variant.reference,
          variant.priceCents,
          variant.quantity,
          variant.pendingQty,
          variant.soldQty,
          now,
          now,
          overwriteStock ? 1 : 0,
          overwriteStock ? 1 : 0,
          overwriteStock ? 1 : 0,
        );
      }
    }
    const tk = tkRows[0];
    const blob = tk?.Message ?? "";
    const split = splitThankYou(blob);
    if (split.warned) warnings.push("TK blob did not split into AR/EN/FR; serving source for every language");
    const locales = [
      ["ar", split.ar],
      ["en", split.en],
      ["fr", split.fr],
      ["source", split.source],
    ] as const;
    for (const [locale, body] of locales) {
      db.prepare(
        `INSERT INTO thank_you (locale, body, image_path) VALUES (?, ?, NULL)
         ON CONFLICT(locale) DO UPDATE SET body = excluded.body`,
      ).run(locale, body);
    }
    if (input.releaseOpeningPending && overwriteStock) {
      db.prepare("UPDATE variants SET pending_qty = 0, updated_at = ?").run(now);
      warnings.push("opening pending released by flag");
    }
  });
  if (errors.length === 0) tx();

  if (errors.length === 0 && input.imageFor && input.storage) {
    for (const style of inventory.styles) {
      const bytes = input.imageFor(style.itemCode, style.imageFile);
      const key = `catalog/styles/${style.slug}.webp`;
      const imagePath = `/catalog/styles/${style.slug}.webp`;
      if (!bytes) {
        missingImages.push(style.itemCode);
        db.prepare("UPDATE styles SET image_path = NULL, updated_at = ? WHERE item_code = ?").run(now, style.itemCode);
        continue;
      }
      await input.storage.put(key, bytes, "image/webp");
      db.prepare("UPDATE styles SET image_path = ?, updated_at = ? WHERE item_code = ?").run(imagePath, now, style.itemCode);
    }
  }

  const counts = {
    styles: Number((db.prepare("SELECT COUNT(*) AS n FROM styles").get() as { n: number }).n),
    variants: Number((db.prepare("SELECT COUNT(*) AS n FROM variants").get() as { n: number }).n),
    discounts: Number((db.prepare("SELECT COUNT(*) AS n FROM discounts").get() as { n: number }).n),
    governorates: Number((db.prepare("SELECT COUNT(*) AS n FROM governorates").get() as { n: number }).n),
    delegations: Number((db.prepare("SELECT COUNT(*) AS n FROM delegations").get() as { n: number }).n),
  };
  if (errors.length === 0) {
    for (const [key, value] of Object.entries(expected)) {
      if (counts[key as keyof typeof counts] !== undefined && counts[key as keyof typeof counts] !== value) {
        errors.push(`count mismatch ${key}: db ${counts[key as keyof typeof counts]} vs source ${value}`);
      }
    }
  }
  const openingPending = db.prepare(
    `SELECT s.item_code AS itemCode, SUM(v.pending_qty) AS pendingQty
     FROM variants v JOIN styles s ON s.id = v.style_id
     GROUP BY s.item_code HAVING pendingQty > 0`,
  ).all() as { itemCode: string; pendingQty: number }[];

  return {
    ok: errors.length === 0,
    counts,
    expected,
    warnings,
    errors,
    openingPending,
    missingImages,
    availableMismatches,
    usedFlagMismatches,
  };
}
