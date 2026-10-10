/** Cassette hearts: half then full, left to right, one step per tick. */
export const LOADER_HEARTS = 10;
export const LOADER_TICK_MS = 120;
/** prefers-reduced-motion paints seven hearts full (loading-screen paint(14)). */
export const REDUCED_MOTION_STEPS = 14;

const HOLD_FULL = 8;
const HOLD_EMPTY = 3;

export function loaderSteps(tick: number, hearts = LOADER_HEARTS): number {
  const full = hearts * 2;
  const span = full + HOLD_FULL + HOLD_EMPTY;
  const at = ((tick % span) + span) % span;
  return at < full + HOLD_FULL ? Math.min(at, full) : 0;
}

export type HeartPhase = "empty" | "half" | "full";

export function heartPhase(steps: number, index: number): HeartPhase {
  const got = steps - index * 2;
  if (got >= 2) return "full";
  if (got === 1) return "half";
  return "empty";
}

export function loaderValueNow(steps: number, hearts = LOADER_HEARTS): number {
  return Math.max(0, Math.min(hearts, Math.floor(steps / 2)));
}
