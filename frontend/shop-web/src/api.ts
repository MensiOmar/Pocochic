import type { ShopAppType } from "@pocochic/shop-api";
import { hc } from "hono/client";

export const apiOrigin = import.meta.env.VITE_API_ORIGIN ?? "";

export const api = hc<ShopAppType>(apiOrigin || window.location.origin);

const CATALOG_PATH = /^\/catalog\/[a-z0-9][a-z0-9/_-]*\.(webp|jpg|jpeg|png)$/i;

export function catalogSrc(imagePath: string | null): string | null {
  if (!imagePath || imagePath.includes("://") || !CATALOG_PATH.test(imagePath)) return null;
  return `${apiOrigin}${imagePath}`;
}
