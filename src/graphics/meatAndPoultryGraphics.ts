// Procedural 2D Canvas Models for Meat, Offal and Poultry (Photorealistic 2.5D Studio Art)
import {
  drawShadow,
  drawLitSphere,
  drawLitEllipse,
  drawOrganicBlobPath,
  adjustHex,
  hexToRgba,
  hash01
} from './itemGraphicShared';

interface MeatPalette {
  primary: string;
  dark: string;
  deep: string;
  light: string;
  fat: string;
  fatCap: string;
  silverskin: string;
}

const MEAT_PALETTES: Record<string, MeatPalette> = {
  beef: {
    primary: '#991b1b',
    dark: '#6b1212',
    deep: '#450a0a',
    light: '#dc2626',
    fat: '#fef3c7',
    fatCap: '#fef08a',
    silverskin: '#e2e8f0'
  },
  pork: {
    primary: '#db5c79',
    dark: '#9d2c4a',
    deep: '#6d1b32',
    light: '#f48ea6',
    fat: '#fff5f7',
    fatCap: '#fef2f2',
    silverskin: '#f1f5f9'
  },
  mutton: {
    primary: '#8c2318',
    dark: '#5e140c',
    deep: '#3d0a05',
    light: '#c2410c',
    fat: '#fef3c7',
    fatCap: '#fde68a',
    silverskin: '#e2e8f0'
  },
  venison: {
    primary: '#6f112a',
    dark: '#4a071a',
    deep: '#29030e',
    light: '#9f1239',
    fat: '#f8fafc',
    fatCap: '#e2e8f0',
    silverskin: '#cbd5e1'
  },
  goat: {
    primary: '#9a3412',
    dark: '#6c220a',
    deep: '#431407',
    light: '#c2410c',
    fat: '#fef9c3',
    fatCap: '#fef3c7',
    silverskin: '#e2e8f0'
  }
};

interface BirdPalette {
  skinHighlight: string;
  skin: string;
  skinDark: string;
  meatLight: string;
  meat: string;
  meatDark: string;
  bone: string;
  follicle: string;
}

const BIRD_PALETTES: Record<string, BirdPalette> = {
  chicken: {
    skinHighlight: '#fff7ed',
    skin: '#fed7aa',
    skinDark: '#ea8c55',
    meatLight: '#fecaca',
    meat: '#f87171',
    meatDark: '#b91c1c',
    bone: '#f8fafc',
    follicle: 'rgba(180, 83, 9, 0.25)'
  },
  duck: {
    skinHighlight: '#ffedd5',
    skin: '#fdba74',
    skinDark: '#c2410c',
    meatLight: '#fca5a5',
    meat: '#dc2626',
    meatDark: '#7f1d1d',
    bone: '#f1f5f9',
    follicle: 'rgba(154, 52, 18, 0.28)'
  },
  goose: {
    skinHighlight: '#fef9c3',
    skin: '#fcd34d',
    skinDark: '#b45309',
    meatLight: '#f87171',
    meat: '#b91c1c',
    meatDark: '#7f1d1d',
    bone: '#f1f5f9',
    follicle: 'rgba(146, 64, 14, 0.28)'
  },
  turkey: {
    skinHighlight: '#fff7ed',
    skin: '#fde6d2',
    skinDark: '#c26943',
    meatLight: '#fecdd3',
    meat: '#e1697c',
    meatDark: '#9f1239',
    bone: '#f8fafc',
    follicle: 'rgba(154, 52, 18, 0.22)'
  },
  pheasant: {
    skinHighlight: '#fef3c7',
    skin: '#f6cf7e',
    skinDark: '#92400e',
    meatLight: '#f87171',
    meat: '#991b1b',
    meatDark: '#450a0a',
    bone: '#e2e8f0',
    follicle: 'rgba(120, 53, 15, 0.3)'
  },
  quail: {
    skinHighlight: '#fefce8',
    skin: '#f5dc93',
    skinDark: '#b4691e',
    meatLight: '#fecdd3',
    meat: '#ea7587',
    meatDark: '#9f1239',
    bone: '#ffffff',
    follicle: 'rgba(146, 64, 14, 0.25)'
  }
};

export function drawMeatAndPoultryItem(ctx: CanvasRenderingContext2D, itemId: string): boolean {
  if (itemId === 'minced_meat_mixed' || itemId.includes('minced')) {
    return drawMincedMeat(ctx, itemId);
  }

  for (const animal of ['beef', 'pork', 'mutton', 'venison', 'goat']) {
    if (itemId.startsWith(`${animal}_`)) {
      const cut = itemId.slice(animal.length + 1);
      const pal = MEAT_PALETTES[animal] || MEAT_PALETTES.beef;
      return drawMammalCut(ctx, cut, pal, animal);
    }
  }

  for (const bird of ['chicken', 'duck', 'goose', 'turkey', 'pheasant', 'quail']) {
    if (itemId.startsWith(`${bird}_`)) {
      const cut = itemId.slice(bird.length + 1);
      const pal = BIRD_PALETTES[bird] || BIRD_PALETTES.chicken;
      return drawBirdCut(ctx, cut, pal, bird);
    }
  }

  return false;
}

