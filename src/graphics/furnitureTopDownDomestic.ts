// High-detail realistic 90-degree orthographic top-down models
// for all domestic / residential interior furniture & appliances.

import type { InteriorFurniture } from '../buildingInteriors';
import {
  shade,
  mix,
  getLuminance,
  isLightColor,
  rr,
  drawRectContactShadow,
  drawEllipseContactShadow,
  drawArchitecturalBevel,
  drawWoodSurface,
  drawUpholsteredCushion,
  drawBrushedMetal,
  drawGlassPanel,
  drawCabinetPull,
  drawChromeFaucet,
  drawBotanicalLeaf,
} from './furnitureTopDownMaterials';

export function renderDomesticFurniture(
  ctx: CanvasRenderingContext2D,
  f: InteriorFurniture,
  timeHour: number
): boolean {
  const w = Math.max(1, f.width);
  const h = Math.max(1, f.height);
  const hw = w / 2;
  const hh = h / 2;
  const minD = Math.min(w, h);
  const isNight = timeHour >= 18 || timeHour < 6.5;

  switch (f.type) {
    // =========================================================================
    // 1. MASTER DOUBLE BED (Exact Top-Down Plan)
    // =========================================================================
    case 'bed': {
      const duvetHex = f.color || '#3b82f6';
      const frameHex = '#4a2c18';

      drawRectContactShadow(ctx, -hw, -hh, w, h, Math.min(1.6, minD * 0.08), 1.25);

      // Solid timber outer platform bed frame
      drawWoodSurface(ctx, -hw, -hh, w, h, frameHex, Math.min(1.4, minD * 0.06), true, 0);

      // Thick padded/carved headboard rail along top (-hh)
      const headH = Math.max(2.0, h * 0.12);
      drawWoodSurface(ctx, -hw - 0.2, -hh, w + 0.4, headH, shade(frameHex, -0.25), 0.9, true, 0);
      // Upholstered headboard insert panel
      if (w > 12) {
        drawUpholsteredCushion(
          ctx,
          -hw + 1.2,
          -hh + headH * 0.25,
          w - 2.4,
          headH * 0.68,
          mix(duvetHex, '#334155', 0.6),
          0.6,
          { tufts: Math.max(2, Math.round(w / 7)), piping: false }
        );
      }

      // Crisp fitted mattress inset
      const pad = Math.max(0.8, minD * 0.045);
      const mX = -hw + pad;
      const mY = -hh + headH + 0.2;
      const mW = w - pad * 2;
      const mH = h - headH - pad - 0.3;

      const matGrad = ctx.createLinearGradient(mX, mY, mX + mW, mY + mH);
      matGrad.addColorStop(0, '#ffffff');
      matGrad.addColorStop(0.7, '#f1f5f9');
      matGrad.addColorStop(1, '#cbd5e1');
      ctx.fillStyle = matGrad;
      rr(ctx, mX, mY, mW, mH, 1.0);
      ctx.fill();
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.35)';
      ctx.lineWidth = 0.35;
      ctx.stroke();

      // Twin plump sleeping pillows (top-down sculpted with center head indentation)
      const pGap = Math.max(0.8, mW * 0.055);
      const pW = (mW - pGap * 3) / 2;
      const pH = Math.max(2.8, mH * 0.22);
      const pY = mY + Math.max(0.6, mH * 0.035);

      for (let i = 0; i < 2; i++) {
        const px = mX + pGap + i * (pW + pGap);
        // Pillow shadow on mattress
        ctx.fillStyle = 'rgba(15, 23, 42, 0.16)';
        rr(ctx, px + 0.35, pY + 0.45, pW, pH, pH * 0.32);
        ctx.fill();

        // Main white cotton pillow
        drawUpholsteredCushion(ctx, px, pY, pW, pH, '#f8fafc', pH * 0.32, { piping: true });

        // Soft organic center depression crease
        const depGrad = ctx.createRadialGradient(
          px + pW * 0.5,
          pY + pH * 0.52,
          0.1,
          px + pW * 0.5,
          pY + pH * 0.52,
          pW * 0.36
        );
        depGrad.addColorStop(0, 'rgba(148, 163, 184, 0.32)');
        depGrad.addColorStop(1, 'rgba(148, 163, 184, 0)');
        ctx.fillStyle = depGrad;
        ctx.beginPath();
        ctx.ellipse(px + pW * 0.5, pY + pH * 0.52, pW * 0.34, pH * 0.26, 0, 0, Math.PI * 2);
        ctx.fill();

        // Smaller accent lumbar cushion in front of main pillow
        if (mH > 12) {
          const acW = pW * 0.68;
          const acH = pH * 0.42;
          const acX = px + (pW - acW) * 0.5;
          const acY = pY + pH * 0.68;
          drawUpholsteredCushion(ctx, acX, acY, acW, acH, shade(duvetHex, 0.28), acH * 0.35, { piping: false });
        }
      }

      // Main plush comforter / duvet (covers lower ~68% of mattress with subtle side overhang)
      const duvetY = pY + pH + Math.max(0.7, mH * 0.045);
      const duvetH = mY + mH - duvetY + 0.2;
      const duvetX = mX - 0.15;
      const duvetW = mW + 0.3;

      // Soft duvet edge shadow on sheet
      ctx.fillStyle = 'rgba(15, 23, 42, 0.18)';
      rr(ctx, duvetX + 0.2, duvetY - 0.3, duvetW, duvetH + 0.5, 1.0);
      ctx.fill();

      ctx.save();
      rr(ctx, duvetX, duvetY, duvetW, duvetH, 1.0);
      const duvGrad = ctx.createLinearGradient(duvetX, duvetY, duvetX + duvetW * 0.85, duvetY + duvetH);
      duvGrad.addColorStop(0, shade(duvetHex, 0.2));
      duvGrad.addColorStop(0.45, duvetHex);
      duvGrad.addColorStop(1, shade(duvetHex, -0.28));
      ctx.fillStyle = duvGrad;
      ctx.fill();
      ctx.clip();

      // Subtle quilted baffle stitching & organic fabric drape folds
      ctx.strokeStyle = shade(duvetHex, -0.38, duvetHex, 0.24);
      ctx.lineWidth = Math.max(0.28, minD * 0.015);
      const qStep = Math.max(2.6, duvetH / 4.2);
      for (let qy = duvetY + qStep; qy < duvetY + duvetH - 1; qy += qStep) {
        ctx.beginPath();
        ctx.moveTo(duvetX, qy);
        ctx.bezierCurveTo(
          duvetX + duvetW * 0.33,
          qy + 0.5,
          duvetX + duvetW * 0.66,
          qy - 0.45,
          duvetX + duvetW,
          qy + 0.2
        );
        ctx.stroke();
      }

      // Soft diagonal fabric highlight wrinkle
      const foldGrad = ctx.createLinearGradient(duvetX, duvetY + duvetH * 0.2, duvetX + duvetW, duvetY + duvetH * 0.7);
      foldGrad.addColorStop(0, 'rgba(255,255,255,0)');
      foldGrad.addColorStop(0.45, 'rgba(255,255,255,0.14)');
      foldGrad.addColorStop(0.55, 'rgba(0,0,0,0.09)');
      foldGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = foldGrad;
      ctx.fillRect(duvetX, duvetY, duvetW, duvetH);

      // Decorative woven foot-runner blanket near foot of bed
      const runH = Math.max(2.2, duvetH * 0.22);
      const runY = duvetY + duvetH - runH - Math.max(0.8, duvetH * 0.08);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
      ctx.fillRect(duvetX, runY - 0.35, duvetW, runH + 0.7);
      ctx.fillStyle = shade(duvetHex, -0.36);
      ctx.fillRect(duvetX, runY, duvetW, runH);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
      ctx.lineWidth = 0.35;
      ctx.beginPath();
      ctx.moveTo(duvetX, runY + 0.45);
      ctx.lineTo(duvetX + duvetW, runY + 0.45);
      ctx.moveTo(duvetX, runY + runH - 0.45);
      ctx.lineTo(duvetX + duvetW, runY + runH - 0.45);
      ctx.stroke();
      ctx.restore();

      // Folded crisp white top-sheet turn-down cuff (organic wave)
      const cuffH = Math.max(1.5, mH * 0.1);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.22)';
      ctx.beginPath();
      ctx.moveTo(duvetX, duvetY + cuffH + 0.4);
      ctx.quadraticCurveTo(0, duvetY + cuffH + 1.0, duvetX + duvetW, duvetY + cuffH + 0.3);
      ctx.lineTo(duvetX + duvetW, duvetY);
      ctx.lineTo(duvetX, duvetY);
      ctx.closePath();
      ctx.fill();

      const cuffGrad = ctx.createLinearGradient(0, duvetY, 0, duvetY + cuffH);
      cuffGrad.addColorStop(0, '#ffffff');
      cuffGrad.addColorStop(0.75, '#f1f5f9');
      cuffGrad.addColorStop(1, '#cbd5e1');
      ctx.fillStyle = cuffGrad;
      ctx.beginPath();
      ctx.moveTo(duvetX, duvetY);
      ctx.lineTo(duvetX + duvetW, duvetY);
      ctx.lineTo(duvetX + duvetW, duvetY + cuffH);
      ctx.quadraticCurveTo(0, duvetY + cuffH + 0.65, duvetX, duvetY + cuffH);
      ctx.closePath();
      ctx.fill();

      return true;
    }

    // =========================================================================
    // 2. KIDS SINGLE BED (Exact Top-Down Plan)
    // =========================================================================
    case 'kids_bed': {
      const quiltHex = f.color || '#38bdf8';
      const birchHex = '#d4a373';

      drawRectContactShadow(ctx, -hw, -hh, w, h, 1.4, 1.1);
      drawWoodSurface(ctx, -hw, -hh, w, h, birchHex, 1.4, false, 0);

      // Rounded headboard & child safety side rails
      const headH = Math.max(1.8, h * 0.11);
      drawWoodSurface(ctx, -hw, -hh, w, headH, shade(birchHex, -0.16), 1.0, true, 0);
      // Side guard rails
      const railW = Math.max(0.9, w * 0.065);
      drawWoodSurface(ctx, -hw, -hh + headH, railW, h * 0.56, shade(birchHex, 0.08), 0.5, false, 0);
      drawWoodSurface(ctx, hw - railW, -hh + headH, railW, h * 0.56, shade(birchHex, 0.08), 0.5, false, 0);

      // Mattress
      const pad = railW + 0.25;
      const mX = -hw + pad;
      const mY = -hh + headH + 0.2;
      const mW = w - pad * 2;
      const mH = h - headH - pad * 0.8 - 0.4;
      ctx.fillStyle = '#f8fafc';
      rr(ctx, mX, mY, mW, mH, 0.8);
      ctx.fill();

      // Single plump child pillow
      const pH = Math.max(2.6, mH * 0.22);
      drawUpholsteredCushion(ctx, mX + 0.9, mY + 0.6, mW - 1.8, pH, '#fef9c3', pH * 0.35, { piping: true });

      // Playful quilted duvet
      const duvY = mY + pH + 1.1;
      const duvH = mY + mH - duvY;
      ctx.save();
      rr(ctx, mX, duvY, mW, duvH, 0.8);
      const dg = ctx.createLinearGradient(mX, duvY, mX + mW, duvY + duvH);
      dg.addColorStop(0, shade(quiltHex, 0.2));
      dg.addColorStop(1, shade(quiltHex, -0.22));
      ctx.fillStyle = dg;
      ctx.fill();
      ctx.clip();

      // Soft star/dot pattern
      ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
      const step = Math.max(2.6, minD * 0.2);
      for (let py = duvY + step * 0.7; py < duvY + duvH - 0.8; py += step) {
        for (let px = mX + step * 0.6; px < mX + mW - 0.8; px += step) {
          ctx.beginPath();
          ctx.arc(px, py, Math.max(0.45, step * 0.14), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();

      // Folded white sheet cuff
      ctx.fillStyle = '#ffffff';
      rr(ctx, mX, duvY, mW, Math.max(1.2, mH * 0.08), 0.4);
      ctx.fill();

      // Top-down small plush bear resting on pillow corner
      if (w >= 10) {
        const bx = mX + mW - 2.4;
        const by = mY + pH * 0.55;
        const br = Math.max(0.9, minD * 0.07);
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.beginPath();
        ctx.arc(bx + 0.2, by + 0.25, br * 1.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#a16207';
        ctx.beginPath();
        ctx.arc(bx - br * 0.75, by - br * 0.65, br * 0.45, 0, Math.PI * 2);
        ctx.arc(bx + br * 0.75, by - br * 0.65, br * 0.45, 0, Math.PI * 2);
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fef3c7';
        ctx.beginPath();
        ctx.arc(bx, by + br * 0.28, br * 0.42, 0, Math.PI * 2);
        ctx.fill();
      }
      return true;
    }

    // =========================================================================
    // 3. SOFA / COUCH (Exact Top-Down Plan)
    // =========================================================================
    case 'sofa': {
      const baseHex = f.color || '#475569';
      const r = Math.min(2.0, minD * 0.18);

      drawRectContactShadow(ctx, -hw, -hh, w, h, r, 1.25);

      // Subtle outer structural chassis base
      ctx.fillStyle = shade(baseHex, -0.35);
      rr(ctx, -hw, -hh, w, h, r);
      ctx.fill();

      const armW = Math.max(1.8, Math.min(w * 0.14, h * 0.36));
      const backH = Math.max(2.0, h * 0.3);
      const seatX = -hw + armW * 0.85;
      const seatW = w - armW * 1.7;
      const seatY = -hh + backH * 0.82;
      const seatH = h - backH * 0.82 - 0.35;

      // Individual plush seat cushions (2 or 3 depending on width/height ratio)
      const numSeats = w / Math.max(1, h) > 2.35 ? 3 : 2;
      const gap = Math.max(0.35, minD * 0.035);
      const cW = (seatW - gap * (numSeats - 1)) / numSeats;
      for (let i = 0; i < numSeats; i++) {
        const cx = seatX + i * (cW + gap);
        drawUpholsteredCushion(ctx, cx, seatY, cW, seatH, shade(baseHex, 0.06), Math.min(1.5, cW * 0.18), {
          piping: true,
          crease: true,
        });
      }

      // Tailored backrest pillows along -hh (overlapping seat top with cast shadow)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
      rr(ctx, -hw + armW * 0.5, -hh + backH * 0.72, w - armW, backH * 0.35, 0.8);
      ctx.fill();

      const backCushionW = (w - armW * 1.6 - gap * (numSeats - 1)) / numSeats;
      for (let i = 0; i < numSeats; i++) {
        const bx = -hw + armW * 0.8 + i * (backCushionW + gap);
        drawUpholsteredCushion(ctx, bx, -hh + 0.2, backCushionW, backH * 0.92, shade(baseHex, -0.06), Math.min(1.4, backH * 0.4), {
          tufts: w > 22 ? 2 : 1,
          piping: true,
        });
      }

      // Rounded rolled armrests on left and right
      drawUpholsteredCushion(ctx, -hw, -hh, armW, h, shade(baseHex, -0.1), Math.min(1.6, armW * 0.45), {
        piping: true,
      });
      drawUpholsteredCushion(ctx, hw - armW, -hh, armW, h, shade(baseHex, -0.1), Math.min(1.6, armW * 0.45), {
        piping: true,
      });

      // Woven throw blanket casually draped over right armrest
      if (w >= 18) {
        const throwHex = getLuminance(baseHex) > 0.5 ? '#7c2d12' : '#d97706';
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        rr(ctx, hw - armW - 1.4, -hh + h * 0.28, armW + 1.5, h * 0.46, 0.8);
        ctx.fill();
        const tg = ctx.createLinearGradient(hw - armW - 1.2, 0, hw, 0);
        tg.addColorStop(0, shade(throwHex, 0.22));
        tg.addColorStop(0.5, throwHex);
        tg.addColorStop(1, shade(throwHex, -0.25));
        ctx.fillStyle = tg;
        rr(ctx, hw - armW - 1.2, -hh + h * 0.26, armW + 1.25, h * 0.44, 0.7);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.22)';
        ctx.lineWidth = 0.3;
        ctx.beginPath();
        ctx.moveTo(hw - armW - 1.0, -hh + h * 0.34);
        ctx.lineTo(hw, -hh + h * 0.34);
        ctx.moveTo(hw - armW - 1.0, -hh + h * 0.62);
        ctx.lineTo(hw, -hh + h * 0.62);
        ctx.stroke();
        ctx.restore();
      }

      // Twin angled accent throw pillows nestled in back corners
      if (w >= 14) {
        const pw = Math.min(seatH * 0.62, armW * 1.15);
        const ph = pw * 0.68;
        const p1Hex = '#f59e0b';
        const p2Hex = '#e11d48';

        ctx.save();
        ctx.translate(-hw + armW + pw * 0.32, seatY + ph * 0.35);
        ctx.rotate(-0.42);
        drawUpholsteredCushion(ctx, -pw / 2, -ph / 2, pw, ph, p1Hex, ph * 0.38, { piping: false });
        ctx.restore();

        ctx.save();
        ctx.translate(hw - armW - pw * 0.32, seatY + ph * 0.35);
        ctx.rotate(0.42);
        drawUpholsteredCushion(ctx, -pw / 2, -ph / 2, pw, ph, p2Hex, ph * 0.38, { piping: false });
        ctx.restore();
      }
      return true;
    }

    // =========================================================================
    // 4. BEAN BAG CHAIR (Exact Top-Down Plan)
    // =========================================================================
    case 'bean_bag': {
      const hex = f.color || '#ea580c';
      drawEllipseContactShadow(ctx, 0, 0.2, hw * 0.94, hh * 0.92, 1.1);

      // Organic contoured teardrop-circle silhouette
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, -hh * 0.9);
      ctx.bezierCurveTo(hw * 0.85, -hh * 0.82, hw * 1.02, hh * 0.25, hw * 0.72, hh * 0.85);
      ctx.bezierCurveTo(hw * 0.34, hh * 1.02, -hw * 0.34, hh * 1.02, -hw * 0.72, hh * 0.85);
      ctx.bezierCurveTo(-hw * 1.02, hh * 0.25, -hw * 0.85, -hh * 0.82, 0, -hh * 0.9);
      ctx.closePath();

      const bg = ctx.createRadialGradient(-hw * 0.2, -hh * 0.25, minD * 0.06, 0, hh * 0.08, Math.max(hw, hh) * 1.08);
      bg.addColorStop(0, shade(hex, 0.28));
      bg.addColorStop(0.58, hex);
      bg.addColorStop(1, shade(hex, -0.38));
      ctx.fillStyle = bg;
      ctx.fill();
      ctx.clip();

      // Seating depression valley in lower-center
      const seatG = ctx.createRadialGradient(0, hh * 0.22, 0.1, 0, hh * 0.22, minD * 0.38);
      seatG.addColorStop(0, 'rgba(0, 0, 0, 0.26)');
      seatG.addColorStop(0.65, 'rgba(0, 0, 0, 0.08)');
      seatG.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = seatG;
      ctx.beginPath();
      ctx.ellipse(0, hh * 0.22, hw * 0.56, hh * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();

      // 6 Stitched gore panel seams radiating from upper apex button
      const apexX = 0;
      const apexY = -hh * 0.38;
      ctx.strokeStyle = shade(hex, -0.45, hex, 0.48);
      ctx.lineWidth = Math.max(0.3, minD * 0.032);
      const targets = [
        [-hw * 0.78, -hh * 0.42],
        [hw * 0.78, -hh * 0.42],
        [-hw * 0.92, hh * 0.28],
        [hw * 0.92, hh * 0.28],
        [-hw * 0.4, hh * 0.95],
        [hw * 0.4, hh * 0.95],
      ];
      for (const [tx, ty] of targets) {
        ctx.beginPath();
        ctx.moveTo(apexX, apexY);
        ctx.quadraticCurveTo((apexX + tx) * 0.52, (apexY + ty) * 0.45, tx, ty);
        ctx.stroke();
      }
      ctx.restore();

      // Outer outline
      ctx.strokeStyle = shade(hex, -0.5, hex, 0.65);
      ctx.lineWidth = Math.max(0.35, minD * 0.035);
      ctx.beginPath();
      ctx.moveTo(0, -hh * 0.9);
      ctx.bezierCurveTo(hw * 0.85, -hh * 0.82, hw * 1.02, hh * 0.25, hw * 0.72, hh * 0.85);
      ctx.bezierCurveTo(hw * 0.34, hh * 1.02, -hw * 0.34, hh * 1.02, -hw * 0.72, hh * 0.85);
      ctx.bezierCurveTo(-hw * 1.02, hh * 0.25, -hw * 0.85, -hh * 0.82, 0, -hh * 0.9);
      ctx.stroke();

      // Apex covered button & top fabric carry loop
      ctx.fillStyle = shade(hex, -0.35);
      ctx.beginPath();
      ctx.arc(0, -hh * 0.38, Math.max(0.65, minD * 0.09), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = shade(hex, -0.25);
      rr(ctx, -hw * 0.22, -hh * 0.96, hw * 0.44, Math.max(0.8, hh * 0.16), 0.35);
      ctx.fill();
      return true;
    }

    // =========================================================================
    // 5. CHAIR (Office Swivel / Dining Chair — Exact Top-Down Plan)
    // =========================================================================
    case 'chair': {
      const hex = f.color || '#334155';
      const isWoodChair = hex === '#451a03' || hex === '#78350f' || hex === '#92400e' || hex === '#7c2d12' || hex === '#b45309';

      drawEllipseContactShadow(ctx, 0, 0.2, hw * 0.9, hh * 0.88, 0.9);

      if (isWoodChair) {
        // Classic top-down solid hardwood dining chair
        // Subtle seat cushion + mitered wood seat frame
        drawWoodSurface(ctx, -hw * 0.86, -hh * 0.76, w * 0.86, h * 0.82, hex, Math.min(1.0, minD * 0.16), true, 0);
        // Padded linen/leather seat insert
        drawUpholsteredCushion(
          ctx,
          -hw * 0.68,
          -hh * 0.5,
          w * 0.68,
          h * 0.64,
          mix(hex, '#e2e8f0', 0.25),
          Math.min(0.9, minD * 0.16),
          { piping: false }
        );
        // Curved solid timber top backrest rail along -hh
        drawWoodSurface(ctx, -hw * 0.9, -hh * 0.92, w * 0.9, Math.max(1.1, h * 0.24), shade(hex, -0.15), Math.min(0.8, minD * 0.15), true, 0);
      } else {
        // Ergonomic top-down office swivel chair
        // 5-star caster base arms subtly peeking beneath seat
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = Math.max(0.45, minD * 0.085);
        ctx.lineCap = 'round';
        for (let a = 0; a < 5; a++) {
          const ang = (a * Math.PI * 2) / 5 - Math.PI / 2;
          const lx = Math.cos(ang) * hw * 0.98;
          const ly = Math.sin(ang) * hh * 0.98;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(lx, ly);
          ctx.stroke();
          // Castor wheel tip
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(lx, ly, Math.max(0.35, minD * 0.075), 0, Math.PI * 2);
          ctx.fill();
        }

        // Ergonomic sculpted armrests (left & right)
        const armW = Math.max(0.75, w * 0.15);
        const armH = h * 0.62;
        drawBrushedMetal(ctx, -hw * 0.94, -hh * 0.42, armW, armH, '#1e293b', armW * 0.45, true);
        drawBrushedMetal(ctx, hw * 0.94 - armW, -hh * 0.42, armW, armH, '#1e293b', armW * 0.45, true);

        // Padded contoured seat pan
        drawUpholsteredCushion(
          ctx,
          -hw * 0.74,
          -hh * 0.44,
          w * 0.74,
          h * 0.78,
          hex,
          Math.min(1.6, minD * 0.26),
          { piping: true, crease: true }
        );

        // Curved lumbar backrest profile along top (-hh)
        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        ctx.beginPath();
        ctx.ellipse(0, -hh * 0.52, hw * 0.82, Math.max(0.8, hh * 0.26), 0, 0, Math.PI * 2);
        ctx.fill();

        const backH = Math.max(1.1, h * 0.24);
        drawUpholsteredCushion(
          ctx,
          -hw * 0.84,
          -hh * 0.86,
          w * 0.84,
          backH,
          shade(hex, -0.15),
          backH * 0.48,
          { piping: false }
        );
      }
      return true;
    }

    // =========================================================================
    // 6. BENCH (Hardwood Slat / Sauna Tier Bench — Exact Top-Down Plan)
    // =========================================================================
    case 'bench': {
      const slatHex = f.color || '#b45309';
      const isHoriz = w >= h;

      drawRectContactShadow(ctx, -hw, -hh, w, h, 0.8, 1.0);

      // Steel / timber structural cross-stringers visible in gaps between slats
      ctx.fillStyle = '#1e293b';
      if (isHoriz) {
        const strW = Math.max(1.0, w * 0.075);
        ctx.fillRect(-hw + w * 0.1, -hh + 0.3, strW, h - 0.6);
        ctx.fillRect(hw - w * 0.1 - strW, -hh + 0.3, strW, h - 0.6);
        if (w > 18) ctx.fillRect(-strW / 2, -hh + 0.3, strW, h - 0.6);

        const slats = Math.max(3, Math.min(7, Math.round(h / 2.2)));
        const gap = Math.max(0.35, h * 0.055);
        const slatH = (h - gap * (slats - 1)) / slats;
        for (let i = 0; i < slats; i++) {
          const sy = -hh + i * (slatH + gap);
          drawWoodSurface(ctx, -hw, sy, w, slatH, shade(slatHex, (i % 2 === 0 ? 0.04 : -0.05)), 0.35, true, 0);
          // Carriage bolts
          ctx.fillStyle = '#cbd5e1';
          const br = Math.max(0.22, slatH * 0.14);
          ctx.beginPath();
          ctx.arc(-hw + w * 0.1 + strW * 0.5, sy + slatH * 0.5, br, 0, Math.PI * 2);
          ctx.arc(hw - w * 0.1 - strW * 0.5, sy + slatH * 0.5, br, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        const strH = Math.max(1.0, h * 0.075);
        ctx.fillRect(-hw + 0.3, -hh + h * 0.1, w - 0.6, strH);
        ctx.fillRect(-hw + 0.3, hh - h * 0.1 - strH, w - 0.6, strH);

        const slats = Math.max(3, Math.min(7, Math.round(w / 2.6)));
        const gap = Math.max(0.35, w * 0.055);
        const slatW = (w - gap * (slats - 1)) / slats;
        for (let i = 0; i < slats; i++) {
          const sx = -hw + i * (slatW + gap);
          drawWoodSurface(ctx, sx, -hh, slatW, h, shade(slatHex, (i % 2 === 0 ? 0.04 : -0.05)), 0.35, false, 0);
        }
      }
      return true;
    }

    // =========================================================================
    // 7. TABLE (Dining / Conference / Billiard Table — Exact Top-Down Plan)
    // =========================================================================
    case 'table': {
      const tableHex = f.color || '#78350f';

      // Special recognition for green billiard/pool table!
      if (tableHex === '#15803d' || tableHex === '#166534' || tableHex === '#16a34a') {
        drawRectContactShadow(ctx, -hw, -hh, w, h, 1.4, 1.3);
        // Solid mahogany outer cushion frame
        drawWoodSurface(ctx, -hw, -hh, w, h, '#5c2810', 1.4, true, 0);

        const rail = Math.max(1.2, minD * 0.13);
        // Green tournament wool baize felt
        const feltG = ctx.createRadialGradient(-hw * 0.15, -hh * 0.15, minD * 0.1, 0, 0, Math.max(hw, hh));
        feltG.addColorStop(0, '#16a34a');
        feltG.addColorStop(0.7, '#15803d');
        feltG.addColorStop(1, '#14532d');
        ctx.fillStyle = feltG;
        rr(ctx, -hw + rail, -hh + rail, w - rail * 2, h - rail * 2, 0.5);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.lineWidth = 0.5;
        ctx.stroke();

        // 6 Leather drop pockets
        const pr = Math.max(0.85, rail * 0.62);
        const pockets = [
          [-hw + rail * 0.75, -hh + rail * 0.75],
          [0, -hh + rail * 0.65],
          [hw - rail * 0.75, -hh + rail * 0.75],
          [-hw + rail * 0.75, hh - rail * 0.75],
          [0, hh - rail * 0.65],
          [hw - rail * 0.75, hh - rail * 0.75],
        ];
        for (const [px, py] of pockets) {
          ctx.fillStyle = '#090d16';
          ctx.beginPath();
          ctx.arc(px, py, pr, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ca8a04';
          ctx.lineWidth = 0.35;
          ctx.stroke();
        }

        // Baulk line & cue ball + colorful racked balls
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
        ctx.lineWidth = 0.25;
        ctx.beginPath();
        ctx.moveTo(-hw + w * 0.26, -hh + rail);
        ctx.lineTo(-hw + w * 0.26, hh - rail);
        ctx.stroke();

        const ballR = Math.max(0.42, minD * 0.045);
        const balls: [number, number, string][] = [
          [-hw * 0.45, 0, '#f8fafc'],
          [hw * 0.22, 0, '#facc15'],
          [hw * 0.34, -ballR * 1.15, '#ef4444'],
          [hw * 0.34, ballR * 1.15, '#2563eb'],
          [hw * 0.46, -ballR * 2.2, '#7c3aed'],
          [hw * 0.46, 0, '#0f172a'],
          [hw * 0.46, ballR * 2.2, '#ea580c'],
        ];
        for (const [bx, by, bc] of balls) {
          ctx.fillStyle = 'rgba(0,0,0,0.32)';
          ctx.beginPath();
          ctx.arc(bx + 0.2, by + 0.25, ballR, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = bc;
          ctx.beginPath();
          ctx.arc(bx, by, ballR, 0, Math.PI * 2);
          ctx.fill();
        }
        return true;
      }

      // Standard dining / conference / coffee table
      drawRectContactShadow(ctx, -hw, -hh, w, h, 1.1, 1.3);

      // Subtle under-table corner leg occlusion dots
      const legOff = Math.max(0.8, minD * 0.1);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(-hw + legOff, -hh + legOff, 1.4, 1.4);
      ctx.fillRect(hw - legOff - 1.4, -hh + legOff, 1.4, 1.4);
      ctx.fillRect(-hw + legOff, hh - legOff - 1.4, 1.4, 1.4);
      ctx.fillRect(hw - legOff - 1.4, hh - legOff - 1.4, 1.4, 1.4);

      const isHoriz = w >= h;
      const planks = Math.max(3, Math.min(6, Math.round(minD / 3.2)));
      drawWoodSurface(ctx, -hw, -hh, w, h, tableHex, Math.min(1.2, minD * 0.08), isHoriz, planks);

      // Chamfered inner inlay border
      if (minD >= 9) {
        const inset = Math.max(0.7, minD * 0.07);
        rr(ctx, -hw + inset, -hh + inset, w - inset * 2, h - inset * 2, 0.5);
        ctx.strokeStyle = shade(tableHex, 0.25, tableHex, 0.22);
        ctx.lineWidth = 0.35;
        ctx.stroke();
      }

      // Woven linen table runner + ceramic centerpiece bowl
      if (w >= 15 && h >= 9) {
        const runH = Math.min(h * 0.32, 4.2);
        const runW = w - 2.4;
        ctx.fillStyle = 'rgba(248, 250, 252, 0.78)';
        rr(ctx, -runW / 2, -runH / 2, runW, runH, 0.35);
        ctx.fill();
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
        ctx.lineWidth = 0.3;
        ctx.stroke();

        // Small ceramic centerpiece dish / plant bowl
        const bowlR = Math.min(runH * 0.42, 1.7);
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.arc(0.25, 0.3, bowlR, 0, Math.PI * 2);
        ctx.fill();
        const bg = ctx.createRadialGradient(-bowlR * 0.3, -bowlR * 0.3, 0.1, 0, 0, bowlR);
        bg.addColorStop(0, '#ffffff');
        bg.addColorStop(0.65, '#e2e8f0');
        bg.addColorStop(1, '#94a3b8');
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.arc(0, 0, bowlR, 0, Math.PI * 2);
        ctx.fill();
      }
      return true;
    }

    // =========================================================================
    // 8. KIDS PLAY TABLE (Exact Top-Down Plan)
    // =========================================================================
    case 'kids_table': {
      const hex = f.color || '#f59e0b';
      drawEllipseContactShadow(ctx, 0, 0, hw, hh, 1.15);

      const g = ctx.createRadialGradient(-hw * 0.25, -hh * 0.25, minD * 0.08, 0, 0, Math.max(hw, hh));
      g.addColorStop(0, shade(hex, 0.26));
      g.addColorStop(0.75, hex);
      g.addColorStop(1, shade(hex, -0.22));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(0, 0, hw, hh, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = shade(hex, -0.38);
      ctx.lineWidth = 0.6;
      ctx.stroke();

      // Smooth birch outer rim ring
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 0.45;
      ctx.beginPath();
      ctx.ellipse(0, 0, hw * 0.9, hh * 0.9, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Drawing sheet angled neatly on table
      ctx.save();
      ctx.rotate(-0.12);
      const pw = w * 0.44;
      const ph = h * 0.46;
      ctx.fillStyle = 'rgba(0,0,0,0.14)';
      ctx.fillRect(-pw / 2 + 0.25, -ph / 2 + 0.3, pw, ph);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 0.45;
      ctx.beginPath();
      ctx.arc(-pw * 0.14, 0, ph * 0.2, 0, Math.PI * 1.4);
      ctx.stroke();
      ctx.strokeStyle = '#2563eb';
      ctx.beginPath();
      ctx.moveTo(pw * 0.05, -ph * 0.2);
      ctx.lineTo(pw * 0.26, ph * 0.18);
      ctx.stroke();
      ctx.restore();

      // Top-down pencil cup + colored pencils
      const cupX = hw * 0.48;
      const cupY = -hh * 0.3;
      const cupR = Math.max(1.0, minD * 0.12);
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(cupX, cupY, cupR, 0, Math.PI * 2);
      ctx.fill();
      const tipCols = ['#ef4444', '#22c55e', '#3b82f6', '#facc15'];
      tipCols.forEach((c, idx) => {
        const a = idx * (Math.PI / 2) + 0.4;
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.arc(cupX + Math.cos(a) * cupR * 0.42, cupY + Math.sin(a) * cupR * 0.42, cupR * 0.26, 0, Math.PI * 2);
        ctx.fill();
      });
      return true;
    }

    // =========================================================================
    // 9. DESK (Office / Executive / Medical / Workshop — Exact Top-Down Plan)
    // =========================================================================
    case 'desk': {
      const hex = f.color || '#451a03';
      const isMedical = isLightColor(hex);
      const isSlate = hex === '#334155' || hex === '#0f172a' || hex === '#1e293b' || hex === '#475569';

      drawRectContactShadow(ctx, -hw, -hh, w, h, 0.9, 1.25);

      if (isMedical) {
        drawBrushedMetal(ctx, -hw, -hh, w, h, '#f1f5f9', 0.8, false);
      } else if (isSlate) {
        drawBrushedMetal(ctx, -hw, -hh, w, h, hex, 0.8, false);
      } else {
        drawWoodSurface(ctx, -hw, -hh, w, h, hex, 0.9, true, 0);
      }

      // Subtle protruding drawer lip on right front edge (+hh)
      const pedW = Math.min(w * 0.28, 5.5);
      drawCabinetPull(ctx, hw - pedW * 0.72, hh - 0.35, pedW * 0.44, 0.55, isMedical ? '#94a3b8' : '#cbd5e1');

      // Recessed brushed-metal cable grommet near rear-left (-hh)
      const gromR = Math.max(0.45, Math.min(0.85, minD * 0.08));
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(-hw + Math.max(1.8, w * 0.12), -hh + Math.max(1.4, h * 0.2), gromR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 0.28;
      ctx.stroke();

      // Stitched leather desk blotter / work mat near front center
      const padW = Math.min(w * 0.52, 13);
      const padH = Math.min(h * 0.56, 6.2);
      const padX = -padW * 0.55;
      const padY = hh - padH - Math.max(0.6, h * 0.1);
      ctx.fillStyle = isMedical ? '#cbd5e1' : '#111827';
      rr(ctx, padX, padY, padW, padH, 0.5);
      ctx.fill();
      ctx.strokeStyle = isMedical ? '#94a3b8' : 'rgba(255, 255, 255, 0.14)';
      ctx.lineWidth = 0.3;
      rr(ctx, padX + 0.35, padY + 0.35, padW - 0.7, padH - 0.7, 0.35);
      ctx.stroke();

      // Document folder / medical chart + pen on left corner
      const docW = Math.min(w * 0.22, 3.6);
      const docH = Math.min(h * 0.42, 4.4);
      const docX = -hw + Math.max(1.0, w * 0.06);
      const docY = -hh + Math.max(1.2, h * 0.18);
      ctx.save();
      ctx.translate(docX + docW / 2, docY + docH / 2);
      ctx.rotate(-0.08);
      ctx.fillStyle = isMedical ? '#0284c7' : '#e2e8f0';
      ctx.fillRect(-docW / 2, -docH / 2, docW, docH);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-docW / 2 + 0.35, -docH / 2 + 0.35, docW - 0.7, docH - 0.7);
      if (isMedical) {
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-0.55, -0.18, 1.1, 0.36);
        ctx.fillRect(-0.18, -0.55, 0.36, 1.1);
      } else {
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(-docW * 0.3, -docH * 0.2, docW * 0.6, 0.3);
        ctx.fillRect(-docW * 0.3, 0, docW * 0.45, 0.3);
      }
      ctx.restore();

      // Ceramic coffee mug / coaster on right rear corner
      if (w >= 14) {
        const mx = hw - Math.max(2.0, w * 0.13);
        const my = -hh + Math.max(1.8, h * 0.26);
        const mr = Math.max(0.65, Math.min(1.05, minD * 0.1));
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.beginPath();
        ctx.arc(mx + 0.2, my + 0.22, mr, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(mx, my, mr, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#451a03';
        ctx.beginPath();
        ctx.arc(mx, my, mr * 0.66, 0, Math.PI * 2);
        ctx.fill();
      }
      return true;
    }

    // =========================================================================
    // 10. NIGHTSTAND (Bedside Table — Exact Top-Down Plan)
    // =========================================================================
    case 'nightstand': {
      const hex = f.color || '#78350f';
      drawRectContactShadow(ctx, -hw, -hh, w, h, 0.7, 1.05);

      // Overhanging polished wood top surface
      drawWoodSurface(ctx, -hw, -hh, w, h, hex, 0.7, true, 0);

      // Subtle drawer pull knob protruding slightly from front edge (+hh)
      drawCabinetPull(ctx, -Math.min(1.1, w * 0.18), hh - 0.25, Math.min(2.2, w * 0.36), 0.55, '#eab308');

      // Top-down bedside lamp on back-right corner
      const lampR = Math.max(1.0, minD * 0.24);
      const lx = hw * 0.32;
      const ly = -hh * 0.22;
      if (isNight) {
        const lg = ctx.createRadialGradient(lx, ly, lampR * 0.3, lx, ly, minD * 1.15);
        lg.addColorStop(0, 'rgba(254, 240, 138, 0.34)');
        lg.addColorStop(1, 'rgba(254, 240, 138, 0)');
        ctx.fillStyle = lg;
        ctx.beginPath();
        ctx.arc(lx, ly, minD * 1.15, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.beginPath();
      ctx.arc(lx + 0.25, ly + 0.3, lampR, 0, Math.PI * 2);
      ctx.fill();
      const shadeG = ctx.createRadialGradient(lx - lampR * 0.25, ly - lampR * 0.25, 0.1, lx, ly, lampR);
      shadeG.addColorStop(0, isNight ? '#ffffff' : '#fef9c3');
      shadeG.addColorStop(0.6, isNight ? '#fef08a' : '#f5e6c8');
      shadeG.addColorStop(1, '#c2a67a');
      ctx.fillStyle = shadeG;
      ctx.beginPath();
      ctx.arc(lx, ly, lampR, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ca8a04';
      ctx.beginPath();
      ctx.arc(lx, ly, lampR * 0.22, 0, Math.PI * 2);
      ctx.fill();

      // Digital bedside alarm clock on back-left
      const ckW = Math.max(1.3, w * 0.3);
      const ckH = Math.max(0.85, h * 0.2);
      ctx.fillStyle = '#0f172a';
      rr(ctx, -hw + 0.6, -hh + 0.65, ckW, ckH, 0.25);
      ctx.fill();
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(-hw + 0.85, -hh + 0.65 + ckH - 0.35, ckW - 0.5, 0.25);
      return true;
    }

    // =========================================================================
    // 11. WARDROBE (Tall Closet — Exact Top-Down Roof & Front Door Edge)
    // =========================================================================
    case 'wardrobe': {
      const hex = f.color || '#5c3317';
      drawRectContactShadow(ctx, -hw, -hh, w, h, 0.8, 1.55);

      // Solid overhanging top crown cornice roof panel
      drawWoodSurface(ctx, -hw, -hh, w, h * 0.94, hex, 0.7, w >= h, 0);

      // Subtle stepped crown molding inset frame on top roof
      const inset = Math.max(0.65, minD * 0.11);
      rr(ctx, -hw + inset, -hh + inset, w - inset * 2, h * 0.94 - inset * 2, 0.4);
      ctx.strokeStyle = shade(hex, -0.4, hex, 0.35);
      ctx.lineWidth = 0.4;
      ctx.stroke();

      // Front double-door thickness slab along +hh
      const doorT = Math.max(0.75, h * 0.11);
      const doorY = hh - doorT;
      drawWoodSurface(ctx, -hw + 0.15, doorY, w / 2 - 0.3, doorT, shade(hex, 0.12), 0.25, true, 0);
      drawWoodSurface(ctx, 0.15, doorY, w / 2 - 0.3, doorT, shade(hex, 0.12), 0.25, true, 0);

      // Door center split seam shadow
      ctx.fillStyle = '#090d16';
      ctx.fillRect(-0.2, doorY - 0.1, 0.4, doorT + 0.2);

      // Protruding twin vertical brushed brass / steel handles at front edge
      const hW = Math.max(0.7, w * 0.055);
      drawCabinetPull(ctx, -hW - 0.45, hh - 0.15, hW, 0.55, '#d4af37');
      drawCabinetPull(ctx, 0.45, hh - 0.15, hW, 0.55, '#d4af37');
      return true;
    }

    // =========================================================================
    // 12. DRESSER / CHEST OF DRAWERS (Exact Top-Down Countertop & Front Pulls)
    // =========================================================================
    case 'dresser': {
      const hex = f.color || '#78350f';
      drawRectContactShadow(ctx, -hw, -hh, w, h, 0.7, 1.2);

      // Polished overhanging hardwood top counter surface
      drawWoodSurface(ctx, -hw, -hh, w, h * 0.93, hex, 0.65, true, 0);

      // Front top-drawer face edge thickness along +hh
      const lipH = Math.max(0.6, h * 0.1);
      drawWoodSurface(ctx, -hw + 0.3, hh - lipH, w - 0.6, lipH, shade(hex, -0.14), 0.2, true, 0);

      // Protruding dual satin-brass drawer pulls along front edge
      const pullW = Math.max(1.4, w * 0.14);
      drawCabinetPull(ctx, -w * 0.26 - pullW / 2, hh - 0.15, pullW, 0.55, '#d4af37');
      drawCabinetPull(ctx, w * 0.26 - pullW / 2, hh - 0.15, pullW, 0.55, '#d4af37');

      // Neat top-down accessories on dresser top: folded linen & jewelry catchall tray
      if (w >= 11) {
        // Folded cream linen stack on left
        const linW = Math.min(w * 0.26, 4.2);
        const linH = Math.min(h * 0.56, 3.6);
        drawUpholsteredCushion(ctx, -hw + 1.2, -linH / 2 - 0.2, linW, linH, '#f1f5f9', 0.45, { piping: false });

        // Ceramic catchall dish & perfume bottle cap on right
        const tx = hw - Math.max(2.4, w * 0.2);
        ctx.fillStyle = '#e2e8f0';
        rr(ctx, tx - 1.5, -1.2, 3.0, 2.2, 0.6);
        ctx.fill();
        ctx.fillStyle = '#cbd5e1';
        rr(ctx, tx - 1.2, -0.9, 2.4, 1.6, 0.4);
        ctx.fill();
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(tx - 0.4, -0.1, 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(tx + 0.55, 0.1, 0.38, 0, Math.PI * 2);
        ctx.fill();
      }
      return true;
    }

    // =========================================================================
    // 13. BOOKSHELF (Exact Top-Down Cornice Cap + Visible Book Tops Along Edge)
    // =========================================================================
    case 'bookshelf': {
      const hex = f.color || '#7c2d12';
      const isHoriz = w >= h;
      drawRectContactShadow(ctx, -hw, -hh, w, h, 0.6, 1.35);

      // Solid wooden top shelf cornice with recessed display strip showing book tops
      drawWoodSurface(ctx, -hw, -hh, w, h, hex, 0.55, isHoriz, 0);

      const bookPalette = ['#b91c1c', '#1d4ed8', '#15803d', '#d97706', '#6d28d9', '#0f766e', '#334155', '#9f1239'];
      const frame = Math.max(0.55, minD * 0.12);

      // Open top shelf recess showing exact top-down edges of standing books (cream page block + cover)
      ctx.fillStyle = shade(hex, -0.5);
      rr(ctx, -hw + frame, -hh + frame, w - frame * 2, h - frame * 2, 0.3);
      ctx.fill();

      if (isHoriz) {
        let bx = -hw + frame + 0.35;
        let idx = 0;
        const maxBookD = h - frame * 2 - 0.5;
        while (bx < hw - frame - 1.0) {
          const thick = Math.min(1.5, Math.max(0.65, 0.7 + ((idx * 17) % 5) * 0.16));
          const depth = maxBookD * (0.76 + ((idx * 23) % 4) * 0.07);
          const col = bookPalette[idx % bookPalette.length];
          const by = -hh + frame + 0.25;
          // Book cover outer edge
          ctx.fillStyle = col;
          ctx.fillRect(bx, by, thick, depth);
          // Cream paper pages block visible from straight above!
          if (thick > 0.6) {
            ctx.fillStyle = '#fef3c7';
            ctx.fillRect(bx + 0.16, by + 0.18, thick - 0.32, Math.max(0.3, depth - 0.32));
          }
          bx += thick + 0.22;
          idx++;
        }
      } else {
        let by = -hh + frame + 0.35;
        let idx = 0;
        const maxBookD = w - frame * 2 - 0.5;
        while (by < hh - frame - 1.0) {
          const thick = Math.min(1.5, Math.max(0.65, 0.7 + ((idx * 17) % 5) * 0.16));
          const depth = maxBookD * (0.76 + ((idx * 23) % 4) * 0.07);
          const col = bookPalette[idx % bookPalette.length];
          const bx = -hw + frame + 0.25;
          ctx.fillStyle = col;
          ctx.fillRect(bx, by, depth, thick);
          if (thick > 0.6) {
            ctx.fillStyle = '#fef3c7';
            ctx.fillRect(bx + 0.18, by + 0.16, Math.max(0.3, depth - 0.32), thick - 0.32);
          }
          by += thick + 0.22;
          idx++;
        }
      }
      return true;
    }

    // =========================================================================
    // 14. TV CABINET / MEDIA CREDENZA (Exact Top-Down Plan)
    // =========================================================================
    case 'tv_cabinet': {
      const hex = f.color || '#1e293b';
      const isWood = getLuminance(hex) > 0.2 && (hex.startsWith('#7') || hex.startsWith('#9') || hex.startsWith('#b') || hex.startsWith('#5'));

      drawRectContactShadow(ctx, -hw, -hh, w, h, 0.7, 1.1);
      if (isWood) {
        drawWoodSurface(ctx, -hw, -hh, w, h, hex, 0.65, true, 0);
      } else {
        drawBrushedMetal(ctx, -hw, -hh, w, h, hex, 0.65, false);
      }

      // Rear recessed cable-routing notch
      ctx.fillStyle = '#020617';
      rr(ctx, -1.6, -hh + 0.2, 3.2, Math.max(0.65, h * 0.16), 0.25);
      ctx.fill();

      // Sleek matte-black Dolby soundbar centered along front top deck
      const sbW = Math.min(w * 0.58, 12.5);
      const sbH = Math.min(h * 0.36, 2.0);
      const sbY = hh - sbH - Math.max(0.5, h * 0.14);
      drawBrushedMetal(ctx, -sbW / 2, sbY, sbW, sbH, '#0f172a', sbH * 0.42, false);
      // Perforated acoustic speaker grille dots
      ctx.fillStyle = 'rgba(148, 163, 184, 0.38)';
      for (let sx = -sbW * 0.4; sx <= sbW * 0.4; sx += 1.0) {
        ctx.fillRect(sx, sbY + sbH * 0.35, 0.45, sbH * 0.3);
      }
      // Tiny standby LED
      ctx.fillStyle = isNight ? '#38bdf8' : '#22c55e';
      ctx.fillRect(sbW * 0.44, sbY + sbH * 0.35, 0.4, 0.4);

      // Subtle front drop-door pull lips
      drawCabinetPull(ctx, -w * 0.34, hh - 0.18, w * 0.14, 0.35, '#94a3b8');
      drawCabinetPull(ctx, w * 0.2, hh - 0.18, w * 0.14, 0.35, '#94a3b8');
      return true;
    }

    // =========================================================================
    // 15. OLED / LED FLAT-SCREEN TV (Exact Top-Down Thin-Profile Plan)
    // =========================================================================
    case 'tv': {
      // Dynamic forward screen glow cone cast onto surface/floor in front (+Y) at evening/night
      if (isNight) {
        const glowGrad = ctx.createLinearGradient(0, 0, 0, Math.max(10, w * 0.72));
        glowGrad.addColorStop(0, 'rgba(56, 189, 248, 0.28)');
        glowGrad.addColorStop(0.5, 'rgba(59, 130, 246, 0.10)');
        glowGrad.addColorStop(1, 'rgba(59, 130, 246, 0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.moveTo(-hw * 0.9, 0.4);
        ctx.lineTo(hw * 0.9, 0.4);
        ctx.lineTo(hw * 1.35, Math.max(10, w * 0.72));
        ctx.lineTo(-hw * 1.35, Math.max(10, w * 0.72));
        ctx.closePath();
        ctx.fill();
      }

      // Brushed aluminum central tabletop pedestal foot (seen from straight above)
      const standW = Math.min(w * 0.44, 7.5);
      const standH = Math.min(h * 0.92, 3.6);
      drawRectContactShadow(ctx, -standW / 2, -standH / 2, standW, standH, 0.6, 0.7);
      drawBrushedMetal(ctx, -standW / 2, -standH / 2, standW, standH, '#64748b', 0.55, false);

      // Rear electronics housing hump (tapered toward edges)
      const panelT = Math.max(0.95, Math.min(1.65, h * 0.45));
      const panelY = -panelT * 0.5 + 0.25;
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(-hw * 0.85, panelY);
      ctx.lineTo(-hw * 0.55, panelY - panelT * 0.55);
      ctx.lineTo(hw * 0.55, panelY - panelT * 0.55);
      ctx.lineTo(hw * 0.85, panelY);
      ctx.closePath();
      ctx.fill();

      // Cooling micro-vent slits along rear top edge
      ctx.fillStyle = '#020617';
      for (let vx = -hw * 0.42; vx <= hw * 0.42; vx += 1.2) {
        ctx.fillRect(vx, panelY - panelT * 0.36, 0.65, 0.35);
      }

      // Ultra-slim obsidian OLED glass panel top profile
      drawBrushedMetal(ctx, -hw, panelY, w, panelT, '#0f172a', 0.35, false);

      // Front glass emission / reflection edge line (+Y)
      ctx.fillStyle = isNight ? '#38bdf8' : 'rgba(226, 232, 240, 0.55)';
      ctx.fillRect(-hw + 0.4, panelY + panelT - 0.35, w - 0.8, 0.32);

      // Tiny standby LED
      ctx.fillStyle = isNight ? '#22c55e' : '#ef4444';
      ctx.beginPath();
      ctx.arc(hw - 1.1, panelY + panelT, 0.28, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    // =========================================================================
    // 16. COMPUTER WORKSTATION (Monitor + Keyboard + Mouse — Exact Top-Down)
    // =========================================================================
    case 'computer': {
      // Soft screen glow onto desk in front of monitor
      const glowH = Math.max(3.5, h * 0.9);
      const sg = ctx.createLinearGradient(0, -hh + 1.0, 0, -hh + 1.0 + glowH);
      sg.addColorStop(0, isNight ? 'rgba(56, 189, 248, 0.32)' : 'rgba(186, 230, 253, 0.16)');
      sg.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.moveTo(-hw * 0.85, -hh + 1.0);
      ctx.lineTo(hw * 0.85, -hh + 1.0);
      ctx.lineTo(hw * 1.1, -hh + 1.0 + glowH);
      ctx.lineTo(-hw * 1.1, -hh + 1.0 + glowH);
      ctx.closePath();
      ctx.fill();

      // Sculpted aluminum monitor stand base
      const stW = Math.min(w * 0.42, 3.6);
      const stH = Math.min(h * 0.36, 1.8);
      drawBrushedMetal(ctx, -stW / 2, -hh + 0.25, stW, stH, '#64748b', 0.35, false);

      // Ultra-slim top-profile widescreen display
      const monT = Math.max(0.75, Math.min(1.25, h * 0.24));
      drawBrushedMetal(ctx, -hw, -hh + 0.2, w, monT, '#0f172a', 0.3, false);
      // Illuminated top bezel glow line
      ctx.fillStyle = isNight ? '#38bdf8' : '#7dd3fc';
      ctx.fillRect(-hw + 0.4, -hh + 0.2 + monT - 0.28, w - 0.8, 0.25);

      // Exact top-down mechanical keyboard (lower-left)
      const kbW = w * 0.68;
      const kbH = Math.max(1.4, h * 0.38);
      const kbX = -hw + 0.2;
      const kbY = hh - kbH - 0.15;
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      rr(ctx, kbX + 0.2, kbY + 0.25, kbW, kbH, 0.35);
      ctx.fill();
      drawBrushedMetal(ctx, kbX, kbY, kbW, kbH, '#1e293b', 0.35, false);

      // Individual keycap rows + spacebar
      ctx.fillStyle = '#475569';
      const rows = 3;
      const rH = (kbH - 0.5) / rows;
      for (let r = 0; r < rows; r++) {
        const ky = kbY + 0.25 + r * rH;
        if (r === rows - 1) {
          ctx.fillRect(kbX + 0.35, ky, kbW * 0.22, rH * 0.68);
          ctx.fillRect(kbX + kbW * 0.3, ky, kbW * 0.4, rH * 0.68);
          ctx.fillRect(kbX + kbW * 0.74, ky, kbW * 0.2, rH * 0.68);
        } else {
          const cols = Math.max(4, Math.round(kbW * 1.3));
          const cw = (kbW - 0.7) / cols;
          for (let c = 0; c < cols; c++) {
            ctx.fillRect(kbX + 0.35 + c * cw, ky, Math.max(0.25, cw - 0.16), rH * 0.68);
          }
        }
      }

      // Stitched mousepad & ergonomic wireless mouse (lower-right)
      const mCx = hw - Math.max(0.85, w * 0.14);
      const mCy = kbY + kbH * 0.5;
      const mRx = Math.max(0.5, w * 0.085);
      const mRy = Math.max(0.72, kbH * 0.42);
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(mCx, mCy, mRx, mRy, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 0.22;
      ctx.stroke();
      // Scroll wheel
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(mCx - mRx * 0.22, mCy - mRy * 0.62, mRx * 0.44, mRy * 0.45);
      return true;
    }

    // =========================================================================
    // 17. KITCHEN COUNTER (Quartz Slab + Recessed Steel Sink + Prep Board + Hob)
    // =========================================================================
    case 'kitchen_counter': {
      const baseHex = f.color || '#475569';
      drawRectContactShadow(ctx, -hw, -hh, w, h, 0.7, 1.2);

      // Speckled composite quartz / stone countertop slab
      const slabHex = getLuminance(baseHex) < 0.25 ? '#334155' : mix(baseHex, '#e2e8f0', 0.42);
      drawBrushedMetal(ctx, -hw, -hh, w, h, slabHex, 0.55, false);

      // Subtle rear backsplash ridge along wall (-hh)
      const splashH = Math.max(0.55, h * 0.09);
      ctx.fillStyle = shade(slabHex, -0.25);
      ctx.fillRect(-hw, -hh, w, splashH);

      // Stainless steel undermount sink basin (left side)
      const sinkW = Math.min(w * 0.34, Math.max(4.5, h * 1.05));
      const sinkH = h - splashH - Math.max(1.4, h * 0.22);
      const sinkX = -hw + Math.max(1.0, w * 0.055);
      const sinkY = -hh + splashH + (h - splashH - sinkH) * 0.55;

      // Brushed outer sink flange
      drawBrushedMetal(ctx, sinkX - 0.35, sinkY - 0.35, sinkW + 0.7, sinkH + 0.7, '#cbd5e1', 0.8, false);
      // Concave stainless basin bowl
      const basinG = ctx.createRadialGradient(
        sinkX + sinkW * 0.5,
        sinkY + sinkH * 0.5,
        sinkW * 0.08,
        sinkX + sinkW * 0.5,
        sinkY + sinkH * 0.5,
        Math.max(sinkW, sinkH) * 0.72
      );
      basinG.addColorStop(0, '#64748b');
      basinG.addColorStop(0.65, '#94a3b8');
      basinG.addColorStop(1, '#475569');
      ctx.fillStyle = basinG;
      rr(ctx, sinkX, sinkY, sinkW, sinkH, 0.65);
      ctx.fill();

      // Diagonal drain-press creases inside stainless sink
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.lineWidth = 0.25;
      ctx.beginPath();
      ctx.moveTo(sinkX + 0.4, sinkY + 0.4);
      ctx.lineTo(sinkX + sinkW - 0.4, sinkY + sinkH - 0.4);
      ctx.moveTo(sinkX + sinkW - 0.4, sinkY + 0.4);
      ctx.lineTo(sinkX + 0.4, sinkY + sinkH - 0.4);
      ctx.stroke();

      // Basket strainer drain
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(sinkX + sinkW * 0.5, sinkY + sinkH * 0.5, Math.max(0.45, Math.min(sinkW, sinkH) * 0.13), 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 0.3;
      ctx.stroke();

      // Chrome gooseneck kitchen mixer faucet
      drawChromeFaucet(ctx, sinkX + sinkW * 0.5, sinkY - 0.35, sinkH * 0.42, Math.min(1.0, h / 10), 1);

      // End-grain hardwood butcher block cutting board + chef knife (center)
      const boardW = Math.min(w * 0.22, 5.2);
      const boardH = Math.min(h * 0.62, 5.2);
      const boardX = sinkX + sinkW + Math.max(1.0, (w - sinkW - (w > 18 ? w * 0.3 : 1.5) - boardW) * 0.45);
      const boardY = -boardH / 2 + splashH * 0.4;
      if (boardX + boardW < hw - 1.2) {
        drawWoodSurface(ctx, boardX, boardY, boardW, boardH, '#c28344', 0.45, false, 3);
        // Chef knife resting diagonally on cutting board
        ctx.save();
        ctx.translate(boardX + boardW * 0.5, boardY + boardH * 0.5);
        ctx.rotate(-0.45);
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.moveTo(-boardW * 0.34, -0.35);
        ctx.lineTo(boardW * 0.12, -0.35);
        ctx.lineTo(boardW * 0.12, 0.3);
        ctx.lineTo(-boardW * 0.2, 0.15);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(boardW * 0.12, -0.22, boardW * 0.26, 0.44);
        ctx.restore();
      }

      // Flush black ceramic 2-zone induction cooktop (right side, when counter is wide enough)
      if (w >= 17) {
        const hobW = Math.min(w * 0.26, Math.max(4.4, h * 0.78));
        const hobH = h - splashH - Math.max(1.2, h * 0.2);
        const hobX = hw - hobW - Math.max(0.9, w * 0.045);
        const hobY = -hh + splashH + (h - splashH - hobH) * 0.55;
        drawGlassPanel(ctx, hobX, hobY, hobW, hobH, '#090d16', 0.45, 0.96);

        const r1 = Math.min(hobW * 0.34, hobH * 0.22);
        const r2 = r1 * 0.82;
        const cx = hobX + hobW * 0.5;
        const y1 = hobY + hobH * 0.3;
        const y2 = hobY + hobH * 0.72;
        for (const [cy, r, hot] of [
          [y1, r1, true],
          [y2, r2, false],
        ] as [number, number, boolean][]) {
          ctx.strokeStyle = hot ? 'rgba(239, 68, 68, 0.8)' : 'rgba(148, 163, 184, 0.5)';
          ctx.lineWidth = 0.45;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.strokeStyle = hot ? 'rgba(249, 115, 22, 0.5)' : 'rgba(148, 163, 184, 0.28)';
          ctx.beginPath();
          ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // Protruding brushed steel cabinet door handles along front edge (+hh)
      drawCabinetPull(ctx, -w * 0.28, hh - 0.16, Math.min(3.0, w * 0.14), 0.38, '#cbd5e1');
      drawCabinetPull(ctx, w * 0.14, hh - 0.16, Math.min(3.0, w * 0.14), 0.38, '#cbd5e1');
      return true;
    }

    // =========================================================================
    // 18. STOVE / RANGE / RUSSIAN OVEN (Exact Top-Down Plan)
    // =========================================================================
    case 'stove': {
      const hex = f.color || '#334155';
      const isBrickOven = hex === '#c2410c' || hex === '#b45309' || hex === '#9a3412';

      drawRectContactShadow(ctx, -hw, -hh, w, h, 0.7, 1.25);

      if (isBrickOven) {
        // Traditional Russian brick masonry stove / sauna stone heater (exact top-down)
        const baseG = ctx.createLinearGradient(-hw, -hh, hw, hh);
        baseG.addColorStop(0, '#f8fafc');
        baseG.addColorStop(0.5, '#e7e5e4');
        baseG.addColorStop(1, '#d6d3d1');
        ctx.fillStyle = baseG;
        rr(ctx, -hw, -hh, w, h, 0.8);
        ctx.fill();
        drawArchitecturalBevel(ctx, -hw, -hh, w, h, 0.8, 0.4, 0.4, 0.55);

        // Exposed terracotta brick trim collar
        ctx.strokeStyle = hex;
        ctx.lineWidth = Math.max(0.8, minD * 0.08);
        rr(ctx, -hw + 0.5, -hh + 0.5, w - 1.0, h - 1.0, 0.6);
        ctx.stroke();

        // Cast-iron twin hob plate on front half
        const hobW = w * 0.56;
        const hobH = h * 0.42;
        drawBrushedMetal(ctx, -hobW / 2, hh * 0.05, hobW, hobH, '#1e293b', 0.35, false);
        const r = Math.min(hobW * 0.2, hobH * 0.34);
        for (const sx of [-hobW * 0.24, hobW * 0.24]) {
          ctx.strokeStyle = '#64748b';
          ctx.lineWidth = 0.45;
          ctx.beginPath();
          ctx.arc(sx, hh * 0.05 + hobH * 0.5, r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.strokeStyle = 'rgba(249, 115, 22, 0.5)';
          ctx.beginPath();
          ctx.arc(sx, hh * 0.05 + hobH * 0.5, r * 0.55, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Masonry chimney flue stack at rear-left (-hh)
        const flW = w * 0.28;
        const flH = h * 0.28;
        drawBrushedMetal(ctx, -hw + w * 0.14, -hh + h * 0.14, flW, flH, hex, 0.4, false);
        ctx.fillStyle = '#1c1917';
        ctx.beginPath();
        ctx.arc(-hw + w * 0.14 + flW / 2, -hh + h * 0.14 + flH / 2, Math.min(flW, flH) * 0.32, 0, Math.PI * 2);
        ctx.fill();
        return true;
      }

      // Modern 4-burner gas / induction range (exact top-down)
      drawBrushedMetal(ctx, -hw, -hh, w, h, isLightColor(hex) ? '#e2e8f0' : hex, 0.65, false);

      // Rear stainless vent strip
      const ventH = Math.max(0.6, h * 0.1);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-hw + 0.8, -hh + 0.35, w - 1.6, ventH * 0.65);

      // Tempered black ceramic / enamel recessed cooking deck
      const pad = Math.max(0.65, minD * 0.085);
      const deckY = -hh + ventH + 0.25;
      const deckH = h - ventH - pad * 1.4 - 0.55;
      const deckW = w - pad * 2;
      drawGlassPanel(ctx, -hw + pad, deckY, deckW, deckH, '#090d16', 0.4, 0.96);

      // 4 Cast-iron spider pan-support grates & brass gas burner crowns
      const burners = [
        { cx: -deckW * 0.25, cy: deckY + deckH * 0.28, r: Math.min(deckW, deckH) * 0.2, hot: true },
        { cx: deckW * 0.25, cy: deckY + deckH * 0.28, r: Math.min(deckW, deckH) * 0.15, hot: false },
        { cx: -deckW * 0.25, cy: deckY + deckH * 0.73, r: Math.min(deckW, deckH) * 0.16, hot: false },
        { cx: deckW * 0.25, cy: deckY + deckH * 0.73, r: Math.min(deckW, deckH) * 0.21, hot: true },
      ];
      for (const b of burners) {
        // Cast iron 4-prong spider grate
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = Math.max(0.4, minD * 0.04);
        ctx.beginPath();
        ctx.moveTo(b.cx - b.r * 1.15, b.cy);
        ctx.lineTo(b.cx + b.r * 1.15, b.cy);
        ctx.moveTo(b.cx, b.cy - b.r * 1.15);
        ctx.lineTo(b.cx, b.cy + b.r * 1.15);
        ctx.stroke();

        // Outer grate ring
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = Math.max(0.35, minD * 0.032);
        ctx.beginPath();
        ctx.arc(b.cx, b.cy, b.r * 0.95, 0, Math.PI * 2);
        ctx.stroke();

        // Subtle flame/heat halo on active zones
        if (b.hot) {
          ctx.strokeStyle = 'rgba(249, 115, 22, 0.55)';
          ctx.lineWidth = Math.max(0.45, b.r * 0.24);
          ctx.beginPath();
          ctx.arc(b.cx, b.cy, b.r * 0.68, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Matte black cast burner cap with brass ring
        ctx.fillStyle = '#b45309';
        ctx.beginPath();
        ctx.arc(b.cx, b.cy, b.r * 0.56, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(b.cx, b.cy, b.r * 0.42, 0, Math.PI * 2);
        ctx.fill();
      }

      // Front beveled control knob lip + oven door handle along +hh
      const knobY = hh - 0.55;
      for (let i = 0; i < 4; i++) {
        const kx = -hw + pad + ((i + 0.5) * deckW) / 4;
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.arc(kx, knobY, Math.max(0.32, minD * 0.048), 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(kx, knobY, Math.max(0.18, minD * 0.028), 0, Math.PI * 2);
        ctx.fill();
      }
      drawCabinetPull(ctx, -w * 0.34, hh - 0.14, w * 0.68, 0.42, '#e2e8f0');
      return true;
    }

    // =========================================================================
    // 19. REFRIGERATOR (Exact Top-Down Roof, Rear Coil Edge & Front Door Lip)
    // =========================================================================
    case 'fridge': {
      const hex = f.color || '#e2e8f0';
      drawRectContactShadow(ctx, -hw, -hh, w, h, 0.85, 1.55);

      // Rear black condenser grille strip peeking at -hh
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-hw + w * 0.12, -hh - 0.25, w * 0.76, 0.45);

      // Main refrigerator insulated top roof chassis
      const doorT = Math.max(0.95, h * 0.15);
      const bodyH = h - doorT;
      drawBrushedMetal(ctx, -hw, -hh, w, bodyH, hex, 0.7, false);

      // Subtle stamped roof reinforcement border & top hinge cover
      const ins = Math.max(0.65, minD * 0.1);
      rr(ctx, -hw + ins, -hh + ins, w - ins * 2, bodyH - ins * 1.6, 0.45);
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.24)';
      ctx.lineWidth = 0.35;
      ctx.stroke();

      // Magnetic rubber gasket groove between body and front door
      ctx.fillStyle = '#334155';
      ctx.fillRect(-hw + 0.35, hh - doorT - 0.25, w - 0.7, 0.45);

      // Thick contoured front door top bezel along +hh
      drawBrushedMetal(ctx, -hw, hh - doorT, w, doorT, shade(hex, 0.06), 0.55, false);

      // Top corner pivot hinge cap (front-right corner)
      ctx.fillStyle = '#64748b';
      rr(ctx, hw - Math.max(1.2, w * 0.16), hh - doorT - 0.35, Math.max(1.0, w * 0.13), Math.max(0.9, doorT * 0.7), 0.25);
      ctx.fill();

      // Curved brushed-chrome tubular door handle protruding from front-left edge (+hh)
      drawCabinetPull(ctx, -hw + w * 0.1, hh - 0.12, Math.max(1.4, w * 0.22), 0.58, '#f1f5f9');
      return true;
    }

    // =========================================================================
    // 20. MICROWAVE OVEN (Exact Top-Down Casing, Cooling Louvers & Front Door Lip)
    // =========================================================================
    case 'microwave': {
      const hex = f.color || '#334155';
      drawRectContactShadow(ctx, -hw, -hh, w, h, 0.55, 0.85);

      const doorT = Math.max(0.65, h * 0.14);
      // Brushed metal top enclosure
      drawBrushedMetal(ctx, -hw, -hh, w, h - doorT * 0.6, hex, 0.5, false);

      // Stamped cooling exhaust louver slots on top-left
      ctx.fillStyle = shade(hex, -0.55);
      const slotW = w * 0.42;
      const slotStartX = -hw + w * 0.1;
      for (let i = 0; i < 4; i++) {
        const sy = -hh + h * 0.18 + i * (h * 0.14);
        rr(ctx, slotStartX, sy, slotW, Math.max(0.28, h * 0.055), 0.15);
        ctx.fill();
      }

      // Front glass door bezel (left 70%) + control bezel (right 30%) along +hh
      const doorW = w * 0.68;
      drawBrushedMetal(ctx, -hw, hh - doorT, doorW, doorT, '#0f172a', 0.3, false);
      drawBrushedMetal(ctx, -hw + doorW + 0.15, hh - doorT, w - doorW - 0.15, doorT, shade(hex, -0.15), 0.25, false);

      // Tiny green clock LED glow bleed on front-right edge
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(-hw + doorW + (w - doorW) * 0.28, hh - 0.35, (w - doorW) * 0.44, 0.28);

      // Protruding vertical chrome pull handle on front door edge
      drawCabinetPull(ctx, -hw + doorW - Math.max(0.9, w * 0.14), hh - 0.1, Math.max(0.7, w * 0.1), 0.48, '#e2e8f0');
      return true;
    }

    // =========================================================================
    // 21. WASHING MACHINE (Exact Top-Down Worktop, Rear Hoses & Convex Front Door Rim)
    // =========================================================================
    case 'washing_machine': {
      const hex = f.color || '#f1f5f9';
      drawRectContactShadow(ctx, -hw, -hh, w, h, 0.75, 1.25);

      // Rear cold-water inlet hose & corrugated drain stub peeking at -hh
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = Math.max(0.45, minD * 0.06);
      ctx.beginPath();
      ctx.moveTo(-hw * 0.45, -hh);
      ctx.lineTo(-hw * 0.45, -hh - 0.55);
      ctx.stroke();
      ctx.strokeStyle = '#94a3b8';
      ctx.beginPath();
      ctx.moveTo(hw * 0.38, -hh);
      ctx.lineTo(hw * 0.38, -hh - 0.55);
      ctx.stroke();

      // Convex front-loading chrome/glass porthole rim protruding cleanly past front edge (+hh)
      const portW = w * 0.56;
      const portDepth = Math.max(0.65, h * 0.1);
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.beginPath();
      ctx.ellipse(0, hh + 0.15, portW * 0.52, portDepth * 1.05, 0, 0, Math.PI);
      ctx.fill();

      const portG = ctx.createLinearGradient(-portW / 2, hh, portW / 2, hh);
      portG.addColorStop(0, '#64748b');
      portG.addColorStop(0.35, '#f8fafc');
      portG.addColorStop(0.65, '#94a3b8');
      portG.addColorStop(1, '#475569');
      ctx.fillStyle = portG;
      ctx.beginPath();
      ctx.ellipse(0, hh - 0.05, portW * 0.5, portDepth, 0, 0, Math.PI);
      ctx.fill();

      // Glossy laminated white/silver top worktop slab
      const fasciaH = Math.max(1.1, h * 0.16);
      drawBrushedMetal(ctx, -hw, -hh, w, h - fasciaH * 0.4, hex, 0.7, false);

      // Slightly angled front control fascia strip along +hh
      drawBrushedMetal(ctx, -hw + 0.1, hh - fasciaH, w - 0.2, fasciaH, shade(hex, -0.06), 0.4, false);

      // Detergent drawer seam on front-left
      const drW = w * 0.28;
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.45)';
      ctx.lineWidth = 0.3;
      ctx.strokeRect(-hw + 0.45, hh - fasciaH + 0.2, drW, fasciaH - 0.35);

      // Center rotary program dial peeking from fascia
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(0, hh - fasciaH * 0.45, Math.max(0.42, fasciaH * 0.36), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.arc(0, hh - fasciaH * 0.45, Math.max(0.22, fasciaH * 0.18), 0, Math.PI * 2);
      ctx.fill();

      // Digital LED cycle indicator on front-right
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(hw - w * 0.32, hh - fasciaH + 0.28, w * 0.24, fasciaH * 0.52);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(hw - w * 0.28, hh - fasciaH + 0.42, w * 0.14, fasciaH * 0.24);
      return true;
    }

    // =========================================================================
    // 22. BATHTUB (Freestanding / Alcove Porcelain Tub — Exact Top-Down Plan)
    // =========================================================================
    case 'bath': {
      const isHoriz = w >= h;
      drawRectContactShadow(ctx, -hw, -hh, w, h, Math.min(2.4, minD * 0.2), 1.25);

      ctx.save();
      if (!isHoriz) {
        ctx.rotate(Math.PI / 2);
      }
      const bw = isHoriz ? w : h;
      const bh = isHoriz ? h : w;
      const bhw = bw / 2;
      const bhh = bh / 2;

      // Gleaming glazed acrylic / cast-iron outer deck rim
      const rimG = ctx.createLinearGradient(-bhw, -bhh, bhw, bhh);
      rimG.addColorStop(0, '#ffffff');
      rimG.addColorStop(0.55, '#f1f5f9');
      rimG.addColorStop(1, '#cbd5e1');
      ctx.fillStyle = rimG;
      rr(ctx, -bhw, -bhh, bw, bh, Math.min(2.4, bh * 0.22));
      ctx.fill();
      drawArchitecturalBevel(ctx, -bhw, -bhh, bw, bh, Math.min(2.4, bh * 0.22), 0.65, 0.3, 0.5);

      // Inner sculpted basin cavity (deeper bevel + ergonomic sloped headrest on right)
      const rim = Math.max(1.1, bh * 0.14);
      const inW = bw - rim * 2;
      const inH = bh - rim * 2;
      const inR = Math.min(inH * 0.44, 3.8);

      const bowlG = ctx.createLinearGradient(-bhw + rim, -bhh + rim, bhw - rim, bhh - rim);
      bowlG.addColorStop(0, '#cbd5e1');
      bowlG.addColorStop(0.28, '#f8fafc');
      bowlG.addColorStop(0.8, '#e2e8f0');
      bowlG.addColorStop(1, '#ffffff');
      ctx.fillStyle = bowlG;
      rr(ctx, -bhw + rim, -bhh + rim, inW, inH, inR);
      ctx.fill();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.55)';
      ctx.lineWidth = 0.45;
      ctx.stroke();

      // Crystal-clear translucent aqua bathwater fill with depth shading
      const wPad = rim + Math.max(0.45, bh * 0.055);
      const watW = bw - wPad * 2;
      const watH = bh - wPad * 2;
      const watG = ctx.createRadialGradient(-bhw * 0.2, -bhh * 0.1, watH * 0.1, 0, 0, watW * 0.68);
      watG.addColorStop(0, '#e0f2fe');
      watG.addColorStop(0.45, '#7dd3fc');
      watG.addColorStop(1, '#0284c7');
      ctx.fillStyle = watG;
      rr(ctx, -bhw + wPad, -bhh + wPad, watW, watH, Math.max(0.8, inR - 0.5));
      ctx.fill();

      // Subtle translucent water caustic shimmer arcs
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.42)';
      ctx.lineWidth = Math.max(0.32, bh * 0.032);
      ctx.beginPath();
      ctx.moveTo(-bhw + wPad + watW * 0.18, -watH * 0.18);
      ctx.quadraticCurveTo(0, -watH * 0.28, bhw - wPad - watW * 0.22, -watH * 0.12);
      ctx.moveTo(-bhw + wPad + watW * 0.28, watH * 0.16);
      ctx.quadraticCurveTo(watW * 0.05, watH * 0.08, bhw - wPad - watW * 0.3, watH * 0.22);
      ctx.stroke();

      // Chrome pop-up drain ring (left side under faucet)
      const drainX = -bhw + wPad + watW * 0.16;
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.arc(drainX, 0, Math.max(0.55, bh * 0.075), 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 0.35;
      ctx.stroke();

      // Chrome thermostatic tub mixer spout on left rim
      ctx.save();
      ctx.translate(-bhw + rim * 0.55, 0);
      ctx.rotate(-Math.PI / 2);
      drawChromeFaucet(ctx, 0, 0, rim * 1.15, Math.min(1.0, bh / 10), 1);
      ctx.restore();

      ctx.restore();
      return true;
    }

    // =========================================================================
    // 23. BATHROOM SINK / VANITY (Exact Top-Down Plan)
    // =========================================================================
    case 'sink': {
      drawRectContactShadow(ctx, -hw, -hh, w, h, 1.0, 1.05);

      // Polished marble / ceramic vanity countertop
      const topG = ctx.createLinearGradient(-hw, -hh, hw, hh);
      topG.addColorStop(0, '#ffffff');
      topG.addColorStop(0.6, '#f1f5f9');
      topG.addColorStop(1, '#cbd5e1');
      ctx.fillStyle = topG;
      rr(ctx, -hw, -hh, w, h, Math.min(1.4, minD * 0.2));
      ctx.fill();
      drawArchitecturalBevel(ctx, -hw, -hh, w, h, Math.min(1.4, minD * 0.2), 0.65, 0.3, 0.45);

      // Sculpted oval glazed porcelain recessed basin
      const rx = hw * 0.74;
      const ry = hh * 0.62;
      const cy = hh * 0.14;

      // Rim bevel
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.ellipse(0, cy, rx + 0.35, ry + 0.35, 0, 0, Math.PI * 2);
      ctx.fill();

      // Inner concave ceramic gradient
      const bowlG = ctx.createRadialGradient(rx * 0.18, cy + ry * 0.2, ry * 0.1, 0, cy, Math.max(rx, ry));
      bowlG.addColorStop(0, '#cbd5e1');
      bowlG.addColorStop(0.55, '#f1f5f9');
      bowlG.addColorStop(1, '#ffffff');
      ctx.fillStyle = bowlG;
      ctx.beginPath();
      ctx.ellipse(0, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();

      // Subtle glossy wet rim specular
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 0.4;
      ctx.beginPath();
      ctx.ellipse(0, cy, rx * 0.92, ry * 0.92, 0, 0.2, Math.PI * 0.9);
      ctx.stroke();

      // Chrome pop-up drain & overflow dot
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.arc(0, cy + ry * 0.08, Math.max(0.4, minD * 0.08), 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 0.28;
      ctx.stroke();

      // Chrome single-lever faucet mounted on rear deck (-hh)
      drawChromeFaucet(ctx, 0, -hh + Math.max(0.7, h * 0.15), Math.max(1.2, h * 0.3), Math.min(0.95, minD / 8), 1);

      // Soap dispenser bottle on rear-right corner
      if (w >= 7) {
        const sx = hw * 0.68;
        const sy = -hh + h * 0.22;
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(sx, sy, Math.max(0.45, minD * 0.085), 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(sx, sy, Math.max(0.22, minD * 0.042), 0, Math.PI * 2);
        ctx.fill();
      }
      return true;
    }

    // =========================================================================
    // 24. TOILET (Ceramic Water Closet — Exact Top-Down Architectural Plan)
    // =========================================================================
    case 'toilet': {
      const tankH = Math.max(1.8, h * 0.31);
      const tankW = w * 0.94;
      const bowlCy = -hh + tankH + (h - tankH) * 0.5;
      const bowlRx = w * 0.41;
      const bowlRy = (h - tankH) * 0.52;

      // Tailored shadow matching cistern + oval bowl
      drawRectContactShadow(ctx, -tankW / 2, -hh, tankW, tankH, 0.65, 1.0);
      drawEllipseContactShadow(ctx, 0, bowlCy, bowlRx, bowlRy, 1.0);

      // Rear porcelain cistern tank with beveled ceramic lid
      const tankG = ctx.createLinearGradient(-tankW / 2, -hh, tankW / 2, -hh + tankH);
      tankG.addColorStop(0, '#ffffff');
      tankG.addColorStop(0.65, '#f1f5f9');
      tankG.addColorStop(1, '#cbd5e1');
      ctx.fillStyle = tankG;
      rr(ctx, -tankW / 2, -hh, tankW, tankH, 0.75);
      ctx.fill();
      drawArchitecturalBevel(ctx, -tankW / 2, -hh, tankW, tankH, 0.75, 0.7, 0.28, 0.42);

      // Recessed chrome dual-flush split button on cistern top
      const btnR = Math.max(0.55, Math.min(tankH * 0.28, 1.05));
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.arc(0, -hh + tankH * 0.5, btnR, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(0, -hh + tankH * 0.5, btnR * 0.74, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 0.25;
      ctx.beginPath();
      ctx.moveTo(0, -hh + tankH * 0.5 - btnR * 0.7);
      ctx.lineTo(0, -hh + tankH * 0.5 + btnR * 0.7);
      ctx.stroke();

      // Elongated ceramic bowl outer shell
      const bowlG = ctx.createLinearGradient(-bowlRx, bowlCy - bowlRy, bowlRx, bowlCy + bowlRy);
      bowlG.addColorStop(0, '#ffffff');
      bowlG.addColorStop(0.65, '#f8fafc');
      bowlG.addColorStop(1, '#cbd5e1');
      ctx.fillStyle = bowlG;
      ctx.beginPath();
      ctx.ellipse(0, bowlCy, bowlRx, bowlRy, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 0.45;
      ctx.stroke();

      // Smooth contoured seat ring
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(0, bowlCy, bowlRx * 0.9, bowlRy * 0.88, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.55)';
      ctx.lineWidth = 0.35;
      ctx.stroke();

      // Recessed inner porcelain bowl leading down to water trap
      const inG = ctx.createRadialGradient(0, bowlCy + bowlRy * 0.12, bowlRx * 0.1, 0, bowlCy, bowlRy * 0.72);
      inG.addColorStop(0, '#cbd5e1');
      inG.addColorStop(0.65, '#e2e8f0');
      inG.addColorStop(1, '#f8fafc');
      ctx.fillStyle = inG;
      ctx.beginPath();
      ctx.ellipse(0, bowlCy + bowlRy * 0.04, bowlRx * 0.64, bowlRy * 0.66, 0, 0, Math.PI * 2);
      ctx.fill();

      // Clear aqua water pool inside trap
      const watG = ctx.createRadialGradient(-0.2, bowlCy + bowlRy * 0.08, 0.1, 0, bowlCy + bowlRy * 0.14, bowlRx * 0.46);
      watG.addColorStop(0, '#bae6fd');
      watG.addColorStop(0.7, '#38bdf8');
      watG.addColorStop(1, '#0284c7');
      ctx.fillStyle = watG;
      ctx.beginPath();
      ctx.ellipse(0, bowlCy + bowlRy * 0.14, bowlRx * 0.4, bowlRy * 0.44, 0, 0, Math.PI * 2);
      ctx.fill();

      // Chrome seat hinge pins between cistern and seat
      ctx.fillStyle = '#64748b';
      ctx.fillRect(-bowlRx * 0.45, -hh + tankH - 0.15, bowlRx * 0.22, 0.55);
      ctx.fillRect(bowlRx * 0.23, -hh + tankH - 0.15, bowlRx * 0.22, 0.55);
      return true;
    }

    // =========================================================================
    // 25. INDOOR POTTED PLANT (Lush Layered Botanical — Exact Top-Down Plan)
    // =========================================================================
    case 'plant': {
      const r = Math.min(hw, hh);
      const baseLeaf = f.color || '#15803d';
      const darkLeaf = shade(baseLeaf, -0.26);
      const midLeaf = baseLeaf;
      const lightLeaf = shade(baseLeaf, 0.28);

      drawEllipseContactShadow(ctx, 0, 0, r * 0.86, r * 0.86, 1.15);

      // Terracotta / ceramic planter rim
      const potR = r * 0.68;
      const potG = ctx.createRadialGradient(-potR * 0.3, -potR * 0.3, potR * 0.1, 0, 0, potR);
      potG.addColorStop(0, '#ea580c');
      potG.addColorStop(0.65, '#c2410c');
      potG.addColorStop(1, '#7c2d12');
      ctx.fillStyle = potG;
      ctx.beginPath();
      ctx.arc(0, 0, potR, 0, Math.PI * 2);
      ctx.fill();

      // Rich textured dark potting soil with perlite specks
      ctx.fillStyle = '#291d16';
      ctx.beginPath();
      ctx.arc(0, 0, potR * 0.76, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(214, 211, 209, 0.32)';
      for (let i = 0; i < 6; i++) {
        const a = i * 1.15;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * potR * 0.45, Math.sin(a) * potR * 0.45, Math.max(0.18, r * 0.04), 0, Math.PI * 2);
        ctx.fill();
      }

      // Layer 1: Outer deep-shade broad leaves (7 radial leaves)
      const outerCount = 7;
      for (let i = 0; i < outerCount; i++) {
        const a = (i * Math.PI * 2) / outerCount + 0.18;
        ctx.save();
        ctx.rotate(a);
        drawBotanicalLeaf(ctx, r * 0.98, r * 0.36, darkLeaf, midLeaf, i % 2 === 0);
        ctx.restore();
      }

      // Layer 2: Upper sunlit vibrant leaves (5 radial leaves offset)
      const innerCount = 5;
      for (let i = 0; i < innerCount; i++) {
        const a = (i * Math.PI * 2) / innerCount + 0.55;
        ctx.save();
        ctx.rotate(a);
        drawBotanicalLeaf(ctx, r * 0.72, r * 0.29, midLeaf, lightLeaf, false);
        ctx.restore();
      }

      // Layer 3: Fresh central young rosette shoots
      for (let i = 0; i < 3; i++) {
        ctx.save();
        ctx.rotate((i * Math.PI * 2) / 3 + 0.2);
        drawBotanicalLeaf(ctx, r * 0.38, r * 0.16, lightLeaf, '#bbf7d0', false);
        ctx.restore();
      }
      return true;
    }

    // =========================================================================
    // 26. CARPET / WOVEN AREA RUG (Flush Top-Down Floor Textile)
    // =========================================================================
    case 'carpet': {
      const hex = f.color || '#991b1b';
      const isHoriz = w >= h;
      const accentGold = '#eab308';
      const borderNavy = mix(hex, '#1e293b', 0.65);

      // Subtle floor edge contact line (flat textile — no elevation drop shadow)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.16)';
      ctx.fillRect(-hw + 0.25, -hh + 0.25, w, h);

      // Knotted ivory cotton fringes on left & right (or top & bottom if vertical)
      ctx.fillStyle = '#f1f5f9';
      const fringeLen = Math.min(1.1, minD * 0.075);
      if (isHoriz) {
        const step = Math.max(0.85, h / 18);
        for (let y = -hh + step * 0.5; y < hh - step * 0.3; y += step) {
          ctx.fillRect(-hw - fringeLen, y, fringeLen, step * 0.45);
          ctx.fillRect(hw, y, fringeLen, step * 0.45);
        }
      } else {
        const step = Math.max(0.85, w / 18);
        for (let x = -hw + step * 0.5; x < hw - step * 0.3; x += step) {
          ctx.fillRect(x, -hh - fringeLen, step * 0.45, fringeLen);
          ctx.fillRect(x, hh, step * 0.45, fringeLen);
        }
      }

      // Woven wool rug field with subtle directional pile sheen
      const rugG = ctx.createLinearGradient(-hw, -hh, hw, hh);
      rugG.addColorStop(0, shade(hex, 0.1));
      rugG.addColorStop(0.5, hex);
      rugG.addColorStop(1, shade(hex, -0.18));
      ctx.fillStyle = rugG;
      ctx.fillRect(-hw, -hh, w, h);

      // Subtle woven weft rib lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.045)';
      ctx.lineWidth = 0.35;
      const ribStep = Math.max(1.2, minD / 14);
      ctx.beginPath();
      for (let y = -hh + ribStep; y < hh; y += ribStep) {
        ctx.moveTo(-hw, y);
        ctx.lineTo(hw, y);
      }
      ctx.stroke();

      // Multi-band Persian ornamental border frame
      const b1 = Math.max(0.8, minD * 0.075);
      const b2 = b1 * 2.05;
      ctx.strokeStyle = accentGold;
      ctx.lineWidth = Math.max(0.45, minD * 0.032);
      ctx.strokeRect(-hw + b1, -hh + b1, w - b1 * 2, h - b1 * 2);

      if (minD >= 9) {
        ctx.strokeStyle = borderNavy;
        ctx.lineWidth = Math.max(0.5, minD * 0.042);
        ctx.strokeRect(-hw + b2, -hh + b2, w - b2 * 2, h - b2 * 2);

        ctx.strokeStyle = 'rgba(254, 243, 199, 0.45)';
        ctx.lineWidth = 0.3;
        ctx.strokeRect(-hw + b2 + 0.65, -hh + b2 + 0.65, w - (b2 + 0.65) * 2, h - (b2 + 0.65) * 2);

        // Corner spandrel motifs
        const cs = Math.max(1.0, minD * 0.09);
        ctx.fillStyle = accentGold;
        ctx.fillRect(-hw + b2 + 0.8, -hh + b2 + 0.8, cs, cs);
        ctx.fillRect(hw - b2 - 0.8 - cs, -hh + b2 + 0.8, cs, cs);
        ctx.fillRect(-hw + b2 + 0.8, hh - b2 - 0.8 - cs, cs, cs);
        ctx.fillRect(hw - b2 - 0.8 - cs, hh - b2 - 0.8 - cs, cs, cs);
      }

      // Layered geometric central diamond medallion
      if (w >= 12 && h >= 8) {
        const mx = (w - b2 * 2) * 0.34;
        const my = (h - b2 * 2) * 0.34;
        ctx.fillStyle = borderNavy;
        ctx.beginPath();
        ctx.moveTo(0, -my);
        ctx.lineTo(mx, 0);
        ctx.lineTo(0, my);
        ctx.lineTo(-mx, 0);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = accentGold;
        ctx.lineWidth = 0.45;
        ctx.stroke();

        ctx.fillStyle = shade(hex, 0.18);
        ctx.beginPath();
        ctx.moveTo(0, -my * 0.62);
        ctx.lineTo(mx * 0.62, 0);
        ctx.lineTo(0, my * 0.62);
        ctx.lineTo(-mx * 0.62, 0);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#fef3c7';
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(0.55, Math.min(mx, my) * 0.24), 0, Math.PI * 2);
        ctx.fill();
      }
      return true;
    }

    // =========================================================================
    // 27. COAT RACK (Freestanding Bentwood Tree — Exact Top-Down Plan)
    // =========================================================================
    case 'coat_rack': {
      const hex = f.color || '#5c2d0c';
      const r = Math.min(hw, hh) * 0.94;
      drawEllipseContactShadow(ctx, 0, 0, r * 0.96, r * 0.96, 1.35);

      // Weighted circular wood / cast-iron plinth base
      const baseG = ctx.createRadialGradient(-r * 0.25, -r * 0.25, r * 0.1, 0, 0, r);
      baseG.addColorStop(0, shade(hex, 0.22));
      baseG.addColorStop(0.7, hex);
      baseG.addColorStop(1, shade(hex, -0.4));
      ctx.fillStyle = baseG;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.88, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = shade(hex, -0.5);
      ctx.lineWidth = 0.4;
      ctx.stroke();

      // 6 Radial curved brass / bentwood coat arms with wooden tip spheres
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI * 2) / 6;
        const hx = Math.cos(a) * r * 0.86;
        const hy = Math.sin(a) * r * 0.86;
        ctx.strokeStyle = '#ca8a04';
        ctx.lineWidth = Math.max(0.45, r * 0.14);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(hx, hy);
        ctx.stroke();

        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(hx, hy, Math.max(0.35, r * 0.13), 0, Math.PI * 2);
        ctx.fill();
      }

      // Draped wool overcoat shoulder folds hanging on NW hooks
      ctx.save();
      ctx.rotate(-0.65);
      drawUpholsteredCushion(ctx, -r * 0.85, -r * 0.34, r * 0.95, r * 0.62, '#1e3a8a', r * 0.28, { piping: false });
      ctx.restore();

      // Knit burgundy scarf draped on SE hook
      ctx.save();
      ctx.rotate(0.5);
      drawUpholsteredCushion(ctx, r * 0.1, -r * 0.15, r * 0.72, r * 0.38, '#9f1239', r * 0.16, { piping: false });
      ctx.restore();

      // Top-down wool fedora hat resting on center finial
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(0.25, 0.3, r * 0.44, r * 0.36, 0.15, 0, Math.PI * 2);
      ctx.fill();
      const hatG = ctx.createRadialGradient(-r * 0.1, -r * 0.1, 0.1, 0, 0, r * 0.44);
      hatG.addColorStop(0, '#64748b');
      hatG.addColorStop(0.65, '#334155');
      hatG.addColorStop(1, '#0f172a');
      ctx.fillStyle = hatG;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.44, r * 0.36, 0.15, 0, Math.PI * 2);
      ctx.fill();
      // Hat crown crease & ribbon
      ctx.strokeStyle = '#b91c1c';
      ctx.lineWidth = Math.max(0.35, r * 0.1);
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.26, r * 0.2, 0.15, 0, Math.PI * 2);
      ctx.stroke();
      return true;
    }

    // =========================================================================
    // 28. MIRROR (Wall / Standing Full-Length Mirror — Exact Top-Down Slim Profile)
    // =========================================================================
    case 'mirror': {
      const hex = f.color || '#d97706';
      const isHoriz = w >= h;
      const len = isHoriz ? w : h;
      const thick = isHoriz ? h : w;

      ctx.save();
      if (!isHoriz) ctx.rotate(Math.PI / 2);
      const hl = len / 2;
      const ht = thick / 2;

      drawRectContactShadow(ctx, -hl, -ht * 0.85, len, thick * 0.85, 0.4, 0.9);

      // Subtle folding rear easel leg (when deep enough to be freestanding)
      if (thick >= 2.6) {
        ctx.strokeStyle = shade(hex, -0.35);
        ctx.lineWidth = 0.45;
        ctx.beginPath();
        ctx.moveTo(-hl * 0.45, -ht * 0.1);
        ctx.lineTo(-hl * 0.38, -ht * 0.92);
        ctx.lineTo(hl * 0.38, -ht * 0.92);
        ctx.lineTo(hl * 0.45, -ht * 0.1);
        ctx.stroke();
      }

      // Molded carved gold / wood top edge frame profile
      const barH = Math.max(0.9, Math.min(thick * 0.72, 2.2));
      const barY = ht - barH;
      const frameG = ctx.createLinearGradient(-hl, barY, hl, barY + barH);
      frameG.addColorStop(0, shade(hex, 0.38));
      frameG.addColorStop(0.5, hex);
      frameG.addColorStop(1, shade(hex, -0.28));
      ctx.fillStyle = frameG;
      rr(ctx, -hl, barY, len, barH, 0.35);
      ctx.fill();
      drawArchitecturalBevel(ctx, -hl, barY, len, barH, 0.35, 0.5, 0.35, 0.35);

      // Crisp silvered reflective glass front bevel edge
      ctx.fillStyle = '#e0f2fe';
      ctx.fillRect(-hl + 0.45, barY + barH - Math.max(0.35, barH * 0.3), len - 0.9, Math.max(0.32, barH * 0.28));
      // Specular glint
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-hl * 0.45, barY + barH - Math.max(0.35, barH * 0.3), len * 0.22, Math.max(0.32, barH * 0.28));
      ctx.restore();
      return true;
    }

    // =========================================================================
    // 29. FLOOR LAMP (Pleated Linen Drum Shade — Exact Top-Down Plan)
    // =========================================================================
    case 'floor_lamp': {
      const r = Math.min(hw, hh);
      const shadeHex = f.color || '#fef3c7';

      // Warm atmospheric radial light pool on floor at dusk/night
      if (isNight) {
        const glowR = Math.max(w, h) * 2.35;
        const glowG = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, glowR);
        glowG.addColorStop(0, 'rgba(254, 240, 138, 0.36)');
        glowG.addColorStop(0.42, 'rgba(253, 224, 71, 0.14)');
        glowG.addColorStop(1, 'rgba(253, 224, 71, 0)');
        ctx.fillStyle = glowG;
        ctx.beginPath();
        ctx.arc(0, 0, glowR, 0, Math.PI * 2);
        ctx.fill();
      }

      // Trailing fabric-braided power cord
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = Math.max(0.32, r * 0.09);
      ctx.beginPath();
      ctx.moveTo(r * 0.65, r * 0.55);
      ctx.quadraticCurveTo(r * 1.1, r * 0.85, r * 1.25, r * 1.25);
      ctx.stroke();

      drawEllipseContactShadow(ctx, 0, 0, r * 0.92, r * 0.92, 1.45);

      // Weighted circular bronze/slate base peeking slightly beneath shade
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(0.2, 0.25, r * 0.9, 0, Math.PI * 2);
      ctx.fill();

      // Translucent drum fabric lampshade seen straight from above
      const shR = r * 0.86;
      const shG = ctx.createRadialGradient(0, 0, shR * 0.08, 0, 0, shR);
      shG.addColorStop(0, isNight ? '#ffffff' : '#fffbeb');
      shG.addColorStop(0.45, isNight ? '#fef08a' : shade(shadeHex, 0.35));
      shG.addColorStop(0.85, isNight ? '#fde047' : shadeHex);
      shG.addColorStop(1, shade(shadeHex, -0.28));
      ctx.fillStyle = shG;
      ctx.beginPath();
      ctx.arc(0, 0, shR, 0, Math.PI * 2);
      ctx.fill();

      // Subtle pleated shade outer rim & radial wire spider fitter ribs
      ctx.strokeStyle = shade(shadeHex, -0.4, shadeHex, 0.55);
      ctx.lineWidth = 0.45;
      ctx.stroke();

      ctx.strokeStyle = 'rgba(146, 64, 14, 0.38)';
      ctx.lineWidth = 0.32;
      for (let i = 0; i < 3; i++) {
        const a = (i * Math.PI * 2) / 3 + 0.3;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * shR * 0.94, Math.sin(a) * shR * 0.94);
        ctx.stroke();
      }

      // Frosted glass bulb diffuser & brass finial cap
      ctx.fillStyle = isNight ? '#ffffff' : '#fef9c3';
      ctx.beginPath();
      ctx.arc(0, 0, shR * 0.32, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ca8a04';
      ctx.beginPath();
      ctx.arc(0, 0, shR * 0.12, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    default:
      return false;
  }
}
