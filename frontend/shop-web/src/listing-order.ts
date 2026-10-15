export const SORTS = ["az", "za", "cheap", "pricey"] as const;

export type SortId = (typeof SORTS)[number];

export type NamedPrice = {
  displayName: string;
  priceCents: number;
};

export type Span = { min: number; max: number };

export type Domain = { floor: number; ceil: number };

export type ListingQuery = {
  q: string;
  page: number;
  sort: SortId | null;
  span: Span | null;
  floor: number;
  ceil: number;
};

function queryValue(value: unknown): string {
  if (Array.isArray(value)) return queryValue(value[0]);
  return typeof value === "string" ? value.trim() : "";
}

export function parseSort(value: unknown): SortId | null {
  const text = queryValue(value);
  if (text === "az" || text === "za" || text === "cheap" || text === "pricey") return text;
  return null;
}

function byName(a: NamedPrice, b: NamedPrice, locale: string): number {
  return a.displayName.localeCompare(b.displayName, locale, { sensitivity: "base", numeric: true });
}

/** Keep API order when sort is unset. Price ties stay A-Z in the active locale. */
export function orderStyles<T extends NamedPrice>(items: readonly T[], sort: SortId | null, locale: string): T[] {
  const copy = items.slice();
  if (!sort) return copy;
  copy.sort((a, b) => {
    if (sort === "za") return byName(b, a, locale);
    if (sort === "cheap" || sort === "pricey") {
      const diff = a.priceCents - b.priceCents;
      if (diff !== 0) return sort === "cheap" ? diff : -diff;
    }
    return byName(a, b, locale);
  });
  return copy;
}

/** Whole-dinar track from the loaded card prices. Null when the list is empty. */
export function dinarDomain(cents: readonly number[]): Domain | null {
  if (cents.length === 0) return null;
  let low = cents[0] ?? 0;
  let high = low;
  for (const value of cents) {
    if (value < low) low = value;
    if (value > high) high = value;
  }
  return { floor: Math.floor(low / 100), ceil: Math.ceil(high / 100) };
}

/** Min dinar N includes N.00 and up. Max dinar N includes through N.99. */
export function matchesPrice(priceCents: number, minDinar: number, maxDinar: number): boolean {
  return priceCents >= minDinar * 100 && priceCents < (maxDinar + 1) * 100;
}

function parseDinar(value: unknown): number | null {
  const text = queryValue(value);
  if (!/^\d{1,4}$/.test(text)) return null;
  return Number(text);
}

function clampDinar(value: number, floor: number, ceil: number): number {
  return Math.min(ceil, Math.max(floor, value));
}

/** Unknown min/max are ignored. A crossed pair falls back to the full span. */
export function spanFromQuery(minRaw: unknown, maxRaw: unknown, floor: number, ceil: number): Span {
  const min = parseDinar(minRaw);
  const max = parseDinar(maxRaw);
  const nextMin = min == null ? floor : clampDinar(min, floor, ceil);
  const nextMax = max == null ? ceil : clampDinar(max, floor, ceil);
  if (nextMin > nextMax) return { min: floor, max: ceil };
  return { min: nextMin, max: nextMax };
}

/** Drop a bound that sits on the catalog edge so the URL stays short. */
export function spanQuery(span: Span, floor: number, ceil: number): { min?: string; max?: string } {
  const query: { min?: string; max?: string } = {};
  if (span.min !== floor) query.min = String(span.min);
  if (span.max !== ceil) query.max = String(span.max);
  return query;
}

export function listingQuery(input: ListingQuery): Record<string, string> {
  const query: Record<string, string> = {};
  const trimmed = input.q.trim();
  if (trimmed) query.q = trimmed;
  if (input.page > 1) query.page = String(input.page);
  if (input.sort) query.sort = input.sort;
  if (input.span) {
    const priced = spanQuery(input.span, input.floor, input.ceil);
    if (priced.min) query.min = priced.min;
    if (priced.max) query.max = priced.max;
  }
  return query;
}

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "").slice(0, 4);
}

/**
 * Move one typed bound. Input applies only inside the other bound and floor..ceil.
 * Blur snaps a crossing dinar onto the other bound. Empty or out of range restores.
 * The other bound is never changed.
 */
export function commitBound(
  side: "min" | "max",
  draft: string,
  span: Span,
  domain: Domain,
  phase: "input" | "blur",
): Span {
  const clean = digitsOnly(draft);
  if (clean === "") return span;
  const n = Number(clean);
  const inDomain = n >= domain.floor && n <= domain.ceil;
  if (!inDomain) return span;
  if (phase === "input") {
    if (side === "min" && n > span.max) return span;
    if (side === "max" && n < span.min) return span;
    return side === "min" ? { min: n, max: span.max } : { min: span.min, max: n };
  }
  if (side === "min") return { min: Math.min(n, span.max), max: span.max };
  return { min: span.min, max: Math.max(n, span.min) };
}

/** One thumb, snapped to a whole dinar, stopped at the other thumb. */
export function slideThumb(side: "min" | "max", dinar: number, span: Span, domain: Domain): Span {
  const next = clampDinar(Math.round(dinar), domain.floor, domain.ceil);
  if (side === "min") {
    const min = Math.min(next, span.max);
    return min === span.min ? span : { min, max: span.max };
  }
  const max = Math.max(next, span.min);
  return max === span.max ? span : { min: span.min, max };
}

/** Drag the salmon span. Width stays put and the pair stops at the domain edges. */
export function shiftSpan(dinar: number, grab: number, width: number, span: Span, domain: Domain): Span {
  const size = Math.max(0, Math.min(Math.round(width), domain.ceil - domain.floor));
  let min = Math.round(dinar - grab);
  let max = min + size;
  if (min < domain.floor) {
    min = domain.floor;
    max = min + size;
  }
  if (max > domain.ceil) {
    max = domain.ceil;
    min = max - size;
  }
  if (min === span.min && max === span.max) return span;
  return { min, max };
}
