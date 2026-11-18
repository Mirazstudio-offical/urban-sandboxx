// Procedural 2D Canvas Studio Models for Medical Packaging, Vials, Tubes & Blisters
import {
  drawShadow,
  drawMedicalCross,
  drawLitSphere,
  drawCrimpedSeal,
  drawScrewCap,
  drawStudioLabelPanel,
  drawMicroBarcode,
  applyCylinderLightingOverlay,
  adjustHex,
  hexToRgba
} from './itemGraphicShared';

function drawBlisterCard(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  bannerHex: string,
  drawCell: (cx: number, cy: number, idx: number) => void,
  coords: Array<[number, number]>
) {
  const hw = w * 0.5;
  const hh = h * 0.5;

  // Brushed matte aluminum lidding foil card with beveled perimeter
  const foilGrad = ctx.createLinearGradient(-hw, -hh, hw, hh);
  foilGrad.addColorStop(0.0, '#f1f5f9');
  foilGrad.addColorStop(0.35, '#cbd5e1');
  foilGrad.addColorStop(0.7, '#e2e8f0');
  foilGrad.addColorStop(1.0, '#94a3b8');
  ctx.fillStyle = foilGrad;
  ctx.beginPath();
  ctx.roundRect(-hw, -hh, w, h, 1.25);
  ctx.fill();

  ctx.strokeStyle = 'rgba(71, 85, 105, 0.45)';
  ctx.lineWidth = 0.32;
  ctx.stroke();

  // Foil cross-hatch micro-texture + center perforation score line
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.14)';
  ctx.lineWidth = 0.25;
  ctx.setLineDash([0.65, 0.55]);
  ctx.beginPath();
  ctx.moveTo(0, -hh + 3.4);
  ctx.lineTo(0, hh - 0.6);
  ctx.stroke();
  ctx.setLineDash([]);

  // Clinical pharmaceutical header strip + micro-barcode
  ctx.fillStyle = bannerHex;
  ctx.beginPath();
  ctx.roundRect(-hw, -hh, w, 2.8, [1.25, 1.25, 0, 0]);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.fillRect(-hw + 1.1, -hh + 1.05, w * 0.45, 0.55);
  drawMicroBarcode(ctx, hw - 3.6, -hh + 0.65, 2.6, 1.45, '#0f172a', 'rgba(255, 255, 255, 0.88)');

  // Render thermoformed PVC blister domes & enclosed tablets/capsules
  coords.forEach(([cx, cy], idx) => {
    drawCell(cx, cy, idx);
  });
}

