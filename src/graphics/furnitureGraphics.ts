// Procedural 2D Canvas Models for Furniture & Interior Items (Exact 90° Top-Down View)
// Uses the shared high-detail orthographic top-down interior furniture renderer so
// inventory slots, shop previews, carried hands, ground drops, and placed room furniture
// match 100% with realistic top-down geometry and materials.

import type { InteriorFurniture } from '../buildingInteriors';
import { renderInteriorFurniture } from '../interiorFurnitureRenderer';

interface FurnitureItemSpec {
  type: InteriorFurniture['type'];
  width: number;
  height: number;
  color: string;
  angle?: number;
  /** Target bounding span inside the 24x24 (-12..12) item canvas */
  targetSpan?: number;
}

const FURNITURE_ITEM_SPECS: Record<string, FurnitureItemSpec> = {
  furn_chair: {
    type: 'chair',
    width: 14,
    height: 14,
    color: '#334155',
    targetSpan: 17.5,
  },
  furn_table: {
    type: 'table',
    width: 24,
    height: 15,
    color: '#92400e',
    targetSpan: 19.0,
  },
  furn_sofa: {
    type: 'sofa',
    width: 28,
    height: 13,
    color: '#334155',
    targetSpan: 19.8,
  },
  furn_bed: {
    type: 'bed',
    width: 24,
    height: 26,
    color: '#0284c7',
    targetSpan: 19.2,
  },
  furn_fridge: {
    type: 'fridge',
    width: 14,
    height: 14,
    color: '#cbd5e1',
    targetSpan: 17.6,
  },
  furn_tv: {
    type: 'tv',
    width: 22,
    height: 5.5,
    color: '#0f172a',
    targetSpan: 19.6,
  },
  furn_shelf: {
    type: 'shelf',
    width: 22,
    height: 9,
    color: '#475569',
    targetSpan: 19.4,
  },
  furn_plant: {
    type: 'plant',
    width: 14,
    height: 14,
    color: '#15803d',
    targetSpan: 18.8,
  },
  furn_wardrobe: {
    type: 'wardrobe',
    width: 24,
    height: 11,
    color: '#78350f',
    targetSpan: 19.4,
  },
  furn_nightstand: {
    type: 'nightstand',
    width: 12,
    height: 11,
    color: '#78350f',
    targetSpan: 16.8,
  },
  furn_kitchen_counter: {
    type: 'kitchen_counter',
    width: 28,
    height: 11,
    color: '#475569',
    targetSpan: 19.8,
  },
  furn_tv_cabinet: {
    type: 'tv_cabinet',
    width: 24,
    height: 8.5,
    color: '#78350f',
    targetSpan: 19.6,
  },
  furn_carpet: {
    type: 'carpet',
    width: 24,
    height: 16,
    color: '#991b1b',
    targetSpan: 19.2,
  },
  furn_bath: {
    type: 'bath',
    width: 24,
    height: 13,
    color: '#f1f5f9',
    targetSpan: 19.4,
  },
  furn_sink: {
    type: 'sink',
    width: 14,
    height: 11,
    color: '#e2e8f0',
    targetSpan: 17.8,
  },
  furn_toilet: {
    type: 'toilet',
    width: 11,
    height: 14,
    color: '#ffffff',
    targetSpan: 17.8,
  },
  furn_desk: {
    type: 'desk',
    width: 24,
    height: 13,
    color: '#78350f',
    targetSpan: 19.4,
  },
  furn_bookshelf: {
    type: 'bookshelf',
    width: 22,
    height: 8.5,
    color: '#7c2d12',
    targetSpan: 19.4,
  },
  furn_mirror: {
    type: 'mirror',
    width: 18,
    height: 4.5,
    color: '#d97706',
    targetSpan: 19.2,
  },
};

export function drawFurnitureItem(ctx: CanvasRenderingContext2D, itemId: string): boolean {
  const spec = FURNITURE_ITEM_SPECS[itemId];
  if (!spec) return false;

  const maxDim = Math.max(spec.width, spec.height);
  const scale = (spec.targetSpan ?? 18.8) / maxDim;

  ctx.save();
  if (spec.angle) ctx.rotate(spec.angle);
  ctx.scale(scale, scale);

  const syntheticFurniture: InteriorFurniture = {
    type: spec.type,
    x: 0,
    y: 0,
    width: spec.width,
    height: spec.height,
    angle: 0,
    color: spec.color,
  };

  // Render in daylight mode (12h) for crisp icon & ground clarity
  renderInteriorFurniture(ctx, syntheticFurniture, 12);
  ctx.restore();
  return true;
}
