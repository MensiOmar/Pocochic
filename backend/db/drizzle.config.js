import { defineConfig } from "drizzle-kit";

const getDatabaseUrl = () => {
  const raw = process.env.DATABASE_URL || "sqlite://./data/pocochic.db";  // ./ relative to pocochic/ product root (cwd when running npm workspace scripts)
  // Support sqlite:// prefix (from .env.example) or bare path
  return raw.replace(/^sqlite:\/\//, "");
};

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: getDatabaseUrl(),
  },
  // For local dev only; prod uses wrangler d1 (see Stack.md)
  verbose: true,
  strict: true,
});
