import { StreetProp } from './types';

/**
 * High-fidelity vector rendering for all street props (intact & broken states).
 * Every prop has detailed textures, physical materials, and realistic damage states.
 */

// --- 1. BENCH (СКАМЕЙКА) ---
export function renderPropBench(ctx: CanvasRenderingContext2D, prop: StreetProp) {
  if (prop.isBroken) {
    // Fractured concrete foundation slab
    ctx.fillStyle = '#475569';
    ctx.fillRect(-13, -8, 26, 16);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.strokeRect(-13, -8, 26, 16);

    // Concrete crack line
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-13, 2);
    ctx.lineTo(-4, 0);
    ctx.lineTo(2, 6);
    ctx.lineTo(13, 3);
    ctx.stroke();

    // Snapped cast-iron armrest frame
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-10, -6, 3, 5);
    ctx.fillRect(7, -3, 3, 8);

    // Splintered wood planks lying askew
    ctx.save();
    ctx.rotate(0.25);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-9, -5, 11, 2.2);
    ctx.fillStyle = '#92400e';
    ctx.fillRect(-8, -2, 18, 2.2);
    ctx.restore();

    ctx.save();
    ctx.rotate(-0.32);
    ctx.fillStyle = '#b45309';
    ctx.fillRect(-7, 2, 16, 2.2);
    ctx.fillStyle = '#d97706';
    ctx.fillRect(-10, 5, 12, 1.8);
    ctx.restore();

    // Scattered wooden splinters
    ctx.fillStyle = '#b45309';
    ctx.fillRect(-11, -7, 3, 1);
    ctx.fillRect(8, -5, 2, 1);
    ctx.fillRect(10, 6, 3, 1.2);
    ctx.fillRect(-6, 7, 2, 1);

    // Sheared carriage bolt heads
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(-8, -7, 1.2, 1.2);
    ctx.fillRect(9, 4, 1.2, 1.2);
    return;
  }

  // Intact State:
  // Concrete foundation pad (guarantees bench always rests on paved slab)
  ctx.fillStyle = '#64748b';
  ctx.fillRect(-13, -8, 26, 16);
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(-13, -8, 26, 16);

  // Expansion joint cut in concrete pad
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(0, 8);
  ctx.stroke();

  // Ambient ground shadow under bench
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fillRect(-10, -4, 20, 9);

  // Cast iron side frames & ornate armrests
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-10, -6, 3, 12);
  ctx.fillRect(7, -6, 3, 12);

  // Armrest curved scroll highlights
  ctx.fillStyle = '#334155';
  ctx.fillRect(-9.5, -5.5, 1, 10);
  ctx.fillRect(7.5, -5.5, 1, 10);

  // Central anti-sag support brace
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-1, -5.5, 2, 11);

  // Polished teak hardwood slats with distinct wood tones and grain
  const slatColors = ['#78350f', '#92400e', '#b45309', '#d97706'];
  const slatYs = [-5, -2, 1, 4];
  for (let s = 0; s < 4; s++) {
    const sy = slatYs[s];
    // Main wood slat
    ctx.fillStyle = slatColors[s];
    ctx.fillRect(-8, sy, 16, 2.2);

    // Subtle grain highlight line
    ctx.fillStyle = 'rgba(254, 243, 199, 0.2)';
    ctx.fillRect(-7, sy + 0.4, 14, 0.5);

    // Slat edge bevel shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.fillRect(-8, sy + 1.8, 16, 0.4);

    // Connecting carriage bolts (left, center, right)
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(-8.5, sy + 0.6, 1, 1);
    ctx.fillRect(-0.5, sy + 0.6, 1, 1);
    ctx.fillRect(7.5, sy + 0.6, 1, 1);
  }
}

// --- 2. DUMPSTER (МУСОРНЫЙ КОНТЕЙНЕР ТБО 1100L) ---
export function renderPropDumpster(ctx: CanvasRenderingContext2D, prop: StreetProp) {
  if (prop.isBroken) {
    // Crushed concrete pad
    ctx.fillStyle = '#334155';
    ctx.fillRect(-18, -13, 36, 26);

    // Overturned, dented green container body
    ctx.save();
    ctx.rotate(0.3);
    ctx.fillStyle = '#15803d';
    ctx.fillRect(-13, -9, 26, 18);
    ctx.strokeStyle = '#166534';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(-13, -9, 26, 18);

    // Dent crease lines
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-8, -4);
    ctx.lineTo(2, 6);
    ctx.moveTo(5, -6);
    ctx.lineTo(10, 2);
    ctx.stroke();

    // Detached plastic lid lying askew
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-10, 10, 20, 7);
    ctx.restore();

    // Spilled garbage bags and debris
    ctx.fillStyle = '#0f172a'; // Black garbage bag
    ctx.beginPath();
    ctx.arc(-8, 12, 4.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1e293b'; // Second trash bag
    ctx.beginPath();
    ctx.arc(6, 11, 4, 0, Math.PI * 2);
    ctx.fill();

    // Cardboard boxes
    ctx.fillStyle = '#92400e';
    ctx.fillRect(-14, 8, 5, 4);
    ctx.fillRect(10, 9, 6, 5);

    // Crushed beverage cans
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-2, 13, 2.5, 1.5);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(3, 14, 2, 1.5);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(1, 10, 1.8, 1.8);
    return;
  }

  // Intact State:
  // Concrete Waste Platform (Площадка ТБО)
  ctx.fillStyle = '#475569';
  ctx.fillRect(-18, -13, 36, 26);
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-18, -13, 36, 26);

  // Yellow safety boundary curb border
  ctx.strokeStyle = '#eab308';
  ctx.lineWidth = 1;
  ctx.strokeRect(-17, -12, 34, 24);

  // Container drop shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(-15, -11, 30, 22);

  // 4 Caster Wheels with rubber tires & brake locks
  const wheelCoords = [
    [-14, -10],
    [11, -10],
    [-14, 7],
    [11, 7],
  ];
  for (const [wx, wy] of wheelCoords) {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(wx, wy, 3, 3);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(wx + 0.8, wy + 0.8, 1.4, 1.4);
  }

  // Main Container Body (Galvanized / Municipal Emerald Green)
  ctx.fillStyle = '#15803d';
  ctx.fillRect(-13, -9, 26, 18);
  ctx.strokeStyle = '#166534';
  ctx.lineWidth = 1;
  ctx.strokeRect(-13, -9, 26, 18);

  // Vertical corrugated stiffening ribs (6 deep metal channels)
  for (let rib = -10; rib <= 10; rib += 4) {
    ctx.fillStyle = '#166534';
    ctx.fillRect(rib, -9, 1.2, 18);
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(rib + 1.2, -9, 0.6, 18);
  }

  // Side Lifting Trunnions (Studs for garbage truck hydraulic arms)
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-14.5, -3, 1.8, 6);
  ctx.fillRect(12.7, -3, 1.8, 6);
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(-14.8, -1, 1.2, 2);
  ctx.fillRect(13.6, -1, 1.2, 2);

  // Split Molded Plastic Lids (Top and Bottom hinged)
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-12, -8, 24, 7.5);
  ctx.fillRect(-12, 0.5, 24, 7.5);

  // Plastic lid structural ribs
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-10, -4.2); ctx.lineTo(10, -4.2);
  ctx.moveTo(-10, 4.2); ctx.lineTo(10, 4.2);
  ctx.stroke();

  // Molded Lid Ergonomic Handles
  ctx.fillStyle = '#64748b';
  ctx.fillRect(-4, -6.5, 8, 1.5);
  ctx.fillRect(-4, 2, 8, 1.5);

  // Yellow Warning Hazard Triangle Decal
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.moveTo(0, -2);
  ctx.lineTo(-2.5, 2);
  ctx.lineTo(2.5, 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#000000';
  ctx.fillRect(-0.4, -0.5, 0.8, 1.4);
  ctx.fillRect(-0.4, 1.2, 0.8, 0.6);
}

