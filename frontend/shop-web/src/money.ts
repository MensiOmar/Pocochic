export function formatTnd(cents: number): string {
  const dinars = cents / 100;
  const text = Number.isInteger(dinars) ? String(dinars) : dinars.toFixed(2);
  return `${text} DT`;
}
