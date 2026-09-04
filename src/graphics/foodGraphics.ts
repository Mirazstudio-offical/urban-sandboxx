// Procedural 2D Canvas Models for Food Items
import { drawShadow, drawGlossBand } from './itemGraphicShared';

export function drawFoodItem(ctx: CanvasRenderingContext2D, itemId: string): boolean {
  switch (itemId) {
    case 'sandwich': {
      drawShadow(ctx, 8, 3, 7.5, 0.22);

      // Bottom toasted bread slice
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.moveTo(-8, 3);
      ctx.lineTo(8, 3);
      ctx.lineTo(0, 8);
      ctx.closePath();
      ctx.fill();

      // Bottom crust bevel
      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.moveTo(-7.2, 3);
      ctx.lineTo(7.2, 3);
      ctx.lineTo(0, 7.2);
      ctx.closePath();
      ctx.fill();

      // Folded ham layer
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.roundRect(-7.5, 1.2, 15, 2.2, 1);
      ctx.fill();
      ctx.fillStyle = '#fda4af';
      ctx.fillRect(-6, 1.6, 12, 0.8);

      // Melted Cheddar Cheese with drooping corner
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(-8, 1);
      ctx.lineTo(8, 1);
      ctx.lineTo(4, 4.5);
      ctx.lineTo(2, 2.5);
      ctx.lineTo(-2, 4);
      ctx.lineTo(-5, 2);
      ctx.closePath();
      ctx.fill();

      // Crispy curled lettuce
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.arc(-5, 0.5, 2.2, 0, Math.PI * 2);
      ctx.arc(0, 0.2, 2.5, 0, Math.PI * 2);
      ctx.arc(5, 0.5, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4ade80';
      ctx.beginPath();
      ctx.arc(-2.5, 0.2, 1.8, 0, Math.PI * 2);
      ctx.arc(2.5, 0.2, 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Tomato slices peeking
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.roundRect(-6, -1.5, 5, 2, 1);
      ctx.roundRect(1, -1.5, 5, 2, 1);
      ctx.fill();

      // Top toasted bread slice
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.moveTo(-8.5, -6);
      ctx.lineTo(8.5, -6);
      ctx.lineTo(0, 1.5);
      ctx.closePath();
      ctx.fill();

      // Bread crust bevel
      ctx.fillStyle = '#92400e';
      ctx.beginPath();
      ctx.moveTo(-8.5, -6);
      ctx.lineTo(8.5, -6);
      ctx.lineTo(8.5, -4.8);
      ctx.lineTo(-8.5, -4.8);
      ctx.closePath();
      ctx.fill();

      // Fluffy golden crumb face
      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.moveTo(-7.2, -5.2);
      ctx.lineTo(7.2, -5.2);
      ctx.lineTo(0, 0.5);
      ctx.closePath();
      ctx.fill();

      // Toasted surface markings
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.ellipse(-2, -3.2, 2.5, 1.2, -0.2, 0, Math.PI * 2);
      ctx.ellipse(2.5, -2.8, 2, 1, 0.3, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    case 'burger': {
      drawShadow(ctx, 8.5, 3.2, 7.8, 0.25);

      // Bottom toasted bun
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.roundRect(-7.5, 3.2, 15, 4.2, [1, 1, 3, 3]);
      ctx.fill();
      ctx.fillStyle = '#fde68a';
      ctx.fillRect(-7, 3.2, 14, 1.2);

      // Charbroiled beef patty
      ctx.fillStyle = '#3f1a04';
      ctx.beginPath();
      ctx.roundRect(-8.5, 0.8, 17, 3.4, 1.5);
      ctx.fill();
      // Grill texture
      ctx.fillStyle = '#1c0a00';
      ctx.fillRect(-6, 1.4, 2.5, 2);
      ctx.fillRect(-1, 1.4, 2.5, 2);
      ctx.fillRect(4, 1.4, 2.5, 2);

      // Melted Cheddar Cheese drooping over patty
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(-8, 1);
      ctx.lineTo(8, 1);
      ctx.lineTo(6.5, 3.8);
      ctx.lineTo(4, 2);
      ctx.lineTo(1.5, 4.2);
      ctx.lineTo(-1, 2);
      ctx.lineTo(-4.5, 4);
      ctx.lineTo(-6.5, 2);
      ctx.closePath();
      ctx.fill();

      // Crisp ruffled lettuce
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.arc(-5.5, -0.5, 2.8, 0, Math.PI * 2);
      ctx.arc(-1.5, -0.8, 2.8, 0, Math.PI * 2);
      ctx.arc(2.5, -0.6, 2.8, 0, Math.PI * 2);
      ctx.arc(6, -0.4, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4ade80';
      ctx.beginPath();
      ctx.arc(-3.5, -0.4, 2, 0, Math.PI * 2);
      ctx.arc(4, -0.3, 2, 0, Math.PI * 2);
      ctx.fill();

      // Red tomato slice
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.roundRect(-7.5, -2.5, 15, 2.2, 1);
      ctx.fill();
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-6, -2.2, 12, 0.8);

      // Glazed brioche top bun
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.arc(0, -2, 8, Math.PI, 0);
      ctx.fill();

      // Bun gradient / highlight
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.arc(0, -2, 7.2, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = 'rgba(254, 243, 199, 0.45)';
      ctx.beginPath();
      ctx.ellipse(-2, -6, 4, 1.8, -0.2, 0, Math.PI * 2);
      ctx.fill();

      // Sesame seeds
      ctx.fillStyle = '#fef08a';
      const seeds = [
        [-4, -5.5, 0.2],
        [-1, -7, -0.3],
        [2.5, -6, 0.4],
        [5, -4.5, 0.1],
        [-5, -3.5, -0.2],
        [0, -4.2, 0.3],
        [3, -3.8, -0.3]
      ];
      seeds.forEach(([sx, sy, rot]) => {
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(rot);
        ctx.beginPath();
        ctx.ellipse(0, 0, 0.7, 1.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      return true;
    }

    case 'pizza_slice': {
      drawShadow(ctx, 8, 3.2, 7.5, 0.22);

      // Golden baked crust edge (top arc)
      ctx.fillStyle = '#92400e';
      ctx.beginPath();
      ctx.arc(0, -6.5, 8.8, Math.PI * 0.78, Math.PI * 2.22);
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#b45309';
      ctx.stroke();

      // Crust dough
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.ellipse(0, -6.5, 8.5, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Melted cheesy triangle body
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(-7.8, -5.5);
      ctx.lineTo(7.8, -5.5);
      ctx.lineTo(0, 8.2);
      ctx.closePath();
      ctx.fill();

      // Rich cheese & sauce marbling
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(-6.5, -4.8);
      ctx.lineTo(6.5, -4.8);
      ctx.lineTo(0, 7);
      ctx.closePath();
      ctx.fill();

      // Red marinara peeking through
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-2, -4.5, 4, 1.2);
      ctx.fillRect(-5, -3, 2, 1);
      ctx.fillRect(3, -2, 2, 1);

      // Crispy Pepperoni slices
      const pepps = [
        [-2.2, -2.5, 2.3],
        [2.8, -1.2, 2.2],
        [0, 2.5, 2.0]
      ];
      pepps.forEach(([px, py, pr]) => {
        ctx.fillStyle = '#991b1b';
        ctx.beginPath();
        ctx.arc(px, py, pr, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc(px - 0.3, py - 0.3, pr * 0.82, 0, Math.PI * 2);
        ctx.fill();
        // Pepper specks
        ctx.fillStyle = '#450a0a';
        ctx.fillRect(px - 0.5, py - 0.5, 0.8, 0.8);
        ctx.fillRect(px + 0.6, py + 0.3, 0.8, 0.8);
      });

      // Herb sprinkles (oregano / basil)
      ctx.fillStyle = '#15803d';
      ctx.fillRect(-4, -1, 0.8, 0.8);
      ctx.fillRect(1, 0, 0.8, 0.8);
      ctx.fillRect(-1, 5, 0.8, 0.8);
      ctx.fillRect(2, -4, 0.8, 0.8);
      return true;
    }

    case 'apple': {
      drawShadow(ctx, 6.5, 2.6, 7.5, 0.22);

      // Apple body (twin overlapping lobes)
      ctx.fillStyle = '#b91c1c';
      ctx.beginPath();
      ctx.arc(-2.8, 0.5, 5.2, 0, Math.PI * 2);
      ctx.arc(2.8, 0.5, 5.2, 0, Math.PI * 2);
      ctx.arc(0, 1.5, 5.4, 0, Math.PI * 2);
      ctx.fill();

      // Top dimple
      ctx.fillStyle = '#7f1d1d';
      ctx.beginPath();
      ctx.ellipse(0, -3.8, 2.5, 1.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Curved woody stem
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, -3.8);
      ctx.quadraticCurveTo(1.5, -6.5, 0.5, -9);
      ctx.stroke();

      // Crisp green leaf
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.ellipse(3.2, -7.2, 3.2, 1.5, 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#14532d';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(1.2, -6.8);
      ctx.lineTo(5.2, -7.8);
      ctx.stroke();

      // Red vibrant body sheen
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(-2.2, -0.5, 3.8, 0, Math.PI * 2);
      ctx.fill();

      // Glossy light reflections
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.beginPath();
      ctx.ellipse(-2.5, -2, 1.6, 2.8, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.beginPath();
      ctx.ellipse(3, 2, 1.2, 2.2, 0.4, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    case 'chocolate': {
      drawShadow(ctx, 7.5, 2.8, 7.5, 0.22);

      // Shiny silver foil underlayer
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.roundRect(-6.5, -4, 13, 11, 1.5);
      ctx.fill();
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-6.5, -4, 3, 11);

      // Deep red wrapper sleeve pushed down
      ctx.fillStyle = '#991b1b';
      ctx.beginPath();
      ctx.roundRect(-6.8, -0.5, 13.6, 8, 1);
      ctx.fill();
      // Gold brand foil seal on wrapper
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(-5.5, 1.5, 11, 2);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(-3, 2, 6, 1);

      // Unwrapped Dark Chocolate blocks protruding from top
      ctx.fillStyle = '#3b1806';
      ctx.beginPath();
      ctx.roundRect(-5.8, -8.5, 11.6, 5.5, 1);
      ctx.fill();

      // 2x2 chocolate segment blocks with beveled relief
      const blocks = [
        [-5.2, -8, 5, 2.2],
        [0.2, -8, 5, 2.2],
        [-5.2, -5.2, 5, 2.2],
        [0.2, -5.2, 5, 2.2]
      ];
      blocks.forEach(([bx, by, bw, bh]) => {
        ctx.fillStyle = '#270e03';
        ctx.fillRect(bx, by, bw, bh);
        ctx.fillStyle = '#4a200a';
        ctx.fillRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.fillRect(bx + 0.5, by + 0.5, bw - 1, 0.6);
      });
      return true;
    }

    case 'chips': {
      drawShadow(ctx, 7, 2.6, 7.5, 0.22);

      // Puffed yellow chip bag body
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.roundRect(-6.5, -8, 13, 15.5, [2.5, 2.5, 2, 2]);
      ctx.fill();

      // Top crimped seal
      ctx.fillStyle = '#ca8a04';
      ctx.fillRect(-6.5, -8, 13, 1.8);
      for (let x = -6; x < 6; x += 1.8) {
        ctx.fillStyle = '#a16207';
        ctx.fillRect(x, -8, 0.8, 1.8);
      }

      // Bottom crimped seal
      ctx.fillStyle = '#ca8a04';
      ctx.fillRect(-6.5, 6, 13, 1.5);
      for (let x = -6; x < 6; x += 1.8) {
        ctx.fillStyle = '#a16207';
        ctx.fillRect(x, 6, 0.8, 1.5);
      }

      // Red brand banner
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(-6.5, -2);
      ctx.lineTo(6.5, -3.5);
      ctx.lineTo(6.5, 1.5);
      ctx.lineTo(-6.5, 3);
      ctx.closePath();
      ctx.fill();

      // Golden curved potato chip graphic
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.ellipse(0, 0.2, 3.5, 1.8, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ca8a04';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Diagonal foil gleam
      drawGlossBand(ctx, -4.5, -6, 2, 12, 0.3);
      return true;
    }

    case 'canned_meat': {
      drawShadow(ctx, 7.2, 2.8, 7.5, 0.25);

      // Tin cylinder base & walls
      ctx.fillStyle = '#64748b';
      ctx.fillRect(-6.5, -5.5, 13, 12);

      // Bottom rim
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.ellipse(0, 6.5, 6.5, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Metallic body highlights
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-4.5, -5.5, 2, 12);
      ctx.fillStyle = '#475569';
      ctx.fillRect(3.5, -5.5, 2.5, 12);

      // Army red / gold label
      ctx.fillStyle = '#991b1b';
      ctx.fillRect(-6.5, -2.5, 13, 7);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(-6.5, 0, 13, 2);
      // Gold star
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(0, 1, 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Top tin lid with pull-tab ring
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.ellipse(0, -5.5, 6.5, 2.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.ellipse(0, -5.5, 5.2, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Pull ring
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(1, -5.5, 1.8, 1, 0, 0, Math.PI * 2);
      ctx.stroke();
      return true;
    }

    case 'croissant': {
      drawShadow(ctx, 8.5, 3, 7.2, 0.2);

      // Golden baked crescent body
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.ellipse(0, 0, 9.2, 5.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Main flaky layer
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.ellipse(0, -0.5, 8, 4.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Tender butter pastry center
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.ellipse(0, -1, 6.2, 3.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Glaze highlights
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.ellipse(0, -1.8, 4, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Characteristic baker crescent fold ridges
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 1.1;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-5.5, -2); ctx.lineTo(-4.5, 2.5);
      ctx.moveTo(-2.5, -3.2); ctx.lineTo(-1.8, 3.8);
      ctx.moveTo(1.8, -3.2); ctx.lineTo(1.2, 3.8);
      ctx.moveTo(5, -2); ctx.lineTo(4.2, 2.5);
      ctx.stroke();
      return true;
    }

    case 'soup': {
      drawShadow(ctx, 8.5, 3, 7.5, 0.22);

      // Ceramic red soup bowl body
      ctx.fillStyle = '#9f1239';
      ctx.beginPath();
      ctx.ellipse(0, 1.5, 8.5, 4.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-8.5, -3, 17, 5);

      // Ceramic outer bowl rim
      ctx.fillStyle = '#be123c';
      ctx.beginPath();
      ctx.ellipse(0, -3, 8.5, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Ceramic highlight on rim
      ctx.fillStyle = '#fb7185';
      ctx.beginPath();
      ctx.ellipse(-2, -3.3, 5, 1.4, -0.1, 0, Math.PI * 2);
      ctx.fill();

      // Rich golden chicken broth
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.ellipse(0, -2.8, 7.5, 2.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.ellipse(-1, -3, 6, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Carrot coins & chicken pieces
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.ellipse(-3.5, -3.2, 1.2, 0.8, 0.3, 0, Math.PI * 2);
      ctx.ellipse(3, -2.5, 1.2, 0.8, -0.4, 0, Math.PI * 2);
      ctx.fill();

      // Fresh chopped parsley flakes
      ctx.fillStyle = '#15803d';
      const flakes = [[-2, -2.5], [0.5, -3.5], [-1, -3.8], [2, -3.2], [3.5, -3.8], [-4, -2.5]];
      flakes.forEach(([fx, fy]) => ctx.fillRect(fx, fy, 0.9, 0.9));
      return true;
    }

    case 'french_fries': {
      drawShadow(ctx, 7.5, 2.8, 7.5, 0.22);

      // Golden potato fries sticking up
      const fries = [
        [-4.5, -3, -0.25, 8],
        [-2.8, -4, -0.1, 9.5],
        [-1, -4.5, 0.05, 10.5],
        [1.2, -4, 0.12, 10],
        [3, -3.5, 0.22, 9],
        [4.6, -3, 0.35, 7.5],
        [-3.8, -2, -0.18, 7],
        [0, -2.5, 0, 8.5],
        [2.2, -2, 0.15, 7.5]
      ];
      fries.forEach(([fx, fy, rot, len]) => {
        ctx.save();
        ctx.translate(fx, fy);
        ctx.rotate(rot);
        ctx.fillStyle = '#eab308';
        ctx.fillRect(-1, -len, 2, len);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(-0.8, -len, 1.6, len * 0.8);
        ctx.fillStyle = '#b45309';
        ctx.fillRect(-1, -len, 2, 1.2); // toasted tip
        ctx.restore();
      });

      // Red fast food cardboard container
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(-6.5, -2);
      ctx.lineTo(6.5, -2);
      ctx.lineTo(4.8, 7.5);
      ctx.lineTo(-4.8, 7.5);
      ctx.closePath();
      ctx.fill();

      // Curved cutout on top front of container
      ctx.fillStyle = '#b91c1c';
      ctx.beginPath();
      ctx.ellipse(0, -2, 4.5, 1.8, 0, 0, Math.PI);
      ctx.fill();

      // Yellow double arch / stripe
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(-1.6, 2.5, 1.8, Math.PI, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(1.6, 2.5, 1.8, Math.PI, 0);
      ctx.stroke();
      return true;
    }

    case 'nuggets': {
      drawShadow(ctx, 8.5, 3, 7.5, 0.22);

      // 3 crispy nuggets in a cluster
      const nuggs: Array<{ nx: number; ny: number; nw: number; nh: number; cBase: string; cTop: string }> = [
        { nx: -4.5, ny: 1, nw: 6.2, nh: 4.8, cBase: '#b45309', cTop: '#d97706' },
        { nx: 3.5, ny: 1.5, nw: 6.5, nh: 5, cBase: '#92400e', cTop: '#b45309' },
        { nx: -0.5, ny: -2.5, nw: 7, nh: 5.2, cBase: '#b45309', cTop: '#d97706' }
      ];
      nuggs.forEach(({ nx, ny, nw, nh, cBase, cTop }) => {
        ctx.fillStyle = cBase;
        ctx.beginPath();
        ctx.roundRect(nx - nw / 2, ny - nh / 2, nw, nh, 2.2);
        ctx.fill();

        ctx.fillStyle = cTop;
        ctx.beginPath();
        ctx.roundRect(nx - nw / 2 + 0.6, ny - nh / 2 + 0.6, nw - 1.2, nh - 1.2, 1.8);
        ctx.fill();

        // Crunchy batter flecks
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(nx - 1, ny - 1, 1.5, 1.5);
        ctx.fillRect(nx + 1.2, ny + 0.5, 1.2, 1.2);
      });
      return true;
    }

    case 'hot_dog': {
      drawShadow(ctx, 9, 3.2, 7.5, 0.22);

      // Toasted bun bottom
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.roundRect(-8.5, -2, 17, 7.5, 3.5);
      ctx.fill();

      ctx.fillStyle = '#fde68a';
      ctx.beginPath();
      ctx.roundRect(-7.8, -1.2, 15.6, 6, 2.8);
      ctx.fill();

      // Grilled sausage
      ctx.fillStyle = '#9f1239';
      ctx.beginPath();
      ctx.roundRect(-9.5, -2.5, 19, 4.5, 2.2);
      ctx.fill();
      ctx.fillStyle = '#be123c';
      ctx.beginPath();
      ctx.roundRect(-9, -2, 18, 3.5, 1.8);
      ctx.fill();

      // Sausage grill marks
      ctx.fillStyle = '#4c0519';
      for (let gx = -7; gx <= 7; gx += 3) {
        ctx.fillRect(gx, -2, 1.2, 3.5);
      }

      // Zigzag yellow mustard drizzle
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 1.4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(-8, -1);
      ctx.lineTo(-5, 1);
      ctx.lineTo(-2, -1);
      ctx.lineTo(1, 1);
      ctx.lineTo(4, -1);
      ctx.lineTo(7, 0.5);
      ctx.stroke();

      // Crispy fried onion bits
      ctx.fillStyle = '#78350f';
      const onions = [[-6, 0], [-3, 1], [0, -0.5], [3, 1], [5, -0.5]];
      onions.forEach(([ox, oy]) => ctx.fillRect(ox, oy, 1, 1));
      return true;
    }

    case 'donut': {
      drawShadow(ctx, 8.5, 3.2, 7.5, 0.22);

      // Golden baked doughnut ring
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.arc(0, 0, 8.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
      ctx.fill();

      // Glossy strawberry pink glaze
      ctx.fillStyle = '#f472b6';
      ctx.beginPath();
      ctx.arc(0, 0, 6.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fbcfe8';
      ctx.beginPath();
      ctx.ellipse(-2, -3, 3, 1.5, -0.3, 0, Math.PI * 2);
      ctx.fill();

      // Center donut hole
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(0, 0, 2.6, 0, Math.PI * 2);
      ctx.fill();

      // Rainbow sprinkles
      const sprinkles = [
        [-4, -3, '#38bdf8'],
        [3, -4, '#facc15'],
        [4, 1.5, '#4ade80'],
        [-3.5, 2.8, '#ffffff'],
        [0, -4.8, '#ec4899'],
        [-2.5, -1, '#fbbf24'],
        [2, 3.5, '#38bdf8']
      ];
      sprinkles.forEach(([sx, sy, col]) => {
        ctx.fillStyle = col as string;
        ctx.fillRect(sx as number, sy as number, 1.6, 0.9);
      });
      return true;
    }

    case 'sushi_set': {
      drawShadow(ctx, 9.2, 3.2, 7.8, 0.25);

      // Glossy black lacquer tray
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.roundRect(-9.2, -6, 18.4, 12.5, 2);
      ctx.fill();
      ctx.strokeStyle = '#3f3f46';
      ctx.lineWidth = 1;
      ctx.stroke();

      // 3 Philadelphia salmon maki rolls
      const rolls = [-5, 0, 5];
      rolls.forEach(rx => {
        // Nori outer ring
        ctx.fillStyle = '#052e16';
        ctx.beginPath();
        ctx.arc(rx, -0.5, 2.8, 0, Math.PI * 2);
        ctx.fill();

        // Pearl sushi rice
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(rx, -0.5, 2.3, 0, Math.PI * 2);
        ctx.fill();

        // Fresh orange salmon center
        ctx.fillStyle = '#fb923c';
        ctx.beginPath();
        ctx.arc(rx, -0.5, 1.3, 0, Math.PI * 2);
        ctx.fill();

        // Cucumber & cream cheese core
        ctx.fillStyle = '#15803d';
        ctx.fillRect(rx - 0.4, -0.8, 0.8, 0.8);
      });

      // Wasabi quenelle
      ctx.fillStyle = '#84cc16';
      ctx.beginPath();
      ctx.arc(6.5, -3.5, 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Pickled pink ginger rosette
      ctx.fillStyle = '#f472b6';
      ctx.beginPath();
      ctx.arc(6.5, 3.5, 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Soy sauce corner puddle
      ctx.fillStyle = '#1c1917';
      ctx.beginPath();
      ctx.roundRect(-8, 2.5, 3.5, 2.5, 1);
      ctx.fill();
      return true;
    }

    case 'wok_box': {
      drawShadow(ctx, 7.5, 2.8, 7.5, 0.22);

      // Folded white paperboard takeout box
      ctx.fillStyle = '#f1f5f9';
      ctx.beginPath();
      ctx.moveTo(-6.5, -4.5);
      ctx.lineTo(6.5, -4.5);
      ctx.lineTo(4.8, 7.2);
      ctx.lineTo(-4.8, 7.2);
      ctx.closePath();
      ctx.fill();

      // Box face shadow & folds
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.moveTo(0, -4.5);
      ctx.lineTo(6.5, -4.5);
      ctx.lineTo(4.8, 7.2);
      ctx.lineTo(0, 7.2);
      ctx.closePath();
      ctx.fill();

      // Red Chinese Pagoda Logo
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-2, 0, 4, 3);
      ctx.beginPath();
      ctx.moveTo(-3.5, 0);
      ctx.lineTo(3.5, 0);
      ctx.lineTo(0, -2.5);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(-0.6, -3.5, 1.2, 1);

      // Bamboo chopsticks angled out top
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-5, -8.5);
      ctx.lineTo(3, 4);
      ctx.moveTo(-3, -9);
      ctx.lineTo(5, 4);
      ctx.stroke();

      // Wire handle arched across
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.arc(0, -4.5, 5, Math.PI, 0);
      ctx.stroke();
      return true;
    }

    case 'banana': {
      drawShadow(ctx, 7.5, 2.4, 7.2, 0.2);

      // Curved banana body
      ctx.strokeStyle = '#ca8a04';
      ctx.lineWidth = 4.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, -3.5, 8.8, Math.PI * 0.2, Math.PI * 0.8, false);
      ctx.stroke();

      // Bright sunny yellow surface
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 3.6;
      ctx.beginPath();
      ctx.arc(0, -3.5, 8.8, Math.PI * 0.22, Math.PI * 0.78, false);
      ctx.stroke();

      // Highlight facet
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(0, -3.5, 9.2, Math.PI * 0.28, Math.PI * 0.72, false);
      ctx.stroke();

      // Green stem tip & brown blossom end
      ctx.fillStyle = '#15803d';
      ctx.fillRect(-7.2, 1.2, 2, 2.2);
      ctx.fillStyle = '#451a03';
      ctx.fillRect(-7.5, 1.5, 1.2, 1.5);
      ctx.fillRect(6.2, 1.2, 1.5, 1.5);
      return true;
    }

    case 'bread_loaf': {
      drawShadow(ctx, 9.2, 3.2, 7.5, 0.22);

      // Golden baked baton loaf
      ctx.fillStyle = '#92400e';
      ctx.beginPath();
      ctx.ellipse(0, 0, 9.5, 5.5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.ellipse(0, -1, 8.5, 4.4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Bread crust sheen
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.ellipse(0, -2, 7, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Diagonal baker score cuts with pale crumb showing
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-5, -3.5); ctx.lineTo(-2.5, 1.5);
      ctx.moveTo(-1.2, -4.2); ctx.lineTo(1.2, 1.8);
      ctx.moveTo(2.5, -3.5); ctx.lineTo(5, 1.5);
      ctx.stroke();

      ctx.strokeStyle = '#fef3c7';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-4.8, -3.2); ctx.lineTo(-2.7, 1.2);
      ctx.moveTo(-1, -3.8); ctx.lineTo(1, 1.5);
      ctx.moveTo(2.7, -3.2); ctx.lineTo(4.8, 1.2);
      ctx.stroke();
      return true;
    }

    case 'cookie_pack': {
      drawShadow(ctx, 7.5, 2.8, 7.5, 0.22);

      // Sapphire blue snack pack
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.roundRect(-7.5, -5.5, 15, 11, 2);
      ctx.fill();
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(-7.5, -5.5, 3, 11);

      // Transparent preview window with chocolate chip cookies
      ctx.fillStyle = '#0369a1';
      ctx.beginPath();
      ctx.ellipse(0, 0, 4.5, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Golden baked cookie
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.arc(0, 0, 3.8, 0, Math.PI * 2);
      ctx.fill();

      // Dark chocolate chunks
      ctx.fillStyle = '#3b1806';
      const chunks = [[-1.2, -1.5], [1.5, -0.8], [-0.5, 1.5], [1.2, 1.2], [-1.8, 0.5]];
      chunks.forEach(([cx, cy]) => ctx.fillRect(cx, cy, 1.1, 1.1));

      // White brand band
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-7.5, 2.5, 15, 1.2);
      return true;
    }

    case 'popcorn_caramel': {
      drawShadow(ctx, 7.2, 2.8, 7.8, 0.22);

      // Cinema bucket (tapered red container)
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(-6.5, -2.5);
      ctx.lineTo(6.5, -2.5);
      ctx.lineTo(5, 7.5);
      ctx.lineTo(-5, 7.5);
      ctx.closePath();
      ctx.fill();

      // White vertical bucket stripes
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-4, -2.5, 2, 10);
      ctx.fillRect(0, -2.5, 2, 10);
      ctx.fillRect(4, -2.5, 1.5, 10);

      // Yellow top rim
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.ellipse(0, -2.5, 6.5, 2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Fluffy popped corn kernels piled high
      ctx.fillStyle = '#fef08a';
      const puffs = [
        [-3.5, -4, 2.6],
        [0, -5.5, 3.2],
        [3.5, -4, 2.6],
        [-1.8, -4, 2.4],
        [2, -4.2, 2.4],
        [-3, -6.5, 2.0],
        [1.5, -7, 2.2]
      ];
      puffs.forEach(([px, py, pr]) => {
        ctx.beginPath();
        ctx.arc(px, py, pr, 0, Math.PI * 2);
        ctx.fill();
      });

      // Caramel drizzle drops
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.arc(-1.5, -5.5, 1, 0, Math.PI * 2);
      ctx.arc(2, -6, 1.2, 0, Math.PI * 2);
      ctx.arc(0, -3.8, 1, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    case 'nachos': {
      drawShadow(ctx, 8.5, 3.2, 7.5, 0.22);

      // Cardboard boat / tray
      ctx.fillStyle = '#92400e';
      ctx.beginPath();
      ctx.ellipse(0, 2.5, 8.8, 4.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.ellipse(0, 1.8, 8, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Golden triangular tortilla chips
      ctx.fillStyle = '#facc15';
      // Chip 1
      ctx.beginPath();
      ctx.moveTo(-6.5, 2); ctx.lineTo(-2.5, -4.5); ctx.lineTo(-1, 3);
      ctx.closePath(); ctx.fill();
      // Chip 2
      ctx.beginPath();
      ctx.moveTo(1.5, 3.5); ctx.lineTo(3.5, -5); ctx.lineTo(7.5, 2.5);
      ctx.closePath(); ctx.fill();
      // Chip 3
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.moveTo(-3, 1); ctx.lineTo(0.5, -6); ctx.lineTo(4, 1);
      ctx.closePath(); ctx.fill();

      // Center cup of melted nacho cheese
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(0, 1, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(0, 1, 2.6, 0, Math.PI * 2);
      ctx.fill();
      // Jalapeno slice in dip
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.arc(0, 1, 1, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    case 'military_ration': {
      drawShadow(ctx, 8.5, 3, 7.5, 0.25);

      // Olive drab military combat MRE pouch
      ctx.fillStyle = '#365314';
      ctx.beginPath();
      ctx.roundRect(-8.5, -6.5, 17, 13.5, 2);
      ctx.fill();

      // Heat-sealed crimped border
      ctx.strokeStyle = '#1a2e05';
      ctx.lineWidth = 1;
      ctx.strokeRect(-8.5, -6.5, 17, 13.5);

      // Tear notches on sides
      ctx.fillStyle = '#1a2e05';
      ctx.beginPath();
      ctx.moveTo(-8.5, -4); ctx.lineTo(-7.5, -3.5); ctx.lineTo(-8.5, -3); ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(8.5, -4); ctx.lineTo(7.5, -3.5); ctx.lineTo(8.5, -3); ctx.closePath(); ctx.fill();

      // Military stenciled text block
      ctx.fillStyle = '#14532d';
      ctx.fillRect(-6.5, -3, 13, 2);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(-5, 0.5, 10, 1.4);
      ctx.fillRect(-3.5, 2.8, 7, 1.2);
      return true;
    }

    default:
      return false;
  }
}