// --- 3. FLOWERBED (ГОРОДСКАЯ КЛУМБА) ---
export function renderPropFlowerbed(ctx: CanvasRenderingContext2D, prop: StreetProp) {
  if (prop.isBroken) {
    // Fractured curb stones
    ctx.fillStyle = '#64748b';
    ctx.fillRect(-12, -8, 24, 16);

    // Spilled fertile dark loam onto asphalt
    ctx.fillStyle = '#271c19';
    ctx.beginPath();
    ctx.ellipse(3, 2, 14, 10, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Crushed foliage and petals
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.arc(-4, 1, 4, 0, Math.PI * 2);
    ctx.arc(4, 3, 3, 0, Math.PI * 2);
    ctx.fill();

    // Scattered petals
    const petalColors = ['#ef4444', '#f59e0b', '#ec4899', '#ffffff'];
    for (let p = 0; p < 8; p++) {
      const px = -9 + Math.random() * 18;
      const py = -6 + Math.random() * 12;
      ctx.fillStyle = petalColors[p % petalColors.length];
      ctx.fillRect(px, py, 1.5, 1.5);
    }
    return;
  }

  // Intact State:
  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(-13, -9, 26, 18);

  // Dressed granite curb border with mitered 45-degree corner joints
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(-12, -8, 24, 16);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.strokeRect(-12, -8, 24, 16);

  // Corner miters & inner curb bevel
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-12, -8); ctx.lineTo(-10, -6);
  ctx.moveTo(12, -8); ctx.lineTo(10, -6);
  ctx.moveTo(-12, 8); ctx.lineTo(-10, 6);
  ctx.moveTo(12, 8); ctx.lineTo(10, 6);
  ctx.stroke();

  // Dark rich damp compost loam soil
  ctx.fillStyle = '#271c19';
  ctx.fillRect(-10, -6, 20, 12);

  // Soil texture flecks
  ctx.fillStyle = '#3e2723';
  ctx.fillRect(-8, -4, 2, 2);
  ctx.fillRect(4, 2, 2, 2);
  ctx.fillRect(-2, 3, 2, 2);

  // Multi-layered lush green foliage
  ctx.fillStyle = '#15803d'; // Deep emerald undergrowth
  ctx.beginPath();
  ctx.arc(-5, -2, 4.5, 0, Math.PI * 2);
  ctx.arc(5, -2, 4.5, 0, Math.PI * 2);
  ctx.arc(0, 2, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#22c55e'; // Bright vibrant canopy
  ctx.beginPath();
  ctx.arc(-2, -1, 3.5, 0, Math.PI * 2);
  ctx.arc(3, 1, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // Colorful perennial flower blossoms (Tulips, Marigolds, Petunias, Daisies)
  const blossomColors = ['#ef4444', '#f59e0b', '#ec4899', '#a855f7', '#ffffff', '#e11d48'];
  const blossomOffsets = [
    [-6, -3], [-2, -4], [3, -3], [6, -2],
    [-5, 2], [-1, 3], [4, 2], [1, -1]
  ];
  for (let i = 0; i < blossomOffsets.length; i++) {
    const [bx, by] = blossomOffsets[i];
    ctx.fillStyle = blossomColors[i % blossomColors.length];
    ctx.beginPath();
    ctx.arc(bx, by, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Central golden flower stamen dot
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(bx, by, 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

// --- 4. BOLLARD (СТОЛБИК ОГРАЖДЕНИЯ) ---
export function renderPropBollard(ctx: CanvasRenderingContext2D, prop: StreetProp) {
  if (prop.isBroken) {
    // Sheared base collar
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Fallen scratched post lying on asphalt
    ctx.save();
    ctx.rotate(0.65);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(1, 1, 14, 4);
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 0, 14, 4);
    ctx.fillStyle = '#f8fafc'; // White reflective ring
    ctx.fillRect(4, 0, 2.5, 4);
    ctx.fillStyle = '#eab308'; // Amber ring
    ctx.fillRect(8, 0, 2.5, 4);
    ctx.restore();
    return;
  }

  // Intact State:
  // Drop shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
  ctx.beginPath();
  ctx.arc(2, 2, 4, 0, Math.PI * 2);
  ctx.fill();

  // Heavy stepped base flange
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.arc(0, 0, 3.8, 0, Math.PI * 2);
  ctx.fill();

  // Cylindrical main post body (dark graphite cast iron)
  ctx.fillStyle = '#334155';
  ctx.beginPath();
  ctx.arc(0, 0, 2.8, 0, Math.PI * 2);
  ctx.fill();

  // 3M Retroreflective white safety band
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.arc(0, 0, 2.0, 0, Math.PI * 2);
  ctx.fill();

  // High-contrast amber secondary ring
  ctx.fillStyle = '#eab308';
  ctx.beginPath();
  ctx.arc(0, 0, 1.4, 0, Math.PI * 2);
  ctx.fill();

  // Spherical cast iron top finial cap
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(0, 0, 0.9, 0, Math.PI * 2);
  ctx.fill();
}

// --- 5. TRAFFIC CONE (ДОРОЖНЫЙ КОНУС) ---
export function renderPropCone(ctx: CanvasRenderingContext2D, prop: StreetProp) {
  if (prop.isBroken) {
    // Flattened squashed cone lying on its side
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.beginPath();
    ctx.ellipse(3, 2, 7, 3, 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.rotate(0.45);
    ctx.fillStyle = '#1e293b'; // Separated rubber base
    ctx.fillRect(-3, -2, 6, 2.5);
    ctx.fillStyle = '#ea580c'; // Squashed orange body
    ctx.beginPath();
    ctx.ellipse(4, 0, 6, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff'; // Scuffed white stripe
    ctx.fillRect(2, -1.8, 2.2, 3.6);
    ctx.restore();
    return;
  }

  // Intact State:
  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
  ctx.beginPath();
  ctx.arc(2, 2, 4.5, 0, Math.PI * 2);
  ctx.fill();

  // Heavy square black anti-tip rubber base with corner bevels
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-4, -4, 8, 8);
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 0.8;
  ctx.strokeRect(-4, -4, 8, 8);

  // Safety orange molded PVC cone body
  ctx.fillStyle = '#ea580c';
  ctx.beginPath();
  ctx.arc(0, 0, 3.2, 0, Math.PI * 2);
  ctx.fill();

  // Outer micro-prismatic white reflective band
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, 0, 2.3, 0, Math.PI * 2);
  ctx.fill();

  // Inner orange cone tier
  ctx.fillStyle = '#f97316';
  ctx.beginPath();
  ctx.arc(0, 0, 1.6, 0, Math.PI * 2);
  ctx.fill();

  // Second micro-prismatic white reflective ring
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, 0, 1.1, 0, Math.PI * 2);
  ctx.fill();

  // Top molded cable/grip hole
  ctx.fillStyle = '#9a3412';
  ctx.beginPath();
  ctx.arc(0, 0, 0.6, 0, Math.PI * 2);
  ctx.fill();
}

// --- 6. TRASH CAN (УЛИЧНАЯ УРНА) ---
export function renderPropTrashCan(ctx: CanvasRenderingContext2D, prop: StreetProp) {
  if (prop.isBroken) {
    // Toppled cylindrical steel can lying on asphalt
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(-2, -3, 16, 7);

    ctx.save();
    ctx.rotate(0.35);
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, -3, 12, 6);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, -3, 12, 6);
    ctx.restore();

    // Spilled litter & cigarette butts
    ctx.fillStyle = '#cbd5e1'; // Crumpled paper cups
    ctx.beginPath();
    ctx.arc(11, 4, 1.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ef4444'; // Crushed soda can
    ctx.fillRect(8, -5, 2.4, 1.4);

    ctx.fillStyle = '#3b82f6'; // Blue can
    ctx.fillRect(13, 1, 2, 1.4);

    ctx.fillStyle = '#fef08a'; // Cigarette butts
    ctx.fillRect(6, 6, 1.2, 0.6);
    ctx.fillRect(10, 7, 1.2, 0.6);
    return;
  }

  // Intact State:
  // Directional shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.arc(2, 3, 6, 0, Math.PI * 2);
  ctx.fill();

  // Ground base flange with anchor bolts
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.arc(0, 0, 5.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(-3.5, -0.6, 1.2, 1.2);
  ctx.fillRect(2.3, -0.6, 1.2, 1.2);
  ctx.fillRect(-0.6, 2.8, 1.2, 1.2);

  // Outer perforated/ribbed steel cylinder (graphite grey)
  ctx.fillStyle = '#334155';
  ctx.beginPath();
  ctx.arc(0, 0, 5.2, 0, Math.PI * 2);
  ctx.fill();

  // Brushed stainless steel rim ring
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Dark trash aperture opening
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(0, 0, 3.4, 0, Math.PI * 2);
  ctx.fill();

  // Built-in center stub-out ashtray grid
  ctx.fillStyle = '#64748b';
  ctx.beginPath();
  ctx.arc(0, 0, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(-1.4, 0); ctx.lineTo(1.4, 0);
  ctx.moveTo(0, -1.4); ctx.lineTo(0, 1.4);
  ctx.stroke();

  // Green mobius recycling chevron dot
  ctx.fillStyle = '#22c55e';
  ctx.beginPath();
  ctx.arc(0, 0, 0.6, 0, Math.PI * 2);
  ctx.fill();
}

// --- 7. FIRE HYDRANT (ПОЖАРНЫЙ ГИДРАНТ) ---
export function renderPropHydrant(ctx: CanvasRenderingContext2D, prop: StreetProp) {
  if (prop.isBroken) {
    // Sheared base flange with severed bolts
    ctx.fillStyle = '#7f1d1d';
    ctx.beginPath();
    ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
    ctx.fill();

    // High-pressure foaming water geyser plume (animated water jet)
    const now = performance.now() * 0.005;
    const pulse1 = Math.sin(now * 3) * 2;
    const pulse2 = Math.cos(now * 4) * 2;

    // Outer turbulent spray mist
    ctx.fillStyle = 'rgba(186, 230, 253, 0.45)';
    ctx.beginPath();
    ctx.arc(0, 0, 12 + pulse1, 0, Math.PI * 2);
    ctx.fill();

    // Pressurized water geyser core
    ctx.fillStyle = 'rgba(56, 189, 248, 0.75)';
    ctx.beginPath();
    ctx.arc(0, 0, 7 + pulse2, 0, Math.PI * 2);
    ctx.fill();

    // Frothing white foam surge
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 4 + pulse1 * 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Toppled sheared red hydrant barrel lying nearby
    ctx.fillStyle = '#991b1b';
    ctx.beginPath();
    ctx.ellipse(8, 7, 5, 3.5, 0.6, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  // Intact State:
  // Drop shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.arc(2, 3, 6, 0, Math.PI * 2);
  ctx.fill();

  // 8-bolt octagonal base flange
  ctx.fillStyle = '#991b1b';
  ctx.beginPath();
  ctx.arc(0, 0, 5.6, 0, Math.PI * 2);
  ctx.fill();

  // Zinc anchor bolts on flange
  ctx.fillStyle = '#cbd5e1';
  for (let b = 0; b < 8; b++) {
    const bAngle = (b * Math.PI) / 4;
    ctx.fillRect(Math.cos(bAngle) * 4.4 - 0.5, Math.sin(bAngle) * 4.4 - 0.5, 1, 1);
  }

  // Fire-engine red cylindrical barrel body
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.arc(0, 0, 4.4, 0, Math.PI * 2);
  ctx.fill();

  // Dual 2.5" side nozzle outlets with knurled brass caps & chains
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(-6.5, -1.5, 2.2, 3);
  ctx.fillRect(4.3, -1.5, 2.2, 3);
  ctx.fillStyle = '#78350f';
  ctx.fillRect(-7.2, -0.8, 1, 1.6);
  ctx.fillRect(6.2, -0.8, 1, 1.6);

  // Brass chain links to side caps
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(-5, 1.5); ctx.quadraticCurveTo(-3, 3, 0, 3); ctx.quadraticCurveTo(3, 3, 5, 1.5);
  ctx.stroke();

  // Large front 4.5" steamer port cap
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(-1.4, 4.2, 2.8, 1.8);

  // Domed red bonnet cap
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(0, 0, 3.2, 0, Math.PI * 2);
  ctx.fill();

  // Operating brass pentagon nut with silver washer
  ctx.fillStyle = '#fef08a';
  ctx.beginPath();
  ctx.arc(0, 0, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#78350f';
  ctx.beginPath();
  ctx.arc(0, 0, 0.7, 0, Math.PI * 2);
  ctx.fill();
}

// --- 8. MANHOLE COVER (КАНАЛИЗАЦИОННЫЙ ЛЮК) ---
export function renderPropManhole(ctx: CanvasRenderingContext2D, _prop: StreetProp) {
  // Road asphalt transition seam / sealing mastic ring
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 0, 6.8, 0, Math.PI * 2);
  ctx.stroke();

  // Heavy cast-iron outer frame ring
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.arc(0, 0, 6.2, 0, Math.PI * 2);
  ctx.fill();

  // Circular cast-iron cover plate
  ctx.fillStyle = '#334155';
  ctx.beginPath();
  ctx.arc(0, 0, 5.2, 0, Math.PI * 2);
  ctx.fill();

  // Concentric non-skid waffle traction rings & radial spokes
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.arc(0, 0, 3.4, 0, Math.PI * 2);
  ctx.arc(0, 0, 1.8, 0, Math.PI * 2);

  for (let r = 0; r < 8; r++) {
    const rAngle = (r * Math.PI) / 4;
    ctx.moveTo(Math.cos(rAngle) * 1.8, Math.sin(rAngle) * 1.8);
    ctx.lineTo(Math.cos(rAngle) * 5.0, Math.sin(rAngle) * 5.0);
  }
  ctx.stroke();

  // Dual pick-hole notches for pry bars
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-0.8, -4.6, 1.6, 0.9);
  ctx.fillRect(-0.8, 3.7, 1.6, 0.9);

  // Center utility monogram letter ("К" for канализация)
  ctx.fillStyle = '#cbd5e1';
  ctx.font = 'bold 3.2px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('К', 0, 0.2);
}

// --- 9. DRAIN GRATE (ЛИВНЕВАЯ РЕШЁТКА) ---
export function renderPropDrainGrate(ctx: CanvasRenderingContext2D, _prop: StreetProp) {
  // Curbside cast-iron gutter frame
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-7, -5, 14, 10);
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 0.8;
  ctx.strokeRect(-7, -5, 14, 10);

  // Deep dark catch basin void underneath
  ctx.fillStyle = '#020617';
  ctx.fillRect(-6, -4, 12, 8);

  // Parallel slotted cast-iron bars with intake teeth
  ctx.fillStyle = '#475569';
  for (let b = -5.0; b <= 5.0; b += 1.8) {
    ctx.fillRect(b, -4, 0.9, 8);
  }

  // Central longitudinal reinforcement cross-rib
  ctx.fillStyle = '#334155';
  ctx.fillRect(-6, -0.6, 12, 1.2);
}

// --- 10. TIRE FLOWERBED (КЛУМБА ИЗ ПОКРЫШКИ) ---
export function renderPropTireFlowerbed(ctx: CanvasRenderingContext2D, prop: StreetProp) {
  if (prop.isBroken) {
    // Smashed tire flattened on asphalt
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(2, 2, 9, 6, 0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.ellipse(0, 0, 8, 5, 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Spilled soil and crushed petunias
    ctx.fillStyle = '#271c19';
    ctx.beginPath();
    ctx.arc(3, 1, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-2, -1, 2, 2);
    ctx.fillRect(4, 2, 2, 2);
    return;
  }

  // Intact State:
  // Drop shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.arc(2, 2, 9, 0, Math.PI * 2);
  ctx.fill();

  // Heavy car tire outer sidewall & radial tread lugs
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.arc(0, 0, 8.2, 0, Math.PI * 2);
  ctx.fill();

  // Municipal turquoise or sunny yellow enamel paint coat
  ctx.fillStyle = '#06b6d4';
  ctx.beginPath();
  ctx.arc(0, 0, 7.6, 0, Math.PI * 2);
  ctx.fill();

  // Hand-cut triangular sawtooth petals carved along the top rim
  ctx.fillStyle = '#0891b2';
  for (let t = 0; t < 12; t++) {
    const tAngle = (t * Math.PI) / 6;
    const tx = Math.cos(tAngle) * 6.2;
    const ty = Math.sin(tAngle) * 6.2;
    ctx.fillRect(tx - 0.7, ty - 0.7, 1.4, 1.4);
  }

  // Dark moist potting soil interior
  ctx.fillStyle = '#271c19';
  ctx.beginPath();
  ctx.arc(0, 0, 5.0, 0, Math.PI * 2);
  ctx.fill();

  // Lush clustered petunias and marigolds
  ctx.fillStyle = '#16a34a';
  ctx.beginPath();
  ctx.arc(0, 0, 3.4, 0, Math.PI * 2);
  ctx.fill();

  const petColors = ['#ef4444', '#f59e0b', '#ec4899', '#ffffff'];
  const petOffsets = [[-2, -2], [2, -2], [-1, 2], [2, 1.5]];
  for (let f = 0; f < 4; f++) {
    const [fx, fy] = petOffsets[f];
    ctx.fillStyle = petColors[f];
    ctx.beginPath();
    ctx.arc(fx, fy, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(fx, fy, 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

// --- 11. PLAYGROUND SWING (ДЕТСКИЕ КАЧЕЛИ) ---
export function renderPropPlaygroundSwing(ctx: CanvasRenderingContext2D, prop: StreetProp) {
  if (prop.isBroken) {
    // Collapsed tubular steel A-frame
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(-12, -4, 24, 8);

    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-11, -5); ctx.lineTo(-2, 8);
    ctx.moveTo(11, -5); ctx.lineTo(6, 7);
    ctx.stroke();

    // Twisted yellow crossbeam with loose dangling chain
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(-12, -4); ctx.lineTo(11, 2);
    ctx.stroke();

    // Snapped swing seat on ground
    ctx.fillStyle = '#15803d';
    ctx.fillRect(-4, 3, 5, 2.5);
    return;
  }

  // Intact State:
  // Drop shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fillRect(-12, -4, 24, 8);

  // Concrete footing pads under A-frame legs
  ctx.fillStyle = '#64748b';
  ctx.fillRect(-12, -7, 3, 3);
  ctx.fillRect(-5, 9, 3, 3);
  ctx.fillRect(9, -7, 3, 3);
  ctx.fillRect(3, 9, 3, 3);

  // Dual tubular steel A-frame end trusses in safety red
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  // Left A-frame
  ctx.moveTo(-11, -6); ctx.lineTo(-4, 10);
  ctx.moveTo(-11, -6); ctx.lineTo(-11, 4);
  // Right A-frame
  ctx.moveTo(10, -6); ctx.lineTo(4, 10);
  ctx.moveTo(10, -6); ctx.lineTo(10, 4);
  ctx.stroke();

  // Horizontal stabilizer crossbars on A-frames
  ctx.strokeStyle = '#b91c1c';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-11, 0); ctx.lineTo(-6, 2);
  ctx.moveTo(10, 0); ctx.lineTo(6, 2);
  ctx.stroke();

  // Heavy top yellow support beam
  ctx.strokeStyle = '#eab308';
  ctx.lineWidth = 3.0;
  ctx.beginPath();
  ctx.moveTo(-12, -4); ctx.lineTo(12, -4);
  ctx.stroke();

  // 4 swing suspension chains & 2 green rubber seats
  const seatXs = [-4, 4];
  for (const sx of seatXs) {
    // Dual suspension chains
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(sx - 1.8, -4); ctx.lineTo(sx - 1.8, 3);
    ctx.moveTo(sx + 1.8, -4); ctx.lineTo(sx + 1.8, 3);
    ctx.stroke();

    // Molded green swing seat
    ctx.fillStyle = '#15803d';
    ctx.fillRect(sx - 2.5, 3, 5, 2.2);
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(sx - 2.5, 3, 5, 0.6);
  }
}

// --- 12. GARAGE COOPERATIVE DOOR (ГАРАЖНЫЕ ВОРОТА) ---
export function renderPropGarageDoor(ctx: CanvasRenderingContext2D, _prop: StreetProp) {
  // Heavy structural steel box frame embedded in garage masonry
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(-12, -8, 24, 16);

  ctx.fillStyle = '#334155';
  ctx.fillRect(-12, -7, 24, 14);

  // Industrial slate grey sheet metal doors
  ctx.fillStyle = '#475569';
  ctx.fillRect(-11, -6, 22, 12);
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;
  ctx.strokeRect(-11, -6, 22, 12);

  // Center door seam (twin swing doors)
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, -6);
  ctx.lineTo(0, 6);
  ctx.stroke();

  // Diagonal anti-sag Z-stiffener bracing ribs on both doors
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  // Left door Z-brace
  ctx.moveTo(-10, -5); ctx.lineTo(-1, 5);
  // Right door Z-brace
  ctx.moveTo(1, -5); ctx.lineTo(10, 5);
  ctx.stroke();

  // Welded barrel hinges (upper & lower on outer edges)
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-11.5, -4.5, 1.5, 2.5);
  ctx.fillRect(-11.5, 2.0, 1.5, 2.5);
  ctx.fillRect(10.0, -4.5, 1.5, 2.5);
  ctx.fillRect(10.0, 2.0, 1.5, 2.5);

  // Central locking slide bolt latch & heavy brass padlock
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-2.5, -1, 5, 2);
  ctx.fillStyle = '#eab308'; // Brass padlock
  ctx.fillRect(-1, 0, 2, 2.2);

  // Upper louvered ventilation slots
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-8, -4.5, 5, 0.8);
  ctx.fillRect(3, -4.5, 5, 0.8);
}

// --- 13. BUS STOP (АВТОБУСНАЯ ОСТАНОВКА) ---
export function renderPropBusStop(ctx: CanvasRenderingContext2D, prop: StreetProp) {
  if (prop.isBroken) {
    // Fractured concrete platform slab
    ctx.fillStyle = '#475569';
    ctx.fillRect(-22, -14, 44, 28);

    // Shattered tempered safety glass field (granular glass pebble matrix)
    ctx.fillStyle = '#e0f2fe';
    for (let g = 0; g < 24; g++) {
      const gx = -16 + (g % 8) * 4 + (Math.random() - 0.5) * 2;
      const gy = -8 + Math.floor(g / 8) * 5 + (Math.random() - 0.5) * 2;
      ctx.fillRect(gx, gy, 1.5, 1.5);
    }

    // Buckled steel columns bent sideways
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-16, 2); ctx.lineTo(-10, 8);
    ctx.moveTo(13, 2); ctx.lineTo(18, 6);
    ctx.stroke();

    // Sagging, twisted canopy roof
    ctx.save();
    ctx.rotate(-0.15);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-18, -12, 34, 14);
    ctx.restore();

    // Tilted bus route sign pole
    ctx.save();
    ctx.translate(20, -4);
    ctx.rotate(0.35);
    ctx.fillStyle = '#1d4ed8';
    ctx.fillRect(-4, -4, 8, 8);
    ctx.restore();
    return;
  }

  // Intact State:
  // Concrete platform slab with yellow tactile braille blister warning pavers along curb
  ctx.fillStyle = '#64748b';
  ctx.fillRect(-22, -14, 44, 28);
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(-22, -14, 44, 28);

  // Yellow tactile warning tiles along front boarding edge
  ctx.fillStyle = '#eab308';
  ctx.fillRect(-21, 10, 42, 2.5);
  ctx.fillStyle = '#ca8a04';
  for (let d = -19; d <= 19; d += 3) {
    ctx.fillRect(d, 10.5, 1.5, 1.5);
  }

  // Shelter ground shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(-18, -10, 36, 24);

  // 3-Sided tempered safety glass walls with silk-screened safety dots & reflection
  ctx.fillStyle = 'rgba(186, 230, 253, 0.45)';
  ctx.fillRect(-16, -10, 32, 6); // Back glass wall
  ctx.fillRect(-16, -10, 3, 14); // Left side glass wall
  ctx.fillRect(13, -10, 3, 14);  // Right side glass wall

  // Diagonal reflection gloss streak across glass
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-14, -10); ctx.lineTo(-6, -4);
  ctx.moveTo(2, -10); ctx.lineTo(10, -4);
  ctx.stroke();

  // Dark anthracite tubular steel frame pillars
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-17, -10, 3, 16);
  ctx.fillRect(14, -10, 3, 16);
  ctx.fillRect(-17, 4, 3, 3);
  ctx.fillRect(14, 4, 3, 3);

  // Varnished wooden passenger waiting bench inside shelter
  ctx.fillStyle = '#78350f';
  ctx.fillRect(-11, -3, 22, 3.2);
  ctx.fillStyle = '#92400e';
  ctx.fillRect(-11, -3, 22, 1.0);
  ctx.fillStyle = '#1e293b'; // Cast iron bench supports
  ctx.fillRect(-8, -0.5, 2, 2);
  ctx.fillRect(6, -0.5, 2, 2);

  // Illuminated advertising / transit route poster lightbox
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(10, -9, 3.5, 8);
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 0.6;
  ctx.strokeRect(10, -9, 3.5, 8);
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(10.5, -8, 2.5, 1.2);
  ctx.fillRect(10.5, -5, 2.5, 3.0);

  // Cantilevered curved metal canopy roof with aluminum drip fascia
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-18, -12, 36, 16);
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(-18, -12, 36, 16);

  // Aluminum drip edge highlight
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-18, 4); ctx.lineTo(18, 4);
  ctx.stroke();

  // Integrated Bus Stop Totem Signpost next to shelter
  ctx.fillStyle = '#334155';
  ctx.fillRect(20, -8, 2, 18);
  // Blue transit emblem plate
  ctx.fillStyle = '#1d4ed8';
  ctx.fillRect(17, -14, 8, 8);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 0.8;
  ctx.strokeRect(17, -14, 8, 8);
  // Bus silhouette icon
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 5.5px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🛈', 21, -10);
}

