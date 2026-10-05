import { z } from "zod";

export const LOCALES = ["fr", "ar", "en"] as const;
export const localeSchema = z.enum(LOCALES);
export type Locale = z.infer<typeof localeSchema>;

export const ORDER_STATUS = {
  pending: "pending",
  paid: "paid",
  inTransit: "in_transit",
  cancelled: "cancelled",
} as const;

export const orderStatusSchema = z.enum([
  ORDER_STATUS.pending,
  ORDER_STATUS.paid,
  ORDER_STATUS.inTransit,
  ORDER_STATUS.cancelled,
]);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

export const DELIVERY_FEE_CENTS = 800;

export const CART_STORAGE_KEY = "pocochic.cart.v1";
export const LOCALE_STORAGE_KEY = "pocochic.locale.v1";
export const CONFIRMATION_STORAGE_KEY = "pocochic.confirmation.v1";

const catalogPath = z
  .string()
  .regex(/^\/catalog\/[a-z0-9][a-z0-9/_-]*\.(webp|jpg|jpeg|png)$/i)
  .nullable();

export const styleListItemSchema = z.object({
  slug: z.string(),
  itemCode: z.string(),
  displayName: z.string(),
  imagePath: catalogPath,
  priceCents: z.number().int().nonnegative(),
  priceVaries: z.boolean(),
  isAvailable: z.boolean(),
  isSoldOut: z.boolean(),
  sizes: z.array(z.string()),
  inStockVariantCount: z.number().int().nonnegative(),
  soleVariant: z.object({
    id: z.string(),
    size: z.string(),
    reference: z.string(),
    priceCents: z.number().int().nonnegative(),
    availableQty: z.number().int().nonnegative(),
  }).nullable(),
});
export type StyleListItem = z.infer<typeof styleListItemSchema>;

export const variantSchema = z.object({
  id: z.string(),
  size: z.string(),
  reference: z.string(),
  priceCents: z.number().int().nonnegative(),
  availableQty: z.number().int().nonnegative(),
});
export type Variant = z.infer<typeof variantSchema>;

export const styleDetailSchema = styleListItemSchema.extend({
  description: z.string().nullable(),
  variants: z.array(variantSchema),
});
export type StyleDetail = z.infer<typeof styleDetailSchema>;

export const governorateSchema = z.object({
  id: z.string(),
  name: z.string(),
});
export type Governorate = z.infer<typeof governorateSchema>;

export const delegationSchema = z.object({
  id: z.string(),
  name: z.string(),
  governorateId: z.string(),
});
export type Delegation = z.infer<typeof delegationSchema>;

export const cartLineSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.number().int().positive().max(99),
});
export type CartLine = z.infer<typeof cartLineSchema>;

export const storedCartLineSchema = cartLineSchema.extend({
  slug: z.string(),
  itemCode: z.string(),
  displayName: z.string(),
  size: z.string(),
  reference: z.string(),
  unitPriceCents: z.number().int().nonnegative(),
  imagePath: z.string().nullable(),
  availableQty: z.number().int().nonnegative(),
});
export type StoredCartLine = z.infer<typeof storedCartLineSchema>;

export const promoQuoteRequestSchema = z.object({
  code: z.string().trim().min(1).max(80),
  lines: z.array(cartLineSchema).min(1).max(50),
});
export type PromoQuoteRequest = z.infer<typeof promoQuoteRequestSchema>;

export const promoQuoteSchema = z.object({
  code: z.string(),
  type: z.enum(["percent", "free", "discount"]),
  discountCents: z.number().int().nonnegative(),
  itemsCents: z.number().int().nonnegative(),
  deliveryCents: z.number().int().nonnegative(),
  totalCents: z.number().int().nonnegative(),
});
export type PromoQuote = z.infer<typeof promoQuoteSchema>;

export const checkoutCustomerSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  phone: z.string().regex(/^\d{8}$/),
  governorateId: z.string().min(1),
  delegationId: z.string().min(1),
  city: z.string().trim().min(1).max(80),
  socialHandle: z.string().trim().max(160).optional(),
  comment: z.string().trim().max(500).optional(),
});

