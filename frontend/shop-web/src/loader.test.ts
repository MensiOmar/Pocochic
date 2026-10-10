import { describe, expect, it } from "vitest";
import { heartPhase, loaderSteps, loaderValueNow, REDUCED_MOTION_STEPS } from "./loader";

describe("cassette loader", () => {
  it("fills half then full from the left and holds", () => {
    expect(loaderSteps(0)).toBe(0);
    expect(heartPhase(loaderSteps(1), 0)).toBe("half");
    expect(heartPhase(loaderSteps(2), 0)).toBe("full");
    expect(heartPhase(loaderSteps(3), 0)).toBe("full");
    expect(heartPhase(loaderSteps(3), 1)).toBe("half");
    expect(heartPhase(loaderSteps(3), 2)).toBe("empty");

    expect(loaderSteps(20)).toBe(20);
    expect(loaderValueNow(20)).toBe(10);
    for (const tick of [20, 21, 22, 23, 24, 25, 26, 27]) {
      expect(loaderSteps(tick)).toBe(20);
    }
    for (const tick of [28, 29, 30]) {
      expect(loaderSteps(tick)).toBe(0);
    }
    expect(loaderSteps(31)).toBe(0);
    expect(loaderSteps(32)).toBe(1);
  });

  it("paints seven full hearts when motion is reduced", () => {
    expect(loaderValueNow(REDUCED_MOTION_STEPS)).toBe(7);
    for (let index = 0; index < 7; index += 1) {
      expect(heartPhase(REDUCED_MOTION_STEPS, index)).toBe("full");
    }
    for (let index = 7; index < 10; index += 1) {
      expect(heartPhase(REDUCED_MOTION_STEPS, index)).toBe("empty");
    }
  });
});
