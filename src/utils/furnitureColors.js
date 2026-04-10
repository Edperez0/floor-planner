/**
 * Default fill colors by furniture name keywords (used when fillColor is not set).
 */
export function defaultFillColorForType(type) {
  const t = String(type).toLowerCase();
  if (t.includes('rug')) return '#A8C5E2';
  if (t.includes('bed')) return '#9E9A96';
  if (t.includes('sofa') || t.includes('loveseat')) return '#A1887F';
  if (t.includes('plant') || t.includes('potted')) return '#66BB6A';
  if (t.includes('coffee table') || t.includes('dining table') || t.includes('table')) return '#6D4C41';
  if (t.includes('tv stand') || t.includes('dresser') || t.includes('nightstand')) return '#5D4037';
  if (t.includes('desk') || t.includes('bookshelf') || t.includes('shelf')) return '#795548';
  if (t.includes('chair')) return '#78909C';
  return '#8B7355';
}
