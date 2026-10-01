export function formatTnd(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(Math.trunc(cents));
  const whole = Math.floor(abs / 100);
  const frac = abs % 100;
  const amount = frac === 0 ? String(whole) : `${whole}.${String(frac).padStart(2, "0")}`;
  return `${sign}${amount} DT`;
}
