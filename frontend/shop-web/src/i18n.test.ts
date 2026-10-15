import { describe, expect, it } from "vitest";
import { applyLocale, t, type CopyKey } from "./i18n";

describe("locale shell", () => {
  it("defaults copy to French and flips direction for Arabic", () => {
    expect(t("fr", "home")).toBe("Accueil");
    expect(t("en", "home")).toBe("Home");
    expect(t("ar", "home")).toBe("الرئيسية");
    applyLocale("ar");
    expect(document.documentElement.dir).toBe("rtl");
    expect(document.documentElement.lang).toBe("ar");
    applyLocale("fr");
    expect(document.documentElement.dir).toBe("ltr");
  });

  it("translates sort and price range in every language", () => {
    const rows: readonly (readonly [CopyKey, string, string, string])[] = [
      ["sortBy", "Trier par", "Sort by", "رتّب حسب"],
      ["sortName", "Nom", "Name", "الاسم"],
      ["sortAz", "A-Z", "A-Z", "أ-ي"],
      ["sortZa", "Z-A", "Z-A", "ي-أ"],
      ["sortPrice", "Prix", "Price", "السعر"],
      ["sortCheap", "Moins cher", "Cheapest", "الأرخص"],
      ["sortPricey", "Plus cher", "Most expensive", "الأغلى"],
      ["priceRange", "Fourchette de prix", "Price range", "نطاق السعر"],
      ["minPrice", "Prix minimum en dinars", "Minimum price in dinars", "أقل سعر بالدينار"],
      ["maxPrice", "Prix maximum en dinars", "Maximum price in dinars", "أعلى سعر بالدينار"],
      ["noPrice", "Rien dans ce prix", "Nothing in that price", "لا شيء في هذا السعر"],
    ];
    for (const [key, fr, en, ar] of rows) {
      expect(t("fr", key)).toBe(fr);
      expect(t("en", key)).toBe(en);
      expect(t("ar", key)).toBe(ar);
    }
  });
});
