import { describe, expect, it } from "vitest";
import { PHOTO_PAD, PHOTO_ZOOM, containPhoto } from "./photo-frame";

describe("containPhoto", () => {
  it("uses a 2.4 zoom and a 12px resting inset", () => {
    expect(PHOTO_ZOOM).toBe(2.4);
    expect(PHOTO_PAD).toBe(12);
  });

  it("returns null when any input is not positive", () => {
    expect(containPhoto(0, 1280, 400, 452)).toBeNull();
    expect(containPhoto(720, -1, 400, 452)).toBeNull();
    expect(containPhoto(720, 1280, 0, 452)).toBeNull();
    expect(containPhoto(720, 1280, 400, Number.NaN)).toBeNull();
    expect(containPhoto(720, 1280, Number.POSITIVE_INFINITY, 452)).toBeNull();
    expect(containPhoto(100, 100, 80, 80, 0)).toBeNull();
  });

  it("returns null when the inset consumes the box", () => {
    expect(containPhoto(100, 100, 24, 80)).toBeNull();
    expect(containPhoto(100, 100, 80, 20)).toBeNull();
  });

  it("keeps a tall photo whole, with side margin", () => {
    const frame = containPhoto(720, 1280, 400, 452);
    expect(frame).not.toBeNull();
    const fit = frame!;
    expect(fit.h).toBeCloseTo(452 - PHOTO_PAD * 2);
    expect(fit.w).toBeCloseTo(fit.h * (720 / 1280));
    expect(fit.y).toBeCloseTo(PHOTO_PAD);
    expect(fit.x).toBeGreaterThan(PHOTO_PAD);
    expect(fit.x).toBeCloseTo((400 - fit.w) / 2);
    expect(fit.w / fit.h).toBeCloseTo(720 / 1280);
  });

  it("keeps a wide photo whole, with margin above and below", () => {
    const frame = containPhoto(1920, 1200, 640, 452);
    expect(frame).not.toBeNull();
    const fit = frame!;
    expect(fit.w).toBeCloseTo(640 - PHOTO_PAD * 2);
    expect(fit.h).toBeCloseTo(fit.w * (1200 / 1920));
    expect(fit.x).toBeCloseTo(PHOTO_PAD);
    expect(fit.y).toBeGreaterThan(PHOTO_PAD);
    expect(fit.y).toBeCloseTo((452 - fit.h) / 2);
    expect(fit.w / fit.h).toBeCloseTo(1920 / 1200);
  });

  it("centers a square photo inside the shorter inner edge", () => {
    const frame = containPhoto(1000, 1000, 500, 300, 10);
    expect(frame).toEqual({ x: 110, y: 10, w: 280, h: 280 });
  });
});