function drawStudioPharmaBottle(
  ctx: CanvasRenderingContext2D,
  opts: {
    w: number;
    topY: number;
    botY: number;
    bodyHex: string;
    liquidHex?: string;
    translucent: boolean;
    capColor: string;
    labelBand: string;
    labelAccent: string;
    crossColor?: string;
    hazardDiamond?: boolean;
  }
) {
  const {
    w,
    topY,
    botY,
    bodyHex,
    liquidHex,
    translucent,
    capColor,
    labelBand,
    labelAccent,
    crossColor,
    hazardDiamond
  } = opts;
  const hw = w * 0.5;
  const neckW = Math.min(2.3, hw * 0.46);
  const shY = topY + 2.2;

  const traceBody = () => {
    ctx.beginPath();
    ctx.moveTo(-neckW, topY);
    ctx.lineTo(neckW, topY);
    ctx.lineTo(neckW, topY + 1.1);
    ctx.quadraticCurveTo(hw, topY + 1.4, hw, shY + 0.8);
    ctx.lineTo(hw, botY - 1.1);
    ctx.quadraticCurveTo(hw, botY + 0.5, 0, botY + 0.5);
    ctx.quadraticCurveTo(-hw, botY + 0.5, -hw, botY - 1.1);
    ctx.lineTo(-hw, shY + 0.8);
    ctx.quadraticCurveTo(-hw, topY + 1.4, -neckW, topY + 1.1);
    ctx.closePath();
  };

  const bGrad = ctx.createLinearGradient(-hw, 0, hw, 0);
  const alpha = translucent ? 0.9 : 1.0;
  bGrad.addColorStop(0.0, hexToRgba(adjustHex(bodyHex, -0.32), alpha));
  bGrad.addColorStop(0.26, hexToRgba(adjustHex(bodyHex, 0.25), alpha));
  bGrad.addColorStop(0.58, hexToRgba(bodyHex, alpha * 0.94));
  bGrad.addColorStop(0.88, hexToRgba(adjustHex(bodyHex, -0.28), alpha));
  bGrad.addColorStop(1.0, hexToRgba(adjustHex(bodyHex, -0.45), alpha));
  ctx.fillStyle = bGrad;
  traceBody();
  ctx.fill();

  if (liquidHex) {
    ctx.save();
    traceBody();
    ctx.clip();
    const liqY = shY + 1.6;
    const lGrad = ctx.createLinearGradient(-hw, liqY, hw, botY);
    lGrad.addColorStop(0.0, adjustHex(liquidHex, -0.22));
    lGrad.addColorStop(0.35, adjustHex(liquidHex, 0.16));
    lGrad.addColorStop(1.0, adjustHex(liquidHex, -0.38));
    ctx.fillStyle = lGrad;
    ctx.fillRect(-hw, liqY, w, botY - liqY + 1);
    ctx.fillStyle = hexToRgba(adjustHex(liquidHex, 0.4), 0.5);
    ctx.beginPath();
    ctx.ellipse(0, liqY, hw * 0.88, 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Cylindrical highlight & edge
  ctx.save();
  traceBody();
  ctx.clip();
  applyCylinderLightingOverlay(ctx, -hw, topY, w, botY - topY + 1, translucent ? 0.34 : 0.2, 0.3);
  ctx.restore();

  ctx.strokeStyle = hexToRgba(adjustHex(bodyHex, -0.5), 0.55);
  ctx.lineWidth = 0.32;
  traceBody();
  ctx.stroke();

  // Clinical wraparound label
  const lblY = shY + 1.5;
  const lblH = (botY - shY) * 0.56;
  drawStudioLabelPanel(ctx, -hw * 0.94, lblY, w * 0.94, lblH, {
    paperColor: '#f8fafc',
    bandColor: labelBand,
    accentColor: labelAccent,
    inkColor: '#0f172a',
    goldFoil: false,
    hasBarcode: w >= 8.2,
    emblem: 'none',
    cylindrical: true
  });

  if (crossColor) {
    drawMedicalCross(ctx, -hw * 0.32, lblY + lblH * 0.62, 2.2, crossColor);
  }
  if (hazardDiamond) {
    ctx.save();
    ctx.translate(0, lblY + lblH * 0.62);
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.moveTo(0, -1.15);
    ctx.lineTo(1.25, 0);
    ctx.lineTo(0, 1.15);
    ctx.lineTo(-1.25, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Child-resistant knurled screw cap
  drawScrewCap(ctx, 0, topY - 2.0, neckW * 2.35, 2.35, capColor, true);
}

function drawStudioOintmentTube(
  ctx: CanvasRenderingContext2D,
  bodyHex: string,
  bandHex: string,
  accentHex: string,
  crossHex: string,
  capHex: string,
  diagonalBand: boolean
) {
  // Tapered aluminum/laminate squeeze barrel
  const traceTube = () => {
    ctx.beginPath();
    ctx.moveTo(-2.6, -7.2);
    ctx.lineTo(2.6, -7.2);
    ctx.quadraticCurveTo(5.2, -5.8, 5.4, -3.5);
    ctx.lineTo(5.8, 6.2);
    ctx.lineTo(-5.8, 6.2);
    ctx.lineTo(-5.4, -3.5);
    ctx.quadraticCurveTo(-5.2, -5.8, -2.6, -7.2);
    ctx.closePath();
  };

  const bGrad = ctx.createLinearGradient(-5.8, 0, 5.8, 0);
  bGrad.addColorStop(0.0, adjustHex(bodyHex, -0.3));
  bGrad.addColorStop(0.28, adjustHex(bodyHex, 0.25));
  bGrad.addColorStop(0.55, bodyHex);
  bGrad.addColorStop(0.85, adjustHex(bodyHex, -0.25));
  bGrad.addColorStop(1.0, adjustHex(bodyHex, -0.4));
  ctx.fillStyle = bGrad;
  traceTube();
  ctx.fill();

  ctx.save();
  traceTube();
  ctx.clip();

  if (diagonalBand) {
    ctx.fillStyle = bandHex;
    ctx.beginPath();
    ctx.moveTo(-6, -3.2);
    ctx.lineTo(6, -5.6);
    ctx.lineTo(6, 0.8);
    ctx.lineTo(-6, 3.2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = accentHex;
    ctx.beginPath();
    ctx.moveTo(-6, 2.6);
    ctx.lineTo(6, 0.2);
    ctx.lineTo(6, 1.3);
    ctx.lineTo(-6, 3.7);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillStyle = bandHex;
    ctx.fillRect(-6, -4.0, 12, 4.8);
    ctx.fillStyle = accentHex;
    ctx.beginPath();
    ctx.moveTo(-6, -1.0);
    ctx.quadraticCurveTo(0, -2.8, 6, -1.0);
    ctx.lineTo(6, 0.2);
    ctx.quadraticCurveTo(0, -1.6, -6, 0.2);
    ctx.closePath();
    ctx.fill();
  }

  // Clinical cross badge
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.arc(-2.0, -1.4, 1.75, 0, Math.PI * 2);
  ctx.fill();
  drawMedicalCross(ctx, -2.0, -1.4, 2.2, crossHex);

  // Spec text bars & barcode
  ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
  ctx.fillRect(0.6, -2.2, 3.6, 0.45);
  ctx.fillRect(0.6, -1.2, 2.8, 0.38);
  drawMicroBarcode(ctx, -4.4, 3.6, 4.2, 1.4, '#0f172a', 'rgba(255,255,255,0.85)');

  applyCylinderLightingOverlay(ctx, -6.0, -7.2, 12.0, 13.5, 0.28, 0.3);
  ctx.restore();

  // Sharp tube outline
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.35)';
  ctx.lineWidth = 0.32;
  traceTube();
  ctx.stroke();

  // Crimped metallic tail fold at bottom
  drawCrimpedSeal(ctx, -5.9, 6.0, 11.8, 1.65, '#94a3b8', true, 0.78);

  // Ribbed octagonal/cylindrical screw cap on nozzle top
  drawScrewCap(ctx, 0, -9.8, 5.2, 2.8, capHex, false);
}

export function drawMedicalItem(ctx: CanvasRenderingContext2D, itemId: string): boolean {
  switch (itemId) {
    case 'medkit': {
      drawShadow(ctx, 9.2, 3.3, 8.0, 0.28);

      // Molded black HDPE hardcase body with recessed perimeter frame
      const caseGrad = ctx.createLinearGradient(-9, -6, 9, 7.5);
      caseGrad.addColorStop(0.0, '#3f3f46');
      caseGrad.addColorStop(0.25, '#27272a');
      caseGrad.addColorStop(0.75, '#18181b');
      caseGrad.addColorStop(1.0, '#09090b');
      ctx.fillStyle = caseGrad;
      ctx.beginPath();
      ctx.roundRect(-9.0, -5.5, 18.0, 13.0, 2.0);
      ctx.fill();

      // Inner molded shell step line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
      ctx.lineWidth = 0.38;
      ctx.beginPath();
      ctx.roundRect(-8.3, -4.8, 16.6, 11.6, 1.5);
      ctx.stroke();

      // Molded integrated carrying handle
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.roundRect(-4.5, -8.4, 9.0, 3.4, 1.35);
      ctx.fill();
      ctx.strokeStyle = '#3f3f46';
      ctx.lineWidth = 0.45;
      ctx.stroke();
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.roundRect(-3.0, -7.1, 6.0, 1.85, 0.85);
      ctx.fill();

      // Dual beveled red polycarbonate snap latches
      for (const lx of [-6.5, 4.1]) {
        const lGrad = ctx.createLinearGradient(lx, -6.1, lx + 2.4, -3.5);
        lGrad.addColorStop(0, '#ef4444');
        lGrad.addColorStop(0.5, '#dc2626');
        lGrad.addColorStop(1, '#7f1d1d');
        ctx.fillStyle = lGrad;
        ctx.beginPath();
        ctx.roundRect(lx, -6.0, 2.4, 2.5, 0.45);
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.fillRect(lx + 0.2, -5.85, 2.0, 0.35);
      }

      // Clinical white specification plate with crisp emerald cross & barcode
      drawStudioLabelPanel(ctx, -6.4, -3.2, 12.8, 9.2, {
        paperColor: '#f8fafc',
        bandColor: '#15803d',
        accentColor: '#16a34a',
        inkColor: '#0f172a',
        goldFoil: false,
        hasBarcode: true,
        emblem: 'none',
        cylindrical: false
      });

      drawMedicalCross(ctx, 0, 1.35, 4.6, '#16a34a');
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(-0.55, 0.8, 1.1, 1.1);
      return true;
    }

    case 'bandage': {
      drawShadow(ctx, 7.2, 2.6, 7.5, 0.2);

      // Rolled sterile cotton gauze cylinder
      const gGrad = ctx.createRadialGradient(-1.5, -1.5, 0.5, 0, 0, 6.5);
      gGrad.addColorStop(0.0, '#ffffff');
      gGrad.addColorStop(0.65, '#f1f5f9');
      gGrad.addColorStop(1.0, '#cbd5e1');
      ctx.fillStyle = gGrad;
      ctx.beginPath();
      ctx.ellipse(0, 0, 6.2, 6.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Concentric woven gauze spiral layers
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.6)';
      ctx.lineWidth = 0.55;
      for (const r of [5.1, 3.9, 2.7]) {
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 1.85);
        ctx.stroke();
      }
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.arc(0, 0, 1.25, 0, Math.PI * 2);
      ctx.fill();

      // Trailing folded gauze strip
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(2.8, 4.2);
      ctx.quadraticCurveTo(5.8, 5.8, 8.2, 4.8);
      ctx.lineTo(8.2, 6.8);
      ctx.quadraticCurveTo(4.8, 7.4, 1.8, 5.8);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(203, 213, 225, 0.7)';
      ctx.lineWidth = 0.3;
      ctx.stroke();

      drawMedicalCross(ctx, -2.0, -2.0, 2.3, '#0284c7');
      return true;
    }

    case 'painkillers': {
      drawShadow(ctx, 7.0, 2.6, 7.5, 0.22);
      drawBlisterCard(
        ctx,
        13.2,
        15.2,
        '#0284c7',
        (rx, ry) => {
          // Recessed PVC pocket rim
          ctx.fillStyle = 'rgba(15, 23, 42, 0.16)';
          ctx.beginPath();
          ctx.ellipse(rx + 0.15, ry + 0.25, 2.15, 1.28, 0, 0, Math.PI * 2);
          ctx.fill();

          // Bicolored hard gelatin capsule
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(rx - 1.55, ry - 0.78, 3.1, 1.56, 0.78);
          ctx.clip();
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(rx - 1.6, ry - 0.9, 1.65, 1.8);
          ctx.fillStyle = '#0284c7';
          ctx.fillRect(rx, ry - 0.9, 1.65, 1.8);
          // Gelcap specular glint
          ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
          ctx.fillRect(rx - 1.3, ry - 0.58, 2.5, 0.34);
          ctx.restore();

          // Glossy thermoformed PVC blister dome arc over capsule
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
          ctx.lineWidth = 0.35;
          ctx.beginPath();
          ctx.ellipse(rx, ry, 2.05, 1.18, 0, Math.PI * 1.1, Math.PI * 1.85);
          ctx.stroke();
        },
        [
          [-3.2, -2.8], [3.2, -2.8],
          [-3.2, 0.0], [3.2, 0.0],
          [-3.2, 2.8], [3.2, 2.8],
          [-3.2, 5.6], [3.2, 5.6]
        ]
      );
      return true;
    }

    case 'vitamins': {
      drawShadow(ctx, 6.2, 2.4, 7.8, 0.22);
      drawStudioPharmaBottle(ctx, {
        w: 10.0,
        topY: -4.2,
        botY: 7.2,
        bodyHex: '#b45309',
        liquidHex: '#92400e',
        translucent: true,
        capColor: '#f8fafc',
        labelBand: '#0d9488',
        labelAccent: '#f59e0b',
        crossColor: '#0d9488'
      });
      return true;
    }

    case 'splint': {
      drawShadow(ctx, 8.2, 2.9, 7.5, 0.22);

      // Rolled blue aluminum & closed-cell foam SAM splint
      const alGrad = ctx.createLinearGradient(-7.5, 0, 7.5, 0);
      alGrad.addColorStop(0.0, '#1e3a8a');
      alGrad.addColorStop(0.4, '#2563eb');
      alGrad.addColorStop(1.0, '#172554');
      ctx.fillStyle = alGrad;
      ctx.beginPath();
      ctx.roundRect(-7.5, -6.5, 15.0, 13.5, 1.8);
      ctx.fill();

      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.roundRect(-6.5, -5.5, 13.0, 11.5, 1.3);
      ctx.fill();

      // Matte nylon compression straps & brushed steel D-buckles
      for (const sy of [-3.0, 2.0]) {
        ctx.fillStyle = '#18181b';
        ctx.fillRect(-7.8, sy, 15.6, 2.2);
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(3.8, sy - 0.1, 1.8, 2.4);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(4.3, sy + 0.35, 0.8, 1.5);
      }
      return true;
    }

    case 'antiseptic': {
      drawShadow(ctx, 5.8, 2.4, 7.8, 0.22);
      drawStudioPharmaBottle(ctx, {
        w: 9.0,
        topY: -3.6,
        botY: 7.2,
        bodyHex: '#059669',
        liquidHex: '#10b981',
        translucent: true,
        capColor: '#f8fafc',
        labelBand: '#047857',
        labelAccent: '#dc2626',
        crossColor: '#dc2626'
      });

      // White mist spray pump head + directional nozzle insert
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.roundRect(-2.4, -8.5, 4.8, 3.0, 0.7);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(1.8, -7.6, 0.85, 1.0);
      return true;
    }

    case 'antipyretic': {
      drawShadow(ctx, 6.8, 2.6, 7.5, 0.22);
      drawBlisterCard(
        ctx,
        12.4,
        14.0,
        '#16a34a',
        (tx, ty) => {
          ctx.fillStyle = 'rgba(15, 23, 42, 0.14)';
          ctx.beginPath();
          ctx.arc(tx + 0.15, ty + 0.2, 2.1, 0, Math.PI * 2);
          ctx.fill();

          drawLitSphere(ctx, tx, ty, 1.72, '#ffffff', '#f1f5f9', '#cbd5e1', undefined, 0.35);

          // Precision scored break line across biconvex white tablet
          ctx.strokeStyle = 'rgba(71, 85, 105, 0.55)';
          ctx.lineWidth = 0.36;
          ctx.beginPath();
          ctx.moveTo(tx - 1.15, ty);
          ctx.lineTo(tx + 1.15, ty);
          ctx.stroke();

          ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.lineWidth = 0.32;
          ctx.beginPath();
          ctx.arc(tx, ty, 2.0, Math.PI * 1.1, Math.PI * 1.85);
          ctx.stroke();
        },
        [
          [-3.0, -1.8], [3.0, -1.8],
          [-3.0, 1.7], [3.0, 1.7],
          [-3.0, 5.2], [3.0, 5.2]
        ]
      );
      return true;
    }

    case 'eye_drops': {
      drawShadow(ctx, 5.2, 2.1, 7.8, 0.2);

      // Matte LDPE dropper vial
      const bGrad = ctx.createLinearGradient(-4, 0, 4, 0);
      bGrad.addColorStop(0.0, '#cbd5e1');
      bGrad.addColorStop(0.32, '#ffffff');
      bGrad.addColorStop(0.75, '#e0f2fe');
      bGrad.addColorStop(1.0, '#94a3b8');
      ctx.fillStyle = bGrad;
      ctx.beginPath();
      ctx.roundRect(-4.0, -2.0, 8.0, 9.4, 1.8);
      ctx.fill();

      drawStudioLabelPanel(ctx, -3.75, -0.2, 7.5, 5.0, {
        paperColor: '#f8fafc',
        bandColor: '#0284c7',
        accentColor: '#38bdf8',
        inkColor: '#0f172a',
        goldFoil: false,
        hasBarcode: true,
        emblem: 'circle',
        cylindrical: true
      });

      // Tapered dropper shoulder + royal-blue ribbed sterile cap
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(-2.4, -2.0);
      ctx.lineTo(2.4, -2.0);
      ctx.lineTo(1.1, -5.2);
      ctx.lineTo(-1.1, -5.2);
      ctx.closePath();
      ctx.fill();
      drawScrewCap(ctx, 0, -8.2, 4.2, 3.2, '#1d4ed8', true);
      return true;
    }

    case 'medical_patch': {
      drawShadow(ctx, 7.8, 2.8, 7.5, 0.2);

      // Woven breathable micropore adhesive fabric plaster
      const fGrad = ctx.createLinearGradient(-8, -4, 8, 4);
      fGrad.addColorStop(0.0, '#fcd34d');
      fGrad.addColorStop(0.5, '#f59e0b');
      fGrad.addColorStop(1.0, '#d97706');
      ctx.fillStyle = fGrad;
      ctx.beginPath();
      ctx.roundRect(-8.0, -3.8, 16.0, 7.6, 2.8);
      ctx.fill();

      // Sterile non-adherent white gauze island in center
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(-3.4, -2.8, 6.8, 5.6, 0.8);
      ctx.fill();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
      ctx.lineWidth = 0.28;
      ctx.stroke();

      // Micro-perforation aeration dots
      ctx.fillStyle = 'rgba(120, 53, 15, 0.45)';
      for (let x = -6.8; x <= 6.8; x += 1.4) {
        if (x >= -3.6 && x <= 3.6) continue;
        for (const y of [-1.8, 0, 1.8]) {
          ctx.beginPath();
          ctx.arc(x, y, 0.24, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      return true;
    }

    case 'thermometer': {
      drawShadow(ctx, 8.2, 2.1, 7.5, 0.18);

      const tGrad = ctx.createLinearGradient(0, -2.4, 0, 2.4);
      tGrad.addColorStop(0, '#ffffff');
      tGrad.addColorStop(1, '#cbd5e1');
      ctx.fillStyle = tGrad;
      ctx.beginPath();
      ctx.roundRect(-8.5, -2.4, 17.0, 4.8, 2.0);
      ctx.fill();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 0.4;
      ctx.stroke();

      // Stainless steel thermistor tip
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.roundRect(-9.5, -1.4, 3.4, 2.8, 0.9);
      ctx.fill();

      // Recessed LCD glass display
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-3.0, -1.65, 6.4, 3.3);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-2.0, -0.9, 1.1, 1.8);
      ctx.fillRect(-0.2, -0.9, 1.1, 1.8);
      ctx.fillRect(1.6, -0.9, 1.1, 1.8);
      ctx.fillRect(0.85, 0.7, 0.5, 0.5);

      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.arc(5.2, 0, 1.1, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    case 'panthenol':
    case 'panthenol_spray': {
      drawShadow(ctx, 6.4, 2.6, 8.0, 0.24);

      // Pressurized aluminum aerosol canister
      const canGrad = ctx.createLinearGradient(-5.2, 0, 5.2, 0);
      canGrad.addColorStop(0.0, '#cbd5e1');
      canGrad.addColorStop(0.26, '#ffffff');
      canGrad.addColorStop(0.6, '#f8fafc');
      canGrad.addColorStop(1.0, '#94a3b8');
      ctx.fillStyle = canGrad;
      ctx.beginPath();
      ctx.roundRect(-5.2, -8.2, 10.4, 16.0, [2.4, 2.4, 1.4, 1.4]);
      ctx.fill();

      // Pharmaceutical orange-crimson burn band + barcode
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(-5.2, -8.2, 10.4, 16.0, [2.4, 2.4, 1.4, 1.4]);
      ctx.clip();

      ctx.fillStyle = '#f97316';
      ctx.fillRect(-5.4, -2.4, 10.8, 4.8);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-5.4, 1.4, 10.8, 1.3);
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(-5.4, 4.4, 10.8, 1.5);

      drawMedicalCross(ctx, -1.8, -0.1, 2.8, '#ffffff');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0.5, -0.7, 3.6, 0.45);
      ctx.fillRect(0.5, 0.2, 2.8, 0.4);
      drawMicroBarcode(ctx, 1.8, 3.0, 2.6, 1.2, '#0f172a', 'rgba(255,255,255,0.88)');

      applyCylinderLightingOverlay(ctx, -5.2, -8.2, 10.4, 16.0, 0.34, 0.28);
      ctx.restore();

      // Rolled aluminum base rim + crimped valve cup collar
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.ellipse(0, -8.1, 4.4, 1.3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Ergonomic contoured spray actuator dome + orange nozzle insert
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.roundRect(-2.7, -11.4, 5.4, 3.2, 0.9);
      ctx.fill();
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(-1.1, -11.4, 2.2, 1.1);
      return true;
    }

    case 'spasatel_ointment': {
      drawShadow(ctx, 7.2, 2.5, 7.6, 0.22);
      drawStudioOintmentTube(ctx, '#16a34a', '#eab308', '#ca8a04', '#ffffff', '#f8fafc', true);
      return true;
    }

    case 'diclofenac_gel': {
      drawShadow(ctx, 7.2, 2.5, 7.6, 0.22);
      drawStudioOintmentTube(ctx, '#f8fafc', '#0284c7', '#38bdf8', '#ffffff', '#f8fafc', false);
      return true;
    }

    case 'zelenka': {
      drawShadow(ctx, 5.8, 2.4, 7.5, 0.22);
      drawStudioPharmaBottle(ctx, {
        w: 9.2,
        topY: -4.2,
        botY: 7.2,
        bodyHex: '#047857',
        liquidHex: '#10b981',
        translucent: true,
        capColor: '#451a03',
        labelBand: '#059669',
        labelAccent: '#10b981',
        crossColor: '#059669'
      });
      return true;
    }

    case 'iodine': {
      drawShadow(ctx, 5.8, 2.4, 7.5, 0.22);
      drawStudioPharmaBottle(ctx, {
        w: 9.2,
        topY: -4.2,
        botY: 7.2,
        bodyHex: '#78350f',
        liquidHex: '#d97706',
        translucent: true,
        capColor: '#7c2d12',
        labelBand: '#ea580c',
        labelAccent: '#d97706',
        crossColor: '#c2410c'
      });
      return true;
    }

    case 'hydrogen_peroxide': {
      drawShadow(ctx, 6.2, 2.5, 7.6, 0.22);
      drawStudioPharmaBottle(ctx, {
        w: 9.8,
        topY: -4.8,
        botY: 7.4,
        bodyHex: '#f8fafc',
        translucent: false,
        capColor: '#ffffff',
        labelBand: '#0284c7',
        labelAccent: '#38bdf8',
        crossColor: '#ef4444'
      });
      return true;
    }

    case 'ammonia_spirit': {
      drawShadow(ctx, 5.4, 2.2, 7.5, 0.22);
      drawStudioPharmaBottle(ctx, {
        w: 8.4,
        topY: -4.2,
        botY: 7.0,
        bodyHex: '#78350f',
        liquidHex: '#fef3c7',
        translucent: true,
        capColor: '#f8fafc',
        labelBand: '#dc2626',
        labelAccent: '#ef4444',
        hazardDiamond: true
      });
      return true;
    }

    case 'balm_star': {
      drawShadow(ctx, 6.8, 2.8, 7.2, 0.25);

      // Rolled brass lower tin skirt + crimson enameled lid
      const rimGrad = ctx.createLinearGradient(-7.2, 0, 7.2, 0);
      rimGrad.addColorStop(0.0, '#78350f');
      rimGrad.addColorStop(0.28, '#fde047');
      rimGrad.addColorStop(0.68, '#d97706');
      rimGrad.addColorStop(1.0, '#78350f');
      ctx.fillStyle = rimGrad;
      ctx.beginPath();
      ctx.ellipse(0, 1.0, 7.2, 6.6, 0, 0, Math.PI * 2);
      ctx.fill();

      const lidGrad = ctx.createRadialGradient(-2.0, -2.0, 0.5, 0, 0, 7.2);
      lidGrad.addColorStop(0.0, '#ef4444');
      lidGrad.addColorStop(0.55, '#b91c1c');
      lidGrad.addColorStop(1.0, '#7f1d1d');
      ctx.fillStyle = lidGrad;
      ctx.beginPath();
      ctx.ellipse(0, -0.2, 7.0, 6.4, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 0.9;
      ctx.stroke();

      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 0.42;
      ctx.beginPath();
      ctx.ellipse(0, -0.2, 5.4, 4.9, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Embossed faceted golden 5-pointed star
      const sGrad = ctx.createLinearGradient(-3, -3.5, 3, 3.5);
      sGrad.addColorStop(0, '#fef08a');
      sGrad.addColorStop(0.5, '#f59e0b');
      sGrad.addColorStop(1, '#b45309');
      ctx.fillStyle = sGrad;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? 3.5 : 1.45;
        const a = (i * Math.PI) / 5 - Math.PI / 2;
        const sx = Math.cos(a) * r;
        const sy = -0.2 + Math.sin(a) * r * 0.92;
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.closePath();
      ctx.fill();

      // Specular lacquer sheen arc
      ctx.fillStyle = 'rgba(255, 255, 255, 0.34)';
      ctx.beginPath();
      ctx.ellipse(-2.4, -2.5, 2.7, 1.25, -Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    case 'activated_charcoal': {
      drawShadow(ctx, 7.0, 2.6, 7.5, 0.22);
      drawBlisterCard(
        ctx,
        13.2,
        15.2,
        '#18181b',
        (rx, ry) => {
          ctx.fillStyle = 'rgba(15, 23, 42, 0.18)';
          ctx.beginPath();
          ctx.arc(rx + 0.15, ry + 0.2, 2.0, 0, Math.PI * 2);
          ctx.fill();

          drawLitSphere(ctx, rx, ry, 1.55, '#52525b', '#27272a', '#09090b', undefined, 0.22);

          ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
          ctx.lineWidth = 0.3;
          ctx.beginPath();
          ctx.arc(rx, ry, 1.9, Math.PI * 1.1, Math.PI * 1.85);
          ctx.stroke();
        },
        [
          [-3.2, -3.6], [3.2, -3.6],
          [-3.2, -0.9], [3.2, -0.9],
          [-3.2, 1.8], [3.2, 1.8],
          [-3.2, 4.5], [3.2, 4.5]
        ]
      );
      return true;
    }

    case 'valerian_drops': {
      drawShadow(ctx, 5.8, 2.4, 7.5, 0.22);
      drawStudioPharmaBottle(ctx, {
        w: 9.2,
        topY: -3.2,
        botY: 7.4,
        bodyHex: '#78350f',
        liquidHex: '#451a03',
        translucent: true,
        capColor: '#18181b',
        labelBand: '#16a34a',
        labelAccent: '#86efac'
      });

      // Molded black rubber pipette squeeze bulb cap
      const bulbGrad = ctx.createRadialGradient(-0.7, -7.8, 0.3, 0, -7.2, 2.6);
      bulbGrad.addColorStop(0, '#52525b');
      bulbGrad.addColorStop(0.6, '#18181b');
      bulbGrad.addColorStop(1, '#09090b');
      ctx.fillStyle = bulbGrad;
      ctx.beginPath();
      ctx.arc(0, -7.2, 2.2, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    case 'morphine': {
      drawShadow(ctx, 6.2, 2.4, 7.5, 0.2);

      // Borosilicate clinical glass ampoule silhouette
      const traceAmpoule = () => {
        ctx.beginPath();
        ctx.moveTo(-1.1, -5.8);
        ctx.lineTo(-1.8, -7.4);
        ctx.quadraticCurveTo(0, -9.2, 1.8, -7.4);
        ctx.lineTo(1.1, -5.8);
        ctx.lineTo(1.1, -5.4);
        ctx.lineTo(2.4, -3.0);
        ctx.lineTo(4.2, -2.0);
        ctx.lineTo(4.2, 6.8);
        ctx.quadraticCurveTo(4.2, 7.8, 0, 7.8);
        ctx.quadraticCurveTo(-4.2, 7.8, -4.2, 6.8);
        ctx.lineTo(-4.2, -2.0);
        ctx.lineTo(-2.4, -3.0);
        ctx.lineTo(-1.1, -5.4);
        ctx.closePath();
      };

      const glassGrad = ctx.createLinearGradient(-4.2, 0, 4.2, 0);
      glassGrad.addColorStop(0.0, 'rgba(203, 213, 225, 0.78)');
      glassGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.9)');
      glassGrad.addColorStop(0.75, 'rgba(226, 232, 240, 0.65)');
      glassGrad.addColorStop(1.0, 'rgba(148, 163, 184, 0.8)');
      ctx.fillStyle = glassGrad;
      traceAmpoule();
      ctx.fill();

      // Amber analgesic solution inside lower chamber
      ctx.save();
      traceAmpoule();
      ctx.clip();
      const solGrad = ctx.createLinearGradient(-4, -1.5, 4, 7.6);
      solGrad.addColorStop(0.0, '#fbbf24');
      solGrad.addColorStop(0.5, '#f59e0b');
      solGrad.addColorStop(1.0, '#b45309');
      ctx.fillStyle = solGrad;
      ctx.fillRect(-4.5, -1.6, 9.0, 9.6);
      ctx.fillStyle = 'rgba(254, 240, 138, 0.65)';
      ctx.beginPath();
      ctx.ellipse(0, -1.6, 3.8, 0.75, 0, 0, Math.PI * 2);
      ctx.fill();
      applyCylinderLightingOverlay(ctx, -4.2, -9.0, 8.4, 17.0, 0.35, 0.28);
      ctx.restore();

      // Ceramic cyan OPC snap-ring at constriction neck
      ctx.fillStyle = '#0ea5e9';
      ctx.fillRect(-1.35, -5.75, 2.7, 0.65);

      // Clinical wrap paper Rx label
      drawStudioLabelPanel(ctx, -3.9, 0.2, 7.8, 5.4, {
        paperColor: '#ffffff',
        bandColor: '#dc2626',
        accentColor: '#991b1b',
        inkColor: '#0f172a',
        goldFoil: false,
        hasBarcode: true,
        emblem: 'none',
        cylindrical: true
      });
      drawMedicalCross(ctx, -1.9, 3.6, 2.2, '#dc2626');

      ctx.strokeStyle = 'rgba(71, 85, 105, 0.5)';
      ctx.lineWidth = 0.28;
      traceAmpoule();
      ctx.stroke();
      return true;
    }

    default:
      return false;
  }
}