// --- 14. KIOSK (ТОРГОВЫЙ КИОСК / «ПРЕССА») ---
export function renderPropKiosk(ctx: CanvasRenderingContext2D, prop: StreetProp) {
  if (prop.isBroken) {
    // Fractured foundation
    ctx.fillStyle = '#475569';
    ctx.fillRect(-16, -16, 32, 32);

    // Crumpled composite panel facade
    ctx.save();
    ctx.rotate(0.2);
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(-12, -12, 24, 24);
    ctx.strokeStyle = '#1e40af';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(-12, -12, 24, 24);

    // Shattered vitrine glass & loose newspapers
    ctx.fillStyle = '#93c5fd';
    ctx.fillRect(-7, -3, 14, 6);
    ctx.restore();

    // Scattered newspapers & drink cans
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-14, 10, 6, 4);
    ctx.fillRect(8, 12, 5, 4);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-2, 13, 2, 1.5);
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(4, 14, 2, 1.5);
    return;
  }

  // Intact State:
  // Concrete Paved Apron
  ctx.fillStyle = '#64748b';
  ctx.fillRect(-16, -16, 32, 32);
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(-16, -16, 32, 32);

  // Directional shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(-13, -13, 26, 26);

  // Modern composite architectural panel facade (deep municipal blue)
  ctx.fillStyle = '#1e3a8a';
  ctx.fillRect(-12, -12, 24, 24);
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 1;
  ctx.strokeRect(-12, -12, 24, 24);

  // Glazed display vitrine with illuminated magazine & drink shelves
  ctx.fillStyle = '#93c5fd';
  ctx.fillRect(-8, -5, 16, 8);
  ctx.strokeStyle = '#60a5fa';
  ctx.lineWidth = 0.6;
  ctx.strokeRect(-8, -5, 16, 8);

  // Colorful magazine racks inside vitrine
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(-7, -4, 3, 2.5);
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(-3, -4, 3, 2.5);
  ctx.fillStyle = '#10b981';
  ctx.fillRect(1, -4, 3, 2.5);
  ctx.fillStyle = '#ec4899';
  ctx.fillRect(5, -4, 2, 2.5);

  // Bottled drinks row
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(-7, -0.5, 2, 2);
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(-4, -0.5, 2, 2);
  ctx.fillStyle = '#eab308';
  ctx.fillRect(-1, -0.5, 2, 2);

  // Stainless steel service counter shelf
  ctx.fillStyle = '#334155';
  ctx.fillRect(-10, 3, 20, 2.2);
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(-10, 3, 20, 0.6);

  // Overhead security roller shutter cassette
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-9, -6.5, 18, 1.5);

  // Illuminated marquee fascia lightbox («ПРЕССА» / «КИОСК»)
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-14, -14, 28, 4);
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 3px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ПРЕССА', 0, -12);
}

