import { CreateBucketCommand, HeadBucketCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { applyImport, buildInventory, records } from "../src/import-lib.js";
import { applyMigrations, openSqlite, pocochicRoot } from "../src/sqlite-port.js";

const root = pocochicRoot();
const importDir = process.env.IMPORT_DIR ?? path.join(root, "data/import");
const imagesDir = process.env.IMAGES_DIR ?? path.resolve(root, "../Inventory_Images");
const dbFile = (process.env.DATABASE_URL ?? `sqlite://${path.join(root, "data/pocochic.db")}`).replace(/^sqlite:\/\//, "");
const forceStock = process.argv.includes("--force-stock");
const releaseOpeningPending = process.argv.includes("--release-opening-pending");
const skipImages = process.argv.includes("--skip-images");

function read(name: string): string {
  return readFileSync(path.join(importDir, name), "utf8");
}

function nameKeys(name: string): string[] {
  const folded = name.replace(/['’ʼ]/g, "_");
  return [...new Set([name, name.toLowerCase(), folded, folded.toLowerCase()])];
}

function imageIndex(dir: string): Map<string, string> {
  const index = new Map<string, string>();
  const visit = (folder: string, depth: number) => {
    if (!existsSync(folder)) return;
    for (const name of readdirSync(folder)) {
      const full = path.join(folder, name);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        if (depth < 2) visit(full, depth + 1);
        continue;
      }
      if (!stat.isFile()) continue;
      for (const key of nameKeys(name)) index.set(key, full);
    }
  };
  visit(dir, 0);
  return index;
}

function findImage(index: Map<string, string>, itemCode: string, imageColumn: string | null): string | null {
  const base = imageColumn ? path.basename(imageColumn) : `${itemCode}.jpg`;
  for (const name of [base, `${itemCode}.jpg`]) {
    for (const key of nameKeys(name)) {
      const hit = index.get(key);
      if (hit) return hit;
    }
  }
  return null;
}

async function toWebp(file: string): Promise<Buffer> {
  return sharp(file).rotate().webp({ quality: 92, effort: 6, smartSubsample: false }).toBuffer();
}

async function storage() {
  const bucket = process.env.MINIO_BUCKET ?? "pocochic-catalog";
  const client = new S3Client({
    region: process.env.MINIO_REGION ?? "us-east-1",
    endpoint: process.env.MINIO_ENDPOINT ?? "http://localhost:9000",
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.MINIO_ROOT_USER ?? "minioadmin",
      secretAccessKey: process.env.MINIO_ROOT_PASSWORD ?? "minioadmin",
    },
  });
  let minio = true;
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch {
    try {
      await client.send(new CreateBucketCommand({ Bucket: bucket }));
    } catch {
      minio = false;
      console.warn("MinIO is not reachable; writing catalog objects under data/objects for the local API");
    }
  }
  return {
    async put(key: string, body: Buffer, contentType: string) {
      const file = path.join(root, "data/objects", key);
      mkdirSync(path.dirname(file), { recursive: true });
      writeFileSync(file, body);
      if (!minio) return;
      await client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: "public, max-age=86400",
      }));
    },
  };
}

const inventoryCsv = read("inventory.csv");
const built = buildInventory(inventoryCsv);
const index = imageIndex(imagesDir);
const webpByItem = new Map<string, Buffer>();
if (!skipImages) {
  for (const style of built.styles) {
    const file = findImage(index, style.itemCode, style.imageFile);
    if (!file) continue;
    webpByItem.set(style.itemCode, await toWebp(file));
  }
}

const db = openSqlite(path.resolve(root, dbFile.startsWith("/") ? dbFile : path.resolve(root, dbFile)));
const ready = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'styles'").get();
if (!ready) applyMigrations(db);

const report = await applyImport(db, {
  inventoryCsv,
  discountsCsv: read("discounts.csv"),
  governoratesCsv: read("governorates.csv"),
  delegationsCsv: read("delegations.csv"),
  tkCsv: read("tk.csv"),
  expected: {
    styles: built.styles.length,
    variants: built.styles.reduce((sum, style) => sum + style.variants.length, 0),
    discounts: records(read("discounts.csv")).filter((row) => row.Discount_ID?.trim()).length,
    governorates: records(read("governorates.csv")).filter((row) => row.name?.trim()).length,
    delegations: records(read("delegations.csv")).filter((row) => row.name?.trim()).length,
  },
  forceStock,
  releaseOpeningPending,
  imageFor: skipImages ? undefined : (itemCode) => webpByItem.get(itemCode) ?? null,
  storage: skipImages ? undefined : await storage(),
});

const tkHit = [...index.values()].find((file) => /thank/i.test(path.basename(file)));
if (!skipImages && tkHit && report.ok) {
  const bytes = await toWebp(tkHit);
  await (await storage()).put("catalog/tk/thank-you.webp", bytes, "image/webp");
  db.prepare("UPDATE thank_you SET image_path = ?").run("/catalog/tk/thank-you.webp");
}

writeFileSync(path.join(importDir, "reconciliation.json"), JSON.stringify(report, null, 2));
if (report.openingPending.length > 0) {
  console.log("opening pending (imported as-is):");
  for (const row of report.openingPending) console.log(`  ${row.itemCode}: ${row.pendingQty}`);
}
console.log(JSON.stringify({
  ok: report.ok,
  counts: report.counts,
  errors: report.errors,
  warnings: report.warnings,
  missingImages: report.missingImages.length,
  availableMismatches: report.availableMismatches.length,
  usedFlagMismatches: report.usedFlagMismatches,
}, null, 2));
if (!report.ok) process.exit(1);
