// High-Detail Procedural 2.5D Studio Canvas Models for All Tools
// Redrawn from scratch with consistent top-left studio lighting, metallic gradients,
// surface micro-textures, bevels, and physical material realism.

import {
  drawShadow,
  drawGlossBand,
  drawLitSphere,
  drawLitEllipse,
  drawOrganicBlobPath,
  adjustHex,
  hexToRgba,
  hash01
} from './itemGraphicShared';

/**
 * Draws a knurled metallic band (diagonal cross-hatch diamond knurling).
 */
function drawKnurling(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  step: number = 1.15,
  darkAlpha: number = 0.42,
  lightAlpha: number = 0.16
) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  ctx.lineWidth = 0.34;
  ctx.strokeStyle = `rgba(2, 6, 23, ${darkAlpha})`;
  ctx.beginPath();
  for (let kx = x - h; kx < x + w + h; kx += step) {
    ctx.moveTo(kx, y);
    ctx.lineTo(kx + h, y + h);
    ctx.moveTo(kx + h, y);
    ctx.lineTo(kx, y + h);
  }
  ctx.stroke();

  ctx.lineWidth = 0.22;
  ctx.strokeStyle = `rgba(255, 255, 255, ${lightAlpha})`;
  ctx.beginPath();
  for (let kx = x - h + 0.22; kx < x + w + h; kx += step) {
    ctx.moveTo(kx, y);
    ctx.lineTo(kx + h, y + h);
  }
  ctx.stroke();
  ctx.restore();
}

