// Procedural 2D Canvas Models for Food Items
import { drawShadow, drawGlossBand } from './itemGraphicShared';
import { GummyCandyShape, PelmenShape, PelmenSize, PelmenState, ChocolateShape, ChocolateSize } from '../types';

export function drawFoodItem(ctx: CanvasRenderingContext2D, itemId: string, item?: any): boolean {
  switch (itemId) {
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

    case 'soup':
    case 'hot_soup':
    case 'broth':
    case 'broth_beef':
    case 'broth_chicken':
    case 'broth_fish':
    case 'broth_vegetable':
    case 'broth_mushroom': {
      drawShadow(ctx, 8.5, 3, 7.5, 0.22);

      // Ceramic bowl body (warm terracotta/crimson ceramic)
      const bowlColor = itemId.includes('fish') ? '#0284c7' :
                        itemId.includes('beef') ? '#7f1d1d' :
                        itemId.includes('mushroom') ? '#78350f' : '#9f1239';
      const rimColor = itemId.includes('fish') ? '#38bdf8' :
                       itemId.includes('beef') ? '#991b1b' :
                       itemId.includes('mushroom') ? '#92400e' : '#be123c';

      ctx.fillStyle = bowlColor;
      ctx.beginPath();
      ctx.ellipse(0, 1.5, 8.5, 4.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-8.5, -3, 17, 5);

      // Ceramic outer bowl rim
      ctx.fillStyle = rimColor;
      ctx.beginPath();
      ctx.ellipse(0, -3, 8.5, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Ceramic highlight on rim
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.beginPath();
      ctx.ellipse(-2, -3.3, 5, 1.4, -0.1, 0, Math.PI * 2);
      ctx.fill();

      // Broth liquid color
      let brothBase = '#eab308'; // Chicken golden
      let brothGlow = '#facc15';
      if (itemId.includes('beef')) {
        brothBase = '#b45309';
        brothGlow = '#d97706';
      } else if (itemId.includes('mushroom')) {
        brothBase = '#713f12';
        brothGlow = '#854d0e';
      } else if (itemId.includes('fish')) {
        brothBase = '#fef08a';
        brothGlow = '#fef9c3';
      }

      ctx.fillStyle = brothBase;
      ctx.beginPath();
      ctx.ellipse(0, -2.8, 7.5, 2.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = brothGlow;
      ctx.beginPath();
      ctx.ellipse(-1, -3, 6, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Carrot coins & garnish
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.ellipse(-3.5, -3.2, 1.2, 0.8, 0.3, 0, Math.PI * 2);
      ctx.ellipse(3, -2.5, 1.2, 0.8, -0.4, 0, Math.PI * 2);
      ctx.fill();

      // Fresh chopped parsley / dill flakes
      ctx.fillStyle = '#15803d';
      const flakes = [[-2, -2.5], [0.5, -3.5], [-1, -3.8], [2, -3.2], [3.5, -3.8], [-4, -2.5]];
      flakes.forEach(([fx, fy]) => ctx.fillRect(fx, fy, 0.9, 0.9));

      // Delicate rising steam wisps
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 0.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-2.5, -5.5);
      ctx.quadraticCurveTo(-4.0, -8.0, -2.0, -10.5);
      ctx.moveTo(2.0, -5.5);
      ctx.quadraticCurveTo(3.5, -8.0, 1.5, -10.5);
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

    case 'cookies':
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

    case 'cookie_single': {
      drawShadow(ctx, 7, 2.8, 7.2, 0.24);

      // Round artisanal chocolate chip cookie with rustic rough edges
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.arc(0, 0, 6.2, 0, Math.PI * 2);
      ctx.fill();

      // Golden baked buttery dough face
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.arc(0, 0, 5.6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fde68a';
      ctx.beginPath();
      ctx.arc(-0.8, -0.8, 4.2, 0, Math.PI * 2);
      ctx.fill();

      // Organic oven fissure / crack lines
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-3, -2); ctx.lineTo(-1, 0); ctx.lineTo(-2, 2.5);
      ctx.moveTo(1, -3); ctx.lineTo(1.8, -0.5); ctx.lineTo(3.5, 1);
      ctx.moveTo(-0.5, 1.5); ctx.lineTo(1.2, 3);
      ctx.stroke();

      // Chunky dark chocolate chips embedded in the cookie
      const chips = [
        { cx: -2.2, cy: -1.8, r: 1.6 },
        { cx: 1.8, cy: -2.2, r: 1.8 },
        { cx: -1.2, cy: 1.6, r: 1.7 },
        { cx: 2.4, cy: 1.4, r: 1.5 },
        { cx: 0.2, cy: -0.2, r: 1.4 },
        { cx: -3.8, cy: 0.8, r: 1.2 }
      ];
      chips.forEach(({ cx, cy, r }) => {
        // Dark chocolate body
        ctx.fillStyle = '#1c1917';
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        // Melted chocolate sheen facet
        ctx.fillStyle = '#451a03';
        ctx.beginPath();
        ctx.arc(cx - 0.3, cy - 0.3, r * 0.6, 0, Math.PI * 2);
        ctx.fill();
        // Specular glint
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - 0.4, cy - 0.4, 0.6, 0.6);
      });

      // Flaky sea salt / sugar crystals
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillRect(-1.5, -3.2, 0.7, 0.7);
      ctx.fillRect(2.8, -0.8, 0.7, 0.7);
      ctx.fillRect(0.8, 2.5, 0.7, 0.7);
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

    case 'canned_fish':
    case 'fish_preserves': {
      drawShadow(ctx, 7.5, 2.6, 7.8, 0.25);

      // Authentic Baltic Sprats in Oil ("Шпроты в масле ГОСТ")
      // Flat oval golden-lacquered tin can
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.ellipse(0, 1.0, 7.5, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Golden metallic side wall
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.roundRect(-7.5, -3.5, 15, 6.0, 3);
      ctx.fill();

      // Top crimped tin lid
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.ellipse(0, -3.5, 7.2, 3.8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Metallic rim highlight
      ctx.strokeStyle = '#fef3c7';
      ctx.lineWidth = 0.7;
      ctx.stroke();

      // Dark lithographed label in center
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.ellipse(0, -3.5, 5.6, 2.8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Gold sprat silhouette swimming
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.ellipse(-0.8, -3.5, 2.8, 1.0, 0.1, 0, Math.PI * 2);
      ctx.fill();
      // Fish tail
      ctx.beginPath();
      ctx.moveTo(1.8, -3.5); ctx.lineTo(3.2, -4.5); ctx.lineTo(3.2, -2.5);
      ctx.closePath();
      ctx.fill();

      // Silver easy-open pull ring tab
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(-3.8, -3.5, 1.2, 0, Math.PI * 2);
      ctx.stroke();

      // Specular sheen
      drawGlossBand(ctx, -4.5, -4.5, 2.0, 6.0, 0.35);
      return true;
    }

    case 'canned_stew':
    case 'stew_meat': {
      drawShadow(ctx, 6.8, 2.6, 7.8, 0.25);

      // Heavy Army Beef Stew Tin Can ("Говядина тушёная В/С")
      // Heavy cylindrical tin can body
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.roundRect(-5.5, -5.5, 11, 12.5, 1.5);
      ctx.fill();

      // Stamped horizontal tin beads
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(-5.5, -4); ctx.lineTo(5.5, -4);
      ctx.moveTo(-5.5, 5.5); ctx.lineTo(5.5, 5.5);
      ctx.stroke();

      // Red and Cream Paper Wrap Label
      ctx.fillStyle = '#991b1b';
      ctx.fillRect(-5.2, -3.0, 10.4, 7.5);
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(-5.2, -1.0, 10.4, 4.0);

      // Cow head silhouette emblem
      ctx.fillStyle = '#7f1d1d';
      ctx.beginPath();
      ctx.arc(0, 1.0, 1.4, 0, Math.PI * 2);
      ctx.fill();
      // Horns
      ctx.strokeStyle = '#7f1d1d';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(-1.2, 0.2); ctx.lineTo(-1.8, -0.8);
      ctx.moveTo(1.2, 0.2); ctx.lineTo(1.8, -0.8);
      ctx.stroke();

      // Gold Medal Seal
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(3.2, 1.0, 1.0, 0, Math.PI * 2);
      ctx.fill();

      // Top crimped metal lid with concentric stamping rings
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.ellipse(0, -5.5, 5.2, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Silver pull tab
      ctx.fillStyle = '#64748b';
      ctx.fillRect(-1.0, -6.5, 2.0, 1.6);

      drawGlossBand(ctx, -3.6, -5.5, 1.2, 12.5, 0.35);
      return true;
    }

    case 'condensed_milk':
    case 'canned_condensed_milk': {
      drawShadow(ctx, 6.8, 2.6, 7.8, 0.25);

      // Legendary Russian GOST Sweetened Condensed Milk ("Сгущёнка ГОСТ")
      // Sturdy cylindrical steel can body
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.roundRect(-5.5, -5.5, 11, 12.5, 1.5);
      ctx.fill();

      // Label background (Navy Blue #1e3a8a)
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(-5.2, -3.2, 10.4, 8.0);

      // Iconic geometric alternating white & cyan triangles at top and bottom
      ctx.fillStyle = '#ffffff';
      for (let tx = -5.0; tx <= 4.0; tx += 2.0) {
        // Top white triangles
        ctx.beginPath();
        ctx.moveTo(tx, -3.2); ctx.lineTo(tx + 1.0, -2.0); ctx.lineTo(tx + 2.0, -3.2);
        ctx.closePath();
        ctx.fill();
        // Bottom white triangles
        ctx.beginPath();
        ctx.moveTo(tx, 4.8); ctx.lineTo(tx + 1.0, 3.6); ctx.lineTo(tx + 2.0, 4.8);
        ctx.closePath();
        ctx.fill();
      }

      ctx.fillStyle = '#38bdf8';
      for (let tx = -4.0; tx <= 4.0; tx += 2.0) {
        // Top cyan triangles
        ctx.beginPath();
        ctx.moveTo(tx, -3.2); ctx.lineTo(tx + 1.0, -2.0); ctx.lineTo(tx, -2.0);
        ctx.closePath();
        ctx.fill();
      }

      // Center white/cyan milk drop badge
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0.8, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(0, 0.8, 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-0.4, 0.2, 0.8, 1.2);

      // Top crimped metal lid with recessed ridge
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.ellipse(0, -5.5, 5.2, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 0.6;
      ctx.stroke();

      // Specular tin reflection streak
      drawGlossBand(ctx, -3.5, -5.5, 1.4, 12.5, 0.4);
      return true;
    }

    case 'berries':
    case 'forest_berries': {
      drawShadow(ctx, 8.0, 3.0, 7.8, 0.24);

      // Rustic Birchbark Woven Basket filled with Wild Forest Berries
      // Birchbark basket container
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.roundRect(-6.5, -2.5, 13, 9.5, [1, 1, 3, 3]);
      ctx.fill();

      // Woven lattice / criss-cross pattern
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 0.8;
      for (let wx = -5; wx <= 5; wx += 2.2) {
        ctx.beginPath();
        ctx.moveTo(wx, -2.5); ctx.lineTo(wx, 7.0);
        ctx.stroke();
      }
      for (let wy = -0.5; wy <= 5.5; wy += 2.0) {
        ctx.beginPath();
        ctx.moveTo(-6.5, wy); ctx.lineTo(6.5, wy);
        ctx.stroke();
      }

      // Wooden rim
      ctx.fillStyle = '#92400e';
      ctx.fillRect(-7.0, -3.5, 14, 1.6);

      // Mound of plump ripe forest berries:
      // Wild blueberries (navy / deep indigo)
      ctx.fillStyle = '#1e3a8a';
      const blues = [[-4.0, -4.2], [-1.5, -4.8], [2.2, -4.5], [4.5, -3.8], [-0.5, -3.5], [-3.2, -2.5]];
      blues.forEach(([bx, by]) => {
        ctx.beginPath();
        ctx.arc(bx, by, 1.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(bx - 0.4, by - 0.4, 0.8, 0.8); // Specular gleam
        ctx.fillStyle = '#1e3a8a';
      });

      // Wild lingonberries / cranberries (bright ruby red)
      ctx.fillStyle = '#dc2626';
      const reds = [[-2.8, -4.5], [0.8, -5.2], [3.5, -4.8], [-2.0, -3.2], [1.8, -3.4], [4.0, -2.8]];
      reds.forEach(([rx, ry]) => {
        ctx.beginPath();
        ctx.arc(rx, ry, 1.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fca5a5';
        ctx.fillRect(rx - 0.3, ry - 0.3, 0.6, 0.6); // Gleam
        ctx.fillStyle = '#dc2626';
      });

      // Wild raspberries (segmented crimson)
      ctx.fillStyle = '#e11d48';
      const rasps = [[-0.5, -5.5], [2.5, -3.8], [-4.5, -3.0]];
      rasps.forEach(([rx, ry]) => {
        ctx.beginPath();
        ctx.arc(rx, ry, 1.6, 0, Math.PI * 2);
        ctx.fill();
      });

      // Two tiny fresh green forest leaves
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.ellipse(-1.5, -6.5, 1.8, 0.9, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(1.5, -6.8, 1.6, 0.8, 0.5, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    case 'egg_chicken_single':
    case 'egg_quail_single': {
      const isQuail = itemId === 'egg_quail_single';
      drawShadow(ctx, isQuail ? 3.5 : 4.5, 1.8, 6.2, 0.2);
      ctx.fillStyle = isQuail ? '#e7e5e4' : '#fed7aa';
      ctx.beginPath();
      ctx.ellipse(0, 0.5, isQuail ? 3.0 : 4.0, isQuail ? 4.0 : 5.2, 0, 0, Math.PI * 2);
      ctx.fill();
      if (isQuail) {
        ctx.fillStyle = '#57534e';
        ctx.beginPath();
        ctx.arc(-1.0, -0.5, 0.6, 0, Math.PI * 2);
        ctx.arc(1.2, 1.0, 0.7, 0, Math.PI * 2);
        ctx.arc(-0.4, 2.0, 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      return true;
    }

    case 'chip_potato_single':
    case 'nacho_chip_single': {
      drawShadow(ctx, 4.5, 1.8, 5.5, 0.18);
      ctx.fillStyle = itemId === 'nacho_chip_single' ? '#f59e0b' : '#fde047';
      ctx.strokeStyle = '#ca8a04';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      if (itemId === 'nacho_chip_single') {
        ctx.moveTo(0, -4.5);
        ctx.lineTo(4.5, 3.8);
        ctx.lineTo(-4.5, 3.8);
        ctx.closePath();
      } else {
        ctx.ellipse(0, 0, 4.4, 3.2, -0.25, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.stroke();
      return true;
    }

    case 'cookie_choco_single': {
      drawShadow(ctx, 5.0, 2.0, 5.8, 0.22);
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.arc(0, 0, 4.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#451a03';
      for (const [cx, cy] of [[-1.6, -1.2], [1.5, -1.0], [0, 1.4], [-1.5, 1.6], [1.8, 1.2]]) {
        ctx.beginPath();
        ctx.arc(cx, cy, 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
      return true;
    }

    case 'popcorn_handful': {
      drawShadow(ctx, 5.0, 2.0, 5.8, 0.18);
      ctx.fillStyle = '#fef9c3';
      for (const [px, py] of [[-1.8, 0.5], [1.8, 0.5], [0, -1.5], [0, 1.5]]) {
        ctx.beginPath();
        ctx.arc(px, py, 2.0, 0, Math.PI * 2);
        ctx.fill();
      }
      return true;
    }

    case 'pill_painkiller_single':
    case 'pill_antipyretic_single':
    case 'pill_charcoal_single':
    case 'pill_vitamin_single':
    case 'patch_bactericidal_single': {
      drawShadow(ctx, 3.8, 1.5, 5.0, 0.18);
      if (itemId === 'patch_bactericidal_single') {
        ctx.fillStyle = '#fed7aa';
        ctx.beginPath();
        ctx.roundRect(-5.0, -2.0, 10.0, 4.0, 1.2);
        ctx.fill();
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(-1.8, -1.4, 3.6, 2.8);
        return true;
      }
      ctx.fillStyle =
        itemId === 'pill_charcoal_single'
          ? '#18181b'
          : itemId === 'pill_vitamin_single'
          ? '#f59e0b'
          : itemId === 'pill_antipyretic_single'
          ? '#38bdf8'
          : '#f8fafc';
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.arc(0, 0, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-2.2, 0);
      ctx.lineTo(2.2, 0);
      ctx.stroke();
      return true;
    }

    case 'gummy_candy': {
      drawGummyCandyPiece(ctx, item);
      return true;
    }

    case 'pelmen': {
      drawPelmenPiece(ctx, item);
      return true;
    }

    case 'chocolate': {
      drawChocolatePiece(ctx, item);
      return true;
    }

    default:
      return false;
  }
}

function tintHex(hex: string, amount: number): string {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(ch => ch + ch).join('');
  const num = parseInt(c, 16);
  if (isNaN(num)) return hex;
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const r = clamp((num >> 16) + Math.round(255 * amount));
  const g = clamp(((num >> 8) & 0x00ff) + Math.round(255 * amount));
  const b = clamp((num & 0x0000ff) + Math.round(255 * amount));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function drawGummyCandyPiece(ctx: CanvasRenderingContext2D, item?: any): void {
  const attrs = item?.gummyAttributes;
  const color: string = attrs?.color || '#ef4444';
  const shape: GummyCandyShape = attrs?.shape || 'bear';
  const sourDust = Boolean(attrs?.sourDust);

  const bright = tintHex(color, 0.28);
  const deep = tintHex(color, -0.24);
  const rim = tintHex(color, -0.38);

  drawShadow(ctx, 4.4, 2.0, 5.2, 0.22);
  ctx.save();

  const makeGelatinGrad = (x0: number, y0: number, x1: number, y1: number) => {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0.0, bright);
    g.addColorStop(0.45, color);
    g.addColorStop(1.0, deep);
    return g;
  };

  switch (shape) {
    case 'worm': {
      // Curvy S-shaped two-tone gummy worm
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Deep outline shadow
      ctx.strokeStyle = rim;
      ctx.lineWidth = 4.2;
      ctx.beginPath();
      ctx.moveTo(-4.8, 2.4);
      ctx.bezierCurveTo(-2.5, -4.6, 1.5, 4.6, 4.8, -2.2);
      ctx.stroke();

      // Main gelatin worm body
      const wormGrad = ctx.createLinearGradient(-5, 2, 5, -2);
      wormGrad.addColorStop(0.0, color);
      wormGrad.addColorStop(0.48, bright);
      wormGrad.addColorStop(0.54, '#facc15');
      wormGrad.addColorStop(1.0, tintHex('#facc15', -0.18));
      ctx.strokeStyle = wormGrad;
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(-4.8, 2.4);
      ctx.bezierCurveTo(-2.5, -4.6, 1.5, 4.6, 4.8, -2.2);
      ctx.stroke();

      // Ribbed segments along worm
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 0.55;
      for (const [sx, sy] of [[-3.1, 0.2], [-1.1, -0.8], [1.1, 0.8], [3.1, -0.2]]) {
        ctx.beginPath();
        ctx.arc(sx, sy, 1.1, -0.8, 1.4);
        ctx.stroke();
      }
      break;
    }

    case 'berry': {
      // Plump raspberry/blackberry clustered drupelet gummy
      ctx.fillStyle = rim;
      ctx.beginPath();
      ctx.arc(0, 0.6, 4.3, 0, Math.PI * 2);
      ctx.fill();

      const berries: Array<[number, number, number]> = [
        [-1.8, -1.2, 1.45], [0, -1.6, 1.55], [1.8, -1.2, 1.45],
        [-2.3, 0.6, 1.45], [-0.8, 0.4, 1.55], [0.9, 0.4, 1.55], [2.3, 0.6, 1.45],
        [-1.4, 2.3, 1.4], [0.2, 2.6, 1.45], [1.6, 2.2, 1.35]
      ];
      for (const [bx, by, br] of berries) {
        const bg = ctx.createRadialGradient(bx - br * 0.3, by - br * 0.3, 0.1, bx, by, br);
        bg.addColorStop(0.0, bright);
        bg.addColorStop(0.65, color);
        bg.addColorStop(1.0, deep);
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.fill();
      }
      // Tiny emerald gummy stem cap
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.moveTo(-1.8, -3.2);
      ctx.lineTo(0, -4.4);
      ctx.lineTo(1.8, -3.2);
      ctx.lineTo(0, -2.5);
      ctx.closePath();
      ctx.fill();
      break;
    }

    case 'ring': {
      // Glossy two-layer gummy ring (foam base + bright fruit top ring)
      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.arc(0, 0.9, 4.8, 0, Math.PI * 2);
      ctx.arc(0, 0.9, 1.9, 0, Math.PI * 2, true);
      ctx.fill('evenodd');

      ctx.fillStyle = makeGelatinGrad(-4.8, -4.8, 4.8, 4.8);
      ctx.strokeStyle = rim;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.arc(0, -0.2, 4.8, 0, Math.PI * 2);
      ctx.arc(0, -0.2, 1.9, 0, Math.PI * 2, true);
      ctx.fill('evenodd');
      ctx.stroke();

      // Ring top specular highlight arc
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.lineWidth = 0.9;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, -0.2, 3.3, -2.4, -0.8);
      ctx.stroke();
      break;
    }

    case 'cube': {
      // Faceted isometric fruit marmalade cube
      ctx.fillStyle = rim;
      ctx.beginPath();
      ctx.roundRect(-4.4, -4.0, 8.8, 8.4, 1.6);
      ctx.fill();

      // Front face
      ctx.fillStyle = makeGelatinGrad(-4, -3, 4, 4);
      ctx.beginPath();
      ctx.roundRect(-4.0, -2.0, 8.0, 6.0, 1.3);
      ctx.fill();

      // Top brighter gelatin facet
      ctx.fillStyle = bright;
      ctx.beginPath();
      ctx.roundRect(-3.8, -3.8, 7.6, 3.0, 1.1);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.beginPath();
      ctx.ellipse(-1.4, -2.4, 1.8, 0.65, -0.15, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'cola_bottle': {
      // Classic two-tone gummy cola bottle
      ctx.strokeStyle = rim;
      ctx.lineWidth = 0.6;

      // Fizzy pale top neck
      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.roundRect(-1.4, -5.6, 2.8, 1.5, 0.6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = 'rgba(254, 243, 199, 0.92)';
      ctx.beginPath();
      ctx.moveTo(-1.3, -4.1);
      ctx.lineTo(1.3, -4.1);
      ctx.lineTo(2.7, -1.6);
      ctx.lineTo(-2.7, -1.6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Amber/caramel cola body bottom
      ctx.fillStyle = makeGelatinGrad(-2.7, -1.8, 2.7, 5.2);
      ctx.beginPath();
      ctx.roundRect(-2.7, -1.8, 5.4, 6.8, [0.4, 0.4, 1.6, 1.6]);
      ctx.fill();
      ctx.stroke();

      // Gloss reflection stripe
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.beginPath();
      ctx.roundRect(-1.7, -0.8, 0.9, 4.6, 0.45);
      ctx.fill();
      break;
    }

    case 'star': {
      // Plump 5-point gummy star
      ctx.fillStyle = makeGelatinGrad(-4.8, -4.8, 4.8, 4.8);
      ctx.strokeStyle = rim;
      ctx.lineWidth = 0.6;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const angle = -Math.PI / 2 + (i * Math.PI) / 5;
        const r = i % 2 === 0 ? 5.1 : 2.35;
        const px = Math.cos(angle) * r;
        const py = Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.58)';
      ctx.beginPath();
      ctx.ellipse(-1.0, -1.4, 1.4, 0.7, -0.4, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'heart': {
      // Glossy plump gummy heart
      ctx.fillStyle = makeGelatinGrad(-4.8, -4.2, 4.8, 4.8);
      ctx.strokeStyle = rim;
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(0, 4.6);
      ctx.bezierCurveTo(-5.8, 1.2, -5.6, -4.6, -2.3, -4.6);
      ctx.bezierCurveTo(-0.8, -4.6, 0, -3.2, 0, -2.5);
      ctx.bezierCurveTo(0, -3.2, 0.8, -4.6, 2.3, -4.6);
      ctx.bezierCurveTo(5.6, -4.6, 5.8, 1.2, 0, 4.6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.58)';
      ctx.beginPath();
      ctx.ellipse(-2.0, -2.2, 1.2, 0.6, -0.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'bear':
    default: {
      // Detailed gummy bear silhouette (ears, head, chubby arms, torso, paws)
      ctx.fillStyle = makeGelatinGrad(-4, -5, 4, 5);
      ctx.strokeStyle = rim;
      ctx.lineWidth = 0.55;

      // Ears
      for (const ex of [-2.3, 2.3]) {
        ctx.beginPath();
        ctx.arc(ex, -3.6, 1.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      // Arms & legs
      for (const [lx, ly, rx, ry] of [
        [-3.0, 0.2, 1.4, 1.15],
        [3.0, 0.2, 1.4, 1.15],
        [-1.8, 3.8, 1.35, 1.3],
        [1.8, 3.8, 1.35, 1.3]
      ]) {
        ctx.beginPath();
        ctx.ellipse(lx, ly, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      // Chubby torso
      ctx.beginPath();
      ctx.ellipse(0, 1.4, 2.75, 2.9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Round bear head
      ctx.beginPath();
      ctx.arc(0, -2.1, 2.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Cute snout bump & glossy belly reflection
      ctx.fillStyle = bright;
      ctx.beginPath();
      ctx.ellipse(0, -1.5, 1.1, 0.8, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.beginPath();
      ctx.ellipse(-0.9, 0.9, 0.85, 1.45, 0.25, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }

  // Sour citric sugar dust crystals if present
  if (sourDust) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
    const crystals: Array<[number, number]> = [
      [-2.4, -2.2], [1.9, -2.4], [-0.4, -0.7], [2.3, 0.8],
      [-2.1, 1.6], [0.5, 2.4], [-1.0, 3.1], [1.4, -0.3], [0.1, -3.1]
    ];
    for (const [sx, sy] of crystals) {
      ctx.fillRect(sx, sy, 0.65, 0.65);
    }
  }

  ctx.restore();
}

function drawPelmenPiece(ctx: CanvasRenderingContext2D, item?: any): void {
  const attrs = item?.pelmenAttributes;
  const shape: PelmenShape = attrs?.shape || 'ear';
  const size: PelmenSize = attrs?.size || 'medium';
  const state: PelmenState = attrs?.state || 'frozen';
  const doughColor: string = attrs?.doughColor || '#fef3c7';
  const fillingColor: string = attrs?.fillingColor || '#991b1b';
  const flourDusting = attrs?.flourDusting ?? (state === 'frozen' || state === 'raw');
  const butterGlaze = attrs?.butterGlaze ?? (state === 'boiled' || state === 'fried');

  const sizeScale =
    size === 'mini' ? 0.76 : size === 'small' ? 0.88 : size === 'large' ? 1.15 : 1.0;

  const doughBright = tintHex(doughColor, state === 'boiled' ? 0.12 : 0.08);
  const doughShade = tintHex(doughColor, state === 'fried' ? -0.22 : -0.14);
  const doughRim = tintHex(doughColor, state === 'fried' ? -0.36 : -0.24);

  drawShadow(ctx, 4.8 * sizeScale, 2.1 * sizeScale, 5.4 * sizeScale, 0.23);

  ctx.save();
  ctx.scale(sizeScale, sizeScale);

  const makeDoughGrad = (r: number = 4.6) => {
    const g = ctx.createRadialGradient(-1.2, -1.4, 0.4, 0, 0.4, r);
    g.addColorStop(0.0, doughBright);
    g.addColorStop(0.65, doughColor);
    g.addColorStop(1.0, doughShade);
    return g;
  };

  switch (shape) {
    case 'crescent': {
      // Half-moon crescent dumpling with braided pleated edge
      ctx.fillStyle = makeDoughGrad(5.4);
      ctx.strokeStyle = doughRim;
      ctx.lineWidth = 0.65;
      ctx.beginPath();
      ctx.moveTo(-4.8, 1.4);
      ctx.bezierCurveTo(-4.4, -3.8, 4.4, -3.8, 4.8, 1.4);
      ctx.bezierCurveTo(2.4, 3.2, -2.4, 3.2, -4.8, 1.4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Translucent meat belly glow through thin dough
      ctx.fillStyle = fillingColor;
      ctx.globalAlpha = state === 'boiled' ? 0.24 : 0.14;
      ctx.beginPath();
      ctx.ellipse(0, 0.2, 2.5, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;

      // Braided crimp pleats along top arch
      ctx.strokeStyle = doughRim;
      ctx.lineWidth = 0.55;
      for (let i = -3; i <= 3; i++) {
        const px = i * 1.15;
        const py = -2.2 + Math.abs(i) * 0.32;
        ctx.beginPath();
        ctx.arc(px, py, 0.75, Math.PI * 0.9, Math.PI * 2.1);
        ctx.stroke();
      }
      break;
    }

    case 'saturn': {
      // Stamped round "Saturn" pelmen with equatorial flange rim
      ctx.fillStyle = doughShade;
      ctx.strokeStyle = doughRim;
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.ellipse(0, 0.3, 5.1, 4.1, -0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Equatorial crimped ring notches
      ctx.strokeStyle = doughRim;
      ctx.lineWidth = 0.45;
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 4.1, 0.3 + Math.sin(a) * 3.2);
        ctx.lineTo(Math.cos(a) * 5.0, 0.3 + Math.sin(a) * 4.0);
        ctx.stroke();
      }

      // Plump central dome over meat filling
      ctx.fillStyle = makeDoughGrad(3.6);
      ctx.beginPath();
      ctx.ellipse(0, -0.2, 3.5, 2.8, -0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = fillingColor;
      ctx.globalAlpha = state === 'boiled' ? 0.25 : 0.15;
      ctx.beginPath();
      ctx.ellipse(0, -0.2, 2.2, 1.7, -0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
      break;
    }

    case 'khinkali': {
      // Pleated pouch dumpling (buuza / mini-khinkali) with twisted top knot
      ctx.fillStyle = makeDoughGrad(5.0);
      ctx.strokeStyle = doughRim;
      ctx.lineWidth = 0.65;
      ctx.beginPath();
      ctx.ellipse(0, 0.8, 4.5, 3.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Radial pleats converging to top knot
      ctx.strokeStyle = doughRim;
      ctx.lineWidth = 0.5;
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(ang) * 0.8, -1.1 + Math.sin(ang) * 0.5);
        ctx.quadraticCurveTo(
          Math.cos(ang + 0.25) * 2.6,
          0.2 + Math.sin(ang + 0.25) * 2.0,
          Math.cos(ang) * 4.1,
          0.8 + Math.sin(ang) * 3.1
        );
        ctx.stroke();
      }

      // Top twisted dough crown ("хвостик")
      ctx.fillStyle = doughBright;
      ctx.strokeStyle = doughRim;
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.ellipse(0, -1.3, 1.35, 0.95, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 'rose': {
      // Tortellini / rosebud folded ring dumpling
      ctx.fillStyle = makeDoughGrad(4.8);
      ctx.strokeStyle = doughRim;
      ctx.lineWidth = 0.65;

      // Outer petal loop
      ctx.beginPath();
      ctx.arc(0, 0.2, 4.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Inner curled rose fold
      ctx.beginPath();
      ctx.moveTo(-2.8, -1.2);
      ctx.bezierCurveTo(-1.2, -3.2, 2.6, -2.4, 2.4, 0.6);
      ctx.bezierCurveTo(2.1, 2.8, -2.2, 2.8, -2.2, 0.4);
      ctx.bezierCurveTo(-2.1, -1.0, 0.8, -1.2, 1.0, 0.3);
      ctx.stroke();

      ctx.fillStyle = fillingColor;
      ctx.globalAlpha = state === 'boiled' ? 0.24 : 0.15;
      ctx.beginPath();
      ctx.arc(0, 0.1, 1.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
      break;
    }

    case 'pillow': {
      // Square cushion dumpling with crimped pinked edges (ravioli / kundyum)
      ctx.fillStyle = makeDoughGrad(5.2);
      ctx.strokeStyle = doughRim;
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.roundRect(-4.5, -4.0, 9.0, 8.0, 1.2);
      ctx.fill();
      ctx.stroke();

      // Zig-zag crimp border ticks
      ctx.strokeStyle = doughRim;
      ctx.lineWidth = 0.45;
      for (let d = -3.4; d <= 3.4; d += 1.35) {
        ctx.beginPath();
        ctx.moveTo(d, -4.0);
        ctx.lineTo(d, -3.1);
        ctx.moveTo(d, 4.0);
        ctx.lineTo(d, 3.1);
        ctx.moveTo(-4.5, d * 0.85);
        ctx.lineTo(-3.6, d * 0.85);
        ctx.moveTo(4.5, d * 0.85);
        ctx.lineTo(3.6, d * 0.85);
        ctx.stroke();
      }

      // Central pillow mound
      ctx.beginPath();
      ctx.roundRect(-2.9, -2.4, 5.8, 4.8, 1.6);
      ctx.stroke();

      ctx.fillStyle = fillingColor;
      ctx.globalAlpha = state === 'boiled' ? 0.24 : 0.15;
      ctx.beginPath();
      ctx.ellipse(0, 0, 2.2, 1.7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
      break;
    }

    case 'ear':
    default: {
      // Classic Siberian/Ural "ear" pelmen with pinched tips wrapped into a ring
      ctx.fillStyle = makeDoughGrad(4.9);
      ctx.strokeStyle = doughRim;
      ctx.lineWidth = 0.65;

      // Plump rounded body with pinched ear tips meeting at bottom
      ctx.beginPath();
      ctx.arc(0, 0.1, 4.35, Math.PI * 0.82, Math.PI * 0.18, false);
      ctx.quadraticCurveTo(2.4, 4.3, 0, 3.6);
      ctx.quadraticCurveTo(-2.4, 4.3, -3.7, 2.4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Subtle warm meat filling visible beneath stretched dough dome
      ctx.fillStyle = fillingColor;
      ctx.globalAlpha = state === 'boiled' ? 0.25 : 0.15;
      ctx.beginPath();
      ctx.ellipse(0, -0.5, 2.4, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;

      // Characteristic central dimple & folded ear pinch seam
      ctx.strokeStyle = doughRim;
      ctx.lineWidth = 0.65;
      ctx.beginPath();
      ctx.arc(0, 0.7, 1.65, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, 1.6);
      ctx.lineTo(0, 3.6);
      ctx.stroke();
      break;
    }
  }

  // Fried golden-brown Maillard crust sear patch if state === 'fried'
  if (state === 'fried') {
    const searGrad = ctx.createRadialGradient(-0.3, -0.3, 0.2, 0, 0, 2.8);
    searGrad.addColorStop(0.0, 'rgba(180, 83, 9, 0.78)');
    searGrad.addColorStop(0.65, 'rgba(217, 119, 6, 0.52)');
    searGrad.addColorStop(1.0, 'rgba(217, 119, 6, 0)');
    ctx.fillStyle = searGrad;
    ctx.beginPath();
    ctx.ellipse(0, -0.2, 2.8, 2.0, -0.15, 0, Math.PI * 2);
    ctx.fill();
  }

  // Melted butter / hot broth specular sheen if boiled/fried or butterGlaze
  if (butterGlaze) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.58)';
    ctx.beginPath();
    ctx.ellipse(-1.2, -1.3, 1.35, 0.65, -0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  // Fine flour dusting & delicate crystalline rime needles if frozen/raw or flourDusting
  if (flourDusting) {
    if (state === 'frozen') {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 0.28;
      ctx.lineCap = 'round';
      const needles: Array<[number, number, number, number]> = [
        [-2.0, -1.4, 0.45, 0.65],
        [1.7, -1.3, -0.5, 0.6],
        [-1.3, 1.3, 1.1, 0.55],
        [1.6, 1.1, -0.9, 0.6],
        [0.1, -2.0, 0.2, 0.5]
      ];
      for (const [nx, ny, ang, len] of needles) {
        const dx = Math.cos(ang) * len;
        const dy = Math.sin(ang) * len;
        ctx.beginPath();
        ctx.moveTo(nx - dx, ny - dy);
        ctx.lineTo(nx + dx, ny + dy);
        ctx.moveTo(nx - dy * 0.55, ny + dx * 0.55);
        ctx.lineTo(nx + dy * 0.55, ny - dx * 0.55);
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = 'rgba(255, 251, 235, 0.62)';
      const grains: Array<[number, number, number]> = [
        [-1.9, -1.4, 0.24], [1.6, -1.3, 0.22], [-1.3, 1.2, 0.25],
        [1.7, 1.0, 0.22], [0.1, -2.1, 0.2], [-0.3, 1.9, 0.22]
      ];
      for (const [gx, gy, gr] of grains) {
        ctx.beginPath();
        ctx.moveTo(gx, gy - gr);
        ctx.lineTo(gx + gr, gy);
        ctx.lineTo(gx, gy + gr);
        ctx.lineTo(gx - gr, gy);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  ctx.restore();
}

function drawChocolatePiece(ctx: CanvasRenderingContext2D, item?: any): void {
  const attrs = item?.chocolateAttributes;
  const shape: ChocolateShape = attrs?.shape || 'classic_bar';
  const size: ChocolateSize = attrs?.size || 'medium';
  const outerColor: string = attrs?.outerColor || '#6b3e26';
  const innerColor: string = attrs?.innerColor || '#8d5524';
  const hasFilling: boolean = attrs?.hasFilling ?? (outerColor.toLowerCase() !== innerColor.toLowerCase());
  const surfaceTexture: string = attrs?.surfaceTexture || 'smooth';

  const sizeScale =
    size === 'mini'
      ? 0.74
      : size === 'small'
      ? 0.88
      : size === 'medium'
      ? 1.0
      : size === 'large'
      ? 1.12
      : 1.22; // king

  const outerBright = tintHex(outerColor, 0.22);
  const outerShade = tintHex(outerColor, -0.22);
  const outerRim = tintHex(outerColor, -0.36);
  const innerBright = tintHex(innerColor, 0.18);
  const innerShade = tintHex(innerColor, -0.18);

  drawShadow(ctx, 5.8 * sizeScale, 2.2 * sizeScale, 6.6 * sizeScale, 0.26);

  ctx.save();
  ctx.scale(sizeScale, sizeScale);

  const makeOuterGrad = (x0: number, y0: number, x1: number, y1: number) => {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0.0, outerBright);
    g.addColorStop(0.45, outerColor);
    g.addColorStop(1.0, outerShade);
    return g;
  };

  const drawSurfaceDetails = (rx: number, ry: number) => {
    if (surfaceTexture === 'nuts') {
      ctx.fillStyle = '#d6a972';
      for (const [nx, ny, nr] of [[-rx * 0.45, -ry * 0.28, 0.85], [rx * 0.35, -ry * 0.35, 0.75], [-rx * 0.15, ry * 0.32, 0.8], [rx * 0.48, ry * 0.25, 0.7]]) {
        ctx.beginPath();
        ctx.ellipse(nx, ny, nr, nr * 0.75, 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (surfaceTexture === 'crisps') {
      ctx.fillStyle = '#fef3c7';
      for (const [cx, cy] of [[-rx * 0.5, -ry * 0.3], [rx * 0.25, -ry * 0.4], [0, 0.1], [-rx * 0.3, ry * 0.4], [rx * 0.45, ry * 0.3]]) {
        ctx.fillRect(cx, cy, 0.65, 0.55);
      }
    } else if (surfaceTexture === 'marbled') {
      ctx.strokeStyle = innerBright;
      ctx.lineWidth = 0.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-rx * 0.6, -ry * 0.3);
      ctx.bezierCurveTo(-rx * 0.2, ry * 0.4, rx * 0.2, -ry * 0.5, rx * 0.6, ry * 0.2);
      ctx.stroke();
    } else if (surfaceTexture === 'dusted') {
      ctx.fillStyle = outerRim;
      for (const [dx, dy] of [[-2.0, -1.3], [1.6, -1.6], [-0.4, 0.3], [2.1, 1.1], [-1.7, 1.4], [0.5, -0.8]]) {
        ctx.fillRect(dx, dy, 0.55, 0.55);
      }
    }
  };

  // Draws a clean broken corner / slice window revealing inner filling material & color
  const drawCrossSectionSlice = (cx: number, cy: number, rw: number, rh: number, round: number = 0.6) => {
    const fg = ctx.createLinearGradient(cx - rw, cy - rh, cx + rw, cy + rh);
    fg.addColorStop(0.0, innerBright);
    fg.addColorStop(0.55, innerColor);
    fg.addColorStop(1.0, innerShade);
    ctx.fillStyle = fg;
    ctx.strokeStyle = outerRim;
    ctx.lineWidth = 0.45;
    ctx.beginPath();
    ctx.roundRect(cx - rw, cy - rh, rw * 2, rh * 2, round);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.32)';
    ctx.beginPath();
    ctx.ellipse(cx - rw * 0.25, cy - rh * 0.25, rw * 0.45, rh * 0.22, -0.25, 0, Math.PI * 2);
    ctx.fill();
  };

  switch (shape) {
    case 'chunky_bar': {
      // Thick rounded snack bar with cross-section snapped end exposing inner filling
      ctx.save();
      ctx.rotate(-0.22);
      ctx.fillStyle = makeOuterGrad(-7.5, -3.5, 7.5, 3.5);
      ctx.strokeStyle = outerRim;
      ctx.lineWidth = 0.65;
      ctx.beginPath();
      ctx.roundRect(-7.6, -3.5, 15.2, 7.0, 1.6);
      ctx.fill();
      ctx.stroke();

      // Chunky pillow segments
      for (const sx of [-5.2, -1.8, 1.6]) {
        ctx.fillStyle = outerBright;
        ctx.beginPath();
        ctx.roundRect(sx - 1.3, -2.5, 2.6, 5.0, 0.9);
        ctx.fill();
        ctx.strokeStyle = outerShade;
        ctx.lineWidth = 0.45;
        ctx.stroke();
      }

      // Snapped right end showing inner filling core
      if (hasFilling) {
        drawCrossSectionSlice(5.5, 0, 1.75, 2.4, 0.7);
      } else {
        ctx.fillStyle = outerShade;
        ctx.beginPath();
        ctx.roundRect(4.2, -2.4, 2.4, 4.8, 0.7);
        ctx.fill();
      }
      drawSurfaceDetails(5.5, 2.4);
      ctx.restore();
      break;
    }

    case 'square_tile': {
      // Square Ritter-style 3x3 segmented tile with snapped bottom-right corner showing inner core
      ctx.fillStyle = makeOuterGrad(-6, -6, 6, 6);
      ctx.strokeStyle = outerRim;
      ctx.lineWidth = 0.65;
      ctx.beginPath();
      ctx.roundRect(-6.2, -6.2, 12.4, 12.4, 1.1);
      ctx.fill();
      ctx.stroke();

      // 3x3 beveled square segments
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          if (r === 2 && c === 2 && hasFilling) continue;
          const sx = -5.4 + c * 3.7;
          const sy = -5.4 + r * 3.7;
          ctx.fillStyle = outerBright;
          ctx.fillRect(sx, sy, 3.1, 3.1);
          ctx.fillStyle = outerColor;
          ctx.fillRect(sx + 0.35, sy + 0.35, 2.4, 2.4);
        }
      }

      if (hasFilling) {
        drawCrossSectionSlice(3.6, 3.6, 1.75, 1.75, 0.5);
      }
      drawSurfaceDetails(5.0, 5.0);
      break;
    }

    case 'triangle_prism': {
      // Sawtooth mountain-peak Toblerone-style chocolate bar
      ctx.save();
      ctx.rotate(-0.2);
      // Base plinth
      ctx.fillStyle = outerShade;
      ctx.strokeStyle = outerRim;
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.roundRect(-7.8, 1.4, 15.6, 2.8, 0.6);
      ctx.fill();
      ctx.stroke();

      // 4 triangular prism peaks
      for (let i = 0; i < 4; i++) {
        const px = -5.6 + i * 3.7;
        // Left lit triangle face
        ctx.fillStyle = outerBright;
        ctx.beginPath();
        ctx.moveTo(px - 1.7, 1.5);
        ctx.lineTo(px, -3.6);
        ctx.lineTo(px + 0.2, 1.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Right shaded triangle face
        ctx.fillStyle = outerColor;
        ctx.beginPath();
        ctx.moveTo(px, -3.6);
        ctx.lineTo(px + 1.8, 1.5);
        ctx.lineTo(px + 0.2, 1.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      // Snapped right triangle exposing inner honey/almond nougat
      if (hasFilling) {
        ctx.fillStyle = innerColor;
        ctx.beginPath();
        ctx.moveTo(4.6, 1.0);
        ctx.lineTo(5.6, -2.4);
        ctx.lineTo(6.7, 1.0);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = outerRim;
        ctx.lineWidth = 0.45;
        ctx.stroke();
      }
      drawSurfaceDetails(5.5, 2.0);
      ctx.restore();
      break;
    }

    case 'wafer_stick': {
      // Crisp wafer-filled chocolate stick / bar
      ctx.save();
      ctx.rotate(-0.26);
      ctx.fillStyle = makeOuterGrad(-8, -2.6, 8, 2.6);
      ctx.strokeStyle = outerRim;
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.roundRect(-8.0, -2.6, 16.0, 5.2, 1.0);
      ctx.fill();
      ctx.stroke();

      // Diagonal wafer drizzle stripes
      ctx.strokeStyle = outerBright;
      ctx.lineWidth = 0.65;
      for (let wx = -6.0; wx <= 2.5; wx += 2.1) {
        ctx.beginPath();
        ctx.moveTo(wx, -2.4);
        ctx.lineTo(wx + 1.3, 2.4);
        ctx.stroke();
      }

      // Exposed layered wafer cross-section on right tip
      if (hasFilling) {
        drawCrossSectionSlice(6.0, 0, 1.7, 1.9, 0.5);
        ctx.fillStyle = outerColor;
        ctx.fillRect(4.5, -0.45, 3.0, 0.4);
        ctx.fillRect(4.5, 0.45, 3.0, 0.4);
      }
      ctx.restore();
      break;
    }

    case 'truffle_dome': {
      // Plump dome truffle bonbon with cut wedge showing creamy ganache core
      ctx.fillStyle = makeOuterGrad(-5, -5, 5, 5);
      ctx.strokeStyle = outerRim;
      ctx.lineWidth = 0.65;
      ctx.beginPath();
      ctx.arc(0, 0.3, 5.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Top chocolate swirl cap
      ctx.strokeStyle = outerBright;
      ctx.lineWidth = 0.75;
      ctx.beginPath();
      ctx.arc(0, -0.3, 2.8, Math.PI * 0.8, Math.PI * 2.2);
      ctx.stroke();

      if (hasFilling) {
        // Cut truffle core wedge on lower-right
        ctx.fillStyle = innerColor;
        ctx.strokeStyle = outerRim;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(0.4, 0.4);
        ctx.arc(0, 0.3, 4.2, -0.15, Math.PI * 0.58);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      drawSurfaceDetails(4.0, 4.0);
      break;
    }

    case 'praline_heart': {
      // Molded chocolate heart with glossy bevel and split filling half
      ctx.fillStyle = makeOuterGrad(-5.4, -4.6, 5.4, 5.2);
      ctx.strokeStyle = outerRim;
      ctx.lineWidth = 0.65;
      ctx.beginPath();
      ctx.moveTo(0, 5.4);
      ctx.bezierCurveTo(-6.6, 1.4, -6.2, -5.2, -2.6, -5.2);
      ctx.bezierCurveTo(-0.9, -5.2, 0, -3.6, 0, -2.8);
      ctx.bezierCurveTo(0, -3.6, 0.9, -5.2, 2.6, -5.2);
      ctx.bezierCurveTo(6.2, -5.2, 6.6, 1.4, 0, 5.4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      if (hasFilling) {
        ctx.fillStyle = innerColor;
        ctx.beginPath();
        ctx.ellipse(1.6, -0.6, 2.0, 1.6, 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = outerRim;
        ctx.lineWidth = 0.45;
        ctx.stroke();
      }

      ctx.fillStyle = 'rgba(255, 255, 255, 0.36)';
      ctx.beginPath();
      ctx.ellipse(-2.2, -2.4, 1.3, 0.6, -0.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'medallion_coin': {
      // Round embossed chocolate medallion / disc with cut inner reveal
      ctx.fillStyle = makeOuterGrad(-5.4, -5.4, 5.4, 5.4);
      ctx.strokeStyle = outerRim;
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Embossed inner ring
      ctx.strokeStyle = outerBright;
      ctx.lineWidth = 0.65;
      ctx.beginPath();
      ctx.arc(0, 0, 3.8, 0, Math.PI * 2);
      ctx.stroke();

      if (hasFilling) {
        ctx.fillStyle = innerColor;
        ctx.beginPath();
        ctx.arc(1.2, 1.1, 2.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = outerRim;
        ctx.lineWidth = 0.45;
        ctx.stroke();
      }
      drawSurfaceDetails(4.2, 4.2);
      break;
    }

    case 'shell_seashell': {
      // Belgian marbled seashell praline with ribbed fan grooves
      ctx.fillStyle = makeOuterGrad(-5.4, -4.5, 5.4, 4.8);
      ctx.strokeStyle = outerRim;
      ctx.lineWidth = 0.65;
      ctx.beginPath();
      ctx.moveTo(0, 5.0);
      ctx.bezierCurveTo(-5.8, 2.6, -5.8, -4.6, 0, -5.0);
      ctx.bezierCurveTo(5.8, -4.6, 5.8, 2.6, 0, 5.0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Marbled inner chocolate swirl & shell fan ribs
      ctx.strokeStyle = hasFilling ? innerColor : outerBright;
      ctx.lineWidth = 0.7;
      for (const ang of [-0.55, -0.22, 0.15, 0.5]) {
        ctx.beginPath();
        ctx.moveTo(0, 4.0);
        ctx.quadraticCurveTo(Math.sin(ang) * 3.5, 0.2, Math.sin(ang) * 4.4, -3.2);
        ctx.stroke();
      }
      break;
    }

    case 'diamond_bonbon': {
      // Faceted diamond-cut jewel bonbon with center filling window
      ctx.fillStyle = makeOuterGrad(-5.4, -5.4, 5.4, 5.4);
      ctx.strokeStyle = outerRim;
      ctx.lineWidth = 0.65;
      ctx.beginPath();
      ctx.moveTo(0, -5.8);
      ctx.lineTo(5.4, 0);
      ctx.lineTo(0, 5.8);
      ctx.lineTo(-5.4, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Inner faceted crown
      ctx.fillStyle = outerBright;
      ctx.beginPath();
      ctx.moveTo(0, -3.2);
      ctx.lineTo(3.0, 0);
      ctx.lineTo(0, 3.2);
      ctx.lineTo(-3.0, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      if (hasFilling) {
        ctx.fillStyle = innerColor;
        ctx.beginPath();
        ctx.moveTo(0, -1.9);
        ctx.lineTo(1.8, 0);
        ctx.lineTo(0, 1.9);
        ctx.lineTo(-1.8, 0);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }

    case 'break_piece': {
      // Single snapped chocolate cushion block clearly showing outer shell & exposed inner core along broken edge
      ctx.fillStyle = makeOuterGrad(-5.2, -4.6, 5.2, 4.6);
      ctx.strokeStyle = outerRim;
      ctx.lineWidth = 0.65;
      ctx.beginPath();
      ctx.moveTo(-5.0, -4.4);
      ctx.lineTo(4.8, -4.4);
      ctx.lineTo(5.2, 1.6);
      ctx.lineTo(2.4, 4.6);
      ctx.lineTo(-4.8, 4.4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Raised top square bevel
      ctx.fillStyle = outerBright;
      ctx.beginPath();
      ctx.roundRect(-3.6, -3.2, 6.2, 5.2, 0.8);
      ctx.fill();
      ctx.strokeStyle = outerShade;
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Broken front-right cross-section revealing inner filling
      if (hasFilling) {
        drawCrossSectionSlice(1.9, 2.0, 2.2, 1.35, 0.45);
      }
      drawSurfaceDetails(4.0, 3.5);
      break;
    }

    case 'wave_bar': {
      // Sculpted wavy-segmented artisanal bar (like Dubai / layered bars) with exposed inner filling
      ctx.fillStyle = makeOuterGrad(-5.4, -7.2, 5.4, 7.2);
      ctx.strokeStyle = outerRim;
      ctx.lineWidth = 0.65;
      ctx.beginPath();
      ctx.roundRect(-5.4, -7.4, 10.8, 14.8, 1.3);
      ctx.fill();
      ctx.stroke();

      // Wavy molded ridges across the bar
      ctx.strokeStyle = outerBright;
      ctx.lineWidth = 0.8;
      for (const wy of [-4.6, -1.6, 1.4]) {
        ctx.beginPath();
        ctx.moveTo(-4.4, wy);
        ctx.bezierCurveTo(-1.8, wy - 1.1, 1.8, wy + 1.1, 4.4, wy);
        ctx.stroke();
      }

      // Snapped lower section exposing thick lush inner filling (e.g. pistachio kataifi!)
      if (hasFilling) {
        drawCrossSectionSlice(0, 4.3, 4.3, 2.1, 0.7);
      }
      drawSurfaceDetails(4.2, 5.5);
      break;
    }

    case 'classic_bar':
    default: {
      // Classic 2x4 molded rectangle chocolate bar with snapped corner showing inner material/color
      ctx.fillStyle = makeOuterGrad(-5.4, -7.4, 5.4, 7.4);
      ctx.strokeStyle = outerRim;
      ctx.lineWidth = 0.65;
      ctx.beginPath();
      ctx.roundRect(-5.4, -7.5, 10.8, 15.0, 0.9);
      ctx.fill();
      ctx.stroke();

      // 2 cols x 4 rows beveled chocolate squares (skip bottom-right square if filled to show break cross-section)
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 2; c++) {
          if (r === 3 && c === 1 && hasFilling) continue;
          const sx = -4.5 + c * 4.7;
          const sy = -6.6 + r * 3.45;
          ctx.fillStyle = outerBright;
          ctx.fillRect(sx, sy, 4.1, 2.9);
          ctx.fillStyle = outerColor;
          ctx.fillRect(sx + 0.45, sy + 0.4, 3.2, 2.1);
          ctx.fillStyle = outerShade;
          ctx.fillRect(sx + 0.45, sy + 2.2, 3.2, 0.3);
        }
      }

      if (hasFilling) {
        drawCrossSectionSlice(2.3, 5.15, 2.1, 1.45, 0.45);
      }
      drawSurfaceDetails(4.2, 5.8);
      break;
    }
  }

  // Crisp glossy cocoa-butter highlight
  ctx.fillStyle = 'rgba(255, 255, 255, 0.24)';
  ctx.beginPath();
  ctx.ellipse(-2.0, -3.0, 1.6, 0.55, -0.35, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

