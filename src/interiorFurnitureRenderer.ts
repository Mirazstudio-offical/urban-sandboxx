// High-detail realistic 90-degree orthographic top-down furniture renderer.
// Dispatches all 53 interior furniture & appliance types to dedicated domestic
// and commercial top-down vector renderers with full canvas state isolation.

import type { InteriorFurniture } from './buildingInteriors';
import { renderDomesticFurniture } from './graphics/furnitureTopDownDomestic';
import { renderCommercialFurniture } from './graphics/furnitureTopDownCommercial';
import {
  drawRectContactShadow,
  drawBrushedMetal,
} from './graphics/furnitureTopDownMaterials';

export function renderInteriorFurniture(
  ctx: CanvasRenderingContext2D,
  f: InteriorFurniture,
  timeHour: number
) {
  ctx.save();
  try {
    if (renderDomesticFurniture(ctx, f, timeHour)) {
      return;
    }
    if (renderCommercialFurniture(ctx, f, timeHour)) {
      return;
    }

    // Architectural top-down fallback for any custom/unknown furniture type
    const w = Math.max(1, f.width);
    const h = Math.max(1, f.height);
    const hw = w / 2;
    const hh = h / 2;
    drawRectContactShadow(ctx, -hw, -hh, w, h, 0.8, 1.0);
    drawBrushedMetal(ctx, -hw, -hh, w, h, f.color || '#64748b', 0.7, false);
  } finally {
    ctx.restore();
  }
}
