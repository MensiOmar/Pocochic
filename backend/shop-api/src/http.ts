import type { Context } from "hono";
import type { ErrorCode, StockConflictItem } from "@pocochic/contracts";

export function errorJson(
  c: Context,
  status: 400 | 401 | 404 | 409 | 422,
  code: ErrorCode,
  message: string,
  items?: StockConflictItem[],
) {
  return c.json({ error: { code, message, ...(items ? { items } : {}) } }, status);
}

export function validationHook(result: { success: boolean }, c: Context) {
  if (!result.success) {
    return errorJson(c, 400, "validation", "Invalid request");
  }
}
