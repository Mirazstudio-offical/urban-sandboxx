// Procedural 2D Canvas Models for Medical Items
import { drawShadow, drawGlossBand, drawMedicalCross } from './itemGraphicShared';

export function drawMedicalItem(ctx: CanvasRenderingContext2D, itemId: string): boolean {
  switch (itemId) {
    case 'medkit': {
      drawShadow(ctx, 9, 3.2, 7.8, 0.25);

      // Red trauma hard-case body
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.roundRect(-8.5, -5.5, 17, 13, 2.5);
      ctx.fill();

      // Bevel highlight & shadow
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-8.5, -5.5, 17, 1.2);
      ctx.fillStyle = '#b91c1c';
      ctx.fillRect(-8.5, 6.3, 17, 1.2);

      // Top carrying handle
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.roundRect(-4, -8.5, 8, 3.5, 1.5);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-2.5, -7, 5, 2);

      // Dual snap latches
      ctx.fillStyle = '#475569';
      ctx.fillRect(-5.5, -5.8, 2, 2.5);
      ctx.fillRect(3.5, -5.8, 2, 2.5);

      // Large White Medical Cross
      drawMedicalCross(ctx, 0, 1, 6.5, '#ffffff');
      return true;
    }

    case 'bandage': {
      drawShadow(ctx, 7.5, 2.8, 7.5, 0.2);

      // Rolled gauze cylinder
      ctx.fillStyle = '#f1f5f9';
      ctx.beginPath();
      ctx.ellipse(0, 0, 6.5, 6.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Gauze spiral roll layers
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 1.8);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 3.2, 0.5, Math.PI * 2);
      ctx.stroke();

      // Core center
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.arc(0, 0, 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Trailing bandage cloth tail
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(3, 4.5);
      ctx.quadraticCurveTo(6, 6, 8.5, 5);
      ctx.lineTo(8.5, 7.2);
      ctx.quadraticCurveTo(5, 7.8, 2, 6.2);
      ctx.closePath();
      ctx.fill();

      // Hospital blue cross sticker
      drawMedicalCross(ctx, -2, -2, 2.5, '#0284c7');
      return true;
    }

    case 'painkillers': {
      drawShadow(ctx, 7.5, 2.8, 7.5, 0.22);

      // Silver foil blister card
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.roundRect(-7, -8, 14, 15.5, 1.5);
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Blue clinical top banner
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(-7, -8, 14, 3.2);

      // 2x4 pill bubbles with white capsules
      const rows = [-3, 0, 3, 6];
      rows.forEach(ry => {
        [-3.8, 3.8].forEach(rx => {
          // Blister bubble dome
          ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
          ctx.beginPath();
          ctx.ellipse(rx, ry, 2.2, 1.3, 0, 0, Math.PI * 2);
          ctx.fill();

          // Capsule pill inside
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(rx - 1.5, ry - 0.8, 3, 1.6);
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(rx, ry - 0.8, 1.5, 1.6);
        });
      });
      return true;
    }

    case 'vitamins': {
      drawShadow(ctx, 6.8, 2.6, 7.8, 0.22);

      // Translucent amber pill bottle body
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.roundRect(-5.5, -4, 11, 11.5, 2);
      ctx.fill();

      // Golden vitamin tablets visible inside
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(-2, 4.5, 1.4, 0, Math.PI * 2);
      ctx.arc(2, 4.2, 1.4, 0, Math.PI * 2);
      ctx.fill();

      // Clinical white & teal label
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-5.5, -2, 11, 5.5);
      ctx.fillStyle = '#0d9488';
      ctx.fillRect(-5.5, -0.5, 11, 2.5);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-3, 0.2, 6, 1);

      // Glass specular reflection
      drawGlossBand(ctx, -4.5, -4, 1.4, 11.5, 0.35);

      // White child-proof ribbed screw cap
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.roundRect(-4, -7.5, 8, 3.8, 0.8);
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 0.6;
      for (let x = -3; x <= 3; x += 1.2) {
        ctx.beginPath();
        ctx.moveTo(x, -7.5); ctx.lineTo(x, -4);
        ctx.stroke();
      }
      return true;
    }

    case 'splint': {
      drawShadow(ctx, 8.5, 3, 7.5, 0.22);

      // Molded blue aluminum splint body (rolled shape)
      ctx.fillStyle = '#1d4ed8';
      ctx.beginPath();
      ctx.roundRect(-7.5, -6.5, 15, 13.5, 2);
      ctx.fill();

      // Soft grey inner foam padding
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.roundRect(-6.5, -5.5, 13, 11.5, 1.5);
      ctx.fill();

      // Dual black securing velcro straps
      ctx.fillStyle = '#18181b';
      ctx.fillRect(-8, -3, 16, 2.4);
      ctx.fillRect(-8, 2, 16, 2.4);

      // Silver buckles
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(4, -3, 2, 2.4);
      ctx.fillRect(4, 2, 2, 2.4);
      return true;
    }

    case 'antiseptic': {
      drawShadow(ctx, 6.5, 2.5, 7.8, 0.22);

      // Emerald green translucent spray bottle body
      ctx.fillStyle = '#059669';
      ctx.beginPath();
      ctx.roundRect(-4.8, -3.5, 9.6, 11, 2);
      ctx.fill();

      // Clinical white label with red cross
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-4.5, -0.5, 9, 5);
      drawMedicalCross(ctx, 0, 2, 3.5, '#dc2626');

      // Specular shine
      drawGlossBand(ctx, -3.8, -3.5, 1.2, 11, 0.35);

      // White spray pump neck & actuator
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-2, -5.5, 4, 2);
      ctx.beginPath();
      ctx.roundRect(-2.8, -8.5, 5.6, 3.2, 0.8);
      ctx.fill();

      // Spray nozzle hole
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(2.2, -7.5, 1, 1.2);
      return true;
    }

    case 'antipyretic': {
      drawShadow(ctx, 7.2, 2.8, 7.5, 0.22);

      // Paracetamol blister card
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(-6.5, -7, 13, 14, 1.5);
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Green pharmaceutical banner
      ctx.fillStyle = '#16a34a';
      ctx.fillRect(-6.5, -7, 13, 3.2);

      // 6 round white pressed tablets under blister domes
      const tabs = [
        [-3.2, -1.8], [3.2, -1.8],
        [-3.2, 1.8], [3.2, 1.8],
        [-3.2, 5.2], [3.2, 5.2]
      ];
      tabs.forEach(([tx, ty]) => {
        ctx.fillStyle = '#f1f5f9';
        ctx.beginPath();
        ctx.arc(tx, ty, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.arc(tx, ty, 1.8, 0, Math.PI * 2);
        ctx.fill();
        // Tablet score line
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(tx - 1.2, ty); ctx.lineTo(tx + 1.2, ty);
        ctx.stroke();
      });
      return true;
    }

    case 'eye_drops': {
      drawShadow(ctx, 5.5, 2.2, 7.8, 0.2);

      // Small squeeze dropper bottle
      ctx.fillStyle = '#e0f2fe';
      ctx.beginPath();
      ctx.roundRect(-4, -2, 8, 9.5, 2);
      ctx.fill();

      // Blue label with eye graphic
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(-3.8, 0, 7.6, 4.5);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(0, 2.2, 2.2, 1.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(0, 2.2, 0.8, 0, Math.PI * 2);
      ctx.fill();

      // Tapered dropper neck
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(-2.5, -2);
      ctx.lineTo(2.5, -2);
      ctx.lineTo(1.2, -5.5);
      ctx.lineTo(-1.2, -5.5);
      ctx.closePath();
      ctx.fill();

      // Royal blue protective cap
      ctx.fillStyle = '#1d4ed8';
      ctx.beginPath();
      ctx.roundRect(-2.2, -8.5, 4.4, 3.8, 0.8);
      ctx.fill();
      return true;
    }

    case 'medical_patch': {
      drawShadow(ctx, 8, 3, 7.5, 0.2);

      // Tan flexible fabric plaster
      ctx.fillStyle = '#fcd34d';
      ctx.beginPath();
      ctx.roundRect(-8, -4, 16, 8, 3);
      ctx.fill();

      // Absorbent white wound pad in center
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(-3.5, -3, 7, 6, 1);
      ctx.fill();

      // Aeration micro-pores
      ctx.fillStyle = '#d97706';
      for (let x = -7; x <= 7; x += 2) {
        if (x >= -3 && x <= 3) continue;
        ctx.fillRect(x, -2, 0.7, 0.7);
        ctx.fillRect(x, 1.5, 0.7, 0.7);
      }
      return true;
    }

    case 'thermometer': {
      drawShadow(ctx, 8.5, 2.2, 7.5, 0.18);

      // Sleek digital thermometer body (angled)
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.roundRect(-8.5, -2.5, 17, 5, 2);
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Stainless steel probe tip
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.roundRect(-9.5, -1.5, 3.5, 3, 1);
      ctx.fill();

      // LCD display window
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(-3, -1.8, 6.5, 3.6);
      ctx.fillStyle = '#0f172a';
      // "36.6" LCD readout hint
      ctx.fillRect(-2, -1, 1.2, 2);
      ctx.fillRect(-0.2, -1, 1.2, 2);
      ctx.fillRect(1.6, -1, 1.2, 2);
      ctx.fillRect(0.8, 0.8, 0.6, 0.6); // decimal dot

      // Cyan power button
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.arc(5.2, 0, 1.2, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    case 'panthenol_spray': {
      drawShadow(ctx, 6.8, 2.8, 8, 0.22);

      // White aluminum aerosol canister
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(-5.5, -8.5, 11, 16.5, 2.5);
      ctx.fill();
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Signature Panthenol orange & red burn stripe
      ctx.fillStyle = '#f97316';
      ctx.fillRect(-5.5, -2, 11, 5);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-5.5, 1.5, 11, 1.5);

      // Blue clinical text accent band
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(-5.5, 4.5, 11, 2);

      // White cross emblem on orange background
      drawMedicalCross(ctx, 0, 0.5, 3.2, '#ffffff');

      // Specular metallic sheen
      drawGlossBand(ctx, -4.5, -8.5, 1.5, 16.5, 0.35);

      // Metallic silver shoulder curve
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.ellipse(0, -8.5, 4.5, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // White spray dispenser nozzle
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.roundRect(-2.8, -11.5, 5.6, 3.2, 1);
      ctx.fill();
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(-1.2, -11.5, 2.4, 1.2);
      return true;
    }

    case 'spasatel_ointment': {
      drawShadow(ctx, 7.5, 2.6, 7.5, 0.22);

      // Green & yellow laminated aluminum tube
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.roundRect(-6, -7.5, 12, 15, 2);
      ctx.fill();

      // Bright yellow diagonal stripe
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.moveTo(-6, -3);
      ctx.lineTo(6, -6);
      ctx.lineTo(6, 1);
      ctx.lineTo(-6, 4);
      ctx.closePath();
      ctx.fill();

      // Sea buckthorn oil gold badge with red cross
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(0, -1, 3, 0, Math.PI * 2);
      ctx.fill();
      drawMedicalCross(ctx, 0, -1, 3.5, '#ffffff');

      // Crimped metallic bottom end
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(-6, 6.2, 12, 1.5);
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 0.5;
      for (let x = -5; x <= 5; x += 1.5) {
        ctx.beginPath();
        ctx.moveTo(x, 6.2); ctx.lineTo(x, 7.7);
        ctx.stroke();
      }

      // White hexagonal screw cap on top
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(-3, -9.8, 6, 2.6, 0.8);
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 0.6;
      ctx.stroke();
      return true;
    }

    case 'zelenka': {
      drawShadow(ctx, 6.2, 2.5, 7.5, 0.22);

      // Dark emerald green glass bottle body
      ctx.fillStyle = '#047857';
      ctx.beginPath();
      ctx.roundRect(-5, -4, 10, 11.5, 2);
      ctx.fill();

      // Rich emerald green liquid fill
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.roundRect(-4.2, -2, 8.4, 9, 1.5);
      ctx.fill();

      // Off-white paper label
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-4.5, -1, 9, 5.5);
      ctx.fillStyle = '#059669';
      ctx.fillRect(-4.5, 0.2, 9, 1.8);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-2, 0.6, 4, 1);

      // Glass specular reflection
      drawGlossBand(ctx, -4, -4, 1.2, 11.5, 0.4);

      // Tapered glass bottle neck
      ctx.fillStyle = '#065f46';
      ctx.fillRect(-2.5, -6.5, 5, 2.8);

      // Dark brown rubber cork / cap
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.roundRect(-2.2, -8.5, 4.4, 2.2, 0.6);
      ctx.fill();
      return true;
    }

    case 'iodine': {
      drawShadow(ctx, 6.2, 2.5, 7.5, 0.22);

      // Dark amber glass bottle body
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.roundRect(-5, -4, 10, 11.5, 2);
      ctx.fill();

      // Rich golden-brown iodine liquid inside
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.roundRect(-4.2, -2, 8.4, 9, 1.5);
      ctx.fill();

      // White label with iodine grid indicator
      ctx.fillStyle = '#fff7ed';
      ctx.fillRect(-4.5, -1, 9, 5.5);
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(-4.5, -0.2, 9, 1.8);
      drawMedicalCross(ctx, 0, 2.8, 2.5, '#c2410c');

      // Glass specular reflection
      drawGlossBand(ctx, -4, -4, 1.2, 11.5, 0.4);

      // Bottle neck & orange-brown ribbed cap
      ctx.fillStyle = '#92400e';
      ctx.fillRect(-2.5, -6.5, 5, 2.8);
      ctx.fillStyle = '#7c2d12';
      ctx.beginPath();
      ctx.roundRect(-2.5, -8.5, 5, 2.4, 0.6);
      ctx.fill();
      return true;
    }

    case 'diclofenac_gel': {
      drawShadow(ctx, 7.5, 2.6, 7.5, 0.22);

      // White aluminum gel tube
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(-6, -7.5, 12, 15, 2);
      ctx.fill();
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Cyan / electric blue anti-inflammatory wave band
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(-6, -4, 12, 5.5);
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(-6, -1);
      ctx.quadraticCurveTo(0, -3, 6, -1);
      ctx.lineTo(6, 0.5);
      ctx.quadraticCurveTo(0, -1.5, -6, 0.5);
      ctx.closePath();
      ctx.fill();

      // Red cross badge
      drawMedicalCross(ctx, -3, -1.5, 2.8, '#ffffff');

      // Crimped metallic bottom end
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-6, 6.2, 12, 1.5);

      // White ribbed hex cap
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.roundRect(-3, -9.8, 6, 2.6, 0.8);
      ctx.fill();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 0.6;
      ctx.stroke();
      return true;
    }

    case 'hydrogen_peroxide': {
      drawShadow(ctx, 6.5, 2.6, 7.5, 0.22);

      // Opaque white plastic bottle
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.roundRect(-5.5, -5, 11, 13.5, 2.5);
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Medical blue label with red cross
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(-5.5, -2, 11, 6);
      drawMedicalCross(ctx, 0, 1, 3.5, '#ef4444');

      // Peroxide oxygen bubbles graphic hint
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.beginPath();
      ctx.arc(-3, -0.5, 0.8, 0, Math.PI * 2);
      ctx.arc(3, 2.2, 0.9, 0, Math.PI * 2);
      ctx.fill();

      // Bottle neck & white squeeze dropper cap
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(-2.5, -7, 5, 2.2);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(-2, -9.5, 4, 2.8, 0.6);
      ctx.fill();
      return true;
    }

    case 'ammonia_spirit': {
      drawShadow(ctx, 5.8, 2.4, 7.5, 0.22);

      // Amber glass vial body
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.roundRect(-4.5, -4, 9, 10.5, 2);
      ctx.fill();

      // Clear liquid inside
      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.roundRect(-3.8, -1.5, 7.6, 7.5, 1.2);
      ctx.fill();

      // White clinical label with red hazard diamond
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-4, -1, 8, 5);
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(0, 0.2); ctx.lineTo(2, 1.5); ctx.lineTo(0, 2.8); ctx.lineTo(-2, 1.5);
      ctx.closePath();
      ctx.fill();

      // Glass specular sheen
      drawGlossBand(ctx, -3.5, -4, 1.2, 10.5, 0.4);

      // Neck & white screw cap
      ctx.fillStyle = '#92400e';
      ctx.fillRect(-2, -6, 4, 2);
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.roundRect(-2.2, -8, 4.4, 2.2, 0.6);
      ctx.fill();
      return true;
    }

    case 'balm_star': {
      drawShadow(ctx, 7, 3, 7.2, 0.25);

      // Iconic crimson red round tin compact
      ctx.fillStyle = '#b91c1c';
      ctx.beginPath();
      ctx.ellipse(0, 0, 7.2, 6.8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Golden metallic outer rim ring
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Golden inner decorative ring
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.ellipse(0, 0, 5.5, 5.2, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Golden 5-pointed star embossed in center
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      const outerR = 3.8;
      const innerR = 1.6;
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const angle = (i * Math.PI) / 5 - Math.PI / 2;
        const sx = Math.cos(angle) * r;
        const sy = Math.sin(angle) * r * 0.92;
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.closePath();
      ctx.fill();

      // Specular metallic reflection on red enamel
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.beginPath();
      ctx.ellipse(-2.5, -2.5, 3, 1.5, -Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    case 'activated_charcoal': {
      drawShadow(ctx, 7.5, 2.8, 7.5, 0.22);

      // Silver foil blister card
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.roundRect(-7, -8, 14, 15.5, 1.5);
      ctx.fill();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Black pharmaceutical top banner
      ctx.fillStyle = '#18181b';
      ctx.fillRect(-7, -8, 14, 3.2);

      // 2x5 grid of dark matte charcoal tablets under blister domes
      const rows = [-4, -1.2, 1.6, 4.4];
      rows.forEach(ry => {
        [-3.8, 3.8].forEach(rx => {
          // Blister bubble dome
          ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.beginPath();
          ctx.arc(rx, ry, 2.1, 0, Math.PI * 2);
          ctx.fill();

          // Black charcoal tablet inside
          ctx.fillStyle = '#27272a';
          ctx.beginPath();
          ctx.arc(rx, ry, 1.6, 0, Math.PI * 2);
          ctx.fill();
        });
      });
      return true;
    }

    case 'valerian_drops': {
      drawShadow(ctx, 6.2, 2.5, 7.5, 0.22);

      // Dark amber glass bottle body
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.roundRect(-5, -3, 10, 11, 2);
      ctx.fill();

      // Herbal brown liquid fill
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.roundRect(-4.2, -1, 8.4, 8.5, 1.5);
      ctx.fill();

      // Green herbal label
      ctx.fillStyle = '#f0fdf4';
      ctx.fillRect(-4.5, 0, 9, 5);
      ctx.fillStyle = '#16a34a';
      ctx.fillRect(-4.5, 1, 9, 1.8);

      // Glass specular reflection
      drawGlossBand(ctx, -4, -3, 1.2, 11, 0.4);

      // Dropper neck stem & black rubber squeeze bulb cap
      ctx.fillStyle = '#18181b';
      ctx.fillRect(-1.5, -6, 3, 3);
      ctx.beginPath();
      ctx.arc(0, -7.5, 2.4, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    default:
      return false;
  }
}
