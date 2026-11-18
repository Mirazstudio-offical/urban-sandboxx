// Photorealistic 2.5D Studio Canvas Models for Vegetables, Fruits, Berries & Mushrooms
import {
  adjustHex,
  drawBotanicalLeaf,
  drawGlassJarShell,
  drawGlossBand,
  drawLitEllipse,
  drawLitSphere,
  drawMetalCanLid,
  drawOrganicBlobPath,
  drawShadow,
  drawCrimpedSeal,
  drawPouchCrinkles,
  drawStudioLabelPanel,
  drawFilmWindow,
  drawMicroBarcode,
  applyCylinderLightingOverlay,
  hash01
} from './itemGraphicShared';

function drawWovenBasketBase(ctx: CanvasRenderingContext2D, seed: string) {
  // Rim interior dark cavity
  ctx.fillStyle = '#451a03';
  ctx.beginPath();
  ctx.ellipse(0, -1.2, 6.4, 2.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Tapered wicker body with warm directional wood gradient
  const bGrad = ctx.createLinearGradient(-6.5, -1, 6.5, 6.5);
  bGrad.addColorStop(0.0, '#f59e0b');
  bGrad.addColorStop(0.35, '#d97706');
  bGrad.addColorStop(0.75, '#b45309');
  bGrad.addColorStop(1.0, '#78350f');
  ctx.fillStyle = bGrad;
  ctx.beginPath();
  ctx.moveTo(-6.4, -1.2);
  ctx.quadraticCurveTo(-5.8, 3.2, -4.4, 6.2);
  ctx.quadraticCurveTo(0, 7.1, 4.4, 6.2);
  ctx.quadraticCurveTo(5.8, 3.2, 6.4, -1.2);
  ctx.closePath();
  ctx.fill();

  // Alternating horizontal & vertical woven willow reed strips
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-6.4, -1.2);
  ctx.quadraticCurveTo(-5.8, 3.2, -4.4, 6.2);
  ctx.quadraticCurveTo(0, 7.1, 4.4, 6.2);
  ctx.quadraticCurveTo(5.8, 3.2, 6.4, -1.2);
  ctx.closePath();
  ctx.clip();

  for (let row = 0; row < 4; row++) {
    const ry = 0.2 + row * 1.55;
    ctx.strokeStyle = 'rgba(69, 26, 3, 0.55)';
    ctx.lineWidth = 0.45;
    ctx.beginPath();
    ctx.moveTo(-6.5, ry);
    ctx.quadraticCurveTo(0, ry + 1.0, 6.5, ry);
    ctx.stroke();

    for (let col = -4; col <= 4; col += 1.6) {
      const alt = (row + Math.round(col)) % 2 === 0;
      const rx = col + (row % 2) * 0.4;
      ctx.fillStyle = alt ? 'rgba(253, 230, 138, 0.34)' : 'rgba(120, 53, 15, 0.36)';
      ctx.beginPath();
      ctx.roundRect(rx - 0.65, ry - 0.55, 1.3, 1.0, 0.35);
      ctx.fill();
    }
  }
  ctx.restore();

  // Braided rim lip
  const rimGrad = ctx.createLinearGradient(-6.8, -2, 6.8, 0);
  rimGrad.addColorStop(0, '#fde68a');
  rimGrad.addColorStop(0.5, '#d97706');
  rimGrad.addColorStop(1, '#78350f');
  ctx.strokeStyle = rimGrad;
  ctx.lineWidth = 1.05;
  ctx.beginPath();
  ctx.ellipse(0, -1.2, 6.3, 1.8, 0, -0.05, Math.PI + 0.05);
  ctx.stroke();

  // Subtle fiber flecks
  const _unused = hash01(seed, 1);
  if (_unused < 0) ctx.fillRect(0, 0, 0, 0);
}

