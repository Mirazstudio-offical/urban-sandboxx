// Procedural 2D Canvas Models for Vegetables, Fruits, Berries & Mushrooms
import { drawShadow, drawGlossBand } from './itemGraphicShared';

export function drawProduceAndMushroomItem(ctx: CanvasRenderingContext2D, itemId: string): boolean {
  switch (itemId) {
    // === ROOT VEGETABLES ===
    case 'potato_whole': {
      drawShadow(ctx, 7, 2.8, 7.8, 0.24);

      // Earthy golden-brown potato tuber
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.ellipse(0, 0, 7.5, 5.2, -0.15, 0, Math.PI * 2);
      ctx.fill();

      // Soil dust & potato eyes
      ctx.fillStyle = '#78350f';
      for (const pt of [[-4, -2], [3, -1], [1, 2.5], [-2, 2], [5, 1]]) {
        ctx.beginPath();
        ctx.ellipse(pt[0], pt[1], 0.8, 0.4, 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
      return true;
    }

    case 'potato_sliced': {
      drawShadow(ctx, 7, 2.6, 7.8, 0.22);

      // 3 raw potato wedges / slices
      const wedges = [
        { x: -3.5, y: -1, a: -0.3 },
        { x: 2.5, y: -1.5, a: 0.2 },
        { x: 0, y: 2.2, a: 0 }
      ];
      for (const w of wedges) {
        ctx.save();
        ctx.translate(w.x, w.y);
        ctx.rotate(w.a);
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.ellipse(0, 0, 4.5, 2.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#b45309';
        ctx.lineWidth = 0.8;
        ctx.stroke();
        ctx.restore();
      }
      return true;
    }

    case 'carrot_whole': {
      drawShadow(ctx, 7.5, 2.5, 7.8, 0.22);

      // Bright orange conical tapered carrot
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.moveTo(-6, -2);
      ctx.lineTo(7, 0.5);
      ctx.lineTo(-6, 2.5);
      ctx.quadraticCurveTo(-7.5, 0, -6, -2);
      ctx.closePath();
      ctx.fill();

      // Horizontal skin rings
      ctx.strokeStyle = '#c2410c';
      ctx.lineWidth = 0.6;
      for (let x = -4; x <= 4; x += 2) {
        ctx.beginPath();
        ctx.moveTo(x, -1); ctx.lineTo(x + 0.5, 1.5);
        ctx.stroke();
      }

      // Green stem tuft at left
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.moveTo(-6.5, 0); ctx.lineTo(-9, -3); ctx.lineTo(-7.5, 0);
      ctx.lineTo(-9, 0); ctx.lineTo(-7.5, 0.5);
      ctx.lineTo(-9, 3); ctx.lineTo(-6.5, 0.5);
      ctx.closePath();
      ctx.fill();
      return true;
    }

    case 'carrot_diced': {
      drawShadow(ctx, 7.5, 2.8, 7.8, 0.22);

      // Pile of bright orange diced cubes
      ctx.fillStyle = '#f97316';
      for (const pt of [[-4, -2], [0, -3], [3.5, -2], [-2, 1], [2, 1.5], [-4, 3], [0, 4]]) {
        ctx.fillRect(pt[0], pt[1], 2.4, 2.4);
      }
      return true;
    }

    case 'beet_whole': {
      drawShadow(ctx, 7, 2.8, 7.8, 0.26);

      // Deep purple-magenta beetroot
      ctx.fillStyle = '#831843';
      ctx.beginPath();
      ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
      ctx.fill();

      // Slender taproot tip on right
      ctx.strokeStyle = '#831843';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(4.5, 2); ctx.quadraticCurveTo(7.5, 4, 9, 3.5);
      ctx.stroke();

      // Cut beet stem tufts on left
      ctx.fillStyle = '#9d174d';
      ctx.fillRect(-6.5, -3, 2, 1.5);
      ctx.fillRect(-6.5, 0.5, 2, 1.5);
      return true;
    }

    case 'beet_sliced': {
      drawShadow(ctx, 7, 2.8, 7.8, 0.24);

      // 2 overlapping deep crimson beet rounds with concentric rings
      for (const pt of [[-2.5, -0.5], [2.2, 1.2]]) {
        ctx.fillStyle = '#831843';
        ctx.beginPath();
        ctx.arc(pt[0], pt[1], 4.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#be185d';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(pt[0], pt[1], 3, 0, Math.PI * 2);
        ctx.arc(pt[0], pt[1], 1.5, 0, Math.PI * 2);
        ctx.stroke();
      }
      return true;
    }

    case 'turnip_whole': {
      drawShadow(ctx, 7, 2.8, 7.8, 0.24);

      // Round bicolor turnip (creamy yellow bottom, violet-purple top)
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(0, 0.5, 5.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#a21caf';
      ctx.beginPath();
      ctx.arc(0, 0.5, 5.5, Math.PI, Math.PI * 2);
      ctx.fill();
      return true;
    }

    case 'onion_bulb': {
      drawShadow(ctx, 7, 2.8, 7.8, 0.24);

      // Golden yellow onion with pointed top
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.moveTo(0, -6.5);
      ctx.bezierCurveTo(6, -4, 6.5, 4, 0, 6);
      ctx.bezierCurveTo(-6.5, 4, -6, -4, 0, -6.5);
      ctx.closePath();
      ctx.fill();

      // Papery vertical peel lines
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(0, -6); ctx.quadraticCurveTo(-3, 0, 0, 5.5);
      ctx.moveTo(0, -6); ctx.quadraticCurveTo(3, 0, 0, 5.5);
      ctx.stroke();
      return true;
    }

    case 'onion_chopped': {
      drawShadow(ctx, 7.5, 2.8, 7.8, 0.2);

      // Mound of translucent diced onion
      ctx.fillStyle = '#fef3c7';
      for (const pt of [[-4, -2], [0, -3], [3, -2], [-3, 1], [1, 1], [-2, 3.5], [2, 3.5]]) {
        ctx.fillRect(pt[0], pt[1], 2.2, 2.2);
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(pt[0], pt[1], 2.2, 2.2);
      }
      return true;
    }

    case 'leek_stalk': {
      drawShadow(ctx, 8, 2.6, 7.8, 0.22);

      // White base to green leaves long stalk
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-7, -2, 7, 4);

      ctx.fillStyle = '#16a34a';
      ctx.fillRect(0, -2, 7, 4);

      // Fan leaves at right
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.moveTo(7, -2); ctx.lineTo(9.5, -4); ctx.lineTo(7, 0);
      ctx.lineTo(9.5, 3); ctx.lineTo(7, 2);
      ctx.closePath();
      ctx.fill();
      return true;
    }

    case 'shallot_bulbs': {
      drawShadow(ctx, 7, 2.8, 7.8, 0.22);

      // 2 small copper-red tapered shallots
      for (const pt of [[-2.5, 0, -0.2], [2.5, 0.5, 0.2]]) {
        ctx.save();
        ctx.translate(pt[0], pt[1]);
        ctx.rotate(pt[2]);
        ctx.fillStyle = '#b45309';
        ctx.beginPath();
        ctx.ellipse(0, 0, 3.2, 4.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      return true;
    }

    case 'garlic_bulb': {
      drawShadow(ctx, 6.5, 2.8, 7.8, 0.24);

      // Ivory white garlic bulb with segmented cloves
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.ellipse(0, 1, 5.5, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Dried root tip
      ctx.fillStyle = '#d97706';
      ctx.fillRect(-0.8, -5.5, 1.6, 2.5);

      // Clove segmentation curves
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(0, -4); ctx.quadraticCurveTo(-3, 1, 0, 5);
      ctx.moveTo(0, -4); ctx.quadraticCurveTo(3, 1, 0, 5);
      ctx.stroke();
      return true;
    }

    case 'garlic_clove': {
      drawShadow(ctx, 5.5, 2.2, 7.8, 0.2);

      // Single smooth crescent garlic clove
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(0, -4.5);
      ctx.quadraticCurveTo(4.5, 0, 0, 4.5);
      ctx.quadraticCurveTo(-1.5, 0, 0, -4.5);
      ctx.closePath();
      ctx.fill();
      return true;
    }

    case 'tomato_whole': {
      drawShadow(ctx, 7, 2.8, 7.8, 0.26);

      // Plump glossy scarlet red tomato
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(0, 0.5, 5.8, 0, Math.PI * 2);
      ctx.fill();

      // Gloss shine
      drawGlossBand(ctx, -3, -2.5, 2.5, 1.2, 0.45);

      // Star-shaped green calyx cap
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = (i * Math.PI * 2) / 5 - Math.PI / 2;
        ctx.lineTo(Math.cos(a) * 2.8, -4.8 + Math.sin(a) * 1.5);
        const aMid = a + Math.PI / 5;
        ctx.lineTo(Math.cos(aMid) * 1.2, -4.8 + Math.sin(aMid) * 0.8);
      }
      ctx.closePath();
      ctx.fill();
      return true;
    }

    case 'tomato_sliced': {
      drawShadow(ctx, 7, 2.8, 7.8, 0.24);

      // Sliced tomato round with seed jelly chambers
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(0, 0, 5.8, 0, Math.PI * 2);
      ctx.fill();

      // Inner pulp rim
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(0, 0, 4.6, 0, Math.PI * 2);
      ctx.fill();

      // Seed jelly compartments
      ctx.fillStyle = '#b91c1c';
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2;
        const x = Math.cos(a) * 2.2;
        const y = Math.sin(a) * 2.2;
        ctx.beginPath();
        ctx.ellipse(x, y, 1.4, 0.9, a, 0, Math.PI * 2);
        ctx.fill();
        // Yellow seed
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(x, y, 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#b91c1c';
      }
      return true;
    }

    case 'tomato_cherry_bunch': {
      drawShadow(ctx, 7.5, 3, 7.8, 0.26);

      // Green vine branch
      ctx.strokeStyle = '#16a34a';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-6, -4); ctx.quadraticCurveTo(0, 0, 6, 2);
      ctx.stroke();

      // 4 mini red cherry tomatoes clinging to branch
      const cherries = [
        { x: -4, y: -1.5 },
        { x: -1, y: 2 },
        { x: 2.5, y: -2 },
        { x: 5, y: 3 }
      ];
      for (const c of cherries) {
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc(c.x, c.y, 2.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(c.x - 0.7, c.y - 0.7, 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
      return true;
    }

    case 'tomato_cherry_single': {
      drawShadow(ctx, 5.5, 2.2, 6.8, 0.24);

      // Ultra-glossy 3D spherical single cherry tomato
      const radGrad = ctx.createRadialGradient(-1.2, -1.2, 0.8, 0, 0.5, 4.8);
      radGrad.addColorStop(0, '#f87171');
      radGrad.addColorStop(0.35, '#ef4444');
      radGrad.addColorStop(0.75, '#dc2626');
      radGrad.addColorStop(1, '#991b1b');

      ctx.fillStyle = radGrad;
      ctx.beginPath();
      ctx.arc(0, 0.8, 4.4, 0, Math.PI * 2);
      ctx.fill();

      // Sharp specular hotspot
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.beginPath();
      ctx.ellipse(-1.5, -1.0, 1.2, 0.7, -0.4, 0, Math.PI * 2);
      ctx.fill();

      // Star-shaped green calyx sepals
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = (i * Math.PI * 2) / 5 - Math.PI / 2;
        ctx.lineTo(Math.cos(a) * 2.6, -3.2 + Math.sin(a) * 1.4);
        const aMid = a + Math.PI / 5;
        ctx.lineTo(Math.cos(aMid) * 1.0, -3.2 + Math.sin(aMid) * 0.7);
      }
      ctx.closePath();
      ctx.fill();

      // Miniature curled green pedicel stem
      ctx.strokeStyle = '#15803d';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(0, -3.2);
      ctx.quadraticCurveTo(1.5, -5.5, 0.5, -6.5);
      ctx.stroke();
      return true;
    }

    case 'tomato_cherry_sliced': {
      drawShadow(ctx, 7.2, 2.5, 7.5, 0.22);

      // Two halved cherry tomatoes (Left face-up half & Right tilted half)
      // === LEFT HALF: Cross section showing seed chambers ===
      ctx.save();
      ctx.translate(-3.2, 0.5);

      // Outer crimson skin rim
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(0, 0, 3.8, 0, Math.PI * 2);
      ctx.fill();

      // Juicy inner pericarp pulp
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(0, 0, 3.1, 0, Math.PI * 2);
      ctx.fill();

      // Translucent locular seed jelly pockets
      ctx.fillStyle = '#991b1b';
      for (let i = 0; i < 2; i++) {
        const x = (i === 0 ? -1.3 : 1.3);
        ctx.beginPath();
        ctx.ellipse(x, 0, 1.1, 1.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Pale yellow seed grains
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(x, -0.4, 0.45, 0, Math.PI * 2);
        ctx.arc(x, 0.5, 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#991b1b';
      }

      // Wet surface sheen
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.beginPath();
      ctx.arc(-1.2, -1.8, 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // === RIGHT HALF: Tilted juicy hemisphere ===
      ctx.save();
      ctx.translate(3.4, 0.8);
      ctx.rotate(0.35);

      const rightGrad = ctx.createRadialGradient(-0.8, -1, 0.6, 0, 0, 3.8);
      rightGrad.addColorStop(0, '#f87171');
      rightGrad.addColorStop(0.4, '#ef4444');
      rightGrad.addColorStop(1, '#991b1b');

      ctx.fillStyle = rightGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 3.6, 0, Math.PI * 2);
      ctx.fill();

      // Gloss streak on taut skin
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.beginPath();
      ctx.ellipse(-1.2, -1.2, 1.0, 0.5, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      return true;
    }

    case 'cucumber_whole': {
      drawShadow(ctx, 7.5, 2.5, 7.8, 0.22);

      // Deep green bumpy cucumber
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.roundRect(-7, -2.5, 14, 5, 2.5);
      ctx.fill();

      // Pale speckled bumps
      ctx.fillStyle = '#86efac';
      for (const x of [-4, -1, 2, 5]) {
        ctx.beginPath();
        ctx.arc(x, -0.8, 0.6, 0, Math.PI * 2);
        ctx.arc(x - 1, 1, 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
      return true;
    }

    case 'cucumber_sliced': {
      drawShadow(ctx, 7, 2.8, 7.8, 0.22);

      // 2 overlapping fresh cucumber slices
      for (const pt of [[-2.5, -0.5], [2.2, 1.2]]) {
        ctx.fillStyle = '#16a34a'; // dark green skin rim
        ctx.beginPath();
        ctx.arc(pt[0], pt[1], 4.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#dcfce7'; // pale translucent center
        ctx.beginPath();
        ctx.arc(pt[0], pt[1], 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Tiny seeds ring
        ctx.fillStyle = '#86efac';
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
          ctx.fillRect(pt[0] + Math.cos(a) * 1.8 - 0.4, pt[1] + Math.sin(a) * 1.8 - 0.4, 0.8, 0.8);
        }
      }
      return true;
    }

    case 'eggplant_whole': {
      drawShadow(ctx, 7.5, 3, 7.8, 0.26);

      // Glossy deep purple teardrop aubergine
      ctx.fillStyle = '#3b0764';
      ctx.beginPath();
      ctx.ellipse(0, 0.5, 7, 4.5, 0.2, 0, Math.PI * 2);
      ctx.fill();

      drawGlossBand(ctx, -3, -2, 3, 1.2, 0.4);

      // Green stem cap on left
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.moveTo(-6, 0); ctx.lineTo(-9, -2.5); ctx.lineTo(-6, -2);
      ctx.closePath();
      ctx.fill();
      return true;
    }

    case 'zucchini_whole': {
      drawShadow(ctx, 7.5, 2.6, 7.8, 0.24);

      // Mottled forest-green courgette
      ctx.fillStyle = '#166534';
      ctx.beginPath();
      ctx.roundRect(-7.5, -2.8, 15, 5.6, 2.8);
      ctx.fill();

      ctx.fillStyle = '#4ade80';
      for (let x = -5; x <= 5; x += 2.5) {
        ctx.fillRect(x, -0.5, 1.2, 0.6);
      }
      return true;
    }

    case 'pumpkin_whole': {
      drawShadow(ctx, 8.5, 3.5, 8.2, 0.28);

      // Ribbed golden-orange round pumpkin
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.ellipse(0, 1, 7.8, 6.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Rib grooves
      ctx.strokeStyle = '#c2410c';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -5); ctx.lineTo(0, 7);
      ctx.moveTo(-4, -4); ctx.quadraticCurveTo(-5.5, 1, -4, 6.5);
      ctx.moveTo(4, -4); ctx.quadraticCurveTo(5.5, 1, 4, 6.5);
      ctx.stroke();

      // Green-brown curved stem on top
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.roundRect(-1.2, -7.5, 2.4, 3, 0.8);
      ctx.fill();
      return true;
    }

    case 'pumpkin_cut': {
      drawShadow(ctx, 7.5, 3, 7.8, 0.26);

      // Crescent wedge of pumpkin
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(0, 0, 6.5, 0, Math.PI);
      ctx.closePath();
      ctx.fill();

      // Green skin rind outer rim
      ctx.strokeStyle = '#15803d';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 0, 6.5, 0, Math.PI);
      ctx.stroke();
      return true;
    }

    case 'cabbage_white_head': {
      drawShadow(ctx, 8, 3.2, 8, 0.26);

      // Dense pale green cabbage head
      ctx.fillStyle = '#bbf7d0';
      ctx.beginPath();
      ctx.arc(0, 0, 6.5, 0, Math.PI * 2);
      ctx.fill();

      // Crinkled outer leaves
      ctx.strokeStyle = '#16a34a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(-2, 0, 5, -Math.PI * 0.4, Math.PI * 0.4);
      ctx.arc(2, 0, 5, Math.PI * 0.6, Math.PI * 1.4);
      ctx.stroke();
      return true;
    }

    case 'cabbage_shredded': {
      drawShadow(ctx, 7.5, 2.8, 7.8, 0.2);

      // Mound of shredded pale green ribbons
      ctx.strokeStyle = '#86efac';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-5, -2); ctx.quadraticCurveTo(0, -4, 5, -1);
      ctx.moveTo(-4, 0); ctx.quadraticCurveTo(1, -1, 4, 2);
      ctx.moveTo(-5, 2); ctx.quadraticCurveTo(-1, 4, 3, 3);
      ctx.stroke();
      return true;
    }

    case 'cauliflower_head': {
      drawShadow(ctx, 8, 3.2, 8, 0.26);

      // Protective green wrapper leaves
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.arc(0, 1, 6.8, 0, Math.PI * 2);
      ctx.fill();

      // Dense creamy white florets dome
      ctx.fillStyle = '#fefce8';
      ctx.beginPath();
      ctx.arc(0, -0.5, 5.2, 0, Math.PI * 2);
      ctx.fill();

      // Flory bumps
      ctx.fillStyle = '#fef08a';
      for (const pt of [[-2, -2], [2, -2], [0, 1], [-3, 1], [3, 1]]) {
        ctx.beginPath();
        ctx.arc(pt[0], pt[1], 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
      return true;
    }

    case 'broccoli_florets': {
      drawShadow(ctx, 7.5, 3, 7.8, 0.26);

      // Emerald green pebbled florets head
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.arc(0, -2, 5.2, 0, Math.PI * 2);
      ctx.fill();

      // Crisp pale green stalk
      ctx.fillStyle = '#86efac';
      ctx.fillRect(-1.5, 1, 3, 5);
      return true;
    }

    case 'bell_pepper_red':
    case 'bell_pepper_yellow': {
      drawShadow(ctx, 7, 2.8, 7.8, 0.26);

      const color = itemId === 'bell_pepper_yellow' ? '#eab308' : '#dc2626';
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(-5.5, -4, 11, 10, 3);
      ctx.fill();

      // Lobe seams
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-1.8, -4); ctx.lineTo(-1.8, 6);
      ctx.moveTo(1.8, -4); ctx.lineTo(1.8, 6);
      ctx.stroke();

      // Green stem cap
      ctx.fillStyle = '#16a34a';
      ctx.fillRect(-1, -6.5, 2, 3);
      return true;
    }

    case 'chili_pepper_fresh': {
      drawShadow(ctx, 7, 2.5, 7.8, 0.22);

      // Curved sleek fiery red chili
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 3.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-5.5, -3);
      ctx.quadraticCurveTo(0, 4, 6, 2);
      ctx.stroke();

      // Green stem cap
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.arc(-5.5, -3, 1.8, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    case 'chili_pepper_sliced': {
      drawShadow(ctx, 6.5, 2.6, 7.8, 0.2);

      // Red chili rings with yellow seeds
      for (const pt of [[-3, -1], [2.5, 1]]) {
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc(pt[0], pt[1], 3.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(pt[0], pt[1], 1.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(pt[0], pt[1], 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
      return true;
    }

    // === FRUITS & BERRIES ===
    case 'apple_green': {
      drawShadow(ctx, 6.5, 2.8, 7.8, 0.26);

      // Crisp Granny Smith green apple
      ctx.fillStyle = '#65a30d';
      ctx.beginPath();
      ctx.arc(0, 0.5, 5.5, 0, Math.PI * 2);
      ctx.fill();

      // Brown stem & leaf
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-0.5, -5.5, 1, 2);
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.ellipse(1.5, -5, 1.5, 0.8, 0.5, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    case 'pear_yellow': {
      drawShadow(ctx, 6.5, 2.8, 7.8, 0.26);

      // Teardrop pear silhouette
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.moveTo(0, -5.5);
      ctx.bezierCurveTo(4, -3, 6, 2, 0, 6);
      ctx.bezierCurveTo(-6, 2, -4, -3, 0, -5.5);
      ctx.closePath();
      ctx.fill();

      // Stem
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-0.5, -7.5, 1, 2.5);
      return true;
    }

    case 'plum_purple': {
      drawShadow(ctx, 6, 2.5, 7.8, 0.24);

      // Indigo purple plum
      ctx.fillStyle = '#4c1d95';
      ctx.beginPath();
      ctx.ellipse(0, 0.5, 4.5, 5.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Natural bloom cleft line
      ctx.strokeStyle = '#7c3aed';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(0, -4.5); ctx.lineTo(0, 5.5);
      ctx.stroke();
      return true;
    }

    case 'apricot_orange':
    case 'peach_velvet': {
      drawShadow(ctx, 6.5, 2.6, 7.8, 0.25);

      const color = itemId === 'peach_velvet' ? '#fb923c' : '#f59e0b';
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0.5, 5.2, 0, Math.PI * 2);
      ctx.fill();

      // Soft pink blush
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(1.5, 0, 3, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    case 'orange_citrus': {
      drawShadow(ctx, 6.5, 2.8, 7.8, 0.26);

      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(0, 0.5, 5.8, 0, Math.PI * 2);
      ctx.fill();

      // Green navel dot
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.arc(0, -4.8, 0.8, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    case 'lemon_whole': {
      drawShadow(ctx, 6.5, 2.6, 7.8, 0.24);

      // Pointed oval lemon
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.ellipse(0, 0, 6.2, 4.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Pointed tips
      ctx.beginPath();
      ctx.moveTo(-6, 0); ctx.lineTo(-7.5, 0);
      ctx.moveTo(6, 0); ctx.lineTo(7.5, 0);
      ctx.stroke();
      return true;
    }

    case 'lemon_slice': {
      drawShadow(ctx, 6.5, 2.6, 7.8, 0.22);

      // Yellow citrus wheel with segments
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Triangular segments
      ctx.fillStyle = '#fef9c3';
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI * 2) / 6;
        ctx.beginPath();
        ctx.arc(0, 0, 4, a + 0.15, a + 0.9);
        ctx.lineTo(0, 0);
        ctx.closePath();
        ctx.fill();
      }
      return true;
    }

    case 'lime_whole': {
      drawShadow(ctx, 6, 2.5, 7.8, 0.24);

      ctx.fillStyle = '#65a30d';
      ctx.beginPath();
      ctx.ellipse(0, 0, 5.5, 4.2, 0, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    // Woven berry baskets (Blueberry, Lingonberry, Cranberry, Raspberry, Strawberry, Blackcurrant, Redcurrant, Cherry)
    case 'blueberry_basket':
    case 'lingonberry_basket':
    case 'cranberry_basket':
    case 'raspberry_basket':
    case 'strawberry_basket':
    case 'blackcurrant_basket':
    case 'redcurrant_basket':
    case 'cherry_basket': {
      drawShadow(ctx, 7.5, 3, 7.8, 0.26);

      // Woven wicker basket base
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.moveTo(-6, -1);
      ctx.lineTo(6, -1);
      ctx.lineTo(4.5, 6);
      ctx.lineTo(-4.5, 6);
      ctx.closePath();
      ctx.fill();

      // Weave lines
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 0.7;
      ctx.stroke();

      // Berry mound on top
      let berryColor = '#2563eb';
      if (itemId === 'lingonberry_basket' || itemId === 'cranberry_basket' || itemId === 'redcurrant_basket') berryColor = '#dc2626';
      if (itemId === 'raspberry_basket' || itemId === 'strawberry_basket') berryColor = '#e11d48';
      if (itemId === 'blackcurrant_basket' || itemId === 'cherry_basket') berryColor = '#18181b';

      ctx.fillStyle = berryColor;
      for (const pt of [[-4, -3], [-1.5, -4], [1.5, -4], [4, -3], [-3, -1], [0, -1.5], [3, -1]]) {
        ctx.beginPath();
        ctx.arc(pt[0], pt[1], 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
      return true;
    }

    case 'grapes_green_bunch':
    case 'grapes_red_bunch': {
      drawShadow(ctx, 6.5, 2.8, 7.8, 0.24);

      const grapeColor = itemId === 'grapes_green_bunch' ? '#84cc16' : '#7e22ce';
      ctx.fillStyle = grapeColor;

      // Triangular grape cluster
      const cluster = [
        [-3, -3], [0, -3.5], [3, -3],
        [-2, -1], [1, -1],
        [-1, 1.5], [1.5, 1.5],
        [0, 4]
      ];
      for (const pt of cluster) {
        ctx.beginPath();
        ctx.arc(pt[0], pt[1], 1.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // Stem
      ctx.strokeStyle = '#65a30d';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -3.5); ctx.lineTo(0, -6.5);
      ctx.stroke();
      return true;
    }

    case 'banana_single': {
      drawShadow(ctx, 7, 2.5, 7.8, 0.22);

      // Curved yellow bananas bunch
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 3.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, 0, 5, -Math.PI * 0.3, Math.PI * 0.8);
      ctx.stroke();

      // Green crown
      ctx.fillStyle = '#65a30d';
      ctx.fillRect(-4.5, -4, 2, 2);
      return true;
    }

    case 'melon_cantaloupe': {
      drawShadow(ctx, 7.5, 3.2, 8, 0.26);

      // Cantaloupe with textured web netting
      ctx.fillStyle = '#ca8a04';
      ctx.beginPath();
      ctx.arc(0, 0.5, 6, 0, Math.PI * 2);
      ctx.fill();

      // Beige web netting
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 0.6;
      for (let x = -4; x <= 4; x += 2) {
        ctx.beginPath();
        ctx.moveTo(x, -5); ctx.lineTo(x, 6);
        ctx.stroke();
      }
      return true;
    }

    case 'watermelon_whole': {
      drawShadow(ctx, 8.5, 3.5, 8.2, 0.28);

      // Massive striped watermelon
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.arc(0, 0.5, 7, 0, Math.PI * 2);
      ctx.fill();

      // Undulating light green stripes
      ctx.strokeStyle = '#86efac';
      ctx.lineWidth = 1.4;
      for (let x = -4.5; x <= 4.5; x += 2.2) {
        ctx.beginPath();
        ctx.moveTo(x, -6); ctx.lineTo(x, 6.5);
        ctx.stroke();
      }
      return true;
    }

    case 'watermelon_slice': {
      drawShadow(ctx, 7.5, 3, 7.8, 0.25);

      // Triangular wedge with green rind and ruby red pulp
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(-6.5, -4);
      ctx.lineTo(6.5, -4);
      ctx.lineTo(0, 5);
      ctx.closePath();
      ctx.fill();

      // Green rind arc on top
      ctx.fillStyle = '#15803d';
      ctx.fillRect(-6.5, -5.5, 13, 1.8);

      // Black seeds
      ctx.fillStyle = '#0f172a';
      for (const pt of [[-2, -1], [2, -1], [0, 1.5]]) {
        ctx.beginPath();
        ctx.ellipse(pt[0], pt[1], 0.6, 0.9, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      return true;
    }

    case 'pomegranate_whole': {
      drawShadow(ctx, 7, 2.8, 7.8, 0.26);

      // Royal crimson pomegranate with crown
      ctx.fillStyle = '#9f1239';
      ctx.beginPath();
      ctx.arc(0, 0.8, 5.5, 0, Math.PI * 2);
      ctx.fill();

      // Crown calyx on top
      ctx.fillStyle = '#881337';
      ctx.beginPath();
      ctx.moveTo(-2, -4.5); ctx.lineTo(-3, -7); ctx.lineTo(-1, -5.5);
      ctx.lineTo(0, -7.5); ctx.lineTo(1, -5.5); ctx.lineTo(3, -7); ctx.lineTo(2, -4.5);
      ctx.closePath();
      ctx.fill();
      return true;
    }

    case 'kiwi_fruit': {
      drawShadow(ctx, 6.5, 2.6, 7.8, 0.24);

      // Fuzzy brown kiwi half cut open
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.arc(0, 0, 5.2, 0, Math.PI * 2);
      ctx.fill();

      // Emerald green pulp
      ctx.fillStyle = '#84cc16';
      ctx.beginPath();
      ctx.arc(0, 0, 4.2, 0, Math.PI * 2);
      ctx.fill();

      // Cream core & black seed ring
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(0, 0, 1.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#18181b';
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
        ctx.fillRect(Math.cos(a) * 2.4 - 0.4, Math.sin(a) * 2.4 - 0.4, 0.8, 0.8);
      }
      return true;
    }

    // === MUSHROOMS ===
    case 'cep_mushroom_whole':
    case 'boletus_mushroom_whole':
    case 'aspen_boletus_whole':
    case 'butter_boletus_whole': {
      drawShadow(ctx, 6.5, 2.8, 7.8, 0.26);

      // Cap colors
      let capColor = '#78350f'; // Porcini chestnut brown
      if (itemId === 'aspen_boletus_whole') capColor = '#ea580c'; // Red-capped aspen
      if (itemId === 'butter_boletus_whole') capColor = '#d97706'; // Butter boletus

      // Sturdy pale stem
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.roundRect(-2, -1, 4, 7.5, 1.5);
      ctx.fill();

      // Rounded mushroom cap
      ctx.fillStyle = capColor;
      ctx.beginPath();
      ctx.ellipse(0, -2.5, 6, 4, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      return true;
    }

    case 'cep_mushroom_dried': {
      drawShadow(ctx, 7, 2.5, 7.8, 0.22);

      // String of dried brown mushroom slices
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-6.5, 0); ctx.lineTo(6.5, 0);
      ctx.stroke();

      for (const x of [-4.5, -1.5, 1.5, 4.5]) {
        ctx.fillStyle = '#451a03';
        ctx.beginPath();
        ctx.ellipse(x, 0, 1.4, 3.2, 0.1, 0, Math.PI * 2);
        ctx.fill();
      }
      return true;
    }

    case 'chanterelle_basket':
    case 'honey_agaric_basket': {
      drawShadow(ctx, 7.5, 3, 7.8, 0.26);

      // Wicker basket
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.moveTo(-6, -1); ctx.lineTo(6, -1); ctx.lineTo(4.5, 6); ctx.lineTo(-4.5, 6);
      ctx.closePath();
      ctx.fill();

      // Yellow Chanterelles or Honey agaric caps
      const mushColor = itemId === 'chanterelle_basket' ? '#fbbf24' : '#d97706';
      ctx.fillStyle = mushColor;
      for (const pt of [[-3.5, -3], [-1, -4.5], [2, -3.5], [-2, -1.5], [1.5, -1.5]]) {
        ctx.beginPath();
        ctx.arc(pt[0], pt[1], 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
      return true;
    }

    case 'milk_mushroom_salted': {
      drawShadow(ctx, 6.5, 2.6, 7.8, 0.24);

      // Glass mason preserve jar with salted white milk mushrooms
      ctx.fillStyle = 'rgba(241, 245, 249, 0.8)';
      ctx.beginPath();
      ctx.roundRect(-4.5, -3.5, 9, 10.5, 1.8);
      ctx.fill();

      // White salted mushrooms inside
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(-3.8, -1.5, 7.6, 7.8);

      // Bay leaf & black pepper specks inside
      ctx.fillStyle = '#4d7c0f';
      ctx.fillRect(-2, 1, 3, 1.2);
      ctx.fillStyle = '#18181b';
      ctx.fillRect(1, 3, 0.8, 0.8);

      // Gold preserve lid
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.roundRect(-5, -6, 10, 2.8, 0.8);
      ctx.fill();
      return true;
    }

    case 'morel_spring_mushroom': {
      drawShadow(ctx, 6, 2.5, 7.8, 0.24);

      // Hollow pale stalk
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(-1.5, 0, 3, 6);

      // Conical honeycomb pitted cap
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.moveTo(-3.5, 1); ctx.lineTo(0, -7); ctx.lineTo(3.5, 1);
      ctx.closePath();
      ctx.fill();
      return true;
    }

    case 'truffle_black_rare': {
      drawShadow(ctx, 6.5, 2.6, 7.8, 0.26);

      // Knobby warty black truffle
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();

      // Warty texture lines
      ctx.strokeStyle = '#3f3f46';
      ctx.lineWidth = 0.8;
      ctx.stroke();
      return true;
    }

    case 'champignon_white_whole':
    case 'champignon_brown_whole': {
      drawShadow(ctx, 6, 2.5, 7.8, 0.24);

      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-1.2, 0, 2.4, 5.5);

      ctx.fillStyle = itemId === 'champignon_brown_whole' ? '#a16207' : '#ffffff';
      ctx.beginPath();
      ctx.ellipse(0, -1, 4.8, 3.8, 0, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    case 'champignon_sliced': {
      drawShadow(ctx, 6, 2.4, 7.8, 0.2);

      // T-shaped mushroom slice
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(0, -2, 5, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-1.2, -2, 2.4, 6);

      // Brown gills line
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-4.2, -0.5, 8.4, 0.8);
      return true;
    }

    case 'oyster_mushroom_cluster': {
      drawShadow(ctx, 7.5, 2.8, 7.8, 0.24);

      // Tiered shelf cluster of greyish oyster mushrooms
      ctx.fillStyle = '#94a3b8';
      for (const pt of [[-3, 1], [2, 0], [-1, -3], [3, -2]]) {
        ctx.beginPath();
        ctx.ellipse(pt[0], pt[1], 3.8, 2.2, 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
      return true;
    }

    case 'shiitake_fresh':
    case 'shiitake_dried_bag':
    case 'portobello_mushroom':
    case 'wood_ear_mushroom_dried':
    case 'parasol_mushroom_cap':
    case 'enoki_mushroom_bunch': {
      drawShadow(ctx, 7, 2.8, 7.8, 0.24);

      if (itemId === 'enoki_mushroom_bunch') {
        // Tied bundle of white needle enoki mushrooms
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 1;
        for (let x = -3; x <= 3; x += 1.2) {
          ctx.beginPath();
          ctx.moveTo(x, 6); ctx.lineTo(x * 1.3, -4);
          ctx.stroke();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(x * 1.3, -4, 0.8, 0, Math.PI * 2);
          ctx.fill();
        }
        return true;
      }

      // Broad dark mushroom cap
      ctx.fillStyle = itemId === 'wood_ear_mushroom_dried' ? '#18181b' : '#78350f';
      ctx.beginPath();
      ctx.ellipse(0, 0, 6.5, 4.2, 0, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    default:
      return false;
  }
}
