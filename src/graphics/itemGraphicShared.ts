// Shared procedural 2D canvas drawing helpers for realistic item models

export function drawShadow(
  ctx: CanvasRenderingContext2D,
  rx: number = 7,
  ry: number = 2.6,
  y: number = 7.5,
  alpha: number = 0.22,
  x: number = 0.5
) {
  ctx.save();
  ctx.fillStyle = `rgba(15, 23, 42, ${alpha})`;
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(1, rx), Math.max(0.5, ry), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawGlossBand(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  alpha: number = 0.35
) {
  ctx.save();
  ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

export function drawMedicalCross(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number = 4,
  color: string = '#ffffff'
) {
  ctx.save();
  ctx.fillStyle = color;
  const bar = size * 0.36;
  ctx.fillRect(x - bar / 2, y - size / 2, bar, size);
  ctx.fillRect(x - size / 2, y - bar / 2, size, bar);
  ctx.restore();
}

/**
 * Procedural Frost & Thermal overlay for items
 * Renders crystalline ice rime, frost crust, sparkles and cold mist for cold/freezing items (T <= 5°C),
 * as well as delicate steam wisps for hot items (T >= 60°C).
 */
export function drawFrostAndThermalOverlay(
  ctx: CanvasRenderingContext2D,
  item?: any,
  boundsRadius: number = 8.5
) {
  if (!item) return;

  const temp = typeof item.surfaceTemperature === 'number'
    ? item.surfaceTemperature
    : (typeof item.temperature === 'number' ? item.temperature : 20.0);

  // === COLD & FROST RENDERER (T <= 5°C) ===
  if (temp <= 5.0) {
    ctx.save();
    
    // Calculate frost severity (0.0 to 1.0)
    // 5°C -> 0.15 (light dew/condensation), 0°C -> 0.55 (frost rime), -10°C -> 1.0 (thick frozen crust)
    const frostSeverity = Math.min(1.0, Math.max(0.12, (5.0 - temp) / 15.0));
    const isFreezing = temp <= 0.0;
    const isDeepFreeze = temp <= -8.0;

    // Seed for deterministic procedural crystal layout based on item identifier
    const seedStr = String(item.id || item.itemId || 'item_frost');
    let hash = 0;
    for (let i = 0; i < seedStr.length; i++) {
      hash = (hash * 31 + seedStr.charCodeAt(i)) >>> 0;
    }
    const pseudoRand = (offset: number) => {
      const x = Math.sin(hash + offset) * 10000;
      return x - Math.floor(x);
    };

    // 1. Frost / Condensation Glaze (Translucent icy tint over the entire item silhouette)
    const glazeAlpha = isFreezing ? 0.22 + frostSeverity * 0.28 : 0.12;
    const glazeGradient = ctx.createRadialGradient(0, 0, 1, 0, 0, boundsRadius + 2);
    if (isFreezing) {
      glazeGradient.addColorStop(0, `rgba(224, 242, 254, ${glazeAlpha * 0.6})`);
      glazeGradient.addColorStop(0.7, `rgba(186, 230, 253, ${glazeAlpha})`);
      glazeGradient.addColorStop(1, `rgba(255, 255, 255, ${glazeAlpha * 1.2})`);
    } else {
      // Chilled condensation haze (cool blue-gray dew sheen)
      glazeGradient.addColorStop(0, `rgba(147, 197, 253, 0.06)`);
      glazeGradient.addColorStop(1, `rgba(186, 230, 253, 0.20)`);
    }
    ctx.fillStyle = glazeGradient;
    ctx.beginPath();
    ctx.arc(0, 0, boundsRadius + 1.2, 0, Math.PI * 2);
    ctx.fill();

    // 2. Condensation Droplets (Water beads on surface when 0°C < T <= 5°C)
    if (!isFreezing || frostSeverity < 0.6) {
      const dropCount = Math.floor(4 + frostSeverity * 5);
      for (let i = 0; i < dropCount; i++) {
        const dx = (pseudoRand(i * 3 + 1) - 0.5) * boundsRadius * 1.5;
        const dy = (pseudoRand(i * 3 + 2) - 0.5) * boundsRadius * 1.5;
        const r = 0.5 + pseudoRand(i * 3 + 3) * 0.7;

        // Droplet shadow & body
        ctx.fillStyle = 'rgba(186, 230, 253, 0.65)';
        ctx.beginPath();
        ctx.arc(dx, dy, r, 0, Math.PI * 2);
        ctx.fill();

        // Droplet specular highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fillRect(dx - r * 0.4, dy - r * 0.4, r * 0.6, r * 0.6);
      }
    }

    // 3. Ice Crystals & Frost Rime Needles (When T <= 0°C)
    if (isFreezing) {
      const crystalCount = Math.floor(8 + frostSeverity * 12);
      ctx.fillStyle = isDeepFreeze ? '#ffffff' : '#f0f9ff';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 0.6;

      for (let i = 0; i < crystalCount; i++) {
        const angle = pseudoRand(i * 4 + 10) * Math.PI * 2;
        const dist = boundsRadius * (0.45 + pseudoRand(i * 4 + 11) * 0.55);
        const cx = Math.cos(angle) * dist;
        const cy = Math.sin(angle) * dist;
        const crystalSize = 0.8 + pseudoRand(i * 4 + 12) * 1.4 * frostSeverity;

        // Draw 4-pointed micro ice star
        ctx.beginPath();
        ctx.moveTo(cx - crystalSize, cy);
        ctx.lineTo(cx + crystalSize, cy);
        ctx.moveTo(cx, cy - crystalSize);
        ctx.lineTo(cx, cy + crystalSize);
        ctx.stroke();

        // Tiny crystalline dot core
        ctx.fillRect(cx - 0.4, cy - 0.4, 0.8, 0.8);
      }

      // 4. Frosted Rim Crust along the outer perimeter
      const rimSegments = 16;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      for (let i = 0; i < rimSegments; i++) {
        if (pseudoRand(i * 5 + 40) > 0.35) {
          const theta = (i / rimSegments) * Math.PI * 2;
          const rx = Math.cos(theta) * (boundsRadius + (pseudoRand(i * 5 + 41) - 0.5) * 1.5);
          const ry = Math.sin(theta) * (boundsRadius + (pseudoRand(i * 5 + 42) - 0.5) * 1.5);
          const speckSize = 0.6 + pseudoRand(i * 5 + 43) * 0.9;

          ctx.beginPath();
          ctx.arc(rx, ry, speckSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // 5. Cold Sparkling Glint (1 or 2 bright ice glints)
    if (isFreezing) {
      const glintX = -boundsRadius * 0.4;
      const glintY = -boundsRadius * 0.45;
      const glintSize = 2.2 + (isDeepFreeze ? 1.0 : 0);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(glintX - glintSize, glintY);
      ctx.lineTo(glintX + glintSize, glintY);
      ctx.moveTo(glintX, glintY - glintSize);
      ctx.lineTo(glintX, glintY + glintSize);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(glintX - 0.6, glintY - 0.6, 1.2, 1.2);
    }

    ctx.restore();
  }

  // === HOT STEAM RENDERER (T >= 60°C) ===
  else if (temp >= 60.0) {
    ctx.save();
    const heatFactor = Math.min(1.0, (temp - 60.0) / 30.0);
    const steamAlpha = 0.35 + heatFactor * 0.4;

    ctx.strokeStyle = `rgba(248, 250, 252, ${steamAlpha})`;
    ctx.lineWidth = 1.0;
    ctx.lineCap = 'round';

    // 2-3 rising curly steam wisps above the item
    for (let s = -1; s <= 1; s++) {
      const sx = s * 3.5;
      const sy = -boundsRadius * 0.5;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.bezierCurveTo(sx + (s === 0 ? 1.5 : -1.5), sy - 3.5, sx - (s === 0 ? 1.5 : -1.5), sy - 7.0, sx + s * 0.8, sy - 10.5);
      ctx.stroke();
    }

    ctx.restore();
  }
}
