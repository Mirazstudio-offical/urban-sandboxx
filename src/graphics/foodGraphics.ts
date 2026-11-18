// Procedural 2D Canvas Models for Food Items (Photorealistic 2.5D Studio Textures)
import {
  drawShadow,
  drawLitSphere,
  drawLitEllipse,
  drawBotanicalLeaf,
  drawMetalCanLid,
  drawOrganicBlobPath,
  drawCrimpedSeal,
  drawPouchCrinkles,
  drawStudioLabelPanel,
  drawFilmWindow,
  drawMicroBarcode,
  applyCylinderLightingOverlay,
  adjustHex,
  hash01
} from './itemGraphicShared';
import { GummyCandyShape, PelmenShape, PelmenSize, PelmenState, ChocolateShape, ChocolateSize } from '../types';

export function drawFoodItem(ctx: CanvasRenderingContext2D, itemId: string, item?: any): boolean {
  switch (itemId) {
    case 'apple': {
      drawShadow(ctx, 6.6, 2.6, 7.6, 0.25);

      // Asymmetric realistic apple silhouette (wider upper shoulders, slight base taper, dimple top & bottom)
      const drawApplePath = () => {
        ctx.beginPath();
        ctx.moveTo(0, -4.2);
        ctx.bezierCurveTo(2.4, -5.8, 7.0, -4.4, 6.8, 0.4);
        ctx.bezierCurveTo(6.6, 4.4, 3.4, 7.1, 1.1, 6.7);
        ctx.quadraticCurveTo(0, 6.2, -1.1, 6.7);
        ctx.bezierCurveTo(-3.4, 7.1, -6.6, 4.4, -6.8, 0.4);
        ctx.bezierCurveTo(-7.0, -4.4, -2.4, -5.8, 0, -4.2);
        ctx.closePath();
      };

      const appleGrad = ctx.createRadialGradient(-2.4, -1.8, 0.6, 0.4, 1.0, 8.2);
      appleGrad.addColorStop(0.0, '#fca5a5');
      appleGrad.addColorStop(0.24, '#ef4444');
      appleGrad.addColorStop(0.65, '#b91c1c');
      appleGrad.addColorStop(0.92, '#7f1d1d');
      appleGrad.addColorStop(1.0, '#991b1b');
      ctx.fillStyle = appleGrad;
      drawApplePath();
      ctx.fill();

      ctx.save();
      drawApplePath();
      ctx.clip();

      // Sun-kissed golden-amber blush on top-left shoulder
      const blushGrad = ctx.createRadialGradient(-3.6, -2.8, 0.3, -3.2, -2.2, 4.2);
      blushGrad.addColorStop(0, 'rgba(254, 240, 138, 0.48)');
      blushGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
      ctx.fillStyle = blushGrad;
      ctx.fillRect(-7.5, -6, 9, 8);

      // Natural fine skin lenticel speckles
      ctx.fillStyle = 'rgba(254, 243, 199, 0.42)';
      for (let i = 0; i < 16; i++) {
        const lx = (hash01('apple', i * 2) - 0.5) * 10.6;
        const ly = -3.4 + hash01('apple', i * 2 + 1) * 8.6;
        ctx.beginPath();
        ctx.arc(lx, ly, 0.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Stem cavity depression shadow + russeting
      const dimpGrad = ctx.createRadialGradient(0, -4.2, 0.2, 0, -4.2, 2.8);
      dimpGrad.addColorStop(0, '#450a0a');
      dimpGrad.addColorStop(0.5, '#78350f');
      dimpGrad.addColorStop(1, 'rgba(120, 53, 15, 0)');
      ctx.fillStyle = dimpGrad;
      ctx.beginPath();
      ctx.ellipse(0, -4.1, 2.6, 1.3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Crisp curved glossy skin specular highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.52)';
      ctx.beginPath();
      ctx.ellipse(-2.9, -1.6, 1.25, 2.6, -0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.beginPath();
      ctx.ellipse(3.8, 2.4, 0.9, 1.8, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Tapered woody stem
      const stemGrad = ctx.createLinearGradient(-0.5, -4, 1.5, -9);
      stemGrad.addColorStop(0, '#451a03');
      stemGrad.addColorStop(1, '#92400e');
      ctx.strokeStyle = stemGrad;
      ctx.lineWidth = 1.45;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, -4.0);
      ctx.quadraticCurveTo(0.9, -6.5, 0.4, -8.8);
      ctx.stroke();

      // Detailed botanical apple leaf
      drawBotanicalLeaf(ctx, 0.6, -6.9, 5.2, 1.9, -0.22, '#65a30d', '#14532d');
      return true;
    }

    case 'chips': {
      drawShadow(ctx, 7.2, 2.7, 7.8, 0.25);

      // Puffed BOPP metallic snack pillow bag
      const traceBag = () => {
        ctx.beginPath();
        ctx.moveTo(-6.5, -7.2);
        ctx.lineTo(6.5, -7.2);
        ctx.bezierCurveTo(7.4, -2.2, 7.4, 2.4, 6.4, 6.8);
        ctx.lineTo(-6.4, 6.8);
        ctx.bezierCurveTo(-7.4, 2.4, -7.4, -2.2, -6.5, -7.2);
        ctx.closePath();
      };

      const bagGrad = ctx.createLinearGradient(-7.2, -7.5, 7.2, 7.5);
      bagGrad.addColorStop(0.0, '#eab308');
      bagGrad.addColorStop(0.24, '#fef08a');
      bagGrad.addColorStop(0.55, '#ca8a04');
      bagGrad.addColorStop(0.86, '#a16207');
      bagGrad.addColorStop(1.0, '#713f12');
      ctx.fillStyle = bagGrad;
      traceBag();
      ctx.fill();

      ctx.save();
      traceBag();
      ctx.clip();

      // Angled deep crimson foil ribbon banner
      const banGrad = ctx.createLinearGradient(-7.4, -4.5, 7.4, 2.2);
      banGrad.addColorStop(0.0, '#7f1d1d');
      banGrad.addColorStop(0.32, '#dc2626');
      banGrad.addColorStop(0.68, '#b91c1c');
      banGrad.addColorStop(1.0, '#450a0a');
      ctx.fillStyle = banGrad;
      ctx.beginPath();
      ctx.moveTo(-7.5, -3.2);
      ctx.lineTo(7.5, -5.0);
      ctx.lineTo(7.5, -0.2);
      ctx.lineTo(-7.5, 1.6);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 0.3;
      ctx.stroke();

      // Editorial white brand rules on crimson banner
      ctx.fillStyle = 'rgba(255, 251, 235, 0.9)';
      ctx.fillRect(-3.6, -2.5, 7.2, 0.52);
      ctx.fillStyle = 'rgba(254, 240, 138, 0.72)';
      ctx.fillRect(-2.4, -1.5, 4.8, 0.3);

      // Realistic saddle-curved ruffled potato chip render
      ctx.save();
      ctx.translate(0.2, 1.7);
      ctx.rotate(-0.14);
      drawLitEllipse(ctx, 0, 0, 3.8, 2.25, 0, '#fef9c3', '#facc15', '#b45309', '#92400e', 0.35);
      ctx.strokeStyle = 'rgba(146, 64, 14, 0.42)';
      ctx.lineWidth = 0.3;
      for (let rx = -2.4; rx <= 2.4; rx += 0.95) {
        ctx.beginPath();
        ctx.moveTo(rx, -1.65);
        ctx.quadraticCurveTo(rx + 0.15, 0, rx, 1.65);
        ctx.stroke();
      }
      // Sea salt crystal flecks & browned blister edge
      ctx.fillStyle = 'rgba(120, 53, 15, 0.45)';
      ctx.beginPath();
      ctx.arc(2.4, -0.6, 0.42, 0, Math.PI * 2);
      ctx.arc(-2.5, 0.7, 0.38, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Fine corner micro-barcode + spec mark
      drawMicroBarcode(ctx, 2.2, 4.5, 3.4, 1.15, 'rgba(69, 26, 3, 0.85)', 'rgba(254, 249, 195, 0.85)');

      // Crinkled puffed foil specular streaks + softbox fold highlight
      drawPouchCrinkles(ctx, -6.5, -6.5, 13, 12.5, 19, 0.24);
      applyCylinderLightingOverlay(ctx, -7.2, -7.2, 14.4, 14.0, 0.32, 0.28);
      ctx.restore();

      // Heat-crimped top & bottom metallic seals
      drawCrimpedSeal(ctx, -6.6, -8.1, 13.2, 1.35, '#ca8a04', true, 0.85);
      drawCrimpedSeal(ctx, -6.5, 6.4, 13.0, 1.35, '#a16207', true, 0.85);

      ctx.strokeStyle = 'rgba(69, 26, 3, 0.42)';
      ctx.lineWidth = 0.28;
      traceBag();
      ctx.stroke();
      return true;
    }

    case 'canned_meat': {
      drawShadow(ctx, 7.2, 2.8, 7.8, 0.26);

      // Brushed stainless steel cylinder with rolled double-seamed base chime
      const cylGrad = ctx.createLinearGradient(-6.5, 0, 6.5, 0);
      cylGrad.addColorStop(0.0, '#475569');
      cylGrad.addColorStop(0.24, '#f1f5f9');
      cylGrad.addColorStop(0.52, '#94a3b8');
      cylGrad.addColorStop(0.84, '#334155');
      cylGrad.addColorStop(1.0, '#64748b');
      ctx.fillStyle = cylGrad;
      ctx.beginPath();
      ctx.moveTo(-6.5, -5.2);
      ctx.lineTo(6.5, -5.2);
      ctx.lineTo(6.5, 5.8);
      ctx.ellipse(0, 5.8, 6.5, 2.2, 0, 0, Math.PI);
      ctx.closePath();
      ctx.fill();

      // Wrapped crimson & heritage cream label with cylindrical lighting & barcode
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(-6.45, -2.9);
      ctx.ellipse(0, -2.9, 6.45, 1.4, 0, Math.PI, 0, true);
      ctx.lineTo(6.45, 4.4);
      ctx.ellipse(0, 4.4, 6.45, 1.8, 0, 0, Math.PI);
      ctx.closePath();
      ctx.clip();

      drawStudioLabelPanel(ctx, -6.5, -4.4, 13.0, 10.6, {
        paperColor: '#f8f3e6',
        bandColor: '#7f1d1d',
        accentColor: '#ca8a04',
        inkColor: '#450a0a',
        goldFoil: true,
        hasBarcode: true,
        emblem: 'none',
        cylindrical: false
      });

      // Gold ribbon & embossed heritage crest seal
      ctx.fillStyle = '#eab308';
      ctx.fillRect(-6.5, -0.35, 13.0, 1.5);
      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(-6.5, 0.25, 13.0, 0.3);
      drawLitSphere(ctx, 0, 0.4, 1.45, '#fef9c3', '#eab308', '#92400e', '#78350f', 0.55);
      applyCylinderLightingOverlay(ctx, -6.5, -4.5, 13.0, 10.8, 0.28, 0.36);
      ctx.restore();

      // Expansion beads + rolled steel bottom rim
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.38)';
      ctx.lineWidth = 0.42;
      ctx.beginPath();
      ctx.ellipse(0, 5.1, 6.4, 1.85, 0, 0.08, Math.PI - 0.08);
      ctx.stroke();

      drawMetalCanLid(ctx, 0, -5.2, 6.5, 2.2, true);
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
      drawShadow(ctx, 8.6, 3.1, 7.6, 0.25);

      const bowlDark = itemId.includes('fish')
        ? '#0369a1'
        : itemId.includes('beef')
        ? '#450a0a'
        : itemId.includes('mushroom')
        ? '#451a03'
        : '#7f1d1d';
      const bowlMid = itemId.includes('fish')
        ? '#0284c7'
        : itemId.includes('beef')
        ? '#7f1d1d'
        : itemId.includes('mushroom')
        ? '#78350f'
        : '#9f1239';
      const bowlRim = itemId.includes('fish') ? '#bae6fd' : '#fecdd3';

      // Glazed stoneware ceramic bowl lower contour
      const bodyGrad = ctx.createLinearGradient(-8.5, -2, 8.5, 6);
      bodyGrad.addColorStop(0.0, adjustHex(bowlMid, 0.12));
      bodyGrad.addColorStop(0.35, bowlMid);
      bodyGrad.addColorStop(0.85, bowlDark);
      bodyGrad.addColorStop(1.0, '#0f172a');
      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.moveTo(-8.5, -2.6);
      ctx.bezierCurveTo(-8.4, 3.6, -4.6, 6.6, 0, 6.6);
      ctx.bezierCurveTo(4.6, 6.6, 8.4, 3.6, 8.5, -2.6);
      ctx.closePath();
      ctx.fill();

      // Glazed ceramic outer specular highlight strip
      ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.beginPath();
      ctx.ellipse(-4.8, 1.8, 1.1, 2.4, -0.35, 0, Math.PI * 2);
      ctx.fill();

      // Turned ceramic top rim + recessed interior shadow ring
      ctx.fillStyle = bowlRim;
      ctx.beginPath();
      ctx.ellipse(0, -2.6, 8.5, 3.2, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = bowlDark;
      ctx.beginPath();
      ctx.ellipse(0, -2.4, 7.6, 2.65, 0, 0, Math.PI * 2);
      ctx.fill();

      // Simmering rich broth pool
      let bLight = '#fde047';
      let bMid = '#eab308';
      let bDeep = '#a16207';
      if (itemId.includes('beef')) { bLight = '#d97706'; bMid = '#92400e'; bDeep = '#451a03'; }
      else if (itemId.includes('mushroom')) { bLight = '#a16207'; bMid = '#713f12'; bDeep = '#271204'; }
      else if (itemId.includes('fish')) { bLight = '#fef9c3'; bMid = '#fde68a'; bDeep = '#ca8a04'; }

      const brothGrad = ctx.createRadialGradient(-1.8, -2.6, 0.4, 0, -2.1, 7.4);
      brothGrad.addColorStop(0.0, bLight);
      brothGrad.addColorStop(0.65, bMid);
      brothGrad.addColorStop(1.0, bDeep);
      ctx.fillStyle = brothGrad;
      ctx.beginPath();
      ctx.ellipse(0, -2.1, 7.35, 2.35, 0, 0, Math.PI * 2);
      ctx.fill();

      // Glistening floating lipid oil droplets
      for (const [ox, oy, or] of [[-4.2, -2.2, 0.55], [2.0, -1.6, 0.48], [-1.0, -2.9, 0.42], [4.0, -2.4, 0.45]]) {
        ctx.strokeStyle = 'rgba(254, 249, 195, 0.72)';
        ctx.lineWidth = 0.32;
        ctx.beginPath();
        ctx.ellipse(ox, oy, or, or * 0.5, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Tender carrot medallions & herb garnish
      drawLitEllipse(ctx, -2.6, -2.1, 1.15, 0.65, 0.25, '#fdba74', '#ea580c', '#9a3412', undefined, 0.4);
      drawLitEllipse(ctx, 2.8, -1.9, 1.1, 0.6, -0.3, '#fdba74', '#ea580c', '#9a3412', undefined, 0.4);
      ctx.fillStyle = '#15803d';
      for (const [hx, hy] of [[-0.8, -2.4], [0.8, -1.8], [-3.8, -1.7], [1.4, -2.9], [-1.8, -1.4]]) {
        ctx.beginPath();
        ctx.arc(hx, hy, 0.38, 0, Math.PI * 2);
        ctx.fill();
      }

      // Delicate rising steam wisps
      ctx.strokeStyle = 'rgba(248, 250, 252, 0.45)';
      ctx.lineWidth = 0.7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-2.4, -4.6); ctx.quadraticCurveTo(-3.6, -7.2, -1.8, -9.8);
      ctx.moveTo(2.0, -4.6); ctx.quadraticCurveTo(3.4, -7.2, 1.6, -9.8);
      ctx.stroke();
      return true;
    }

    case 'banana': {
      drawShadow(ctx, 7.6, 2.4, 7.2, 0.22);

      // Sculpted curved Cavendish banana silhouette with 5 longitudinal facet planes
      const banGrad = ctx.createLinearGradient(-8, -3, 8, 6);
      banGrad.addColorStop(0.0, '#ca8a04');
      banGrad.addColorStop(0.28, '#fde047');
      banGrad.addColorStop(0.62, '#facc15');
      banGrad.addColorStop(1.0, '#a16207');
      ctx.fillStyle = banGrad;
      ctx.beginPath();
      ctx.moveTo(-7.6, 1.2);
      ctx.bezierCurveTo(-3.6, 5.2, 3.2, 5.4, 7.4, 0.8);
      ctx.quadraticCurveTo(8.2, 1.8, 7.8, 2.8);
      ctx.bezierCurveTo(3.2, 7.2, -3.8, 7.2, -7.6, 2.8);
      ctx.closePath();
      ctx.fill();

      // Upper sunny facet highlight ridge
      ctx.strokeStyle = '#fef9c3';
      ctx.lineWidth = 1.25;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-6.2, 2.2);
      ctx.bezierCurveTo(-2.4, 5.3, 2.4, 5.4, 6.2, 2.0);
      ctx.stroke();

      // Subtle sugar-spot freckles
      ctx.fillStyle = 'rgba(120, 53, 15, 0.42)';
      for (const [fx, fy] of [[-2.0, 4.6], [1.4, 4.8], [3.5, 3.6], [-4.2, 3.4]]) {
        ctx.beginPath();
        ctx.arc(fx, fy, 0.25, 0, Math.PI * 2);
        ctx.fill();
      }

      // Fibrous green-ochre stem pedicel & dark brown blossom tip
      ctx.fillStyle = '#65a30d';
      ctx.beginPath();
      ctx.roundRect(-8.4, 0.6, 1.6, 1.6, 0.4);
      ctx.fill();
      ctx.fillStyle = '#451a03';
      ctx.fillRect(-8.6, 0.7, 0.7, 1.3);
      ctx.beginPath();
      ctx.arc(7.6, 1.6, 0.65, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    case 'bread_loaf': {
      drawShadow(ctx, 9.2, 3.2, 7.6, 0.25);

      // Crusty artisanal baton loaf base & Maillard browned crust
      const drawLoaf = () => {
        ctx.beginPath();
        ctx.moveTo(-9.2, 0.6);
        ctx.bezierCurveTo(-9.0, -4.4, -3.5, -5.6, 0, -5.4);
        ctx.bezierCurveTo(3.5, -5.6, 9.0, -4.4, 9.2, 0.6);
        ctx.bezierCurveTo(9.0, 4.6, 4.0, 5.4, 0, 5.2);
        ctx.bezierCurveTo(-4.0, 5.4, -9.0, 4.6, -9.2, 0.6);
        ctx.closePath();
      };

      const crustGrad = ctx.createRadialGradient(-2.0, -2.2, 0.8, 0, 0.4, 9.6);
      crustGrad.addColorStop(0.0, '#fbbf24');
      crustGrad.addColorStop(0.45, '#d97706');
      crustGrad.addColorStop(0.85, '#92400e');
      crustGrad.addColorStop(1.0, '#451a03');
      ctx.fillStyle = crustGrad;
      drawLoaf();
      ctx.fill();

      ctx.save();
      drawLoaf();
      ctx.clip();

      // Oven expansion score ears (golden toasted lip + pale airy crumb groove)
      for (const sx of [-4.6, -0.4, 3.8]) {
        ctx.fillStyle = '#78350f';
        ctx.beginPath();
        ctx.ellipse(sx + 0.35, -1.6, 2.2, 0.9, 0.85, 0, Math.PI * 2);
        ctx.fill();

        const crumbGrad = ctx.createLinearGradient(sx - 1.5, -3, sx + 1.5, 0);
        crumbGrad.addColorStop(0, '#fffbeb');
        crumbGrad.addColorStop(0.6, '#fde68a');
        crumbGrad.addColorStop(1, '#d97706');
        ctx.fillStyle = crumbGrad;
        ctx.beginPath();
        ctx.ellipse(sx, -1.8, 1.95, 0.72, 0.85, 0, Math.PI * 2);
        ctx.fill();
      }

      // Subtle artisanal flour dusting along top dome
      ctx.fillStyle = 'rgba(255, 251, 235, 0.32)';
      for (let i = 0; i < 14; i++) {
        const fx = -6.4 + hash01('bread', i * 2) * 12.8;
        const fy = -3.8 + hash01('bread', i * 2 + 1) * 3.8;
        ctx.beginPath();
        ctx.arc(fx, fy, 0.42, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      return true;
    }

    case 'cookies':
    case 'cookie_pack': {
      drawShadow(ctx, 7.8, 2.9, 7.6, 0.25);

      // Glossy royal-blue BOPP flow-wrap biscuit sleeve
      const traceWrap = () => {
        ctx.beginPath();
        ctx.roundRect(-6.6, -5.6, 13.2, 11.2, 1.4);
      };
      const packGrad = ctx.createLinearGradient(-6.8, -5.6, 6.8, 5.6);
      packGrad.addColorStop(0.0, '#0369a1');
      packGrad.addColorStop(0.28, '#38bdf8');
      packGrad.addColorStop(0.55, '#0284c7');
      packGrad.addColorStop(0.85, '#1e3a8a');
      packGrad.addColorStop(1.0, '#0f172a');
      ctx.fillStyle = packGrad;
      traceWrap();
      ctx.fill();

      // Crimped side flow-wrap fins
      drawCrimpedSeal(ctx, -7.8, -5.3, 1.35, 10.6, '#0369a1', false, 0.85);
      drawCrimpedSeal(ctx, 6.45, -5.3, 1.35, 10.6, '#0369a1', false, 0.85);

      // Die-cut clear polypropylene viewing window revealing chocolate-chip biscuit
      drawFilmWindow(
        ctx,
        () => {
          ctx.beginPath();
          ctx.arc(-0.4, -0.6, 3.85, 0, Math.PI * 2);
        },
        () => {
          drawLitSphere(ctx, -0.4, -0.6, 3.35, '#fde68a', '#d97706', '#78350f', undefined, 0.18);
          ctx.fillStyle = '#291206';
          for (const [cx, cy] of [[-1.6, -1.7], [0.9, -1.2], [-0.7, 0.8], [1.1, 0.6], [-2.0, 0.2]]) {
            ctx.beginPath();
            ctx.arc(cx, cy, 0.56, 0, Math.PI * 2);
            ctx.fill();
          }
        },
        'rgba(255, 255, 255, 0.72)',
        '#082f49'
      );

      // Editorial cream & gold label ribbon + micro-barcode
      ctx.fillStyle = '#f8f5ec';
      ctx.beginPath();
      ctx.roundRect(-5.4, 2.5, 10.8, 2.5, 0.4);
      ctx.fill();
      ctx.fillStyle = '#ca8a04';
      ctx.fillRect(-5.4, 2.5, 10.8, 0.42);
      ctx.fillStyle = '#0c4a6e';
      ctx.fillRect(-4.6, 3.45, 5.2, 0.52);
      ctx.fillStyle = 'rgba(12, 74, 110, 0.45)';
      ctx.fillRect(-4.6, 4.25, 3.8, 0.3);
      drawMicroBarcode(ctx, 1.8, 3.25, 2.9, 1.15);

      drawPouchCrinkles(ctx, -6.2, -5.2, 12.4, 10.4, 33, 0.2);
      return true;
    }

    case 'cookie_single':
    case 'cookie_choco_single': {
      const isMini = itemId === 'cookie_choco_single';
      const sc = isMini ? 0.82 : 1.0;
      drawShadow(ctx, 7.0 * sc, 2.8 * sc, 7.2 * sc, 0.25);

      ctx.save();
      ctx.scale(sc, sc);

      // Organic rustic cracked-edge cookie disc (never a sterile circle)
      const drawCookie = () => drawOrganicBlobPath(ctx, 0, 0, 6.2, 5.9, 412, 0.08, 12);

      // Baked side rim shadow
      ctx.fillStyle = '#78350f';
      ctx.save();
      ctx.translate(0.15, 0.65);
      drawCookie();
      ctx.fill();
      ctx.restore();

      const cGrad = ctx.createRadialGradient(-1.5, -1.5, 0.6, 0, 0, 6.4);
      cGrad.addColorStop(0.0, '#fef08a');
      cGrad.addColorStop(0.42, '#d97706');
      cGrad.addColorStop(0.86, '#92400e');
      cGrad.addColorStop(1.0, '#78350f');
      ctx.fillStyle = cGrad;
      drawCookie();
      ctx.fill();

      // Delicate browned oven crack fissures
      ctx.strokeStyle = 'rgba(69, 26, 3, 0.55)';
      ctx.lineWidth = 0.55;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-3.4, -1.8); ctx.lineTo(-1.0, -0.2); ctx.lineTo(-2.2, 2.6);
      ctx.moveTo(1.2, -3.2); ctx.lineTo(1.8, -0.6); ctx.lineTo(3.8, 0.8);
      ctx.moveTo(-0.4, 1.4); ctx.lineTo(1.2, 3.4);
      ctx.stroke();

      // Sculpted melted dark chocolate chunks with cocoa highlights
      const chips: Array<[number, number, number]> = [
        [-2.2, -1.9, 1.35],
        [1.9, -2.0, 1.45],
        [-1.3, 1.8, 1.4],
        [2.4, 1.5, 1.25],
        [0.2, -0.2, 1.15],
        [-3.9, 0.6, 0.95]
      ];
      for (const [cx, cy, r] of chips) {
        drawLitSphere(ctx, cx, cy, r, '#78350f', '#291206', '#09090b', undefined, 0.68);
      }

      // Flaky finishing sea salt crystals
      ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
      ctx.fillRect(-1.5, -3.4, 0.55, 0.45);
      ctx.fillRect(2.8, -0.6, 0.55, 0.45);
      ctx.fillRect(0.6, 2.8, 0.55, 0.45);
      ctx.restore();
      return true;
    }

    case 'popcorn_caramel': {
      drawShadow(ctx, 7.2, 2.9, 7.8, 0.25);

      // Tapered cinema tub with curved cylindrical stripe shading
      const drawTub = () => {
        ctx.beginPath();
        ctx.moveTo(-6.6, -2.2);
        ctx.lineTo(6.6, -2.2);
        ctx.lineTo(5.0, 7.5);
        ctx.quadraticCurveTo(0, 8.2, -5.0, 7.5);
        ctx.closePath();
      };
      const tubGrad = ctx.createLinearGradient(-6.6, 0, 6.6, 0);
      tubGrad.addColorStop(0.0, '#7f1d1d');
      tubGrad.addColorStop(0.28, '#ef4444');
      tubGrad.addColorStop(0.65, '#b91c1c');
      tubGrad.addColorStop(1.0, '#450a0a');
      ctx.fillStyle = tubGrad;
      drawTub();
      ctx.fill();

      ctx.save();
      drawTub();
      ctx.clip();
      ctx.fillStyle = '#f8f5ec';
      ctx.fillRect(-4.3, -2.2, 1.85, 10.2);
      ctx.fillRect(-0.85, -2.2, 1.85, 10.2);
      ctx.fillRect(2.65, -2.2, 1.85, 10.2);

      // Editorial gold-rimmed cinema crest badge on front
      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath();
      ctx.roundRect(-3.6, 0.8, 7.2, 4.4, 0.6);
      ctx.fill();
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 0.35;
      ctx.stroke();
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(-2.4, 2.2, 4.8, 0.65);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(-1.6, 3.35, 3.2, 0.45);

      applyCylinderLightingOverlay(ctx, -6.6, -2.2, 13.2, 10.4, 0.26, 0.32);
      ctx.restore();

      // Gold rolled rim collar lip
      const rimGrad = ctx.createLinearGradient(-6.6, -2.2, 6.6, -2.2);
      rimGrad.addColorStop(0.0, '#92400e');
      rimGrad.addColorStop(0.3, '#fef08a');
      rimGrad.addColorStop(0.7, '#d97706');
      rimGrad.addColorStop(1.0, '#78350f');
      ctx.fillStyle = rimGrad;
      ctx.beginPath();
      ctx.ellipse(0, -2.2, 6.7, 1.95, 0, 0, Math.PI * 2);
      ctx.fill();

      // Overflowing mound of organic caramel-glazed butterfly popcorn kernels
      const kernels: Array<[number, number, number, boolean]> = [
        [-4.0, -3.5, 1.85, false], [-1.6, -4.4, 2.0, true], [1.4, -4.2, 2.0, false], [4.0, -3.4, 1.8, true],
        [-2.8, -5.8, 1.85, true], [0.0, -6.4, 2.1, false], [2.8, -5.6, 1.85, false],
        [-0.6, -3.0, 1.75, true], [2.2, -2.9, 1.7, true], [-3.0, -2.6, 1.65, false]
      ];
      for (const [kx, ky, kr, caramel] of kernels) {
        drawPopcornKernel(ctx, kx, ky, kr, caramel);
      }
      return true;
    }

    case 'nachos': {
      drawShadow(ctx, 8.6, 3.3, 7.6, 0.26);

      // Fluted kraft cardboard nachos boat with greaseproof paper rim & folded corners
      const trayGrad = ctx.createLinearGradient(-8.8, 0, 8.8, 5);
      trayGrad.addColorStop(0.0, '#92400e');
      trayGrad.addColorStop(0.35, '#d97706');
      trayGrad.addColorStop(0.75, '#b45309');
      trayGrad.addColorStop(1.0, '#451a03');
      ctx.fillStyle = trayGrad;
      ctx.beginPath();
      ctx.ellipse(0, 2.5, 8.8, 4.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 0.35;
      ctx.stroke();

      // Folded boat corner pleats
      ctx.strokeStyle = 'rgba(69, 26, 3, 0.55)';
      ctx.lineWidth = 0.4;
      ctx.beginPath();
      ctx.moveTo(-7.6, 1.6); ctx.lineTo(-6.2, 4.4);
      ctx.moveTo(7.6, 1.6); ctx.lineTo(6.2, 4.4);
      ctx.stroke();

      // Deep shaded interior basin lined with cream kraft parchment
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.ellipse(0, 1.7, 7.9, 3.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(254, 243, 199, 0.35)';
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Crisp toasted triangular tortilla chips layered inside
      const drawTortilla = (pts: [number, number, number, number, number, number], light: string, dark: string) => {
        const g = ctx.createLinearGradient(pts[0], pts[1], pts[4], pts[5]);
        g.addColorStop(0, light);
        g.addColorStop(1, dark);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(pts[0], pts[1]);
        ctx.lineTo(pts[2], pts[3]);
        ctx.lineTo(pts[4], pts[5]);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#92400e';
        ctx.lineWidth = 0.4;
        ctx.stroke();

        // Blistered corn specks
        ctx.fillStyle = 'rgba(120, 53, 15, 0.45)';
        ctx.beginPath();
        ctx.arc((pts[0] + pts[2] + pts[4]) / 3, (pts[1] + pts[3] + pts[5]) / 3, 0.35, 0, Math.PI * 2);
        ctx.fill();
      };

      drawTortilla([-6.8, 2.0, -3.0, -4.8, -0.4, 2.8], '#fef08a', '#ca8a04');
      drawTortilla([1.2, 3.0, 3.8, -5.2, 7.4, 2.0], '#fde047', '#b45309');
      drawTortilla([-3.4, 1.4, 0.6, -6.0, 4.2, 1.2], '#fef9c3', '#eab308');

      // Central ramekin bowl of velvety molten cheddar-nacho cheese + jalapeno ring
      drawLitSphere(ctx, 0, 1.4, 3.1, '#475569', '#1e293b', '#020617', undefined, 0.25);
      drawLitEllipse(ctx, 0, 1.2, 2.55, 2.25, 0, '#fdba74', '#f97316', '#c2410c', undefined, 0.65);

      ctx.strokeStyle = '#15803d';
      ctx.lineWidth = 0.85;
      ctx.beginPath();
      ctx.arc(0.2, 1.1, 0.9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(0.0, 0.9, 0.4, 0.4);
      return true;
    }

    case 'canned_fish':
    case 'fish_preserves': {
      drawShadow(ctx, 7.6, 2.7, 7.8, 0.26);

      // Gold-lacquered Baltic Sprats oval tin can
      const wallGrad = ctx.createLinearGradient(-7.6, 0, 7.6, 0);
      wallGrad.addColorStop(0.0, '#78350f');
      wallGrad.addColorStop(0.25, '#fbbf24');
      wallGrad.addColorStop(0.55, '#b45309');
      wallGrad.addColorStop(0.85, '#78350f');
      wallGrad.addColorStop(1.0, '#451a03');
      ctx.fillStyle = wallGrad;
      ctx.beginPath();
      ctx.moveTo(-7.6, -3.2);
      ctx.lineTo(7.6, -3.2);
      ctx.lineTo(7.6, 1.2);
      ctx.ellipse(0, 1.2, 7.6, 3.8, 0, 0, Math.PI);
      ctx.closePath();
      ctx.fill();

      // Rolled bottom tin seam chime
      ctx.strokeStyle = 'rgba(254, 240, 138, 0.42)';
      ctx.lineWidth = 0.45;
      ctx.beginPath();
      ctx.ellipse(0, 1.2, 7.6, 3.8, 0, 0.08, Math.PI - 0.08);
      ctx.stroke();

      drawMetalCanLid(ctx, 0, -3.2, 7.6, 3.8, true);

      // Gold-lacquered top glaze & obsidian-gold Baltic sprats lithograph
      ctx.fillStyle = 'rgba(217, 119, 6, 0.34)';
      ctx.beginPath();
      ctx.ellipse(0, -3.2, 6.8, 3.2, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(0, -3.2, 5.2, 2.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 0.42;
      ctx.stroke();

      // Inner fine filigree border & smoked golden sprat silhouette
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.42)';
      ctx.lineWidth = 0.2;
      ctx.beginPath();
      ctx.ellipse(0, -3.2, 4.4, 1.95, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.ellipse(-0.6, -3.2, 2.35, 0.78, 0.06, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(1.6, -3.2); ctx.lineTo(2.9, -4.0); ctx.lineTo(2.9, -2.4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(-2.1, -3.35, 0.24, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    case 'canned_stew':
    case 'stew_meat': {
      drawShadow(ctx, 7.0, 2.7, 7.8, 0.26);

      // Brushed ribbed cylindrical steel preservation tin
      const cylGrad = ctx.createLinearGradient(-5.6, 0, 5.6, 0);
      cylGrad.addColorStop(0.0, '#475569');
      cylGrad.addColorStop(0.28, '#f1f5f9');
      cylGrad.addColorStop(0.65, '#94a3b8');
      cylGrad.addColorStop(1.0, '#334155');
      ctx.fillStyle = cylGrad;
      ctx.beginPath();
      ctx.moveTo(-5.6, -5.2);
      ctx.lineTo(5.6, -5.2);
      ctx.lineTo(5.6, 5.8);
      ctx.ellipse(0, 5.8, 5.6, 1.9, 0, 0, Math.PI);
      ctx.closePath();
      ctx.fill();

      // Heritage crimson & parchment studio label with micro-barcode
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(-5.55, -2.9);
      ctx.ellipse(0, -2.9, 5.55, 1.3, 0, Math.PI, 0, true);
      ctx.lineTo(5.55, 4.3);
      ctx.ellipse(0, 4.3, 5.55, 1.5, 0, 0, Math.PI);
      ctx.closePath();
      ctx.clip();

      drawStudioLabelPanel(ctx, -5.6, -4.2, 11.2, 10.0, {
        paperColor: '#fef3c7',
        bandColor: '#991b1b',
        accentColor: '#ca8a04',
        inkColor: '#450a0a',
        goldFoil: true,
        hasBarcode: true,
        emblem: 'none',
        cylindrical: false
      });

      // Bull medallion + gold medal seal
      drawLitSphere(ctx, -0.8, 0.9, 1.25, '#991b1b', '#7f1d1d', '#450a0a', undefined, 0.22);
      ctx.strokeStyle = '#7f1d1d';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(-1.8, 0.1); ctx.lineTo(-2.35, -0.65);
      ctx.moveTo(0.2, 0.1); ctx.lineTo(0.75, -0.65);
      ctx.stroke();
      drawLitSphere(ctx, 2.7, 0.8, 0.85, '#fef08a', '#f59e0b', '#92400e', undefined, 0.6);

      applyCylinderLightingOverlay(ctx, -5.6, -4.3, 11.2, 10.2, 0.28, 0.35);
      ctx.restore();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.38)';
      ctx.lineWidth = 0.4;
      ctx.beginPath();
      ctx.ellipse(0, 5.1, 5.55, 1.75, 0, 0.08, Math.PI - 0.08);
      ctx.stroke();

      drawMetalCanLid(ctx, 0, -5.2, 5.6, 1.9, true);
      return true;
    }

    case 'condensed_milk':
    case 'canned_condensed_milk': {
      drawShadow(ctx, 7.0, 2.7, 7.8, 0.26);

      const cylGrad = ctx.createLinearGradient(-5.6, 0, 5.6, 0);
      cylGrad.addColorStop(0.0, '#64748b');
      cylGrad.addColorStop(0.3, '#f8fafc');
      cylGrad.addColorStop(0.7, '#94a3b8');
      cylGrad.addColorStop(1.0, '#334155');
      ctx.fillStyle = cylGrad;
      ctx.beginPath();
      ctx.moveTo(-5.6, -5.2);
      ctx.lineTo(5.6, -5.2);
      ctx.lineTo(5.6, 5.8);
      ctx.ellipse(0, 5.8, 5.6, 1.9, 0, 0, Math.PI);
      ctx.closePath();
      ctx.fill();

      // Classic deep navy & ivory chevron studio label
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(-5.55, -2.9);
      ctx.ellipse(0, -2.9, 5.55, 1.3, 0, Math.PI, 0, true);
      ctx.lineTo(5.55, 4.3);
      ctx.ellipse(0, 4.3, 5.55, 1.5, 0, 0, Math.PI);
      ctx.closePath();
      ctx.clip();

      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(-5.6, -4.2, 11.2, 10.2);

      // Heritage ivory & sky-blue upper and lower zigzag garlands
      ctx.fillStyle = '#f8fafc';
      for (let tx = -5.4; tx <= 4.0; tx += 1.9) {
        ctx.beginPath();
        ctx.moveTo(tx, -3.2); ctx.lineTo(tx + 0.95, -1.9); ctx.lineTo(tx + 1.9, -3.2);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(tx, 4.5); ctx.lineTo(tx + 0.95, 3.2); ctx.lineTo(tx + 1.9, 4.5);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = '#38bdf8';
      for (let tx = -4.45; tx <= 4.2; tx += 1.9) {
        ctx.beginPath();
        ctx.moveTo(tx, -3.2); ctx.lineTo(tx + 0.95, -1.9); ctx.lineTo(tx, -1.9);
        ctx.closePath();
        ctx.fill();
      }

      // Glossy milk medallion + gold rim & editorial rules
      drawLitSphere(ctx, -0.4, 0.65, 1.65, '#ffffff', '#e0f2fe', '#7dd3fc', '#38bdf8', 0.68);
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(-0.4, 0.65, 0.95, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(248, 250, 252, 0.85)';
      ctx.fillRect(-4.6, 2.3, 3.6, 0.35);
      drawMicroBarcode(ctx, 1.8, 1.6, 2.6, 1.0);

      applyCylinderLightingOverlay(ctx, -5.6, -4.3, 11.2, 10.2, 0.28, 0.36);
      ctx.restore();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.38)';
      ctx.lineWidth = 0.4;
      ctx.beginPath();
      ctx.ellipse(0, 5.1, 5.55, 1.75, 0, 0.08, Math.PI - 0.08);
      ctx.stroke();

      drawMetalCanLid(ctx, 0, -5.2, 5.6, 1.9, false);
      return true;
    }

    case 'berries':
    case 'forest_berries': {
      drawShadow(ctx, 8.2, 3.1, 7.8, 0.26);

      // Woven birchbark splint basket with bent wooden hoop rim
      const drawBasket = () => {
        ctx.beginPath();
        ctx.moveTo(-6.8, -2.2);
        ctx.lineTo(6.8, -2.2);
        ctx.lineTo(5.6, 6.4);
        ctx.quadraticCurveTo(0, 7.5, -5.6, 6.4);
        ctx.closePath();
      };
      const baskGrad = ctx.createLinearGradient(-6.8, 0, 6.8, 0);
      baskGrad.addColorStop(0.0, '#78350f');
      baskGrad.addColorStop(0.32, '#d97706');
      baskGrad.addColorStop(0.68, '#b45309');
      baskGrad.addColorStop(1.0, '#451a03');
      ctx.fillStyle = baskGrad;
      drawBasket();
      ctx.fill();

      ctx.save();
      drawBasket();
      ctx.clip();
      // Interlaced splint basket weave texture
      for (let wy = -1.2; wy <= 6.2; wy += 2.0) {
        ctx.fillStyle = 'rgba(69, 26, 3, 0.42)';
        ctx.fillRect(-7.0, wy, 14.0, 0.65);
      }
      for (let wx = -5.4; wx <= 5.4; wx += 2.2) {
        ctx.fillStyle = 'rgba(254, 243, 199, 0.16)';
        ctx.fillRect(wx, -2.5, 0.75, 10.0);
        ctx.fillStyle = 'rgba(28, 12, 3, 0.35)';
        ctx.fillRect(wx + 0.8, -2.5, 0.45, 10.0);
      }
      ctx.restore();

      // Deep dark basket interior cavity behind mound
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.ellipse(0, -2.4, 7.2, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Heap of shaded forest berries: blueberries with glaucous bloom, glossy lingonberries, and raspberries
      const blues: Array<[number, number]> = [
        [-4.2, -3.5], [-1.6, -4.6], [2.2, -4.2], [4.5, -3.2], [-0.4, -3.0], [-2.8, -2.5]
      ];
      for (const [bx, by] of blues) {
        drawLitSphere(ctx, bx, by, 1.38, '#93c5fd', '#1e40af', '#0f172a', '#1e3a8a', 0.45);
      }
      const reds: Array<[number, number]> = [
        [-3.0, -4.4], [0.8, -5.1], [3.6, -4.5], [-1.8, -3.2], [2.0, -3.0], [4.1, -2.5]
      ];
      for (const [rx, ry] of reds) {
        drawLitSphere(ctx, rx, ry, 1.25, '#fca5a5', '#dc2626', '#7f1d1d', undefined, 0.78);
      }
      // Textured drupelet raspberries
      for (const [rx, ry] of [[-0.5, -5.2], [2.4, -3.6], [-4.3, -2.6]]) {
        drawLitSphere(ctx, rx, ry, 1.45, '#fda4af', '#e11d48', '#881337', undefined, 0.45);
        ctx.fillStyle = '#9f1239';
        ctx.beginPath();
        ctx.arc(rx - 0.5, ry - 0.3, 0.4, 0, Math.PI * 2);
        ctx.arc(rx + 0.5, ry + 0.2, 0.4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Forest leaves tucked in rim
      drawBotanicalLeaf(ctx, -1.8, -5.5, 3.4, 1.2, -2.5, '#4ade80', '#14532d');
      drawBotanicalLeaf(ctx, 1.6, -5.8, 3.2, 1.1, -0.45, '#4ade80', '#14532d');

      // Bent wooden basket rim lip overlapping bottom of berries
      const rimGrad = ctx.createLinearGradient(-7.4, -2.5, 7.4, -2.5);
      rimGrad.addColorStop(0.0, '#78350f');
      rimGrad.addColorStop(0.35, '#b45309');
      rimGrad.addColorStop(0.75, '#92400e');
      rimGrad.addColorStop(1.0, '#451a03');
      ctx.fillStyle = rimGrad;
      ctx.beginPath();
      ctx.roundRect(-7.3, -2.9, 14.6, 1.5, 0.65);
      ctx.fill();
      return true;
    }

    case 'egg_chicken_single':
    case 'egg_quail_single': {
      const isQuail = itemId === 'egg_quail_single';
      const sc = isQuail ? 0.74 : 0.96;
      drawShadow(ctx, 4.8 * sc, 2.0 * sc, 6.4 * sc, 0.24);
      ctx.save();
      ctx.scale(sc, sc);
      const grad = ctx.createRadialGradient(-1.5, -2.0, 0.3, 0.2, 0.5, 5.8);
      grad.addColorStop(0.0, '#ffffff');
      grad.addColorStop(0.5, isQuail ? '#f5f5f4' : '#f3c6a5');
      grad.addColorStop(1.0, isQuail ? '#a8a29e' : '#b4693e');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, -5.4);
      ctx.bezierCurveTo(3.2, -5.4, 4.3, -0.8, 4.0, 2.0);
      ctx.bezierCurveTo(3.7, 4.6, 1.8, 5.5, 0, 5.5);
      ctx.bezierCurveTo(-1.8, 5.5, -3.7, 4.6, -4.0, 2.0);
      ctx.bezierCurveTo(-4.3, -0.8, -3.2, -5.4, 0, -5.4);
      ctx.closePath();
      ctx.fill();

      if (isQuail) {
        for (let i = 0; i < 10; i++) {
          const sx = (hash01('quail_s', i * 3) - 0.5) * 5.2;
          const sy = (hash01('quail_s', i * 3 + 1) - 0.5) * 7.6;
          const sr = 0.4 + hash01('quail_s', i * 3 + 2) * 0.55;
          ctx.fillStyle = i % 2 === 0 ? '#57361f' : '#29170a';
          ctx.beginPath();
          ctx.ellipse(sx, sy, sr, sr * 0.7, i, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
      ctx.beginPath();
      ctx.ellipse(-1.3, -1.8, 0.85, 1.75, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return true;
    }

    case 'chip_potato_single':
    case 'nacho_chip_single': {
      drawShadow(ctx, 4.6, 1.9, 5.6, 0.22);
      if (itemId === 'nacho_chip_single') {
        const g = ctx.createLinearGradient(-4, -4, 4, 4);
        g.addColorStop(0, '#fef08a');
        g.addColorStop(0.55, '#f59e0b');
        g.addColorStop(1, '#b45309');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(0, -4.6);
        ctx.quadraticCurveTo(2.8, -0.2, 4.6, 3.8);
        ctx.quadraticCurveTo(0, 4.4, -4.6, 3.8);
        ctx.quadraticCurveTo(-2.8, -0.2, 0, -4.6);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#92400e';
        ctx.lineWidth = 0.45;
        ctx.stroke();

        // Toasted masa corn blister freckles
        ctx.fillStyle = '#78350f';
        for (const [bx, by] of [[-1.0, 1.4], [1.2, 2.0], [0.2, -1.2], [-0.4, 2.8]]) {
          ctx.beginPath();
          ctx.arc(bx, by, 0.28, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        drawLitEllipse(ctx, 0, 0, 4.5, 3.2, -0.22, '#fef9c3', '#facc15', '#b45309', undefined, 0.35);
        // Crispy browned bubble blisters & corrugated ripple lines
        ctx.strokeStyle = 'rgba(180, 83, 9, 0.42)';
        ctx.lineWidth = 0.4;
        for (let rx = -2.4; rx <= 2.4; rx += 1.2) {
          ctx.beginPath();
          ctx.moveTo(rx, -2.2);
          ctx.quadraticCurveTo(rx + 0.4, 0, rx - 0.2, 2.2);
          ctx.stroke();
        }
      }
      return true;
    }

    case 'popcorn_handful': {
      drawShadow(ctx, 5.2, 2.1, 5.8, 0.22);
      drawPopcornKernel(ctx, -2.0, 0.6, 1.9, false);
      drawPopcornKernel(ctx, 2.0, 0.8, 1.85, false);
      drawPopcornKernel(ctx, 0.0, -1.8, 2.05, false);
      drawPopcornKernel(ctx, 0.2, 1.8, 1.75, false);
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

function drawPopcornKernel(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, caramel: boolean) {
  const hi = caramel ? '#fde68a' : '#ffffff';
  const mid = caramel ? '#f59e0b' : '#fef9c3';
  const sh = caramel ? '#92400e' : '#eab308';
  drawLitSphere(ctx, cx - r * 0.35, cy - r * 0.25, r * 0.62, hi, mid, sh, undefined, caramel ? 0.6 : 0.25);
  drawLitSphere(ctx, cx + r * 0.35, cy - r * 0.18, r * 0.56, hi, mid, sh, undefined, caramel ? 0.55 : 0.2);
  drawLitSphere(ctx, cx, cy + r * 0.3, r * 0.68, hi, mid, sh, undefined, caramel ? 0.55 : 0.2);
  // Crisp toasted inner hull crack
  ctx.fillStyle = caramel ? '#78350f' : '#b45309';
  ctx.beginPath();
  ctx.arc(cx, cy + r * 0.05, r * 0.28, 0, Math.PI * 2);
  ctx.fill();
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

