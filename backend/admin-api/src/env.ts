import { createFactory } from "hono/factory";
import type { D1Like, SqlPort } from "@pocochic/db/sql";

export type Bindings = {
  DB: D1Like;
  ADMIN_WEB_ORIGIN: string;
  ADMIN_SESSION_SECRET: string;
};

export type Variables = {
  requestId: string;
  sql: SqlPort;
};

export const factory = createFactory<{ Bindings: Bindings; Variables: Variables }>();
export const SESSION_COOKIE = "pocochic_admin";
