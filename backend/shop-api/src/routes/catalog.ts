import { factory } from "../env.js";

async function stream(c: { env: { CATALOG?: { get(key: string): Promise<{ body: ReadableStream; httpMetadata?: { contentType?: string } } | null> } }; notFound: () => Response }, key: string) {
  const object = await c.env.CATALOG?.get(key);
  if (!object) return c.notFound();
  return new Response(object.body, {
    headers: {
      "Content-Type": object.httpMetadata?.contentType ?? "image/webp",
      "Cache-Control": "public, max-age=86400",
    },
  });
}

export const catalogRoutes = factory.createApp().get("/catalog/*", (c) => {
  const key = c.req.path.replace(/^\//, "");
  if (!/^catalog\/(?:styles|tk)\/[a-z0-9][a-z0-9/_-]*\.webp$/.test(key)) return c.notFound();
  return stream(c, key);
});
