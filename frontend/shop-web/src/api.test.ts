import { describe, expect, it } from "vitest";
import { catalogSrc } from "./api";

describe("catalogSrc", () => {
  it("keeps catalog paths and rejects external or generated urls", () => {
    expect(catalogSrc("/catalog/styles/tee.webp")).toBe("/catalog/styles/tee.webp");
    expect(catalogSrc(null)).toBeNull();
    expect(catalogSrc("https://uxmagic.blob.core.windows.net/tee.png")).toBeNull();
    expect(catalogSrc("/images/generated.png")).toBeNull();
  });
});
