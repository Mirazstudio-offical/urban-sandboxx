// High-detail realistic 90-degree orthographic top-down models
// for all commercial, office, medical, civic, industrial & showroom furniture.

import type { InteriorFurniture } from '../buildingInteriors';
import {
  shade,
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
} from './furnitureTopDownMaterials';

export function renderCommercialFurniture(
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
    // 1. HOSPITAL BED (Orientation-Aware Exact Top-Down Plan)
    // =========================================================================
    case 'bed_hospital': {
      const isHoriz = w > h;
      drawRectContactShadow(ctx, -hw, -hh, w, h, 1.4, 1.25);

      ctx.save();
      // Normalize so head is at -L/2 (top in local coords) and foot is at +L/2 (bottom)
      if (isHoriz) ctx.rotate(-Math.PI / 2);
      const bw = isHoriz ? h : w;
      const bl = isHoriz ? w : h;
      const bhw = bw / 2;
      const bhl = bl / 2;

      // Powder-coated clinical steel perimeter chassis
      drawBrushedMetal(ctx, -bhw, -bhl, bw, bl, '#cbd5e1', 1.2, false);

      // 4 Corner rubber anti-collision bumper discs
      const bumpR = Math.max(0.8, Math.min(1.8, bw * 0.1));
      ctx.fillStyle = '#334155';
      for (const [bx, by] of [
        [-bhw + bumpR * 0.7, -bhl + bumpR * 0.7],
        [bhw - bumpR * 0.7, -bhl + bumpR * 0.7],
        [-bhw + bumpR * 0.7, bhl - bumpR * 0.7],
        [bhw - bumpR * 0.7, bhl - bumpR * 0.7],
      ]) {
        ctx.beginPath();
        ctx.arc(bx, by, bumpR, 0, Math.PI * 2);
        ctx.fill();
      }

      // Molded clinical ABS headboard (-bhl) & footboard (+bhl)
      const boardT = Math.max(1.3, bl * 0.065);
      drawBrushedMetal(ctx, -bhw + 0.4, -bhl, bw - 0.8, boardT, '#94a3b8', 0.6, false);
      drawBrushedMetal(ctx, -bhw + 0.4, bhl - boardT, bw - 0.8, boardT, '#94a3b8', 0.6, false);

      // Hygienic medical mattress
      const pad = Math.max(1.1, bw * 0.09);
      const mX = -bhw + pad;
      const mY = -bhl + boardT + 0.25;
      const mW = bw - pad * 2;
      const mL = bl - boardT * 2 - 0.5;
      ctx.fillStyle = '#f8fafc';
      rr(ctx, mX, mY, mW, mL, 0.8);
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 0.35;
      ctx.stroke();

      // Antiseptic vinyl pillow at head end
      const pH = Math.max(2.6, mL * 0.19);
      drawUpholsteredCushion(ctx, mX + 1.0, mY + 0.6, mW - 2.0, pH, '#e2e8f0', pH * 0.35, { piping: true });

      // Folded sterile hospital blanket (lower 62%)
      const blankHex = f.color && !isLightColor(f.color) ? f.color : '#0284c7';
      const blY = mY + pH + 1.4;
      const blH = mY + mL - blY;
      drawUpholsteredCushion(ctx, mX, blY, mW, blH, blankHex, 0.6, { piping: false, crease: true });

      // Crisp white folded top sheet turn-down
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(mX, blY, mW, Math.max(1.3, mL * 0.08));
      ctx.fillStyle = shade(blankHex, 0.35);
      ctx.fillRect(mX, blY + Math.max(1.3, mL * 0.08), mW, 0.55);

      // Collapsible brushed-aluminum side safety rails
      const railW = Math.max(0.7, bw * 0.06);
      drawBrushedMetal(ctx, -bhw + 0.2, -bhl + boardT + bl * 0.12, railW, bl * 0.56, '#e2e8f0', 0.3, true);
      drawBrushedMetal(ctx, bhw - 0.2 - railW, -bhl + boardT + bl * 0.12, railW, bl * 0.56, '#e2e8f0', 0.3, true);

      // Patient chart clipboard hanging at foot rail
      const clipW = Math.min(mW * 0.42, 5.5);
      drawWoodSurface(ctx, -clipW / 2, bhl - boardT - 0.3, clipW, 1.3, '#92400e', 0.2, true, 0);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-clipW / 2 + 0.4, bhl - boardT - 0.1, clipW - 0.8, 0.85);

      // Top-down IV drip pole + translucent saline bag at head-right corner
      const ivX = bhw - 1.1;
      const ivY = -bhl + boardT + 1.4;
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.arc(ivX, ivY, 1.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.arc(ivX, ivY, 0.6, 0, Math.PI * 2);
      ctx.fill();
      // Saline bag hanging slightly inward
      ctx.fillStyle = 'rgba(56, 189, 248, 0.78)';
      rr(ctx, ivX - 1.8, ivY - 0.65, 1.4, 2.2, 0.45);
      ctx.fill();
      ctx.restore();
      return true;
    }

    // =========================================================================
    // 2. MEDICAL EXAM TABLE (Orientation-Aware Exact Top-Down Plan)
    // =========================================================================
    case 'exam_table': {
      const isHoriz = w > h;
      const vinylHex = f.color && !isLightColor(f.color) ? f.color : '#0284c7';
      drawRectContactShadow(ctx, -hw, -hh, w, h, 1.0, 1.15);

      ctx.save();
      if (isHoriz) ctx.rotate(-Math.PI / 2);
      const bw = isHoriz ? h : w;
      const bl = isHoriz ? w : h;
      const bhw = bw / 2;
      const bhl = bl / 2;

      // Enameled steel perimeter base
      drawBrushedMetal(ctx, -bhw, -bhl, bw, bl, '#e2e8f0', 1.0, false);

      // Padded medical leatherette vinyl cushion
      const pad = Math.max(0.8, bw * 0.06);
      drawUpholsteredCushion(ctx, -bhw + pad, -bhl + pad, bw - pad * 2, bl - pad * 2, vinylHex, 0.9, {
        leather: true,
        piping: true,
      });

      // Articulated headrest hinge seam
      const headY = -bhl + bl * 0.3;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.38)';
      ctx.lineWidth = 0.65;
      ctx.beginPath();
      ctx.moveTo(-bhw + pad, headY);
      ctx.lineTo(bhw - pad, headY);
      ctx.stroke();

      // Disposable sanitary white paper runner unrolled down center
      const papW = bw * 0.62;
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(-papW / 2 + 0.25, -bhl + pad + 1.2, papW, bl - pad * 2 - 2.2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-papW / 2, -bhl + pad + 1.0, papW, bl - pad * 2 - 2.2);

      // Subtle paper fold crinkles
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
      ctx.lineWidth = 0.3;
      ctx.beginPath();
      ctx.moveTo(-papW / 2, headY);
      ctx.lineTo(papW / 2, headY);
      ctx.moveTo(-papW / 2, bhl * 0.25);
      ctx.lineTo(papW / 2, bhl * 0.28);
      ctx.stroke();

      // Cylindrical sanitary paper roll mounted at head end (-bhl)
      const rollH = Math.max(1.5, bl * 0.08);
      const rollG = ctx.createLinearGradient(0, -bhl + pad + 0.3, 0, -bhl + pad + 0.3 + rollH);
      rollG.addColorStop(0, '#cbd5e1');
      rollG.addColorStop(0.45, '#ffffff');
      rollG.addColorStop(1, '#94a3b8');
      ctx.fillStyle = rollG;
      rr(ctx, -papW / 2 - 0.5, -bhl + pad + 0.3, papW + 1.0, rollH, rollH * 0.4);
      ctx.fill();
      ctx.restore();
      return true;
    }

    // =========================================================================
    // 3. JAIL COT (Institutional Steel Bunk — Exact Top-Down Plan)
    // =========================================================================
    case 'jail_cot': {
      const isHoriz = w > h;
      drawRectContactShadow(ctx, -hw, -hh, w, h, 0.5, 1.05);

      ctx.save();
      if (isHoriz) ctx.rotate(-Math.PI / 2);
      const bw = isHoriz ? h : w;
      const bl = isHoriz ? w : h;
      const bhw = bw / 2;
      const bhl = bl / 2;

      // Welded dark angle-iron steel frame with corner rivets
      drawBrushedMetal(ctx, -bhw, -bhl, bw, bl, '#334155', 0.4, false);
      const fPad = Math.max(0.75, bw * 0.08);

      // Coarse grey canvas ticking mattress
      drawUpholsteredCushion(ctx, -bhw + fPad, -bhl + fPad, bw - fPad * 2, bl - fPad * 2, '#9ca3af', 0.45, {
        piping: false,
      });

      // Thin institutional flat pillow
      const pH = Math.max(2.0, bl * 0.18);
      drawUpholsteredCushion(ctx, -bhw + fPad + 0.6, -bhl + fPad + 0.5, bw - fPad * 2 - 1.2, pH, '#d1d5db', 0.5, {
        piping: false,
      });

      // Heavy coarse charcoal wool blanket with twin woven stripe
      const blY = -bhl + fPad + pH + 1.0;
      const blH = bhl - fPad - blY;
      drawUpholsteredCushion(ctx, -bhw + fPad, blY, bw - fPad * 2, blH, '#52525b', 0.4, {
        piping: false,
        crease: true,
      });
      ctx.fillStyle = '#27272a';
      ctx.fillRect(-bhw + fPad + 0.2, blY + blH * 0.14, bw - fPad * 2 - 0.4, Math.max(0.65, blH * 0.09));
      ctx.fillRect(-bhw + fPad + 0.2, blY + blH * 0.27, bw - fPad * 2 - 0.4, Math.max(0.4, blH * 0.05));
      ctx.restore();
      return true;
    }

    // =========================================================================
    // 4. RECEPTION DESK (Two-Tier Architectural Counter — Exact Top-Down Plan)
    // =========================================================================
    case 'desk_reception': {
      const hex = f.color || '#1e293b';
      drawRectContactShadow(ctx, -hw, -hh, w, h, 1.0, 1.3);

      // Lower receptionist work deck (back 65%, toward +hh or full base)
      const isWood = !isLightColor(hex) && (hex.startsWith('#d') || hex.startsWith('#e') || hex.startsWith('#b') || hex.startsWith('#7') || hex.startsWith('#9'));
      if (isWood) {
        drawWoodSurface(ctx, -hw, -hh, w, h, shade(hex, -0.2), 0.9, true, 0);
      } else {
        drawBrushedMetal(ctx, -hw, -hh, w, h, '#334155', 0.9, false);
      }

      // Elevated polished stone/wood visitor transaction ledge along front (-hh)
      const ledgeH = Math.max(2.2, h * 0.34);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
      rr(ctx, -hw - 0.2, -hh + 0.5, w + 0.4, ledgeH + 0.4, 0.8);
      ctx.fill();

      if (isWood) {
        drawWoodSurface(ctx, -hw - 0.25, -hh - 0.15, w + 0.5, ledgeH, hex, 0.8, true, 0);
      } else {
        drawBrushedMetal(ctx, -hw - 0.25, -hh - 0.15, w + 0.5, ledgeH, hex, 0.8, false);
      }

      // Subtle architectural LED accent strip recessed along ledge lip
      ctx.fillStyle = isNight ? '#38bdf8' : 'rgba(56, 189, 248, 0.72)';
      ctx.fillRect(-hw + 1.2, -hh + ledgeH - 0.35, w - 2.4, 0.38);

      // Visitor check-in guest ledger book + pen + brass service bell
      const workY = -hh + ledgeH + 0.9;
      const workH = Math.max(1.5, h - ledgeH - 1.6);
      const bookW = Math.min(w * 0.18, 5.2);
      const bookH = Math.min(workH * 0.78, 3.6);
      ctx.fillStyle = '#1e293b';
      rr(ctx, -hw + w * 0.1, workY, bookW, bookH, 0.3);
      ctx.fill();
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-hw + w * 0.1 + 0.3, workY + 0.3, bookW * 0.45, bookH - 0.6);
      ctx.fillRect(-hw + w * 0.1 + bookW * 0.52, workY + 0.3, bookW * 0.42, bookH - 0.6);

      // Polished brass reception service bell on ledge
      const bellX = hw - Math.max(3.2, w * 0.12);
      const bellY = -hh + ledgeH * 0.5;
      const bellR = Math.max(0.75, Math.min(1.25, ledgeH * 0.3));
      const bellG = ctx.createRadialGradient(bellX - bellR * 0.3, bellY - bellR * 0.3, 0.1, bellX, bellY, bellR);
      bellG.addColorStop(0, '#fef08a');
      bellG.addColorStop(0.55, '#ca8a04');
      bellG.addColorStop(1, '#713f12');
      ctx.fillStyle = bellG;
      ctx.beginPath();
      ctx.arc(bellX, bellY, bellR, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(bellX, bellY, bellR * 0.26, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    // =========================================================================
    // 5. RETAIL CHECKOUT COUNTER (Orientation-Aware Exact Top-Down Plan)
    // =========================================================================
    case 'counter': {
      const hex = f.color || '#0284c7';
      const isHoriz = w >= h;
      drawRectContactShadow(ctx, -hw, -hh, w, h, 0.8, 1.2);

      ctx.save();
      if (!isHoriz) ctx.rotate(Math.PI / 2);
      const cw = isHoriz ? w : h;
      const ch = isHoriz ? h : w;
      const chw = cw / 2;
      const chh = ch / 2;

      // Painted steel checkout cabinet chassis with stainless bumper rails
      drawBrushedMetal(ctx, -chw, -chh, cw, ch, hex, 0.75, false);

      const railH = Math.max(0.75, ch * 0.12);
      drawBrushedMetal(ctx, -chw, -chh, cw, railH, '#cbd5e1', 0.3, false);
      drawBrushedMetal(ctx, -chw, chh - railH, cw, railH, '#cbd5e1', 0.3, false);

      // Dark matte-rubber conveyor belt (left 62%)
      const beltX = -chw + 0.9;
      const beltY = -chh + railH + 0.45;
      const beltW = cw * 0.56;
      const beltH = ch - railH * 2 - 0.9;
      ctx.fillStyle = '#0f172a';
      rr(ctx, beltX, beltY, beltW, beltH, 0.35);
      ctx.fill();
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 0.35;
      const step = Math.max(1.6, beltW / 8);
      ctx.beginPath();
      for (let x = beltX + step; x < beltX + beltW - 0.6; x += step) {
        ctx.moveTo(x, beltY + 0.25);
        ctx.lineTo(x, beltY + beltH - 0.25);
      }
      ctx.stroke();

      // Recessed optical barcode scanner glass window (center-right)
      const scanX = beltX + beltW + 0.9;
      const scanW = Math.min(cw * 0.16, Math.max(2.2, beltH * 0.6));
      drawGlassPanel(ctx, scanX, beltY + beltH * 0.15, scanW, beltH * 0.7, '#020617', 0.3, 0.95);
      // Red laser scan line glint
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.72)';
      ctx.lineWidth = 0.35;
      ctx.beginPath();
      ctx.moveTo(scanX + 0.3, beltY + beltH * 0.35);
      ctx.lineTo(scanX + scanW - 0.3, beltY + beltH * 0.65);
      ctx.stroke();

      // Brushed stainless bagging slide well (far right)
      const bagX = scanX + scanW + 0.8;
      const bagW = chw - bagX - 0.9;
      if (bagW > 1.5) {
        drawBrushedMetal(ctx, bagX, beltY, bagW, beltH, '#94a3b8', 0.35, false);
      }
      ctx.restore();
      return true;
    }

    // =========================================================================
    // 6. CASH REGISTER / POS TERMINAL (Exact Top-Down Plan)
    // =========================================================================
    case 'cash_register': {
      drawRectContactShadow(ctx, -hw, -hh, w, h, 0.55, 0.95);

      // Matte charcoal steel cash drawer casing
      drawBrushedMetal(ctx, -hw, -hh, w, h, '#1e293b', 0.5, false);

      // Tilted slim POS touchscreen terminal top housing along rear (-hh)
      const scrW = w * 0.74;
      const scrH = Math.max(1.2, h * 0.28);
      drawBrushedMetal(ctx, -hw + 0.5, -hh + 0.45, scrW, scrH, '#0f172a', 0.35, false);
      // Illuminated POS total display glow edge
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(-hw + 0.85, -hh + 0.45 + scrH - 0.35, scrW - 0.7, 0.3);

      // Thermal receipt printer bay + protruding white paper receipt curl (right side)
      const prX = hw - Math.max(1.8, w * 0.26);
      const prW = Math.max(1.3, w * 0.21);
      ctx.fillStyle = '#090d16';
      rr(ctx, prX, -hh + 0.5, prW, h * 0.42, 0.25);
      ctx.fill();
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(prX + 0.25, -hh + 0.9, prW - 0.5, h * 0.44);

      // Tactile merchant keypad deck on lower-left
      const kpW = w * 0.55;
      const kpH = h * 0.38;
      const kpY = hh - kpH - 0.55;
      ctx.fillStyle = '#0f172a';
      rr(ctx, -hw + 0.6, kpY, kpW, kpH, 0.25);
      ctx.fill();
      ctx.fillStyle = '#64748b';
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 4; c++) {
          ctx.fillRect(-hw + 0.85 + c * (kpW * 0.22), kpY + 0.28 + r * (kpH * 0.42), kpW * 0.16, kpH * 0.3);
        }
      }

      // Cash drawer front chrome keylock cylinder at +hh
      ctx.fillStyle = '#ca8a04';
      ctx.beginPath();
      ctx.arc(0, hh - 0.22, 0.32, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    // =========================================================================
    // 7. SHELF / RETAIL GONDOLA / MEDICAL CABINET (Orientation-Aware Top-Down)
    // =========================================================================
    case 'shelf': {
      const hex = f.color || '#475569';
      const isMedical = isLightColor(hex);
      const isHoriz = w >= h;
      drawRectContactShadow(ctx, -hw, -hh, w, h, 0.6, 1.35);

      ctx.save();
      if (!isHoriz) ctx.rotate(Math.PI / 2);
      const sw = isHoriz ? w : h;
      const sh = isHoriz ? h : w;
      const shw = sw / 2;
      const shh = sh / 2;

      if (isMedical) {
        // Glass-top enameled medical supply / pharmacy cabinet
        drawBrushedMetal(ctx, -shw, -shh, sw, sh, '#f1f5f9', 0.6, false);
        const ins = Math.max(0.65, sh * 0.11);
        // Interior clinical tray visible beneath tempered glass top
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(-shw + ins, -shh + ins, sw - ins * 2, sh - ins * 2);

        // Organized ampoules / medicine boxes seen straight from above
        const medCols = ['#0284c7', '#10b981', '#ef4444', '#f59e0b', '#38bdf8', '#ffffff'];
        let mx = -shw + ins + 0.5;
        let idx = 0;
        while (mx < shw - ins - 1.5) {
          const mw = Math.min(2.2, Math.max(1.0, (sw - ins * 2) / 9));
          const col = medCols[idx % medCols.length];
          ctx.fillStyle = col;
          rr(ctx, mx, -shh + ins + 0.45, mw, sh - ins * 2 - 0.9, 0.25);
          ctx.fill();
          // White sterile cap circle on medicine vial
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(mx + mw * 0.5, 0, Math.min(mw, sh) * 0.22, 0, Math.PI * 2);
          ctx.fill();
          mx += mw + 0.55;
          idx++;
        }

        // Tempered glass top overlay with diagonal reflection
        drawGlassPanel(ctx, -shw + ins, -shh + ins, sw - ins * 2, sh - ins * 2, '#bae6fd', 0.35, 0.26);

        // Crisp red medical cross emblem on center frame
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-1.2, -0.32, 2.4, 0.64);
        ctx.fillRect(-0.32, -1.2, 0.64, 2.4);
      } else {
        // Retail supermarket / warehouse steel shelving gondola (exact top-down)
        drawBrushedMetal(ctx, -shw, -shh, sw, sh, hex, 0.55, false);

        // Central spine rail dividing double-sided aisle shelving
        const ins = Math.max(0.5, sh * 0.08);
        ctx.fillStyle = shade(hex, -0.45);
        ctx.fillRect(-shw + ins, -shh + ins, sw - ins * 2, sh - ins * 2);

        const prodColors = ['#dc2626', '#2563eb', '#16a34a', '#eab308', '#f97316', '#8b5cf6', '#e2e8f0', '#06b6d4'];
        const rows = sh >= 7 ? 2 : 1;
        const rowH = (sh - ins * 2 - (rows > 1 ? 0.6 : 0)) / rows;

        for (let r = 0; r < rows; r++) {
          const ry = -shh + ins + r * (rowH + 0.6);
          let px = -shw + ins + 0.35;
          let idx = r * 5;
          while (px < shw - ins - 1.2) {
            const pw = Math.min(2.6, Math.max(1.1, 1.2 + ((idx * 19) % 4) * 0.35));
            const ph = rowH * (0.76 + ((idx * 11) % 3) * 0.09);
            const col = prodColors[idx % prodColors.length];
            ctx.fillStyle = col;
            rr(ctx, px, ry + (rowH - ph) * 0.5, Math.min(pw, shw - ins - px), ph, 0.22);
            ctx.fill();
            // Subtle top packaging highlight/label strip
            ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
            ctx.fillRect(px + 0.2, ry + (rowH - ph) * 0.5 + 0.2, Math.max(0.2, Math.min(pw, shw - ins - px) - 0.4), ph * 0.28);
            px += pw + 0.32;
            idx++;
          }
        }

        // Steel center aisle divider rib
        if (rows === 2) {
          drawBrushedMetal(ctx, -shw + 0.2, -0.32, sw - 0.4, 0.64, shade(hex, 0.2), 0.15, false);
        }
      }
      ctx.restore();
      return true;
    }

    // =========================================================================
    // 8. FILE CABINET (Exact Top-Down Steel Roof + Top Folder + Front Drawer Lip)
    // =========================================================================
    case 'file_cabinet': {
      const hex = f.color || '#64748b';
      drawRectContactShadow(ctx, -hw, -hh, w, h, 0.55, 1.35);

      const lipH = Math.max(0.75, h * 0.12);
      // Powder-coated steel cabinet top lid
      drawBrushedMetal(ctx, -hw, -hh, w, h - lipH * 0.5, hex, 0.5, false);

      // Stamped metal roof recess seam
      const ins = Math.max(0.55, minD * 0.09);
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.25)';
      ctx.lineWidth = 0.35;
      ctx.strokeRect(-hw + ins, -hh + ins, w - ins * 2, h - lipH - ins * 1.4);

      // Neatly stacked manila document folder resting on top
      if (w >= 6 && h >= 5) {
        ctx.save();
        ctx.rotate(-0.1);
        const fw = w * 0.52;
        const fh = h * 0.44;
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.fillRect(-fw / 2 + 0.2, -fh / 2 + 0.25, fw, fh);
        ctx.fillStyle = '#fde68a';
        ctx.fillRect(-fw / 2, -fh / 2, fw, fh);
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(-fw / 2 + 0.3, -fh / 2 + 0.3, fw - 0.6, fh - 0.6);
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(-fw * 0.3, -fh * 0.15, fw * 0.6, 0.32);
        ctx.fillRect(-fw * 0.3, fh * 0.1, fw * 0.45, 0.32);
        ctx.restore();
      }

      // Front top-drawer steel lip + chrome handle pull protruding along +hh
      drawBrushedMetal(ctx, -hw + 0.2, hh - lipH, w - 0.4, lipH, shade(hex, -0.14), 0.25, false);
      drawCabinetPull(ctx, -w * 0.22, hh - 0.12, w * 0.44, 0.48, '#e2e8f0');
      return true;
    }

    // =========================================================================
    // 9. SERVER RACK (42U IT Rack — Exact Top-Down Roof Fans & Cable Grommet)
    // =========================================================================
    case 'server_rack': {
      drawRectContactShadow(ctx, -hw, -hh, w, h, 0.6, 1.55);

      // Heavy matte-obsidian 19" steel cabinet roof
      drawBrushedMetal(ctx, -hw, -hh, w, h, '#1e293b', 0.55, false);
      const ins = Math.max(0.65, minD * 0.08);
      ctx.fillStyle = '#090d16';
      rr(ctx, -hw + ins, -hh + ins, w - ins * 2, h - ins * 2, 0.35);
      ctx.fill();

      // Rear cable-entry brush grommet with bundled blue/yellow/green Cat6 cables (-hh)
      const gromW = w * 0.56;
      const gromH = Math.max(1.0, h * 0.15);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-gromW / 2, -hh + ins + 0.25, gromW, gromH);
      const cableCols = ['#38bdf8', '#facc15', '#22c55e', '#f97316'];
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = cableCols[i];
        ctx.fillRect(-gromW * 0.38 + i * (gromW * 0.24), -hh + ins + 0.3, gromW * 0.12, gromH * 0.85);
      }

      // Twin recessed circular top exhaust cooling fans with radial impeller blades & wire guards
      const fanR = Math.min((w - ins * 2) * 0.21, (h - ins * 2) * 0.27);
      const fanY = hh * 0.06;
      for (const fx of [-w * 0.21, w * 0.21]) {
        ctx.fillStyle = '#020617';
        ctx.beginPath();
        ctx.arc(fx, fanY, fanR, 0, Math.PI * 2);
        ctx.fill();

        // 7 curved impeller fan blades
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = Math.max(0.35, fanR * 0.24);
        for (let b = 0; b < 7; b++) {
          const a = (b * Math.PI * 2) / 7;
          ctx.beginPath();
          ctx.moveTo(fx, fanY);
          ctx.lineTo(fx + Math.cos(a) * fanR * 0.88, fanY + Math.sin(a) * fanR * 0.88);
          ctx.stroke();
        }
        // Center motor hub
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.arc(fx, fanY, fanR * 0.28, 0, Math.PI * 2);
        ctx.fill();
        // Concentric protective wire finger guard ring
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 0.28;
        ctx.beginPath();
        ctx.arc(fx, fanY, fanR * 0.96, 0, Math.PI * 2);
        ctx.arc(fx, fanY, fanR * 0.62, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Front glass/mesh door frame lip (+hh) with blinking status LED glow bleed
      ctx.fillStyle = '#334155';
      ctx.fillRect(-hw + 0.3, hh - 0.75, w - 0.6, 0.75);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(-hw + 1.2, hh - 0.32, 0.85, 0.32);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(-hw + 2.5, hh - 0.32, 0.85, 0.32);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(-hw + 3.8, hh - 0.32, 0.85, 0.32);

      if (isNight) {
        const lg = ctx.createLinearGradient(0, hh, 0, hh + 3.5);
        lg.addColorStop(0, 'rgba(34, 197, 94, 0.26)');
        lg.addColorStop(1, 'rgba(34, 197, 94, 0)');
        ctx.fillStyle = lg;
        ctx.fillRect(-hw + 0.6, hh, w - 1.2, 3.5);
      }
      return true;
    }

    // =========================================================================
    // 10. REINFORCED SAFE (Exact Top-Down Armored Roof, Thick Front Door & Hinges)
    // =========================================================================
    case 'safe': {
      const hex = f.color || '#1e293b';
      drawRectContactShadow(ctx, -hw, -hh, w, h, 0.65, 1.35);

      const doorT = Math.max(1.1, h * 0.17);
      // Heavy chamfered armored steel vault roof
      drawBrushedMetal(ctx, -hw, -hh, w, h - doorT * 0.7, hex, 0.6, false);

      // Welded steel bevel seam & 4 recessed top corner anchor bolts
      const ins = Math.max(0.75, minD * 0.11);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 0.4;
      rr(ctx, -hw + ins, -hh + ins, w - ins * 2, h - doorT - ins * 1.4, 0.35);
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      for (const [bx, by] of [
        [-hw + ins * 0.6, -hh + ins * 0.6],
        [hw - ins * 0.6, -hh + ins * 0.6],
        [-hw + ins * 0.6, hh - doorT - ins * 0.5],
        [hw - ins * 0.6, hh - doorT - ins * 0.5],
      ]) {
        ctx.beginPath();
        ctx.arc(bx, by, Math.max(0.32, minD * 0.045), 0, Math.PI * 2);
        ctx.fill();
      }

      // Thick stepped armored front door slab edge along +hh
      drawBrushedMetal(ctx, -hw + 0.3, hh - doorT, w - 0.6, doorT, shade(hex, 0.12), 0.35, false);

      // Heavy cylindrical external door hinge barrel on front-right corner
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.arc(hw - 0.7, hh - 0.1, Math.max(0.55, minD * 0.08), 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 0.25;
      ctx.stroke();

      // Protruding angled digital keypad bezel (front-left) + chrome vault handle hub (front-center)
      ctx.fillStyle = '#090d16';
      rr(ctx, -hw + w * 0.14, hh - 0.15, w * 0.26, 0.65, 0.2);
      ctx.fill();
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(-hw + w * 0.18, hh + 0.05, 0.5, 0.25);

      // Protruding brushed-chrome T-bar / spoke vault handle seen from straight above
      drawCabinetPull(ctx, -0.35, hh - 0.1, 0.7, 0.85, '#cbd5e1');
      drawCabinetPull(ctx, -w * 0.16, hh + 0.45, w * 0.32, 0.45, '#e2e8f0');
      return true;
    }

    // =========================================================================
    // 11. VENDING MACHINE (Exact Top-Down Cabinet Roof, Rear Louvers & Front Glow)
    // =========================================================================
    case 'vending_machine': {
      const hex = f.color || '#dc2626';
      // Forward illuminated display glass glow spilling onto the floor in front (+hh)
      const glowH = Math.max(3.5, h * 0.75);
      const gg = ctx.createLinearGradient(0, hh, 0, hh + glowH);
      gg.addColorStop(0, isNight ? 'rgba(254, 240, 138, 0.38)' : 'rgba(254, 249, 195, 0.16)');
      gg.addColorStop(1, 'rgba(254, 240, 138, 0)');
      ctx.fillStyle = gg;
      ctx.fillRect(-hw * 0.88, hh, w * 0.88, glowH);

      drawRectContactShadow(ctx, -hw, -hh, w, h, 0.65, 1.55);

      // Painted steel cabinet roof casing
      const doorT = Math.max(1.0, h * 0.16);
      drawBrushedMetal(ctx, -hw, -hh, w, h - doorT * 0.6, hex, 0.6, false);

      // Rear refrigeration compressor heat-exhaust vent grille (-hh)
      ctx.fillStyle = '#0f172a';
      const vW = w * 0.66;
      rr(ctx, -vW / 2, -hh + 0.55, vW, Math.max(1.1, h * 0.18), 0.3);
      ctx.fill();
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 0.3;
      for (let x = -vW / 2 + 0.7; x < vW / 2 - 0.4; x += 0.9) {
        ctx.beginPath();
        ctx.moveTo(x, -hh + 0.65);
        ctx.lineTo(x, -hh + 0.55 + Math.max(1.1, h * 0.18) - 0.1);
        ctx.stroke();
      }

      // Stamped roof structural ribs
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
      ctx.lineWidth = 0.45;
      ctx.beginPath();
      ctx.moveTo(-hw + 1.0, 0);
      ctx.lineTo(hw - 1.0, 0);
      ctx.stroke();

      // Thick illuminated front glass/marquee door bezel along +hh
      drawBrushedMetal(ctx, -hw, hh - doorT, w, doorT, '#1e293b', 0.35, false);
      // Warm luminous front glass strip (left 68%) + coin/keypad bezel (right 28%)
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(-hw + 0.6, hh - 0.38, w * 0.64, 0.35);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(hw - w * 0.24, hh - 0.38, w * 0.14, 0.32);
      return true;
    }

    // =========================================================================
    // 12. ATM MACHINE (Exact Top-Down Armored Hood, Recessed PIN Deck & Glow)
    // =========================================================================
    case 'atm': {
      const hex = f.color || '#059669';
      // Illuminated banking screen spill onto floor in front
      const gg = ctx.createLinearGradient(0, hh, 0, hh + Math.max(3.0, h * 0.65));
      gg.addColorStop(0, isNight ? 'rgba(56, 189, 248, 0.34)' : 'rgba(56, 189, 248, 0.14)');
      gg.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = gg;
      ctx.fillRect(-hw * 0.75, hh, w * 0.75, Math.max(3.0, h * 0.65));

      drawRectContactShadow(ctx, -hw, -hh, w, h, 0.6, 1.5);

      // Rear armored bank vault casing (top 68%)
      const deckH = Math.max(1.8, h * 0.32);
      drawBrushedMetal(ctx, -hw, -hh, w, h - deckH + 0.4, hex, 0.6, false);

      // Top illuminated topper accent stripe
      ctx.fillStyle = shade(hex, 0.42);
      ctx.fillRect(-hw + 0.8, -hh + h * 0.22, w - 1.6, Math.max(0.6, h * 0.09));

      // Protruding lower stainless PIN-pad & card-reader console shelf along +hh
      const deckY = hh - deckH;
      drawBrushedMetal(ctx, -hw + 0.35, deckY, w - 0.7, deckH, '#cbd5e1', 0.4, false);

      // Recessed tactile metallic PIN keypad on console deck
      const kpW = w * 0.42;
      const kpH = deckH * 0.66;
      ctx.fillStyle = '#475569';
      rr(ctx, -hw + 0.9, deckY + deckH * 0.18, kpW, kpH, 0.25);
      ctx.fill();
      ctx.fillStyle = '#f8fafc';
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 3; c++) {
          ctx.fillRect(-hw + 1.15 + c * (kpW * 0.3), deckY + deckH * 0.28 + r * (kpH * 0.42), kpW * 0.2, kpH * 0.28);
        }
      }

      // Glowing green anti-skimming card reader slot on right side of deck
      ctx.fillStyle = '#22c55e';
      rr(ctx, hw - w * 0.34, deckY + deckH * 0.28, w * 0.22, deckH * 0.42, 0.2);
      ctx.fill();

      // Anti-glare side privacy cheeks framing the console
      ctx.fillStyle = shade(hex, -0.22);
      ctx.fillRect(-hw, deckY, 0.55, deckH);
      ctx.fillRect(hw - 0.55, deckY, 0.55, deckH);
      return true;
    }

    // =========================================================================
    // 13. WATER COOLER (Exact Top-Down Square Deck + Centered 19L Water Carboy)
    // =========================================================================
    case 'cooler': {
      drawRectContactShadow(ctx, -hw, -hh, w, h, 0.8, 1.35);

      // Crisp white enamel square dispenser chassis top
      drawBrushedMetal(ctx, -hw, -hh, w, h, '#f1f5f9', 0.75, false);

      // Protruding front drip tray grate & hot/cold tap tabs along +hh
      const trayW = w * 0.62;
      const trayH = Math.max(0.75, h * 0.14);
      ctx.fillStyle = '#334155';
      rr(ctx, -trayW / 2, hh - trayH * 0.45, trayW, trayH, 0.3);
      ctx.fill();
      // Red hot & blue cold dispensing taps
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-trayW * 0.32, hh - trayH * 0.85, Math.max(0.7, w * 0.14), 0.55);
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(trayW * 0.32 - Math.max(0.7, w * 0.14), hh - trayH * 0.85, Math.max(0.7, w * 0.14), 0.55);

      // Centered translucent 19L polycarbonate sky-blue water carboy (exact top-down circle!)
      const jugR = Math.min(hw, hh) * 0.76;
      const jugY = -hh * 0.06;
      ctx.fillStyle = 'rgba(2, 132, 199, 0.22)';
      ctx.beginPath();
      ctx.arc(0.25, jugY + 0.3, jugR, 0, Math.PI * 2);
      ctx.fill();

      const jugG = ctx.createRadialGradient(-jugR * 0.3, jugY - jugR * 0.3, jugR * 0.08, 0, jugY, jugR);
      jugG.addColorStop(0, '#e0f2fe');
      jugG.addColorStop(0.45, '#38bdf8');
      jugG.addColorStop(0.85, '#0284c7');
      jugG.addColorStop(1, '#0369a1');
      ctx.fillStyle = jugG;
      ctx.beginPath();
      ctx.arc(0, jugY, jugR, 0, Math.PI * 2);
      ctx.fill();

      // Molded carboy concentric strength rings & bright water highlight bubble
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.48)';
      ctx.lineWidth = 0.38;
      ctx.beginPath();
      ctx.arc(0, jugY, jugR * 0.72, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
      ctx.beginPath();
      ctx.ellipse(-jugR * 0.28, jugY - jugR * 0.28, jugR * 0.26, jugR * 0.16, -0.65, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    // =========================================================================
    // 14. SUPERMARKET FREEZER DISPLAY (Exact Top-Down Sliding Glass Chest)
    // =========================================================================
    case 'freezer_display': {
      const hex = f.color || '#0284c7';
      drawRectContactShadow(ctx, -hw, -hh, w, h, 0.9, 1.15);

      // Insulated commercial perimeter bumper cabinet
      drawBrushedMetal(ctx, -hw, -hh, w, h, isLightColor(hex) ? '#cbd5e1' : hex, 0.8, false);

      // Recessed frost-white interior chest cavity
      const rim = Math.max(0.85, minD * 0.12);
      const inW = w - rim * 2;
      const inH = h - rim * 2;
      ctx.fillStyle = '#e0f2fe';
      rr(ctx, -hw + rim, -hh + rim, inW, inH, 0.45);
      ctx.fill();

      // Wire divider baskets & frozen food packages visible beneath the sliding glass
      const cols = Math.max(3, Math.round(inW / 4.2));
      const colW = inW / cols;
      const packCols = ['#ef4444', '#22c55e', '#f59e0b', '#3b82f6', '#ec4899', '#a855f7'];
      for (let i = 0; i < cols; i++) {
        const bx = -hw + rim + i * colW;
        ctx.strokeStyle = 'rgba(100, 116, 139, 0.45)';
        ctx.lineWidth = 0.35;
        ctx.strokeRect(bx, -hh + rim, colW, inH);

        // Two stacked frozen cartons per basket
        ctx.fillStyle = packCols[i % packCols.length];
        rr(ctx, bx + 0.45, -hh + rim + 0.45, colW - 0.9, inH * 0.42, 0.25);
        ctx.fill();
        ctx.fillStyle = packCols[(i + 3) % packCols.length];
        rr(ctx, bx + 0.45, -hh + rim + inH * 0.52, colW - 0.9, inH * 0.4, 0.25);
        ctx.fill();
      }

      // Twin frost-tinted tempered sliding glass panels over chest
      drawGlassPanel(ctx, -hw + rim, -hh + rim, inW, inH, '#bae6fd', 0.4, 0.32);

      // Center anodized aluminum sliding handle rail
      drawBrushedMetal(ctx, -0.45, -hh + rim, 0.9, inH, '#94a3b8', 0.2, true);
      return true;
    }

    // =========================================================================
    // 15. FREIGHT PALLET STACK (EUR/EPAL Timber Pallet + Strapped Crates)
    // =========================================================================
    case 'pallet_stack': {
      drawRectContactShadow(ctx, -hw, -hh, w, h, 0.5, 1.25);

      // Dark underside gaps & 9 structural wood spacer blocks
      ctx.fillStyle = '#3f220d';
      ctx.fillRect(-hw + 0.2, -hh + 0.2, w - 0.4, h - 0.4);

      // 5 Raw pine top deck planks with visible gaps & nail heads
      const boards = 5;
      const gap = Math.max(0.35, h * 0.045);
      const bH = (h - gap * (boards - 1)) / boards;
      for (let i = 0; i < boards; i++) {
        const by = -hh + i * (bH + gap);
        drawWoodSurface(ctx, -hw, by, w, bH, i % 2 === 0 ? '#c28344' : '#b47236', 0.2, true, 0);
        // Steel nail heads at left, center, right stringers
        ctx.fillStyle = '#1e293b';
        for (const nx of [-hw + 0.9, 0, hw - 0.9]) {
          ctx.beginPath();
          ctx.arc(nx, by + bH * 0.5, 0.22, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Strapped corrugated cardboard shipping boxes stacked neatly on pallet
      const box1W = w * 0.48;
      const box1H = h * 0.54;
      const drawCrate = (x: number, y: number, bw: number, bh: number, shadeShift: number) => {
        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        rr(ctx, x + 0.35, y + 0.4, bw, bh, 0.3);
        ctx.fill();
        const cg = ctx.createLinearGradient(x, y, x + bw, y + bh);
        cg.addColorStop(0, shade('#d99b52', shadeShift + 0.12));
        cg.addColorStop(1, shade('#a16228', shadeShift - 0.1));
        ctx.fillStyle = cg;
        rr(ctx, x, y, bw, bh, 0.28);
        ctx.fill();
        ctx.strokeStyle = '#6b3e14';
        ctx.lineWidth = 0.35;
        ctx.stroke();

        // Center kraft packing tape strip
        ctx.fillStyle = 'rgba(254, 240, 138, 0.45)';
        ctx.fillRect(x, y + bh * 0.42, bw, bh * 0.16);
        // White shipping barcode label
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(x + bw * 0.14, y + bh * 0.14, bw * 0.34, bh * 0.2);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(x + bw * 0.18, y + bh * 0.19, bw * 0.24, bh * 0.08);
      };

      drawCrate(-hw + 0.9, -hh + 0.9, box1W, box1H, 0.02);
      drawCrate(-hw + 1.2 + box1W, -hh + 1.1, w - box1W - 2.1, h * 0.42, -0.05);
      drawCrate(-hw + 1.4, -hh + 1.3 + box1H, w * 0.56, h - box1H - 2.2, 0.06);

      // Black polypropylene tension straps binding the pallet load
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 0.4;
      ctx.beginPath();
      ctx.moveTo(-hw + w * 0.28, -hh);
      ctx.lineTo(-hw + w * 0.28, hh);
      ctx.moveTo(hw - w * 0.28, -hh);
      ctx.lineTo(hw - w * 0.28, hh);
      ctx.stroke();
      return true;
    }

    // =========================================================================
    // 16. FIRE RACK / HOSE & EXTINGUISHER STATION (Exact Top-Down Plan)
    // =========================================================================
    case 'fire_rack': {
      const isHoriz = w >= h;
      drawRectContactShadow(ctx, -hw, -hh, w, h, 0.5, 1.1);

      ctx.save();
      if (!isHoriz) ctx.rotate(Math.PI / 2);
      const fw = isHoriz ? w : h;
      const fh = isHoriz ? h : w;
      const fhw = fw / 2;
      const fhh = fh / 2;

      // Safety-red enameled steel cabinet top casing
      drawBrushedMetal(ctx, -fhw, -fhh, fw, fh, '#dc2626', 0.45, false);

      // Yellow safety accent trim along front edge (+fhh)
      ctx.fillStyle = '#facc15';
      ctx.fillRect(-fhw + 0.5, fhh - 0.55, fw - 1.0, 0.45);

      // Top-down view of coiled fire hose reel drum (left) & CO2 extinguisher cylinder cap (right)
      const ins = Math.max(0.45, fh * 0.14);
      ctx.fillStyle = '#7f1d1d';
      rr(ctx, -fhw + ins, -fhh + ins, fw - ins * 2, fh - ins * 2 - 0.3, 0.25);
      ctx.fill();

      // Coiled fire hose spool seen from above (stacked concentric canvas wrap)
      const reelW = fw * 0.42;
      const reelH = fh - ins * 2 - 0.8;
      ctx.fillStyle = '#b91c1c';
      rr(ctx, -fhw + ins + 0.4, -reelH / 2 - 0.15, reelW, reelH, 0.4);
      ctx.fill();
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 0.38;
      ctx.stroke();
      // Brass center valve wheel
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.arc(-fhw + ins + 0.4 + reelW * 0.5, -0.15, Math.min(reelW, reelH) * 0.26, 0, Math.PI * 2);
      ctx.fill();

      // CO2 Extinguisher circular top shoulder + brass squeeze lever + black horn (right)
      const exX = fhw - ins - Math.max(1.4, fw * 0.22);
      const exR = Math.min(fh * 0.34, fw * 0.16);
      const exG = ctx.createRadialGradient(exX - exR * 0.3, -exR * 0.3, 0.1, exX, 0, exR);
      exG.addColorStop(0, '#f87171');
      exG.addColorStop(0.6, '#dc2626');
      exG.addColorStop(1, '#7f1d1d');
      ctx.fillStyle = exG;
      ctx.beginPath();
      ctx.arc(exX, -0.15, exR, 0, Math.PI * 2);
      ctx.fill();
      // Brass valve & black horn nozzle
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.arc(exX, -0.15, exR * 0.36, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(exX + exR * 0.15, -0.45, exR * 0.95, 0.55);
      ctx.restore();
      return true;
    }

    // =========================================================================
    // 17. BLACKBOARD (Wall-Mounted Chalkboard — Exact Top-Down Slim Rail & Tray)
    // =========================================================================
    case 'blackboard': {
      const isHoriz = w >= h;
      ctx.save();
      if (!isHoriz) ctx.rotate(Math.PI / 2);
      const bw = isHoriz ? w : h;
      const bh = isHoriz ? h : w;
      const bhw = bw / 2;
      const bhh = bh / 2;

      drawRectContactShadow(ctx, -bhw, -bhh, bw, bh, 0.3, 0.6);

      // Oak top frame rail along wall (-bhh)
      const railH = Math.max(0.85, bh * 0.44);
      drawWoodSurface(ctx, -bhw, -bhh, bw, railH, '#78350f', 0.25, true, 0);
      // Thin dark slate board bevel strip
      ctx.fillStyle = '#064e3b';
      ctx.fillRect(-bhw + 0.5, -bhh + railH, bw - 1.0, Math.max(0.45, bh * 0.2));

      // Protruding wooden chalk ledge along front (+bhh)
      const trayH = Math.max(0.75, bh * 0.36);
      drawWoodSurface(ctx, -bhw + 0.4, bhh - trayH, bw - 0.8, trayH, '#92400e', 0.2, true, 0);

      // Tiny white & yellow chalk sticks + wooden felt eraser sitting on ledge
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-bhw + bw * 0.16, bhh - trayH + 0.22, Math.min(2.0, bw * 0.1), trayH * 0.48);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(-bhw + bw * 0.32, bhh - trayH + 0.22, Math.min(1.6, bw * 0.08), trayH * 0.48);
      ctx.fillStyle = '#451a03';
      ctx.fillRect(bhw - bw * 0.25, bhh - trayH + 0.15, Math.min(2.6, bw * 0.13), trayH * 0.65);
      ctx.restore();
      return true;
    }

    // =========================================================================
    // 18. WHITEBOARD (Magnetic Dry-Erase Board — Exact Top-Down Rail & Tray)
    // =========================================================================
    case 'whiteboard': {
      const isHoriz = w >= h;
      ctx.save();
      if (!isHoriz) ctx.rotate(Math.PI / 2);
      const bw = isHoriz ? w : h;
      const bh = isHoriz ? h : w;
      const bhw = bw / 2;
      const bhh = bh / 2;

      drawRectContactShadow(ctx, -bhw, -bhh, bw, bh, 0.3, 0.6);

      // Anodized silver aluminum top frame profile
      const railH = Math.max(0.85, bh * 0.45);
      drawBrushedMetal(ctx, -bhw, -bhh, bw, railH, '#cbd5e1', 0.25, false);
      // Glossy ceramic white board top bevel
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-bhw + 0.4, -bhh + railH, bw - 0.8, Math.max(0.45, bh * 0.2));

      // Slim aluminum marker tray along front (+bhh)
      const trayH = Math.max(0.75, bh * 0.35);
      drawBrushedMetal(ctx, -bhw + 0.8, bhh - trayH, bw - 1.6, trayH, '#94a3b8', 0.2, false);

      // Black, blue & red dry-erase markers + magnetic eraser
      const mW = Math.min(2.0, bw * 0.11);
      const mH = trayH * 0.5;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-bhw + bw * 0.16, bhh - trayH + 0.2, mW, mH);
      ctx.fillStyle = '#2563eb';
      ctx.fillRect(-bhw + bw * 0.31, bhh - trayH + 0.2, mW, mH);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-bhw + bw * 0.46, bhh - trayH + 0.2, mW, mH);
      ctx.fillStyle = '#334155';
      ctx.fillRect(bhw - bw * 0.24, bhh - trayH + 0.14, Math.min(2.4, bw * 0.12), trayH * 0.68);
      ctx.restore();
      return true;
    }

    // =========================================================================
    // 19. TOY CHEST (Hinged Wooden Play Chest — Exact Top-Down Lid & Hardware)
    // =========================================================================
    case 'toy_chest': {
      const hex = f.color || '#d97706';
      drawRectContactShadow(ctx, -hw, -hh, w, h, 0.8, 1.15);

      // Solid hinged wooden lid top surface
      drawWoodSurface(ctx, -hw, -hh, w, h, hex, 0.75, true, 3);

      // Antique brass corner reinforcement brackets
      const brk = Math.max(1.1, minD * 0.18);
      ctx.fillStyle = '#eab308';
      ctx.fillRect(-hw, -hh, brk, brk * 0.5);
      ctx.fillRect(-hw, -hh, brk * 0.5, brk);
      ctx.fillRect(hw - brk, -hh, brk, brk * 0.5);
      ctx.fillRect(hw - brk * 0.5, -hh, brk * 0.5, brk);
      ctx.fillRect(-hw, hh - brk * 0.5, brk, brk * 0.5);
      ctx.fillRect(-hw, hh - brk, brk * 0.5, brk);
      ctx.fillRect(hw - brk, hh - brk * 0.5, brk, brk * 0.5);
      ctx.fillRect(hw - brk * 0.5, hh - brk, brk * 0.5, brk);

      // Twin rear brass strap hinges at -hh
      drawCabinetPull(ctx, -w * 0.32, -hh - 0.12, Math.max(1.2, w * 0.12), 0.5, '#d4af37');
      drawCabinetPull(ctx, w * 0.2, -hh - 0.12, Math.max(1.2, w * 0.12), 0.5, '#d4af37');

      // Front brass latch clasp at +hh
      drawCabinetPull(ctx, -Math.max(0.9, w * 0.08), hh - 0.15, Math.max(1.8, w * 0.16), 0.55, '#eab308');

      // Decorative painted toy blocks resting neatly on lid
      if (w >= 10) {
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-w * 0.18, -h * 0.16, 1.8, 1.8);
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(w * 0.06, -h * 0.1, 1.6, 1.6);
      }
      return true;
    }

    // =========================================================================
    // 20. TRASH CAN / WASTE BIN (Exact Top-Down Circular Bin with Liner & Paper)
    // =========================================================================
    case 'trash_can': {
      const r = Math.min(hw, hh);
      const hex = f.color || '#64748b';
      drawEllipseContactShadow(ctx, 0, 0, r * 0.96, r * 0.96, 1.0);

      // Brushed stainless / matte plastic outer rim ring
      const rimG = ctx.createRadialGradient(-r * 0.25, -r * 0.25, r * 0.2, 0, 0, r);
      rimG.addColorStop(0, shade(hex, 0.36));
      rimG.addColorStop(0.65, hex);
      rimG.addColorStop(1, shade(hex, -0.35));
      ctx.fillStyle = rimG;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();

      // Dark polyethylene trash bag liner interior cavity
      const inR = r * 0.78;
      const bagG = ctx.createRadialGradient(r * 0.1, r * 0.1, inR * 0.1, 0, 0, inR);
      bagG.addColorStop(0, '#020617');
      bagG.addColorStop(0.7, '#0f172a');
      bagG.addColorStop(1, '#1e293b');
      ctx.fillStyle = bagG;
      ctx.beginPath();
      ctx.arc(0, 0, inR, 0, Math.PI * 2);
      ctx.fill();

      // Subtle glossy plastic bag crease arcs
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
      ctx.lineWidth = 0.28;
      ctx.beginPath();
      ctx.arc(0, 0, inR * 0.85, -0.8, 0.9);
      ctx.stroke();

      // Crumpled paper balls inside bin
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.arc(-inR * 0.26, -inR * 0.12, inR * 0.34, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.arc(inR * 0.28, inR * 0.22, inR * 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(inR * 0.12, -inR * 0.3, inR * 0.2, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    // =========================================================================
    // 21. MAILBOX BANK (Orientation-Aware Exact Top-Down Wall Cluster Roof)
    // =========================================================================
    case 'mailbox_bank': {
      const isHoriz = w >= h;
      drawRectContactShadow(ctx, -hw, -hh, w, h, 0.45, 1.15);

      ctx.save();
      if (!isHoriz) ctx.rotate(Math.PI / 2);
      const mw = isHoriz ? w : h;
      const mh = isHoriz ? h : w;
      const mhw = mw / 2;
      const mhh = mh / 2;

      // Brushed steel apartment mailbox bank top roof
      drawBrushedMetal(ctx, -mhw, -mhh, mw, mh * 0.86, '#64748b', 0.4, false);

      // Front individual compartment door edges & tiny brass lock lips (+mhh)
      const cols = Math.max(3, Math.floor(mw / 3.4));
      const colW = mw / cols;
      const doorT = Math.max(0.65, mh * 0.16);
      for (let i = 0; i < cols; i++) {
        const cx = -mhw + i * colW;
        drawBrushedMetal(ctx, cx + 0.12, mhh - doorT, colW - 0.24, doorT, '#94a3b8', 0.15, false);
        // Divider seam across roof
        if (i > 0) {
          ctx.strokeStyle = 'rgba(15, 23, 42, 0.35)';
          ctx.lineWidth = 0.32;
          ctx.beginPath();
          ctx.moveTo(cx, -mhh + 0.3);
          ctx.lineTo(cx, mhh);
          ctx.stroke();
        }
        // Brass lock cylinder nub
        ctx.fillStyle = '#eab308';
        ctx.fillRect(cx + colW * 0.38, mhh - 0.22, colW * 0.24, 0.34);
      }
      ctx.restore();
      return true;
    }

    // =========================================================================
    // 22. RADIATOR (Sectional Central Heating Convector — Exact Top-Down Fins)
    // =========================================================================
    case 'radiator': {
      const isHoriz = w >= h;
      ctx.save();
      if (!isHoriz) ctx.rotate(Math.PI / 2);
      const rw = isHoriz ? w : h;
      const rh = isHoriz ? h : w;
      const rhw = rw / 2;
      const rhh = rh / 2;

      drawRectContactShadow(ctx, -rhw, -rhh, rw, rh, 0.4, 0.75);

      // Rear steel wall mounting brackets (-rhh)
      ctx.fillStyle = '#475569';
      ctx.fillRect(-rhw + rw * 0.16, -rhh - 0.35, 0.7, 0.55);
      ctx.fillRect(rhw - rw * 0.16 - 0.7, -rhh - 0.35, 0.7, 0.55);

      // Dark convector manifold channel beneath fins
      ctx.fillStyle = '#334155';
      rr(ctx, -rhw + 0.3, -rhh + rh * 0.2, rw - 0.6, rh * 0.6, 0.3);
      ctx.fill();

      // Gleaming white enameled bimetallic heating fin ribs
      const finCount = Math.max(5, Math.round(rw / 1.55));
      const finStep = (rw - 0.8) / finCount;
      const finW = Math.max(0.65, finStep * 0.62);
      for (let i = 0; i < finCount; i++) {
        const fx = -rhw + 0.4 + i * finStep;
        const fg = ctx.createLinearGradient(fx, -rhh, fx + finW, rhh);
        fg.addColorStop(0, '#ffffff');
        fg.addColorStop(0.55, '#f1f5f9');
        fg.addColorStop(1, '#94a3b8');
        ctx.fillStyle = fg;
        rr(ctx, fx, -rhh, finW, rh, finW * 0.38);
        ctx.fill();
      }

      // Copper supply pipe & red/white thermostatic control valve head on right end
      ctx.fillStyle = '#b45309';
      ctx.fillRect(rhw - 0.2, -0.35, 0.65, 0.7);
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(rhw + 0.55, 0, Math.max(0.55, rh * 0.24), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(rhw + 0.55, 0, Math.max(0.28, rh * 0.11), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return true;
    }

    // =========================================================================
    // 23. LOCKERS (Gym / School Steel Locker Bank — Exact Top-Down Segmented Roof)
    // =========================================================================
    case 'lockers': {
      const hex = f.color || '#0284c7';
      const isHoriz = w >= h;
      drawRectContactShadow(ctx, -hw, -hh, w, h, 0.5, 1.5);

      ctx.save();
      if (!isHoriz) ctx.rotate(Math.PI / 2);
      const lw = isHoriz ? w : h;
      const lh = isHoriz ? h : w;
      const lhw = lw / 2;
      const lhh = lh / 2;

      const units = Math.max(2, Math.round(lw / 5.2));
      const unitW = lw / units;
      const doorT = Math.max(0.75, lh * 0.14);

      for (let i = 0; i < units; i++) {
        const ux = -lhw + i * unitW;
        // Individual powder-coated steel locker roof cap
        drawBrushedMetal(ctx, ux + 0.1, -lhh, unitW - 0.2, lh - doorT * 0.5, hex, 0.3, false);

        // Stamped top air vent slits
        ctx.fillStyle = shade(hex, -0.5);
        ctx.fillRect(ux + unitW * 0.22, -lhh + lh * 0.24, unitW * 0.56, 0.35);
        ctx.fillRect(ux + unitW * 0.22, -lhh + lh * 0.4, unitW * 0.56, 0.35);

        // Front locker door thickness lip (+lhh) & padlock hasp
        drawBrushedMetal(ctx, ux + 0.15, lhh - doorT, unitW - 0.3, doorT, shade(hex, 0.12), 0.2, false);
        drawCabinetPull(ctx, ux + unitW * 0.38, lhh - 0.12, unitW * 0.24, 0.42, '#eab308');
      }
      ctx.restore();
      return true;
    }

    // =========================================================================
    // 24. LUXURY SHOWROOM CAR PODIUM (Exact Top-Down Turntable & Sports Coupe)
    // =========================================================================
    case 'car_podium': {
      const bodyHex = f.color || '#dc2626';

      // 1. Subtle floor ambient LED ring underglow
      const haloG = ctx.createRadialGradient(0, 0, minD * 0.32, 0, 0, Math.max(hw, hh) * 1.18);
      haloG.addColorStop(0, 'rgba(56, 189, 248, 0.24)');
      haloG.addColorStop(0.7, 'rgba(56, 189, 248, 0.08)');
      haloG.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = haloG;
      rr(ctx, -hw - 3, -hh - 3, w + 6, h + 6, 4);
      ctx.fill();

      drawRectContactShadow(ctx, -hw, -hh, w, h, 2.2, 1.5);

      // 2. Brushed obsidian showroom platform deck
      drawBrushedMetal(ctx, -hw, -hh, w, h, '#18181b', 2.0, false);
      // Glowing cyan perimeter LED strip
      rr(ctx, -hw + 0.9, -hh + 0.9, w - 1.8, h - 1.8, 1.5);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)';
      ctx.lineWidth = 0.7;
      ctx.stroke();

      // Concentric brushed-steel rotating turntable disc
      const discR = Math.min(hw, hh) * 0.84;
      const discG = ctx.createRadialGradient(-discR * 0.2, -discR * 0.2, discR * 0.1, 0, 0, discR);
      discG.addColorStop(0, '#27272a');
      discG.addColorStop(0.85, '#18181b');
      discG.addColorStop(1, '#09090b');
      ctx.fillStyle = discG;
      ctx.beginPath();
      ctx.arc(0, 0, discR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.22)';
      ctx.lineWidth = 0.65;
      ctx.stroke();

      // 4 Recessed warm showroom uplight pucks
      for (const [sx, sy] of [
        [-hw + 2.8, -hh + 2.8],
        [hw - 2.8, -hh + 2.8],
        [-hw + 2.8, hh - 2.8],
        [hw - 2.8, hh - 2.8],
      ]) {
        const spG = ctx.createRadialGradient(sx, sy, 0.2, sx, sy, 2.8);
        spG.addColorStop(0, '#fef9c3');
        spG.addColorStop(0.35, 'rgba(254, 240, 138, 0.35)');
        spG.addColorStop(1, 'rgba(254, 240, 138, 0)');
        ctx.fillStyle = spG;
        ctx.beginPath();
        ctx.arc(sx, sy, 2.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // 3. Exact Top-Down Sculpted Sports Coupe centered on turntable
      const carL = Math.min(w * 0.74, Math.max(22, h * 1.35));
      const carW = Math.min(h * 0.56, carL * 0.46);
      const cl = carL / 2;
      const cw = carW / 2;

      // Ground contact shadow beneath coupe
      drawEllipseContactShadow(ctx, 0, 0.3, cl * 1.02, cw * 1.02, 1.35);

      // 4 Wide low-profile Pirelli tires slightly peeking from wheel arches
      ctx.fillStyle = '#09090b';
      const tL = carL * 0.16;
      const tW = carW * 0.15;
      rr(ctx, -cl * 0.76, -cw - 0.35, tL, tW, 0.4);
      ctx.fill();
      rr(ctx, -cl * 0.76, cw - tW + 0.35, tL, tW, 0.4);
      ctx.fill();
      rr(ctx, cl * 0.42, -cw - 0.35, tL, tW, 0.4);
      ctx.fill();
      rr(ctx, cl * 0.42, cw - tW + 0.35, tL, tW, 0.4);
      ctx.fill();

      // Carbon fiber front splitter & rear diffuser
      ctx.fillStyle = '#0f172a';
      rr(ctx, -cl - 0.65, -cw * 0.78, 1.2, carW * 0.78, 0.4);
      ctx.fill();
      rr(ctx, cl - 0.55, -cw * 0.76, 1.1, carW * 0.76, 0.35);
      ctx.fill();

      // Aerodynamic metallic clearcoat coupe body silhouette
      const bodyG = ctx.createLinearGradient(-cl, -cw, cl, cw);
      bodyG.addColorStop(0, shade(bodyHex, 0.32));
      bodyG.addColorStop(0.35, bodyHex);
      bodyG.addColorStop(0.7, shade(bodyHex, -0.18));
      bodyG.addColorStop(1, shade(bodyHex, -0.38));
      ctx.fillStyle = bodyG;
      ctx.beginPath();
      ctx.moveTo(-cl, 0);
      ctx.bezierCurveTo(-cl, -cw * 0.85, -cl * 0.65, -cw * 1.02, -cl * 0.15, -cw * 0.96);
      ctx.bezierCurveTo(cl * 0.25, -cw * 0.94, cl * 0.72, -cw * 1.04, cl * 0.96, -cw * 0.82);
      ctx.quadraticCurveTo(cl, 0, cl * 0.96, cw * 0.82);
      ctx.bezierCurveTo(cl * 0.72, cw * 1.04, cl * 0.25, cw * 0.94, -cl * 0.15, cw * 0.96);
      ctx.bezierCurveTo(-cl * 0.65, cw * 1.02, -cl, cw * 0.85, -cl, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = shade(bodyHex, -0.45);
      ctx.lineWidth = 0.45;
      ctx.stroke();

      // Sculpted hood character creases & aerodynamic side mirrors
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.lineWidth = 0.4;
      ctx.beginPath();
      ctx.moveTo(-cl * 0.86, -cw * 0.38);
      ctx.lineTo(-cl * 0.25, -cw * 0.52);
      ctx.moveTo(-cl * 0.86, cw * 0.38);
      ctx.lineTo(-cl * 0.25, cw * 0.52);
      ctx.stroke();

      // Side mirrors
      ctx.fillStyle = bodyHex;
      ctx.beginPath();
      ctx.ellipse(-cl * 0.16, -cw * 1.06, 0.9, 0.5, -0.25, 0, Math.PI * 2);
      ctx.ellipse(-cl * 0.16, cw * 1.06, 0.9, 0.5, 0.25, 0, Math.PI * 2);
      ctx.fill();

      // Xenon LED headlights (front left & right) + subtle light bloom
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(-cl * 0.88, -cw * 0.58, 1.3, 0.65, -0.35, 0, Math.PI * 2);
      ctx.ellipse(-cl * 0.88, cw * 0.58, 1.3, 0.65, 0.35, 0, Math.PI * 2);
      ctx.fill();

      // Panoramic tinted glass canopy (windshield, roof glass, rear fastback window)
      const gX = -cl * 0.28;
      const gW = carL * 0.52;
      const gH = carW * 0.74;
      drawGlassPanel(ctx, gX, -gH / 2, gW, gH, '#090d16', gH * 0.28, 0.96);

      // Painted roof cap panel between windshield and rear fastback glass
      drawBrushedMetal(ctx, gX + gW * 0.32, -gH * 0.38, gW * 0.36, gH * 0.76, bodyHex, 0.8, false);

      // Full-width glowing crimson rear LED taillight bar & rear wing
      ctx.fillStyle = '#ef4444';
      rr(ctx, cl * 0.88, -cw * 0.68, 0.75, carW * 0.68, 0.3);
      ctx.fill();
      ctx.fillStyle = '#090d16';
      rr(ctx, cl * 0.78, -cw * 0.84, 0.9, carW * 0.84, 0.25);
      ctx.fill();

      // 4. Specification plaque stand on podium corner
      if (w >= 34) {
        const px = -hw + 2.8;
        const py = hh - 5.2;
        drawBrushedMetal(ctx, px, py, 6.4, 3.0, '#1e293b', 0.35, false);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(px + 0.6, py + 0.55, 2.8, 0.5);
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(px + 0.6, py + 1.35, 4.8, 0.38);
        ctx.fillRect(px + 0.6, py + 2.0, 3.4, 0.38);
      }
      return true;
    }

    default:
      return false;
  }
}
