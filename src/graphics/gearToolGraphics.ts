// Procedural 2D Canvas Models for Tools, Auto, Gear, and Valuables
import { drawShadow, drawGlossBand } from './itemGraphicShared';

export function drawGearToolItem(ctx: CanvasRenderingContext2D, itemId: string, item?: any): boolean {
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

    case 'motor_oil': {
      drawShadow(ctx, 8.5, 3.2, 8, 0.28);

      // Authentic 4L Automotive Engine Oil Canister (Genesis / Mobil / Castrol style)
      // Premium dark titanium / gunmetal sculpted polymer body
      const canGrad = ctx.createLinearGradient(-7, -4.5, 7, 7.5);
      canGrad.addColorStop(0, '#334155');
      canGrad.addColorStop(0.5, '#1e293b');
      canGrad.addColorStop(1, '#0f172a');
      ctx.fillStyle = canGrad;
      ctx.beginPath();
      ctx.roundRect(-7, -4.5, 14, 12, 2.2);
      ctx.fill();

      // Canister chassis beveled edge highlight
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Integrated heavy-duty top carrying handle with finger grip
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(-4, -8, 10.5, 3.8, 1.5);
      ctx.fill();
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 0.7;
      ctx.stroke();
      // Ergonomic grip cutout
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(-2.5, -6.5, 7.5, 2.2, 1);
      ctx.fill();

      // Angled pouring neck at top-left
      ctx.fillStyle = '#334155';
      ctx.fillRect(-6.5, -7.5, 2.8, 3.5);
      // Gold threaded screw cap with safety seal ring
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.roundRect(-7, -8.5, 3.8, 2.8, 0.8);
      ctx.fill();
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(-6.8, -8.5, 3.4, 0.7); // Cap highlight
      ctx.fillStyle = '#b45309';
      ctx.fillRect(-7, -6.2, 3.8, 0.6); // Tamper seal ring

      // Clear measuring sight-strip on side revealing fresh golden-amber synthetic oil
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(4.6, -3.5, 1.8, 10);
      // Amber liquid fill inside gauge (Full 4 Liters)
      const oilGrad = ctx.createLinearGradient(4.6, -3.5, 6.4, 6.5);
      oilGrad.addColorStop(0, '#f59e0b');
      oilGrad.addColorStop(1, '#d97706');
      ctx.fillStyle = oilGrad;
      ctx.fillRect(4.8, -3.2, 1.4, 9.4);
      // Gradation ticks (1L, 2L, 3L, 4L)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(4.5, -2, 0.8, 0.5);
      ctx.fillRect(4.5, 0.5, 0.8, 0.5);
      ctx.fillRect(4.5, 3, 0.8, 0.5);

      // High-Performance Sports Racing Label
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.roundRect(-5.5, -2.5, 9, 8.5, 1.2);
      ctx.fill();

      // Gold & Red Racing Chevron Trim
      ctx.fillStyle = '#d97706';
      ctx.fillRect(-5.5, -2.5, 9, 1.2);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-5.5, -1.3, 9, 0.6);

      // Viscosity Designation "5W-40" in Bold
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 2.2px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('5W-40', -1, 1.8);

      // Gold "SYNTHETIC" banner
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 1.1px sans-serif';
      ctx.fillText('SYNTHETIC', -1, 3.4);

      // Engine piston emblem
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(-2, 4.2, 2, 1.2);
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(-2, 4.2, 2, 1.2);

      // Specular gloss reflection across canister body
      drawGlossBand(ctx, -6, -4, 2.5, 11);
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

    case 'antifreeze': {
      drawShadow(ctx, 8.5, 3.2, 8, 0.28);

      // Authentic 5L Automotive Coolant Canister (G12+ Long Life / Felix / Sintec style)
      // Translucent milky HDPE white/light-grey polymer container
      const canGrad = ctx.createLinearGradient(-7, -4.5, 7, 7.5);
      canGrad.addColorStop(0, '#f8fafc');
      canGrad.addColorStop(0.5, '#e2e8f0');
      canGrad.addColorStop(1, '#cbd5e1');
      ctx.fillStyle = canGrad;
      ctx.beginPath();
      ctx.roundRect(-7, -4.5, 14, 12, 2.2);
      ctx.fill();

      // Translucent inner chamber: Vibrant Ruby-Crimson G12+ Coolant Liquid visible through plastic
      const coolantGrad = ctx.createLinearGradient(-6.2, -3.5, 6.2, 7);
      coolantGrad.addColorStop(0, 'rgba(225, 29, 72, 0.75)'); // Vibrant G12+ Crimson
      coolantGrad.addColorStop(1, 'rgba(190, 18, 60, 0.85)');
      ctx.fillStyle = coolantGrad;
      ctx.beginPath();
      ctx.roundRect(-6.2, -3.5, 12.4, 10.5, 1.5);
      ctx.fill();

      // Outer plastic body border highlight
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.roundRect(-7, -4.5, 14, 12, 2.2);
      ctx.stroke();

      // Molded ergonomic top carrying handle with finger ribs
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.roundRect(-4.5, -8, 11, 3.8, 1.5);
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 0.7;
      ctx.stroke();
      // Handle cutout hole
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(-3, -6.5, 8, 2.2, 1);
      ctx.fill();

      // Angled pouring spout at top-left
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-6.5, -7.5, 2.8, 3.5);
      // Crimson-red ribbed childproof safety cap with lock ring
      ctx.fillStyle = '#be123c';
      ctx.beginPath();
      ctx.roundRect(-7, -8.5, 3.8, 2.8, 0.8);
      ctx.fill();
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(-6.8, -8.5, 3.4, 0.7); // Cap highlight
      ctx.fillStyle = '#881337';
      ctx.fillRect(-7, -6.2, 3.8, 0.6); // Lock ring

      // Clear volume gauge strip on right side
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(4.8, -3.5, 1.4, 10);
      // Deep crimson liquid inside gauge
      ctx.fillStyle = '#e11d48';
      ctx.fillRect(5, -3.2, 1, 9.4);
      // Volume marks
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(4.6, -2, 0.8, 0.5);
      ctx.fillRect(4.6, 0.5, 0.8, 0.5);
      ctx.fillRect(4.6, 3, 0.8, 0.5);

      // High-Contrast Diagnostic Coolant Label
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(-5.5, -2.5, 9, 8.5, 1.2);
      ctx.fill();
      ctx.strokeStyle = '#e11d48';
      ctx.lineWidth = 0.7;
      ctx.stroke();

      // Crimson Header Strip with "G12+"
      ctx.fillStyle = '#e11d48';
      ctx.fillRect(-5.5, -2.5, 9, 2.8);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 2px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('G12+', -1, -0.4);

      // Subzero Frost Resistance Badge: "-40°C" with snowflake
      ctx.fillStyle = '#0284c7';
      ctx.font = 'bold 1.8px sans-serif';
      ctx.fillText('-40°C', -1, 3);

      // Radiator cooling circuit icon
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 0.6;
      ctx.strokeRect(-3, 3.8, 4, 1.6);
      ctx.beginPath();
      ctx.moveTo(-2, 3.8); ctx.lineTo(-2, 5.4);
      ctx.moveTo(-1, 3.8); ctx.lineTo(-1, 5.4);
      ctx.moveTo(0, 3.8); ctx.lineTo(0, 5.4);
      ctx.stroke();

      // Specular gloss reflection across translucent container
      drawGlossBand(ctx, -6, -4, 2.5, 11);
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

    case 'fuel_canister': {
      drawShadow(ctx, 8.5, 3.2, 7.8, 0.25);

      // Stamped steel 20L military Jerrycan body (olive drab)
      ctx.fillStyle = '#3f4f2c';
      ctx.beginPath();
      ctx.roundRect(-7, -5, 14, 12, 2.5);
      ctx.fill();

      // Recessed stamped structural X-rib indentations on side panel
      ctx.strokeStyle = '#2d381f';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-5, -3); ctx.lineTo(5, 5);
      ctx.moveTo(5, -3);  ctx.lineTo(-5, 5);
      ctx.stroke();

      // Highlight inner bevel for pressed steel ribs
      ctx.strokeStyle = '#4d6036';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(-4.5, -3); ctx.lineTo(4.5, 5);
      ctx.moveTo(4.5, -3);  ctx.lineTo(-4.5, 5);
      ctx.stroke();

      // Triple tube carry handle on top (classic 3-handle Jerrycan design)
      ctx.fillStyle = '#2d381f';
      ctx.beginPath();
      // Outer carry frame
      ctx.roundRect(-5.5, -8, 11, 3.5, 1.2);
      ctx.fill();
      // Handle cutouts (dual grip slots)
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(-4.5, -7, 3.2, 1.8);
      ctx.fillRect(1.3, -7, 3.2, 1.8);
      // Three distinct round handle bars
      ctx.fillStyle = '#4d6036';
      ctx.fillRect(-5.2, -8, 1.4, 3.2);
      ctx.fillRect(-0.7, -8, 1.4, 3.2);
      ctx.fillRect(3.8, -8, 1.4, 3.2);

      // Offset spout neck with heavy cam-lock sealed cap
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(4, -8.5, 2.8, 2);
      ctx.fillStyle = '#ca8a04'; // Brass lock cap
      ctx.fillRect(3.6, -9.2, 3.6, 1.2);

      // Retention chain & cotter pin
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(3.6, -8.6);
      ctx.quadraticCurveTo(2.5, -7.5, 3.2, -6.5);
      ctx.stroke();

      // Stenciled white text and hazard markings
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = 'bold 3.2px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('20L', -0.5, 1);

      // Flammable diamond hazard badge (Red)
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(-0.5, -2);
      ctx.lineTo(1.2, -0.5);
      ctx.lineTo(-0.5, 1);
      ctx.lineTo(-2.2, -0.5);
      ctx.closePath();
      ctx.fill();

      // Steel gloss reflection band
      drawGlossBand(ctx, -6, -5, 1.4, 12, 0.28);
      return true;
    }

    case 'canister_empty': {
      drawShadow(ctx, 8.5, 3.2, 7.8, 0.22);

      // Stamped steel 20L military Jerrycan body (scuffed olive drab)
      ctx.fillStyle = '#3f4f2c';
      ctx.beginPath();
      ctx.roundRect(-7, -5, 14, 12, 2.5);
      ctx.fill();

      // Structural X-rib indentations
      ctx.strokeStyle = '#2d381f';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-5, -3); ctx.lineTo(5, 5);
      ctx.moveTo(5, -3);  ctx.lineTo(-5, 5);
      ctx.stroke();

      // Three carry handles on top
      ctx.fillStyle = '#2d381f';
      ctx.beginPath();
      ctx.roundRect(-5.5, -8, 11, 3.5, 1.2);
      ctx.fill();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(-4.5, -7, 3.2, 1.8);
      ctx.fillRect(1.3, -7, 3.2, 1.8);
      ctx.fillStyle = '#4d6036';
      ctx.fillRect(-5.2, -8, 1.4, 3.2);
      ctx.fillRect(-0.7, -8, 1.4, 3.2);
      ctx.fillRect(3.8, -8, 1.4, 3.2);

      // Open, unscrewed spout neck (dark hollow opening)
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(4, -8.5, 2.8, 2.2);
      ctx.fillStyle = '#0f172a'; // Deep empty hollow hole
      ctx.beginPath();
      ctx.ellipse(5.4, -8.5, 1.2, 0.6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Brass cap dangling open on its retention chain
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(4, -8);
      ctx.quadraticCurveTo(2.5, -7, 2, -5.5);
      ctx.stroke();
      ctx.fillStyle = '#ca8a04'; // Open dangling cap
      ctx.beginPath();
      ctx.roundRect(1.2, -6, 1.8, 2.5, 0.6);
      ctx.fill();

      // Dried fuel drip stain running down beneath the spout
      ctx.fillStyle = 'rgba(28, 25, 23, 0.35)';
      ctx.beginPath();
      ctx.moveTo(4.5, -5);
      ctx.lineTo(6, -5);
      ctx.lineTo(5.5, 0);
      ctx.lineTo(4.8, 2);
      ctx.closePath();
      ctx.fill();

      // Bare metal paint scratch wear along bottom rim
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(-6.5, 6, 2, 0.8);
      ctx.fillRect(2, 6, 3, 0.8);

      // Faded stenciled 20L marking
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = 'bold 3.2px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('20L', -0.5, 1);
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

      // Thin crinkled plastic handles on top
      ctx.fillStyle = 'rgba(241, 245, 249, 0.9)';
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 0.7;

      // Left handle loop
      ctx.beginPath();
      ctx.roundRect(-6, -9, 3.2, 7, 1.2);
      ctx.fill();
      ctx.stroke();
      ctx.clearRect(-4.8, -7.5, 1.2, 4.5);

      // Right handle loop
      ctx.beginPath();
      ctx.roundRect(2.8, -9, 3.2, 7, 1.2);
      ctx.fill();
      ctx.stroke();
      ctx.clearRect(3.6, -7.5, 1.2, 4.5);

      // Main plastic bag body (white grocery sack with crinkles)
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(-6.5, -3);
      ctx.lineTo(6.5, -3);
      ctx.quadraticCurveTo(7.5, 4, 6.8, 7.5);
      ctx.quadraticCurveTo(0, 8.5, -6.8, 7.5);
      ctx.quadraticCurveTo(-7.5, 4, -6.5, -3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Fold crinkle shading
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(-4, -1); ctx.lineTo(-1, 5);
      ctx.moveTo(3, -2); ctx.lineTo(1, 4);
      ctx.stroke();

      // Store print logo (cheerful supermarket basket / stripes)
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.roundRect(-3.5, 0.5, 7, 3, 0.8);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-2.5, 1.5, 5, 0.9);
      return true;
    }

    case 'sandbag': {
      drawShadow(ctx, 8.5, 4.5, 7.5, 0.25);

      // Main burlap canvas sandbag body (bulging, heavy 3D shape)
      const grad = ctx.createLinearGradient(-8, -7, 8, 8);
      grad.addColorStop(0, '#d97706'); // Warm canvas amber top highlight
      grad.addColorStop(0.35, '#b45309'); // Rich burlap body
      grad.addColorStop(0.75, '#92400e'); // Shaded canvas base
      grad.addColorStop(1, '#78350f');   // Deep bottom shadow

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(-3, -7.5); // Cinched neck top
      ctx.quadraticCurveTo(-6.5, -6, -8, -1);
      ctx.quadraticCurveTo(-9, 4, -7, 7.5);
      ctx.quadraticCurveTo(0, 9.5, 7, 7.5);
      ctx.quadraticCurveTo(9, 4, 8, -1);
      ctx.quadraticCurveTo(6.5, -6, 3, -7.5);
      ctx.quadraticCurveTo(0, -8.2, -3, -7.5);
      ctx.closePath();
      ctx.fill();

      // Burlap woven texture lines (fine cross-hatching)
      ctx.strokeStyle = 'rgba(69, 26, 3, 0.25)';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      // Vertical fabric weave curves
      for (let x = -6; x <= 6; x += 3) {
        ctx.moveTo(x, -5);
        ctx.quadraticCurveTo(x * 1.15, 1, x * 0.9, 7);
      }
      // Horizontal fabric weave curves
      for (let y = -4; y <= 6; y += 2.5) {
        ctx.moveTo(-7, y);
        ctx.quadraticCurveTo(0, y + 1.2, 7, y);
      }
      ctx.stroke();

      // Flared ruffled top canvas mouth above neck tie
      ctx.fillStyle = '#d9a05b';
      ctx.beginPath();
      ctx.moveTo(-3, -7.5);
      ctx.quadraticCurveTo(-4.5, -10.5, -3.5, -11.5);
      ctx.quadraticCurveTo(0, -9.5, 3.5, -11.5);
      ctx.quadraticCurveTo(4.5, -10.5, 3, -7.5);
      ctx.closePath();
      ctx.fill();

      // Heavy twined rope/cord neck tie
      ctx.fillStyle = '#fef08a';
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.roundRect(-3.5, -8, 7, 2.2, 0.8);
      ctx.fill();
      ctx.stroke();

      // Cord knot details
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.arc(0, -6.9, 1.2, 0, Math.PI * 2);
      ctx.fill();

      // Stencil stamp label on burlap "ПЕСОК 1KG"
      ctx.fillStyle = 'rgba(69, 26, 3, 0.85)';
      ctx.font = 'bold 3.2px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('ПЕСОК', 0, 0);
      ctx.font = 'bold 2.8px monospace';
      ctx.fillText('1 KG', 0, 3.5);

      // Leaking fine golden sand grain speckles at seam
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(4.5, 6, 0.8, 0, Math.PI * 2);
      ctx.arc(6, 7.2, 0.6, 0, Math.PI * 2);
      ctx.arc(-5, 6.8, 0.7, 0, Math.PI * 2);
      ctx.fill();

      return true;
    }

    case 'sack_empty': {
      drawShadow(ctx, 8, 3.5, 6, 0.18);

      // Folded/flat empty burlap canvas bag
      const grad = ctx.createLinearGradient(-7, -5, 7, 6);
      grad.addColorStop(0, '#d9a05b'); // Light empty canvas
      grad.addColorStop(0.5, '#b45309');
      grad.addColorStop(1, '#78350f');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(-6.5, -5);
      ctx.lineTo(6.5, -5);
      ctx.quadraticCurveTo(7.5, 2, 6.5, 6.5);
      ctx.quadraticCurveTo(0, 7.8, -6.5, 6.5);
      ctx.quadraticCurveTo(-7.5, 2, -6.5, -5);
      ctx.closePath();
      ctx.fill();

      // Dark open hollow bag mouth at top
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.ellipse(0, -5, 5.5, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Inner shadow inside mouth
      ctx.fillStyle = '#1c0a00';
      ctx.beginPath();
      ctx.ellipse(0, -5, 4.2, 1.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Burlap cloth fold lines & edge stitching
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(-5, -3); ctx.lineTo(-2, 4);
      ctx.moveTo(4, -3); ctx.lineTo(1, 5);
      ctx.stroke();

      // Perimeter seam stitching
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 0.5;
      ctx.setLineDash([1.2, 1.2]);
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

    default:
      return false;
  }
}