export function drawToolRedrawItem(
  ctx: CanvasRenderingContext2D,
  itemId: string,
  _item?: any
): boolean {
  switch (itemId) {
    // =========================================================================
    // 1. VEHICLE REPAIR TOOLBOX (Набор инструментов / Чемодан механика)
    // =========================================================================
    case 'repair_kit': {
      drawShadow(ctx, 9.6, 3.0, 8.2, 0.34);

      // Top molded steel carry handle with textured rubberized center grip
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.45;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-4.4, -4.8);
      ctx.lineTo(-4.0, -7.8);
      ctx.lineTo(4.0, -7.8);
      ctx.lineTo(4.4, -4.8);
      ctx.stroke();

      // Handle brackets riveted onto lid
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(-5.1, -5.8, 1.5, 1.2);
      ctx.fillRect(3.6, -5.8, 1.5, 1.2);

      // Rubber ergonomic center grip sleeve
      const gripGrad = ctx.createLinearGradient(0, -8.8, 0, -6.8);
      gripGrad.addColorStop(0.0, '#475569');
      gripGrad.addColorStop(0.4, '#1e293b');
      gripGrad.addColorStop(1.0, '#09090b');
      ctx.fillStyle = gripGrad;
      ctx.beginPath();
      ctx.roundRect(-3.0, -8.7, 6.0, 1.9, 0.75);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.22)';
      ctx.lineWidth = 0.25;
      for (let gx = -2.0; gx <= 2.0; gx += 1.0) {
        ctx.beginPath();
        ctx.moveTo(gx, -8.5);
        ctx.lineTo(gx, -7.0);
        ctx.stroke();
      }

      // Main crimson powder-coated steel lower body
      const bodyGrad = ctx.createLinearGradient(-9.0, -3.5, 9.0, 7.6);
      bodyGrad.addColorStop(0.0, '#ef4444');
      bodyGrad.addColorStop(0.22, '#dc2626');
      bodyGrad.addColorStop(0.65, '#b91c1c');
      bodyGrad.addColorStop(1.0, '#7f1d1d');
      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.roundRect(-8.8, -3.5, 17.6, 11.2, 1.3);
      ctx.fill();

      // Subtle vertical specular studio highlight on steel wall
      const sheenGrad = ctx.createLinearGradient(-8.8, 0, 8.8, 0);
      sheenGrad.addColorStop(0.0, 'rgba(15,23,42,0.25)');
      sheenGrad.addColorStop(0.16, 'rgba(255,255,255,0.24)');
      sheenGrad.addColorStop(0.32, 'rgba(255,255,255,0.03)');
      sheenGrad.addColorStop(0.85, 'rgba(15,23,42,0.18)');
      sheenGrad.addColorStop(1.0, 'rgba(15,23,42,0.34)');
      ctx.fillStyle = sheenGrad;
      ctx.beginPath();
      ctx.roundRect(-8.8, -3.5, 17.6, 11.2, 1.3);
      ctx.fill();

      // Stamped horizontal structural ribs along lower panel
      for (const ry of [4.2, 5.8]) {
        ctx.fillStyle = 'rgba(69, 10, 10, 0.48)';
        ctx.fillRect(-7.4, ry, 14.8, 0.55);
        ctx.fillStyle = 'rgba(254, 202, 202, 0.35)';
        ctx.fillRect(-7.4, ry - 0.3, 14.8, 0.3);
      }

      // Dark rubber corner bumper guards at bottom corners
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.roundRect(-9.1, 5.2, 2.0, 2.7, 0.6);
      ctx.roundRect(7.1, 5.2, 2.0, 2.7, 0.6);
      ctx.fill();

      // Overhanging beveled steel top lid with dark seam shadow
      ctx.fillStyle = 'rgba(15, 23, 42, 0.48)';
      ctx.fillRect(-9.0, -2.1, 18.0, 0.8);

      const lidGrad = ctx.createLinearGradient(0, -5.6, 0, -2.0);
      lidGrad.addColorStop(0.0, '#f87171');
      lidGrad.addColorStop(0.32, '#ef4444');
      lidGrad.addColorStop(0.8, '#b91c1c');
      lidGrad.addColorStop(1.0, '#991b1b');
      ctx.fillStyle = lidGrad;
      ctx.beginPath();
      ctx.roundRect(-9.2, -5.5, 18.4, 3.6, [1.2, 1.2, 0.4, 0.4]);
      ctx.fill();

      // Crisp specular chamfer highlight along top lid edge
      ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
      ctx.fillRect(-8.6, -5.25, 17.2, 0.42);

      // Twin brushed-chrome steel draw latches with rivets & recessed shadow
      for (const lx of [-5.8, 3.8]) {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
        ctx.beginPath();
        ctx.roundRect(lx + 0.25, -4.3, 2.1, 4.4, 0.35);
        ctx.fill();

        const lGrad = ctx.createLinearGradient(lx, 0, lx + 2.0, 0);
        lGrad.addColorStop(0.0, '#94a3b8');
        lGrad.addColorStop(0.35, '#f8fafc');
        lGrad.addColorStop(0.7, '#cbd5e1');
        lGrad.addColorStop(1.0, '#64748b');
        ctx.fillStyle = lGrad;
        ctx.beginPath();
        ctx.roundRect(lx, -4.4, 2.0, 4.1, 0.35);
        ctx.fill();
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 0.25;
        ctx.stroke();

        // Latch clasp bar & twin steel rivets
        ctx.fillStyle = '#475569';
        ctx.fillRect(lx + 0.25, -2.6, 1.5, 0.6);
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.arc(lx + 1.0, -3.6, 0.26, 0, Math.PI * 2);
        ctx.arc(lx + 1.0, -1.0, 0.26, 0, Math.PI * 2);
        ctx.fill();
      }

      // Riveted dark anodized aluminum nameplate badge with embossed chrome spanner
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(-4.0, -0.4, 8.0, 3.8, 0.6);
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 0.32;
      ctx.stroke();

      // Embossed open-end wrench icon inside badge
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 0.85;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-1.8, 1.5);
      ctx.lineTo(1.8, 1.5);
      ctx.stroke();
      ctx.lineWidth = 0.65;
      ctx.beginPath();
      ctx.arc(-2.1, 1.5, 0.85, Math.PI * 0.32, Math.PI * 1.68);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(2.1, 1.5, 0.85, -Math.PI * 0.68, Math.PI * 0.68);
      ctx.stroke();

      // Corner rivets on badge
      ctx.fillStyle = '#94a3b8';
      for (const [rx, ry] of [[-3.4, 0.15], [3.4, 0.15], [-3.4, 2.85], [3.4, 2.85]]) {
        ctx.beginPath();
        ctx.arc(rx, ry, 0.22, 0, Math.PI * 2);
        ctx.fill();
      }
      return true;
    }

    // =========================================================================
    // 2. LED FLASHLIGHT (Светодиодный фонарь)
    // =========================================================================
    case 'flashlight': {
      drawShadow(ctx, 8.6, 2.5, 7.6, 0.26);

      ctx.save();
      ctx.rotate(-0.24);

      // Soft warm-white volumetric light beam cone ahead of lens
      const beamGrad = ctx.createLinearGradient(7.2, 0, 13.0, 0);
      beamGrad.addColorStop(0.0, 'rgba(254, 240, 138, 0.52)');
      beamGrad.addColorStop(0.5, 'rgba(254, 249, 195, 0.20)');
      beamGrad.addColorStop(1.0, 'rgba(254, 249, 195, 0.0)');
      ctx.fillStyle = beamGrad;
      ctx.beginPath();
      ctx.moveTo(7.4, -3.8);
      ctx.lineTo(12.6, -6.6);
      ctx.lineTo(12.6, 6.6);
      ctx.lineTo(7.4, 3.8);
      ctx.closePath();
      ctx.fill();

      // Rear steel lanyard loop
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.arc(-9.4, 0, 1.15, Math.PI * 0.5, Math.PI * 1.5);
      ctx.stroke();

      // Tailcap with rubber clicky end button
      const tailGrad = ctx.createLinearGradient(0, -2.5, 0, 2.5);
      tailGrad.addColorStop(0.0, '#71717a');
      tailGrad.addColorStop(0.32, '#3f3f46');
      tailGrad.addColorStop(0.75, '#18181b');
      tailGrad.addColorStop(1.0, '#27272a');
      ctx.fillStyle = tailGrad;
      ctx.beginPath();
      ctx.roundRect(-9.0, -2.4, 2.0, 4.8, 0.5);
      ctx.fill();

      // Anodized gunmetal cylindrical aluminum barrel
      const barGrad = ctx.createLinearGradient(0, -2.25, 0, 2.25);
      barGrad.addColorStop(0.0, '#52525b');
      barGrad.addColorStop(0.22, '#a1a1aa');
      barGrad.addColorStop(0.42, '#3f3f46');
      barGrad.addColorStop(0.82, '#18181b');
      barGrad.addColorStop(1.0, '#27272a');
      ctx.fillStyle = barGrad;
      ctx.beginPath();
      ctx.roundRect(-7.2, -2.2, 9.8, 4.4, 0.45);
      ctx.fill();

      // Precision diamond-knurled grip barrel zone
      drawKnurling(ctx, -6.6, -2.05, 6.8, 4.1, 1.15, 0.5, 0.18);

      // Stainless pocket clip mounted on top edge
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.roundRect(-6.8, -2.75, 5.4, 0.55, 0.25);
      ctx.fill();

      // Switch collar with tactile rubber button & green charge LED
      ctx.fillStyle = '#27272a';
      ctx.fillRect(0.5, -2.45, 2.2, 4.9);
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.roundRect(1.0, -2.95, 1.5, 0.8, 0.3);
      ctx.fill();
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(1.75, -2.55, 0.26, 0, Math.PI * 2);
      ctx.fill();

      // Flared CNC-machined aluminum reflector head
      const headGrad = ctx.createLinearGradient(0, -4.3, 0, 4.3);
      headGrad.addColorStop(0.0, '#71717a');
      headGrad.addColorStop(0.22, '#d4d4d8');
      headGrad.addColorStop(0.45, '#3f3f46');
      headGrad.addColorStop(0.84, '#09090b');
      headGrad.addColorStop(1.0, '#27272a');
      ctx.fillStyle = headGrad;
      ctx.beginPath();
      ctx.moveTo(2.5, -2.35);
      ctx.lineTo(5.6, -3.95);
      ctx.lineTo(7.5, -4.05);
      ctx.lineTo(7.5, 4.05);
      ctx.lineTo(5.6, 3.95);
      ctx.lineTo(2.5, 2.35);
      ctx.closePath();
      ctx.fill();

      // Recessed heatsink cooling fins milled around head
      ctx.fillStyle = 'rgba(2, 6, 23, 0.65)';
      ctx.fillRect(3.3, -2.7, 0.55, 5.4);
      ctx.fillRect(4.35, -3.25, 0.55, 6.5);
      ctx.fillRect(5.4, -3.7, 0.55, 7.4);

      // Machined stainless bezel crown
      const bezGrad = ctx.createLinearGradient(0, -4.1, 0, 4.1);
      bezGrad.addColorStop(0.0, '#f8fafc');
      bezGrad.addColorStop(0.35, '#94a3b8');
      bezGrad.addColorStop(0.85, '#334155');
      bezGrad.addColorStop(1.0, '#cbd5e1');
      ctx.fillStyle = bezGrad;
      ctx.fillRect(6.9, -4.15, 0.85, 8.3);

      // Deep parabolic reflector & glowing warm-white LED emitter lens
      const lensGrad = ctx.createRadialGradient(7.5, -0.5, 0.25, 7.6, 0, 4.0);
      lensGrad.addColorStop(0.0, '#ffffff');
      lensGrad.addColorStop(0.35, '#fef08a');
      lensGrad.addColorStop(0.75, '#f59e0b');
      lensGrad.addColorStop(1.0, '#92400e');
      ctx.fillStyle = lensGrad;
      ctx.beginPath();
      ctx.ellipse(7.7, 0, 1.15, 3.65, 0, 0, Math.PI * 2);
      ctx.fill();

      // Anti-reflective glass dome glint
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.beginPath();
      ctx.ellipse(7.5, -1.5, 0.42, 1.15, -0.15, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
      return true;
    }

    // =========================================================================
    // 3. TACTICAL PATROL FLASHLIGHT (Полицейский тактический фонарь)
    // =========================================================================
    case 'flashlight_police': {
      drawShadow(ctx, 9.2, 2.6, 7.8, 0.3);

      ctx.save();
      ctx.rotate(-0.22);

      // Intense cool-blue tactical Cree LED beam cone
      const beamGrad = ctx.createLinearGradient(7.8, 0, 13.8, 0);
      beamGrad.addColorStop(0.0, 'rgba(125, 211, 252, 0.52)');
      beamGrad.addColorStop(0.45, 'rgba(56, 189, 248, 0.22)');
      beamGrad.addColorStop(1.0, 'rgba(56, 189, 248, 0.0)');
      ctx.fillStyle = beamGrad;
      ctx.beginPath();
      ctx.moveTo(7.8, -4.5);
      ctx.lineTo(13.4, -7.8);
      ctx.lineTo(13.4, 7.8);
      ctx.lineTo(7.8, 4.5);
      ctx.closePath();
      ctx.fill();

      // Tactical tailcap with recessed steel strike crown & lanyard ring
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(-10.0, -2.55, 2.2, 5.1, 0.5);
      ctx.fill();
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 0.55;
      ctx.beginPath();
      ctx.arc(-10.3, 0, 1.0, Math.PI * 0.45, Math.PI * 1.55);
      ctx.stroke();

      // Matte obsidian aircraft-grade aluminum body tube
      const tubeGrad = ctx.createLinearGradient(0, -2.35, 0, 2.35);
      tubeGrad.addColorStop(0.0, '#334155');
      tubeGrad.addColorStop(0.2, '#64748b');
      tubeGrad.addColorStop(0.42, '#1e293b');
      tubeGrad.addColorStop(0.84, '#020617');
      tubeGrad.addColorStop(1.0, '#0f172a');
      ctx.fillStyle = tubeGrad;
      ctx.beginPath();
      ctx.roundRect(-8.0, -2.35, 10.6, 4.7, 0.4);
      ctx.fill();

      // Heavy cross-hatch diamond knurling on baton grip
      drawKnurling(ctx, -7.4, -2.2, 7.4, 4.4, 1.05, 0.62, 0.14);

      // Police patrol blue anodized collar stripe
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(0.3, -2.4, 0.9, 4.8);
      ctx.fillStyle = '#7dd3fc';
      ctx.fillRect(0.3, -1.6, 0.9, 0.65);

      // Raised anti-roll octagonal collar & rubberized amber tactical switch
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(1.2, -2.7, 2.1, 5.4, 0.4);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(1.5, -3.3, 1.5, 0.95, 0.35);
      ctx.fill();
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(1.85, -3.1, 0.8, 0.45);

      // Aggressive flared patrol head with milled heatsink fins
      const headGrad = ctx.createLinearGradient(0, -4.8, 0, 4.8);
      headGrad.addColorStop(0.0, '#475569');
      headGrad.addColorStop(0.2, '#94a3b8');
      headGrad.addColorStop(0.42, '#1e293b');
      headGrad.addColorStop(0.85, '#020617');
      headGrad.addColorStop(1.0, '#0f172a');
      ctx.fillStyle = headGrad;
      ctx.beginPath();
      ctx.moveTo(3.1, -2.6);
      ctx.lineTo(6.2, -4.65);
      ctx.lineTo(8.3, -4.75);
      ctx.lineTo(8.3, 4.75);
      ctx.lineTo(6.2, 4.65);
      ctx.lineTo(3.1, 2.6);
      ctx.closePath();
      ctx.fill();

      // Deep cooling fins
      ctx.fillStyle = 'rgba(2, 6, 23, 0.78)';
      ctx.fillRect(4.0, -3.15, 0.62, 6.3);
      ctx.fillRect(5.1, -3.85, 0.62, 7.7);
      ctx.fillRect(6.2, -4.4, 0.62, 8.8);

      // Scalloped stainless crenellated strike bezel
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(7.6, -4.8, 0.9, 9.6);
      ctx.fillStyle = '#020617';
      ctx.fillRect(8.1, -3.2, 0.45, 1.3);
      ctx.fillRect(8.1, 1.9, 0.45, 1.3);

      // Deep sapphire-tinted mirror reflector & blinding white Cree LED die
      const lensGrad = ctx.createRadialGradient(8.2, -0.4, 0.2, 8.3, 0, 4.5);
      lensGrad.addColorStop(0.0, '#ffffff');
      lensGrad.addColorStop(0.28, '#e0f2fe');
      lensGrad.addColorStop(0.65, '#38bdf8');
      lensGrad.addColorStop(1.0, '#0c4a6e');
      ctx.fillStyle = lensGrad;
      ctx.beginPath();
      ctx.ellipse(8.3, 0, 1.25, 4.2, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(8.1, -1.6, 0.42, 1.35, -0.1, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
      return true;
    }

    // =========================================================================
    // 4. HEAVY DUTY SCREWDRIVER (Профессиональная отвертка)
    // =========================================================================
    case 'screwdriver': {
      drawShadow(ctx, 9.0, 2.1, 7.2, 0.24);

      ctx.save();
      ctx.rotate(-0.34);

      // Chrome-Vanadium hardened cylindrical steel shaft
      const shaftGrad = ctx.createLinearGradient(0, -1.1, 0, 1.1);
      shaftGrad.addColorStop(0.0, '#cbd5e1');
      shaftGrad.addColorStop(0.28, '#ffffff');
      shaftGrad.addColorStop(0.55, '#94a3b8');
      shaftGrad.addColorStop(0.85, '#475569');
      shaftGrad.addColorStop(1.0, '#cbd5e1');
      ctx.fillStyle = shaftGrad;
      ctx.fillRect(-0.2, -0.95, 8.4, 1.9);

      // Black phosphate magnetized Phillips cruciform tip with machined flutes
      const tipGrad = ctx.createLinearGradient(0, -1.0, 0, 1.0);
      tipGrad.addColorStop(0.0, '#475569');
      tipGrad.addColorStop(0.35, '#1e293b');
      tipGrad.addColorStop(1.0, '#020617');
      ctx.fillStyle = tipGrad;
      ctx.beginPath();
      ctx.moveTo(8.1, -0.95);
      ctx.lineTo(11.1, -0.45);
      ctx.lineTo(11.3, 0.0);
      ctx.lineTo(11.1, 0.45);
      ctx.lineTo(8.1, 0.95);
      ctx.closePath();
      ctx.fill();

      // Machined cross-wing specular ridge on Phillips tip
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.55)';
      ctx.lineWidth = 0.26;
      ctx.beginPath();
      ctx.moveTo(8.4, 0);
      ctx.lineTo(11.1, 0);
      ctx.moveTo(8.3, -0.75);
      ctx.lineTo(10.6, -0.35);
      ctx.stroke();

      // Forged hexagonal wrench bolster nut at shaft-handle junction
      const bolGrad = ctx.createLinearGradient(0, -1.8, 0, 1.8);
      bolGrad.addColorStop(0.0, '#e2e8f0');
      bolGrad.addColorStop(0.3, '#ffffff');
      bolGrad.addColorStop(0.65, '#64748b');
      bolGrad.addColorStop(1.0, '#334155');
      ctx.fillStyle = bolGrad;
      ctx.beginPath();
      ctx.roundRect(-1.5, -1.65, 1.6, 3.3, 0.25);
      ctx.fill();
      ctx.strokeStyle = 'rgba(15,23,42,0.45)';
      ctx.lineWidth = 0.25;
      ctx.beginPath();
      ctx.moveTo(-1.5, -0.6);
      ctx.lineTo(0.1, -0.6);
      ctx.moveTo(-1.5, 0.6);
      ctx.lineTo(0.1, 0.6);
      ctx.stroke();

      // Ergonomic sculpted dual-component handle (bright amber-yellow core)
      const hGrad = ctx.createLinearGradient(0, -3.5, 0, 3.5);
      hGrad.addColorStop(0.0, '#fef08a');
      hGrad.addColorStop(0.25, '#facc15');
      hGrad.addColorStop(0.65, '#ca8a04');
      hGrad.addColorStop(1.0, '#713f12');
      ctx.fillStyle = hGrad;
      ctx.beginPath();
      ctx.moveTo(-1.4, -2.0);
      ctx.bezierCurveTo(-2.8, -3.2, -5.0, -3.5, -7.8, -3.1);
      ctx.bezierCurveTo(-10.0, -2.8, -10.4, -1.4, -10.4, 0);
      ctx.bezierCurveTo(-10.4, 1.4, -10.0, 2.8, -7.8, 3.1);
      ctx.bezierCurveTo(-5.0, 3.5, -2.8, 3.2, -1.4, 2.0);
      ctx.closePath();
      ctx.fill();

      // Molded matte charcoal TPE soft-grip finger cushions & fluted torque channel
      const rubGrad = ctx.createLinearGradient(0, -3.2, 0, 3.2);
      rubGrad.addColorStop(0.0, '#3f3f46');
      rubGrad.addColorStop(0.4, '#18181b');
      rubGrad.addColorStop(1.0, '#09090b');
      ctx.fillStyle = rubGrad;
      ctx.beginPath();
      ctx.roundRect(-8.8, -1.25, 6.2, 2.5, 0.9);
      ctx.fill();

      // Side rubber anti-roll grip collars
      ctx.beginPath();
      ctx.roundRect(-8.4, -3.25, 2.1, 1.35, 0.55);
      ctx.roundRect(-8.4, 1.9, 2.1, 1.35, 0.55);
      ctx.roundRect(-5.0, -3.3, 2.0, 1.3, 0.55);
      ctx.roundRect(-5.0, 2.0, 2.0, 1.3, 0.55);
      ctx.fill();

      // Micro grip dots inside dark channel
      ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
      for (let dx = -7.8; dx <= -3.6; dx += 1.05) {
        ctx.beginPath();
        ctx.arc(dx, 0, 0.25, 0, Math.PI * 2);
        ctx.fill();
      }

      // Chrome-plated steel strike-through butt cap & hanging hole
      const capGrad = ctx.createLinearGradient(0, -2.2, 0, 2.2);
      capGrad.addColorStop(0.0, '#f8fafc');
      capGrad.addColorStop(0.5, '#94a3b8');
      capGrad.addColorStop(1.0, '#334155');
      ctx.fillStyle = capGrad;
      ctx.beginPath();
      ctx.ellipse(-10.15, 0, 0.65, 2.1, 0, 0, Math.PI * 2);
      ctx.fill();

      // Glossy top highlight along yellow handle spine
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.beginPath();
      ctx.ellipse(-5.8, -2.15, 3.0, 0.42, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
      return true;
    }

    // =========================================================================
    // 5. SPARE CAR BATTERY 12V (Автомобильный аккумулятор)
    // =========================================================================
    case 'car_battery': {
      drawShadow(ctx, 9.2, 3.0, 8.2, 0.32);

      // Folded overhead nylon carry strap
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(-7.8, -4.8);
      ctx.quadraticCurveTo(0, -9.8, 7.8, -4.8);
      ctx.stroke();

      // Heavy molded black polypropylene battery monoblock casing
      const caseGrad = ctx.createLinearGradient(-8.5, -4.5, 8.5, 7.8);
      caseGrad.addColorStop(0.0, '#334155');
      caseGrad.addColorStop(0.2, '#1e293b');
      caseGrad.addColorStop(0.75, '#0f172a');
      caseGrad.addColorStop(1.0, '#020617');
      ctx.fillStyle = caseGrad;
      ctx.beginPath();
      ctx.roundRect(-8.4, -4.6, 16.8, 12.2, 1.15);
      ctx.fill();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
      ctx.lineWidth = 0.35;
      ctx.stroke();

      // Structural molded vertical ribs on left and right flanks
      ctx.fillStyle = 'rgba(2, 6, 23, 0.55)';
      for (const rx of [-7.5, -6.2, 5.5, 6.8]) {
        ctx.fillRect(rx, -2.6, 0.75, 9.2);
      }

      // Heat-sealed upper manifold cover with chamfer bevel
      const topGrad = ctx.createLinearGradient(-8.8, -6.4, 8.8, -4.2);
      topGrad.addColorStop(0.0, '#475569');
      topGrad.addColorStop(0.35, '#334155');
      topGrad.addColorStop(1.0, '#0f172a');
      ctx.fillStyle = topGrad;
      ctx.beginPath();
      ctx.roundRect(-8.8, -6.2, 17.6, 2.2, [0.9, 0.9, 0.3, 0.3]);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(-8.3, -6.0, 16.6, 0.38);

      // 6 recessed electrolyte cell vent caps along top ridge
      for (let i = 0; i < 6; i++) {
        const cx = -3.0 + i * 1.2;
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.roundRect(cx - 0.38, -6.8, 0.76, 0.7, 0.2);
        ctx.fill();
        ctx.fillStyle = '#64748b';
        ctx.fillRect(cx - 0.25, -6.65, 0.5, 0.2);
      }

      // Positive (+) terminal post with red insulated base collar
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.roundRect(-7.2, -7.8, 3.0, 1.7, 0.45);
      ctx.fill();
      const postGradL = ctx.createLinearGradient(-6.4, 0, -5.0, 0);
      postGradL.addColorStop(0.0, '#94a3b8');
      postGradL.addColorStop(0.4, '#f8fafc');
      postGradL.addColorStop(1.0, '#475569');
      ctx.fillStyle = postGradL;
      ctx.beginPath();
      ctx.roundRect(-6.4, -9.2, 1.4, 1.7, 0.3);
      ctx.fill();
      // Crisp white '+' on red collar
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-5.9, -7.45, 0.4, 1.0);
      ctx.fillRect(-6.2, -7.15, 1.0, 0.4);

      // Negative (-) terminal post with cobalt-blue insulated base collar
      ctx.fillStyle = '#2563eb';
      ctx.beginPath();
      ctx.roundRect(4.2, -7.8, 3.0, 1.7, 0.45);
      ctx.fill();
      const postGradR = ctx.createLinearGradient(5.0, 0, 6.4, 0);
      postGradR.addColorStop(0.0, '#94a3b8');
      postGradR.addColorStop(0.4, '#f8fafc');
      postGradR.addColorStop(1.0, '#475569');
      ctx.fillStyle = postGradR;
      ctx.beginPath();
      ctx.roundRect(5.0, -9.2, 1.4, 1.7, 0.3);
      ctx.fill();
      // Crisp white '-' on blue collar
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(5.2, -7.15, 1.0, 0.4);

      // Green optical hydrometer "magic eye" charge indicator on top deck
      ctx.fillStyle = '#020617';
      ctx.beginPath();
      ctx.arc(3.0, -5.1, 0.65, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(3.0, -5.1, 0.4, 0, Math.PI * 2);
      ctx.fill();

      // Technical front spec sticker (matte dark slate + gold racing stripe + lightning bolt)
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.roundRect(-5.2, -2.5, 10.4, 8.2, 0.65);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-5.2, -2.5, 10.4, 2.5);
      ctx.fillStyle = '#eab308';
      ctx.fillRect(-5.2, 0.0, 10.4, 0.65);

      // Spec bars & yellow high-cranking lightning bolt emblem
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-4.2, -1.7, 5.2, 0.75);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(-4.2, 1.6, 4.4, 0.5);
      ctx.fillRect(-4.2, 2.7, 3.6, 0.45);
      ctx.fillRect(-4.2, 3.8, 4.8, 0.45);

      // Sharp yellow hazard lightning icon on right side of label
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.moveTo(2.4, 1.1);
      ctx.lineTo(0.8, 3.3);
      ctx.lineTo(2.1, 3.3);
      ctx.lineTo(1.3, 5.2);
      ctx.lineTo(3.8, 2.7);
      ctx.lineTo(2.4, 2.7);
      ctx.closePath();
      ctx.fill();

      // Base mounting hold-down flange lip
      ctx.fillStyle = '#020617';
      ctx.fillRect(-8.8, 7.0, 17.6, 0.9);
      return true;
    }

    // =========================================================================
    // 6. CAR FIRE EXTINGUISHER (Огнетушитель — полный и пустой)
    // =========================================================================
    case 'extinguisher':
    case 'extinguisher_empty': {
      const isEmpty = itemId === 'extinguisher_empty';
      drawShadow(ctx, 7.2, 2.6, 8.6, isEmpty ? 0.22 : 0.3);

      // Black flexible braided EPDM rubber discharge hose looping down right side
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.55;
      ctx.lineCap = 'round';
      ctx.beginPath();
      if (isEmpty) {
        ctx.moveTo(0.8, -6.2);
        ctx.bezierCurveTo(6.2, -5.2, 6.8, 1.2, 4.6, 5.5);
      } else {
        ctx.moveTo(0.8, -6.2);
        ctx.bezierCurveTo(5.6, -5.2, 5.6, 0.5, 4.9, 4.4);
      }
      ctx.stroke();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
      ctx.lineWidth = 0.35;
      ctx.stroke();

      // Flared conical discharge horn nozzle at hose tip
      ctx.save();
      if (isEmpty) {
        ctx.translate(4.6, 5.6);
        ctx.rotate(0.45);
      } else {
        ctx.translate(4.9, 4.5);
        ctx.rotate(0.15);
      }
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.moveTo(-0.75, -0.6);
      ctx.lineTo(0.75, -0.6);
      ctx.lineTo(1.45, 2.2);
      ctx.lineTo(-1.45, 2.2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#3f3f46';
      ctx.fillRect(-0.5, -0.4, 0.4, 2.3);
      ctx.restore();

      // High-gloss crimson cylindrical pressure vessel with 3D cylindrical lighting
      const cylGrad = ctx.createLinearGradient(-5.2, 0, 3.8, 0);
      cylGrad.addColorStop(0.0, '#7f1d1d');
      cylGrad.addColorStop(0.22, isEmpty ? '#dc2626' : '#f87171');
      cylGrad.addColorStop(0.42, isEmpty ? '#b91c1c' : '#dc2626');
      cylGrad.addColorStop(0.78, '#991b1b');
      cylGrad.addColorStop(1.0, '#450a0a');
      ctx.fillStyle = cylGrad;
      ctx.beginPath();
      ctx.roundRect(-5.2, -4.4, 9.0, 12.6, [3.2, 3.2, 1.1, 1.1]);
      ctx.fill();

      // Rolled dark rubber protective base skirt ring
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.roundRect(-5.3, 6.8, 9.2, 1.6, [0.3, 0.3, 0.9, 0.9]);
      ctx.fill();

      // Crisp cylindrical specular highlight stripe
      drawGlossBand(ctx, -3.8, -3.6, 1.15, 10.2, isEmpty ? 0.22 : 0.38);

      // Technical compliance instruction decal wrapped around cylinder
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(-5.2, -4.4, 9.0, 12.6, [3.2, 3.2, 1.1, 1.1]);
      ctx.clip();

      ctx.fillStyle = isEmpty ? '#e2e8f0' : '#f8fafc';
      ctx.fillRect(-5.2, -0.6, 9.0, 5.4);
      // Top dark instruction header bar
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-5.2, -0.6, 9.0, 1.25);
      // Fire class pictogram squares (A, B, C)
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-4.2, 1.2, 1.3, 1.2);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(-2.5, 1.2, 1.3, 1.2);
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(-0.8, 1.2, 1.3, 1.2);
      // Spec lines
      ctx.fillStyle = '#334155';
      ctx.fillRect(-4.2, 3.0, 6.4, 0.42);
      ctx.fillRect(-4.2, 3.8, 4.8, 0.38);

      if (isEmpty) {
        // Diagonal red "DISCHARGED" slash & scuff marks
        ctx.strokeStyle = 'rgba(220, 38, 38, 0.8)';
        ctx.lineWidth = 0.75;
        ctx.beginPath();
        ctx.moveTo(-4.8, 4.2);
        ctx.lineTo(3.2, 0.8);
        ctx.stroke();
      }

      // Cylindrical shading over label so it curves seamlessly
      const labShade = ctx.createLinearGradient(-5.2, 0, 3.8, 0);
      labShade.addColorStop(0.0, 'rgba(15,23,42,0.34)');
      labShade.addColorStop(0.25, 'rgba(255,255,255,0.12)');
      labShade.addColorStop(0.75, 'rgba(15,23,42,0.08)');
      labShade.addColorStop(1.0, 'rgba(15,23,42,0.42)');
      ctx.fillStyle = labShade;
      ctx.fillRect(-5.2, -0.6, 9.0, 5.4);
      ctx.restore();

      // Machined brass threaded collar & forged valve head
      const brGrad = ctx.createLinearGradient(-2.1, 0, 0.7, 0);
      brGrad.addColorStop(0.0, '#92400e');
      brGrad.addColorStop(0.38, '#fde047');
      brGrad.addColorStop(0.75, '#ca8a04');
      brGrad.addColorStop(1.0, '#713f12');
      ctx.fillStyle = brGrad;
      ctx.beginPath();
      ctx.roundRect(-2.1, -6.9, 2.8, 2.6, 0.4);
      ctx.fill();

      // Lower steel carry handle
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.moveTo(-1.0, -6.1);
      ctx.lineTo(-5.8, -5.6);
      ctx.lineTo(-5.6, -4.7);
      ctx.lineTo(-0.8, -5.1);
      ctx.closePath();
      ctx.fill();

      // Upper discharge squeeze lever (up & armed when full; collapsed flat when empty)
      ctx.fillStyle = '#27272a';
      ctx.beginPath();
      if (isEmpty) {
        ctx.moveTo(-1.0, -6.6);
        ctx.lineTo(-5.9, -6.2);
        ctx.lineTo(-5.8, -5.4);
        ctx.lineTo(-0.8, -5.8);
      } else {
        ctx.moveTo(-1.0, -6.8);
        ctx.lineTo(-6.2, -9.0);
        ctx.lineTo(-5.8, -8.0);
        ctx.lineTo(-0.8, -6.0);
      }
      ctx.closePath();
      ctx.fill();

      // Safety pull-pin ring (intact yellow seal on full; dangling broken tag on empty)
      if (!isEmpty) {
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 0.65;
        ctx.beginPath();
        ctx.arc(0.4, -7.8, 1.1, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 0.55;
        ctx.beginPath();
        ctx.moveTo(0.2, -6.4);
        ctx.quadraticCurveTo(1.2, -4.8, 0.6, -3.5);
        ctx.stroke();
      }

      // Precision analog pressure gauge dial
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.arc(-0.7, -5.8, 1.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(-0.7, -5.8, 1.2, 0, Math.PI * 2);
      ctx.fill();

      // Red-Green-Red dial arc
      ctx.lineWidth = 0.45;
      ctx.strokeStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(-0.7, -5.8, 0.85, Math.PI * 0.85, Math.PI * 1.28);
      ctx.stroke();
      ctx.strokeStyle = '#16a34a';
      ctx.beginPath();
      ctx.arc(-0.7, -5.8, 0.85, Math.PI * 1.28, Math.PI * 1.72);
      ctx.stroke();
      ctx.strokeStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(-0.7, -5.8, 0.85, Math.PI * 1.72, Math.PI * 2.15);
      ctx.stroke();

      // Gauge needle (straight up in green for full, hard left in red for empty)
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 0.35;
      ctx.beginPath();
      ctx.moveTo(-0.7, -5.8);
      if (isEmpty) {
        ctx.lineTo(-1.55, -5.55);
      } else {
        ctx.lineTo(-0.7, -6.7);
      }
      ctx.stroke();

      if (isEmpty) {
        // Dry white fire-retardant powder residue dusting around nozzle & foot
        ctx.fillStyle = 'rgba(248, 250, 252, 0.85)';
        ctx.beginPath();
        ctx.arc(3.6, 7.6, 1.15, 0, Math.PI * 2);
        ctx.arc(5.1, 7.9, 0.75, 0, Math.PI * 2);
        ctx.arc(2.5, 8.1, 0.55, 0, Math.PI * 2);
        ctx.fill();
      }
      return true;
    }

    // =========================================================================
    // 7. FOLDING POCKET KNIFE (Складной швейцарский нож)
    // =========================================================================
    case 'pocket_knife': {
      drawShadow(ctx, 8.8, 2.7, 7.6, 0.28);

      // Stainless split keyring loop at rear heel
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 0.75;
      ctx.beginPath();
      ctx.arc(7.8, 4.6, 1.45, 0, Math.PI * 2);
      ctx.stroke();

      // Secondary folded stainless bottle-opener / saw tool peeking from top spine
      const subGrad = ctx.createLinearGradient(0, -4, 4, 2);
      subGrad.addColorStop(0.0, '#f8fafc');
      subGrad.addColorStop(0.6, '#94a3b8');
      subGrad.addColorStop(1.0, '#475569');
      ctx.fillStyle = subGrad;
      ctx.beginPath();
      ctx.moveTo(2.4, 1.2);
      ctx.lineTo(5.8, -4.2);
      ctx.lineTo(7.4, -3.1);
      ctx.lineTo(6.2, -1.5);
      ctx.lineTo(7.0, -0.9);
      ctx.lineTo(5.0, 2.2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 0.28;
      ctx.stroke();

      // Primary locked-open drop-point stainless steel blade (hollow-grind bevel)
      const bladeGrad = ctx.createLinearGradient(-7.2, -8.5, 2.5, 1.5);
      bladeGrad.addColorStop(0.0, '#ffffff');
      bladeGrad.addColorStop(0.38, '#e2e8f0');
      bladeGrad.addColorStop(0.7, '#94a3b8');
      bladeGrad.addColorStop(1.0, '#475569');
      ctx.fillStyle = bladeGrad;
      ctx.beginPath();
      ctx.moveTo(-5.8, 2.4);
      ctx.lineTo(-6.4, -7.8);
      ctx.bezierCurveTo(-3.2, -8.2, 0.2, -5.0, 1.6, 1.8);
      ctx.closePath();
      ctx.fill();

      // Bright razor cutting edge bevel facet
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.beginPath();
      ctx.moveTo(-6.4, -7.8);
      ctx.bezierCurveTo(-3.4, -7.6, -0.5, -4.6, 0.8, 1.4);
      ctx.lineTo(1.6, 1.8);
      ctx.bezierCurveTo(0.2, -5.0, -3.2, -8.2, -6.4, -7.8);
      ctx.closePath();
      ctx.fill();

      // Blade spine line & milled crescent nail-nick groove
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 0.35;
      ctx.beginPath();
      ctx.moveTo(-5.8, 2.2);
      ctx.lineTo(-6.4, -7.8);
      ctx.stroke();
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 0.42;
      ctx.beginPath();
      ctx.arc(-4.2, -3.6, 1.15, -Math.PI * 0.4, Math.PI * 0.35);
      ctx.stroke();

      // Brushed aluminum internal liner edge peeking along handle perimeter
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.roundRect(-7.8, 1.1, 15.2, 5.9, 2.7);
      ctx.fill();

      // Iconic glossy ruby-red Cellidor contoured scales
      const handleGrad = ctx.createLinearGradient(0, 1.4, 0, 6.8);
      handleGrad.addColorStop(0.0, '#f87171');
      handleGrad.addColorStop(0.22, '#dc2626');
      handleGrad.addColorStop(0.75, '#991b1b');
      handleGrad.addColorStop(1.0, '#450a0a');
      ctx.fillStyle = handleGrad;
      ctx.beginPath();
      ctx.roundRect(-7.6, 1.4, 14.8, 5.4, 2.5);
      ctx.fill();

      // Curved specular polymer highlight along upper scale ridge
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.beginPath();
      ctx.roundRect(-6.4, 1.85, 12.2, 0.95, 0.45);
      ctx.fill();

      // Recessed polished brass pivot pins
      for (const px of [-5.2, 4.8]) {
        drawLitSphere(ctx, px, 4.1, 0.85, '#fef08a', '#d97706', '#78350f', undefined, 0.55);
      }

      // Inlaid brushed silver Swiss shield crest emblem in center
      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 0.3;
      ctx.beginPath();
      ctx.moveTo(-1.45, 2.55);
      ctx.lineTo(1.45, 2.55);
      ctx.lineTo(1.3, 4.4);
      ctx.quadraticCurveTo(0, 5.65, 0, 5.65);
      ctx.quadraticCurveTo(0, 5.65, -1.3, 4.4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Red inner shield field & crisp white cross
      ctx.fillStyle = '#b91c1c';
      ctx.beginPath();
      ctx.moveTo(-1.1, 2.85);
      ctx.lineTo(1.1, 2.85);
      ctx.lineTo(0.95, 4.25);
      ctx.quadraticCurveTo(0, 5.2, 0, 5.2);
      ctx.quadraticCurveTo(0, 5.2, -0.95, 4.25);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-0.28, 3.15, 0.56, 1.55);
      ctx.fillRect(-0.78, 3.65, 1.56, 0.55);
      return true;
    }

    // =========================================================================
    // 8. HEAVY DUTY DUCT TAPE (Армированный скотч)
    // =========================================================================
    case 'duct_tape': {
      drawShadow(ctx, 8.4, 3.0, 7.6, 0.28);

      // Peeled-out silver cloth tape tail curling out from bottom-right
      const tailGrad = ctx.createLinearGradient(3.5, 2.5, 10.2, 6.2);
      tailGrad.addColorStop(0.0, '#64748b');
      tailGrad.addColorStop(0.4, '#cbd5e1');
      tailGrad.addColorStop(0.75, '#f1f5f9');
      tailGrad.addColorStop(1.0, '#94a3b8');
      ctx.fillStyle = tailGrad;
      ctx.beginPath();
      ctx.moveTo(4.2, 1.6);
      ctx.quadraticCurveTo(7.6, 2.8, 10.2, 2.6);
      ctx.lineTo(9.4, 6.2);
      ctx.quadraticCurveTo(6.4, 6.2, 3.2, 4.8);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.45)';
      ctx.lineWidth = 0.28;
      ctx.stroke();

      // Subtle adhesive underside fold shadow on peeled tab
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.beginPath();
      ctx.moveTo(8.8, 2.8);
      ctx.lineTo(10.0, 2.6);
      ctx.lineTo(9.3, 6.0);
      ctx.lineTo(8.2, 5.8);
      ctx.closePath();
      ctx.fill();

      // 3D Cylindrical side skirt of the wound silver tape roll
      const sideGrad = ctx.createLinearGradient(-7.8, 0, 7.8, 0);
      sideGrad.addColorStop(0.0, '#475569');
      sideGrad.addColorStop(0.22, '#e2e8f0');
      sideGrad.addColorStop(0.45, '#94a3b8');
      sideGrad.addColorStop(0.82, '#334155');
      sideGrad.addColorStop(1.0, '#64748b');
      ctx.fillStyle = sideGrad;
      ctx.beginPath();
      ctx.ellipse(0, 2.4, 7.6, 5.0, 0, 0, Math.PI);
      ctx.lineTo(-7.6, -1.8);
      ctx.ellipse(0, -1.8, 7.6, 5.0, 0, Math.PI, Math.PI * 2);
      ctx.lineTo(7.6, 2.4);
      ctx.closePath();
      ctx.fill();

      // Fine cross-woven polyethylene-cloth mesh texture lines on outer silver wall
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(0, 2.4, 7.6, 5.0, 0, 0, Math.PI);
      ctx.lineTo(-7.6, -1.8);
      ctx.ellipse(0, -1.8, 7.6, 5.0, 0, Math.PI, 0, true);
      ctx.closePath();
      ctx.clip();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
      ctx.lineWidth = 0.26;
      for (let ty = -1.5; ty <= 7.0; ty += 1.0) {
        ctx.beginPath();
        ctx.moveTo(-7.8, ty);
        ctx.quadraticCurveTo(0, ty + 2.4, 7.8, ty);
        ctx.stroke();
      }
      for (let tx = -6.5; tx <= 6.5; tx += 1.4) {
        ctx.beginPath();
        ctx.moveTo(tx, -2.5);
        ctx.lineTo(tx, 7.5);
        ctx.stroke();
      }
      ctx.restore();

      // Top face of wound silver tape layers (concentric spiral wraps)
      const topGrad = ctx.createRadialGradient(-2.4, -3.2, 0.8, 0, -1.8, 7.8);
      topGrad.addColorStop(0.0, '#f8fafc');
      topGrad.addColorStop(0.55, '#cbd5e1');
      topGrad.addColorStop(1.0, '#64748b');
      ctx.fillStyle = topGrad;
      ctx.beginPath();
      ctx.ellipse(0, -1.8, 7.6, 5.0, 0, 0, Math.PI * 2);
      ctx.fill();

      // Concentric laminated wrap lines on top rim
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.34)';
      ctx.lineWidth = 0.32;
      for (const frac of [0.88, 0.76, 0.64]) {
        ctx.beginPath();
        ctx.ellipse(0, -1.8, 7.6 * frac, 5.0 * frac, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Spiral-wound kraft cardboard inner core ring
      const coreGrad = ctx.createLinearGradient(-4.0, -1.8, 4.0, -1.8);
      coreGrad.addColorStop(0.0, '#78350f');
      coreGrad.addColorStop(0.5, '#b45309');
      coreGrad.addColorStop(1.0, '#5c2808');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.ellipse(0, -1.8, 4.0, 2.6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Deep hollow cardboard interior hole with visible inner kraft wall
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(0, -1.8, 3.3, 2.1, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.beginPath();
      ctx.ellipse(0, -1.8, 3.3, 2.1, 0, 0, Math.PI * 2);
      ctx.clip();
      const inGrad = ctx.createLinearGradient(-3.3, -3.5, 3.3, 0.5);
      inGrad.addColorStop(0.0, '#92400e');
      inGrad.addColorStop(0.55, '#451a03');
      inGrad.addColorStop(1.0, '#09090b');
      ctx.fillStyle = inGrad;
      ctx.fillRect(-3.5, -4.0, 7.0, 3.0);
      ctx.restore();
      return true;
    }

    // =========================================================================
    // 9. 20000mAh POWER BANK (Повербанк)
    // =========================================================================
    case 'powerbank': {
      drawShadow(ctx, 7.2, 2.6, 8.2, 0.28);

      // Braided fabric wrist lanyard loop on bottom-left corner
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 0.85;
      ctx.beginPath();
      ctx.moveTo(-5.8, 6.2);
      ctx.bezierCurveTo(-8.8, 7.2, -9.0, 9.6, -6.6, 9.4);
      ctx.bezierCurveTo(-5.0, 9.2, -5.2, 7.4, -5.6, 6.4);
      ctx.stroke();

      // Anodized dark-titanium aluminum chassis with brushed metallic gradient
      const chGrad = ctx.createLinearGradient(-6.4, -7.8, 6.4, 7.8);
      chGrad.addColorStop(0.0, '#475569');
      chGrad.addColorStop(0.22, '#334155');
      chGrad.addColorStop(0.65, '#1e293b');
      chGrad.addColorStop(1.0, '#09090b');
      ctx.fillStyle = chGrad;
      ctx.beginPath();
      ctx.roundRect(-6.2, -7.8, 12.4, 15.6, 2.0);
      ctx.fill();

      // Diamond-cut CNC silver chamfered bezel perimeter
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.45)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.roundRect(-6.0, -7.6, 12.0, 15.2, 1.85);
      ctx.stroke();

      // Subtle dark brushed metallic horizontal sheen bands
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 0.3;
      for (let by = -6.0; by <= 6.2; by += 1.2) {
        ctx.beginPath();
        ctx.moveTo(-5.4, by);
        ctx.lineTo(5.4, by);
        ctx.stroke();
      }

      // Top dark faceplate with precision USB-A + USB-C ports
      ctx.fillStyle = '#020617';
      ctx.beginPath();
      ctx.roundRect(-5.0, -8.3, 10.0, 1.35, [0.8, 0.8, 0.2, 0.2]);
      ctx.fill();
      // USB-A port (cobalt-blue fast-charge tongue)
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(-3.6, -8.0, 2.8, 0.72);
      // USB-C PD port
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.roundRect(1.0, -8.0, 2.2, 0.72, 0.35);
      ctx.fill();

      // Recessed glossy obsidian glass status strip
      ctx.fillStyle = '#020617';
      ctx.beginPath();
      ctx.roundRect(-4.6, -5.4, 9.2, 2.6, 0.85);
      ctx.fill();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
      ctx.lineWidth = 0.28;
      ctx.stroke();

      // 4 glowing emerald LED charge dots with soft light halos
      for (const lx of [-2.85, -0.95, 0.95, 2.85]) {
        const ledHalo = ctx.createRadialGradient(lx, -4.1, 0.1, lx, -4.1, 1.15);
        ledHalo.addColorStop(0.0, 'rgba(74, 222, 128, 0.85)');
        ledHalo.addColorStop(1.0, 'rgba(34, 197, 94, 0.0)');
        ctx.fillStyle = ledHalo;
        ctx.beginPath();
        ctx.arc(lx, -4.1, 1.15, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#86efac';
        ctx.beginPath();
        ctx.arc(lx, -4.1, 0.45, 0, Math.PI * 2);
        ctx.fill();
      }

      // Subtle laser-etched geometric lightning bolt & capacity bars on lower face
      ctx.fillStyle = 'rgba(203, 213, 225, 0.28)';
      ctx.beginPath();
      ctx.moveTo(0.4, -0.8);
      ctx.lineTo(-1.3, 1.8);
      ctx.lineTo(0.1, 1.8);
      ctx.lineTo(-0.6, 4.0);
      ctx.lineTo(1.6, 1.1);
      ctx.lineTo(0.2, 1.1);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgba(148, 163, 184, 0.25)';
      ctx.fillRect(-3.0, 5.2, 6.0, 0.42);
      ctx.fillRect(-1.8, 6.0, 3.6, 0.34);

      // Side tactile anodized wake button
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(6.1, -3.5, 0.65, 2.2);

      drawGlossBand(ctx, -5.0, -7.2, 1.4, 14.4, 0.16);
      return true;
    }

    // =========================================================================
    // 10. SMART TACTICAL WATCH (Умные тактические часы)
    // =========================================================================
    case 'smart_watch': {
      drawShadow(ctx, 6.4, 2.5, 8.6, 0.24);

      // Ribbed matte charcoal fluoroelastomer sport straps (top & bottom)
      const strapGrad = ctx.createLinearGradient(-3.6, 0, 3.6, 0);
      strapGrad.addColorStop(0.0, '#18181b');
      strapGrad.addColorStop(0.35, '#3f3f46');
      strapGrad.addColorStop(0.75, '#18181b');
      strapGrad.addColorStop(1.0, '#09090b');
      ctx.fillStyle = strapGrad;
      ctx.beginPath();
      ctx.roundRect(-3.4, -9.6, 6.8, 19.2, 1.1);
      ctx.fill();

      // Strap breathable ventilation ridges & adjustment pin holes
      ctx.fillStyle = '#09090b';
      for (const sy of [-8.4, -7.0, 6.6, 8.0]) {
        ctx.fillRect(-2.6, sy, 5.2, 0.45);
      }
      ctx.fillStyle = '#020617';
      ctx.beginPath();
      ctx.roundRect(-0.6, 6.9, 1.2, 0.7, 0.3);
      ctx.roundRect(-0.6, 8.2, 1.2, 0.7, 0.3);
      ctx.fill();

      // Top brushed titanium strap lugs
      ctx.fillStyle = '#64748b';
      ctx.fillRect(-4.0, -5.8, 8.0, 1.0);
      ctx.fillRect(-4.0, 4.8, 8.0, 1.0);

      // Side tactical orange-ringed digital crown & action pusher button
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.roundRect(5.3, -2.5, 1.4, 2.6, 0.45);
      ctx.fill();
      ctx.fillStyle = '#f97316';
      ctx.fillRect(6.2, -2.2, 0.45, 2.0);
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.roundRect(5.3, 1.0, 1.0, 2.1, 0.35);
      ctx.fill();

      // Rugged brushed titanium watch case
      const caseGrad = ctx.createLinearGradient(-5.8, -5.8, 5.8, 5.8);
      caseGrad.addColorStop(0.0, '#cbd5e1');
      caseGrad.addColorStop(0.32, '#64748b');
      caseGrad.addColorStop(0.75, '#334155');
      caseGrad.addColorStop(1.0, '#0f172a');
      ctx.fillStyle = caseGrad;
      ctx.beginPath();
      ctx.roundRect(-5.7, -5.7, 11.4, 11.4, 2.8);
      ctx.fill();

      // Dark anodized inner bezel
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.roundRect(-4.85, -4.85, 9.7, 9.7, 2.15);
      ctx.fill();

      // Deep luminous AMOLED screen with dark sapphire gradient
      const scrGrad = ctx.createRadialGradient(-1.0, -1.5, 0.4, 0, 0, 5.6);
      scrGrad.addColorStop(0.0, '#0c4a6e');
      scrGrad.addColorStop(0.55, '#082f49');
      scrGrad.addColorStop(1.0, '#020617');
      ctx.fillStyle = scrGrad;
      ctx.beginPath();
      ctx.roundRect(-4.2, -4.2, 8.4, 8.4, 1.6);
      ctx.fill();

      // Concentric glowing fitness & compass arcs
      ctx.lineWidth = 0.55;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(-2.1, -1.8, 1.25, -Math.PI * 0.5, Math.PI * 1.1);
      ctx.stroke();
      ctx.strokeStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(-2.1, -1.8, 0.72, -Math.PI * 0.5, Math.PI * 0.7);
      ctx.stroke();

      // Crisp luminous cyan digital clock blocks
      ctx.fillStyle = '#e0f2fe';
      ctx.fillRect(0.2, -3.0, 0.85, 2.2);
      ctx.fillRect(1.5, -3.0, 1.5, 0.52);
      ctx.fillRect(2.48, -3.0, 0.52, 2.2);
      ctx.fillRect(1.5, -1.32, 1.5, 0.52);
      ctx.fillRect(1.5, -2.1, 0.52, 1.3);

      // Glowing coral-red live ECG heart-rate waveform at bottom
      ctx.strokeStyle = '#fb7185';
      ctx.lineWidth = 0.65;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(-3.3, 2.0);
      ctx.lineTo(-1.5, 2.0);
      ctx.lineTo(-0.9, 0.7);
      ctx.lineTo(-0.1, 3.1);
      ctx.lineTo(0.6, 1.3);
      ctx.lineTo(1.2, 2.0);
      ctx.lineTo(3.3, 2.0);
      ctx.stroke();

      // Curved sapphire crystal reflection sheen
      ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
      ctx.beginPath();
      ctx.moveTo(-4.0, -4.0);
      ctx.lineTo(1.5, -4.0);
      ctx.lineTo(-4.0, 1.8);
      ctx.closePath();
      ctx.fill();
      return true;
    }

    // =========================================================================
    // 11. LONG-RANGE WALKIE TALKIE (Рация)
    // =========================================================================
    case 'walkie_talkie': {
      drawShadow(ctx, 6.5, 2.6, 8.6, 0.28);

      // Helical flexible rubber-duck SMA antenna with brass collar nut
      const antGrad = ctx.createLinearGradient(-4.3, 0, -2.5, 0);
      antGrad.addColorStop(0.0, '#18181b');
      antGrad.addColorStop(0.4, '#52525b');
      antGrad.addColorStop(1.0, '#09090b');
      ctx.fillStyle = antGrad;
      ctx.beginPath();
      ctx.roundRect(-4.1, -11.6, 1.55, 7.6, [0.7, 0.7, 0.2, 0.2]);
      ctx.fill();
      // Antenna ribbing & gold SMA connector nut
      ctx.fillStyle = '#09090b';
      for (let ay = -10.4; ay <= -6.2; ay += 1.0) {
        ctx.fillRect(-4.1, ay, 1.55, 0.32);
      }
      ctx.fillStyle = '#ca8a04';
      ctx.fillRect(-4.3, -5.0, 1.95, 0.85);

      // Top knurled rotary channel & volume knobs
      for (const [kx, kw, kh] of [[-0.6, 1.9, 2.0], [2.1, 1.7, 1.7]] as Array<[number, number, number]>) {
        ctx.fillStyle = '#27272a';
        ctx.beginPath();
        ctx.roundRect(kx, -4.4 - kh, kw, kh + 0.3, 0.4);
        ctx.fill();
        ctx.fillStyle = '#52525b';
        ctx.fillRect(kx + 0.35, -4.4 - kh + 0.2, 0.35, kh - 0.3);
        ctx.fillRect(kx + kw - 0.65, -4.4 - kh + 0.2, 0.35, kh - 0.3);
      }

      // High-visibility safety-orange textured side PTT button
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.roundRect(-6.0, -2.5, 1.1, 4.2, 0.45);
      ctx.fill();
      ctx.fillStyle = '#fdba74';
      ctx.fillRect(-5.8, -2.0, 0.35, 3.2);

      // Rugged composite charcoal transceiver chassis with beveled side grips
      const bodyGrad = ctx.createLinearGradient(-5.2, -4.5, 5.2, 8.0);
      bodyGrad.addColorStop(0.0, '#3f3f46');
      bodyGrad.addColorStop(0.28, '#27272a');
      bodyGrad.addColorStop(0.75, '#18181b');
      bodyGrad.addColorStop(1.0, '#09090b');
      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.roundRect(-5.1, -4.4, 10.2, 12.6, 1.45);
      ctx.fill();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
      ctx.lineWidth = 0.35;
      ctx.stroke();

      // Side rubber anti-slip bumper indents
      ctx.fillStyle = '#09090b';
      for (let gy = 0.5; gy <= 5.5; gy += 1.3) {
        ctx.fillRect(-5.2, gy, 0.65, 0.65);
        ctx.fillRect(4.55, gy, 0.65, 0.65);
      }

      // Glowing green RX/TX status LED above screen
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(-3.2, -3.5, 0.42, 0, Math.PI * 2);
      ctx.fill();

      // Recessed amber-backlit dot-matrix LCD channel screen
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.roundRect(-3.9, -2.7, 7.8, 3.4, 0.55);
      ctx.fill();
      const lcdGrad = ctx.createLinearGradient(-3.4, -2.3, 3.4, 0.4);
      lcdGrad.addColorStop(0.0, '#fbbf24');
      lcdGrad.addColorStop(0.6, '#f97316');
      lcdGrad.addColorStop(1.0, '#c2410c');
      ctx.fillStyle = lcdGrad;
      ctx.beginPath();
      ctx.roundRect(-3.4, -2.3, 6.8, 2.6, 0.35);
      ctx.fill();

      // LCD signal bars & frequency segment readout
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(-2.8, -0.7, 0.45, 0.6);
      ctx.fillRect(-2.15, -1.1, 0.45, 1.0);
      ctx.fillRect(-1.5, -1.6, 0.45, 1.5);
      ctx.fillRect(-0.3, -1.6, 3.0, 0.65);
      ctx.fillRect(0.4, -0.65, 2.3, 0.42);

      // Perforated heavy speaker grille panel
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.roundRect(-3.7, 1.4, 7.4, 3.4, 0.65);
      ctx.fill();
      ctx.strokeStyle = '#3f3f46';
      ctx.lineWidth = 0.42;
      for (let sy = 2.05; sy <= 4.2; sy += 0.72) {
        ctx.beginPath();
        ctx.moveTo(-3.1, sy);
        ctx.lineTo(3.1, sy);
        ctx.stroke();
      }

      // Lower illuminated rubberized tactical keypad matrix (3×2)
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 3; col++) {
          ctx.fillStyle = row === 0 && col === 0 ? '#ea580c' : '#3f3f46';
          ctx.beginPath();
          ctx.roundRect(-3.2 + col * 2.35, 5.45 + row * 1.15, 1.7, 0.75, 0.25);
          ctx.fill();
        }
      }
      return true;
    }

    // =========================================================================
    // 12. WINDPROOF BRASS LIGHTER ZIPPO (Зажигалка Zippo и пустая)
    // =========================================================================
    case 'zippo_lighter':
    case 'zippo_empty': {
      const isEmpty = itemId === 'zippo_empty';
      drawShadow(ctx, 6.6, 2.4, 8.2, 0.26);

      // Hinged open brass lid tilted back to top-left
      ctx.save();
      ctx.translate(-4.3, -0.6);
      ctx.rotate(-0.92);
      const lidGrad = ctx.createLinearGradient(0, -4.6, 8.4, 0);
      lidGrad.addColorStop(0.0, '#78350f');
      lidGrad.addColorStop(0.32, '#f59e0b');
      lidGrad.addColorStop(0.65, '#fef08a');
      lidGrad.addColorStop(1.0, '#92400e');
      ctx.fillStyle = lidGrad;
      ctx.beginPath();
      ctx.roundRect(0, -4.2, 8.4, 4.2, [1.2, 1.2, 0.3, 0.3]);
      ctx.fill();
      ctx.strokeStyle = '#713f12';
      ctx.lineWidth = 0.32;
      ctx.stroke();
      // Dark underside interior of open lid
      ctx.fillStyle = '#451a03';
      ctx.fillRect(0.4, -0.65, 7.6, 0.65);
      ctx.restore();

      // Perforated brushed stainless steel windproof chimney insert
      const chGrad = ctx.createLinearGradient(-2.4, 0, 2.8, 0);
      chGrad.addColorStop(0.0, '#64748b');
      chGrad.addColorStop(0.35, '#f1f5f9');
      chGrad.addColorStop(0.75, '#94a3b8');
      chGrad.addColorStop(1.0, '#334155');
      ctx.fillStyle = chGrad;
      ctx.beginPath();
      ctx.roundRect(-2.4, -5.2, 4.8, 4.7, 0.35);
      ctx.fill();
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 0.28;
      ctx.stroke();

      // 6 precision circular air-intake chimney holes (2 rows × 3 cols)
      ctx.fillStyle = '#0f172a';
      for (const hx of [-1.35, 0.0, 1.35]) {
        for (const hy of [-3.95, -2.45]) {
          ctx.beginPath();
          ctx.arc(hx, hy, 0.42, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Serrated steel flint spark wheel & brass cam rivet on right of chimney
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(3.05, -3.55, 1.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 0.3;
      ctx.setLineDash([0.45, 0.35]);
      ctx.beginPath();
      ctx.arc(3.05, -3.55, 1.15, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(3.05, -3.55, 0.45, 0, Math.PI * 2);
      ctx.fill();

      // Steel spring cam clip on left side of chimney
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(-3.2, -3.5, 0.9, 2.4);

      if (!isEmpty) {
        // Warm luminous ambient flame glow halo
        const glow = ctx.createRadialGradient(0.0, -7.8, 0.5, 0.0, -7.8, 5.2);
        glow.addColorStop(0.0, 'rgba(254, 240, 138, 0.58)');
        glow.addColorStop(0.5, 'rgba(249, 115, 22, 0.22)');
        glow.addColorStop(1.0, 'rgba(249, 115, 22, 0.0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0.0, -7.8, 5.2, 0, Math.PI * 2);
        ctx.fill();

        // Outer amber-orange teardrop flame
        const flameGrad = ctx.createLinearGradient(0, -11.4, 0, -4.8);
        flameGrad.addColorStop(0.0, '#fb923c');
        flameGrad.addColorStop(0.45, '#f59e0b');
        flameGrad.addColorStop(0.85, '#fef08a');
        flameGrad.addColorStop(1.0, '#38bdf8');
        ctx.fillStyle = flameGrad;
        ctx.beginPath();
        ctx.moveTo(0.0, -11.4);
        ctx.bezierCurveTo(2.4, -8.8, 2.3, -5.8, 0.0, -5.0);
        ctx.bezierCurveTo(-2.3, -5.8, -2.4, -8.8, 0.0, -11.4);
        ctx.closePath();
        ctx.fill();

        // Incandescent white-yellow inner core
        ctx.fillStyle = '#fefce8';
        ctx.beginPath();
        ctx.ellipse(0.0, -7.6, 0.72, 1.75, 0, 0, Math.PI * 2);
        ctx.fill();

        // Electric blue combustion base cone
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.ellipse(0.0, -5.5, 0.85, 0.65, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Dry blackened charred cotton wick with frayed carbon fibers (NO flame)
        ctx.strokeStyle = '#18181b';
        ctx.lineWidth = 0.85;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0.0, -5.0);
        ctx.quadraticCurveTo(-0.25, -6.2, 0.15, -7.2);
        ctx.stroke();

        // Subtle soot smudge on chimney rim & frayed ash fibers
        ctx.fillStyle = 'rgba(24, 24, 27, 0.45)';
        ctx.beginPath();
        ctx.ellipse(0.0, -5.1, 1.3, 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#52525b';
        ctx.lineWidth = 0.3;
        ctx.beginPath();
        ctx.moveTo(0.1, -7.0);
        ctx.lineTo(-0.5, -7.5);
        ctx.moveTo(0.1, -7.0);
        ctx.lineTo(0.6, -7.4);
        ctx.stroke();
      }

      // Main brushed solid-brass Zippo rectangular case
      const brGrad = ctx.createLinearGradient(-4.4, 0, 4.4, 0);
      brGrad.addColorStop(0.0, '#78350f');
      brGrad.addColorStop(0.2, '#fde047');
      brGrad.addColorStop(0.45, '#eab308');
      brGrad.addColorStop(0.78, '#b45309');
      brGrad.addColorStop(1.0, '#713f12');
      ctx.fillStyle = brGrad;
      ctx.beginPath();
      ctx.roundRect(-4.3, -0.6, 8.6, 8.4, [0.3, 0.3, 1.15, 1.15]);
      ctx.fill();

      // Fine horizontal brushed brass texture lines & engraved corner diagonal stripes
      ctx.strokeStyle = 'rgba(255, 251, 235, 0.18)';
      ctx.lineWidth = 0.22;
      for (let by = 0.2; by <= 7.2; by += 0.9) {
        ctx.beginPath();
        ctx.moveTo(-4.0, by);
        ctx.lineTo(4.0, by);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(120, 53, 15, 0.55)';
      ctx.lineWidth = 0.45;
      ctx.beginPath();
      ctx.moveTo(-4.1, 1.6); ctx.lineTo(-1.9, -0.5);
      ctx.moveTo(-4.1, 2.5); ctx.lineTo(-1.0, -0.5);
      ctx.stroke();

      // External 5-barrel brass hinge on left rim
      ctx.fillStyle = '#ca8a04';
      ctx.beginPath();
      ctx.roundRect(-4.95, -1.2, 0.85, 2.4, 0.3);
      ctx.fill();
      ctx.fillStyle = '#713f12';
      ctx.fillRect(-4.95, -0.5, 0.85, 0.28);
      ctx.fillRect(-4.95, 0.35, 0.85, 0.28);

      // Chamfer highlight on case edge
      ctx.strokeStyle = 'rgba(254, 249, 195, 0.42)';
      ctx.lineWidth = 0.32;
      ctx.beginPath();
      ctx.roundRect(-4.15, -0.45, 8.3, 8.1, [0.25, 0.25, 1.0, 1.0]);
      ctx.stroke();
      return true;
    }

    // =========================================================================
    // 13. MILITARY MAGNETIC COMPASS (Армейский компас)
    // =========================================================================
    case 'compass': {
      drawShadow(ctx, 7.6, 2.8, 8.2, 0.28);

      // Top antique-brass suspension lanyard ring & crown stem
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 1.05;
      ctx.beginPath();
      ctx.arc(0, -8.5, 1.9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 0.35;
      ctx.beginPath();
      ctx.arc(0, -8.5, 1.9, Math.PI * 1.0, Math.PI * 1.6);
      ctx.stroke();

      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.roundRect(-1.1, -7.7, 2.2, 1.5, 0.35);
      ctx.fill();

      // Heavy milled antique-brass outer case with knurled bezel edge
      const outerGrad = ctx.createRadialGradient(-2.6, -2.6, 0.8, 0, 0.5, 8.0);
      outerGrad.addColorStop(0.0, '#fef08a');
      outerGrad.addColorStop(0.45, '#d97706');
      outerGrad.addColorStop(0.85, '#92400e');
      outerGrad.addColorStop(1.0, '#451a03');
      ctx.fillStyle = outerGrad;
      ctx.beginPath();
      ctx.arc(0, 0.5, 7.6, 0, Math.PI * 2);
      ctx.fill();

      // Milled grip notches around brass bezel perimeter
      ctx.strokeStyle = 'rgba(69, 26, 3, 0.52)';
      ctx.lineWidth = 0.45;
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 6.9, 0.5 + Math.sin(a) * 6.9);
        ctx.lineTo(Math.cos(a) * 7.6, 0.5 + Math.sin(a) * 7.6);
        ctx.stroke();
      }

      // Recessed dark bevel lip
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.arc(0, 0.5, 6.45, 0, Math.PI * 2);
      ctx.fill();

      // Warm ivory vintage compass card dial face
      const dialGrad = ctx.createRadialGradient(-1.4, -1.0, 0.5, 0, 0.5, 6.2);
      dialGrad.addColorStop(0.0, '#fffbeb');
      dialGrad.addColorStop(0.75, '#fef3c7');
      dialGrad.addColorStop(1.0, '#d6c39c');
      ctx.fillStyle = dialGrad;
      ctx.beginPath();
      ctx.arc(0, 0.5, 6.05, 0, Math.PI * 2);
      ctx.fill();

      // Degree graduation ticks around dial perimeter
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const isCard = i % 4 === 0;
        const rIn = isCard ? 4.55 : 5.1;
        ctx.strokeStyle = isCard ? '#78350f' : 'rgba(120, 53, 15, 0.45)';
        ctx.lineWidth = isCard ? 0.5 : 0.28;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * rIn, 0.5 + Math.sin(a) * rIn);
        ctx.lineTo(Math.cos(a) * 5.8, 0.5 + Math.sin(a) * 5.8);
        ctx.stroke();
      }

      // Subtle 8-point compass rose star engraved on card
      ctx.fillStyle = 'rgba(146, 64, 14, 0.16)';
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const r = i % 2 === 0 ? 4.2 : 1.5;
        const px = Math.cos(a) * r;
        const py = 0.5 + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();

      // Crisp crimson North cardinal triangle marker at top
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(0, -5.2);
      ctx.lineTo(-0.7, -3.9);
      ctx.lineTo(0.7, -3.9);
      ctx.closePath();
      ctx.fill();

      // Faceted 3D split-shaded diamond magnetic needle (tilted slightly off-vertical for realism)
      ctx.save();
      ctx.translate(0, 0.5);
      ctx.rotate(0.32);

      // Needle drop shadow on card
      ctx.fillStyle = 'rgba(15, 23, 42, 0.22)';
      ctx.beginPath();
      ctx.moveTo(0.3, -4.6);
      ctx.lineTo(1.5, 0.3);
      ctx.lineTo(0.3, 4.9);
      ctx.lineTo(-0.9, 0.3);
      ctx.closePath();
      ctx.fill();

      // North half (split bright crimson / deep ruby)
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(0, -4.9);
      ctx.lineTo(-1.25, 0);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#991b1b';
      ctx.beginPath();
      ctx.moveTo(0, -4.9);
      ctx.lineTo(1.25, 0);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fill();

      // South half (split blued steel / deep navy)
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(0, 4.9);
      ctx.lineTo(-1.25, 0);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#1e3a8a';
      ctx.beginPath();
      ctx.moveTo(0, 4.9);
      ctx.lineTo(1.25, 0);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fill();

      // Brass center jewel cap
      drawLitSphere(ctx, 0, 0, 1.05, '#fef08a', '#ca8a04', '#713f12', undefined, 0.65);
      ctx.restore();

      // Domed crystal glass curved specular reflection arc
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.lineWidth = 0.85;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, 0.5, 4.9, Math.PI * 1.12, Math.PI * 1.56);
      ctx.stroke();
      return true;
    }

    // =========================================================================
    // 14. REINFORCED TOWING ROPE 5T (Буксировочный трос 5Т)
    // =========================================================================
    case 'tow_rope': {
      drawShadow(ctx, 8.8, 3.0, 7.8, 0.28);

      // Coiled heavy-duty safety-orange woven polyester webbing loops
      const drawCoilRing = (cx: number, cy: number, rx: number, ry: number, thick: number) => {
        // Dark underside shadow rim
        ctx.strokeStyle = '#9a3412';
        ctx.lineWidth = thick + 0.6;
        ctx.beginPath();
        ctx.ellipse(cx, cy + 0.45, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Main vivid hi-vis orange webbing
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = thick;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Black woven structural capacity stripe down center of webbing
        ctx.strokeStyle = '#18181b';
        ctx.lineWidth = thick * 0.28;
        ctx.setLineDash([1.1, 0.7]);
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Top fiber catchlight
        ctx.strokeStyle = 'rgba(255, 237, 213, 0.42)';
        ctx.lineWidth = 0.35;
        ctx.beginPath();
        ctx.ellipse(cx, cy - thick * 0.22, rx, ry, 0, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
      };

      drawCoilRing(-0.6, 0.6, 6.8, 5.5, 2.0);
      drawCoilRing(-0.6, 0.4, 4.8, 3.8, 1.85);
      drawCoilRing(-0.6, 0.2, 2.8, 2.2, 1.65);

      // Heavy black velcro keeper strap cinching the coiled loops on left
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.roundRect(-8.2, -1.2, 5.4, 2.7, 0.55);
      ctx.fill();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 0.32;
      ctx.strokeRect(-7.8, -0.8, 4.6, 1.9);

      // Reinforced box-stitched nylon eye tab leading to forged hook
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.moveTo(2.4, -2.4);
      ctx.lineTo(5.6, -4.6);
      ctx.lineTo(6.8, -3.0);
      ctx.lineTo(3.6, -0.8);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 0.32;
      ctx.beginPath();
      ctx.moveTo(3.2, -2.4); ctx.lineTo(5.8, -3.1);
      ctx.moveTo(3.6, -1.4); ctx.lineTo(5.2, -3.9);
      ctx.stroke();

      // Forged galvanized steel clevis safety hook protruding top-right
      const hookGrad = ctx.createLinearGradient(4.5, -7.5, 10.2, 0.5);
      hookGrad.addColorStop(0.0, '#f8fafc');
      hookGrad.addColorStop(0.42, '#94a3b8');
      hookGrad.addColorStop(1.0, '#334155');
      ctx.strokeStyle = hookGrad;
      ctx.lineWidth = 1.65;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(5.8, -4.0);
      ctx.lineTo(7.8, -5.8);
      ctx.bezierCurveTo(10.4, -6.2, 10.8, -1.8, 8.2, -0.4);
      ctx.quadraticCurveTo(6.6, 0.2, 5.8, -1.0);
      ctx.stroke();

      // Steel clevis cross-pin bolt
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.arc(6.0, -3.9, 0.72, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.arc(5.85, -4.05, 0.28, 0, Math.PI * 2);
      ctx.fill();

      // Gold anodized spring-loaded safety latch across hook throat
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 0.75;
      ctx.beginPath();
      ctx.moveTo(7.4, -5.1);
      ctx.lineTo(6.1, -1.2);
      ctx.stroke();
      return true;
    }

    // =========================================================================
    // 15. SANDBAG 1KG (Мешок с песком — противопожарный инструмент)
    // =========================================================================
    case 'sandbag': {
      drawShadow(ctx, 8.6, 3.0, 8.2, 0.3);

      // Gathered pleated burlap top ears/ruffle
      const topGrad = ctx.createLinearGradient(-4.5, -10.5, 4.5, -6.5);
      topGrad.addColorStop(0.0, '#e5b87b');
      topGrad.addColorStop(0.5, '#b47838');
      topGrad.addColorStop(1.0, '#784819');
      ctx.fillStyle = topGrad;
      ctx.beginPath();
      ctx.moveTo(-2.6, -6.6);
      ctx.quadraticCurveTo(-4.6, -9.8, -3.0, -10.6);
      ctx.quadraticCurveTo(-0.8, -9.2, 0.2, -10.5);
      ctx.quadraticCurveTo(1.8, -9.0, 3.4, -10.4);
      ctx.quadraticCurveTo(4.6, -9.4, 2.6, -6.6);
      ctx.closePath();
      ctx.fill();

      // Plump heavy gravity-sagged woven jute/burlap sack body
      const drawSackPath = () => {
        ctx.beginPath();
        ctx.moveTo(-2.9, -6.6);
        ctx.bezierCurveTo(-7.2, -4.8, -8.8, 1.2, -7.6, 5.8);
        ctx.bezierCurveTo(-6.8, 8.4, 6.8, 8.4, 7.6, 5.8);
        ctx.bezierCurveTo(8.8, 1.2, 7.2, -4.8, 2.9, -6.6);
        ctx.closePath();
      };

      const sackGrad = ctx.createRadialGradient(-2.8, -1.8, 0.8, 0.4, 1.5, 9.8);
      sackGrad.addColorStop(0.0, '#e9c38d');
      sackGrad.addColorStop(0.45, '#c28542');
      sackGrad.addColorStop(0.82, '#8b5420');
      sackGrad.addColorStop(1.0, '#522c0d');
      ctx.fillStyle = sackGrad;
      drawSackPath();
      ctx.fill();

      ctx.save();
      drawSackPath();
      ctx.clip();

      // Coarse authentic directional jute burlap weave mesh
      ctx.strokeStyle = 'rgba(69, 26, 3, 0.24)';
      ctx.lineWidth = 0.34;
      for (let x = -7.2; x <= 7.2; x += 1.45) {
        ctx.beginPath();
        ctx.moveTo(x * 0.45, -6.8);
        ctx.quadraticCurveTo(x * 1.12, 1.0, x * 0.96, 8.4);
        ctx.stroke();
      }
      for (let y = -4.6; y <= 7.2; y += 1.4) {
        ctx.beginPath();
        ctx.moveTo(-8.6, y);
        ctx.quadraticCurveTo(0, y + 1.15, 8.6, y);
        ctx.stroke();
      }

      // Soft gravity drapery folds radiating down from tied neck
      ctx.strokeStyle = 'rgba(69, 26, 3, 0.32)';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(-1.8, -6.2); ctx.quadraticCurveTo(-4.4, -1.5, -4.2, 3.0);
      ctx.moveTo(0.2, -6.2);  ctx.quadraticCurveTo(0.6, -1.0, 0.0, 3.8);
      ctx.moveTo(2.0, -6.2);  ctx.quadraticCurveTo(4.6, -1.8, 4.8, 2.6);
      ctx.stroke();

      // Stitched crimson fire-safety utility band & stencil patch on front
      ctx.fillStyle = 'rgba(153, 27, 27, 0.72)';
      ctx.fillRect(-8.4, 0.6, 16.8, 2.6);
      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.roundRect(-3.6, 0.95, 7.2, 1.9, 0.3);
      ctx.fill();
      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(-2.6, 1.45, 5.2, 0.42);
      ctx.fillRect(-1.8, 2.15, 3.6, 0.32);

      // Subtle top-left softbox highlight
      ctx.fillStyle = 'rgba(255, 251, 235, 0.16)';
      ctx.beginPath();
      ctx.ellipse(-3.2, -1.8, 2.8, 4.2, 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Multi-wrap twisted hemp rope neck tie + dangling cord ends
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1.7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-3.1, -6.4);
      ctx.quadraticCurveTo(0, -5.8, 3.1, -6.4);
      ctx.stroke();
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 0.9;
      ctx.setLineDash([0.8, 0.55]);
      ctx.beginPath();
      ctx.moveTo(-3.0, -6.4);
      ctx.quadraticCurveTo(0, -5.8, 3.0, -6.4);
      ctx.stroke();
      ctx.setLineDash([]);

      // Rope knot & tail ends
      ctx.strokeStyle = '#d9a05b';
      ctx.lineWidth = 0.65;
      ctx.beginPath();
      ctx.moveTo(2.4, -6.2);
      ctx.quadraticCurveTo(4.2, -5.0, 4.6, -3.2);
      ctx.moveTo(2.4, -6.2);
      ctx.quadraticCurveTo(3.4, -4.4, 2.8, -2.8);
      ctx.stroke();

      // Spilled fine golden-cream silica sand grains pooling at base edge
      for (let i = 0; i < 11; i++) {
        const sx = -5.5 + hash01('sandbag', i * 3) * 11.2;
        const sy = 6.6 + hash01('sandbag', i * 3 + 1) * 1.9;
        const sr = 0.24 + hash01('sandbag', i * 3 + 2) * 0.32;
        ctx.fillStyle = i % 2 === 0 ? '#fef08a' : '#e5c17d';
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fill();
      }
      return true;
    }

    // =========================================================================
    // 16. OILY SHOP RAG (Промасленная ветошь механика)
    // =========================================================================
    case 'rag': {
      drawShadow(ctx, 8.6, 3.1, 7.6, 0.28);

      // Lower folded denim-blue heavy twill cotton mechanic cloth
      const drawBaseFold = () => {
        ctx.beginPath();
        ctx.moveTo(-7.8, -3.8);
        ctx.bezierCurveTo(-3.2, -6.4, 3.4, -6.0, 7.4, -4.2);
        ctx.bezierCurveTo(8.8, -0.5, 8.2, 4.4, 6.2, 6.4);
        ctx.bezierCurveTo(1.2, 7.6, -3.6, 7.2, -7.2, 5.4);
        ctx.bezierCurveTo(-8.8, 2.2, -8.4, -1.4, -7.8, -3.8);
        ctx.closePath();
      };

      const baseGrad = ctx.createRadialGradient(-2.0, -2.0, 0.6, 0, 0.5, 9.2);
      baseGrad.addColorStop(0.0, '#3b82f6');
      baseGrad.addColorStop(0.5, '#1d4ed8');
      baseGrad.addColorStop(1.0, '#172554');
      ctx.fillStyle = baseGrad;
      drawBaseFold();
      ctx.fill();

      ctx.save();
      drawBaseFold();
      ctx.clip();

      // Diagonal cotton twill fabric weave texture
      ctx.strokeStyle = 'rgba(219, 234, 254, 0.14)';
      ctx.lineWidth = 0.3;
      for (let d = -16; d <= 16; d += 1.35) {
        ctx.beginPath();
        ctx.moveTo(d, -7);
        ctx.lineTo(d + 10, 8);
        ctx.stroke();
      }

      // Upper overlapping cloth flap with soft cast shadow underneath
      ctx.fillStyle = 'rgba(15, 23, 42, 0.42)';
      ctx.beginPath();
      ctx.moveTo(-6.2, -2.6);
      ctx.quadraticCurveTo(0.2, -4.4, 6.4, -2.2);
      ctx.quadraticCurveTo(6.8, 2.6, 4.8, 5.0);
      ctx.quadraticCurveTo(-0.6, 6.0, -5.4, 4.4);
      ctx.closePath();
      ctx.fill();

      const topGrad = ctx.createLinearGradient(-5.5, -4.0, 5.5, 4.5);
      topGrad.addColorStop(0.0, '#60a5fa');
      topGrad.addColorStop(0.45, '#2563eb');
      topGrad.addColorStop(1.0, '#1e3a8a');
      ctx.fillStyle = topGrad;
      ctx.beginPath();
      ctx.moveTo(-6.4, -3.0);
      ctx.quadraticCurveTo(0.0, -4.8, 6.0, -2.6);
      ctx.quadraticCurveTo(6.4, 2.0, 4.4, 4.4);
      ctx.quadraticCurveTo(-0.8, 5.4, -5.6, 3.8);
      ctx.closePath();
      ctx.fill();

      // Organic drapery crease shadows & fabric highlight ridges
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.36)';
      ctx.lineWidth = 0.65;
      ctx.beginPath();
      ctx.moveTo(-5.2, -1.2); ctx.quadraticCurveTo(-0.5, 0.8, 5.2, -0.8);
      ctx.moveTo(-4.4, 2.2);  ctx.quadraticCurveTo(0.4, 3.6, 4.2, 1.8);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(191, 219, 254, 0.35)';
      ctx.lineWidth = 0.4;
      ctx.beginPath();
      ctx.moveTo(-5.0, -1.6); ctx.quadraticCurveTo(-0.5, 0.3, 5.0, -1.2);
      ctx.stroke();

      // Overlocked perimeter hem stitching
      ctx.strokeStyle = 'rgba(147, 197, 253, 0.55)';
      ctx.lineWidth = 0.42;
      ctx.setLineDash([0.9, 0.7]);
      ctx.beginPath();
      ctx.moveTo(-6.8, -3.2);
      ctx.quadraticCurveTo(0, -5.1, 6.4, -3.4);
      ctx.quadraticCurveTo(7.4, 1.5, 5.5, 5.2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Rich realistic dark motor-oil & carbon-grease blotches with wet amber rim
      const drawOilBlotch = (ox: number, oy: number, rx: number, ry: number, seed: number) => {
        // Golden-amber seeping oil halo
        ctx.fillStyle = 'rgba(180, 83, 9, 0.46)';
        drawOrganicBlobPath(ctx, ox, oy, rx * 1.22, ry * 1.22, seed, 0.16, 9);
        ctx.fill();
        // Dense black used-oil core
        const og = ctx.createRadialGradient(ox - rx * 0.25, oy - ry * 0.25, 0.2, ox, oy, Math.max(rx, ry));
        og.addColorStop(0.0, 'rgba(30, 41, 59, 0.82)');
        og.addColorStop(0.65, 'rgba(9, 9, 11, 0.90)');
        og.addColorStop(1.0, 'rgba(15, 23, 42, 0.45)');
        ctx.fillStyle = og;
        drawOrganicBlobPath(ctx, ox, oy, rx, ry, seed + 5, 0.15, 9);
        ctx.fill();
        // Wet iridescent oil specular glint
        ctx.fillStyle = 'rgba(147, 197, 253, 0.26)';
        ctx.beginPath();
        ctx.ellipse(ox - rx * 0.25, oy - ry * 0.28, rx * 0.35, ry * 0.18, -0.3, 0, Math.PI * 2);
        ctx.fill();
      };

      drawOilBlotch(-1.8, -0.2, 2.8, 2.0, 21);
      drawOilBlotch(2.6, 1.5, 1.75, 1.35, 43);
      drawOilBlotch(3.4, -1.6, 1.1, 0.9, 67);
      ctx.restore();
      return true;
    }

    default:
      return false;
  }
}

// Keep unused imports clean if needed in future expansions
void drawLitEllipse;
void adjustHex;
void hexToRgba;
