import { factory } from "../env.js";

export const thankYouRoutes = factory.createApp().get("/thank-you", async (c) => {
  const locale = c.req.query("locale") ?? "fr";
  const picked = locale === "ar" || locale === "en" || locale === "fr" ? locale : "fr";
  const row = await c.var.sql.get<{ body: string; image_path: string | null }>(
    "SELECT body, image_path FROM thank_you WHERE locale = ?",
    [picked],
  );
  if (row?.body.trim()) {
    return c.json({ locale: picked, body: row.body, imagePath: row.image_path });
  }
  const source = await c.var.sql.get<{ body: string; image_path: string | null }>(
    "SELECT body, image_path FROM thank_you WHERE locale = 'source'",
  );
  return c.json({ locale: "source", body: source?.body ?? "", imagePath: source?.image_path ?? null });
});
