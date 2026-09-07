import { InteriorFurniture } from './buildingInteriors';

/**
 * High-fidelity vector rendering for building interior furniture.
 * Realistic materials: polished wood grain, upholstered fabrics, brushed metals,
 * glass reflections, electronics, screen glows, and ambient contact occlusion.
 */

// Helper to draw beveled edges with light highlight and shadow
function drawBevelFrame(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  highlight = 'rgba(255,255,255,0.25)',
  shadow = 'rgba(0,0,0,0.3)',
  lineWidth = 1
) {
  ctx.save();
  ctx.lineWidth = lineWidth;
  // Top and left highlight
  ctx.strokeStyle = highlight;
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.stroke();

  // Bottom and right shadow
  ctx.strokeStyle = shadow;
  ctx.beginPath();
  ctx.moveTo(x + w, y);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.stroke();
  ctx.restore();
}

// Helper to draw fine wood grain lines across a surface
function drawWoodGrain(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  grainColor = 'rgba(0,0,0,0.12)',
  spacing = 3.5
) {
  ctx.save();
  ctx.strokeStyle = grainColor;
  ctx.lineWidth = 0.6;
  for (let ly = y + spacing; ly < y + h; ly += spacing) {
    ctx.beginPath();
    ctx.moveTo(x + 1, ly);
    ctx.lineTo(x + w - 1, ly);
    ctx.stroke();
  }
  ctx.restore();
}

