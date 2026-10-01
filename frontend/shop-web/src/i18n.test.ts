import { describe, expect, it } from "vitest";
import { applyLocale, t } from "./i18n";

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
});
