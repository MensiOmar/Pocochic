import { serve } from "@hono/node-server";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { asD1, openSqlite, pocochicRoot } from "@pocochic/db/sqlite";
import { app } from "./app.js";

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
const dbUrl = (process.env.DATABASE_URL ?? `sqlite://${path.join(root, "data/pocochic.db")}`).replace(/^sqlite:\/\//, "");
const dbPath = path.isAbsolute(dbUrl) ? dbUrl : path.resolve(root, dbUrl);
const env = {
  DB: asD1(openSqlite(dbPath)),
  ADMIN_WEB_ORIGIN: process.env.ADMIN_WEB_ORIGIN ?? "http://localhost:5174",
  ADMIN_SESSION_SECRET: process.env.ADMIN_SESSION_SECRET ?? "",
};
const port = Number(process.env.ADMIN_API_PORT ?? 8788);

serve({
  fetch: (req) => app.fetch(req, env),
  port,
}, () => {
  console.log(`admin-api listening on ${port}`);
});
