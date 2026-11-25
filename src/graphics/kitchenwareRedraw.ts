// High-Detail Attribute-Driven Procedural 2.5D Studio Canvas Models for Unified Kitchenware
// Renders unified items (pot, saute_pan, frying_pan, kettle, plate, bowl, mug, cup, spoon, fork, kitchen_knife)
// dynamically from their KitchenwareAttributes (material, capacity, shape, color, accentColor, pattern).

import type { KitchenwareAttributes, KitchenwareKind } from '../types';
import { drawShadow, drawGlossBand } from './itemGraphicShared';

// Color utility: shift hex luminance cleanly (-1..+1)
function shadeHex(hex: string, amount: number): string {
  const clean = (hex || '#cbd5e1').replace('#', '');
  const full = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean.padEnd(6, '0').slice(0, 6);
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return hex || '#cbd5e1';
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  const mix = (c: number) =>
    amount >= 0
      ? Math.min(255, Math.round(c + (255 - c) * amount))
      : Math.max(0, Math.round(c * (1 + amount)));
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = (hex || '#cbd5e1').replace('#', '');
  const full = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean.padEnd(6, '0').slice(0, 6);
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return `rgba(203, 213, 225, ${alpha})`;
  return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
}

const FALLBACK_KW_ATTRS: Record<KitchenwareKind, Partial<KitchenwareAttributes>> = {
  pot: {
    kind: 'pot',
    material: 'stainless_steel',
    shape: 'cylindrical',
    color: '#cbd5e1',
    accentColor: '#64748b',
    pattern: 'none',
    lidRu: 'Стеклянная с пароотводом'
  },
  saute_pan: {
    kind: 'saute_pan',
    material: 'nonstick_aluminum',
    shape: 'deep_straight',
    color: '#334155',
    accentColor: '#1e293b',
    pattern: 'marbled',
    patternColor: '#cbd5e1',
    lidRu: 'Стеклянная со стальным ободком'
  },
  frying_pan: {
    kind: 'frying_pan',
    material: 'cast_iron',
    shape: 'round_shallow',
    color: '#1e293b',
    accentColor: '#78350f',
    pattern: 'none'
  },
  kettle: {
    kind: 'kettle',
    material: 'stainless_steel',
    shape: 'conical',
    color: '#cbd5e1',
    accentColor: '#1e293b',
    pattern: 'brushed',
    hasWhistle: true
  },
  plate: {
    kind: 'plate',
    material: 'ceramic',
    shape: 'round_flat',
    color: '#f8fafc',
    accentColor: '#eab308',
    pattern: 'gold_rim',
    patternColor: '#eab308'
  },
  bowl: {
    kind: 'bowl',
    material: 'ceramic',
    shape: 'deep_round',
    color: '#f5f0e6',
    accentColor: '#1d4ed8',
    pattern: 'blue_rim',
    patternColor: '#1d4ed8'
  },
  mug: {
    kind: 'mug',
    material: 'ceramic',
    shape: 'cylindrical',
    color: '#e7dcc8',
    accentColor: '#92400e',
    pattern: 'glaze_drip',
    patternColor: '#b45309'
  },
  cup: {
    kind: 'cup',
    material: 'porcelain',
    shape: 'teacup_saucer',
    color: '#ffffff',
    accentColor: '#eab308',
    pattern: 'gzhel',
    patternColor: '#2563eb',
    hasSaucer: true
  },
  spoon: {
    kind: 'spoon',
    material: 'stainless_steel',
    shape: 'tablespoon_oval',
    color: '#cbd5e1',
    accentColor: '#94a3b8',
    pattern: 'none'
  },
  fork: {
    kind: 'fork',
    material: 'stainless_steel',
    shape: 'dinner_4_tine',
    color: '#cbd5e1',
    accentColor: '#94a3b8',
    pattern: 'none'
  },
  kitchen_knife: {
    kind: 'kitchen_knife',
    material: 'stainless_steel',
    shape: 'chef_blade',
    color: '#cbd5e1',
    accentColor: '#5c3a21',
    pattern: 'brushed'
  }
};

function resolveKwAttrs(kind: KitchenwareKind, item?: any): KitchenwareAttributes {
  const fb = FALLBACK_KW_ATTRS[kind];
  const src = item?.kitchenwareAttributes || {};
  return {
    kind,
    material: src.material || fb.material || 'stainless_steel',
    materialRu: src.materialRu || '',
    coatingRu: src.coatingRu,
    capacityMl: src.capacityMl ?? 0,
    shape: src.shape || fb.shape || 'classic',
    shapeNameRu: src.shapeNameRu || '',
    color: src.color || item?.attributes?.visuals?.color || fb.color || '#cbd5e1',
    colorNameRu: src.colorNameRu || '',
    accentColor: src.accentColor || fb.accentColor || '#64748b',
    pattern: src.pattern || fb.pattern || 'none',
    patternNameRu: src.patternNameRu || '',
    patternColor: src.patternColor || fb.patternColor || '#ffffff',
    lidRu: src.lidRu ?? fb.lidRu,
    handleRu: src.handleRu,
    featureRu: src.featureRu,
    isElectric: src.isElectric ?? fb.isElectric,
    hasWhistle: src.hasWhistle ?? fb.hasWhistle,
    hasSaucer: src.hasSaucer ?? fb.hasSaucer,
    dimensionCm: src.dimensionCm
  };
}

function getLiquidColorFromItem(item?: any): string | null {
  const fs = item?.fluidStorage;
  if (!fs || !fs.liquidId || (fs.currentMl || 0) <= 0) return null;
  if (fs.attributes?.customColor) return fs.attributes.customColor;
  const lid = String(fs.liquidId);
  if (lid.includes('broth') || lid.includes('soup')) return '#d97706';
  if (lid.includes('tea')) return '#92400e';
  if (lid.includes('coffee')) return '#451a03';
  if (lid.includes('milk') || lid.includes('cream')) return '#f8fafc';
  if (lid.includes('water')) return '#38bdf8';
  if (lid.includes('oil')) return '#eab308';
  if (lid.includes('juice')) return '#f97316';
  return '#60a5fa';
}

