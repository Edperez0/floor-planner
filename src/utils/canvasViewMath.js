/** Clamp canvas zoom scale */
export const MIN_VIEW_SCALE = 0.25;
export const MAX_VIEW_SCALE = 4;

export function clampScale(s) {
  return Math.min(MAX_VIEW_SCALE, Math.max(MIN_VIEW_SCALE, s));
}

/** Stage-space pointer → world coordinates inside the view Group */
export function stageToWorld(stageX, stageY, viewX, viewY, viewScale) {
  return {
    x: (stageX - viewX) / viewScale,
    y: (stageY - viewY) / viewScale,
  };
}