// --- 15. MAILBOX (ПОЧТОВЫЙ ЯЩИК) ---
export function renderPropMailbox(ctx: CanvasRenderingContext2D, prop: StreetProp) {
  if (prop.isBroken) {
    // Dented mailbox knocked off its pedestal
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(-6, -5, 12, 10);

    ctx.save();
    ctx.rotate(0.4);
    ctx.fillStyle = '#1d4ed8';
    ctx.fillRect(-5, -5, 10, 10);
    ctx.strokeStyle = '#1e40af';
    ctx.lineWidth = 1;
    ctx.strokeRect(-5, -5, 10, 10);
    ctx.restore();

    // Spilled mail envelopes on pavement
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-7, 6, 4, 2.5);
    ctx.fillRect(3, 7, 4.5, 2.5);
    ctx.fillStyle = '#fef3c7'; // Manila envelope
    ctx.fillRect(-2, 8, 4, 3);
    return;
  }

  // Intact State:
  // Drop shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fillRect(-6, -5, 12, 10);

  // Bolted base flange pedestal
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-3, -1, 6, 2);

  // Royal blue steel mailbox casing
  ctx.fillStyle = '#1d4ed8';
  ctx.fillRect(-5, -5, 10, 10);
  ctx.strokeStyle = '#1e40af';
  ctx.lineWidth = 0.8;
  ctx.strokeRect(-5, -5, 10, 10);

  // Rounded anti-snow canopy hood
  ctx.fillStyle = '#2563eb';
  ctx.beginPath();
  ctx.arc(0, -5, 5, Math.PI, 0);
  ctx.fill();

  // Stainless steel mail drop hopper door with grab handle
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(-3.5, -3, 7, 1.8);
  ctx.fillStyle = '#334155';
  ctx.fillRect(-2, -2.2, 4, 0.6);

  // White postal post horn emblem
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, 0.5, 1.2, 0, Math.PI * 2);
  ctx.fill();

  // Collection schedule card window
  ctx.fillStyle = '#93c5fd';
  ctx.fillRect(-2.5, 2.2, 5, 2);

  // Key cylinder lock
  ctx.fillStyle = '#cbd5e1';
  ctx.beginPath();
  ctx.arc(0, 3.2, 0.5, 0, Math.PI * 2);
  ctx.fill();
}

