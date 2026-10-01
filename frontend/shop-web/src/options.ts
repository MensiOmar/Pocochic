import type { Variant } from "@pocochic/contracts";
import { compareSizeLabels } from "./sizes";

export function optionLabel(variant: Pick<Variant, "size" | "reference">): string {
  const size = variant.size.trim();
  const reference = variant.reference.trim();
  if (size && reference) return `${size} · ${reference}`;
  return size || reference;
}

export function showOptionRow(variants: Pick<Variant, "size">[]): boolean {
  if (variants.length > 1) return true;
  return variants.some((variant) => variant.size.trim() !== "");
}

export function optionKind(variants: Pick<Variant, "size">[]): "size" | "reference" {
  return variants.some((variant) => variant.size.trim() !== "") ? "size" : "reference";
}

export function orderedVariants<T extends Pick<Variant, "id" | "size" | "reference">>(variants: T[]): T[] {
  return [...variants].sort((a, b) => compareSizeLabels(a.size, b.size) || a.reference.localeCompare(b.reference) || a.id.localeCompare(b.id));
}

export function defaultVariantId(variants: Variant[]): string | null {
  return orderedVariants(variants).find((variant) => variant.availableQty > 0)?.id ?? null;
}
