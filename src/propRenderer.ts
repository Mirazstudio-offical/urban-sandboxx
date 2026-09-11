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
    case 'village_well':
      renderPropVillageWell(ctx, prop);
      break;
    case 'village_sign':
      renderPropVillageSign(ctx, prop);
      break;
    case 'haystack':
      renderPropHaystack(ctx, prop);
      break;
    case 'woodpile':
      renderPropWoodpile(ctx, prop);
      break;
    case 'rustic_car_wreck':
      renderPropRusticCarWreck(ctx, prop);
      break;
    case 'concrete_barrier':
      renderPropConcreteBarrier(ctx, prop);
      break;
    case 'power_pole':
      renderPropPowerPoleBase(ctx, prop);
      break;
    case 'shipping_container':
      renderPropShippingContainer(ctx, prop);
      break;
    case 'pallet_stack':
      renderPropPalletStack(ctx, prop);
      break;
    case 'industrial_tank':
      renderPropIndustrialTank(ctx, prop);
      break;
    case 'silo_tank':
      renderPropSiloTank(ctx, prop);
      break;
    case 'cable_spool':
      renderPropCableSpool(ctx, prop);
      break;
    case 'concrete_fence_po2':
      renderPropConcreteFencePO2(ctx, prop);
      break;
    case 'security_barrier':
      renderPropSecurityBarrier(ctx, prop);
      break;
    case 'industrial_floodlight':
      renderPropIndustrialFloodlight(ctx, prop);
      break;
    case 'industrial_tires':
      renderPropIndustrialTires(ctx, prop);
      break;
    case 'scrap_pile':
      renderPropScrapPile(ctx, prop);
      break;
    case 'industrial_sign':
      renderPropIndustrialSign(ctx, prop);
      break;
    case 'industrial_pipe':
      renderPropIndustrialPipe(ctx, prop);
      break;
    case 'industrial_gate':
      renderPropIndustrialGate(ctx, prop);
      break;
    case 'fence_wood_vertical':
      renderPropFenceWoodVertical(ctx, prop);
      break;
    case 'fence_metal_vertical':
      renderPropFenceMetalVertical(ctx, prop);
      break;
    case 'wicket_gate':
      renderPropWicketGate(ctx, prop);
      break;
    case 'cottage_gate':
      renderPropCottageGate(ctx, prop);
      break;
    case 'garden_path_tile':
      renderPropGardenPathTile(ctx, prop);
      break;
  }
}

// --- INDUSTRIAL & FREIGHT HUB PROPS ---

