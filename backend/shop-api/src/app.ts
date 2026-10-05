import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { d1Port } from "@pocochic/db/sql";
import { factory } from "./env.js";
import { catalogRoutes } from "./routes/catalog.js";
import { checkoutRoutes } from "./routes/checkout.js";
import { governorateRoutes } from "./routes/governorates.js";
import { healthRoutes } from "./routes/health.js";
import { promoRoutes } from "./routes/promos.js";
import { styleRoutes } from "./routes/styles.js";
import { thankYouRoutes } from "./routes/thank-you.js";

export const app = factory.createApp()
  .use("*", logger())
  // Registered before secureHeaders so this runs after it. Catalog images are
  // embedded by the shop on another origin; same-origin CORP makes the browser drop them.
  .use("*", async (c, next) => {
    await next();
    if (c.req.path.startsWith("/catalog/")) {
      c.res.headers.set("Cross-Origin-Resource-Policy", "cross-origin");
    }
  })
  .use("*", secureHeaders())
  .use("*", cors({
    origin: (origin, c) => {
      const allowed = c.env.SHOP_WEB_ORIGIN;
      if (!origin || origin === allowed) return origin || allowed;
      return "";
    },
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type"],
  }))
  .use("*", async (c, next) => {
    c.set("requestId", crypto.randomUUID());
    if (c.req.path !== "/health") c.set("sql", d1Port(c.env.DB));
    await next();
  })
  .route("/", healthRoutes)
  .route("/", styleRoutes)
  .route("/", governorateRoutes)
  .route("/", promoRoutes)
  .route("/", checkoutRoutes)
  .route("/", thankYouRoutes)
  .route("/", catalogRoutes);

export type ShopAppType = typeof app;
