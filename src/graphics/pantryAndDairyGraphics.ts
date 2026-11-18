// Procedural 2D Canvas Models for Pantry, Spices, Herbs, Grains, Preserves, Dairy & Eggs
import {
  drawShadow,
  drawGlassJarShell,
  drawMetalCanLid,
  drawLitSphere,
  drawLitEllipse,
  drawBotanicalLeaf,
  drawCrimpedSeal,
  drawStudioLabelPanel,
  drawFilmWindow,
  drawPouchCrinkles,
  drawMicroBarcode,
  applyCylinderLightingOverlay,
  adjustHex,
  hash01
} from './itemGraphicShared';

export function drawPantryAndDairyItem(ctx: CanvasRenderingContext2D, itemId: string): boolean {
  switch (itemId) {
    // === SALT & PEPPER ===
    case 'salt_fine':
    case 'salt_shaker': {
      drawShadow(ctx, 5.6, 2.2, 7.8, 0.22);

      // Brushed stainless steel perforated dome cap + faceted clear glass shaker
      drawGlassJarShell(ctx, -3.6, -2.6, 7.2, 9.2, 1.5, '#cbd5e1', '#475569', () => {
        // Crystalline white fine salt mound with gentle top angle
        const saltGrad = ctx.createLinearGradient(-3, -1, 3, 6);
        saltGrad.addColorStop(0, '#ffffff');
        saltGrad.addColorStop(0.6, '#f8fafc');
        saltGrad.addColorStop(1, '#cbd5e1');
        ctx.fillStyle = saltGrad;
        ctx.beginPath();
        ctx.moveTo(-4, 0.2);
        ctx.quadraticCurveTo(-1.2, -0.8, 0.5, -0.3);
        ctx.quadraticCurveTo(2.4, 0.2, 4, -0.2);
        ctx.lineTo(4, 7.5);
        ctx.lineTo(-4, 7.5);
        ctx.closePath();
        ctx.fill();

        // Subtle sparkling salt crystal facets
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        for (let i = 0; i < 10; i++) {
          const sx = (hash01('salt', i * 2) - 0.5) * 5.2;
          const sy = 0.6 + hash01('salt', i * 2 + 1) * 4.5;
          ctx.fillRect(sx, sy, 0.45, 0.45);
        }
      });

      // Domed stainless cap top & shaker holes
      const domeGrad = ctx.createRadialGradient(-0.8, -5.8, 0.2, 0, -5.0, 3.8);
      domeGrad.addColorStop(0, '#ffffff');
      domeGrad.addColorStop(0.5, '#cbd5e1');
      domeGrad.addColorStop(1, '#64748b');
      ctx.fillStyle = domeGrad;
      ctx.beginPath();
      ctx.ellipse(0, -5.2, 3.8, 1.35, 0, Math.PI, 0);
      ctx.fill();

      ctx.fillStyle = '#0f172a';
      for (const [hx, hy] of [[-1.6, -5.6], [0, -5.9], [1.6, -5.6], [-0.8, -5.3], [0.8, -5.3]]) {
        ctx.beginPath();
        ctx.arc(hx, hy, 0.26, 0, Math.PI * 2);
        ctx.fill();
      }
      return true;
    }

    case 'salt':
    case 'salt_coarse':
    case 'salt_pack':
    case 'salt_bag_coarse': {
      drawShadow(ctx, 7.2, 3.0, 8.0, 0.24);
      drawPaperSackBase(ctx, '#f8f5ee', '#d6c8b4', '#1e40af');

      drawStudioLabelPanel(ctx, -5.0, -3.2, 10.0, 7.8, {
        paperColor: '#f8fafc',
        bandColor: '#1d4ed8',
        accentColor: '#60a5fa',
        inkColor: '#0f172a',
        goldFoil: false,
        hasBarcode: true,
        emblem: 'diamond',
        cylindrical: true
      });
      return true;
    }

    case 'salt_sea':
    case 'salt_sea_premium': {
      drawShadow(ctx, 6.4, 2.5, 7.8, 0.24);

      // Coarse flaky sea salt inside jar with warm turned-oak wood lid
      drawGlassJarShell(ctx, -4.6, -3.4, 9.2, 10.2, 1.8, '#b45309', '#451a03', () => {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(-4.2, -1.2, 8.4, 8.2);
        for (let i = 0; i < 22; i++) {
          const cx = (hash01('seasalt', i * 3) - 0.5) * 7.2;
          const cy = -0.6 + hash01('seasalt', i * 3 + 1) * 6.8;
          const s = 0.52 + hash01('seasalt', i * 3 + 2) * 0.6;
          ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#e0f2fe';
          ctx.fillRect(cx, cy, s, s * 0.8);
        }
      });

      drawStudioLabelPanel(ctx, -3.8, 1.2, 7.6, 3.6, {
        paperColor: '#fffbeb',
        bandColor: '#0f766e',
        accentColor: '#5eead4',
        inkColor: '#0f172a',
        goldFoil: false,
        hasBarcode: true,
        emblem: 'diamond',
        cylindrical: true
      });
      return true;
    }

    case 'black_pepper_whole':
    case 'black_pepper_grinder': {
      drawShadow(ctx, 5.8, 2.3, 7.8, 0.25);

      // Clear glass body packed with dark textured peppercorns
      drawGlassJarShell(ctx, -3.7, -2.0, 7.4, 8.6, 1.5, '#6b3e26', '#291206', () => {
        ctx.fillStyle = '#334155';
        ctx.fillRect(-3.6, -0.5, 7.2, 7.2);
        for (let i = 0; i < 18; i++) {
          const px = (hash01('pep', i * 2) - 0.5) * 5.4;
          const py = 0.0 + hash01('pep', i * 2 + 1) * 5.8;
          drawLitSphere(ctx, px, py, 0.82, '#52525b', '#27272a', '#09090b', undefined, 0.45);
        }
      });

      // Tall turned walnut grinder dome & brass finial nut
      const woodGrad = ctx.createLinearGradient(-4.0, -7, 4.0, -2);
      woodGrad.addColorStop(0, '#3e1f0d');
      woodGrad.addColorStop(0.32, '#8b4513');
      woodGrad.addColorStop(0.65, '#5c2c0e');
      woodGrad.addColorStop(1, '#291206');
      ctx.fillStyle = woodGrad;
      ctx.beginPath();
      ctx.moveTo(-3.9, -2.1);
      ctx.quadraticCurveTo(-3.4, -4.5, -2.8, -5.8);
      ctx.quadraticCurveTo(0, -7.2, 2.8, -5.8);
      ctx.quadraticCurveTo(3.4, -4.5, 3.9, -2.1);
      ctx.closePath();
      ctx.fill();

      // Brass screw knob
      drawLitSphere(ctx, 0, -6.9, 0.82, '#fef08a', '#eab308', '#854d0e', undefined, 0.75);
      return true;
    }

    // === SPICE POUCHES & FOIL SACHETS ===
    case 'black_pepper_ground':
    case 'black_pepper_powder_sachet':
    case 'chili_powder':
    case 'chili_powder_sachet':
    case 'paprika_sweet':
    case 'paprika_sweet_sachet':
    case 'turmeric_powder':
    case 'turmeric_powder_sachet':
    case 'bay_leaves_dried':
    case 'bay_leaves_dried_sachet':
    case 'cinnamon_powder':
    case 'cinnamon_powder_sachet':
    case 'yeast_dry':
    case 'yeast_dry_sachet':
    case 'cloves_buds_dried':
    case 'cardamom_pods_dried':
    case 'coriander_seeds':
    case 'coriander_seeds_sachet':
    case 'allspice_berries':
    case 'allspice_berries_sachet':
    case 'hibiscus_dried':
    case 'hibiscus_dried_sachet':
    case 'safflower_dried':
    case 'safflower_dried_sachet': {
      drawShadow(ctx, 6.2, 2.4, 7.8, 0.24);

      let sachetBg = '#b91c1c';
      let vignetteColor = '#ef4444';
      if (itemId.includes('black_pepper')) { sachetBg = '#1e293b'; vignetteColor = '#475569'; }
      else if (itemId.includes('paprika')) { sachetBg = '#c2410c'; vignetteColor = '#f97316'; }
      else if (itemId.includes('turmeric')) { sachetBg = '#ca8a04'; vignetteColor = '#facc15'; }
      else if (itemId.includes('bay_leaves') || itemId.includes('cardamom')) { sachetBg = '#14532d'; vignetteColor = '#22c55e'; }
      else if (itemId.includes('cinnamon') || itemId.includes('cloves') || itemId.includes('allspice')) { sachetBg = '#5c2c0e'; vignetteColor = '#b45309'; }
      else if (itemId.includes('coriander') || itemId.includes('yeast')) { sachetBg = '#a16207'; vignetteColor = '#eab308'; }
      else if (itemId.includes('hibiscus')) { sachetBg = '#881337'; vignetteColor = '#e11d48'; }
      else if (itemId.includes('safflower')) { sachetBg = '#b45309'; vignetteColor = '#f59e0b'; }

      // Matte laminated 4-side crimped spice laminate sachet
      const pouchGrad = ctx.createLinearGradient(-5.2, -6.4, 5.2, 6.4);
      pouchGrad.addColorStop(0.0, adjustHex(sachetBg, 0.16));
      pouchGrad.addColorStop(0.42, sachetBg);
      pouchGrad.addColorStop(1.0, adjustHex(sachetBg, -0.38));
      ctx.fillStyle = pouchGrad;
      ctx.beginPath();
      ctx.roundRect(-5.2, -6.4, 10.4, 13.0, 0.85);
      ctx.fill();

      // Finely crimped metallized top & bottom barrier seals
      drawCrimpedSeal(ctx, -5.2, -6.4, 10.4, 1.25, '#94a3b8', true, 0.72);
      drawCrimpedSeal(ctx, -5.2, 5.35, 10.4, 1.25, '#94a3b8', true, 0.72);
      drawPouchCrinkles(ctx, -4.8, -4.8, 9.6, 9.6, itemId.length * 13 + 7, 0.14);

      // Tear V-notch
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(-5.2, -4.8); ctx.lineTo(-4.45, -4.45); ctx.lineTo(-5.2, -4.1);
      ctx.closePath();
      ctx.fill();

      // Editorial cream cotton front label card
      drawStudioLabelPanel(ctx, -4.0, -4.2, 8.0, 8.8, {
        paperColor: '#fdf8e8',
        bandColor: adjustHex(sachetBg, -0.25),
        accentColor: '#d97706',
        inkColor: '#1e293b',
        goldFoil: true,
        hasBarcode: false,
        emblem: 'none',
        cylindrical: false
      });

      // Botanical / Ground Spice Vignette inside oval frame
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(0, 1.35, 2.65, 1.65, 0, 0, Math.PI * 2);
      ctx.fillStyle = adjustHex(sachetBg, -0.45);
      ctx.fill();
      ctx.clip();
      if (itemId.includes('bay_leaves')) {
        drawBotanicalLeaf(ctx, -2.1, 1.9, 4.4, 1.25, -0.32, '#4d7c0f', '#14532d');
      } else if (itemId.includes('hibiscus') || itemId.includes('safflower')) {
        const col = itemId.includes('hibiscus') ? '#be123c' : '#d97706';
        for (let a = 0; a < 5; a++) {
          const rad = (a * Math.PI * 2) / 5;
          drawLitSphere(ctx, Math.cos(rad) * 0.95, 1.35 + Math.sin(rad) * 0.85, 0.68, adjustHex(col, 0.3), col, adjustHex(col, -0.3), undefined, 0.3);
        }
        drawLitSphere(ctx, 0, 1.35, 0.45, '#fef08a', '#eab308', '#854d0e', undefined, 0.3);
      } else {
        drawLitEllipse(ctx, 0, 1.6, 2.2, 1.1, 0, adjustHex(vignetteColor, 0.32), vignetteColor, adjustHex(sachetBg, -0.25), undefined, 0.22);
      }
      ctx.restore();
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 0.28;
      ctx.beginPath();
      ctx.ellipse(0, 1.35, 2.65, 1.65, 0, 0, Math.PI * 2);
      ctx.stroke();

      drawMicroBarcode(ctx, -3.3, 3.35, 2.5, 0.85, '#0f172a', 'rgba(255,255,255,0.85)');
      return true;
    }

    // === BOTANICAL FRESH HERB SPRIGS ===
    case 'rosemary_sprigs_fresh':
    case 'thyme_sprigs_fresh':
    case 'basil_leaves_fresh':
    case 'dill_bunch_fresh':
    case 'parsley_bunch_fresh':
    case 'cilantro_bunch_fresh':
    case 'mint_leaves_fresh':
    case 'tarragon_sprigs_fresh':
    case 'eucalyptus_leaves_fresh': {
      drawShadow(ctx, 7.2, 2.6, 7.8, 0.22);

      // Woody/fibrous stems radiating diagonally
      const stems: Array<[number, number, number, number]> = [
        [-5.6, 4.8, 3.8, -4.6],
        [-4.8, 5.4, 5.2, -3.0],
        [-5.2, 4.2, 2.2, -5.6]
      ];
      ctx.strokeStyle = '#3f6212';
      ctx.lineWidth = 0.85;
      ctx.lineCap = 'round';
      for (const [x0, y0, x1, y1] of stems) {
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.quadraticCurveTo((x0 + x1) * 0.5 - 0.5, (y0 + y1) * 0.5 - 0.4, x1, y1);
        ctx.stroke();
      }

      if (itemId === 'dill_bunch_fresh') {
        // Feathery hair-like dill fronds
        ctx.strokeStyle = '#4ade80';
        ctx.lineWidth = 0.42;
        for (let i = 0; i < 18; i++) {
          const bx = -2.2 + hash01('dill', i * 3) * 6.5;
          const by = 2.0 - hash01('dill', i * 3 + 1) * 6.8;
          const ang = -1.6 + hash01('dill', i * 3 + 2) * 2.2;
          ctx.beginPath();
          ctx.moveTo(bx, by);
          ctx.lineTo(bx + Math.cos(ang) * 2.4, by + Math.sin(ang) * 2.4);
          ctx.moveTo(bx, by);
          ctx.lineTo(bx + Math.cos(ang + 0.5) * 1.9, by + Math.sin(ang + 0.5) * 1.9);
          ctx.stroke();
        }
      } else if (itemId === 'rosemary_sprigs_fresh') {
        // Piney narrow silvery-sage rosemary needles
        for (let i = 0; i < 16; i++) {
          const t = i / 15;
          const bx = -3.0 + t * 7.2;
          const by = 2.6 - t * 6.8;
          const side = i % 2 === 0 ? -1 : 1;
          drawBotanicalLeaf(ctx, bx, by, 2.6, 0.35, -0.75 + side * 0.65, '#86efac', '#166534');
        }
      } else if (itemId === 'eucalyptus_leaves_fresh') {
        // Opposite powdery blue-sage oval eucalyptus leaves
        const pts: Array<[number, number, number]> = [
          [-2.0, 1.4, -2.2], [-1.0, 2.2, 0.5],
          [0.0, -0.5, -2.1], [1.1, 0.2, 0.6],
          [2.0, -2.4, -2.0], [3.1, -1.7, 0.7],
          [3.6, -4.0, -0.8]
        ];
        for (const [lx, ly, rot] of pts) {
          drawBotanicalLeaf(ctx, lx, ly, 3.0, 1.5, rot, '#5eead4', '#0f766e', 'rgba(204, 251, 241, 0.6)');
        }
      } else if (itemId === 'tarragon_sprigs_fresh') {
        for (const [lx, ly, rot] of [
          [-2.2, 1.2, -1.8], [-1.2, 2.2, 0.3], [0.0, -0.8, -1.9],
          [1.2, 0.2, 0.4], [2.2, -2.8, -1.7], [3.2, -1.8, 0.2]
        ]) {
          drawBotanicalLeaf(ctx, lx, ly, 3.8, 0.65, rot, '#34d399', '#065f46');
        }
      } else if (itemId === 'thyme_sprigs_fresh') {
        // Tiny dense micro-leaves along delicate stems
        for (let i = 0; i < 18; i++) {
          const t = i / 17;
          const lx = -2.6 + t * 6.8;
          const ly = 2.4 - t * 6.5 + (i % 2 === 0 ? -0.6 : 0.6);
          drawBotanicalLeaf(ctx, lx, ly, 1.4, 0.6, (i % 2 === 0 ? -1.4 : 0.4), '#84cc16', '#365314');
        }
      } else {
        // Basil, Mint, Parsley, Cilantro — rich veined cupped leaves
        const light = itemId === 'basil_leaves_fresh' ? '#4ade80' : (itemId === 'mint_leaves_fresh' ? '#6ee7b7' : '#84cc16');
        const dark = itemId === 'basil_leaves_fresh' ? '#15803d' : (itemId === 'mint_leaves_fresh' ? '#047857' : '#365314');
        const leaves: Array<[number, number, number, number, number]> = [
          [-2.8, 1.8, 3.2, 1.5, -1.9],
          [-1.5, 2.5, 3.4, 1.5, 0.2],
          [-0.6, -0.2, 3.8, 1.7, -1.8],
          [0.8, 0.6, 3.6, 1.6, 0.3],
          [1.4, -2.2, 3.6, 1.6, -1.5],
          [2.8, -1.4, 3.2, 1.4, -0.1],
          [3.4, -3.6, 3.2, 1.4, -0.75]
        ];
        for (const [lx, ly, len, w, rot] of leaves) {
          drawBotanicalLeaf(ctx, lx, ly, len, w, rot, light, dark);
        }
      }

      // Natural jute twine bow at stem bundle base
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1.05;
      ctx.beginPath();
      ctx.moveTo(-5.0, 2.8); ctx.lineTo(-2.6, 5.2);
      ctx.stroke();
      ctx.strokeStyle = '#fef3c7';
      ctx.lineWidth = 0.45;
      ctx.beginPath();
      ctx.moveTo(-4.9, 2.9); ctx.lineTo(-2.7, 5.1);
      ctx.stroke();
      return true;
    }

    case 'cinnamon_sticks_whole': {
      drawShadow(ctx, 7.2, 2.5, 7.8, 0.24);
      ctx.save();
      ctx.rotate(-0.18);

      // 3 stacked rolled cinnamon bark quills
      const drawQuill = (qy: number, qx: number) => {
        const qGrad = ctx.createLinearGradient(0, qy - 1.5, 0, qy + 1.5);
        qGrad.addColorStop(0, '#b45309');
        qGrad.addColorStop(0.5, '#78350f');
        qGrad.addColorStop(1, '#451a03');
        ctx.fillStyle = qGrad;
        ctx.beginPath();
        ctx.roundRect(qx - 6.0, qy - 1.25, 12.0, 2.5, 1.1);
        ctx.fill();

        // Bark curl hollow eye on right end
        ctx.fillStyle = '#451a03';
        ctx.beginPath();
        ctx.ellipse(qx + 5.6, qy, 0.6, 1.05, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 0.45;
        ctx.beginPath();
        ctx.arc(qx + 5.6, qy, 0.55, 0.4, Math.PI * 1.8);
        ctx.stroke();
      };

      drawQuill(-1.8, -0.3);
      drawQuill(1.5, 0.4);
      drawQuill(0.0, 0.0);

      // Tied natural raffia ribbon
      ctx.strokeStyle = '#fef3c7';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(0, -3.2);
      ctx.quadraticCurveTo(0.8, 0, 0, 3.0);
      ctx.stroke();
      ctx.restore();
      return true;
    }

    case 'nutmeg_whole_seeds': {
      drawShadow(ctx, 6.6, 2.6, 7.8, 0.24);

      const drawNutmeg = (cx: number, cy: number, rot: number, sc: number) => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rot);
        ctx.scale(sc, sc);
        drawLitEllipse(ctx, 0, 0, 4.4, 3.1, 0, '#a16207', '#78350f', '#271204', '#b45309', 0.35);

        // Wrinkled brain-like aril grooves
        ctx.strokeStyle = 'rgba(28, 12, 3, 0.58)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(-3.0, -0.8); ctx.quadraticCurveTo(0, -1.6, 3.0, -0.4);
        ctx.moveTo(-2.8, 0.9); ctx.quadraticCurveTo(0.4, 1.8, 3.2, 0.6);
        ctx.moveTo(-1.2, -2.4); ctx.quadraticCurveTo(-0.4, 0, -1.4, 2.4);
        ctx.stroke();
        ctx.restore();
      };

      drawNutmeg(-2.4, -1.5, -0.3, 0.85);
      drawNutmeg(1.8, 1.2, 0.25, 0.95);
      return true;
    }

    case 'ginger_root_fresh': {
      drawShadow(ctx, 7.8, 2.9, 7.8, 0.25);

      const drawRhizomeLobe = (cx: number, cy: number, rx: number, ry: number, rot: number) => {
        drawLitEllipse(ctx, cx, cy, rx, ry, rot, '#fef08a', '#d4a359', '#78350f', '#b45309', 0.28);
      };
      drawRhizomeLobe(-3.6, -2.2, 2.4, 1.6, -0.55);
      drawRhizomeLobe(2.8, -2.4, 2.2, 1.5, 0.45);
      drawRhizomeLobe(0.2, 0.4, 5.8, 2.8, 0.08);
      drawRhizomeLobe(-4.6, 1.6, 2.2, 1.5, -0.3);
      drawRhizomeLobe(4.2, 2.0, 2.1, 1.4, 0.35);

      // Pale paper-skin nodal growth rings
      ctx.strokeStyle = 'rgba(120, 53, 15, 0.42)';
      ctx.lineWidth = 0.5;
      for (const nx of [-2.4, 0.0, 2.5]) {
        ctx.beginPath();
        ctx.arc(nx, 0.4, 2.2, -0.9, 0.9);
        ctx.stroke();
      }
      // Fresh yellow sliced tip on front knob
      drawLitEllipse(ctx, -6.2, 1.6, 0.9, 1.2, 0.2, '#fef9c3', '#fde047', '#ca8a04', undefined, 0.4);
      return true;
    }

    case 'vanilla_pod_fresh': {
      drawShadow(ctx, 7.2, 2.2, 7.8, 0.22);

      // Pair of glistening dark-chocolate cured Bourbon vanilla beans
      const drawPod = (oy: number, rot: number) => {
        ctx.save();
        ctx.translate(0, oy);
        ctx.rotate(rot);
        ctx.strokeStyle = '#09090b';
        ctx.lineWidth = 2.0;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-7.2, 1.2);
        ctx.bezierCurveTo(-2.5, -2.4, 2.5, -2.0, 7.2, 0.6);
        ctx.stroke();

        // Rich oily pod luster ridge
        ctx.strokeStyle = '#57534e';
        ctx.lineWidth = 0.65;
        ctx.beginPath();
        ctx.moveTo(-6.2, 0.6);
        ctx.bezierCurveTo(-2.2, -2.0, 2.2, -1.7, 6.2, 0.2);
        ctx.stroke();

        // Hooked calyx stem curl at tip
        ctx.strokeStyle = '#27272a';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.moveTo(7.0, 0.6);
        ctx.quadraticCurveTo(8.0, 1.6, 7.2, 2.2);
        ctx.stroke();
        ctx.restore();
      };
      drawPod(-1.2, -0.1);
      drawPod(1.4, 0.14);
      return true;
    }

    // === FATS & BROTHS ===
    case 'lard_pork':
    case 'lard_pork_pot':
    case 'fat_beef':
    case 'fat_beef_pot':
    case 'ghee_butter':
    case 'ghee_butter_pot': {
      drawShadow(ctx, 7.2, 3.1, 8.0, 0.26);

      // Glazed stoneware earthenware crock
      const crockGrad = ctx.createLinearGradient(-5.8, 0, 5.8, 0);
      crockGrad.addColorStop(0.0, '#78350f');
      crockGrad.addColorStop(0.28, '#c27138');
      crockGrad.addColorStop(0.62, '#9a4f21');
      crockGrad.addColorStop(1.0, '#451a03');
      ctx.fillStyle = crockGrad;
      ctx.beginPath();
      ctx.moveTo(-5.2, -3.5);
      ctx.bezierCurveTo(-6.2, 0.5, -5.6, 4.8, -4.4, 6.4);
      ctx.quadraticCurveTo(0, 7.4, 4.4, 6.4);
      ctx.bezierCurveTo(5.6, 4.8, 6.2, 0.5, 5.2, -3.5);
      ctx.closePath();
      ctx.fill();

      // Glazed neck collar band
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.ellipse(0, -3.5, 5.4, 2.1, 0, 0, Math.PI * 2);
      ctx.fill();

      // Filled solidified fat top surface (Lard ivory white, Beef cream tallow, Ghee clarified gold)
      let fatLight = '#ffffff';
      let fatMid = '#f8fafc';
      let fatShadow = '#cbd5e1';
      if (itemId.includes('fat_beef')) {
        fatLight = '#fffbeb'; fatMid = '#fef3c7'; fatShadow = '#e7dec8';
      } else if (itemId.includes('ghee')) {
        fatLight = '#fef9c3'; fatMid = '#facc15'; fatShadow = '#ca8a04';
      }

      drawLitEllipse(ctx, 0, -3.4, 4.5, 1.55, 0, fatLight, fatMid, fatShadow, undefined, 0.55);

      // Ceramic highlight band
      ctx.fillStyle = 'rgba(255, 255, 255, 0.24)';
      ctx.beginPath();
      ctx.ellipse(-2.8, 1.5, 0.85, 3.2, -0.05, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    case 'broth_beef':
    case 'broth_beef_jar':
    case 'broth_chicken':
    case 'broth_chicken_jar':
    case 'broth_fish':
    case 'broth_fish_jar':
    case 'broth_vegetable':
    case 'broth_vegetable_jar': {
      drawShadow(ctx, 6.6, 2.6, 7.8, 0.24);

      let brothTop = '#f59e0b';
      let brothDeep = '#92400e';
      if (itemId.includes('beef')) { brothTop = '#9a3412'; brothDeep = '#451a03'; }
      else if (itemId.includes('chicken')) { brothTop = '#fde047'; brothDeep = '#ca8a04'; }
      else if (itemId.includes('fish')) { brothTop = '#fef9c3'; brothDeep = '#eab308'; }

      drawGlassJarShell(ctx, -4.6, -3.5, 9.2, 10.4, 1.8, '#eab308', '#854d0e', () => {
        const bGrad = ctx.createLinearGradient(0, -1.5, 0, 7.0);
        bGrad.addColorStop(0, brothTop);
        bGrad.addColorStop(1, brothDeep);
        ctx.fillStyle = bGrad;
        ctx.fillRect(-4.2, -1.4, 8.4, 8.2);

        // Golden surface lipid fat meniscus
        ctx.fillStyle = 'rgba(254, 240, 138, 0.65)';
        ctx.fillRect(-4.2, -1.6, 8.4, 0.8);

        // Suspended diced carrot & herb flecks
        ctx.fillStyle = '#f97316';
        ctx.fillRect(-1.8, 3.5, 1.0, 1.0);
        ctx.fillStyle = '#15803d';
        ctx.fillRect(1.2, 2.2, 0.85, 0.75);
      });
      return true;
    }

    case 'maple_syrup':
    case 'maple_syrup_bottle': {
      drawShadow(ctx, 6.4, 2.5, 7.8, 0.25);

      // Curved glass jug handle loop
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 1.55;
      ctx.beginPath();
      ctx.arc(-4.2, -1.4, 2.05, Math.PI * 0.45, Math.PI * 1.55);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(254, 243, 199, 0.55)';
      ctx.lineWidth = 0.55;
      ctx.stroke();

      drawGlassJarShell(ctx, -4.4, -3.2, 8.8, 10.2, 2.0, '#b91c1c', '#7f1d1d', () => {
        const syGrad = ctx.createLinearGradient(-4, -2, 4, 7);
        syGrad.addColorStop(0, '#f59e0b');
        syGrad.addColorStop(0.5, '#b45309');
        syGrad.addColorStop(1, '#451a03');
        ctx.fillStyle = syGrad;
        ctx.fillRect(-4.2, -2.5, 8.4, 9.5);
      });

      drawStudioLabelPanel(ctx, -3.4, 0.1, 6.8, 4.7, {
        paperColor: '#fdf6e4',
        bandColor: '#991b1b',
        accentColor: '#d97706',
        inkColor: '#451a03',
        goldFoil: true,
        hasBarcode: true,
        emblem: 'leaf',
        cylindrical: true
      });
      return true;
    }

    case 'honey':
    case 'jar_honey':
    case 'honey_wild':
    case 'honey_buckwheat':
    case 'honey_wild_jar': {
      drawShadow(ctx, 6.6, 2.6, 7.8, 0.26);

      const isBuckwheat = itemId === 'honey_buckwheat';
      const hTop = isBuckwheat ? '#9a3412' : '#fbbf24';
      const hDeep = isBuckwheat ? '#431407' : '#b45309';

      drawGlassJarShell(ctx, -4.8, -3.4, 9.6, 10.4, 2.0, '#d97706', '#78350f', () => {
        const hGrad = ctx.createRadialGradient(-1.5, 0.5, 0.5, 0, 2, 6.5);
        hGrad.addColorStop(0, adjustHex(hTop, 0.25));
        hGrad.addColorStop(0.6, hTop);
        hGrad.addColorStop(1, hDeep);
        ctx.fillStyle = hGrad;
        ctx.fillRect(-4.4, -2.0, 8.8, 8.8);

        // Comb fragment & air bubbles
        ctx.fillStyle = 'rgba(254, 240, 138, 0.42)';
        ctx.beginPath();
        ctx.ellipse(0, -1.8, 4.0, 0.85, 0, 0, Math.PI * 2);
        ctx.fill();
      });

      // Hemp twine neck tie
      ctx.strokeStyle = '#d6c3a5';
      ctx.lineWidth = 0.72;
      ctx.beginPath();
      ctx.moveTo(-4.7, -3.4);
      ctx.lineTo(4.7, -3.4);
      ctx.stroke();

      drawStudioLabelPanel(ctx, -3.6, 0.3, 7.2, 4.6, {
        paperColor: '#fffbeb',
        bandColor: isBuckwheat ? '#431407' : '#92400e',
        accentColor: '#eab308',
        inkColor: '#451a03',
        goldFoil: true,
        hasBarcode: true,
        emblem: 'crest',
        cylindrical: true
      });
      return true;
    }

    case 'mustard_dijon':
    case 'mustard_dijon_jar': {
      drawShadow(ctx, 6.4, 2.5, 7.8, 0.24);

      drawGlassJarShell(ctx, -4.6, -3.5, 9.2, 10.4, 1.8, '#451a03', '#1c0a00', () => {
        const mGrad = ctx.createLinearGradient(-4, -2, 4, 7);
        mGrad.addColorStop(0, '#fef08a');
        mGrad.addColorStop(0.5, '#eab308');
        mGrad.addColorStop(1, '#a16207');
        ctx.fillStyle = mGrad;
        ctx.fillRect(-4.2, -1.6, 8.4, 8.4);

        for (let i = 0; i < 16; i++) {
          const mx = (hash01('dijon', i * 2) - 0.5) * 6.8;
          const my = -0.8 + hash01('dijon', i * 2 + 1) * 6.8;
          ctx.fillStyle = i % 3 === 0 ? '#78350f' : '#18181b';
          ctx.beginPath();
          ctx.arc(mx, my, 0.34, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      drawStudioLabelPanel(ctx, -3.8, 0.8, 7.6, 4.0, {
        paperColor: '#fdf8e8',
        bandColor: '#7f1d1d',
        accentColor: '#ca8a04',
        inkColor: '#1e293b',
        goldFoil: true,
        hasBarcode: true,
        emblem: 'crest',
        cylindrical: true
      });
      return true;
    }

    // === FLOURS & GRAIN SACKS ===
    case 'flour':
    case 'flour_bag':
    case 'flour_wheat':
    case 'flour_wheat_bag_1k':
    case 'flour_rye':
    case 'flour_rye_bag_1k':
    case 'flour_corn':
    case 'flour_corn_bag_500g':
    case 'flour_rice':
    case 'flour_rice_bag_500g':
    case 'grain_wheat_raw':
    case 'grain_wheat_raw_bag':
    case 'grain_rye_raw':
    case 'grain_rye_raw_bag':
    case 'grain_oats':
    case 'grain_oats_bag':
    case 'rice_basmati':
    case 'rice_basmati_bag':
    case 'rice_arborio':
    case 'rice_arborio_bag':
    case 'rice_white':
    case 'buckwheat_roasted':
    case 'buckwheat_roasted_bag':
    case 'barley_pearl':
    case 'barley_pearl_bag':
    case 'millet_yellow':
    case 'millet_yellow_bag':
    case 'semolina_wheat':
    case 'semolina_wheat_bag':
    case 'peas_split_yellow':
    case 'beans_red_kidney':
    case 'beans_white_lima':
    case 'lentils_red_dry':
    case 'lentils_green_dry':
    case 'chickpeas_garbanzo_dry': {
      drawShadow(ctx, 7.4, 3.0, 8.0, 0.25);

      let bagLight = '#f8f5ee';
      let bagDark = '#d6c8b4';
      let grainCol = '#fde68a';
      let bandCol = '#1d4ed8';

      if (itemId.includes('rye')) { bagLight = '#e2c499'; bagDark = '#a67b46'; grainCol = '#78350f'; bandCol = '#5c2c0e'; }
      else if (itemId.includes('buckwheat')) { bagLight = '#d6b384'; bagDark = '#8c6239'; grainCol = '#451a03'; bandCol = '#78350f'; }
      else if (itemId.includes('corn') || itemId.includes('millet')) { bagLight = '#fef9c3'; bagDark = '#d4b44a'; grainCol = '#facc15'; bandCol = '#b45309'; }
      else if (itemId.includes('peas')) { bagLight = '#fef08a'; bagDark = '#ca8a04'; grainCol = '#eab308'; bandCol = '#15803d'; }
      else if (itemId.includes('grain_')) { bagLight = '#d4a373'; bagDark = '#8d5b32'; grainCol = '#d97706'; bandCol = '#5c2c0e'; }
      else if (itemId.includes('red_kidney')) { grainCol = '#991b1b'; bandCol = '#7f1d1d'; }
      else if (itemId.includes('lentils_red')) { grainCol = '#ea580c'; bandCol = '#c2410c'; }
      else if (itemId.includes('lentils_green')) { grainCol = '#4d7c0f'; bandCol = '#15803d'; }
      else if (itemId.includes('rice')) { grainCol = '#f8fafc'; bandCol = '#0369a1'; }

      drawPaperSackBase(ctx, bagLight, bagDark, bandCol);

      // Editorial header badge + barcode
      ctx.fillStyle = bandCol;
      ctx.fillRect(-5.0, -3.5, 10.0, 2.0);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-3.6, -2.75, 5.2, 0.45);
      drawMicroBarcode(ctx, 2.2, -3.2, 2.4, 1.35, '#0f172a', 'rgba(255,255,255,0.88)');

      // Beveled film inspection window revealing packed grains
      drawFilmWindow(
        ctx,
        () => {
          ctx.beginPath();
          ctx.roundRect(-3.8, -0.5, 7.6, 4.9, 0.8);
        },
        () => {
          ctx.fillStyle = adjustHex(grainCol, -0.35);
          ctx.fillRect(-4, -1, 8, 6);
          for (let i = 0; i < 26; i++) {
            const gx = (hash01(itemId, i * 2) - 0.5) * 7.0;
            const gy = -0.2 + hash01(itemId, i * 2 + 1) * 4.4;
            drawLitEllipse(ctx, gx, gy, 0.7, 0.42, hash01(itemId, i) * 3, adjustHex(grainCol, 0.3), grainCol, adjustHex(grainCol, -0.32), undefined, 0.32);
          }
        },
        bandCol,
        adjustHex(grainCol, -0.45)
      );
      return true;
    }

    case 'sugar':
    case 'sugar_bag': {
      drawShadow(ctx, 7.4, 3.0, 8.0, 0.25);
      drawPaperSackBase(ctx, '#f8fafc', '#cbd5e1', '#0284c7');

      drawStudioLabelPanel(ctx, -5.2, -3.4, 10.4, 8.2, {
        paperColor: '#ffffff',
        bandColor: '#0284c7',
        accentColor: '#38bdf8',
        inkColor: '#0f172a',
        goldFoil: false,
        hasBarcode: true,
        emblem: 'diamond',
        cylindrical: true
      });
      return true;
    }

    // === PRESERVE JARS, PICKLES & CAVIAR ===
    case 'jar_pickles':
    case 'pickles': {
      drawShadow(ctx, 7.0, 2.8, 7.8, 0.26);

      drawGlassJarShell(ctx, -5.0, -3.5, 10.0, 10.8, 2.0, '#eab308', '#854d0e', () => {
        // Herb-infused translucent brine
        const brGrad = ctx.createLinearGradient(0, -2, 0, 7);
        brGrad.addColorStop(0, 'rgba(217, 249, 157, 0.42)');
        brGrad.addColorStop(1, 'rgba(132, 204, 22, 0.55)');
        ctx.fillStyle = brGrad;
        ctx.fillRect(-4.6, -1.8, 9.2, 9.0);

        // Crisp pickled gherkins packed tightly inside jar
        const gherkins = [
          { x: -2.4, y: 2.2, w: 2.3, h: 6.4, rot: -0.14, c: '#15803d' },
          { x: 0.2, y: 1.8, w: 2.5, h: 7.0, rot: 0.05, c: '#166534' },
          { x: 2.5, y: 2.4, w: 2.3, h: 6.2, rot: 0.16, c: '#14532d' }
        ];
        for (const g of gherkins) {
          ctx.save();
          ctx.translate(g.x, g.y);
          ctx.rotate(g.rot);
          drawLitEllipse(ctx, 0, 0, g.w * 0.52, g.h * 0.52, 0, '#4ade80', g.c, '#052e16', undefined, 0.35);
          ctx.fillStyle = '#86efac';
          for (const wy of [-1.8, -0.4, 1.0, 2.2]) {
            ctx.beginPath();
            ctx.arc(-0.2, wy, 0.28, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }

        // Dill floret & whole black peppercorns
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(2.2, -1.0, 0.9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(-2.0, 5.2, 0.48, 0, Math.PI * 2);
        ctx.arc(1.8, 5.5, 0.45, 0, Math.PI * 2);
        ctx.fill();
      });
      return true;
    }

    case 'jam_raspberry':
    case 'raspberry_jam_jar': {
      drawShadow(ctx, 6.6, 2.5, 7.8, 0.25);

      drawGlassJarShell(ctx, -4.8, -3.2, 9.6, 10.4, 1.9, '#b45309', '#78350f', () => {
        const rGrad = ctx.createRadialGradient(-1, 1, 0.5, 0, 2, 6);
        rGrad.addColorStop(0, '#f43f5e');
        rGrad.addColorStop(0.55, '#be123c');
        rGrad.addColorStop(1, '#4c0519');
        ctx.fillStyle = rGrad;
        ctx.fillRect(-4.4, -1.6, 8.8, 8.4);

        for (let i = 0; i < 12; i++) {
          const rx = (hash01('rjam', i * 2) - 0.5) * 6.8;
          const ry = -0.6 + hash01('rjam', i * 2 + 1) * 6.5;
          ctx.fillStyle = i % 3 === 0 ? '#fde047' : '#881337';
          ctx.beginPath();
          ctx.arc(rx, ry, i % 3 === 0 ? 0.28 : 0.65, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Pleated kraft cover skirt tied with hemp twine
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.moveTo(-5.3, -3.5);
      ctx.lineTo(-4.0, -2.0);
      ctx.lineTo(0, -2.5);
      ctx.lineTo(4.0, -2.0);
      ctx.lineTo(5.3, -3.5);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#fef3c7';
      ctx.lineWidth = 0.72;
      ctx.beginPath();
      ctx.moveTo(-4.6, -3.3);
      ctx.lineTo(4.6, -3.3);
      ctx.stroke();

      drawStudioLabelPanel(ctx, -3.6, 0.5, 7.2, 4.1, {
        paperColor: '#fdf8e8',
        bandColor: '#881337',
        accentColor: '#fb7185',
        inkColor: '#4c0519',
        goldFoil: false,
        hasBarcode: true,
        emblem: 'circle',
        cylindrical: true
      });
      return true;
    }

    case 'jam':
    case 'jar_jam':
    case 'jam_strawberry':
    case 'strawberry_jam_jar':
    case 'jam_blueberry': {
      drawShadow(ctx, 6.6, 2.5, 7.8, 0.25);

      const isBlue = itemId.includes('blueberry');
      const lidCol = isBlue ? '#2563eb' : '#dc2626';
      const lidEdge = isBlue ? '#1e3a8a' : '#7f1d1d';
      const jHi = isBlue ? '#6366f1' : '#ef4444';
      const jDeep = isBlue ? '#1e1b4b' : '#7f1d1d';

      drawGlassJarShell(ctx, -4.8, -3.2, 9.6, 10.4, 1.9, lidCol, lidEdge, () => {
        const jGrad = ctx.createRadialGradient(-1, 1, 0.5, 0, 2, 6);
        jGrad.addColorStop(0, jHi);
        jGrad.addColorStop(0.6, adjustHex(jDeep, 0.15));
        jGrad.addColorStop(1, jDeep);
        ctx.fillStyle = jGrad;
        ctx.fillRect(-4.4, -1.6, 8.8, 8.4);

        ctx.fillStyle = isBlue ? '#312e81' : '#991b1b';
        for (const [bx, by] of [[-2.0, 0.5], [1.8, 2.4], [-1.2, 4.5], [0.6, 0.0]]) {
          ctx.beginPath();
          ctx.arc(bx, by, 0.9, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Gingham weave strips on lid skirt
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      for (let gx = -4.2; gx <= 4.0; gx += 1.9) {
        ctx.fillRect(gx, -5.8, 0.78, 2.2);
      }

      drawStudioLabelPanel(ctx, -3.6, 0.5, 7.2, 4.1, {
        paperColor: '#fdf8e8',
        bandColor: lidEdge,
        accentColor: jHi,
        inkColor: '#1e293b',
        goldFoil: false,
        hasBarcode: true,
        emblem: 'circle',
        cylindrical: true
      });
      return true;
    }

    case 'caviar_squash_jar':
    case 'caviar_squash':
    case 'zucchini_caviar_jar': {
      drawShadow(ctx, 6.6, 2.6, 7.8, 0.25);

      drawGlassJarShell(ctx, -4.8, -3.4, 9.6, 10.6, 1.8, '#eab308', '#854d0e', () => {
        const cGrad = ctx.createRadialGradient(-1.5, 0.8, 0.5, 0, 2, 6);
        cGrad.addColorStop(0, '#fb923c');
        cGrad.addColorStop(0.55, '#ea580c');
        cGrad.addColorStop(1, '#9a3412');
        ctx.fillStyle = cGrad;
        ctx.fillRect(-4.4, -1.6, 8.8, 8.6);
      });

      drawStudioLabelPanel(ctx, -3.8, 0.5, 7.6, 4.3, {
        paperColor: '#fffbeb',
        bandColor: '#15803d',
        accentColor: '#eab308',
        inkColor: '#1e293b',
        goldFoil: false,
        hasBarcode: true,
        emblem: 'leaf',
        cylindrical: true
      });
      return true;
    }

    case 'caviar_eggplant_jar':
    case 'caviar_eggplant':
    case 'eggplant_caviar_jar': {
      drawShadow(ctx, 6.6, 2.6, 7.8, 0.25);

      drawGlassJarShell(ctx, -4.8, -3.4, 9.6, 10.6, 1.8, '#eab308', '#854d0e', () => {
        const eGrad = ctx.createRadialGradient(-1.5, 0.8, 0.5, 0, 2, 6);
        eGrad.addColorStop(0, '#9333ea');
        eGrad.addColorStop(0.55, '#581c87');
        eGrad.addColorStop(1, '#2e1065');
        ctx.fillStyle = eGrad;
        ctx.fillRect(-4.4, -1.6, 8.8, 8.6);

        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-2.0, 0.2, 0.75, 0.75);
        ctx.fillRect(1.4, -0.4, 0.75, 0.75);
        ctx.fillStyle = '#4ade80';
        ctx.fillRect(2.2, 5.0, 0.65, 0.65);
      });

      drawStudioLabelPanel(ctx, -3.8, 0.5, 7.6, 4.3, {
        paperColor: '#fffbeb',
        bandColor: '#581c87',
        accentColor: '#d97706',
        inkColor: '#1e293b',
        goldFoil: false,
        hasBarcode: true,
        emblem: 'circle',
        cylindrical: true
      });
      return true;
    }

    case 'caviar':
    case 'canned_caviar':
    case 'salmon_caviar':
    case 'pike_caviar':
    case 'cod_caviar': {
      drawShadow(ctx, 7.6, 2.7, 7.8, 0.26);

      // Emerald lacquered cylindrical flat salmon caviar tin
      const sideGrad = ctx.createLinearGradient(-7.5, 0, 7.5, 0);
      sideGrad.addColorStop(0.0, '#022c22');
      sideGrad.addColorStop(0.28, '#059669');
      sideGrad.addColorStop(0.62, '#065f46');
      sideGrad.addColorStop(1.0, '#022c22');
      ctx.fillStyle = sideGrad;
      ctx.beginPath();
      ctx.moveTo(-7.5, -3.2);
      ctx.lineTo(7.5, -3.2);
      ctx.lineTo(7.5, 1.2);
      ctx.ellipse(0, 1.2, 7.5, 3.6, 0, 0, Math.PI);
      ctx.closePath();
      ctx.fill();

      // Gold ribbon graphic on side wall
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 0.55;
      ctx.beginPath();
      ctx.ellipse(0, 0.6, 7.4, 3.4, 0, 0.08, Math.PI - 0.08);
      ctx.stroke();

      // Brushed metal + lacquered top lid
      drawMetalCanLid(ctx, 0, -3.2, 7.5, 3.6, true);

      // Lacquered emerald-gold central crest medallion
      const medGrad = ctx.createRadialGradient(-1, -4, 0.3, 0, -3.2, 5.2);
      medGrad.addColorStop(0, '#059669');
      medGrad.addColorStop(1, '#022c22');
      ctx.fillStyle = medGrad;
      ctx.beginPath();
      ctx.ellipse(0, -3.2, 5.2, 2.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 0.65;
      ctx.stroke();

      // Stylized roe & fish emblem
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.ellipse(-0.4, -3.2, 2.0, 0.75, 0, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    // === DAIRY & EGGS ===
    case 'cream_heavy':
    case 'cream_heavy_jar':
    case 'sour_cream':
    case 'sour_cream_pot': {
      drawShadow(ctx, 6.8, 2.8, 7.8, 0.25);

      const isCream = itemId.includes('cream_heavy');
      const potGrad = ctx.createLinearGradient(-5.2, 0, 5.2, 0);
      potGrad.addColorStop(0, '#cbd5e1');
      potGrad.addColorStop(0.28, '#ffffff');
      potGrad.addColorStop(0.65, '#f8fafc');
      potGrad.addColorStop(1, '#94a3b8');
      ctx.fillStyle = potGrad;
      ctx.beginPath();
      ctx.moveTo(-5.2, -3.0);
      ctx.lineTo(5.2, -3.0);
      ctx.lineTo(4.2, 6.2);
      ctx.quadraticCurveTo(0, 7.2, -4.2, 6.2);
      ctx.closePath();
      ctx.fill();

      // Molded top rim flange
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.ellipse(0, -3.0, 5.45, 2.0, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.2)';
      ctx.lineWidth = 0.28;
      ctx.stroke();

      drawStudioLabelPanel(ctx, -4.5, -0.2, 9.0, 4.2, {
        paperColor: '#ffffff',
        bandColor: isCream ? '#0369a1' : '#1d4ed8',
        accentColor: '#eab308',
        inkColor: '#0f172a',
        goldFoil: false,
        hasBarcode: true,
        emblem: 'circle',
        cylindrical: true
      });

      // Swirled rich white dairy cream surface
      drawLitEllipse(ctx, 0, -3.0, 4.85, 1.72, 0, '#ffffff', '#f8fafc', '#cbd5e1', undefined, 0.55);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
      ctx.lineWidth = 0.42;
      ctx.beginPath();
      ctx.arc(0, -3.0, 2.1, 0, Math.PI * 1.4);
      ctx.stroke();
      return true;
    }

    case 'cottage_cheese':
    case 'cottage_cheese_pack': {
      drawShadow(ctx, 7.4, 3.0, 7.8, 0.25);

      // 3D axonometric parchment-wrapped dairy brick
      const topGrad = ctx.createLinearGradient(-7, -4.8, 6.5, 2.0);
      topGrad.addColorStop(0.0, '#ffffff');
      topGrad.addColorStop(0.55, '#f8fafc');
      topGrad.addColorStop(1.0, '#e2e8f0');
      ctx.fillStyle = topGrad;
      ctx.beginPath();
      ctx.moveTo(-7.2, 0.2);
      ctx.lineTo(-2.4, -4.6);
      ctx.lineTo(7.2, -2.8);
      ctx.lineTo(2.4, 2.2);
      ctx.closePath();
      ctx.fill();

      // Front face
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.moveTo(-7.2, 0.2);
      ctx.lineTo(2.4, 2.2);
      ctx.lineTo(2.4, 5.4);
      ctx.lineTo(-7.2, 3.4);
      ctx.closePath();
      ctx.fill();

      // Right folded end-tuck flap face
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(2.4, 2.2);
      ctx.lineTo(7.2, -2.8);
      ctx.lineTo(7.2, 0.4);
      ctx.lineTo(2.4, 5.4);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = 'rgba(100, 116, 139, 0.45)';
      ctx.lineWidth = 0.28;
      ctx.beginPath();
      ctx.moveTo(2.4, 2.2); ctx.lineTo(7.2, 0.4);
      ctx.moveTo(7.2, -2.8); ctx.lineTo(2.4, 5.4);
      ctx.stroke();

      // Sky-blue studio dairy sash across brick top
      ctx.save();
      ctx.translate(-0.1, -1.2);
      ctx.rotate(0.2);
      drawStudioLabelPanel(ctx, -4.2, -1.6, 8.4, 3.2, {
        paperColor: '#f8fafc',
        bandColor: '#0284c7',
        accentColor: '#38bdf8',
        inkColor: '#0f172a',
        goldFoil: false,
        hasBarcode: true,
        emblem: 'circle',
        cylindrical: false
      });
      ctx.restore();
      return true;
    }

    case 'yogurt':
    case 'yogurt_natural_cup': {
      drawShadow(ctx, 6.0, 2.4, 7.8, 0.24);

      const cupGrad = ctx.createLinearGradient(-4.5, 0, 4.5, 0);
      cupGrad.addColorStop(0, '#cbd5e1');
      cupGrad.addColorStop(0.32, '#ffffff');
      cupGrad.addColorStop(0.75, '#f1f5f9');
      cupGrad.addColorStop(1, '#94a3b8');
      ctx.fillStyle = cupGrad;
      ctx.beginPath();
      ctx.moveTo(-4.4, -3.8);
      ctx.lineTo(4.4, -3.8);
      ctx.lineTo(3.4, 5.8);
      ctx.quadraticCurveTo(0, 6.6, -3.4, 5.8);
      ctx.closePath();
      ctx.fill();

      drawStudioLabelPanel(ctx, -4.0, -1.0, 8.0, 3.8, {
        paperColor: '#ffffff',
        bandColor: '#0284c7',
        accentColor: '#22c55e',
        inkColor: '#0f172a',
        goldFoil: false,
        hasBarcode: true,
        emblem: 'leaf',
        cylindrical: true
      });

      // Embossed aluminum peel lid + pull tab
      drawMetalCanLid(ctx, 0, -3.8, 4.7, 1.5, false, '#e2e8f0');
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(4.1, -4.0); ctx.lineTo(5.7, -3.4); ctx.lineTo(5.1, -2.6); ctx.lineTo(3.8, -3.2);
      ctx.closePath();
      ctx.fill();
      return true;
    }

    case 'butter_brick_salted': {
      drawShadow(ctx, 7.4, 3.0, 7.8, 0.25);

      // 3D axonometric brushed gold-foil salted butter brick
      const topGrad = ctx.createLinearGradient(-7.0, -4.6, 6.5, 2.2);
      topGrad.addColorStop(0.0, '#fef9c3');
      topGrad.addColorStop(0.45, '#fde047');
      topGrad.addColorStop(1.0, '#eab308');
      ctx.fillStyle = topGrad;
      ctx.beginPath();
      ctx.moveTo(-7.0, 0.0);
      ctx.lineTo(-2.2, -4.6);
      ctx.lineTo(7.0, -2.8);
      ctx.lineTo(2.2, 2.0);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#ca8a04';
      ctx.beginPath();
      ctx.moveTo(-7.0, 0.0);
      ctx.lineTo(2.2, 2.0);
      ctx.lineTo(2.2, 5.2);
      ctx.lineTo(-7.0, 3.2);
      ctx.closePath();
      ctx.fill();

      // Folded triangular foil end flaps
      ctx.fillStyle = '#a16207';
      ctx.beginPath();
      ctx.moveTo(2.2, 2.0);
      ctx.lineTo(7.0, -2.8);
      ctx.lineTo(7.0, 0.4);
      ctx.lineTo(2.2, 5.2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(120, 53, 15, 0.5)';
      ctx.lineWidth = 0.28;
      ctx.beginPath();
      ctx.moveTo(2.2, 2.0); ctx.lineTo(7.0, 0.4);
      ctx.moveTo(7.0, -2.8); ctx.lineTo(2.2, 5.2);
      ctx.stroke();

      ctx.save();
      ctx.translate(-0.1, -1.3);
      ctx.rotate(0.2);
      drawStudioLabelPanel(ctx, -4.0, -1.5, 8.0, 3.0, {
        paperColor: '#fffbeb',
        bandColor: '#1e3a8a',
        accentColor: '#ca8a04',
        inkColor: '#1e3a8a',
        goldFoil: true,
        hasBarcode: true,
        emblem: 'crest',
        cylindrical: false
      });
      ctx.restore();
      return true;
    }

    // Cheeses
    case 'cheese_cheddar_block':
    case 'cheese_gouda_wheel':
    case 'cheese_parmesan_wedge':
    case 'cheese_mozzarella_ball':
    case 'cheese_suluguni_braid':
    case 'cheese_feta_block': {
      drawShadow(ctx, 7.6, 3.1, 7.8, 0.26);

      if (itemId === 'cheese_mozzarella_ball') {
        // Plump moist artisanal fior-di-latte sphere with fibrous fold creases
        drawLitSphere(ctx, 0, 0.2, 5.6, '#ffffff', '#fafaf9', '#d6d3d1', '#f5f5f4', 0.8);
        ctx.strokeStyle = 'rgba(168, 162, 158, 0.35)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.arc(-0.8, 0.5, 3.4, -0.6, 1.2);
        ctx.stroke();
        return true;
      }

      if (itemId === 'cheese_suluguni_braid') {
        // Smoked golden-amber intertwined Suluguni braid
        const loops = [
          { x1: -6.2, y1: 1.5, x2: -1.8, y2: -2.2 },
          { x1: -2.6, y1: -2.0, x2: 1.8, y2: 2.2 },
          { x1: 1.0, y1: 2.0, x2: 5.8, y2: -1.8 },
          { x1: -5.8, y1: -1.6, x2: -1.2, y2: 2.2 },
          { x1: -2.0, y1: 2.2, x2: 2.6, y2: -2.0 },
          { x1: 1.8, y1: -1.8, x2: 6.2, y2: 1.4 }
        ];
        for (const l of loops) {
          ctx.strokeStyle = '#78350f';
          ctx.lineWidth = 2.7;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(l.x1, l.y1 + 0.3); ctx.lineTo(l.x2, l.y2 + 0.3);
          ctx.stroke();

          const g = ctx.createLinearGradient(l.x1, l.y1 - 1, l.x2, l.y2 + 1);
          g.addColorStop(0, '#fde047');
          g.addColorStop(0.5, '#d97706');
          g.addColorStop(1, '#92400e');
          ctx.strokeStyle = g;
          ctx.lineWidth = 2.1;
          ctx.beginPath();
          ctx.moveTo(l.x1, l.y1); ctx.lineTo(l.x2, l.y2);
          ctx.stroke();
        }
        return true;
      }

      if (itemId === 'cheese_gouda_wheel') {
        // Crimson wax-coated Gouda wheel with one golden cut wedge missing
        const rimGrad = ctx.createLinearGradient(-7, 0, 7, 0);
        rimGrad.addColorStop(0, '#7f1d1d');
        rimGrad.addColorStop(0.5, '#dc2626');
        rimGrad.addColorStop(1, '#7f1d1d');
        ctx.fillStyle = rimGrad;
        ctx.beginPath();
        ctx.ellipse(0, 1.4, 6.8, 4.2, 0, 0, Math.PI * 2);
        ctx.fill();

        const topGrad = ctx.createRadialGradient(-2, -1.6, 0.5, 0, -0.5, 6.8);
        topGrad.addColorStop(0, '#f87171');
        topGrad.addColorStop(0.6, '#dc2626');
        topGrad.addColorStop(1, '#991b1b');
        ctx.fillStyle = topGrad;
        ctx.beginPath();
        ctx.ellipse(0, -0.5, 6.8, 4.1, 0, 0, Math.PI * 2);
        ctx.fill();

        // Exposed creamy yellow wedge interior
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.moveTo(0, -0.5);
        ctx.lineTo(6.2, 1.0);
        ctx.lineTo(2.4, 3.4);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#eab308';
        ctx.beginPath();
        ctx.moveTo(2.4, 3.4);
        ctx.lineTo(6.2, 1.0);
        ctx.lineTo(6.2, 2.8);
        ctx.lineTo(2.4, 5.2);
        ctx.closePath();
        ctx.fill();

        // Glossy wax sheen
        ctx.fillStyle = 'rgba(255, 255, 255, 0.32)';
        ctx.beginPath();
        ctx.ellipse(-2.6, -2.0, 2.2, 0.75, -0.2, 0, Math.PI * 2);
        ctx.fill();
        return true;
      }

      if (itemId === 'cheese_parmesan_wedge') {
        // Hard granular aged Parmigiano-Reggiano wedge with dark golden crust rind
        // Top light plane
        const pGrad = ctx.createLinearGradient(-6, -4, 6, 2);
        pGrad.addColorStop(0, '#fef9c3');
        pGrad.addColorStop(1, '#facc15');
        ctx.fillStyle = pGrad;
        ctx.beginPath();
        ctx.moveTo(-6.2, -1.8);
        ctx.lineTo(0.8, -5.2);
        ctx.lineTo(6.8, -0.4);
        ctx.lineTo(-1.2, 1.6);
        ctx.closePath();
        ctx.fill();

        // Front granular crystalline fracture plane
        ctx.fillStyle = '#eab308';
        ctx.beginPath();
        ctx.moveTo(-6.2, -1.8);
        ctx.lineTo(-1.2, 1.6);
        ctx.lineTo(-1.2, 5.4);
        ctx.lineTo(-6.2, 2.0);
        ctx.closePath();
        ctx.fill();

        // Right dark textured aged crust rind
        ctx.fillStyle = '#92400e';
        ctx.beginPath();
        ctx.moveTo(-1.2, 1.6);
        ctx.lineTo(6.8, -0.4);
        ctx.lineTo(6.8, 3.4);
        ctx.lineTo(-1.2, 5.4);
        ctx.closePath();
        ctx.fill();

        // White tyrosine crunch crystals inside cheese face
        ctx.fillStyle = '#ffffff';
        for (const [tx, ty] of [[-4.2, -0.6], [-2.5, 0.8], [-1.2, -1.6], [1.4, -2.0]]) {
          ctx.beginPath();
          ctx.arc(tx, ty, 0.25, 0, Math.PI * 2);
          ctx.fill();
        }
        return true;
      }

      // Cheddar or Feta Isometric Block
      const isCheddar = itemId === 'cheese_cheddar_block';
      const topC = isCheddar ? '#fbbf24' : '#ffffff';
      const frontC = isCheddar ? '#f59e0b' : '#f1f5f9';
      const sideC = isCheddar ? '#b45309' : '#cbd5e1';

      ctx.fillStyle = topC;
      ctx.beginPath();
      ctx.moveTo(-6.5, -1.6); ctx.lineTo(-3.2, -4.6); ctx.lineTo(6.5, -3.4); ctx.lineTo(3.2, -0.4);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = frontC;
      ctx.beginPath();
      ctx.moveTo(-6.5, -1.6); ctx.lineTo(3.2, -0.4); ctx.lineTo(3.2, 4.6); ctx.lineTo(-6.5, 3.4);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = sideC;
      ctx.beginPath();
      ctx.moveTo(3.2, -0.4); ctx.lineTo(6.5, -3.4); ctx.lineTo(6.5, 1.6); ctx.lineTo(3.2, 4.6);
      ctx.closePath();
      ctx.fill();

      if (!isCheddar) {
        // Crumbly brine pores & subtle scored Feta cube grid
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
        ctx.lineWidth = 0.4;
        ctx.beginPath();
        ctx.moveTo(-1.8, -4.0); ctx.lineTo(-1.8, 4.0);
        ctx.stroke();
      }
      return true;
    }

    // === EGGS & EGG CARTONS ===
    case 'eggs_chicken':
    case 'eggs_chicken_carton':
    case 'eggs_quail':
    case 'eggs_quail_pack': {
      drawShadow(ctx, 8.4, 3.4, 8.0, 0.26);
      const isQuail = itemId.includes('quail');

      // Molded recycled pulp tray with recessed cups & front clasp lip
      const trayGrad = ctx.createLinearGradient(-8, -4.5, 8, 5.5);
      trayGrad.addColorStop(0, '#e7e5e4');
      trayGrad.addColorStop(0.5, '#a8a29e');
      trayGrad.addColorStop(1, '#57534e');
      ctx.fillStyle = trayGrad;
      ctx.beginPath();
      ctx.roundRect(-8.2, -4.8, 16.4, 10.2, 1.4);
      ctx.fill();

      // Front beveled carton apron
      ctx.fillStyle = '#78716c';
      ctx.beginPath();
      ctx.roundRect(-8.2, 3.6, 16.4, 1.8, [0, 0, 1.4, 1.4]);
      ctx.fill();

      // Recessed matte pulp pockets
      ctx.fillStyle = 'rgba(28, 25, 23, 0.34)';
      ctx.beginPath();
      ctx.roundRect(-7.4, -4.0, 14.8, 7.8, 0.9);
      ctx.fill();

      for (const rowY of [-1.85, 1.65]) {
        for (const colX of [-5.2, -1.75, 1.75, 5.2]) {
          drawLitEllipse(
            ctx,
            colX,
            rowY,
            1.42,
            1.68,
            0,
            '#ffffff',
            isQuail ? '#f5f5f4' : '#f3c6a5',
            isQuail ? '#a8a29e' : '#b4693e',
            undefined,
            0.3
          );
          if (isQuail) {
            ctx.fillStyle = '#57361f';
            ctx.beginPath();
            ctx.arc(colX - 0.3, rowY - 0.3, 0.3, 0, Math.PI * 2);
            ctx.arc(colX + 0.4, rowY + 0.4, 0.26, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Molded central cone separators rising between egg cups
      for (const cx of [-3.48, 0, 3.48]) {
        drawLitSphere(ctx, cx, -0.1, 0.52, '#d6d3d1', '#a8a29e', '#57534e', undefined, 0.2);
      }
      return true;
    }

    case 'egg_chicken_single':
    case 'egg_quail_single':
    case 'egg_duck_single':
    case 'egg_goose_single': {
      drawShadow(ctx, 5.6, 2.4, 7.8, 0.24);
      const isQuail = itemId === 'egg_quail_single';
      const isDuck = itemId === 'egg_duck_single';
      const isGoose = itemId === 'egg_goose_single';

      const scale = isQuail ? 0.72 : (isGoose ? 1.14 : 1.0);
      ctx.save();
      ctx.scale(scale, scale);

      const hi = '#ffffff';
      const mid = isDuck ? '#e0f2fe' : (isGoose ? '#f8fafc' : (isQuail ? '#f5f5f4' : '#f3c6a5'));
      const sh = isDuck ? '#94a3b8' : (isGoose ? '#cbd5e1' : (isQuail ? '#a8a29e' : '#b4693e'));

      // Asymmetric ovoid egg silhouette (narrower at top pole)
      const grad = ctx.createRadialGradient(-1.6, -2.2, 0.4, 0.2, 0.5, 6.2);
      grad.addColorStop(0.0, hi);
      grad.addColorStop(0.5, mid);
      grad.addColorStop(1.0, sh);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, -5.8);
      ctx.bezierCurveTo(3.4, -5.8, 4.6, -0.8, 4.3, 2.2);
      ctx.bezierCurveTo(4.0, 5.0, 2.0, 6.0, 0, 6.0);
      ctx.bezierCurveTo(-2.0, 6.0, -4.0, 5.0, -4.3, 2.2);
      ctx.bezierCurveTo(-4.6, -0.8, -3.4, -5.8, 0, -5.8);
      ctx.closePath();
      ctx.fill();

      // Matte shell pores & quail blotches
      if (isQuail) {
        for (let i = 0; i < 12; i++) {
          const sx = (hash01('quail', i * 3) - 0.5) * 6.0;
          const sy = (hash01('quail', i * 3 + 1) - 0.5) * 8.6;
          const sr = 0.42 + hash01('quail', i * 3 + 2) * 0.65;
          ctx.fillStyle = i % 2 === 0 ? '#57361f' : '#29170a';
          ctx.beginPath();
          ctx.ellipse(sx, sy, sr, sr * 0.72, i, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Soft matte eggshell highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.beginPath();
      ctx.ellipse(-1.4, -2.0, 0.9, 1.9, 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return true;
    }

    case 'beeswax_bar': {
      drawShadow(ctx, 7.2, 2.6, 6.8, 0.24);
      const topGrad = ctx.createLinearGradient(-6, -5.5, 6, 1);
      topGrad.addColorStop(0, '#fef08a');
      topGrad.addColorStop(1, '#eab308');
      ctx.fillStyle = topGrad;
      ctx.beginPath();
      ctx.moveTo(-6.5, -1.5);
      ctx.lineTo(-2.5, -5.0);
      ctx.lineTo(6.5, -3.5);
      ctx.lineTo(2.5, 0.5);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.moveTo(-6.5, -1.5);
      ctx.lineTo(2.5, 0.5);
      ctx.lineTo(2.5, 4.8);
      ctx.lineTo(-6.5, 2.6);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.moveTo(2.5, 0.5);
      ctx.lineTo(6.5, -3.5);
      ctx.lineTo(6.5, 0.8);
      ctx.lineTo(2.5, 4.8);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = 'rgba(180, 83, 9, 0.55)';
      ctx.lineWidth = 0.55;
      for (const [cx, cy] of [[-1.5, -2.5], [1.0, -2.2], [-0.2, -1.3], [2.4, -1.9]]) {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i * Math.PI) / 3;
          const px = cx + Math.cos(a) * 0.9;
          const py = cy + Math.sin(a) * 0.55;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
      }
      return true;
    }

    case 'carnauba_wax':
    case 'carnauba_wax_pack': {
      drawShadow(ctx, 6.4, 2.6, 7.6, 0.22);
      const bagGrad = ctx.createLinearGradient(-5.5, -6.5, 5.5, 6.5);
      bagGrad.addColorStop(0, '#f8fafc');
      bagGrad.addColorStop(0.55, '#e2e8f0');
      bagGrad.addColorStop(1, '#cbd5e1');
      ctx.fillStyle = bagGrad;
      ctx.beginPath();
      ctx.roundRect(-5.5, -6.6, 11.0, 13.6, 1.1);
      ctx.fill();

      drawCrimpedSeal(ctx, -5.5, -6.6, 11.0, 1.2, '#cbd5e1', true, 0.8);
      drawCrimpedSeal(ctx, -5.5, 5.8, 11.0, 1.2, '#cbd5e1', true, 0.8);
      drawPouchCrinkles(ctx, -5.0, -5.0, 10.0, 10.2, 42, 0.16);

      // Zip-lock double track
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.6)';
      ctx.lineWidth = 0.28;
      ctx.beginPath();
      ctx.moveTo(-5.0, -4.6); ctx.lineTo(5.0, -4.6);
      ctx.moveTo(-5.0, -4.1); ctx.lineTo(5.0, -4.1);
      ctx.stroke();

      // Technical botanical wax label header
      ctx.fillStyle = '#15803d';
      ctx.fillRect(-4.4, -3.5, 8.8, 2.2);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(-3.2, -2.6, 4.2, 0.45);
      drawMicroBarcode(ctx, 1.6, -3.2, 2.4, 1.5, '#0f172a', 'rgba(255,255,255,0.85)');

      // Film window with golden carnauba wax flakes inside
      drawFilmWindow(
        ctx,
        () => {
          ctx.beginPath();
          ctx.roundRect(-4.2, -0.4, 8.4, 5.4, 0.7);
        },
        () => {
          ctx.fillStyle = '#78350f';
          ctx.fillRect(-4.2, -0.4, 8.4, 5.4);
          const flakes = [
            [-2.8, 1.2, 0.2], [-1.0, 2.4, -0.4], [1.2, 1.4, 0.5], [2.6, 2.8, -0.2],
            [-2.0, 3.8, 0.3], [0.2, 4.0, -0.1], [2.2, 4.2, 0.4], [-0.4, 1.0, 0.1]
          ];
          for (const [fx, fy, rot] of flakes) {
            ctx.save();
            ctx.translate(fx, fy);
            ctx.rotate(rot);
            ctx.fillStyle = Math.round(fx) % 2 === 0 ? '#fde047' : '#ca8a04';
            ctx.fillRect(-0.9, -0.48, 1.8, 0.96);
            ctx.restore();
          }
        },
        '#94a3b8',
        '#451a03'
      );
      return true;
    }

    default:
      return false;
  }
}

function drawPaperSackBase(ctx: CanvasRenderingContext2D, lightHex: string, darkHex: string, seamHex: string) {
  // Gusseted plump paper flour/grain bag with realistic rolled stitched top cuff & creases
  const bGrad = ctx.createLinearGradient(-6.8, -5.5, 6.8, 6.5);
  bGrad.addColorStop(0.0, adjustHex(lightHex, -0.08));
  bGrad.addColorStop(0.32, lightHex);
  bGrad.addColorStop(0.75, darkHex);
  bGrad.addColorStop(1.0, adjustHex(darkHex, -0.18));
  ctx.fillStyle = bGrad;
  ctx.beginPath();
  ctx.moveTo(-6.2, -5.6);
  ctx.quadraticCurveTo(0, -6.2, 6.2, -5.6);
  ctx.bezierCurveTo(7.0, -1.0, 6.8, 3.8, 6.0, 6.4);
  ctx.quadraticCurveTo(0, 7.2, -6.0, 6.4);
  ctx.bezierCurveTo(-6.8, 3.8, -7.0, -1.0, -6.2, -5.6);
  ctx.closePath();
  ctx.fill();

  // Subtle vertical side gusset fold lines & soft creases
  applyCylinderLightingOverlay(ctx, -6.6, -5.5, 13.2, 12.2, 0.14, 0.22);

  ctx.strokeStyle = 'rgba(15, 23, 42, 0.16)';
  ctx.lineWidth = 0.28;
  ctx.beginPath();
  ctx.moveTo(-5.2, -4.4); ctx.quadraticCurveTo(-5.6, 1.0, -4.9, 6.0);
  ctx.moveTo(5.2, -4.4); ctx.quadraticCurveTo(5.6, 1.0, 4.9, 6.0);
  ctx.stroke();

  // Folded paper cuff header & thread stitching
  ctx.fillStyle = darkHex;
  ctx.beginPath();
  ctx.roundRect(-6.4, -6.0, 12.8, 1.75, 0.65);
  ctx.fill();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.18)';
  ctx.fillRect(-6.2, -4.35, 12.4, 0.4);

  ctx.strokeStyle = seamHex;
  ctx.lineWidth = 0.34;
  ctx.beginPath();
  ctx.setLineDash([0.7, 0.5]);
  ctx.moveTo(-5.8, -4.95);
  ctx.lineTo(5.8, -4.95);
  ctx.stroke();
  ctx.setLineDash([]);
}
