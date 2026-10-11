export const PHOTO_ZOOM = 2.4;
export const PHOTO_PAD = 12;

export type PhotoFrame = {
  x: number;
  y: number;
  w: number;
  h: number;
};

function positive(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

/** Fit the whole photo inside the box. Null when any input is not positive. */
export function containPhoto(
  naturalWidth: number,
  naturalHeight: number,
  boxWidth: number,
  boxHeight: number,
  pad = PHOTO_PAD,
): PhotoFrame | null {
  if (!positive(naturalWidth) || !positive(naturalHeight) || !positive(boxWidth) || !positive(boxHeight) || !positive(pad)) {
    return null;
  }
  const scale = Math.min((boxWidth - pad * 2) / naturalWidth, (boxHeight - pad * 2) / naturalHeight);
  if (!positive(scale)) return null;
  const w = naturalWidth * scale;
  const h = naturalHeight * scale;
  return { x: (boxWidth - w) / 2, y: (boxHeight - h) / 2, w, h };
}