export function renderPropShippingContainer(ctx: CanvasRenderingContext2D, prop: StreetProp) {
  // Deterministic color & style based on id
  let hash = 0;
  for (let i = 0; i < prop.id.length; i++) {
    hash = (hash * 31 + prop.id.charCodeAt(i)) >>> 0;
  }

  const is40Ft = (hash % 3) === 0;
  const length = is40Ft ? 92 : 56;
  const width = 24;
  const hl = length / 2;
  const hw = width / 2;

  // Authentic Logistics Liveries
  const palettes = [
    { base: '#0284c7', rib: '#075985', light: '#38bdf8', text: '#ffffff', code: 'MAERSK', hasStar: true },
    { base: '#c2410c', rib: '#7c2d12', light: '#fb923c', text: '#fef08a', code: 'MSC', hasStar: false },
    { base: '#1e3a8a', rib: '#172554', light: '#60a5fa', text: '#ffffff', code: 'CMA CGM', hasStar: false },
    { base: '#15803d', rib: '#052e16', light: '#4ade80', text: '#ffffff', code: 'EVERGREEN', hasStar: false },
    { base: '#ea580c', rib: '#9a3412', light: '#fdba74', text: '#ffffff', code: 'HAPAG', hasStar: false },
    { base: '#334155', rib: '#1e293b', light: '#64748b', text: '#ef4444', code: 'РЖД', hasStar: false },
  ];
  const style = palettes[hash % palettes.length];

  if (prop.isBroken) {
    // Damaged / Crushed container
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(-hl + 4, -hw + 5, length + 4, width + 5);

    // Dented / buckled body
    ctx.fillStyle = style.base;
    ctx.beginPath();
    ctx.moveTo(-hl, -hw);
    ctx.lineTo(hl - 4, -hw - 2);
    ctx.lineTo(hl + 3, hw - 1);
    ctx.lineTo(-hl + 6, hw + 3);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = style.rib;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Crumpled corrugation ridges
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(-hl + 15, -hw);
    ctx.lineTo(-hl + 18, 0);
    ctx.lineTo(-hl + 12, hw);
    ctx.stroke();

    // Jagged metal tear with exposed rust
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.moveTo(5, -hw);
    ctx.lineTo(12, -hw + 7);
    ctx.lineTo(8, -hw + 14);
    ctx.lineTo(1, -hw + 9);
    ctx.closePath();
    ctx.fill();

    // Loose door hanging off hinges
    ctx.save();
    ctx.translate(hl - 2, 4);
    ctx.rotate(0.45);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, -6, 4, 14);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, -6, 4, 14);
    ctx.restore();
    return;
  }

  // 1. Soft Ambient Ground Drop Shadow with diffuse penumbra
  ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
  ctx.beginPath();
  ctx.roundRect(-hl + 3, -hw + 4, length + 4, width + 4, 4);
  ctx.fill();

  // 2. Heavy Steel Bottom Frame & Corrugated Outer Shell
  ctx.fillStyle = style.base;
  ctx.fillRect(-hl, -hw, length, width);
  ctx.strokeStyle = style.rib;
  ctx.lineWidth = 1.4;
  ctx.strokeRect(-hl, -hw, length, width);

  // 3. Corrugated Roof Profile (Trapezoidal alternating shadow and specular highlight ribs)
  const ribStep = 4.4;
  for (let rx = -hl + 7; rx < hl - 7; rx += ribStep) {
    // Dark depression groove
    ctx.fillStyle = style.rib;
    ctx.fillRect(rx, -hw + 1.5, 1.8, width - 3);

    // Specular light edge on rib peak
    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.fillRect(rx + 1.8, -hw + 1.5, 0.9, width - 3);

    // Shadow undertone
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.fillRect(rx + 2.7, -hw + 1.5, 0.9, width - 3);
  }

  // 4. Longitudinal side roof rails (верхние продольные балки)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.fillRect(-hl, -hw, length, 2.2);
  ctx.fillRect(-hl, hw - 2.2, length, 2.2);

  // 5. ISO Corner Castings (4 heavy forged steel corner blocks with twistlock holes)
  const cornerW = 5.5;
  const cornerH = 4.5;
  const corners: [number, number][] = [
    [-hl, -hw],
    [hl - cornerW, -hw],
    [-hl, hw - cornerH],
    [hl - cornerW, hw - cornerH]
  ];

  corners.forEach(([cx, cy]) => {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(cx, cy, cornerW, cornerH);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 0.9;
    ctx.strokeRect(cx, cy, cornerW, cornerH);

    // Oval twistlock aperture with chamfered inner hole
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.ellipse(cx + cornerW / 2, cy + cornerH / 2, 1.4, 0.9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 0.5;
    ctx.stroke();
  });

  // 6. Door End Assembly (on right side hl - 3)
  ctx.fillStyle = '#09090b';
  ctx.fillRect(hl - 2.8, -hw + 1.5, 2.8, width - 3);

  // Center vertical rubber door gasket seal
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(hl - 2.8, 0);
  ctx.lineTo(hl, 0);
  ctx.stroke();

  // 4 Vertical stainless steel locking rods (штанги запоров дверей) with cam keepers
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.1;
  const rodOffsets = [-hw + 4.5, -hw + 8, hw - 8, hw - 4.5];
  rodOffsets.forEach(ry => {
    ctx.beginPath();
    ctx.moveTo(hl - 1.6, ry - 2);
    ctx.lineTo(hl - 1.6, ry + 2);
    ctx.stroke();

    // Zinc cam keeper brackets
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(hl - 2.2, ry - 1, 1.4, 2);
  });

  // 7. Company Branding & Stenciled Markings
  ctx.fillStyle = style.text;
  ctx.font = 'bold 8px "Lucida Console", "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(style.code, 0, -1);

  if (style.hasStar) {
    // Maersk 7-point star emblem
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-18, -1, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = style.base;
    ctx.beginPath();
    ctx.arc(-18, -1, 1.3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Container ID serial code (e.g. MSKU 918234 4 / 45G1)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.font = '5px monospace';
  ctx.fillText(`${style.code.slice(0, 4)} ${(hash % 900000 + 100000)}`, 0, 6.5);

  // Yellow Hazmat Placard (Class 3 / Class 8)
  ctx.save();
  ctx.translate(-hl + 9, 0);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = '#eab308';
  ctx.fillRect(-2.5, -2.5, 5, 5);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(-2.5, -2.5, 5, 5);
  ctx.restore();

  // Subtle weather rust patches on roof depressions
  if (hash % 2 === 0) {
    ctx.fillStyle = 'rgba(120, 53, 15, 0.45)';
    ctx.beginPath();
    ctx.ellipse(hl * 0.3, -2, 5, 3, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function renderPropPalletStack(ctx: CanvasRenderingContext2D, prop: StreetProp) {
  let hash = 0;
  for (let i = 0; i < prop.id.length; i++) hash = (hash * 31 + prop.id.charCodeAt(i)) >>> 0;
  const hasBoxes = (hash % 3) === 0;
  const hasDrums = (hash % 3) === 1;

  // Pallet base dimensions: 20x15
  const pw = 20;
  const ph = 15;
  const hx = -pw / 2;
  const hy = -ph / 2;

  if (prop.isBroken) {
    // Smashed wood pallet debris
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.ellipse(0, 0, 12, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Splintered planks
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-8, -4, 16, 2);
    ctx.fillRect(-5, 2, 12, 2.2);

    ctx.save();
    ctx.rotate(0.5);
    ctx.fillStyle = '#b45309';
    ctx.fillRect(-7, -2, 14, 2);
    ctx.restore();

    ctx.save();
    ctx.rotate(-0.4);
    ctx.fillStyle = '#92400e';
    ctx.fillRect(-9, 1, 15, 2);
    ctx.restore();

    // Broken wooden blocks
    ctx.fillStyle = '#451a03';
    ctx.fillRect(-6, -6, 3, 3);
    ctx.fillRect(4, 3, 3, 3);
    return;
  }

  // 1. Soft Ground Drop Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
  ctx.beginPath();
  ctx.roundRect(hx + 2.5, hy + 3.5, pw + 2, ph + 2.5, 2);
  ctx.fill();

  // 2. Bottom Runners (3 лыжи поддона)
  ctx.fillStyle = '#451a03';
  ctx.fillRect(hx, hy + 0.5, pw, 2.2);
  ctx.fillRect(hx, hy + ph / 2 - 1.1, pw, 2.2);
  ctx.fillRect(hx, hy + ph - 2.7, pw, 2.2);

  // 3. 9 Wooden Spacer Blocks (бобышки) with grain and nail dots
  const blockW = 3.2;
  const blockH = 2.8;
  const blockX = [hx + 0.5, hx + pw / 2 - blockW / 2, hx + pw - blockW - 0.5];
  const blockY = [hy + 0.5, hy + ph / 2 - blockH / 2, hy + ph - blockH - 0.5];

  ctx.fillStyle = '#78350f';
  blockX.forEach(bx => {
    blockY.forEach(by => {
      ctx.fillRect(bx, by, blockW, blockH);
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(bx + blockW / 2 - 0.4, by + blockH / 2 - 0.4, 0.8, 0.8);
      ctx.fillStyle = '#78350f';
    });
  });

  // 4. 5 Top Deckboards (доски настила) with authentic pine wood hues
  const deckColors = ['#92400e', '#a16207', '#854d0e', '#b45309', '#78350f'];
  const boardH = (ph - 3) / 5;
  for (let i = 0; i < 5; i++) {
    const by = hy + 0.5 + i * (boardH + 0.5);
    ctx.fillStyle = deckColors[(i + hash) % deckColors.length];
    ctx.fillRect(hx, by, pw, boardH);

    // Fine wood grain highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.fillRect(hx, by, pw, 0.6);

    // Countersunk nail pairs on ends
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(hx + 1.2, by + boardH / 2 - 0.4, 0.7, 0.7);
    ctx.fillRect(hx + pw - 1.9, by + boardH / 2 - 0.4, 0.7, 0.7);
  }

  // EPAL / EUR Brand Stamp on corner block
  ctx.strokeStyle = '#291104';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.ellipse(hx + 3, hy + 2.2, 1.8, 1.1, 0, 0, Math.PI * 2);
  ctx.stroke();

  if (hasBoxes) {
    // Cardboard boxes wrapped in stretch film with shiny membrane
    ctx.fillStyle = '#d97706';
    ctx.fillRect(hx + 2, hy + 1.5, pw - 4, ph - 3);
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 0.9;
    ctx.strokeRect(hx + 2, hy + 1.5, pw - 4, ph - 3);

    // Center box seam
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(hx + pw / 2, hy + 1.5);
    ctx.lineTo(hx + pw / 2, hy + ph - 1.5);
    ctx.stroke();

    // High-tension yellow polypropylene strapping bands
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(hx + 6, hy + 1.5); ctx.lineTo(hx + 6, hy + ph - 1.5);
    ctx.moveTo(hx + pw - 6, hy + 1.5); ctx.lineTo(hx + pw - 6, hy + ph - 1.5);
    ctx.stroke();

    // Stretch film specular gloss sheen
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.beginPath();
    ctx.moveTo(hx + 3, hy + 3);
    ctx.lineTo(hx + pw - 5, hy + 3);
    ctx.lineTo(hx + pw - 8, hy + 6);
    ctx.lineTo(hx + 3, hy + 6);
    ctx.closePath();
    ctx.fill();

    // Red Fragile handling label
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(hx + 4, hy + ph / 2 - 1.5, 3, 3);
  } else if (hasDrums) {
    // 4 tightly strapped industrial 200L chemical barrels
    const drumColors = ['#1e3a8a', '#15803d', '#dc2626', '#334155'];
    const drumCol = drumColors[hash % drumColors.length];
    const centers: [number, number][] = [
      [hx + 5.5, hy + 4.2],
      [hx + pw - 5.5, hy + 4.2],
      [hx + 5.5, hy + ph - 4.2],
      [hx + pw - 5.5, hy + ph - 4.2]
    ];

    centers.forEach(([dx, dy]) => {
      // Drum cylinder top
      ctx.fillStyle = drumCol;
      ctx.beginPath();
      ctx.arc(dx, dy, 3.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Top chime rim
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.arc(dx, dy, 3.2, 0, Math.PI * 2);
      ctx.stroke();

      // 2" bung cap
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.arc(dx + 1.4, dy - 1.2, 0.7, 0, Math.PI * 2);
      ctx.fill();
    });

    // Ratchet cargo strap holding drums
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(hx + 1, hy + ph / 2);
    ctx.lineTo(hx + pw - 1, hy + ph / 2);
    ctx.stroke();
  }
}

export function renderPropIndustrialTank(ctx: CanvasRenderingContext2D, prop: StreetProp) {
  const tw = 44;
  const th = 22;
  const hx = -tw / 2;
  const hy = -th / 2;

  if (prop.isBroken) {
    // Ruptured fuel tank with oil slick
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 26, 16, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Twisted metal shell
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.roundRect(hx, hy + 2, tw - 4, th - 4, 6);
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Ripped jagged hole
    ctx.fillStyle = '#09090b';
    ctx.beginPath();
    ctx.ellipse(0, 0, 8, 4, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Scorch / fire soot
    ctx.fillStyle = 'rgba(234, 88, 12, 0.3)';
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  // 1. Soft Ambient Ground Drop Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
  ctx.beginPath();
  ctx.roundRect(hx + 3, hy + 4, tw + 4, th + 4, 9);
  ctx.fill();

  // 2. Concrete Support Saddles (2 массивных ложемента)
  ctx.fillStyle = '#475569';
  const saddleW = 7;
  const saddleH = th + 4;
  [-tw / 2 + 6, tw / 2 - 13].forEach(sx => {
    ctx.fillRect(sx, hy - 2, saddleW, saddleH);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.0;
    ctx.strokeRect(sx, hy - 2, saddleW, saddleH);

    // Steel anchor straps (хомуты) with hex bolts
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(sx + 1.5, hy - 2.5, 4, 1.2);
    ctx.fillRect(sx + 1.5, hy + th + 1.3, 4, 1.2);
  });

  // 3. Cylindrical Steel Body with Torispherical Dished Heads (выпуклые эллиптические днища)
  ctx.fillStyle = '#64748b';
  ctx.beginPath();
  ctx.roundRect(hx, hy, tw, th, 10);
  ctx.fill();
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // 4. Volumetric Cylindrical Gradient Highlight (верхний световой блик и нижняя тень)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.fillRect(hx + 5, hy + 2.5, tw - 10, 3.5);

  ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
  ctx.fillRect(hx + 5, hy + th - 6, tw - 10, 3.8);

  // 5. Circumferential Reinforcing Rings & Double Weld Seams
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1.2;
  [-8, 0, 8].forEach(rx => {
    ctx.beginPath();
    ctx.moveTo(rx, hy);
    ctx.lineTo(rx, hy + th);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(rx + 1, hy);
    ctx.lineTo(rx + 1, hy + th);
    ctx.stroke();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.2;
  });

  // 6. Top Inspection Manhole Dome with Bolted Flange Ring (люк-лаз с 8 болтами)
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.arc(0, 0, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 0.9;
  ctx.stroke();

  // Flange bolt studs
  ctx.fillStyle = '#94a3b8';
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
    ctx.fillRect(Math.cos(a) * 3.8 - 0.5, Math.sin(a) * 3.8 - 0.5, 1.0, 1.0);
  }

  // Pressure relief valve & breather hood
  ctx.fillStyle = '#eab308';
  ctx.fillRect(-1.2, -1.2, 2.4, 2.4);

  // 7. Steel Safety Catwalk (желтый трап обслуживания с ограждением)
  ctx.strokeStyle = '#ca8a04';
  ctx.lineWidth = 1.0;
  ctx.strokeRect(hx + 8, hy - 4.5, tw - 16, 3);
  ctx.fillStyle = 'rgba(234, 179, 8, 0.15)';
  ctx.fillRect(hx + 8, hy - 4.5, tw - 16, 3);

  // 8. Bright Red Industrial Warning Sign: "ОГНЕОПАСНО"
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(hx + 10, hy + 11.5, tw - 20, 6.5);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 0.6;
  ctx.strokeRect(hx + 10, hy + 11.5, tw - 20, 6.5);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 5px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ОГНЕОПАСНО', 0, hy + 15);

  // NFPA 704 Diamond Placard on left flank
  ctx.save();
  ctx.translate(hx + 6, 0);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(-2, -2, 4, 4);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(-2, -2, 4, 4);
  ctx.restore();
}

export function renderPropSiloTank(ctx: CanvasRenderingContext2D, _prop: StreetProp) {
  const radius = 16;

  // 1. Soft Ground Drop Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
  ctx.beginPath();
  ctx.arc(4, 4, radius + 2.5, 0, Math.PI * 2);
  ctx.fill();

  // 2. Heavy Octagonal Concrete Foundation Pad
  ctx.fillStyle = '#475569';
  ctx.beginPath();
  ctx.arc(0, 0, radius + 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // 3. Cylindrical Silo Steel Tank Shell
  ctx.fillStyle = '#94a3b8';
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // 4. Conical Segmented Roof with 8 Radial Seams
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
    const cosA = Math.cos(a);
    const sinA = Math.sin(a);
    const nextA = a + Math.PI / 4;
    const cosNext = Math.cos(nextA);
    const sinNext = Math.sin(nextA);

    // Dynamic conical facet shading
    const shade = (sinA + 1) / 2;
    ctx.fillStyle = `rgba(30, 41, 59, ${0.15 + shade * 0.25})`;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(cosA * radius, sinA * radius);
    ctx.lineTo(cosNext * radius, sinNext * radius);
    ctx.closePath();
    ctx.fill();

    // Weld seam rib
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(cosA * radius, sinA * radius);
    ctx.stroke();
  }

  // 5. Center Cyclone Dust Filter / Exhaust Cowl
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.arc(0, 0, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.0;
  ctx.stroke();

  // Central exhaust hatch
  ctx.fillStyle = '#475569';
  ctx.beginPath();
  ctx.arc(0, 0, 2.2, 0, Math.PI * 2);
  ctx.fill();

  // 6. Yellow Circular Roof Safety Handrail
  ctx.strokeStyle = '#eab308';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.arc(0, 0, radius - 1.5, 0, Math.PI * 1.85);
  ctx.stroke();

  // 7. Caged Access Ladder on Side with Safety Hoops (дуги безопасности)
  ctx.fillStyle = '#ca8a04';
  ctx.fillRect(-radius - 1.5, -4, 3, 8);
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 0.8;
  ctx.strokeRect(-radius - 1.5, -4, 3, 8);

  // Ladder rungs
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 0.6;
  for (let y = -3; y <= 3; y += 2) {
    ctx.beginPath();
    ctx.moveTo(-radius - 1.5, y);
    ctx.lineTo(-radius + 1.5, y);
    ctx.stroke();
  }

  // 8. Pneumatic Loading Pipe with brass Storz coupling
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(radius - 2.5, -2, 4, 4);
  ctx.fillStyle = '#d97706';
  ctx.fillRect(radius + 1, -1.2, 2, 2.4);
}

export function renderPropCableSpool(ctx: CanvasRenderingContext2D, prop: StreetProp) {
  const r = 9;

  if (prop.isBroken) {
    // Smashed wooden drum with loose uncoiled cable
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.ellipse(0, 0, 11, 7, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Broken wooden planks
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-8, -3, 16, 3);
    ctx.fillRect(-6, 2, 12, 2.5);

    // Spilled cable coils
    ctx.strokeStyle = '#09090b';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.arc(2, 1, 7, 0, Math.PI * 1.6);
    ctx.stroke();
    return;
  }

  // 1. Soft Ground Drop Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.beginPath();
  ctx.arc(2.8, 3.2, r + 0.5, 0, Math.PI * 2);
  ctx.fill();

  // 2. Circular Wooden Flange with Plank Grooves (щека барабана)
  ctx.fillStyle = '#78350f';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // Steel perimeter rim tire band (защитный стальной обод)
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Radial wood plank joint lines
  ctx.strokeStyle = '#451a03';
  ctx.lineWidth = 0.8;
  for (let x = -r + 2.5; x <= r - 2.5; x += 3.2) {
    const ySpan = Math.sqrt(Math.max(0, r * r - x * x));
    ctx.beginPath();
    ctx.moveTo(x, -ySpan);
    ctx.lineTo(x, ySpan);
    ctx.stroke();
  }

  // 3. Wound Heavy High-Voltage Armored Cable (концентрические витки черного кабеля)
  ctx.fillStyle = '#18181b';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.68, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#09090b';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Cable coil specular ridges
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2);
  ctx.stroke();

  // 4. Central Steel Arbor Hole & Spindle Reinforcing Plate
  ctx.fillStyle = '#94a3b8';
  ctx.beginPath();
  ctx.arc(0, 0, 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 0.9;
  ctx.stroke();

  // Center hollow bore hole
  ctx.fillStyle = '#09090b';
  ctx.beginPath();
  ctx.arc(0, 0, 1.4, 0, Math.PI * 2);
  ctx.fill();

  // 6 Tie-rod bolt nuts around perimeter
  ctx.fillStyle = '#cbd5e1';
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
    ctx.fillRect(Math.cos(a) * (r * 0.78) - 0.5, Math.sin(a) * (r * 0.78) - 0.5, 1.0, 1.0);
  }

  // Factory Rolling Direction Arrow Stencil
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.42, 0.3, 1.6);
  ctx.stroke();
}

export function renderPropConcreteFencePO2(ctx: CanvasRenderingContext2D, prop: StreetProp) {
  // Deterministic seed for unique concrete aggregate and micro-cracking
  let hash = 0;
  const idStr = prop.id || 'po2';
  for (let i = 0; i < idStr.length; i++) hash = (hash * 31 + idStr.charCodeAt(i)) >>> 0;

  const fw = 38; // 38px seamlessly aligns with 38px placement intervals in map.json
  const hx = -fw / 2; // -19

  if (prop.isBroken) {
    // Smashed ПО-2 concrete fence with exposed rusted rebar mesh and rubble
    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.fillRect(hx + 2, 4, fw - 2, 10);

    // Foundation cups still standing, chipped
    ctx.fillStyle = '#44403c';
    ctx.fillRect(hx - 1, -4, 7, 14);
    ctx.fillRect(hx + fw - 6, -4, 7, 14);

    // Left fractured slab chunk
    ctx.fillStyle = '#78716c';
    ctx.beginPath();
    ctx.moveTo(hx, -3);
    ctx.lineTo(hx + 14, -4);
    ctx.lineTo(hx + 10, 8);
    ctx.lineTo(hx, 6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#292524';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Internal aggregate texture in fracture
    ctx.fillStyle = '#a8a29e';
    ctx.beginPath();
    ctx.moveTo(hx + 14, -4);
    ctx.lineTo(hx + 10, 8);
    ctx.lineTo(hx + 8, 8);
    ctx.lineTo(hx + 12, -4);
    ctx.closePath();
    ctx.fill();

    // Right fractured slab chunk tilting
    ctx.save();
    ctx.translate(hx + fw - 8, 3);
    ctx.rotate(0.22);
    ctx.fillStyle = '#57534e';
    ctx.fillRect(-12, -7, 14, 11);
    ctx.strokeStyle = '#292524';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(-12, -7, 14, 11);

    // Diamond relief fragment on right chunk
    ctx.fillStyle = '#d6d3d1';
    ctx.beginPath();
    ctx.moveTo(-6, -4);
    ctx.lineTo(-3, -1);
    ctx.lineTo(-9, -1);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.moveTo(-6, 2);
    ctx.lineTo(-3, -1);
    ctx.lineTo(-9, -1);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Twisted exposed rusted rebar mesh (арматурный каркас ГОСТ)
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    // Longitudinal rebar
    ctx.moveTo(hx + 8, -1); ctx.lineTo(hx + 18, -3); ctx.lineTo(hx + 24, 0);
    ctx.moveTo(hx + 9, 3); ctx.lineTo(hx + 17, 2); ctx.lineTo(hx + 23, 5);
    ctx.moveTo(hx + 7, 6); ctx.lineTo(hx + 19, 7); ctx.lineTo(hx + 25, 4);
    // Vertical wire ties
    ctx.moveTo(hx + 13, -3); ctx.lineTo(hx + 14, 7);
    ctx.moveTo(hx + 18, -2); ctx.lineTo(hx + 19, 8);
    ctx.moveTo(hx + 22, -1); ctx.lineTo(hx + 22, 6);
    ctx.stroke();

    // Fallen coiled razor wire
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.ellipse(hx + 16, 5, 6, 3, 0.4, 0, Math.PI * 2);
    ctx.stroke();

    // Scattered concrete rubble rocks on ground with shadows
    const rubbles = [
      { x: hx + 11, y: 7, rx: 2.2, ry: 1.6 },
      { x: hx + 16, y: 9, rx: 3.0, ry: 2.1 },
      { x: hx + 21, y: 6, rx: 1.8, ry: 1.4 },
      { x: hx + 7, y: 9, rx: 2.5, ry: 1.7 },
    ];
    rubbles.forEach(r => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(r.x + 1, r.y + 1, r.rx * 2, r.ry * 2);
      ctx.fillStyle = '#a8a29e';
      ctx.fillRect(r.x, r.y, r.rx * 2, r.ry * 2);
      ctx.strokeStyle = '#292524';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(r.x, r.y, r.rx * 2, r.ry * 2);
    });
    return;
  }

  // --- INTACT HIGH-FIDELITY 2.5D ПО-2 CONCRETE FENCE ---
  // 1. Soft Ambient Ground Drop Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(hx + 2, 5, fw + 1, 9, 3);
  } else {
    ctx.rect(hx + 2, 5, fw + 1, 9);
  }
  ctx.fill();

  // 2. Heavy Foundation Shoes ("Стаканы" ФО-2) at both joins
  renderConcreteShoe(ctx, hx - 1, -5.5, 7.5, 17, hash);
  renderConcreteShoe(ctx, hx + fw - 6.5, -5.5, 7.5, 17, hash + 17);

  // 3. Main Precast Concrete Slab Base Panel (Плита ПО-2)
  // Panel face spans from y = -4.5 to y = +8.5 (13px vertical height)
  const py = -4.5;
  const ph = 13.0;

  // Weathered concrete base tone
  ctx.fillStyle = '#78716c';
  ctx.fillRect(hx + 2, py, fw - 4, ph);

  // Concrete texture: deterministic aggregate gravel speckles
  const speckleCount = 14;
  for (let s = 0; s < speckleCount; s++) {
    const sx = hx + 3 + ((hash * (s + 1) * 7) % (fw - 8));
    const sy = py + 1 + ((hash * (s + 3) * 11) % (ph - 2));
    ctx.fillStyle = s % 2 === 0 ? '#44403c' : '#e7e5e4';
    ctx.fillRect(sx, sy, 0.9, 0.9);
  }

  // Bottom moisture & grime gradient (грунтовая сырость и мох)
  ctx.fillStyle = 'rgba(28, 25, 23, 0.42)';
  ctx.fillRect(hx + 2, py + ph - 2.5, fw - 4, 2.5);
  ctx.fillStyle = 'rgba(20, 83, 45, 0.25)'; // faint moss tint
  ctx.fillRect(hx + 2, py + ph - 1.2, fw - 4, 1.2);

  // Concrete perimeter bevel border & chamfer
  ctx.strokeStyle = '#292524';
  ctx.lineWidth = 1.1;
  ctx.strokeRect(hx + 2, py, fw - 4, ph);

  // Top cap beam highlight (верхний торец плиты)
  ctx.fillStyle = '#e7e5e4';
  ctx.fillRect(hx + 2, py, fw - 4, 1.3);

  // 4. THE ICONIC ПО-2 DIAMOND PYRAMID RELIEF (Ромбики ПО-2 «Алмазная грань»)
  // 4 prominent diamond pyramid units across the panel
  const diamondCount = 4;
  const diamondAreaW = fw - 10;
  const diamondW = diamondAreaW / diamondCount;
  const diamondH = 8.8;
  const startX = hx + 5;
  const centerFaceY = py + 2.2 + diamondH / 2;

  for (let i = 0; i < diamondCount; i++) {
    const dcx = startX + i * diamondW + diamondW / 2;
    const dcy = centerFaceY;
    const rx = diamondW / 2 - 0.35;
    const ry = diamondH / 2 - 0.2;

    // Recessed border groove around each diamond
    ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
    ctx.fillRect(dcx - rx - 0.4, dcy - ry - 0.4, rx * 2 + 0.8, ry * 2 + 0.8);

    // Top-North facet (Facing sky/sunlight -> Highest brightness)
    ctx.fillStyle = '#f1f5f9';
    ctx.beginPath();
    ctx.moveTo(dcx, dcy);
    ctx.lineTo(dcx - rx, dcy);
    ctx.lineTo(dcx, dcy - ry);
    ctx.lineTo(dcx + rx, dcy);
    ctx.closePath();
    ctx.fill();

    // Left-West facet (Indirect illumination)
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(dcx, dcy);
    ctx.lineTo(dcx - rx, dcy);
    ctx.lineTo(dcx, dcy - ry);
    ctx.closePath();
    ctx.fill();

    // Right-East facet (Soft twilight shadow)
    ctx.fillStyle = '#64748b';
    ctx.beginPath();
    ctx.moveTo(dcx, dcy);
    ctx.lineTo(dcx + rx, dcy);
    ctx.lineTo(dcx, dcy + ry);
    ctx.closePath();
    ctx.fill();

    // Bottom-South facet (Facing ground -> Deep cast shadow)
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(dcx, dcy);
    ctx.lineTo(dcx - rx, dcy);
    ctx.lineTo(dcx, dcy + ry);
    ctx.lineTo(dcx + rx, dcy);
    ctx.closePath();
    ctx.fill();

    // Diamond Ridge Lines (Хребты пирамиды)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(dcx - rx, dcy);
    ctx.lineTo(dcx + rx, dcy);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(15, 23, 42, 0.5)';
    ctx.beginPath();
    ctx.moveTo(dcx, dcy - ry);
    ctx.lineTo(dcx, dcy + ry);
    ctx.stroke();

    // Sharp specular apex point
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(dcx - 0.4, dcy - 0.4, 0.8, 0.8);
  }

  // 5. Steel Rebar Lifting Loops (Монтажные петли) with Rust Runoff Stains
  [-7, 7].forEach(lx => {
    // Protruding steel rebar eye on top beam
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.arc(lx, py - 0.2, 1.5, Math.PI, 0);
    ctx.stroke();

    // Realistic vertical rust stains trickling down the diamond face
    ctx.fillStyle = 'rgba(180, 83, 9, 0.65)';
    ctx.fillRect(lx - 0.7, py + 0.8, 1.4, 3.8);
    ctx.fillStyle = 'rgba(120, 53, 15, 0.35)';
    ctx.fillRect(lx - 0.5, py + 4.2, 1.0, 3.5);
  });

  // 6. Angled Steel Brackets & Spiral Razor Wire ("Егоза" АКЛ) on Top Edge
  [-11, 0, 11].forEach(bx => {
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(bx, py + 0.5);
    ctx.lineTo(bx + 1.8, py - 4.5);
    ctx.stroke();

    // Bracket galvanized highlight
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(bx + 0.4, py + 0.5);
    ctx.lineTo(bx + 2.0, py - 4.2);
    ctx.stroke();
  });

  // Dual-strand high-tensile guide wires
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(hx - 1, py - 4.2);
  ctx.lineTo(hx + fw + 1, py - 4.2);
  ctx.moveTo(hx - 1, py - 2.4);
  ctx.lineTo(hx + fw + 1, py - 2.4);
  ctx.stroke();

  // Spiral Razor Wire Coils (АКЛ «Егоза» 3D спирали с лезвиями-шипами)
  for (let x = hx + 1; x < hx + fw - 1; x += 4.8) {
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.ellipse(x + 2.2, py - 3.2, 2.4, 1.6, 0.25, 0, Math.PI * 2);
    ctx.stroke();

    // Razor blade cross barbs
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(x + 1.2, py - 4.6);
    ctx.lineTo(x + 2.8, py - 1.8);
    ctx.moveTo(x + 2.8, py - 4.6);
    ctx.lineTo(x + 1.2, py - 1.8);
    ctx.stroke();
  }
}

function renderConcreteShoe(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  seed: number
) {
  // Heavy Trapezoidal Foundation Cup (ФО-2 «Стакан»)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(x + 1, y + 2, w, h);

  // Main concrete block body
  ctx.fillStyle = '#57534e';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#1c1917';
  ctx.lineWidth = 1.0;
  ctx.strokeRect(x, y, w, h);

  // Concrete top bevel chamfer
  ctx.fillStyle = '#a8a29e';
  ctx.fillRect(x + 0.5, y + 0.5, w - 1, 1.2);

  // Left bevel highlight
  ctx.fillStyle = '#78716c';
  ctx.fillRect(x + 0.5, y + 1.7, 1.0, h - 3);

  // Right bevel shadow
  ctx.fillStyle = '#292524';
  ctx.fillRect(x + w - 1.5, y + 1.7, 1.0, h - 3);

  // Center vertical recessed panel slot (паз для фиксации плиты ПО-2)
  ctx.fillStyle = '#1c1917';
  ctx.fillRect(x + w / 2 - 0.9, y + 1.5, 1.8, h - 3);

  // Concrete aggregate speckles on shoe
  ctx.fillStyle = seed % 2 === 0 ? '#1c1917' : '#d6d3d1';
  ctx.fillRect(x + 1.5, y + 3, 0.8, 0.8);
  ctx.fillRect(x + w - 2.5, y + h - 4, 0.8, 0.8);
}

export function renderPropSecurityBarrier(ctx: CanvasRenderingContext2D, prop: StreetProp) {
  if (prop.isBroken) {
    // Smashed barrier with bent boom arm
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(-4, 3, 18, 5);

    // Dented yellow pedestal
    ctx.fillStyle = '#ca8a04';
    ctx.fillRect(-4, -4, 8, 8);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(-4, -4, 8, 8);

    // Bent / snapped boom arm
    ctx.save();
    ctx.rotate(0.6);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, -1.5, 12, 3);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(4, -1.5, 3, 3);
    ctx.fillRect(9, -1.5, 3, 3);
    ctx.restore();

    // Broken end lying on ground
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(8, 4, 10, 3);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(11, 4, 3, 3);
    return;
  }

  // 1. Ground Drop Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(-3, 3.5, 28, 4.5);

  // 2. Control Pedestal (Тумба автоматического шлагбаума)
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.roundRect(-4.5, -4.5, 9, 9, 2);
  ctx.fill();
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Ventilation louvers & service lock
  ctx.fillStyle = '#78350f';
  ctx.fillRect(-3, -2, 6, 0.8);
  ctx.fillRect(-3, 0, 6, 0.8);
  ctx.fillRect(-3, 2, 6, 0.8);

  // Flashing Warning LED Beacon on top
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(-2, -2, 1.3, 0, Math.PI * 2);
  ctx.fill();

  // Side mini dual traffic light (Red / Green LEDs)
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-5.5, -2.5, 1.5, 5);
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(-5.3, -2, 1.1, 1.8);
  ctx.fillStyle = '#22c55e';
  ctx.fillRect(-5.3, 0.4, 1.1, 1.8);

  // 3. Rotating Pivot Mechanism Hub
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(0, 0, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // 4. Aluminum Boom Arm (Стрела шлагбаума) with 45° Red & White Reflective Chevrons
  const armLen = 26;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, -1.8, armLen, 3.6);
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 0.8;
  ctx.strokeRect(0, -1.8, armLen, 3.6);

  // Bottom rubber cushion strip
  ctx.fillStyle = '#09090b';
  ctx.fillRect(0, 1.2, armLen, 0.8);

  // High-visibility retroreflective red chevrons
  ctx.fillStyle = '#dc2626';
  for (let x = 3.5; x < armLen - 1; x += 5.5) {
    ctx.fillRect(x, -1.8, 3.0, 3.0);
  }

  // 5. Centered Round Retroreflective "СТОП" Sign
  const signX = armLen * 0.52;
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.arc(signX, 0, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 3.5px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('СТОП', signX, 0.2);
}

export function renderPropIndustrialFloodlight(ctx: CanvasRenderingContext2D, _prop: StreetProp) {
  // 1. Soft Ground Drop Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
  ctx.fillRect(-7, 3.5, 14, 7);

  // 2. Concrete 4-Bolt Foundation Pad
  ctx.fillStyle = '#475569';
  ctx.fillRect(-6, -6, 12, 12);
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(-6, -6, 12, 12);

  // Zinc-plated foundation anchor bolts
  ctx.fillStyle = '#cbd5e1';
  [[-4.5, -4.5], [4.5, -4.5], [-4.5, 4.5], [4.5, 4.5]].forEach(([bx, by]) => {
    ctx.fillRect(bx - 0.7, by - 0.7, 1.4, 1.4);
  });

  // 3. Heavy 4-Legged Open Lattice Steel Truss Tower (Решётчатая опора мачты)
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-4.5, -4.5, 9, 9);
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(-4.5, -4.5, 9, 9);

  // Diagonal X-Lacing (диагональные ферменные раскосы)
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(-4.5, -4.5); ctx.lineTo(4.5, 4.5);
  ctx.moveTo(4.5, -4.5); ctx.lineTo(-4.5, 4.5);
  ctx.stroke();

  // Central power conduit & junction box
  ctx.fillStyle = '#334155';
  ctx.beginPath();
  ctx.arc(0, 0, 2.2, 0, Math.PI * 2);
  ctx.fill();

  // 4. Quad Stadium-Grade Industrial LED Floodlights (Блок из 4 мощных прожекторов)
  const lamps: [number, number][] = [
    [-4.5, -4.5], [4.5, -4.5],
    [-4.5, 4.5], [4.5, 4.5]
  ];

  lamps.forEach(([lx, ly]) => {
    // Die-cast aluminum cooling fin pod
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(lx, ly, 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // High-output phosphor emitter & optic reflector
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(lx, ly, 1.7, 0, Math.PI * 2);
    ctx.fill();

    // Center bright LED glint
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(lx, ly, 0.8, 0, Math.PI * 2);
    ctx.fill();
  });
}

export function renderPropIndustrialTires(ctx: CanvasRenderingContext2D, _prop: StreetProp) {
  const r = 10;

  // 1. Soft Ground Drop Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
  ctx.beginPath();
  ctx.arc(3.5, 3.5, r + 0.5, 0, Math.PI * 2);
  ctx.fill();

  // 2. Giant OTR (Off-The-Road) Tire Profile
  ctx.fillStyle = '#18181b';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#09090b';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // 3. Deep Chevron V-Shaped Rock Lug Tread Grooves (протектор карьерного самосвала)
  ctx.strokeStyle = '#27272a';
  ctx.lineWidth = 1.6;
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
    const cosA = Math.cos(a);
    const sinA = Math.sin(a);
    ctx.beginPath();
    ctx.moveTo(cosA * (r * 0.55), sinA * (r * 0.55));
    ctx.lineTo(cosA * r, sinA * r);
    ctx.stroke();

    // Tread block specular dust edge
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(cosA * (r * 0.6), sinA * (r * 0.6));
    ctx.lineTo(cosA * (r * 0.95), sinA * (r * 0.95));
    ctx.stroke();
    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = 1.6;
  }

  // 4. Heavy Sidewall Shoulder with Embossed Markings
  ctx.fillStyle = '#27272a';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#09090b';
  ctx.lineWidth = 1.0;
  ctx.stroke();

  // Deep Rim Center Hollow (отверстие для обода и посадочное кольцо)
  ctx.fillStyle = '#09090b';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2);
  ctx.fill();
}

export function renderPropScrapPile(ctx: CanvasRenderingContext2D, _prop: StreetProp) {
  // 1. Soft Ground Drop Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.beginPath();
  ctx.ellipse(2.5, 2.5, 15, 12, 0.15, 0, Math.PI * 2);
  ctx.fill();

  // 2. Base Mound (weathered dark iron oxide & rust dirt)
  ctx.fillStyle = '#3f1a05';
  ctx.beginPath();
  ctx.ellipse(0, 0, 13.5, 10.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // 3. Jumbled Heavy Industrial I-Beams (двутавры) with flange cutouts
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.moveTo(-11, -5); ctx.lineTo(9, 7);
  ctx.moveTo(-8, 8); ctx.lineTo(10, -5);
  ctx.stroke();

  // Highlight along I-beam web
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(-10, -4); ctx.lineTo(8, 6);
  ctx.stroke();

  // 4. Cut Hollow Steel Pipes with oxidized ends
  ctx.strokeStyle = '#92400e';
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.moveTo(-6, -9); ctx.lineTo(7, 9);
  ctx.moveTo(-10, 2); ctx.lineTo(11, 1);
  ctx.stroke();

  // Hollow pipe end lips
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(-6, -9, 1.5, 0, Math.PI * 2);
  ctx.arc(11, 1, 1.5, 0, Math.PI * 2);
  ctx.fill();

  // 5. Tangled Coils of Concrete Reinforcement Rebar & Twisted Sheet Metal
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.arc(0, 0, 4.5, 0, Math.PI * 1.8);
  ctx.stroke();

  ctx.strokeStyle = '#b45309';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.arc(-2, 2, 6, 0.5, Math.PI * 2.2);
  ctx.stroke();
}

export function renderPropIndustrialSign(ctx: CanvasRenderingContext2D, prop: StreetProp) {
  let hash = 0;
  for (let i = 0; i < prop.id.length; i++) hash = (hash * 31 + prop.id.charCodeAt(i)) >>> 0;

  const signs = [
    { text: 'ВЪЕЗД ПО ПРОПУСКАМ', sub: 'КПП №1 • ДОСМОТР', bg: '#1e293b', fg: '#f8fafc', border: '#eab308' },
    { text: 'ЗОНА ПОГРУЗКИ', sub: 'СКОРОСТЬ 10 КМ/Ч', bg: '#eab308', fg: '#09090b', border: '#ca8a04' },
    { text: 'НЕ КУРИТЬ! ОГНЕОПАСНО', sub: 'ГАЗ • ГСМ • ТЕРМИНАЛ', bg: '#dc2626', fg: '#ffffff', border: '#991b1b' },
    { text: 'ОПАСНАЯ ЗОНА', sub: 'РАБОТАЕТ АВТОКРАН', bg: '#ffffff', fg: '#dc2626', border: '#dc2626' },
  ];
  const s = signs[hash % signs.length];

  // 1. Soft Ground Drop Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(-9, 3.5, 18, 5.5);

  // 2. Galvanized Steel Twin Pipe Posts with Base Mounting Flanges
  ctx.fillStyle = '#64748b';
  ctx.fillRect(-7, -4.5, 2, 9);
  ctx.fillRect(5, -4.5, 2, 9);
  ctx.fillStyle = '#334155';
  ctx.fillRect(-8, 3.5, 4, 1.2);
  ctx.fillRect(4, 3.5, 4, 1.2);

  // 3. Enameled Aluminum Signboard Panel with Rounded Corners
  ctx.fillStyle = s.bg;
  ctx.beginPath();
  ctx.roundRect(-10.5, -4.8, 21, 9.6, 2);
  ctx.fill();
  ctx.strokeStyle = s.border;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // 4. Yellow-Black Hazard Chevron Border across top and bottom
  ctx.fillStyle = '#000000';
  ctx.fillRect(-10.5, -4.8, 21, 1.4);
  ctx.fillStyle = '#eab308';
  for (let x = -10; x < 10; x += 3.5) {
    ctx.fillRect(x, -4.8, 1.8, 1.4);
  }

  // 5. Crisp Cyrillic Warning Typography
  ctx.fillStyle = s.fg;
  ctx.font = 'bold 3.6px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(s.text, 0, -0.6);

  ctx.font = 'bold 2.4px sans-serif';
  ctx.fillText(s.sub, 0, 2.6);

  // Mounting rivet heads
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(-9.5, -3.5, 0.8, 0.8);
  ctx.fillRect(8.7, -3.5, 0.8, 0.8);
}

export function renderPropIndustrialPipe(ctx: CanvasRenderingContext2D, _prop: StreetProp) {
  const len = 34;
  const hx = -len / 2;

  // 1. Soft Ground Drop Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(hx + 2, 4, len, 6.5);

  // 2. Overhead Welded Steel Support Portal Frame (желтая П-образная опора)
  ctx.fillStyle = '#eab308';
  ctx.fillRect(hx + 1.5, -6.5, 3.2, 13);
  ctx.fillRect(hx + len - 4.7, -6.5, 3.2, 13);
  ctx.strokeStyle = '#ca8a04';
  ctx.lineWidth = 0.8;
  ctx.strokeRect(hx + 1.5, -6.5, 3.2, 13);
  ctx.strokeRect(hx + len - 4.7, -6.5, 3.2, 13);

  // 3. Twin Insulated Process Pipelines with Aluminum Jacketing (два изолированных трубопровода)
  // Pipe 1 (Top)
  ctx.fillStyle = '#64748b';
  ctx.fillRect(hx, -4.2, len, 3.8);
  // Pipe 2 (Bottom)
  ctx.fillRect(hx, 0.6, len, 3.8);

  // Specular reflection lines along pipe curvature
  ctx.fillStyle = 'rgba(255, 255, 255, 0.38)';
  ctx.fillRect(hx, -3.8, len, 1.1);
  ctx.fillRect(hx, 1.0, len, 1.1);

  // Dark underside shadow on cylinders
  ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
  ctx.fillRect(hx, -1.5, len, 1.1);
  ctx.fillRect(hx, 3.3, len, 1.1);

  // 4. Flanged High-Pressure Bolted Joint Couplings (фланцевые соединения)
  [-8, 0, 8].forEach(x => {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(x - 1.2, -5.2, 2.4, 10.6);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 0.6;
    ctx.strokeRect(x - 1.2, -5.2, 2.4, 10.6);
  });

  // 5. Standard Industrial Safety Color Identification Rings (ГОСТ маркировочные кольца)
  // Yellow ring (Flammable Gas / Fuel) with black arrows
  ctx.fillStyle = '#eab308';
  ctx.fillRect(hx + 6, -4.2, 3.5, 3.8);
  ctx.fillStyle = '#000000';
  ctx.fillRect(hx + 7.5, -2.8, 1.0, 1.0);

  // Blue ring (Coolant / Technical Water)
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(hx + len - 9.5, 0.6, 3.5, 3.8);

  // 6. Brass Pressure Gauge (Манометр) with dial face
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(hx + 11, -5.5, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ca8a04';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(hx + 11, -5.5);
  ctx.lineTo(hx + 12, -6.5);
  ctx.stroke();
}

// --- VILLAGE & ATMOSPHERIC STEPPE PROPS ---

export function renderPropVillageWell(ctx: CanvasRenderingContext2D, prop: StreetProp) {
  // 1. Soft Ground Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.beginPath();
  ctx.ellipse(4, 5, 20, 17, 0.1, 0, Math.PI * 2);
  ctx.fill();

  // 2. Surrounding Packed Dirt & Wet Earth Apron
  ctx.fillStyle = '#4a3319';
  ctx.beginPath();
  ctx.ellipse(0, 1, 19, 17, 0, 0, Math.PI * 2);
  ctx.fill();

  // Tiny moss tufts & pebbles around well perimeter
  ctx.fillStyle = '#3f6212';
  ctx.beginPath();
  ctx.arc(-15, -10, 2.2, 0, Math.PI * 2);
  ctx.arc(14, 12, 2.8, 0, Math.PI * 2);
  ctx.arc(-13, 11, 2.5, 0, Math.PI * 2);
  ctx.arc(16, -9, 2.0, 0, Math.PI * 2);
  ctx.fill();

  // 3. Heavy Weathered Oak Timber Platform (Настил из дубовых плах)
  ctx.fillStyle = '#2e1d13';
  ctx.fillRect(-15, -15, 30, 30);
  ctx.strokeStyle = '#180e07';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(-15, -15, 30, 30);

  // Individual weathered timber planks with wood grain and gaps
  const plankColors = ['#382416', '#422c1b', '#331f13', '#47301e', '#3a2517'];
  for (let i = 0; i < 5; i++) {
    const py = -14 + i * 5.6;
    ctx.fillStyle = plankColors[i % plankColors.length];
    ctx.fillRect(-14, py, 28, 5.0);

    // Plank gap divider
    ctx.strokeStyle = '#150c06';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-14, py);
    ctx.lineTo(14, py);
    ctx.stroke();

    // Small square iron forged nails at plank ends
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-12.5, py + 1.8, 1.2, 1.2);
    ctx.fillRect(11.5, py + 1.8, 1.2, 1.2);
  }

  // Dark water splash puddle on the platform (wet glossy sheen)
  ctx.fillStyle = 'rgba(20, 12, 8, 0.65)';
  ctx.beginPath();
  ctx.ellipse(4, 5, 8, 5, 0.4, 0, Math.PI * 2);
  ctx.fill();

  // 4. Log Wellhead (Бревенчатый сруб колодца «в обло» с выступающими венцами)
  // Main inner log walls
  ctx.fillStyle = '#4a3319';
  ctx.fillRect(-11, -11, 22, 22);
  ctx.strokeStyle = '#1c1008';
  ctx.lineWidth = 1.8;
  ctx.strokeRect(-11, -11, 22, 22);

  // 4 Round Notched Log Ends protruding at the 4 corners («остатки венцов»)
  const cornerLogs = [
    { x: -11, y: -11 },
    { x: 11, y: -11 },
    { x: -11, y: 11 },
    { x: 11, y: 11 }
  ];
  cornerLogs.forEach(cl => {
    // Outer log round
    ctx.fillStyle = '#5c4028';
    ctx.beginPath();
    ctx.arc(cl.x, cl.y, 3.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#27170e';
    ctx.lineWidth = 1.0;
    ctx.stroke();

    // Wood annual growth rings on the cut end
    ctx.strokeStyle = 'rgba(39, 23, 14, 0.6)';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.arc(cl.x, cl.y, 2.2, 0, Math.PI * 2);
    ctx.stroke();

    // Radial seasoning crack in the log end
    ctx.strokeStyle = '#140c06';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(cl.x, cl.y);
    ctx.lineTo(cl.x + 2.4, cl.y + 1.2);
    ctx.stroke();
  });

  // 5. Deep Well Shaft Opening (Тёмный зев колодца)
  ctx.fillStyle = '#06090f';
  ctx.beginPath();
  ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
  ctx.fill();

  // Subtle cold underground water caustic shimmer deep inside
  ctx.fillStyle = 'rgba(56, 189, 248, 0.22)';
  ctx.beginPath();
  ctx.ellipse(-1.8, -1.8, 3.8, 2.5, -0.4, 0, Math.PI * 2);
  ctx.fill();

  // 6. Carved Wooden Winding Drum (Ворот из соснового бревна)
  // Wooden cylinder
  ctx.fillStyle = '#6d4c3d';
  ctx.fillRect(-9, -2.8, 18, 5.6);
  ctx.strokeStyle = '#2d1810';
  ctx.lineWidth = 1.0;
  ctx.strokeRect(-9, -2.8, 18, 5.6);

  // Metal reinforcing binding hoops on both drum ends
  ctx.fillStyle = '#1c1917';
  ctx.fillRect(-8.5, -2.8, 1.4, 5.6);
  ctx.fillRect(7.1, -2.8, 1.4, 5.6);

  // Spiral forged iron chain wrapped around the center of the drum
  ctx.strokeStyle = '#78716c';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (let cx = -4.5; cx <= 4.5; cx += 2.0) {
    ctx.moveTo(cx - 0.6, -2.8);
    ctx.lineTo(cx + 0.6, 2.8);
  }
  ctx.stroke();

  // Chain link highlights
  ctx.strokeStyle = '#d6d3d1';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  for (let cx = -4.5; cx <= 4.5; cx += 2.0) {
    ctx.moveTo(cx - 0.2, -1.0);
    ctx.lineTo(cx + 0.2, 1.0);
  }
  ctx.stroke();

  // 7. Wrought Iron Crank Wheel / Handle (Кованая ручка с деревянной рукоятью)
  ctx.strokeStyle = '#09090b';
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(8.5, 0);
  ctx.lineTo(13.5, 0);
  ctx.lineTo(13.5, 7.5);
  ctx.lineTo(16.0, 7.5);
  ctx.stroke();

  // Wooden grip on crank handle
  ctx.fillStyle = '#854d0e';
  ctx.fillRect(14.0, 6.2, 3.5, 2.6);
  ctx.strokeStyle = '#27170e';
  ctx.lineWidth = 0.6;
  ctx.strokeRect(14.0, 6.2, 3.5, 2.6);

  // 8. Galvanized Iron Bucket on the platform ledge (Окованная бадья)
  const bkX = -7.5;
  const bkY = 6.8;
  // Bucket shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.beginPath();
  ctx.ellipse(bkX + 1.2, bkY + 1.2, 3.8, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Metal bucket body
  ctx.fillStyle = '#64748b';
  ctx.beginPath();
  ctx.arc(bkX, bkY, 3.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Inner water surface inside bucket
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.arc(bkX, bkY, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
  ctx.beginPath();
  ctx.arc(bkX - 0.6, bkY - 0.6, 1.2, 0, Math.PI * 2);
  ctx.fill();

  // Curved bucket bail handle
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.arc(bkX, bkY, 3.6, -Math.PI * 0.75, -Math.PI * 0.25);
  ctx.stroke();

  // 9. Weathered Gabled Shingle Canopy Roof (Двускатный тёсовый навес)
  // North roof slope
  ctx.fillStyle = '#3a2517';
  ctx.fillRect(-13, -7, 26, 7);
  // South roof slope (slightly lighter)
  ctx.fillStyle = '#48301f';
  ctx.fillRect(-13, 0, 26, 7);

  // Weathered wooden shingle grooves across canopy
  ctx.strokeStyle = 'rgba(20, 12, 8, 0.5)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  for (let sx = -11; sx <= 11; sx += 4.5) {
    ctx.moveTo(sx, -7);
    ctx.lineTo(sx, 7);
  }
  ctx.stroke();

  // Moss patches along canopy shingles
  ctx.fillStyle = '#3f6212';
  ctx.beginPath();
  ctx.arc(-8, -4, 2.2, 0, Math.PI * 2);
  ctx.arc(6, -5, 1.8, 0, Math.PI * 2);
  ctx.arc(-4, 3, 1.6, 0, Math.PI * 2);
  ctx.fill();

  // Heavy central ridge beam (конёк навеса)
  ctx.fillStyle = '#24140b';
  ctx.fillRect(-14, -1.8, 28, 3.6);
  ctx.strokeStyle = '#0e0704';
  ctx.lineWidth = 0.8;
  ctx.strokeRect(-14, -1.8, 28, 3.6);
}

export function renderPropVillageSign(ctx: CanvasRenderingContext2D, prop: StreetProp) {
  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.fillRect(-10, 2, 22, 6);

  // Twin rusted steel mounting posts
  ctx.fillStyle = '#475569';
  ctx.fillRect(-8, -3, 2.5, 6);
  ctx.fillRect(6, -3, 2.5, 6);

  // Weathered enamel signboard
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(-12, -4, 24, 8);
  ctx.strokeStyle = '#78350f'; // Rust border
  ctx.lineWidth = 1.2;
  ctx.strokeRect(-12, -4, 24, 8);

  // Red Soviet border stripe
  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = 0.8;
  ctx.strokeRect(-11, -3, 22, 6);

  // Blue pointer arrow & lettering representation
  ctx.fillStyle = '#1e3a8a';
  ctx.beginPath();
  ctx.moveTo(-9, 0);
  ctx.lineTo(-6, -2);
  ctx.lineTo(-6, 2);
  ctx.closePath();
  ctx.fill();

  ctx.fillRect(-4, -1, 13, 2);
}

export function renderPropHaystack(ctx: CanvasRenderingContext2D, prop: StreetProp) {
  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
  ctx.beginPath();
  ctx.ellipse(3, 3, 16, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  // Outer straw base layer (dark golden wheat)
  ctx.fillStyle = '#a16207';
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, Math.PI * 2);
  ctx.fill();

  // Mid tier straw
  ctx.fillStyle = '#ca8a04';
  ctx.beginPath();
  ctx.arc(-1, -1, 11, 0, Math.PI * 2);
  ctx.fill();

  // Top sunlit dome
  ctx.fillStyle = '#eab308';
  ctx.beginPath();
  ctx.arc(-2, -2, 7.5, 0, Math.PI * 2);
  ctx.fill();

  // Organic straw tuft radiating strokes
  ctx.strokeStyle = '#713f12';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
    const rx = Math.cos(a) * 13;
    const ry = Math.sin(a) * 13;
    ctx.moveTo(rx * 0.7, ry * 0.7);
    ctx.lineTo(rx, ry);
  }
  ctx.stroke();

  // Central wooden stake pole sticking out of the apex
  ctx.fillStyle = '#451a03';
  ctx.beginPath();
  ctx.arc(-1.5, -1.5, 1.8, 0, Math.PI * 2);
  ctx.fill();

  // Pole shadow
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-1.5, -1.5);
  ctx.lineTo(5, 5);
  ctx.stroke();
}

export function renderPropWoodpile(ctx: CanvasRenderingContext2D, prop: StreetProp) {
  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(-12, -4, 26, 12);

  // Stacked cut logs bed
  ctx.fillStyle = '#292524';
  ctx.fillRect(-12, -6, 24, 12);

  // Birch log cut ends (circular cross-sections with bark)
  for (let lx = -10; lx <= 10; lx += 4) {
    for (let ly = -4; ly <= 4; ly += 4) {
      ctx.fillStyle = '#f8fafc'; // White birch bark
      ctx.beginPath();
      ctx.arc(lx, ly, 1.9, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fef3c7'; // Wood core
      ctx.beginPath();
      ctx.arc(lx, ly, 1.3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#78350f'; // Annual rings center
      ctx.fillRect(lx - 0.4, ly - 0.4, 0.8, 0.8);
    }
  }

  // Blue weathered protective tarpaulin covering top half
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(-13, -7, 26, 6);
  ctx.strokeStyle = '#0369a1';
  ctx.lineWidth = 0.8;
  ctx.strokeRect(-13, -7, 26, 6);

  // Two red bricks weighing down the tarp
  ctx.fillStyle = '#b91c1c';
  ctx.fillRect(-8, -6, 3, 2);
  ctx.fillRect(5, -6, 3, 2);
}

export function renderPropRusticCarWreck(ctx: CanvasRenderingContext2D, prop: StreetProp) {
  // Ground shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
  ctx.beginPath();
  ctx.ellipse(3, 4, 22, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // 4 Support cinder blocks / red clay bricks under axles
  ctx.fillStyle = '#991b1b';
  ctx.fillRect(-16, -11, 4, 3);
  ctx.fillRect(12, -11, 4, 3);
  ctx.fillRect(-16, 8, 4, 3);
  ctx.fillRect(12, 8, 4, 3);

  // Rusted car chassis frame (Classic Soviet sedan Zhiguli / Moskvitch)
  ctx.fillStyle = '#7c2d12'; // Deep oxidized rust
  ctx.beginPath();
  ctx.roundRect(-19, -9, 38, 18, 4);
  ctx.fill();
  ctx.strokeStyle = '#431407';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Peeling paint patches (burnt orange / mustard yellow)
  ctx.fillStyle = '#b45309';
  ctx.fillRect(-10, -7, 12, 14);

  // Cabin roof
  ctx.fillStyle = '#9a3412';
  ctx.fillRect(-7, -7, 18, 14);
  ctx.strokeStyle = '#3e1505';
  ctx.lineWidth = 1;
  ctx.strokeRect(-7, -7, 18, 14);

  // Shattered cracked windshield (front left)
  ctx.fillStyle = 'rgba(203, 213, 225, 0.35)';
  ctx.beginPath();
  ctx.moveTo(11, -6);
  ctx.lineTo(15, -5);
  ctx.lineTo(15, 5);
  ctx.lineTo(11, 6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.lineWidth = 0.6;
  ctx.stroke();

  // Open / crumpled rusty engine hood
  ctx.fillStyle = '#451a03';
  ctx.fillRect(13, -5, 5, 10);
  ctx.fillStyle = '#1c1917'; // Engine block manifold inside
  ctx.fillRect(14, -3, 3, 6);

  // Wild weeds growing through the wheel wells
  ctx.fillStyle = '#65a30d';
  ctx.fillRect(-18, -12, 2, 4);
  ctx.fillRect(-15, -13, 3, 5);
  ctx.fillRect(10, 9, 3, 5);
  ctx.fillRect(14, 10, 2, 4);
}

export function renderPropConcreteBarrier(ctx: CanvasRenderingContext2D, prop: StreetProp) {
  const bw = 32;
  const bh = 14;
  const hx = -bw / 2;
  const hy = -bh / 2;

  if (prop.isBroken) {
    // Smashed concrete barrier broken in two chunks with exposed rebar
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(hx + 2, hy + 3, bw - 2, bh + 2);

    // Left chunk
    ctx.fillStyle = '#64748b';
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(hx + 12, hy - 1);
    ctx.lineTo(hx + 10, hy + bh);
    ctx.lineTo(hx, hy + bh);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Right chunk tilted
    ctx.save();
    ctx.translate(hx + bw - 7, hy + bh / 2);
    ctx.rotate(0.3);
    ctx.fillStyle = '#475569';
    ctx.fillRect(-8, -bh / 2, 14, bh);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(-8, -bh / 2, 14, bh);
    ctx.restore();

    // Twisted rebar loop
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(hx + 9, hy + 2);
    ctx.lineTo(hx + 15, hy + 5);
    ctx.lineTo(hx + 11, hy + 10);
    ctx.stroke();

    // Rubble debris
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(hx + 13, hy + 1, 2.2, 2);
    ctx.fillRect(hx + 16, hy + 8, 2.5, 2);
    return;
  }

  // Intact State:
  // 1. Directional Ambient Ground Drop Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(hx + 2, hy + 3.5, bw + 2, bh + 3, 2);
  } else {
    ctx.rect(hx + 2, hy + 3.5, bw + 2, bh + 3);
  }
  ctx.fill();

  // 2. Heavy Flared Concrete Base Foot (Широкая подошва блока)
  ctx.fillStyle = '#475569';
  ctx.fillRect(hx, hy + bh - 4.5, bw, 4.5);
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(hx, hy + bh - 4.5, bw, 4.5);

  // 3. Sloped Upper Body (Наклонное тело блока Нью-Джерси)
  ctx.fillStyle = '#64748b';
  ctx.fillRect(hx + 1.5, hy + 2.5, bw - 3, bh - 7);

  // 4. Flat Narrow Top Crest (Верхний гребень блока)
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(hx + 2.5, hy, bw - 5, 2.5);
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1.0;
  ctx.strokeRect(hx + 2.5, hy, bw - 5, 2.5);

  // Top crest highlight
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(hx + 3, hy + 0.5, bw - 6, 0.8);

  // 5. Retroreflective Micro-Prismatic Diagonal Hazard Chevrons (Световозвращающая разметка 45°)
  ctx.save();
  ctx.beginPath();
  ctx.rect(hx + 2, hy + 2.5, bw - 4, bh - 6);
  ctx.clip();

  // White base background
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(hx + 2, hy + 2.5, bw - 4, bh - 6);

  // Diagonal 45-degree high-intensity red hazard stripes
  ctx.fillStyle = '#dc2626';
  for (let sx = hx - 12; sx < hx + bw + 15; sx += 8.5) {
    ctx.beginPath();
    ctx.moveTo(sx, hy + 2.5);
    ctx.lineTo(sx + 4.5, hy + 2.5);
    ctx.lineTo(sx + 4.5 + (bh - 6), hy + bh - 3.5);
    ctx.lineTo(sx + (bh - 6), hy + bh - 3.5);
    ctx.closePath();
    ctx.fill();
  }

  // Microprismatic retroreflective gloss sheen
  ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.fillRect(hx + 2, hy + 2.5, bw - 4, 1.2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
  ctx.fillRect(hx + 2, hy + bh - 4.7, bw - 4, 1.2);
  ctx.restore();

  // 6. Recessed Forklift Pockets & Steel Lifting Pins on Ends
  [-bw / 2 + 3.5, bw / 2 - 5.5].forEach(px => {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(px, hy + bh - 3.2, 2.5, 1.8);
  });

  // Central steel lifting rebar loop
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.arc(0, hy + 1.2, 1.4, 0, Math.PI * 2);
  ctx.stroke();

  // 7. Road Grime & Black Rubber Tire Scuff Marks (притёртости от автомобильных колёс)
  ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
  ctx.fillRect(hx + 5, hy + bh - 2.8, 11, 1.6);
  ctx.fillRect(hx + bw - 14, hy + bh - 2.5, 8, 1.4);
}

export function renderPropPowerPoleBase(ctx: CanvasRenderingContext2D, prop: StreetProp) {
  // Ground dirt mound & shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(2, 2, 5, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#452e1e';
  ctx.beginPath();
  ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
  ctx.fill();

  // Creosote-soaked wooden pole stump
  ctx.fillStyle = '#26170e';
  ctx.beginPath();
  ctx.arc(0, 0, 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#120b07';
  ctx.lineWidth = 1;
  ctx.stroke();
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

  } else if (prop.type === 'lamp') {
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
  } else if (prop.type === 'power_pole') {
    // RURAL WOODEN TELEGRAPH / POWER TRANSMISSION POLE
    const angle = prop.angle || 0;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    // Crossarm direction perpendicular to pole alignment
    const perpX = -sinA;
    const perpY = cosA;

    // Ground shadow of pole and crossarm
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(4, 5, 6, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(4 - perpX * 14, 5 - perpY * 14);
    ctx.lineTo(4 + perpX * 14, 5 + perpY * 14);
    ctx.stroke();

    // Wooden crossarm beam (траверса)
    ctx.strokeStyle = '#3e2723';
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'square';
    ctx.beginPath();
    ctx.moveTo(-perpX * 14, -perpY * 14);
    ctx.lineTo(perpX * 14, perpY * 14);
    ctx.stroke();

    // Crossarm steel diagonal support bracket
    ctx.strokeStyle = '#1c1917';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(-perpX * 8, -perpY * 8);
    ctx.lineTo(0, 0);
    ctx.lineTo(perpX * 8, perpY * 8);
    ctx.stroke();

    // 3 Ceramic / glass bell insulators (изоляторы ШФ-10)
    [-10, 0, 10].forEach(offset => {
      const ix = perpX * offset;
      const iy = perpY * offset;

      // Ceramic bell insulator (dark brown / amber glazed porcelain)
      ctx.fillStyle = '#3e2723';
      ctx.beginPath();
      ctx.arc(ix, iy, 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Steel pin core
      ctx.fillStyle = '#1c1917';
      ctx.beginPath();
      ctx.arc(ix, iy, 1.0, 0, Math.PI * 2);
      ctx.fill();
    });

    // Central pole top cap
    ctx.fillStyle = '#27170e';
    ctx.beginPath();
    ctx.arc(0, 0, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0f0a06';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
}

// --- 22. INDUSTRIAL ENTRANCE GATE (ВЪЕЗДНЫЕ ВОРОТА КПП С КИРПИЧНЫМИ СТОЛБАМИ) ---
export function renderPropIndustrialGate(ctx: CanvasRenderingContext2D, prop: StreetProp) {
  if (prop.isBroken) {
    // Destroyed gate checkpoint: broken brick pillar, bent steel gate leaf on ground
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(-35, -15, 70, 30);

    // Left fractured pillar
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-38, -6, 12, 12);
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(-38, -6, 12, 12);

    // Scattered brick rubble
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = '#9a3412';
      ctx.fillRect(-22 + i * 7, -8 + (i % 3) * 6, 4, 3);
    }

    // Twisted, detached steel gate leaf
    ctx.save();
    ctx.translate(5, 2);
    ctx.rotate(0.35);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.strokeRect(-18, -2, 36, 4);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-10, -2, 6, 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-4, -2, 6, 4);
    ctx.restore();
    return;
  }

  // --- INTACT HIGH-FIDELITY INDUSTRIAL ENTRANCE GATE ---
  const spanW = 76; // 76px wide driveway gate span
  const hW = spanW / 2; // 38

  // 1. Asphalt Entrance Threshold Pad & Stop Markings
  ctx.fillStyle = '#334155';
  ctx.fillRect(-hW - 4, -14, spanW + 8, 28);
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1;
  ctx.strokeRect(-hW - 4, -14, spanW + 8, 28);

  // Painted White Stop Line across driveway
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(-hW + 6, -1.5, spanW - 12, 3.0);

  // Red/Yellow Diagonal Warning Stripes on threshold curb
  for (let sx = -hW + 4; sx <= hW - 10; sx += 12) {
    ctx.fillStyle = (sx / 12) % 2 === 0 ? '#dc2626' : '#facc15';
    ctx.fillRect(sx, -13, 8, 2);
    ctx.fillRect(sx, 11, 8, 2);
  }

  // 2. Heavy Brick / Concrete Gate Posts (Столбы КПП с пирамидальными крышками)
  [-hW, hW - 12].forEach((px, idx) => {
    // Post Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(px + 2, -6, 12, 14);

    // Red Brick / Masonry Body
    ctx.fillStyle = '#78350f';
    ctx.fillRect(px, -6, 12, 12);
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(px, -6, 12, 12);

    // Brick mortar joints
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(px, -2); ctx.lineTo(px + 12, -2);
    ctx.moveTo(px, 2);  ctx.lineTo(px + 12, 2);
    ctx.stroke();

    // Inner Face Warning Hazard Stripes (желто-черная зебра на торцах столбов)
    const innerX = idx === 0 ? px + 9.5 : px;
    for (let sy = -6; sy < 6; sy += 3) {
      ctx.fillStyle = (sy / 3) % 2 === 0 ? '#eab308' : '#0f172a';
      ctx.fillRect(innerX, sy, 2.5, 3);
    }

    // Concrete Pyramid Cap (Бетонный оголовок)
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(px - 1, -6);
    ctx.lineTo(px + 6, -9);
    ctx.lineTo(px + 13, -6);
    ctx.lineTo(px + 6, -3);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Red Reflector Light on top
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(px + 6, -9, 1.8, 0, Math.PI * 2);
    ctx.fill();
  });

  // 3. Opened Heavy Steel Double Gate Leaves (Распашные открытые створки ворот)
  // Left Gate Leaf (Angles back -60° into compound yard)
  ctx.save();
  ctx.translate(-hW + 10, -3);
  ctx.rotate(-0.85); // Opened inward
  renderGateLeaf(ctx, 32);
  ctx.restore();

  // Right Gate Leaf (Angles back +60° into compound yard)
  ctx.save();
  ctx.translate(hW - 10, -3);
  ctx.rotate(Math.PI + 0.85); // Opened inward
  renderGateLeaf(ctx, 32);
  ctx.restore();

  // 4. Yellow Safety Bollards in front of pillars
  ctx.fillStyle = '#eab308';
  ctx.beginPath();
  ctx.arc(-hW - 3, 8, 2.5, 0, Math.PI * 2);
  ctx.arc(hW + 3, 8, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 0.8;
  ctx.stroke();
}

function renderGateLeaf(ctx: CanvasRenderingContext2D, length: number) {
  // Gate Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fillRect(0, 2, length, 3);

  // Outer Tubular Steel Frame (Industrial Green)
  ctx.fillStyle = '#15803d';
  ctx.fillRect(0, -2, length, 4);
  ctx.strokeStyle = '#052e16';
  ctx.lineWidth = 1.0;
  ctx.strokeRect(0, -2, length, 4);

  // Vertical Tubular Pickets (Решетка ворот)
  ctx.strokeStyle = '#166534';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  for (let x = 4; x < length - 2; x += 4) {
    ctx.moveTo(x, -2);
    ctx.lineTo(x, 2);
  }
  ctx.stroke();

  // Red/White Diagonal Warning Panel on center of leaf
  const pw = 12;
  const px = (length - pw) / 2;
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(px, -2, pw, 4);
  for (let s = 0; s < pw; s += 3) {
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.moveTo(px + s, -2);
    ctx.lineTo(px + s + 2, -2);
    ctx.lineTo(px + s, 2);
    ctx.lineTo(px + s - 2, 2);
    ctx.closePath();
    ctx.fill();
  }

  // Circular Speed Limit / STOP Decal on gate
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(length * 0.75, 0, 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(length * 0.75, 0, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(length * 0.75 - 1.2, -0.5, 2.4, 1.0);
}

// ==========================================
// --- COTTAGE DISTRICT INFRASTRUCTURE PROPS ---
// ==========================================

// --- 1. VERTICAL WOODEN PICKET FENCE (ДЕРЕВЯННЫЙ ВЕРТИКАЛЬНЫЙ ШТАКЕТНИК) ---
export function renderPropFenceWoodVertical(ctx: CanvasRenderingContext2D, prop: StreetProp) {
  let hash = 0;
  const idStr = prop.id || 'fence_wood';
  for (let i = 0; i < idStr.length; i++) hash = (hash * 31 + idStr.charCodeAt(i)) >>> 0;

  const w = 36;
  const halfW = w / 2; // 18

  // Natural wood tone palettes based on deterministic hash
  const palettes = [
    { main: '#b45309', light: '#d97706', dark: '#78350f', post: '#542907' }, // Classic warm pine
    { main: '#92400e', light: '#b45309', dark: '#542907', post: '#3b1c04' }, // Cedar stain
    { main: '#78716c', light: '#a8a29e', dark: '#44403c', post: '#292524' }, // Weathered grey timber
    { main: '#15803d', light: '#22c55e', dark: '#166534', post: '#14532d' }, // Country green paint
  ];
  const pal = palettes[hash % palettes.length];

  if (prop.isBroken) {
    // Smashed / derelict wooden fence: snapped rails, tilted pickets, splinters
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.fillRect(-halfW, 3, w, 6);

    // Snapped posts
    ctx.fillStyle = pal.post;
    ctx.fillRect(-halfW, -3, 4, 8);
    ctx.fillRect(halfW - 4, -1, 4, 7);

    // Broken horizontal stringers askew
    ctx.save();
    ctx.rotate(0.18);
    ctx.fillStyle = pal.dark;
    ctx.fillRect(-halfW + 3, -2, halfW, 2.2);
    ctx.restore();

    ctx.save();
    ctx.rotate(-0.25);
    ctx.fillStyle = pal.dark;
    ctx.fillRect(0, 1, halfW - 2, 2.2);
    ctx.restore();

    // Tilted and missing pickets
    const pickets = [-14, -10, -6, -2, 3, 7, 12];
    pickets.forEach((px, idx) => {
      if ((hash + idx) % 4 === 0) return; // knocked completely off
      ctx.save();
      const tilt = ((hash * (idx + 1)) % 7 - 3) * 0.12;
      ctx.translate(px, 0);
      ctx.rotate(tilt);
      ctx.fillStyle = pal.main;
      ctx.fillRect(-1.5, -3.5, 3, 7);
      ctx.fillStyle = pal.light;
      ctx.fillRect(-1.5, -3.5, 1, 7);
      ctx.restore();
    });

    // Splinter debris on ground
    ctx.fillStyle = pal.main;
    ctx.fillRect(-8, 4, 3.5, 1.2);
    ctx.fillRect(5, 5, 4.0, 1.0);
    ctx.fillRect(2, -4, 2.5, 1.2);
    return;
  }

  // --- INTACT STATE ---
  // 1. Soft ground contact shadow under fence
  ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
  ctx.fillRect(-halfW - 1, 2.5, w + 2, 3.5);

  // 2. Square Timber End Posts (Опорные деревянные столбы)
  ctx.fillStyle = pal.post;
  ctx.fillRect(-halfW - 1, -4, 4.5, 8);
  ctx.fillRect(halfW - 3.5, -4, 4.5, 8);

  // Post top pyramid cap highlights
  ctx.fillStyle = pal.light;
  ctx.fillRect(-halfW - 0.5, -3.5, 3.5, 1.5);
  ctx.fillRect(halfW - 3, -3.5, 3.5, 1.5);

  // 3. Two Horizontal Joists / Stringer Beams (Продольные деревянные прожилины)
  ctx.fillStyle = pal.dark;
  ctx.fillRect(-halfW + 3, -2.5, w - 6, 2.2);
  ctx.fillRect(-halfW + 3, 0.6, w - 6, 2.2);

  // Stringer bevel highlight
  ctx.fillStyle = pal.light;
  ctx.fillRect(-halfW + 3, -2.5, w - 6, 0.6);
  ctx.fillRect(-halfW + 3, 0.6, w - 6, 0.6);

  // 4. Vertical Pickets (Штакетины) neatly spaced with shaped tops
  const picketStep = 4.2;
  const startX = -halfW + 4;
  const picketCount = 7;

  for (let i = 0; i < picketCount; i++) {
    const px = startX + i * picketStep;
    const picketW = 2.8;
    const picketH = 7.2;
    const topY = -picketH / 2;

    // Drop shadow under individual picket
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.fillRect(px - picketW / 2 + 0.6, topY + 0.6, picketW, picketH);

    // Main picket body
    ctx.fillStyle = pal.main;
    ctx.beginPath();
    ctx.roundRect(px - picketW / 2, topY, picketW, picketH, 1.2);
    ctx.fill();

    // Wood grain highlight strip on left edge
    ctx.fillStyle = pal.light;
    ctx.fillRect(px - picketW / 2, topY + 0.4, 0.8, picketH - 0.8);

    // Darker shadow bevel on right edge
    ctx.fillStyle = pal.dark;
    ctx.fillRect(px + picketW / 2 - 0.7, topY + 0.4, 0.7, picketH - 0.8);

    // Fastening nail heads at joist intersections
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(px - 0.4, -1.8, 0.8, 0.8);
    ctx.fillRect(px - 0.4, 1.3, 0.8, 0.8);
  }
}

// --- 2. VERTICAL METAL FENCE / CORRUGATED PROFILE (ЗАБОР ИЗ ПРОФНАСТИЛА / ЕВРОШТАКЕТНИКА) ---
export function renderPropFenceMetalVertical(ctx: CanvasRenderingContext2D, prop: StreetProp) {
  let hash = 0;
  const idStr = prop.id || 'fence_metal';
  for (let i = 0; i < idStr.length; i++) hash = (hash * 31 + idStr.charCodeAt(i)) >>> 0;

  const w = 36;
  const halfW = w / 2; // 18

  // Popular suburban color coats
  const palettes = [
    { base: '#3b2015', light: '#5c3321', dark: '#24130c', cap: '#1c0f0a' }, // RAL 8017 Chocolate
    { base: '#14532d', light: '#166534', dark: '#052e16', cap: '#052e16' }, // RAL 6005 Moss Green
    { base: '#1e293b', light: '#334155', dark: '#0f172a', cap: '#0f172a' }, // RAL 7016 Anthracite
    { base: '#831843', light: '#9d174d', dark: '#500724', cap: '#4c0519' }, // RAL 3005 Wine Red
  ];
  const pal = palettes[hash % palettes.length];

  if (prop.isBroken) {
    // Smashed corrugated sheet: bent sheet, buckled posts
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(-halfW, 2, w, 7);

    // Bent left post
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-halfW, -3, 3.5, 7);

    // Crumpled corrugated sheet
    ctx.save();
    ctx.rotate(0.24);
    ctx.fillStyle = pal.base;
    ctx.fillRect(-halfW + 4, -4, halfW + 4, 8);
    // Scratch exposing silver zinc/steel core
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(-halfW + 6, -2, halfW, 1.2);
    ctx.restore();

    ctx.save();
    ctx.rotate(-0.18);
    ctx.fillStyle = pal.dark;
    ctx.fillRect(0, 0, halfW - 3, 7);
    ctx.restore();
    return;
  }

  // --- INTACT STATE ---
  // 1. Concrete / brick plinth foundation strip underneath
  ctx.fillStyle = '#57534e';
  ctx.fillRect(-halfW - 1, -2, w + 2, 4);
  ctx.fillStyle = '#78716c';
  ctx.fillRect(-halfW - 1, -2, w + 2, 0.8);

  // 2. Tubular steel posts with pyramid caps
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-halfW - 1, -3.5, 3.8, 7);
  ctx.fillRect(halfW - 2.8, -3.5, 3.8, 7);

  ctx.fillStyle = '#475569';
  ctx.fillRect(-halfW - 0.5, -3.5, 2.8, 1.2);
  ctx.fillRect(halfW - 2.3, -3.5, 2.8, 1.2);

  // 3. Corrugated vertical ribs profile (трапециевидный профиль профлиста)
  const ribW = 3.6;
  for (let rx = -halfW + 3; rx < halfW - 4; rx += ribW) {
    // Shaded trough
    ctx.fillStyle = pal.dark;
    ctx.fillRect(rx, -2.5, ribW * 0.5, 5);

    // Raised crest
    ctx.fillStyle = pal.base;
    ctx.fillRect(rx + ribW * 0.5, -3, ribW * 0.5, 6);

    // Specular highlight on edge of crest
    ctx.fillStyle = pal.light;
    ctx.fillRect(rx + ribW * 0.5, -3, 0.8, 6);

    // Self-tapping roofing screws with colored washer
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(rx + ribW * 0.5 + 0.3, -1.8, 0.7, 0.7);
    ctx.fillRect(rx + ribW * 0.5 + 0.3, 1.2, 0.7, 0.7);
  }

  // 4. Protective top finish coping rail (П-образная финишная планка)
  ctx.fillStyle = pal.cap;
  ctx.fillRect(-halfW + 2, -3.2, w - 4, 1.2);
  ctx.fillStyle = pal.light;
  ctx.fillRect(-halfW + 2, -3.2, w - 4, 0.4);
}

// --- 3. WICKET GATE (АККУРАТНАЯ КАЛИТКА С РУЧКОЙ И ЗАМКОМ) ---
export function renderPropWicketGate(ctx: CanvasRenderingContext2D, prop: StreetProp) {
  const w = 26;
  const halfW = 13;

  if (prop.isBroken) {
    // Unhinged wicket hanging loose
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(-halfW, 2, w, 6);

    // Posts still standing
    ctx.fillStyle = '#451a03';
    ctx.fillRect(-halfW - 1, -4, 4, 8);
    ctx.fillRect(halfW - 3, -4, 4, 8);

    // Tilted gate leaf
    ctx.save();
    ctx.rotate(0.38);
    ctx.fillStyle = '#92400e';
    ctx.fillRect(-halfW + 3, -3, w - 6, 6);
    ctx.restore();
    return;
  }

  // 1. Flagstone / concrete threshold paver on ground under wicket
  ctx.fillStyle = '#78716c';
  ctx.fillRect(-halfW - 1, -5, w + 2, 10);
  ctx.strokeStyle = '#a8a29e';
  ctx.lineWidth = 1;
  ctx.strokeRect(-halfW - 1, -5, w + 2, 10);

  // Transverse joint line on threshold
  ctx.strokeStyle = '#44403c';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(0, -5);
  ctx.lineTo(0, 5);
  ctx.stroke();

  // 2. Flanking Decorative Brick / Steel Pillars with Caps
  ctx.fillStyle = '#7f1d1d'; // warm red brick
  ctx.fillRect(-halfW - 2, -4.5, 5, 9);
  ctx.fillRect(halfW - 3, -4.5, 5, 9);

  // Pillar brick joint pattern
  ctx.strokeStyle = '#fecaca';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(-halfW - 2, 0); ctx.lineTo(-halfW + 3, 0);
  ctx.moveTo(halfW - 3, 0); ctx.lineTo(halfW + 2, 0);
  ctx.stroke();

  // Pillar concrete cap stones with bevel
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(-halfW - 2.5, -5.2, 6, 2.2);
  ctx.fillRect(halfW - 3.5, -5.2, 6, 2.2);

  // 3. Gate Leaf Frame & Infill Pickets (Створка калитки)
  const leafW = w - 6;
  ctx.fillStyle = '#b45309';
  ctx.fillRect(-halfW + 3, -2.8, leafW, 5.6);

  // Inner frame bevel
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 1;
  ctx.strokeRect(-halfW + 3, -2.8, leafW, 5.6);

  // Diagonal support brace (укосина)
  ctx.strokeStyle = '#542907';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-halfW + 4, -2.2);
  ctx.lineTo(halfW - 4, 2.2);
  ctx.stroke();

  // Slender vertical infill slats
  ctx.fillStyle = '#d97706';
  for (let sx = -halfW + 6; sx < halfW - 4; sx += 3.4) {
    ctx.fillRect(sx, -2.4, 1.8, 4.8);
  }

  // 4. Heavy Steel Hinges on left post
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-halfW + 1.5, -2.2, 2.5, 1.2);
  ctx.fillRect(-halfW + 1.5, 1.2, 2.5, 1.2);

  // 5. Polished Brass Lever Handle & Escutcheon Plate (Ручка и замок калитки)
  ctx.fillStyle = '#f59e0b'; // brass plate
  ctx.fillRect(halfW - 4.5, -0.6, 1.8, 2.8);
  // Lever handle sticking out
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(halfW - 5.5, -0.2, 2.0, 0.8);
  // Keyhole
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(halfW - 4.1, 1.0, 0.8, 0.8);
}

// --- 4. COTTAGE VEHICLE GATE (ШИРОКИЕ ВЪЕЗДНЫЕ ВОРОТА ВО ДВОР / В ГАРАЖ) ---
export function renderPropCottageGate(ctx: CanvasRenderingContext2D, prop: StreetProp) {
  const w = 72;
  const halfW = 36;

  if (prop.isBroken) {
    // Smashed vehicular gate: bent steel leaves, shattered brick pillar
    ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
    ctx.fillRect(-halfW, 3, w, 8);

    // Left gate leaf bent wide
    ctx.save();
    ctx.translate(-halfW + 5, 0);
    ctx.rotate(0.5);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, -3, 30, 6);
    ctx.restore();

    // Right gate leaf buckled inwards
    ctx.save();
    ctx.translate(halfW - 5, 0);
    ctx.rotate(-0.35);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-30, -3, 30, 6);
    ctx.restore();

    // Crumbled brick chunks on ground
    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(-halfW - 2, 4, 3, 2);
    ctx.fillRect(halfW + 1, 5, 2.5, 2.5);
    return;
  }

  // 1. Gravel / Concrete Driveway Threshold (Въездной пандус)
  ctx.fillStyle = '#57534e';
  ctx.fillRect(-halfW - 2, -6, w + 4, 12);
  ctx.strokeStyle = '#78716c';
  ctx.lineWidth = 1;
  ctx.strokeRect(-halfW - 2, -6, w + 4, 12);

  // Wheel rut guide lines through gate threshold
  ctx.fillStyle = '#3a2514';
  ctx.fillRect(-halfW + 8, -6, 8, 12);
  ctx.fillRect(halfW - 16, -6, 8, 12);

  // 2. Heavy Brick Entrance Pillars with Pyramidal Stone Caps
  const pillarW = 6.5;
  const pillarH = 10;
  // Left Pillar
  ctx.fillStyle = '#991b1b'; // clinker red brick
  ctx.fillRect(-halfW - pillarW + 1, -pillarH / 2, pillarW, pillarH);
  ctx.fillStyle = '#cbd5e1'; // stone pyramid cap
  ctx.fillRect(-halfW - pillarW, -pillarH / 2 - 1, pillarW + 2, 2.2);

  // Right Pillar
  ctx.fillStyle = '#991b1b';
  ctx.fillRect(halfW - 1, -pillarH / 2, pillarW, pillarH);
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(halfW - 2, -pillarH / 2 - 1, pillarW + 2, 2.2);

  // 3. Two Swinging Gate Leaves (Левая и правая створки ворот)
  const leafW = halfW - 2;

  // Left leaf
  ctx.fillStyle = '#1e293b'; // Charcoal graphite gate frame
  ctx.fillRect(-halfW + 2, -2.6, leafW, 5.2);
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1;
  ctx.strokeRect(-halfW + 2, -2.6, leafW, 5.2);

  // Left leaf diagonal cross-brace
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-halfW + 3, -2.0); ctx.lineTo(-2, 2.0);
  ctx.moveTo(-halfW + 3, 2.0); ctx.lineTo(-2, -2.0);
  ctx.stroke();

  // Left leaf vertical bars
  ctx.fillStyle = '#475569';
  for (let bx = -halfW + 6; bx < -4; bx += 4) {
    ctx.fillRect(bx, -2.2, 1.5, 4.4);
  }

  // Right leaf
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(1, -2.6, leafW, 5.2);
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1;
  ctx.strokeRect(1, -2.6, leafW, 5.2);

  // Right leaf diagonal cross-brace
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(2, -2.0); ctx.lineTo(halfW - 3, 2.0);
  ctx.moveTo(2, 2.0); ctx.lineTo(halfW - 3, -2.0);
  ctx.stroke();

  // Right leaf vertical bars
  ctx.fillStyle = '#475569';
  for (let bx = 5; bx < halfW - 5; bx += 4) {
    ctx.fillRect(bx, -2.2, 1.5, 4.4);
  }

  // 4. Heavy Steel Strap Hinges on Pillars
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-halfW, -2.2, 4, 1.4);
  ctx.fillRect(-halfW, 1.0, 4, 1.4);
  ctx.fillRect(halfW - 4, -2.2, 4, 1.4);
  ctx.fillRect(halfW - 4, 1.0, 4, 1.4);

  // 5. Central Vertical Locking Drop-Bolt & Floor Receiver Stop
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(-0.8, -1.2, 1.6, 3.4);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-1.2, 1.5, 2.4, 1.2);
}

// --- 5. GARDEN PATH TILE / STEPPING STONES (ШАГОВЫЕ САДОВЫЕ ПЛИТЫ С ЦВЕТОЧНЫМИ КЛУМБАМИ) ---
export function renderPropGardenPathTile(ctx: CanvasRenderingContext2D, prop: StreetProp) {
  let hash = 0;
  const idStr = prop.id || 'path_tile';
  for (let i = 0; i < idStr.length; i++) hash = (hash * 31 + idStr.charCodeAt(i)) >>> 0;

  // 3 Natural irregular sandstone flagstones (натуральный плитняк)
  const stones = [
    { dx: -8, dy: -1, rx: 6.5, ry: 4.5, angle: 0.15 },
    { dx: 0, dy: 1, rx: 5.5, ry: 5.0, angle: -0.22 },
    { dx: 8, dy: -0.5, rx: 6.0, ry: 4.2, angle: 0.10 }
  ];

  stones.forEach((st, idx) => {
    ctx.save();
    ctx.translate(st.dx, st.dy);
    ctx.rotate(st.angle);

    // Drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.ellipse(0.8, 1.2, st.rx, st.ry, 0, 0, Math.PI * 2);
    ctx.fill();

    // Stone base tone (warm natural sandstone or grey river slab)
    const stoneHue = idx % 2 === 0 ? '#78716c' : '#854d0e';
    ctx.fillStyle = stoneHue;
    ctx.beginPath();
    ctx.ellipse(0, 0, st.rx, st.ry, 0, 0, Math.PI * 2);
    ctx.fill();

    // Surface texture highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.beginPath();
    ctx.ellipse(-1.2, -1.0, st.rx * 0.65, st.ry * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();

    // Dark chisel edge
    ctx.strokeStyle = 'rgba(28, 25, 23, 0.4)';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    ctx.restore();
  });

  // Small flower blossoms / clover sprouts along the stone edges
  if (hash % 2 === 0) {
    // Little pink/white cottage blossoms
    ctx.fillStyle = '#ec4899';
    ctx.beginPath();
    ctx.arc(-4, -6, 1.4, 0, Math.PI * 2);
    ctx.arc(5, 5, 1.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(-4.3, -6.3, 0.7, 0.7);
    ctx.fillRect(4.7, 4.7, 0.7, 0.7);
  }
}

