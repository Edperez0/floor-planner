/**
 * Hardcoded starter layouts (same shape as saved JSON after parseProjectFile).
 * Uses SVG data URLs as lightweight placeholder floor plans.
 */

const PPI = 7;

function svgFloorPlan(label) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="700"><rect fill="#e8ecf0" width="900" height="700"/><rect x="48" y="48" width="804" height="604" fill="#fafbfc" stroke="#b0bec5" stroke-width="2" rx="4"/><text x="450" y="88" text-anchor="middle" font-family="system-ui,sans-serif" font-size="15" fill="#78909c">${label}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function piece(id, type, x, y, wf, wi, df, di, ppi, rotation = 0, stackOrder) {
  const wIn = wf * 12 + wi;
  const dIn = df * 12 + di;
  const item = {
    id,
    type,
    x,
    y,
    width: wIn * ppi,
    height: dIn * ppi,
    rotation,
    realWidth: { feet: wf, inches: wi },
    realDepth: { feet: df, inches: di },
  };
  if (typeof stackOrder === 'number') item.stackOrder = stackOrder;
  return item;
}

export const ROOM_TEMPLATES = [
  {
    id: 'studio',
    title: 'Studio Apartment',
    description: 'Sleeping area, sofa zone, and a compact table.',
    payload: {
      version: 1,
      floorPlanImage: svgFloorPlan('Studio apartment (sample)'),
      pixelsPerInch: PPI,
      furniture: [
        piece('tmpl-studio-rug', 'Rug', 420, 340, 4, 0, 5, 0, PPI, 0, 0),
        piece('tmpl-studio-bed', 'Queen Bed', 420, 180, 5, 0, 6, 8, PPI, 0, 1),
        piece('tmpl-studio-sofa', 'Sofa', 420, 480, 6, 0, 3, 0, PPI, 0, 2),
        piece('tmpl-studio-table', 'Coffee Table', 420, 360, 3, 0, 1, 6, PPI, 0, 3),
      ],
    },
  },
  {
    id: 'homeOffice',
    title: 'Home Office',
    description: 'Desk setup with rug and storage.',
    payload: {
      version: 1,
      floorPlanImage: svgFloorPlan('Home office (sample)'),
      pixelsPerInch: PPI,
      furniture: [
        piece('tmpl-office-rug', 'Rug', 400, 320, 3, 0, 4, 0, PPI, 0, 0),
        piece('tmpl-office-desk', 'Desk', 400, 300, 5, 0, 2, 6, PPI, 0, 1),
        piece('tmpl-office-chair', 'Office Chair', 400, 400, 2, 0, 2, 0, PPI, 0, 2),
        piece('tmpl-office-shelf', 'Bookshelf', 620, 300, 3, 0, 1, 0, PPI, 0, 3),
      ],
    },
  },
  {
    id: 'bedroom',
    title: 'Standard Bedroom',
    description: 'Bed, nightstands, and a dresser.',
    payload: {
      version: 1,
      floorPlanImage: svgFloorPlan('Bedroom (sample)'),
      pixelsPerInch: PPI,
      furniture: [
        piece('tmpl-bed-rug', 'Rug', 400, 360, 5, 0, 6, 0, PPI, 0, 0),
        piece('tmpl-bed-main', 'King Bed', 400, 320, 6, 0, 7, 0, PPI, 0, 1),
        piece('tmpl-bed-night-l', 'Nightstand', 220, 320, 1, 6, 1, 6, PPI, 0, 2),
        piece('tmpl-bed-night-r', 'Nightstand', 580, 320, 1, 6, 1, 6, PPI, 0, 3),
        piece('tmpl-bed-dresser', 'Dresser', 400, 520, 4, 0, 1, 6, PPI, 0, 4),
      ],
    },
  },
];
