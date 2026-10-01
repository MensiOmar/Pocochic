import { createFactory } from "hono/factory";
import type { D1Like, SqlPort } from "@pocochic/db/sql";

export type CatalogObject = {
  body: ReadableStream;
  httpMetadata?: { contentType?: string };
};

export type CatalogLike = {
  get(key: string): Promise<CatalogObject | null>;
};

export type Bindings = {
  DB: D1Like;
  CATALOG?: CatalogLike;
  SHOP_WEB_ORIGIN: string;
  SHOP_ALERT_EMAIL: string;
  SHOP_ALERT_FROM: string;
  RESEND_API_KEY?: string;
  AWAIT_ALERT?: string;
  LOG_ALERTS?: string;
};

export type Variables = {
  requestId: string;
  sql: SqlPort;
};

export const factory = createFactory<{ Bindings: Bindings; Variables: Variables }>();