// --- 16. BROKEN LAMP / HIGHWAY LAMP / CONCRETE LAMP (НА ЗЕМЛЕ) ---
export function renderPropBrokenLamp(ctx: CanvasRenderingContext2D, prop: StreetProp) {
  if (prop.type === 'lamp_highway') {
    // Sheared base stump with severed anchor bolts
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#64748b';
    ctx.fillRect(-1.5, -1.5, 3, 3);

    // Galvanized anchor studs
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(-2.5, -2.5, 1.2, 1.2);
    ctx.fillRect(1.3, -2.5, 1.2, 1.2);
    ctx.fillRect(-2.5, 1.3, 1.2, 1.2);
    ctx.fillRect(1.3, 1.3, 1.2, 1.2);

    // Buckled galvanized steel pole lying on asphalt ("легко мнется")
    ctx.save();
    ctx.rotate(prop.breakAngle || prop.angle || 0.6);

    // Ground shadow of buckled pole
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.beginPath();
    ctx.moveTo(3, 2);
    ctx.lineTo(14, 5);
    ctx.lineTo(24, 11);
    ctx.lineTo(36, 13);
    ctx.lineTo(34, 16);
    ctx.lineTo(22, 14);
    ctx.lineTo(12, 7);
    ctx.closePath();
    ctx.fill();

    // Kinked crumpled zinc pole (multi-segment severe buckle)
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(2, 0);
    ctx.lineTo(13, 3);
    ctx.lineTo(22, -4);
    ctx.lineTo(34, 2);
    ctx.stroke();

    // Specular highlight strip along crumpled metal
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(2, -0.6);
    ctx.lineTo(13, 2.2);
    ctx.lineTo(22, -4.6);
    ctx.lineTo(34, 1.4);
    ctx.stroke();

    // Crease shadows
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(12, -1); ctx.lineTo(14, 4);
    ctx.moveTo(21, -6); ctx.lineTo(23, -2);
    ctx.stroke();

    // Smashed cobra-head luminaire fixture at the crumpled tip
    ctx.save();
    ctx.translate(34, 2);
    ctx.rotate(0.35);
    ctx.fillStyle = '#334155';
    ctx.fillRect(-2, -3, 8, 6);
    // Cracked lens and exposed yellow LED diodes
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(1, -2, 4, 4);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(1, -1); ctx.lineTo(4, 2);
    ctx.moveTo(2, 2); ctx.lineTo(5, -1);
    ctx.stroke();
    // Severed copper electrical wire
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(6, 0);
    ctx.quadraticCurveTo(8, -3, 10, -1);
    ctx.stroke();
    ctx.restore();

    ctx.restore();

  } else if (prop.type === 'lamp_concrete') {
    // Chipped concrete base with exposed rebar
    ctx.fillStyle = '#57534e';
    ctx.fillRect(-4.5, -4.5, 9, 9);
    ctx.strokeStyle = '#292524';
    ctx.lineWidth = 1;
    ctx.strokeRect(-4.5, -4.5, 9, 9);

    // Exposed rusted rebar steel
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-2, -4.5); ctx.lineTo(-2, -1);
    ctx.moveTo(2, -4.5); ctx.lineTo(2, 0);
    ctx.stroke();

    // Concrete debris crumbs
    ctx.fillStyle = '#a8a29e';
    ctx.fillRect(-5, 5, 2, 2);
    ctx.fillRect(4, 4, 2, 2);

  } else {
    // Standard Park Lamp (Парковый фонарь) broken on ground
    // Sheared base with severed bolts
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#475569';
    ctx.fillRect(-1.5, -1.5, 3, 3);

    ctx.save();
    ctx.rotate(prop.breakAngle || prop.angle || 0.8);

    // Drop shadow of fallen iron post
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(2, 1, 24, 4);

    // Tapered cast-iron column
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(1, 0, 22, 3);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(1, 0, 22, 3);

    // Smashed glass lantern head with crystal shards
    ctx.save();
    ctx.translate(22, 1);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, -2.5, 5, 5);

    // Glowing broken filament & glass shards
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(2, -1.5, 2.5, 3);
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(1, -2); ctx.lineTo(4, 2);
    ctx.moveTo(1, 2); ctx.lineTo(4, -2);
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }
}