export function renderInteriorFurniture(
  ctx: CanvasRenderingContext2D,
  f: InteriorFurniture,
  timeHour: number
) {
  // If a legacy toilet is encountered, do not render it
  if ((f.type as string) === 'toilet') {
    return;
  }

  const halfW = f.width / 2;
  const halfH = f.height / 2;

  switch (f.type) {
    // ==========================================
    // 1. BED (Master Double Bed)
    // ==========================================
    case 'bed': {
      // Wood frame / headboard base
      ctx.fillStyle = '#3e2213';
      ctx.fillRect(-halfW, -halfH, f.width, f.height);
      drawBevelFrame(ctx, -halfW, -halfH, f.width, f.height, 'rgba(255,255,255,0.2)', 'rgba(0,0,0,0.5)');

      // Headboard (top edge)
      ctx.fillStyle = '#271406';
      ctx.fillRect(-halfW, -halfH, f.width, 3.5);
      drawWoodGrain(ctx, -halfW, -halfH, f.width, 3.5, 'rgba(255,255,255,0.08)', 1.5);

      // Mattress base (white/cream lining)
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-halfW + 1.2, -halfH + 3.5, f.width - 2.4, f.height - 4.5);

      // Dual Pillows
      const pillowW = Math.max(5, (f.width - 6) / 2);
      const pillowH = Math.max(4, f.height * 0.22);
      ctx.fillStyle = '#ffffff';
      // Pillow 1
      ctx.fillRect(-halfW + 2, -halfH + 4.5, pillowW, pillowH);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(-halfW + 2 + pillowW * 0.2, -halfH + 4.5 + pillowH * 0.3, pillowW * 0.6, pillowH * 0.4);
      drawBevelFrame(ctx, -halfW + 2, -halfH + 4.5, pillowW, pillowH, 'rgba(255,255,255,0.8)', 'rgba(0,0,0,0.15)', 0.6);

      // Pillow 2
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(halfW - pillowW - 2, -halfH + 4.5, pillowW, pillowH);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(halfW - pillowW - 2 + pillowW * 0.2, -halfH + 4.5 + pillowH * 0.3, pillowW * 0.6, pillowH * 0.4);
      drawBevelFrame(ctx, halfW - pillowW - 2, -halfH + 4.5, pillowW, pillowH, 'rgba(255,255,255,0.8)', 'rgba(0,0,0,0.15)', 0.6);

      // Folded Duvet / Comforter
      const duvetY = -halfH + 4 + pillowH;
      const duvetH = f.height - (4 + pillowH) - 1;
      ctx.fillStyle = f.color || '#4f46e5';
      ctx.fillRect(-halfW + 1.2, duvetY, f.width - 2.4, duvetH);

      // Quilted stitching lines on duvet
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 0.6;
      for (let y = duvetY + 4; y < duvetY + duvetH - 2; y += 4) {
        ctx.beginPath();
        ctx.moveTo(-halfW + 2, y);
        ctx.lineTo(halfW - 2, y);
        ctx.stroke();
      }

      // Turn-down sheet fold at top of duvet
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(-halfW + 1.2, duvetY, f.width - 2.4, 2.5);
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(-halfW + 1.2, duvetY, f.width - 2.4, 2.5);

      // Decorative foot-runner / throw blanket
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(-halfW + 1.2, halfH - 5, f.width - 2.4, 4);
      break;
    }

    // ==========================================
    // 2. KIDS BED (Single Child Bed)
    // ==========================================
    case 'kids_bed': {
      // Solid light wood frame with guardrails
      ctx.fillStyle = '#b45309';
      ctx.fillRect(-halfW, -halfH, f.width, f.height);
      drawBevelFrame(ctx, -halfW, -halfH, f.width, f.height, 'rgba(255,255,255,0.25)', 'rgba(0,0,0,0.4)');

      // Headboard
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-halfW, -halfH, f.width, 3);

      // Mattress area
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-halfW + 1, -halfH + 3, f.width - 2, f.height - 4);

      // Single child pillow
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(-halfW + 2, -halfH + 4, f.width - 4, 4);
      drawBevelFrame(ctx, -halfW + 2, -halfH + 4, f.width - 4, 4, '#ffffff', 'rgba(0,0,0,0.1)');

      // Playful duvet
      const duvetY = -halfH + 9;
      const duvetH = f.height - 10;
      ctx.fillStyle = f.color || '#38bdf8';
      ctx.fillRect(-halfW + 1, duvetY, f.width - 2, duvetH);

      // Playful dot pattern on blanket
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      for (let px = -halfW + 4; px < halfW - 3; px += 5) {
        for (let py = duvetY + 3; py < duvetY + duvetH - 2; py += 5) {
          ctx.beginPath();
          ctx.arc(px, py, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Little plush teddy bear in corner!
      const bearX = halfW - 5;
      const bearY = -halfH + 6;
      ctx.fillStyle = '#92400e';
      ctx.beginPath();
      ctx.arc(bearX, bearY, 2, 0, Math.PI * 2); // head
      ctx.arc(bearX - 1.6, bearY - 1.6, 1, 0, Math.PI * 2); // ear L
      ctx.arc(bearX + 1.6, bearY - 1.6, 1, 0, Math.PI * 2); // ear R
      ctx.fill();
      break;
    }

    // ==========================================
    // 3. HOSPITAL BED
    // ==========================================
    case 'bed_hospital': {
      // Chrome tubular frame with 4 corner bumper discs
      ctx.fillStyle = '#64748b';
      ctx.fillRect(-halfW, -halfH, f.width, f.height);
      // Corner bumper rollers
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(-halfW, -halfH, 1.5, 0, Math.PI * 2);
      ctx.arc(halfW, -halfH, 1.5, 0, Math.PI * 2);
      ctx.arc(-halfW, halfH, 1.5, 0, Math.PI * 2);
      ctx.arc(halfW, halfH, 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Clinical hygienic mattress (white)
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-halfW + 1.2, -halfH + 1.5, f.width - 2.4, f.height - 3);

      // Pillow with antiseptic vinyl cover
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(-halfW + 2, -halfH + 2.5, f.width - 4, 4.5);
      drawBevelFrame(ctx, -halfW + 2, -halfH + 2.5, f.width - 4, 4.5, '#ffffff', '#cbd5e1');

      // Clinical cyan/mint sterile sheet
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(-halfW + 1.2, halfH - 12, f.width - 2.4, 11);
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(-halfW + 1.2, halfH - 12, f.width - 2.4, 2); // Fold crease

      // Patient clipboard holder at foot of bed
      ctx.fillStyle = '#b45309';
      ctx.fillRect(-3, halfH - 2, 6, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-2, halfH - 2, 4, 1.5);
      break;
    }

    // ==========================================
    // 4. JAIL COT (Detention Bunk)
    // ==========================================
    case 'jail_cot': {
      // Welded steel angle-iron frame with rivets
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-halfW, -halfH, f.width, f.height);
      drawBevelFrame(ctx, -halfW, -halfH, f.width, f.height, '#475569', '#0f172a');

      // Coarse canvas mattress
      ctx.fillStyle = '#a1a1aa';
      ctx.fillRect(-halfW + 1.2, -halfH + 1.2, f.width - 2.4, f.height - 2.4);

      // Thin flat prison pillow
      ctx.fillStyle = '#71717a';
      ctx.fillRect(-halfW + 2, -halfH + 2, f.width - 4, 3.5);

      // Heavy grey institutional wool blanket with charcoal stripe
      ctx.fillStyle = '#52525b';
      ctx.fillRect(-halfW + 1.2, -halfH + 6.5, f.width - 2.4, f.height - 7.5);
      ctx.fillStyle = '#27272a';
      ctx.fillRect(-halfW + 1.2, -halfH + 8, f.width - 2.4, 2);
      break;
    }

    // ==========================================
    // 5. EXAM TABLE (Doctor's Clinic Table)
    // ==========================================
    case 'exam_table': {
      // Chrome/enameled clinical pedestal
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(-halfW, -halfH, f.width, f.height);
      drawBevelFrame(ctx, -halfW, -halfH, f.width, f.height, '#ffffff', '#94a3b8');

      // Padded examination surface
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(-halfW + 1.2, -halfH + 1.2, f.width - 2.4, f.height - 2.4);

      // White sanitary paper roll & strip
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-halfW + 2.5, -halfH + 1.2, f.width - 5, f.height - 2.4);
      // Paper roll at the head
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-halfW + 2, -halfH + 1.2, 3, f.height - 2.4);

      // Perforation lines
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 0.5;
      ctx.setLineDash([1, 1]);
      ctx.beginPath();
      ctx.moveTo(halfW - 4, -halfH + 1.5);
      ctx.lineTo(halfW - 4, halfH - 1.5);
      ctx.stroke();
      ctx.setLineDash([]);
      break;
    }

    // ==========================================
    // 6. SOFA (Living Room & Waiting Couch)
    // ==========================================
    case 'sofa': {
      const sofaColor = f.color || '#334155';

      // Base body
      ctx.fillStyle = sofaColor;
      ctx.fillRect(-halfW, -halfH, f.width, f.height);
      drawBevelFrame(ctx, -halfW, -halfH, f.width, f.height, 'rgba(255,255,255,0.25)', 'rgba(0,0,0,0.35)');

      // Padded backrest (along top edge)
      const backH = Math.max(3, f.height * 0.28);
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(-halfW, -halfH, f.width, backH);

      // Tufting buttons on backrest
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      const tuftStep = Math.max(6, f.width / 4);
      for (let tx = -halfW + tuftStep / 2; tx < halfW; tx += tuftStep) {
        ctx.beginPath();
        ctx.arc(tx, -halfH + backH / 2, 1, 0, Math.PI * 2);
        ctx.fill();
      }

      // Dual Armrests (left and right)
      const armW = Math.max(2.5, f.width * 0.12);
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(-halfW, -halfH, armW, f.height);
      ctx.fillRect(halfW - armW, -halfH, armW, f.height);
      drawBevelFrame(ctx, -halfW, -halfH, armW, f.height, 'rgba(255,255,255,0.2)', 'rgba(0,0,0,0.25)');
      drawBevelFrame(ctx, halfW - armW, -halfH, armW, f.height, 'rgba(255,255,255,0.2)', 'rgba(0,0,0,0.25)');

      // Seat Cushions (divided in 2 or 3)
      const seatX = -halfW + armW;
      const seatW = f.width - armW * 2;
      const seatY = -halfH + backH;
      const seatH = f.height - backH;

      const numCushions = f.width > 24 ? 3 : 2;
      const cushionW = seatW / numCushions;
      for (let i = 0; i < numCushions; i++) {
        const cx = seatX + i * cushionW;
        ctx.fillStyle = sofaColor;
        ctx.fillRect(cx + 0.6, seatY + 0.6, cushionW - 1.2, seatH - 1.2);
        drawBevelFrame(ctx, cx + 0.6, seatY + 0.6, cushionW - 1.2, seatH - 1.2, 'rgba(255,255,255,0.22)', 'rgba(0,0,0,0.28)');
      }

      // Decorative accent throw pillows in corners
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(-halfW + armW + 0.8, seatY + 0.8, 3.5, 3.5);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(halfW - armW - 4.3, seatY + 0.8, 3.5, 3.5);
      break;
    }

    // ==========================================
    // 7. BENCH (Public Wooden/Steel Bench)
    // ==========================================
    case 'bench': {
      // Cast-iron / powder-coated metal frame supports
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-halfW, -halfH, 2.5, f.height);
      ctx.fillRect(halfW - 2.5, -halfH, 2.5, f.height);

      // Middle support if long
      if (f.width > 20) {
        ctx.fillRect(-1, -halfH, 2, f.height);
      }

      // Hardwood timber slats with realistic wood grain and spacing
      const slatColor = f.color || '#d97706';
      const slatH = 1.8;
      const gap = 1.0;
      for (let y = -halfH + 0.8; y < halfH - 1; y += slatH + gap) {
        ctx.fillStyle = slatColor;
        ctx.fillRect(-halfW + 1, y, f.width - 2, slatH);
        drawBevelFrame(ctx, -halfW + 1, y, f.width - 2, slatH, 'rgba(255,255,255,0.3)', 'rgba(0,0,0,0.4)', 0.5);

        // Fastener carriage bolts
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(-halfW + 1.5, y + 0.4, 0.9, 0.9);
        ctx.fillRect(halfW - 2.4, y + 0.4, 0.9, 0.9);
      }
      break;
    }

    // ==========================================
    // 8. CHAIR (Office & Dining Chair)
    // ==========================================
    case 'chair': {
      const chairColor = f.color || '#475569';

      // 5-star swivel wheel legs shadow beneath
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.2;
      for (let a = 0; a < 5; a++) {
        const rad = (a * Math.PI * 2) / 5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(rad) * halfW * 0.9, Math.sin(rad) * halfH * 0.9);
        ctx.stroke();
      }

      // Seat cushion with stitched border
      ctx.fillStyle = chairColor;
      ctx.beginPath();
      ctx.ellipse(0, 1, halfW * 0.8, halfH * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      drawBevelFrame(ctx, -halfW * 0.75, -halfH * 0.6, halfW * 1.5, halfH * 1.4, 'rgba(255,255,255,0.3)', 'rgba(0,0,0,0.4)');

      // Curved lumbar backrest
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.ellipse(0, -halfH * 0.6, halfW * 0.75, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = chairColor;
      ctx.beginPath();
      ctx.ellipse(0, -halfH * 0.6, halfW * 0.7, 1.6, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    // ==========================================
    // 9. TABLE (Dining & Conference Table)
    // ==========================================
    case 'table': {
      const tableColor = f.color || '#78350f';

      // Leg shadows beneath corners
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(-halfW + 1, -halfH + 1, 3, 3);
      ctx.fillRect(halfW - 4, -halfH + 1, 3, 3);
      ctx.fillRect(-halfW + 1, halfH - 4, 3, 3);
      ctx.fillRect(halfW - 4, halfH - 4, 3, 3);

      // Solid tabletop
      ctx.fillStyle = tableColor;
      ctx.fillRect(-halfW, -halfH, f.width, f.height);
      drawWoodGrain(ctx, -halfW, -halfH, f.width, f.height, 'rgba(0,0,0,0.15)', 3.5);
      drawBevelFrame(ctx, -halfW, -halfH, f.width, f.height, 'rgba(255,255,255,0.25)', 'rgba(0,0,0,0.45)');

      // Satin lacquer reflection stripe
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(-halfW + 3, -halfH + 2, f.width - 6, 2);

      // Center decorative runner or document folder
      if (f.width > 20 && f.height > 12) {
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(-halfW + 4, -1, f.width - 8, 2);
      }
      break;
    }

    // ==========================================
    // 10. KIDS TABLE (Play & Activity Table)
    // ==========================================
    case 'kids_table': {
      const kidColor = f.color || '#f59e0b';
      ctx.fillStyle = kidColor;
      ctx.beginPath();
      ctx.ellipse(0, 0, halfW, halfH, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Colored drawing sheet on table
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-halfW * 0.5, -halfH * 0.5, halfW, halfH);
      // Cute crayon doodles
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(-2, -1, 2, 0, Math.PI);
      ctx.stroke();
      ctx.strokeStyle = '#3b82f6';
      ctx.beginPath();
      ctx.moveTo(1, -2);
      ctx.lineTo(4, 1);
      ctx.stroke();

      // Pencil cup with colorful tips
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(halfW * 0.6, -halfH * 0.4, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(halfW * 0.6 - 1, -halfH * 0.4 - 1, 1, 1);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(halfW * 0.6, -halfH * 0.4 - 1, 1, 1);
      break;
    }

    // ==========================================
    // 11. DESK (Office & Study Desk)
    // ==========================================
    case 'desk': {
      const deskColor = f.color || '#451a03';

      // Desktop surface
      ctx.fillStyle = deskColor;
      ctx.fillRect(-halfW, -halfH, f.width, f.height);
      drawWoodGrain(ctx, -halfW, -halfH, f.width, f.height, 'rgba(255,255,255,0.06)', 3);
      drawBevelFrame(ctx, -halfW, -halfH, f.width, f.height, 'rgba(255,255,255,0.22)', 'rgba(0,0,0,0.5)');

      // Under-desk drawer pedestal indicator
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(halfW - 5, -halfH + 1, 4, f.height - 2);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(halfW - 3.5, 0, 1.5, 0.8); // Handle

      // Cable grommet pass-through hole
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(-halfW + 3, -halfH + 3, 1.2, 0, Math.PI * 2);
      ctx.fill();

      // Leather desk blotter / giant mousepad
      const padW = Math.min(f.width * 0.6, 20);
      const padH = Math.min(f.height * 0.65, 9);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-padW / 2, halfH - padH - 1, padW, padH);
      drawBevelFrame(ctx, -padW / 2, halfH - padH - 1, padW, padH, '#334155', '#0f172a', 0.5);

      // Sticky note or paper folder in corner
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(-halfW + 2, halfH - 4, 3, 3);
      break;
    }

    // ==========================================
    // 12. DESK RECEPTION (Reception Counter)
    // ==========================================
    case 'desk_reception': {
      // Base counter body
      ctx.fillStyle = f.color || '#1e293b';
      ctx.fillRect(-halfW, -halfH, f.width, f.height);

      // Elevated polished transaction ledge (top/front facing visitor)
      ctx.fillStyle = '#475569';
      ctx.fillRect(-halfW, -halfH, f.width, 3.5);
      drawBevelFrame(ctx, -halfW, -halfH, f.width, 3.5, '#94a3b8', '#0f172a');

      // LED kick-plate accent line along ledge
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(-halfW + 2, -halfH + 3.2, f.width - 4, 0.6);

      // Receptionist work plane (lower counter)
      ctx.fillStyle = '#334155';
      ctx.fillRect(-halfW + 1, -halfH + 4, f.width - 2, f.height - 5);

      // Visitor register book & brass bell
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-halfW + 4, -halfH + 5, 5, 4);
      ctx.fillStyle = '#ca8a04'; // Bell
      ctx.beginPath();
      ctx.arc(halfW - 5, -halfH + 6, 1.4, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    // ==========================================
    // 13. COUNTER (Commercial / Checkout Counter)
    // ==========================================
    case 'counter': {
      ctx.fillStyle = f.color || '#0284c7';
      ctx.fillRect(-halfW, -halfH, f.width, f.height);
      drawBevelFrame(ctx, -halfW, -halfH, f.width, f.height, 'rgba(255,255,255,0.3)', 'rgba(0,0,0,0.4)');

      // Stainless steel protective bumper edge
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(-halfW, -halfH, f.width, 1.5);
      ctx.fillRect(-halfW, halfH - 1.5, f.width, 1.5);

      // Conveyor belt or customer lane rubber strip
      if (f.height > 6) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-halfW + 2, -halfH + 2, f.width - 4, f.height - 4);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 0.5;
        for (let x = -halfW + 5; x < halfW - 4; x += 4) {
          ctx.beginPath();
          ctx.moveTo(x, -halfH + 2);
          ctx.lineTo(x, halfH - 2);
          ctx.stroke();
        }
      }
      break;
    }

    // ==========================================
    // 14. KITCHEN COUNTER (Sink + Cooktop Unit)
    // ==========================================
    case 'kitchen_counter': {
      // Stone/laminate countertop
      ctx.fillStyle = '#334155';
      ctx.fillRect(-halfW, -halfH, f.width, f.height);
      drawBevelFrame(ctx, -halfW, -halfH, f.width, f.height, '#64748b', '#0f172a');

      // Stainless steel dual-basin sink
      const sinkW = Math.min(10, f.width * 0.35);
      const sinkH = f.height - 3;
      const sinkX = -halfW + 2;
      const sinkY = -halfH + 1.5;

      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(sinkX, sinkY, sinkW, sinkH);
      drawBevelFrame(ctx, sinkX, sinkY, sinkW, sinkH, '#cbd5e1', '#475569');

      // Sink basin depth gradient
      ctx.fillStyle = '#64748b';
      ctx.fillRect(sinkX + 1, sinkY + 1, sinkW - 2, sinkH - 2);
      // Chrome faucet swivel
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(sinkX + sinkW / 2 - 0.6, sinkY, 1.2, 2.5);
      ctx.fillStyle = '#0284c7'; // Chrome drain plug
      ctx.beginPath();
      ctx.arc(sinkX + sinkW / 2, sinkY + sinkH / 2, 0.8, 0, Math.PI * 2);
      ctx.fill();

      // Ceramic induction cooktop with 2 burner rings
      const stoveX = halfW - 8;
      ctx.fillStyle = '#090d16';
      ctx.fillRect(stoveX, -halfH + 1.5, 6, f.height - 3);

      // Glowing induction rings
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.arc(stoveX + 3, -halfH + 3.5, 1.6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(stoveX + 3, halfH - 3.5, 1.4, 0, Math.PI * 2);
      ctx.stroke();

      // Wooden prep board in center
      if (f.width > 22) {
        ctx.fillStyle = '#b45309';
        ctx.fillRect(-2, -halfH + 2, 5, f.height - 4);
        drawBevelFrame(ctx, -2, -halfH + 2, 5, f.height - 4, '#d97706', '#78350f', 0.5);
      }
      break;
    }

    // ==========================================
    // 15. SINK (Bathroom & Utility Vanity)
    // ==========================================
    case 'sink': {
      // Vanity counter surround
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-halfW, -halfH, f.width, f.height);
      drawBevelFrame(ctx, -halfW, -halfH, f.width, f.height, '#f8fafc', '#94a3b8');

      // Glazed porcelain basin bowl
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(0, 0.8, halfW - 1.5, halfH - 1.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 0.6;
      ctx.stroke();

      // Basin inner depth shadow
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.ellipse(0, 1.2, halfW - 2.5, halfH - 2.8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Chrome mixer faucet with hot/cold dot markers
      ctx.fillStyle = '#64748b';
      ctx.fillRect(-0.8, -halfH + 0.8, 1.6, 2.2);
      ctx.fillStyle = '#ef4444'; // Red hot dot
      ctx.fillRect(-1.6, -halfH + 1, 0.6, 0.6);
      ctx.fillStyle = '#38bdf8'; // Blue cold dot
      ctx.fillRect(1.0, -halfH + 1, 0.6, 0.6);

      // Chrome drain strainer
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(0, 1.2, 0.8, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    // ==========================================
    // 16. BATH (Freestanding / Alcove Bathtub)
    // ==========================================
    case 'bath': {
      // Tub outer rim (acrylic/cast iron)
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(-halfW, -halfH, f.width, f.height);
      drawBevelFrame(ctx, -halfW, -halfH, f.width, f.height, '#ffffff', '#94a3b8', 1.2);

      // Inner roll-top bowl
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(-halfW + 1.8, -halfH + 1.8, f.width - 3.6, f.height - 3.6, 3);
      ctx.fill();

      // Sparkling clear water translucency
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.roundRect(-halfW + 2.5, -halfH + 2.5, f.width - 5, f.height - 5, 2.5);
      ctx.fill();

      // Water ripple highlight
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-halfW + 4, 0);
      ctx.lineTo(halfW - 4, 0);
      ctx.stroke();

      // Chrome mixer faucet and drain plug
      ctx.fillStyle = '#475569';
      ctx.fillRect(-halfW + 1, -1.2, 2.2, 2.4);
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(halfW - 4, 0, 1, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    // ==========================================
    // 17. FRIDGE (Refrigerator)
    // ==========================================
    case 'fridge': {
      const fridgeColor = f.color || '#f1f5f9';

      // Refrigerator body
      ctx.fillStyle = fridgeColor;
      ctx.fillRect(-halfW, -halfH, f.width, f.height);
      drawBevelFrame(ctx, -halfW, -halfH, f.width, f.height, '#ffffff', '#64748b');

      // Magnetic seal gasket groove
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 0.6;
      ctx.strokeRect(-halfW + 0.8, -halfH + 0.8, f.width - 1.6, f.height - 1.6);

      // Brushed aluminum door handle with cast shadow
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(halfW - 2.5, -halfH + 1.5, 1.8, f.height - 3);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(halfW - 2, -halfH + 1.5, 1.2, f.height - 3);
      drawBevelFrame(ctx, halfW - 2, -halfH + 1.5, 1.2, f.height - 3, '#ffffff', '#475569', 0.4);

      // Digital temperature display on door
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-halfW + 2, -halfH + 2, 3.5, 2);
      ctx.fillStyle = '#38bdf8'; // +4°C indicator LED
      ctx.fillRect(-halfW + 2.5, -halfH + 2.5, 1, 1);
      break;
    }

    // ==========================================
    // 18. WARDROBE (Double-Door Wardrobe)
    // ==========================================
    case 'wardrobe': {
      const woodColor = f.color || '#451a03';

      // Wood body
      ctx.fillStyle = woodColor;
      ctx.fillRect(-halfW, -halfH, f.width, f.height);
      drawWoodGrain(ctx, -halfW, -halfH, f.width, f.height, 'rgba(255,255,255,0.06)', 3);
      drawBevelFrame(ctx, -halfW, -halfH, f.width, f.height, 'rgba(255,255,255,0.25)', 'rgba(0,0,0,0.6)');

      // Top crown molding cornice
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(-halfW, -halfH, f.width, 2.5);

      // Center split gap between wardrobe doors
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(0, -halfH);
      ctx.lineTo(0, halfH);
      ctx.stroke();

      // Brass / Brushed Steel door handles
      ctx.fillStyle = '#ca8a04';
      ctx.fillRect(-1.5, -1, 1, 2.5);
      ctx.fillRect(0.5, -1, 1, 2.5);
      break;
    }

    // ==========================================
    // 19. NIGHTSTAND (Bedside Table)
    // ==========================================
    case 'nightstand': {
      const woodColor = f.color || '#78350f';

      // Wooden cabinet top
      ctx.fillStyle = woodColor;
      ctx.fillRect(-halfW, -halfH, f.width, f.height);
      drawBevelFrame(ctx, -halfW, -halfH, f.width, f.height, 'rgba(255,255,255,0.3)', 'rgba(0,0,0,0.5)');

      // Pull drawer seam and knob
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 0.6;
      ctx.strokeRect(-halfW + 0.8, -halfH + 0.8, f.width - 1.6, f.height - 1.6);

      // Night lamp or digital alarm clock
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-halfW + 1.2, -halfH + 1.2, 2.5, 2);
      ctx.fillStyle = '#22c55e'; // Green digital clock numbers
      ctx.fillRect(-halfW + 1.5, -halfH + 1.5, 1.8, 0.8);

      // Small brass drawer knob
      ctx.fillStyle = '#ca8a04';
      ctx.beginPath();
      ctx.arc(0, halfH - 1.5, 0.8, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    // ==========================================
    // 20. BOOKSHELF & SHELF (Loaded Shelving)
    // ==========================================
    case 'bookshelf':
    case 'shelf': {
      // Shelf timber or steel structure
      ctx.fillStyle = f.color || '#334155';
      ctx.fillRect(-halfW, -halfH, f.width, f.height);
      drawBevelFrame(ctx, -halfW, -halfH, f.width, f.height, 'rgba(255,255,255,0.2)', 'rgba(0,0,0,0.4)');

      // Rows of colorful book spines
      const bookColors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#e2e8f0'];
      const isWide = f.width >= f.height;

      if (isWide) {
        // Horizontal shelves with vertical book spines
        let curX = -halfW + 1.5;
        let cIdx = 0;
        while (curX < halfW - 2) {
          const bWidth = 1.2 + ((curX * 13) % 2.2);
          const bHeight = f.height - 2.5;
          ctx.fillStyle = bookColors[cIdx % bookColors.length];
          ctx.fillRect(curX, -halfH + 1.2, Math.min(bWidth, halfW - 1.5 - curX), bHeight);
          curX += bWidth + 0.4;
          cIdx++;
        }
      } else {
        // Vertical tall shelves with horizontal book stacks
        let curY = -halfH + 1.5;
        let cIdx = 0;
        while (curY < halfH - 2) {
          const bHeight = 1.5 + ((curY * 11) % 2.5);
          const bWidth = f.width - 2.5;
          ctx.fillStyle = bookColors[cIdx % bookColors.length];
          ctx.fillRect(-halfW + 1.2, curY, bWidth, Math.min(bHeight, halfH - 1.5 - curY));
          curY += bHeight + 0.6;
          cIdx++;
        }
      }
      break;
    }

    // ==========================================
    // 21. TV CABINET (Low Media Credenza)
    // ==========================================
    case 'tv_cabinet': {
      ctx.fillStyle = f.color || '#1e293b';
      ctx.fillRect(-halfW, -halfH, f.width, f.height);
      drawBevelFrame(ctx, -halfW, -halfH, f.width, f.height, '#475569', '#090d16');

      // Center open media bay
      const bayW = f.width * 0.5;
      ctx.fillStyle = '#090d16';
      ctx.fillRect(-bayW / 2, -halfH + 1, bayW, f.height - 2);

      // AV receiver with power LED and volume knob
      ctx.fillStyle = '#334155';
      ctx.fillRect(-bayW / 2 + 1, -halfH + 1.5, bayW - 2, f.height - 3);
      ctx.fillStyle = '#22c55e'; // Power LED
      ctx.fillRect(-bayW / 2 + 2, -halfH + 2, 0.8, 0.8);
      ctx.fillStyle = '#38bdf8'; // Blue display
      ctx.fillRect(-bayW / 2 + 4, -halfH + 2, bayW - 8, 1);
      break;
    }

    // ==========================================
    // 22. TV (OLED / LED Flat Screen)
    // ==========================================
    case 'tv': {
      // Pedestal stand
      ctx.fillStyle = '#475569';
      ctx.fillRect(-halfW * 0.35, halfH - 2, halfW * 0.7, 2);

      // Ultra-thin display panel frame
      ctx.fillStyle = '#090d16';
      ctx.fillRect(-halfW, -halfH, f.width, f.height);
      drawBevelFrame(ctx, -halfW, -halfH, f.width, f.height, '#334155', '#000000', 0.5);

      // Screen active glow or glossy specular reflection
      const isNight = timeHour >= 18 || timeHour < 6;
      if (isNight) {
        // Active night movie/broadcast glow
        const screenGrad = ctx.createLinearGradient(-halfW, 0, halfW, 0);
        screenGrad.addColorStop(0, '#06b6d4');
        screenGrad.addColorStop(0.5, '#3b82f6');
        screenGrad.addColorStop(1, '#8b5cf6');
        ctx.fillStyle = screenGrad;
        ctx.fillRect(-halfW + 0.8, -halfH + 0.5, f.width - 1.6, f.height - 1);
      } else {
        // Glossy dark screen with diagonal light sheen
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-halfW + 0.8, -halfH + 0.5, f.width - 1.6, f.height - 1);
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(-halfW + 2, -halfH + 0.5, f.width * 0.35, f.height - 1);
      }

      // Standby indicator LED on bottom right
      ctx.fillStyle = isNight ? '#22c55e' : '#ef4444';
      ctx.fillRect(halfW - 1.5, halfH - 1, 0.8, 0.6);
      break;
    }

    // ==========================================
    // 23. COMPUTER (PC Workstation Setup)
    // ==========================================
    case 'computer': {
      // Monitor stand base
      ctx.fillStyle = '#475569';
      ctx.fillRect(-2, halfH - 2.5, 4, 2);

      // Ultra-wide display panel
      ctx.fillStyle = '#020617';
      ctx.fillRect(-halfW, -halfH, f.width, 2.5);
      drawBevelFrame(ctx, -halfW, -halfH, f.width, 2.5, '#475569', '#000000', 0.5);

      // Active illuminated screen display
      const isNight = timeHour >= 19 || timeHour < 6;
      ctx.fillStyle = isNight ? '#0284c7' : '#38bdf8';
      ctx.fillRect(-halfW + 0.6, -halfH + 0.4, f.width - 1.2, 1.5);
      // Code/IDE editor multi-color lines on screen
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(-halfW + 1.2, -halfH + 0.7, 2, 0.5);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(-halfW + 3.8, -halfH + 0.7, 3, 0.5);

      // Keyboard
      if (f.height > 5) {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-halfW * 0.7, halfH - 4.5, halfW * 1.4, 2.5);
        // Key rows
        ctx.fillStyle = '#64748b';
        ctx.fillRect(-halfW * 0.6, halfH - 4.0, halfW * 1.2, 0.6);
        ctx.fillRect(-halfW * 0.6, halfH - 3.0, halfW * 1.2, 0.6);

        // Ergonomic mouse with LED wheel
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.ellipse(halfW * 0.8, halfH - 3.2, 1, 1.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(halfW * 0.8 - 0.3, halfH - 3.6, 0.6, 0.8);
      }
      break;
    }

    // ==========================================
    // 24. PLANT (Lush Indoor Potted Botanical)
    // ==========================================
    case 'plant': {
      const plantRadius = Math.min(halfW, halfH);

      // Ceramic / Terracotta planter pot rim
      ctx.fillStyle = '#9a3412';
      ctx.beginPath();
      ctx.arc(0, 0, plantRadius * 0.8, 0, Math.PI * 2);
      ctx.fill();
      drawBevelFrame(ctx, -plantRadius * 0.8, -plantRadius * 0.8, plantRadius * 1.6, plantRadius * 1.6, '#ea580c', '#431407');

      // Moist dark potting soil
      ctx.fillStyle = '#1c1917';
      ctx.beginPath();
      ctx.arc(0, 0, plantRadius * 0.65, 0, Math.PI * 2);
      ctx.fill();

      // Multi-tier layered botanical foliage leaves
      const leafColor1 = f.color || '#15803d';
      const leafColor2 = '#22c55e';
      const numLeaves = 6;

      for (let i = 0; i < numLeaves; i++) {
        const angle = (i * Math.PI * 2) / numLeaves;
        ctx.save();
        ctx.rotate(angle);
        ctx.fillStyle = i % 2 === 0 ? leafColor1 : leafColor2;
        ctx.beginPath();
        ctx.ellipse(plantRadius * 0.55, 0, plantRadius * 0.45, plantRadius * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();
        // Central leaf vein
        ctx.strokeStyle = '#14532d';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(plantRadius * 0.15, 0);
        ctx.lineTo(plantRadius * 0.95, 0);
        ctx.stroke();
        ctx.restore();
      }

      // Center young leaf sprout
      ctx.fillStyle = '#86efac';
      ctx.beginPath();
      ctx.arc(0, 0, 1.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    // ==========================================
    // 25. CARPET (Decorative Woven Area Rug)
    // ==========================================
    case 'carpet': {
      const carpetColor = f.color || '#991b1b';

      // Rug base
      ctx.fillStyle = carpetColor;
      ctx.fillRect(-halfW, -halfH, f.width, f.height);

      // Fringed tassels along left and right edges
      ctx.fillStyle = '#fef08a';
      for (let y = -halfH + 1; y < halfH - 1; y += 2) {
        ctx.fillRect(-halfW - 0.8, y, 0.8, 1);
        ctx.fillRect(halfW, y, 0.8, 1);
      }

      // Elegant double border frame
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1;
      ctx.strokeRect(-halfW + 2, -halfH + 2, f.width - 4, f.height - 4);
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 0.6;
      ctx.strokeRect(-halfW + 3.5, -halfH + 3.5, f.width - 7, f.height - 7);

      // Diamond medallion center pattern
      if (f.width > 16 && f.height > 16) {
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.moveTo(0, -halfH + 5);
        ctx.lineTo(halfW - 5, 0);
        ctx.lineTo(0, halfH - 5);
        ctx.lineTo(-halfW + 5, 0);
        ctx.closePath();
        ctx.stroke();
      }
      break;
    }

    // ==========================================
    // 26. COOLER (Office Bottled Water Dispenser)
    // ==========================================
    case 'cooler': {
      // Dispenser pedestal cabinet
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(-halfW, 0, f.width, halfH);
      drawBevelFrame(ctx, -halfW, 0, f.width, halfH, '#ffffff', '#cbd5e1');

      // Removable drip-tray grille
      ctx.fillStyle = '#334155';
      ctx.fillRect(-halfW + 1.5, halfH - 2, f.width - 3, 1.5);

      // Hot (red) & Cold (blue) dispensing levers
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-halfW + 2, halfH - 3.5, 1.5, 1.2);
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(halfW - 3.5, halfH - 3.5, 1.5, 1.2);

      // 19-Liter Clear Blue Polycarbonate Jug
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(0, -halfH * 0.4, halfW * 0.75, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Air bubble highlight inside water jug
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath();
      ctx.arc(-1, -halfH * 0.4 - 1, 1, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    // ==========================================
    // 27. VENDING MACHINE (Snack & Soda Machine)
    // ==========================================
    case 'vending_machine': {
      // Machine cabinet (bright red/orange/black)
      ctx.fillStyle = f.color || '#ea580c';
      ctx.fillRect(-halfW, -halfH, f.width, f.height);
      drawBevelFrame(ctx, -halfW, -halfH, f.width, f.height, 'rgba(255,255,255,0.3)', 'rgba(0,0,0,0.5)');

      // Top illuminated brand marquee banner
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(-halfW + 1.5, -halfH + 1.2, f.width - 3, 2.5);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-halfW + 3, -halfH + 2, f.width - 6, 1);

      // Front display glass window showing drink/snack spirals
      const winW = f.width * 0.65;
      const winH = f.height - 8;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-halfW + 1.5, -halfH + 4.5, winW, winH);

      // Shelves with cans/chips
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-halfW + 2.5, -halfH + 5.5, 2, 1.8);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(-halfW + 5.5, -halfH + 5.5, 2, 1.8);
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(-halfW + 2.5, -halfH + 8.5, 2, 1.8);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(-halfW + 5.5, -halfH + 8.5, 2, 1.8);

      // Glass reflection diagonal stripe
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(-halfW + 2, -halfH + 5, winW - 1, 1.5);

      // Right interface panel: digital screen, keypad, bill validator
      const panelX = -halfW + 1.5 + winW + 1;
      const panelW = f.width - winW - 3.5;
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(panelX, -halfH + 4.5, panelW, winH);

      // Green LED bill validator
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(panelX + 0.8, -halfH + 6, panelW - 1.6, 1);

      // Push-door item delivery hopper at bottom
      ctx.fillStyle = '#090d16';
      ctx.fillRect(-halfW + 1.5, halfH - 3, f.width - 3, 2.2);
      break;
    }

    // ==========================================
    // 28. FIRE RACK (Fire Hose & Extinguisher Station)
    // ==========================================
    case 'fire_rack': {
      // Safety red steel cabinet
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-halfW, -halfH, f.width, f.height);
      drawBevelFrame(ctx, -halfW, -halfH, f.width, f.height, '#f87171', '#991b1b', 1);

      // Yellow reflective chevron stripes
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(-halfW + 1, -halfH + 1, f.width - 2, 1.2);
      ctx.fillRect(-halfW + 1, halfH - 2.2, f.width - 2, 1.2);

      // Coiled canvas fire hose reel (circular)
      ctx.fillStyle = '#b91c1c';
      ctx.beginPath();
      ctx.arc(-halfW * 0.3, 0, Math.min(halfW * 0.45, halfH * 0.6), 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ca8a04'; // Brass hub
      ctx.lineWidth = 1;
      ctx.stroke();

      // Red CO2 Extinguisher cylinder with nozzle
      ctx.fillStyle = '#991b1b';
      ctx.fillRect(halfW * 0.35, -halfH * 0.5, 3, halfH);
      ctx.fillStyle = '#334155'; // Black nozzle & handle
      ctx.fillRect(halfW * 0.35 - 0.5, -halfH * 0.5 - 1.5, 4, 1.5);
      break;
    }

    // ==========================================
    // 29. BLACKBOARD (Chalkboard)
    // ==========================================
    case 'blackboard': {
      // Oak timber frame
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-halfW, -halfH, f.width, f.height);
      drawBevelFrame(ctx, -halfW, -halfH, f.width, f.height, '#b45309', '#451a03');

      // Deep matte slate green surface with chalk dust
      ctx.fillStyle = '#064e3b';
      ctx.fillRect(-halfW + 1.5, -halfH + 1.2, f.width - 3, f.height - 2.4);

      // Chalk sketches / math equations
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(-halfW + 4, 0);
      ctx.lineTo(-halfW + 8, 0);
      ctx.moveTo(-halfW + 6, -1.5);
      ctx.lineTo(-halfW + 6, 1.5); // Plus sign
      ctx.stroke();

      // Chalk tray along bottom with white/yellow chalk sticks
      ctx.fillStyle = '#92400e';
      ctx.fillRect(-halfW + 1, halfH - 1.2, f.width - 2, 1.2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-halfW + 3, halfH - 1, 2, 0.8);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(-halfW + 6, halfH - 1, 2, 0.8);
      break;
    }

    // ==========================================
    // 30. WHITEBOARD (Magnetic Dry-Erase Board)
    // ==========================================
    case 'whiteboard': {
      // Anodized aluminum frame
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-halfW, -halfH, f.width, f.height);
      drawBevelFrame(ctx, -halfW, -halfH, f.width, f.height, '#ffffff', '#94a3b8');

      // Ultra-clean glossy white board
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-halfW + 1.2, -halfH + 1.2, f.width - 2.4, f.height - 2.4);

      // Diagram sketches on whiteboard
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 0.6;
      ctx.strokeRect(-halfW + 4, -halfH + 3, 5, 3);
      ctx.strokeStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(-halfW + 10, -halfH + 4.5);
      ctx.lineTo(-halfW + 14, -halfH + 4.5);
      ctx.stroke();

      // Marker tray with 3 color markers & eraser
      ctx.fillStyle = '#64748b';
      ctx.fillRect(-halfW + 2, halfH - 1.4, f.width - 4, 1.2);
      ctx.fillStyle = '#0f172a'; // Black marker
      ctx.fillRect(-halfW + 3, halfH - 1.2, 2, 0.8);
      ctx.fillStyle = '#2563eb'; // Blue marker
      ctx.fillRect(-halfW + 5.5, halfH - 1.2, 2, 0.8);
      ctx.fillStyle = '#ef4444'; // Red marker
      ctx.fillRect(-halfW + 8, halfH - 1.2, 2, 0.8);
      break;
    }

    // ==========================================
    // 31. TOY CHEST (Wooden Play Chest)
    // ==========================================
    case 'toy_chest': {
      // Stained wooden chest
      ctx.fillStyle = f.color || '#d97706';
      ctx.fillRect(-halfW, -halfH, f.width, f.height);
      drawWoodGrain(ctx, -halfW, -halfH, f.width, f.height, 'rgba(0,0,0,0.15)', 2.5);
      drawBevelFrame(ctx, -halfW, -halfH, f.width, f.height, '#fde68a', '#78350f');

      // Heavy brass corner reinforcement brackets
      ctx.fillStyle = '#ca8a04';
      ctx.fillRect(-halfW, -halfH, 2.5, 2.5);
      ctx.fillRect(halfW - 2.5, -halfH, 2.5, 2.5);
      ctx.fillRect(-halfW, halfH - 2.5, 2.5, 2.5);
      ctx.fillRect(halfW - 2.5, halfH - 2.5, 2.5, 2.5);

      // Center latch lock
      ctx.fillStyle = '#a16207';
      ctx.fillRect(-1.5, halfH - 2, 3, 2);

      // Colorful toys slightly visible
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-halfW + 3, -halfH + 1.5, 2, 2);
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(halfW - 5, -halfH + 1.5, 2, 2);
      break;
    }

    // ==========================================
    // 32. TRASH CAN (Office / Public Bin)
    // ==========================================
    case 'trash_can': {
      const radius = Math.min(halfW, halfH);
      // Stainless steel / dark plastic outer rim
      ctx.fillStyle = f.color || '#475569';
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
      drawBevelFrame(ctx, -radius, -radius, radius * 2, radius * 2, '#94a3b8', '#0f172a');

      // Inner bag liner cavity
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.72, 0, Math.PI * 2);
      ctx.fill();

      // Crumpled paper balls inside
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-radius * 0.2, -radius * 0.1, radius * 0.25, 0, Math.PI * 2);
      ctx.arc(radius * 0.25, radius * 0.2, radius * 0.2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    // ==========================================
    // 33. MAILBOX BANK (Apartment Mail Lockboxes)
    // ==========================================
    case 'mailbox_bank': {
      // Steel locker assembly
      ctx.fillStyle = '#475569';
      ctx.fillRect(-halfW, -halfH, f.width, f.height);
      drawBevelFrame(ctx, -halfW, -halfH, f.width, f.height, '#94a3b8', '#1e293b');

      // Grid of individual mailboxes
      const numCols = Math.max(2, Math.floor(f.width / 5));
      const colW = (f.width - 2) / numCols;
      for (let i = 0; i < numCols; i++) {
        const mx = -halfW + 1 + i * colW;
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(mx, -halfH + 1, colW - 0.5, f.height - 2);

        // Brass mail drop slit
        ctx.fillStyle = '#ca8a04';
        ctx.fillRect(mx + 0.8, -halfH + 2.5, colW - 2.1, 0.8);

        // Keyhole
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(mx + colW / 2 - 0.4, halfH - 2.5, 0.8, 0.8);
      }
      break;
    }

    // ==========================================
    // 34. RADIATOR (Central Heating Convector)
    // ==========================================
    case 'radiator': {
      // Background shadow
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-halfW, -halfH, f.width, f.height);

      // Vertical heating radiator fins
      const isHoriz = f.width >= f.height;
      if (isHoriz) {
        const finW = 1.2;
        const gap = 1.0;
        for (let x = -halfW + 1; x < halfW - 1; x += finW + gap) {
          ctx.fillStyle = '#f1f5f9';
          ctx.fillRect(x, -halfH + 0.5, finW, f.height - 1);
          drawBevelFrame(ctx, x, -halfH + 0.5, finW, f.height - 1, '#ffffff', '#94a3b8', 0.4);
        }
        // Thermostat knob valve on side
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(halfW, 0, 1.4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const finH = 1.2;
        const gap = 1.0;
        for (let y = -halfH + 1; y < halfH - 1; y += finH + gap) {
          ctx.fillStyle = '#f1f5f9';
          ctx.fillRect(-halfW + 0.5, y, f.width - 1, finH);
          drawBevelFrame(ctx, -halfW + 0.5, y, f.width - 1, finH, '#ffffff', '#94a3b8', 0.4);
        }
        // Thermostat valve
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(0, halfH, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    // ==========================================
    // 35. ATM (Bank ATM Machine)
    // ==========================================
    case 'atm': {
      // ATM Housing (Bank Green or Deep Blue)
      ctx.fillStyle = f.color || '#0284c7';
      ctx.fillRect(-halfW, -halfH, f.width, f.height);
      drawBevelFrame(ctx, -halfW, -halfH, f.width, f.height, '#38bdf8', '#0f172a');

      // Top bank topper illuminated logo
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-halfW + 1.2, -halfH + 1, f.width - 2.4, 2);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(-halfW + 2, -halfH + 1.5, f.width - 4, 1);

      // Banking touch display
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(-halfW + 1.5, -halfH + 3.5, f.width - 3, 3);
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(-halfW + 2, -halfH + 4, f.width - 4, 2);

      // Anti-skimming card reader slot with flashing green LED
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(-halfW + 2, halfH - 4.5, 4, 1.2);

      // Tactile metallic PIN keypad
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(halfW - 5, halfH - 4.5, 3.5, 2.5);

      // Cash dispense shutter slot
      ctx.fillStyle = '#090d16';
      ctx.fillRect(-halfW + 2, halfH - 2, f.width - 4, 1.2);
      break;
    }

    // ==========================================
    // 36. CASH REGISTER (POS Checkout Terminal)
    // ==========================================
    case 'cash_register': {
      // Heavy metal cash drawer base
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-halfW, -halfH, f.width, f.height);
      drawBevelFrame(ctx, -halfW, -halfH, f.width, f.height, '#475569', '#000000');

      // Touchscreen POS monitor displaying order
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(-halfW + 1, -halfH + 1, f.width - 2, 2.2);
      ctx.fillStyle = '#020617';
      ctx.fillRect(-halfW + 1.5, -halfH + 1.3, f.width - 3, 1.6);
      ctx.fillStyle = '#86efac'; // Total amount
      ctx.fillRect(-halfW + 2, -halfH + 1.7, f.width - 4, 0.8);

      // Compact receipt paper roll & tear slit
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(halfW - 3.5, halfH - 2.5, 2.5, 1.5);

      // Key lock on front drawer
      ctx.fillStyle = '#ca8a04';
      ctx.fillRect(-0.5, halfH - 1, 1, 0.8);
      break;
    }

    // ==========================================
    // 37. FREEZER DISPLAY (Supermarket Island Freezer)
    // ==========================================
    case 'freezer_display': {
      // Insulated white/cyan steel cabinet
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(-halfW, -halfH, f.width, f.height);
      drawBevelFrame(ctx, -halfW, -halfH, f.width, f.height, '#38bdf8', '#0369a1');

      // Frost-tempered sliding glass top panels
      ctx.fillStyle = 'rgba(224,242,254,0.45)';
      ctx.fillRect(-halfW + 1.5, -halfH + 1.5, f.width - 3, f.height - 3);

      // Frozen food packages visible inside
      ctx.fillStyle = '#ef4444'; // Frozen meat/berries
      ctx.fillRect(-halfW + 3, -halfH + 3, 3.5, 2.5);
      ctx.fillStyle = '#22c55e'; // Peas/greens
      ctx.fillRect(halfW - 6.5, -halfH + 3, 3.5, 2.5);
      ctx.fillStyle = '#f59e0b'; // Pastries/ice cream
      ctx.fillRect(-halfW + 3, halfH - 5.5, 3.5, 2.5);

      // Diagonal glass glare / reflection
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-halfW + 2, halfH - 2);
      ctx.lineTo(halfW - 2, -halfH + 2);
      ctx.stroke();

      // Sliding glass handle rails in center
      ctx.fillStyle = '#64748b';
      ctx.fillRect(-0.8, -halfH + 1.5, 1.6, f.height - 3);
      break;
    }

    // ==========================================
    // 38. PALLET STACK (EUR / EPAL Freight Pallets)
    // ==========================================
    case 'pallet_stack': {
      // Raw pine timber base
      ctx.fillStyle = '#b45309';
      ctx.fillRect(-halfW, -halfH, f.width, f.height);
      drawWoodGrain(ctx, -halfW, -halfH, f.width, f.height, 'rgba(0,0,0,0.2)', 3);
      drawBevelFrame(ctx, -halfW, -halfH, f.width, f.height, '#d97706', '#78350f');

      // 5 top deck boards with gaps
      const boardCount = 5;
      const boardH = (f.height - 4) / boardCount;
      for (let i = 0; i < boardCount; i++) {
        const by = -halfH + 2 + i * boardH;
        ctx.fillStyle = i % 2 === 0 ? '#b45309' : '#92400e';
        ctx.fillRect(-halfW + 1, by, f.width - 2, boardH - 0.8);

        // Nail fastener heads
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-halfW + 2, by + 0.4, 0.6, 0.6);
        ctx.fillRect(halfW - 2.6, by + 0.4, 0.6, 0.6);
      }

      // EPAL oval stamp marking on spacer block
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 0.6;
      ctx.strokeRect(halfW - 5, -halfH + 2, 4, 2);
      break;
    }

    // ==========================================
    // 39. FILE CABINET (Metal Document Drawers)
    // ==========================================
    case 'file_cabinet': {
      ctx.fillStyle = f.color || '#475569';
      ctx.fillRect(-halfW, -halfH, f.width, f.height);
      drawBevelFrame(ctx, -halfW, -halfH, f.width, f.height, '#94a3b8', '#1e293b');

      // Drawer division line
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-halfW, 0);
      ctx.lineTo(halfW, 0);
      ctx.stroke();

      // Chrome pull handles
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-2, -halfH + 2, 4, 1.2);
      ctx.fillRect(-2, halfH - 3.2, 4, 1.2);

      // Paper label card holders
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-2.5, -halfH + 3.8, 5, 1);
      ctx.fillRect(-2.5, halfH - 1.4, 5, 1);
      break;
    }

    // ==========================================
    // 40. SERVER RACK (IT 42U Data Center Rack)
    // ==========================================
    case 'server_rack': {
      // Heavy 19" rack enclosure
      ctx.fillStyle = '#020617';
      ctx.fillRect(-halfW, -halfH, f.width, f.height);
      drawBevelFrame(ctx, -halfW, -halfH, f.width, f.height, '#334155', '#000000');

      // Hexagonal ventilation mesh door / dark glass
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-halfW + 1.2, -halfH + 1.2, f.width - 2.4, f.height - 2.4);

      // 1U/2U server blade units stacked with status LEDs
      for (let y = -halfH + 2; y < halfH - 2; y += 3) {
        // Blinking network LEDs
        ctx.fillStyle = '#22c55e'; // Green Link
        ctx.fillRect(-halfW + 2, y, 1.2, 1.2);
        ctx.fillStyle = '#38bdf8'; // Blue Activity
        ctx.fillRect(-halfW + 3.6, y, 1.2, 1.2);
        ctx.fillStyle = '#f59e0b'; // Amber Storage
        ctx.fillRect(-halfW + 5.2, y, 1.2, 1.2);

        // Server chassis faceplate / ventilation grille
        ctx.fillStyle = '#334155';
        ctx.fillRect(-halfW + 7.5, y, f.width - 9.5, 1.2);
      }
      break;
    }

    // ==========================================
    // 41. LOCKERS (High School / Gym Steel Lockers)
    // ==========================================
    case 'lockers': {
      ctx.fillStyle = f.color || '#0284c7';
      ctx.fillRect(-halfW, -halfH, f.width, f.height);
      drawBevelFrame(ctx, -halfW, -halfH, f.width, f.height, '#38bdf8', '#0f172a');

      // Individual locker vertical door segments
      const lockerW = 6;
      for (let x = -halfW; x < halfW; x += lockerW) {
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(x, -halfH, lockerW, f.height);

        // Ventilation louvers
        ctx.fillStyle = '#090d16';
        ctx.fillRect(x + 1.5, -halfH + 2, lockerW - 3, 0.6);
        ctx.fillRect(x + 1.5, -halfH + 3.2, lockerW - 3, 0.6);

        // Number plate
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(x + lockerW / 2 - 1.2, -halfH + 5, 2.4, 1.2);

        // Padlock latch
        ctx.fillStyle = '#ca8a04';
        ctx.beginPath();
        ctx.arc(x + lockerW / 2, 0, 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    // ==========================================
    // DEFAULT FALLBACK
    // ==========================================
    default: {
      ctx.fillStyle = f.color || '#64748b';
      ctx.fillRect(-halfW, -halfH, f.width, f.height);
      drawBevelFrame(ctx, -halfW, -halfH, f.width, f.height, 'rgba(255,255,255,0.2)', 'rgba(0,0,0,0.3)');
      break;
    }
  }
}
