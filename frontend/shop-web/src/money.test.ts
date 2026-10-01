import { describe, expect, it } from "vitest";
import { formatTnd } from "./money";

describe("formatTnd", () => {
  it("prints whole dinars, cents, and a discount without floating-point drift", () => {
    expect(formatTnd(4500)).toBe("45 DT");
    expect(formatTnd(800)).toBe("8 DT");
    expect(formatTnd(750)).toBe("7.50 DT");
    expect(formatTnd(10)).toBe("0.10 DT");
    expect(formatTnd(-500)).toBe("-5 DT");
  });
});
