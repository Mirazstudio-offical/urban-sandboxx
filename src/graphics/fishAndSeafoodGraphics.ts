// Procedural 2D Canvas Models for Fish & Seafood (Photorealistic Studio 2.5D)
import {
  drawShadow,
  drawGlassJarShell,
  drawLitSphere,
  drawLitEllipse,
  drawStudioLabelPanel,
  adjustHex,
  hexToRgba,
  hash01
} from './itemGraphicShared';

interface FishPalette {
  dorsal: string;
  body: string;
  belly: string;
  fins: string;
  fleshLight: string;
  flesh: string;
  fleshDeep: string;
  stripes?: string;
  dots?: string;
  caviarLight: string;
  caviar: string;
  caviarDeep: string;
}

const FISH_PALETTES: Record<string, FishPalette> = {
  salmon: {
    dorsal: '#334155',
    body: '#94a3b8',
    belly: '#f8fafc',
    fins: '#475569',
    fleshLight: '#fdba74',
    flesh: '#f97316',
    fleshDeep: '#c2410c',
    dots: '#1e293b',
    caviarLight: '#fb923c',
    caviar: '#ea580c',
    caviarDeep: '#7c2d12'
  },
  tuna: {
    dorsal: '#0f172a',
    body: '#1e3a8a',
    belly: '#cbd5e1',
    fins: '#ca8a04',
    fleshLight: '#f43f5e',
    flesh: '#be123c',
    fleshDeep: '#4c0519',
    caviarLight: '#52525b',
    caviar: '#18181b',
    caviarDeep: '#09090b'
  },
  cod: {
    dorsal: '#3f3f46',
    body: '#71717a',
    belly: '#f4f4f5',
    fins: '#52525b',
    fleshLight: '#ffffff',
    flesh: '#f1f5f9',
    fleshDeep: '#cbd5e1',
    dots: '#27272a',
    caviarLight: '#fcd34d',
    caviar: '#d97706',
    caviarDeep: '#78350f'
  },
  perch: {
    dorsal: '#365314',
    body: '#65a30d',
    belly: '#fef9c3',
    fins: '#dc2626',
    fleshLight: '#fff1f2',
    flesh: '#ffe4e6',
    fleshDeep: '#fecdd3',
    stripes: '#14532d',
    caviarLight: '#fde047',
    caviar: '#ca8a04',
    caviarDeep: '#713f12'
  },
  herring: {
    dorsal: '#0c4a6e',
    body: '#38bdf8',
    belly: '#f8fafc',
    fins: '#64748b',
    fleshLight: '#fecdd3',
    flesh: '#fda4af',
    fleshDeep: '#be123c',
    caviarLight: '#fde047',
    caviar: '#eab308',
    caviarDeep: '#854d0e'
  },
  pike: {
    dorsal: '#1a2e05',
    body: '#4d7c0f',
    belly: '#ecfccb',
    fins: '#854d0e',
    fleshLight: '#ffffff',
    flesh: '#f8fafc',
    fleshDeep: '#cbd5e1',
    dots: '#fef08a',
    caviarLight: '#facc15',
    caviar: '#d97706',
    caviarDeep: '#713f12'
  },
  eel: {
    dorsal: '#1e293b',
    body: '#334155',
    belly: '#94a3b8',
    fins: '#0f172a',
    fleshLight: '#ffedd5',
    flesh: '#fdba74',
    fleshDeep: '#c2410c',
    caviarLight: '#52525b',
    caviar: '#18181b',
    caviarDeep: '#09090b'
  },
  catfish: {
    dorsal: '#1e293b',
    body: '#475569',
    belly: '#cbd5e1',
    fins: '#334155',
    fleshLight: '#fff1f2',
    flesh: '#fecaca',
    fleshDeep: '#b91c1c',
    dots: '#0f172a',
    caviarLight: '#52525b',
    caviar: '#18181b',
    caviarDeep: '#09090b'
  }
};

