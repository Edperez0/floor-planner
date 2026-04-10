/**
 * Parse whole-foot / whole-inch strings from controlled inputs.
 * Empty or invalid input becomes 0 for calculations.
 */

export function parseWholeFeet(raw) {
  const n = parseInt(String(raw ?? '').trim(), 10);
  return Number.isNaN(n) || n < 0 ? 0 : n;
}

export function parseWholeInches(raw) {
  const n = parseInt(String(raw ?? '').trim(), 10);
  if (Number.isNaN(n) || n < 0) return 0;
  return Math.min(11, n);
}
