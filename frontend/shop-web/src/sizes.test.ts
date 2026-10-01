import { describe, expect, it } from "vitest";
import { sizeRange } from "./sizes";

describe("sizeRange", () => {
  it("orders apparel sizes and skips blanks", () => {
    expect(sizeRange(["XL Oversize", "S", "S Oversize", ""])).toBe("S–XL");
    expect(sizeRange(["M"])).toBe("M");
    expect(sizeRange(["L Oversize"])).toBe("L Oversize");
    expect(sizeRange(["", "  "])).toBeNull();
  });
});