function drawVesselBodyPattern(
  ctx: CanvasRenderingContext2D,
  attrs: KitchenwareAttributes,
  width: number,
  yCenter: number,
  height: number
) {
  const pat = attrs.pattern;
  const pCol = attrs.patternColor || '#ffffff';
  if (!pat || pat === 'none') return;

  if (pat === 'daisies' || pat === 'floral') {
    const spots: Array<[number, number, number]> = [
      [-width * 0.48, yCenter - height * 0.08, 0.8],
      [0, yCenter + height * 0.08, 0.95],
      [width * 0.48, yCenter - height * 0.08, 0.8]
    ];
    for (const [fx, fy, sc] of spots) {
      ctx.fillStyle = pCol;
      for (let p = 0; p < 5; p++) {
        const a = (p / 5) * Math.PI * 2 - Math.PI * 0.5;
        ctx.beginPath();
        ctx.arc(fx + Math.cos(a) * 0.9 * sc, fy + Math.sin(a) * 0.9 * sc, 0.52 * sc, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(fx, fy, 0.44 * sc, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (pat === 'gzhel') {
    ctx.strokeStyle = pCol || '#2563eb';
    ctx.lineWidth = 0.55;
    for (const sx of [-width * 0.42, 0, width * 0.42]) {
      ctx.beginPath();
      ctx.arc(sx, yCenter, 1.35, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = pCol || '#2563eb';
      ctx.beginPath();
      ctx.arc(sx, yCenter, 0.48, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (pat === 'polka_dots') {
    ctx.fillStyle = pCol;
    for (let dx = -width * 0.65; dx <= width * 0.65; dx += 2.6) {
      ctx.beginPath();
      ctx.arc(dx, yCenter - 1.0, 0.55, 0, Math.PI * 2);
      ctx.arc(dx + 1.3, yCenter + 1.4, 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (pat === 'stripes') {
    ctx.strokeStyle = pCol;
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(-width, yCenter - 1.1);
    ctx.quadraticCurveTo(0, yCenter + 0.1, width, yCenter - 1.1);
    ctx.moveTo(-width, yCenter + 1.0);
    ctx.quadraticCurveTo(0, yCenter + 2.2, width, yCenter + 1.0);
    ctx.stroke();
  } else if (pat === 'marbled') {
    ctx.fillStyle = hexToRgba(pCol, 0.48);
    for (let i = 0; i < 16; i++) {
      const mx = ((i * 37) % 100) / 100 * width * 1.6 - width * 0.8;
      const my = yCenter - height * 0.4 + (((i * 53) % 100) / 100) * height * 0.8;
      ctx.fillRect(mx, my, 0.75, 0.55);
    }
  } else if (pat === 'glaze_drip') {
    ctx.fillStyle = hexToRgba(pCol || '#b45309', 0.42);
    ctx.beginPath();
    ctx.moveTo(-width, yCenter - height * 0.6);
    ctx.lineTo(width, yCenter - height * 0.6);
    ctx.lineTo(width, yCenter - height * 0.1);
    ctx.bezierCurveTo(width * 0.45, yCenter + height * 0.25, 0, yCenter - height * 0.15, -width * 0.35, yCenter + height * 0.18);
    ctx.lineTo(-width, yCenter - height * 0.05);
    ctx.closePath();
    ctx.fill();
  } else if (pat === 'wood_grain') {
    ctx.strokeStyle = hexToRgba(pCol || '#713f12', 0.45);
    ctx.lineWidth = 0.42;
    for (let r = -2; r <= 2; r++) {
      ctx.beginPath();
      ctx.moveTo(-width, yCenter + r * 1.3);
      ctx.quadraticCurveTo(0, yCenter + r * 1.3 + 1.1, width, yCenter + r * 1.3);
      ctx.stroke();
    }
  } else if (pat === 'khokhloma') {
    ctx.fillStyle = '#facc15';
    for (const sx of [-width * 0.42, 0, width * 0.42]) {
      ctx.beginPath();
      ctx.arc(sx, yCenter, 1.05, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#dc2626';
    for (const sx of [-width * 0.21, width * 0.21]) {
      ctx.beginPath();
      ctx.arc(sx, yCenter + 0.4, 0.65, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function drawKitchenwareRedrawItem(
  ctx: CanvasRenderingContext2D,
  itemId: string,
  item?: any
): boolean {
  switch (itemId) {
    // =========================================================================
    // 1. POT (Кастрюля)
    // =========================================================================
    case 'pot': {
      const attrs = resolveKwAttrs('pot', item);
      const isKazan = attrs.shape === 'kazan_round' || attrs.material === 'cast_iron';
      const isMetallic = attrs.material === 'stainless_steel' || attrs.material === 'aluminum' || attrs.material === 'copper';
      const baseColor = attrs.color;
      const darkColor = shadeHex(baseColor, -0.42);
      const lightColor = shadeHex(baseColor, isMetallic ? 0.62 : 0.36);

      drawShadow(ctx, 9.2, 3.0, 8.1, 0.3);

      // Side loop handles
      for (const side of [-1, 1]) {
        ctx.strokeStyle = attrs.accentColor || '#1e293b';
        ctx.lineWidth = isKazan ? 1.85 : 1.55;
        ctx.beginPath();
        ctx.arc(
          side * (isKazan ? 7.8 : 8.1),
          -0.6,
          2.2,
          side < 0 ? Math.PI * 0.52 : -Math.PI * 0.48,
          side < 0 ? Math.PI * 1.48 : Math.PI * 0.48
        );
        ctx.stroke();
      }

      // Pot belly silhouette
      const drawBodyPath = () => {
        ctx.beginPath();
        if (isKazan) {
          ctx.moveTo(-7.8, -4.4);
          ctx.lineTo(7.8, -4.4);
          ctx.bezierCurveTo(8.4, 2.2, 5.2, 7.6, 0, 7.8);
          ctx.bezierCurveTo(-5.2, 7.6, -8.4, 2.2, -7.8, -4.4);
        } else {
          ctx.moveTo(-7.7, -4.6);
          ctx.lineTo(7.7, -4.6);
          ctx.quadraticCurveTo(8.1, 1.8, 7.1, 6.2);
          ctx.quadraticCurveTo(0, 8.1, -7.1, 6.2);
          ctx.quadraticCurveTo(-8.1, 1.8, -7.7, -4.6);
        }
        ctx.closePath();
      };

      const bodyGrad = ctx.createLinearGradient(-8.0, 0, 8.0, 0);
      bodyGrad.addColorStop(0.0, darkColor);
      bodyGrad.addColorStop(0.22, lightColor);
      bodyGrad.addColorStop(0.45, baseColor);
      bodyGrad.addColorStop(0.82, shadeHex(baseColor, -0.22));
      bodyGrad.addColorStop(1.0, shadeHex(baseColor, -0.56));
      ctx.fillStyle = bodyGrad;
      drawBodyPath();
      ctx.fill();

      ctx.save();
      drawBodyPath();
      ctx.clip();
      drawVesselBodyPattern(ctx, attrs, 7.6, 1.5, 9.5);
      // Specular streak
      const glGrad = ctx.createLinearGradient(-5.6, 0, -2.6, 0);
      glGrad.addColorStop(0.0, 'rgba(255,255,255,0)');
      glGrad.addColorStop(0.45, isMetallic ? 'rgba(255,255,255,0.46)' : 'rgba(255,255,255,0.28)');
      glGrad.addColorStop(1.0, 'rgba(255,255,255,0)');
      ctx.fillStyle = glGrad;
      ctx.fillRect(-6.0, -4.8, 3.6, 12.6);
      ctx.restore();

      // Rolled rim lip
      ctx.strokeStyle = isMetallic ? '#f8fafc' : shadeHex(baseColor, 0.35);
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.ellipse(0, -4.5, 7.8, 2.0, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Lid (glass lid vs solid matching lid)
      const hasGlassLid = Boolean(attrs.lidRu && attrs.lidRu.toLowerCase().includes('стекл'));
      if (hasGlassLid) {
        const glassLid = ctx.createRadialGradient(-2.0, -5.8, 0.4, 0, -5.0, 7.6);
        glassLid.addColorStop(0.0, 'rgba(240, 249, 255, 0.72)');
        glassLid.addColorStop(0.65, 'rgba(186, 230, 253, 0.38)');
        glassLid.addColorStop(1.0, 'rgba(100, 116, 139, 0.55)');
        ctx.fillStyle = glassLid;
      } else {
        const lidGrad = ctx.createRadialGradient(-2.2, -6.2, 0.5, 0, -5.2, 8.0);
        lidGrad.addColorStop(0.0, lightColor);
        lidGrad.addColorStop(0.5, baseColor);
        lidGrad.addColorStop(1.0, darkColor);
        ctx.fillStyle = lidGrad;
      }
      ctx.beginPath();
      ctx.ellipse(0, -5.1, 7.45, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 0.55;
      ctx.stroke();

      // Lid knob
      ctx.fillStyle = attrs.accentColor || '#1e293b';
      ctx.beginPath();
      ctx.ellipse(0, -7.2, 1.8, 0.85, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.32)';
      ctx.beginPath();
      ctx.ellipse(-0.5, -7.45, 0.7, 0.26, 0, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    // =========================================================================
    // 2. SAUTÉ PAN (Сотейник)
    // =========================================================================
    case 'saute_pan': {
      const attrs = resolveKwAttrs('saute_pan', item);
      const baseColor = attrs.color;
      const darkColor = shadeHex(baseColor, -0.45);
      const lightColor = shadeHex(baseColor, 0.35);

      drawShadow(ctx, 9.5, 2.8, 7.6, 0.3);

      // Long ergonomic right-side handle
      ctx.save();
      ctx.translate(6.6, -2.5);
      ctx.rotate(-0.18);
      const hGrad = ctx.createLinearGradient(0, -1.0, 0, 1.1);
      hGrad.addColorStop(0.0, shadeHex(attrs.accentColor || '#1e293b', 0.25));
      hGrad.addColorStop(1.0, shadeHex(attrs.accentColor || '#1e293b', -0.35));
      ctx.fillStyle = hGrad;
      ctx.beginPath();
      ctx.roundRect(0, -0.95, 5.2, 1.9, 0.8);
      ctx.fill();
      // Metal bolster collar
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-0.2, -0.95, 1.1, 1.9);
      ctx.restore();

      // Small helper loop on left side
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(-7.6, -1.8, 1.5, Math.PI * 0.55, Math.PI * 1.45);
      ctx.stroke();

      // Straight tall sauté pan walls (deeper than a skillet, sleeker than a pot)
      const drawSauteBody = () => {
        ctx.beginPath();
        ctx.moveTo(-7.6, -3.5);
        ctx.lineTo(6.8, -3.5);
        ctx.lineTo(6.5, 4.4);
        ctx.quadraticCurveTo(-0.4, 6.4, -7.3, 4.4);
        ctx.closePath();
      };

      const bodyGrad = ctx.createLinearGradient(-7.6, 0, 6.8, 0);
      bodyGrad.addColorStop(0.0, darkColor);
      bodyGrad.addColorStop(0.24, lightColor);
      bodyGrad.addColorStop(0.52, baseColor);
      bodyGrad.addColorStop(1.0, shadeHex(baseColor, -0.52));
      ctx.fillStyle = bodyGrad;
      drawSauteBody();
      ctx.fill();

      ctx.save();
      drawSauteBody();
      ctx.clip();
      drawVesselBodyPattern(ctx, attrs, 7.2, 0.8, 7.6);
      drawGlossBand(ctx, -5.2, -3.4, 2.2, 8.8, 0.24);
      ctx.restore();

      // Polished rim & fitted glass lid
      const glassGrad = ctx.createRadialGradient(-2.0, -4.4, 0.4, -0.4, -3.6, 7.4);
      glassGrad.addColorStop(0.0, 'rgba(241, 245, 249, 0.65)');
      glassGrad.addColorStop(0.7, 'rgba(148, 163, 184, 0.34)');
      glassGrad.addColorStop(1.0, 'rgba(51, 65, 85, 0.55)');
      ctx.fillStyle = glassGrad;
      ctx.beginPath();
      ctx.ellipse(-0.4, -3.6, 7.2, 2.05, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 0.72;
      ctx.stroke();

      // Lid handle knob
      ctx.fillStyle = attrs.accentColor || '#1e293b';
      ctx.beginPath();
      ctx.ellipse(-0.4, -5.5, 1.75, 0.75, 0, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    // =========================================================================
    // 3. FRYING PAN (Сковорода)
    // =========================================================================
    case 'frying_pan': {
      const attrs = resolveKwAttrs('frying_pan', item);
      const baseColor = attrs.color;
      const darkColor = shadeHex(baseColor, -0.45);
      const lightColor = shadeHex(baseColor, 0.32);

      drawShadow(ctx, 9.2, 3.2, 6.8, 0.3);

      // Long handle extending toward top-right
      ctx.save();
      ctx.translate(4.6, -2.0);
      ctx.rotate(-0.42);
      const hCol = attrs.accentColor || '#78350f';
      const hGrad = ctx.createLinearGradient(0, -1.0, 0, 1.0);
      hGrad.addColorStop(0.0, shadeHex(hCol, 0.28));
      hGrad.addColorStop(1.0, shadeHex(hCol, -0.32));
      ctx.fillStyle = hGrad;
      ctx.beginPath();
      ctx.roundRect(0, -0.95, 7.2, 1.9, 0.8);
      ctx.fill();
      // Hanging eyelet
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(5.8, 0, 0.42, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Outer skillet rim + shallow side skirt
      const skirtGrad = ctx.createLinearGradient(-8.5, 0, 5.5, 0);
      skirtGrad.addColorStop(0.0, darkColor);
      skirtGrad.addColorStop(0.35, lightColor);
      skirtGrad.addColorStop(1.0, darkColor);
      ctx.fillStyle = skirtGrad;
      ctx.beginPath();
      ctx.ellipse(-1.4, 2.1, 7.5, 4.7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Inner frying deck
      const deckGrad = ctx.createRadialGradient(-3.0, -0.6, 0.6, -1.4, 0.8, 7.2);
      deckGrad.addColorStop(0.0, lightColor);
      deckGrad.addColorStop(0.65, baseColor);
      deckGrad.addColorStop(1.0, darkColor);
      ctx.fillStyle = deckGrad;
      ctx.beginPath();
      ctx.ellipse(-1.4, 0.8, 7.5, 4.7, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = shadeHex(baseColor, 0.42);
      ctx.lineWidth = 0.72;
      ctx.stroke();

      // Inner recessed cooking floor + optional marbled coating specks
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(-1.4, 1.0, 6.1, 3.6, 0, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = shadeHex(baseColor, -0.18);
      ctx.fillRect(-8, -3, 14, 8);
      if (attrs.pattern === 'marbled') {
        drawVesselBodyPattern(ctx, attrs, 6.2, 1.0, 6.4);
      }
      ctx.restore();
      return true;
    }

    // =========================================================================
    // 4. KETTLE (Чайник — наплитный / со свистком / электрический / заварочный)
    // =========================================================================
    case 'kettle': {
      const attrs = resolveKwAttrs('kettle', item);
      const baseColor = attrs.color;
      const darkColor = shadeHex(baseColor, -0.4);
      const lightColor = shadeHex(baseColor, 0.48);
      const isElectric = Boolean(attrs.isElectric || attrs.shape === 'electric_cylinder');
      const isTeapot = attrs.shape === 'teapot_round' || attrs.material === 'terracotta_clay';

      drawShadow(ctx, 8.2, 2.9, 7.8, 0.28);

      if (isElectric) {
        // Power dock base
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.ellipse(0, 6.8, 6.2, 1.7, 0, 0, Math.PI * 2);
        ctx.fill();

        // Side handle
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.65;
        ctx.beginPath();
        ctx.moveTo(5.0, -4.6);
        ctx.quadraticCurveTo(8.8, -3.6, 8.4, 1.2);
        ctx.quadraticCurveTo(8.2, 4.2, 5.2, 4.5);
        ctx.stroke();

        // Glass body cylinder
        const glassGrad = ctx.createLinearGradient(-5.5, 0, 5.5, 0);
        glassGrad.addColorStop(0.0, 'rgba(186, 230, 253, 0.55)');
        glassGrad.addColorStop(0.28, 'rgba(255, 255, 255, 0.82)');
        glassGrad.addColorStop(0.75, 'rgba(186, 230, 253, 0.42)');
        glassGrad.addColorStop(1.0, 'rgba(100, 116, 139, 0.48)');
        ctx.fillStyle = glassGrad;
        ctx.beginPath();
        ctx.moveTo(-5.2, -5.8);
        ctx.lineTo(5.2, -5.8);
        ctx.lineTo(5.6, 5.5);
        ctx.quadraticCurveTo(0, 7.0, -5.6, 5.5);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.7)';
        ctx.lineWidth = 0.55;
        ctx.stroke();

        // Blue LED illumination ring at bottom
        const ledGlow = ctx.createRadialGradient(0, 4.8, 0.5, 0, 4.8, 5.2);
        ledGlow.addColorStop(0.0, 'rgba(56, 189, 248, 0.82)');
        ledGlow.addColorStop(1.0, 'rgba(56, 189, 248, 0)');
        ctx.fillStyle = ledGlow;
        ctx.beginPath();
        ctx.ellipse(0, 4.8, 5.1, 1.8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Steel bottom band & hinged lid
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(-5.5, 4.8, 11.0, 1.3);
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.ellipse(0, -6.0, 5.4, 1.5, 0, 0, Math.PI * 2);
        ctx.fill();
        return true;
      }

      if (isTeapot) {
        // Side clay handle (right)
        ctx.strokeStyle = darkColor;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(5.4, 0.6, 3.0, -Math.PI * 0.52, Math.PI * 0.52);
        ctx.stroke();

        // Pouring spout (left)
        ctx.strokeStyle = baseColor;
        ctx.lineWidth = 2.0;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-5.0, 2.2);
        ctx.quadraticCurveTo(-8.4, 0.6, -8.8, -2.8);
        ctx.stroke();

        // Round teapot body
        const clayGrad = ctx.createRadialGradient(-2.0, -0.8, 0.6, 0, 1.2, 6.8);
        clayGrad.addColorStop(0.0, lightColor);
        clayGrad.addColorStop(0.5, baseColor);
        clayGrad.addColorStop(1.0, darkColor);
        ctx.fillStyle = clayGrad;
        ctx.beginPath();
        ctx.ellipse(0, 1.2, 6.2, 5.4, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.beginPath();
        ctx.ellipse(0, 1.2, 6.2, 5.4, 0, 0, Math.PI * 2);
        ctx.clip();
        drawVesselBodyPattern(ctx, attrs, 6.0, 1.4, 8.0);
        ctx.restore();

        // Fitted lid + knob
        ctx.fillStyle = shadeHex(baseColor, 0.15);
        ctx.beginPath();
        ctx.ellipse(0, -3.7, 3.3, 1.15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = darkColor;
        ctx.beginPath();
        ctx.arc(0, -5.0, 0.95, 0, Math.PI * 2);
        ctx.fill();
        return true;
      }

      // Stovetop conical or domed kettle
      // Arching top handle
      ctx.strokeStyle = attrs.accentColor || '#1e293b';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(0, -3.2, 5.4, Math.PI * 1.06, Math.PI * 1.94);
      ctx.stroke();

      // Spout (left) + optional whistle cap
      ctx.strokeStyle = shadeHex(baseColor, -0.15);
      ctx.lineWidth = 2.1;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-5.4, 2.4);
      ctx.quadraticCurveTo(-8.6, 0.4, -8.8, -3.2);
      ctx.stroke();
      if (attrs.hasWhistle) {
        ctx.fillStyle = '#18181b';
        ctx.beginPath();
        ctx.arc(-8.9, -3.5, 1.15, 0, Math.PI * 2);
        ctx.fill();
      }

      // Kettle body
      const drawKettleBody = () => {
        ctx.beginPath();
        if (attrs.shape === 'conical') {
          ctx.moveTo(-4.4, -3.4);
          ctx.lineTo(4.4, -3.4);
          ctx.lineTo(7.4, 5.2);
          ctx.quadraticCurveTo(0, 7.6, -7.4, 5.2);
        } else {
          ctx.moveTo(-5.0, -3.2);
          ctx.quadraticCurveTo(0, -4.4, 5.0, -3.2);
          ctx.bezierCurveTo(8.0, 0.0, 8.0, 4.6, 6.2, 6.2);
          ctx.quadraticCurveTo(0, 7.8, -6.2, 6.2);
          ctx.bezierCurveTo(-8.0, 4.6, -8.0, 0.0, -5.0, -3.2);
        }
        ctx.closePath();
      };

      const kGrad = ctx.createLinearGradient(-7.5, 0, 7.5, 0);
      kGrad.addColorStop(0.0, darkColor);
      kGrad.addColorStop(0.24, lightColor);
      kGrad.addColorStop(0.52, baseColor);
      kGrad.addColorStop(1.0, shadeHex(baseColor, -0.52));
      ctx.fillStyle = kGrad;
      drawKettleBody();
      ctx.fill();

      ctx.save();
      drawKettleBody();
      ctx.clip();
      drawVesselBodyPattern(ctx, attrs, 7.2, 1.8, 8.0);
      drawGlossBand(ctx, -4.6, -3.0, 2.2, 9.2, 0.32);
      ctx.restore();

      // Kettle lid + knob
      ctx.fillStyle = lightColor;
      ctx.beginPath();
      ctx.ellipse(0, -3.5, 4.2, 1.35, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = attrs.accentColor || '#1e293b';
      ctx.beginPath();
      ctx.arc(0, -5.0, 1.0, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    // =========================================================================
    // 5. PLATE (Тарелка)
    // =========================================================================
    case 'plate': {
      const attrs = resolveKwAttrs('plate', item);
      const baseColor = attrs.color;
      const darkColor = shadeHex(baseColor, -0.26);
      const lightColor = shadeHex(baseColor, 0.38);

      drawShadow(ctx, 9.2, 4.4, 5.6, 0.25);

      // Outer plate rim
      const outerGrad = ctx.createRadialGradient(-2.8, -1.8, 0.8, 0, 0, 9.4);
      outerGrad.addColorStop(0.0, lightColor);
      outerGrad.addColorStop(0.7, baseColor);
      outerGrad.addColorStop(1.0, darkColor);
      ctx.fillStyle = outerGrad;
      ctx.beginPath();
      ctx.ellipse(0, 0.4, 9.4, 6.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Pattern around rim (gold_rim, blue_rim, gzhel, floral, stripes)
      if (attrs.pattern === 'gold_rim' || attrs.pattern === 'blue_rim') {
        ctx.strokeStyle = attrs.patternColor || (attrs.pattern === 'gold_rim' ? '#eab308' : '#1d4ed8');
        ctx.lineWidth = 0.85;
        ctx.beginPath();
        ctx.ellipse(0, 0.4, 8.75, 5.7, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (attrs.pattern === 'gzhel' || attrs.pattern === 'floral' || attrs.pattern === 'polka_dots') {
        const pCol = attrs.patternColor || '#2563eb';
        ctx.fillStyle = pCol;
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          ctx.beginPath();
          ctx.arc(Math.cos(a) * 7.6, 0.4 + Math.sin(a) * 4.9, 0.62, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.strokeStyle = attrs.accentColor || '#eab308';
        ctx.lineWidth = 0.55;
        ctx.beginPath();
        ctx.ellipse(0, 0.4, 9.0, 5.9, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Recessed center well
      const wellGrad = ctx.createRadialGradient(1.2, 1.4, 0.6, 0, 0.6, 6.0);
      wellGrad.addColorStop(0.0, lightColor);
      wellGrad.addColorStop(0.78, shadeHex(baseColor, -0.09));
      wellGrad.addColorStop(1.0, darkColor);
      ctx.fillStyle = wellGrad;
      ctx.beginPath();
      ctx.ellipse(0, 0.6, 6.0, 3.85, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
      ctx.lineWidth = 0.45;
      ctx.stroke();

      // Liquid pool if filled
      const liqColor = getLiquidColorFromItem(item);
      if (liqColor) {
        ctx.fillStyle = liqColor;
        ctx.beginPath();
        ctx.ellipse(0, 0.7, 5.2, 3.1, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      return true;
    }

    // =========================================================================
    // 6. BOWL (Миска / Пиала)
    // =========================================================================
    case 'bowl': {
      const attrs = resolveKwAttrs('bowl', item);
      const baseColor = attrs.color;
      const darkColor = shadeHex(baseColor, -0.38);
      const lightColor = shadeHex(baseColor, 0.35);

      drawShadow(ctx, 8.6, 3.0, 6.8, 0.28);

      // Deep rounded outer bowl body
      const drawBowlBody = () => {
        ctx.beginPath();
        ctx.moveTo(-8.4, -2.2);
        ctx.bezierCurveTo(-8.2, 4.4, -4.4, 6.8, 0, 6.8);
        ctx.bezierCurveTo(4.4, 6.8, 8.2, 4.4, 8.4, -2.2);
        ctx.closePath();
      };

      const bodyGrad = ctx.createLinearGradient(-8.4, 0, 8.4, 0);
      bodyGrad.addColorStop(0.0, darkColor);
      bodyGrad.addColorStop(0.26, lightColor);
      bodyGrad.addColorStop(0.55, baseColor);
      bodyGrad.addColorStop(1.0, shadeHex(baseColor, -0.45));
      ctx.fillStyle = bodyGrad;
      drawBowlBody();
      ctx.fill();

      ctx.save();
      drawBowlBody();
      ctx.clip();
      drawVesselBodyPattern(ctx, attrs, 8.2, 2.4, 7.6);
      drawGlossBand(ctx, -5.6, -1.6, 2.0, 7.4, 0.26);
      ctx.restore();

      // Interior bowl rim + concave inside
      const innerGrad = ctx.createRadialGradient(0, -1.6, 0.6, 0, -2.2, 8.4);
      innerGrad.addColorStop(0.0, darkColor);
      innerGrad.addColorStop(0.7, shadeHex(baseColor, -0.14));
      innerGrad.addColorStop(1.0, lightColor);
      ctx.fillStyle = innerGrad;
      ctx.beginPath();
      ctx.ellipse(0, -2.2, 8.3, 2.85, 0, 0, Math.PI * 2);
      ctx.fill();

      // Rim accent stripe
      ctx.strokeStyle =
        attrs.pattern === 'blue_rim' || attrs.pattern === 'gold_rim' || attrs.pattern === 'stripes'
          ? (attrs.patternColor || attrs.accentColor || '#1d4ed8')
          : shadeHex(baseColor, 0.25);
      ctx.lineWidth = 0.85;
      ctx.stroke();

      // Liquid inside bowl if filled (e.g. soup/broth)
      const liqColor = getLiquidColorFromItem(item);
      if (liqColor) {
        ctx.fillStyle = liqColor;
        ctx.beginPath();
        ctx.ellipse(0, -1.7, 7.1, 2.15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.34)';
        ctx.beginPath();
        ctx.ellipse(-2.0, -2.1, 2.1, 0.48, -0.1, 0, Math.PI * 2);
        ctx.fill();
      }
      return true;
    }

    // =========================================================================
    // 7. MUG (Кружка)
    // =========================================================================
    case 'mug': {
      const attrs = resolveKwAttrs('mug', item);
      const isGlass = attrs.material === 'glass';
      const baseColor = attrs.color;
      const darkColor = shadeHex(baseColor, -0.36);
      const lightColor = shadeHex(baseColor, 0.38);
      const liqColor = getLiquidColorFromItem(item);

      drawShadow(ctx, 7.2, 2.5, 7.2, 0.26);

      // Right-side C-handle
      ctx.strokeStyle = isGlass ? 'rgba(186, 230, 253, 0.82)' : shadeHex(baseColor, -0.12);
      ctx.lineWidth = 1.75;
      ctx.beginPath();
      ctx.arc(4.8, 0.2, 3.2, -Math.PI * 0.48, Math.PI * 0.48);
      ctx.stroke();

      const drawMugBody = () => {
        ctx.beginPath();
        ctx.moveTo(-5.8, -5.2);
        ctx.lineTo(5.0, -5.2);
        ctx.lineTo(4.7, 5.6);
        ctx.quadraticCurveTo(-0.4, 7.2, -5.5, 5.6);
        ctx.closePath();
      };

      if (isGlass) {
        const gGrad = ctx.createLinearGradient(-5.8, 0, 5.0, 0);
        gGrad.addColorStop(0.0, 'rgba(186, 230, 253, 0.48)');
        gGrad.addColorStop(0.28, 'rgba(255, 255, 255, 0.78)');
        gGrad.addColorStop(0.75, 'rgba(186, 230, 253, 0.36)');
        gGrad.addColorStop(1.0, 'rgba(148, 163, 184, 0.45)');
        ctx.fillStyle = gGrad;
      } else {
        const mGrad = ctx.createLinearGradient(-5.8, 0, 5.0, 0);
        mGrad.addColorStop(0.0, darkColor);
        mGrad.addColorStop(0.26, lightColor);
        mGrad.addColorStop(0.55, baseColor);
        mGrad.addColorStop(1.0, shadeHex(baseColor, -0.42));
        ctx.fillStyle = mGrad;
      }
      drawMugBody();
      ctx.fill();

      ctx.save();
      drawMugBody();
      ctx.clip();
      // Visible liquid through glass mug
      if (isGlass && liqColor) {
        const fillRatio = Math.min(1, Math.max(0.15, (item?.fluidStorage?.currentMl || 0) / Math.max(1, item?.fluidStorage?.maxMl || 350)));
        const topY = 5.6 - fillRatio * 9.5;
        ctx.fillStyle = hexToRgba(liqColor, 0.72);
        ctx.fillRect(-6, topY, 12, 12);
      }
      // Faceted glass ribs or decorative pattern
      if (attrs.pattern === 'faceted' || isGlass) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.42)';
        ctx.lineWidth = 0.45;
        for (const fx of [-3.4, -1.2, 1.0, 3.0]) {
          ctx.beginPath();
          ctx.moveTo(fx, -4.8);
          ctx.lineTo(fx, 6.2);
          ctx.stroke();
        }
      } else {
        drawVesselBodyPattern(ctx, attrs, 5.4, 0.4, 10.2);
      }
      drawGlossBand(ctx, -4.4, -4.8, 1.7, 10.2, 0.32);
      ctx.restore();

      // Top rim & liquid meniscus
      ctx.fillStyle = liqColor || (isGlass ? 'rgba(224, 242, 254, 0.5)' : darkColor);
      ctx.beginPath();
      ctx.ellipse(-0.4, -5.2, 5.4, 1.6, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle =
        attrs.pattern === 'blue_rim' || attrs.pattern === 'gold_rim'
          ? (attrs.patternColor || attrs.accentColor || '#1d4ed8')
          : (isGlass ? '#e0f2fe' : lightColor);
      ctx.lineWidth = 0.78;
      ctx.stroke();
      return true;
    }

    // =========================================================================
    // 8. CUP (Чашка с опциональным блюдцем)
    // =========================================================================
    case 'cup': {
      const attrs = resolveKwAttrs('cup', item);
      const baseColor = attrs.color;
      const darkColor = shadeHex(baseColor, -0.28);
      const lightColor = shadeHex(baseColor, 0.35);
      const liqColor = getLiquidColorFromItem(item);

      drawShadow(ctx, 8.4, 2.8, 6.6, 0.24);

      // Optional saucer underneath
      if (attrs.hasSaucer !== false) {
        const sGrad = ctx.createRadialGradient(-2.0, 3.8, 0.5, 0, 4.6, 8.6);
        sGrad.addColorStop(0.0, lightColor);
        sGrad.addColorStop(0.7, baseColor);
        sGrad.addColorStop(1.0, darkColor);
        ctx.fillStyle = sGrad;
        ctx.beginPath();
        ctx.ellipse(0, 4.6, 8.4, 2.9, 0, 0, Math.PI * 2);
        ctx.fill();
        if (attrs.accentColor) {
          ctx.strokeStyle = attrs.accentColor;
          ctx.lineWidth = 0.55;
          ctx.stroke();
        }
      }

      // Delicate ear handle
      ctx.strokeStyle = shadeHex(baseColor, -0.1);
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(4.8, -0.2, 2.4, -Math.PI * 0.45, Math.PI * 0.52);
      ctx.stroke();

      // Tapered teacup body
      const drawCupBody = () => {
        ctx.beginPath();
        ctx.moveTo(-5.6, -4.4);
        ctx.lineTo(5.2, -4.4);
        ctx.bezierCurveTo(5.0, 1.8, 3.4, 4.6, -0.2, 4.8);
        ctx.bezierCurveTo(-3.8, 4.6, -5.4, 1.8, -5.6, -4.4);
        ctx.closePath();
      };

      const cGrad = ctx.createLinearGradient(-5.6, 0, 5.2, 0);
      cGrad.addColorStop(0.0, darkColor);
      cGrad.addColorStop(0.3, lightColor);
      cGrad.addColorStop(0.6, baseColor);
      cGrad.addColorStop(1.0, shadeHex(baseColor, -0.35));
      ctx.fillStyle = cGrad;
      drawCupBody();
      ctx.fill();

      ctx.save();
      drawCupBody();
      ctx.clip();
      drawVesselBodyPattern(ctx, attrs, 5.2, 0.2, 8.0);
      drawGlossBand(ctx, -3.8, -4.0, 1.4, 7.6, 0.28);
      ctx.restore();

      // Top opening & gold/pattern rim
      ctx.fillStyle = liqColor || darkColor;
      ctx.beginPath();
      ctx.ellipse(-0.2, -4.4, 5.35, 1.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = attrs.accentColor || '#eab308';
      ctx.lineWidth = 0.65;
      ctx.stroke();
      return true;
    }

    // =========================================================================
    // 9. SPOON (Ложка)
    // =========================================================================
    case 'spoon': {
      const attrs = resolveKwAttrs('spoon', item);
      const isKhokhloma = attrs.pattern === 'khokhloma';
      const baseColor = attrs.color;
      const darkColor = shadeHex(baseColor, -0.38);
      const lightColor = shadeHex(baseColor, 0.45);

      ctx.save();
      ctx.rotate(-0.62);
      drawShadow(ctx, 8.8, 2.0, 3.4, 0.24);

      // Handle shaft
      const hGrad = ctx.createLinearGradient(-9.5, -1.2, -9.5, 1.2);
      hGrad.addColorStop(0.0, isKhokhloma ? '#78350f' : lightColor);
      hGrad.addColorStop(0.5, isKhokhloma ? '#451a03' : baseColor);
      hGrad.addColorStop(1.0, isKhokhloma ? '#1c1917' : darkColor);
      ctx.fillStyle = hGrad;
      ctx.beginPath();
      ctx.moveTo(-10.2, -0.95);
      ctx.lineTo(1.8, -0.6);
      ctx.lineTo(1.8, 0.6);
      ctx.lineTo(-10.2, 0.95);
      ctx.quadraticCurveTo(-11.2, 0, -10.2, -0.95);
      ctx.closePath();
      ctx.fill();

      // Spoon bowl
      const bGrad = ctx.createRadialGradient(4.6, -0.8, 0.4, 5.6, 0, 4.6);
      bGrad.addColorStop(0.0, lightColor);
      bGrad.addColorStop(0.55, baseColor);
      bGrad.addColorStop(1.0, darkColor);
      ctx.fillStyle = bGrad;
      ctx.beginPath();
      ctx.ellipse(5.8, 0, 4.6, 3.0, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = darkColor;
      ctx.lineWidth = 0.4;
      ctx.stroke();

      // Inner concave shadow or Khokhloma / engraved pattern
      const spoonLiqColor = getLiquidColorFromItem(item);
      const spoonHasSolids = Boolean(item?.contents && item.contents.length > 0);
      if (isKhokhloma) {
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(4.5, -0.8, 0.95, 0, Math.PI * 2);
        ctx.arc(7.1, 0.8, 0.85, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#18181b';
        ctx.beginPath();
        ctx.arc(5.8, 0, 0.65, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 0.45;
        ctx.beginPath();
        ctx.moveTo(-8.5, 0);
        ctx.lineTo(-1.0, 0);
        ctx.stroke();
      } else if (attrs.pattern === 'engraved') {
        ctx.strokeStyle = attrs.patternColor || '#475569';
        ctx.lineWidth = 0.45;
        ctx.beginPath();
        ctx.moveTo(-9.0, 0);
        ctx.lineTo(-1.5, 0);
        ctx.stroke();
      } else if (!spoonLiqColor) {
        ctx.fillStyle = 'rgba(255,255,255,0.34)';
        ctx.beginPath();
        ctx.ellipse(5.2, -1.0, 2.2, 0.75, -0.15, 0, Math.PI * 2);
        ctx.fill();
      }

      // Render liquid or dry powder pool inside spoon scoop
      if (spoonLiqColor) {
        const fs = item?.fluidStorage;
        const fillRatio = fs && fs.maxMl > 0
          ? Math.max(0.28, Math.min(1, fs.currentMl / fs.maxMl))
          : 0.7;
        const rx = 2.0 + fillRatio * 1.85;
        const ry = 1.15 + fillRatio * 1.15;
        const isDry = fs?.attributes?.physicalForm === 'dry' || fs?.liquidId === 'sand' || fs?.liquidId === 'sugar' || fs?.liquidId === 'salt' || fs?.liquidId === 'flour';
        ctx.fillStyle = spoonLiqColor;
        ctx.beginPath();
        ctx.ellipse(5.85, 0.05, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        if (isDry) {
          ctx.fillStyle = 'rgba(255,255,255,0.28)';
          ctx.beginPath();
          ctx.arc(5.1, -0.35, 0.45, 0, Math.PI * 2);
          ctx.arc(6.4, 0.25, 0.38, 0, Math.PI * 2);
          ctx.arc(5.85, -0.1, 0.32, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = 'rgba(255,255,255,0.38)';
          ctx.beginPath();
          ctx.ellipse(5.3, -ry * 0.42, rx * 0.46, Math.max(0.3, ry * 0.24), -0.12, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Render tiny solid morsel(s) resting in the spoon bowl
      if (spoonHasSolids) {
        const count = Math.min(3, item!.contents!.length);
        const offsets = count === 1 ? [[5.9, 0.0]] : count === 2 ? [[5.1, -0.4], [6.6, 0.35]] : [[5.0, -0.45], [6.7, -0.1], [5.8, 0.6]];
        for (const [ox, oy] of offsets) {
          ctx.fillStyle = '#d97706';
          ctx.beginPath();
          ctx.arc(ox, oy, 1.05, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.28)';
          ctx.beginPath();
          ctx.arc(ox - 0.3, oy - 0.3, 0.32, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
      return true;
    }

    // =========================================================================
    // 10. FORK (Вилка)
    // =========================================================================
    case 'fork': {
      const attrs = resolveKwAttrs('fork', item);
      const baseColor = attrs.color;
      const darkColor = shadeHex(baseColor, -0.36);
      const lightColor = shadeHex(baseColor, 0.46);

      ctx.save();
      ctx.rotate(-0.62);
      drawShadow(ctx, 8.8, 1.8, 3.2, 0.24);

      const mGrad = ctx.createLinearGradient(-10, -1.4, -10, 1.4);
      mGrad.addColorStop(0.0, lightColor);
      mGrad.addColorStop(0.5, baseColor);
      mGrad.addColorStop(1.0, darkColor);
      ctx.fillStyle = mGrad;

      // Handle
      ctx.beginPath();
      ctx.moveTo(-10.2, -1.05);
      ctx.lineTo(1.2, -0.58);
      ctx.lineTo(1.2, 0.58);
      ctx.lineTo(-10.2, 1.05);
      ctx.quadraticCurveTo(-11.2, 0, -10.2, -1.05);
      ctx.closePath();
      ctx.fill();

      // Fork shoulder + 4 tines
      ctx.beginPath();
      ctx.moveTo(1.0, -0.6);
      ctx.quadraticCurveTo(2.4, -2.2, 4.4, -2.2);
      ctx.lineTo(10.0, -2.0);
      ctx.lineTo(10.0, -1.35);
      ctx.lineTo(4.8, -1.35);
      ctx.lineTo(4.8, -0.78);
      ctx.lineTo(10.2, -0.72);
      ctx.lineTo(10.2, -0.15);
      ctx.lineTo(4.8, -0.15);
      ctx.lineTo(4.8, 0.15);
      ctx.lineTo(10.2, 0.15);
      ctx.lineTo(10.2, 0.72);
      ctx.lineTo(4.8, 0.78);
      ctx.lineTo(4.8, 1.35);
      ctx.lineTo(10.0, 1.35);
      ctx.lineTo(10.0, 2.0);
      ctx.lineTo(4.4, 2.2);
      ctx.quadraticCurveTo(2.4, 2.2, 1.0, 0.6);
      ctx.closePath();
      ctx.fill();

      if (attrs.pattern === 'engraved') {
        ctx.strokeStyle = attrs.patternColor || '#475569';
        ctx.lineWidth = 0.45;
        ctx.beginPath();
        ctx.moveTo(-9.0, 0);
        ctx.lineTo(-1.0, 0);
        ctx.stroke();
      }

      // Render speared food morsel on tines if fork holds an item
      if (item?.contents && item.contents.length > 0) {
        ctx.fillStyle = '#c26a3b';
        ctx.beginPath();
        ctx.ellipse(7.6, 0, 2.2, 1.65, 0.12, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#7c2d12';
        ctx.lineWidth = 0.35;
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.beginPath();
        ctx.ellipse(7.1, -0.55, 0.9, 0.42, -0.1, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
      return true;
    }

    // =========================================================================
    // 11. KITCHEN KNIFE (Кухонный нож)
    // =========================================================================
    case 'kitchen_knife': {
      const attrs = resolveKwAttrs('kitchen_knife', item);
      const bladeColor = attrs.color || '#cbd5e1';
      const handleColor = attrs.accentColor || '#5c3a21';

      ctx.save();
      ctx.rotate(-0.62);
      drawShadow(ctx, 9.4, 2.0, 3.6, 0.25);

      // Broad chef blade
      const bGrad = ctx.createLinearGradient(-1.0, -2.6, -1.0, 2.8);
      bGrad.addColorStop(0.0, shadeHex(bladeColor, -0.25));
      bGrad.addColorStop(0.35, shadeHex(bladeColor, 0.45));
      bGrad.addColorStop(0.75, bladeColor);
      bGrad.addColorStop(1.0, '#ffffff');
      ctx.fillStyle = bGrad;
      ctx.beginPath();
      ctx.moveTo(-1.5, -1.4);
      ctx.lineTo(10.4, -1.2);
      ctx.quadraticCurveTo(9.2, 2.2, 2.2, 2.6);
      ctx.lineTo(-1.5, 2.4);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = shadeHex(bladeColor, -0.4);
      ctx.lineWidth = 0.35;
      ctx.stroke();

      // Steel bolster
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(-2.4, -1.4, 1.0, 3.3);

      // Full-tang wooden/polymer handle with brass rivets
      const hGrad = ctx.createLinearGradient(0, -1.4, 0, 1.6);
      hGrad.addColorStop(0.0, shadeHex(handleColor, 0.28));
      hGrad.addColorStop(1.0, shadeHex(handleColor, -0.32));
      ctx.fillStyle = hGrad;
      ctx.beginPath();
      ctx.roundRect(-10.4, -1.35, 8.2, 2.55, 0.9);
      ctx.fill();

      // 3 brass rivets
      ctx.fillStyle = '#eab308';
      for (const rx of [-8.4, -6.2, -4.0]) {
        ctx.beginPath();
        ctx.arc(rx, -0.05, 0.42, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      return true;
    }

    // =========================================================================
    // 12. CLAY BAKING POTS (Глиняные горшочки 0.25л / 0.5л / 1.0л для продуктов)
    // =========================================================================
    case 'pot_clay_small':
    case 'pot_clay_small_open':
    case 'pot_clay_medium':
    case 'pot_clay_medium_open':
    case 'pot_clay_large':
    case 'pot_clay_large_open': {
      const isSm = itemId.includes('small');
      const isLg = itemId.includes('large');
      const isOpen = Boolean(
        item?.isOpen || item?.fluidStorage?.attributes?.isOpened || itemId.endsWith('_open')
      );
      const scale = isLg ? 1.14 : isSm ? 0.84 : 1.0;

      ctx.save();
      ctx.scale(scale, scale);
      drawShadow(ctx, 6.8, 2.7, 7.8, 0.3);

      for (const side of [-1, 1]) {
        ctx.strokeStyle = '#7c2d12';
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.arc(side * 5.6, -1.0, 1.45, side < 0 ? Math.PI * 0.5 : -Math.PI * 0.5, side < 0 ? Math.PI * 1.5 : Math.PI * 0.5);
        ctx.stroke();
      }

      const drawPotBody = () => {
        ctx.beginPath();
        ctx.moveTo(-4.4, -3.8);
        ctx.bezierCurveTo(-7.8, -0.2, -7.4, 5.2, -4.6, 6.8);
        ctx.quadraticCurveTo(0, 8.2, 4.6, 6.8);
        ctx.bezierCurveTo(7.4, 5.2, 7.8, -0.2, 4.4, -3.8);
        ctx.closePath();
      };

      const clayGrad = ctx.createRadialGradient(-2.4, -0.5, 0.6, 0, 1.8, 8.4);
      clayGrad.addColorStop(0.0, '#fb923c');
      clayGrad.addColorStop(0.38, '#c2410c');
      clayGrad.addColorStop(0.78, '#7c2d12');
      clayGrad.addColorStop(1.0, '#431407');
      ctx.fillStyle = clayGrad;
      drawPotBody();
      ctx.fill();

      ctx.save();
      drawPotBody();
      ctx.clip();

      const glazeGrad = ctx.createLinearGradient(0, -4.0, 0, 0.8);
      glazeGrad.addColorStop(0.0, '#78350f');
      glazeGrad.addColorStop(0.6, '#451a03');
      glazeGrad.addColorStop(1.0, '#9a3412');
      ctx.fillStyle = glazeGrad;
      ctx.beginPath();
      ctx.moveTo(-6.5, -4.2);
      ctx.lineTo(6.5, -4.2);
      ctx.lineTo(6.5, -0.4);
      ctx.bezierCurveTo(4.0, 0.8, 2.2, -0.8, 0.0, 0.5);
      ctx.bezierCurveTo(-2.2, 1.4, -4.0, -0.6, -6.5, 0.2);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = 'rgba(254, 215, 170, 0.42)';
      ctx.lineWidth = 0.42;
      ctx.beginPath();
      for (let wx = -5.6; wx <= 4.6; wx += 2.0) {
        ctx.moveTo(wx, 1.2);
        ctx.quadraticCurveTo(wx + 0.5, 0.4, wx + 1.0, 1.2);
        ctx.quadraticCurveTo(wx + 1.5, 2.0, wx + 2.0, 1.2);
      }
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 237, 213, 0.34)';
      ctx.beginPath();
      ctx.ellipse(-3.6, 1.2, 1.05, 3.2, 0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = '#7c2d12';
      ctx.beginPath();
      ctx.ellipse(0, -3.9, 5.4, 1.75, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(253, 186, 116, 0.48)';
      ctx.lineWidth = 0.38;
      ctx.stroke();

      if (!isOpen) {
        const clothGrad = ctx.createRadialGradient(-1.5, -5.8, 0.4, 0, -4.8, 5.6);
        clothGrad.addColorStop(0.0, '#fffbeb');
        clothGrad.addColorStop(0.55, '#fde68a');
        clothGrad.addColorStop(1.0, '#d97706');
        ctx.fillStyle = clothGrad;
        ctx.beginPath();
        ctx.moveTo(-4.8, -5.6);
        ctx.quadraticCurveTo(0, -7.2, 4.8, -5.6);
        ctx.lineTo(5.4, -3.1);
        ctx.quadraticCurveTo(2.6, -2.3, 0, -3.1);
        ctx.quadraticCurveTo(-2.6, -2.3, -5.4, -3.1);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 0.78;
        ctx.beginPath();
        ctx.moveTo(-5.0, -3.6);
        ctx.quadraticCurveTo(0, -2.8, 5.0, -3.6);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(2.4, -3.3);
        ctx.lineTo(3.8, -2.0);
        ctx.moveTo(2.4, -3.3);
        ctx.lineTo(2.8, -1.7);
        ctx.stroke();
      } else {
        const hasFluid = item?.fluidStorage && item.fluidStorage.currentMl > 0;
        const innerC = hasFluid
          ? item.fluidStorage.attributes?.customColor || '#f59e0b'
          : '#1c1917';
        ctx.fillStyle = innerC;
        ctx.beginPath();
        ctx.ellipse(0, -3.85, 4.4, 1.3, 0, 0, Math.PI * 2);
        ctx.fill();
        if (hasFluid) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
          ctx.beginPath();
          ctx.ellipse(-1.4, -4.05, 1.3, 0.32, -0.1, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
      return true;
    }

    default:
      return false;
  }
}
