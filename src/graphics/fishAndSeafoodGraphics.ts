// Procedural 2D Canvas Models for Fish & Seafood
import { drawShadow, drawGlossBand } from './itemGraphicShared';

interface FishPalette {
  body: string;
  belly: string;
  fins: string;
  flesh: string;
  stripes?: string;
  dots?: string;
  caviar: string;
}

const FISH_PALETTES: Record<string, FishPalette> = {
  salmon: { body: '#94a3b8', belly: '#fbcfe8', fins: '#64748b', flesh: '#fb923c', caviar: '#ea580c' },
  tuna: { body: '#1e3a8a', belly: '#94a3b8', fins: '#eab308', flesh: '#be123c', caviar: '#18181b' },
  cod: { body: '#71717a', belly: '#e4e4e7', fins: '#52525b', flesh: '#f1f5f9', dots: '#3f3f46', caviar: '#f59e0b' },
  perch: { body: '#65a30d', belly: '#fef08a', fins: '#dc2626', flesh: '#ffe4e6', stripes: '#14532d', caviar: '#eab308' },
  herring: { body: '#0284c7', belly: '#f0f9ff', fins: '#0369a1', flesh: '#fda4af', caviar: '#ca8a04' },
  pike: { body: '#4d7c0f', belly: '#ecfccb', fins: '#a16207', flesh: '#f8fafc', dots: '#facc15', caviar: '#eab308' },
  eel: { body: '#334155', belly: '#94a3b8', fins: '#1e293b', flesh: '#fed7aa', caviar: '#18181b' },
  catfish: { body: '#475569', belly: '#cbd5e1', fins: '#334155', flesh: '#fee2e2', caviar: '#18181b' }
};

