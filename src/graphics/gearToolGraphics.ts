// Procedural 2D Canvas Models for Tools, Auto, Gear, and Valuables
import {
  drawShadow,
  drawGlossBand,
  drawLitEllipse,
  drawBotanicalLeaf,
  drawCrimpedSeal,
  drawPouchCrinkles,
  drawStudioLabelPanel,
  drawFilmWindow,
  drawMicroBarcode,
  drawScrewCap,
  drawMetalCanLid,
  applyCylinderLightingOverlay
} from './itemGraphicShared';
import { drawItemModel2D } from '../itemGraphic';
import {
  resolveContainerVisualAttributes,
  rgbTupleToCss,
  shiftRgbTuple,
  LIQUID_REGISTRY,
  LiquidId
} from '../liquidSystem';
import { drawToolRedrawItem } from './toolsRedraw';
import { drawKitchenwareRedrawItem } from './kitchenwareRedraw';

export function drawGearToolItem(ctx: CanvasRenderingContext2D, itemId: string, item?: any): boolean {
  if (drawToolRedrawItem(ctx, itemId, item)) {
    return true;
  }
  if (drawKitchenwareRedrawItem(ctx, itemId, item)) {
    return true;
  }

  switch (itemId) {
    case 'car_key':
    case 'car_key_classic':
    case 'car_key_flip':
    case 'car_key_smart':
    case 'car_key_display': {
      const tier = item?.keyTier || (
        itemId === 'car_key_classic' ? 'classic' :
        itemId === 'car_key_flip' ? 'flip' :
        itemId === 'car_key_smart' ? 'smart' :
        itemId === 'car_key_display' ? 'display' : 'flip'
      );

      if (tier === 'classic') {
        // === 1. CLASSIC MECHANICAL KEY (Механический ключ зажигания) ===
        drawShadow(ctx, 7, 9, 7, 0.3);

        // Key split ring at bottom
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(0, 8.5, 3.8, 0, Math.PI * 2);
        ctx.stroke();

        // Molded polymer head (dark textured trapezoid/oval with grip ribs)
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.roundRect(-6, 0, 12, 9, 2.5);
        ctx.fill();

        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(-5.5, 0.5, 11, 8);

        // Grip ribs on head
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-4, 2.5, 8, 1);
        ctx.fillRect(-4, 4.5, 8, 1);
        ctx.fillRect(-4, 6.5, 8, 1);

        // Keyhole in head for the ring
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(0, 8, 1.8, 0, Math.PI * 2);
        ctx.fill();

        // Metallic steel key blade extending upwards
        const bladeGrad = ctx.createLinearGradient(-2, -12, 2, -12);
        bladeGrad.addColorStop(0, '#e2e8f0');
        bladeGrad.addColorStop(0.5, '#cbd5e1');
        bladeGrad.addColorStop(1, '#94a3b8');
        ctx.fillStyle = bladeGrad;
        ctx.fillRect(-2, -12, 4, 12);

        // Precision cut teeth on blade
        ctx.fillStyle = '#64748b';
        ctx.fillRect(-2, -10, 1.2, 1.5);
        ctx.fillRect(-2, -6, 1.2, 2);
        ctx.fillRect(0.8, -8, 1.2, 1.5);
        ctx.fillRect(0.8, -4, 1.2, 1.8);

        // Central milled guide groove
        ctx.fillStyle = '#475569';
        ctx.fillRect(-0.4, -11, 0.8, 10);

        return true;
      } else if (tier === 'smart') {
        // === 2. SMART KEYLESS-GO FOB (Премиальный смарт-брелок) ===
        drawShadow(ctx, 9, 10, 8, 0.35);

        // Chrome key loop at bottom
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(0, 8.5, 2.5, 0, Math.PI);
        ctx.stroke();

        // Sleek aerodynamic teardrop / pebble casing
        const bodyGrad = ctx.createLinearGradient(-6, -10, 6, 10);
        bodyGrad.addColorStop(0, '#0f172a');
        bodyGrad.addColorStop(0.5, '#020617');
        bodyGrad.addColorStop(1, '#0f172a');
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.roundRect(-6.5, -9, 13, 17, 4.5);
        ctx.fill();

        // Polished chrome side accent rails
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.roundRect(-6.5, -9, 13, 17, 4.5);
        ctx.stroke();

        // Sapphire blue LED indicator dot at top
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(0, -6.8, 0.9, 0, Math.PI * 2);
        ctx.fill();

        // Button 1: Lock (Upper)
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.roundRect(-4, -4.5, 8, 2.8, 1);
        ctx.fill();
        ctx.strokeStyle = '#60a5fa';
        ctx.lineWidth = 0.6;
        ctx.stroke();

        // Button 2: Unlock (Middle)
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.roundRect(-4, -1, 8, 2.8, 1);
        ctx.fill();
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 0.6;
        ctx.stroke();

        // Button 3: Engine Start/Stop (Circle with glowing amber/cyan center)
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(0, 3.2, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 0.8;
        ctx.stroke();
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(0, 3.2, 0.7, 0, Math.PI * 2);
        ctx.fill();

        // Button 4: Headlights / Horn (Bottom micro-switch)
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(-2, 6, 4, 0.9);

        drawGlossBand(ctx, -5.5, -8, 3, 15);
        return true;
      } else if (tier === 'display') {
        // === 3. HIGH-TECH DISPLAY KEY (Интерактивный смарт-ключ с цветным дисплеем) ===
        drawShadow(ctx, 10, 11, 9, 0.4);

        // Carbon-composite and titanium body
        const caseGrad = ctx.createLinearGradient(-7, -10, 7, 10);
        caseGrad.addColorStop(0, '#09090b');
        caseGrad.addColorStop(0.5, '#18181b');
        caseGrad.addColorStop(1, '#09090b');
        ctx.fillStyle = caseGrad;
        ctx.beginPath();
        ctx.roundRect(-7, -10, 14, 20, 3.5);
        ctx.fill();

        // Polished titanium beveled bezel
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(-6.5, -9.5, 13, 19);

        // Illuminated micro OLED screen
        const screenGrad = ctx.createLinearGradient(-5, -7, 5, 2);
        screenGrad.addColorStop(0, '#082f49');
        screenGrad.addColorStop(1, '#0369a1');
        ctx.fillStyle = screenGrad;
        ctx.beginPath();
        ctx.roundRect(-5, -7.5, 10, 10, 1.5);
        ctx.fill();

        // Miniature car silhouette on screen
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.roundRect(-3, -5, 6, 3, 0.8);
        ctx.fill();
        // Screen status line (battery / lock dot)
        ctx.fillStyle = '#4ade80';
        ctx.fillRect(-4, -1, 3, 1);
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(3, -0.5, 0.7, 0, Math.PI * 2);
        ctx.fill();

        // Lower capacitive touch area with glowing cyan engine ring
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.roundRect(-5.5, 3.5, 11, 4.5, 1.5);
        ctx.fill();

        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.arc(0, 5.8, 1.6, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#22d3ee';
        ctx.beginPath();
        ctx.arc(0, 5.8, 0.7, 0, Math.PI * 2);
        ctx.fill();

        drawGlossBand(ctx, -6, -9, 3, 18);
        return true;
      } else {
        // === 4. MODERN FLIP-KEY (Складной выкидной ключ-брелок) ===
        drawShadow(ctx, 8, 8, 7, 0.3);

        // Key ring at bottom
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 9, 3.5, 0, Math.PI * 2);
        ctx.stroke();

        // Metallic silver key blade extending from top
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(-1.5, -11, 3, 8);
        ctx.fillStyle = '#64748b';
        ctx.fillRect(-1.5, -9, 1, 2);
        ctx.fillRect(0.5, -7, 1, 2);

        // Central laser groove on flip blade
        ctx.fillStyle = '#475569';
        ctx.fillRect(-0.3, -11, 0.6, 7);

        // Sleek flip key fob body (Dark Matte Finish)
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.roundRect(-6, -4, 12, 12, 3);
        ctx.fill();

        // Chrome metallic side bevels
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(-5.5, -3.5, 11, 11);

        // Silver spring release pivot button (top left)
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.arc(-3.5, -1.5, 1.3, 0, Math.PI * 2);
        ctx.fill();

        // Lock button (Upper)
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(0.5, -1, 2.0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Unlock button (Lower)
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(0.5, 3.8, 2.0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Red Panic/Trunk accent dot
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.arc(0.5, 6.8, 0.8, 0, Math.PI * 2);
        ctx.fill();

        drawGlossBand(ctx, -5, -3, 3, 10);
        return true;
      }
    }

    case 'car_pts': {
      drawShadow(ctx, 8, 10, 8, 0.25);

      // Deep Blue PTS Document Booklet Base
      ctx.fillStyle = '#1e3a8a';
      ctx.beginPath();
      ctx.roundRect(-8, -10, 16, 20, 1.2);
      ctx.fill();

      // Gold Security Border & Guilloche Frame
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(-7, -9, 14, 18);

      // Russian Crest Emblem (Golden Seal)
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(0, -3, 3, 0, Math.PI * 2);
      ctx.fill();

      // Text Header Lines (ПТС)
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 3.5px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ПТС', 0, 4);

      ctx.fillStyle = '#93c5fd';
      ctx.fillRect(-5, 6, 10, 0.8);
      ctx.fillRect(-5, 8, 10, 0.8);
      return true;
    }

    case 'car_tech_passport': {
      drawShadow(ctx, 9, 6, 7, 0.25);

      // Laminated Pink/Burgundy STS Card
      ctx.fillStyle = '#9d174d';
      ctx.beginPath();
      ctx.roundRect(-9, -6, 18, 12, 1.5);
      ctx.fill();

      // Holographic Security Margin
      ctx.strokeStyle = '#f472b6';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(-8, -5, 16, 10);

      // Yellow Microchip
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(-6.5, -3, 3, 2.5);
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(-6.5, -3, 3, 2.5);

      // Text "СТС" & Details
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 3.5px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('СТС', 7, -1);

      // Barcode lines at bottom
      ctx.fillStyle = '#fbcfe8';
      for (let x = -6; x <= 6; x += 1.2) {
        ctx.fillRect(x, 2, 0.6, 2.5);
      }
      return true;
    }

    case 'apartment_key': {
      drawShadow(ctx, 6, 8, 6, 0.3);

      // Steel Key Ring
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(0, 7.5, 3.5, 0, Math.PI * 2);
      ctx.stroke();

      // Precision Steel Head (Hexagonal/Rounded diamond with fob hole)
      const headGrad = ctx.createLinearGradient(-6, 0, 6, 8);
      headGrad.addColorStop(0, '#e2e8f0');
      headGrad.addColorStop(0.5, '#cbd5e1');
      headGrad.addColorStop(1, '#94a3b8');
      ctx.fillStyle = headGrad;
      ctx.beginPath();
      ctx.roundRect(-6, 0, 12, 8, 2);
      ctx.fill();

      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(-5.5, 0.5, 11, 7);

      // Central hole for ring
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(0, 6.5, 1.6, 0, Math.PI * 2);
      ctx.fill();

      // Engraved key code line on head
      ctx.fillStyle = '#334155';
      ctx.fillRect(-4, 2.5, 8, 1);

      // Steel Blade extending upwards
      const bladeGrad = ctx.createLinearGradient(-2, -12, 2, -12);
      bladeGrad.addColorStop(0, '#f8fafc');
      bladeGrad.addColorStop(0.5, '#cbd5e1');
      bladeGrad.addColorStop(1, '#64748b');
      ctx.fillStyle = bladeGrad;
      ctx.fillRect(-2, -12, 4, 12);

      // Precision cut teeth on right side
      ctx.fillStyle = '#475569';
      ctx.fillRect(1, -11, 2, 1.2);
      ctx.fillRect(1, -8, 2.4, 1.2);
      ctx.fillRect(1, -5, 1.8, 1.2);
      ctx.fillRect(1, -2, 2.2, 1.2);

      // Longitudinal milling groove (продольный паз)
      ctx.fillStyle = '#64748b';
      ctx.fillRect(-0.8, -10, 1, 8.5);
      return true;
    }

    case 'apartment_key_spare': {
      drawShadow(ctx, 7, 9, 7, 0.3);

      // Brass Sealed Tag Tube / Case
      const brassGrad = ctx.createLinearGradient(-5, -6, 5, 8);
      brassGrad.addColorStop(0, '#fde047');
      brassGrad.addColorStop(0.5, '#eab308');
      brassGrad.addColorStop(1, '#a16207');
      ctx.fillStyle = brassGrad;
      ctx.beginPath();
      ctx.roundRect(-5, -7, 10, 15, 2.5);
      ctx.fill();

      ctx.strokeStyle = '#713f12';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(-4.5, -6.5, 9, 14);

      // Red Wax Tamper-Evident Seal (Сургучная пломба)
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(0, 1, 2.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fca5a5';
      ctx.beginPath();
      ctx.arc(-0.8, 0.2, 1.0, 0, Math.PI * 2);
      ctx.fill();

      // Golden Hanging Wire Loop
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, -8, 3, 0, Math.PI * 2);
      ctx.stroke();
      return true;
    }

    case 'property_deed_egrn': {
      drawShadow(ctx, 9, 11, 9, 0.25);

      // Official White / Pale-Beige Security Parchment
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.roundRect(-9, -11, 18, 22, 1.5);
      ctx.fill();

      // Green Rosreestr Security Guilloche Frame
      ctx.strokeStyle = '#16a34a';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(-7.5, -9.5, 15, 19);

      // Golden Russian Coat of Arms Emblem (Герб РФ)
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.arc(0, -5, 3.2, 0, Math.PI * 2);
      ctx.fill();

      // Document Title "ЕГРН"
      ctx.fillStyle = '#15803d';
      ctx.font = 'bold 3.2px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ЕГРН', 0, 1.5);

      // Official Blue Round Stamp (Синяя гербовая печать)
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(3.5, 6, 2.6, 0, Math.PI * 2);
      ctx.stroke();

      // Cadastral data lines
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(-6, 3, 6, 0.7);
      ctx.fillRect(-6, 5, 6, 0.7);
      ctx.fillRect(-6, 7, 6, 0.7);
      return true;
    }

    case 'property_contract_dkp': {
      drawShadow(ctx, 9, 11, 9, 0.25);

      // Notarized Blue/Indigo Legal Document Border
      ctx.fillStyle = '#f1f5f9';
      ctx.beginPath();
      ctx.roundRect(-9, -11, 18, 22, 1.5);
      ctx.fill();

      // Burgundy Notary Border
      ctx.strokeStyle = '#991b1b';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(-7.5, -9.5, 15, 19);

      // Notary Red Seal Ribbon (Лента нотариуса)
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-7.5, -7, 15, 1.2);

      // Text "ДКП"
      ctx.fillStyle = '#7f1d1d';
      ctx.font = 'bold 3.2px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ДКП', 0, -1.5);

      // Signatures and Stamps
      ctx.fillStyle = '#64748b';
      ctx.fillRect(-6, 2, 12, 0.7);
      ctx.fillRect(-6, 4, 12, 0.7);
      ctx.fillRect(-6, 6, 8, 0.7);

      // Red Notary Embossed Seal
      ctx.fillStyle = '#b91c1c';
      ctx.beginPath();
      ctx.arc(3.5, 6.5, 2.2, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    case 'property_tech_passport': {
      drawShadow(ctx, 9, 11, 9, 0.25);

      // BTI Dark Slate Blueprint Booklet
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(-9, -11, 18, 22, 1.5);
      ctx.fill();

      // Cyan Blueprint Floor Plan Grid
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 0.7;
      ctx.strokeRect(-7.5, -9.5, 15, 19);

      // Architectural Room Plan Scheme
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(-5, -6, 10, 8);
      ctx.beginPath();
      ctx.moveTo(-5, -2);
      ctx.lineTo(5, -2);
      ctx.moveTo(0, -2);
      ctx.lineTo(0, 2);
      ctx.stroke();

      // BTI Header Badge
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 2.8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('БТИ ПЛАН', 0, 6.5);
      return true;
    }

    case 'cash': {
      drawShadow(ctx, 8.5, 3.2, 7.5, 0.22);

      // Stack under-layer
      ctx.fillStyle = '#14532d';
      ctx.beginPath();
      ctx.roundRect(-8, -3.5, 16, 9.5, 1);
      ctx.fill();

      // Top green banknote
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.roundRect(-8.5, -5, 17, 10, 1.2);
      ctx.fill();

      // Light border & guilloche margin
      ctx.strokeStyle = '#86efac';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(-7.5, -4, 15, 8);

      // Center portrait oval
      ctx.fillStyle = '#14532d';
      ctx.beginPath();
      ctx.ellipse(0, 0, 3.2, 2.4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Currency paper paper band strap ($100)
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(-2, -5, 4, 10);
      ctx.fillStyle = '#b45309';
      ctx.fillRect(-1.5, -1, 3, 2);
      return true;
    }

    case 'cash_5000': {
      drawShadow(ctx, 8.5, 3.2, 7.5, 0.22);
      ctx.fillStyle = '#7f1d1d'; // Rich red dark base
      ctx.beginPath(); ctx.roundRect(-8.5, -5, 17, 10, 1.2); ctx.fill();
      ctx.strokeStyle = '#fca5a5'; ctx.lineWidth = 0.8; ctx.strokeRect(-7.5, -4, 15, 8);
      ctx.fillStyle = '#fca5a5'; ctx.beginPath(); ctx.ellipse(0, 0, 3, 2.2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fee2e2'; ctx.font = 'bold 4.5px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('5000', 0, 0);
      return true;
    }

    case 'cash_1000': {
      drawShadow(ctx, 8.5, 3.2, 7.5, 0.22);
      ctx.fillStyle = '#115e59'; // Rich teal dark base
      ctx.beginPath(); ctx.roundRect(-8.5, -5, 17, 10, 1.2); ctx.fill();
      ctx.strokeStyle = '#99f6e4'; ctx.lineWidth = 0.8; ctx.strokeRect(-7.5, -4, 15, 8);
      ctx.fillStyle = '#2dd4bf'; ctx.beginPath(); ctx.ellipse(0, 0, 3, 2.2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ccfbf1'; ctx.font = 'bold 4.5px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('1000', 0, 0);
      return true;
    }

    case 'cash_500': {
      drawShadow(ctx, 8.5, 3.2, 7.5, 0.22);
      ctx.fillStyle = '#581c87'; // Violet purple base
      ctx.beginPath(); ctx.roundRect(-8.5, -5, 17, 10, 1.2); ctx.fill();
      ctx.strokeStyle = '#e9d5ff'; ctx.lineWidth = 0.8; ctx.strokeRect(-7.5, -4, 15, 8);
      ctx.fillStyle = '#c084fc'; ctx.beginPath(); ctx.ellipse(0, 0, 3, 2.2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f3e8ff'; ctx.font = 'bold 4.5px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('500', 0, 0);
      return true;
    }

    case 'cash_100': {
      drawShadow(ctx, 8.5, 3.2, 7.5, 0.22);
      ctx.fillStyle = '#78350f'; // Olive brown base
      ctx.beginPath(); ctx.roundRect(-8.5, -5, 17, 10, 1.2); ctx.fill();
      ctx.strokeStyle = '#fde68a'; ctx.lineWidth = 0.8; ctx.strokeRect(-7.5, -4, 15, 8);
      ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.ellipse(0, 0, 3, 2.2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fef3c7'; ctx.font = 'bold 4.5px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('100', 0, 0);
      return true;
    }

    case 'cash_50': {
      drawShadow(ctx, 8.5, 3.2, 7.5, 0.22);
      ctx.fillStyle = '#075985'; // Blue sky base
      ctx.beginPath(); ctx.roundRect(-8.5, -5, 17, 10, 1.2); ctx.fill();
      ctx.strokeStyle = '#bae6fd'; ctx.lineWidth = 0.8; ctx.strokeRect(-7.5, -4, 15, 8);
      ctx.fillStyle = '#38bdf8'; ctx.beginPath(); ctx.ellipse(0, 0, 3, 2.2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e0f2fe'; ctx.font = 'bold 4.5px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('50', 0, 0);
      return true;
    }

    case 'cash_10': {
      drawShadow(ctx, 8.5, 3.2, 7.5, 0.22);
      ctx.fillStyle = '#451a03'; // Warm bronze-amber
      ctx.beginPath(); ctx.roundRect(-8.5, -5, 17, 10, 1.2); ctx.fill();
      ctx.strokeStyle = '#fef08a'; ctx.lineWidth = 0.8; ctx.strokeRect(-7.5, -4, 15, 8);
      ctx.fillStyle = '#eab308'; ctx.beginPath(); ctx.ellipse(0, 0, 3, 2.2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fef9c3'; ctx.font = 'bold 4.5px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('10', 0, 0);
      return true;
    }

    case 'coin_10': {
      drawShadow(ctx, 6, 2.5, 5, 0.22);
      ctx.fillStyle = '#ca8a04'; // Deep gold ring
      ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#cbd5e1'; // Silver core
      ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1e293b'; ctx.font = 'bold 5px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('10', 0, 0);
      return true;
    }

    case 'coin_5': {
      drawShadow(ctx, 5.5, 2.3, 4.5, 0.22);
      ctx.fillStyle = '#94a3b8'; // Silver Nickel alloy
      ctx.beginPath(); ctx.arc(0, 0, 5.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 0.8; ctx.stroke();
      ctx.fillStyle = '#1e293b'; ctx.font = 'bold 4.5px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('5', 0, 0);
      return true;
    }

    case 'coin_2': {
      drawShadow(ctx, 5, 2.1, 4, 0.22);
      ctx.fillStyle = '#cbd5e1'; // Light silver
      ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#f1f5f9'; ctx.lineWidth = 0.8; ctx.stroke();
      ctx.fillStyle = '#1e293b'; ctx.font = 'bold 4.5px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('2', 0, 0);
      return true;
    }

    case 'coin_1': {
      drawShadow(ctx, 4.5, 1.9, 3.5, 0.22);
      ctx.fillStyle = '#b45309'; // Copper bronze
      ctx.beginPath(); ctx.arc(0, 0, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 0.6; ctx.stroke();
      ctx.fillStyle = '#fef3c7'; ctx.font = 'bold 4.5px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('1', 0, 0);
      return true;
    }

    case 'repair_kit': {
      drawShadow(ctx, 9, 3.2, 7.8, 0.25);

      // Heavy red steel mechanic toolbox body
      ctx.fillStyle = '#b91c1c';
      ctx.beginPath();
      ctx.roundRect(-8.5, -4.5, 17, 12, 1.5);
      ctx.fill();

      // Top lid section
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.roundRect(-8.8, -5.5, 17.6, 3, 1);
      ctx.fill();

      // Black reinforced top handle
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.roundRect(-4.5, -8.5, 9, 3.5, 1.2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-3, -7, 6, 2);

      // Dual metallic latches
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-5.5, -4, 2.2, 3.5);
      ctx.fillRect(3.3, -4, 2.2, 3.5);

      // Spanner wrench emblem on front
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-3, 2); ctx.lineTo(3, 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-3, 2, 1.2, Math.PI * 0.4, Math.PI * 1.6);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(3, 2, 1.2, -Math.PI * 0.6, Math.PI * 0.6);
      ctx.stroke();
      return true;
    }

    case 'flashlight': {
      drawShadow(ctx, 8.5, 2.8, 7.5, 0.22);

      // Tactical knurled barrel
      ctx.fillStyle = '#27272a';
      ctx.beginPath();
      ctx.roundRect(-7.5, -2.5, 11, 5, 1);
      ctx.fill();

      // Knurling grip texture
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 0.8;
      for (let x = -6.5; x <= 1.5; x += 1.5) {
        ctx.beginPath();
        ctx.moveTo(x, -2.5); ctx.lineTo(x, 2.5);
        ctx.stroke();
      }

      // Flared flashlight head
      ctx.fillStyle = '#3f3f46';
      ctx.beginPath();
      ctx.moveTo(3.5, -2.5);
      ctx.lineTo(7.5, -4.5);
      ctx.lineTo(7.5, 4.5);
      ctx.lineTo(3.5, 2.5);
      ctx.closePath();
      ctx.fill();

      // Cooling fins on head
      ctx.fillStyle = '#18181b';
      ctx.fillRect(4.5, -3.2, 0.9, 6.4);
      ctx.fillRect(6, -3.8, 0.9, 7.6);

      // Glowing reflector lens
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.ellipse(7.5, 0, 1.5, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Soft light beam glow hint
      ctx.fillStyle = 'rgba(254, 240, 138, 0.35)';
      ctx.beginPath();
      ctx.moveTo(7.5, -4.5);
      ctx.lineTo(12, -7);
      ctx.lineTo(12, 7);
      ctx.lineTo(7.5, 4.5);
      ctx.closePath();
      ctx.fill();
      return true;
    }

    case 'flashlight_police': {
      drawShadow(ctx, 8.5, 2.8, 7.8, 0.26);

      // Heavy Tactical Police Maglite / Duty Flashlight
      // Aircraft-grade matte black anodized aluminum barrel
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(-8.5, -2.4, 12, 4.8, 1);
      ctx.fill();

      // Deep cross-hatch knurling on grip barrel
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 0.6;
      for (let kx = -7.5; kx <= 1.5; kx += 1.4) {
        ctx.beginPath();
        ctx.moveTo(kx, -2.4); ctx.lineTo(kx + 1, 2.4);
        ctx.moveTo(kx + 1, -2.4); ctx.lineTo(kx, 2.4);
        ctx.stroke();
      }

      // Tailcap with tactical lanyard ring & strike rim
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-9.5, -2.8, 1.4, 5.6);
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.arc(-9.5, 0, 1.2, 0, Math.PI * 2);
      ctx.stroke();

      // Recessed side pushbutton (textured tactical silicone rubber)
      ctx.fillStyle = '#475569';
      ctx.fillRect(1.5, -3.2, 2.2, 1.2);
      ctx.fillStyle = '#f59e0b'; // Amber tactical switch dot
      ctx.fillRect(2.1, -3.0, 1.0, 0.7);

      // Aggressive flared strike-bezel head
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(3.2, -2.6);
      ctx.lineTo(8.5, -5.2);
      ctx.lineTo(8.5, 5.2);
      ctx.lineTo(3.2, 2.6);
      ctx.closePath();
      ctx.fill();

      // Bezel anti-roll hex flats
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Heavy cooling fins on head
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(4.5, -3.8, 1.0, 7.6);
      ctx.fillRect(6.2, -4.5, 1.0, 9.0);

      // High-intensity Cree LED reflector lens
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.ellipse(8.5, 0, 1.6, 5.0, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(8.5, 0, 0.9, 3.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Concentrated tactical high-candela light beam cone
      ctx.fillStyle = 'rgba(56, 189, 248, 0.28)';
      ctx.beginPath();
      ctx.moveTo(8.5, -5.2);
      ctx.lineTo(13.5, -8.0);
      ctx.lineTo(13.5, 8.0);
      ctx.lineTo(8.5, 5.2);
      ctx.closePath();
      ctx.fill();
      return true;
    }

    case 'screwdriver': {
      drawShadow(ctx, 8.5, 2.4, 7.5, 0.22);

      // Professional Heavy-Duty Magnetic Screwdriver
      // Chrome-Vanadium round steel shaft
      const shaftGrad = ctx.createLinearGradient(0, -1.2, 0, 1.2);
      shaftGrad.addColorStop(0, '#f1f5f9');
      shaftGrad.addColorStop(0.5, '#cbd5e1');
      shaftGrad.addColorStop(1, '#64748b');
      ctx.fillStyle = shaftGrad;
      ctx.fillRect(0, -1.2, 8.5, 2.4);

      // Hardened black magnetic magnetic cross/slotted tip
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(8.5, -1.2);
      ctx.lineTo(11.5, -0.6);
      ctx.lineTo(11.5, 0.6);
      ctx.lineTo(8.5, 1.2);
      ctx.closePath();
      ctx.fill();

      // Tip magnetic finish line
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(8.5, -1.2, 0.6, 2.4);

      // Hex bolster at the junction of shaft and handle
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(-1.2, -2.0, 1.6, 4.0);

      // Ergonomic dual-component handle body (impact-resistant yellow core)
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.roundRect(-9.5, -3.8, 9.5, 7.6, [2, 1, 1, 2]);
      ctx.fill();

      // Molded textured black rubber grip zones (soft-grip finger inlays)
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(-8.5, -4.2, 2.6, 8.4, 1);
      ctx.roundRect(-4.8, -4.2, 2.4, 8.4, 1);
      ctx.fill();

      // Longitudinal anti-slip torque ribs on handle
      ctx.fillStyle = '#18181b';
      ctx.fillRect(-9.0, -1.0, 7.5, 2.0);

      // Strike-through metal butt cap on handle base
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.roundRect(-10.2, -2.8, 1.2, 5.6, 0.6);
      ctx.fill();

      // Specular highlight on blade
      drawGlossBand(ctx, 1.0, -0.9, 6.5, 0.6, 0.5);
      return true;
    }

    case 'motor_oil':
    case 'oil_canister':
    case 'canister_oil': {
      drawShadow(ctx, 8.5, 3.2, 8, 0.28);

      // Sculpted 4L dark titanium-graphite HDPE automotive oil jug
      const canGrad = ctx.createLinearGradient(-7, -4.5, 7, 7.5);
      canGrad.addColorStop(0.0, '#475569');
      canGrad.addColorStop(0.28, '#1e293b');
      canGrad.addColorStop(0.75, '#0f172a');
      canGrad.addColorStop(1.0, '#020617');
      ctx.fillStyle = canGrad;
      ctx.beginPath();
      ctx.roundRect(-7, -4.5, 14, 12, 2.2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
      ctx.lineWidth = 0.45;
      ctx.stroke();

      // Ergonomic molded carrying handle with grip recess
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(-3.8, -8, 10.2, 3.8, 1.5);
      ctx.fill();
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 0.45;
      ctx.stroke();
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.roundRect(-2.4, -6.5, 7.4, 2.1, 0.9);
      ctx.fill();

      // Angled pouring neck & knurled amber screw cap with tamper ring
      ctx.fillStyle = '#334155';
      ctx.fillRect(-6.4, -7.2, 2.6, 3.2);
      drawScrewCap(ctx, -5.1, -8.7, 3.6, 2.3, '#d97706', true);

      // Recessed clear sight-level gauge with golden synthetic oil meniscus
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.roundRect(4.6, -3.5, 1.7, 10.0, 0.5);
      ctx.fill();
      const oilGrad = ctx.createLinearGradient(4.8, -3.2, 6.1, 6.2);
      oilGrad.addColorStop(0.0, '#fbbf24');
      oilGrad.addColorStop(0.5, '#d97706');
      oilGrad.addColorStop(1.0, '#92400e');
      ctx.fillStyle = oilGrad;
      ctx.fillRect(4.85, -3.1, 1.2, 9.2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
      for (let ty = -2.0; ty <= 4.5; ty += 2.0) {
        ctx.fillRect(4.5, ty, 0.7, 0.32);
      }

      // High-performance carbon & gold technical label with viscosity gauge + barcode
      drawStudioLabelPanel(ctx, -5.6, -2.5, 9.2, 8.6, {
        paperColor: '#0f172a',
        bandColor: '#b45309',
        accentColor: '#dc2626',
        inkColor: '#e2e8f0',
        goldFoil: true,
        hasBarcode: true,
        emblem: 'none',
        cylindrical: false
      });

      // Technical viscosity spec bars + golden oil drop insignia
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-4.4, 1.1, 5.2, 0.72);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(-4.4, 2.15, 3.6, 0.42);
      ctx.beginPath();
      ctx.moveTo(2.1, 0.9);
      ctx.bezierCurveTo(3.0, 2.1, 2.9, 3.1, 2.1, 3.1);
      ctx.bezierCurveTo(1.3, 3.1, 1.2, 2.1, 2.1, 0.9);
      ctx.fill();

      drawGlossBand(ctx, -6, -4, 1.6, 11, 0.25);
      return true;
    }

    case 'car_battery': {
      drawShadow(ctx, 8.8, 3.2, 7.8, 0.25);

      // Heavy black plastic battery casing
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.roundRect(-8, -4.5, 16, 12, 1.5);
      ctx.fill();

      // Ribbed reinforcement side channels
      ctx.fillStyle = '#27272a';
      ctx.fillRect(-6.5, -3, 2, 9);
      ctx.fillRect(-1, -3, 2, 9);
      ctx.fillRect(4.5, -3, 2, 9);

      // Top cover
      ctx.fillStyle = '#3f3f46';
      ctx.fillRect(-8.5, -5.5, 17, 2);

      // Positive (+) terminal (Red)
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.roundRect(-6.5, -8.2, 3, 3, 0.6);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-5.5, -7.5, 1, 1.6);
      ctx.fillRect(-5.8, -7.2, 1.6, 1);

      // Negative (-) terminal (Blue)
      ctx.fillStyle = '#2563eb';
      ctx.beginPath();
      ctx.roundRect(3.5, -8.2, 3, 3, 0.6);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(4.2, -7.2, 1.6, 1);

      // Hazard lightning decal
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.moveTo(0, -1); ctx.lineTo(-1.5, 2); ctx.lineTo(0.2, 2); ctx.lineTo(-0.8, 5); ctx.lineTo(1.8, 1.5); ctx.lineTo(0, 1.5);
      ctx.closePath(); ctx.fill();
      return true;
    }

    case 'extinguisher': {
      drawShadow(ctx, 6.8, 2.6, 7.8, 0.25);

      // Red steel cylinder body
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.roundRect(-4.5, -4.5, 9, 12.5, 2);
      ctx.fill();

      // Cylinder specular highlight
      drawGlossBand(ctx, -3.2, -4.5, 1.5, 12.5, 0.35);

      // White specification label
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-4.5, -0.5, 9, 5);
      ctx.fillStyle = '#18181b';
      ctx.fillRect(-3.5, 0.5, 7, 1);
      ctx.fillRect(-3.5, 2.2, 5, 0.8);

      // Top valve neck
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(-1.5, -6.5, 3, 2);

      // Black discharge lever trigger
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.moveTo(-1, -6.5);
      ctx.lineTo(4, -8.5);
      ctx.lineTo(4, -7);
      ctx.lineTo(1, -5.5);
      ctx.closePath();
      ctx.fill();

      // Pressure gauge with green zone
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.arc(-2.5, -5.8, 1.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.arc(-2.5, -5.8, 0.9, 0, Math.PI * 2);
      ctx.fill();

      // Black flexible hose
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(1, -6);
      ctx.quadraticCurveTo(5.5, -4, 4.5, 2);
      ctx.stroke();
      return true;
    }

    case 'extinguisher_empty': {
      drawShadow(ctx, 6.8, 2.6, 7.8, 0.22);

      // Red steel cylinder body with scuffed/faded finish
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.roundRect(-4.5, -4.5, 9, 12.5, 2);
      ctx.fill();

      // Specular highlight band
      drawGlossBand(ctx, -3.2, -4.5, 1.5, 12.5, 0.25);

      // White specification label (scuffed/discharged)
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(-4.5, -0.5, 9, 5);
      ctx.fillStyle = '#475569';
      ctx.fillRect(-3.5, 0.5, 7, 1);
      ctx.fillRect(-3.5, 2.2, 4.5, 0.8);
      // Red DISCHARGED / EMPTY diagonal stamp
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-4, 1.8, 8, 0.6);

      // Top valve neck
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(-1.5, -6.5, 3, 2);

      // Depressed black discharge lever (flat against handle - fully squeezed)
      ctx.fillStyle = '#18181b';
      ctx.fillRect(-1.2, -6.8, 5, 1.4);

      // Empty pressure gauge with needle in the far RED left empty zone
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.arc(-2.5, -5.8, 1.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ef4444'; // Red empty zone
      ctx.beginPath();
      ctx.arc(-2.5, -5.8, 0.9, 0, Math.PI * 2);
      ctx.fill();
      // Needle pointing left to 0 psi
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(-2.5, -5.8);
      ctx.lineTo(-3.1, -5.8);
      ctx.stroke();

      // Broken yellow plastic inspection tamper seal dangling
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(0.5, -5.8, 1, 2.2);

      // Drooping flexible discharge hose
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(1, -6);
      ctx.quadraticCurveTo(6, -2, 3, 5);
      ctx.stroke();

      // White dry powder retardant residue dusting around the nozzle tip
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.beginPath();
      ctx.arc(3, 5, 1.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(3.6, 5.8, 0.7, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    case 'pocket_knife': {
      drawShadow(ctx, 8.5, 2.8, 7.5, 0.22);

      // Red Swiss knife handle
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.roundRect(-7.5, 0.5, 15, 6, 2.5);
      ctx.fill();

      // Brass pivot pin & white crest
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(-5.5, 3.5, 1.2, 0, Math.PI * 2);
      ctx.fill();

      // White cross emblem
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 2.5, 1, 2);
      ctx.fillRect(-0.5, 3, 2, 1);

      // Brushed stainless steel blade locked open
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(-5.5, 1.5);
      ctx.lineTo(-4.5, -7.5);
      ctx.quadraticCurveTo(1.5, -6, 2.5, 1.5);
      ctx.closePath();
      ctx.fill();

      // Blade cutting edge grind
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(-4.5, -7.5);
      ctx.lineTo(2.5, 1.5);
      ctx.lineTo(1, 1.5);
      ctx.lineTo(-4, -6.5);
      ctx.closePath();
      ctx.fill();
      return true;
    }

    case 'thermal_coat': {
      drawShadow(ctx, 9, 3.2, 7.5, 0.22);

      // Folded arctic blue winter parka
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.roundRect(-8.5, -6, 17, 13.5, 3);
      ctx.fill();

      // Down-quilted baffle horizontal ridges
      ctx.strokeStyle = '#0369a1';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-8.5, -2); ctx.lineTo(8.5, -2);
      ctx.moveTo(-8.5, 2); ctx.lineTo(8.5, 2);
      ctx.stroke();

      // Fluffy faux-fur trimmed hood
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.ellipse(0, -6, 7.5, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.ellipse(0, -6.3, 6.5, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Front storm flap zipper
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(0, -4); ctx.lineTo(0, 7.5);
      ctx.stroke();

      // Snap buttons
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.arc(0, -0.5, 0.8, 0, Math.PI * 2);
      ctx.arc(0, 4.5, 0.8, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    case 'duct_tape': {
      drawShadow(ctx, 7.5, 3, 7.5, 0.22);

      // Silver cloth duct tape roll
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.ellipse(0, 0, 7.8, 7.8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Outer silver roll rim
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.ellipse(0, -1, 7.5, 6.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Cardboard inner core
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.ellipse(0, -1, 3.8, 3.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(0, -1, 3.2, 2.6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Peeled tape tab
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(6.5, 0); ctx.lineTo(9.5, 2); ctx.lineTo(8.5, 4.5); ctx.lineTo(5.5, 2.5);
      ctx.closePath(); ctx.fill();
      return true;
    }

    case 'powerbank': {
      drawShadow(ctx, 7.5, 2.8, 7.5, 0.22);

      // Dark brushed aluminum casing
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(-6.5, -7.5, 13, 15, 2);
      ctx.fill();

      // Polished chamfered bevel edge
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(-6.5, -7.5, 13, 15);

      // 4 green LED charge indicators
      const leds = [-3, -1, 1, 3];
      leds.forEach(lx => {
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(lx, -4.5, 0.8, 0, Math.PI * 2);
        ctx.fill();
      });

      // Top USB port cutouts
      ctx.fillStyle = '#020617';
      ctx.fillRect(-3.5, -7.5, 3.2, 1);
      ctx.fillRect(1, -7.5, 2.5, 1);
      return true;
    }

    case 'smart_watch': {
      drawShadow(ctx, 6.5, 2.6, 7.5, 0.2);

      // Flexible black silicone strap
      ctx.fillStyle = '#27272a';
      ctx.fillRect(-3.5, -9, 7, 18);

      // Smartwatch dark metal chassis
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.roundRect(-5.5, -5.5, 11, 11, 2.5);
      ctx.fill();
      ctx.strokeStyle = '#3f3f46';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // AMOLED glowing display
      ctx.fillStyle = '#0369a1';
      ctx.beginPath();
      ctx.roundRect(-4.2, -4.2, 8.4, 8.4, 1.5);
      ctx.fill();

      // Digital time "12:00"
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(-2.8, -2, 1, 2.5);
      ctx.fillRect(-1.2, -2, 1, 2.5);
      ctx.fillRect(0.8, -2, 1, 2.5);
      ctx.fillRect(2.2, -2, 1, 2.5);

      // Heart rate pulse line
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-3, 2); ctx.lineTo(-1, 2); ctx.lineTo(-0.5, 0.8); ctx.lineTo(0.5, 3.2); ctx.lineTo(1, 2); ctx.lineTo(3, 2);
      ctx.stroke();

      // Digital crown dial
      ctx.fillStyle = '#71717a';
      ctx.fillRect(5.5, -2, 1.2, 3);
      return true;
    }

    case 'walkie_talkie': {
      drawShadow(ctx, 6.5, 2.6, 7.8, 0.25);

      // Rugged black transceiver body
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.roundRect(-4.8, -4.5, 9.6, 12, 1.5);
      ctx.fill();

      // Long flexible rubber duck antenna
      ctx.fillStyle = '#27272a';
      ctx.fillRect(-3.8, -12, 1.8, 7.5);

      // Top rotary knob
      ctx.fillStyle = '#3f3f46';
      ctx.fillRect(1.5, -6.5, 2.2, 2.2);

      // Orange backlit LCD channel display
      ctx.fillStyle = '#f97316';
      ctx.fillRect(-3.5, -3, 7, 3);
      ctx.fillStyle = '#09090b';
      ctx.fillRect(-2, -2.2, 4, 1.4);

      // Front speaker grille slats
      ctx.fillStyle = '#27272a';
      for (let y = 1.5; y <= 5.5; y += 1.4) {
        ctx.fillRect(-3.5, y, 7, 0.8);
      }

      // Side PTT button
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(-5.8, -2, 1, 4);
      return true;
    }

    case 'headphones': {
      drawShadow(ctx, 8.5, 3, 7.5, 0.22);

      // Padded metal headband arch
      ctx.strokeStyle = '#27272a';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(0, -1, 7.2, Math.PI * 0.85, Math.PI * 2.15);
      ctx.stroke();

      // Top leather headband cushion
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 3.6;
      ctx.beginPath();
      ctx.arc(0, -1, 7.2, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();

      // Left & Right earcups with plush cushions
      const cups = [-6.8, 6.8];
      cups.forEach(cx => {
        // Earcup casing
        ctx.fillStyle = '#18181b';
        ctx.beginPath();
        ctx.ellipse(cx, 2, 2.8, 4.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Silver ring accent
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.ellipse(cx, 2, 2.2, 3.8, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Soft plush memory foam cushion
        ctx.fillStyle = '#3f3f46';
        ctx.beginPath();
        ctx.ellipse(cx > 0 ? cx - 0.8 : cx + 0.8, 2, 1.6, 3.8, 0, 0, Math.PI * 2);
        ctx.fill();
      });
      return true;
    }

    case 'sneakers': {
      drawShadow(ctx, 9, 3.2, 7.8, 0.22);

      // Sculpted aerodynamic white foam midsole
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(-8.5, 4);
      ctx.lineTo(8.5, 4);
      ctx.quadraticCurveTo(8.5, 7, 5, 7.2);
      ctx.lineTo(-7.5, 7.2);
      ctx.quadraticCurveTo(-9, 7, -8.5, 4);
      ctx.closePath();
      ctx.fill();

      // Dark rubber outsole tread
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-7.5, 6.5, 15, 1);

      // Cyan breathable athletic mesh upper
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.moveTo(-8, 4);
      ctx.lineTo(-7.5, 0);
      ctx.quadraticCurveTo(-6, -3.5, -2, -3.5);
      ctx.lineTo(2, 0);
      ctx.lineTo(8, 3.5);
      ctx.lineTo(7.5, 4.5);
      ctx.closePath();
      ctx.fill();

      // Dynamic white swooping accent stripe
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-5, 2);
      ctx.quadraticCurveTo(0, 0, 5, 3.5);
      ctx.stroke();

      // White laces
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      for (let lx = -2; lx <= 1; lx += 1.2) {
        ctx.beginPath();
        ctx.moveTo(lx, -1); ctx.lineTo(lx + 1, 1);
        ctx.stroke();
      }
      return true;
    }

    case 'sunglasses': {
      drawShadow(ctx, 8.5, 2.5, 7.5, 0.18);

      // Dark graphite wire frames
      ctx.strokeStyle = '#3f3f46';
      ctx.lineWidth = 1.2;

      // Bridge
      ctx.beginPath();
      ctx.moveTo(-2, -1.5); ctx.lineTo(2, -1.5);
      ctx.stroke();

      // Left & Right teardrop lenses
      const lenses = [-4.5, 4.5];
      lenses.forEach(lx => {
        // Polarized UV tinted lens
        ctx.fillStyle = '#09090b';
        ctx.beginPath();
        ctx.roundRect(lx - 3.5, -3.5, 7, 7, [2, 2, 4.5, 4.5]);
        ctx.fill();
        ctx.stroke();

        // Cyan specular glare reflection
        ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.beginPath();
        ctx.moveTo(lx - 2.5, -2.5);
        ctx.lineTo(lx + 1, -2.5);
        ctx.lineTo(lx - 1.5, 2.5);
        ctx.lineTo(lx - 2.5, 2.5);
        ctx.closePath();
        ctx.fill();
      });
      return true;
    }

    case 'backpack_travel': {
      drawShadow(ctx, 8.5, 3.2, 7.8, 0.25);

      // Tactical military canvas backpack body
      ctx.fillStyle = '#3f3f46';
      ctx.beginPath();
      ctx.roundRect(-7.5, -6.5, 15, 13.5, 3);
      ctx.fill();

      // Front zippered utility compartment
      ctx.fillStyle = '#27272a';
      ctx.beginPath();
      ctx.roundRect(-5.5, -0.5, 11, 7, 1.8);
      ctx.fill();

      // MOLLE webbing loops
      ctx.strokeStyle = '#52525b';
      ctx.lineWidth = 1;
      for (let y = 1.2; y <= 4.8; y += 1.6) {
        ctx.beginPath();
        ctx.moveTo(-4.5, y); ctx.lineTo(4.5, y);
        ctx.stroke();
      }

      // Top carry grab handle
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(0, -6.5, 3, Math.PI, 0);
      ctx.stroke();

      // Side compression straps with buckles
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(-7.8, 1, 1, 2);
      ctx.fillRect(6.8, 1, 1, 2);
      return true;
    }

    case 'zippo_lighter': {
      drawShadow(ctx, 6.8, 2.6, 7.5, 0.22);

      // Brushed brass casing body
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.roundRect(-4.5, -1, 9, 8.5, 1);
      ctx.fill();
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.roundRect(-4, -0.5, 8, 7.5, 0.8);
      ctx.fill();

      // Open hinged lid tilted left
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.moveTo(-4.5, -1);
      ctx.lineTo(-8.5, -6.5);
      ctx.lineTo(-4.5, -8.5);
      ctx.lineTo(-1, -3);
      ctx.closePath();
      ctx.fill();

      // Perforated steel chimney
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(-2, -5, 4.5, 4);
      // Holes
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.arc(0, -3, 0.6, 0, Math.PI * 2);
      ctx.arc(1.5, -3, 0.6, 0, Math.PI * 2);
      ctx.arc(0, -4.2, 0.6, 0, Math.PI * 2);
      ctx.fill();

      // Flickering lighter flame (Golden with blue base)
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(0.5, -5.2, 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(-1, -5.2);
      ctx.quadraticCurveTo(-1.5, -8.5, 0.5, -11);
      ctx.quadraticCurveTo(2.5, -8.5, 2, -5.2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.ellipse(0.5, -7.5, 0.8, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    case 'zippo_empty': {
      drawShadow(ctx, 6.8, 2.6, 7.5, 0.22);

      // Brushed brass casing body
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.roundRect(-4.5, -1, 9, 8.5, 1);
      ctx.fill();
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.roundRect(-4, -0.5, 8, 7.5, 0.8);
      ctx.fill();

      // Open hinged lid tilted left
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.moveTo(-4.5, -1);
      ctx.lineTo(-8.5, -6.5);
      ctx.lineTo(-4.5, -8.5);
      ctx.lineTo(-1, -3);
      ctx.closePath();
      ctx.fill();

      // Perforated steel chimney
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(-2, -5, 4.5, 4);
      // Holes
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.arc(0, -3, 0.6, 0, Math.PI * 2);
      ctx.arc(1.5, -3, 0.6, 0, Math.PI * 2);
      ctx.arc(0, -4.2, 0.6, 0, Math.PI * 2);
      ctx.fill();

      // Serrated spark flint wheel
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.arc(2.8, -3.8, 1.2, 0, Math.PI * 2);
      ctx.fill();

      // Dry, charred black wick with frayed tip (NO FLAME - fluid exhausted)
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0.5, -4.5);
      ctx.lineTo(0.5, -6.5);
      ctx.stroke();

      // Charred frayed cotton fibers
      ctx.fillStyle = '#52525b';
      ctx.fillRect(0, -7, 1.2, 0.8);
      return true;
    }

    case 'compass': {
      drawShadow(ctx, 7.5, 2.8, 7.5, 0.22);

      // Brass casing with milled rim
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.arc(0, 0, 7.8, 0, Math.PI * 2);
      ctx.fill();

      // Compass white dial face
      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.arc(0, 0, 6.4, 0, Math.PI * 2);
      ctx.fill();

      // Rose markings (N, S, E, W)
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(0, -5.5); ctx.lineTo(0, 5.5);
      ctx.moveTo(-5.5, 0); ctx.lineTo(5.5, 0);
      ctx.stroke();

      // Balanced magnetic needle (Red North, Blue South)
      // North needle
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(-1.4, 0); ctx.lineTo(0, -5.5);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#b91c1c';
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(1.4, 0); ctx.lineTo(0, -5.5);
      ctx.closePath(); ctx.fill();

      // South needle
      ctx.fillStyle = '#2563eb';
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(-1.4, 0); ctx.lineTo(0, 5.5);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#1d4ed8';
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(1.4, 0); ctx.lineTo(0, 5.5);
      ctx.closePath(); ctx.fill();

      // Center pivot pin
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(0, 0, 1.2, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    case 'sleeping_bag': {
      drawShadow(ctx, 9, 3.2, 7.5, 0.22);

      // Rolled olive drab sleeping bag cylinder
      ctx.fillStyle = '#3f6212';
      ctx.beginPath();
      ctx.roundRect(-8.5, -4.5, 17, 9.5, 3.5);
      ctx.fill();

      // Circular end cap
      ctx.fillStyle = '#4d7c0f';
      ctx.beginPath();
      ctx.ellipse(-7, 0, 2.5, 4.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Dual black nylon compression straps
      ctx.fillStyle = '#18181b';
      ctx.fillRect(-3, -4.8, 1.6, 10.2);
      ctx.fillRect(3, -4.8, 1.6, 10.2);

      // Quick-release buckles
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(-3.2, -1, 2, 2);
      ctx.fillRect(2.8, -1, 2, 2);
      return true;
    }

    case 'city_guide': {
      drawShadow(ctx, 7.5, 2.8, 7.5, 0.22);

      // Book cover (illustrated travel guide)
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.roundRect(-6.5, -7.5, 13, 15, 1.5);
      ctx.fill();

      // Red header banner
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-6.5, -7.5, 13, 3.5);

      // Illustrated city skyline on cover
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-4.5, -1, 2, 5);
      ctx.fillRect(-2, -3, 2.5, 7);
      ctx.fillRect(1, -2, 2.2, 6);
      ctx.fillRect(3.5, 0, 1.8, 4);

      // Bookmark ribbon tail
      ctx.fillStyle = '#eab308';
      ctx.fillRect(2, 7, 1.5, 3);
      return true;
    }

    case 'notebook': {
      drawShadow(ctx, 7.5, 2.8, 7.5, 0.22);

      // Hardcover black moleskine journal
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.roundRect(-6.5, -7.5, 13, 15, 1.5);
      ctx.fill();

      // Ivory paper edge peeking on right
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(5.5, -7, 1, 14);

      // Vertical black elastic closure strap
      ctx.fillStyle = '#3f3f46';
      ctx.fillRect(3.5, -7.5, 1.4, 15);

      // Red satin ribbon bookmark
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-1, 7, 1.5, 3.5);
      return true;
    }

    case 'pen_stationery': {
      drawShadow(ctx, 8.5, 2, 7.5, 0.18);

      // Executive blue lacquered pen barrel (angled)
      ctx.fillStyle = '#1d4ed8';
      ctx.beginPath();
      ctx.roundRect(-8, -1.4, 13, 2.8, 1);
      ctx.fill();

      // Chrome pocket clip
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-7.5, -2.4, 5.5, 1);
      ctx.fillRect(-7.5, -1.5, 1.2, 1);

      // Chrome center ring
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-1.5, -1.5, 1.2, 3);

      // Writing cone & tip
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.moveTo(5, -1.4);
      ctx.lineTo(8.5, 0);
      ctx.lineTo(5, 1.4);
      ctx.closePath();
      ctx.fill();

      // Tungsten carbide ball
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.arc(8.5, 0, 0.4, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    case 'antifreeze':
    case 'antifreeze_canister':
    case 'canister_coolant': {
      drawShadow(ctx, 8.5, 3.2, 8, 0.28);

      // Semi-translucent milky HDPE 5L coolant tank
      const canGrad = ctx.createLinearGradient(-7, -4.5, 7, 7.5);
      canGrad.addColorStop(0.0, '#f8fafc');
      canGrad.addColorStop(0.5, '#e2e8f0');
      canGrad.addColorStop(1.0, '#94a3b8');
      ctx.fillStyle = canGrad;
      ctx.beginPath();
      ctx.roundRect(-7, -4.5, 14, 12, 2.2);
      ctx.fill();

      // Vibrant ruby-crimson G12+ coolant refraction visible through HDPE wall
      const coolantGrad = ctx.createLinearGradient(-6.2, -3.5, 6.2, 7);
      coolantGrad.addColorStop(0.0, 'rgba(244, 63, 94, 0.72)');
      coolantGrad.addColorStop(0.6, 'rgba(225, 29, 72, 0.84)');
      coolantGrad.addColorStop(1.0, 'rgba(136, 19, 55, 0.92)');
      ctx.fillStyle = coolantGrad;
      ctx.beginPath();
      ctx.roundRect(-6.2, -3.5, 12.4, 10.5, 1.5);
      ctx.fill();

      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 0.55;
      ctx.beginPath();
      ctx.roundRect(-7, -4.5, 14, 12, 2.2);
      ctx.stroke();

      // Molded carry handle + safety screw cap
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.roundRect(-4.2, -8, 10.6, 3.8, 1.5);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(-2.8, -6.5, 7.6, 2.1, 0.9);
      ctx.fill();

      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-6.4, -7.2, 2.6, 3.2);
      drawScrewCap(ctx, -5.1, -8.7, 3.6, 2.3, '#be123c', true);

      // Clear volume sight gauge
      ctx.fillStyle = '#475569';
      ctx.fillRect(4.8, -3.5, 1.4, 10);
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(5.0, -3.2, 1.0, 9.4);
      ctx.fillStyle = '#ffffff';
      for (let ty = -2; ty <= 4; ty += 2.2) {
        ctx.fillRect(4.6, ty, 0.7, 0.32);
      }

      // Clinical coolant spec placard with frost crystal & radiator fin vector
      drawStudioLabelPanel(ctx, -5.6, -2.5, 9.2, 8.6, {
        paperColor: '#f8fafc',
        bandColor: '#be123c',
        accentColor: '#0284c7',
        inkColor: '#0f172a',
        goldFoil: false,
        hasBarcode: true,
        emblem: 'none',
        cylindrical: false
      });

      // Radiator grille + snowflake micro-emblem
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 0.45;
      ctx.strokeRect(-4.4, 1.1, 3.2, 1.8);
      ctx.beginPath();
      ctx.moveTo(-3.4, 1.1); ctx.lineTo(-3.4, 2.9);
      ctx.moveTo(-2.2, 1.1); ctx.lineTo(-2.2, 2.9);
      ctx.moveTo(1.2, 1.0); ctx.lineTo(1.2, 3.0);
      ctx.moveTo(0.2, 2.0); ctx.lineTo(2.2, 2.0);
      ctx.stroke();

      drawGlossBand(ctx, -6, -4, 1.8, 11, 0.35);
      return true;
    }

    case 'washer_fluid':
    case 'washer_fluid_can':
    case 'canister_washer_fluid': {
      drawShadow(ctx, 8.5, 3.2, 8, 0.28);

      // Frosted translucent HDPE 5L winter washer canister
      const canGrad = ctx.createLinearGradient(-7, -4.5, 7, 7.5);
      canGrad.addColorStop(0.0, 'rgba(240, 249, 255, 0.92)');
      canGrad.addColorStop(0.5, 'rgba(224, 242, 254, 0.84)');
      canGrad.addColorStop(1.0, 'rgba(148, 163, 184, 0.88)');
      ctx.fillStyle = canGrad;
      ctx.beginPath();
      ctx.roundRect(-7, -4.5, 14, 12, 2.2);
      ctx.fill();

      // Vibrant arctic-cyan washer fluid refraction
      const fluidGrad = ctx.createLinearGradient(-6.2, -3.5, 6.2, 7);
      fluidGrad.addColorStop(0.0, 'rgba(56, 189, 248, 0.78)');
      fluidGrad.addColorStop(0.6, 'rgba(14, 165, 233, 0.88)');
      fluidGrad.addColorStop(1.0, 'rgba(3, 105, 161, 0.94)');
      ctx.fillStyle = fluidGrad;
      ctx.beginPath();
      ctx.roundRect(-6.2, -3.5, 12.4, 10.5, 1.5);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.roundRect(-7, -4.5, 14, 12, 2.2);
      ctx.stroke();

      // Handle & arctic screw cap
      ctx.fillStyle = '#e0f2fe';
      ctx.beginPath();
      ctx.roundRect(-4.2, -8, 10.6, 3.8, 1.5);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(-2.8, -6.5, 7.6, 2.1, 0.9);
      ctx.fill();

      ctx.fillStyle = '#bae6fd';
      ctx.fillRect(-6.4, -7.2, 2.6, 3.2);
      drawScrewCap(ctx, -5.1, -8.7, 3.6, 2.3, '#0284c7', true);

      // Volume gauge
      ctx.fillStyle = '#7dd3fc';
      ctx.fillRect(4.8, -3.5, 1.4, 10);
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(5.0, -3.2, 1.0, 9.4);
      ctx.fillStyle = '#ffffff';
      for (let ty = -2; ty <= 4; ty += 2.2) {
        ctx.fillRect(4.6, ty, 0.7, 0.32);
      }

      // Arctic deep-navy & cyan label with snowflake & windshield sweep arc
      drawStudioLabelPanel(ctx, -5.6, -2.5, 9.2, 8.6, {
        paperColor: '#0c4a6e',
        bandColor: '#0284c7',
        accentColor: '#7dd3fc',
        inkColor: '#e0f2fe',
        goldFoil: false,
        hasBarcode: true,
        emblem: 'none',
        cylindrical: false
      });

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.45;
      const sfx = -2.2, sfy = 2.0;
      ctx.beginPath();
      ctx.moveTo(sfx - 1.3, sfy); ctx.lineTo(sfx + 1.3, sfy);
      ctx.moveTo(sfx, sfy - 1.3); ctx.lineTo(sfx, sfy + 1.3);
      ctx.moveTo(sfx - 0.9, sfy - 0.9); ctx.lineTo(sfx + 0.9, sfy + 0.9);
      ctx.moveTo(sfx - 0.9, sfy + 0.9); ctx.lineTo(sfx + 0.9, sfy - 0.9);
      ctx.stroke();
      ctx.strokeStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(1.2, 3.3, 1.9, -Math.PI * 0.8, -Math.PI * 0.2);
      ctx.stroke();

      drawGlossBand(ctx, -6, -4, 1.8, 11, 0.38);
      return true;
    }

    case 'brake_fluid':
    case 'brake_fluid_can':
    case 'canister_brake_fluid': {
      drawShadow(ctx, 6.5, 2.5, 7.8, 0.22);

      // Cylindrical charcoal HDPE 500ml synthetic brake fluid bottle
      const cylGrad = ctx.createLinearGradient(-4.8, 0, 4.8, 0);
      cylGrad.addColorStop(0.0, '#0f172a');
      cylGrad.addColorStop(0.3, '#475569');
      cylGrad.addColorStop(0.65, '#1e293b');
      cylGrad.addColorStop(1.0, '#020617');
      ctx.fillStyle = cylGrad;
      ctx.beginPath();
      ctx.roundRect(-4.8, -4.5, 9.6, 12, 1.7);
      ctx.fill();

      // Bottle neck & childproof amber-yellow cap
      ctx.fillStyle = '#334155';
      ctx.fillRect(-1.6, -7.0, 3.2, 2.8);
      drawScrewCap(ctx, 0, -8.8, 4.2, 2.3, '#eab308', true);

      // Sleek matte obsidian & gold racing spec label
      drawStudioLabelPanel(ctx, -4.4, -2.5, 8.8, 8.2, {
        paperColor: '#09090b',
        bandColor: '#eab308',
        accentColor: '#dc2626',
        inkColor: '#e2e8f0',
        goldFoil: true,
        hasBarcode: true,
        emblem: 'none',
        cylindrical: true
      });

      // Perforated brake disc rotor vector emblem
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 0.52;
      ctx.beginPath();
      ctx.arc(-1.0, 2.2, 1.3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(0.2, 1.3, 0.7, 1.8);

      drawGlossBand(ctx, -3.8, -4.0, 1.1, 10.8, 0.3);
      return true;
    }

    case 'tow_rope': {
      drawShadow(ctx, 8, 3, 7.5, 0.22);

      // High-visibility neon orange coiled tow strap
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.ellipse(0, 0, 7.5, 7.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Coiled strap wraps
      ctx.strokeStyle = '#c2410c';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
      ctx.stroke();

      // Forged steel clevis hook
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.moveTo(3, -2);
      ctx.lineTo(8.5, -6);
      ctx.quadraticCurveTo(10, -3, 8.5, 0);
      ctx.lineTo(6, 1);
      ctx.closePath();
      ctx.fill();

      // Hook eye & spring latch
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(7.2, -4, 1.2, 3);
      return true;
    }

    // Fuel Dispenser Order / Gas Pump Nozzle (Топливный талон / Заказ ТРК)
    case 'fuel_order': {
      drawShadow(ctx, 8.5, 3.2, 7.8, 0.28);

      // Coiled high-pressure black fuel hose loop at bottom
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(-2, 7, 3.8, Math.PI * 0.2, Math.PI * 1.8);
      ctx.stroke();

      // Brass threaded hose swivel coupling
      ctx.fillStyle = '#ca8a04';
      ctx.beginPath();
      ctx.roundRect(-4.5, 4.5, 4, 3, 0.8);
      ctx.fill();

      // Ergonomic composite nozzle body (heavy-duty industrial fuel gun)
      const gunGrad = ctx.createLinearGradient(-6, -4, 6, 6);
      gunGrad.addColorStop(0, '#1e293b');
      gunGrad.addColorStop(0.5, '#0f172a');
      gunGrad.addColorStop(1, '#020617');
      ctx.fillStyle = gunGrad;
      ctx.beginPath();
      ctx.roundRect(-6, -3, 11, 8, 2.5);
      ctx.fill();

      // Colored protective rubber scuff guard boot (Vivid Emerald Green for Premium 95)
      ctx.fillStyle = '#059669';
      ctx.beginPath();
      ctx.roundRect(-6.5, -4, 5, 10, 2);
      ctx.fill();
      ctx.fillStyle = '#10b981';
      ctx.fillRect(-6, -3.5, 4, 1.2);

      // Trigger guard loop
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-1, 5);
      ctx.lineTo(3.5, 5);
      ctx.lineTo(4, 0);
      ctx.stroke();

      // Aluminum finger trigger with multi-notch latch
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.roundRect(0.5, 1.5, 2.8, 1.4, 0.4);
      ctx.fill();

      // Curved stainless steel dispensing spout tube
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(3, -2);
      ctx.lineTo(6.5, -6);
      ctx.quadraticCurveTo(8.5, -8.5, 9, -10.5);
      ctx.stroke();

      // Spout tip vapor recovery collar
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.arc(9, -10.5, 1.4, 0, Math.PI * 2);
      ctx.fill();

      // Digital LCD display on top of nozzle housing (Lit Cyan screen)
      ctx.fillStyle = '#0369a1';
      ctx.beginPath();
      ctx.roundRect(-3, -2.5, 5.5, 3.2, 0.6);
      ctx.fill();
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(-2.5, -2, 4.5, 2.2);

      // Digital fuel text lines on LCD
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 1.8px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('95', -0.2, -0.9);

      // Fuel droplet icon decal
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(-4, 0, 1, 0, Math.PI * 2);
      ctx.fill();

      return true;
    }

    // 10L Blue HDPE Plastic Utility Canister (Пластиковая канистра 10л)
    case 'canister_plastic_10l': {
      drawShadow(ctx, 8.5, 3.2, 7.8, 0.25);

      // Blue HDPE ribbed utility tank
      const bodyGrad = ctx.createLinearGradient(-6.5, -5, 6.5, 7);
      bodyGrad.addColorStop(0.0, '#0ea5e9');
      bodyGrad.addColorStop(0.35, '#0284c7');
      bodyGrad.addColorStop(0.8, '#0369a1');
      bodyGrad.addColorStop(1.0, '#0c4a6e');
      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.roundRect(-6.5, -4, 13, 11, 2.2);
      ctx.fill();

      // Molded top carry handle & cap
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.roundRect(-4.5, -7.5, 9, 3.5, 1.2);
      ctx.fill();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.fillRect(-3.2, -6.5, 6.4, 2);

      // Translucent level view strip with dynamic fluid level & ticks
      ctx.fillStyle = 'rgba(241, 245, 249, 0.72)';
      ctx.fillRect(4.3, -3.2, 1.3, 9.2);
      if (item?.fluidStorage && item.fluidStorage.currentMl > 0) {
        const maxCap = item.fluidStorage.maxMl || item.fluidStorage.capacityMl || 10000;
        const fillFrac = Math.min(1, Math.max(0.05, item.fluidStorage.currentMl / maxCap));
        const liqDef = item.fluidStorage.liquidId
          ? LIQUID_REGISTRY[item.fluidStorage.liquidId as LiquidId]
          : undefined;
        const fluidCol = item.fluidStorage.attributes?.customColor || liqDef?.color || '#38bdf8';
        const fluidH = 9.2 * fillFrac;
        ctx.fillStyle = fluidCol;
        ctx.fillRect(4.3, 6.0 - fluidH, 1.3, fluidH);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.fillRect(4.3, 6.0 - fluidH, 1.3, 0.35);
      }
      ctx.fillStyle = '#0369a1';
      for (let y = -2.2; y <= 5.2; y += 1.9) {
        ctx.fillRect(3.9, y, 0.75, 0.35);
      }

      drawScrewCap(ctx, -3.9, -8.8, 3.2, 2.2, '#dc2626', true);

      // Rear vent plug
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(3.5, -7.2, 1.0, 0, Math.PI * 2);
      ctx.fill();

      // Industrial HDPE spec sticker
      drawStudioLabelPanel(ctx, -5.2, -2.0, 8.4, 7.2, {
        paperColor: '#f8fafc',
        bandColor: '#0369a1',
        accentColor: '#0284c7',
        inkColor: '#0f172a',
        goldFoil: false,
        hasBarcode: true,
        emblem: 'diamond',
        cylindrical: false
      });

      drawGlossBand(ctx, -5.5, -4, 1.3, 10.5, 0.35);
      return true;
    }

    // 5L Red Compact Fuel Canister with Pour Spout (Канистра 5л)
    case 'canister_plastic_5l': {
      drawShadow(ctx, 7.8, 2.8, 7.5, 0.25);

      const redGrad = ctx.createLinearGradient(-6, -4, 6, 6);
      redGrad.addColorStop(0.0, '#f87171');
      redGrad.addColorStop(0.35, '#dc2626');
      redGrad.addColorStop(1.0, '#7f1d1d');
      ctx.fillStyle = redGrad;
      ctx.beginPath();
      ctx.roundRect(-6, -3, 12, 9.5, 2.0);
      ctx.fill();

      // Molded top handle
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.roundRect(-4.5, -6.5, 9, 3.2, 1.2);
      ctx.fill();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.fillRect(-3.2, -5.5, 6.4, 1.8);

      drawScrewCap(ctx, 4.1, -7.7, 3.2, 2.1, '#facc15', true);

      // Accordion flexible black pour nozzle clipped to side
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-4.5, -2);
      ctx.lineTo(-5.2, 4);
      ctx.lineTo(-4.2, 5.5);
      ctx.stroke();

      // Hazard spec placard with flame badge & micro-barcode
      drawStudioLabelPanel(ctx, -3.6, -1.6, 7.8, 6.6, {
        paperColor: '#fef2f2',
        bandColor: '#991b1b',
        accentColor: '#eab308',
        inkColor: '#450a0a',
        goldFoil: false,
        hasBarcode: true,
        emblem: 'diamond',
        cylindrical: false
      });

      drawGlossBand(ctx, -4.5, -3, 1.2, 9.2, 0.35);
      return true;
    }

    // Heavy Steel Diesel Jerrycan (Канистра Дизель)
    case 'diesel':
    case 'canister_diesel': {
      drawShadow(ctx, 8.5, 3.2, 7.8, 0.26);

      const dGrad = ctx.createLinearGradient(-7, -5, 7, 7);
      dGrad.addColorStop(0.0, '#a16207');
      dGrad.addColorStop(0.45, '#854d0e');
      dGrad.addColorStop(1.0, '#422006');
      ctx.fillStyle = dGrad;
      ctx.beginPath();
      ctx.roundRect(-7, -5, 14, 12, 2.5);
      ctx.fill();

      // Wide amber-gold diesel band
      ctx.fillStyle = '#eab308';
      ctx.fillRect(-7, -0.8, 14, 3.8);

      // Beveled stamped X-rib
      ctx.strokeStyle = '#422006';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(-5, -3); ctx.lineTo(5, 5);
      ctx.moveTo(5, -3); ctx.lineTo(-5, 5);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(254, 240, 138, 0.28)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(-4.6, -3); ctx.lineTo(4.6, 5);
      ctx.moveTo(4.6, -3); ctx.lineTo(-4.6, 5);
      ctx.stroke();

      // Triple steel handle
      ctx.fillStyle = '#713f12';
      ctx.beginPath();
      ctx.roundRect(-5.5, -8, 11, 3.5, 1.2);
      ctx.fill();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.fillRect(-4.5, -7, 3.2, 1.8);
      ctx.fillRect(1.3, -7, 3.2, 1.8);

      // Stencil fuel diamond & bar code stencil (no big cartoon text)
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(0, -0.2);
      ctx.lineTo(1.4, 1.1);
      ctx.lineTo(0, 2.4);
      ctx.lineTo(-1.4, 1.1);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(-4.8, 0.7, 2.6, 0.8);
      ctx.fillRect(2.2, 0.7, 2.6, 0.8);

      ctx.fillStyle = '#ca8a04';
      ctx.fillRect(3.6, -9.2, 3.6, 1.4);

      drawGlossBand(ctx, -6, -5, 1.3, 12, 0.28);
      return true;
    }

    // Food-grade White Potable Water Canister with Dispenser Tap (Канистра питьевой воды)
    case 'drinking_water_20l':
    case 'canister_water': {
      drawShadow(ctx, 8.5, 3.2, 7.8, 0.22);

      const waterCanGrad = ctx.createLinearGradient(-6.5, -5, 6.5, 7);
      waterCanGrad.addColorStop(0.0, '#ffffff');
      waterCanGrad.addColorStop(0.45, '#e2e8f0');
      waterCanGrad.addColorStop(1.0, '#94a3b8');
      ctx.fillStyle = waterCanGrad;
      ctx.beginPath();
      ctx.roundRect(-6.5, -4, 13, 11, 2.2);
      ctx.fill();

      // Dynamic liquid level inside translucent HDPE wall
      if (item?.fluidStorage && item.fluidStorage.currentMl > 0) {
        const maxCap = item.fluidStorage.maxMl || item.fluidStorage.capacityMl || 20000;
        const fillFrac = Math.min(1, Math.max(0.05, item.fluidStorage.currentMl / maxCap));
        const liqDef = item.fluidStorage.liquidId
          ? LIQUID_REGISTRY[item.fluidStorage.liquidId as LiquidId]
          : undefined;
        const fluidCol = item.fluidStorage.attributes?.customColor || liqDef?.color || '#38bdf8';
        const maxFluidH = 9.8;
        const fluidH = maxFluidH * fillFrac;
        const fluidTop = 6.4 - fluidH;
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(-5.8, -3.4, 11.6, maxFluidH, 1.6);
        ctx.clip();
        ctx.globalAlpha = 0.45;
        ctx.fillStyle = fluidCol;
        ctx.fillRect(-5.8, fluidTop, 11.6, fluidH);
        ctx.globalAlpha = 0.65;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-5.8, fluidTop, 11.6, 0.45);
        ctx.restore();
      }

      // Blue carry handle & screw cap
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.roundRect(-4.5, -7.5, 9, 3.5, 1.2);
      ctx.fill();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.fillRect(-3.2, -6.5, 6.4, 2);

      drawScrewCap(ctx, -3.8, -8.8, 3.4, 2.2, '#0284c7', true);

      // Rotary spigot tap
      ctx.fillStyle = '#0369a1';
      ctx.beginPath();
      ctx.roundRect(5.5, 3, 2.6, 2.6, 0.6);
      ctx.fill();
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(6.5, 4.5, 1.5, 1);

      // Studio potable water spec badge with droplet icon & barcode
      drawStudioLabelPanel(ctx, -5.0, -1.6, 8.8, 6.8, {
        paperColor: '#f0f9ff',
        bandColor: '#0284c7',
        accentColor: '#38bdf8',
        inkColor: '#0c4a6e',
        goldFoil: false,
        hasBarcode: true,
        emblem: 'circle',
        cylindrical: false
      });

      drawGlossBand(ctx, -5.5, -4, 1.4, 10.5, 0.38);
      return true;
    }

    case 'canister_metal_20l':
    case 'canister_fuel':
    case 'jerrycan_steel':
    case 'gasoline_95':
    case 'gasoline_92':
    case 'fuel_canister': {
      drawShadow(ctx, 8.5, 3.2, 7.8, 0.25);

      const jGrad = ctx.createLinearGradient(-7, -5, 7, 7);
      jGrad.addColorStop(0.0, '#4d6036');
      jGrad.addColorStop(0.45, '#3f4f2c');
      jGrad.addColorStop(1.0, '#222b18');
      ctx.fillStyle = jGrad;
      ctx.beginPath();
      ctx.roundRect(-7, -5, 14, 12, 2.5);
      ctx.fill();

      // Pressed steel structural X-rib
      ctx.strokeStyle = '#222b18';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-5, -3); ctx.lineTo(5, 5);
      ctx.moveTo(5, -3); ctx.lineTo(-5, 5);
      ctx.stroke();
      ctx.strokeStyle = '#5c7241';
      ctx.lineWidth = 0.65;
      ctx.beginPath();
      ctx.moveTo(-4.5, -3); ctx.lineTo(4.5, 5);
      ctx.moveTo(4.5, -3); ctx.lineTo(-4.5, 5);
      ctx.stroke();

      // Triple steel handle
      ctx.fillStyle = '#2d381f';
      ctx.beginPath();
      ctx.roundRect(-5.5, -8, 11, 3.5, 1.2);
      ctx.fill();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.fillRect(-4.5, -7, 3.2, 1.8);
      ctx.fillRect(1.3, -7, 3.2, 1.8);
      ctx.fillStyle = '#4d6036';
      ctx.fillRect(-5.2, -8, 1.4, 3.2);
      ctx.fillRect(-0.7, -8, 1.4, 3.2);
      ctx.fillRect(3.8, -8, 1.4, 3.2);

      // Brass cam-lock spout & chain
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(4, -8.5, 2.8, 2);
      ctx.fillStyle = '#ca8a04';
      ctx.fillRect(3.6, -9.2, 3.6, 1.2);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 0.65;
      ctx.beginPath();
      ctx.moveTo(3.6, -8.6);
      ctx.quadraticCurveTo(2.5, -7.5, 3.2, -6.5);
      ctx.stroke();

      // Flammable hazard diamond & crisp stencil lines (no cartoonish font)
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(-0.5, -1.8);
      ctx.lineTo(1.2, -0.3);
      ctx.lineTo(-0.5, 1.2);
      ctx.lineTo(-2.2, -0.3);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
      ctx.lineWidth = 0.35;
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.68)';
      ctx.fillRect(-2.4, 2.2, 3.8, 0.55);
      ctx.fillRect(-1.8, 3.2, 2.6, 0.45);

      drawGlossBand(ctx, -6, -5, 1.4, 12, 0.28);
      return true;
    }

    case 'canister_empty': {
      drawShadow(ctx, 8.5, 3.2, 7.8, 0.22);

      ctx.fillStyle = '#3f4f2c';
      ctx.beginPath();
      ctx.roundRect(-7, -5, 14, 12, 2.5);
      ctx.fill();

      ctx.strokeStyle = '#2d381f';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-5, -3); ctx.lineTo(5, 5);
      ctx.moveTo(5, -3); ctx.lineTo(-5, 5);
      ctx.stroke();

      ctx.fillStyle = '#2d381f';
      ctx.beginPath();
      ctx.roundRect(-5.5, -8, 11, 3.5, 1.2);
      ctx.fill();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.fillRect(-4.5, -7, 3.2, 1.8);
      ctx.fillRect(1.3, -7, 3.2, 1.8);
      ctx.fillStyle = '#4d6036';
      ctx.fillRect(-5.2, -8, 1.4, 3.2);
      ctx.fillRect(-0.7, -8, 1.4, 3.2);
      ctx.fillRect(3.8, -8, 1.4, 3.2);

      // Open spout neck
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(4, -8.5, 2.8, 2.2);
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(5.4, -8.5, 1.2, 0.6, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 0.65;
      ctx.beginPath();
      ctx.moveTo(4, -8);
      ctx.quadraticCurveTo(2.5, -7, 2, -5.5);
      ctx.stroke();
      ctx.fillStyle = '#ca8a04';
      ctx.beginPath();
      ctx.roundRect(1.2, -6, 1.8, 2.5, 0.6);
      ctx.fill();

      // Dried fuel streak & scuffed metal rim
      ctx.fillStyle = 'rgba(28, 25, 23, 0.35)';
      ctx.beginPath();
      ctx.moveTo(4.5, -5); ctx.lineTo(6, -5); ctx.lineTo(5.5, 0); ctx.lineTo(4.8, 2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(-6.5, 6, 2, 0.6);
      ctx.fillRect(2, 6, 3, 0.6);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.32)';
      ctx.fillRect(-2.2, 2.2, 3.4, 0.5);
      return true;
    }

    case 'wallet': {
      drawShadow(ctx, 8.5, 3.5, 7.5, 0.24);

      // Outer rich textured leather (dark chestnut brown)
      ctx.fillStyle = '#3e2723';
      ctx.beginPath();
      ctx.roundRect(-7.5, -5.5, 15, 11, 1.8);
      ctx.fill();

      // Leather edge perimeter stitching
      ctx.strokeStyle = '#8d6e63';
      ctx.lineWidth = 0.6;
      ctx.setLineDash([1.2, 0.8]);
      ctx.strokeRect(-6.8, -4.8, 13.6, 9.6);
      ctx.setLineDash([]);

      // Center bi-fold vertical spine indent
      ctx.strokeStyle = '#1b0000';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(0, -5.5);
      ctx.lineTo(0, 5.5);
      ctx.stroke();

      // Banknote peeking out from the top bill compartment
      ctx.fillStyle = '#166534';
      ctx.beginPath();
      ctx.roundRect(-6, -7, 12, 2.5, 0.6);
      ctx.fill();
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(-4.5, -6.6, 9, 0.8);

      // Gold metal snap button / emblem on right fold
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(3.8, 0, 1.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.arc(3.5, -0.3, 0.5, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    case 'plastic_bag': {
      drawShadow(ctx, 8.5, 3.8, 8, 0.18);

      // Frosted semi-translucent LDPE T-shirt carrier bag with gusset handles
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.65)';
      ctx.lineWidth = 0.45;
      ctx.fillStyle = 'rgba(241, 245, 249, 0.82)';

      ctx.beginPath();
      ctx.moveTo(-6.4, -3.2);
      ctx.lineTo(-5.8, -8.8);
      ctx.lineTo(-3.8, -8.8);
      ctx.lineTo(-3.2, -3.0);
      ctx.lineTo(3.2, -3.0);
      ctx.lineTo(3.8, -8.8);
      ctx.lineTo(5.8, -8.8);
      ctx.lineTo(6.4, -3.2);
      ctx.quadraticCurveTo(7.4, 3.8, 6.6, 7.5);
      ctx.quadraticCurveTo(0, 8.4, -6.6, 7.5);
      ctx.quadraticCurveTo(-7.4, 3.8, -6.4, -3.2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      if (Array.isArray(item?.contents) && item.contents.length > 0) {
        const validContents = item.contents.filter(
          (inner: any) => inner && inner.itemId && inner.itemId !== 'plastic_bag'
        );
        if (validContents.length > 0) {
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(-6.1, -3.0);
          ctx.lineTo(6.1, -3.0);
          ctx.quadraticCurveTo(7.0, 3.6, 6.2, 7.2);
          ctx.quadraticCurveTo(0, 8.1, -6.2, 7.2);
          ctx.quadraticCurveTo(-7.0, 3.6, -6.1, -3.0);
          ctx.closePath();
          ctx.clip();
          const bagSlots: Array<[number, number, number]> =
            validContents.length === 1
              ? [[0, 1.5, 10.2]]
              : [
                  [-2.4, 2.5, 7.4],
                  [2.4, 2.3, 7.4],
                  [0, -0.4, 7.6],
                  [-2.1, -1.8, 6.6],
                  [2.1, -1.6, 6.6],
                ];
          const showCount = Math.min(bagSlots.length, validContents.length);
          ctx.globalAlpha = 0.68;
          for (let i = 0; i < showCount; i++) {
            const inner = validContents[i];
            const [bx, by, bsz] = bagSlots[i];
            drawItemModel2D(ctx, inner.itemId, bx, by, bsz, inner, true);
          }
          ctx.globalAlpha = 1;
          ctx.fillStyle = 'rgba(241, 245, 249, 0.34)';
          ctx.fillRect(-8, -9, 16, 18);
          ctx.restore();
        }
      }

      drawPouchCrinkles(ctx, -5.6, -2.5, 11.2, 9.2, 12, 0.25);

      // Minimalist cobalt market monogram print
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.roundRect(-3.4, 0.5, 6.8, 3.0, 0.6);
      ctx.fill();
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-2.4, 1.3, 4.8, 0.52);
      ctx.fillRect(-1.8, 2.2, 3.6, 0.35);
      return true;
    }

    case 'sandbag': {
      drawShadow(ctx, 8.5, 4.5, 7.5, 0.25);

      // Bulging heavy woven burlap sandbag
      const grad = ctx.createLinearGradient(-8, -7, 8, 8);
      grad.addColorStop(0.0, '#d9a05b');
      grad.addColorStop(0.35, '#b45309');
      grad.addColorStop(0.75, '#92400e');
      grad.addColorStop(1.0, '#5c2808');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(-3, -7.5);
      ctx.quadraticCurveTo(-6.5, -6, -8, -1);
      ctx.quadraticCurveTo(-9, 4, -7, 7.5);
      ctx.quadraticCurveTo(0, 9.5, 7, 7.5);
      ctx.quadraticCurveTo(9, 4, 8, -1);
      ctx.quadraticCurveTo(6.5, -6, 3, -7.5);
      ctx.quadraticCurveTo(0, -8.2, -3, -7.5);
      ctx.closePath();
      ctx.fill();

      // Fine linen cross-weave texture
      ctx.strokeStyle = 'rgba(69, 26, 3, 0.26)';
      ctx.lineWidth = 0.45;
      ctx.beginPath();
      for (let x = -6; x <= 6; x += 2.4) {
        ctx.moveTo(x, -5);
        ctx.quadraticCurveTo(x * 1.15, 1, x * 0.9, 7);
      }
      for (let y = -4; y <= 6; y += 2.0) {
        ctx.moveTo(-7, y);
        ctx.quadraticCurveTo(0, y + 1.1, 7, y);
      }
      ctx.stroke();

      // Ruffled burlap top flare & twisted hemp neck cord
      ctx.fillStyle = '#d9a05b';
      ctx.beginPath();
      ctx.moveTo(-3, -7.5);
      ctx.quadraticCurveTo(-4.5, -10.5, -3.5, -11.5);
      ctx.quadraticCurveTo(0, -9.5, 3.5, -11.5);
      ctx.quadraticCurveTo(4.5, -10.5, 3, -7.5);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#fef08a';
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.roundRect(-3.4, -8, 6.8, 2.0, 0.8);
      ctx.fill();
      ctx.stroke();

      // Clean burlap stencil crest + stitched shipping tag (no big raw text)
      ctx.strokeStyle = 'rgba(69, 26, 3, 0.72)';
      ctx.lineWidth = 0.55;
      ctx.strokeRect(-4.0, -1.6, 8.0, 4.6);
      ctx.fillStyle = 'rgba(69, 26, 3, 0.78)';
      ctx.fillRect(-2.8, -0.4, 5.6, 0.75);
      ctx.fillRect(-2.0, 1.0, 4.0, 0.55);

      // Silica sand specks at lower seam
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(4.5, 6, 0.55, 0, Math.PI * 2);
      ctx.arc(5.8, 7.0, 0.45, 0, Math.PI * 2);
      ctx.arc(-5, 6.8, 0.5, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    case 'sack_empty': {
      drawShadow(ctx, 8, 3.5, 6, 0.18);

      const grad = ctx.createLinearGradient(-7, -5, 7, 6);
      grad.addColorStop(0.0, '#d9a05b');
      grad.addColorStop(0.5, '#b45309');
      grad.addColorStop(1.0, '#78350f');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(-6.5, -5);
      ctx.lineTo(6.5, -5);
      ctx.quadraticCurveTo(7.5, 2, 6.5, 6.5);
      ctx.quadraticCurveTo(0, 7.8, -6.5, 6.5);
      ctx.quadraticCurveTo(-7.5, 2, -6.5, -5);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.ellipse(0, -5, 5.5, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1c0a00';
      ctx.beginPath();
      ctx.ellipse(0, -5, 4.2, 1.2, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 0.55;
      ctx.beginPath();
      ctx.moveTo(-5, -3); ctx.lineTo(-2, 4);
      ctx.moveTo(4, -3); ctx.lineTo(1, 5);
      ctx.stroke();

      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 0.42;
      ctx.setLineDash([1.1, 1.1]);
      ctx.strokeRect(-5.8, -4, 11.6, 10);
      ctx.setLineDash([]);
      return true;
    }

    // Oily Shop Rag (Ветошь для протирки масла и запчастей)
    case 'rag': {
      drawShadow(ctx, 8.5, 3.5, 7.5, 0.25);

      // Folded / crumpled twill shop cloth (Indigo blue denim / mechanic rag)
      ctx.fillStyle = '#1e3a8a';
      ctx.beginPath();
      ctx.moveTo(-7.5, -4.5);
      ctx.quadraticCurveTo(-2, -6.5, 6.5, -5);
      ctx.quadraticCurveTo(8.5, -1, 7.5, 5.5);
      ctx.quadraticCurveTo(2, 7.5, -6.5, 6);
      ctx.quadraticCurveTo(-8.5, 2, -7.5, -4.5);
      ctx.closePath();
      ctx.fill();

      // Folded fabric layer overlap
      ctx.fillStyle = '#1d4ed8';
      ctx.beginPath();
      ctx.moveTo(-5.5, -3.5);
      ctx.quadraticCurveTo(0, -5, 5.5, -3.8);
      ctx.quadraticCurveTo(6.8, 1, 5, 4.2);
      ctx.quadraticCurveTo(0, 5.5, -4.8, 4.5);
      ctx.closePath();
      ctx.fill();

      // Fabric fold crease lines
      ctx.strokeStyle = '#172554';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-6, -2); ctx.quadraticCurveTo(-1, 0, 6, -1);
      ctx.moveTo(-4, 2); ctx.quadraticCurveTo(1, 3, 5, 1.5);
      ctx.stroke();

      // Perimeter stitched edge hem
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 0.5;
      ctx.setLineDash([1, 1]);
      ctx.beginPath();
      ctx.roundRect(-6.5, -4, 13, 9, 1.5);
      ctx.stroke();
      ctx.setLineDash([]);

      // Dark greasy engine motor oil stains & carbon smudge
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.beginPath();
      ctx.ellipse(-2, -0.5, 3.2, 2.2, 0.3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(217, 119, 6, 0.55)'; // Fresh amber oil drop
      ctx.beginPath();
      ctx.ellipse(2.5, 1.2, 1.8, 1.4, -0.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(15, 23, 42, 0.7)'; // Finger grease smudge
      ctx.beginPath();
      ctx.arc(3.8, -2, 1.2, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    // Traditional Golden Brass Ignition Key for Retro & Classic Cars (ВАЗ, ЗАЗ, Волга)
    case 'car_key_gold': {
      drawShadow(ctx, 7, 9, 7.5, 0.3);

      // Key split ring at bottom (Solid Brass)
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(0, 8.5, 3.8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 0.6;
      ctx.stroke();

      // Solid Brass Retro Key Head (Classic Soviet/European Trapezoid)
      const goldHeadGrad = ctx.createLinearGradient(-6, 0, 6, 9);
      goldHeadGrad.addColorStop(0, '#fef08a');
      goldHeadGrad.addColorStop(0.3, '#f59e0b');
      goldHeadGrad.addColorStop(0.8, '#d97706');
      goldHeadGrad.addColorStop(1, '#b45309');
      ctx.fillStyle = goldHeadGrad;
      ctx.beginPath();
      ctx.roundRect(-6, 0, 12, 9, 2.5);
      ctx.fill();

      // Head beveled border
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 0.7;
      ctx.stroke();

      // Key ring hole at bottom of head
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(0, 6.8, 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Vintage stamped car silhouette emblem on head
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-2.5, 2.2, 5, 1.6);
      ctx.fillRect(-1.5, 1.2, 3, 1);

      // Polished Brass Key Blade (Shaft extending upwards)
      const goldBladeGrad = ctx.createLinearGradient(-2, -9, 2, 0);
      goldBladeGrad.addColorStop(0, '#fef08a');
      goldBladeGrad.addColorStop(0.5, '#eab308');
      goldBladeGrad.addColorStop(1, '#ca8a04');
      ctx.fillStyle = goldBladeGrad;
      ctx.beginPath();
      ctx.moveTo(-1.8, 0);
      ctx.lineTo(-1.8, -8.5);
      ctx.lineTo(0, -10.5); // Pointed key tip
      ctx.lineTo(1.8, -8.5);
      ctx.lineTo(1.8, 0);
      ctx.closePath();
      ctx.fill();

      // Milled center warding groove
      ctx.fillStyle = '#92400e';
      ctx.fillRect(-0.4, -8.5, 0.8, 8.5);

      // Classic ignition cuts & teeth notches along right edge
      ctx.fillStyle = '#78350f';
      ctx.fillRect(1.2, -7.5, 0.8, 1.2);
      ctx.fillRect(1.0, -4.8, 1.0, 1.2);
      ctx.fillRect(1.3, -2.5, 0.7, 1.0);

      // Gleaming specular shine highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.fillRect(-1.4, -7, 0.6, 5);
      return true;
    }

    // Heavy Forged Iron Key for Agricultural Tractors & Trucks (МТЗ, УАЗ, ГАЗ)
    case 'car_key_iron': {
      drawShadow(ctx, 7, 9, 7.5, 0.32);

      // Heavy forged steel key ring at bottom
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(0, 8.5, 3.8, 0, Math.PI * 2);
      ctx.stroke();

      // Weathered cast iron flat key head (Octagonal / Industrial)
      const ironHeadGrad = ctx.createLinearGradient(-5.5, 0, 5.5, 9);
      ironHeadGrad.addColorStop(0, '#475569');
      ironHeadGrad.addColorStop(0.5, '#334155');
      ironHeadGrad.addColorStop(1, '#1e293b');
      ctx.fillStyle = ironHeadGrad;
      ctx.beginPath();
      ctx.moveTo(-4, 0);
      ctx.lineTo(4, 0);
      ctx.lineTo(5.5, 3.5);
      ctx.lineTo(5.5, 6.5);
      ctx.lineTo(3.5, 9);
      ctx.lineTo(-3.5, 9);
      ctx.lineTo(-5.5, 6.5);
      ctx.lineTo(-5.5, 3.5);
      ctx.closePath();
      ctx.fill();

      // Cast iron bevel & texture
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Punch hole for key ring
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(0, 6.8, 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Stamped serial / manufacturer notch (e.g. MTZ / Tractor logo)
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-2, 2.5, 4, 1.4);

      // Heavy rugged steel key shaft extending upwards
      const ironBladeGrad = ctx.createLinearGradient(-2, -9, 2, 0);
      ironBladeGrad.addColorStop(0, '#64748b');
      ironBladeGrad.addColorStop(0.5, '#475569');
      ironBladeGrad.addColorStop(1, '#334155');
      ctx.fillStyle = ironBladeGrad;
      ctx.beginPath();
      ctx.moveTo(-2.2, 0);
      ctx.lineTo(-2.2, -8);
      ctx.lineTo(-0.8, -9.5);
      ctx.lineTo(2.2, -8);
      ctx.lineTo(2.2, 0);
      ctx.closePath();
      ctx.fill();

      // Milled deep center security slot
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-0.5, -8, 1, 8);

      // Rugged heavy mechanical bitting notches (Tractor tumbler cuts)
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(1.5, -7.5, 0.9, 1.5);
      ctx.fillRect(1.2, -4.5, 1.2, 1.5);
      ctx.fillRect(1.6, -1.8, 0.8, 1.2);
      return true;
    }

    // Vehicle Purchase and Sale Contract (Договор купли-продажи ТС / ДКП)
    case 'car_contract_dkp': {
      drawShadow(ctx, 9, 11, 9, 0.28);

      // Crisp White Legal Document Sheet with Border
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.roundRect(-9, -11, 18, 22, 1.5);
      ctx.fill();

      // Blue Official Border
      ctx.strokeStyle = '#1e40af';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(-7.5, -9.5, 15, 19);

      // Top Legal Header Banner (Official Russian Blue)
      ctx.fillStyle = '#1e40af';
      ctx.fillRect(-7.5, -8, 15, 2.5);

      // Header Text: "ДОГОВОР"
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 1.4px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ДОГОВОР ТС', 0, -6.3);

      // Subtle Passenger Car Watermark in Background
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.roundRect(-4.5, -3, 9, 4, 1);
      ctx.fill();

      // Contract formatted data rows (Seller, Buyer, VIN, Price)
      ctx.fillStyle = '#475569';
      ctx.fillRect(-6, -3.5, 12, 0.6); // Header text
      ctx.fillRect(-6, -1.8, 12, 0.6); // VIN line
      ctx.fillRect(-6, -0.1, 12, 0.6); // Specs line
      ctx.fillRect(-6, 1.6, 7.5, 0.6); // Price line

      // Official Round MREO / Notary Blue Seal Stamp
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(3.5, 5.5, 2.6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 0.4;
      ctx.beginPath();
      ctx.arc(3.5, 5.5, 2.1, 0, Math.PI * 2);
      ctx.stroke();
      // Center star / emblem inside stamp
      ctx.fillStyle = '#2563eb';
      ctx.beginPath();
      ctx.arc(3.5, 5.5, 0.7, 0, Math.PI * 2);
      ctx.fill();

      // Handwritten Blue Ballpoint Signatures
      ctx.strokeStyle = '#1d4ed8';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      // Seller cursive signature
      ctx.moveTo(-5.5, 5.5);
      ctx.quadraticCurveTo(-4, 4.2, -3, 5.8);
      ctx.quadraticCurveTo(-2, 4.5, -0.5, 5.2);
      // Buyer signature line
      ctx.moveTo(-5.5, 7.5);
      ctx.quadraticCurveTo(-3.5, 6.5, -1, 7.2);
      ctx.stroke();
      return true;
    }

    // Wicker Basket / Lukoshko (Плетёное лукошко)
    case 'lukoshko':
    case 'basket_wicker':
    case 'berries_basket': {
      drawShadow(ctx, 8, 3.5, 7.5, 0.26);

      // Wicker handle arch (behind items)
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(0, -1, 6.5, Math.PI, 0);
      ctx.stroke();

      // Dark woven interior cavity at top mouth
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.ellipse(0, -3, 7.3, 2.1, 0, 0, Math.PI * 2);
      ctx.fill();

      // Render actual items from item.contents nestled inside basket opening
      const validContents = (Array.isArray(item?.contents) ? item.contents : []).filter(
        (inner: any) =>
          inner &&
          inner.itemId &&
          inner.itemId !== 'lukoshko' &&
          inner.itemId !== 'basket_wicker' &&
          inner.itemId !== 'berries_basket'
      );
      if (validContents.length > 0) {
        const slots: Array<[number, number, number]> =
          validContents.length === 1
            ? [[0, -3.3, 8.2]]
            : validContents.length === 2
            ? [[-2.0, -3.2, 7.0], [2.0, -3.1, 7.0]]
            : [
                [-3.4, -3.6, 5.6],
                [0, -4.0, 6.0],
                [3.4, -3.5, 5.6],
                [-1.8, -3.1, 5.6],
                [1.8, -3.0, 5.6],
                [-4.2, -2.8, 5.0],
                [4.2, -2.8, 5.0],
                [0, -2.7, 5.4],
                [-2.4, -4.2, 5.0],
                [2.4, -4.2, 5.0]
              ];
        const showCount = Math.min(slots.length, validContents.length);
        ctx.save();
        ctx.beginPath();
        ctx.rect(-7.4, -9.2, 14.8, 6.8);
        ctx.clip();
        for (let i = 0; i < showCount; i++) {
          const inner = validContents[i];
          const [ix, iy, isz] = slots[i];
          drawItemModel2D(ctx, inner.itemId, ix, iy, isz, inner, true);
        }
        ctx.restore();
      }

      // Woven Basket Body (front wall overlapping lower half of items)
      const wickerGrad = ctx.createLinearGradient(-7, -4, 7, 7);
      wickerGrad.addColorStop(0, '#d97706');
      wickerGrad.addColorStop(0.5, '#b45309');
      wickerGrad.addColorStop(1, '#78350f');
      ctx.fillStyle = wickerGrad;
      ctx.beginPath();
      ctx.moveTo(-7.5, -3);
      ctx.quadraticCurveTo(0, -1.1, 7.5, -3);
      ctx.lineTo(5.5, 7.5);
      ctx.lineTo(-5.5, 7.5);
      ctx.closePath();
      ctx.fill();

      // Wicker weave pattern texture
      ctx.strokeStyle = '#fef3c7';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      for (let y = -1; y <= 6; y += 2) {
        ctx.moveTo(-6.5 + (y > 0 ? 0.8 : 0), y);
        ctx.lineTo(6.5 - (y > 0 ? 0.8 : 0), y);
      }
      ctx.stroke();

      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 0.6;
      for (let x = -5; x <= 5; x += 2.5) {
        ctx.beginPath();
        ctx.moveTo(x, -2.2);
        ctx.lineTo(x * 0.75, 7.5);
        ctx.stroke();
      }

      // Front rim lip arc
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 0.95;
      ctx.beginPath();
      ctx.ellipse(0, -3, 7.45, 2.1, 0, 0.05, Math.PI - 0.05);
      ctx.stroke();
      return true;
    }

    // Plastic Package Bag (Фасовочный пакетик с сыпучим содержимым)
    case 'package_bag': {
      drawShadow(ctx, 6.5, 3, 6.5, 0.18);

      // Gathered twisted LDPE neck tuft
      ctx.fillStyle = 'rgba(226, 232, 240, 0.75)';
      ctx.beginPath();
      ctx.moveTo(-1.2, -6.2);
      ctx.lineTo(-2.4, -8.2);
      ctx.lineTo(0, -7.6);
      ctx.lineTo(2.4, -8.2);
      ctx.lineTo(1.2, -6.2);
      ctx.closePath();
      ctx.fill();

      const bagGrad = ctx.createLinearGradient(-5.5, -6.2, 5.5, 7.2);
      bagGrad.addColorStop(0.0, 'rgba(248, 250, 252, 0.62)');
      bagGrad.addColorStop(0.5, 'rgba(226, 232, 240, 0.36)');
      bagGrad.addColorStop(1.0, 'rgba(148, 163, 184, 0.52)');
      ctx.fillStyle = bagGrad;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.lineWidth = 0.45;
      ctx.beginPath();
      ctx.roundRect(-5.5, -6.2, 11, 13.4, 2.0);
      ctx.fill();
      ctx.stroke();

      // Internal granular powder / crystal fill if fluidStorage present
      const fs = item?.fluidStorage;
      if (fs && fs.currentMl > 0) {
        const fillFrac = Math.min(1, Math.max(0.22, fs.currentMl / (fs.maxMl || 1500)));
        const liqDef = fs.liquidId ? LIQUID_REGISTRY[fs.liquidId as LiquidId] : undefined;
        const fillCol = liqDef?.color || '#f8fafc';
        const moundTopY = 6.8 - fillFrac * 10.0;

        ctx.save();
        ctx.beginPath();
        ctx.roundRect(-5.0, -5.8, 10, 12.6, 1.6);
        ctx.clip();

        const pGrad = ctx.createLinearGradient(0, moundTopY, 0, 7.0);
        pGrad.addColorStop(0, fillCol);
        pGrad.addColorStop(1, '#cbd5e1');
        ctx.fillStyle = pGrad;
        ctx.beginPath();
        ctx.moveTo(-5.2, 7.2);
        ctx.lineTo(-5.2, moundTopY + 1.2);
        ctx.quadraticCurveTo(0, moundTopY - 1.4, 5.2, moundTopY + 1.2);
        ctx.lineTo(5.2, 7.2);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = 'rgba(15, 23, 42, 0.12)';
        for (const [gx, gy] of [[-2.5, 3], [0, 4], [2.4, 2.5], [-1.2, 5.5], [1.6, 5.0]]) {
          if (gy > moundTopY + 0.5) {
            ctx.beginPath();
            ctx.arc(gx, gy, 0.45, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();

        if (fs.attributes?.customColor) {
          drawStudioLabelPanel(ctx, -4.4, -2.5, 8.8, 3.6, {
            paperColor: '#f8fafc',
            bandColor: fs.attributes.customColor,
            accentColor: '#ca8a04',
            inkColor: '#0f172a',
            goldFoil: false,
            hasBarcode: true,
            emblem: 'none',
            cylindrical: false
          });
        }
      } else if (Array.isArray(item?.contents) && item.contents.length > 0) {
        const validBagContents = item.contents.filter(
          (inner: any) => inner && inner.itemId && inner.itemId !== 'package_bag'
        );
        if (validBagContents.length > 0) {
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(-5.0, -5.8, 10, 12.6, 1.6);
          ctx.clip();
          const bagSlots: Array<[number, number, number]> =
            validBagContents.length === 1
              ? [[0, 1.4, 11.0]]
              : [
                  [-2.0, 2.8, 7.6],
                  [2.0, 2.6, 7.6],
                  [0, 0.2, 7.8],
                  [-1.8, -1.8, 7.0],
                  [1.8, -1.6, 7.0]
                ];
          const showBag = Math.min(bagSlots.length, validBagContents.length);
          for (let i = 0; i < showBag; i++) {
            const inner = validBagContents[i];
            const [bx, by, bsz] = bagSlots[i];
            drawItemModel2D(ctx, inner.itemId, bx, by, bsz, inner, true);
          }
          ctx.restore();
        }
      }

      // Wire twist collar + film crinkles
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.roundRect(-1.8, -6.5, 3.6, 0.85, 0.35);
      ctx.fill();

      drawPouchCrinkles(ctx, -4.8, -5.4, 9.6, 11.8, 15, 0.25);
      drawGlossBand(ctx, -4.2, -5.2, 1.0, 11.0, 0.35);
      return true;
    }

    // Grocery Carrier Bag (Пакет-майка / shopping_bag)
    case 'shopping_bag': {
      drawShadow(ctx, 8, 3.5, 7.5, 0.22);

      const sGrad = ctx.createLinearGradient(-6.5, -8, 6.5, 8);
      sGrad.addColorStop(0.0, '#ffffff');
      sGrad.addColorStop(0.6, '#f1f5f9');
      sGrad.addColorStop(1.0, '#cbd5e1');
      ctx.fillStyle = sGrad;
      ctx.beginPath();
      ctx.moveTo(-6.5, -4);
      ctx.lineTo(-6.5, 7.5);
      ctx.quadraticCurveTo(0, 8.5, 6.5, 7.5);
      ctx.lineTo(6.5, -4);
      ctx.lineTo(3.5, -4);
      ctx.lineTo(3.5, -9);
      ctx.lineTo(1.5, -9);
      ctx.lineTo(1.5, -3);
      ctx.lineTo(-1.5, -3);
      ctx.lineTo(-1.5, -9);
      ctx.lineTo(-3.5, -9);
      ctx.lineTo(-3.5, -4);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.65)';
      ctx.lineWidth = 0.45;
      ctx.stroke();

      drawPouchCrinkles(ctx, -5.6, -2.5, 11.2, 9.2, 23, 0.22);

      // Market botanical seal print
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.arc(0, 1.8, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-1.3, 1.35, 2.6, 0.55);
      ctx.fillRect(-0.9, 2.15, 1.8, 0.32);
      return true;
    }

    // ==============================================================
    // === UNIFIED GLASS PRESERVATION JARS (Стеклянные банки) ===
    // ==============================================================
    case 'jar_glass_3l':
    case 'jar_glass_3l_open':
    case 'jar_glass_large':
    case 'jar_glass_large_open':
    case 'jar_glass_medium':
    case 'jar_glass_medium_open':
    case 'jar_glass_small':
    case 'jar_glass_small_open':
    case 'jar_spice_small':
    case 'jar_spice_small_open': {
      const is3L = itemId.startsWith('jar_glass_3l');
      const isLg = itemId.startsWith('jar_glass_large');
      const isSm = itemId.startsWith('jar_glass_small');
      const isSpice = itemId.startsWith('jar_spice_small');
      const isOpen = Boolean(item?.isOpen || item?.fluidStorage?.attributes?.isOpened || itemId.endsWith('_open'));

      const vis = resolveContainerVisualAttributes(
        itemId,
        item?.fluidStorage?.liquidId,
        item?.fluidStorage?.attributes,
        item?.originalCatalogId,
        item?.containerVisuals || item?.fluidStorage?.containerVisuals
      );
      const { shape, materialRgb, labelRgb, labelAccentRgb, capRgb } = vis;

      const w = is3L ? 14.5 : isLg ? 13 : isSpice ? 7.4 : isSm ? 9 : 11;
      const h = is3L ? 15.5 : isLg ? 14 : isSpice ? 8.0 : isSm ? 8.5 : 11.5;
      const hw = w / 2;
      const topY = 7.0 - h;
      const botY = 7.0;
      const bodyTop = topY + 2.0;
      const bodyH = h - 2.0;

      drawShadow(ctx, hw + 1.2, 2.5, botY + 0.8, 0.24);

      const traceJarBodyPath = () => {
        ctx.beginPath();
        if (shape === 'hexagonal') {
          // 6-sided faceted hexagonal jar silhouette
          const bev = 1.6;
          ctx.moveTo(-hw + bev, bodyTop);
          ctx.lineTo(hw - bev, bodyTop);
          ctx.lineTo(hw, bodyTop + bev);
          ctx.lineTo(hw, botY - bev * 0.8);
          ctx.lineTo(hw - bev * 0.9, botY);
          ctx.lineTo(-hw + bev * 0.9, botY);
          ctx.lineTo(-hw, botY - bev * 0.8);
          ctx.lineTo(-hw, bodyTop + bev);
          ctx.closePath();
        } else if (shape === 'barrel') {
          // Bulging barrel jar silhouette
          const bulge = hw + (isSpice || isSm ? 1.0 : 1.6);
          const midY = bodyTop + bodyH * 0.52;
          ctx.moveTo(-hw + 0.8, bodyTop);
          ctx.lineTo(hw - 0.8, bodyTop);
          ctx.quadraticCurveTo(bulge, midY, hw - 0.9, botY);
          ctx.lineTo(-hw + 0.9, botY);
          ctx.quadraticCurveTo(-bulge, midY, -hw + 0.8, bodyTop);
          ctx.closePath();
        } else if (shape === 'square') {
          // Crisp straight-sided square jar silhouette
          ctx.roundRect(-hw, bodyTop, w, bodyH, 0.65);
        } else if (shape === 'amphora') {
          // Curvy waisted amphora jar silhouette
          const waistY = bodyTop + bodyH * 0.34;
          const bellyY = bodyTop + bodyH * 0.74;
          ctx.moveTo(-hw + 0.6, bodyTop);
          ctx.lineTo(hw - 0.6, bodyTop);
          ctx.bezierCurveTo(hw - 1.5, waistY, hw + 1.5, bellyY, hw - 0.8, botY);
          ctx.lineTo(-hw + 0.8, botY);
          ctx.bezierCurveTo(-hw - 1.5, bellyY, -hw + 1.5, waistY, -hw + 0.6, bodyTop);
          ctx.closePath();
        } else {
          // Classic rounded cylindrical jar
          ctx.roundRect(-hw, bodyTop, w, bodyH, 1.8);
        }
      };

      // Translucent glass jar body colored by materialRgb
      const glassGrad = ctx.createLinearGradient(-hw, topY, hw, botY);
      glassGrad.addColorStop(0, rgbTupleToCss(shiftRgbTuple(materialRgb, 25), 0.82));
      glassGrad.addColorStop(0.35, rgbTupleToCss(materialRgb, 0.54));
      glassGrad.addColorStop(0.75, rgbTupleToCss(shiftRgbTuple(materialRgb, -28), 0.68));
      glassGrad.addColorStop(1, rgbTupleToCss(shiftRgbTuple(materialRgb, -65), 0.80));

      ctx.fillStyle = glassGrad;
      traceJarBodyPath();
      ctx.fill();

      // Fluid / preserve / spice filling clipped inside the exact jar shape
      const maxCap = item?.fluidStorage?.maxMl || item?.fluidStorage?.capacityMl || 500;
      if (item?.fluidStorage && item.fluidStorage.currentMl > 0) {
        const fillFrac = Math.min(1, item.fluidStorage.currentMl / maxCap);
        const fluidH = (bodyH - 1.0) * fillFrac;
        const fluidTop = botY - fluidH - 0.4;

        const liqDef = item.fluidStorage.liquidId
          ? LIQUID_REGISTRY[item.fluidStorage.liquidId as LiquidId]
          : undefined;
        let fluidColor = item.fluidStorage.attributes?.customColor || liqDef?.color || 'rgba(56, 189, 248, 0.85)';

        ctx.save();
        traceJarBodyPath();
        ctx.clip();

        ctx.fillStyle = fluidColor;
        ctx.fillRect(-hw - 2, fluidTop, w + 4, fluidH + 1);

        const secColor = item.fluidStorage.attributes?.secondaryColor;
        if (secColor && fluidH > 3) {
          ctx.fillStyle = secColor;
          ctx.beginPath();
          ctx.arc(-hw * 0.35, fluidTop + fluidH * 0.45, Math.min(1.6, hw * 0.25), 0, Math.PI * 2);
          ctx.arc(hw * 0.3, fluidTop + fluidH * 0.65, Math.min(1.5, hw * 0.22), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // Shape-specific structural glass details (facets, hoops, bevels)
      if (shape === 'hexagonal') {
        ctx.strokeStyle = rgbTupleToCss(shiftRgbTuple(materialRgb, 35), 0.65);
        ctx.lineWidth = 0.65;
        ctx.beginPath();
        ctx.moveTo(-hw * 0.4, bodyTop + 0.4);
        ctx.lineTo(-hw * 0.4, botY - 0.4);
        ctx.moveTo(hw * 0.4, bodyTop + 0.4);
        ctx.lineTo(hw * 0.4, botY - 0.4);
        ctx.stroke();
      } else if (shape === 'barrel') {
        ctx.strokeStyle = rgbTupleToCss(shiftRgbTuple(materialRgb, 30), 0.6);
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(-hw, bodyTop + bodyH * 0.22);
        ctx.lineTo(hw, bodyTop + bodyH * 0.22);
        ctx.moveTo(-hw, bodyTop + bodyH * 0.80);
        ctx.lineTo(hw, bodyTop + bodyH * 0.80);
        ctx.stroke();
      } else if (shape === 'square') {
        ctx.strokeStyle = rgbTupleToCss(shiftRgbTuple(materialRgb, -45), 0.45);
        ctx.lineWidth = 0.6;
        ctx.strokeRect(-hw + 1.1, bodyTop + 1.0, w - 2.2, bodyH - 2.0);
      }

      // Heavy glass bottom punt tinted by materialRgb
      ctx.fillStyle = rgbTupleToCss(shiftRgbTuple(materialRgb, -55), 0.55);
      ctx.beginPath();
      ctx.ellipse(0, botY - 0.6, hw - 1.0, 1.1, 0, 0, Math.PI * 2);
      ctx.fill();

      // Studio paper/foil label colored dynamically by labelRgb
      if (labelRgb) {
        const lblW = w - 1.4;
        const lblH = Math.max(3.4, bodyH * 0.40);
        const lblY = bodyTop + (bodyH - lblH) * 0.52;

        drawStudioLabelPanel(ctx, -lblW / 2, lblY, lblW, lblH, {
          paperColor: '#f8f5ec',
          bandColor: rgbTupleToCss(labelRgb),
          accentColor: labelAccentRgb ? rgbTupleToCss(labelAccentRgb) : '#ca8a04',
          inkColor: '#1e293b',
          goldFoil: true,
          hasBarcode: lblW >= 6.8 && lblH >= 3.8,
          emblem: 'crest',
          cylindrical: true
        });
      } else {
        // Subtle embossed glass graduation marks when unlabelled
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.42)';
        ctx.lineWidth = 0.28;
        for (let gy = bodyTop + 1.8; gy < botY - 1.4; gy += 1.6) {
          ctx.beginPath();
          ctx.moveTo(hw - 2.2, gy);
          ctx.lineTo(hw - 0.9, gy);
          ctx.stroke();
        }
      }

      // Glass refraction streaks & vertical highlights
      drawGlossBand(ctx, -hw + 1.2, bodyTop + 0.5, 1.15, bodyH - 1.5, 0.44);
      drawGlossBand(ctx, hw - 2.0, bodyTop + 0.5, 0.65, bodyH - 1.5, 0.26);

      // Threaded glass neck
      const neckW = is3L ? w * 0.62 : w - 1.6;
      ctx.fillStyle = rgbTupleToCss(shiftRgbTuple(materialRgb, 15), 0.9);
      ctx.fillRect(-neckW / 2, topY + 0.4, neckW, 1.8);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 0.4;
      ctx.strokeRect(-neckW / 2, topY + 0.4, neckW, 1.8);

      if (!isOpen) {
        const lidRgb: [number, number, number] = capRgb || (isSpice ? [220, 38, 38] : [234, 179, 8]);
        const lidGrad = ctx.createLinearGradient(-neckW / 2 - 0.5, topY - 1.5, neckW / 2 + 0.5, topY + 1.2);
        lidGrad.addColorStop(0.0, rgbTupleToCss(shiftRgbTuple(lidRgb, -35)));
        lidGrad.addColorStop(0.28, rgbTupleToCss(shiftRgbTuple(lidRgb, 48)));
        lidGrad.addColorStop(0.65, rgbTupleToCss(lidRgb));
        lidGrad.addColorStop(1.0, rgbTupleToCss(shiftRgbTuple(lidRgb, -60)));

        ctx.fillStyle = lidGrad;
        ctx.beginPath();
        ctx.roundRect(-neckW / 2 - 0.5, topY - 1.2, neckW + 1.0, 2.2, 0.65);
        ctx.fill();

        // Twist-off lug knurls & top rim highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(-neckW / 2, topY - 1.05, neckW, 0.38);
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.24)';
        ctx.lineWidth = 0.24;
        for (let kx = -neckW / 2 + 0.6; kx < neckW / 2 - 0.3; kx += 0.9) {
          ctx.beginPath();
          ctx.moveTo(kx, topY - 0.65);
          ctx.lineTo(kx, topY + 0.85);
          ctx.stroke();
        }
      } else {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
        ctx.beginPath();
        ctx.ellipse(0, topY + 0.5, neckW / 2 - 0.3, 0.9, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      return true;
    }

    // ==============================================================
    // === UNIFIED METAL TIN & ALUMINUM CANS (Жестяные и алюминиевые банки) ===
    // ==============================================================
    case 'can_metal_large':
    case 'can_metal_large_open':
    case 'can_metal_medium':
    case 'can_metal_medium_open':
    case 'can_metal_small':
    case 'can_metal_small_open':
    case 'can_metal_flat':
    case 'can_metal_flat_open':
    case 'can_metal_oval':
    case 'can_metal_oval_open':
    case 'tin_round_mini':
    case 'tin_round_mini_open':
    case 'can_alu_330':
    case 'can_alu_330_open': {
      const isOpen = Boolean(item?.isOpen || item?.fluidStorage?.attributes?.isOpened || itemId.endsWith('_open'));
      const isMini = itemId.startsWith('tin_round_mini');
      const isAlu = itemId.startsWith('can_alu_330');
      const isOvalBase = itemId.startsWith('can_metal_oval');
      const isFlat = itemId.startsWith('can_metal_flat');
      const isLg = itemId.startsWith('can_metal_large');
      const isSm = itemId.startsWith('can_metal_small');

      const vis = resolveContainerVisualAttributes(
        itemId,
        item?.fluidStorage?.liquidId,
        item?.fluidStorage?.attributes,
        item?.originalCatalogId,
        item?.containerVisuals || item?.fluidStorage?.containerVisuals
      );
      const { shape, materialRgb, labelRgb, labelAccentRgb } = vis;

      if (isMini) {
        drawShadow(ctx, 4.6, 2.2, 5.5, 0.26);
        const isMenthol = item?.fluidStorage?.liquidId === 'menthol';
        const baseHex = rgbTupleToCss(materialRgb);
        const rimGrad = ctx.createRadialGradient(-1.4, -0.4, 0.5, 0, 1.0, 4.6);
        rimGrad.addColorStop(0.0, rgbTupleToCss(shiftRgbTuple(materialRgb, 55)));
        rimGrad.addColorStop(0.6, baseHex);
        rimGrad.addColorStop(1.0, rgbTupleToCss(shiftRgbTuple(materialRgb, -55)));
        ctx.fillStyle = rimGrad;
        ctx.beginPath();
        ctx.arc(0, 1.0, 4.5, 0, Math.PI * 2);
        ctx.fill();

        // Rolled metallic bezel ring
        ctx.strokeStyle = labelRgb ? rgbTupleToCss(labelRgb) : '#eab308';
        ctx.lineWidth = 0.65;
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 0.25;
        ctx.beginPath();
        ctx.arc(0, 1.0, 3.85, 0, Math.PI * 2);
        ctx.stroke();

        if (!isOpen) {
          if (isMenthol) {
            ctx.strokeStyle = '#ccfbf1';
            ctx.lineWidth = 0.55;
            ctx.beginPath();
            ctx.moveTo(0, -1.4); ctx.lineTo(0, 3.4);
            ctx.moveTo(-2.4, 1.0); ctx.lineTo(2.4, 1.0);
            ctx.moveTo(-1.7, -0.7); ctx.lineTo(1.7, 2.7);
            ctx.moveTo(-1.7, 2.7); ctx.lineTo(1.7, -0.7);
            ctx.stroke();
          } else {
            ctx.fillStyle = labelRgb ? rgbTupleToCss(labelRgb) : '#fef08a';
            ctx.beginPath();
            ctx.arc(0, 1.0, 1.35, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.45)';
            ctx.lineWidth = 0.22;
            ctx.stroke();
          }
          // Specular lid crest
          ctx.fillStyle = 'rgba(255, 255, 255, 0.24)';
          ctx.beginPath();
          ctx.ellipse(-1.4, -0.8, 1.8, 0.7, -0.5, 0, Math.PI * 2);
          ctx.fill();
        } else if (isMenthol) {
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(0, 1.0, 3.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#e0f2fe';
          ctx.lineWidth = 0.65;
          ctx.beginPath();
          ctx.moveTo(-2.2, 0.2); ctx.lineTo(1.8, 2.0);
          ctx.moveTo(-1.4, 2.4); ctx.lineTo(2.0, -0.4);
          ctx.moveTo(-0.2, -1.4); ctx.lineTo(0.4, 3.0);
          ctx.stroke();
        } else {
          const balmGrad = ctx.createRadialGradient(-0.8, 0.2, 0.4, 0, 1.0, 3.1);
          balmGrad.addColorStop(0.0, '#fef9c3');
          balmGrad.addColorStop(0.6, '#fde047');
          balmGrad.addColorStop(1.0, '#ca8a04');
          ctx.fillStyle = balmGrad;
          ctx.beginPath();
          ctx.arc(0, 1.0, 3.2, 0, Math.PI * 2);
          ctx.fill();
        }
        return true;
      }

      const isSleek = shape === 'sleek';
      const isOval = isOvalBase || shape === 'oval';
      const isRect = shape === 'rectangular';
      const isDrum = shape === 'ribbed_drum';
      const isOct = shape === 'octagonal';

      const w = isOval ? 14 : isFlat ? 12.5 : isSleek ? 9.2 : isRect ? 11.8 : isLg ? 12 : isSm ? 10.5 : isAlu ? 10.6 : 10;
      const h = isOval ? 6.0 : isFlat ? 5.8 : isSleek ? 14.5 : isLg ? 14 : isSm ? 7.2 : isAlu ? 13.2 : 11.5;
      const hw = w / 2;
      const topY = 7.0 - h;
      const botY = 7.0;

      drawShadow(ctx, hw + 1.0, 2.4, botY + 0.8, 0.25);

      // Metallic brushed body gradient derived from materialRgb
      const metalGrad = ctx.createLinearGradient(-hw, topY, hw, topY);
      metalGrad.addColorStop(0, rgbTupleToCss(shiftRgbTuple(materialRgb, -35)));
      metalGrad.addColorStop(0.25, rgbTupleToCss(shiftRgbTuple(materialRgb, 42)));
      metalGrad.addColorStop(0.5, rgbTupleToCss(materialRgb));
      metalGrad.addColorStop(0.8, rgbTupleToCss(shiftRgbTuple(materialRgb, -45)));
      metalGrad.addColorStop(1, rgbTupleToCss(shiftRgbTuple(materialRgb, -70)));

      const traceCanBody = () => {
        ctx.beginPath();
        if (isRect) {
          // Trapezoidal rectangular tin (meat / ham / sardine style)
          ctx.moveTo(-hw - 0.3, topY + 1.0);
          ctx.lineTo(hw + 0.3, topY + 1.0);
          ctx.lineTo(hw - 0.3, botY - 0.8);
          ctx.lineTo(-hw + 0.3, botY - 0.8);
          ctx.closePath();
        } else if (isDrum || shape === 'barrel') {
          // Bulging drum / barrel can silhouette
          const midY = topY + h * 0.5;
          ctx.moveTo(-hw, topY + 1.0);
          ctx.lineTo(hw, topY + 1.0);
          ctx.quadraticCurveTo(hw + 1.2, midY, hw, botY - 1.0);
          ctx.lineTo(-hw, botY - 1.0);
          ctx.quadraticCurveTo(-hw - 1.2, midY, -hw, topY + 1.0);
          ctx.closePath();
        } else if (isOct) {
          // Octagonal chamfered tin silhouette
          ctx.roundRect(-hw, topY + 1.0, w, h - 2.0, 0.3);
        } else {
          ctx.roundRect(-hw, topY + 1.0, w, h - 2.0, isOval ? 2.2 : isAlu ? 1.6 : 0.7);
        }
      };

      ctx.fillStyle = metalGrad;
      traceCanBody();
      ctx.fill();

      // Lithographed or editorial paper label band colored by labelRgb
      if (labelRgb) {
        ctx.save();
        traceCanBody();
        ctx.clip();

        const lblTop = isAlu ? topY + 1.8 : topY + h * 0.24;
        const lblH = isAlu ? h - 3.6 : Math.max(3.0, h * 0.50);
        if (isAlu) {
          ctx.fillStyle = rgbTupleToCss(labelRgb);
          ctx.fillRect(-hw - 1.5, lblTop, w + 3.0, lblH);
          if (labelAccentRgb) {
            ctx.fillStyle = rgbTupleToCss(labelAccentRgb);
            ctx.beginPath();
            ctx.moveTo(-hw - 1, lblTop + lblH * 0.65);
            ctx.quadraticCurveTo(0, lblTop + lblH * 0.25, hw + 1, lblTop + lblH * 0.45);
            ctx.lineTo(hw + 1, lblTop + lblH * 0.60);
            ctx.quadraticCurveTo(0, lblTop + lblH * 0.40, -hw - 1, lblTop + lblH * 0.80);
            ctx.closePath();
            ctx.fill();
          }
          ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
          ctx.fillRect(-hw * 0.55, lblTop + lblH * 0.22, hw * 1.1, 0.52);
          drawMicroBarcode(ctx, hw * 0.15, lblTop + lblH * 0.72, hw * 0.55, 0.85);
        } else {
          drawStudioLabelPanel(ctx, -hw - 0.4, lblTop, w + 0.8, lblH, {
            paperColor: '#f8f5ec',
            bandColor: rgbTupleToCss(labelRgb),
            accentColor: labelAccentRgb ? rgbTupleToCss(labelAccentRgb) : '#ca8a04',
            inkColor: '#1e293b',
            goldFoil: true,
            hasBarcode: lblH >= 3.6,
            emblem: item?.fluidStorage?.liquidId === 'coconut_milk' ? 'none' : 'crest',
            cylindrical: false
          });
          if (item?.fluidStorage?.liquidId === 'coconut_milk') {
            const cy = lblTop + lblH * 0.56;
            ctx.fillStyle = '#78350f';
            ctx.beginPath();
            ctx.arc(-hw * 0.25, cy, 1.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(-hw * 0.25, cy, 1.0, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        applyCylinderLightingOverlay(ctx, -hw - 1.5, topY + 1.0, w + 3.0, h - 2.0, 0.26, 0.34);
        ctx.restore();
      }

      // Shape-specific structural metal details
      if (isOct) {
        ctx.strokeStyle = rgbTupleToCss(shiftRgbTuple(materialRgb, -55), 0.75);
        ctx.lineWidth = 0.65;
        ctx.beginPath();
        ctx.moveTo(-hw * 0.44, topY + 1.2);
        ctx.lineTo(-hw * 0.44, botY - 1.2);
        ctx.moveTo(hw * 0.44, topY + 1.2);
        ctx.lineTo(hw * 0.44, botY - 1.2);
        ctx.stroke();
      } else if (isRect) {
        ctx.strokeStyle = rgbTupleToCss(shiftRgbTuple(materialRgb, -50), 0.65);
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(-hw + 1.4, topY + 1.4);
        ctx.lineTo(-hw + 1.2, botY - 1.2);
        ctx.moveTo(hw - 1.4, topY + 1.4);
        ctx.lineTo(hw - 1.2, botY - 1.2);
        ctx.stroke();
      } else if (!isAlu) {
        ctx.strokeStyle = rgbTupleToCss(shiftRgbTuple(materialRgb, -60), 0.75);
        ctx.lineWidth = 0.6;
        const ribCount = isFlat || isOval || isSm ? 1 : isLg || isDrum ? 4 : 3;
        const ribSpacing = (h - 4.0) / (ribCount + 1);
        for (let i = 1; i <= ribCount; i++) {
          const ry = topY + 1.8 + i * ribSpacing;
          ctx.beginPath();
          ctx.moveTo(-hw, ry);
          ctx.lineTo(hw, ry);
          ctx.stroke();
        }
      }

      drawGlossBand(ctx, -hw + 1.8, topY + 1.2, 1.5, h - 2.4, 0.38);

      // Crimped bottom seam rim
      ctx.fillStyle = rgbTupleToCss(shiftRgbTuple(materialRgb, -45));
      ctx.beginPath();
      if (isRect) {
        ctx.roundRect(-hw + 0.1, botY - 1.2, w - 0.2, 1.4, 0.5);
      } else {
        ctx.ellipse(0, botY - 0.4, hw + 0.4, 1.2, 0, 0, Math.PI * 2);
      }
      ctx.fill();

      // Top double-seamed lid
      if (!isOpen && !isRect) {
        drawMetalCanLid(ctx, 0, topY + 1.0, hw + 0.35, 1.45, !isAlu);
      } else {
        ctx.fillStyle = rgbTupleToCss(shiftRgbTuple(materialRgb, -15));
        ctx.beginPath();
        if (isRect) {
          ctx.roundRect(-hw - 0.5, topY + 0.2, w + 1.0, 2.0, 0.6);
        } else {
          ctx.ellipse(0, topY + 1.0, hw + 0.5, 1.5, 0, 0, Math.PI * 2);
        }
        ctx.fill();

        if (!isOpen) {
          ctx.fillStyle = rgbTupleToCss(shiftRgbTuple(materialRgb, 20));
          ctx.beginPath();
          ctx.roundRect(-hw + 0.4, topY + 0.5, w - 0.8, 1.4, 0.4);
          ctx.fill();
          ctx.fillStyle = rgbTupleToCss(shiftRgbTuple(materialRgb, -55));
          ctx.beginPath();
          ctx.roundRect(-1.2, topY - 0.2, 2.4, 2.0, 0.4);
          ctx.fill();
        } else {
          const innerColor =
            item?.fluidStorage && item.fluidStorage.currentMl > 0
              ? item.fluidStorage.attributes?.customColor ||
                (item.fluidStorage.liquidId ? LIQUID_REGISTRY[item.fluidStorage.liquidId as LiquidId]?.color : undefined) ||
                '#9a3412'
              : '#1e293b';

          if (isAlu) {
            ctx.fillStyle = rgbTupleToCss(shiftRgbTuple(materialRgb, 15));
            ctx.beginPath();
            ctx.ellipse(0, topY + 1.0, hw - 0.8, 1.1, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#09090b';
            ctx.beginPath();
            ctx.ellipse(1.0, topY + 1.0, 1.8, 0.8, 0, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillStyle = innerColor;
            ctx.beginPath();
            if (isRect) {
              ctx.roundRect(-hw + 0.4, topY + 0.5, w - 0.8, 1.4, 0.4);
            } else {
              ctx.ellipse(0, topY + 1.0, hw - 0.8, 1.1, 0, 0, Math.PI * 2);
            }
            ctx.fill();

            ctx.fillStyle = rgbTupleToCss(shiftRgbTuple(materialRgb, 15));
            ctx.strokeStyle = rgbTupleToCss(shiftRgbTuple(materialRgb, -55));
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.ellipse(hw - 1.2, topY - 1.6, 2.2, 2.6, 0.35, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          }
        }
      }

      return true;
    }

    // ==============================================================
    // === UNIFIED CLOTH SACKS (Тканевые холщовые мешки) ===
    // ==============================================================
    case 'sack_cloth_large':
    case 'sack_cloth_medium':
    case 'sack_cloth_small': {
      const isLg = itemId === 'sack_cloth_large';
      const isSm = itemId === 'sack_cloth_small';

      const hw = isLg ? 8.0 : (isSm ? 5.2 : 6.8);
      const topY = isLg ? -8.0 : (isSm ? -6.0 : -7.0);
      const botY = 7.5;

      drawShadow(ctx, hw + 1.0, 3.5, botY + 0.5, 0.25);

      const sackGrad = ctx.createLinearGradient(-hw, topY, hw, botY);
      sackGrad.addColorStop(0.0, '#e5d5b5');
      sackGrad.addColorStop(0.35, '#cbb48b');
      sackGrad.addColorStop(0.75, '#9a7b4f');
      sackGrad.addColorStop(1.0, '#6b4f2c');

      ctx.fillStyle = sackGrad;
      ctx.beginPath();
      ctx.moveTo(-hw * 0.4, topY);
      ctx.quadraticCurveTo(-hw * 0.9, topY + 2.0, -hw, topY + 6.0);
      ctx.quadraticCurveTo(-hw * 1.05, botY - 1.5, -hw * 0.8, botY);
      ctx.quadraticCurveTo(0, botY + 1.5, hw * 0.8, botY);
      ctx.quadraticCurveTo(hw * 1.05, botY - 1.5, hw, topY + 6.0);
      ctx.quadraticCurveTo(hw * 0.9, topY + 2.0, hw * 0.4, topY);
      ctx.quadraticCurveTo(0, topY - 0.6, -hw * 0.4, topY);
      ctx.closePath();
      ctx.fill();

      // Burlap cross-weave lines
      ctx.strokeStyle = 'rgba(69, 26, 3, 0.22)';
      ctx.lineWidth = 0.4;
      ctx.beginPath();
      for (let x = -hw * 0.65; x <= hw * 0.65; x += 2.4) {
        ctx.moveTo(x, topY + 2.5);
        ctx.lineTo(x, botY - 1.0);
      }
      for (let y = topY + 3.5; y <= botY - 1.5; y += 2.2) {
        ctx.moveTo(-hw * 0.78, y);
        ctx.quadraticCurveTo(0, y + 0.8, hw * 0.78, y);
      }
      ctx.stroke();

      ctx.fillStyle = '#dec79f';
      ctx.beginPath();
      ctx.moveTo(-hw * 0.4, topY);
      ctx.quadraticCurveTo(-hw * 0.6, topY - 2.5, -hw * 0.4, topY - 3.5);
      ctx.quadraticCurveTo(0, topY - 2.0, hw * 0.4, topY - 3.5);
      ctx.quadraticCurveTo(hw * 0.6, topY - 2.5, hw * 0.4, topY);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#fef08a';
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.roundRect(-hw * 0.45, topY - 0.6, hw * 0.9, 1.8, 0.6);
      ctx.fill();
      ctx.stroke();

      // Stitched parchment farm tag + barcode (no big sans-serif text)
      drawStudioLabelPanel(ctx, -hw * 0.56, topY + (botY - topY) * 0.36, hw * 1.12, 4.2, {
        paperColor: '#f8f5ec',
        bandColor: '#78350f',
        accentColor: '#ca8a04',
        inkColor: '#451a03',
        goldFoil: false,
        hasBarcode: hw >= 6.0,
        emblem: 'leaf',
        cylindrical: false
      });

      return true;
    }

    // ==============================================================
    // === UNIFIED CARDBOARD BOXES (Картонные коробки 15л, 5л, 1л) ===
    // ==============================================================
    case 'box_cardboard_large':
    case 'box_cardboard_medium':
    case 'box_cardboard_small': {
      const isLg = itemId === 'box_cardboard_large';
      const isSm = itemId === 'box_cardboard_small';

      const w = isLg ? 16 : (isSm ? 10 : 13);
      const h = isLg ? 13 : (isSm ? 8.5 : 11);
      const hw = w / 2;
      const topY = 7.0 - h;
      const botY = 7.0;

      drawShadow(ctx, hw + 1.2, 3.2, botY + 0.8, 0.28);

      // Kraft corrugated box body
      const frontGrad = ctx.createLinearGradient(-hw, topY + 2.5, hw, botY);
      frontGrad.addColorStop(0.0, '#d6b084');
      frontGrad.addColorStop(0.55, '#b6895b');
      frontGrad.addColorStop(1.0, '#855830');
      ctx.fillStyle = frontGrad;
      ctx.beginPath();
      ctx.roundRect(-hw, topY + 2.5, w, h - 2.5, 0.65);
      ctx.fill();
      ctx.strokeStyle = '#6b4220';
      ctx.lineWidth = 0.35;
      ctx.stroke();

      // Top lid bevel with center flap seam + clear packing tape strip
      const topGrad = ctx.createLinearGradient(-hw, topY, hw, topY + 2.5);
      topGrad.addColorStop(0.0, '#e5c59e');
      topGrad.addColorStop(1.0, '#c6996b');
      ctx.fillStyle = topGrad;
      ctx.beginPath();
      ctx.moveTo(-hw, topY + 2.5);
      ctx.lineTo(-hw + 2.0, topY);
      ctx.lineTo(hw - 2.0, topY);
      ctx.lineTo(hw, topY + 2.5);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = 'rgba(69, 26, 3, 0.45)';
      ctx.lineWidth = 0.35;
      ctx.beginPath();
      ctx.moveTo(-hw + 1.0, topY + 1.25);
      ctx.lineTo(hw - 1.0, topY + 1.25);
      ctx.stroke();

      // Translucent acrylic packing tape wrapping down front seam
      ctx.fillStyle = 'rgba(254, 240, 138, 0.36)';
      ctx.fillRect(-1.4, topY, 2.8, 5.2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 0.22;
      ctx.strokeRect(-1.4, topY, 2.8, 5.2);

      if (item?.fluidStorage?.attributes?.customColor) {
        ctx.fillStyle = item.fluidStorage.attributes.customColor;
        ctx.fillRect(-hw + 1.2, topY + 4.0, w - 2.4, h * 0.25);
      }

      // White shipping label with micro-barcode + handling icon
      drawMicroBarcode(ctx, hw - 4.8, botY - 2.8, 3.6, 1.5);
      ctx.fillStyle = 'rgba(69, 26, 3, 0.72)';
      ctx.fillRect(-hw + 1.2, botY - 2.6, 1.6, 0.35);
      ctx.fillRect(-hw + 1.2, botY - 1.9, 1.2, 0.35);

      return true;
    }

    // ==============================================================
    // === UNIFIED PLASTIC & GLASS BOTTLES (Бутылки и флаконы) ===
    // ==============================================================
    case 'bottle_plastic_500':
    case 'bottle_plastic_1500':
    case 'bottle_plastic_100':
    case 'bottle_sauce_squeeze':
    case 'glass_bottle_500':
    case 'bottle_glass_medium':
    case 'bottle_glass_large':
    case 'bottle_glass_750':
    case 'bottle_glass_small':
    case 'bottle_med_glass_brown': {
      const is1500 = itemId === 'bottle_plastic_1500';
      const is1000 = itemId === 'bottle_glass_large';
      const is750 = itemId === 'bottle_glass_750';
      const isSmall = itemId === 'bottle_glass_small' || itemId === 'bottle_med_glass_brown';
      const is100 = itemId === 'bottle_plastic_100';
      const isSqueeze = itemId === 'bottle_sauce_squeeze';
      const isPlastic = itemId.startsWith('bottle_plastic_') || isSqueeze;

      const vis = resolveContainerVisualAttributes(
        itemId,
        item?.fluidStorage?.liquidId,
        item?.fluidStorage?.attributes,
        item?.originalCatalogId,
        item?.containerVisuals || item?.fluidStorage?.containerVisuals
      );
      const { shape, materialRgb, labelRgb, labelAccentRgb, capRgb } = vis;

      const baseW = is1500 ? 11.0 : is1000 ? 10.4 : is750 ? 9.4 : isSmall ? 7.6 : is100 ? 7.0 : isSqueeze ? 8.4 : 9.0;
      const w = shape === 'flask' ? baseW + 1.4 : shape === 'bulbous' ? baseW + 1.2 : shape === 'sleek' ? baseW - 1.0 : baseW;
      const hw = w / 2;
      const neckW = is1500 || is1000 ? 4.0 : isSmall || is100 ? 3.2 : 3.6;
      const hnw = neckW / 2;

      const botY = is1500 ? 8.0 : 7.2;
      const neckTopY = is1500 ? -10.5 : is1000 ? -9.5 : is750 ? -9.2 : isSmall || is100 || isSqueeze ? -7.0 : -8.2;
      const shoulderTopY = neckTopY + (is750 ? 3.8 : 2.8);
      const bodyTopY =
        shape === 'bordeaux' || shape === 'square' || shape === 'flask'
          ? shoulderTopY + 1.8
          : shape === 'burgundy'
            ? shoulderTopY + 4.8
            : shoulderTopY + 2.8;

      drawShadow(ctx, hw + 1.4, 2.5, botY + 0.6, 0.23);

      const traceBottlePath = () => {
        ctx.beginPath();
        if (shape === 'square') {
          ctx.moveTo(-hnw, neckTopY);
          ctx.lineTo(hnw, neckTopY);
          ctx.lineTo(hnw, shoulderTopY);
          ctx.lineTo(hw, bodyTopY - 0.5);
          ctx.lineTo(hw, botY);
          ctx.lineTo(-hw, botY);
          ctx.lineTo(-hw, bodyTopY - 0.5);
          ctx.lineTo(-hnw, shoulderTopY);
          ctx.closePath();
        } else if (shape === 'flask') {
          ctx.moveTo(-hnw, neckTopY);
          ctx.lineTo(hnw, neckTopY);
          ctx.lineTo(hnw, shoulderTopY);
          ctx.lineTo(hw, shoulderTopY + 1.4);
          ctx.lineTo(hw - 0.3, botY - 0.5);
          ctx.quadraticCurveTo(0, botY + 0.5, -hw + 0.3, botY - 0.5);
          ctx.lineTo(-hw, shoulderTopY + 1.4);
          ctx.lineTo(-hnw, shoulderTopY);
          ctx.closePath();
        } else if (shape === 'bulbous') {
          const bellyY = (shoulderTopY + botY) * 0.58;
          ctx.moveTo(-hnw, neckTopY);
          ctx.lineTo(hnw, neckTopY);
          ctx.lineTo(hnw, shoulderTopY);
          ctx.bezierCurveTo(hw + 2.2, shoulderTopY + 2.0, hw + 2.4, bellyY + 2.5, hw - 1.0, botY);
          ctx.quadraticCurveTo(0, botY + 0.7, -hw + 1.0, botY);
          ctx.bezierCurveTo(-hw - 2.4, bellyY + 2.5, -hw - 2.2, shoulderTopY + 2.0, -hnw, shoulderTopY);
          ctx.closePath();
        } else if (shape === 'pinched') {
          const waistY = (bodyTopY + botY) * 0.48;
          ctx.moveTo(-hnw, neckTopY);
          ctx.lineTo(hnw, neckTopY);
          ctx.lineTo(hnw, shoulderTopY);
          ctx.quadraticCurveTo(hw, shoulderTopY + 1.0, hw, bodyTopY);
          ctx.quadraticCurveTo(hw - 1.3, waistY, hw - 0.2, botY - 1.0);
          ctx.quadraticCurveTo(hw - 0.2, botY + 0.4, 0, botY + 0.4);
          ctx.quadraticCurveTo(-hw + 0.2, botY + 0.4, -hw + 0.2, botY - 1.0);
          ctx.quadraticCurveTo(-hw + 1.3, waistY, -hw, bodyTopY);
          ctx.quadraticCurveTo(-hw, shoulderTopY + 1.0, -hnw, shoulderTopY);
          ctx.closePath();
        } else if (shape === 'burgundy') {
          ctx.moveTo(-hnw, neckTopY);
          ctx.lineTo(hnw, neckTopY);
          ctx.lineTo(hnw, shoulderTopY);
          ctx.quadraticCurveTo(hw * 0.85, shoulderTopY + 2.2, hw, bodyTopY);
          ctx.lineTo(hw - 0.2, botY - 0.4);
          ctx.quadraticCurveTo(0, botY + 0.6, -hw + 0.2, botY - 0.4);
          ctx.lineTo(-hw, bodyTopY);
          ctx.quadraticCurveTo(-hw * 0.85, shoulderTopY + 2.2, -hnw, shoulderTopY);
          ctx.closePath();
        } else {
          ctx.moveTo(-hnw, neckTopY);
          ctx.lineTo(hnw, neckTopY);
          ctx.lineTo(hnw, shoulderTopY);
          ctx.quadraticCurveTo(hw, shoulderTopY + 0.6, hw, bodyTopY);
          ctx.lineTo(hw - 0.2, botY - 0.4);
          ctx.quadraticCurveTo(0, botY + 0.6, -hw + 0.2, botY - 0.4);
          ctx.lineTo(-hw, bodyTopY);
          ctx.quadraticCurveTo(-hw, shoulderTopY + 0.6, -hnw, shoulderTopY);
          ctx.closePath();
        }
      };

      const isOpaquePlastic = isSqueeze || (isPlastic && materialRgb[0] > 235 && materialRgb[1] > 235 && materialRgb[2] > 235);
      const baseAlpha = isOpaquePlastic ? 0.96 : isPlastic ? 0.68 : 0.78;

      const matGrad = ctx.createLinearGradient(-hw, neckTopY, hw, botY);
      matGrad.addColorStop(0, rgbTupleToCss(shiftRgbTuple(materialRgb, 28), Math.min(1, baseAlpha + 0.08)));
      matGrad.addColorStop(0.35, rgbTupleToCss(materialRgb, baseAlpha * 0.78));
      matGrad.addColorStop(0.75, rgbTupleToCss(shiftRgbTuple(materialRgb, -25), baseAlpha));
      matGrad.addColorStop(1, rgbTupleToCss(shiftRgbTuple(materialRgb, -55), Math.min(1, baseAlpha + 0.12)));

      ctx.fillStyle = matGrad;
      traceBottlePath();
      ctx.fill();

      // Dynamic liquid level clipped inside the bottle contour
      const maxCap = item?.fluidStorage?.maxMl || item?.fluidStorage?.capacityMl || (is1500 ? 1500 : is1000 ? 1000 : is750 ? 750 : 500);
      if (item?.fluidStorage && item.fluidStorage.currentMl > 0 && !isSqueeze) {
        const fillFrac = Math.min(1, item.fluidStorage.currentMl / maxCap);
        const totalInternalH = botY - shoulderTopY - 0.8;
        const fluidH = totalInternalH * fillFrac;
        const fluidTop = botY - fluidH - 0.3;

        const liqDef = item.fluidStorage.liquidId
          ? LIQUID_REGISTRY[item.fluidStorage.liquidId as LiquidId]
          : undefined;
        const fluidColor = item.fluidStorage.attributes?.customColor || liqDef?.color || '#38bdf8';

        ctx.save();
        traceBottlePath();
        ctx.clip();

        ctx.fillStyle = fluidColor;
        ctx.fillRect(-hw - 3, fluidTop, w + 6, fluidH + 1.5);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.32)';
        ctx.fillRect(-hw - 3, fluidTop, w + 6, 0.42);
        ctx.restore();
      }

      if (shape === 'square') {
        ctx.strokeStyle = rgbTupleToCss(shiftRgbTuple(materialRgb, 35), 0.55);
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(-hw + 1.2, bodyTopY - 0.3);
        ctx.lineTo(-hw + 1.2, botY - 0.4);
        ctx.moveTo(hw - 1.2, bodyTopY - 0.3);
        ctx.lineTo(hw - 1.2, botY - 0.4);
        ctx.stroke();
      } else if (shape === 'flask') {
        ctx.strokeStyle = rgbTupleToCss(shiftRgbTuple(materialRgb, -45), 0.45);
        ctx.lineWidth = 0.6;
        ctx.strokeRect(-hw + 1.3, bodyTopY, w - 2.6, botY - bodyTopY - 1.2);
      } else if (isPlastic && shape === 'pinched' && !isSqueeze) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.lineWidth = 0.65;
        ctx.beginPath();
        ctx.moveTo(-hw + 0.6, bodyTopY + 1.0);
        ctx.lineTo(hw - 0.6, bodyTopY + 1.0);
        ctx.moveTo(-hw + 0.6, botY - 2.0);
        ctx.lineTo(hw - 0.6, botY - 2.0);
        ctx.stroke();
      }

      if (!isPlastic) {
        ctx.fillStyle = rgbTupleToCss(shiftRgbTuple(materialRgb, -55), 0.55);
        ctx.beginPath();
        ctx.ellipse(0, botY - 0.5, hw - 1.0, 1.0, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Studio paper/film label colored dynamically by labelRgb
      const liqId = item?.fluidStorage?.liquidId;
      const isDropperBottle =
        is100 &&
        Boolean(
          liqId &&
            (String(liqId).startsWith('dye_') || liqId === 'botanical_extract' || liqId === 'essential_oil')
        );
      if (labelRgb) {
        const lblW = w - 1.2;
        const availH = botY - bodyTopY;
        const lblH = Math.max(3.4, availH * 0.48);
        const lblY = bodyTopY + (availH - lblH) * 0.48;

        drawStudioLabelPanel(ctx, -lblW / 2, lblY, lblW, lblH, {
          paperColor: '#f8f5ec',
          bandColor: rgbTupleToCss(labelRgb),
          accentColor: labelAccentRgb ? rgbTupleToCss(labelAccentRgb) : '#ca8a04',
          inkColor: '#1e293b',
          goldFoil: !isPlastic,
          hasBarcode: !isDropperBottle && lblW >= 6.6 && lblH >= 3.8,
          emblem: isDropperBottle ? 'none' : 'crest',
          cylindrical: true
        });

        if (isDropperBottle) {
          ctx.fillStyle = rgbTupleToCss(labelRgb);
          ctx.beginPath();
          ctx.moveTo(0, lblY + lblH * 0.42);
          ctx.bezierCurveTo(1.1, lblY + lblH * 0.72, 1.0, lblY + lblH * 0.88, 0, lblY + lblH * 0.88);
          ctx.bezierCurveTo(-1.0, lblY + lblH * 0.88, -1.1, lblY + lblH * 0.72, 0, lblY + lblH * 0.42);
          ctx.fill();
        }
      }

      // Fresnel glass/PET specular reflections
      drawGlossBand(ctx, -hw + 1.2, bodyTopY, 1.1, botY - bodyTopY - 0.8, 0.42);

      // Cap or Squeeze Dispenser Nozzle
      const finalCapRgb: [number, number, number] = capRgb || (isPlastic ? [2, 132, 199] : [148, 163, 184]);
      if (isSqueeze) {
        ctx.fillStyle = rgbTupleToCss(finalCapRgb);
        ctx.beginPath();
        ctx.moveTo(-1.8, neckTopY + 2.8);
        ctx.lineTo(0, neckTopY - 1.5);
        ctx.lineTo(1.8, neckTopY + 2.8);
        ctx.closePath();
        ctx.fill();
      } else if (isDropperBottle) {
        ctx.fillStyle = rgbTupleToCss(finalCapRgb);
        ctx.beginPath();
        ctx.roundRect(-hnw - 0.3, neckTopY - 0.8, neckW + 0.6, 1.8, 0.4);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-0.9, neckTopY - 0.8);
        ctx.lineTo(0, neckTopY - 2.6);
        ctx.lineTo(0.9, neckTopY - 0.8);
        ctx.closePath();
        ctx.fill();
      } else {
        drawScrewCap(ctx, 0, neckTopY - 1.2, neckW + 0.8, 2.3, rgbTupleToCss(finalCapRgb), true);
      }

      return true;
    }

    // Medical Tube / Ampoule / Aerosol Can
    case 'tube_ointment_small':
    case 'ampoule_glass_small':
    case 'aerosol_can_small': {
      drawShadow(ctx, 4.2, 1.8, 7.6, 0.22);
      const customC = item?.fluidStorage?.attributes?.customColor;

      if (itemId === 'tube_ointment_small') {
        const tGrad = ctx.createLinearGradient(-4.3, -4.5, 4.3, 6.5);
        tGrad.addColorStop(0.0, '#ffffff');
        tGrad.addColorStop(0.4, '#f1f5f9');
        tGrad.addColorStop(1.0, '#cbd5e1');
        ctx.fillStyle = tGrad;
        ctx.beginPath();
        ctx.moveTo(-4.3, 6.6);
        ctx.lineTo(-2.6, -4.4);
        ctx.lineTo(2.6, -4.4);
        ctx.lineTo(4.3, 6.6);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 0.35;
        ctx.stroke();

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(-4.3, 6.6);
        ctx.lineTo(-2.6, -4.4);
        ctx.lineTo(2.6, -4.4);
        ctx.lineTo(4.3, 6.6);
        ctx.closePath();
        ctx.clip();
        drawStudioLabelPanel(ctx, -3.7, -2.2, 7.4, 6.2, {
          paperColor: '#ffffff',
          bandColor: customC || '#16a34a',
          accentColor: '#cbd5e1',
          inkColor: '#0f172a',
          goldFoil: false,
          hasBarcode: true,
          emblem: 'diamond',
          cylindrical: true
        });
        applyCylinderLightingOverlay(ctx, -4.3, -4.4, 8.6, 11.0, 0.26, 0.24);
        ctx.restore();

        drawCrimpedSeal(ctx, -4.3, 5.4, 8.6, 1.35, '#94a3b8', true, 0.68);
        drawScrewCap(ctx, 0, -7.1, 3.2, 2.7, '#e2e8f0', false);
        return true;
      }

      if (itemId === 'ampoule_glass_small') {
        const gGrad = ctx.createLinearGradient(-2.6, -7.5, 2.6, 6.5);
        gGrad.addColorStop(0.0, 'rgba(224, 242, 254, 0.72)');
        gGrad.addColorStop(0.5, 'rgba(186, 230, 253, 0.35)');
        gGrad.addColorStop(1.0, 'rgba(148, 163, 184, 0.55)');
        ctx.fillStyle = gGrad;
        ctx.beginPath();
        ctx.roundRect(-2.5, -1.6, 5.0, 8.2, 1.4);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-1.3, -1.6);
        ctx.lineTo(-0.5, -5.2);
        ctx.lineTo(-0.9, -6.2);
        ctx.lineTo(0, -7.8);
        ctx.lineTo(0.9, -6.2);
        ctx.lineTo(0.5, -5.2);
        ctx.lineTo(1.3, -1.6);
        ctx.closePath();
        ctx.fill();

        if (item?.fluidStorage && item.fluidStorage.currentMl > 0) {
          ctx.fillStyle = customC || '#38bdf8';
          ctx.beginPath();
          ctx.roundRect(-2.0, 0.8, 4.0, 5.3, 0.9);
          ctx.fill();
          ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
          ctx.fillRect(-1.9, 0.8, 3.8, 0.45);
        }

        // Ceramic break-point neck ring
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(-1.1, -2.5, 2.2, 0.55);
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.arc(0, -3.4, 0.45, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 0.4;
        ctx.beginPath();
        ctx.roundRect(-2.5, -1.6, 5.0, 8.2, 1.4);
        ctx.stroke();
        drawGlossBand(ctx, -1.7, -1.0, 0.75, 6.8, 0.48);
        return true;
      }

      // Brushed Aluminum Medical Aerosol Canister
      const cGrad = ctx.createLinearGradient(-4.0, -3.8, 4.0, 7.0);
      cGrad.addColorStop(0.0, '#94a3b8');
      cGrad.addColorStop(0.28, '#ffffff');
      cGrad.addColorStop(0.65, '#e2e8f0');
      cGrad.addColorStop(1.0, '#64748b');
      ctx.fillStyle = cGrad;
      ctx.beginPath();
      ctx.roundRect(-4.0, -3.8, 8.0, 10.8, 1.2);
      ctx.fill();

      // Tapered aluminum dome shoulder
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(-3.9, -3.4);
      ctx.quadraticCurveTo(0, -5.6, 3.9, -3.4);
      ctx.closePath();
      ctx.fill();

      drawStudioLabelPanel(ctx, -3.9, -1.6, 7.8, 6.8, {
        paperColor: '#ffffff',
        bandColor: customC || '#ea580c',
        accentColor: '#0284c7',
        inkColor: '#0f172a',
        goldFoil: false,
        hasBarcode: true,
        emblem: 'circle',
        cylindrical: true
      });
      applyCylinderLightingOverlay(ctx, -4.0, -3.8, 8.0, 10.8, 0.28, 0.3);

      // Spray actuator nozzle cap
      drawScrewCap(ctx, 0, -6.9, 4.4, 2.8, '#f8fafc', false);
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(0.9, -5.8, 0.45, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    // Plastic Dairy Cups (Пластиковые стаканчики 0.2л и 0.4л + вскрытые)
    case 'cup_plastic_dairy_small':
    case 'cup_plastic_dairy_small_open':
    case 'cup_plastic_dairy_medium':
    case 'cup_plastic_dairy_medium_open': {
      const isMd = itemId.includes('medium');
      const isOpen = Boolean(item?.isOpen || item?.fluidStorage?.attributes?.isOpened || itemId.endsWith('_open'));
      const topW = isMd ? 11.2 : 9.2;
      const botW = isMd ? 8.4 : 6.8;
      const h = isMd ? 11.5 : 8.5;
      const topY = 7.0 - h;
      const botY = 7.0;

      drawShadow(ctx, topW * 0.56, 2.4, botY + 0.6, 0.24);

      // Tapered polypropylene cup body with cylinder shading
      const cupGrad = ctx.createLinearGradient(-topW / 2, topY, topW / 2, botY);
      cupGrad.addColorStop(0.0, '#cbd5e1');
      cupGrad.addColorStop(0.28, '#ffffff');
      cupGrad.addColorStop(0.75, '#f1f5f9');
      cupGrad.addColorStop(1.0, '#94a3b8');

      const traceCup = () => {
        ctx.beginPath();
        ctx.moveTo(-topW / 2, topY + 1.2);
        ctx.lineTo(topW / 2, topY + 1.2);
        ctx.lineTo(botW / 2, botY);
        ctx.quadraticCurveTo(0, botY + 0.7, -botW / 2, botY);
        ctx.closePath();
      };

      ctx.fillStyle = cupGrad;
      traceCup();
      ctx.fill();

      const stripeC = item?.fluidStorage?.attributes?.customColor || '#0284c7';
      ctx.save();
      traceCup();
      ctx.clip();
      drawStudioLabelPanel(ctx, -topW * 0.46, topY + h * 0.30, topW * 0.92, h * 0.48, {
        paperColor: '#f8fafc',
        bandColor: stripeC,
        accentColor: '#ca8a04',
        inkColor: '#1e293b',
        goldFoil: false,
        hasBarcode: isMd,
        emblem: 'leaf',
        cylindrical: true
      });
      applyCylinderLightingOverlay(ctx, -topW / 2, topY, topW, h, 0.22, 0.26);
      ctx.restore();

      // Thermoformed lip flange
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(0, topY + 1.2, topW / 2 + 0.45, 1.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 0.45;
      ctx.stroke();

      if (isOpen) {
        const hasDairyFluid = Boolean(item?.fluidStorage && item.fluidStorage.currentMl > 0);
        const liqDef = item?.fluidStorage?.liquidId
          ? LIQUID_REGISTRY[item.fluidStorage.liquidId as LiquidId]
          : undefined;
        const innerC = hasDairyFluid
          ? item?.fluidStorage?.attributes?.customColor || liqDef?.color || '#fef9c3'
          : '#334155';
        ctx.fillStyle = innerC;
        ctx.beginPath();
        ctx.ellipse(0, topY + 1.2, topW / 2 - 0.5, 1.15, 0, 0, Math.PI * 2);
        ctx.fill();
        // Peeled back foil lid tab
        const foilTabGrad = ctx.createLinearGradient(0, topY - 1.5, topW * 0.6, topY + 0.5);
        foilTabGrad.addColorStop(0, '#f8fafc');
        foilTabGrad.addColorStop(1, '#94a3b8');
        ctx.fillStyle = foilTabGrad;
        ctx.beginPath();
        ctx.ellipse(topW * 0.36, topY - 0.55, 2.3, 1.15, -0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 0.3;
        ctx.stroke();
      } else {
        const lidGrad = ctx.createLinearGradient(-topW / 2, topY, topW / 2, topY + 2);
        lidGrad.addColorStop(0.0, '#cbd5e1');
        lidGrad.addColorStop(0.4, '#ffffff');
        lidGrad.addColorStop(1.0, '#94a3b8');
        ctx.fillStyle = lidGrad;
        ctx.beginPath();
        ctx.ellipse(0, topY + 1.15, topW / 2 + 0.1, 1.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = stripeC;
        ctx.beginPath();
        ctx.ellipse(0, topY + 1.15, topW * 0.25, 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      return true;
    }

    // Small Tetra Pak (Тетрапак 0.25л)
    case 'tetra_pack_250':
    case 'tetra_pack_250_open': {
      drawShadow(ctx, 4.8, 2.0, 7.6, 0.24);
      const isOpen = Boolean(item?.isOpen || item?.fluidStorage?.attributes?.isOpened || itemId === 'tetra_pack_250_open');
      const mainC = item?.fluidStorage?.attributes?.customColor || '#ea580c';

      // Front face
      const fGrad = ctx.createLinearGradient(-4.0, -4.8, 3.0, 7.0);
      fGrad.addColorStop(0, mainC);
      fGrad.addColorStop(1, '#9a3412');
      ctx.fillStyle = fGrad;
      ctx.beginPath();
      ctx.roundRect(-4.0, -4.6, 6.8, 11.6, 0.8);
      ctx.fill();

      // Side bevel shadow face
      ctx.fillStyle = 'rgba(15, 23, 42, 0.28)';
      ctx.beginPath();
      ctx.moveTo(2.4, -4.6);
      ctx.lineTo(4.0, -3.9);
      ctx.lineTo(4.0, 6.3);
      ctx.lineTo(2.4, 7.0);
      ctx.closePath();
      ctx.fill();

      // Top foil heat crease
      ctx.fillStyle = 'rgba(255, 255, 255, 0.32)';
      ctx.fillRect(-3.8, -4.6, 6.4, 0.65);

      drawStudioLabelPanel(ctx, -3.4, -2.4, 5.6, 7.6, {
        paperColor: '#fffbeb',
        bandColor: mainC,
        accentColor: '#ca8a04',
        inkColor: '#1e293b',
        goldFoil: false,
        hasBarcode: true,
        emblem: 'circle',
        cylindrical: false
      });

      if (isOpen) {
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.ellipse(1.4, -4.2, 1.0, 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Folded foil straw pouch on side/top
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(-0.6, 1.1, 1.1, 0, Math.PI * 2);
        ctx.fill();
      }
      return true;
    }

    // Seasoning Sachet / Detergent Sachet (Пакетик-саше 100мл)
    case 'package_sachet':
    case 'package_sachet_open': {
      drawShadow(ctx, 4.6, 2.2, 7.5, 0.2);
      const customC = item?.fluidStorage?.attributes?.customColor || '#dc2626';
      const secC = item?.fluidStorage?.attributes?.secondaryColor;
      const sLiqId = item?.fluidStorage?.liquidId;
      const bandCol = sLiqId === 'detergent' ? (secC || '#0284c7') : customC;
      const isOpen = Boolean(item?.isOpen || item?.fluidStorage?.attributes?.isOpened || itemId === 'package_sachet_open');

      const foilGrad = ctx.createLinearGradient(-4.3, -5.6, 4.3, 6.6);
      foilGrad.addColorStop(0.0, '#ffffff');
      foilGrad.addColorStop(0.45, '#e2e8f0');
      foilGrad.addColorStop(1.0, '#94a3b8');
      ctx.fillStyle = foilGrad;
      ctx.beginPath();
      ctx.roundRect(-4.3, -5.6, 8.6, 12.2, 0.8);
      ctx.fill();

      drawCrimpedSeal(ctx, -4.3, 5.1, 8.6, 1.5, '#cbd5e1', true, 0.65);
      if (isOpen) {
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.ellipse(0, -4.9, 3.1, 0.9, 0, 0, Math.PI * 2);
        ctx.fill();
        if (item?.fluidStorage && item.fluidStorage.currentMl > 0) {
          const innerCol = customC || (sLiqId && LIQUID_REGISTRY[sLiqId as LiquidId]?.color) || '#fef9c3';
          ctx.fillStyle = innerCol;
          ctx.beginPath();
          ctx.ellipse(0, -4.8, 2.1, 0.55, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        drawCrimpedSeal(ctx, -4.3, -5.6, 8.6, 1.4, '#cbd5e1', true, 0.65);
      }

      drawStudioLabelPanel(ctx, -3.5, -2.8, 7.0, 6.6, {
        paperColor: '#f8fafc',
        bandColor: bandCol,
        accentColor: sLiqId === 'detergent' ? '#38bdf8' : '#ca8a04',
        inkColor: '#0f172a',
        goldFoil: false,
        hasBarcode: true,
        emblem: 'none',
        cylindrical: false
      });

      // Crystal / gel / spice / detergent emblem
      ctx.fillStyle = bandCol;
      if (sLiqId === 'detergent') {
        // Stylized washing drum & soap bubble emblem
        ctx.strokeStyle = bandCol;
        ctx.lineWidth = 0.55;
        ctx.beginPath();
        ctx.arc(0, 1.0, 1.25, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = customC;
        ctx.beginPath();
        ctx.arc(0, 1.0, 0.72, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(1.15, -0.1, 0.35, 0, Math.PI * 2);
        ctx.fill();
      } else if (sLiqId === 'citric_acid' || sLiqId === 'malic_acid' || sLiqId === 'tartaric_acid' || sLiqId === 'sodium_citrate') {
        ctx.beginPath();
        ctx.moveTo(0, -0.3);
        ctx.lineTo(1.2, 1.0);
        ctx.lineTo(0, 2.3);
        ctx.lineTo(-1.2, 1.0);
        ctx.closePath();
        ctx.fill();
      } else if (sLiqId === 'gelatin' || sLiqId === 'pectin' || sLiqId === 'agar_agar') {
        ctx.beginPath();
        ctx.moveTo(0, -0.3);
        ctx.bezierCurveTo(1.2, 1.0, 1.1, 2.2, 0, 2.2);
        ctx.bezierCurveTo(-1.1, 2.2, -1.2, 1.0, 0, -0.3);
        ctx.fill();
      } else {
        ctx.fillRect(-1.8, 0.6, 3.6, 0.75);
      }

      drawPouchCrinkles(ctx, -3.8, -4.0, 7.6, 8.5, 29, 0.24);
      return true;
    }

    // Clay Pots (Глиняные горшочки 0.25л, 0.5л, 1.0л + открытые)
    case 'pot_clay_small':
    case 'pot_clay_small_open':
    case 'pot_clay_medium':
    case 'pot_clay_medium_open':
    case 'pot_clay_large':
    case 'pot_clay_large_open': {
      const isSm = itemId.includes('small');
      const isLg = itemId.includes('large');
      const isOpen = Boolean(item?.isOpen || item?.fluidStorage?.attributes?.isOpened || itemId.endsWith('_open'));
      const scale = isLg ? 1.18 : isSm ? 0.82 : 1.0;

      ctx.save();
      ctx.scale(scale, scale);
      drawShadow(ctx, 6.5, 2.8, 7.8, 0.28);

      const clayGrad = ctx.createLinearGradient(-6.5, -4, 6.5, 7);
      clayGrad.addColorStop(0.0, '#f97316');
      clayGrad.addColorStop(0.32, '#c2410c');
      clayGrad.addColorStop(0.75, '#9a3412');
      clayGrad.addColorStop(1.0, '#431407');

      ctx.fillStyle = clayGrad;
      ctx.beginPath();
      ctx.moveTo(-4.5, -3.5);
      ctx.quadraticCurveTo(-7.6, 1.0, -5.5, 6.5);
      ctx.quadraticCurveTo(0, 8.1, 5.5, 6.5);
      ctx.quadraticCurveTo(7.6, 1.0, 4.5, -3.5);
      ctx.closePath();
      ctx.fill();

      // Ceramic shoulder turnings
      ctx.strokeStyle = 'rgba(67, 20, 7, 0.35)';
      ctx.lineWidth = 0.35;
      ctx.beginPath();
      ctx.moveTo(-5.8, 0.5);
      ctx.quadraticCurveTo(0, 1.5, 5.8, 0.5);
      ctx.stroke();

      // Wide flared glazed lip
      ctx.fillStyle = '#7c2d12';
      ctx.beginPath();
      ctx.ellipse(0, -3.8, 5.6, 1.85, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(253, 186, 116, 0.45)';
      ctx.lineWidth = 0.35;
      ctx.stroke();

      if (!isOpen) {
        // Tied waxed parchment cloth cover with twine
        const clothGrad = ctx.createLinearGradient(-4.8, -6.0, 4.8, -3.2);
        clothGrad.addColorStop(0.0, '#fef3c7');
        clothGrad.addColorStop(0.6, '#fde68a');
        clothGrad.addColorStop(1.0, '#d97706');
        ctx.fillStyle = clothGrad;
        ctx.beginPath();
        ctx.roundRect(-4.9, -5.8, 9.8, 2.5, 0.8);
        ctx.fill();
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(-4.8, -3.7);
        ctx.lineTo(4.8, -3.7);
        ctx.stroke();
      } else {
        const innerC =
          item?.fluidStorage && item.fluidStorage.currentMl > 0
            ? item.fluidStorage.attributes?.customColor || '#f59e0b'
            : '#1c1917';
        ctx.fillStyle = innerC;
        ctx.beginPath();
        ctx.ellipse(0, -3.8, 4.5, 1.35, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      drawGlossBand(ctx, -4.4, -1.0, 1.15, 6.4, 0.34);
      ctx.restore();
      return true;
    }

    // Pill Blister Pack (Блистер для таблеток 10 ячеек: целый, начатый или пустой)
    case 'blister_pack_10':
    case 'blister_pack_empty': {
      drawShadow(ctx, 7.0, 3.5, 7.6, 0.24);
      const hasContentsArray = Array.isArray(item?.contents);
      const isEmpty = itemId === 'blister_pack_empty' || (hasContentsArray && item!.contents!.length === 0);

      // Brushed aluminum backing sheet
      const bGrad = ctx.createLinearGradient(-5.6, -7.6, 5.6, 7.6);
      bGrad.addColorStop(0.0, '#f8fafc');
      bGrad.addColorStop(0.4, item?.containerTintColor || '#cbd5e1');
      bGrad.addColorStop(1.0, '#94a3b8');
      ctx.fillStyle = bGrad;
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.roundRect(-5.6, -7.6, 11.2, 15.2, 1.1);
      ctx.fill();
      ctx.stroke();

      // Subtle cross-hatched foil score texture
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.16)';
      ctx.lineWidth = 0.22;
      for (let y = -6.2; y <= 6.2; y += 1.6) {
        ctx.beginPath();
        ctx.moveTo(-5.0, y);
        ctx.lineTo(5.0, y);
        ctx.stroke();
      }

      if (item?.labelColor) {
        ctx.fillStyle = item.labelColor;
        ctx.fillRect(-5.3, -7.3, 10.6, 1.25);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
        ctx.fillRect(-3.6, -6.9, 7.2, 0.38);
      }

      const validPills = hasContentsArray
        ? item!.contents!.filter((inner: any) => inner && inner.itemId && !inner.itemId.startsWith('blister_pack'))
        : [];
      const remCount = isEmpty ? 0 : Math.min(10, validPills.length);
      let idx = 0;
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 2; c++) {
          const px = c === 0 ? -2.4 : 2.4;
          const py = -4.8 + r * 2.45;
          if (idx < remCount) {
            const inner = validPills[idx];
            const innerId = inner?.itemId || '';

            // Raised PVC blister pocket shadow
            ctx.fillStyle = 'rgba(15, 23, 42, 0.22)';
            ctx.beginPath();
            ctx.ellipse(px + 0.22, py + 0.28, 1.65, 1.08, 0, 0, Math.PI * 2);
            ctx.fill();

            if (innerId.includes('patch')) {
              ctx.fillStyle = '#fde68a';
              ctx.beginPath();
              ctx.roundRect(px - 1.5, py - 0.8, 3.0, 1.6, 0.45);
              ctx.fill();
              ctx.fillStyle = '#f8fafc';
              ctx.fillRect(px - 0.6, py - 0.5, 1.2, 1.0);
            } else if (innerId.includes('pill_') || innerId === 'painkillers' || innerId === 'antipyretic' || innerId === 'activated_charcoal' || innerId === 'vitamins') {
              const slotColor = innerId.includes('charcoal')
                ? '#18181b'
                : innerId.includes('vitamin')
                ? '#f59e0b'
                : innerId.includes('antipyretic')
                ? '#38bdf8'
                : innerId.includes('painkiller')
                ? '#ef4444'
                : item?.labelColor || '#f8fafc';
              drawLitEllipse(ctx, px, py, 1.48, 0.95, 0, '#ffffff', slotColor, '#334155', undefined, 0.3);
            } else {
              drawItemModel2D(ctx, innerId, px, py, 3.4, inner, true);
            }

            // Dome specular arc
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.78)';
            ctx.lineWidth = 0.32;
            ctx.beginPath();
            ctx.ellipse(px - 0.35, py - 0.28, 0.85, 0.42, -0.2, Math.PI, Math.PI * 2);
            ctx.stroke();
          } else {
            // Punctured dark foil cavity with torn silver burr
            ctx.fillStyle = '#334155';
            ctx.beginPath();
            ctx.ellipse(px, py, 1.45, 0.92, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#f8fafc';
            ctx.beginPath();
            ctx.moveTo(px + 0.1, py);
            ctx.lineTo(px + 1.45, py - 0.55);
            ctx.lineTo(px + 1.1, py + 0.85);
            ctx.closePath();
            ctx.fill();
          }
          idx++;
        }
      }
      return true;
    }

    // Egg Cartons (Картонная ячейка для 10 яиц, открытая ячейка, перепелиный блистер)
    case 'egg_carton_10':
    case 'egg_carton_10_open':
    case 'egg_carton_quail_18': {
      drawShadow(ctx, 9.6, 4.0, 7.6, 0.26);
      const isQuail = itemId === 'egg_carton_quail_18';
      const isOpen = Boolean(item?.isOpen) || itemId === 'egg_carton_10_open' || isQuail;

      const pulpGrad = ctx.createLinearGradient(-8.6, -5.2, 8.6, 5.2);
      pulpGrad.addColorStop(0.0, item?.containerTintColor || (isQuail ? 'rgba(241, 245, 249, 0.82)' : '#e7e5e4'));
      pulpGrad.addColorStop(0.55, isQuail ? 'rgba(203, 213, 225, 0.72)' : '#d6d3d1');
      pulpGrad.addColorStop(1.0, isQuail ? 'rgba(148, 163, 184, 0.72)' : '#a8a29e');
      ctx.fillStyle = pulpGrad;
      ctx.strokeStyle = '#78716c';
      ctx.lineWidth = 0.55;
      ctx.beginPath();
      ctx.roundRect(-8.6, -5.1, 17.2, 10.2, 1.4);
      ctx.fill();
      ctx.stroke();

      if (!isOpen) {
        // Molded carton clasp lugs along front edge
        ctx.fillStyle = '#a8a29e';
        ctx.fillRect(-5.0, 4.2, 2.2, 0.9);
        ctx.fillRect(2.8, 4.2, 2.2, 0.9);

        drawStudioLabelPanel(ctx, -6.2, -3.2, 12.4, 6.4, {
          paperColor: '#fffbeb',
          bandColor: item?.labelColor || '#b45309',
          accentColor: '#ca8a04',
          inkColor: '#1c1917',
          goldFoil: false,
          hasBarcode: true,
          emblem: 'circle',
          cylindrical: false
        });
      } else {
        const maxCells = isQuail ? 18 : 10;
        for (let i = 0; i < maxCells; i++) {
          const ex = isQuail ? -6.4 + (i % 6) * 2.56 : -6.0 + (i % 5) * 3.0;
          const ey = isQuail ? -2.85 + Math.floor(i / 6) * 2.85 : Math.floor(i / 5) === 0 ? -2.2 : 2.2;
          ctx.fillStyle = 'rgba(68, 64, 60, 0.42)';
          ctx.beginPath();
          ctx.ellipse(ex, ey, isQuail ? 0.95 : 1.25, isQuail ? 1.12 : 1.45, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        const validEggs = (Array.isArray(item?.contents) ? item.contents : []).filter(
          (inner: any) => inner && inner.itemId && !inner.itemId.startsWith('egg_carton')
        );
        const count = Math.min(maxCells, validEggs.length);
        for (let i = 0; i < count; i++) {
          const inner = validEggs[i];
          const innerId = inner.itemId;
          const ex = isQuail ? -6.4 + (i % 6) * 2.56 : -6.0 + (i % 5) * 3.0;
          const ey = isQuail ? -2.85 + Math.floor(i / 6) * 2.85 : Math.floor(i / 5) === 0 ? -2.2 : 2.2;
          if (innerId === 'egg_quail_single' || innerId === 'eggs_quail') {
            drawLitEllipse(ctx, ex, ey, 0.96, 1.18, 0, '#ffffff', '#e7e5e4', '#a8a29e', undefined, 0.25);
            ctx.fillStyle = '#44403c';
            ctx.fillRect(ex - 0.38, ey - 0.32, 0.42, 0.42);
            ctx.fillRect(ex + 0.18, ey + 0.22, 0.38, 0.38);
          } else if (innerId === 'egg_chicken_single' || innerId === 'eggs_chicken' || innerId.includes('egg')) {
            drawLitEllipse(
              ctx, ex, ey, isQuail ? 1.0 : 1.25, isQuail ? 1.2 : 1.55, 0,
              '#ffedd5', '#fdba74', '#c2410c', undefined, 0.25
            );
          } else {
            drawItemModel2D(ctx, innerId, ex, ey, isQuail ? 3.0 : 3.8, inner, true);
          }
        }
        if (isQuail) {
          drawGlossBand(ctx, -7.2, -4.5, 2.2, 9.0, 0.24);
        }
      }
      return true;
    }

    // Takeout Cardboard Box (Коробочка WOK / попкорн)
    case 'takeout_box_wok': {
      drawShadow(ctx, 7.0, 3.5, 7.6, 0.26);
      const isOpen = Boolean(item?.isOpen);
      const baseHex = item?.containerTintColor || '#b91c1c';

      const wGrad = ctx.createLinearGradient(-6.8, -5.5, 6.8, 6.8);
      wGrad.addColorStop(0.0, baseHex);
      wGrad.addColorStop(0.65, '#991b1b');
      wGrad.addColorStop(1.0, '#450a0a');
      ctx.fillStyle = wGrad;
      ctx.beginPath();
      ctx.moveTo(-6.8, -5.2);
      ctx.lineTo(6.8, -5.2);
      ctx.lineTo(5.4, 6.8);
      ctx.lineTo(-5.4, 6.8);
      ctx.closePath();
      ctx.fill();

      // Origami side pleat crease lines
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.28)';
      ctx.lineWidth = 0.45;
      ctx.beginPath();
      ctx.moveTo(-6.8, -5.2);
      ctx.lineTo(-4.6, 6.8);
      ctx.moveTo(6.8, -5.2);
      ctx.lineTo(4.6, 6.8);
      ctx.stroke();

      drawStudioLabelPanel(ctx, -4.4, -2.5, 8.8, 6.8, {
        paperColor: item?.labelColor || '#fef3c7',
        bandColor: baseHex,
        accentColor: '#ca8a04',
        inkColor: '#450a0a',
        goldFoil: true,
        hasBarcode: true,
        emblem: 'circle',
        cylindrical: false
      });

      if (isOpen) {
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.roundRect(-5.6, -5.2, 11.2, 2.2, 0.5);
        ctx.fill();

        const validWok = (Array.isArray(item?.contents) ? item.contents : []).filter(
          (inner: any) => inner && inner.itemId && inner.itemId !== 'takeout_box_wok'
        );
        if (validWok.length > 0) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(-5.6, -8.5, 11.2, 4.6);
          ctx.clip();
          const wokSlots: Array<[number, number, number]> =
            validWok.length === 1
              ? [[0, -5.3, 7.2]]
              : validWok.length === 2
              ? [[-2.0, -5.2, 6.2], [2.0, -5.2, 6.2]]
              : [
                  [-3.1, -5.2, 5.4],
                  [0, -5.6, 5.8],
                  [3.1, -5.1, 5.4],
                  [-1.6, -6.1, 5.0],
                  [1.6, -6.0, 5.0]
                ];
          const showWok = Math.min(wokSlots.length, validWok.length);
          for (let i = 0; i < showWok; i++) {
            const inner = validWok[i];
            const [wx, wy, wsz] = wokSlots[i];
            drawItemModel2D(ctx, inner.itemId, wx, wy, wsz, inner, true);
          }
          ctx.restore();
        }
      } else {
        // Interlocking top pagoda flaps
        ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
        ctx.beginPath();
        ctx.moveTo(-6.8, -5.2);
        ctx.lineTo(0, -6.5);
        ctx.lineTo(6.8, -5.2);
        ctx.closePath();
        ctx.fill();
      }
      return true;
    }

    // Single-use Vacuum Sealed Pouches & Produce Mesh Bags (Целые и вскрытые)
    case 'pouch_vacuum_sealed':
    case 'vacuum_pack_small':
    case 'vacuum_pack_medium':
    case 'vacuum_pack_large':
    case 'mesh_bag_produce':
    case 'pouch_torn_meat':
    case 'mesh_bag_torn':
    case 'vacuum_pack_small_torn':
    case 'vacuum_pack_medium_torn':
    case 'vacuum_pack_large_torn': {
      const isLg = itemId.includes('large') || item?.packagingSize === 'large';
      const isMd = itemId.includes('medium') || itemId === 'pouch_vacuum_sealed' || item?.packagingSize === 'medium';
      const isMesh = itemId.startsWith('mesh_bag');
      const w = isLg ? 10.6 : (isMd ? 8.8 : 7.4);
      const h = isLg ? 14.8 : (isMd ? 12.4 : 10.4);
      const isOpen = Boolean(item?.isOpen) || itemId.includes('_torn');

      drawShadow(ctx, w, h * (isOpen ? 0.25 : 0.35), isOpen ? 5.6 : 8.0, isOpen ? 0.18 : 0.24);

      const validVacuum = (Array.isArray(item?.contents) ? item.contents : []).filter(
        (inner: any) =>
          inner &&
          inner.itemId &&
          inner.itemId !== itemId &&
          !inner.itemId.startsWith('vacuum_pack_') &&
          !inner.itemId.startsWith('pouch_vacuum') &&
          !inner.itemId.startsWith('mesh_bag')
      );
      if (validVacuum.length > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(-w + 0.6, -h / 2 + (isOpen ? 2.2 : 0.8), w * 2 - 1.2, h - (isOpen ? 2.8 : 1.6), 1.0);
        ctx.clip();
        if (validVacuum.length === 1) {
          drawItemModel2D(ctx, validVacuum[0].itemId, 0, 0.4, 15.5, validVacuum[0], true);
        } else {
          const vacSlots: Array<[number, number, number]> =
            validVacuum.length === 2
              ? [[-w * 0.28, -1.2, 10.2], [w * 0.28, 1.5, 10.2]]
              : [
                  [-w * 0.34, -h * 0.2, 7.8],
                  [w * 0.34, -h * 0.18, 7.8],
                  [-w * 0.32, h * 0.16, 7.8],
                  [w * 0.32, h * 0.18, 7.8],
                  [0, -h * 0.02, 7.6],
                  [0, h * 0.28, 7.4]
                ];
          const showVac = Math.min(vacSlots.length, validVacuum.length);
          for (let i = 0; i < showVac; i++) {
            const inner = validVacuum[i];
            const [vx, vy, vsz] = vacSlots[i];
            drawItemModel2D(ctx, inner.itemId, vx, vy, vsz, inner, true);
          }
        }
        ctx.restore();
      }

      const traceBag = () => {
        ctx.beginPath();
        if (!isOpen) {
          ctx.roundRect(-w, -h / 2, w * 2, h, isMesh ? 2.2 : 1.0);
        } else {
          ctx.moveTo(-w, h / 2);
          ctx.lineTo(-w + 0.8, -h / 2 + 2.8);
          ctx.lineTo(-w * 0.4, -h / 2 + 1.0);
          ctx.lineTo(0, -h / 2 + 2.2);
          ctx.lineTo(w * 0.45, -h / 2 + 0.9);
          ctx.lineTo(w - 0.8, -h / 2 + 2.4);
          ctx.lineTo(w, h / 2);
          ctx.closePath();
        }
      };

      ctx.save();
      traceBag();
      ctx.clip();

      if (isMesh) {
        ctx.fillStyle = 'rgba(234, 88, 12, 0.16)';
        ctx.fillRect(-w, -h / 2, w * 2, h);
        // Diamond mesh weave
        ctx.strokeStyle = 'rgba(234, 88, 12, 0.62)';
        ctx.lineWidth = 0.38;
        for (let d = -w - h; d <= w + h; d += 2.2) {
          ctx.beginPath();
          ctx.moveTo(d, -h / 2);
          ctx.lineTo(d + h, h / 2);
          ctx.moveTo(d + h, -h / 2);
          ctx.lineTo(d, h / 2);
          ctx.stroke();
        }
      } else {
        // High-barrier clear vacuum PA/PE film sheen
        const fGrad = ctx.createLinearGradient(-w, -h / 2, w, h / 2);
        fGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.36)');
        fGrad.addColorStop(0.35, 'rgba(226, 232, 240, 0.14)');
        fGrad.addColorStop(0.65, 'rgba(255, 255, 255, 0.30)');
        fGrad.addColorStop(1.0, 'rgba(148, 163, 184, 0.25)');
        ctx.fillStyle = fGrad;
        ctx.fillRect(-w, -h / 2, w * 2, h);

        // Micro-embossed vacuum heat-seal flange border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 0.7;
        ctx.strokeRect(-w + 0.55, -h / 2 + 0.55, w * 2 - 1.1, h - 1.1);
        drawPouchCrinkles(ctx, -w * 0.8, -h * 0.4, w * 1.6, h * 0.8, 37, 0.22);
      }
      ctx.restore();

      ctx.strokeStyle = isMesh ? 'rgba(234, 88, 12, 0.75)' : 'rgba(148, 163, 184, 0.72)';
      ctx.lineWidth = 0.55;
      traceBag();
      ctx.stroke();

      // Deli butcher sticker + barcode
      if (item?.labelColor || !isMesh) {
        drawStudioLabelPanel(ctx, -w * 0.55, h * 0.08, w * 1.1, Math.max(3.6, h * 0.28), {
          paperColor: '#f8fafc',
          bandColor: item?.labelColor || '#991b1b',
          accentColor: '#ca8a04',
          inkColor: '#0f172a',
          goldFoil: false,
          hasBarcode: true,
          emblem: 'none',
          cylindrical: false
        });
      }
      return true;
    }

    // Sealed & Opened Food Tray (Пищевой подложка-лоток под запайку и вскрытый)
    case 'tray_plastic_sealed':
    case 'tray_sealed_food':
    case 'tray_plastic_empty':
    case 'tray_sealed_food_torn': {
      const isOpen = Boolean(item?.isOpen) || itemId === 'tray_plastic_empty' || itemId === 'tray_sealed_food_torn';
      drawShadow(ctx, 10.0, isOpen ? 4.5 : 5.0, isOpen ? 7.0 : 8.0, isOpen ? 0.24 : 0.3);

      const trayHex = item?.containerTintColor || '#18181b';
      const trayGrad = ctx.createLinearGradient(-9.5, -6.5, 9.5, 6.5);
      trayGrad.addColorStop(0.0, '#3f3f46');
      trayGrad.addColorStop(0.5, trayHex);
      trayGrad.addColorStop(1.0, '#09090b');
      ctx.fillStyle = trayGrad;
      ctx.beginPath();
      ctx.roundRect(-9.5, -6.5, 19.0, 13.0, 1.8);
      ctx.fill();

      // Thermoformed rim highlight bevel
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.lineWidth = 0.45;
      ctx.beginPath();
      ctx.roundRect(-9.1, -6.1, 18.2, 12.2, 1.5);
      ctx.stroke();

      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.roundRect(-8.2, -5.2, 16.4, 10.4, 1.2);
      ctx.fill();

      // Floor stiffening ribs
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 0.45;
      for (const rx of [-4.2, 0, 4.2]) {
        ctx.beginPath();
        ctx.moveTo(rx, -4.4);
        ctx.lineTo(rx, 4.4);
        ctx.stroke();
      }

      const validTray = (Array.isArray(item?.contents) ? item.contents : []).filter(
        (inner: any) =>
          inner &&
          inner.itemId &&
          inner.itemId !== itemId &&
          !inner.itemId.startsWith('tray_sealed') &&
          !inner.itemId.startsWith('tray_plastic')
      );
      if (validTray.length > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(-8.0, -5.0, 16.0, 10.0, 1.0);
        ctx.clip();
        if (validTray.length === 1) {
          drawItemModel2D(ctx, validTray[0].itemId, 0, 0, 15, validTray[0], true);
        } else {
          const traySlots: Array<[number, number, number]> =
            validTray.length === 2
              ? [[-3.4, 0, 9.8], [3.4, 0, 9.8]]
              : [
                  [-4.4, -2.0, 6.8],
                  [0, -2.1, 6.8],
                  [4.4, -2.0, 6.8],
                  [-4.4, 2.0, 6.8],
                  [0, 2.1, 6.8],
                  [4.4, 2.0, 6.8]
                ];
          const showTray = Math.min(traySlots.length, validTray.length);
          for (let i = 0; i < showTray; i++) {
            const inner = validTray[i];
            const [tx, ty, tsz] = traySlots[i];
            drawItemModel2D(ctx, inner.itemId, tx, ty, tsz, inner, true);
          }
        }
        ctx.restore();
      }

      if (!isOpen) {
        // Intact taut barrier film with crisp softbox gloss diagonal
        const filmGrad = ctx.createLinearGradient(-8.2, -5.2, 8.2, 5.2);
        filmGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.06)');
        filmGrad.addColorStop(0.32, 'rgba(255, 255, 255, 0.28)');
        filmGrad.addColorStop(0.45, 'rgba(255, 255, 255, 0.04)');
        filmGrad.addColorStop(1.0, 'rgba(255, 255, 255, 0.14)');
        ctx.fillStyle = filmGrad;
        ctx.beginPath();
        ctx.roundRect(-8.2, -5.2, 16.4, 10.4, 1.2);
        ctx.fill();
      } else {
        // Curled peeled-back cellophane corner
        ctx.fillStyle = 'rgba(241, 245, 249, 0.34)';
        ctx.beginPath();
        ctx.moveTo(3.6, -5.2);
        ctx.lineTo(8.2, -5.2);
        ctx.lineTo(8.2, 1.4);
        ctx.quadraticCurveTo(5.8, -1.5, 3.6, -5.2);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.lineWidth = 0.35;
        ctx.stroke();
      }

      // Deli label sticker on tray corner
      drawStudioLabelPanel(ctx, 2.0, 1.2, 5.8, 3.8, {
        paperColor: '#f8fafc',
        bandColor: item?.labelColor || '#991b1b',
        accentColor: '#ca8a04',
        inkColor: '#0f172a',
        goldFoil: false,
        hasBarcode: true,
        emblem: 'none',
        cylindrical: false
      });
      return true;
    }

    // Sealed & Torn Snack Doypack Pouch (Герметичный и вскрытый пакет-дойпак)
    case 'pouch_sealed_snack':
    case 'pouch_torn_snack':
    case 'pouch_sealed_snack_torn': {
      const isOpen = Boolean(item?.isOpen) || itemId === 'pouch_torn_snack' || itemId === 'pouch_sealed_snack_torn';
      const baseTint = item?.containerTintColor || '#b45309';
      const bandColor = item?.labelColor || '#1e293b';
      drawShadow(ctx, isOpen ? 7.5 : 8.0, isOpen ? 3.0 : 3.5, isOpen ? 6.0 : 7.5, isOpen ? 0.2 : 0.25);

      const pouchGrad = ctx.createLinearGradient(-6.2, -7.5, 6.2, 7.5);
      pouchGrad.addColorStop(0.0, '#f8fafc');
      pouchGrad.addColorStop(0.25, baseTint);
      pouchGrad.addColorStop(0.85, baseTint);
      pouchGrad.addColorStop(1.0, '#475569');

      if (!isOpen) {
        ctx.fillStyle = pouchGrad;
        ctx.beginPath();
        ctx.roundRect(-6.0, -7.5, 12.0, 15.0, 1.2);
        ctx.fill();

        drawCrimpedSeal(ctx, -6.0, -7.5, 12.0, 1.5, bandColor, true, 0.72);
        // Tear notch & zip-lock track
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.lineWidth = 0.3;
        ctx.beginPath();
        ctx.moveTo(-5.8, -5.5);
        ctx.lineTo(5.8, -5.5);
        ctx.stroke();

        drawFilmWindow(
          ctx,
          () => {
            ctx.beginPath();
            ctx.ellipse(0, 0.6, 4.1, 3.0, 0, 0, Math.PI * 2);
          },
          () => {
            const validSnack = (Array.isArray(item?.contents) ? item.contents : []).filter(
              (inner: any) =>
                inner &&
                inner.itemId &&
                inner.itemId !== itemId &&
                !inner.itemId.startsWith('pouch_sealed_snack') &&
                !inner.itemId.startsWith('pouch_torn_snack')
            );
            if (validSnack.length === 1) {
              drawItemModel2D(ctx, validSnack[0].itemId, 0, 0.6, 12.5, validSnack[0], true);
            } else if (validSnack.length > 1) {
              const snackSlots: Array<[number, number, number]> =
                validSnack.length === 2
                  ? [[-1.6, 0.5, 8.2], [1.6, 0.7, 8.2]]
                  : [
                      [-1.8, -0.3, 6.8],
                      [1.8, -0.2, 6.8],
                      [-1.5, 1.7, 6.8],
                      [1.6, 1.6, 6.8],
                      [0, 0.6, 7.0]
                    ];
              const showSnack = Math.min(snackSlots.length, validSnack.length);
              for (let i = 0; i < showSnack; i++) {
                const inner = validSnack[i];
                const [sx, sy, ssz] = snackSlots[i];
                drawItemModel2D(ctx, inner.itemId, sx, sy, ssz, inner, true);
              }
            }
          },
          'rgba(255, 255, 255, 0.65)',
          '#0f172a'
        );

        drawPouchCrinkles(ctx, -5.4, -5.0, 10.8, 11.5, 43, 0.2);
        drawMicroBarcode(ctx, 1.8, 5.2, 3.4, 1.3);
        return true;
      }

      // Opened / Torn Snack Doypack with inner silver metallized lining
      ctx.fillStyle = pouchGrad;
      ctx.beginPath();
      ctx.moveTo(-5.8, 7.2);
      ctx.lineTo(-5.8, -5.0);
      ctx.lineTo(-3.0, -3.5);
      ctx.lineTo(0, -5.4);
      ctx.lineTo(3.0, -3.2);
      ctx.lineTo(5.8, -5.0);
      ctx.lineTo(5.8, 7.2);
      ctx.closePath();
      ctx.fill();

      // Inner aluminum barrier rim
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(0, -3.8, 4.1, 1.15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 0.45;
      ctx.stroke();

      drawFilmWindow(
        ctx,
        () => {
          ctx.beginPath();
          ctx.ellipse(0, 1.4, 3.8, 2.5, 0, 0, Math.PI * 2);
        },
        () => {
          const validSnack = (Array.isArray(item?.contents) ? item.contents : []).filter(
            (inner: any) =>
              inner &&
              inner.itemId &&
              inner.itemId !== itemId &&
              !inner.itemId.startsWith('pouch_sealed_snack') &&
              !inner.itemId.startsWith('pouch_torn_snack')
          );
          if (validSnack.length === 1) {
            drawItemModel2D(ctx, validSnack[0].itemId, 0, 1.4, 11, validSnack[0], true);
          } else if (validSnack.length > 1) {
            const snackSlots: Array<[number, number, number]> =
              validSnack.length === 2
                ? [[-1.5, 1.3, 7.4], [1.5, 1.5, 7.4]]
                : [
                    [-1.7, 0.6, 6.0],
                    [1.7, 0.7, 6.0],
                    [-1.4, 2.2, 6.0],
                    [1.5, 2.1, 6.0],
                    [0, 1.4, 6.2]
                  ];
            const showSnack = Math.min(snackSlots.length, validSnack.length);
            for (let i = 0; i < showSnack; i++) {
              const inner = validSnack[i];
              const [sx, sy, ssz] = snackSlots[i];
              drawItemModel2D(ctx, inner.itemId, sx, sy, ssz, inner, true);
            }
          }
        },
        'rgba(255, 255, 255, 0.55)',
        '#0f172a'
      );

      drawPouchCrinkles(ctx, -5.2, -3.0, 10.4, 9.2, 47, 0.22);
      ctx.fillStyle = bandColor;
      ctx.fillRect(-5.8, 4.6, 11.6, 1.6);
      drawMicroBarcode(ctx, 1.8, 4.8, 3.2, 1.15);
      return true;
    }

    // Dumpling / Pelmeni Packaging (Пачка и пакет с клипсой под пельмени: запечатанная и вскрытая)
    case 'pelmeni_pack_small':
    case 'pelmeni_pack':
    case 'pelmeni_pack_large':
    case 'pelmeni_pack_box': {
      const isBox = itemId === 'pelmeni_pack_box' || item?.packagingShapeNameRu?.toLowerCase().includes('короб') || item?.packagingShapeNameRu?.toLowerCase().includes('пачка');
      const sz = item?.packagingSize || (itemId.includes('small') ? 'small' : itemId.includes('large') ? 'large' : 'medium');
      const scale = sz === 'mini' ? 0.8 : sz === 'small' ? 0.9 : sz === 'large' ? 1.12 : 1.0;
      const isOpen = Boolean(item?.isOpen);
      const labelColor = item?.labelColor || '#991b1b';
      const bodyTint = item?.containerTintColor || (isBox ? '#fffbeb' : '#f8fafc');
      const hasContents = Boolean(item?.contents && item.contents.length > 0);

      drawShadow(ctx, 7.8 * scale, 3.2 * scale, 7.8 * scale, 0.25);
      ctx.save();
      ctx.scale(scale, scale);

      if (isBox) {
        const bGrad = ctx.createLinearGradient(-6.4, -7.2, 6.4, 7.2);
        bGrad.addColorStop(0.0, '#ffffff');
        bGrad.addColorStop(0.6, bodyTint);
        bGrad.addColorStop(1.0, '#e2e8f0');
        ctx.fillStyle = bGrad;
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 0.55;
        ctx.beginPath();
        ctx.roundRect(-6.4, -7.2, 12.8, 14.4, 0.9);
        ctx.fill();
        ctx.stroke();

        // Editorial header band with gold trim
        drawStudioLabelPanel(ctx, -6.1, -6.9, 12.2, 4.4, {
          paperColor: '#fffbeb',
          bandColor: labelColor,
          accentColor: '#ca8a04',
          inkColor: '#1e293b',
          goldFoil: true,
          hasBarcode: false,
          emblem: 'crest',
          cylindrical: false
        });

        if (isOpen) {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(-5.4, -7.2, 10.8, 1.5);
          ctx.fillStyle = bodyTint;
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 0.45;
          ctx.beginPath();
          ctx.moveTo(-5.4, -7.2);
          ctx.lineTo(-4.6, -8.8);
          ctx.lineTo(4.6, -8.8);
          ctx.lineTo(5.4, -7.2);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }

        drawFilmWindow(
          ctx,
          () => {
            ctx.beginPath();
            ctx.roundRect(-4.7, -1.6, 9.4, 6.2, 1.5);
          },
          () => {
            if (hasContents) {
              const validBoxPelmeni = item!.contents!.filter((inner: any) => inner && inner.itemId !== itemId);
              const offsets: Array<[number, number, number]> =
                validBoxPelmeni.length === 1
                  ? [[0, 1.4, 11.5]]
                  : [[-2.1, 2.1, 9.6], [2.1, 2.2, 9.6], [0, 0.3, 9.6], [-2.2, 0.1, 8.6], [2.2, 0.2, 8.6]];
              const countToShow = Math.min(offsets.length, validBoxPelmeni.length);
              for (let i = 0; i < countToShow; i++) {
                const inner = validBoxPelmeni[i];
                const [ox, oy, osz] = offsets[i];
                drawItemModel2D(ctx, inner.itemId, ox, oy, osz, inner, true);
              }
            }
          },
          'rgba(255, 255, 255, 0.58)',
          '#0f172a'
        );

        ctx.fillStyle = labelColor;
        ctx.fillRect(-6.1, 5.2, 12.2, 1.7);
        drawMicroBarcode(ctx, 2.0, 5.4, 3.6, 1.25);
        ctx.restore();
        return true;
      }

      // Classic Gathered Clip-Top Polymer Pelmeni Bag
      if (!isOpen) {
        const topGrad = ctx.createLinearGradient(-3.4, -8.5, 3.4, -4.8);
        topGrad.addColorStop(0.0, '#ffffff');
        topGrad.addColorStop(0.5, bodyTint);
        topGrad.addColorStop(1.0, '#94a3b8');
        ctx.fillStyle = topGrad;
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 0.45;
        ctx.beginPath();
        ctx.moveTo(-1.4, -4.8);
        ctx.lineTo(-3.4, -8.2);
        ctx.lineTo(-1.2, -7.6);
        ctx.lineTo(0, -8.5);
        ctx.lineTo(1.2, -7.6);
        ctx.lineTo(3.4, -8.2);
        ctx.lineTo(1.4, -4.8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Polymer pleat shadows
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.2)';
        ctx.lineWidth = 0.3;
        ctx.beginPath();
        ctx.moveTo(-1.2, -7.6); ctx.lineTo(-0.5, -5.0);
        ctx.moveTo(1.2, -7.6); ctx.lineTo(0.5, -5.0);
        ctx.stroke();
      }

      const bagTop = isOpen ? -5.8 : -4.8;
      const bagGrad = ctx.createLinearGradient(-6.8, bagTop, 6.8, 7.4);
      bagGrad.addColorStop(0.0, '#ffffff');
      bagGrad.addColorStop(0.45, bodyTint);
      bagGrad.addColorStop(1.0, '#94a3b8');

      ctx.fillStyle = bagGrad;
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      if (!isOpen) {
        ctx.moveTo(-1.6, -4.8);
        ctx.bezierCurveTo(-6.8, -4.2, -7.2, 2.5, -6.0, 7.2);
        ctx.lineTo(6.0, 7.2);
        ctx.bezierCurveTo(7.2, 2.5, 6.8, -4.2, 1.6, -4.8);
        ctx.closePath();
      } else {
        ctx.moveTo(-4.8, -5.6);
        ctx.lineTo(-2.4, -4.8);
        ctx.lineTo(0, -5.8);
        ctx.lineTo(2.4, -4.8);
        ctx.lineTo(4.8, -5.6);
        ctx.bezierCurveTo(7.0, -1.5, 7.0, 3.2, 6.0, 7.2);
        ctx.lineTo(-6.0, 7.2);
        ctx.bezierCurveTo(-7.0, 3.2, -7.0, -1.5, -4.8, -5.6);
        ctx.closePath();
      }
      ctx.fill();
      ctx.stroke();

      if (!isOpen) {
        drawCrimpedSeal(ctx, -2.3, -5.5, 4.6, 1.45, labelColor, true, 0.72);
      } else {
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.ellipse(0, -5.1, 3.9, 1.1, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      drawStudioLabelPanel(ctx, -5.3, -3.5, 10.6, 3.2, {
        paperColor: '#fffbeb',
        bandColor: labelColor,
        accentColor: '#ca8a04',
        inkColor: '#1e293b',
        goldFoil: true,
        hasBarcode: false,
        emblem: 'crest',
        cylindrical: true
      });

      drawFilmWindow(
        ctx,
        () => {
          ctx.beginPath();
          ctx.ellipse(0, 2.5, 4.6, 3.1, 0, 0, Math.PI * 2);
        },
        () => {
          if (hasContents) {
            const validBagPelmeni = item!.contents!.filter((inner: any) => inner && inner.itemId !== itemId);
            const offsets: Array<[number, number, number]> =
              validBagPelmeni.length === 1
                ? [[0, 2.5, 11.5]]
                : [[-2.0, 3.1, 9.6], [2.0, 3.1, 9.6], [0, 1.4, 9.6], [-2.1, 1.5, 8.6], [2.1, 1.5, 8.6]];
            const countToShow = Math.min(offsets.length, validBagPelmeni.length);
            for (let i = 0; i < countToShow; i++) {
              const inner = validBagPelmeni[i];
              const [ox, oy, osz] = offsets[i];
              drawItemModel2D(ctx, inner.itemId, ox, oy, osz, inner, true);
            }
          }
        },
        'rgba(255, 255, 255, 0.65)',
        '#0f172a'
      );

      drawPouchCrinkles(ctx, -5.6, -1.5, 11.2, 8.2, 53, 0.22);
      drawMicroBarcode(ctx, 1.6, 5.5, 3.4, 1.15);
      ctx.restore();
      return true;
    }

    case 'grain_pack_pouch':
    case 'grain_pack_pouch_open':
    case 'grain_pack_box':
    case 'grain_pack_box_open':
    case 'pasta_pack_bag':
    case 'pasta_pack_bag_open':
    case 'pasta_pack_long':
    case 'pasta_pack_long_open': {
      ctx.save();
      const basePkgId = itemId.replace(/_open$/, '');
      const fs = item?.fluidStorage;
      const isOpen =
        itemId.endsWith('_open') ||
        Boolean(item?.isOpen) ||
        Boolean(fs?.attributes?.isOpened);
      const hasFill = Boolean(fs && fs.liquidId && fs.currentMl > 0);
      const liqId = fs?.liquidId as LiquidId | undefined;
      const liqDef = liqId ? LIQUID_REGISTRY[liqId] : undefined;
      const fillFrac = hasFill && fs ? Math.min(1, Math.max(0.16, fs.currentMl / (fs.maxMl || 1000))) : 0;
      const primaryColor = fs?.attributes?.customColor || liqDef?.color || '#d6d3d1';
      const secondaryColor = fs?.attributes?.secondaryColor;
      const pastaShape = fs?.attributes?.pastaShapeId;
      const isDarkContent = primaryColor === '#1e293b' || primaryColor === '#27272a' || primaryColor === '#7f1d1d';

      // Choose authentic grocery retail accent color based on product category
      const getRetailBandColor = (): string => {
        if (!hasFill) {
          if (basePkgId === 'pasta_pack_bag' || basePkgId === 'pasta_pack_long') return '#1d4ed8';
          if (basePkgId === 'grain_pack_box') return '#b45309';
          return '#15803d';
        }
        if (liqId === 'pasta') {
          if (fs?.attributes?.glutenFree) return '#059669';
          if (primaryColor === '#1e293b') return '#0f172a';
          if (primaryColor === '#8d7055') return '#57534e';
          if (primaryColor === '#a16207') return '#92400e';
          return '#1d4ed8';
        }
        if (liqId === 'buckwheat') return '#78350f';
        if (liqId === 'rice') return primaryColor === '#27272a' ? '#334155' : '#0284c7';
        if (liqId === 'lentils' || liqId === 'peas_dry' || liqId === 'beans_dry' || liqId === 'chickpeas' || liqId === 'mung_beans') return '#c2410c';
        if (liqId === 'quinoa' || liqId === 'grain_oats' || liqId === 'grain_spelt') return '#15803d';
        return '#b45309';
      };
      const bandColor = getRetailBandColor();

      // Helper to render realistic pasta or granular grains inside any clipped window region
      const drawDryGoodsInsideWindow = (wx: number, wy: number, ww: number, wh: number) => {
        if (!hasFill) {
          // Subtle inner plastic/cardboard depth when empty
          ctx.fillStyle = 'rgba(15, 23, 42, 0.25)';
          ctx.fillRect(wx, wy, ww, wh);
          return;
        }
        const topY = wy + wh * (1 - fillFrac);

        // Backdrop mound
        ctx.fillStyle = isDarkContent ? '#0f172a' : 'rgba(120, 90, 40, 0.35)';
        ctx.fillRect(wx, topY, ww, wy + wh - topY + 1);

        if (liqId === 'pasta' && pastaShape === 'spaghetti') {
          // Neat vertical bundle of spaghetti / soba strands
          const strandCount = 13;
          const step = ww / strandCount;
          for (let i = 0; i < strandCount; i++) {
            const sx = wx + (i + 0.5) * step;
            ctx.strokeStyle = i % 2 === 0 ? primaryColor : (secondaryColor || primaryColor);
            ctx.lineWidth = Math.max(0.45, step * 0.68);
            ctx.beginPath();
            ctx.moveTo(sx, topY);
            ctx.lineTo(sx, wy + wh + 0.5);
            ctx.stroke();

            ctx.strokeStyle = isDarkContent ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.42)';
            ctx.lineWidth = 0.22;
            ctx.beginPath();
            ctx.moveTo(sx - step * 0.16, topY);
            ctx.lineTo(sx - step * 0.16, wy + wh);
            ctx.stroke();
          }
          return;
        }

        if (liqId === 'pasta' && pastaShape === 'tagliatelle') {
          // Coiled golden egg-pasta ribbon nests
          const nests: Array<[number, number, number]> = [
            [wx + ww * 0.30, wy + wh * 0.72, ww * 0.24],
            [wx + ww * 0.70, wy + wh * 0.72, ww * 0.24],
            [wx + ww * 0.50, wy + wh * 0.38, ww * 0.25]
          ];
          for (const [nx, ny, nr] of nests) {
            if (ny + nr < topY) continue;
            ctx.fillStyle = primaryColor;
            ctx.beginPath();
            ctx.ellipse(nx, ny, nr, nr * 0.76, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(120, 53, 15, 0.45)';
            ctx.lineWidth = 0.35;
            for (let r = nr * 0.32; r <= nr * 0.92; r += nr * 0.28) {
              ctx.beginPath();
              ctx.ellipse(nx, ny, r, r * 0.74, 0.2, 0, Math.PI * 2);
              ctx.stroke();
            }
          }
          return;
        }

        if (liqId === 'pasta' && pastaShape) {
          // Short-cut & shaped pasta scattered densely inside window
          const cols = pastaShape === 'stelline' || pastaShape === 'orzo' ? 7 : 5;
          const rows = pastaShape === 'stelline' || pastaShape === 'orzo' ? 6 : 4;
          const cw = ww / cols;
          const ch = wh / rows;
          const tricolorPalette = secondaryColor ? [primaryColor, secondaryColor, '#ea580c'] : [primaryColor];

          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              const seed = r * 17 + c * 31 + 7;
              const jx = ((seed % 7) - 3) * 0.18;
              const jy = (((seed * 3) % 7) - 3) * 0.16;
              const px = wx + (c + 0.5) * cw + jx;
              const py = wy + (r + 0.5) * ch + jy;
              if (py < topY - 0.3) continue;
              const ang = ((seed * 47) % 360) * (Math.PI / 180);
              const pieceColor = tricolorPalette[(r + c) % tricolorPalette.length];

              ctx.save();
              ctx.translate(px, py);
              ctx.rotate(ang);
              ctx.fillStyle = pieceColor;
              ctx.strokeStyle = 'rgba(120, 53, 15, 0.42)';
              ctx.lineWidth = 0.28;

              if (pastaShape === 'penne' || pastaShape === 'rigatoni') {
                const len = pastaShape === 'rigatoni' ? 2.4 : 2.6;
                const rad = pastaShape === 'rigatoni' ? 0.95 : 0.65;
                ctx.beginPath();
                if (pastaShape === 'penne') {
                  ctx.moveTo(-len * 0.5, -rad);
                  ctx.lineTo(len * 0.35, -rad);
                  ctx.lineTo(len * 0.5, rad);
                  ctx.lineTo(-len * 0.35, rad);
                } else {
                  ctx.roundRect(-len * 0.5, -rad, len, rad * 2, 0.25);
                }
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                // Ridges
                ctx.strokeStyle = 'rgba(255,255,255,0.45)';
                ctx.lineWidth = 0.2;
                ctx.beginPath();
                ctx.moveTo(-len * 0.35, 0);
                ctx.lineTo(len * 0.35, 0);
                ctx.stroke();
              } else if (pastaShape === 'fusilli') {
                // Twisted corkscrew spiral
                ctx.strokeStyle = pieceColor;
                ctx.lineWidth = 0.85;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(-1.3, 0);
                ctx.bezierCurveTo(-0.7, -0.8, -0.2, 0.8, 0.3, -0.7);
                ctx.bezierCurveTo(0.7, 0.7, 1.0, -0.5, 1.3, 0.1);
                ctx.stroke();
                ctx.strokeStyle = 'rgba(120, 53, 15, 0.35)';
                ctx.lineWidth = 0.22;
                ctx.stroke();
              } else if (pastaShape === 'farfalle') {
                // Bowtie shape
                ctx.beginPath();
                ctx.moveTo(-1.25, -0.85);
                ctx.lineTo(0, -0.22);
                ctx.lineTo(1.25, -0.85);
                ctx.lineTo(1.25, 0.85);
                ctx.lineTo(0, 0.22);
                ctx.lineTo(-1.25, 0.85);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
              } else if (pastaShape === 'conchiglie') {
                // Ribbed shell
                ctx.beginPath();
                ctx.ellipse(0, 0, 1.2, 0.8, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = 'rgba(120, 53, 15, 0.28)';
                ctx.beginPath();
                ctx.ellipse(0, 0.18, 0.78, 0.32, 0, 0, Math.PI * 2);
                ctx.fill();
              } else if (pastaShape === 'macaroni') {
                // Curved elbow tube
                ctx.strokeStyle = pieceColor;
                ctx.lineWidth = 0.92;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.arc(0, 0.35, 1.0, Math.PI * 1.15, Math.PI * 1.85);
                ctx.stroke();
                ctx.strokeStyle = 'rgba(120, 53, 15, 0.32)';
                ctx.lineWidth = 0.2;
                ctx.stroke();
              } else if (pastaShape === 'vermicelli') {
                // Fine criss-cross soup threads
                ctx.strokeStyle = pieceColor;
                ctx.lineWidth = 0.35;
                ctx.beginPath();
                ctx.moveTo(-1.5, -0.35); ctx.lineTo(1.5, 0.35);
                ctx.moveTo(-1.2, 0.45); ctx.lineTo(1.4, -0.4);
                ctx.stroke();
              } else if (pastaShape === 'orzo') {
                // Rice-like oval
                ctx.beginPath();
                ctx.ellipse(0, 0, 0.72, 0.32, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
              } else if (pastaShape === 'stelline') {
                // Tiny 5-point star with center hole
                ctx.beginPath();
                for (let k = 0; k < 10; k++) {
                  const rad = k % 2 === 0 ? 0.65 : 0.3;
                  const a = (k * Math.PI) / 5;
                  if (k === 0) ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
                  else ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
                }
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = 'rgba(120, 53, 15, 0.45)';
                ctx.beginPath();
                ctx.arc(0, 0, 0.16, 0, Math.PI * 2);
                ctx.fill();
              }
              ctx.restore();
            }
          }
          return;
        }

        // Granular crops, groats, cereals & dry legumes
        ctx.fillStyle = primaryColor;
        ctx.fillRect(wx, topY, ww, wy + wh - topY + 0.5);

        const isLargeLegume = liqId === 'beans_dry' || liqId === 'chickpeas' || liqId === 'peas_dry';
        const isFlake = liqId === 'grain_oats';
        const isLongGrain = liqId === 'rice' || liqId === 'grain_wheat' || liqId === 'grain_rye' || liqId === 'grain_spelt';
        const gCols = isLargeLegume ? 6 : isFlake ? 6 : 9;
        const gRows = isLargeLegume ? 5 : isFlake ? 5 : 8;
        const gW = ww / gCols;
        const gH = wh / gRows;

        for (let r = 0; r < gRows; r++) {
          for (let c = 0; c < gCols; c++) {
            const seed = r * 23 + c * 41 + 13;
            const gx = wx + (c + 0.5) * gW + (((seed % 5) - 2) * 0.14);
            const gy = wy + (r + 0.5) * gH + ((((seed * 3) % 5) - 2) * 0.14);
            if (gy < topY) continue;

            const useSecondary = secondaryColor && (seed % 4 === 0);
            ctx.save();
            ctx.translate(gx, gy);
            ctx.rotate(((seed * 37) % 180) * (Math.PI / 180));

            ctx.fillStyle = useSecondary ? secondaryColor! : primaryColor;
            ctx.strokeStyle = isDarkContent ? 'rgba(255,255,255,0.22)' : 'rgba(60, 35, 10, 0.34)';
            ctx.lineWidth = 0.24;

            if (isLargeLegume) {
              ctx.beginPath();
              ctx.ellipse(0, 0, 0.85, 0.58, 0, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();
              // Specular highlight dot on glossy bean/pea
              ctx.fillStyle = 'rgba(255,255,255,0.38)';
              ctx.beginPath();
              ctx.arc(-0.25, -0.15, 0.18, 0, Math.PI * 2);
              ctx.fill();
            } else if (isFlake) {
              ctx.beginPath();
              ctx.ellipse(0, 0, 0.92, 0.52, 0, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();
            } else if (isLongGrain) {
              ctx.beginPath();
              ctx.ellipse(0, 0, 0.68, 0.28, 0, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();
            } else {
              // Round/angular groats (buckwheat, millet, quinoa, lentils, bulgur, couscous, semolina)
              const rad = liqId === 'semolina' || liqId === 'corn_grits' || liqId === 'couscous' ? 0.34 : 0.48;
              ctx.beginPath();
              ctx.arc(0, 0, rad, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();
            }
            ctx.restore();
          }
        }
      };

      if (basePkgId === 'pasta_pack_long') {
        // Tall slender clear grocery sleeve for spaghetti / soba
        drawShadow(ctx, 4.6, 2.0, 7.6, 0.22);
        const w = 7.2;
        const h = 15.2;
        const left = -w / 2;
        const top = -h / 2;

        // Outer clear polypropylene sleeve
        const sleeveGrad = ctx.createLinearGradient(left, top, left + w, top);
        sleeveGrad.addColorStop(0.0, 'rgba(241, 245, 249, 0.72)');
        sleeveGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.38)');
        sleeveGrad.addColorStop(1.0, 'rgba(148, 163, 184, 0.68)');
        ctx.fillStyle = sleeveGrad;
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 0.48;
        ctx.beginPath();
        ctx.roundRect(left, top + (isOpen ? 1.4 : 0.8), w, h - (isOpen ? 2.2 : 1.6), 0.7);
        ctx.fill();
        ctx.stroke();

        // Full vertical viewing window showing long strands
        drawFilmWindow(
          ctx,
          () => {
            ctx.beginPath();
            ctx.roundRect(left + 0.55, top + 1.4, w - 1.1, h - 2.6, 0.4);
          },
          () => drawDryGoodsInsideWindow(left + 0.55, top + 1.4, w - 1.1, h - 2.6),
          'rgba(255, 255, 255, 0.55)',
          '#1e293b'
        );

        // Top & bottom seals (or torn top if opened)
        if (!isOpen) {
          drawCrimpedSeal(ctx, left - 0.15, top, w + 0.3, 1.25, bandColor, true, 0.8);
        } else {
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.ellipse(0, top + 1.5, w * 0.42, 0.65, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        drawCrimpedSeal(ctx, left - 0.15, top + h - 1.15, w + 0.3, 1.15, bandColor, true, 0.8);

        // Center branded wrap-around sleeve label
        drawStudioLabelPanel(ctx, left - 0.05, -2.6, w + 0.1, 4.9, {
          paperColor: '#fffbeb',
          bandColor,
          accentColor: '#eab308',
          inkColor: '#0f172a',
          goldFoil: true,
          hasBarcode: false,
          emblem: 'crest',
          cylindrical: true
        });
        drawMicroBarcode(ctx, -1.6, 0.9, 3.2, 0.95);
      } else if (basePkgId === 'grain_pack_box') {
        // Upright retail cardboard box with viewing window & pour flap
        drawShadow(ctx, 6.2, 2.4, 7.2, 0.24);
        const bw = 10.6;
        const bh = 13.8;
        const bx = -bw / 2;
        const by = -bh / 2 + 0.2;

        // Top open flap or sealed box lid
        if (isOpen) {
          ctx.fillStyle = '#e7d5b8';
          ctx.strokeStyle = '#78350f';
          ctx.lineWidth = 0.45;
          ctx.beginPath();
          ctx.moveTo(bx + 0.3, by);
          ctx.lineTo(bx + 1.5, by - 2.1);
          ctx.lineTo(bx + bw - 1.5, by - 2.1);
          ctx.lineTo(bx + bw - 0.3, by);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#1e293b';
          ctx.fillRect(bx + 0.6, by - 0.35, bw - 1.2, 0.7);
        }

        // Main carton body
        const boxGrad = ctx.createLinearGradient(bx, by, bx + bw, by);
        boxGrad.addColorStop(0.0, '#f5ebdc');
        boxGrad.addColorStop(0.76, '#efe1c6');
        boxGrad.addColorStop(0.78, '#cbb694');
        boxGrad.addColorStop(1.0, '#b09975');
        ctx.fillStyle = boxGrad;
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.roundRect(bx, by, bw, bh, 0.65);
        ctx.fill();
        ctx.stroke();

        // Top branded header stripe
        ctx.fillStyle = bandColor;
        ctx.beginPath();
        ctx.roundRect(bx + 0.25, by + 0.25, bw * 0.74, 3.4, [0.45, 0.1, 0, 0]);
        ctx.fill();

        // Gold foil hairline & wheat emblem on header
        ctx.fillStyle = '#fde047';
        ctx.fillRect(bx + 0.55, by + 3.1, bw * 0.68, 0.35);
        ctx.fillStyle = '#fffbeb';
        ctx.fillRect(bx + 1.1, by + 1.0, bw * 0.48, 0.65);
        ctx.fillStyle = 'rgba(255,255,255,0.68)';
        ctx.fillRect(bx + 1.1, by + 2.0, bw * 0.34, 0.45);

        // Die-cut clear front viewing window showing grains/oats/quinoa/tagliatelle
        const winX = bx + 0.9;
        const winY = by + 4.3;
        const winW = bw * 0.64;
        const winH = 6.9;
        drawFilmWindow(
          ctx,
          () => {
            ctx.beginPath();
            ctx.roundRect(winX, winY, winW, winH, 0.8);
          },
          () => drawDryGoodsInsideWindow(winX, winY, winW, winH),
          'rgba(255, 255, 255, 0.62)',
          '#44403c'
        );

        // Side panel detail & micro barcode at bottom
        ctx.fillStyle = 'rgba(120, 53, 15, 0.18)';
        ctx.fillRect(bx + bw * 0.79, by + 1.4, bw * 0.16, 4.5);
        drawMicroBarcode(ctx, bx + 1.0, by + bh - 1.85, 3.5, 1.15);
      } else {
        // Retail pillow pouch (`grain_pack_pouch`) or pasta retail bag (`pasta_pack_bag`)
        const isPastaBag = basePkgId === 'pasta_pack_bag';
        drawShadow(ctx, 6.4, 2.5, 7.2, 0.22);
        const pw = isPastaBag ? 11.4 : 10.8;
        const ph = 14.2;
        const px = -pw / 2;
        const py = -ph / 2;

        const bodyGrad = ctx.createLinearGradient(px, py, px + pw, py);
        if (isPastaBag) {
          bodyGrad.addColorStop(0.0, 'rgba(248, 250, 252, 0.82)');
          bodyGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.48)');
          bodyGrad.addColorStop(1.0, 'rgba(148, 163, 184, 0.72)');
        } else {
          bodyGrad.addColorStop(0.0, '#fffbeb');
          bodyGrad.addColorStop(0.55, '#fef3c7');
          bodyGrad.addColorStop(1.0, '#d6c3a5');
        }
        ctx.fillStyle = bodyGrad;
        ctx.strokeStyle = isPastaBag ? '#64748b' : '#92400e';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.roundRect(px, py + (isOpen ? 1.5 : 0.9), pw, ph - (isOpen ? 2.4 : 1.8), 1.35);
        ctx.fill();
        ctx.stroke();

        // Top & bottom crimped seals (or jagged open top)
        if (!isOpen) {
          drawCrimpedSeal(ctx, px + 0.1, py, pw - 0.2, 1.3, bandColor, true, 0.76);
        } else {
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.ellipse(0, py + 1.65, pw * 0.41, 0.8, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        drawCrimpedSeal(ctx, px + 0.1, py + ph - 1.25, pw - 0.2, 1.25, bandColor, true, 0.76);

        // Large transparent window showing grains or shaped pasta
        const winX = px + 0.9;
        const winY = isPastaBag ? py + 2.2 : py + 5.2;
        const winW = pw - 1.8;
        const winH = isPastaBag ? 9.6 : 6.9;

        drawFilmWindow(
          ctx,
          () => {
            ctx.beginPath();
            ctx.roundRect(winX, winY, winW, winH, isPastaBag ? 1.1 : 1.8);
          },
          () => drawDryGoodsInsideWindow(winX, winY, winW, winH),
          'rgba(255, 255, 255, 0.62)',
          '#1e293b'
        );

        // Branded retail label band (upper header for grains, bold middle/top banner for pasta)
        drawStudioLabelPanel(ctx, px + 0.5, isPastaBag ? py + 1.7 : py + 1.5, pw - 1.0, 3.3, {
          paperColor: '#fffbeb',
          bandColor,
          accentColor: '#eab308',
          inkColor: '#0f172a',
          goldFoil: true,
          hasBarcode: false,
          emblem: isPastaBag ? 'crest' : 'leaf',
          cylindrical: true
        });

        drawPouchCrinkles(ctx, px + 0.4, py + 1.6, pw - 0.8, ph - 3.2, isPastaBag ? 41 : 29, 0.22);
        drawMicroBarcode(ctx, 1.1, py + ph - 2.65, 3.5, 1.1);
      }

      ctx.restore();
      return true;
    }

    // =========================================================================
    // === LAUNDRY DETERGENT RETAIL PACKAGING (BOX, 3KG BAG, JUG, BOTTLE) ===
    // =========================================================================
    case 'detergent_box':
    case 'detergent_box_open': {
      ctx.save();
      const fs = item?.fluidStorage;
      const isOpen = Boolean(itemId.endsWith('_open') || item?.isOpen || fs?.attributes?.isOpened);
      const hasFill = Boolean(fs && fs.liquidId && fs.currentMl > 0);
      const fillFrac = hasFill && fs ? Math.min(1, Math.max(0.14, fs.currentMl / (fs.maxMl || 900))) : 0;
      const primaryColor = fs?.attributes?.customColor || '#eff6ff';
      const brandColor = fs?.attributes?.secondaryColor || '#0284c7';
      const isEco = brandColor === '#65a30d';

      drawShadow(ctx, 6.4, 2.4, 7.6, 0.24);
      const bw = 11.4;
      const bh = 14.2;
      const bx = -bw / 2;
      const by = -bh / 2 + 0.3;

      // Top open spout flap when opened
      if (isOpen) {
        ctx.fillStyle = '#e2e8f0';
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 0.45;
        ctx.beginPath();
        ctx.moveTo(bx + bw * 0.62, by + 0.2);
        ctx.lineTo(bx + bw + 1.1, by - 1.5);
        ctx.lineTo(bx + bw + 0.3, by + 2.0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      // Main carton body (front + side depth face)
      const frontGrad = ctx.createLinearGradient(bx, by, bx + bw * 0.76, by + bh);
      frontGrad.addColorStop(0.0, isEco ? '#fefce8' : '#f8fafc');
      frontGrad.addColorStop(1.0, isEco ? '#ecfccb' : '#e0f2fe');
      ctx.fillStyle = frontGrad;
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 0.65);
      ctx.fill();
      ctx.stroke();

      // Side bevel
      ctx.fillStyle = brandColor;
      ctx.globalAlpha = 0.22;
      ctx.fillRect(bx + bw * 0.76, by + 0.2, bw * 0.23, bh - 0.4);
      ctx.globalAlpha = 1;

      // Bold branded wave banner
      ctx.fillStyle = brandColor;
      ctx.beginPath();
      ctx.roundRect(bx + 0.25, by + 0.25, bw * 0.74, 4.4, [0.45, 0, 0, 0]);
      ctx.fill();

      // Die-cut top carry slot
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(-1.8, by + 0.85, 3.6, 0.9, 0.45);
      ctx.fill();

      // Brand header stripe
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(bx + 1.0, by + 2.4, bw * 0.52, 0.85);
      ctx.fillStyle = 'rgba(255,255,255,0.68)';
      ctx.fillRect(bx + 1.0, by + 3.5, bw * 0.36, 0.55);

      // Center washing drum swirl emblem & active powder window
      const cx = bx + bw * 0.38;
      const cy = by + 7.9;
      ctx.fillStyle = brandColor;
      ctx.beginPath();
      ctx.arc(cx, cy, 2.7, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = hasFill ? primaryColor : '#334155';
      ctx.beginPath();
      ctx.arc(cx, cy, 1.9, 0, Math.PI * 2);
      ctx.fill();

      if (hasFill) {
        // Powder level & colored enzyme speckles inside emblem
        const dots: Array<[number, number, string]> = [
          [-0.7, 0.3, brandColor],
          [0.6, 0.6, '#38bdf8'],
          [-0.1, -0.5, brandColor],
          [0.8, -0.3, '#f8fafc'],
        ];
        dots.forEach(([dx, dy, col]) => {
          ctx.fillStyle = col;
          ctx.beginPath();
          ctx.arc(cx + dx, cy + dy, 0.35, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // Fill level gauge strip on side panel
      ctx.fillStyle = 'rgba(15, 23, 42, 0.25)';
      ctx.fillRect(bx + bw * 0.82, by + 2.4, 1.1, 8.8);
      if (hasFill) {
        const fh = 8.8 * fillFrac;
        ctx.fillStyle = primaryColor;
        ctx.fillRect(bx + bw * 0.82, by + 2.4 + (8.8 - fh), 1.1, fh);
        ctx.fillStyle = brandColor;
        ctx.fillRect(bx + bw * 0.82, by + 2.4 + (8.8 - fh), 1.1, 0.45);
      }

      drawMicroBarcode(ctx, bx + 1.0, by + bh - 1.9, 3.8, 1.1);
      ctx.restore();
      return true;
    }

    case 'detergent_bag_3l':
    case 'detergent_bag_3l_open': {
      ctx.save();
      const fs = item?.fluidStorage;
      const isOpen = Boolean(itemId.endsWith('_open') || item?.isOpen || fs?.attributes?.isOpened);
      const hasFill = Boolean(fs && fs.liquidId && fs.currentMl > 0);
      const fillFrac = hasFill && fs ? Math.min(1, Math.max(0.16, fs.currentMl / (fs.maxMl || 3000))) : 0;
      const primaryColor = fs?.attributes?.customColor || '#fdf2f8';
      const brandColor = fs?.attributes?.secondaryColor || '#ec4899';

      drawShadow(ctx, 7.2, 2.6, 8.0, 0.26);
      const pw = 12.6;
      const ph = 15.6;
      const px = -pw / 2;
      const py = -ph / 2;

      // Gusseted polymer pouch body
      const bagGrad = ctx.createLinearGradient(px, py, px + pw, py + ph);
      bagGrad.addColorStop(0.0, '#ffffff');
      bagGrad.addColorStop(0.55, '#fce7f3');
      bagGrad.addColorStop(1.0, '#cbd5e1');
      ctx.fillStyle = bagGrad;
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 0.55;
      ctx.beginPath();
      ctx.roundRect(px, py + (isOpen ? 1.1 : 0.4), pw, ph - (isOpen ? 1.4 : 0.7), 1.2);
      ctx.fill();
      ctx.stroke();

      // Top carry handle cutout zone
      ctx.fillStyle = brandColor;
      ctx.beginPath();
      ctx.roundRect(px + 0.3, py + (isOpen ? 1.3 : 0.6), pw - 0.6, 3.6, [0.9, 0.9, 0.2, 0.2]);
      ctx.fill();

      if (isOpen) {
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.ellipse(0, py + 1.35, pw * 0.36, 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Die-cut handle hole
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.roundRect(-2.4, py + 1.5, 4.8, 1.1, 0.55);
        ctx.fill();
      }

      // Colorful powder viewing window showing white powder + pink/emerald granules
      const wx = px + 1.2;
      const wy = py + 5.2;
      const ww = pw - 2.4;
      const wh = 7.4;
      drawFilmWindow(
        ctx,
        () => {
          ctx.beginPath();
          ctx.roundRect(wx, wy, ww, wh, 1.0);
        },
        () => {
          if (!hasFill) {
            ctx.fillStyle = 'rgba(15, 23, 42, 0.25)';
            ctx.fillRect(wx, wy, ww, wh);
            return;
          }
          const topY = wy + wh * (1 - fillFrac);
          ctx.fillStyle = primaryColor;
          ctx.fillRect(wx, topY, ww, wy + wh - topY + 1);
          // Bio-enzyme colored speckles
          for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 6; c++) {
              const gy = wy + 0.8 + r * 1.4;
              const gx = wx + 0.9 + c * 1.7 + (r % 2) * 0.4;
              if (gy < topY + 0.3) continue;
              ctx.fillStyle = (r + c) % 3 === 0 ? brandColor : (r + c) % 3 === 1 ? '#10b981' : '#cbd5e1';
              ctx.beginPath();
              ctx.arc(gx, gy, 0.36, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        },
        'rgba(255, 255, 255, 0.6)',
        '#334155'
      );

      // Center ribbon badge across window
      drawStudioLabelPanel(ctx, px + 0.6, -1.6, pw - 1.2, 3.6, {
        paperColor: '#ffffff',
        bandColor: brandColor,
        accentColor: '#10b981',
        inkColor: '#0f172a',
        goldFoil: false,
        hasBarcode: false,
        emblem: 'none',
        cylindrical: true
      });
      drawMicroBarcode(ctx, px + 1.5, py + ph - 2.3, 4.0, 1.1);
      drawPouchCrinkles(ctx, px + 0.4, py + 4.4, pw - 0.8, ph - 5.2, 37, 0.22);
      ctx.restore();
      return true;
    }

    case 'detergent_jug_1500':
    case 'detergent_jug_1500_open': {
      ctx.save();
      const fs = item?.fluidStorage;
      const isOpen = Boolean(itemId.endsWith('_open') || item?.isOpen || fs?.attributes?.isOpened);
      const hasFill = Boolean(fs && fs.liquidId && fs.currentMl > 0);
      const fillFrac = hasFill && fs ? Math.min(1, Math.max(0.14, fs.currentMl / (fs.maxMl || 1500))) : 0;
      const gelColor = fs?.attributes?.customColor || '#06b6d4';
      const capColor = fs?.attributes?.secondaryColor || '#0284c7';

      drawShadow(ctx, 6.8, 2.6, 8.2, 0.25);

      // HDPE jug contour (-6.2..+6.2, -9..+8.2)
      const traceJug = () => {
        ctx.beginPath();
        ctx.moveTo(-2.6, -6.8);
        ctx.lineTo(0.8, -6.8);
        ctx.quadraticCurveTo(5.8, -5.8, 5.8, -2.2);
        ctx.lineTo(5.6, 7.4);
        ctx.quadraticCurveTo(5.6, 8.2, 4.4, 8.2);
        ctx.lineTo(-4.8, 8.2);
        ctx.quadraticCurveTo(-5.8, 8.2, -5.8, 7.2);
        ctx.lineTo(-5.4, -3.2);
        ctx.quadraticCurveTo(-5.2, -5.8, -2.6, -6.8);
        ctx.closePath();
      };

      const jugGrad = ctx.createLinearGradient(-5.8, -6.8, 5.8, 8.2);
      jugGrad.addColorStop(0.0, '#f8fafc');
      jugGrad.addColorStop(0.65, '#e2e8f0');
      jugGrad.addColorStop(1.0, '#94a3b8');
      ctx.fillStyle = jugGrad;
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 0.55;
      traceJug();
      ctx.fill();
      ctx.stroke();

      // Ergonomic handle cutout on right upper side
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(2.1, -3.6, 2.0, 4.8, 0.85);
      ctx.fill();
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 0.45;
      ctx.stroke();

      // Translucent side level gauge showing gel liquid
      ctx.fillStyle = 'rgba(15, 23, 42, 0.22)';
      ctx.beginPath();
      ctx.roundRect(-4.7, -3.0, 1.3, 9.6, 0.5);
      ctx.fill();
      if (hasFill) {
        const gh = 9.4 * fillFrac;
        ctx.fillStyle = gelColor;
        ctx.beginPath();
        ctx.roundRect(-4.6, -2.9 + (9.4 - gh), 1.1, gh, 0.4);
        ctx.fill();
      }

      // Branded waterproof front label
      drawStudioLabelPanel(ctx, -2.9, -1.6, 4.7, 7.8, {
        paperColor: '#ffffff',
        bandColor: gelColor,
        accentColor: capColor,
        inkColor: '#0f172a',
        goldFoil: false,
        hasBarcode: true,
        emblem: 'crest',
        cylindrical: false
      });

      // Spout & measuring cup cap
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-2.1, -8.3, 2.4, 1.6);
      if (!isOpen) {
        drawScrewCap(ctx, -0.9, -9.2, 3.2, 2.4, capColor, true);
      } else {
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.ellipse(-0.9, -8.3, 0.9, 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
      return true;
    }

    case 'detergent_bottle_1000':
    case 'detergent_bottle_1000_open': {
      ctx.save();
      const fs = item?.fluidStorage;
      const isOpen = Boolean(itemId.endsWith('_open') || item?.isOpen || fs?.attributes?.isOpened);
      const hasFill = Boolean(fs && fs.liquidId && fs.currentMl > 0);
      const fillFrac = hasFill && fs ? Math.min(1, Math.max(0.14, fs.currentMl / (fs.maxMl || 1000))) : 0;
      const gelColor = fs?.attributes?.customColor || '#c084fc';
      const capColor = fs?.attributes?.secondaryColor || '#7e22ce';

      drawShadow(ctx, 5.2, 2.4, 8.0, 0.24);

      const traceBottle = () => {
        ctx.beginPath();
        ctx.moveTo(-1.8, -7.2);
        ctx.lineTo(1.8, -7.2);
        ctx.quadraticCurveTo(4.6, -5.2, 4.3, -1.8);
        ctx.quadraticCurveTo(3.4, 1.4, 4.5, 5.2);
        ctx.lineTo(4.3, 7.6);
        ctx.quadraticCurveTo(0, 8.3, -4.3, 7.6);
        ctx.lineTo(-4.5, 5.2);
        ctx.quadraticCurveTo(-3.4, 1.4, -4.3, -1.8);
        ctx.quadraticCurveTo(-4.6, -5.2, -1.8, -7.2);
        ctx.closePath();
      };

      const bodyGrad = ctx.createLinearGradient(-4.5, -7.2, 4.5, 8.0);
      bodyGrad.addColorStop(0.0, '#faf5ff');
      bodyGrad.addColorStop(0.55, '#f3e8ff');
      bodyGrad.addColorStop(1.0, '#cbd5e1');
      ctx.fillStyle = bodyGrad;
      ctx.strokeStyle = '#4c1d95';
      ctx.lineWidth = 0.5;
      traceBottle();
      ctx.fill();
      ctx.stroke();

      // Dynamic gel level clipped inside lower translucent section
      if (hasFill) {
        ctx.save();
        traceBottle();
        ctx.clip();
        const totalH = 13.5;
        const fh = totalH * fillFrac;
        ctx.fillStyle = gelColor;
        ctx.globalAlpha = 0.72;
        ctx.fillRect(-5.0, 8.0 - fh, 10.0, fh + 1.0);
        ctx.globalAlpha = 1;
        ctx.restore();
      }

      drawStudioLabelPanel(ctx, -3.5, -2.5, 7.0, 7.4, {
        paperColor: '#ffffff',
        bandColor: gelColor,
        accentColor: capColor,
        inkColor: '#0f172a',
        goldFoil: false,
        hasBarcode: true,
        emblem: 'leaf',
        cylindrical: true
      });

      drawGlossBand(ctx, -3.2, -4.8, 1.0, 11.4, 0.42);
      if (!isOpen) {
        drawScrewCap(ctx, 0, -9.2, 3.8, 2.4, capColor, true);
      } else {
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.ellipse(0, -7.2, 1.4, 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
      return true;
    }

    default:
      return false;
  }
}