function drawRealisticCitrus(
  ctx: CanvasRenderingContext2D,
  r: number,
  lightCol: string,
  midCol: string,
  shadowCol: string,
  aspectY: number,
  seed: string,
  withLeaf: boolean,
  navelColor: string = '#15803d'
) {
  ctx.save();
  ctx.scale(1, aspectY);
  drawLitSphere(ctx, 0, 0.4 / aspectY, r, lightCol, midCol, shadowCol, adjustHex(midCol, 0.14), 0.38);

  // Authentic citrus oil gland micro-pores across peel
  for (let i = 0; i < 18; i++) {
    const ang = hash01(seed, i * 3 + 1) * Math.PI * 2;
    const dist = Math.sqrt(hash01(seed, i * 3 + 2)) * (r * 0.82);
    const px = Math.cos(ang) * dist;
    const py = 0.4 / aspectY + Math.sin(ang) * dist;
    ctx.fillStyle = px + py < 0 ? 'rgba(255, 255, 255, 0.25)' : 'rgba(69, 26, 3, 0.22)';
    ctx.beginPath();
    ctx.arc(px, py, 0.22 + hash01(seed, i * 3 + 3) * 0.16, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Calyx button dimple at top
  ctx.fillStyle = navelColor;
  ctx.beginPath();
  ctx.ellipse(0, -r * aspectY + 0.85, 0.9, 0.55, 0, 0, Math.PI * 2);
  ctx.fill();

  if (withLeaf) {
    ctx.fillStyle = '#3f6212';
    ctx.fillRect(-0.35, -r * aspectY - 0.5, 0.7, 1.3);
    drawBotanicalLeaf(ctx, 0.2, -r * aspectY + 0.2, 3.6, 1.4, -0.38, '#4ade80', '#14532d');
  }
}

function drawRealisticMushroomCapAndStem(
  ctx: CanvasRenderingContext2D,
  capHighlight: string,
  capMid: string,
  capShadow: string,
  stemLight: string,
  stemShadow: string,
  capRx: number,
  capRy: number,
  capY: number,
  seed: string,
  hasSpongyPores: boolean = true
) {
  // Plump bulbous porcini/boletus stem with earthy taper
  const sGrad = ctx.createLinearGradient(-2.8, capY, 2.8, 6.8);
  sGrad.addColorStop(0.0, stemLight);
  sGrad.addColorStop(0.55, adjustHex(stemLight, -0.1));
  sGrad.addColorStop(1.0, stemShadow);
  ctx.fillStyle = sGrad;
  ctx.beginPath();
  ctx.moveTo(-1.7, capY + 0.4);
  ctx.bezierCurveTo(-2.5, capY + 2.8, -2.8, 5.2, -1.6, 6.6);
  ctx.quadraticCurveTo(0, 7.2, 1.6, 6.6);
  ctx.bezierCurveTo(2.8, 5.2, 2.5, capY + 2.8, 1.7, capY + 0.4);
  ctx.closePath();
  ctx.fill();

  // Delicate stem reticulation / earthy humus speckles at foot
  ctx.strokeStyle = 'rgba(120, 53, 15, 0.25)';
  ctx.lineWidth = 0.25;
  ctx.beginPath();
  ctx.moveTo(-0.8, capY + 1.2);
  ctx.quadraticCurveTo(-1.1, 3.5, -0.7, 5.8);
  ctx.moveTo(0.7, capY + 1.4);
  ctx.quadraticCurveTo(1.0, 3.8, 0.5, 6.0);
  ctx.stroke();

  ctx.fillStyle = 'rgba(69, 26, 3, 0.45)';
  for (let i = 0; i < 6; i++) {
    const sx = (hash01(seed, i * 2 + 10) - 0.5) * 2.2;
    const sy = 5.4 + hash01(seed, i * 2 + 11) * 1.1;
    ctx.fillRect(sx, sy, 0.42, 0.35);
  }

  // Spongy hymenium pore layer visible beneath domed cap
  if (hasSpongyPores) {
    const pGrad = ctx.createLinearGradient(0, capY - 0.4, 0, capY + 1.4);
    pGrad.addColorStop(0, '#fef08a');
    pGrad.addColorStop(1, '#a16207');
    ctx.fillStyle = pGrad;
    ctx.beginPath();
    ctx.ellipse(0, capY + 0.3, capRx * 0.92, 1.15, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Velvet domed cap with studio lighting
  const cGrad = ctx.createRadialGradient(-capRx * 0.35, capY - capRy * 0.55, 0.4, 0, capY - capRy * 0.1, capRx * 1.15);
  cGrad.addColorStop(0.0, capHighlight);
  cGrad.addColorStop(0.45, capMid);
  cGrad.addColorStop(0.88, capShadow);
  cGrad.addColorStop(1.0, adjustHex(capShadow, -0.25));
  ctx.fillStyle = cGrad;
  ctx.beginPath();
  ctx.moveTo(-capRx, capY + 0.2);
  ctx.bezierCurveTo(-capRx * 1.04, capY - capRy * 0.95, capRx * 1.04, capY - capRy * 0.95, capRx, capY + 0.2);
  ctx.quadraticCurveTo(0, capY + 0.9, -capRx, capY + 0.2);
  ctx.closePath();
  ctx.fill();

  // Dewy satin cuticle highlight & natural mottled flecks
  ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.beginPath();
  ctx.ellipse(-capRx * 0.32, capY - capRy * 0.42, capRx * 0.28, capRy * 0.14, -0.22, 0, Math.PI * 2);
  ctx.fill();
}

export function drawProduceAndMushroomItem(ctx: CanvasRenderingContext2D, itemId: string): boolean {
  switch (itemId) {
    // =========================================================================
    // === ROOT VEGETABLES & ALLIUMS ===
    // =========================================================================
    case 'potato_whole': {
      drawShadow(ctx, 7.6, 2.7, 6.2, 0.26);
      drawOrganicBlobPath(ctx, 0, 0.2, 7.4, 5.0, 101, 0.09, 12);
      const grad = ctx.createRadialGradient(-2.6, -2.0, 0.6, 0.4, 0.4, 8.2);
      grad.addColorStop(0.0, '#eab308');
      grad.addColorStop(0.42, '#ca8a04');
      grad.addColorStop(0.82, '#92400e');
      grad.addColorStop(1.0, '#78350f');
      ctx.fillStyle = grad;
      ctx.fill();

      // Matte potato skin lenticels & recessed tuber eyes
      for (const [ex, ey, rot] of [[-3.6, -1.6, 0.2], [2.8, -1.4, -0.3], [0.4, 2.2, 0.1], [-1.8, 1.8, -0.2], [4.5, 1.0, 0.4]]) {
        ctx.fillStyle = 'rgba(69, 26, 3, 0.55)';
        ctx.beginPath();
        ctx.ellipse(ex, ey, 0.72, 0.32, rot, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(254, 240, 138, 0.3)';
        ctx.lineWidth = 0.22;
        ctx.beginPath();
        ctx.arc(ex, ey + 0.15, 0.55, 0.2, Math.PI - 0.2);
        ctx.stroke();
      }
      // Subtle soil dust specks
      ctx.fillStyle = 'rgba(41, 37, 36, 0.35)';
      for (let i = 0; i < 12; i++) {
        const dx = (hash01('potato_whole', i * 2) - 0.5) * 10;
        const dy = (hash01('potato_whole', i * 2 + 1) - 0.5) * 6.5;
        ctx.fillRect(dx, dy, 0.38, 0.32);
      }
      return true;
    }

    case 'potato_peeled': {
      drawShadow(ctx, 7.0, 2.5, 6.0, 0.22);
      drawOrganicBlobPath(ctx, 0, 0.2, 6.8, 4.6, 102, 0.06, 12);
      const grad = ctx.createRadialGradient(-2.4, -1.6, 0.5, 0.4, 0.4, 7.6);
      grad.addColorStop(0.0, '#fffbeb');
      grad.addColorStop(0.45, '#fef3c7');
      grad.addColorStop(0.85, '#fde68a');
      grad.addColorStop(1.0, '#d97706');
      ctx.fillStyle = grad;
      ctx.fill();

      // Subtle knife-paring facets + wet starch sheen
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.beginPath();
      ctx.ellipse(-2.0, -1.6, 2.2, 0.9, -0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(217, 119, 6, 0.28)';
      ctx.lineWidth = 0.3;
      ctx.beginPath();
      ctx.moveTo(-4.2, -0.4);
      ctx.quadraticCurveTo(0, -1.8, 4.2, -0.2);
      ctx.stroke();
      return true;
    }

    case 'potato_sliced': {
      drawShadow(ctx, 7.4, 2.6, 6.2, 0.22);
      const wedges = [
        { x: -3.2, y: -1.4, a: -0.35 },
        { x: 2.6, y: -1.2, a: 0.28 },
        { x: -0.2, y: 2.2, a: 0.06 },
      ];
      for (const w of wedges) {
        ctx.save();
        ctx.translate(w.x, w.y);
        ctx.rotate(w.a);
        // Thick 3D slice rim
        ctx.fillStyle = '#92400e';
        ctx.beginPath();
        ctx.ellipse(0, 0.65, 4.4, 2.4, 0, 0, Math.PI * 2);
        ctx.fill();
        // Creamy wet cut starch face
        const fGrad = ctx.createRadialGradient(-1.4, -0.7, 0.3, 0, 0, 4.5);
        fGrad.addColorStop(0.0, '#fffbeb');
        fGrad.addColorStop(0.65, '#fef08a');
        fGrad.addColorStop(1.0, '#eab308');
        ctx.fillStyle = fGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, 4.2, 2.25, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#b45309';
        ctx.lineWidth = 0.45;
        ctx.stroke();
        // Translucent moist catchlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
        ctx.beginPath();
        ctx.ellipse(-1.4, -0.7, 1.2, 0.45, -0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      return true;
    }

    case 'potato_grated': {
      drawShadow(ctx, 7.6, 2.8, 6.2, 0.22);
      for (let i = 0; i < 24; i++) {
        const angle = hash01('potato_grated', i * 3) * Math.PI - Math.PI / 2;
        const px = (hash01('potato_grated', i * 3 + 1) - 0.5) * 9.5;
        const py = (hash01('potato_grated', i * 3 + 2) - 0.5) * 6.5;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(angle);
        ctx.fillStyle = i % 3 === 0 ? '#fef9c3' : i % 3 === 1 ? '#fef08a' : '#fde047';
        ctx.beginPath();
        ctx.roundRect(-2.1, -0.45, 4.2, 0.9, 0.35);
        ctx.fill();
        ctx.strokeStyle = 'rgba(180, 83, 9, 0.35)';
        ctx.lineWidth = 0.25;
        ctx.stroke();
        ctx.restore();
      }
      return true;
    }

    case 'carrot_whole':
    case 'carrot_fresh': {
      drawShadow(ctx, 8.2, 2.4, 5.2, 0.24);
      // Feathery botanical green carrot tops
      ctx.save();
      ctx.translate(-5.6, -0.1);
      for (const [ang, len, w] of [[-0.52, 4.4, 1.05], [-0.15, 5.0, 1.15], [0.22, 4.6, 1.1], [0.55, 3.8, 0.95]]) {
        drawBotanicalLeaf(ctx, 0, 0, -len, w, ang, '#4ade80', '#15803d', 'rgba(220,252,231,0.5)');
      }
      ctx.restore();

      // Conical fleshy orange root with directional cylinder lighting
      const cGrad = ctx.createLinearGradient(0, -2.8, 0, 2.8);
      cGrad.addColorStop(0.0, '#fdba74');
      cGrad.addColorStop(0.28, '#f97316');
      cGrad.addColorStop(0.75, '#ea580c');
      cGrad.addColorStop(1.0, '#9a3412');
      ctx.fillStyle = cGrad;
      ctx.beginPath();
      ctx.moveTo(-5.8, -2.35);
      ctx.bezierCurveTo(-1.0, -2.0, 4.8, -0.9, 7.6, 0.25);
      ctx.quadraticCurveTo(8.1, 0.45, 7.5, 0.65);
      ctx.bezierCurveTo(4.6, 1.45, -1.0, 2.35, -5.8, 2.25);
      ctx.quadraticCurveTo(-7.1, 0, -5.8, -2.35);
      ctx.closePath();
      ctx.fill();

      // Root crown collar & transverse skin creases
      ctx.fillStyle = '#65a30d';
      ctx.beginPath();
      ctx.ellipse(-6.1, -0.05, 0.55, 1.35, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(124, 45, 18, 0.5)';
      ctx.lineWidth = 0.42;
      for (const rx of [-4.0, -1.8, 0.5, 2.6, 4.5]) {
        const h = 1.65 - (rx + 5) * 0.11;
        ctx.beginPath();
        ctx.moveTo(rx, -h * 0.7);
        ctx.quadraticCurveTo(rx + 0.35, 0, rx + 0.1, h * 0.75);
        ctx.stroke();
      }
      // Wet specular highlight streak along top ridge
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.beginPath();
      ctx.ellipse(-0.4, -1.1, 3.6, 0.38, 0.12, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    case 'carrot_peeled': {
      drawShadow(ctx, 7.8, 2.2, 4.8, 0.2);
      const cGrad = ctx.createLinearGradient(0, -2.3, 0, 2.5);
      cGrad.addColorStop(0.0, '#fed7aa');
      cGrad.addColorStop(0.32, '#fb923c');
      cGrad.addColorStop(0.8, '#f97316');
      cGrad.addColorStop(1.0, '#c2410c');
      ctx.fillStyle = cGrad;
      ctx.beginPath();
      ctx.moveTo(-6.2, -2.1);
      ctx.bezierCurveTo(-1.0, -1.8, 4.8, -0.75, 7.4, 0.25);
      ctx.bezierCurveTo(4.6, 1.25, -1.0, 2.1, -6.2, 2.0);
      ctx.quadraticCurveTo(-7.2, 0, -6.2, -2.1);
      ctx.closePath();
      ctx.fill();
      // Moist sheen
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.beginPath();
      ctx.ellipse(-0.5, -0.95, 4.2, 0.42, 0.1, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    case 'carrot_diced': {
      drawShadow(ctx, 7.4, 2.6, 6.2, 0.22);
      const cubes = [
        [-3.8, -2.0], [-0.4, -2.6], [3.0, -1.6],
        [-2.2, 0.5], [1.4, 0.8], [-4.0, 2.8], [0.2, 3.1], [3.2, 2.5],
      ];
      for (const [cx, cy] of cubes) {
        ctx.fillStyle = '#c2410c';
        ctx.beginPath();
        ctx.roundRect(cx - 1.0, cy - 0.7, 2.1, 2.0, 0.4);
        ctx.fill();
        ctx.fillStyle = '#fb923c';
        ctx.beginPath();
        ctx.roundRect(cx - 1.1, cy - 1.1, 2.1, 1.7, 0.4);
        ctx.fill();
        ctx.fillStyle = '#fed7aa';
        ctx.fillRect(cx - 0.8, cy - 0.85, 0.9, 0.55);
      }
      return true;
    }

    case 'carrot_grated': {
      drawShadow(ctx, 7.6, 2.8, 6.2, 0.22);
      for (let i = 0; i < 24; i++) {
        const ang = (hash01('carrot_grated', i * 3) - 0.5) * 2.2;
        const px = (hash01('carrot_grated', i * 3 + 1) - 0.5) * 9.8;
        const py = (hash01('carrot_grated', i * 3 + 2) - 0.5) * 6.5;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(ang);
        ctx.fillStyle = i % 2 === 0 ? '#f97316' : '#ea580c';
        ctx.beginPath();
        ctx.roundRect(-2.3, -0.4, 4.6, 0.8, 0.3);
        ctx.fill();
        ctx.restore();
      }
      return true;
    }

    case 'carrot_bag_1k': {
      drawShadow(ctx, 7.4, 2.8, 7.6, 0.24);

      // Gathered LDPE poly neck tuft above red clip
      ctx.fillStyle = 'rgba(226, 232, 240, 0.68)';
      ctx.beginPath();
      ctx.moveTo(-1.3, -5.8);
      ctx.lineTo(-2.6, -7.8);
      ctx.lineTo(0, -7.2);
      ctx.lineTo(2.6, -7.8);
      ctx.lineTo(1.3, -5.8);
      ctx.closePath();
      ctx.fill();

      // Perforated translucent LDPE produce bag
      const bagGrad = ctx.createLinearGradient(-6, -6, 6, 7);
      bagGrad.addColorStop(0.0, 'rgba(248, 250, 252, 0.78)');
      bagGrad.addColorStop(0.5, 'rgba(226, 232, 240, 0.45)');
      bagGrad.addColorStop(1.0, 'rgba(148, 163, 184, 0.65)');
      ctx.fillStyle = bagGrad;
      ctx.beginPath();
      ctx.moveTo(-2.2, -5.8);
      ctx.bezierCurveTo(-5.8, -5.2, -6.2, -1.5, -5.8, 6.2);
      ctx.lineTo(5.8, 6.2);
      ctx.bezierCurveTo(6.2, -1.5, 5.8, -5.2, 2.2, -5.8);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 0.35;
      ctx.stroke();

      // Carrots nested tightly inside bag
      for (const [cy, rot] of [[-2.6, -0.06], [0.1, 0.08], [2.9, -0.04]]) {
        ctx.save();
        ctx.translate(0, cy);
        ctx.rotate(rot);
        const cg = ctx.createLinearGradient(-4.5, -1.2, 4.5, 1.2);
        cg.addColorStop(0, '#fdba74');
        cg.addColorStop(0.48, '#ea580c');
        cg.addColorStop(1, '#9a3412');
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.ellipse(0, 0, 4.5, 1.25, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Red aluminum wire-tie collar & editorial green farm tag with barcode
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.roundRect(-1.8, -6.2, 3.6, 0.95, 0.35);
      ctx.fill();

      drawStudioLabelPanel(ctx, -3.9, 1.4, 7.8, 3.6, {
        paperColor: '#f8fafc',
        bandColor: '#15803d',
        accentColor: '#ea580c',
        inkColor: '#14532d',
        goldFoil: false,
        hasBarcode: true,
        emblem: 'leaf',
        cylindrical: false
      });

      drawPouchCrinkles(ctx, -5.2, -5.0, 10.4, 10.8, 42, 0.25);
      drawGlossBand(ctx, -4.4, -5.2, 1.2, 10.8, 0.42);
      return true;
    }

    case 'beet_whole':
    case 'beet_fresh': {
      drawShadow(ctx, 7.2, 2.8, 6.4, 0.28);
      // Leafy red-veined stem stubs on top-left
      drawBotanicalLeaf(ctx, -4.2, -2.4, -3.5, 1.5, -0.45, '#be123c', '#15803d', '#fda4af');
      drawBotanicalLeaf(ctx, -4.6, -1.0, -3.8, 1.4, 0.25, '#9f1239', '#166534', '#fb7185');

      // Winding slender beetroot taproot on bottom-right
      ctx.strokeStyle = '#831843';
      ctx.lineWidth = 1.1;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(4.0, 2.2);
      ctx.bezierCurveTo(6.0, 3.6, 7.2, 3.2, 8.8, 4.4);
      ctx.stroke();

      // Earthy magenta-burgundy beet globe
      drawLitSphere(ctx, 0, 0.3, 5.4, '#be185d', '#831843', '#4c0519', '#9d174d', 0.32);

      // Subtle concentric growth shoulders
      ctx.strokeStyle = 'rgba(244, 114, 182, 0.22)';
      ctx.lineWidth = 0.4;
      ctx.beginPath();
      ctx.arc(-2.0, -1.2, 2.6, 0.2, 1.9);
      ctx.stroke();
      return true;
    }

    case 'beet_peeled_boiled': {
      drawShadow(ctx, 6.6, 2.6, 6.2, 0.26);
      drawLitSphere(ctx, 0, 0.2, 5.3, '#9f1239', '#6b0f2b', '#3b0714', '#881337', 0.58);
      // Wet boiled sheen & faint translucent concentric blush
      ctx.strokeStyle = 'rgba(251, 113, 133, 0.25)';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.arc(-0.4, 0.2, 3.1, 0.4, 2.5);
      ctx.stroke();
      return true;
    }

    case 'beet_sliced': {
      drawShadow(ctx, 7.4, 2.7, 6.2, 0.25);
      for (const [bx, by] of [[-2.4, -0.6], [2.2, 1.2]]) {
        // Outer dark skin rim
        ctx.fillStyle = '#4c0519';
        ctx.beginPath();
        ctx.arc(bx, by + 0.5, 4.4, 0, Math.PI * 2);
        ctx.fill();

        const bGrad = ctx.createRadialGradient(bx - 1.2, by - 1.2, 0.2, bx, by, 4.4);
        bGrad.addColorStop(0.0, '#be185d');
        bGrad.addColorStop(0.5, '#831843');
        bGrad.addColorStop(1.0, '#4c0519');
        ctx.fillStyle = bGrad;
        ctx.beginPath();
        ctx.arc(bx, by, 4.3, 0, Math.PI * 2);
        ctx.fill();

        // Characteristic beet bullseye vascular rings
        ctx.strokeStyle = 'rgba(251, 113, 133, 0.5)';
        ctx.lineWidth = 0.55;
        for (const rr of [3.2, 2.0, 0.95]) {
          ctx.beginPath();
          ctx.arc(bx, by, rr, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.ellipse(bx - 1.4, by - 1.6, 1.0, 0.4, -0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      return true;
    }

    case 'beet_grated': {
      drawShadow(ctx, 7.6, 2.8, 6.2, 0.24);
      for (let i = 0; i < 24; i++) {
        const ang = (hash01('beet_grated', i * 3) - 0.5) * 2.4;
        const px = (hash01('beet_grated', i * 3 + 1) - 0.5) * 9.5;
        const py = (hash01('beet_grated', i * 3 + 2) - 0.5) * 6.4;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(ang);
        ctx.fillStyle = i % 2 === 0 ? '#9d174d' : '#701a37';
        ctx.beginPath();
        ctx.roundRect(-2.2, -0.4, 4.4, 0.8, 0.3);
        ctx.fill();
        ctx.restore();
      }
      return true;
    }

    case 'turnip_whole': {
      drawShadow(ctx, 7.0, 2.7, 6.5, 0.24);
      // Leaf stub top
      drawBotanicalLeaf(ctx, -0.4, -4.6, 3.2, 1.2, -1.9, '#84cc16', '#15803d');
      drawBotanicalLeaf(ctx, 0.4, -4.6, 3.0, 1.1, -1.2, '#4ade80', '#166534');

      // Taproot tail bottom
      ctx.strokeStyle = '#fde68a';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(0, 5.2);
      ctx.quadraticCurveTo(0.8, 6.8, -0.2, 7.8);
      ctx.stroke();

      // Cream bottom + violet-purple upper shoulder
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(0, 0.4, 5.6, 5.1, 0, 0, Math.PI * 2);
      ctx.clip();

      drawLitSphere(ctx, 0, 0.6, 5.8, '#fefce8', '#fef08a', '#ca8a04', '#fde68a', 0.32);

      const topGrad = ctx.createRadialGradient(-2.0, -3.0, 0.5, 0, -1.5, 6.0);
      topGrad.addColorStop(0.0, '#e879f9');
      topGrad.addColorStop(0.55, '#a21caf');
      topGrad.addColorStop(1.0, '#701a75');
      ctx.fillStyle = topGrad;
      ctx.beginPath();
      ctx.moveTo(-6, -5);
      ctx.lineTo(6, -5);
      ctx.lineTo(6, 0.2);
      ctx.quadraticCurveTo(0, 1.2, -6, 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      return true;
    }

    case 'turnip_sliced': {
      drawShadow(ctx, 7.2, 2.6, 6.0, 0.22);
      for (const [tx, ty, rot] of [[-2.6, -1.0, 0.2], [2.4, -0.4, -0.28], [0, 2.2, 0.08]]) {
        ctx.save();
        ctx.translate(tx, ty);
        ctx.rotate(rot);
        ctx.fillStyle = '#ca8a04';
        ctx.beginPath();
        ctx.ellipse(0, 0.5, 3.6, 2.0, 0, 0, Math.PI * 2);
        ctx.fill();
        const fGrad = ctx.createRadialGradient(-1, -0.5, 0.2, 0, 0, 3.6);
        fGrad.addColorStop(0, '#ffffff');
        fGrad.addColorStop(0.75, '#fef9c3');
        fGrad.addColorStop(1, '#eab308');
        ctx.fillStyle = fGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, 3.5, 1.9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      return true;
    }

    case 'radish_bunch_fresh': {
      drawShadow(ctx, 7.0, 2.6, 7.0, 0.24);
      // Leafy crisp greens
      drawBotanicalLeaf(ctx, -1.6, -2.2, 4.8, 1.7, -2.0, '#4ade80', '#15803d');
      drawBotanicalLeaf(ctx, 0.0, -2.4, 5.4, 1.8, -1.55, '#86efac', '#166534');
      drawBotanicalLeaf(ctx, 1.6, -2.2, 4.8, 1.7, -1.1, '#4ade80', '#15803d');

      for (const [rx, ry] of [[-2.7, 1.4], [2.7, 1.4], [0, 2.6]]) {
        // White root tail
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(rx, ry + 1.8);
        ctx.quadraticCurveTo(rx + 0.3, ry + 3.1, rx - 0.1, ry + 4.0);
        ctx.stroke();

        // Crimson bulb shading blending to creamy base tip
        drawLitSphere(ctx, rx, ry, 2.15, '#fb7185', '#e11d48', '#881337', '#be123c', 0.62);
        ctx.fillStyle = 'rgba(248, 250, 252, 0.85)';
        ctx.beginPath();
        ctx.ellipse(rx, ry + 1.6, 0.95, 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      return true;
    }

    case 'onion_bulb': {
      drawShadow(ctx, 6.8, 2.7, 6.5, 0.25);
      // Root whisker tuft at bottom
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 0.4;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 0.45, 5.5);
        ctx.lineTo(i * 0.8, 6.9);
        ctx.stroke();
      }
      // Copper-golden papery onion skin
      const oGrad = ctx.createRadialGradient(-2.0, -1.2, 0.6, 0.4, 0.8, 6.8);
      oGrad.addColorStop(0.0, '#fde68a');
      oGrad.addColorStop(0.38, '#d97706');
      oGrad.addColorStop(0.82, '#92400e');
      oGrad.addColorStop(1.0, '#78350f');
      ctx.fillStyle = oGrad;
      ctx.beginPath();
      ctx.moveTo(0, -6.8);
      ctx.bezierCurveTo(1.6, -4.6, 6.2, -2.5, 5.6, 2.5);
      ctx.bezierCurveTo(4.8, 5.6, 2.0, 6.0, 0, 5.8);
      ctx.bezierCurveTo(-2.0, 6.0, -4.8, 5.6, -5.6, 2.5);
      ctx.bezierCurveTo(-6.2, -2.5, -1.6, -4.6, 0, -6.8);
      ctx.closePath();
      ctx.fill();

      // Vertical papery skin ribs converging at neck & base
      ctx.strokeStyle = 'rgba(120, 53, 15, 0.48)';
      ctx.lineWidth = 0.48;
      for (const curve of [-4.2, -2.2, 0, 2.2, 4.2]) {
        ctx.beginPath();
        ctx.moveTo(0, -6.4);
        ctx.quadraticCurveTo(curve, 0.5, 0, 5.7);
        ctx.stroke();
      }
      // Papery sheen
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.beginPath();
      ctx.ellipse(-2.0, -0.5, 0.9, 2.2, 0.25, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    case 'onion_peeled': {
      drawShadow(ctx, 6.5, 2.5, 6.2, 0.22);
      const oGrad = ctx.createRadialGradient(-2.0, -1.2, 0.5, 0.4, 0.8, 6.6);
      oGrad.addColorStop(0.0, '#ffffff');
      oGrad.addColorStop(0.55, '#fefce8');
      oGrad.addColorStop(0.9, '#fef08a');
      oGrad.addColorStop(1.0, '#d97706');
      ctx.fillStyle = oGrad;
      ctx.beginPath();
      ctx.moveTo(0, -6.2);
      ctx.bezierCurveTo(1.5, -4.2, 5.8, -2.2, 5.3, 2.2);
      ctx.bezierCurveTo(4.5, 5.2, 1.8, 5.6, 0, 5.4);
      ctx.bezierCurveTo(-1.8, 5.6, -4.5, 5.2, -5.3, 2.2);
      ctx.bezierCurveTo(-5.8, -2.2, -1.5, -4.2, 0, -6.2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(217, 119, 6, 0.24)';
      ctx.lineWidth = 0.35;
      for (const curve of [-3.4, -1.5, 1.5, 3.4]) {
        ctx.beginPath();
        ctx.moveTo(0, -5.8);
        ctx.quadraticCurveTo(curve, 0.4, 0, 5.3);
        ctx.stroke();
      }
      return true;
    }

    case 'onion_chopped': {
      drawShadow(ctx, 7.6, 2.7, 6.2, 0.2);
      const dice = [
        [-4.0, -1.8, 0.2], [-1.0, -2.6, -0.3], [2.4, -2.0, 0.4],
        [-2.8, 0.8, -0.2], [0.5, 0.5, 0.3], [3.5, 1.0, -0.4],
        [-1.8, 3.2, 0.15], [1.8, 3.0, -0.2],
      ];
      for (const [dx, dy, rot] of dice) {
        ctx.save();
        ctx.translate(dx, dy);
        ctx.rotate(rot);
        ctx.fillStyle = 'rgba(254, 249, 195, 0.92)';
        ctx.beginPath();
        ctx.roundRect(-1.2, -1.0, 2.4, 2.0, 0.3);
        ctx.fill();
        ctx.strokeStyle = 'rgba(202, 138, 4, 0.5)';
        ctx.lineWidth = 0.35;
        ctx.stroke();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.fillRect(-0.8, -0.7, 0.7, 0.5);
        ctx.restore();
      }
      return true;
    }

    case 'onion_rings': {
      drawShadow(ctx, 7.4, 2.7, 6.2, 0.22);
      for (const [ox, oy, rr] of [[-2.0, -0.8, 4.2], [2.2, 1.0, 3.7]]) {
        ctx.strokeStyle = '#ca8a04';
        ctx.lineWidth = 1.65;
        ctx.beginPath();
        ctx.arc(ox, oy + 0.35, rr, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#fefce8';
        ctx.lineWidth = 1.35;
        ctx.beginPath();
        ctx.arc(ox, oy, rr, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 0.65;
        ctx.beginPath();
        ctx.arc(ox, oy, rr - 1.1, 0, Math.PI * 2);
        ctx.stroke();
      }
      return true;
    }

    case 'leek_stalk': {
      drawShadow(ctx, 8.6, 2.4, 5.2, 0.22);
      // Root hair wisps on left
      ctx.strokeStyle = '#d6d3d1';
      ctx.lineWidth = 0.35;
      for (let y = -1.2; y <= 1.2; y += 0.6) {
        ctx.beginPath();
        ctx.moveTo(-7.2, y);
        ctx.lineTo(-8.8, y + (y * 0.4));
        ctx.stroke();
      }
      // Cylindrical white-to-green leek shaft
      const lGrad = ctx.createLinearGradient(-7.2, 0, 6.5, 0);
      lGrad.addColorStop(0.0, '#f8fafc');
      lGrad.addColorStop(0.45, '#ecfccb');
      lGrad.addColorStop(0.75, '#4ade80');
      lGrad.addColorStop(1.0, '#15803d');
      ctx.fillStyle = lGrad;
      ctx.beginPath();
      ctx.roundRect(-7.2, -1.95, 13.8, 3.9, 1.4);
      ctx.fill();
      // Cylindrical vertical cross-shading
      const vShade = ctx.createLinearGradient(0, -2, 0, 2);
      vShade.addColorStop(0, 'rgba(255,255,255,0.4)');
      vShade.addColorStop(0.55, 'rgba(255,255,255,0)');
      vShade.addColorStop(1, 'rgba(15,23,42,0.22)');
      ctx.fillStyle = vShade;
      ctx.fill();

      // Fanning folded green leaves at right
      drawBotanicalLeaf(ctx, 5.2, -0.8, 4.8, 1.25, -0.35, '#22c55e', '#14532d');
      drawBotanicalLeaf(ctx, 5.4, 0.8, 4.6, 1.25, 0.32, '#16a34a', '#14532d');
      return true;
    }

    case 'leek_sliced': {
      drawShadow(ctx, 7.2, 2.6, 5.8, 0.2);
      for (const [lx, ly, rot] of [[-3.0, -1.2, -0.2], [2.6, -1.0, 0.3], [0, 2.0, 0.05]]) {
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(rot);
        ctx.fillStyle = '#15803d';
        ctx.beginPath();
        ctx.ellipse(0, 0.35, 3.3, 2.0, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#4ade80';
        ctx.beginPath();
        ctx.ellipse(0, 0, 3.2, 1.9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f0fdf4';
        ctx.beginPath();
        ctx.ellipse(0, 0, 2.2, 1.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#86efac';
        ctx.lineWidth = 0.35;
        ctx.beginPath();
        ctx.ellipse(0, 0, 1.2, 0.7, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      return true;
    }

    case 'shallot_bulbs': {
      drawShadow(ctx, 7.0, 2.6, 6.2, 0.24);
      for (const [sx, sy, rot] of [[-2.6, 0.2, -0.22], [2.4, 0.5, 0.2]]) {
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(rot);
        const sGrad = ctx.createRadialGradient(-1.0, -1.2, 0.4, 0.2, 0.4, 5.0);
        sGrad.addColorStop(0.0, '#f59e0b');
        sGrad.addColorStop(0.42, '#b45309');
        sGrad.addColorStop(0.85, '#7c2d12');
        sGrad.addColorStop(1.0, '#451a03');
        ctx.fillStyle = sGrad;
        ctx.beginPath();
        ctx.moveTo(0, -5.2);
        ctx.bezierCurveTo(2.8, -2.8, 3.6, 2.5, 0, 4.6);
        ctx.bezierCurveTo(-3.6, 2.5, -2.8, -2.8, 0, -5.2);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(254, 215, 170, 0.28)';
        ctx.lineWidth = 0.35;
        ctx.beginPath();
        ctx.moveTo(0, -4.8);
        ctx.quadraticCurveTo(-1.4, 0, 0, 4.4);
        ctx.stroke();
        ctx.restore();
      }
      return true;
    }

    case 'garlic_bulb': {
      drawShadow(ctx, 6.8, 2.6, 6.2, 0.25);
      // Dried woody stalk tip
      ctx.fillStyle = '#d6d3d1';
      ctx.beginPath();
      ctx.moveTo(-1.0, -4.0);
      ctx.lineTo(-0.5, -6.8);
      ctx.lineTo(0.7, -6.8);
      ctx.lineTo(1.0, -4.0);
      ctx.closePath();
      ctx.fill();

      // Bulb body with subtle lavender-parchment shading
      const gGrad = ctx.createRadialGradient(-2.0, -1.2, 0.5, 0.4, 0.6, 6.4);
      gGrad.addColorStop(0.0, '#ffffff');
      gGrad.addColorStop(0.5, '#f5f5f4');
      gGrad.addColorStop(0.85, '#e7e5e4');
      gGrad.addColorStop(1.0, '#a8a29e');
      ctx.fillStyle = gGrad;
      ctx.beginPath();
      ctx.moveTo(0, -4.5);
      ctx.bezierCurveTo(3.8, -3.8, 6.2, 0.2, 4.8, 3.6);
      ctx.quadraticCurveTo(0, 5.4, -4.8, 3.6);
      ctx.bezierCurveTo(-6.2, 0.2, -3.8, -3.8, 0, -4.5);
      ctx.closePath();
      ctx.fill();

      // Ribbed clove creases + subtle lilac vein blush
      ctx.strokeStyle = 'rgba(168, 162, 158, 0.65)';
      ctx.lineWidth = 0.55;
      for (const offset of [-3.6, -1.6, 1.6, 3.6]) {
        ctx.beginPath();
        ctx.moveTo(0, -4.4);
        ctx.quadraticCurveTo(offset, 0.5, offset * 0.45, 4.4);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(192, 132, 252, 0.16)';
      ctx.beginPath();
      ctx.ellipse(-1.4, 1.2, 1.6, 2.2, 0.2, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    case 'garlic_clove': {
      drawShadow(ctx, 5.2, 2.0, 5.4, 0.2);
      const grad = ctx.createRadialGradient(-1.2, -1.2, 0.3, 0.4, 0.4, 5.0);
      grad.addColorStop(0.0, '#ffffff');
      grad.addColorStop(0.55, '#fefce8');
      grad.addColorStop(1.0, '#d6d3d1');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0.2, -4.6);
      ctx.bezierCurveTo(3.8, -2.0, 4.2, 2.8, 0.4, 4.4);
      ctx.bezierCurveTo(-1.4, 4.6, -2.6, 2.4, -1.6, -0.4);
      ctx.quadraticCurveTo(-0.8, -3.0, 0.2, -4.6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#a16207';
      ctx.fillRect(-0.2, 4.0, 1.1, 0.7);
      return true;
    }

    case 'garlic_crushed': {
      drawShadow(ctx, 6.4, 2.3, 5.2, 0.2);
      drawOrganicBlobPath(ctx, 0, 0.2, 4.8, 3.1, 108, 0.14, 12);
      const grad = ctx.createRadialGradient(-1.4, -1.0, 0.3, 0.2, 0.2, 5.2);
      grad.addColorStop(0.0, '#fffbeb');
      grad.addColorStop(0.6, '#fef3c7');
      grad.addColorStop(1.0, '#d97706');
      ctx.fillStyle = grad;
      ctx.fill();
      // Wet crushed garlic paste sheen specks
      ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.beginPath();
      ctx.ellipse(-1.4, -0.8, 1.2, 0.55, -0.25, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    case 'ginger_grated': {
      drawShadow(ctx, 6.6, 2.4, 5.4, 0.2);
      drawOrganicBlobPath(ctx, 0, 0.3, 4.9, 3.2, 109, 0.14, 12);
      const grad = ctx.createRadialGradient(-1.4, -1.0, 0.3, 0, 0.3, 5.4);
      grad.addColorStop(0.0, '#fef9c3');
      grad.addColorStop(0.55, '#fde047');
      grad.addColorStop(1.0, '#ca8a04');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = 'rgba(161, 98, 7, 0.45)';
      ctx.lineWidth = 0.38;
      for (let i = 0; i < 8; i++) {
        const sx = (hash01('ginger_grated', i * 2) - 0.5) * 6.0;
        const sy = (hash01('ginger_grated', i * 2 + 1) - 0.5) * 3.6;
        ctx.beginPath();
        ctx.moveTo(sx - 0.8, sy - 0.3);
        ctx.lineTo(sx + 0.8, sy + 0.3);
        ctx.stroke();
      }
      return true;
    }

    case 'ginger_pickled':
    case 'ginger_pickled_box': {
      drawShadow(ctx, 7.4, 2.7, 5.8, 0.24);
      // Molded matte black PP bento container
      const bGrad = ctx.createLinearGradient(-6.8, -4.6, 6.8, 4.6);
      bGrad.addColorStop(0, '#334155');
      bGrad.addColorStop(0.5, '#1e293b');
      bGrad.addColorStop(1, '#09090b');
      ctx.fillStyle = bGrad;
      ctx.beginPath();
      ctx.roundRect(-6.8, -4.6, 13.6, 9.2, 1.5);
      ctx.fill();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
      ctx.lineWidth = 0.4;
      ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(-5.8, -3.6, 11.6, 7.2, 1.0);
      ctx.fill();

      // Translucent pickled rose gari ribbons layered organically
      for (const [gx, gy, rot, col] of [
        [-2.0, -0.4, 0.32, '#fbcfe8'],
        [1.6, -0.6, -0.35, '#f9a8d4'],
        [-0.4, 0.8, 0.15, '#f472b6'],
        [2.2, 1.1, 0.45, '#fbcfe8'],
      ] as Array<[number, number, number, string]>) {
        ctx.save();
        ctx.translate(gx, gy);
        ctx.rotate(rot);
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.ellipse(0, 0, 2.8, 1.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(190, 24, 93, 0.32)';
        ctx.lineWidth = 0.3;
        ctx.stroke();
        ctx.restore();
      }

      // Clear snapped dome lid specular streak + Japanese bento seal strip
      drawGlossBand(ctx, -4.2, -4.4, 1.8, 8.8, 0.25);
      ctx.fillStyle = '#be185d';
      ctx.beginPath();
      ctx.roundRect(1.6, 1.4, 4.2, 2.4, 0.4);
      ctx.fill();
      ctx.fillStyle = '#fdf2f8';
      ctx.fillRect(2.1, 2.1, 3.2, 0.45);
      ctx.fillRect(2.1, 2.85, 2.2, 0.35);
      return true;
    }

    // =========================================================================
    // === NIGHTSHADES, SQUASHES, BRASSICAS & HERB JARS ===
    // =========================================================================
    case 'tomato_whole': {
      drawShadow(ctx, 6.6, 2.6, 6.5, 0.27);
      drawLitSphere(ctx, 0, 0.6, 5.6, '#f87171', '#dc2626', '#7f1d1d', '#b91c1c', 0.78);

      // Subtle tomato rib lobes
      ctx.strokeStyle = 'rgba(127, 29, 29, 0.22)';
      ctx.lineWidth = 0.45;
      ctx.beginPath();
      ctx.moveTo(-0.5, -4.4);
      ctx.quadraticCurveTo(-3.4, 0.2, -0.8, 5.6);
      ctx.moveTo(0.5, -4.4);
      ctx.quadraticCurveTo(3.4, 0.2, 0.8, 5.6);
      ctx.stroke();

      // 5-pointed star calyx
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = (i * Math.PI * 2) / 5 - Math.PI / 2;
        ctx.lineTo(Math.cos(a) * 3.1, -4.2 + Math.sin(a) * 1.6);
        const aMid = a + Math.PI / 5;
        ctx.lineTo(Math.cos(aMid) * 1.1, -4.2 + Math.sin(aMid) * 0.65);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#166534';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(0, -4.4);
      ctx.quadraticCurveTo(0.8, -6.2, 0.2, -7.2);
      ctx.stroke();
      return true;
    }

    case 'tomato_sliced': {
      drawShadow(ctx, 7.0, 2.7, 6.2, 0.24);
      // Outer taut skin & fleshy pericarp
      ctx.fillStyle = '#991b1b';
      ctx.beginPath();
      ctx.arc(0, 0.45, 5.7, 0, Math.PI * 2);
      ctx.fill();

      const pGrad = ctx.createRadialGradient(-1.5, -1.5, 0.5, 0, 0, 5.8);
      pGrad.addColorStop(0.0, '#f87171');
      pGrad.addColorStop(0.55, '#ef4444');
      pGrad.addColorStop(1.0, '#b91c1c');
      ctx.fillStyle = pGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
      ctx.fill();

      // Central columella core & fleshy radial septa
      ctx.fillStyle = '#fca5a5';
      ctx.beginPath();
      ctx.arc(0, 0, 1.35, 0, Math.PI * 2);
      ctx.fill();

      // 4 glistening locular chambers with seeds
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2 + Math.PI / 4;
        const lx = Math.cos(a) * 2.55;
        const ly = Math.sin(a) * 2.55;
        ctx.fillStyle = '#7f1d1d';
        ctx.beginPath();
        ctx.ellipse(lx, ly, 1.55, 1.05, a + Math.PI / 2, 0, Math.PI * 2);
        ctx.fill();

        // Gel highlight & golden seeds
        ctx.fillStyle = '#fef08a';
        for (const offset of [-0.55, 0.55]) {
          const sx = lx + Math.cos(a + Math.PI / 2) * offset;
          const sy = ly + Math.sin(a + Math.PI / 2) * offset;
          ctx.beginPath();
          ctx.ellipse(sx, sy, 0.42, 0.25, a, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.beginPath();
        ctx.arc(lx - 0.35, ly - 0.35, 0.32, 0, Math.PI * 2);
        ctx.fill();
      }
      return true;
    }

    case 'tomato_diced': {
      drawShadow(ctx, 7.4, 2.7, 6.2, 0.22);
      const dice = [
        [-3.6, -2.0], [-0.4, -2.6], [3.0, -1.8],
        [-2.2, 0.8], [1.4, 0.8], [-3.4, 3.0], [1.2, 3.0],
      ];
      for (const [tx, ty] of dice) {
        ctx.fillStyle = '#991b1b';
        ctx.beginPath();
        ctx.roundRect(tx - 1.0, ty - 0.65, 2.1, 2.0, 0.4);
        ctx.fill();
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.roundRect(tx - 1.05, ty - 1.05, 2.1, 1.75, 0.4);
        ctx.fill();
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(tx - 0.2, ty - 0.35, 0.45, 0.35);
      }
      return true;
    }

    case 'tomato_cherry_bunch': {
      drawShadow(ctx, 7.6, 2.8, 6.8, 0.25);
      ctx.strokeStyle = '#15803d';
      ctx.lineWidth = 1.15;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-6.2, -4.2);
      ctx.bezierCurveTo(-1.5, -2.2, 2.5, 0.2, 6.4, 2.2);
      ctx.stroke();

      const cherries = [
        { x: -4.2, y: -1.4 },
        { x: -1.0, y: 2.2 },
        { x: 2.4, y: -2.0 },
        { x: 4.8, y: 2.8 },
      ];
      for (const c of cherries) {
        ctx.strokeStyle = '#166534';
        ctx.lineWidth = 0.65;
        ctx.beginPath();
        ctx.moveTo(c.x, c.y - 2.2);
        ctx.lineTo(c.x * 0.85, c.y - 3.3);
        ctx.stroke();
        drawLitSphere(ctx, c.x, c.y, 2.35, '#fca5a5', '#dc2626', '#7f1d1d', '#b91c1c', 0.82);
        ctx.fillStyle = '#16a34a';
        ctx.beginPath();
        ctx.ellipse(c.x, c.y - 2.1, 0.95, 0.42, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      return true;
    }

    case 'tomato_cherry_single': {
      drawShadow(ctx, 5.4, 2.1, 6.4, 0.24);
      drawLitSphere(ctx, 0, 0.8, 4.35, '#fca5a5', '#ef4444', '#7f1d1d', '#b91c1c', 0.88);
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = (i * Math.PI * 2) / 5 - Math.PI / 2;
        ctx.lineTo(Math.cos(a) * 2.5, -3.1 + Math.sin(a) * 1.3);
        const aMid = a + Math.PI / 5;
        ctx.lineTo(Math.cos(aMid) * 0.9, -3.1 + Math.sin(aMid) * 0.6);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#15803d';
      ctx.lineWidth = 0.75;
      ctx.beginPath();
      ctx.moveTo(0, -3.2);
      ctx.quadraticCurveTo(1.2, -5.2, 0.4, -6.2);
      ctx.stroke();
      return true;
    }

    case 'tomato_cherry_sliced': {
      drawShadow(ctx, 7.4, 2.5, 6.2, 0.22);
      // Left cross-section half
      ctx.save();
      ctx.translate(-3.3, 0.4);
      ctx.fillStyle = '#991b1b';
      ctx.beginPath();
      ctx.arc(0, 0.4, 3.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(0, 0, 3.6, 0, Math.PI * 2);
      ctx.fill();
      for (const lx of [-1.25, 1.25]) {
        ctx.fillStyle = '#7f1d1d';
        ctx.beginPath();
        ctx.ellipse(lx, 0, 1.05, 1.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(lx, -0.45, 0.36, 0, Math.PI * 2);
        ctx.arc(lx, 0.5, 0.36, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // Right glossy dome half
      drawLitSphere(ctx, 3.3, 0.6, 3.55, '#fca5a5', '#ef4444', '#7f1d1d', '#b91c1c', 0.8);
      return true;
    }

    case 'sun_dried_tomatoes':
    case 'tomato_sundried_jar': {
      drawShadow(ctx, 6.0, 2.4, 7.2, 0.25);
      drawGlassJarShell(ctx, -4.6, -4.0, 9.2, 10.6, 1.7, '#d97706', '#78350f', () => {
        // Golden extra virgin herb oil
        const oGrad = ctx.createLinearGradient(-4, -3, 4, 6);
        oGrad.addColorStop(0, '#fde047');
        oGrad.addColorStop(1, '#ca8a04');
        ctx.fillStyle = oGrad;
        ctx.fillRect(-4.5, -2.6, 9, 9.5);
        // Dark chewy sun-dried tomato halves
        for (const [tx, ty, rot] of [[-1.6, -0.2, 0.3], [1.4, 1.2, -0.4], [-0.4, 3.6, 0.1]]) {
          ctx.save();
          ctx.translate(tx, ty);
          ctx.rotate(rot);
          ctx.fillStyle = '#7f1d1d';
          ctx.beginPath();
          ctx.ellipse(0, 0, 2.2, 1.25, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#991b1b';
          ctx.lineWidth = 0.4;
          ctx.stroke();
          ctx.restore();
        }
        // Italian herb flecks
        ctx.fillStyle = '#365314';
        ctx.fillRect(-2.4, 2.2, 0.8, 0.4);
        ctx.fillRect(1.6, -1.2, 0.7, 0.5);
      });
      drawStudioLabelPanel(ctx, -3.7, 2.1, 7.4, 3.5, {
        paperColor: '#fdfbf7',
        bandColor: '#7f1d1d',
        accentColor: '#ca8a04',
        inkColor: '#450a0a',
        goldFoil: true,
        hasBarcode: true,
        emblem: 'leaf',
        cylindrical: true
      });
      return true;
    }

    case 'tomato_paste':
    case 'tomato_paste_jar': {
      drawShadow(ctx, 6.0, 2.4, 7.2, 0.25);
      drawGlassJarShell(ctx, -4.6, -4.0, 9.2, 10.6, 1.7, '#dc2626', '#7f1d1d', () => {
        const pGrad = ctx.createLinearGradient(-4, -3, 4, 6);
        pGrad.addColorStop(0, '#b91c1c');
        pGrad.addColorStop(0.5, '#991b1b');
        pGrad.addColorStop(1, '#450a0a');
        ctx.fillStyle = pGrad;
        ctx.fillRect(-4.5, -2.5, 9, 9.5);
      });
      drawStudioLabelPanel(ctx, -3.9, -0.4, 7.8, 4.8, {
        paperColor: '#fffbeb',
        bandColor: '#dc2626',
        accentColor: '#15803d',
        inkColor: '#7f1d1d',
        goldFoil: false,
        hasBarcode: true,
        emblem: 'none',
        cylindrical: true
      });
      drawLitSphere(ctx, 0, 2.0, 1.1, '#f87171', '#dc2626', '#7f1d1d', undefined, 0.55);
      ctx.fillStyle = '#15803d';
      ctx.fillRect(-0.4, 0.85, 0.8, 0.4);
      return true;
    }

    case 'cucumber_whole': {
      drawShadow(ctx, 7.8, 2.4, 4.8, 0.22);
      const cGrad = ctx.createLinearGradient(0, -3.0, 0, 3.0);
      cGrad.addColorStop(0.0, '#4ade80');
      cGrad.addColorStop(0.32, '#16a34a');
      cGrad.addColorStop(0.75, '#15803d');
      cGrad.addColorStop(1.0, '#052e16');
      ctx.fillStyle = cGrad;
      ctx.beginPath();
      ctx.roundRect(-7.4, -2.4, 14.8, 4.8, 2.4);
      ctx.fill();

      // Lighter pale-green longitudinal stripes & raised warts
      ctx.strokeStyle = 'rgba(187, 247, 208, 0.35)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(-5.8, -1.1);
      ctx.lineTo(5.8, -1.1);
      ctx.moveTo(-5.4, 0.4);
      ctx.lineTo(5.4, 0.4);
      ctx.stroke();

      for (const [bx, by] of [[-4.8, -0.9], [-2.2, 0.8], [0.4, -1.1], [2.8, 0.7], [5.0, -0.6]]) {
        ctx.fillStyle = '#14532d';
        ctx.beginPath();
        ctx.arc(bx + 0.15, by + 0.15, 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#86efac';
        ctx.beginPath();
        ctx.arc(bx, by, 0.38, 0, Math.PI * 2);
        ctx.fill();
      }
      // Stem nub on left
      ctx.fillStyle = '#65a30d';
      ctx.fillRect(-8.0, -0.5, 0.9, 1.0);
      return true;
    }

    case 'cucumber_peeled': {
      drawShadow(ctx, 7.6, 2.3, 4.6, 0.2);
      const grad = ctx.createLinearGradient(0, -2.4, 0, 2.4);
      grad.addColorStop(0.0, '#f0fdf4');
      grad.addColorStop(0.38, '#bbf7d0');
      grad.addColorStop(0.85, '#86efac');
      grad.addColorStop(1.0, '#16a34a');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(-6.8, -2.1, 13.6, 4.2, 1.8);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.beginPath();
      ctx.ellipse(-0.5, -0.95, 4.5, 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    case 'cucumber_sliced': {
      drawShadow(ctx, 7.4, 2.6, 6.0, 0.22);
      for (const [cx, cy] of [[-2.4, -0.7], [2.2, 1.0]]) {
        ctx.fillStyle = '#14532d';
        ctx.beginPath();
        ctx.arc(cx, cy + 0.45, 4.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#16a34a';
        ctx.beginPath();
        ctx.arc(cx, cy, 4.4, 0, Math.PI * 2);
        ctx.fill();

        const fGrad = ctx.createRadialGradient(cx, cy, 0.4, cx, cy, 3.8);
        fGrad.addColorStop(0.0, '#f0fdf4');
        fGrad.addColorStop(0.55, '#dcfce7');
        fGrad.addColorStop(1.0, '#86efac');
        ctx.fillStyle = fGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, 3.7, 0, Math.PI * 2);
        ctx.fill();

        // Triangular central seed pockets
        ctx.fillStyle = 'rgba(134, 239, 172, 0.6)';
        ctx.beginPath();
        ctx.arc(cx, cy, 2.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fef9c3';
        for (let i = 0; i < 6; i++) {
          const a = (i * Math.PI) / 3;
          ctx.beginPath();
          ctx.ellipse(cx + Math.cos(a) * 1.4, cy + Math.sin(a) * 1.4, 0.48, 0.24, a, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      return true;
    }

    case 'cucumber_pickled':
    case 'cucumber_pickled_jar': {
      drawShadow(ctx, 6.6, 2.6, 7.6, 0.25);
      drawGlassJarShell(ctx, -5.0, -4.0, 10.0, 11.0, 1.9, '#eab308', '#854d0e', () => {
        // Cloudy garlic-dill brine
        const bGrad = ctx.createLinearGradient(-4, -3, 4, 6);
        bGrad.addColorStop(0, 'rgba(217, 249, 157, 0.65)');
        bGrad.addColorStop(1, 'rgba(101, 163, 13, 0.72)');
        ctx.fillStyle = bGrad;
        ctx.fillRect(-5, -2.5, 10, 10);

        // Pickled gherkins
        for (const [px, py, rot] of [[-1.9, 1.6, 0.25], [1.8, 2.0, -0.22], [0, 2.2, 0.05]]) {
          ctx.save();
          ctx.translate(px, py);
          ctx.rotate(rot);
          const pg = ctx.createLinearGradient(-1.8, 0, 1.8, 0);
          pg.addColorStop(0, '#65a30d');
          pg.addColorStop(0.5, '#4d7c0f');
          pg.addColorStop(1, '#365314');
          ctx.fillStyle = pg;
          ctx.beginPath();
          ctx.ellipse(0, 0, 1.7, 3.8, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        // Dill umbel & mustard seeds in brine
        ctx.fillStyle = '#15803d';
        ctx.fillRect(-2.8, -1.2, 2.6, 0.5);
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(-1.8, 4.8, 0.45, 0, Math.PI * 2);
        ctx.arc(1.2, 5.2, 0.45, 0, Math.PI * 2);
        ctx.fill();
      });
      drawStudioLabelPanel(ctx, -4.4, 2.2, 8.8, 3.8, {
        paperColor: '#fef9e7',
        bandColor: '#365314',
        accentColor: '#ca8a04',
        inkColor: '#1e293b',
        goldFoil: false,
        hasBarcode: true,
        emblem: 'none',
        cylindrical: true
      });
      return true;
    }

    case 'eggplant_whole': {
      drawShadow(ctx, 7.6, 2.8, 6.2, 0.26);
      // Curved glossy aubergine silhouette
      const eGrad = ctx.createRadialGradient(-2.0, -1.8, 0.8, 0.8, 1.0, 7.8);
      eGrad.addColorStop(0.0, '#a855f7');
      eGrad.addColorStop(0.32, '#581c87');
      eGrad.addColorStop(0.75, '#3b0764');
      eGrad.addColorStop(1.0, '#1e0338');
      ctx.fillStyle = eGrad;
      ctx.beginPath();
      ctx.moveTo(-6.2, -1.4);
      ctx.bezierCurveTo(-2.5, -4.4, 5.8, -4.2, 7.2, 0.6);
      ctx.bezierCurveTo(7.4, 4.6, 0.4, 5.0, -5.8, 1.4);
      ctx.quadraticCurveTo(-7.0, 0, -6.2, -1.4);
      ctx.closePath();
      ctx.fill();

      // Studio lacquered gloss highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.beginPath();
      ctx.ellipse(-0.4, -1.8, 3.6, 0.72, 0.08, 0, Math.PI * 2);
      ctx.fill();

      // Ribbed green calyx cap + curved stem
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.moveTo(-6.6, -1.8);
      ctx.lineTo(-4.0, -2.5);
      ctx.lineTo(-4.6, -0.5);
      ctx.lineTo(-3.6, 0.8);
      ctx.lineTo(-4.8, 1.8);
      ctx.lineTo(-6.6, 1.0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#166534';
      ctx.lineWidth = 1.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-6.6, -0.4);
      ctx.quadraticCurveTo(-8.2, -1.5, -8.8, -2.8);
      ctx.stroke();
      return true;
    }

    case 'eggplant_sliced': {
      drawShadow(ctx, 7.4, 2.7, 6.0, 0.22);
      for (const [ex, ey] of [[-2.4, -0.6], [2.2, 1.0]]) {
        ctx.fillStyle = '#3b0764';
        ctx.beginPath();
        ctx.arc(ex, ey + 0.4, 4.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#581c87';
        ctx.beginPath();
        ctx.arc(ex, ey, 4.4, 0, Math.PI * 2);
        ctx.fill();

        const fGrad = ctx.createRadialGradient(ex - 1, ey - 1, 0.3, ex, ey, 3.8);
        fGrad.addColorStop(0.0, '#fffbeb');
        fGrad.addColorStop(0.7, '#fef3c7');
        fGrad.addColorStop(1.0, '#d9f99d');
        ctx.fillStyle = fGrad;
        ctx.beginPath();
        ctx.arc(ex, ey, 3.7, 0, Math.PI * 2);
        ctx.fill();

        // Faint brownish seed arcs
        ctx.fillStyle = 'rgba(146, 64, 14, 0.38)';
        for (let i = 0; i < 6; i++) {
          const a = (i * Math.PI) / 3;
          ctx.beginPath();
          ctx.arc(ex + Math.cos(a) * 1.8, ey + Math.sin(a) * 1.8, 0.32, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      return true;
    }

    case 'zucchini_whole': {
      drawShadow(ctx, 8.0, 2.5, 5.0, 0.24);
      const zGrad = ctx.createLinearGradient(0, -3.0, 0, 3.0);
      zGrad.addColorStop(0.0, '#4ade80');
      zGrad.addColorStop(0.3, '#15803d');
      zGrad.addColorStop(0.8, '#14532d');
      zGrad.addColorStop(1.0, '#052e16');
      ctx.fillStyle = zGrad;
      ctx.beginPath();
      ctx.roundRect(-7.5, -2.7, 15.0, 5.4, 2.7);
      ctx.fill();

      // Mottled courgette flecks
      ctx.fillStyle = 'rgba(134, 239, 172, 0.38)';
      for (let i = 0; i < 16; i++) {
        const fx = -5.6 + hash01('zucchini', i * 2) * 11.2;
        const fy = -1.6 + hash01('zucchini', i * 2 + 1) * 3.2;
        ctx.beginPath();
        ctx.ellipse(fx, fy, 0.55, 0.25, 0.1, 0, Math.PI * 2);
        ctx.fill();
      }
      // Woody pentagonal peduncle stem
      ctx.fillStyle = '#3f6212';
      ctx.fillRect(-8.4, -0.8, 1.2, 1.6);
      return true;
    }

    case 'zucchini_sliced': {
      drawShadow(ctx, 7.2, 2.6, 6.0, 0.22);
      for (const [zx, zy] of [[-2.4, -0.6], [2.2, 1.0]]) {
        ctx.fillStyle = '#14532d';
        ctx.beginPath();
        ctx.arc(zx, zy + 0.4, 4.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#15803d';
        ctx.beginPath();
        ctx.arc(zx, zy, 4.4, 0, Math.PI * 2);
        ctx.fill();
        const fGrad = ctx.createRadialGradient(zx - 0.8, zy - 0.8, 0.2, zx, zy, 3.8);
        fGrad.addColorStop(0, '#ffffff');
        fGrad.addColorStop(0.75, '#f0fdf4');
        fGrad.addColorStop(1, '#bbf7d0');
        ctx.fillStyle = fGrad;
        ctx.beginPath();
        ctx.arc(zx, zy, 3.7, 0, Math.PI * 2);
        ctx.fill();
      }
      return true;
    }

    case 'pumpkin_whole': {
      drawShadow(ctx, 8.6, 3.3, 7.2, 0.28);
      // Ribbed segmented gourd lobes
      const lobes: Array<[number, number, number, string, string]> = [
        [-4.2, 0.8, 3.4, '#ea580c', '#9a3412'],
        [4.2, 0.8, 3.4, '#ea580c', '#9a3412'],
        [-2.2, 1.0, 3.6, '#f97316', '#c2410c'],
        [2.2, 1.0, 3.6, '#f97316', '#c2410c'],
        [0, 1.1, 3.6, '#fb923c', '#c2410c'],
      ];
      for (const [lx, ly, rx, lightC, darkC] of lobes) {
        drawLitEllipse(ctx, lx, ly, rx, 5.8, 0, lightC, '#ea580c', darkC, undefined, 0.25);
        ctx.strokeStyle = 'rgba(124, 45, 18, 0.45)';
        ctx.lineWidth = 0.55;
        ctx.beginPath();
        ctx.ellipse(lx, ly, rx, 5.8, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Woody ribbed curved stem
      const stGrad = ctx.createLinearGradient(-1.5, -7.8, 1.5, -4.0);
      stGrad.addColorStop(0, '#4d7c0f');
      stGrad.addColorStop(0.5, '#78350f');
      stGrad.addColorStop(1, '#451a03');
      ctx.fillStyle = stGrad;
      ctx.beginPath();
      ctx.moveTo(-1.3, -4.4);
      ctx.quadraticCurveTo(-1.1, -6.8, -0.3, -7.8);
      ctx.lineTo(1.6, -7.4);
      ctx.quadraticCurveTo(1.2, -5.8, 1.5, -4.4);
      ctx.closePath();
      ctx.fill();
      return true;
    }

    case 'pumpkin_cut': {
      drawShadow(ctx, 7.6, 2.8, 6.2, 0.25);
      // Outer orange-green skin rind arc
      ctx.fillStyle = '#c2410c';
      ctx.beginPath();
      ctx.arc(0, -1.2, 6.8, 0.08, Math.PI - 0.08);
      ctx.closePath();
      ctx.fill();

      // Thick fibrous golden-orange pumpkin flesh
      const pGrad = ctx.createRadialGradient(-1.5, 0.5, 0.5, 0, 0.5, 6.4);
      pGrad.addColorStop(0.0, '#fdba74');
      pGrad.addColorStop(0.6, '#f97316');
      pGrad.addColorStop(1.0, '#ea580c');
      ctx.fillStyle = pGrad;
      ctx.beginPath();
      ctx.arc(0, -1.2, 6.1, 0.12, Math.PI - 0.12);
      ctx.closePath();
      ctx.fill();

      // Stringy inner seed hollow + pale pumpkin seeds
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.arc(0, -1.2, 2.6, 0.15, Math.PI - 0.15);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fef3c7';
      for (const [sx, sy, rot] of [[-1.0, -0.2, 0.3], [0.8, 0.1, -0.25], [0, 0.6, 0.1]]) {
        ctx.beginPath();
        ctx.ellipse(sx, sy, 0.65, 0.35, rot, 0, Math.PI * 2);
        ctx.fill();
      }
      return true;
    }

    case 'pumpkin_diced': {
      drawShadow(ctx, 7.4, 2.7, 6.2, 0.22);
      const cubes = [
        [-3.6, -2.0], [-0.4, -2.6], [3.0, -1.6],
        [-2.2, 0.6], [1.4, 0.8], [-3.4, 2.8], [0.8, 3.0],
      ];
      for (const [cx, cy] of cubes) {
        ctx.fillStyle = '#c2410c';
        ctx.beginPath();
        ctx.roundRect(cx - 1.1, cy - 0.6, 2.3, 2.1, 0.35);
        ctx.fill();
        ctx.fillStyle = '#fb923c';
        ctx.beginPath();
        ctx.roundRect(cx - 1.15, cy - 1.1, 2.3, 1.75, 0.35);
        ctx.fill();
      }
      return true;
    }

    case 'pumpkin_seeds':
    case 'pumpkin_seeds_bag': {
      drawShadow(ctx, 6.6, 2.5, 6.8, 0.22);

      // Stand-up kraft paper & clear window seed pouch
      const kGrad = ctx.createLinearGradient(-5.4, -6.2, 5.4, 6.4);
      kGrad.addColorStop(0.0, '#d6b68a');
      kGrad.addColorStop(0.55, '#b6895b');
      kGrad.addColorStop(1.0, '#855830');
      ctx.fillStyle = kGrad;
      ctx.beginPath();
      ctx.roundRect(-5.2, -5.6, 10.4, 11.4, 1.2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(69, 26, 3, 0.45)';
      ctx.lineWidth = 0.35;
      ctx.stroke();

      drawCrimpedSeal(ctx, -5.2, -6.4, 10.4, 1.1, '#a3774c', true, 0.8);

      // Clear window showing roasted pepitas
      drawFilmWindow(
        ctx,
        () => {
          ctx.beginPath();
          ctx.roundRect(-3.8, -1.2, 7.6, 5.4, 1.2);
        },
        () => {
          for (const [sx, sy, rot] of [[-1.6, 0.2, 0.4], [1.4, 0.5, -0.3], [-1.0, 2.5, -0.5], [1.5, 2.8, 0.25], [0, 1.4, 0.1]]) {
            ctx.save();
            ctx.translate(sx, sy);
            ctx.rotate(rot);
            ctx.fillStyle = '#4d7c0f';
            ctx.beginPath();
            ctx.ellipse(0, 0, 1.35, 0.78, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fef9c3';
            ctx.beginPath();
            ctx.ellipse(0, 0, 1.05, 0.52, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        },
        'rgba(255, 251, 235, 0.65)',
        '#365314'
      );

      // Header botanical strip + micro-barcode
      drawStudioLabelPanel(ctx, -4.4, -4.8, 8.8, 3.1, {
        paperColor: '#f7f4ec',
        bandColor: '#365314',
        accentColor: '#ca8a04',
        inkColor: '#365314',
        goldFoil: false,
        hasBarcode: true,
        emblem: 'leaf',
        cylindrical: false
      });

      drawPouchCrinkles(ctx, -4.6, -5.0, 9.2, 10.2, 51, 0.18);
      return true;
    }

    case 'cabbage_white_head': {
      drawShadow(ctx, 8.2, 3.0, 6.8, 0.27);
      drawLitSphere(ctx, 0, 0, 6.4, '#f0fdf4', '#bbf7d0', '#16a34a', '#4ade80', 0.25);

      // Overlapping cupped cabbage leaves + prominent pale midrib veins
      ctx.strokeStyle = '#15803d';
      ctx.lineWidth = 0.65;
      ctx.beginPath();
      ctx.arc(-2.6, 0.2, 4.8, -0.45 * Math.PI, 0.42 * Math.PI);
      ctx.moveTo(2.4, -4.6);
      ctx.bezierCurveTo(-0.5, -1.8, -0.2, 2.5, 3.8, 4.8);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
      ctx.lineWidth = 0.65;
      ctx.beginPath();
      ctx.moveTo(-4.8, 1.5);
      ctx.quadraticCurveTo(-2.5, 0.2, -0.8, -2.2);
      ctx.moveTo(4.2, -1.8);
      ctx.quadraticCurveTo(2.2, 0.5, 1.2, 3.2);
      ctx.stroke();
      return true;
    }

    case 'cabbage_half': {
      drawShadow(ctx, 7.8, 2.7, 5.8, 0.24);
      // Outer dark leaf skin
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.arc(0, 1.2, 6.2, Math.PI, 0);
      ctx.closePath();
      ctx.fill();

      // Pale creamy-lime cut cross-section
      const cGrad = ctx.createRadialGradient(0, 1.0, 0.4, 0, 1.0, 5.8);
      cGrad.addColorStop(0.0, '#ffffff');
      cGrad.addColorStop(0.55, '#ecfccb');
      cGrad.addColorStop(1.0, '#86efac');
      ctx.fillStyle = cGrad;
      ctx.beginPath();
      ctx.arc(0, 1.2, 5.7, Math.PI, 0);
      ctx.closePath();
      ctx.fill();

      // Layered concentric folded leaf whorls + central triangular core
      ctx.strokeStyle = 'rgba(132, 204, 22, 0.55)';
      ctx.lineWidth = 0.55;
      for (const rr of [4.6, 3.4, 2.2]) {
        ctx.beginPath();
        ctx.arc(0, 1.2, rr, Math.PI + 0.12, -0.12);
        ctx.stroke();
      }
      ctx.fillStyle = '#fef9c3';
      ctx.beginPath();
      ctx.moveTo(-1.1, 1.2);
      ctx.lineTo(0, -1.8);
      ctx.lineTo(1.1, 1.2);
      ctx.closePath();
      ctx.fill();
      return true;
    }

    case 'cabbage_leaves': {
      drawShadow(ctx, 7.6, 2.6, 5.8, 0.2);
      drawOrganicBlobPath(ctx, 0, 0, 6.6, 4.6, 121, 0.12, 12);
      const lGrad = ctx.createRadialGradient(-2, -1.5, 0.4, 0, 0, 6.8);
      lGrad.addColorStop(0, '#bbf7d0');
      lGrad.addColorStop(0.5, '#4ade80');
      lGrad.addColorStop(1, '#15803d');
      ctx.fillStyle = lGrad;
      ctx.fill();
      ctx.strokeStyle = 'rgba(240, 253, 244, 0.78)';
      ctx.lineWidth = 0.65;
      ctx.beginPath();
      ctx.moveTo(-5.2, 2.2);
      ctx.quadraticCurveTo(0, 0, 5.2, -2.0);
      ctx.moveTo(-1.0, 0.3);
      ctx.lineTo(-2.6, -2.4);
      ctx.moveTo(1.0, -0.4);
      ctx.lineTo(2.4, 2.2);
      ctx.stroke();
      return true;
    }

    case 'cabbage_shredded': {
      drawShadow(ctx, 7.6, 2.8, 6.2, 0.2);
      for (let i = 0; i < 20; i++) {
        const px = (hash01('cabbage_shred', i * 3) - 0.5) * 8.5;
        const py = (hash01('cabbage_shred', i * 3 + 1) - 0.5) * 6.0;
        const ang = (hash01('cabbage_shred', i * 3 + 2) - 0.5) * 2.2;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(ang);
        ctx.strokeStyle = i % 3 === 0 ? '#ffffff' : i % 3 === 1 ? '#bbf7d0' : '#86efac';
        ctx.lineWidth = 0.9;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-2.6, 0);
        ctx.quadraticCurveTo(0, -0.7, 2.6, 0.2);
        ctx.stroke();
        ctx.restore();
      }
      return true;
    }

    case 'cabbage_sauerkraut':
    case 'cabbage_sauerkraut_jar': {
      drawShadow(ctx, 6.6, 2.6, 7.6, 0.25);
      drawGlassJarShell(ctx, -5.0, -4.0, 10.0, 11.0, 1.9, '#eab308', '#854d0e', () => {
        ctx.fillStyle = '#fef9c3';
        ctx.fillRect(-5, -2.4, 10, 9.5);
        // Shredded cabbage strands + carrot slivers + cranberries
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 0.65;
        for (let y = -1.6; y <= 5.5; y += 1.4) {
          ctx.beginPath();
          ctx.moveTo(-4, y);
          ctx.bezierCurveTo(-1, y - 0.8, 1, y + 0.8, 4, y);
          ctx.stroke();
        }
        ctx.fillStyle = '#f97316';
        for (const [cx, cy, rot] of [[-2.2, -0.5, 0.3], [1.8, 1.2, -0.4], [-1.0, 3.6, 0.1]]) {
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(rot);
          ctx.fillRect(-1.1, -0.35, 2.2, 0.7);
          ctx.restore();
        }
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc(1.5, 3.8, 0.75, 0, Math.PI * 2);
        ctx.fill();
      });
      drawStudioLabelPanel(ctx, -4.4, 2.2, 8.8, 3.8, {
        paperColor: '#fef9e7',
        bandColor: '#b45309',
        accentColor: '#ca8a04',
        inkColor: '#1e293b',
        goldFoil: false,
        hasBarcode: true,
        emblem: 'none',
        cylindrical: true
      });
      return true;
    }

    case 'cauliflower_head': {
      drawShadow(ctx, 8.0, 3.1, 7.0, 0.26);
      // Outer cradling green jacket leaves
      drawBotanicalLeaf(ctx, -1.5, 4.5, 6.8, 2.6, -2.4, '#4ade80', '#14532d');
      drawBotanicalLeaf(ctx, 1.5, 4.5, 6.8, 2.6, -0.75, '#22c55e', '#14532d');
      drawBotanicalLeaf(ctx, 0, 5.2, 6.2, 2.8, -1.57, '#86efac', '#15803d');

      // Sculpted curd dome from overlapping creamy florets
      const curds: Array<[number, number, number]> = [
        [-2.8, -1.6, 2.2], [2.6, -1.4, 2.2], [0, -2.8, 2.5],
        [-3.4, 1.0, 2.0], [3.4, 1.0, 2.0], [-1.2, 0.2, 2.4], [1.4, 0.4, 2.3], [0, 1.8, 2.1],
      ];
      for (const [cx, cy, r] of curds) {
        drawLitSphere(ctx, cx, cy, r, '#ffffff', '#fefce8', '#d6d3d1', '#fef3c7', 0.2);
      }
      return true;
    }

    case 'cauliflower_florets': {
      drawShadow(ctx, 7.2, 2.6, 6.0, 0.2);
      for (const [fx, fy, sc] of [[-2.8, 0.2, 1.0], [2.4, 0.7, 0.92]]) {
        ctx.save();
        ctx.translate(fx, fy);
        ctx.scale(sc, sc);
        const sGrad = ctx.createLinearGradient(-1, 0, 1, 3.5);
        sGrad.addColorStop(0, '#ecfccb');
        sGrad.addColorStop(1, '#a3e635');
        ctx.fillStyle = sGrad;
        ctx.beginPath();
        ctx.roundRect(-1.0, 0.6, 2.0, 3.0, 0.6);
        ctx.fill();
        drawLitSphere(ctx, -1.2, -1.0, 1.8, '#ffffff', '#fefce8', '#d6d3d1', undefined, 0.15);
        drawLitSphere(ctx, 1.2, -0.8, 1.7, '#ffffff', '#fefce8', '#d6d3d1', undefined, 0.15);
        drawLitSphere(ctx, 0, -2.0, 1.9, '#ffffff', '#fefce8', '#d6d3d1', undefined, 0.18);
        ctx.restore();
      }
      return true;
    }

    case 'broccoli_florets':
    case 'broccoli_head': {
      const isHead = itemId === 'broccoli_head';
      drawShadow(ctx, isHead ? 7.6 : 7.0, 2.8, 6.8, 0.26);
      // Crisp celadon-green stalk & branching stems
      const stGrad = ctx.createLinearGradient(-2.0, 0, 2.2, 6);
      stGrad.addColorStop(0, '#bbf7d0');
      stGrad.addColorStop(0.55, '#4ade80');
      stGrad.addColorStop(1, '#15803d');
      ctx.fillStyle = stGrad;
      ctx.beginPath();
      ctx.moveTo(-2.1, 0.2);
      ctx.lineTo(-1.5, 6.2);
      ctx.quadraticCurveTo(0, 6.7, 1.5, 6.2);
      ctx.lineTo(2.1, 0.2);
      ctx.closePath();
      ctx.fill();

      // Pebbled broccoli buds canopy
      const buds: Array<[number, number, number]> = isHead
        ? [[-3.4, -1.2, 2.6], [3.4, -1.2, 2.6], [-1.8, -3.4, 2.8], [1.8, -3.4, 2.8], [0, -1.8, 3.2]]
        : [[-2.4, -1.2, 2.3], [2.4, -1.0, 2.2], [0, -2.8, 2.6]];
      for (const [bx, by, br] of buds) {
        drawLitSphere(ctx, bx, by, br, '#22c55e', '#15803d', '#052e16', '#166534', 0.12);
        // Micro-floret bead stippling
        ctx.fillStyle = 'rgba(134, 239, 172, 0.35)';
        for (let i = 0; i < 6; i++) {
          const sx = bx + (hash01(itemId, i * 2 + bx) - 0.5) * br * 1.1;
          const sy = by + (hash01(itemId, i * 2 + 1 + by) - 0.5) * br * 1.1;
          ctx.beginPath();
          ctx.arc(sx, sy, 0.34, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      return true;
    }

    case 'bell_pepper_red':
    case 'bell_pepper_yellow': {
      drawShadow(ctx, 7.0, 2.8, 6.8, 0.26);
      const isYellow = itemId === 'bell_pepper_yellow';
      const lightC = isYellow ? '#fef08a' : '#f87171';
      const midC = isYellow ? '#eab308' : '#dc2626';
      const darkC = isYellow ? '#a16207' : '#7f1d1d';

      // Three 3D lobes with deep glossy valleys
      drawLitEllipse(ctx, -2.9, 0.6, 2.5, 4.9, -0.05, lightC, midC, darkC, undefined, 0.4);
      drawLitEllipse(ctx, 2.9, 0.6, 2.5, 4.9, 0.05, lightC, midC, darkC, undefined, 0.32);
      drawLitEllipse(ctx, 0, 0.8, 2.7, 5.2, 0, lightC, midC, darkC, undefined, 0.72);

      // Thick green curved stem cap
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.ellipse(0, -4.1, 1.8, 0.85, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#166534';
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, -4.2);
      ctx.quadraticCurveTo(0.8, -6.2, 1.8, -6.8);
      ctx.stroke();
      return true;
    }

    case 'bell_pepper_sliced': {
      drawShadow(ctx, 7.2, 2.6, 5.8, 0.2);
      // Glossy arched pepper strips
      for (const [px, py, rot, cLight, cDark] of [
        [-2.0, -0.4, -0.35, '#fca5a5', '#b91c1c'],
        [1.8, 0.6, 0.45, '#fef08a', '#ca8a04'],
      ] as Array<[number, number, number, string, string]>) {
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(rot);
        ctx.strokeStyle = cDark;
        ctx.lineWidth = 2.0;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(0, 0, 3.8, 0.15, Math.PI * 0.85);
        ctx.stroke();
        ctx.strokeStyle = cLight;
        ctx.lineWidth = 1.1;
        ctx.stroke();
        ctx.restore();
      }
      return true;
    }

    case 'chili_pepper_fresh': {
      drawShadow(ctx, 7.4, 2.4, 5.4, 0.22);
      const grad = ctx.createLinearGradient(-5, -4, 6, 4);
      grad.addColorStop(0.0, '#f87171');
      grad.addColorStop(0.45, '#dc2626');
      grad.addColorStop(1.0, '#7f1d1d');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(-5.8, -2.8);
      ctx.bezierCurveTo(-4.2, -4.2, -1.5, -0.4, 6.8, 2.2);
      ctx.quadraticCurveTo(7.4, 2.6, 6.4, 2.9);
      ctx.bezierCurveTo(-1.2, 2.5, -5.2, 1.2, -5.8, -2.8);
      ctx.closePath();
      ctx.fill();

      // Gloss reflection curve
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.62)';
      ctx.lineWidth = 0.65;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-3.8, -1.9);
      ctx.quadraticCurveTo(0, 0.2, 3.5, 1.4);
      ctx.stroke();

      // Green calyx + hooked stem
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.ellipse(-5.6, -2.2, 1.4, 1.15, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#166534';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(-6.2, -2.8);
      ctx.quadraticCurveTo(-7.6, -4.4, -7.2, -5.6);
      ctx.stroke();
      return true;
    }

    case 'chili_pepper_sliced': {
      drawShadow(ctx, 6.8, 2.4, 5.6, 0.2);
      for (const [cx, cy] of [[-2.8, -0.8], [2.4, 1.0]]) {
        ctx.fillStyle = '#991b1b';
        ctx.beginPath();
        ctx.arc(cx, cy + 0.35, 3.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc(cx, cy, 3.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fef2f2';
        ctx.beginPath();
        ctx.arc(cx, cy, 1.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(cx - 0.5, cy - 0.2, 0.5, 0, Math.PI * 2);
        ctx.arc(cx + 0.5, cy + 0.3, 0.45, 0, Math.PI * 2);
        ctx.fill();
      }
      return true;
    }

    case 'chili_pepper_dried': {
      drawShadow(ctx, 7.2, 2.3, 5.0, 0.2);
      const dGrad = ctx.createLinearGradient(-6, -2, 7, 3);
      dGrad.addColorStop(0, '#9f1239');
      dGrad.addColorStop(0.5, '#7f1d1d');
      dGrad.addColorStop(1, '#450a0a');
      ctx.fillStyle = dGrad;
      ctx.beginPath();
      ctx.moveTo(-6.0, -1.6);
      ctx.bezierCurveTo(-1.8, -0.2, 2.5, 2.4, 7.0, -1.8);
      ctx.bezierCurveTo(2.4, 0.8, -2.0, -2.0, -6.0, -1.6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#65a30d';
      ctx.fillRect(-6.8, -2.0, 1.2, 0.9);
      return true;
    }

    case 'jalapeno_pickled':
    case 'jalapeno_pickled_jar': {
      drawShadow(ctx, 6.2, 2.5, 7.2, 0.24);
      drawGlassJarShell(ctx, -4.6, -4.0, 9.2, 10.6, 1.7, '#ca8a04', '#713f12', () => {
        ctx.fillStyle = 'rgba(190, 242, 100, 0.48)';
        ctx.fillRect(-4.5, -2.5, 9, 9.5);
        for (const [jx, jy] of [[-1.4, 0.5], [1.6, 1.8], [-0.4, 4.0]]) {
          ctx.strokeStyle = '#3f6212';
          ctx.lineWidth = 1.45;
          ctx.beginPath();
          ctx.arc(jx, jy, 1.8, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.arc(jx, jy, 0.45, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      drawStudioLabelPanel(ctx, -4.0, 2.0, 8.0, 3.6, {
        paperColor: '#fef9e7',
        bandColor: '#3f6212',
        accentColor: '#dc2626',
        inkColor: '#1e293b',
        goldFoil: false,
        hasBarcode: true,
        emblem: 'none',
        cylindrical: true
      });
      return true;
    }

    case 'greens_chopped_mix': {
      drawShadow(ctx, 7.6, 2.7, 6.0, 0.2);
      for (let i = 0; i < 24; i++) {
        const px = (hash01('greens_mix', i * 3) - 0.5) * 9.0;
        const py = (hash01('greens_mix', i * 3 + 1) - 0.5) * 6.2;
        const ang = hash01('greens_mix', i * 3 + 2) * Math.PI;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(ang);
        ctx.fillStyle = i % 3 === 0 ? '#15803d' : i % 3 === 1 ? '#22c55e' : '#86efac';
        ctx.beginPath();
        ctx.ellipse(0, 0, 1.35, 0.65, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      return true;
    }

    case 'vegetable_mix_frozen':
    case 'berries_mixed_frozen': {
      const isVeg = itemId === 'vegetable_mix_frozen';
      drawShadow(ctx, 7.4, 2.8, 7.2, 0.24);
      const pGrad = ctx.createLinearGradient(-6, -6, 6, 6);
      pGrad.addColorStop(0.0, isVeg ? '#15803d' : '#9f1239');
      pGrad.addColorStop(0.55, isVeg ? '#166534' : '#881337');
      pGrad.addColorStop(1.0, isVeg ? '#052e16' : '#4c0519');
      ctx.fillStyle = pGrad;
      ctx.beginPath();
      ctx.roundRect(-6.0, -6.2, 12.0, 12.4, 1.4);
      ctx.fill();

      drawCrimpedSeal(ctx, -6.0, -7.0, 12.0, 1.1, isVeg ? '#14532d' : '#4c0519', true, 0.82);
      drawCrimpedSeal(ctx, -6.0, 5.7, 12.0, 1.1, isVeg ? '#052e16' : '#3b0714', true, 0.82);

      // Frosted polypropylene window showing frozen contents
      drawFilmWindow(
        ctx,
        () => {
          ctx.beginPath();
          ctx.roundRect(-4.4, -1.8, 8.8, 6.0, 1.2);
        },
        () => {
          if (isVeg) {
            for (const [vx, vy, col] of [[-2.2, 0.2, '#facc15'], [0.4, -0.3, '#16a34a'], [2.4, 0.8, '#f97316'], [-1.4, 2.4, '#22c55e'], [1.5, 2.5, '#facc15']] as Array<[number, number, string]>) {
              ctx.fillStyle = col;
              ctx.beginPath();
              ctx.arc(vx, vy, 1.15, 0, Math.PI * 2);
              ctx.fill();
            }
          } else {
            for (const [bx, by, col] of [[-2.0, 0.2, '#e11d48'], [1.2, -0.2, '#1e3a8a'], [-0.6, 2.4, '#881337'], [2.0, 2.2, '#dc2626']] as Array<[number, number, string]>) {
              ctx.fillStyle = col;
              ctx.beginPath();
              ctx.arc(bx, by, 1.2, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        },
        'rgba(224, 242, 254, 0.72)',
        '#e2e8f0'
      );

      // Crisp frost emblem + micro-barcode header strip
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.roundRect(-4.8, -5.4, 9.6, 2.8, 0.5);
      ctx.fill();
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 0.55;
      ctx.beginPath();
      ctx.moveTo(-3.2, -4.9); ctx.lineTo(-3.2, -3.1);
      ctx.moveTo(-4.1, -4.0); ctx.lineTo(-2.3, -4.0);
      ctx.moveTo(-3.8, -4.6); ctx.lineTo(-2.6, -3.4);
      ctx.moveTo(-3.8, -3.4); ctx.lineTo(-2.6, -4.6);
      ctx.stroke();

      ctx.fillStyle = isVeg ? '#15803d' : '#881337';
      ctx.fillRect(-1.5, -4.7, 5.4, 0.52);
      drawMicroBarcode(ctx, 0.8, -3.85, 3.0, 0.9);

      drawPouchCrinkles(ctx, -5.2, -5.6, 10.4, 11.0, 61, 0.22);
      return true;
    }

    case 'garlic_powder':
    case 'garlic_powder_jar':
    case 'dill_dried':
    case 'dill_dried_jar':
    case 'basil_dried':
    case 'basil_dried_jar':
    case 'mint_dried':
    case 'mint_dried_jar': {
      drawShadow(ctx, 5.6, 2.4, 7.0, 0.24);
      let spiceMid = '#fde047';
      let spiceDark = '#ca8a04';
      let bandC = '#a16207';
      if (itemId.startsWith('dill')) { spiceMid = '#65a30d'; spiceDark = '#365314'; bandC = '#3f6212'; }
      else if (itemId.startsWith('basil')) { spiceMid = '#16a34a'; spiceDark = '#14532d'; bandC = '#166534'; }
      else if (itemId.startsWith('mint')) { spiceMid = '#059669'; spiceDark = '#064e3b'; bandC = '#047857'; }

      drawGlassJarShell(ctx, -4.2, -4.4, 8.4, 10.6, 1.6, '#f59e0b', '#92400e', () => {
        const sGrad = ctx.createLinearGradient(-4, -2, 4, 6);
        sGrad.addColorStop(0, spiceMid);
        sGrad.addColorStop(1, spiceDark);
        ctx.fillStyle = sGrad;
        ctx.fillRect(-4, -1.8, 8, 8.2);
        // Granular herb texture flecks
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        for (let i = 0; i < 14; i++) {
          const hx = (hash01(itemId, i * 2) - 0.5) * 6.4;
          const hy = -1.0 + hash01(itemId, i * 2 + 1) * 6.4;
          ctx.fillRect(hx, hy, 0.55, 0.45);
        }
      });

      drawStudioLabelPanel(ctx, -3.5, 1.4, 7.0, 3.6, {
        paperColor: '#f8f5ec',
        bandColor: bandC,
        accentColor: '#ca8a04',
        inkColor: '#1e293b',
        goldFoil: true,
        hasBarcode: true,
        emblem: 'leaf',
        cylindrical: true
      });
      return true;
    }

    // =========================================================================
    // === FRUITS, MELONS & CITRUSES ===
    // =========================================================================
    case 'apple_green': {
      drawShadow(ctx, 6.6, 2.6, 6.6, 0.26);
      // Indented apple body
      const aGrad = ctx.createRadialGradient(-2.0, -1.2, 0.6, 0.4, 0.8, 6.6);
      aGrad.addColorStop(0.0, '#d9f99d');
      aGrad.addColorStop(0.38, '#84cc16');
      aGrad.addColorStop(0.82, '#4d7c0f');
      aGrad.addColorStop(1.0, '#365314');
      ctx.fillStyle = aGrad;
      ctx.beginPath();
      ctx.moveTo(0, -4.2);
      ctx.bezierCurveTo(2.8, -5.8, 6.2, -3.5, 5.6, 1.2);
      ctx.bezierCurveTo(5.0, 5.2, 1.8, 6.0, 0, 5.2);
      ctx.bezierCurveTo(-1.8, 6.0, -5.0, 5.2, -5.6, 1.2);
      ctx.bezierCurveTo(-6.2, -3.5, -2.8, -5.8, 0, -4.2);
      ctx.closePath();
      ctx.fill();

      // Waxy crisp highlight & lenticels
      ctx.fillStyle = 'rgba(255, 255, 255, 0.52)';
      ctx.beginPath();
      ctx.ellipse(-2.2, -1.8, 1.35, 0.72, -0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(254, 249, 195, 0.4)';
      for (const [lx, ly] of [[2.2, -1.0], [1.4, 2.2], [-2.5, 1.8]]) {
        ctx.fillRect(lx, ly, 0.35, 0.35);
      }
      // Woody stem & botanical leaf
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1.15;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, -4.0);
      ctx.quadraticCurveTo(0.4, -6.0, 0.9, -6.9);
      ctx.stroke();
      drawBotanicalLeaf(ctx, 0.4, -5.4, 3.6, 1.35, -0.35, '#4ade80', '#14532d');
      return true;
    }

    case 'apple_sliced':
    case 'pear_sliced': {
      drawShadow(ctx, 7.2, 2.6, 6.0, 0.22);
      const isApple = itemId === 'apple_sliced';
      for (const [wx, wy, rot] of [[-2.5, -1.0, -0.32], [2.4, 1.1, 0.28]]) {
        ctx.save();
        ctx.translate(wx, wy);
        ctx.rotate(rot);
        ctx.fillStyle = isApple ? '#b91c1c' : '#ca8a04';
        ctx.beginPath();
        ctx.arc(0, 0.4, 4.4, 0.05, Math.PI - 0.05);
        ctx.closePath();
        ctx.fill();
        const fGrad = ctx.createRadialGradient(-1, 1, 0.3, 0, 0.6, 4.0);
        fGrad.addColorStop(0.0, '#ffffff');
        fGrad.addColorStop(0.75, '#fefce8');
        fGrad.addColorStop(1.0, '#fef08a');
        ctx.fillStyle = fGrad;
        ctx.beginPath();
        ctx.arc(0, -0.3, 3.9, 0.05, Math.PI - 0.05);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      return true;
    }

    case 'apple_puree':
    case 'apple_puree_jar': {
      drawShadow(ctx, 5.8, 2.4, 7.0, 0.24);
      drawGlassJarShell(ctx, -4.2, -4.0, 8.4, 10.0, 1.8, '#38bdf8', '#0284c7', () => {
        const pGrad = ctx.createRadialGradient(-1, 0, 0.4, 0, 1, 6);
        pGrad.addColorStop(0, '#fef08a');
        pGrad.addColorStop(0.65, '#facc15');
        pGrad.addColorStop(1, '#ca8a04');
        ctx.fillStyle = pGrad;
        ctx.fillRect(-4.2, -2.0, 8.4, 8.2);
      });
      drawStudioLabelPanel(ctx, -3.6, 1.2, 7.2, 3.6, {
        paperColor: '#f8fafc',
        bandColor: '#0284c7',
        accentColor: '#16a34a',
        inkColor: '#0c4a6e',
        goldFoil: false,
        hasBarcode: true,
        emblem: 'circle',
        cylindrical: true
      });
      return true;
    }

    case 'pear_yellow': {
      drawShadow(ctx, 6.4, 2.7, 6.8, 0.26);
      const pGrad = ctx.createRadialGradient(-1.8, -0.8, 0.6, 0.6, 1.5, 7.0);
      pGrad.addColorStop(0.0, '#fef08a');
      pGrad.addColorStop(0.42, '#eab308');
      pGrad.addColorStop(0.85, '#a16207');
      pGrad.addColorStop(1.0, '#713f12');
      ctx.fillStyle = pGrad;
      ctx.beginPath();
      ctx.moveTo(0, -5.8);
      ctx.bezierCurveTo(2.4, -5.6, 2.6, -2.5, 4.6, 0.4);
      ctx.bezierCurveTo(6.0, 3.6, 3.2, 6.2, 0, 6.0);
      ctx.bezierCurveTo(-3.2, 6.2, -6.0, 3.6, -4.6, 0.4);
      ctx.bezierCurveTo(-2.6, -2.5, -2.4, -5.6, 0, -5.8);
      ctx.closePath();
      ctx.fill();

      // Rosy sun blush on pear cheek + lenticel freckles
      ctx.fillStyle = 'rgba(244, 63, 94, 0.25)';
      ctx.beginPath();
      ctx.ellipse(-2.0, 2.2, 1.8, 2.2, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(120, 53, 15, 0.35)';
      for (const [fx, fy] of [[1.6, 1.5], [2.4, 3.2], [-1.0, 4.0], [0.8, -1.2]]) {
        ctx.fillRect(fx, fy, 0.36, 0.36);
      }
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(0, -5.6);
      ctx.quadraticCurveTo(0.6, -7.2, 1.1, -7.8);
      ctx.stroke();
      return true;
    }

    case 'plum_purple': {
      drawShadow(ctx, 5.8, 2.4, 6.5, 0.24);
      drawLitEllipse(ctx, 0, 0.4, 4.6, 5.4, 0, '#a855f7', '#581c87', '#2e1065', '#4c1d95', 0.3);
      // Glaucous dusty bloom cleft
      ctx.strokeStyle = 'rgba(216, 180, 254, 0.42)';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(0.2, -4.6);
      ctx.quadraticCurveTo(-0.5, 0.4, 0.2, 5.4);
      ctx.stroke();
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(0, -4.8);
      ctx.lineTo(0.4, -6.3);
      ctx.stroke();
      return true;
    }

    case 'plum_halves':
    case 'apricot_halves': {
      drawShadow(ctx, 7.2, 2.6, 5.8, 0.22);
      const isPlum = itemId === 'plum_halves';
      for (const [hx, hy] of [[-2.6, -0.2], [2.6, 0.5]]) {
        drawLitSphere(
          ctx, hx, hy, 3.7,
          isPlum ? '#a855f7' : '#fdba74',
          isPlum ? '#6b21a8' : '#ea580c',
          isPlum ? '#3b0764' : '#9a3412',
          undefined, 0.25
        );
        const fGrad = ctx.createRadialGradient(hx - 0.5, hy - 0.5, 0.3, hx, hy, 2.8);
        fGrad.addColorStop(0, isPlum ? '#fde047' : '#ffedd5');
        fGrad.addColorStop(1, isPlum ? '#d97706' : '#fb923c');
        ctx.fillStyle = fGrad;
        ctx.beginPath();
        ctx.arc(hx, hy, 2.75, 0, Math.PI * 2);
        ctx.fill();
        // Pit cavity hollow
        ctx.fillStyle = isPlum ? '#92400e' : '#c2410c';
        ctx.beginPath();
        ctx.ellipse(hx, hy, 1.15, 0.85, 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
      return true;
    }

    case 'apricot_orange':
    case 'peach_velvet': {
      const isPeach = itemId === 'peach_velvet';
      drawShadow(ctx, 6.2, 2.5, 6.4, 0.25);
      drawLitSphere(
        ctx, 0, 0.4, 5.2,
        isPeach ? '#fed7aa' : '#fde047',
        isPeach ? '#fb923c' : '#f59e0b',
        isPeach ? '#c2410c' : '#b45309',
        undefined, isPeach ? 0.18 : 0.32
      );
      // Sun-kissed carmine blush & crease cleft
      ctx.fillStyle = isPeach ? 'rgba(225, 29, 72, 0.45)' : 'rgba(239, 68, 68, 0.32)';
      ctx.beginPath();
      ctx.ellipse(1.5, -0.4, 2.6, 3.2, 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(154, 52, 18, 0.45)';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(0, -4.4);
      ctx.quadraticCurveTo(-0.8, 0.4, 0, 5.3);
      ctx.stroke();
      return true;
    }

    case 'peach_halves':
    case 'peach_halves_canned': {
      drawShadow(ctx, 6.2, 2.6, 7.6, 0.26);
      const cGrad = ctx.createLinearGradient(-4.8, 0, 4.8, 0);
      cGrad.addColorStop(0.0, '#64748b');
      cGrad.addColorStop(0.28, '#f1f5f9');
      cGrad.addColorStop(0.65, '#94a3b8');
      cGrad.addColorStop(1.0, '#334155');
      ctx.fillStyle = cGrad;
      ctx.beginPath();
      ctx.moveTo(-4.8, -5.0);
      ctx.lineTo(4.8, -5.0);
      ctx.lineTo(4.8, 5.4);
      ctx.ellipse(0, 5.4, 4.8, 1.5, 0, 0, Math.PI);
      ctx.closePath();
      ctx.fill();

      // Studio peach preserve label with gold rules & micro-barcode
      drawStudioLabelPanel(ctx, -4.75, -2.6, 9.5, 6.8, {
        paperColor: '#fffbeb',
        bandColor: '#c2410c',
        accentColor: '#eab308',
        inkColor: '#7c2d12',
        goldFoil: true,
        hasBarcode: true,
        emblem: 'none',
        cylindrical: false
      });
      drawLitSphere(ctx, 0, 1.0, 1.55, '#fef08a', '#fb923c', '#c2410c', undefined, 0.5);
      applyCylinderLightingOverlay(ctx, -4.8, -2.6, 9.6, 6.9, 0.26, 0.34);

      drawMetalCanLid(ctx, 0, -5.0, 4.8, 1.5, true);
      return true;
    }

    case 'orange_citrus':
      drawShadow(ctx, 6.4, 2.6, 6.8, 0.26);
      drawRealisticCitrus(ctx, 5.7, '#fdba74', '#f97316', '#c2410c', 1.0, 'orange_citrus', true);
      return true;

    case 'yuzu_citrus':
      drawShadow(ctx, 6.0, 2.4, 6.4, 0.24);
      drawRealisticCitrus(ctx, 5.1, '#fef9c3', '#eab308', '#a16207', 0.94, 'yuzu_citrus', true);
      return true;

    case 'grapefruit_pink':
      drawShadow(ctx, 6.6, 2.6, 6.8, 0.26);
      drawRealisticCitrus(ctx, 5.8, '#fda4af', '#fb923c', '#9a3412', 1.0, 'grapefruit_pink', false, '#b45309');
      return true;

    case 'mandarin_citrus':
      drawShadow(ctx, 5.6, 2.2, 5.8, 0.24);
      drawRealisticCitrus(ctx, 4.8, '#fdba74', '#f97316', '#9a3412', 0.84, 'mandarin_citrus', true);
      return true;

    case 'blood_orange_citrus':
      drawShadow(ctx, 6.0, 2.5, 6.4, 0.25);
      drawRealisticCitrus(ctx, 5.2, '#fb923c', '#dc2626', '#7f1d1d', 1.0, 'blood_orange_citrus', true, '#7f1d1d');
      return true;

    case 'orange_segments': {
      drawShadow(ctx, 7.2, 2.6, 5.8, 0.22);
      for (const [ox, oy, rot] of [[-2.6, -0.8, -0.35], [2.4, 1.0, 0.3]]) {
        ctx.save();
        ctx.translate(ox, oy);
        ctx.rotate(rot);
        ctx.fillStyle = '#c2410c';
        ctx.beginPath();
        ctx.arc(0, 0.35, 4.3, 0.08, Math.PI - 0.08);
        ctx.closePath();
        ctx.fill();
        const oGrad = ctx.createRadialGradient(-1, 1.2, 0.3, 0, 1.2, 4.2);
        oGrad.addColorStop(0.0, '#fed7aa');
        oGrad.addColorStop(0.55, '#fb923c');
        oGrad.addColorStop(1.0, '#ea580c');
        ctx.fillStyle = oGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 4.1, 0.08, Math.PI - 0.08);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 247, 237, 0.65)';
        ctx.lineWidth = 0.45;
        ctx.beginPath();
        ctx.arc(0, 0, 3.8, 0.1, Math.PI - 0.1);
        ctx.stroke();
        ctx.restore();
      }
      return true;
    }

    case 'lemon_whole': {
      drawShadow(ctx, 6.8, 2.4, 5.6, 0.24);
      // Ellipsoid lemon body with tapered umbo ends
      ctx.save();
      ctx.scale(1, 0.72);
      drawLitSphere(ctx, 0, 0.4, 6.2, '#fef9c3', '#facc15', '#a16207', '#ca8a04', 0.42);
      ctx.restore();
      // Tapered nipple umbos
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.ellipse(-6.1, 0.3, 1.1, 0.95, 0, 0, Math.PI * 2);
      ctx.ellipse(6.1, 0.3, 1.1, 0.95, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#65a30d';
      ctx.beginPath();
      ctx.arc(-6.9, 0.3, 0.42, 0, Math.PI * 2);
      ctx.fill();
      // Pores
      ctx.fillStyle = 'rgba(161, 98, 7, 0.35)';
      for (let i = 0; i < 12; i++) {
        const px = (hash01('lemon_whole', i * 2) - 0.5) * 9.5;
        const py = (hash01('lemon_whole', i * 2 + 1) - 0.5) * 5.2;
        ctx.fillRect(px, py, 0.32, 0.32);
      }
      return true;
    }

    case 'lemon_slice':
    case 'lime_slice': {
      const isLime = itemId === 'lime_slice';
      const r = isLime ? 4.9 : 5.5;
      drawShadow(ctx, r + 0.8, 2.4, 6.2, 0.22);

      // Outer peel rind
      ctx.fillStyle = isLime ? '#15803d' : '#eab308';
      ctx.beginPath();
      ctx.arc(0, 0.35, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = isLime ? '#16a34a' : '#facc15';
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();

      // Pith ring
      ctx.fillStyle = isLime ? '#f0fdf4' : '#fef9c3';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.84, 0, Math.PI * 2);
      ctx.fill();

      // Juicy radial triangular pulp vesicles
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI * 2) / 8;
        ctx.fillStyle = isLime ? '#84cc16' : '#fef08a';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.74, a + 0.08, a + Math.PI / 4 - 0.08);
        ctx.lineTo(0, 0);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.14, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    case 'lime_whole': {
      drawShadow(ctx, 6.0, 2.3, 5.4, 0.24);
      ctx.save();
      ctx.scale(1, 0.78);
      drawLitSphere(ctx, 0, 0.4, 5.4, '#bef264', '#65a30d', '#365314', '#4d7c0f', 0.45);
      ctx.restore();
      ctx.fillStyle = '#365314';
      ctx.beginPath();
      ctx.arc(-5.4, 0.3, 0.45, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    case 'kiwi_fruit': {
      drawShadow(ctx, 6.4, 2.5, 6.2, 0.24);
      // Fuzzy brown outer skin rim
      drawLitSphere(ctx, 0, 0.3, 5.3, '#a16207', '#78350f', '#451a03', undefined, 0.1);
      // Translucent emerald kiwi flesh
      const kGrad = ctx.createRadialGradient(-0.8, -0.8, 0.3, 0, 0, 4.6);
      kGrad.addColorStop(0.0, '#bef264');
      kGrad.addColorStop(0.55, '#84cc16');
      kGrad.addColorStop(1.0, '#4d7c0f');
      ctx.fillStyle = kGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 4.4, 0, Math.PI * 2);
      ctx.fill();

      // Radiating botanical striations
      ctx.strokeStyle = 'rgba(236, 252, 203, 0.45)';
      ctx.lineWidth = 0.35;
      for (let i = 0; i < 16; i++) {
        const a = (i * Math.PI * 2) / 16;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 1.4, Math.sin(a) * 1.4);
        ctx.lineTo(Math.cos(a) * 3.8, Math.sin(a) * 3.8);
        ctx.stroke();
      }
      // Creamy core & black seed halo
      ctx.fillStyle = '#f7fee7';
      ctx.beginPath();
      ctx.ellipse(0, 0, 1.45, 1.15, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#09090b';
      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI * 2) / 12;
        ctx.beginPath();
        ctx.ellipse(Math.cos(a) * 2.1, Math.sin(a) * 1.9, 0.34, 0.2, a, 0, Math.PI * 2);
        ctx.fill();
      }
      return true;
    }

    case 'kiwi_peeled': {
      drawShadow(ctx, 6.2, 2.4, 5.6, 0.22);
      ctx.save();
      ctx.scale(1, 0.78);
      drawLitSphere(ctx, 0, 0.3, 5.4, '#bef264', '#84cc16', '#3f6212', '#65a30d', 0.58);
      ctx.restore();
      return true;
    }

    case 'kiwi_sliced': {
      drawShadow(ctx, 6.8, 2.4, 5.8, 0.2);
      for (const [kx, ky] of [[-2.3, -0.6], [2.2, 0.9]]) {
        ctx.fillStyle = '#4d7c0f';
        ctx.beginPath();
        ctx.arc(kx, ky + 0.35, 4.1, 0, Math.PI * 2);
        ctx.fill();
        const fGrad = ctx.createRadialGradient(kx - 0.6, ky - 0.6, 0.2, kx, ky, 4.1);
        fGrad.addColorStop(0.0, '#bef264');
        fGrad.addColorStop(0.65, '#84cc16');
        fGrad.addColorStop(1.0, '#4d7c0f');
        ctx.fillStyle = fGrad;
        ctx.beginPath();
        ctx.arc(kx, ky, 4.05, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f7fee7';
        ctx.beginPath();
        ctx.arc(kx, ky, 1.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#18181b';
        for (let i = 0; i < 10; i++) {
          const a = (i * Math.PI * 2) / 10;
          ctx.beginPath();
          ctx.arc(kx + Math.cos(a) * 1.9, ky + Math.sin(a) * 1.9, 0.28, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      return true;
    }

    case 'pineapple_whole': {
      drawShadow(ctx, 6.6, 2.9, 8.2, 0.28);
      // Spiky serrated crown rosette
      ctx.save();
      ctx.translate(0, -2.5);
      for (const [ang, len, w] of [[-0.55, 6.0, 1.15], [-0.25, 7.2, 1.25], [0, 7.8, 1.3], [0.25, 7.2, 1.25], [0.55, 6.0, 1.15]]) {
        drawBotanicalLeaf(ctx, 0, 0, len, w, -Math.PI / 2 + ang, '#4ade80', '#14532d', 'rgba(187,247,208,0.45)');
      }
      ctx.restore();

      // Golden barrel with diamond eye tessellation
      drawLitEllipse(ctx, 0, 2.4, 4.8, 5.7, 0, '#fef08a', '#d97706', '#78350f', '#b45309', 0.2);

      ctx.save();
      ctx.beginPath();
      ctx.ellipse(0, 2.4, 4.7, 5.6, 0, 0, Math.PI * 2);
      ctx.clip();
      ctx.strokeStyle = 'rgba(120, 53, 15, 0.65)';
      ctx.lineWidth = 0.55;
      for (let i = -5; i <= 5; i++) {
        ctx.beginPath();
        ctx.moveTo(-5, i * 2.2 + 2.4);
        ctx.lineTo(5, i * 2.2 + 7.4);
        ctx.moveTo(5, i * 2.2 + 2.4);
        ctx.lineTo(-5, i * 2.2 + 7.4);
        ctx.stroke();
      }
      ctx.restore();
      return true;
    }

    case 'mango_whole': {
      drawShadow(ctx, 6.2, 2.7, 6.8, 0.25);
      const mGrad = ctx.createRadialGradient(-2.0, -1.8, 0.8, 0.4, 1.0, 7.2);
      mGrad.addColorStop(0.0, '#f87171');
      mGrad.addColorStop(0.32, '#ef4444');
      mGrad.addColorStop(0.68, '#f59e0b');
      mGrad.addColorStop(1.0, '#65a30d');
      ctx.fillStyle = mGrad;
      ctx.beginPath();
      ctx.ellipse(0, 0.5, 4.6, 5.8, 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.beginPath();
      ctx.ellipse(-1.8, -1.8, 1.25, 0.65, -0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3f6212';
      ctx.fillRect(-0.4, -6.0, 0.9, 1.3);
      return true;
    }

    case 'passionfruit_whole': {
      drawShadow(ctx, 5.4, 2.3, 6.0, 0.24);
      drawLitSphere(ctx, 0, 0.4, 4.8, '#a855f7', '#581c87', '#1e0338', '#4c1d95', 0.36);
      ctx.strokeStyle = '#65a30d';
      ctx.lineWidth = 0.95;
      ctx.beginPath();
      ctx.moveTo(0, -4.2);
      ctx.quadraticCurveTo(0.8, -5.6, 1.2, -6.2);
      ctx.stroke();
      return true;
    }

    case 'guava_whole': {
      drawShadow(ctx, 5.6, 2.4, 6.2, 0.24);
      drawLitEllipse(ctx, 0, 0.6, 4.8, 5.2, 0, '#ecfccb', '#65a30d', '#365314', '#4d7c0f', 0.3);
      ctx.fillStyle = 'rgba(244, 63, 94, 0.3)';
      ctx.beginPath();
      ctx.arc(1.2, 1.6, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#365314';
      ctx.fillRect(-0.75, -5.2, 1.5, 1.0);
      return true;
    }

    case 'papaya_whole': {
      drawShadow(ctx, 6.6, 2.8, 7.2, 0.25);
      const papGrad = ctx.createRadialGradient(-1.6, -2.0, 0.8, 0.5, 1.0, 7.6);
      papGrad.addColorStop(0.0, '#bef264');
      papGrad.addColorStop(0.35, '#facc15');
      papGrad.addColorStop(0.82, '#ea580c');
      papGrad.addColorStop(1.0, '#9a3412');
      ctx.fillStyle = papGrad;
      ctx.beginPath();
      ctx.ellipse(0, 0.4, 4.5, 6.6, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(154, 52, 18, 0.32)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.ellipse(0, 0.4, 2.1, 6.2, 0.2, 0, Math.PI * 2);
      ctx.stroke();
      return true;
    }

    case 'dragonfruit_whole': {
      drawShadow(ctx, 6.4, 2.8, 7.0, 0.26);
      drawLitEllipse(ctx, 0, 0.6, 4.8, 5.9, 0, '#fb7185', '#db2777', '#831843', '#be185d', 0.32);
      // Leafy flame bracts with green tips
      for (const [sx, sy, ax] of [[-4.4, -2.2, -0.55], [4.4, -2.2, 0.55], [-4.8, 1.5, -0.4], [4.8, 1.5, 0.4], [0, -5.6, 0]]) {
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(ax);
        const brGrad = ctx.createLinearGradient(0, 1.2, 0, -2.0);
        brGrad.addColorStop(0, '#db2777');
        brGrad.addColorStop(0.55, '#84cc16');
        brGrad.addColorStop(1, '#365314');
        ctx.fillStyle = brGrad;
        ctx.beginPath();
        ctx.moveTo(-1.1, 1.2);
        ctx.quadraticCurveTo(-0.3, -0.8, 0, -2.1);
        ctx.quadraticCurveTo(0.3, -0.8, 1.1, 1.2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      return true;
    }

    case 'lychee_fruit': {
      drawShadow(ctx, 6.4, 2.5, 6.2, 0.23);
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 0.85;
      ctx.beginPath();
      ctx.moveTo(0, -5.6); ctx.lineTo(-2.6, -0.8);
      ctx.moveTo(0, -5.6); ctx.lineTo(2.6, -0.6);
      ctx.moveTo(0, -5.6); ctx.lineTo(0, 2.0);
      ctx.stroke();
      for (const [lx, ly] of [[-2.6, 0.2], [2.6, 0.4], [0, 2.6]]) {
        drawLitSphere(ctx, lx, ly, 2.35, '#fda4af', '#e11d48', '#881337', undefined, 0.3);
        ctx.fillStyle = 'rgba(136, 19, 55, 0.4)';
        for (let i = 0; i < 5; i++) {
          const sx = lx + (hash01('lychee', i * 2 + lx) - 0.5) * 2.6;
          const sy = ly + (hash01('lychee', i * 2 + 1 + ly) - 0.5) * 2.6;
          ctx.fillRect(sx, sy, 0.42, 0.42);
        }
      }
      return true;
    }

    case 'grapes_green_bunch':
    case 'grapes_red_bunch': {
      const isGreen = itemId === 'grapes_green_bunch';
      drawShadow(ctx, 6.6, 2.6, 7.0, 0.25);
      // Leaf & woody rachis stem
      ctx.strokeStyle = '#65a30d';
      ctx.lineWidth = 1.05;
      ctx.beginPath();
      ctx.moveTo(0, -3.5);
      ctx.lineTo(0, -6.6);
      ctx.stroke();
      drawBotanicalLeaf(ctx, 0.2, -5.2, 3.6, 1.4, -0.3, '#84cc16', '#365314');

      const cluster: Array<[number, number, number]> = [
        [-2.8, -2.8, 1.75], [0, -3.3, 1.85], [2.8, -2.8, 1.75],
        [-2.1, -0.7, 1.85], [0.9, -0.9, 1.9], [2.9, -0.4, 1.65],
        [-1.3, 1.6, 1.8], [1.4, 1.5, 1.8], [0, 3.8, 1.75],
      ];
      for (const [gx, gy, gr] of cluster) {
        drawLitSphere(
          ctx, gx, gy, gr,
          isGreen ? '#ecfccb' : '#c084fc',
          isGreen ? '#84cc16' : '#7e22ce',
          isGreen ? '#3f6212' : '#3b0764',
          isGreen ? '#4d7c0f' : '#581c87',
          0.55
        );
      }
      return true;
    }

    case 'banana_single': {
      drawShadow(ctx, 7.2, 2.4, 6.2, 0.22);
      // Curved tapered botanical banana arc
      const bGrad = ctx.createLinearGradient(-4, -5, 4, 6);
      bGrad.addColorStop(0.0, '#fef08a');
      bGrad.addColorStop(0.45, '#facc15');
      bGrad.addColorStop(0.85, '#ca8a04');
      bGrad.addColorStop(1.0, '#854d0e');
      ctx.fillStyle = bGrad;
      ctx.beginPath();
      ctx.moveTo(-4.8, -4.6);
      ctx.bezierCurveTo(3.2, -4.2, 7.6, 1.2, 2.2, 6.2);
      ctx.bezierCurveTo(4.2, 1.6, 0.4, -2.4, -5.2, -3.2);
      ctx.closePath();
      ctx.fill();

      // Longitudinal peel ridge facet
      ctx.strokeStyle = 'rgba(254, 249, 195, 0.65)';
      ctx.lineWidth = 0.55;
      ctx.beginPath();
      ctx.moveTo(-4.2, -3.9);
      ctx.bezierCurveTo(2.4, -2.6, 5.2, 1.4, 2.1, 5.4);
      ctx.stroke();

      // Green crown pedicel & dark floral tip
      ctx.fillStyle = '#65a30d';
      ctx.fillRect(-5.8, -4.5, 1.5, 1.4);
      ctx.fillStyle = '#451a03';
      ctx.fillRect(1.7, 5.8, 0.9, 0.8);
      return true;
    }

    case 'banana_peeled': {
      drawShadow(ctx, 7.4, 2.4, 5.4, 0.2);
      const fGrad = ctx.createLinearGradient(-5, -2, 6, 2);
      fGrad.addColorStop(0, '#fffbeb');
      fGrad.addColorStop(0.5, '#fef9c3');
      fGrad.addColorStop(1, '#fde047');
      ctx.fillStyle = fGrad;
      ctx.beginPath();
      ctx.moveTo(-5.2, 1.8);
      ctx.bezierCurveTo(-1.8, -2.8, 3.2, -2.4, 6.4, 0.8);
      ctx.bezierCurveTo(2.8, -0.6, -1.4, -0.4, -4.8, 2.2);
      ctx.closePath();
      ctx.fill();

      // Curled peel flaps at left
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.moveTo(-4.8, 1.6);
      ctx.quadraticCurveTo(-7.2, 2.2, -8.2, 4.4);
      ctx.quadraticCurveTo(-5.8, 3.4, -4.6, 2.4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ca8a04';
      ctx.beginPath();
      ctx.moveTo(-4.6, 1.8);
      ctx.quadraticCurveTo(-6.2, 0.4, -7.8, 1.2);
      ctx.quadraticCurveTo(-5.8, 2.0, -4.8, 2.2);
      ctx.closePath();
      ctx.fill();
      return true;
    }

    case 'melon_cantaloupe': {
      drawShadow(ctx, 7.6, 3.0, 6.8, 0.26);
      drawLitSphere(ctx, 0, 0.4, 6.0, '#fde047', '#ca8a04', '#713f12', '#854d0e', 0.22);
      // Raised corky netting mesh
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0.4, 5.9, 0, Math.PI * 2);
      ctx.clip();
      ctx.strokeStyle = 'rgba(254, 249, 195, 0.58)';
      ctx.lineWidth = 0.45;
      for (let i = -4; i <= 4; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 1.6, -6);
        ctx.quadraticCurveTo(i * 2.1, 0.4, i * 1.6, 7);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-6, i * 1.6);
        ctx.quadraticCurveTo(0, i * 1.9 + 0.6, 6, i * 1.6);
        ctx.stroke();
      }
      ctx.restore();
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.arc(0, -5.4, 0.85, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    case 'melon_slice': {
      drawShadow(ctx, 7.8, 2.7, 5.6, 0.24);
      ctx.fillStyle = '#a16207';
      ctx.beginPath();
      ctx.arc(0, -1.6, 7.0, 0.16, Math.PI - 0.16);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#bef264';
      ctx.beginPath();
      ctx.arc(0, -1.6, 6.3, 0.18, Math.PI - 0.18);
      ctx.closePath();
      ctx.fill();
      const fGrad = ctx.createRadialGradient(0, 0.2, 0.4, 0, 0.2, 5.8);
      fGrad.addColorStop(0.0, '#fed7aa');
      fGrad.addColorStop(0.6, '#fb923c');
      fGrad.addColorStop(1.0, '#ea580c');
      ctx.fillStyle = fGrad;
      ctx.beginPath();
      ctx.arc(0, -1.6, 5.6, 0.22, Math.PI - 0.22);
      ctx.closePath();
      ctx.fill();
      return true;
    }

    case 'watermelon_whole': {
      drawShadow(ctx, 8.6, 3.4, 7.4, 0.28);
      drawLitSphere(ctx, 0, 0.4, 6.8, '#4ade80', '#15803d', '#052e16', '#14532d', 0.35);

      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0.4, 6.7, 0, Math.PI * 2);
      ctx.clip();
      // Jagged light-chartreuse rind tiger stripes
      ctx.strokeStyle = 'rgba(190, 242, 100, 0.65)';
      ctx.lineWidth = 1.15;
      for (const sx of [-4.4, -2.2, 0, 2.2, 4.4]) {
        ctx.beginPath();
        ctx.moveTo(sx * 0.4, -6.5);
        ctx.bezierCurveTo(sx * 1.4 - 0.4, -2.0, sx * 1.3 + 0.5, 2.5, sx * 0.45, 7.2);
        ctx.stroke();
      }
      ctx.restore();
      ctx.fillStyle = '#365314';
      ctx.fillRect(-0.6, -6.8, 1.2, 1.0);
      return true;
    }

    case 'watermelon_slice': {
      drawShadow(ctx, 7.8, 2.8, 6.2, 0.25);
      // Green curved rind & pale pith rim
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.moveTo(-6.8, -3.8);
      ctx.quadraticCurveTo(0, -5.8, 6.8, -3.8);
      ctx.lineTo(0, 5.2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ecfccb';
      ctx.beginPath();
      ctx.moveTo(-6.2, -3.3);
      ctx.quadraticCurveTo(0, -5.0, 6.2, -3.3);
      ctx.lineTo(0, 4.6);
      ctx.closePath();
      ctx.fill();

      // Juicy ruby crystalline flesh
      const wGrad = ctx.createRadialGradient(-1, -1.5, 0.4, 0, 0, 6.4);
      wGrad.addColorStop(0.0, '#f87171');
      wGrad.addColorStop(0.55, '#dc2626');
      wGrad.addColorStop(1.0, '#991b1b');
      ctx.fillStyle = wGrad;
      ctx.beginPath();
      ctx.moveTo(-5.6, -2.8);
      ctx.quadraticCurveTo(0, -4.3, 5.6, -2.8);
      ctx.lineTo(0, 4.4);
      ctx.closePath();
      ctx.fill();

      // Black teardrop pips
      ctx.fillStyle = '#09090b';
      for (const [px, py, rot] of [[-2.0, -1.2, -0.3], [2.0, -1.2, 0.3], [0, 1.1, 0], [-0.9, -2.1, -0.15], [0.9, -2.1, 0.15]]) {
        ctx.beginPath();
        ctx.ellipse(px, py, 0.42, 0.72, rot, 0, Math.PI * 2);
        ctx.fill();
      }
      return true;
    }

    case 'melon_diced':
    case 'watermelon_diced':
    case 'pomegranate_seeds':
    case 'pomegranate_seeds_cup':
    case 'grapes_berries':
    case 'grapes_berries_cup': {
      drawShadow(ctx, 6.8, 2.7, 6.6, 0.24);
      // Clear tapered PET deli cup
      const cGrad = ctx.createLinearGradient(-5.2, -4, 5.2, 5);
      cGrad.addColorStop(0.0, 'rgba(248, 250, 252, 0.78)');
      cGrad.addColorStop(0.5, 'rgba(226, 232, 240, 0.44)');
      cGrad.addColorStop(1.0, 'rgba(148, 163, 184, 0.68)');
      ctx.fillStyle = cGrad;
      ctx.beginPath();
      ctx.moveTo(-5.4, -3.8);
      ctx.lineTo(5.4, -3.8);
      ctx.lineTo(4.2, 5.0);
      ctx.quadraticCurveTo(0, 5.8, -4.2, 5.0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.78)';
      ctx.lineWidth = 0.45;
      ctx.stroke();

      let hCol = '#fed7aa';
      let mCol = '#fb923c';
      let dCol = '#ea580c';
      let bandCol = '#ea580c';
      if (itemId === 'watermelon_diced') { hCol = '#fca5a5'; mCol = '#ef4444'; dCol = '#991b1b'; bandCol = '#dc2626'; }
      else if (itemId.startsWith('pomegranate')) { hCol = '#fb7185'; mCol = '#be123c'; dCol = '#4c0519'; bandCol = '#9f1239'; }
      else if (itemId.startsWith('grapes')) { hCol = '#ecfccb'; mCol = '#84cc16'; dCol = '#3f6212'; bandCol = '#4d7c0f'; }

      for (const [ix, iy] of [[-2.0, -1.2], [1.6, -1.0], [-1.3, 1.8], [1.5, 1.8], [0, 0.2]]) {
        drawLitSphere(ctx, ix, iy, 1.5, hCol, mCol, dCol, undefined, 0.6);
      }

      // Snapped clear domed lid rim + fresh-cut studio seal strip
      ctx.fillStyle = 'rgba(241, 245, 249, 0.62)';
      ctx.beginPath();
      ctx.ellipse(0, -3.8, 5.6, 1.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 0.45;
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.roundRect(-3.6, 2.0, 7.2, 2.2, 0.4);
      ctx.fill();
      ctx.fillStyle = bandCol;
      ctx.fillRect(-3.6, 2.0, 7.2, 0.55);
      drawMicroBarcode(ctx, 0.2, 2.8, 3.0, 1.0);

      drawGlossBand(ctx, -4.0, -3.6, 1.1, 8.2, 0.42);
      return true;
    }

    case 'pomegranate_whole': {
      drawShadow(ctx, 6.8, 2.7, 6.8, 0.26);
      // Leathery ribbed crown calyx
      ctx.fillStyle = '#881337';
      ctx.beginPath();
      ctx.moveTo(-1.8, -4.2);
      ctx.lineTo(-2.6, -6.8);
      ctx.lineTo(-0.9, -5.4);
      ctx.lineTo(0, -7.2);
      ctx.lineTo(0.9, -5.4);
      ctx.lineTo(2.6, -6.8);
      ctx.lineTo(1.8, -4.2);
      ctx.closePath();
      ctx.fill();

      drawLitSphere(ctx, 0, 0.8, 5.5, '#fb7185', '#9f1239', '#4c0519', '#881337', 0.45);
      // Warm orange-scarlet mottling
      ctx.fillStyle = 'rgba(234, 88, 12, 0.22)';
      ctx.beginPath();
      ctx.ellipse(-2.0, 1.6, 2.2, 2.5, 0.3, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    // =========================================================================
    // === BERRIES (SINGLE, CLAMSHELL PUNNET & WICKER BASKETS) ===
    // =========================================================================
    case 'strawberry_fresh': {
      drawShadow(ctx, 5.2, 2.0, 5.6, 0.22);
      const sGrad = ctx.createRadialGradient(-1.4, -1.0, 0.4, 0.4, 1.0, 5.2);
      sGrad.addColorStop(0.0, '#fb7185');
      sGrad.addColorStop(0.45, '#e11d48');
      sGrad.addColorStop(1.0, '#881337');
      ctx.fillStyle = sGrad;
      ctx.beginPath();
      ctx.moveTo(-3.4, -1.8);
      ctx.bezierCurveTo(-1.4, -3.5, 1.4, -3.5, 3.4, -1.8);
      ctx.bezierCurveTo(4.0, 1.2, 1.4, 4.2, 0, 4.8);
      ctx.bezierCurveTo(-1.4, 4.2, -4.0, 1.2, -3.4, -1.8);
      ctx.closePath();
      ctx.fill();
      // Achenes (gold seeds)
      ctx.fillStyle = '#fef08a';
      for (const [sx, sy] of [[-1.7, -0.4], [0, -0.8], [1.7, -0.4], [-1.0, 1.2], [1.0, 1.2], [0, 2.7]]) {
        ctx.beginPath();
        ctx.ellipse(sx, sy, 0.28, 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // Specular berry gloss & sepals
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.beginPath();
      ctx.ellipse(-1.4, -1.2, 0.85, 0.42, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.moveTo(0, -4.4);
      ctx.lineTo(-2.6, -2.0);
      ctx.lineTo(-0.8, -1.8);
      ctx.lineTo(0, -1.2);
      ctx.lineTo(0.8, -1.8);
      ctx.lineTo(2.6, -2.0);
      ctx.closePath();
      ctx.fill();
      return true;
    }

    case 'raspberry_fresh': {
      drawShadow(ctx, 4.6, 1.8, 5.2, 0.2);
      const drupes = [
        [-1.3, -1.8], [0, -2.3], [1.3, -1.8],
        [-1.7, -0.1], [0, -0.3], [1.7, -0.1],
        [-1.2, 1.6], [1.2, 1.6], [0, 2.5],
      ];
      for (const [rx, ry] of drupes) {
        drawLitSphere(ctx, rx, ry, 1.25, '#fda4af', '#be123c', '#4c0519', undefined, 0.45);
      }
      return true;
    }

    case 'blueberry_fresh': {
      drawShadow(ctx, 4.2, 1.7, 4.8, 0.2);
      drawLitSphere(ctx, 0, 0, 3.25, '#93c5fd', '#1e3a8a', '#0f172a', '#1d4ed8', 0.28);
      // Frosted glaucous bloom & starry crown
      ctx.fillStyle = 'rgba(191, 219, 254, 0.28)';
      ctx.beginPath();
      ctx.arc(-0.7, -0.6, 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.arc(0.3, -1.8, 0.65, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    case 'cherry_fresh': {
      drawShadow(ctx, 5.0, 2.0, 5.4, 0.22);
      ctx.strokeStyle = '#65a30d';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(0, -2.2);
      ctx.quadraticCurveTo(1.8, -5.2, 3.0, -7.2);
      ctx.stroke();
      drawLitSphere(ctx, 0, 0.7, 3.45, '#fb7185', '#881337', '#2e0210', '#9f1239', 0.85);
      return true;
    }

    case 'berry_forest_single':
    case 'berry_blueberry_single':
    case 'berry_lingonberry_single':
    case 'berry_cranberry_single':
    case 'berry_raspberry_single':
    case 'berry_strawberry_single':
    case 'berry_blackcurrant_single':
    case 'berry_redcurrant_single':
    case 'berry_cherry_single': {
      drawShadow(ctx, 5.6, 2.2, 5.6, 0.22);
      let hC = '#fca5a5';
      let mC = '#dc2626';
      let dC = '#7f1d1d';
      if (itemId === 'berry_blueberry_single') { hC = '#93c5fd'; mC = '#1e3a8a'; dC = '#0f172a'; }
      else if (itemId === 'berry_blackcurrant_single') { hC = '#818cf8'; mC = '#1e1b4b'; dC = '#09090b'; }
      else if (itemId === 'berry_raspberry_single' || itemId === 'berry_strawberry_single') { hC = '#fda4af'; mC = '#e11d48'; dC = '#881337'; }
      else if (itemId === 'berry_cherry_single') { hC = '#fb7185'; mC = '#881337'; dC = '#3b0714'; }
      else if (itemId === 'berry_forest_single') { hC = '#93c5fd'; mC = '#3730a3'; dC = '#1e1b4b'; }

      drawBotanicalLeaf(ctx, 0, -2.5, -3.4, 1.3, 0.42, '#4ade80', '#14532d');
      drawLitSphere(ctx, -1.7, 0.6, 2.15, hC, mC, dC, undefined, 0.6);
      drawLitSphere(ctx, 1.8, 0.8, 2.05, itemId === 'berry_forest_single' ? '#fca5a5' : hC, itemId === 'berry_forest_single' ? '#dc2626' : mC, itemId === 'berry_forest_single' ? '#7f1d1d' : dC, undefined, 0.6);
      drawLitSphere(ctx, 0, -1.2, 2.3, hC, mC, dC, undefined, 0.72);
      return true;
    }

    case 'berry_blackberry_single': {
      drawShadow(ctx, 5.0, 2.0, 5.2, 0.22);
      drawBotanicalLeaf(ctx, 0, -2.6, -3.2, 1.2, 0.4, '#4ade80', '#14532d');
      const drupes: Array<[number, number, number]> = [
        [-1.3, -1.8, 1.25], [1.3, -1.8, 1.25], [0, -2.2, 1.35],
        [-1.7, 0, 1.25], [0, -0.2, 1.35], [1.7, 0, 1.25],
        [-1.0, 1.7, 1.15], [1.0, 1.7, 1.15], [0, 2.4, 1.25],
      ];
      for (const [dx, dy, dr] of drupes) {
        drawLitSphere(ctx, dx, dy, dr, '#64748b', '#1e293b', '#020617', undefined, 0.65);
      }
      return true;
    }

    case 'berry_sea_buckthorn_single': {
      drawShadow(ctx, 5.4, 2.0, 5.0, 0.2);
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 0.95;
      ctx.beginPath();
      ctx.moveTo(-4.2, 2.6);
      ctx.lineTo(4.2, -2.6);
      ctx.stroke();
      for (const [dx, dy] of [[-2.0, 0.9], [-0.4, -0.1], [1.2, -1.0], [2.4, -1.7], [0.2, 1.3]]) {
        drawLitEllipse(ctx, dx, dy, 1.4, 1.05, -0.48, '#fef08a', '#f97316', '#c2410c', undefined, 0.65);
      }
      return true;
    }

    case 'berry_elderberry_single': {
      drawShadow(ctx, 5.2, 2.2, 5.4, 0.22);
      ctx.strokeStyle = '#be123c';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(0, -4.6); ctx.lineTo(0, -1.4);
      ctx.moveTo(0, -3.0); ctx.lineTo(-2.5, 0);
      ctx.moveTo(0, -3.0); ctx.lineTo(2.5, 0);
      ctx.moveTo(0, -1.5); ctx.lineTo(-1.2, 2.2);
      ctx.moveTo(0, -1.5); ctx.lineTo(1.2, 2.2);
      ctx.stroke();
      for (const [dx, dy] of [[-2.5, 0.5], [2.5, 0.5], [0, -0.6], [-1.2, 2.3], [1.2, 2.3], [0, 3.2]]) {
        drawLitSphere(ctx, dx, dy, 1.25, '#a855f7', '#2e1065', '#09090b', undefined, 0.6);
      }
      return true;
    }

    case 'berries_blueberry':
    case 'berries_lingonberry':
    case 'berries_cranberry':
    case 'berries_raspberry':
    case 'berries_strawberry':
    case 'berries_blackcurrant':
    case 'berries_redcurrant':
    case 'berries_cherry':
    case 'berries_blackberry':
    case 'berries_sea_buckthorn':
    case 'berries_elderberry':
    case 'blueberry_basket':
    case 'lingonberry_basket':
    case 'cranberry_basket':
    case 'raspberry_basket':
    case 'strawberry_basket':
    case 'blackcurrant_basket':
    case 'redcurrant_basket':
    case 'cherry_basket':
    case 'blackberry_basket':
    case 'sea_buckthorn_basket':
    case 'elderberry_basket': {
      drawShadow(ctx, 7.4, 2.9, 6.8, 0.26);
      drawWovenBasketBase(ctx, itemId);

      let hCol = '#93c5fd';
      let mCol = '#2563eb';
      let dCol = '#1e3a8a';
      if (itemId.includes('lingonberry') || itemId.includes('cranberry') || itemId.includes('redcurrant')) {
        hCol = '#fca5a5'; mCol = '#dc2626'; dCol = '#7f1d1d';
      } else if (itemId.includes('raspberry') || itemId.includes('strawberry')) {
        hCol = '#fda4af'; mCol = '#e11d48'; dCol = '#881337';
      } else if (itemId.includes('blackcurrant') || itemId.includes('blackberry')) {
        hCol = '#64748b'; mCol = '#18181b'; dCol = '#020617';
      } else if (itemId.includes('cherry')) {
        hCol = '#fb7185'; mCol = '#881337'; dCol = '#3b0714';
      } else if (itemId.includes('sea_buckthorn')) {
        hCol = '#fef08a'; mCol = '#f97316'; dCol = '#c2410c';
      } else if (itemId.includes('elderberry')) {
        hCol = '#a855f7'; mCol = '#3b0764'; dCol = '#1e0338';
      }

      const domePts: Array<[number, number, number]> = [
        [-3.8, -1.8, 1.5], [-1.4, -2.5, 1.6], [1.4, -2.5, 1.6], [3.8, -1.8, 1.5],
        [-2.8, -3.5, 1.5], [0, -4.0, 1.65], [2.8, -3.5, 1.5],
        [-1.8, -1.4, 1.6], [1.8, -1.4, 1.6], [0, -1.7, 1.7],
      ];
      for (const [bx, by, br] of domePts) {
        drawLitSphere(ctx, bx, by, br, hCol, mCol, dCol, undefined, 0.55);
      }
      drawBotanicalLeaf(ctx, 2.2, -3.8, 3.0, 1.0, -0.3, '#4ade80', '#14532d');
      return true;
    }

    case 'berries_fresh':
    case 'berries_tray_fresh': {
      drawShadow(ctx, 8.8, 3.3, 6.2, 0.25);
      // Thermoformed clear PET clamshell punnet with molded flange & vent slots
      const tGrad = ctx.createLinearGradient(-8.5, -5.5, 8.5, 5.5);
      tGrad.addColorStop(0.0, 'rgba(241, 245, 249, 0.8)');
      tGrad.addColorStop(0.5, 'rgba(226, 232, 240, 0.46)');
      tGrad.addColorStop(1.0, 'rgba(148, 163, 184, 0.68)');
      ctx.fillStyle = tGrad;
      ctx.beginPath();
      ctx.roundRect(-8.6, -5.6, 17.2, 11.2, 2.0);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.88)';
      ctx.lineWidth = 0.6;
      ctx.stroke();

      // Inner structural flange lip
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.55)';
      ctx.lineWidth = 0.4;
      ctx.strokeRect(-7.6, -4.6, 15.2, 9.2);

      for (const [bx, by, br] of [[-4.2, -1.6, 2.3], [3.4, -1.8, 2.4], [-1.5, 1.8, 2.4], [3.8, 1.8, 2.2]]) {
        drawLitSphere(ctx, bx, by, br, '#fb7185', '#e11d48', '#881337', undefined, 0.55);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(bx - 0.6, by - 0.4, 0.42, 0.42);
        ctx.fillRect(bx + 0.5, by + 0.3, 0.42, 0.42);
        ctx.fillStyle = '#15803d';
        ctx.beginPath();
        ctx.ellipse(bx, by - br + 0.5, 1.1, 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const [blx, bly] of [[-0.6, -2.2], [1.4, 0.3], [-4.0, 2.2]]) {
        drawLitSphere(ctx, blx, bly, 1.45, '#93c5fd', '#1e3a8a', '#0f172a', undefined, 0.35);
      }

      // Clamshell front snap clasps & fresh-produce seal label
      ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
      ctx.fillRect(-4.8, 5.2, 1.8, 0.65);
      ctx.fillRect(3.0, 5.2, 1.8, 0.65);

      ctx.fillStyle = 'rgba(248, 250, 252, 0.92)';
      ctx.beginPath();
      ctx.roundRect(-2.6, 1.8, 5.2, 2.5, 0.45);
      ctx.fill();
      ctx.fillStyle = '#15803d';
      ctx.fillRect(-2.6, 1.8, 5.2, 0.65);
      drawMicroBarcode(ctx, -1.9, 2.8, 3.8, 1.1);

      drawGlossBand(ctx, -5.4, -5.2, 2.4, 10.4, 0.38);
      return true;
    }

    // =========================================================================
    // === MUSHROOMS ===
    // =========================================================================
    case 'cep_mushroom_whole':
    case 'boletus_mushroom_whole':
    case 'aspen_boletus_whole':
    case 'butter_boletus_whole': {
      drawShadow(ctx, 6.8, 2.6, 7.2, 0.26);
      let cHi = '#b45309';
      let cMid = '#78350f';
      let cSh = '#451a03';
      let sLt = '#fefce8';
      let sSh = '#d6d3d1';
      if (itemId === 'boletus_mushroom_whole') {
        cHi = '#a8a29e'; cMid = '#57534e'; cSh = '#292524';
        sLt = '#f5f5f4'; sSh = '#78716c';
      } else if (itemId === 'aspen_boletus_whole') {
        cHi = '#fb923c'; cMid = '#ea580c'; cSh = '#9a3412';
        sLt = '#f8fafc'; sSh = '#94a3b8';
      } else if (itemId === 'butter_boletus_whole') {
        cHi = '#facc15'; cMid = '#ca8a04'; cSh = '#713f12';
        sLt = '#fef9c3'; sSh = '#ca8a04';
      }
      drawRealisticMushroomCapAndStem(ctx, cHi, cMid, cSh, sLt, sSh, 5.8, 4.4, -2.0, itemId, true);
      return true;
    }

    case 'cep_mushroom_dried': {
      drawShadow(ctx, 7.2, 2.4, 4.8, 0.22);
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 0.75;
      ctx.beginPath();
      ctx.moveTo(-7.2, 0);
      ctx.quadraticCurveTo(0, 0.8, 7.2, 0);
      ctx.stroke();

      for (const sx of [-4.6, -1.6, 1.5, 4.5]) {
        ctx.fillStyle = '#451a03';
        ctx.beginPath();
        ctx.ellipse(sx, 0.2, 1.45, 3.2, 0.08, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#d97706';
        ctx.beginPath();
        ctx.ellipse(sx, 0.2, 0.95, 2.5, 0.08, 0, Math.PI * 2);
        ctx.fill();
      }
      return true;
    }

    case 'mushrooms_chanterelle':
    case 'mushrooms_honey_agaric':
    case 'chanterelle_basket':
    case 'honey_agaric_basket': {
      const isChant = itemId === 'mushrooms_chanterelle' || itemId === 'chanterelle_basket';
      drawShadow(ctx, 7.4, 2.9, 6.8, 0.26);
      drawWovenBasketBase(ctx, itemId);
      const pts: Array<[number, number, number]> = [
        [-3.4, -2.2, 1.9], [-1.0, -3.5, 2.1], [2.0, -3.0, 2.0],
        [-2.0, -1.4, 1.85], [1.6, -1.4, 1.85], [3.6, -1.8, 1.7],
      ];
      for (const [mx, my, mr] of pts) {
        drawLitEllipse(
          ctx, mx, my, mr, mr * 0.72, 0.1,
          isChant ? '#fef08a' : '#fdba74',
          isChant ? '#f59e0b' : '#b45309',
          isChant ? '#b45309' : '#451a03',
          undefined, 0.25
        );
      }
      return true;
    }

    case 'mushroom_chanterelle_single': {
      drawShadow(ctx, 5.2, 2.0, 6.0, 0.22);
      const grad = ctx.createLinearGradient(-4, -4, 4, 6);
      grad.addColorStop(0.0, '#fef08a');
      grad.addColorStop(0.45, '#f59e0b');
      grad.addColorStop(1.0, '#b45309');
      ctx.fillStyle = grad;
      // Trumpet-shaped ruffled funnel cap + tapering golden stem
      ctx.beginPath();
      ctx.moveTo(-5.0, -2.0);
      ctx.bezierCurveTo(-2.5, -3.8, 2.5, -3.8, 5.0, -2.0);
      ctx.bezierCurveTo(3.4, 0.4, 1.5, 1.2, 1.1, 5.5);
      ctx.quadraticCurveTo(0, 6.0, -1.1, 5.5);
      ctx.bezierCurveTo(-1.5, 1.2, -3.4, 0.4, -5.0, -2.0);
      ctx.closePath();
      ctx.fill();
      // False decurrent gill ridges running down stem
      ctx.strokeStyle = 'rgba(146, 64, 14, 0.55)';
      ctx.lineWidth = 0.42;
      for (const rx of [-2.4, -0.8, 0.8, 2.4]) {
        ctx.beginPath();
        ctx.moveTo(rx, -1.5);
        ctx.quadraticCurveTo(rx * 0.45, 1.2, rx * 0.22, 3.8);
        ctx.stroke();
      }
      return true;
    }

    case 'mushroom_honey_agaric_single': {
      drawShadow(ctx, 5.0, 2.0, 6.0, 0.22);
      // Slender ringed stem
      const sGrad = ctx.createLinearGradient(-1.4, 0, 1.4, 5.8);
      sGrad.addColorStop(0, '#fef3c7');
      sGrad.addColorStop(1, '#b45309');
      ctx.fillStyle = sGrad;
      ctx.beginPath();
      ctx.roundRect(-1.25, -0.5, 2.5, 6.2, 0.8);
      ctx.fill();
      // Annulus skirt ring
      ctx.fillStyle = '#fffbeb';
      ctx.beginPath();
      ctx.ellipse(0, 1.4, 1.85, 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      drawRealisticMushroomCapAndStem(ctx, '#fbbf24', '#b45309', '#78350f', '#fef3c7', '#b45309', 4.4, 2.8, -0.8, itemId, false);
      // Central scaly flecks
      ctx.fillStyle = 'rgba(69, 26, 3, 0.55)';
      for (const [fx, fy] of [[-1.0, -2.2], [0.8, -2.0], [0, -2.6]]) {
        ctx.fillRect(fx, fy, 0.5, 0.4);
      }
      return true;
    }

    case 'milk_mushroom_salted': {
      drawShadow(ctx, 6.6, 2.6, 7.6, 0.25);
      drawGlassJarShell(ctx, -4.8, -4.0, 9.6, 11.0, 1.8, '#eab308', '#854d0e', () => {
        ctx.fillStyle = 'rgba(241, 245, 249, 0.72)';
        ctx.fillRect(-4.8, -2.4, 9.6, 9.5);
        for (const [mx, my, rot] of [[-1.6, 0.2, 0.2], [1.6, 1.8, -0.25], [-0.4, 4.2, 0.1]]) {
          ctx.save();
          ctx.translate(mx, my);
          ctx.rotate(rot);
          ctx.fillStyle = '#f8fafc';
          ctx.beginPath();
          ctx.ellipse(0, 0, 2.4, 1.35, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = 0.4;
          ctx.stroke();
          ctx.restore();
        }
        drawBotanicalLeaf(ctx, -2.2, 2.2, 3.0, 0.9, -0.2, '#84cc16', '#365314');
        ctx.fillStyle = '#18181b';
        ctx.beginPath();
        ctx.arc(1.8, 4.6, 0.45, 0, Math.PI * 2);
        ctx.fill();
      });
      drawStudioLabelPanel(ctx, -4.2, 2.2, 8.4, 3.8, {
        paperColor: '#fef9e7',
        bandColor: '#451a03',
        accentColor: '#ca8a04',
        inkColor: '#1e293b',
        goldFoil: false,
        hasBarcode: true,
        emblem: 'none',
        cylindrical: true
      });
      return true;
    }

    case 'morel_spring_mushroom': {
      drawShadow(ctx, 5.8, 2.3, 6.8, 0.24);
      const sGrad = ctx.createLinearGradient(-1.8, 0, 1.8, 6);
      sGrad.addColorStop(0, '#fffbeb');
      sGrad.addColorStop(0.6, '#fef3c7');
      sGrad.addColorStop(1, '#d97706');
      ctx.fillStyle = sGrad;
      ctx.beginPath();
      ctx.roundRect(-1.6, 0.5, 3.2, 5.8, 1.0);
      ctx.fill();

      // Conical honeycomb cap with deep shaded alveolar pits
      const mGrad = ctx.createRadialGradient(-1.2, -3.5, 0.5, 0.4, -2.0, 5.4);
      mGrad.addColorStop(0, '#d97706');
      mGrad.addColorStop(0.5, '#78350f');
      mGrad.addColorStop(1, '#451a03');
      ctx.fillStyle = mGrad;
      ctx.beginPath();
      ctx.moveTo(-3.6, 1.2);
      ctx.bezierCurveTo(-3.4, -3.5, -1.2, -6.8, 0, -7.2);
      ctx.bezierCurveTo(1.2, -6.8, 3.4, -3.5, 3.6, 1.2);
      ctx.closePath();
      ctx.fill();

      // Honeycomb ridges
      ctx.strokeStyle = 'rgba(254, 243, 199, 0.42)';
      ctx.lineWidth = 0.45;
      for (const [px, py, rx, ry] of [
        [-1.0, -3.8, 0.7, 0.9], [0.8, -3.2, 0.75, 0.9],
        [-1.4, -1.4, 0.85, 1.0], [0.2, -1.2, 0.8, 1.0], [1.7, -0.8, 0.7, 0.9],
        [-0.8, 0.3, 0.85, 0.75], [1.1, 0.4, 0.75, 0.75],
      ]) {
        ctx.fillStyle = 'rgba(28, 25, 23, 0.65)';
        ctx.beginPath();
        ctx.ellipse(px, py, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      return true;
    }

    case 'truffle_black_rare': {
      drawShadow(ctx, 6.4, 2.5, 5.8, 0.26);
      drawOrganicBlobPath(ctx, 0, 0, 5.0, 4.6, 303, 0.14, 14);
      const tGrad = ctx.createRadialGradient(-1.6, -1.6, 0.4, 0.4, 0.4, 5.6);
      tGrad.addColorStop(0.0, '#52525b');
      tGrad.addColorStop(0.45, '#27272a');
      tGrad.addColorStop(1.0, '#09090b');
      ctx.fillStyle = tGrad;
      ctx.fill();

      // Polyhedral peridium diamond warts
      ctx.strokeStyle = 'rgba(113, 113, 122, 0.55)';
      ctx.lineWidth = 0.42;
      for (let i = 0; i < 12; i++) {
        const a = hash01('truffle', i * 3) * Math.PI * 2;
        const d = Math.sqrt(hash01('truffle', i * 3 + 1)) * 3.4;
        const wx = Math.cos(a) * d;
        const wy = Math.sin(a) * d;
        ctx.beginPath();
        ctx.moveTo(wx, wy - 0.7);
        ctx.lineTo(wx + 0.7, wy);
        ctx.lineTo(wx, wy + 0.7);
        ctx.lineTo(wx - 0.7, wy);
        ctx.closePath();
        ctx.stroke();
      }
      return true;
    }

    case 'champignon_white_whole':
    case 'champignon_brown_whole': {
      const isBrown = itemId === 'champignon_brown_whole';
      drawShadow(ctx, 5.8, 2.3, 6.4, 0.24);
      drawRealisticMushroomCapAndStem(
        ctx,
        isBrown ? '#d97706' : '#ffffff',
        isBrown ? '#92400e' : '#f1f5f9',
        isBrown ? '#451a03' : '#94a3b8',
        '#ffffff', '#cbd5e1',
        4.8, 3.8, -0.6, itemId, false
      );
      return true;
    }

    case 'champignon_sliced': {
      drawShadow(ctx, 6.0, 2.3, 5.4, 0.2);
      const sGrad = ctx.createLinearGradient(-4, -4, 4, 4);
      sGrad.addColorStop(0.0, '#ffffff');
      sGrad.addColorStop(0.65, '#f5f5f4');
      sGrad.addColorStop(1.0, '#d6d3d1');
      ctx.fillStyle = sGrad;
      ctx.beginPath();
      ctx.moveTo(-4.8, -1.0);
      ctx.bezierCurveTo(-5.0, -4.6, 5.0, -4.6, 4.8, -1.0);
      ctx.lineTo(1.5, -0.5);
      ctx.lineTo(1.2, 4.4);
      ctx.quadraticCurveTo(0, 4.9, -1.2, 4.4);
      ctx.lineTo(-1.5, -0.5);
      ctx.closePath();
      ctx.fill();
      // Exposed dark chocolate gills flanking stem
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.ellipse(-2.8, -1.0, 1.4, 0.7, 0, 0, Math.PI * 2);
      ctx.ellipse(2.8, -1.0, 1.4, 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    case 'oyster_mushroom_cluster': {
      drawShadow(ctx, 7.4, 2.7, 6.0, 0.24);
      // Stems merging at left base
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.moveTo(-4.8, 4.2);
      ctx.lineTo(-1.6, 0);
      ctx.lineTo(1.2, 2.2);
      ctx.lineTo(-3.2, 4.8);
      ctx.closePath();
      ctx.fill();

      for (const [ox, oy, rx, ry, rot] of [
        [-2.8, 0.6, 3.4, 2.0, -0.2],
        [2.2, 0.4, 3.6, 2.1, 0.25],
        [-0.8, -2.5, 3.8, 2.2, -0.1],
        [2.8, -2.2, 3.2, 1.9, 0.3],
      ]) {
        drawLitEllipse(ctx, ox, oy, rx, ry, rot, '#f1f5f9', '#94a3b8', '#475569', undefined, 0.22);
      }
      return true;
    }

    case 'shiitake_fresh':
    case 'shiitake_dried':
    case 'shiitake_dried_bag':
    case 'portobello_mushroom':
    case 'wood_ear_mushroom_dried':
    case 'parasol_mushroom_cap':
    case 'enoki_mushroom_bunch': {
      drawShadow(ctx, 6.8, 2.6, 6.6, 0.24);
      if (itemId === 'enoki_mushroom_bunch') {
        // Creamy mycelium base & bundle of slender ivory needles
        ctx.fillStyle = '#fef3c7';
        ctx.beginPath();
        ctx.roundRect(-2.6, 3.2, 5.2, 3.2, 1.2);
        ctx.fill();
        for (let i = -3; i <= 3; i++) {
          const tx = i * 1.15;
          const topX = i * 1.45;
          const topY = -4.2 + Math.abs(i) * 0.45;
          ctx.strokeStyle = i % 2 === 0 ? '#ffffff' : '#fefce8';
          ctx.lineWidth = 0.85;
          ctx.beginPath();
          ctx.moveTo(tx * 0.6, 4.2);
          ctx.quadraticCurveTo(tx * 0.9, 0, topX, topY);
          ctx.stroke();
          drawLitSphere(ctx, topX, topY, 0.92, '#ffffff', '#f8fafc', '#cbd5e1', undefined, 0.35);
        }
        return true;
      }

      if (itemId === 'wood_ear_mushroom_dried') {
        drawOrganicBlobPath(ctx, -1.4, -0.4, 4.4, 3.6, 404, 0.2, 12);
        const wGrad = ctx.createRadialGradient(-2, -1, 0.4, 0, 0, 5.2);
        wGrad.addColorStop(0, '#52525b');
        wGrad.addColorStop(0.6, '#27272a');
        wGrad.addColorStop(1, '#09090b');
        ctx.fillStyle = wGrad;
        ctx.fill();
        drawOrganicBlobPath(ctx, 1.6, 0.6, 4.0, 3.2, 405, 0.2, 12);
        ctx.fill();
        return true;
      }

      if (itemId === 'shiitake_dried_bag') {
        const kGrad = ctx.createLinearGradient(-5.4, -5.8, 5.4, 5.8);
        kGrad.addColorStop(0.0, '#d6b68a');
        kGrad.addColorStop(0.55, '#b6895b');
        kGrad.addColorStop(1.0, '#78502b');
        ctx.fillStyle = kGrad;
        ctx.beginPath();
        ctx.roundRect(-5.4, -5.6, 10.8, 11.4, 1.2);
        ctx.fill();
        drawCrimpedSeal(ctx, -5.4, -6.4, 10.8, 1.1, '#9c7146', true, 0.8);

        drawFilmWindow(
          ctx,
          () => {
            ctx.beginPath();
            ctx.roundRect(-3.8, -1.0, 7.6, 5.4, 1.1);
          },
          () => {
            for (const [sx, sy] of [[-1.6, 0.5], [1.6, 1.0], [0, 2.8]]) {
              drawLitEllipse(ctx, sx, sy, 2.1, 1.35, 0.2, '#a16207', '#78350f', '#292524', undefined, 0.15);
            }
          },
          'rgba(255, 251, 235, 0.65)',
          '#292524'
        );

        drawStudioLabelPanel(ctx, -4.4, -4.8, 8.8, 3.1, {
          paperColor: '#f8f5ec',
          bandColor: '#78350f',
          accentColor: '#ca8a04',
          inkColor: '#451a03',
          goldFoil: true,
          hasBarcode: true,
          emblem: 'leaf',
          cylindrical: false
        });
        drawPouchCrinkles(ctx, -4.6, -4.8, 9.2, 9.8, 77, 0.2);
        return true;
      }

      // Broad umbo mushroom caps (shiitake, portobello, parasol)
      const isParasol = itemId === 'parasol_mushroom_cap';
      drawLitEllipse(
        ctx, 0, 0, 6.4, 4.2, 0,
        isParasol ? '#fef3c7' : '#a16207',
        isParasol ? '#d97706' : '#78350f',
        '#292524', undefined, 0.22
      );
      if (isParasol) {
        // Concentric brown scales around umbo
        ctx.fillStyle = '#78350f';
        ctx.beginPath();
        ctx.ellipse(0, -0.3, 1.6, 1.0, 0, 0, Math.PI * 2);
        ctx.fill();
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI * 2) / 8;
          ctx.fillRect(Math.cos(a) * 3.0 - 0.4, Math.sin(a) * 1.9 - 0.3, 0.8, 0.55);
        }
      } else {
        // Typical shiitake pale star cracks
        ctx.strokeStyle = 'rgba(254, 243, 199, 0.45)';
        ctx.lineWidth = 0.45;
        ctx.beginPath();
        ctx.moveTo(-1.8, -0.8); ctx.lineTo(1.8, 0.6);
        ctx.moveTo(1.2, -1.2); ctx.lineTo(-1.0, 1.1);
        ctx.stroke();
      }
      return true;
    }

    default:
      return false;
  }
}
