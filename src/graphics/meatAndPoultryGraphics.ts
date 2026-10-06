// Procedural 2D Canvas Models for Meat, Offal and Poultry
import { drawShadow, drawGlossBand } from './itemGraphicShared';

interface MeatPalette {
  primary: string;
  dark: string;
  light: string;
  fat: string;
  fatCap: string;
}

const MEAT_PALETTES: Record<string, MeatPalette> = {
  beef: { primary: '#b91c1c', dark: '#7f1d1d', light: '#ef4444', fat: '#fef2f2', fatCap: '#fef08a' },
  pork: { primary: '#f472b6', dark: '#db2777', light: '#fbcfe8', fat: '#fff1f2', fatCap: '#fdf2f8' },
  mutton: { primary: '#9a3412', dark: '#7c2d12', light: '#ea580c', fat: '#fef3c7', fatCap: '#fef9c3' },
  venison: { primary: '#881337', dark: '#4c0519', light: '#be123c', fat: '#fdf2f8', fatCap: '#f5d0fe' },
  goat: { primary: '#b45309', dark: '#78350f', light: '#d97706', fat: '#fef2f2', fatCap: '#fef3c7' }
};

interface BirdPalette {
  skin: string;
  skinDark: string;
  meat: string;
  bone: string;
}

const BIRD_PALETTES: Record<string, BirdPalette> = {
  chicken: { skin: '#fed7aa', skinDark: '#f97316', meat: '#fca5a5', bone: '#f8fafc' },
  duck: { skin: '#fdba74', skinDark: '#ea580c', meat: '#f87171', bone: '#f1f5f9' },
  goose: { skin: '#fcd34d', skinDark: '#d97706', meat: '#ef4444', bone: '#f1f5f9' },
  turkey: { skin: '#ffedd5', skinDark: '#c2410c', meat: '#f87171', bone: '#f8fafc' },
  pheasant: { skin: '#fde68a', skinDark: '#b45309', meat: '#dc2626', bone: '#e2e8f0' },
  quail: { skin: '#fef08a', skinDark: '#d97706', meat: '#fca5a5', bone: '#ffffff' }
};

export function drawMeatAndPoultryItem(ctx: CanvasRenderingContext2D, itemId: string): boolean {
  // Check Minced Meat Tray / Vacuum Pack
  if (itemId === 'minced_meat_mixed' || itemId.includes('minced')) {
    return drawMincedMeatTray(ctx, itemId);
  }

  // 1. Check Mammal Meats
  for (const animal of ['beef', 'pork', 'mutton', 'venison', 'goat']) {
    if (itemId.startsWith(`${animal}_`)) {
      const cut = itemId.slice(animal.length + 1);
      const pal = MEAT_PALETTES[animal] || MEAT_PALETTES.beef;
      return drawMammalCut(ctx, cut, pal, animal);
    }
  }

  // 2. Check Poultry / Birds
  for (const bird of ['chicken', 'duck', 'goose', 'turkey', 'pheasant', 'quail']) {
    if (itemId.startsWith(`${bird}_`)) {
      const cut = itemId.slice(bird.length + 1);
      const pal = BIRD_PALETTES[bird] || BIRD_PALETTES.chicken;
      return drawBirdCut(ctx, cut, pal, bird);
    }
  }

  return false;
}

