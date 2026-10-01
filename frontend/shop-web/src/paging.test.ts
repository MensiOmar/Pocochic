import { describe, expect, it } from "vitest";
import { pageWindow } from "./paging";

describe("pageWindow", () => {
  it("slices a catalog page and clamps the page number", () => {
    const items = ["a", "b", "c", "d", "e"];
    expect(pageWindow(items, 2, 2)).toEqual({ pages: 3, current: 2, slice: ["c", "d"] });
    expect(pageWindow(items, 9, 2).current).toBe(3);
    expect(pageWindow([], 1, 6)).toEqual({ pages: 1, current: 1, slice: [] });
  });
});
