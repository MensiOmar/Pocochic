import { factory } from "../env.js";

export const healthRoutes = factory.createApp().get("/health", (c) => {
  return c.json({ status: "ok", service: "shop-api" });
});
