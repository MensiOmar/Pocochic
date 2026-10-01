import {
  CONFIRMATION_STORAGE_KEY,
  checkoutResponseSchema,
  type CheckoutResponse,
} from "@pocochic/contracts";

export const ADDRESS_MAX = 80;
export const SOCIAL_MAX = 160;
export const NAME_MAX = 120;

export type CheckoutFields = {
  firstName: string;
  lastName: string;
  phone: string;
  governorateId: string;
  delegationId: string;
  address: string;
  social: string;
};

export type CheckoutIssue =
  | "firstName"
  | "lastName"
  | "phone"
  | "governorate"
  | "city"
  | "address"
  | "addressLong"
  | "socialLong"
  | "nameLong";

const BLOCKING: ReadonlySet<CheckoutIssue> = new Set(["addressLong", "socialLong", "nameLong"]);

export function phoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function joinName(first: string, last: string): string {
  return `${first.trim()} ${last.trim()}`.replace(/\s+/g, " ").trim();
}

export function checkoutIssues(fields: CheckoutFields): CheckoutIssue[] {
  const issues: CheckoutIssue[] = [];
  if (!fields.firstName.trim()) issues.push("firstName");
  if (!fields.lastName.trim()) issues.push("lastName");
  if (joinName(fields.firstName, fields.lastName).length > NAME_MAX) issues.push("nameLong");
  if (phoneDigits(fields.phone).length !== 8) issues.push("phone");
  if (!fields.governorateId) issues.push("governorate");
  if (!fields.delegationId) issues.push("city");
  const address = fields.address.trim();
  if (!address) issues.push("address");
  else if (address.length > ADDRESS_MAX) issues.push("addressLong");
  if (fields.social.trim().length > SOCIAL_MAX) issues.push("socialLong");
  return issues;
}

export function isBlockingIssue(issue: CheckoutIssue): boolean {
  return BLOCKING.has(issue);
}

export function summaryMeta(line: { reference: string; size: string }, qtyLabel: string, quantity: number): string {
  return [...[line.reference.trim(), line.size.trim()].filter((part) => part.length > 0), `${qtyLabel} ${quantity}`].join(" · ");
}

export function saveReceipt(order: CheckoutResponse): void {
  sessionStorage.setItem(CONFIRMATION_STORAGE_KEY, JSON.stringify(order));
}

export function readReceipt(): CheckoutResponse | null {
  try {
    const raw = sessionStorage.getItem(CONFIRMATION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = checkoutResponseSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
