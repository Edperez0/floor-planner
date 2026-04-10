/**
 * Konva draws children in order: earlier = behind. Rugs render first so they
 * sit under beds, sofas, and other pieces.
 * When stackOrder is set (e.g. after loading a saved project), it preserves z-order.
 */
export function sortFurnitureForCanvas(items) {
  if (!items?.length) return [];
  const layer = (type) => (String(type).toLowerCase().includes('rug') ? 0 : 1);
  return [...items].sort((a, b) => {
    const ao = a.stackOrder;
    const bo = b.stackOrder;
    if (typeof ao === 'number' && typeof bo === 'number' && ao !== bo) {
      return ao - bo;
    }
    const d = layer(a.type) - layer(b.type);
    if (d !== 0) return d;
    return String(a.id).localeCompare(String(b.id));
  });
}