function drawCutBoneNode(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, rot: number = 0) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  // Periosteum ivory ring
  drawLitEllipse(ctx, 0, 0, rx, ry, 0, '#ffffff', '#f1f5f9', '#cbd5e1', undefined, 0.45);
  // Spongy red trabecular marrow core
  const mGrad = ctx.createRadialGradient(-rx * 0.15, -ry * 0.15, 0.1, 0, 0, Math.max(rx, ry) * 0.65);
  mGrad.addColorStop(0, '#fca5a5');
  mGrad.addColorStop(0.55, '#b91c1c');
  mGrad.addColorStop(1, '#450a0a');
  ctx.fillStyle = mGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx * 0.56, ry * 0.56, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawMammalCut(ctx: CanvasRenderingContext2D, cut: string, pal: MeatPalette, animal: string): boolean {
  switch (cut) {
    case 'carcass': {
      drawShadow(ctx, 8.2, 3.2, 8.6, 0.3);

      // Steel butcher S-hook
      const hookGrad = ctx.createLinearGradient(-2.5, -9, 2.5, -5);
      hookGrad.addColorStop(0, '#e2e8f0');
      hookGrad.addColorStop(0.5, '#64748b');
      hookGrad.addColorStop(1, '#cbd5e1');
      ctx.strokeStyle = hookGrad;
      ctx.lineWidth = 1.35;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, -7.8, 1.9, Math.PI, 0.1);
      ctx.lineTo(1.9, -5.0);
      ctx.stroke();

      // Carcass outer silhouette
      const drawPath = () => {
        ctx.beginPath();
        ctx.moveTo(-6.2, -5.2);
        ctx.bezierCurveTo(-7.6, -2.2, -7.2, 3.2, -4.4, 7.2);
        ctx.quadraticCurveTo(0, 8.2, 4.4, 7.2);
        ctx.bezierCurveTo(7.2, 3.2, 7.6, -2.2, 6.2, -5.2);
        ctx.quadraticCurveTo(0, -6.0, -6.2, -5.2);
        ctx.closePath();
      };

      const bodyGrad = ctx.createRadialGradient(-1.5, -2.0, 0.8, 0, 1.0, 8.5);
      bodyGrad.addColorStop(0, pal.light);
      bodyGrad.addColorStop(0.5, pal.primary);
      bodyGrad.addColorStop(1, pal.deep);
      ctx.fillStyle = bodyGrad;
      drawPath();
      ctx.fill();

      ctx.save();
      drawPath();
      ctx.clip();

      // Subcutaneous outer tallow/fat layer
      ctx.strokeStyle = pal.fatCap;
      ctx.lineWidth = 2.0;
      ctx.stroke();

      // Thoracic cavity shadow inside split chest
      const cavGrad = ctx.createRadialGradient(0, -0.5, 0.5, 0, 0.5, 5.5);
      cavGrad.addColorStop(0, pal.deep);
      cavGrad.addColorStop(1, hexToRgba(pal.dark, 0.4));
      ctx.fillStyle = cavGrad;
      ctx.beginPath();
      ctx.ellipse(0, 0.5, 4.2, 5.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Ribcage ivory bone arches
      ctx.strokeStyle = pal.fat;
      ctx.lineWidth = 0.85;
      for (let y = -3.6; y <= 4.2; y += 1.65) {
        ctx.beginPath();
        ctx.moveTo(-0.5, y);
        ctx.quadraticCurveTo(-3.2, y + 0.4, -5.4, y - 0.6);
        ctx.moveTo(0.5, y);
        ctx.quadraticCurveTo(3.2, y + 0.4, 5.4, y - 0.6);
        ctx.stroke();
      }

      // Split spinal column with vertebral joints
      const spineGrad = ctx.createLinearGradient(-1.1, 0, 1.1, 0);
      spineGrad.addColorStop(0, '#cbd5e1');
      spineGrad.addColorStop(0.5, '#ffffff');
      spineGrad.addColorStop(1, '#94a3b8');
      ctx.fillStyle = spineGrad;
      ctx.fillRect(-0.9, -5.5, 1.8, 12.8);
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 0.45;
      for (let y = -4.2; y <= 6.2; y += 1.45) {
        ctx.beginPath();
        ctx.moveTo(-0.9, y);
        ctx.lineTo(0.9, y);
        ctx.stroke();
      }
      ctx.restore();
      return true;
    }

    case 'side': {
      drawShadow(ctx, 6.8, 3.2, 8.6, 0.28);

      const drawPath = () => {
        ctx.beginPath();
        ctx.moveTo(-2.6, -7.6);
        ctx.bezierCurveTo(2.4, -7.2, 6.2, -5.8, 6.8, -1.0);
        ctx.bezierCurveTo(7.2, 3.2, 4.8, 7.6, 2.2, 7.8);
        ctx.lineTo(-2.6, 7.8);
        ctx.closePath();
      };
      const grad = ctx.createLinearGradient(-2.6, -6, 6.8, 6);
      grad.addColorStop(0, pal.dark);
      grad.addColorStop(0.45, pal.primary);
      grad.addColorStop(0.85, pal.light);
      grad.addColorStop(1, pal.dark);
      ctx.fillStyle = grad;
      drawPath();
      ctx.fill();

      ctx.save();
      drawPath();
      ctx.clip();

      // Thick outer fat rim
      ctx.strokeStyle = pal.fatCap;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(6.8, -5.8);
      ctx.bezierCurveTo(7.2, 2.0, 4.8, 7.6, 2.2, 7.8);
      ctx.stroke();

      // Rib arcs & intercostal marbling
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 0.9;
      for (let y = -4.8; y <= 4.8; y += 1.8) {
        ctx.beginPath();
        ctx.moveTo(-1.2, y);
        ctx.quadraticCurveTo(2.4, y + 0.6, 5.2, y - 0.5);
        ctx.stroke();
      }

      // Split vertebral column along left edge
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(-2.6, -7.6, 1.55, 15.4);
      ctx.fillStyle = '#dc2626';
      for (let y = -6.0; y <= 6.2; y += 1.9) {
        ctx.fillRect(-2.3, y, 0.75, 0.85);
      }
      ctx.restore();
      return true;
    }

    case 'quarter': {
      drawShadow(ctx, 7.8, 3.2, 8.2, 0.28);

      const drawHaunch = () => {
        ctx.beginPath();
        ctx.moveTo(-6.4, -3.5);
        ctx.bezierCurveTo(-7.2, 2.5, -2.5, 7.0, 2.5, 6.8);
        ctx.bezierCurveTo(7.0, 6.6, 7.2, -0.5, 4.8, -4.5);
        ctx.bezierCurveTo(2.4, -7.2, -5.2, -6.8, -6.4, -3.5);
        ctx.closePath();
      };

      // Extruded thickness underside
      ctx.fillStyle = pal.deep;
      ctx.save();
      ctx.translate(0.4, 0.9);
      drawHaunch();
      ctx.fill();
      ctx.restore();

      const hGrad = ctx.createRadialGradient(-2.0, -1.8, 0.6, 0, 0.5, 8.0);
      hGrad.addColorStop(0, pal.light);
      hGrad.addColorStop(0.55, pal.primary);
      hGrad.addColorStop(1, pal.deep);
      ctx.fillStyle = hGrad;
      drawHaunch();
      ctx.fill();

      ctx.save();
      drawHaunch();
      ctx.clip();

      // Subcutaneous fat cap arc
      ctx.strokeStyle = pal.fatCap;
      ctx.lineWidth = 1.9;
      ctx.beginPath();
      ctx.moveTo(-6.2, 1.5);
      ctx.bezierCurveTo(-2.5, 7.0, 4.5, 6.8, 6.6, 2.2);
      ctx.stroke();

      // Muscle bundle septum seams & collagen
      ctx.strokeStyle = pal.fat;
      ctx.lineWidth = 0.75;
      ctx.beginPath();
      ctx.moveTo(-5.0, -0.6); ctx.quadraticCurveTo(-0.5, 2.2, 5.2, 1.2);
      ctx.moveTo(-3.2, 3.2); ctx.quadraticCurveTo(1.2, 4.8, 4.8, 3.6);
      ctx.stroke();

      ctx.strokeStyle = pal.silverskin;
      ctx.lineWidth = 0.45;
      ctx.beginPath();
      ctx.moveTo(-4.0, -3.2); ctx.quadraticCurveTo(0.8, -0.8, 5.0, -2.0);
      ctx.stroke();

      // Wet sheen
      ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.beginPath();
      ctx.ellipse(-2.5, -1.2, 2.4, 0.85, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Femur joint cross-section bone
      drawCutBoneNode(ctx, -0.4, -3.2, 2.1, 1.65, -0.15);
      return true;
    }

    case 'tenderloin_huge': {
      drawShadow(ctx, 8.6, 3.4, 8.0, 0.3);

      const drawSteak = () => {
        ctx.beginPath();
        ctx.moveTo(-7.8, -0.5);
        ctx.bezierCurveTo(-7.5, -5.2, -1.2, -5.8, 4.2, -4.4);
        ctx.bezierCurveTo(8.5, -3.2, 8.6, 1.8, 5.4, 4.0);
        ctx.bezierCurveTo(1.6, 6.2, -7.8, 4.8, -7.8, -0.5);
        ctx.closePath();
      };

      // Thick 3D seared-raw steak height rim
      ctx.save();
      ctx.translate(0.25, 1.15);
      const rimGrad = ctx.createLinearGradient(-8, 0, 8, 0);
      rimGrad.addColorStop(0, pal.deep);
      rimGrad.addColorStop(0.5, pal.dark);
      rimGrad.addColorStop(1, pal.deep);
      ctx.fillStyle = rimGrad;
      drawSteak();
      ctx.fill();
      ctx.restore();

      // Cream outer fat cap wrap on top-left arc
      ctx.save();
      ctx.translate(-0.25, -0.25);
      ctx.strokeStyle = pal.fatCap;
      ctx.lineWidth = 1.65;
      drawSteak();
      ctx.stroke();
      ctx.restore();

      // Top cut surface
      const sGrad = ctx.createRadialGradient(-2.0, -1.6, 0.5, 0.2, 0.2, 8.4);
      sGrad.addColorStop(0, pal.light);
      sGrad.addColorStop(0.52, pal.primary);
      sGrad.addColorStop(1, pal.deep);
      ctx.fillStyle = sGrad;
      drawSteak();
      ctx.fill();

      ctx.save();
      drawSteak();
      ctx.clip();

      // Silverskin fascia division seam
      ctx.strokeStyle = pal.fat;
      ctx.lineWidth = 0.85;
      ctx.beginPath();
      ctx.moveTo(-6.5, 1.2);
      ctx.bezierCurveTo(-1.5, -1.0, 3.2, -0.6, 7.6, 1.2);
      ctx.stroke();

      // Intricate deterministic A5 marbling spiderwebs
      ctx.strokeStyle = hexToRgba(pal.fat, 0.72);
      ctx.lineWidth = 0.45;
      ctx.lineCap = 'round';
      for (let i = 0; i < 12; i++) {
        const x1 = -6.5 + hash01(animal, i * 4) * 11.5;
        const y1 = -3.8 + hash01(animal, i * 4 + 1) * 7.2;
        const cx = x1 + (hash01(animal, i * 4 + 2) - 0.5) * 3.0;
        const cy = y1 + (hash01(animal, i * 4 + 3) - 0.5) * 2.0;
        const x2 = x1 + 2.4;
        const y2 = y1 + (hash01(animal, i + 50) - 0.5) * 2.2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo(cx, cy, x2, y2);
        ctx.stroke();
      }

      // Fresh glistening specular highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.26)';
      ctx.beginPath();
      ctx.ellipse(-2.8, -1.8, 3.0, 0.95, -0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return true;
    }

    case 'brisket_large': {
      drawShadow(ctx, 8.8, 3.5, 8.0, 0.28);

      const drawSlab = () => {
        ctx.beginPath();
        ctx.moveTo(-7.8, -3.8);
        ctx.quadraticCurveTo(0, -4.8, 7.8, -3.4);
        ctx.quadraticCurveTo(8.5, 0.8, 7.5, 4.4);
        ctx.quadraticCurveTo(0, 5.4, -7.6, 4.2);
        ctx.quadraticCurveTo(-8.4, 0.2, -7.8, -3.8);
        ctx.closePath();
      };

      // Extruded side depth
      ctx.fillStyle = pal.deep;
      ctx.save();
      ctx.translate(0.2, 1.1);
      drawSlab();
      ctx.fill();
      ctx.restore();

      const bGrad = ctx.createLinearGradient(-8, -4, 8, 5);
      bGrad.addColorStop(0, pal.light);
      bGrad.addColorStop(0.55, pal.primary);
      bGrad.addColorStop(1, pal.deep);
      ctx.fillStyle = bGrad;
      drawSlab();
      ctx.fill();

      ctx.save();
      drawSlab();
      ctx.clip();

      // Thick creamy upper deckle fat cap
      const fatGrad = ctx.createLinearGradient(0, -5.0, 0, -1.2);
      fatGrad.addColorStop(0, '#ffffff');
      fatGrad.addColorStop(0.6, pal.fatCap);
      fatGrad.addColorStop(1, pal.fat);
      ctx.fillStyle = fatGrad;
      ctx.beginPath();
      ctx.moveTo(-8.4, -5.0);
      ctx.lineTo(8.5, -5.0);
      ctx.lineTo(8.5, -1.6);
      ctx.bezierCurveTo(3.2, -1.0, -3.2, -2.5, -8.4, -1.8);
      ctx.closePath();
      ctx.fill();

      // Horizontal coarse brisket muscle grain & fat seams
      ctx.strokeStyle = pal.deep;
      ctx.lineWidth = 0.55;
      for (let y = -0.6; y <= 3.8; y += 1.05) {
        ctx.beginPath();
        ctx.moveTo(-7.8, y);
        ctx.quadraticCurveTo(0, y + 0.5, 7.8, y - 0.3);
        ctx.stroke();
      }
      ctx.strokeStyle = hexToRgba(pal.fat, 0.82);
      ctx.lineWidth = 0.75;
      ctx.beginPath();
      ctx.moveTo(-8.0, 0.9);
      ctx.bezierCurveTo(-2.5, 1.6, 3.0, 0.6, 8.0, 1.4);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(-6, -2.6, 9.5, 0.8);
      ctx.restore();
      return true;
    }

    case 'rump_large': {
      drawShadow(ctx, 8.2, 3.5, 8.0, 0.28);

      const drawRoast = () => {
        ctx.beginPath();
        ctx.moveTo(-7.4, -1.0);
        ctx.bezierCurveTo(-7.2, -5.4, -2.4, -5.8, 1.2, -5.5);
        ctx.bezierCurveTo(6.4, -5.2, 7.8, -2.2, 7.4, 1.2);
        ctx.bezierCurveTo(7.0, 5.2, 2.2, 5.8, -2.2, 5.4);
        ctx.bezierCurveTo(-7.0, 5.0, -7.6, 2.5, -7.4, -1.0);
        ctx.closePath();
      };

      ctx.fillStyle = pal.deep;
      ctx.save();
      ctx.translate(0.2, 1.0);
      drawRoast();
      ctx.fill();
      ctx.restore();

      const rGrad = ctx.createRadialGradient(-2.2, -1.8, 0.5, 0, 0, 8.0);
      rGrad.addColorStop(0, pal.light);
      rGrad.addColorStop(0.5, pal.primary);
      rGrad.addColorStop(1, pal.deep);
      ctx.fillStyle = rGrad;
      drawRoast();
      ctx.fill();

      ctx.save();
      drawRoast();
      ctx.clip();

      // Marbling specks
      ctx.strokeStyle = hexToRgba(pal.fat, 0.68);
      ctx.lineWidth = 0.55;
      for (let i = 0; i < 8; i++) {
        const sx = -5.5 + hash01(animal + 'rump', i * 2) * 11;
        const sy = -3.8 + hash01(animal + 'rump', i * 2 + 1) * 7.6;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo(sx + 0.8, sy + 0.5, sx + 1.6, sy - 0.3);
        ctx.stroke();
      }

      // Curved 3D butcher's cotton twine bands with crease shadow underneath
      for (const tx of [-4.0, 0.0, 4.0]) {
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.38)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(tx + 0.25, -6.0);
        ctx.quadraticCurveTo(tx + 1.05, 0, tx + 0.25, 6.0);
        ctx.stroke();

        ctx.strokeStyle = '#fef3c7';
        ctx.lineWidth = 0.85;
        ctx.beginPath();
        ctx.moveTo(tx, -6.0);
        ctx.quadraticCurveTo(tx + 0.8, 0, tx, 6.0);
        ctx.stroke();
      }
      ctx.restore();
      return true;
    }

    case 'neck_medium': {
      drawShadow(ctx, 7.6, 3.2, 8.0, 0.26);

      const drawNeck = () => drawOrganicBlobPath(ctx, 0, 0, 7.0, 5.2, 137, 0.14, 11);

      ctx.fillStyle = pal.deep;
      ctx.save();
      ctx.translate(0.25, 0.9);
      drawNeck();
      ctx.fill();
      ctx.restore();

      const nGrad = ctx.createRadialGradient(-2.0, -1.6, 0.6, 0, 0, 7.4);
      nGrad.addColorStop(0, pal.light);
      nGrad.addColorStop(0.55, pal.primary);
      nGrad.addColorStop(1, pal.deep);
      ctx.fillStyle = nGrad;
      drawNeck();
      ctx.fill();

      ctx.save();
      drawNeck();
      ctx.clip();

      // Heavy interleaved collagen & chuck marbling seams
      ctx.strokeStyle = pal.fat;
      ctx.lineWidth = 0.85;
      ctx.beginPath();
      ctx.moveTo(-6, -2.2); ctx.bezierCurveTo(-1, -0.2, 2, 2.6, 6.2, 1.4);
      ctx.moveTo(-4.8, 2.8); ctx.bezierCurveTo(-1.2, 0.6, 2.2, -1.8, 5.8, -2.5);
      ctx.moveTo(-1.5, -5.0); ctx.quadraticCurveTo(0.4, 0.0, -0.8, 4.8);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath();
      ctx.ellipse(-2.0, -1.8, 2.2, 0.8, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Neck cervical vertebra bone cross-section
      drawCutBoneNode(ctx, 1.2, 0.3, 1.5, 1.2, 0.2);
      return true;
    }

    case 'ribs_medium': {
      drawShadow(ctx, 8.6, 3.5, 8.2, 0.28);

      const boneXs = [-5.8, -1.9, 1.9, 5.8];
      // Exposed curved rib bone tips protruding top & bottom
      for (const bx of boneXs) {
        const bGrad = ctx.createLinearGradient(bx - 1, 0, bx + 1, 0);
        bGrad.addColorStop(0, '#cbd5e1');
        bGrad.addColorStop(0.45, '#f8fafc');
        bGrad.addColorStop(1, '#94a3b8');
        ctx.fillStyle = bGrad;

        // Upper French-trimmed rib tips
        ctx.beginPath();
        ctx.roundRect(bx - 0.85, -6.6, 1.7, 4.4, 0.75);
        ctx.fill();
        // Lower bone ends
        ctx.beginPath();
        ctx.roundRect(bx - 0.85, 2.8, 1.7, 4.0, 0.75);
        ctx.fill();

        // Marrow dot on upper cut ends
        ctx.fillStyle = '#991b1b';
        ctx.beginPath();
        ctx.arc(bx, -6.2, 0.38, 0, Math.PI * 2);
        ctx.fill();
      }

      // Main scalloped meat rack slab
      const drawRack = () => {
        ctx.beginPath();
        ctx.moveTo(-8.0, -2.6);
        ctx.bezierCurveTo(-4.0, -3.5, 4.0, -3.5, 8.0, -2.4);
        ctx.quadraticCurveTo(8.6, 0.6, 7.8, 4.0);
        ctx.bezierCurveTo(3.5, 4.6, -3.5, 4.6, -7.8, 3.8);
        ctx.quadraticCurveTo(-8.6, 0.6, -8.0, -2.6);
        ctx.closePath();
      };

      const rackGrad = ctx.createLinearGradient(-8, -3, 8, 4);
      rackGrad.addColorStop(0, pal.light);
      rackGrad.addColorStop(0.55, pal.primary);
      rackGrad.addColorStop(1, pal.deep);
      ctx.fillStyle = rackGrad;
      drawRack();
      ctx.fill();

      ctx.save();
      drawRack();
      ctx.clip();

      // Indented meat ridges between rib bones + silver fascia
      for (const bx of boneXs) {
        ctx.strokeStyle = pal.fat;
        ctx.lineWidth = 0.75;
        ctx.beginPath();
        ctx.moveTo(bx, -3.2);
        ctx.lineTo(bx, 4.2);
        ctx.stroke();
      }
      ctx.fillStyle = hexToRgba(pal.deep, 0.48);
      for (let i = 0; i < boneXs.length - 1; i++) {
        const mx = (boneXs[i] + boneXs[i + 1]) * 0.5;
        ctx.beginPath();
        ctx.ellipse(mx, 0.6, 1.2, 3.0, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Silverskin & marbling sheen
      ctx.strokeStyle = hexToRgba(pal.fatCap, 0.75);
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-8.2, 0.6);
      ctx.quadraticCurveTo(0, 1.2, 8.2, 0.5);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.fillRect(-6.5, -2.0, 12.5, 0.75);
      ctx.restore();
      return true;
    }

    case 'scraps_small': {
      drawShadow(ctx, 8.0, 3.0, 7.8, 0.24);

      const chunks = [
        { x: -4.4, y: -2.0, rx: 2.3, ry: 1.9, s: 11 },
        { x: 0.4, y: -2.8, rx: 2.5, ry: 2.0, s: 23 },
        { x: 4.6, y: -1.2, rx: 2.2, ry: 1.9, s: 37 },
        { x: -2.4, y: 2.0, rx: 2.5, ry: 2.0, s: 53 },
        { x: 2.6, y: 2.2, rx: 2.3, ry: 1.9, s: 71 }
      ];

      for (const c of chunks) {
        // Chunk side thickness
        ctx.fillStyle = pal.deep;
        drawOrganicBlobPath(ctx, c.x + 0.15, c.y + 0.65, c.rx, c.ry, c.s, 0.16, 8);
        ctx.fill();

        const cg = ctx.createRadialGradient(c.x - 0.7, c.y - 0.7, 0.2, c.x, c.y, c.rx * 1.1);
        cg.addColorStop(0, pal.light);
        cg.addColorStop(0.55, pal.primary);
        cg.addColorStop(1, pal.dark);
        ctx.fillStyle = cg;
        drawOrganicBlobPath(ctx, c.x, c.y, c.rx, c.ry, c.s, 0.16, 8);
        ctx.fill();

        // Marbling fat edge & glistening catchlight
        ctx.strokeStyle = pal.fat;
        ctx.lineWidth = 0.65;
        ctx.beginPath();
        ctx.moveTo(c.x - c.rx * 0.55, c.y - c.ry * 0.35);
        ctx.quadraticCurveTo(c.x, c.y - c.ry * 0.65, c.x + c.rx * 0.5, c.y - c.ry * 0.2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.32)';
        ctx.beginPath();
        ctx.arc(c.x - 0.6, c.y - 0.5, 0.45, 0, Math.PI * 2);
        ctx.fill();
      }
      return true;
    }

    case 'liver': {
      drawShadow(ctx, 7.8, 3.0, 7.8, 0.3);

      // Left smaller hepatic lobe
      const drawLobe = (cx: number, cy: number, rx: number, ry: number, rot: number, seed: number) => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rot);
        const lGrad = ctx.createRadialGradient(-rx * 0.3, -ry * 0.3, 0.4, 0, 0, rx * 1.15);
        lGrad.addColorStop(0.0, '#9f1239');
        lGrad.addColorStop(0.45, '#580a1f');
        lGrad.addColorStop(0.88, '#3b0714');
        lGrad.addColorStop(1.0, '#1e030a');
        ctx.fillStyle = lGrad;
        drawOrganicBlobPath(ctx, 0, 0, rx, ry, seed, 0.1, 10);
        ctx.fill();

        // Wet serous membrane sheen
        ctx.fillStyle = 'rgba(255, 228, 230, 0.32)';
        ctx.beginPath();
        ctx.ellipse(-rx * 0.28, -ry * 0.32, rx * 0.36, ry * 0.18, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      };

      drawLobe(-2.8, 0.4, 4.4, 4.0, -0.25, 31);
      drawLobe(2.2, -0.2, 5.2, 4.4, 0.2, 47);

      // Falciform ligament groove
      ctx.strokeStyle = 'rgba(254, 205, 211, 0.35)';
      ctx.lineWidth = 0.55;
      ctx.beginPath();
      ctx.moveTo(-0.5, -3.5);
      ctx.quadraticCurveTo(-0.2, 0.2, -0.8, 3.8);
      ctx.stroke();
      return true;
    }

    case 'heart': {
      drawShadow(ctx, 6.8, 2.9, 8.0, 0.28);

      // Great vessels (aorta & pulmonary stump)
      ctx.fillStyle = '#fca5a5';
      ctx.beginPath();
      ctx.roundRect(-2.4, -7.2, 2.4, 3.2, 0.6);
      ctx.roundRect(0.4, -6.5, 2.0, 2.6, 0.6);
      ctx.fill();
      ctx.fillStyle = '#7f1d1d';
      ctx.beginPath();
      ctx.ellipse(-1.2, -7.0, 1.0, 0.45, 0, 0, Math.PI * 2);
      ctx.ellipse(1.4, -6.3, 0.85, 0.4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Muscular anatomical conical ventricles
      const hGrad = ctx.createRadialGradient(-2.0, -2.0, 0.5, 0.2, 0.5, 7.2);
      hGrad.addColorStop(0.0, '#b91c1c');
      hGrad.addColorStop(0.55, '#7f1d1d');
      hGrad.addColorStop(1.0, '#450a0a');
      ctx.fillStyle = hGrad;
      ctx.beginPath();
      ctx.moveTo(0.2, 6.8);
      ctx.bezierCurveTo(-5.2, 4.2, -6.2, -2.4, -3.2, -4.6);
      ctx.quadraticCurveTo(0, -5.6, 3.8, -4.2);
      ctx.bezierCurveTo(6.2, -1.6, 4.6, 4.4, 0.2, 6.8);
      ctx.closePath();
      ctx.fill();

      // Coronary epicardial fat pad & branching vessels
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 1.45;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-4.0, -2.2);
      ctx.quadraticCurveTo(0, -1.0, 4.2, -2.0);
      ctx.stroke();
      ctx.lineWidth = 0.85;
      ctx.beginPath();
      ctx.moveTo(0.0, -1.4);
      ctx.quadraticCurveTo(-0.8, 1.8, -0.2, 5.2);
      ctx.stroke();

      // Fine dark cardiac veins
      ctx.strokeStyle = 'rgba(69, 10, 10, 0.65)';
      ctx.lineWidth = 0.4;
      ctx.beginPath();
      ctx.moveTo(-0.3, 0.5); ctx.lineTo(-2.5, 2.4);
      ctx.moveTo(-0.2, 2.0); ctx.lineTo(2.0, 3.6);
      ctx.stroke();

      // Glossy pericardial highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.beginPath();
      ctx.ellipse(-2.4, -0.5, 1.4, 0.7, -0.5, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    case 'kidney': {
      drawShadow(ctx, 6.8, 2.8, 7.8, 0.28);

      // Lobulated smooth dark mahogany kidney bean
      const kGrad = ctx.createRadialGradient(-2.0, -2.0, 0.5, 0, 0.4, 7.0);
      kGrad.addColorStop(0.0, '#9f1239');
      kGrad.addColorStop(0.45, '#581c3a');
      kGrad.addColorStop(0.88, '#3b0722');
      kGrad.addColorStop(1.0, '#1e0312');
      ctx.fillStyle = kGrad;
      ctx.beginPath();
      ctx.moveTo(-5.8, 0);
      ctx.bezierCurveTo(-5.8, -5.2, 3.8, -5.8, 5.4, -2.2);
      ctx.bezierCurveTo(6.0, -0.6, 2.5, -0.2, 2.0, 1.2);
      ctx.bezierCurveTo(1.6, 2.6, 5.2, 2.8, 4.6, 4.8);
      ctx.bezierCurveTo(3.0, 7.2, -5.8, 5.2, -5.8, 0);
      ctx.closePath();
      ctx.fill();

      // Subtle bovine-style lobule creases & fat in hilum indentation
      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.ellipse(2.6, 1.0, 1.1, 0.75, 0.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(30, 3, 18, 0.45)';
      ctx.lineWidth = 0.45;
      ctx.beginPath();
      ctx.moveTo(-2.0, -4.4); ctx.quadraticCurveTo(-1.2, -2.2, 0.4, -1.2);
      ctx.moveTo(-2.5, 4.6); ctx.quadraticCurveTo(-1.0, 2.5, 0.6, 1.8);
      ctx.stroke();

      // Serous wet catchlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.beginPath();
      ctx.ellipse(-2.8, -2.4, 2.0, 0.75, -0.45, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    case 'brain': {
      drawShadow(ctx, 7.2, 3.0, 7.8, 0.26);

      // Left & right cerebral hemispheres
      for (const side of [-1, 1]) {
        const cx = side * 3.15;
        const bGrad = ctx.createRadialGradient(cx - 0.8, -1.6, 0.4, cx, 0, 4.8);
        bGrad.addColorStop(0.0, '#fdf2f8');
        bGrad.addColorStop(0.55, '#fbcfe8');
        bGrad.addColorStop(0.9, '#db7093');
        bGrad.addColorStop(1.0, '#9d174d');
        ctx.fillStyle = bGrad;
        ctx.beginPath();
        ctx.ellipse(cx, 0, 3.45, 4.9, side * 0.08, 0, Math.PI * 2);
        ctx.fill();
      }

      // Deep median longitudinal fissure
      ctx.strokeStyle = '#831843';
      ctx.lineWidth = 0.85;
      ctx.beginPath();
      ctx.moveTo(0, -4.7);
      ctx.lineTo(0, 4.7);
      ctx.stroke();

      // Convoluted cortical gyri & sulci
      ctx.strokeStyle = 'rgba(157, 23, 77, 0.55)';
      ctx.lineWidth = 0.55;
      ctx.lineCap = 'round';
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(side * 1.0, -3.2);
        ctx.bezierCurveTo(side * 4.5, -3.6, side * 5.2, -1.2, side * 1.4, -1.2);
        ctx.bezierCurveTo(side * 5.2, -0.4, side * 5.4, 2.0, side * 1.2, 1.6);
        ctx.bezierCurveTo(side * 4.6, 2.4, side * 3.8, 4.2, side * 1.0, 3.6);
        ctx.stroke();
      }

      // Glossy moisture highlights along folds
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.62)';
      ctx.lineWidth = 0.45;
      ctx.beginPath();
      ctx.moveTo(-4.4, -2.0); ctx.quadraticCurveTo(-2.8, -2.5, -1.8, -1.9);
      ctx.moveTo(1.8, -2.0); ctx.quadraticCurveTo(3.2, -2.5, 4.4, -1.8);
      ctx.stroke();
      return true;
    }

    case 'tongue': {
      drawShadow(ctx, 7.0, 2.8, 7.8, 0.26);

      ctx.save();
      ctx.rotate(-0.18);

      // Thick muscular tongue root & tapered tip
      const tGrad = ctx.createRadialGradient(-1.5, -1.8, 0.6, 0, 0, 7.4);
      tGrad.addColorStop(0.0, '#f472b6');
      tGrad.addColorStop(0.5, '#be185d');
      tGrad.addColorStop(1.0, '#700c36');
      ctx.fillStyle = tGrad;
      ctx.beginPath();
      ctx.moveTo(-4.4, -6.0);
      ctx.bezierCurveTo(-4.6, -1.0, -3.8, 4.8, 0.0, 6.8);
      ctx.bezierCurveTo(3.8, 4.8, 4.6, -1.0, 4.4, -6.0);
      ctx.quadraticCurveTo(0, -6.8, -4.4, -6.0);
      ctx.closePath();
      ctx.fill();

      // Dorsal median sulcus groove
      ctx.strokeStyle = 'rgba(80, 7, 36, 0.45)';
      ctx.lineWidth = 0.65;
      ctx.beginPath();
      ctx.moveTo(0, -5.2);
      ctx.lineTo(0, 5.2);
      ctx.stroke();

      // Granular taste papillae bumps
      for (let i = 0; i < 16; i++) {
        const px = (hash01('tongue', i * 2) - 0.5) * 6.0;
        const py = -4.2 + hash01('tongue', i * 2 + 1) * 8.6;
        ctx.fillStyle = i % 2 === 0 ? 'rgba(252, 231, 243, 0.45)' : 'rgba(131, 24, 67, 0.35)';
        ctx.beginPath();
        ctx.arc(px, py, 0.34, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      return true;
    }

    case 'tripe': {
      drawShadow(ctx, 7.6, 3.0, 7.8, 0.24);

      const drawTripePath = () => {
        ctx.beginPath();
        ctx.moveTo(-7.2, -2.5);
        ctx.bezierCurveTo(-5.0, -5.4, 2.5, -5.2, 6.8, -3.4);
        ctx.bezierCurveTo(7.8, 0.4, 6.8, 4.6, 2.2, 5.0);
        ctx.bezierCurveTo(-3.5, 5.4, -7.8, 3.2, -7.2, -2.5);
        ctx.closePath();
      };

      const trGrad = ctx.createRadialGradient(-1.5, -1.5, 0.6, 0, 0, 7.6);
      trGrad.addColorStop(0.0, '#fffbeb');
      trGrad.addColorStop(0.55, '#fef3c7');
      trGrad.addColorStop(1.0, '#d6b88d');
      ctx.fillStyle = trGrad;
      drawTripePath();
      ctx.fill();

      ctx.save();
      drawTripePath();
      ctx.clip();

      // Organic hexagonal reticulum honeycomb ridges
      ctx.strokeStyle = 'rgba(180, 128, 72, 0.55)';
      ctx.lineWidth = 0.55;
      for (let y = -4.2; y <= 4.2; y += 2.0) {
        for (let x = -6.2; x <= 6.2; x += 2.2) {
          const ox = (Math.round(y) % 2 === 0 ? 0 : 1.1);
          ctx.beginPath();
          ctx.ellipse(x + ox, y, 0.95, 0.8, 0.1, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.restore();
      return true;
    }

    case 'intestines': {
      drawShadow(ctx, 7.4, 3.0, 7.8, 0.24);

      // Coiled translucent pearlescent sausage casing loops
      const loops: Array<[number, number, number, number, number, number]> = [
        [-5.2, 1.5, -5.0, -4.5, 0.2, -4.0],
        [0.2, -4.0, 5.6, -3.6, 5.2, 0.4],
        [5.2, 0.4, 4.8, 5.2, -1.2, 4.6],
        [-1.2, 4.6, -5.8, 4.0, -3.2, 0.2],
        [-3.2, 0.2, -0.5, -2.2, 2.4, 0.8]
      ];

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const [x0, y0, cx, cy, x1, y1] of loops) {
        // Under-shadow rim
        ctx.strokeStyle = '#d6a59e';
        ctx.lineWidth = 2.65;
        ctx.beginPath();
        ctx.moveTo(x0, y0 + 0.35);
        ctx.quadraticCurveTo(cx, cy + 0.35, x1, y1 + 0.35);
        ctx.stroke();

        // Main creamy pink translucent tube
        ctx.strokeStyle = '#ffe4d6';
        ctx.lineWidth = 2.25;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.quadraticCurveTo(cx, cy, x1, y1);
        ctx.stroke();

        // Glossy wet casing core
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.58)';
        ctx.lineWidth = 0.65;
        ctx.beginPath();
        ctx.moveTo(x0, y0 - 0.35);
        ctx.quadraticCurveTo(cx, cy - 0.35, x1, y1 - 0.35);
        ctx.stroke();
      }
      return true;
    }

    case 'bone_marrow': {
      drawShadow(ctx, 7.0, 3.0, 7.8, 0.28);

      // Short 3D cross-cut femur marrow bone cylinder
      const cylGrad = ctx.createLinearGradient(-6.4, 0, 6.4, 0);
      cylGrad.addColorStop(0, '#cbd5e1');
      cylGrad.addColorStop(0.5, '#f8fafc');
      cylGrad.addColorStop(1, '#94a3b8');
      ctx.fillStyle = cylGrad;
      ctx.beginPath();
      ctx.ellipse(0, 1.2, 6.4, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Ivory cortical bone top face
      drawLitEllipse(ctx, 0, -0.4, 6.3, 4.4, 0, '#ffffff', '#f8fafc', '#cbd5e1', undefined, 0.45);

      // Rich creamy fatty yellow-crimson bone marrow well
      const mGrad = ctx.createRadialGradient(-0.8, -0.8, 0.4, 0, -0.4, 4.2);
      mGrad.addColorStop(0.0, '#fef08a');
      mGrad.addColorStop(0.55, '#f59e0b');
      mGrad.addColorStop(0.85, '#b91c1c');
      mGrad.addColorStop(1.0, '#7f1d1d');
      ctx.fillStyle = mGrad;
      ctx.beginPath();
      ctx.ellipse(0, -0.4, 4.0, 2.75, 0, 0, Math.PI * 2);
      ctx.fill();

      // Glossy marrow oil catchlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.52)';
      ctx.beginPath();
      ctx.ellipse(-1.2, -1.2, 1.3, 0.55, -0.25, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    case 'bone_soup': {
      drawShadow(ctx, 8.6, 2.8, 7.8, 0.26);

      ctx.save();
      ctx.rotate(-0.12);

      // Epiphysis knuckle joints at both ends
      for (const ex of [-6.4, 6.4]) {
        drawLitSphere(ctx, ex, -1.6, 2.05, '#ffffff', '#f1f5f9', '#cbd5e1', undefined, 0.4);
        drawLitSphere(ctx, ex, 1.6, 2.05, '#ffffff', '#f1f5f9', '#94a3b8', undefined, 0.3);
      }

      // Tapering cortical femur shaft
      const shGrad = ctx.createLinearGradient(0, -2.0, 0, 2.0);
      shGrad.addColorStop(0, '#ffffff');
      shGrad.addColorStop(0.55, '#f1f5f9');
      shGrad.addColorStop(1, '#94a3b8');
      ctx.fillStyle = shGrad;
      ctx.beginPath();
      ctx.moveTo(-6.2, -2.0);
      ctx.quadraticCurveTo(0, -1.35, 6.2, -2.0);
      ctx.lineTo(6.2, 2.0);
      ctx.quadraticCurveTo(0, 1.35, -6.2, 2.0);
      ctx.closePath();
      ctx.fill();

      // Residual tiny meat/tendon scrap clinging to shaft
      ctx.fillStyle = '#991b1b';
      ctx.beginPath();
      ctx.ellipse(-0.8, 0.6, 2.0, 0.75, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return true;
    }

    case 'tallow': {
      drawShadow(ctx, 7.8, 3.2, 8.0, 0.24);

      // Layered tallow slab with parchment fold
      const sideGrad = ctx.createLinearGradient(-7.2, 0, 7.2, 0);
      sideGrad.addColorStop(0, '#d6c3a5');
      sideGrad.addColorStop(0.5, pal.fatCap);
      sideGrad.addColorStop(1, '#b8a07e');
      ctx.fillStyle = sideGrad;
      ctx.beginPath();
      ctx.roundRect(-7.2, -2.5, 14.4, 7.2, 1.4);
      ctx.fill();

      // Waxy creamy fat top face
      const topGrad = ctx.createLinearGradient(-7, -5, 7, 3);
      topGrad.addColorStop(0, '#ffffff');
      topGrad.addColorStop(0.6, pal.fatCap);
      topGrad.addColorStop(1, '#e7d5ad');
      ctx.fillStyle = topGrad;
      ctx.beginPath();
      ctx.roundRect(-7.2, -4.8, 14.4, 7.0, 1.4);
      ctx.fill();

      // Butcher twine ties
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 0.65;
      ctx.beginPath();
      ctx.moveTo(-3.2, -4.8); ctx.lineTo(-3.2, 4.7);
      ctx.moveTo(3.2, -4.8); ctx.lineTo(3.2, 4.7);
      ctx.stroke();

      // Waxy gloss glint
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.beginPath();
      ctx.ellipse(-2.0, -2.4, 3.2, 0.9, -0.1, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    default:
      return false;
  }
}

function drawBirdCut(ctx: CanvasRenderingContext2D, cut: string, pal: BirdPalette, bird: string): boolean {
  switch (cut) {
    case 'carcass_raw':
    case 'carcass_dressed': {
      drawShadow(ctx, 8.2, 3.4, 8.0, 0.28);

      // Folded poultry wings on left/right flanks
      for (const side of [-1, 1]) {
        drawLitEllipse(ctx, side * 5.6, 0.0, 1.8, 3.4, side * 0.25, pal.skinHighlight, pal.skin, pal.skinDark, undefined, 0.35);
      }

      // Main plump oval torso
      drawLitEllipse(ctx, 0, 0.2, 6.2, 5.2, 0, pal.skinHighlight, pal.skin, pal.skinDark, undefined, 0.4);

      // Sculpted twin breast contours & keel ridge highlight
      for (const side of [-1, 1]) {
        drawLitEllipse(ctx, side * 2.1, -0.7, 2.6, 3.4, side * 0.16, pal.skinHighlight, pal.skin, pal.skinDark, undefined, 0.35);
      }

      // Subtle poultry skin follicle pores (goosebump skin realism)
      ctx.fillStyle = pal.follicle;
      for (let i = 0; i < 14; i++) {
        const fx = (hash01(bird + 'skin', i * 2) - 0.5) * 8.2;
        const fy = (hash01(bird + 'skin', i * 2 + 1) - 0.5) * 6.5;
        ctx.beginPath();
        ctx.arc(fx, fy, 0.24, 0, Math.PI * 2);
        ctx.fill();
      }

      // Crossed drumstick legs at lower end with exposed ankle bone knobs
      for (const side of [-1, 1]) {
        drawLitEllipse(ctx, side * 2.8, 3.6, 1.8, 2.5, side * -0.35, pal.skinHighlight, pal.skin, pal.skinDark, undefined, 0.32);
        drawLitSphere(ctx, side * 3.2, 6.4, 0.9, '#ffffff', pal.bone, '#cbd5e1', undefined, 0.35);
      }

      // Neck skin flap at top
      ctx.fillStyle = pal.meat;
      ctx.beginPath();
      ctx.ellipse(0, -4.8, 1.6, 0.8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Trussed butcher cotton string
      if (cut === 'carcass_dressed') {
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(-4.4, 5.2);
        ctx.quadraticCurveTo(0, 6.0, 4.4, 5.2);
        ctx.moveTo(-5.8, 0.2);
        ctx.quadraticCurveTo(0, 1.4, 5.8, 0.2);
        ctx.stroke();
      }
      return true;
    }

    case 'breast_large': {
      drawShadow(ctx, 7.6, 3.2, 8.0, 0.26);

      const drawFillet = () => {
        ctx.beginPath();
        ctx.moveTo(-6.6, 1.8);
        ctx.bezierCurveTo(-7.2, -3.2, -2.5, -5.8, 2.4, -4.6);
        ctx.bezierCurveTo(6.8, -3.6, 7.6, 0.6, 5.2, 3.6);
        ctx.bezierCurveTo(2.4, 6.2, -4.8, 5.6, -6.6, 1.8);
        ctx.closePath();
      };

      // Extruded thickness rim
      ctx.fillStyle = pal.meatDark;
      ctx.save();
      ctx.translate(0.25, 0.9);
      drawFillet();
      ctx.fill();
      ctx.restore();

      const fGrad = ctx.createRadialGradient(-2.0, -1.6, 0.6, 0, 0.2, 7.6);
      fGrad.addColorStop(0.0, pal.meatLight);
      fGrad.addColorStop(0.58, pal.meat);
      fGrad.addColorStop(1.0, pal.meatDark);
      ctx.fillStyle = fGrad;
      drawFillet();
      ctx.fill();

      ctx.save();
      drawFillet();
      ctx.clip();

      // Fine curved poultry muscle fibers & delicate silverskin filament
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.36)';
      ctx.lineWidth = 0.45;
      for (let i = -3; i <= 3; i += 1.4) {
        ctx.beginPath();
        ctx.moveTo(-6.2, i * 0.8);
        ctx.quadraticCurveTo(0, i * 0.5 - 1.2, 6.2, i * 0.9);
        ctx.stroke();
      }

      // Moist raw sheen
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.beginPath();
      ctx.ellipse(-2.0, -2.0, 2.8, 0.95, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return true;
    }

    case 'thighs_medium': {
      drawShadow(ctx, 7.6, 3.0, 7.8, 0.26);

      // Pair of plump overlapping thighs (back & front)
      const drawThigh = (cx: number, cy: number, rot: number) => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rot);
        drawLitEllipse(ctx, 0, 0, 5.2, 3.4, 0, pal.skinHighlight, pal.skin, pal.skinDark, undefined, 0.38);

        // Exposed trimmed dark thigh meat on underside edge
        ctx.fillStyle = pal.meat;
        ctx.beginPath();
        ctx.ellipse(-2.6, 2.2, 1.9, 0.9, -0.2, 0, Math.PI * 2);
        ctx.fill();

        // Skin pores
        ctx.fillStyle = pal.follicle;
        for (const [fx, fy] of [[-1.5, -1.0], [0.8, -1.2], [2.2, 0.2], [-0.4, 0.8], [1.8, -0.4]]) {
          ctx.beginPath();
          ctx.arc(fx, fy, 0.24, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      };

      drawThigh(-1.2, -1.6, -0.18);
      drawThigh(1.4, 1.4, 0.14);
      return true;
    }

    case 'drumsticks_medium': {
      drawShadow(ctx, 7.6, 3.0, 7.8, 0.26);

      ctx.save();
      ctx.rotate(-0.14);

      // Bone shaft & double knuckle joint on right
      const shGrad = ctx.createLinearGradient(0, -1.1, 0, 1.1);
      shGrad.addColorStop(0, '#ffffff');
      shGrad.addColorStop(0.5, pal.bone);
      shGrad.addColorStop(1, '#94a3b8');
      ctx.fillStyle = shGrad;
      ctx.beginPath();
      ctx.roundRect(1.2, -1.05, 5.2, 2.1, 0.5);
      ctx.fill();
      drawLitSphere(ctx, 6.5, -1.0, 1.15, '#ffffff', pal.bone, '#cbd5e1', undefined, 0.3);
      drawLitSphere(ctx, 6.5, 1.0, 1.15, '#ffffff', pal.bone, '#94a3b8', undefined, 0.25);

      // Plump club-shaped skin-covered drumstick muscle
      const dGrad = ctx.createRadialGradient(-3.6, -1.6, 0.4, -2.2, 0, 5.4);
      dGrad.addColorStop(0.0, pal.skinHighlight);
      dGrad.addColorStop(0.55, pal.skin);
      dGrad.addColorStop(1.0, pal.skinDark);
      ctx.fillStyle = dGrad;
      ctx.beginPath();
      ctx.moveTo(-6.8, 0);
      ctx.bezierCurveTo(-6.8, -4.4, -0.6, -4.6, 2.6, -1.2);
      ctx.lineTo(2.6, 1.2);
      ctx.bezierCurveTo(-0.6, 4.6, -6.8, 4.4, -6.8, 0);
      ctx.closePath();
      ctx.fill();

      // Skin follicle pores & tendon wrap
      ctx.fillStyle = pal.follicle;
      for (const [fx, fy] of [[-4.2, -1.5], [-2.5, -1.8], [-1.2, 0.2], [-3.8, 1.2], [-2.0, 1.5]]) {
        ctx.beginPath();
        ctx.arc(fx, fy, 0.24, 0, Math.PI * 2);
        ctx.fill();
      }

      // Glossy skin catchlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.beginPath();
      ctx.ellipse(-3.2, -1.8, 2.0, 0.65, -0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return true;
    }

    case 'wings_small': {
      drawShadow(ctx, 7.2, 2.8, 7.8, 0.24);

      // Three-segment realistic folded wing: drumette -> wingette -> wingtip
      const drawSeg = (x1: number, y1: number, x2: number, y2: number, r1: number, r2: number) => {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;
        const g = ctx.createLinearGradient(x1 + nx * r1, y1 + ny * r1, x1 - nx * r1, y1 - ny * r1);
        g.addColorStop(0, pal.skinHighlight);
        g.addColorStop(0.5, pal.skin);
        g.addColorStop(1, pal.skinDark);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x1 + nx * r1, y1 + ny * r1);
        ctx.lineTo(x2 + nx * r2, y2 + ny * r2);
        ctx.arc(x2, y2, r2, Math.atan2(ny, nx), Math.atan2(-ny, -nx), false);
        ctx.lineTo(x1 - nx * r1, y1 - ny * r1);
        ctx.arc(x1, y1, r1, Math.atan2(-ny, -nx), Math.atan2(ny, nx), false);
        ctx.closePath();
        ctx.fill();
      };

      drawSeg(-5.8, 2.4, -0.4, -4.0, 2.1, 1.8);
      drawSeg(-0.4, -4.0, 4.6, 0.6, 1.8, 1.35);
      drawSeg(4.6, 0.6, 6.8, 3.6, 1.15, 0.55);

      // Cut joint bone tip on drumette
      drawCutBoneNode(ctx, -5.8, 2.4, 1.0, 0.85, 0.4);
      return true;
    }

    case 'necks_small': {
      drawShadow(ctx, 7.2, 2.5, 7.8, 0.22);

      // Segmented raw necks with cervical muscle rings
      const segs = 7;
      for (let i = 0; i < segs; i++) {
        const t = i / (segs - 1);
        const x = -5.6 + t * 11.2;
        const y = 1.6 - Math.sin(t * Math.PI) * 3.2;
        const r = 1.75 - Math.abs(t - 0.5) * 0.4;
        drawLitSphere(ctx, x, y, r, pal.skinHighlight, pal.skin, pal.skinDark, pal.meat, 0.25);
      }

      // Exposed bloody/ivory neck end
      drawCutBoneNode(ctx, -5.6, 1.6, 0.9, 0.9, 0);
      return true;
    }

    case 'liver': {
      drawShadow(ctx, 6.2, 2.6, 7.8, 0.25);

      // Twin smooth glossy poultry liver lobes
      for (const [cx, cy, rx, ry, rot] of [
        [-2.0, -0.4, 3.2, 2.4, -0.3],
        [1.8, 0.4, 3.6, 2.7, 0.25]
      ]) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rot);
        const g = ctx.createRadialGradient(-rx * 0.3, -ry * 0.3, 0.2, 0, 0, rx * 1.1);
        g.addColorStop(0.0, '#991b1b');
        g.addColorStop(0.55, '#6b1218');
        g.addColorStop(1.0, '#3b070e');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.34)';
        ctx.beginPath();
        ctx.ellipse(-rx * 0.3, -ry * 0.35, rx * 0.35, ry * 0.18, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      return true;
    }

    case 'giblets': {
      drawShadow(ctx, 6.8, 2.8, 7.8, 0.26);

      // Firm silver-sheathed gizzard + small deep crimson heart
      drawLitEllipse(ctx, -2.2, 0.2, 3.6, 2.9, -0.15, '#be185d', '#881337', '#4c0519', '#f1f5f9', 0.45);
      // Characteristic gizzard tendinous silver sheen band
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.62)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(-2.2, 0.2, 2.1, -0.8, 1.4);
      ctx.stroke();

      // Conical glossy poultry heart
      drawLitEllipse(ctx, 2.8, 0.3, 2.3, 3.0, 0.28, '#dc2626', '#991b1b', '#450a0a', '#fef08a', 0.52);
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(1.2, -1.2);
      ctx.quadraticCurveTo(2.8, -0.6, 4.4, -1.0);
      ctx.stroke();
      return true;
    }

    case 'bones': {
      drawShadow(ctx, 7.2, 2.8, 7.8, 0.24);

      // Realistic ivory poultry carcass sternum keel & ribs + wishbone
      const bGrad = ctx.createLinearGradient(-4, -5, 4, 5);
      bGrad.addColorStop(0, '#ffffff');
      bGrad.addColorStop(0.5, pal.bone);
      bGrad.addColorStop(1, '#94a3b8');

      ctx.strokeStyle = bGrad;
      ctx.lineWidth = 1.45;
      ctx.lineCap = 'round';
      // Wishbone furcula V-arch
      ctx.beginPath();
      ctx.moveTo(-4.6, 3.2);
      ctx.quadraticCurveTo(0, -6.5, 4.6, 3.2);
      ctx.stroke();

      // Keel sternum spine + thin arched ribs
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(0, -4.8);
      ctx.lineTo(0, 5.2);
      ctx.stroke();

      ctx.lineWidth = 0.7;
      for (const ry of [-1.2, 1.0, 3.2]) {
        ctx.beginPath();
        ctx.moveTo(-3.4, ry + 0.8);
        ctx.quadraticCurveTo(0, ry - 0.6, 3.4, ry + 0.8);
        ctx.stroke();
      }

      // Hypocleideum top knob
      drawLitSphere(ctx, 0, -5.0, 1.05, '#ffffff', pal.bone, '#94a3b8', undefined, 0.35);
      return true;
    }

    default:
      return false;
  }
}

function drawMincedMeat(ctx: CanvasRenderingContext2D, itemId: string): boolean {
  drawShadow(ctx, 8.6, 3.5, 8.4, 0.28);

  let primary = '#a61c1c';
  let dark = '#5e0f0f';
  let light = '#dc2626';
  let fat = '#fef3c7';

  if (itemId.startsWith('pork_')) {
    primary = '#db5c79'; dark = '#831843'; light = '#f48ea6'; fat = '#fff5f7';
  } else if (itemId.startsWith('chicken_') || itemId.startsWith('turkey_') || itemId.startsWith('duck_') || itemId.startsWith('goose_')) {
    primary = '#e4727e'; dark = '#9f1239'; light = '#fda4af'; fat = '#fff7ed';
  } else if (itemId.startsWith('salmon_') || itemId.startsWith('tuna_') || itemId.startsWith('cod_') || itemId.includes('fish')) {
    primary = '#ea6a47'; dark = '#9a3412'; light = '#fdba74'; fat = '#f8fafc';
  } else if (itemId === 'minced_meat_mixed' || itemId.includes('minced')) {
    primary = '#b42336'; dark = '#68101c'; light = '#e1495c'; fat = '#fef2f2';
  }

  // Organic minced meat pile base with dark ambient shadow bed
  const drawPile = () => drawOrganicBlobPath(ctx, 0, 0.2, 8.0, 6.0, 901, 0.1, 12);
  ctx.fillStyle = dark;
  drawPile();
  ctx.fill();

  ctx.save();
  drawPile();
  ctx.clip();

  // Layered extruded meat-grinder worms/coils with core shadows & fat flecks
  for (let i = 0; i < 24; i++) {
    const t = i / 23;
    const x0 = -7.0 + hash01(itemId, i * 5) * 10.5;
    const y0 = -4.6 + t * 8.6 + (hash01(itemId, i * 5 + 1) - 0.5) * 1.4;
    const len = 3.2 + hash01(itemId, i * 5 + 2) * 3.0;
    const bend = (hash01(itemId, i * 5 + 3) - 0.5) * 2.8;
    const x1 = x0 + len;
    const y1 = y0 + (hash01(itemId, i * 5 + 4) - 0.5) * 1.6;

    // Crevice shadow under strand
    ctx.strokeStyle = dark;
    ctx.lineWidth = 1.65;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x0, y0 + 0.35);
    ctx.quadraticCurveTo((x0 + x1) * 0.5, (y0 + y1) * 0.5 + bend + 0.35, x1, y1 + 0.35);
    ctx.stroke();

    // Primary extruded muscle coil
    ctx.strokeStyle = i % 5 === 0 ? adjustHex(primary, 0.12) : primary;
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo((x0 + x1) * 0.5, (y0 + y1) * 0.5 + bend, x1, y1);
    ctx.stroke();

    // Specular ridge along top of strand
    ctx.strokeStyle = i % 4 === 0 ? fat : light;
    ctx.lineWidth = 0.42;
    ctx.beginPath();
    ctx.moveTo(x0 + 0.3, y0 - 0.28);
    ctx.quadraticCurveTo((x0 + x1) * 0.5, (y0 + y1) * 0.5 + bend - 0.28, x1 - 0.3, y1 - 0.28);
    ctx.stroke();
  }

  // Natural white fat marbling specks
  ctx.fillStyle = fat;
  for (let i = 0; i < 16; i++) {
    const fx = (hash01(itemId + 'fat', i * 3) - 0.5) * 12.2;
    const fy = (hash01(itemId + 'fat', i * 3 + 1) - 0.5) * 8.6;
    const fr = 0.28 + hash01(itemId + 'fat', i * 3 + 2) * 0.35;
    ctx.beginPath();
    ctx.arc(fx, fy, fr, 0, Math.PI * 2);
    ctx.fill();
  }

  // Fresh glistening moisture highlights on mound dome
  ctx.fillStyle = 'rgba(255, 255, 255, 0.26)';
  ctx.beginPath();
  ctx.ellipse(-2.0, -2.4, 2.8, 1.0, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  return true;
}