export function drawFishAndSeafoodItem(ctx: CanvasRenderingContext2D, itemId: string): boolean {
  // 1. Check Fish species
  for (const fish of ['salmon', 'tuna', 'cod', 'perch', 'herring', 'pike', 'eel', 'catfish']) {
    if (itemId.startsWith(`${fish}_`)) {
      const cut = itemId.slice(fish.length + 1);
      const pal = FISH_PALETTES[fish] || FISH_PALETTES.salmon;
      return drawFishCut(ctx, cut, pal, fish);
    }
  }

  // 2. Check Other Seafood
  switch (itemId) {
    case 'squid_tubes': {
      drawShadow(ctx, 7, 2.8, 7.8, 0.22);

      // Translucent pale white-pink squid mantle tubes
      ctx.fillStyle = '#ffe4e6';
      ctx.beginPath();
      ctx.moveTo(-6, -3);
      ctx.lineTo(6, -1);
      ctx.lineTo(7, 3);
      ctx.lineTo(-5, 4);
      ctx.closePath();
      ctx.fill();

      // Tube fin wings
      ctx.fillStyle = '#fecdd3';
      ctx.beginPath();
      ctx.moveTo(3, -1); ctx.lineTo(7.5, -4); ctx.lineTo(6, 0);
      ctx.closePath();
      ctx.fill();

      // Tube hollow ring opening on left
      ctx.fillStyle = '#fda4af';
      ctx.beginPath();
      ctx.ellipse(-5.5, 0.5, 1.2, 3.2, 0, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    case 'squid_tentacles': {
      drawShadow(ctx, 7, 2.8, 7.8, 0.24);

      // Cluster of curled pinkish-violet tentacles
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-5, -3); ctx.quadraticCurveTo(-1, 4, 5, 2);
      ctx.moveTo(-4, -1); ctx.quadraticCurveTo(0, -4, 6, -2);
      ctx.moveTo(-3, 2);  ctx.quadraticCurveTo(1, 5, 4, 4);
      ctx.stroke();

      // White suction cup dots
      ctx.fillStyle = '#ffffff';
      for (const pt of [[-3, 0], [0, 2], [3, 2.5], [-1, -3], [3, -3], [0, 4]]) {
        ctx.beginPath();
        ctx.arc(pt[0], pt[1], 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
      return true;
    }

    case 'octopus_whole': {
      drawShadow(ctx, 7.5, 3.2, 8, 0.28);

      // Bulbous purple head mantle
      const octGrad = ctx.createRadialGradient(0, -3, 1, 0, -3, 5);
      octGrad.addColorStop(0, '#a855f7');
      octGrad.addColorStop(1, '#6b21a8');
      ctx.fillStyle = octGrad;
      ctx.beginPath();
      ctx.ellipse(0, -2.5, 4.5, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Curled radiating tentacles
      ctx.strokeStyle = '#7e22ce';
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-2, 0); ctx.quadraticCurveTo(-6, 3, -5, 6);
      ctx.moveTo(-1, 0); ctx.quadraticCurveTo(-3, 6, -1, 6.5);
      ctx.moveTo(1, 0);  ctx.quadraticCurveTo(3, 6, 1, 6.5);
      ctx.moveTo(2, 0);  ctx.quadraticCurveTo(6, 3, 5, 6);
      ctx.stroke();

      // Suction cups
      ctx.fillStyle = '#f3e8ff';
      ctx.beginPath();
      ctx.arc(-5.5, 4, 0.6, 0, Math.PI * 2);
      ctx.arc(5.5, 4, 0.6, 0, Math.PI * 2);
      ctx.arc(-2, 5.5, 0.6, 0, Math.PI * 2);
      ctx.arc(2, 5.5, 0.6, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    case 'octopus_tentacles': {
      drawShadow(ctx, 7, 2.8, 7.8, 0.24);

      // Thick curled purple tentacle
      ctx.strokeStyle = '#7e22ce';
      ctx.lineWidth = 3.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, 0, 4.5, -Math.PI * 0.3, Math.PI * 1.2);
      ctx.stroke();

      // Suction cup pairs
      ctx.fillStyle = '#f5d0fe';
      for (let a = -0.3; a <= 1.2; a += 0.3) {
        const x = Math.cos(a * Math.PI) * 4.5;
        const y = Math.sin(a * Math.PI) * 4.5;
        ctx.beginPath();
        ctx.arc(x, y, 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
      return true;
    }

    case 'shrimp_king': {
      drawShadow(ctx, 7.5, 2.8, 7.8, 0.24);

      // Curled king shrimp with coral-orange shell & white stripes
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 3.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, 0, 4.5, -Math.PI * 0.4, Math.PI * 0.9);
      ctx.stroke();

      // Carapace segments / stripes
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.8;
      for (let a = -0.2; a <= 0.8; a += 0.25) {
        const x = Math.cos(a * Math.PI) * 4.5;
        const y = Math.sin(a * Math.PI) * 4.5;
        ctx.beginPath();
        ctx.arc(x, y, 1.8, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Fan tail on right
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.moveTo(-4, 3); ctx.lineTo(-6.5, 5); ctx.lineTo(-4.5, 6);
      ctx.closePath();
      ctx.fill();
      return true;
    }

    case 'mussels_half_shell': {
      drawShadow(ctx, 7.5, 3, 7.8, 0.25);

      // Deep blue-black shell cup
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(0, 0, 7, 4.5, -0.2, 0, Math.PI * 2);
      ctx.fill();

      // Pearly shell rim
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Plump tender golden-orange mussel meat inside
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.ellipse(0, 0, 5, 2.8, -0.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.arc(-1, 0, 1.2, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    case 'scallops_fresh': {
      drawShadow(ctx, 7, 2.8, 7.8, 0.22);

      // 3 ivory-white cylindrical scallop medallions
      const scallops = [
        { x: -3.5, y: -1.5, r: 3.2 },
        { x: 3.2,  y: -1.2, r: 3.0 },
        { x: 0,    y: 2.2,  r: 3.4 }
      ];

      for (const s of scallops) {
        ctx.fillStyle = '#fef3c7';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();

        // Delicate golden-seared top edge
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 0.7;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(s.x - 0.6, s.y - 0.6, s.r * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      return true;
    }

    case 'crab_legs': {
      drawShadow(ctx, 8, 3, 7.8, 0.26);

      // Bright scarlet King Crab leg joint with white spiny knuckles
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 3.6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(-7, 4);
      ctx.lineTo(0, -4.5);
      ctx.lineTo(7, 3);
      ctx.stroke();

      // Joint white band knuckles
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(0, -4.5, 2.2, 0, Math.PI * 2);
      ctx.fill();

      // Spines
      ctx.fillStyle = '#fef2f2';
      for (const x of [-4, -2, 2, 4]) {
        ctx.fillRect(x, -1, 0.8, 1.5);
      }
      return true;
    }

    default:
      return false;
  }
}

function drawFishCut(ctx: CanvasRenderingContext2D, cut: string, pal: FishPalette, fish: string): boolean {
  switch (cut) {
    // Whole fresh fish
    case 'whole': {
      drawShadow(ctx, 8.5, 2.8, 7.8, 0.25);

      if (fish === 'eel') {
        // Serpentine elongated eel
        ctx.strokeStyle = pal.body;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-7.5, 0);
        ctx.quadraticCurveTo(-3, -5, 1, 0);
        ctx.quadraticCurveTo(4, 4, 7.5, 0);
        ctx.stroke();
        return true;
      }

      // Main streamlined fish body
      ctx.fillStyle = pal.body;
      ctx.beginPath();
      ctx.ellipse(0, 0, 7.8, 3.8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Lighter belly counter-shading
      ctx.fillStyle = pal.belly;
      ctx.beginPath();
      ctx.ellipse(0, 1.2, 7.2, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Species specific markings: Perch vertical stripes, Cod/Pike spots
      if (pal.stripes) {
        ctx.fillStyle = pal.stripes;
        for (const x of [-3, -0.5, 2]) {
          ctx.beginPath();
          ctx.moveTo(x, -3.5); ctx.lineTo(x - 0.5, 2); ctx.lineTo(x + 1, 2); ctx.lineTo(x + 0.5, -3.5);
          ctx.closePath();
          ctx.fill();
        }
      }
      if (pal.dots) {
        ctx.fillStyle = pal.dots;
        for (const pt of [[-3, -1], [-1, 0], [1, -1.5], [3, 0]]) {
          ctx.beginPath();
          ctx.arc(pt[0], pt[1], 0.7, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Tail fin (Caudal fin) on right
      ctx.fillStyle = pal.fins;
      ctx.beginPath();
      ctx.moveTo(6.5, 0);
      ctx.lineTo(9, -3.5);
      ctx.lineTo(8, 0);
      ctx.lineTo(9, 3.5);
      ctx.closePath();
      ctx.fill();

      // Dorsal fin on top
      ctx.beginPath();
      ctx.moveTo(-2, -3.5);
      ctx.lineTo(1, -6);
      ctx.lineTo(3, -3.5);
      ctx.closePath();
      ctx.fill();

      // Pectoral fin on side
      ctx.beginPath();
      ctx.ellipse(-2.5, 0.8, 1.8, 0.9, -0.3, 0, Math.PI * 2);
      ctx.fill();

      // Catfish barbels (whiskers)
      if (fish === 'catfish') {
        ctx.strokeStyle = pal.fins;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(-6.5, 0); ctx.lineTo(-9, -2);
        ctx.moveTo(-6.5, 1); ctx.lineTo(-9, 3);
        ctx.stroke();
      }

      // Eye on left
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-5.2, -0.8, 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(-5.4, -0.8, 0.7, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    // Fish fillet cut (skin on bottom, flesh on top)
    case 'fillet': {
      drawShadow(ctx, 8, 3, 7.8, 0.24);

      // Flaky fish fillet
      ctx.fillStyle = pal.flesh;
      ctx.beginPath();
      ctx.roundRect(-7.5, -3.5, 15, 7, 2.5);
      ctx.fill();

      // Silver / dark skin bottom edge
      ctx.fillStyle = pal.body;
      ctx.beginPath();
      ctx.roundRect(-7.5, 2, 15, 1.8, [0, 0, 2.5, 2.5]);
      ctx.fill();

      // Chevron muscle segment lines
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.7;
      for (let x = -5; x <= 5; x += 2.2) {
        ctx.beginPath();
        ctx.moveTo(x - 0.8, -2.5);
        ctx.lineTo(x, 0);
        ctx.lineTo(x - 0.8, 2);
        ctx.stroke();
      }
      return true;
    }

    // Fish steak cross-section (horseshoe/round cut)
    case 'steak': {
      drawShadow(ctx, 7.5, 3.2, 7.8, 0.26);

      // Oval cross section steak
      ctx.fillStyle = pal.flesh;
      ctx.beginPath();
      ctx.ellipse(0, 0, 7.2, 5.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Outer skin perimeter
      ctx.strokeStyle = pal.body;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(0, 0, 7.2, 5.2, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Central white bone vertebra
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(0, 0, 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.arc(0, 0, 0.7, 0, Math.PI * 2);
      ctx.fill();

      // Muscle myotome rings
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.ellipse(-3.2, 0, 2.2, 3, 0, 0, Math.PI * 2);
      ctx.ellipse(3.2, 0, 2.2, 3, 0, 0, Math.PI * 2);
      ctx.stroke();
      return true;
    }

    // Fish head
    case 'head': {
      drawShadow(ctx, 7, 2.8, 7.8, 0.24);

      // Triangular fish head
      ctx.fillStyle = pal.body;
      ctx.beginPath();
      ctx.moveTo(-6, 0);
      ctx.lineTo(4, -4.5);
      ctx.lineTo(4, 4.5);
      ctx.closePath();
      ctx.fill();

      // Red gill slit on right
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(3.5, 0, 3.5, -Math.PI * 0.4, Math.PI * 0.4);
      ctx.fill();

      // Eye
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-2.5, -1, 1.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(-2.7, -1, 0.8, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    // Clean skeleton
    case 'skeleton': {
      drawShadow(ctx, 8, 2.6, 7.8, 0.22);

      // Spinal column line
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-6.5, 0); ctx.lineTo(6.5, 0);
      ctx.stroke();

      // Rib bones needles
      ctx.lineWidth = 0.8;
      for (let x = -4.5; x <= 4.5; x += 1.6) {
        ctx.beginPath();
        ctx.moveTo(x, -3); ctx.lineTo(x + 0.6, 0); ctx.lineTo(x, 3);
        ctx.stroke();
      }

      // Tail fin bone
      ctx.beginPath();
      ctx.moveTo(6.5, 0); ctx.lineTo(8.5, -3);
      ctx.moveTo(6.5, 0); ctx.lineTo(8.5, 3);
      ctx.stroke();

      // Skull
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(-6.5, 0, 1.8, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    // Caviar jar (glass jar with sparkling roe beads)
    case 'caviar_jar': {
      drawShadow(ctx, 6.5, 2.6, 7.8, 0.24);

      // Glass jar cylinder
      ctx.fillStyle = 'rgba(241, 245, 249, 0.8)';
      ctx.beginPath();
      ctx.roundRect(-4.5, -3.5, 9, 10.5, 1.8);
      ctx.fill();

      // Caviar roe contents
      ctx.fillStyle = pal.caviar;
      ctx.beginPath();
      ctx.roundRect(-3.8, -1.5, 7.6, 7.8, 1);
      ctx.fill();

      // Sparkling individual bead highlights
      ctx.fillStyle = '#ffffff';
      for (const pt of [[-2, 0], [1, 1], [-1, 3], [2, 4], [0, 5]]) {
        ctx.beginPath();
        ctx.arc(pt[0], pt[1], 0.5, 0, Math.PI * 2);
        ctx.fill();
      }

      drawGlossBand(ctx, -3.5, -3, 1, 9, 0.4);

      // Gold / Black premium metallic jar lid
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.roundRect(-5, -6, 10, 2.8, 0.8);
      ctx.fill();
      ctx.fillStyle = '#d97706';
      ctx.fillRect(-5, -3.8, 10, 0.6);
      return true;
    }

    default:
      return false;
  }
}
