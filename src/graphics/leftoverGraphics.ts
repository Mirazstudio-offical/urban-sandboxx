// Photorealistic 2D Studio Canvas Models for Leftovers and Empty Packaging
// Meticulously styled to match their parent packaging 1:1
import {
  drawShadow,
  drawGlossBand,
  drawMedicalCross,
  drawLitSphere,
  drawLitEllipse,
  drawBotanicalLeaf,
  drawCrimpedSeal,
  drawMicroBarcode,
  drawStudioLabelPanel,
  drawScrewCap,
  drawPouchCrinkles,
  applyCylinderLightingOverlay
} from './itemGraphicShared';

function drawCrushedCanBase(
  ctx: CanvasRenderingContext2D,
  bodyTopCol: string,
  bodyMidCol: string,
  bodyBotCol: string
) {
  drawShadow(ctx, 7.6, 2.5, 7.6, 0.28);

  const traceCrushed = () => {
    ctx.beginPath();
    ctx.moveTo(-6.2, -3.1);
    ctx.lineTo(6.2, -4.4);
    ctx.lineTo(5.8, 3.5);
    ctx.lineTo(1.1, 1.5);
    ctx.lineTo(-2.1, 4.6);
    ctx.lineTo(-6.6, 2.6);
    ctx.closePath();
  };

  const cGrad = ctx.createLinearGradient(-6.5, -4.5, 6.2, 4.5);
  cGrad.addColorStop(0.0, bodyTopCol);
  cGrad.addColorStop(0.55, bodyMidCol);
  cGrad.addColorStop(1.0, bodyBotCol);

  ctx.fillStyle = cGrad;
  traceCrushed();
  ctx.fill();

  return traceCrushed;
}

