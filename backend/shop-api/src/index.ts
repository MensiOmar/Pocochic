import { Hono } from "hono";

const app = new Hono();

// Local dev health check - verifies connection to docker services via env
app.get("/health", (c) => {
  const dbUrl = process.env.DATABASE_URL || "not-set";
  const minioEndpoint = process.env.MINIO_ENDPOINT || "not-set";
  const bucket = process.env.MINIO_BUCKET || "not-set";
  const nodeEnv = process.env.NODE_ENV || "not-set";

  return c.json({
    status: "ok",
    service: "shop-api",
    env: {
      NODE_ENV: nodeEnv,
      hasDatabaseUrl: dbUrl !== "not-set",
      databaseUrlPrefix: dbUrl.split("://")[0] || "file",
      minioEndpoint,
      minioBucket: bucket,
    },
    note: "Local dev using docker sqlite + minio. See pocochic/DEVELOPMENT.md",
  });
});

app.get("/", (c) => c.text("POCOCHIC Shop API - local dev"));

export default app;
