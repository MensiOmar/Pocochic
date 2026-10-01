const RANK = ["XXXS", "XXS", "XS", "S", "M", "L", "XL", "XXL", "2XL", "XXXL", "3XL", "4XL", "5XL"];

function rank(size: string): number {
  const key = size.replace(/\s*oversize\s*/gi, "").trim().toUpperCase();
  const index = RANK.indexOf(key);
  if (index >= 0) return index;
  const numeric = Number(key);
  if (key !== "" && Number.isFinite(numeric)) return 50 + numeric;
  return 1000;
}

function baseSize(size: string): string {
  const stripped = size.replace(/\s*oversize\s*/gi, " ").replace(/\s+/g, " ").trim();
  return stripped || size.trim();
}

export function compareSizeLabels(a: string, b: string): number {
  return rank(a) - rank(b) || a.localeCompare(b);
}

export function sizeRange(sizes: string[]): string | null {
  const unique = [...new Set(sizes.map((size) => size.trim()).filter(Boolean))];
  if (unique.length === 0) return null;
  if (unique.length === 1) return unique[0] ?? null;
  const sorted = [...unique].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
  const low = baseSize(sorted[0] ?? "");
  const high = baseSize(sorted[sorted.length - 1] ?? "");
  if (!low) return null;
  if (low === high) return low;
  return `${low}–${high}`;
}