function drawMammalCut(ctx: CanvasRenderingContext2D, cut: string, pal: MeatPalette, _animal: string): boolean {
  switch (cut) {
    // Large whole carcass on butcher hook
    case 'carcass': {
      drawShadow(ctx, 8.5, 3.2, 8.5, 0.3);

      // Steel hanging hook
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(0, -7.5, 2.2, Math.PI, 0);
      ctx.lineTo(2.2, -5);
      ctx.stroke();

      // Carcass torso silhouette
      ctx.fillStyle = pal.primary;
      ctx.beginPath();
      ctx.moveTo(-6.5, -5);
      ctx.lineTo(6.5, -5);
      ctx.quadraticCurveTo(7.5, 2, 4.5, 7.5);
      ctx.lineTo(-4.5, 7.5);
      ctx.quadraticCurveTo(-7.5, 2, -6.5, -5);
      ctx.closePath();
      ctx.fill();

      // Split spinal cord / vertebral column (ivory bone)
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-0.8, -5, 1.6, 12);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 0.6;
      for (let y = -4; y <= 6; y += 1.8) {
        ctx.beginPath();
        ctx.moveTo(-1.2, y); ctx.lineTo(1.2, y);
        ctx.stroke();
      }

      // Rib bones & intercostal meat striations
      ctx.strokeStyle = pal.fat;
      ctx.lineWidth = 0.9;
      for (let y = -3; y <= 4; y += 2) {
        ctx.beginPath();
        ctx.moveTo(-1.5, y); ctx.lineTo(-5.5, y - 0.8);
        ctx.moveTo(1.5, y); ctx.lineTo(5.5, y - 0.8);
        ctx.stroke();
      }

      // Outer fat cap layer
      ctx.strokeStyle = pal.fatCap;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-6.5, -5);
      ctx.quadraticCurveTo(-7.5, 2, -4.5, 7.5);
      ctx.moveTo(6.5, -5);
      ctx.quadraticCurveTo(7.5, 2, 4.5, 7.5);
      ctx.stroke();
      return true;
    }

    // Half carcass / side
    case 'side': {
      drawShadow(ctx, 6.5, 3.2, 8.5, 0.28);

      ctx.fillStyle = pal.primary;
      ctx.beginPath();
      ctx.moveTo(-2, -7.5);
      ctx.lineTo(6.5, -6);
      ctx.quadraticCurveTo(7, 2, 4, 7.5);
      ctx.lineTo(-2, 7.5);
      ctx.closePath();
      ctx.fill();

      // Vertebrae line on cut side
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-2, -7.5, 1.5, 15);

      // Rib arcs
      ctx.strokeStyle = pal.fat;
      ctx.lineWidth = 1;
      for (let y = -4; y <= 5; y += 2.2) {
        ctx.beginPath();
        ctx.moveTo(-0.5, y); ctx.lineTo(5.2, y - 0.8);
        ctx.stroke();
      }

      // Fat border
      ctx.strokeStyle = pal.fatCap;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(6.5, -6);
      ctx.quadraticCurveTo(7, 2, 4, 7.5);
      ctx.stroke();
      return true;
    }

    // Quarter / leg cut
    case 'quarter': {
      drawShadow(ctx, 7.5, 3.2, 8.2, 0.28);

      // Main muscular haunch
      ctx.fillStyle = pal.primary;
      ctx.beginPath();
      ctx.moveTo(-6.5, -4);
      ctx.quadraticCurveTo(-7.5, 3, -1, 7);
      ctx.quadraticCurveTo(6, 7.5, 6.5, 1);
      ctx.quadraticCurveTo(6.5, -5, 0, -6.5);
      ctx.closePath();
      ctx.fill();

      // Center bone knuckle
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(0, -3.5, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.arc(0, -3.5, 1, 0, Math.PI * 2);
      ctx.fill();

      // Marbling striations
      ctx.strokeStyle = pal.fat;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-4, 0); ctx.quadraticCurveTo(-1, 3, 4, 3);
      ctx.moveTo(-3, 4); ctx.quadraticCurveTo(1, 5.5, 5, 4.5);
      ctx.stroke();

      // Fat cap
      ctx.strokeStyle = pal.fatCap;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(0, -6.5, 4.5, Math.PI * 0.9, Math.PI * 1.8);
      ctx.stroke();
      return true;
    }

    // Thick marbled slab of tenderloin / steak
    case 'tenderloin_huge': {
      drawShadow(ctx, 8.5, 3.4, 8, 0.28);

      // Premium thick steak cut (filet mignon / tomahawk muscle)
      ctx.fillStyle = pal.primary;
      ctx.beginPath();
      ctx.ellipse(0, 0.5, 8.2, 5.2, -0.15, 0, Math.PI * 2);
      ctx.fill();

      // Deep dark muscle fiber core
      ctx.fillStyle = pal.dark;
      ctx.beginPath();
      ctx.ellipse(0.5, 0.8, 6.5, 3.8, -0.15, 0, Math.PI * 2);
      ctx.fill();

      // Intricate A5 wagyu style marbling lines
      ctx.strokeStyle = pal.fat;
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(-5.5, -2); ctx.quadraticCurveTo(-2, -0.5, 1, -2.5);
      ctx.moveTo(-4, 1.5); ctx.quadraticCurveTo(0, 0, 4.5, 1);
      ctx.moveTo(-2, 3); ctx.quadraticCurveTo(2, 2.5, 5.5, -1);
      ctx.moveTo(-6, 0.5); ctx.lineTo(-3, 0);
      ctx.moveTo(2, -1); ctx.lineTo(5, -2.2);
      ctx.stroke();

      // Glistening meat juice sheen
      drawGlossBand(ctx, -5, -2.5, 3.5, 1.2, 0.35);

      // Creamy perimeter fat band
      ctx.strokeStyle = pal.fatCap;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0.5, 8.2, Math.PI * 0.7, Math.PI * 1.5);
      ctx.stroke();
      return true;
    }

    // Large marbled brisket cut
    case 'brisket_large': {
      drawShadow(ctx, 8.8, 3.5, 8, 0.26);

      // Rectangular striated brisket slab
      ctx.fillStyle = pal.primary;
      ctx.beginPath();
      ctx.roundRect(-8, -4.5, 16, 9.5, 2);
      ctx.fill();

      // Muscle grain striations
      ctx.strokeStyle = pal.dark;
      ctx.lineWidth = 0.8;
      for (let y = -2.5; y <= 3; y += 1.5) {
        ctx.beginPath();
        ctx.moveTo(-7.5, y); ctx.lineTo(7.5, y);
        ctx.stroke();
      }

      // Interspersed fat seams
      ctx.strokeStyle = pal.fat;
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(-7.8, -1.2); ctx.lineTo(7.8, -1.2);
      ctx.moveTo(-7.8, 1.8);  ctx.lineTo(7.8, 1.8);
      ctx.stroke();

      // Thick top fat cap
      ctx.fillStyle = pal.fatCap;
      ctx.beginPath();
      ctx.roundRect(-8, -4.5, 16, 2.2, [2, 2, 0, 0]);
      ctx.fill();
      return true;
    }

    // Rounded rump roast
    case 'rump_large': {
      drawShadow(ctx, 8, 3.5, 8, 0.28);

      // Solid rounded butcher's rump roast
      ctx.fillStyle = pal.primary;
      ctx.beginPath();
      ctx.roundRect(-7.5, -5.5, 15, 11, 4);
      ctx.fill();

      // Butcher's twine ties
      ctx.strokeStyle = '#fef3c7';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(-4, -5.5); ctx.lineTo(-4, 5.5);
      ctx.moveTo(0, -5.5);  ctx.lineTo(0, 5.5);
      ctx.moveTo(4, -5.5);  ctx.lineTo(4, 5.5);
      ctx.stroke();

      // Marbled flecks
      ctx.fillStyle = pal.fat;
      ctx.beginPath();
      ctx.arc(-2, -1, 0.7, 0, Math.PI * 2);
      ctx.arc(2, 2, 0.8, 0, Math.PI * 2);
      ctx.arc(-5, 2, 0.6, 0, Math.PI * 2);
      ctx.arc(5, -2, 0.7, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    // Neck cut
    case 'neck_medium': {
      drawShadow(ctx, 7.5, 3.2, 8, 0.26);

      // Irregular contoured neck meat
      ctx.fillStyle = pal.primary;
      ctx.beginPath();
      ctx.moveTo(-6.5, -4);
      ctx.quadraticCurveTo(-3, -6, 2, -4.5);
      ctx.quadraticCurveTo(7, -3, 6.5, 2);
      ctx.quadraticCurveTo(5, 6, -1, 5.5);
      ctx.quadraticCurveTo(-7, 5, -6.5, -4);
      ctx.closePath();
      ctx.fill();

      // Heavy collagen / fat webbing
      ctx.strokeStyle = pal.fat;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-5, -2); ctx.lineTo(4, 3);
      ctx.moveTo(-3, 3);  ctx.lineTo(5, -1);
      ctx.stroke();
      return true;
    }

    // Rack of ribs
    case 'ribs_medium': {
      drawShadow(ctx, 8.5, 3.5, 8.2, 0.28);

      // Meat slab backing
      ctx.fillStyle = pal.primary;
      ctx.beginPath();
      ctx.roundRect(-8, -3, 16, 7.5, 2);
      ctx.fill();

      // 4 distinct curved rib bones protruding
      ctx.fillStyle = '#f8fafc';
      const boneXs = [-6, -2, 2, 6];
      for (const bx of boneXs) {
        // Upper bone tip
        ctx.beginPath();
        ctx.roundRect(bx - 0.9, -6.5, 1.8, 4, 0.8);
        ctx.fill();
        // Lower bone tip
        ctx.beginPath();
        ctx.roundRect(bx - 0.9, 3.5, 1.8, 3.5, 0.8);
        ctx.fill();
      }

      // Meat surface between bones
      ctx.fillStyle = pal.dark;
      for (let i = 0; i < 3; i++) {
        const mx = (boneXs[i] + boneXs[i + 1]) / 2;
        ctx.fillRect(mx - 0.8, -2.5, 1.6, 6);
      }

      // Fat line
      ctx.strokeStyle = pal.fatCap;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-8, 1); ctx.lineTo(8, 1);
      ctx.stroke();
      return true;
    }

    // Chopped stew meat scraps
    case 'scraps_small': {
      drawShadow(ctx, 8, 3, 7.8, 0.24);

      // 5 chunky cubes of stewing meat
      const cubes = [
        { x: -5, y: -2, w: 4, h: 3.5 },
        { x: 0,  y: -3, w: 4.5, h: 4 },
        { x: 4.5, y: -1.5, w: 3.8, h: 3.8 },
        { x: -3, y: 1.5, w: 4.2, h: 3.5 },
        { x: 2,  y: 2, w: 4, h: 3.8 }
      ];

      for (const c of cubes) {
        ctx.fillStyle = pal.primary;
        ctx.beginPath();
        ctx.roundRect(c.x - c.w / 2, c.y - c.h / 2, c.w, c.h, 0.8);
        ctx.fill();

        // Fat edge
        ctx.fillStyle = pal.fat;
        ctx.fillRect(c.x - c.w / 2, c.y - c.h / 2, c.w, 0.8);
      }
      return true;
    }

    // Organs: Liver
    case 'liver': {
      drawShadow(ctx, 7.5, 3, 7.8, 0.28);

      // Deep dark burgundy smooth organ
      const liverGrad = ctx.createLinearGradient(-6, -4, 6, 4);
      liverGrad.addColorStop(0, '#581c87');
      liverGrad.addColorStop(0.4, '#4c0519');
      liverGrad.addColorStop(1, '#881337');
      ctx.fillStyle = liverGrad;
      ctx.beginPath();
      ctx.moveTo(-6.5, -1);
      ctx.quadraticCurveTo(-4, -6, 2, -4.5);
      ctx.quadraticCurveTo(7, -3, 6.5, 2.5);
      ctx.quadraticCurveTo(2, 6, -3, 4.5);
      ctx.quadraticCurveTo(-7, 3, -6.5, -1);
      ctx.closePath();
      ctx.fill();

      // Glossy sheen of fresh organ
      drawGlossBand(ctx, -4, -3, 3, 1.2, 0.45);
      drawGlossBand(ctx, 1, 0, 2.5, 1, 0.35);
      return true;
    }

    // Anatomical Heart
    case 'heart': {
      drawShadow(ctx, 6.5, 2.8, 8, 0.28);

      // Heart muscle
      ctx.fillStyle = '#7f1d1d';
      ctx.beginPath();
      ctx.moveTo(0, 6.5);
      ctx.bezierCurveTo(-6, 3, -6.5, -3, -2.5, -4.5);
      ctx.bezierCurveTo(-0.5, -5, 0, -3.5, 0, -2.5);
      ctx.bezierCurveTo(0, -3.5, 0.5, -5, 2.5, -4.5);
      ctx.bezierCurveTo(6.5, -3, 6, 3, 0, 6.5);
      ctx.closePath();
      ctx.fill();

      // Aorta stump at top
      ctx.fillStyle = '#fca5a5';
      ctx.fillRect(-1.5, -7, 3, 3);
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.ellipse(0, -7, 1.4, 0.6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Coronary fat band & groove
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-3, -2.5); ctx.quadraticCurveTo(0, -1, 3, -2.5);
      ctx.stroke();
      return true;
    }

    // Kidney
    case 'kidney': {
      drawShadow(ctx, 6.5, 2.8, 7.8, 0.26);

      // Bean-shaped glossy dark kidney
      ctx.fillStyle = '#581c87';
      ctx.beginPath();
      ctx.moveTo(-5.5, 0);
      ctx.bezierCurveTo(-5.5, -5, 4.5, -5.5, 5.5, -2);
      ctx.bezierCurveTo(6, 1, 2, 0, 1.5, 2);
      ctx.bezierCurveTo(1, 4.5, 5, 4, 4.5, 5.5);
      ctx.bezierCurveTo(3, 7, -5.5, 5, -5.5, 0);
      ctx.closePath();
      ctx.fill();

      drawGlossBand(ctx, -3.5, -3, 2.5, 1, 0.4);
      return true;
    }

    // Brain
    case 'brain': {
      drawShadow(ctx, 7, 3, 7.8, 0.25);

      // Pinkish cerebral hemispheres with convoluted gyri folds
      ctx.fillStyle = '#fbcfe8';
      ctx.beginPath();
      ctx.roundRect(-6.5, -5, 13, 10, 4);
      ctx.fill();

      // Hemisphere center fissure
      ctx.strokeStyle = '#db2777';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(0, -5); ctx.lineTo(0, 5);
      ctx.stroke();

      // Gyri convoluted squiggles
      ctx.strokeStyle = '#f472b6';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      // Left gyri
      ctx.moveTo(-5, -2); ctx.quadraticCurveTo(-2, -3.5, -4, 0);
      ctx.quadraticCurveTo(-1.5, 1, -4.5, 3);
      // Right gyri
      ctx.moveTo(5, -2); ctx.quadraticCurveTo(2, -3.5, 4, 0);
      ctx.quadraticCurveTo(1.5, 1, 4.5, 3);
      ctx.stroke();
      return true;
    }

    // Tongue
    case 'tongue': {
      drawShadow(ctx, 7, 2.8, 7.8, 0.25);

      // Elongated butcher's tongue
      ctx.fillStyle = '#db2777';
      ctx.beginPath();
      ctx.roundRect(-4.5, -6.5, 9, 13, [4, 4, 2, 2]);
      ctx.fill();

      // Taste papillae texture
      ctx.fillStyle = '#fbcfe8';
      for (let y = -4; y <= 4; y += 1.8) {
        ctx.beginPath();
        ctx.arc(-2, y, 0.5, 0, Math.PI * 2);
        ctx.arc(2, y, 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      return true;
    }

    // Tripe (honeycomb stomach lining)
    case 'tripe': {
      drawShadow(ctx, 7.5, 3, 7.8, 0.22);

      // Pale cream folded honeycomb sheet
      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.roundRect(-7, -5, 14, 10, 2);
      ctx.fill();

      // Honeycomb cell grid pattern
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 0.6;
      for (let x = -5; x <= 5; x += 2.5) {
        for (let y = -3; y <= 3; y += 2) {
          ctx.strokeRect(x, y, 1.8, 1.4);
        }
      }
      return true;
    }

    // Cleaned Intestines
    case 'intestines': {
      drawShadow(ctx, 7, 3, 7.8, 0.22);

      // Coiled loops of translucent casing
      ctx.strokeStyle = '#fed7aa';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(-2, -1, 3, 0, Math.PI * 1.5);
      ctx.arc(1.5, 1.5, 3, Math.PI, Math.PI * 2.5);
      ctx.stroke();

      ctx.strokeStyle = '#fbcfe8';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(-2, -1, 3, 0, Math.PI * 1.5);
      ctx.arc(1.5, 1.5, 3, Math.PI, Math.PI * 2.5);
      ctx.stroke();
      return true;
    }

    // Marrow bone cylinder
    case 'bone_marrow': {
      drawShadow(ctx, 7, 3, 7.8, 0.26);

      // Sawed hollow bone cylinder (Ivory)
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.ellipse(0, 0, 6.5, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Outer cortical bone ring
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(0, 0, 6.5, 5, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Rich yellow-red marrow center
      const marrowGrad = ctx.createRadialGradient(0, 0, 0.5, 0, 0, 3.5);
      marrowGrad.addColorStop(0, '#fef08a');
      marrowGrad.addColorStop(0.7, '#f59e0b');
      marrowGrad.addColorStop(1, '#b91c1c');
      ctx.fillStyle = marrowGrad;
      ctx.beginPath();
      ctx.ellipse(0, 0, 3.8, 2.8, 0, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    // Elongated soup shank bone
    case 'bone_soup': {
      drawShadow(ctx, 8.5, 2.8, 7.8, 0.26);

      // Shank shaft
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.roundRect(-6, -1.8, 12, 3.6, 1);
      ctx.fill();

      // Left joint epiphysis knobs
      ctx.beginPath();
      ctx.arc(-6.5, -2, 2.2, 0, Math.PI * 2);
      ctx.arc(-6.5, 2, 2.2, 0, Math.PI * 2);
      // Right joint epiphysis knobs
      ctx.arc(6.5, -2, 2.2, 0, Math.PI * 2);
      ctx.arc(6.5, 2, 2.2, 0, Math.PI * 2);
      ctx.fill();

      // Bone shading
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(-5, 0); ctx.lineTo(5, 0);
      ctx.stroke();
      return true;
    }

    // Rendered tallow / fat block
    case 'tallow': {
      drawShadow(ctx, 7.5, 3.2, 8, 0.22);

      // White/ivory wrapped butcher block of fat
      ctx.fillStyle = pal.fatCap;
      ctx.beginPath();
      ctx.roundRect(-7, -4.5, 14, 9, 1.5);
      ctx.fill();

      // Butcher paper wrap seams
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 0.7;
      ctx.strokeRect(-7, -4.5, 14, 9);
      ctx.beginPath();
      ctx.moveTo(-7, 0); ctx.lineTo(7, 0);
      ctx.moveTo(0, -4.5); ctx.lineTo(0, 4.5);
      ctx.stroke();
      return true;
    }

    default:
      return false;
  }
}

function drawBirdCut(ctx: CanvasRenderingContext2D, cut: string, pal: BirdPalette, _bird: string): boolean {
  switch (cut) {
    // Whole plucked raw bird
    case 'carcass_raw':
    case 'carcass_dressed': {
      drawShadow(ctx, 8, 3.4, 8, 0.26);

      // Plump poultry torso
      ctx.fillStyle = pal.skin;
      ctx.beginPath();
      ctx.ellipse(0, 0.5, 6.8, 5.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Plump breasts
      ctx.fillStyle = pal.skinDark;
      ctx.beginPath();
      ctx.ellipse(-2.2, -0.5, 2.8, 3.8, -0.2, 0, Math.PI * 2);
      ctx.ellipse(2.2, -0.5, 2.8, 3.8, 0.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = pal.skin;
      ctx.beginPath();
      ctx.ellipse(-2.2, -0.8, 2.5, 3.4, -0.2, 0, Math.PI * 2);
      ctx.ellipse(2.2, -0.8, 2.5, 3.4, 0.2, 0, Math.PI * 2);
      ctx.fill();

      // Drumstick legs tied at rear
      ctx.fillStyle = pal.skin;
      ctx.beginPath();
      ctx.roundRect(-4.5, 3, 3, 3.5, 1.2);
      ctx.roundRect(1.5, 3, 3, 3.5, 1.2);
      ctx.fill();

      // White leg bone tips
      ctx.fillStyle = pal.bone;
      ctx.beginPath();
      ctx.arc(-3, 6.8, 1, 0, Math.PI * 2);
      ctx.arc(3, 6.8, 1, 0, Math.PI * 2);
      ctx.fill();

      // Wings folded against sides
      ctx.strokeStyle = pal.skinDark;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-6, -2); ctx.quadraticCurveTo(-6.8, 1, -4.5, 3);
      ctx.moveTo(6, -2); ctx.quadraticCurveTo(6.8, 1, 4.5, 3);
      ctx.stroke();

      // Butcher string tying legs
      if (cut === 'carcass_dressed') {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(-4, 5.5); ctx.lineTo(4, 5.5);
        ctx.stroke();
      }
      return true;
    }

    // Breast fillet cut
    case 'breast_large': {
      drawShadow(ctx, 7.5, 3.2, 8, 0.26);

      // Plump teardrop fillet
      ctx.fillStyle = pal.meat;
      ctx.beginPath();
      ctx.moveTo(-6, 2);
      ctx.quadraticCurveTo(-7, -4, -1, -5.5);
      ctx.quadraticCurveTo(6, -5, 6.5, 0);
      ctx.quadraticCurveTo(7, 4.5, 1, 5.5);
      ctx.quadraticCurveTo(-4, 6, -6, 2);
      ctx.closePath();
      ctx.fill();

      // Smooth glossy sheen
      drawGlossBand(ctx, -3, -3, 4, 1.5, 0.4);
      return true;
    }

    // Chicken / duck thighs
    case 'thighs_medium': {
      drawShadow(ctx, 7.5, 3, 7.8, 0.26);

      // Curved poultry thigh with skin
      ctx.fillStyle = pal.skin;
      ctx.beginPath();
      ctx.roundRect(-6.5, -4.5, 13, 9, 3.5);
      ctx.fill();

      // Skin crease highlight
      ctx.strokeStyle = pal.skinDark;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-4, -1); ctx.quadraticCurveTo(0, 1.5, 4, -1);
      ctx.stroke();
      return true;
    }

    // Drumsticks
    case 'drumsticks_medium': {
      drawShadow(ctx, 7.5, 3, 7.8, 0.26);

      // Meat bulb on left
      ctx.fillStyle = pal.skin;
      ctx.beginPath();
      ctx.ellipse(-2, 0, 4.8, 4.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Bone shaft extending to right
      ctx.fillStyle = pal.bone;
      ctx.beginPath();
      ctx.roundRect(1, -1.2, 5, 2.4, 0.6);
      ctx.fill();

      // Bone double knuckle tip
      ctx.beginPath();
      ctx.arc(6.2, -1.2, 1.3, 0, Math.PI * 2);
      ctx.arc(6.2, 1.2, 1.3, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    // Wings
    case 'wings_small': {
      drawShadow(ctx, 7, 2.8, 7.8, 0.24);

      // 2-joint V-shaped wing
      ctx.strokeStyle = pal.skin;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(-5.5, 2);
      ctx.lineTo(0, -4.5);
      ctx.lineTo(5.5, 3);
      ctx.stroke();

      // Wingtip
      ctx.fillStyle = pal.bone;
      ctx.beginPath();
      ctx.arc(-5.5, 2, 1.4, 0, Math.PI * 2);
      ctx.arc(5.5, 3, 1.4, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    // Necks
    case 'necks_small': {
      drawShadow(ctx, 7, 2.5, 7.8, 0.22);

      // Slender segmented poultry neck
      ctx.strokeStyle = pal.skin;
      ctx.lineWidth = 3.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-5.5, 2);
      ctx.quadraticCurveTo(0, -4, 5.5, 2);
      ctx.stroke();

      // Vertebrae segments
      ctx.strokeStyle = pal.skinDark;
      ctx.lineWidth = 0.8;
      for (let x = -3; x <= 3; x += 1.8) {
        ctx.beginPath();
        ctx.moveTo(x, -1); ctx.lineTo(x, 1.5);
        ctx.stroke();
      }
      return true;
    }

    // Bird liver
    case 'liver': {
      drawShadow(ctx, 6, 2.5, 7.8, 0.24);

      // Small glossy dark red liver lobe
      ctx.fillStyle = '#7f1d1d';
      ctx.beginPath();
      ctx.ellipse(0, 0, 5, 3.2, 0.2, 0, Math.PI * 2);
      ctx.fill();
      drawGlossBand(ctx, -2.5, -1.5, 2.5, 0.8, 0.45);
      return true;
    }

    // Giblets (gizzard & heart)
    case 'giblets': {
      drawShadow(ctx, 6.5, 2.8, 7.8, 0.24);

      // Gizzard (firm purplish muscular organ)
      ctx.fillStyle = '#881337';
      ctx.beginPath();
      ctx.ellipse(-2.2, 0, 3.5, 2.8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Small bird heart
      ctx.fillStyle = '#991b1b';
      ctx.beginPath();
      ctx.ellipse(2.5, 0.5, 2.4, 3, 0.3, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    // Bones / wishbone skeleton
    case 'bones': {
      drawShadow(ctx, 7, 2.8, 7.8, 0.24);

      // Wishbone & ribcage skeleton (Ivory)
      ctx.strokeStyle = pal.bone;
      ctx.lineWidth = 1.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      // Wishbone V
      ctx.moveTo(0, -6); ctx.lineTo(-4.5, 3);
      ctx.moveTo(0, -6); ctx.lineTo(4.5, 3);
      // Center joint
      ctx.moveTo(0, -6); ctx.lineTo(0, -4);
      ctx.stroke();
      return true;
    }

    default:
      return false;
  }
}

function drawMincedMeatTray(ctx: CanvasRenderingContext2D, itemId: string): boolean {
  drawShadow(ctx, 8.5, 3.5, 8.5, 0.28);

  // 1. Black Styrofoam / Polymer tray base
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.roundRect(-8.5, -5.5, 17, 11, 2.2);
  ctx.fill();
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // 2. White absorbent butcher pad
  ctx.fillStyle = '#f1f5f9';
  ctx.beginPath();
  ctx.roundRect(-7.8, -4.8, 15.6, 9.6, 1.8);
  ctx.fill();

  // Color determination based on itemId
  let primary = '#b91c1c';
  let dark = '#7f1d1d';
  let fat = '#fef2f2';

  if (itemId.startsWith('pork_')) {
    primary = '#e11d48'; dark = '#9f1239'; fat = '#fff1f2';
  } else if (itemId.startsWith('chicken_') || itemId.startsWith('turkey_') || itemId.startsWith('duck_') || itemId.startsWith('goose_')) {
    primary = '#f43f5e'; dark = '#be123c'; fat = '#fff1f2';
  } else if (itemId.startsWith('salmon_') || itemId.startsWith('tuna_') || itemId.startsWith('cod_') || itemId.includes('fish')) {
    primary = '#f87171'; dark = '#dc2626'; fat = '#f8fafc';
  } else if (itemId === 'minced_meat_mixed') {
    primary = '#be123c'; dark = '#881337'; fat = '#fef2f2';
  }

  // 3. Ground meat mass contour
  ctx.fillStyle = primary;
  ctx.beginPath();
  ctx.roundRect(-7.2, -4.2, 14.4, 8.4, 1.5);
  ctx.fill();

  // 4. Extruded ground meat strands / worm texture
  ctx.strokeStyle = dark;
  ctx.lineWidth = 1.1;
  for (let y = -3.2; y <= 3.2; y += 1.6) {
    ctx.beginPath();
    for (let x = -6.5; x <= 6.5; x += 1.5) {
      const wave = Math.sin(x * 1.2 + y) * 0.4;
      if (x === -6.5) ctx.moveTo(x, y + wave);
      else ctx.lineTo(x, y + wave);
    }
    ctx.stroke();
  }

  // 5. Interspersed fat flecks
  ctx.fillStyle = fat;
  const flecks: [number, number][] = [
    [-4, -2.5], [1, -2.8], [4.5, -1.8],
    [-2, -0.5], [2.5, -0.2], [-5, 1.2],
    [0, 1.8], [5, 1.5], [-3, 3], [3, 2.8]
  ];
  for (const [fx, fy] of flecks) {
    ctx.beginPath();
    ctx.ellipse(fx, fy, 0.7, 0.4, 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // 6. Heat-sealed vacuum plastic wrap glare
  const filmGrad = ctx.createLinearGradient(-8, -5, 8, 5);
  filmGrad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
  filmGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.08)');
  filmGrad.addColorStop(0.65, 'rgba(255, 255, 255, 0.3)');
  filmGrad.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
  ctx.fillStyle = filmGrad;
  ctx.beginPath();
  ctx.roundRect(-8.5, -5.5, 17, 11, 2.2);
  ctx.fill();

  // Tight vacuum film tension lines at corners
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(-8, -5); ctx.lineTo(-5.5, -2.5);
  ctx.moveTo(8, -5);  ctx.lineTo(5.5, -2.5);
  ctx.moveTo(-8, 5);  ctx.lineTo(-5.5, 2.5);
  ctx.moveTo(8, 5);   ctx.lineTo(5.5, 2.5);
  ctx.stroke();

  // 7. Store price & barcode sticker on corner of vacuum pack
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(2, -4.8, 5.8, 3.8, 0.5);
  ctx.fill();

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(2.5, -4.2, 0.6, 2.2);
  ctx.fillRect(3.4, -4.2, 0.4, 2.2);
  ctx.fillRect(4.1, -4.2, 0.8, 2.2);
  ctx.fillRect(5.2, -4.2, 0.5, 2.2);
  ctx.fillRect(6.0, -4.2, 0.7, 2.2);

  return true;
}