function drawCrushedCanFinish(
  ctx: CanvasRenderingContext2D,
  traceCrushed: () => void,
  accentStroke: string
) {
  // Crushed aluminum crease & specular ridges
  ctx.save();
  traceCrushed();
  ctx.clip();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 0.65;
  ctx.beginPath();
  ctx.moveTo(-1.2, -3.6); ctx.lineTo(1.1, 1.5);
  ctx.moveTo(1.1, 1.5); ctx.lineTo(4.6, 3.0);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.35)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(-0.7, -3.4); ctx.lineTo(1.5, 1.4);
  ctx.stroke();
  ctx.restore();

  ctx.strokeStyle = accentStroke;
  ctx.lineWidth = 0.35;
  traceCrushed();
  ctx.stroke();

  // Crushed double-seamed aluminum end with dark opened aperture & bent pull tab
  const rimGrad = ctx.createRadialGradient(-5.7, -0.8, 0.3, -5.5, -0.5, 3.4);
  rimGrad.addColorStop(0.0, '#f8fafc');
  rimGrad.addColorStop(0.65, '#94a3b8');
  rimGrad.addColorStop(1.0, '#475569');
  ctx.fillStyle = rimGrad;
  ctx.beginPath();
  ctx.ellipse(-5.5, -0.5, 2.1, 3.3, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 0.35;
  ctx.stroke();

  ctx.fillStyle = '#020617';
  ctx.beginPath();
  ctx.ellipse(-5.4, -0.4, 0.95, 1.7, 0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.roundRect(-7.3, -2.5, 2.0, 1.3, 0.35);
  ctx.fill();
}

export function drawLeftoverItem(ctx: CanvasRenderingContext2D, itemId: string): boolean {
  switch (itemId) {
    // Empty crushed red soda can (matches soda_can)
    case 'can_empty': {
      const trace = drawCrushedCanBase(ctx, '#ef4444', '#b91c1c', '#450a0a');
      ctx.save();
      trace();
      ctx.clip();
      // White dynamic wave distorted by dent
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-5.8, 0.1);
      ctx.quadraticCurveTo(0, -1.9, 5.2, -0.9);
      ctx.stroke();
      drawMicroBarcode(ctx, 1.2, 0.4, 3.0, 1.1);
      ctx.restore();
      drawCrushedCanFinish(ctx, trace, 'rgba(127, 29, 29, 0.65)');
      return true;
    }

    // Crushed black cola zero can (matches cola_zero)
    case 'cola_zero_empty': {
      const trace = drawCrushedCanBase(ctx, '#3f3f46', '#18181b', '#09090b');
      ctx.save();
      trace();
      ctx.clip();
      // Matte red accent band distorted by dent
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(-2.2, -2.2);
      ctx.lineTo(3.2, -2.6);
      ctx.lineTo(2.7, 1.8);
      ctx.lineTo(-2.6, 2.0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.fillRect(-1.5, -0.8, 3.2, 0.55);
      ctx.restore();
      drawCrushedCanFinish(ctx, trace, 'rgba(63, 63, 70, 0.75)');
      return true;
    }

    // Crushed navy energy can (matches energy_drink)
    case 'energy_can_empty': {
      const trace = drawCrushedCanBase(ctx, '#1e293b', '#0f172a', '#020617');
      ctx.save();
      trace();
      ctx.clip();
      // Foil lightning emblem distorted by dent
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.moveTo(-1.1, -2.1);
      ctx.lineTo(1.5, -0.1);
      ctx.lineTo(0.1, 0.0);
      ctx.lineTo(1.0, 2.4);
      ctx.lineTo(-1.5, 0.4);
      ctx.lineTo(-0.1, 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(-5.0, 1.2, 9.5, 0.45);
      ctx.restore();
      drawCrushedCanFinish(ctx, trace, 'rgba(56, 189, 248, 0.45)');
      return true;
    }

    // Opened tin can of stew (matches canned_meat)
    case 'tin_can_empty': {
      drawShadow(ctx, 7.5, 2.8, 7.6, 0.26);

      const tGrad = ctx.createLinearGradient(-6, -3.5, 6, 6.5);
      tGrad.addColorStop(0.0, '#64748b');
      tGrad.addColorStop(0.28, '#e2e8f0');
      tGrad.addColorStop(0.65, '#94a3b8');
      tGrad.addColorStop(1.0, '#334155');
      ctx.fillStyle = tGrad;
      ctx.beginPath();
      ctx.roundRect(-6, -3.5, 12, 10, 0.6);
      ctx.fill();

      // Ribbed tin stamping rings
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.25)';
      ctx.lineWidth = 0.35;
      ctx.beginPath();
      ctx.moveTo(-6, -2.5); ctx.lineTo(6, -2.5);
      ctx.moveTo(-6, 5.4); ctx.lineTo(6, 5.4);
      ctx.stroke();

      // Scuffed red & gold studio label
      drawStudioLabelPanel(ctx, -5.9, -2.0, 11.8, 6.8, {
        paperColor: '#f8f5ec',
        bandColor: '#991b1b',
        accentColor: '#ca8a04',
        inkColor: '#1e293b',
        goldFoil: true,
        hasBarcode: true,
        emblem: 'crest',
        cylindrical: true
      });
      applyCylinderLightingOverlay(ctx, -6, -3.5, 12, 10, 0.22, 0.32);

      // Rolled open rim & shaded interior
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.ellipse(0, -3.5, 6.0, 2.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(0, -3.5, 5.0, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7f1d1d';
      ctx.beginPath();
      ctx.ellipse(1.2, -3.1, 1.1, 0.55, 0.2, 0, Math.PI * 2);
      ctx.fill();

      // Curled metallic lid + pull ring
      const lidGrad = ctx.createLinearGradient(-4, -8.5, 3, -4);
      lidGrad.addColorStop(0, '#f8fafc');
      lidGrad.addColorStop(1, '#64748b');
      ctx.fillStyle = lidGrad;
      ctx.beginPath();
      ctx.moveTo(-4, -3.5);
      ctx.quadraticCurveTo(-2, -9.2, 3, -7.6);
      ctx.quadraticCurveTo(0, -3.5, -4, -3.5);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 0.65;
      ctx.beginPath();
      ctx.ellipse(2, -7.6, 1.2, 0.72, 0.4, 0, Math.PI * 2);
      ctx.stroke();
      return true;
    }

    // Crumpled clear PET water bottle (matches water_bottle)
    case 'bottle_empty': {
      drawShadow(ctx, 7.6, 2.5, 7.5, 0.22);

      const tracePet = () => {
        ctx.beginPath();
        ctx.moveTo(-7, -1.0);
        ctx.lineTo(-4, -2.5);
        ctx.lineTo(2, -2.0);
        ctx.lineTo(5, -1.2);
        ctx.lineTo(7, -0.5);
        ctx.lineTo(7, 2.0);
        ctx.lineTo(4, 2.5);
        ctx.lineTo(-1, 1.2);
        ctx.lineTo(-5, 2.8);
        ctx.lineTo(-7, 1.5);
        ctx.closePath();
      };

      const petGrad = ctx.createLinearGradient(-7, -2.8, 7, 2.8);
      petGrad.addColorStop(0.0, 'rgba(224, 242, 254, 0.62)');
      petGrad.addColorStop(0.45, 'rgba(186, 230, 253, 0.34)');
      petGrad.addColorStop(1.0, 'rgba(148, 163, 184, 0.48)');
      ctx.fillStyle = petGrad;
      tracePet();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.lineWidth = 0.45;
      ctx.stroke();

      // Crumpled studio mineral label + barcode
      ctx.save();
      tracePet();
      ctx.clip();
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(-3.2, -2.2); ctx.lineTo(1.8, -1.8); ctx.lineTo(1.4, 1.7); ctx.lineTo(-3.2, 1.9);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(-3.2, -0.9, 4.8, 1.1);
      drawMicroBarcode(ctx, -1.6, 0.4, 2.4, 0.9);
      drawPouchCrinkles(ctx, -6.5, -2.2, 13.0, 4.5, 19, 0.25);
      ctx.restore();

      // Knurled screw cap on crushed neck
      drawScrewCap(ctx, 7.6, -0.9, 2.4, 2.2, '#0284c7', true);

      // Residual water droplet inside
      ctx.fillStyle = 'rgba(56, 189, 248, 0.78)';
      ctx.beginPath();
      ctx.arc(-5.4, 0.8, 0.68, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    // Empty stainless steel camp flask (matches camp_flask)
    case 'camp_flask_empty': {
      drawShadow(ctx, 7.5, 2.8, 7.5, 0.26);

      const sGrad = ctx.createLinearGradient(-6.5, -3.5, 6.5, 7);
      sGrad.addColorStop(0.0, '#64748b');
      sGrad.addColorStop(0.28, '#f1f5f9');
      sGrad.addColorStop(0.65, '#94a3b8');
      sGrad.addColorStop(1.0, '#334155');
      ctx.fillStyle = sGrad;
      ctx.beginPath();
      ctx.roundRect(-6.5, -3.5, 13, 10.5, 2.4);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 0.35;
      ctx.stroke();

      // Brushed shoulder highlight
      drawGlossBand(ctx, -4.6, -3.0, 1.8, 9.4, 0.42);

      // Open threaded stainless neck & dark aperture
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-1.5, -5.5, 3, 2);
      ctx.fillStyle = '#020617';
      ctx.beginPath();
      ctx.ellipse(0, -5.5, 1.2, 0.55, 0, 0, Math.PI * 2);
      ctx.fill();

      // Knurled metal cap dangling on hinge
      drawScrewCap(ctx, -3.5, -6.7, 3.0, 2.0, '#64748b', false);
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 0.75;
      ctx.beginPath();
      ctx.moveTo(-1.5, -5); ctx.lineTo(-3.2, -5.4);
      ctx.stroke();
      return true;
    }

    // Crumpled white paper coffee cup (matches hot_coffee)
    case 'cup_disposable': {
      drawShadow(ctx, 7.2, 2.6, 7.5, 0.24);

      const cupGrad = ctx.createLinearGradient(-5.5, -4, 5.5, 5.5);
      cupGrad.addColorStop(0.0, '#ffffff');
      cupGrad.addColorStop(0.65, '#e2e8f0');
      cupGrad.addColorStop(1.0, '#94a3b8');
      ctx.fillStyle = cupGrad;
      ctx.beginPath();
      ctx.moveTo(-5.5, -4);
      ctx.lineTo(5.5, -4);
      ctx.lineTo(3.2, 5.5);
      ctx.lineTo(-0.5, 3.8);
      ctx.lineTo(-4.2, 5.5);
      ctx.closePath();
      ctx.fill();

      // Corrugated kraft heat sleeve
      const sleeveGrad = ctx.createLinearGradient(-5, -1.5, 4.8, 2.8);
      sleeveGrad.addColorStop(0.0, '#d97706');
      sleeveGrad.addColorStop(0.55, '#92400e');
      sleeveGrad.addColorStop(1.0, '#451a03');
      ctx.fillStyle = sleeveGrad;
      ctx.beginPath();
      ctx.moveTo(-5, -1.5);
      ctx.lineTo(4.8, -1.5);
      ctx.lineTo(3.8, 2.8);
      ctx.lineTo(-0.2, 1.8);
      ctx.lineTo(-4, 2.8);
      ctx.closePath();
      ctx.fill();

      // Coffee bean stamp
      ctx.fillStyle = '#3b1806';
      ctx.beginPath();
      ctx.ellipse(0, 0.4, 1.15, 1.55, 0.2, 0, Math.PI * 2);
      ctx.fill();

      // Askew black sip lid
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.ellipse(0.5, -4.5, 5.8, 1.8, -0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.lineWidth = 0.35;
      ctx.stroke();
      ctx.fillStyle = '#020617';
      ctx.beginPath();
      ctx.ellipse(-2, -4.5, 0.8, 0.48, 0, 0, Math.PI * 2);
      ctx.fill();

      // Coffee drip stain
      ctx.fillStyle = 'rgba(69, 26, 3, 0.72)';
      ctx.beginPath();
      ctx.arc(2.4, 3.6, 0.75, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    // Empty cinema popcorn bucket (matches popcorn_caramel)
    case 'popcorn_bucket': {
      drawShadow(ctx, 7.2, 2.6, 7.5, 0.25);
      const traceBucket = () => {
        ctx.beginPath();
        ctx.moveTo(-6.5, -2);
        ctx.lineTo(6.5, -2);
        ctx.lineTo(5, 7.5);
        ctx.lineTo(-5, 7.5);
        ctx.closePath();
      };
      const pGrad = ctx.createLinearGradient(-6.5, -2, 6.5, 7.5);
      pGrad.addColorStop(0.0, '#ef4444');
      pGrad.addColorStop(0.55, '#b91c1c');
      pGrad.addColorStop(1.0, '#450a0a');
      ctx.fillStyle = pGrad;
      traceBucket();
      ctx.fill();

      ctx.save();
      traceBucket();
      ctx.clip();
      ctx.fillStyle = '#fffbeb';
      ctx.fillRect(-4.1, -2, 1.8, 9.5);
      ctx.fillRect(-0.8, -2, 1.8, 9.5);
      ctx.fillRect(2.4, -2, 1.8, 9.5);
      drawStudioLabelPanel(ctx, -3.6, 0.5, 7.2, 4.6, {
        paperColor: '#fffbeb',
        bandColor: '#991b1b',
        accentColor: '#ca8a04',
        inkColor: '#451a03',
        goldFoil: true,
        hasBarcode: true,
        emblem: 'crest',
        cylindrical: true
      });
      ctx.restore();

      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.ellipse(0, -2, 6.5, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#290f02';
      ctx.beginPath();
      ctx.ellipse(0, -2, 5.5, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();

      drawLitSphere(ctx, -1.5, -2, 0.85, '#fef08a', '#facc15', '#a16207', undefined, 0.5);
      drawLitSphere(ctx, 1.7, -2.1, 0.9, '#fef08a', '#facc15', '#a16207', undefined, 0.5);
      return true;
    }

    // Premium thermoformed polypropylene food tray (clean/empty)
    case 'tray_plastic_empty': {
      drawShadow(ctx, 9.2, 3.5, 7.8, 0.24);

      const trayGrad = ctx.createLinearGradient(-9.5, -6.5, 9.5, 6.5);
      trayGrad.addColorStop(0.0, '#cbd5e1');
      trayGrad.addColorStop(0.5, '#94a3b8');
      trayGrad.addColorStop(1.0, '#64748b');
      ctx.fillStyle = trayGrad;
      ctx.beginPath();
      ctx.roundRect(-9.5, -6.5, 19, 13, 2.2);
      ctx.fill();

      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.roundRect(-9, -6, 18, 12, 2.0);
      ctx.fill();

      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.roundRect(-7.8, -4.8, 15.6, 9.6, 1.6);
      ctx.fill();

      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.roundRect(-7.2, -4.2, 14.4, 8.4, 1.4);
      ctx.fill();

      for (const rx of [-4, 0, 4]) {
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(rx - 0.35, -3.5); ctx.lineTo(rx - 0.35, 3.5);
        ctx.stroke();
        ctx.strokeStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(rx + 0.35, -3.5); ctx.lineTo(rx + 0.35, 3.5);
        ctx.stroke();
      }

      drawStudioLabelPanel(ctx, 2.2, 1.4, 5.2, 3.2, {
        paperColor: '#f8fafc',
        bandColor: '#475569',
        accentColor: '#94a3b8',
        inkColor: '#0f172a',
        goldFoil: false,
        hasBarcode: true,
        emblem: 'none',
        cylindrical: false
      });

      drawGlossBand(ctx, -4.2, -5.8, 2.2, 11.4, 0.38);
      return true;
    }

    // Opened / torn food tray with peeled cellophane remnants and residue
    case 'tray_torn':
    case 'tray_sealed_food_torn': {
      drawShadow(ctx, 9.2, 3.5, 7.8, 0.25);

      const trayGrad = ctx.createLinearGradient(-9.5, -6.5, 9.5, 6.5);
      trayGrad.addColorStop(0.0, '#94a3b8');
      trayGrad.addColorStop(1.0, '#475569');
      ctx.fillStyle = trayGrad;
      ctx.beginPath();
      ctx.roundRect(-9.5, -6.5, 19, 13, 2.2);
      ctx.fill();

      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.roundRect(-9, -6, 18, 12, 2.0);
      ctx.fill();

      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.roundRect(-7.8, -4.8, 15.6, 9.6, 1.6);
      ctx.fill();

      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.roundRect(-7.2, -4.2, 14.4, 8.4, 1.4);
      ctx.fill();

      for (const rx of [-3.5, 0.5, 4.5]) {
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 0.7;
        ctx.beginPath(); ctx.moveTo(rx - 0.35, -3.2); ctx.lineTo(rx - 0.35, 3.2); ctx.stroke();
        ctx.strokeStyle = '#f1f5f9';
        ctx.beginPath(); ctx.moveTo(rx + 0.35, -3.2); ctx.lineTo(rx + 0.35, 3.2); ctx.stroke();
      }

      // Residue stain & droplets
      ctx.fillStyle = 'rgba(185, 28, 28, 0.32)';
      ctx.beginPath();
      ctx.ellipse(-3.5, 1.5, 2.8, 1.6, 0.2, 0, Math.PI * 2);
      ctx.fill();

      // Peeled translucent film flap
      ctx.fillStyle = 'rgba(255, 255, 255, 0.52)';
      ctx.beginPath();
      ctx.moveTo(-9.5, -6.5);
      ctx.lineTo(-2, -6.5);
      ctx.lineTo(-4.5, -3.5);
      ctx.lineTo(-6.5, -2);
      ctx.lineTo(-8.5, -4.5);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.lineWidth = 0.65;
      ctx.beginPath();
      ctx.moveTo(-2, -6.5);
      ctx.lineTo(2, -5.5);
      ctx.lineTo(5, -6.5);
      ctx.lineTo(8.5, -4.5);
      ctx.stroke();

      drawStudioLabelPanel(ctx, 2.2, 1.4, 5.2, 3.2, {
        paperColor: '#f8fafc',
        bandColor: '#991b1b',
        accentColor: '#ca8a04',
        inkColor: '#0f172a',
        goldFoil: false,
        hasBarcode: true,
        emblem: 'none',
        cylindrical: false
      });
      return true;
    }

    case 'vacuum_pack_torn': {
      drawShadow(ctx, 8.5, 3.2, 7.8, 0.24);

      const bGrad = ctx.createLinearGradient(-8, -6, 8, 6);
      bGrad.addColorStop(0.0, '#f8fafc');
      bGrad.addColorStop(0.45, '#cbd5e1');
      bGrad.addColorStop(1.0, '#64748b');
      ctx.fillStyle = bGrad;
      ctx.beginPath();
      ctx.roundRect(-8, -6, 16, 12, 1.4);
      ctx.fill();

      drawCrimpedSeal(ctx, -7.8, 4.3, 15.6, 1.4, '#94a3b8', true, 0.75);
      drawGlossBand(ctx, -5, -5.5, 2.8, 10.5, 0.35);

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(-8, -4.5); ctx.lineTo(-6.5, -3.8); ctx.lineTo(-8, -3.1);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.roundRect(-5.5, -3.5, 11, 7, 1);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.beginPath();
      ctx.moveTo(-7.5, -1);
      ctx.lineTo(-4, -2.5);
      ctx.lineTo(0, -1);
      ctx.lineTo(4, -2.8);
      ctx.lineTo(7.5, -1);
      ctx.lineTo(6.5, 4.5);
      ctx.lineTo(-6.5, 4.5);
      ctx.closePath();
      ctx.fill();

      drawPouchCrinkles(ctx, -6.5, -2.0, 13.0, 6.2, 61, 0.25);
      drawMicroBarcode(ctx, 2.5, 1.8, 3.8, 1.4);
      return true;
    }

    case 'box_cardboard_small': {
      drawShadow(ctx, 9, 3.5, 7.8, 0.26);

      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.roundRect(-6, -4, 12, 8, 0.8);
      ctx.fill();

      ctx.fillStyle = '#290f02';
      ctx.fillRect(-5.5, -3.5, 11, 2.5);

      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 0.55;

      // Left flap
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.moveTo(-6, -4); ctx.lineTo(-8.8, -2.8); ctx.lineTo(-8.8, 2.8); ctx.lineTo(-6, 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Right flap
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.moveTo(6, -4); ctx.lineTo(8.8, -2.8); ctx.lineTo(8.8, 2.8); ctx.lineTo(6, 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Top flap
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(-6, -4); ctx.lineTo(-4.5, -7.5); ctx.lineTo(4.5, -7.5); ctx.lineTo(6, -4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Bottom flap
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.moveTo(-6, 4); ctx.lineTo(-4.8, 7.2); ctx.lineTo(4.8, 7.2); ctx.lineTo(6, 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Corrugated fluting edges
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 0.4;
      for (let x = -3.8; x <= 3.8; x += 1.2) {
        ctx.beginPath();
        ctx.moveTo(x, -7.5); ctx.lineTo(x + 0.5, -7.0);
        ctx.stroke();
      }

      // Acrylic packing tape remnant
      ctx.fillStyle = 'rgba(254, 240, 138, 0.48)';
      ctx.fillRect(-2.5, -6.8, 5, 2.2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.58)';
      ctx.lineWidth = 0.4;
      ctx.strokeRect(-2.5, -6.8, 5, 2.2);

      // Shipping label + barcode on right flap
      drawMicroBarcode(ctx, 6.4, -2.0, 2.0, 3.8);
      return true;
    }

    case 'pouch_sealed_snack_torn': {
      drawShadow(ctx, 8.5, 3.2, 7.8, 0.24);

      const kGrad = ctx.createLinearGradient(-6.5, -4, 6.5, 6.5);
      kGrad.addColorStop(0.0, '#d97706');
      kGrad.addColorStop(0.55, '#b45309');
      kGrad.addColorStop(1.0, '#78350f');
      ctx.fillStyle = kGrad;
      ctx.beginPath();
      ctx.moveTo(-6.5, -3.5);
      ctx.lineTo(6.5, -3.5);
      ctx.lineTo(5.5, 6.5);
      ctx.lineTo(-5.5, 6.5);
      ctx.closePath();
      ctx.fill();

      // Inner silver foil lining at torn top edge
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.moveTo(-6.5, -3.5);
      ctx.lineTo(-4, -5.2);
      ctx.lineTo(0, -3.8);
      ctx.lineTo(4, -5.5);
      ctx.lineTo(6.5, -3.5);
      ctx.lineTo(5, -2.5);
      ctx.lineTo(-5, -2.5);
      ctx.closePath();
      ctx.fill();

      // Zip-lock tear line
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 0.65;
      ctx.beginPath();
      ctx.moveTo(-6, -2.5); ctx.lineTo(6, -2.5);
      ctx.stroke();

      // Clear window showing empty interior
      ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
      ctx.beginPath();
      ctx.ellipse(0, 1.5, 3.8, 2.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.lineWidth = 0.5;
      ctx.stroke();

      drawPouchCrinkles(ctx, -5.2, -1.5, 10.4, 7.2, 67, 0.24);
      drawMicroBarcode(ctx, 1.5, 4.4, 3.2, 1.2);
      return true;
    }

    // Empty nachos boat (matches nachos)
    case 'nachos_tray_empty': {
      drawShadow(ctx, 8.5, 3.2, 7.5, 0.24);
      const kGrad = ctx.createLinearGradient(-8.5, -2, 8.5, 7);
      kGrad.addColorStop(0, '#d97706');
      kGrad.addColorStop(0.5, '#92400e');
      kGrad.addColorStop(1, '#451a03');
      ctx.fillStyle = kGrad;
      ctx.beginPath();
      ctx.ellipse(0, 2.5, 8.8, 4.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.ellipse(0, 1.8, 8.0, 4.0, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(0, 1.0, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(0, 1.0, 1.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#facc15';
      ctx.fillRect(-4.0, 2.0, 1.2, 1.1);
      ctx.fillRect(4.0, 2.5, 1.3, 1.1);
      return true;
    }

    // Realistic apple core (matches apple)
    case 'apple_core': {
      drawShadow(ctx, 5.5, 2.2, 7.5, 0.22);
      const fGrad = ctx.createLinearGradient(-3, -3.5, 3, 4.5);
      fGrad.addColorStop(0.0, '#fffbeb');
      fGrad.addColorStop(0.5, '#fef08a');
      fGrad.addColorStop(1.0, '#d97706');
      ctx.fillStyle = fGrad;
      ctx.beginPath();
      ctx.moveTo(-3, -3.5);
      ctx.lineTo(3, -3.5);
      ctx.quadraticCurveTo(0.9, 0, 3, 4.5);
      ctx.lineTo(-3, 4.5);
      ctx.quadraticCurveTo(-0.9, 0, -3, -3.5);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#b91c1c';
      ctx.beginPath();
      ctx.ellipse(0, -3.8, 3.2, 1.2, 0, 0, Math.PI * 2);
      ctx.ellipse(0, 4.5, 3.2, 1.2, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1.35;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, -3.8);
      ctx.quadraticCurveTo(1.5, -6, 0.5, -8.5);
      ctx.stroke();

      drawBotanicalLeaf(ctx, 0.8, -6.2, 3.2, 1.1, -0.35, '#4ade80', '#14532d');

      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.ellipse(0, 0.5, 1.4, 2.1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1c1917';
      ctx.beginPath();
      ctx.ellipse(-0.4, 0, 0.45, 0.78, -0.2, 0, Math.PI * 2);
      ctx.ellipse(0.4, 1, 0.45, 0.78, 0.2, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    // Empty torn foil chip bag (matches chips, cookie_pack)
    case 'chips_bag': {
      drawShadow(ctx, 7, 2.6, 7.5, 0.25);
      const chGrad = ctx.createLinearGradient(-6.5, -6, 6.5, 7);
      chGrad.addColorStop(0.0, '#fde047');
      chGrad.addColorStop(0.55, '#eab308');
      chGrad.addColorStop(1.0, '#a16207');
      ctx.fillStyle = chGrad;
      ctx.beginPath();
      ctx.roundRect(-6.5, -6, 13, 13, 1.5);
      ctx.fill();

      drawCrimpedSeal(ctx, -6.5, 5.4, 13, 1.5, '#eab308', true, 0.72);

      // Torn metallized foil mouth at top
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.moveTo(-6.5, -6);
      ctx.lineTo(-3.5, -8.2);
      ctx.lineTo(-1, -6);
      ctx.lineTo(2.5, -7.6);
      ctx.lineTo(6.5, -5.5);
      ctx.lineTo(6.5, -4.4);
      ctx.lineTo(-6.5, -4.4);
      ctx.closePath();
      ctx.fill();

      drawStudioLabelPanel(ctx, -5.4, -2.4, 10.8, 6.6, {
        paperColor: '#fef9c3',
        bandColor: '#b91c1c',
        accentColor: '#ca8a04',
        inkColor: '#451a03',
        goldFoil: true,
        hasBarcode: true,
        emblem: 'circle',
        cylindrical: false
      });
      drawPouchCrinkles(ctx, -5.8, -4.2, 11.6, 9.5, 71, 0.25);
      return true;
    }

    // Empty blister pack with popped foil (matches painkillers, antipyretic)
    case 'pill_pack': {
      drawShadow(ctx, 7.2, 2.8, 7.5, 0.24);

      const bGrad = ctx.createLinearGradient(-6.5, -7, 6.5, 7);
      bGrad.addColorStop(0.0, '#f8fafc');
      bGrad.addColorStop(0.5, '#cbd5e1');
      bGrad.addColorStop(1.0, '#94a3b8');
      ctx.fillStyle = bGrad;
      ctx.beginPath();
      ctx.roundRect(-6.5, -7, 13, 14, 1.3);
      ctx.fill();
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Subtle foil grid pattern
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.2)';
      ctx.lineWidth = 0.25;
      for (let y = -5.5; y <= 5.5; y += 1.8) {
        ctx.beginPath();
        ctx.moveTo(-5.8, y);
        ctx.lineTo(5.8, y);
        ctx.stroke();
      }

      const cells = [
        [-3.2, -4], [3.2, -4],
        [-3.2, 0], [3.2, 0],
        [-3.2, 4], [3.2, 4]
      ];
      cells.forEach(([cx, cy], idx) => {
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(cx, cy, 1.75, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        if (idx % 2 === 0) {
          ctx.moveTo(cx, cy); ctx.lineTo(cx + 2.3, cy - 0.9); ctx.lineTo(cx + 1.7, cy + 1.4);
        } else {
          ctx.moveTo(cx, cy); ctx.lineTo(cx - 2.3, cy - 0.9); ctx.lineTo(cx - 1.7, cy + 1.4);
        }
        ctx.closePath();
        ctx.fill();
      });
      return true;
    }

    // Empty amber pill bottle (matches vitamins)
    case 'pill_bottle_empty': {
      drawShadow(ctx, 6.8, 2.6, 7.8, 0.24);

      const aGrad = ctx.createLinearGradient(-5.5, -3, 5.5, 7.5);
      aGrad.addColorStop(0.0, '#d97706');
      aGrad.addColorStop(0.45, '#92400e');
      aGrad.addColorStop(1.0, '#451a03');
      ctx.fillStyle = aGrad;
      ctx.beginPath();
      ctx.roundRect(-5.5, -3, 11, 10.5, 1.8);
      ctx.fill();

      drawStudioLabelPanel(ctx, -5.2, -1.5, 10.4, 6.2, {
        paperColor: '#ffffff',
        bandColor: '#0f766e',
        accentColor: '#ca8a04',
        inkColor: '#0f172a',
        goldFoil: false,
        hasBarcode: true,
        emblem: 'diamond',
        cylindrical: true
      });
      applyCylinderLightingOverlay(ctx, -5.5, -3, 11, 10.5, 0.26, 0.28);

      // Open bottle neck
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-2.5, -5, 5, 2);
      ctx.fillStyle = '#020617';
      ctx.beginPath();
      ctx.ellipse(0, -5, 2, 0.75, 0, 0, Math.PI * 2);
      ctx.fill();

      // Unscrewed ribbed white cap lying beside
      drawScrewCap(ctx, 6.8, 3.6, 3.4, 2.6, '#f8fafc', false);
      return true;
    }

    // Empty antiseptic bottle (matches antiseptic)
    case 'antiseptic_empty': {
      drawShadow(ctx, 6.5, 2.5, 7.8, 0.22);

      const gGrad = ctx.createLinearGradient(-4.8, -3.5, 4.8, 7.5);
      gGrad.addColorStop(0.0, 'rgba(167, 243, 208, 0.55)');
      gGrad.addColorStop(0.5, 'rgba(5, 150, 105, 0.35)');
      gGrad.addColorStop(1.0, 'rgba(6, 78, 59, 0.45)');
      ctx.fillStyle = gGrad;
      ctx.beginPath();
      ctx.roundRect(-4.8, -3.5, 9.6, 11, 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 0.4;
      ctx.stroke();

      drawStudioLabelPanel(ctx, -4.5, -1.2, 9.0, 6.2, {
        paperColor: '#ffffff',
        bandColor: '#059669',
        accentColor: '#dc2626',
        inkColor: '#0f172a',
        goldFoil: false,
        hasBarcode: true,
        emblem: 'none',
        cylindrical: true
      });
      drawMedicalCross(ctx, 0, 2.6, 2.6, '#dc2626');
      drawGlossBand(ctx, -3.8, -3.0, 1.0, 9.5, 0.4);

      // Pump atomizer neck
      drawScrewCap(ctx, 0, -5.6, 4.0, 2.1, '#e2e8f0', true);
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.roundRect(-2.6, -8.5, 5.2, 3.0, 0.7);
      ctx.fill();
      return true;
    }

    // Empty opened first aid box (matches medkit)
    case 'medkit_empty': {
      drawShadow(ctx, 9.5, 3.5, 8, 0.28);

      const caseGrad = ctx.createLinearGradient(-9, -5, 9, 8);
      caseGrad.addColorStop(0.0, '#27272a');
      caseGrad.addColorStop(1.0, '#09090b');
      ctx.fillStyle = caseGrad;
      ctx.beginPath();
      ctx.roundRect(-9, -5, 18, 13, 1.8);
      ctx.fill();
      ctx.strokeStyle = '#3f3f46';
      ctx.lineWidth = 0.7;
      ctx.stroke();

      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.roundRect(-4.5, -8, 9, 3, 1.2);
      ctx.fill();
      ctx.fillStyle = '#09090b';
      ctx.fillRect(-3, -7, 6, 1.8);

      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-6.5, -6.5, 2.2, 2);
      ctx.fillRect(4.3, -6.5, 2.2, 2);

      ctx.fillStyle = '#27272a';
      ctx.beginPath();
      ctx.roundRect(-7.8, -3.8, 15.6, 10.5, 1.2);
      ctx.fill();

      ctx.strokeStyle = '#3f3f46';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(-1, -3.8); ctx.lineTo(-1, 6.7);
      ctx.moveTo(-7.8, 1.5); ctx.lineTo(7.8, 1.5);
      ctx.stroke();

      // Crumpled folded medical leaflet
      ctx.fillStyle = '#f1f5f9';
      ctx.beginPath();
      ctx.moveTo(-6.5, 2.5);
      ctx.lineTo(-2, 3);
      ctx.lineTo(-2.5, 5.8);
      ctx.lineTo(-7, 5.2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#16a34a';
      ctx.fillRect(-6, 3.5, 3.2, 0.55);
      return true;
    }

    // Empty 4L motor oil canister (matches motor_oil)
    case 'motor_oil_empty': {
      drawShadow(ctx, 8.5, 3.2, 8, 0.28);

      const mGrad = ctx.createLinearGradient(-7, -4.5, 7, 7.5);
      mGrad.addColorStop(0.0, '#334155');
      mGrad.addColorStop(0.5, '#1e293b');
      mGrad.addColorStop(1.0, '#0f172a');
      ctx.fillStyle = mGrad;
      ctx.beginPath();
      ctx.roundRect(-7, -4.5, 14, 12, 2.0);
      ctx.fill();

      // Embossed HDPE structural ribs
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(-6.2, -3.2); ctx.lineTo(-6.2, 6.2);
      ctx.stroke();

      // Top carrying handle arch
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(-4, -8, 10.5, 3.8, 1.5);
      ctx.fill();
      ctx.fillStyle = '#090d16';
      ctx.beginPath();
      ctx.roundRect(-2.5, -6.5, 7.5, 2.2, 1);
      ctx.fill();

      // Open threaded spout with torn tamper ring
      ctx.fillStyle = '#334155';
      ctx.fillRect(-6.5, -7.5, 2.8, 3.5);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-6.8, -4.8, 3.4, 0.75);
      ctx.fillStyle = '#020617';
      ctx.beginPath();
      ctx.ellipse(-5.1, -7.5, 1.4, 0.55, 0, 0, Math.PI * 2);
      ctx.fill();

      // Translucent sight strip (empty + dark amber drop at bottom)
      ctx.fillStyle = '#334155';
      ctx.fillRect(4.8, -3.5, 1.4, 10);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(4.5, -2, 0.8, 0.45);
      ctx.fillRect(4.5, 0.5, 0.8, 0.45);
      ctx.fillRect(4.5, 3, 0.8, 0.45);
      ctx.fillStyle = '#d97706';
      ctx.fillRect(4.8, 5.2, 1.4, 1.2);

      // Scuffed gold-accent carbon studio label (no cartoon text)
      drawStudioLabelPanel(ctx, -5.6, -2.6, 9.2, 8.6, {
        paperColor: '#0f172a',
        bandColor: '#f59e0b',
        accentColor: '#ca8a04',
        inkColor: '#cbd5e1',
        goldFoil: true,
        hasBarcode: true,
        emblem: 'diamond',
        cylindrical: false
      });

      // Used dark oil smear streak down canister
      ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
      ctx.beginPath();
      ctx.moveTo(-5.4, -4.5);
      ctx.lineTo(-4.1, 0);
      ctx.lineTo(-4.7, 2.2);
      ctx.lineTo(-5.8, -1.0);
      ctx.closePath();
      ctx.fill();
      return true;
    }

    // Empty 5L antifreeze coolant canister (matches antifreeze)
    case 'antifreeze_empty': {
      drawShadow(ctx, 8.5, 3.2, 8, 0.26);

      const hdpeGrad = ctx.createLinearGradient(-7, -4.5, 7, 7.5);
      hdpeGrad.addColorStop(0.0, '#f1f5f9');
      hdpeGrad.addColorStop(0.5, '#cbd5e1');
      hdpeGrad.addColorStop(1.0, '#94a3b8');
      ctx.fillStyle = hdpeGrad;
      ctx.beginPath();
      ctx.roundRect(-7, -4.5, 14, 12, 2.0);
      ctx.fill();

      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.roundRect(-4.5, -8, 11, 3.8, 1.5);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(-3, -6.5, 8, 2.2, 1);
      ctx.fill();

      // Open angled spout neck
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(-6.5, -7.5, 2.8, 3.5);
      ctx.fillStyle = '#020617';
      ctx.beginPath();
      ctx.ellipse(-5.1, -7.5, 1.4, 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e11d48';
      ctx.fillRect(-6.8, -4.8, 3.4, 0.75);

      // Volume gauge with dried pink G12 residue at foot
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(4.8, -3.5, 1.4, 10);
      ctx.fillStyle = '#fda4af';
      ctx.fillRect(4.8, 5.2, 1.4, 1.2);

      // Studio coolant label (no cartoon text)
      drawStudioLabelPanel(ctx, -5.6, -2.6, 9.2, 8.6, {
        paperColor: '#f8fafc',
        bandColor: '#e11d48',
        accentColor: '#0284c7',
        inkColor: '#1e293b',
        goldFoil: false,
        hasBarcode: true,
        emblem: 'diamond',
        cylindrical: false
      });

      // Dried magenta droplet at pouring spout
      ctx.fillStyle = '#be123c';
      ctx.beginPath();
      ctx.arc(-5.1, -3.8, 0.65, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    // Splayed yellow banana skin (matches banana)
    case 'banana_peel': {
      drawShadow(ctx, 8.5, 3, 7.5, 0.22);
      const pGrad = ctx.createLinearGradient(-7, -3, 7, 6);
      pGrad.addColorStop(0.0, '#fef08a');
      pGrad.addColorStop(0.5, '#facc15');
      pGrad.addColorStop(1.0, '#ca8a04');
      ctx.fillStyle = pGrad;
      ctx.strokeStyle = '#a16207';
      ctx.lineWidth = 0.65;

      ctx.beginPath();
      ctx.moveTo(0, -3);
      ctx.quadraticCurveTo(-6, -4, -8, 2);
      ctx.quadraticCurveTo(-5, 0, 0, 0);
      ctx.closePath();
      ctx.fill(); ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, -3);
      ctx.quadraticCurveTo(6, -4, 8, 2);
      ctx.quadraticCurveTo(5, 0, 0, 0);
      ctx.closePath();
      ctx.fill(); ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-1.5, -2);
      ctx.quadraticCurveTo(-2.5, 4, 0, 6.5);
      ctx.quadraticCurveTo(2.5, 4, 1.5, -2);
      ctx.closePath();
      ctx.fill(); ctx.stroke();

      ctx.fillStyle = '#78350f';
      for (const [bx, by] of [[-4.5, -1], [4.5, -1], [0, 3]]) {
        ctx.beginPath();
        ctx.arc(bx, by, 0.72, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#451a03';
      ctx.fillRect(-1.2, -4.8, 2.4, 2);
      return true;
    }

    // Flattened orange juice carton (matches fresh_juice)
    case 'juice_box': {
      drawShadow(ctx, 6.8, 2.5, 7.5, 0.24);

      const jGrad = ctx.createLinearGradient(-6, -4, 6, 6);
      jGrad.addColorStop(0.0, '#f97316');
      jGrad.addColorStop(1.0, '#9a3412');
      ctx.fillStyle = jGrad;
      ctx.beginPath();
      ctx.roundRect(-6, -4, 12, 10, 1.0);
      ctx.fill();

      drawStudioLabelPanel(ctx, -4.8, -2.5, 9.6, 7.0, {
        paperColor: '#fffbeb',
        bandColor: '#ea580c',
        accentColor: '#ca8a04',
        inkColor: '#451a03',
        goldFoil: false,
        hasBarcode: true,
        emblem: 'circle',
        cylindrical: false
      });

      // Bent green drinking straw protruding
      ctx.strokeStyle = '#16a34a';
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(1.5, -3.5);
      ctx.lineTo(3, -6.5);
      ctx.lineTo(5.5, -7.5);
      ctx.stroke();
      return true;
    }

    // Litter / Recyclable Street Trash Cluster (Crumpled paper, crushed aluminum can, and translucent PET bottle)
    case 'trash':
    case 'litter_trash': {
      drawShadow(ctx, 8.8, 3.4, 7.6, 0.28);

      // 1. Multi-facet crumpled paper sheet at back-left
      ctx.fillStyle = '#f1f5f9';
      ctx.beginPath();
      ctx.moveTo(-8.0, 1.5);
      ctx.lineTo(-5.2, -5.8);
      ctx.lineTo(1.8, -4.6);
      ctx.lineTo(3.4, 1.2);
      ctx.lineTo(-2.5, 4.8);
      ctx.closePath();
      ctx.fill();
      // Shaded paper facet
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(-2.2, -1.2);
      ctx.lineTo(1.8, -4.6);
      ctx.lineTo(3.4, 1.2);
      ctx.lineTo(-2.5, 4.8);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(-5.2, -5.8);
      ctx.lineTo(-2.2, -1.2);
      ctx.lineTo(3.4, 1.2);
      ctx.stroke();

      // 2. Translucent PET bottle at top-right
      ctx.save();
      ctx.translate(3.2, -1.8);
      ctx.rotate(0.42);
      ctx.fillStyle = 'rgba(186, 230, 253, 0.82)';
      ctx.beginPath();
      ctx.roundRect(-2.4, -4.2, 4.8, 8.4, 1.2);
      ctx.fill();
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(-2.3, -1.2, 4.6, 2.6);
      ctx.fillStyle = '#2563eb';
      ctx.fillRect(-1.3, -5.6, 2.6, 1.5);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.fillRect(-1.2, -3.6, 0.8, 7.0);
      ctx.restore();

      // 3. Crushed red aluminum soda can in foreground with stay-on-tab lid
      ctx.save();
      ctx.translate(-1.4, 2.2);
      ctx.rotate(-0.18);
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(-4.4, -2.4);
      ctx.lineTo(4.4, -2.4);
      ctx.lineTo(3.8, 0);
      ctx.lineTo(4.4, 2.4);
      ctx.lineTo(-4.4, 2.4);
      ctx.lineTo(-3.8, 0);
      ctx.closePath();
      ctx.fill();
      // White brand wave stripe
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-1.6, -2.2, 2.2, 4.4);
      // Anisotropic aluminum highlight & buckle crease
      ctx.fillStyle = 'rgba(255, 255, 255, 0.48)';
      ctx.fillRect(-3.8, -1.4, 7.6, 0.8);
      // Silver aluminum lid & dark drink opening
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.ellipse(-4.4, 0, 1.1, 2.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(-4.4, 0.3, 0.45, 0.85, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return true;
    }

    // Depressurized, dented empty Panthenol aerosol canister
    case 'panthenol_empty': {
      drawShadow(ctx, 7, 2.5, 8, 0.24);

      const pGrad = ctx.createLinearGradient(-5.5, -8.5, 5.5, 8);
      pGrad.addColorStop(0.0, '#ffffff');
      pGrad.addColorStop(0.6, '#e2e8f0');
      pGrad.addColorStop(1.0, '#94a3b8');
      ctx.fillStyle = pGrad;
      ctx.beginPath();
      ctx.moveTo(-5.5, -8.5);
      ctx.lineTo(5.5, -8.5);
      ctx.lineTo(5.5, -2);
      ctx.lineTo(3.2, 0);
      ctx.lineTo(5.5, 2);
      ctx.lineTo(5.5, 8);
      ctx.lineTo(-5.5, 8);
      ctx.closePath();
      ctx.fill();

      drawStudioLabelPanel(ctx, -5.2, -3.5, 8.6, 8.4, {
        paperColor: '#ffffff',
        bandColor: '#ea580c',
        accentColor: '#0284c7',
        inkColor: '#0f172a',
        goldFoil: false,
        hasBarcode: true,
        emblem: 'circle',
        cylindrical: true
      });

      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.ellipse(0, -8.5, 4.5, 1.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#64748b';
      ctx.fillRect(-1.5, -10, 3, 1.5);
      return true;
    }

    // Squeezed, rolled-up empty Spasatel balm tube
    case 'ointment_tube_empty': {
      drawShadow(ctx, 7.5, 2.5, 7.5, 0.24);

      const tGrad = ctx.createLinearGradient(-5.5, -6, 5.5, 4);
      tGrad.addColorStop(0.0, '#16a34a');
      tGrad.addColorStop(0.6, '#15803d');
      tGrad.addColorStop(1.0, '#14532d');
      ctx.fillStyle = tGrad;
      ctx.beginPath();
      ctx.roundRect(-5.5, -6, 11, 10, 1.2);
      ctx.fill();

      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.moveTo(-5.5, -2); ctx.lineTo(5.5, -5); ctx.lineTo(5.5, 0); ctx.lineTo(-5.5, 3);
      ctx.closePath(); ctx.fill();
      drawMicroBarcode(ctx, -3.2, 1.4, 4.4, 1.2);

      // Rolled crimped tail coil
      drawCrimpedSeal(ctx, -5.8, 3.6, 10.6, 1.8, '#94a3b8', true, 0.72);

      // Open aluminum nozzle
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-1.8, -8, 3.6, 2);

      // Unscrewed ribbed cap lying aside
      drawScrewCap(ctx, 5.6, 2.6, 3.2, 2.8, '#ffffff', false);
      return true;
    }

    // Uncapped empty green glass Zelenka bottle
    case 'zelenka_bottle_empty': {
      drawShadow(ctx, 6.5, 2.5, 7.5, 0.24);

      const zGrad = ctx.createLinearGradient(-5, -4, 5, 7.5);
      zGrad.addColorStop(0.0, '#059669');
      zGrad.addColorStop(0.5, '#047857');
      zGrad.addColorStop(1.0, '#022c22');
      ctx.fillStyle = zGrad;
      ctx.beginPath();
      ctx.roundRect(-5, -4, 10, 11.5, 1.8);
      ctx.fill();

      drawStudioLabelPanel(ctx, -4.6, -1.2, 9.2, 5.8, {
        paperColor: '#f8fafc',
        bandColor: '#047857',
        accentColor: '#10b981',
        inkColor: '#022c22',
        goldFoil: false,
        hasBarcode: true,
        emblem: 'none',
        cylindrical: true
      });
      // Green antiseptic drip stain on label
      ctx.fillStyle = 'rgba(16, 185, 129, 0.75)';
      ctx.beginPath();
      ctx.arc(-1.8, 2.2, 1.35, 0, Math.PI * 2);
      ctx.fill();

      drawGlossBand(ctx, -3.8, -3.4, 0.9, 9.6, 0.38);

      ctx.fillStyle = '#065f46';
      ctx.fillRect(-2.5, -6.5, 5, 2.8);
      ctx.fillStyle = '#022c22';
      ctx.beginPath();
      ctx.ellipse(0, -6.5, 2.2, 0.95, 0, 0, Math.PI * 2);
      ctx.fill();

      // Unscrewed cork lying on the right
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.ellipse(5, 3, 2, 1.2, 0.4, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    // Uncapped empty amber glass Iodine bottle
    case 'iodine_bottle_empty': {
      drawShadow(ctx, 6.5, 2.5, 7.5, 0.24);

      const iGrad = ctx.createLinearGradient(-5, -4, 5, 7.5);
      iGrad.addColorStop(0.0, '#b45309');
      iGrad.addColorStop(0.5, '#78350f');
      iGrad.addColorStop(1.0, '#451a03');
      ctx.fillStyle = iGrad;
      ctx.beginPath();
      ctx.roundRect(-5, -4, 10, 11.5, 1.8);
      ctx.fill();

      drawStudioLabelPanel(ctx, -4.6, -1.2, 9.2, 5.8, {
        paperColor: '#ffedd5',
        bandColor: '#b45309',
        accentColor: '#92400e',
        inkColor: '#451a03',
        goldFoil: false,
        hasBarcode: true,
        emblem: 'none',
        cylindrical: true
      });
      ctx.fillStyle = 'rgba(217, 119, 6, 0.72)';
      ctx.beginPath();
      ctx.arc(1.6, 2.1, 1.4, 0, Math.PI * 2);
      ctx.fill();

      drawGlossBand(ctx, -3.8, -3.4, 0.9, 9.6, 0.35);

      ctx.fillStyle = '#92400e';
      ctx.fillRect(-2.5, -6.5, 5, 2.8);
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.ellipse(0, -6.5, 2.2, 0.95, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#7c2d12';
      ctx.beginPath();
      ctx.ellipse(5.2, 3.5, 2.2, 1.4, -0.3, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    // Squeezed empty Diclofenac gel tube
    case 'diclofenac_tube_empty': {
      drawShadow(ctx, 7.5, 2.5, 7.5, 0.24);

      const dGrad = ctx.createLinearGradient(-5.5, -6, 5.5, 4);
      dGrad.addColorStop(0.0, '#ffffff');
      dGrad.addColorStop(0.6, '#e2e8f0');
      dGrad.addColorStop(1.0, '#94a3b8');
      ctx.fillStyle = dGrad;
      ctx.beginPath();
      ctx.roundRect(-5.5, -6, 11, 10, 1.2);
      ctx.fill();

      drawStudioLabelPanel(ctx, -5.2, -3.5, 10.4, 6.2, {
        paperColor: '#f8fafc',
        bandColor: '#0284c7',
        accentColor: '#38bdf8',
        inkColor: '#0f172a',
        goldFoil: false,
        hasBarcode: true,
        emblem: 'diamond',
        cylindrical: true
      });

      drawCrimpedSeal(ctx, -5.8, 3.6, 10.6, 1.8, '#94a3b8', true, 0.72);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-1.5, -8, 3, 2);
      drawScrewCap(ctx, 5.6, 2.6, 3.2, 2.8, '#ffffff', false);
      return true;
    }

    // Empty Hydrogen Peroxide plastic bottle
    case 'peroxide_bottle_empty': {
      drawShadow(ctx, 6.5, 2.5, 7.5, 0.24);

      const pGrad = ctx.createLinearGradient(-5.5, -5, 5.5, 8.5);
      pGrad.addColorStop(0.0, '#ffffff');
      pGrad.addColorStop(0.5, '#e2e8f0');
      pGrad.addColorStop(1.0, '#94a3b8');
      ctx.fillStyle = pGrad;
      ctx.beginPath();
      ctx.roundRect(-5.5, -5, 11, 13.5, 2.2);
      ctx.fill();

      drawStudioLabelPanel(ctx, -5.2, -2.2, 10.4, 6.6, {
        paperColor: '#f8fafc',
        bandColor: '#0284c7',
        accentColor: '#38bdf8',
        inkColor: '#0f172a',
        goldFoil: false,
        hasBarcode: true,
        emblem: 'circle',
        cylindrical: true
      });

      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-2.5, -7, 5, 2);
      ctx.fillStyle = '#020617';
      ctx.beginPath();
      ctx.ellipse(0, -7, 1.8, 0.75, 0, 0, Math.PI * 2);
      ctx.fill();

      drawScrewCap(ctx, 5.2, 3.2, 3.4, 2.4, '#ffffff', false);
      return true;
    }

    // Empty Ammonia vial
    case 'ammonia_bottle_empty': {
      drawShadow(ctx, 5.8, 2.4, 7.5, 0.24);

      const aGrad = ctx.createLinearGradient(-4.5, -4, 4.5, 6.5);
      aGrad.addColorStop(0.0, '#b45309');
      aGrad.addColorStop(0.5, '#78350f');
      aGrad.addColorStop(1.0, '#451a03');
      ctx.fillStyle = aGrad;
      ctx.beginPath();
      ctx.roundRect(-4.5, -4, 9, 10.5, 1.8);
      ctx.fill();

      drawStudioLabelPanel(ctx, -4.2, -1.0, 8.4, 5.2, {
        paperColor: '#fffbeb',
        bandColor: '#1e293b',
        accentColor: '#ca8a04',
        inkColor: '#0f172a',
        goldFoil: false,
        hasBarcode: true,
        emblem: 'none',
        cylindrical: true
      });

      ctx.fillStyle = '#92400e';
      ctx.fillRect(-2, -6, 4, 2);
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.ellipse(0, -6, 1.8, 0.75, 0, 0, Math.PI * 2);
      ctx.fill();

      drawScrewCap(ctx, 4.6, 2.2, 3.0, 2.2, '#f8fafc', false);
      return true;
    }

    // Open split Star Balm tin compact lid & empty base container
    case 'star_tin_empty': {
      drawShadow(ctx, 8.5, 3, 7.5, 0.26);

      const baseGrad = ctx.createRadialGradient(-4.5, -0.5, 0.5, -3.5, 0.5, 5.5);
      baseGrad.addColorStop(0.0, '#fcd34d');
      baseGrad.addColorStop(0.7, '#d97706');
      baseGrad.addColorStop(1.0, '#78350f');
      ctx.fillStyle = baseGrad;
      ctx.beginPath();
      ctx.ellipse(-3.5, 0.5, 5.5, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.ellipse(-3.5, 0.5, 4.2, 3.8, 0, 0, Math.PI * 2);
      ctx.fill();

      const lidGrad = ctx.createRadialGradient(2.8, -2.0, 0.4, 3.8, -1, 5.2);
      lidGrad.addColorStop(0.0, '#ef4444');
      lidGrad.addColorStop(0.65, '#b91c1c');
      lidGrad.addColorStop(1.0, '#450a0a');
      ctx.fillStyle = lidGrad;
      ctx.beginPath();
      ctx.ellipse(3.8, -1, 5.2, 4.8, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 0.45;
      ctx.stroke();

      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      const outerR = 2.7;
      const innerR = 1.15;
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const angle = (i * Math.PI) / 5 - Math.PI / 2;
        const sx = 3.8 + Math.cos(angle) * r;
        const sy = -1 + Math.sin(angle) * r * 0.92;
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.closePath();
      ctx.fill();
      return true;
    }

    // Empty Valerian dropper bottle with removed pipette dropper
    case 'valerian_bottle_empty': {
      drawShadow(ctx, 7, 2.6, 7.5, 0.24);

      const vGrad = ctx.createLinearGradient(-5, -3, 5, 8);
      vGrad.addColorStop(0.0, '#b45309');
      vGrad.addColorStop(0.5, '#78350f');
      vGrad.addColorStop(1.0, '#451a03');
      ctx.fillStyle = vGrad;
      ctx.beginPath();
      ctx.roundRect(-5, -3, 10, 11, 1.8);
      ctx.fill();

      drawStudioLabelPanel(ctx, -4.6, -0.4, 9.2, 5.8, {
        paperColor: '#f0fdf4',
        bandColor: '#15803d',
        accentColor: '#ca8a04',
        inkColor: '#14532d',
        goldFoil: false,
        hasBarcode: true,
        emblem: 'leaf',
        cylindrical: true
      });

      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.ellipse(0, -3, 2, 0.95, 0, 0, Math.PI * 2);
      ctx.fill();

      // Glass pipette with matte rubber dropper bulb
      drawLitEllipse(ctx, 5, -2, 2.0, 2.0, 0, '#52525b', '#18181b', '#09090b');
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.85)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(5, -2); ctx.lineTo(7.5, 4);
      ctx.stroke();
      return true;
    }

    default:
      return false;
  }
}