export function drawFishAndSeafoodItem(ctx: CanvasRenderingContext2D, itemId: string): boolean {
  for (const fish of ['salmon', 'tuna', 'cod', 'perch', 'herring', 'pike', 'eel', 'catfish']) {
    if (itemId.startsWith(`${fish}_`)) {
      const cut = itemId.slice(fish.length + 1);
      const pal = FISH_PALETTES[fish] || FISH_PALETTES.salmon;
      return drawFishCut(ctx, cut, pal, fish);
    }
  }

  switch (itemId) {
    case 'squid_tubes': {
      drawShadow(ctx, 8.2, 2.8, 7.6, 0.25);

      // Back lower squid mantle tube
      ctx.save();
      ctx.translate(0.6, 1.8);
      ctx.rotate(-0.12);
      drawSquidTube(ctx, 0.88, false);
      ctx.restore();

      // Main foreground pearlescent squid tube
      ctx.save();
      ctx.translate(-0.4, -0.8);
      ctx.rotate(-0.22);
      drawSquidTube(ctx, 1.0, true);
      ctx.restore();
      return true;
    }

    case 'squid_tentacles': {
      drawShadow(ctx, 7.5, 3.0, 7.8, 0.26);

      const arms = [
        { pts: [-6.5, 2.5, -1.5, 5.2, 5.5, 2.2], w: 1.9, dark: '#9f1239', mid: '#f43f5e', hi: '#fecdd3' },
        { pts: [-6.0, -0.2, 0.2, 1.8, 6.8, -1.4], w: 2.1, dark: '#be123c', mid: '#fb7185', hi: '#ffe4e6' },
        { pts: [-4.8, -3.0, 1.2, -4.8, 5.8, -2.8], w: 1.7, dark: '#9f1239', mid: '#e11d48', hi: '#fda4af' },
        { pts: [-3.5, 3.8, 1.8, 6.0, 4.6, 4.0], w: 1.5, dark: '#881337', mid: '#e11d48', hi: '#fda4af' }
      ];

      for (const arm of arms) {
        const [x0, y0, cx, cy, x1, y1] = arm.pts;
        // Shadow core
        ctx.strokeStyle = arm.dark;
        ctx.lineWidth = arm.w + 0.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x0, y0 + 0.35);
        ctx.quadraticCurveTo(cx, cy + 0.4, x1, y1 + 0.3);
        ctx.stroke();

        // Mid fleshy gradient body
        const aGrad = ctx.createLinearGradient(x0, y0 - 1, x1, y1 + 1);
        aGrad.addColorStop(0, arm.hi);
        aGrad.addColorStop(0.5, arm.mid);
        aGrad.addColorStop(1, arm.dark);
        ctx.strokeStyle = aGrad;
        ctx.lineWidth = arm.w;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.quadraticCurveTo(cx, cy, x1, y1);
        ctx.stroke();

        // Wet specular ridge
        ctx.strokeStyle = 'rgba(255, 241, 242, 0.55)';
        ctx.lineWidth = 0.45;
        ctx.beginPath();
        ctx.moveTo(x0 + 0.8, y0 - 0.35);
        ctx.quadraticCurveTo(cx, cy - 0.35, x1 - 0.8, y1 - 0.25);
        ctx.stroke();

        // Rim-lit suction cups along inner curve
        for (let t = 0.18; t <= 0.85; t += 0.17) {
          const mt = 1 - t;
          const sx = mt * mt * x0 + 2 * mt * t * cx + t * t * x1;
          const sy = mt * mt * y0 + 2 * mt * t * cy + t * t * y1 + arm.w * 0.36;
          drawLitSphere(ctx, sx, sy, 0.58, '#ffffff', '#fecdd3', '#be123c', undefined, 0.45);
        }
      }
      return true;
    }

    case 'octopus_whole': {
      drawShadow(ctx, 8.2, 3.2, 8.2, 0.3);

      // Back curled tentacles
      const backArms: Array<[number, number, number, number, number, number]> = [
        [-2.4, -0.4, -7.8, 1.5, -6.2, 5.6],
        [2.4, -0.4, 7.8, 1.5, 6.2, 5.6],
        [-1.0, 0.4, -5.2, 4.8, -3.2, 7.0],
        [1.0, 0.4, 5.2, 4.8, 3.2, 7.0]
      ];
      for (const [x0, y0, cx, cy, x1, y1] of backArms) {
        ctx.strokeStyle = '#581c87';
        ctx.lineWidth = 2.1;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.quadraticCurveTo(cx, cy, x1, y1);
        ctx.stroke();
      }

      // Bulbous mottled mantle head
      ctx.save();
      const headGrad = ctx.createRadialGradient(-1.6, -4.6, 0.4, 0, -2.8, 5.5);
      headGrad.addColorStop(0.0, '#d8b4fe');
      headGrad.addColorStop(0.35, '#9333ea');
      headGrad.addColorStop(0.82, '#581c87');
      headGrad.addColorStop(1.0, '#3b0764');
      ctx.fillStyle = headGrad;
      ctx.beginPath();
      ctx.moveTo(0, -7.4);
      ctx.bezierCurveTo(4.2, -7.4, 5.4, -3.8, 3.4, -0.5);
      ctx.quadraticCurveTo(0, 0.8, -3.4, -0.5);
      ctx.bezierCurveTo(-5.4, -3.8, -4.2, -7.4, 0, -7.4);
      ctx.closePath();
      ctx.fill();

      // Subtle mottled skin spots
      ctx.fillStyle = 'rgba(243, 232, 255, 0.24)';
      for (const [px, py, r] of [[-1.8, -4.8, 0.65], [1.4, -5.2, 0.55], [-0.4, -3.2, 0.7], [2.1, -3.0, 0.5]]) {
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Wet mantle specular catchlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
      ctx.beginPath();
      ctx.ellipse(-1.6, -5.0, 1.3, 0.65, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Foreground curling tentacles with suckers
      const frontArms: Array<[number, number, number, number, number, number]> = [
        [-2.0, -0.2, -5.8, 3.0, -4.4, 6.4],
        [2.0, -0.2, 5.8, 3.0, 4.4, 6.4],
        [-0.7, 0.2, -2.5, 4.8, -0.8, 7.2],
        [0.7, 0.2, 2.5, 4.8, 0.8, 7.2]
      ];
      for (const [x0, y0, cx, cy, x1, y1] of frontArms) {
        const tGrad = ctx.createLinearGradient(x0, y0, x1, y1);
        tGrad.addColorStop(0, '#9333ea');
        tGrad.addColorStop(0.5, '#7e22ce');
        tGrad.addColorStop(1, '#4c1d95');
        ctx.strokeStyle = tGrad;
        ctx.lineWidth = 1.9;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.quadraticCurveTo(cx, cy, x1, y1);
        ctx.stroke();

        // Pale suckers
        for (let t = 0.28; t <= 0.85; t += 0.26) {
          const mt = 1 - t;
          const sx = mt * mt * x0 + 2 * mt * t * cx + t * t * x1;
          const sy = mt * mt * y0 + 2 * mt * t * cy + t * t * y1 + 0.55;
          drawLitSphere(ctx, sx, sy, 0.52, '#ffffff', '#f3e8ff', '#9333ea', undefined, 0.4);
        }
      }

      // Hooded octopus eyes
      for (const side of [-1, 1]) {
        ctx.fillStyle = '#3b0764';
        ctx.beginPath();
        ctx.ellipse(side * 2.1, -1.3, 0.9, 0.7, side * 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.ellipse(side * 2.1, -1.3, 0.55, 0.4, side * 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(side * 2.1 - 0.35, -1.42, 0.7, 0.22);
      }
      return true;
    }

    case 'octopus_tentacles': {
      drawShadow(ctx, 7.6, 3.0, 7.8, 0.28);

      // Tapering coiled thick purple octopus arm
      const segs = 16;
      for (let i = 0; i < segs; i++) {
        const t = i / (segs - 1);
        const angle = -0.75 + t * Math.PI * 1.48;
        const rad = 4.6 - t * 0.7;
        const x = Math.cos(angle) * rad;
        const y = Math.sin(angle) * rad;
        const r = 2.4 * (1 - t * 0.68);
        drawLitSphere(ctx, x, y, r, '#c084fc', '#7e22ce', '#3b0764', '#9333ea', t < 0.6 ? 0.35 : 0.15);
      }

      // Cut cross-section meat ring on thick base end
      ctx.save();
      ctx.translate(Math.cos(-0.75) * 4.6, Math.sin(-0.75) * 4.6);
      ctx.rotate(-0.75);
      drawLitEllipse(ctx, 0, 0, 1.5, 2.2, 0, '#ffffff', '#f3e8ff', '#a855f7', undefined, 0.3);
      ctx.restore();

      // Inner twin rows of detailed creamy suction cups
      for (let i = 1; i < segs - 1; i += 2) {
        const t = i / (segs - 1);
        const angle = -0.75 + t * Math.PI * 1.48;
        const rad = 3.2 - t * 0.45;
        const sx = Math.cos(angle) * rad;
        const sy = Math.sin(angle) * rad;
        const sr = Math.max(0.35, 0.85 * (1 - t * 0.55));
        drawLitSphere(ctx, sx, sy, sr, '#ffffff', '#fae8ff', '#7e22ce', undefined, 0.4);
      }
      return true;
    }

    case 'shrimp_king': {
      drawShadow(ctx, 7.6, 2.9, 7.8, 0.25);

      // Fine antennae curving back
      ctx.strokeStyle = 'rgba(234, 88, 12, 0.68)';
      ctx.lineWidth = 0.45;
      ctx.beginPath();
      ctx.moveTo(4.2, -3.6);
      ctx.bezierCurveTo(7.5, -5.5, 6.2, 0.5, 1.5, 0.8);
      ctx.moveTo(4.0, -3.2);
      ctx.bezierCurveTo(6.8, -3.5, 5.2, 1.2, 0.8, 1.6);
      ctx.stroke();

      // Articulated overlapping prawn segments (head -> tail C-curl)
      const segs = 7;
      for (let i = segs - 1; i >= 0; i--) {
        const t = i / (segs - 1);
        const a = -0.35 * Math.PI + t * Math.PI * 1.22;
        const rad = 4.3;
        const sx = Math.cos(a) * rad;
        const sy = Math.sin(a) * rad * 0.9;
        const r = 2.35 * (1 - t * 0.48);

        drawLitSphere(
          ctx,
          sx,
          sy,
          r,
          '#ffedd5',
          i % 2 === 0 ? '#fb923c' : '#f97316',
          '#9a3412',
          '#fed7aa',
          0.6
        );

        // Translucent pearl segment border ridge
        ctx.strokeStyle = 'rgba(255, 247, 237, 0.72)';
        ctx.lineWidth = 0.45;
        ctx.beginPath();
        ctx.arc(sx, sy, r * 0.88, a - 0.9, a + 0.9);
        ctx.stroke();
      }

      // Tail uropod fan
      ctx.save();
      ctx.translate(-3.8, 2.4);
      ctx.rotate(2.2);
      const tailGrad = ctx.createLinearGradient(0, -1.5, 2.8, 1.5);
      tailGrad.addColorStop(0, '#fb923c');
      tailGrad.addColorStop(1, '#c2410c');
      ctx.fillStyle = tailGrad;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(2.8, -1.6);
      ctx.lineTo(2.2, 0);
      ctx.lineTo(2.8, 1.6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Glossy black compound eye on carapace head
      drawLitSphere(ctx, 3.0, -3.6, 0.72, '#475569', '#0f172a', '#020617', undefined, 0.9);
      return true;
    }

    case 'mussels_half_shell': {
      drawShadow(ctx, 7.8, 3.1, 7.8, 0.28);

      ctx.save();
      ctx.rotate(-0.22);

      // Deep slate-blue ribbed mussel outer shell
      const outerGrad = ctx.createLinearGradient(-7, -4, 7, 5);
      outerGrad.addColorStop(0, '#334155');
      outerGrad.addColorStop(0.5, '#0f172a');
      outerGrad.addColorStop(1, '#020617');
      ctx.fillStyle = outerGrad;
      ctx.beginPath();
      ctx.moveTo(-7.2, 0.4);
      ctx.bezierCurveTo(-5.5, -4.6, 4.2, -5.2, 7.2, -0.4);
      ctx.bezierCurveTo(6.2, 4.8, -3.8, 5.2, -7.2, 0.4);
      ctx.closePath();
      ctx.fill();

      // Mother-of-pearl iridescent nacre lining
      const nacreGrad = ctx.createLinearGradient(-6, -3, 6, 3);
      nacreGrad.addColorStop(0, '#cbd5e1');
      nacreGrad.addColorStop(0.35, '#e2e8f0');
      nacreGrad.addColorStop(0.7, '#a5f3fc');
      nacreGrad.addColorStop(1, '#64748b');
      ctx.fillStyle = nacreGrad;
      ctx.beginPath();
      ctx.ellipse(0.1, 0, 6.2, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Dark blue-violet shell lip rim
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 0.75;
      ctx.stroke();

      // Inner dark shadow cavity
      ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
      ctx.beginPath();
      ctx.ellipse(0.3, 0.25, 5.2, 2.7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Plump golden-coral mussel meat with mantle fringe
      drawLitEllipse(ctx, 0.2, 0, 4.4, 2.25, 0.05, '#fed7aa', '#f97316', '#9a3412', '#fb923c', 0.65);

      // Creamy adductor muscle belly
      drawLitEllipse(ctx, -1.2, -0.1, 1.5, 1.15, 0, '#fffbeb', '#fde68a', '#d97706', undefined, 0.55);

      // Dark mantle rim edge
      ctx.strokeStyle = 'rgba(124, 45, 18, 0.65)';
      ctx.lineWidth = 0.55;
      ctx.beginPath();
      ctx.ellipse(0.2, 0, 4.2, 2.05, 0.05, -0.4, Math.PI + 0.4);
      ctx.stroke();

      ctx.restore();
      return true;
    }

    case 'scallops_fresh': {
      drawShadow(ctx, 7.6, 3.0, 7.8, 0.24);

      const scallops = [
        { x: -3.6, y: -1.8, r: 3.1 },
        { x: 3.5, y: -1.3, r: 2.9 },
        { x: 0.1, y: 2.3, r: 3.3 }
      ];

      for (const s of scallops) {
        // Cylindrical medallion height wall
        const sideGrad = ctx.createLinearGradient(s.x - s.r, s.y, s.x + s.r, s.y);
        sideGrad.addColorStop(0, '#e2d9c5');
        sideGrad.addColorStop(0.5, '#fef3c7');
        sideGrad.addColorStop(1, '#b4a58b');
        ctx.fillStyle = sideGrad;
        ctx.beginPath();
        ctx.ellipse(s.x, s.y + 1.0, s.r, s.r * 0.72, 0, 0, Math.PI * 2);
        ctx.fill();

        // Top ivory pearlescent scallop face with delicate golden crust ring
        drawLitEllipse(ctx, s.x, s.y, s.r, s.r * 0.74, -0.1, '#ffffff', '#fefce8', '#e7dec8', '#fde68a', 0.52);

        // Subtle muscle striation arc on scallop face
        ctx.strokeStyle = 'rgba(217, 119, 6, 0.36)';
        ctx.lineWidth = 0.45;
        ctx.beginPath();
        ctx.ellipse(s.x, s.y, s.r * 0.85, s.r * 0.62, -0.1, 0.2, Math.PI * 1.4);
        ctx.stroke();

        // Delicate cross-hatch sear lines
        ctx.strokeStyle = 'rgba(180, 83, 9, 0.22)';
        ctx.lineWidth = 0.4;
        ctx.beginPath();
        ctx.moveTo(s.x - s.r * 0.5, s.y - s.r * 0.25);
        ctx.lineTo(s.x + s.r * 0.5, s.y + s.r * 0.25);
        ctx.moveTo(s.x - s.r * 0.4, s.y + s.r * 0.25);
        ctx.lineTo(s.x + s.r * 0.4, s.y - s.r * 0.25);
        ctx.stroke();
      }
      return true;
    }

    case 'crab_legs': {
      drawShadow(ctx, 8.4, 3.1, 7.8, 0.28);

      // Lower leg segment (merus) from bottom-left to top joint
      const drawLegSeg = (x1: number, y1: number, x2: number, y2: number, r1: number, r2: number) => {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;

        const g = ctx.createLinearGradient(x1 + nx * r1, y1 + ny * r1, x1 - nx * r1, y1 - ny * r1);
        g.addColorStop(0, '#fca5a5');
        g.addColorStop(0.28, '#ef4444');
        g.addColorStop(0.7, '#b91c1c');
        g.addColorStop(1, '#7f1d1d');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x1 + nx * r1, y1 + ny * r1);
        ctx.lineTo(x2 + nx * r2, y2 + ny * r2);
        ctx.lineTo(x2 - nx * r2, y2 - ny * r2);
        ctx.lineTo(x1 - nx * r1, y1 - ny * r1);
        ctx.closePath();
        ctx.fill();

        // Pale cream underside shell highlight
        ctx.strokeStyle = 'rgba(254, 242, 242, 0.55)';
        ctx.lineWidth = 0.65;
        ctx.beginPath();
        ctx.moveTo(x1 + nx * r1 * 0.45, y1 + ny * r1 * 0.45);
        ctx.lineTo(x2 + nx * r2 * 0.45, y2 + ny * r2 * 0.45);
        ctx.stroke();
      };

      drawLegSeg(-7.0, 4.0, -0.4, -4.4, 1.85, 1.65);
      drawLegSeg(-0.4, -4.4, 7.0, 2.8, 1.55, 0.85);

      // Sweet flaky crab meat peeking out at cut base end
      drawLitEllipse(ctx, -7.0, 4.0, 1.4, 1.75, -0.7, '#ffffff', '#fee2e2', '#dc2626', undefined, 0.45);

      // Articulated pale cartilage knuckle joint
      drawLitSphere(ctx, -0.4, -4.4, 1.85, '#ffffff', '#f8fafc', '#cbd5e1', '#fca5a5', 0.65);

      // Calcareous white king-crab spines
      ctx.fillStyle = '#fff1f2';
      const spines: Array<[number, number, number, number]> = [
        [-4.8, 0.4, -5.8, -0.7],
        [-2.8, -2.0, -3.8, -3.2],
        [1.8, -2.8, 2.9, -4.0],
        [4.2, -0.4, 5.2, -1.5]
      ];
      for (const [bx, by, tx, ty] of spines) {
        ctx.beginPath();
        ctx.moveTo(bx - 0.4, by + 0.4);
        ctx.lineTo(tx, ty);
        ctx.lineTo(bx + 0.5, by + 0.1);
        ctx.closePath();
        ctx.fill();
      }
      return true;
    }

    default:
      return false;
  }
}

function drawSquidTube(ctx: CanvasRenderingContext2D, scale: number, isFront: boolean) {
  ctx.save();
  ctx.scale(scale, scale);

  // Translucent lateral mantle fins
  const finGrad = ctx.createLinearGradient(2, -4, 7, 3);
  finGrad.addColorStop(0, '#ffe4e6');
  finGrad.addColorStop(1, '#fda4af');
  ctx.fillStyle = finGrad;
  ctx.beginPath();
  ctx.moveTo(2.4, -1.6);
  ctx.quadraticCurveTo(6.2, -4.6, 7.6, -0.6);
  ctx.lineTo(3.2, 0.4);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(2.4, 1.4);
  ctx.quadraticCurveTo(6.2, 4.0, 7.4, 0.4);
  ctx.lineTo(3.2, -0.2);
  ctx.closePath();
  ctx.fill();

  // Conical pearlescent squid tube mantle
  const bodyGrad = ctx.createLinearGradient(0, -3.2, 0, 3.2);
  bodyGrad.addColorStop(0, isFront ? '#fff1f2' : '#ffe4e6');
  bodyGrad.addColorStop(0.42, '#ffffff');
  bodyGrad.addColorStop(0.78, '#fecdd3');
  bodyGrad.addColorStop(1, '#fb7185');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.moveTo(-5.8, -2.7);
  ctx.bezierCurveTo(-1.0, -2.6, 4.0, -1.8, 7.5, -0.2);
  ctx.bezierCurveTo(4.0, 1.8, -1.0, 2.7, -5.8, 2.7);
  ctx.closePath();
  ctx.fill();

  // Moist sheen ridge
  ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
  ctx.beginPath();
  ctx.ellipse(-0.5, -1.1, 4.0, 0.55, 0.08, 0, Math.PI * 2);
  ctx.fill();

  // Open cylindrical ring rim + shadowed hollow interior
  ctx.fillStyle = '#ffe4e6';
  ctx.beginPath();
  ctx.ellipse(-5.8, 0, 1.15, 2.7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#be123c';
  ctx.beginPath();
  ctx.ellipse(-5.7, 0, 0.72, 1.95, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawFishCut(ctx: CanvasRenderingContext2D, cut: string, pal: FishPalette, fish: string): boolean {
  switch (cut) {
    case 'whole': {
      drawShadow(ctx, 8.8, 2.9, 7.8, 0.26);

      if (fish === 'eel') {
        // Serpentine glossy eel body
        const eelGrad = ctx.createLinearGradient(-8, -3, 8, 3);
        eelGrad.addColorStop(0, pal.dorsal);
        eelGrad.addColorStop(0.5, pal.body);
        eelGrad.addColorStop(1, pal.fins);

        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 4.1;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-7.6, -0.2);
        ctx.bezierCurveTo(-3.6, -4.8, -1.0, 4.5, 3.0, -1.6);
        ctx.quadraticCurveTo(5.6, -4.2, 8.0, 0.8);
        ctx.stroke();

        ctx.strokeStyle = eelGrad;
        ctx.lineWidth = 3.2;
        ctx.stroke();

        // Pale underside shimmer
        ctx.strokeStyle = pal.belly;
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(-7.0, 0.5);
        ctx.bezierCurveTo(-3.6, -3.6, -1.0, 5.2, 3.0, -0.8);
        ctx.stroke();

        // Dorsal fin ribbon along spine
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(-4.2, -2.5);
        ctx.bezierCurveTo(-2.6, -4.2, -0.8, 2.2, 3.4, -2.5);
        ctx.stroke();

        // Small eye & mouth
        drawLitSphere(ctx, -6.4, -0.6, 0.65, '#f8fafc', '#eab308', '#422006', undefined, 0.85);
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(-6.5, -0.6, 0.28, 0, Math.PI * 2);
        ctx.fill();
        return true;
      }

      // Dorsal & Ventral fins (behind body)
      ctx.fillStyle = hexToRgba(pal.fins, 0.88);
      ctx.beginPath();
      ctx.moveTo(-2.2, -3.1);
      ctx.lineTo(0.2, -6.2);
      ctx.lineTo(3.0, -2.8);
      ctx.closePath();
      ctx.fill();

      // Pelvic & anal fins
      ctx.beginPath();
      ctx.moveTo(-1.0, 2.8);
      ctx.lineTo(0.6, 5.2);
      ctx.lineTo(2.4, 2.8);
      ctx.closePath();
      ctx.fill();

      // Caudal tail fin on right with fine fin rays
      const tailGrad = ctx.createLinearGradient(5.8, -3.8, 9.2, 3.8);
      tailGrad.addColorStop(0, pal.fins);
      tailGrad.addColorStop(1, adjustHex(pal.fins, -0.25));
      ctx.fillStyle = tailGrad;
      ctx.beginPath();
      ctx.moveTo(5.8, 0);
      ctx.quadraticCurveTo(7.4, -2.6, 9.2, -3.8);
      ctx.quadraticCurveTo(7.8, 0, 9.2, 3.8);
      ctx.quadraticCurveTo(7.4, 2.6, 5.8, 0);
      ctx.closePath();
      ctx.fill();

      // Fin rays
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.lineWidth = 0.35;
      ctx.beginPath();
      ctx.moveTo(6.0, -0.2); ctx.lineTo(8.8, -3.0);
      ctx.moveTo(6.0, 0.0); ctx.lineTo(8.2, 0.0);
      ctx.moveTo(6.0, 0.2); ctx.lineTo(8.8, 3.0);
      ctx.stroke();

      // Main fusiform fish silhouette
      const drawBodyPath = () => {
        ctx.beginPath();
        ctx.moveTo(-8.4, 0.2);
        ctx.bezierCurveTo(-5.8, -4.1, 1.5, -4.4, 6.4, -0.6);
        ctx.lineTo(6.4, 0.7);
        ctx.bezierCurveTo(1.5, 4.3, -5.6, 4.1, -8.4, 0.2);
        ctx.closePath();
      };

      const bodyGrad = ctx.createLinearGradient(0, -4.0, 0, 4.0);
      bodyGrad.addColorStop(0.0, pal.dorsal);
      bodyGrad.addColorStop(0.32, pal.body);
      bodyGrad.addColorStop(0.68, pal.belly);
      bodyGrad.addColorStop(1.0, adjustHex(pal.belly, -0.18));
      ctx.fillStyle = bodyGrad;
      drawBodyPath();
      ctx.fill();

      // Clip inside fish body for iridescent lateral line, scales & markings
      ctx.save();
      drawBodyPath();
      ctx.clip();

      // Iridescent sheen along mid flank
      const sheenGrad = ctx.createLinearGradient(-7, -1, 5, 1);
      sheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
      sheenGrad.addColorStop(0.45, 'rgba(255, 255, 255, 0.36)');
      sheenGrad.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
      ctx.fillStyle = sheenGrad;
      ctx.fillRect(-8.5, -1.6, 15, 2.2);

      // Subtle diamond scale cross-hatch
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
      ctx.lineWidth = 0.25;
      for (let x = -4; x <= 5; x += 1.4) {
        ctx.beginPath();
        ctx.moveTo(x, -3.5);
        ctx.lineTo(x - 1.8, 3.5);
        ctx.moveTo(x - 1.8, -3.5);
        ctx.lineTo(x, 3.5);
        ctx.stroke();
      }

      if (pal.stripes) {
        ctx.fillStyle = hexToRgba(pal.stripes, 0.62);
        for (const sx of [-2.8, -0.6, 1.6, 3.6]) {
          ctx.beginPath();
          ctx.moveTo(sx - 0.5, -4);
          ctx.lineTo(sx + 0.6, -4);
          ctx.lineTo(sx + 0.1, 1.5);
          ctx.lineTo(sx - 0.5, 1.5);
          ctx.closePath();
          ctx.fill();
        }
      }
      if (pal.dots) {
        ctx.fillStyle = hexToRgba(pal.dots, 0.72);
        for (let i = 0; i < 8; i++) {
          const dx = -3.4 + hash01(fish, i * 2) * 7.8;
          const dy = -2.6 + hash01(fish, i * 2 + 1) * 2.5;
          ctx.beginPath();
          ctx.arc(dx, dy, 0.42, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Gill plate (operculum) carved crescent
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.5)';
      ctx.lineWidth = 0.65;
      ctx.beginPath();
      ctx.arc(-5.6, 0.1, 2.3, -Math.PI * 0.42, Math.PI * 0.42);
      ctx.stroke();

      // Lateral sensory line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 0.35;
      ctx.beginPath();
      ctx.moveTo(-3.6, -0.3);
      ctx.quadraticCurveTo(1.2, -0.6, 5.8, 0.0);
      ctx.stroke();
      ctx.restore();

      // Pectoral fin right behind operculum
      ctx.fillStyle = hexToRgba(pal.fins, 0.75);
      ctx.beginPath();
      ctx.ellipse(-2.9, 1.25, 1.75, 0.78, -0.35, 0, Math.PI * 2);
      ctx.fill();

      // Catfish whiskers
      if (fish === 'catfish') {
        ctx.strokeStyle = pal.dorsal;
        ctx.lineWidth = 0.55;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-7.6, -0.2); ctx.quadraticCurveTo(-9.2, -1.6, -9.8, -2.5);
        ctx.moveTo(-7.6, 0.8); ctx.quadraticCurveTo(-9.0, 2.2, -9.5, 3.2);
        ctx.stroke();
      }

      // Glassy realistic fish eye
      drawLitSphere(ctx, -6.1, -0.65, 1.05, '#ffffff', '#e2e8f0', '#64748b', undefined, 0.9);
      ctx.fillStyle = '#090d16';
      ctx.beginPath();
      ctx.arc(-6.2, -0.65, 0.56, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-6.45, -0.88, 0.22, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    case 'fillet': {
      drawShadow(ctx, 8.2, 3.1, 7.8, 0.25);

      // 3D tapered fillet silhouette (skin bed visible underneath bottom edge)
      ctx.fillStyle = pal.dorsal;
      ctx.beginPath();
      ctx.moveTo(-7.8, 1.8);
      ctx.bezierCurveTo(-4.0, 3.8, 3.2, 3.6, 7.8, 1.5);
      ctx.lineTo(7.6, 2.4);
      ctx.bezierCurveTo(3.2, 4.4, -4.0, 4.5, -7.8, 2.6);
      ctx.closePath();
      ctx.fill();

      // Plump translucent wet fillet flesh prism
      const filletGrad = ctx.createLinearGradient(-7, -3.5, 7, 3.5);
      filletGrad.addColorStop(0.0, pal.fleshLight);
      filletGrad.addColorStop(0.5, pal.flesh);
      filletGrad.addColorStop(1.0, pal.fleshDeep);

      const drawFilletPath = () => {
        ctx.beginPath();
        ctx.moveTo(-7.8, 1.6);
        ctx.bezierCurveTo(-7.6, -2.8, -2.5, -4.2, 3.5, -3.0);
        ctx.quadraticCurveTo(7.2, -2.2, 7.8, 1.4);
        ctx.bezierCurveTo(3.2, 3.2, -4.0, 3.4, -7.8, 1.6);
        ctx.closePath();
      };

      ctx.fillStyle = filletGrad;
      drawFilletPath();
      ctx.fill();

      ctx.save();
      drawFilletPath();
      ctx.clip();

      // Delicate white translucent fat myosepta chevrons
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.62)';
      ctx.lineWidth = 0.65;
      ctx.lineCap = 'round';
      for (let x = -5.6; x <= 6.2; x += 1.65) {
        ctx.beginPath();
        ctx.moveTo(x - 1.1, -3.8);
        ctx.quadraticCurveTo(x + 0.4, -0.4, x - 0.9, 3.4);
        ctx.stroke();
      }

      // Moist oil/protein sheen along top bevel
      ctx.fillStyle = 'rgba(255, 255, 255, 0.34)';
      ctx.beginPath();
      ctx.ellipse(-1.2, -1.6, 4.8, 0.85, -0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return true;
    }

    case 'steak': {
      drawShadow(ctx, 7.8, 3.2, 7.8, 0.28);

      // Extruded thickness rim (skin wall)
      const skinGrad = ctx.createLinearGradient(-7.2, 0, 7.2, 0);
      skinGrad.addColorStop(0, pal.dorsal);
      skinGrad.addColorStop(0.5, pal.body);
      skinGrad.addColorStop(1, pal.dorsal);
      ctx.fillStyle = skinGrad;
      ctx.beginPath();
      ctx.ellipse(0, 0.75, 7.4, 5.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Steak cut face
      const steakGrad = ctx.createRadialGradient(-2.0, -1.8, 0.5, 0, 0, 7.2);
      steakGrad.addColorStop(0, pal.fleshLight);
      steakGrad.addColorStop(0.58, pal.flesh);
      steakGrad.addColorStop(1, pal.fleshDeep);

      const drawSteakTop = () => {
        ctx.beginPath();
        ctx.ellipse(0, -0.2, 6.8, 4.65, 0, 0, Math.PI * 2);
      };
      ctx.fillStyle = steakGrad;
      drawSteakTop();
      ctx.fill();

      // Skin collar trim
      ctx.strokeStyle = pal.dorsal;
      ctx.lineWidth = 0.85;
      ctx.stroke();

      ctx.save();
      drawSteakTop();
      ctx.clip();

      // Left & right concentric muscle myotome rings
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.lineWidth = 0.55;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(side * 3.1, -0.2, 2.6, 3.2, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(side * 3.1, -0.2, 1.4, 1.9, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Vertical collagen midline septum
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(0, -4.8);
      ctx.lineTo(0, 4.4);
      ctx.stroke();

      // Belly cavity cleft
      ctx.fillStyle = 'rgba(15, 23, 42, 0.25)';
      ctx.beginPath();
      ctx.ellipse(0, 2.4, 2.2, 1.1, 0, 0, Math.PI * 2);
      ctx.fill();

      // Central spinal vertebra bone + marrow dot
      drawLitSphere(ctx, 0, -0.4, 1.45, '#ffffff', '#f1f5f9', '#94a3b8', undefined, 0.5);
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.arc(0, -0.4, 0.5, 0, Math.PI * 2);
      ctx.fill();

      // Glistening specular catchlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.beginPath();
      ctx.ellipse(-2.6, -2.0, 2.4, 0.9, -0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return true;
    }

    case 'head': {
      drawShadow(ctx, 7.2, 3.0, 7.8, 0.26);

      // Collar flesh cut behind gill plate
      const collarGrad = ctx.createLinearGradient(2.2, -4.5, 5.2, 4.5);
      collarGrad.addColorStop(0, '#991b1b');
      collarGrad.addColorStop(0.5, '#dc2626');
      collarGrad.addColorStop(1, '#7f1d1d');
      ctx.fillStyle = collarGrad;
      ctx.beginPath();
      ctx.ellipse(3.6, 0, 2.2, 4.4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Feathering red gill lamellae arcs
      ctx.strokeStyle = '#fca5a5';
      ctx.lineWidth = 0.42;
      for (const r of [3.4, 2.6]) {
        ctx.beginPath();
        ctx.arc(2.8, 0, r, -Math.PI * 0.36, Math.PI * 0.36);
        ctx.stroke();
      }

      // Metallic contoured head armor & snout
      const hGrad = ctx.createLinearGradient(0, -4.8, 0, 4.8);
      hGrad.addColorStop(0, pal.dorsal);
      hGrad.addColorStop(0.45, pal.body);
      hGrad.addColorStop(0.85, pal.belly);
      hGrad.addColorStop(1, adjustHex(pal.belly, -0.2));
      ctx.fillStyle = hGrad;
      ctx.beginPath();
      ctx.moveTo(-6.8, 0.3);
      ctx.bezierCurveTo(-4.8, -3.5, 0.6, -5.0, 3.9, -4.4);
      ctx.quadraticCurveTo(2.4, 0, 3.9, 4.4);
      ctx.bezierCurveTo(0.6, 4.9, -4.5, 3.6, -6.8, 0.3);
      ctx.closePath();
      ctx.fill();

      // Jaw & operculum seams
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.5)';
      ctx.lineWidth = 0.55;
      ctx.beginPath();
      ctx.moveTo(-6.6, 0.5);
      ctx.quadraticCurveTo(-4.2, 1.2, -2.2, 1.8);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-0.2, 0.2, 3.0, -Math.PI * 0.4, Math.PI * 0.4);
      ctx.stroke();

      // Domed glassy eye
      drawLitSphere(ctx, -3.0, -1.0, 1.35, '#ffffff', '#e2e8f0', '#64748b', undefined, 0.9);
      ctx.fillStyle = '#090d16';
      ctx.beginPath();
      ctx.arc(-3.15, -1.0, 0.72, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-3.45, -1.3, 0.28, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    case 'skeleton': {
      drawShadow(ctx, 8.2, 2.6, 7.8, 0.22);

      // Forked tail fin bones
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 0.7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(6.2, 0); ctx.lineTo(8.8, -3.4);
      ctx.moveTo(6.2, 0); ctx.lineTo(8.6, -1.5);
      ctx.moveTo(6.2, 0); ctx.lineTo(8.6, 1.5);
      ctx.moveTo(6.2, 0); ctx.lineTo(8.8, 3.4);
      ctx.stroke();

      // Arched delicate rib spines & dorsal rays
      for (let x = -4.0; x <= 4.6; x += 1.45) {
        const h = 3.2 - Math.abs(x) * 0.36;
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 0.65;
        ctx.beginPath();
        ctx.moveTo(x, -h);
        ctx.quadraticCurveTo(x + 0.5, -h * 0.4, x, 0);
        ctx.quadraticCurveTo(x + 0.5, h * 0.4, x, h);
        ctx.stroke();
      }

      // Segmented vertebral spine
      for (let x = -5.0; x <= 6.0; x += 1.1) {
        drawLitSphere(ctx, x, 0, 0.62, '#ffffff', '#e2e8f0', '#64748b', undefined, 0.4);
      }

      // Sculpted fish cranium bone
      drawLitEllipse(ctx, -6.5, 0.1, 2.2, 1.6, 0, '#ffffff', '#e2e8f0', '#94a3b8', undefined, 0.4);
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.arc(-6.6, -0.35, 0.58, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    case 'caviar_jar': {
      drawShadow(ctx, 6.8, 2.7, 7.8, 0.26);

      drawGlassJarShell(ctx, -5.0, -3.8, 10.0, 10.8, 1.9, '#fbbf24', '#92400e', () => {
        // Dark deep roe shadow backdrop
        ctx.fillStyle = pal.caviarDeep;
        ctx.fillRect(-5, -2.0, 10, 10);

        // Packed glittering translucent roe spheres
        const rows = [
          [-3.2, -0.8], [-1.3, -1.0], [0.8, -0.8], [2.9, -0.9],
          [-2.3, 0.9], [-0.3, 0.8], [1.8, 1.0], [3.5, 0.8],
          [-3.4, 2.6], [-1.5, 2.7], [0.6, 2.5], [2.7, 2.8],
          [-2.4, 4.4], [-0.4, 4.6], [1.7, 4.3], [3.6, 4.5],
          [-3.1, 6.0], [-1.0, 6.1], [1.1, 6.0], [3.0, 6.1]
        ];
        for (const [rx, ry] of rows) {
          drawLitSphere(ctx, rx, ry, 1.15, pal.caviarLight, pal.caviar, pal.caviarDeep, undefined, 0.88);
        }
      });

      // Gold-embossed obsidian studio belly label with crest & micro-barcode
      drawStudioLabelPanel(ctx, -4.4, 2.0, 8.8, 3.7, {
        paperColor: '#0f172a',
        bandColor: '#1e293b',
        accentColor: '#fbbf24',
        inkColor: '#fde68a',
        goldFoil: true,
        hasBarcode: true,
        emblem: 'crest',
        cylindrical: true
      });
      return true;
    }

    default:
      return false;
  }
}
