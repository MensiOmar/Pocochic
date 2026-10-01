import {
  CART_STORAGE_KEY,
  DELIVERY_FEE_CENTS,
  storedCartLineSchema,
  type PromoQuote,
  type StoredCartLine,
} from "@pocochic/contracts";
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import type { RefreshPlan } from "../cart-sync";

const MAX_QTY = 99;

type SavedCart = { lines: StoredCartLine[]; promoCode: string };

function read(): SavedCart {
  try {
    const raw = JSON.parse(globalThis.localStorage?.getItem(CART_STORAGE_KEY) ?? "[]") as unknown;
    if (Array.isArray(raw)) {
      const parsed = storedCartLineSchema.array().safeParse(raw);
      return { lines: parsed.success ? parsed.data : [], promoCode: "" };
    }
    if (!raw || typeof raw !== "object") return { lines: [], promoCode: "" };
    const record = raw as { lines?: unknown; promoCode?: unknown };
    const parsed = storedCartLineSchema.array().safeParse(record.lines);
    return {
      lines: parsed.success ? parsed.data : [],
      promoCode: typeof record.promoCode === "string" ? record.promoCode : "",
    };
  } catch {
    return { lines: [], promoCode: "" };
  }
}

export const useCartStore = defineStore("cart", () => {
  const saved = read();
  const lines = ref<StoredCartLine[]>(saved.lines);
  const promoCode = ref(saved.promoCode);
  const quote = ref<PromoQuote | null>(null);

  function persist() {
    const body: SavedCart = { lines: lines.value, promoCode: promoCode.value };
    globalThis.localStorage?.setItem(CART_STORAGE_KEY, JSON.stringify(body));
  }

  function dropQuote() {
    quote.value = null;
  }

  function add(line: StoredCartLine) {
    const existing = lines.value.find((item) => item.variantId === line.variantId);
    const known = Math.min(existing?.availableQty ?? line.availableQty, line.availableQty, MAX_QTY);
    const nextQty = (existing?.quantity ?? 0) + line.quantity;
    if (!Number.isInteger(line.quantity) || line.quantity < 1 || !Number.isInteger(nextQty) || nextQty > known) {
      if (existing && (existing.availableQty !== known || existing.quantity > known)) {
        existing.availableQty = known;
        if (existing.quantity > known) existing.quantity = known;
        dropQuote();
        persist();
      }
      return false;
    }
    if (existing) {
      existing.quantity = nextQty;
      existing.availableQty = known;
      existing.unitPriceCents = line.unitPriceCents;
      existing.displayName = line.displayName;
      existing.itemCode = line.itemCode;
      existing.size = line.size;
      existing.reference = line.reference;
      existing.imagePath = line.imagePath;
      existing.slug = line.slug;
    } else {
      lines.value.push({ ...line, quantity: nextQty, availableQty: known });
    }
    dropQuote();
    persist();
    return true;
  }

  function setQty(variantId: string, quantity: number) {
    const line = lines.value.find((item) => item.variantId === variantId);
    if (!line || line.availableQty < 1) return;
    line.quantity = Math.max(1, Math.min(quantity, line.availableQty, MAX_QTY));
    dropQuote();
    persist();
  }

  function remove(variantId: string) {
    lines.value = lines.value.filter((item) => item.variantId !== variantId);
    dropQuote();
    persist();
  }

  function clear() {
    lines.value = [];
    promoCode.value = "";
    quote.value = null;
    persist();
  }

  function commitPromo(code: string) {
    promoCode.value = code.trim();
    dropQuote();
    persist();
  }

  function clearPromo() {
    promoCode.value = "";
    dropQuote();
    persist();
  }

  function acceptQuote(value: PromoQuote) {
    promoCode.value = value.code;
    quote.value = value;
    persist();
  }

  function applyRefresh(plan: RefreshPlan) {
    dropQuote();
    for (const patch of plan.patches) {
      const line = lines.value.find((item) => item.variantId === patch.variantId);
      if (!line) continue;
      line.availableQty = patch.availableQty;
      line.unitPriceCents = patch.unitPriceCents;
      line.displayName = patch.displayName;
      line.itemCode = patch.itemCode;
      line.size = patch.size;
      line.reference = patch.reference;
      line.imagePath = patch.imagePath;
      if (line.quantity > patch.availableQty) line.quantity = patch.availableQty;
      if (line.quantity > MAX_QTY) line.quantity = MAX_QTY;
    }
    if (plan.removeIds.length > 0) {
      const removeIds = new Set(plan.removeIds);
      lines.value = lines.value.filter((line) => !removeIds.has(line.variantId));
    }
    persist();
  }

  const count = computed(() => lines.value.reduce((sum, line) => sum + line.quantity, 0));
  const itemsCents = computed(() => lines.value.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0));
  const acceptedCode = computed(() => quote.value?.code ?? null);
  const subtotalCents = computed(() => quote.value?.itemsCents ?? itemsCents.value);
  const discountCents = computed(() => quote.value?.discountCents ?? 0);
  const deliveryCents = computed(() => (lines.value.length === 0 ? 0 : quote.value?.deliveryCents ?? DELIVERY_FEE_CENTS));
  const totalCents = computed(() => quote.value?.totalCents ?? itemsCents.value + deliveryCents.value);

  return {
    lines,
    promoCode,
    quote,
    acceptedCode,
    add,
    setQty,
    remove,
    clear,
    commitPromo,
    clearPromo,
    acceptQuote,
    dropQuote,
    applyRefresh,
    count,
    itemsCents,
    subtotalCents,
    discountCents,
    deliveryCents,
    totalCents,
    persist,
  };
});