// --- MASTER PROP DISPATCHER (GROUND LEVEL) ---
export function renderStreetProp(ctx: CanvasRenderingContext2D, prop: StreetProp) {
  switch (prop.type) {
    case 'bench':
      renderPropBench(ctx, prop);
      break;
    case 'dumpster':
      renderPropDumpster(ctx, prop);
      break;
    case 'flowerbed':
      renderPropFlowerbed(ctx, prop);
      break;
    case 'bollard':
      renderPropBollard(ctx, prop);
      break;
    case 'manhole':
      renderPropManhole(ctx, prop);
      break;
    case 'drain_grate':
      renderPropDrainGrate(ctx, prop);
      break;
    case 'hydrant':
      renderPropHydrant(ctx, prop);
      break;
    case 'tire_flowerbed':
      renderPropTireFlowerbed(ctx, prop);
      break;
    case 'playground_swing':
      renderPropPlaygroundSwing(ctx, prop);
      break;
    case 'garage_door':
      renderPropGarageDoor(ctx, prop);
      break;
    case 'cone':
      renderPropCone(ctx, prop);
      break;
    case 'trash_can':
      renderPropTrashCan(ctx, prop);
      break;
    case 'bus_stop':
      renderPropBusStop(ctx, prop);
      break;
    case 'kiosk':
      renderPropKiosk(ctx, prop);
      break;
    case 'mailbox':
      renderPropMailbox(ctx, prop);
      break;
    case 'lamp':
    case 'lamp_highway':
    case 'lamp_concrete':
      if (prop.isBroken) {
        renderPropBrokenLamp(ctx, prop);
      }
      break;
  }
}

