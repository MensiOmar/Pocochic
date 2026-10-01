import { serve } from "@hono/node-server";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { asD1, openSqlite, pocochicRoot } from "@pocochic/db/sqlite";
import { app } from "./app.js";
import type { CatalogLike } from "./env.js";

function loadEnv(file: string) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq);
    if (process.env[key] === undefined) process.env[key] = trimmed.slice(eq + 1);
  }
}

const root = pocochicRoot();
loadEnv(path.join(root, ".env"));

function catalog(): CatalogLike {
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
  return {
    async get(key) {
      try {
        const obj = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
        const bytes = await obj.Body?.transformToByteArray();
        if (bytes) {
          return {
            body: new Blob([bytes]).stream(),
            httpMetadata: { contentType: obj.ContentType ?? "image/webp" },
          };
        }
      } catch {
        // MinIO is optional in local dev; fall through to the import mirror.
      }
      const file = path.join(root, "data/objects", key);
      if (!existsSync(file)) return null;
      const bytes = await readFile(file);
      return { body: new Blob([bytes]).stream(), httpMetadata: { contentType: "image/webp" } };
    },
  };
}

const dbUrl = (process.env.DATABASE_URL ?? `sqlite://${path.join(root, "data/pocochic.db")}`).replace(/^sqlite:\/\//, "");
const dbPath = path.isAbsolute(dbUrl) ? dbUrl : path.resolve(root, dbUrl);
const env = {
  DB: asD1(openSqlite(dbPath)),
  CATALOG: catalog(),
    SHOP_WEB_ORIGIN: process.env.SHOP_WEB_ORIGIN ?? "http://localhost:5173",
    SHOP_ALERT_EMAIL: process.env.SHOP_ALERT_EMAIL ?? "pocochicaccessories@gmail.com",
    SHOP_ALERT_FROM: process.env.SHOP_ALERT_FROM ?? "onboarding@resend.dev",
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    LOG_ALERTS: process.env.LOG_ALERTS ?? "1",
  AWAIT_ALERT: "1",
};
const port = Number(process.env.SHOP_API_PORT ?? process.env.PORT ?? 8787);

serve({
  fetch: (req) => app.fetch(req, env),
  port,
}, () => {
  console.log(`shop-api listening on ${port}`);
});
