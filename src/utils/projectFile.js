import { sortFurnitureForCanvas } from './furnitureRenderOrder';

export const PROJECT_FILE_VERSION = 1;

function normalizeFurnitureItem(raw, index) {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid furniture entry');
  }
  const rw = raw.realWidth || {};
  const rd = raw.realDepth || {};
  let id = String(raw.id ?? '');
  if (!id) id = `loaded-${index}`;
  return {
    id,
    type: String(raw.type ?? 'Item'),
    x: Number(raw.x) || 0,
    y: Number(raw.y) || 0,
    width: Math.max(0, Number(raw.width) || 0),
    height: Math.max(0, Number(raw.height) || 0),
    rotation: Number(raw.rotation) || 0,
    realWidth: {
      feet: Number(rw.feet) || 0,
      inches: Math.min(11, Math.max(0, Number(rw.inches) || 0)),
    },
    realDepth: {
      feet: Number(rd.feet) || 0,
      inches: Math.min(11, Math.max(0, Number(rd.inches) || 0)),
    },
    ...(typeof raw.stackOrder === 'number' ? { stackOrder: raw.stackOrder } : {}),
    ...(typeof raw.fillColor === 'string' && /^#[0-9A-Fa-f]{6}$/.test(raw.fillColor.trim())
      ? { fillColor: raw.fillColor.trim() }
      : {}),
  };
}

/**
 * @param {unknown} raw
 * @param {number} index
 */
export function normalizeCustomPreset(raw, index) {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid custom preset entry');
  }
  const w = raw.width || {};
  const d = raw.depth || {};
  let id = String(raw.id ?? '');
  if (!id) id = `custom-preset-${index}`;
  const color =
    typeof raw.color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(raw.color.trim())
      ? raw.color.trim()
      : '#8B7355';
  return {
    id,
    name: String(raw.name ?? 'Custom').trim() || 'Custom',
    width: {
      feet: Math.max(0, Number(w.feet) || 0),
      inches: Math.min(11, Math.max(0, Number(w.inches) || 0)),
    },
    depth: {
      feet: Math.max(0, Number(d.feet) || 0),
      inches: Math.min(11, Math.max(0, Number(d.inches) || 0)),
    },
    color,
  };
}

/**
 * Build JSON string for download. Includes stackOrder from current draw order (z-index).
 * @param {unknown[]} [customPresets]
 */
export function serializeProject(floorPlanUrl, pixelsPerInch, furniture, customPresets = []) {
  const sorted = sortFurnitureForCanvas(furniture);
  const furnitureOut = sorted.map((item, index) => ({
    ...item,
    stackOrder: index,
  }));
  const presetsOut = Array.isArray(customPresets)
    ? customPresets.map((p) => ({
        id: p.id,
        name: p.name,
        width: p.width,
        depth: p.depth,
        color: p.color,
      }))
    : [];
  const payload = {
    version: PROJECT_FILE_VERSION,
    floorPlanImage: floorPlanUrl,
    pixelsPerInch: typeof pixelsPerInch === 'number' && !Number.isNaN(pixelsPerInch) ? pixelsPerInch : null,
    furniture: furnitureOut,
    customPresets: presetsOut,
  };
  return JSON.stringify(payload);
}

/**
 * Parse and validate loaded JSON; returns data safe to apply to app state.
 */
export function parseProjectFile(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('File is not valid JSON');
  }
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid project file');
  }
  if (!Array.isArray(data.furniture)) {
    throw new Error('Project file is missing a furniture array');
  }
  const furniture = data.furniture.map((raw, i) => normalizeFurnitureItem(raw, i));
  const ppi = data.pixelsPerInch;
  const customPresets = [];
  if (Array.isArray(data.customPresets)) {
    data.customPresets.forEach((raw, i) => {
      try {
        customPresets.push(normalizeCustomPreset(raw, i));
      } catch {
        /* skip invalid preset row */
      }
    });
  }
  return {
    floorPlanImage:
      typeof data.floorPlanImage === 'string' && data.floorPlanImage.length > 0
        ? data.floorPlanImage
        : null,
    pixelsPerInch:
      typeof ppi === 'number' && !Number.isNaN(ppi) && ppi > 0 ? ppi : null,
    furniture,
    customPresets,
  };
}