// --- TALL PROPS (INTACT LAMPS) ---
export function renderTallStreetProp(ctx: CanvasRenderingContext2D, prop: StreetProp) {
  if (prop.type === 'lamp_highway') {
    // 1. АВТОМОБИЛЬНЫЙ ФОНАРЬ (С ВЫНОСОМ ЛАМПЫ НАД ПРОЕЗЖЕЙ ЧАСТЬЮ)
    const angle = prop.angle || 0;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const reach = 22; // Extended cantilever arm reach out over roadway lane
    const armTipX = cosA * reach;
    const armTipY = sinA * reach;

    // Ground shadow of tall pole and cantilever arm
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(3, 4, 5, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(3, 4);
    ctx.lineTo(armTipX + 3, armTipY + 4);
    ctx.stroke();

    // Heavy steel base plate with 4 galvanized anchor bolts
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(0, 0, 4.6, 0, Math.PI * 2);
    ctx.fill();

    // 4 zinc anchor bolt heads
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(-2.5, -2.5, 1.2, 1.2);
    ctx.fillRect(1.3, -2.5, 1.2, 1.2);
    ctx.fillRect(-2.5, 1.3, 1.2, 1.2);
    ctx.fillRect(1.3, 1.3, 1.2, 1.2);

    // Flange collar ring
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(0, 0, 3.2, 0, Math.PI * 2);
    ctx.fill();

    // Vertical mast stem
    ctx.fillStyle = '#64748b';
    ctx.beginPath();
    ctx.arc(0, 0, 2.4, 0, Math.PI * 2);
    ctx.fill();

    // Cantilever arched mast arm ("вынос консоли над дорогой")
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(armTipX, armTipY);
    ctx.stroke();

    // Galvanized zinc top highlight
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-sinA * 0.6, cosA * 0.6);
    ctx.lineTo(armTipX - sinA * 0.6, armTipY + cosA * 0.6);
    ctx.stroke();

    // Strengthening gusset / triangular bracket at base of cantilever arm
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(cosA * 5, sinA * 5);
    ctx.lineTo(cosA * 2 - sinA * 2, sinA * 2 + cosA * 2);
    ctx.closePath();
    ctx.fill();

    // Modern aerodynamic LED cobra-head luminaire fixture at arm tip
    ctx.save();
    ctx.translate(armTipX, armTipY);
    ctx.rotate(angle);

    // Luminaire housing casing
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(-2, -3, 9, 6, [2, 3, 3, 2]);
    } else {
      ctx.rect(-2, -3, 9, 6);
    }
    ctx.fill();

    // Casing heat sink cooling fins
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(1, -2.5); ctx.lineTo(1, 2.5);
    ctx.moveTo(3.5, -2.5); ctx.lineTo(3.5, 2.5);
    ctx.stroke();

    // Photocell dusk-to-dawn sensor
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-1, -1, 1.2, 1.2);

    // Downward-facing LED luminescent emitter lens
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.ellipse(3, 0, 3, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(3, 0, 1.8, 1.0, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

  } else if (prop.type === 'lamp_concrete') {
    // 2. СТАРЫЙ БЕТОННЫЙ ФОНАРЬ (НЕСБИВАЕМЫЙ, ДЛЯ СТАРЫХ РАЙОНОВ)
    const angle = prop.angle || 0;
    const perpAngle = angle + Math.PI / 2;
    const tx = Math.cos(perpAngle);
    const ty = Math.sin(perpAngle);

    // Heavy ground shadow for rectangular concrete foundation
    ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
    ctx.fillRect(-1, 2, 9, 9);

    // Stepped reinforced concrete foundation footing pad
    ctx.fillStyle = '#57534e';
    ctx.fillRect(-4.5, -4.5, 9, 9);
    ctx.strokeStyle = '#44403c';
    ctx.lineWidth = 1;
    ctx.strokeRect(-4.5, -4.5, 9, 9);

    // Solid textured concrete pole body (classic Soviet СВ-95/110 profile)
    ctx.fillStyle = '#78716c';
    ctx.fillRect(-3.2, -3.2, 6.4, 6.4);

    // Weathered lighter concrete face
    ctx.fillStyle = '#a8a29e';
    ctx.fillRect(-2.7, -2.7, 5.4, 2.7);

    // Surface pitting & concrete aggregate flecks
    ctx.fillStyle = '#44403c';
    ctx.fillRect(-1.5, -1, 1.2, 1.2);
    ctx.fillRect(1, 1, 1.1, 1.1);

    // Dark iron mounting band clamp (хомут)
    ctx.fillStyle = '#292524';
    ctx.fillRect(-3.8, -0.9, 7.6, 1.8);

    // Steel traverse cross-arm (траверса) perpendicular to road/path
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'square';
    ctx.beginPath();
    ctx.moveTo(-tx * 7, -ty * 7);
    ctx.lineTo(tx * 7, ty * 7);
    ctx.stroke();

    // 2 Ceramic white insulators (фарфоровые изоляторы ЛЭП)
    for (const sign of [-1, 1]) {
      const ix = sign * tx * 6;
      const iy = sign * ty * 6;
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(ix, iy, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 0.6;
      ctx.stroke();
      // Power wire hook dot
      ctx.fillStyle = '#475569';
      ctx.fillRect(ix - 0.5, iy - 0.5, 1, 1);
    }

    // Curved steel pipe bracket reaching out ~9px towards street
    const bx = Math.cos(angle) * 9;
    const by = Math.sin(angle) * 9;
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(bx, by);
    ctx.stroke();

    // Classic vintage bell/conical enamel luminaire (СПО-200 / РКУ «колокольчик»)
    ctx.save();
    ctx.translate(bx, by);
    ctx.fillStyle = '#374151';
    ctx.beginPath();
    ctx.arc(0, 0, 3.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Glowing incandescent / sodium lamp bulb (warm golden-amber light)
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(0, 0, 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(0, 0, 1.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

  } else {
    // 3. СТАНДАРТНЫЙ ВЕЛИКОЛЕПНЫЙ ПАРКОВЫЙ ФОНАРЬ (VICTORIAN ORNATE LANTERN)
    // Soft radial ground shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.arc(3, 3, 5.5, 0, Math.PI * 2);
    ctx.fill();

    // Fluted stepped octagonal cast iron base with 8 relief facets
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(0, 0, 4.8, 0, Math.PI * 2);
    ctx.fill();

    // 4 perimeter anchor bolt nuts
    ctx.fillStyle = '#64748b';
    ctx.fillRect(-2.4, -2.4, 1.1, 1.1);
    ctx.fillRect(1.3, -2.4, 1.1, 1.1);
    ctx.fillRect(-2.4, 1.3, 1.1, 1.1);
    ctx.fillRect(1.3, 1.3, 1.1, 1.1);

    // Decorative fluted cylindrical collar
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(0, 0, 3.4, 0, Math.PI * 2);
    ctx.fill();

    // Symmetrical cast-iron curved filigree scrollwork brackets
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.arc(0, 0, 4.0, 0, Math.PI * 2);
    ctx.stroke();

    // Faceted glass lantern carriage with bronze ribs
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Warm luminous core with golden filament bloom
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(0, 0, 2.0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(0, 0, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Bright incandescent white filament spark
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
}