export const checkoutRequestSchema = z.object({
  locale: localeSchema,
  customer: checkoutCustomerSchema,
  lines: z.array(cartLineSchema).min(1).max(50),
  promoCode: z.string().trim().min(1).max(80).optional(),
  idempotencyKey: z.string().uuid().optional(),
});
export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;

export const orderLineSnapshotSchema = z.object({
  variantId: z.string(),
  itemCode: z.string(),
  displayName: z.string(),
  size: z.string(),
  reference: z.string(),
  quantity: z.number().int().positive(),
  unitPriceCents: z.number().int().nonnegative(),
  lineTotalCents: z.number().int().nonnegative(),
});
export type OrderLineSnapshot = z.infer<typeof orderLineSnapshotSchema>;

export const thankYouSchema = z.object({
  locale: z.enum(["fr", "ar", "en", "source"]),
  body: z.string(),
  imagePath: catalogPath,
});
export type ThankYou = z.infer<typeof thankYouSchema>;

export const checkoutResponseSchema = z.object({
  id: z.string(),
  orderNumber: z.string(),
  status: orderStatusSchema,
  itemsCents: z.number().int(),
  deliveryCents: z.number().int(),
  discountCents: z.number().int(),
  totalCents: z.number().int(),
  promoCode: z.string().nullable(),
  lines: z.array(orderLineSnapshotSchema),
  thankYou: thankYouSchema,
});
export type CheckoutResponse = z.infer<typeof checkoutResponseSchema>;

export const stockConflictItemSchema = z.object({
  variantId: z.string(),
  itemCode: z.string(),
  displayName: z.string(),
  size: z.string(),
  reference: z.string(),
  requested: z.number().int(),
  available: z.number().int(),
});
export type StockConflictItem = z.infer<typeof stockConflictItemSchema>;

export const errorCodeSchema = z.enum([
  "validation",
  "stock_conflict",
  "promo_unknown",
  "promo_exhausted",
  "promo_min_count",
  "illegal_transition",
  "unauthorized",
  "not_found",
]);

export const errorBodySchema = z.object({
  error: z.object({
    code: errorCodeSchema,
    message: z.string(),
    items: z.array(stockConflictItemSchema).optional(),
  }),
});
export type ErrorBody = z.infer<typeof errorBodySchema>;
export type ErrorCode = z.infer<typeof errorCodeSchema>;

export const orderSummarySchema = z.object({
  id: z.string(),
  orderNumber: z.string(),
  createdAt: z.string(),
  fullName: z.string(),
  phone: z.string(),
  governorate: z.string(),
  delegation: z.string(),
  city: z.string(),
  itemCount: z.number().int(),
  totalCents: z.number().int(),
  promoCode: z.string().nullable(),
  status: orderStatusSchema,
});
export type OrderSummary = z.infer<typeof orderSummarySchema>;

export const orderDetailSchema = orderSummarySchema.extend({
  socialHandle: z.string().nullable(),
  comment: z.string().nullable(),
  locale: localeSchema,
  itemsCents: z.number().int(),
  deliveryCents: z.number().int(),
  discountCents: z.number().int(),
  alertSentAt: z.string().nullable(),
  lines: z.array(
    orderLineSnapshotSchema.extend({
      imagePath: z.string().nullable(),
    }),
  ),
});
export type OrderDetail = z.infer<typeof orderDetailSchema>;

export const orderListSchema = z.object({
  orders: z.array(orderSummarySchema),
  total: z.number().int(),
});
export type OrderList = z.infer<typeof orderListSchema>;

export const transitionRequestSchema = z.object({
  to: z.enum(["paid", "in_transit", "cancelled"]),
});
export type TransitionRequest = z.infer<typeof transitionRequestSchema>;

export const sessionRequestSchema = z.object({
  secret: z.string().min(1),
});

export function formatTnd(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100);
  const frac = abs % 100;
  const amount = frac === 0 ? String(whole) : `${whole}.${String(frac).padStart(2, "0")}`;
  return `${sign}${amount}`;
}
