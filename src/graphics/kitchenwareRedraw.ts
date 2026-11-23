// High-Detail Procedural 2.5D Studio Canvas Models for All Kitchenware & Kitchen Containers
// Redrawn from scratch: pots, kettles, skillets, plates, bowls, mugs, cups, cutlery, soup bowls, clay pots.

import {
  drawShadow,
  drawGlossBand,
  drawLitSphere,
  drawBotanicalLeaf,
  hash01
} from './itemGraphicShared';

export function drawKitchenwareRedrawItem(
  ctx: CanvasRenderingContext2D,
  itemId: string,
  item?: any
): boolean {
  switch (itemId) {
    // =========================================================================
    // 1. ENAMEL POT (Эмалированная кастрюля)
    // =========================================================================
    case 'kitchen_pot_enamel': {
      drawShadow(ctx, 9.4, 3.0, 8.2, 0.3);

      // Black Bakelite side loop handles with brushed steel mounting brackets
      for (const side of [-1, 1]) {
        ctx.strokeStyle = '#18181b';
        ctx.lineWidth = 1.65;
        ctx.beginPath();
        ctx.arc(side * 8.2, -0.5, 2.35, side < 0 ? Math.PI * 0.52 : -Math.PI * 0.48, side < 0 ? Math.PI * 1.48 : Math.PI * 0.48);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.22)';
        ctx.lineWidth = 0.4;
        ctx.beginPath();
        ctx.arc(side * 8.2, -0.7, 2.35, side < 0 ? Math.PI * 0.75 : -Math.PI * 0.25, side < 0 ? Math.PI * 1.25 : Math.PI * 0.15);
        ctx.stroke();
        // Steel bracket plates
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(side < 0 ? -8.6 : 7.6, -2.5, 1.0, 1.0);
        ctx.fillRect(side < 0 ? -8.6 : 7.6, 0.6, 1.0, 1.0);
      }

      // Glossy cherry-red vitreous enamel cylindrical pot belly
      const bodyGrad = ctx.createLinearGradient(-8.0, 0, 8.0, 0);
      bodyGrad.addColorStop(0.0, '#7f1d1d');
      bodyGrad.addColorStop(0.18, '#f87171');
      bodyGrad.addColorStop(0.38, '#dc2626');
      bodyGrad.addColorStop(0.78, '#b91c1c');
      bodyGrad.addColorStop(1.0, '#450a0a');
      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.moveTo(-7.8, -4.6);
      ctx.lineTo(7.8, -4.6);
      ctx.quadraticCurveTo(8.2, 1.8, 7.2, 6.2);
      ctx.quadraticCurveTo(0, 8.2, -7.2, 6.2);
      ctx.quadraticCurveTo(-8.2, 1.8, -7.8, -4.6);
      ctx.closePath();
      ctx.fill();

      // Hand-painted white folk daisy/polka ornament band across front
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(-7.8, -4.6);
      ctx.lineTo(7.8, -4.6);
      ctx.quadraticCurveTo(8.2, 1.8, 7.2, 6.2);
      ctx.quadraticCurveTo(0, 8.2, -7.2, 6.2);
      ctx.quadraticCurveTo(-8.2, 1.8, -7.8, -4.6);
      ctx.closePath();
      ctx.clip();

      for (const [fx, fy, sc] of [[-4.3, 0.9, 0.85], [0.0, 2.0, 1.0], [4.3, 0.9, 0.85]] as Array<[number, number, number]>) {
        // 5 tiny white porcelain flower petals
        ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
        for (let p = 0; p < 5; p++) {
          const a = (p / 5) * Math.PI * 2 - Math.PI * 0.5;
          ctx.beginPath();
          ctx.arc(fx + Math.cos(a) * 0.95 * sc, fy + Math.sin(a) * 0.95 * sc, 0.55 * sc, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(fx, fy, 0.48 * sc, 0, Math.PI * 2);
        ctx.fill();
      }

      // Glossy vertical enamel softbox streak
      const glGrad = ctx.createLinearGradient(-5.8, 0, -2.8, 0);
      glGrad.addColorStop(0.0, 'rgba(255,255,255,0)');
      glGrad.addColorStop(0.45, 'rgba(255,255,255,0.34)');
      glGrad.addColorStop(1.0, 'rgba(255,255,255,0)');
      ctx.fillStyle = glGrad;
      ctx.fillRect(-6.0, -4.6, 3.4, 12.2);
      ctx.restore();

      // Rolled stainless steel protective rim lip
      const rimGrad = ctx.createLinearGradient(-8.2, 0, 8.2, 0);
      rimGrad.addColorStop(0.0, '#64748b');
      rimGrad.addColorStop(0.28, '#f8fafc');
      rimGrad.addColorStop(0.65, '#94a3b8');
      rimGrad.addColorStop(1.0, '#334155');
      ctx.strokeStyle = rimGrad;
      ctx.lineWidth = 0.95;
      ctx.beginPath();
      ctx.ellipse(0, -4.6, 7.9, 2.05, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Domed cherry-red enamel lid seated cleanly on rim
      const lidGrad = ctx.createRadialGradient(-2.4, -6.2, 0.5, 0, -5.2, 8.2);
      lidGrad.addColorStop(0.0, '#fca5a5');
      lidGrad.addColorStop(0.35, '#ef4444');
      lidGrad.addColorStop(0.8, '#b91c1c');
      lidGrad.addColorStop(1.0, '#7f1d1d');
      ctx.fillStyle = lidGrad;
      ctx.beginPath();
      ctx.moveTo(-7.6, -4.8);
      ctx.bezierCurveTo(-6.8, -8.0, 6.8, -8.0, 7.6, -4.8);
      ctx.quadraticCurveTo(0, -3.2, -7.6, -4.8);
      ctx.closePath();
      ctx.fill();

      // Lid specular highlight arc
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.lineWidth = 0.55;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-4.8, -5.9);
      ctx.quadraticCurveTo(-2.4, -7.0, 0.4, -7.0);
      ctx.stroke();

      // Contoured black Bakelite lid knob with stainless center screw
      ctx.fillStyle = '#09090b';
      ctx.fillRect(-0.8, -8.2, 1.6, 1.3);
      drawLitSphere(ctx, 0, -8.5, 1.55, '#475569', '#18181b', '#020617', undefined, 0.45);
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.arc(0, -8.7, 0.42, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    // =========================================================================
    // 2. STAINLESS STEEL POT (Стальная кастрюля из нержавейки)
    // =========================================================================
    case 'kitchen_pot_steel': {
      drawShadow(ctx, 9.6, 3.0, 8.2, 0.32);

      // Arched tubular 18/10 stainless steel handles with twin rivet plates
      for (const side of [-1, 1]) {
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.65;
        ctx.beginPath();
        ctx.arc(side * 8.1, -0.6, 2.5, side < 0 ? Math.PI * 0.55 : -Math.PI * 0.45, side < 0 ? Math.PI * 1.45 : Math.PI * 0.45);
        ctx.stroke();
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 0.55;
        ctx.beginPath();
        ctx.arc(side * 8.1, -0.9, 2.5, side < 0 ? Math.PI * 0.72 : -Math.PI * 0.28, side < 0 ? Math.PI * 1.28 : Math.PI * 0.12);
        ctx.stroke();
      }

      // Multi-ply brushed & mirror-banded stainless steel body
      const stGrad = ctx.createLinearGradient(-8.0, 0, 8.0, 0);
      stGrad.addColorStop(0.0, '#475569');
      stGrad.addColorStop(0.14, '#e2e8f0');
      stGrad.addColorStop(0.28, '#ffffff');
      stGrad.addColorStop(0.46, '#94a3b8');
      stGrad.addColorStop(0.68, '#cbd5e1');
      stGrad.addColorStop(0.84, '#f8fafc');
      stGrad.addColorStop(1.0, '#334155');
      ctx.fillStyle = stGrad;
      ctx.beginPath();
      ctx.moveTo(-7.8, -4.4);
      ctx.lineTo(7.8, -4.4);
      ctx.lineTo(7.5, 5.8);
      ctx.quadraticCurveTo(0, 8.0, -7.5, 5.8);
      ctx.closePath();
      ctx.fill();

      // Satin-matte brushed lower band & heavy induction base seam
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(-7.8, -4.4);
      ctx.lineTo(7.8, -4.4);
      ctx.lineTo(7.5, 5.8);
      ctx.quadraticCurveTo(0, 8.0, -7.5, 5.8);
      ctx.closePath();
      ctx.clip();
      ctx.fillStyle = 'rgba(100, 116, 139, 0.22)';
      ctx.fillRect(-8.0, 0.8, 16.0, 4.2);
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.35)';
      ctx.lineWidth = 0.38;
      ctx.beginPath();
      ctx.moveTo(-8.0, 0.8); ctx.quadraticCurveTo(0, 2.2, 8.0, 0.8);
      ctx.moveTo(-8.0, 5.0); ctx.quadraticCurveTo(0, 6.4, 8.0, 5.0);
      ctx.stroke();
      ctx.restore();

      // Rivets on front flanks
      ctx.fillStyle = '#475569';
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(side * 6.8, -1.8, 0.42, 0, Math.PI * 2);
        ctx.arc(side * 6.8, 0.4, 0.42, 0, Math.PI * 2);
        ctx.fill();
      }

      // Tempered borosilicate glass dome lid with rolled steel bezel
      const glassGrad = ctx.createRadialGradient(-2.2, -6.2, 0.4, 0, -4.8, 8.2);
      glassGrad.addColorStop(0.0, 'rgba(240, 249, 255, 0.82)');
      glassGrad.addColorStop(0.5, 'rgba(186, 230, 253, 0.56)');
      glassGrad.addColorStop(0.85, 'rgba(100, 116, 139, 0.62)');
      glassGrad.addColorStop(1.0, 'rgba(51, 65, 85, 0.78)');
      ctx.fillStyle = glassGrad;
      ctx.beginPath();
      ctx.moveTo(-7.9, -4.4);
      ctx.bezierCurveTo(-6.8, -8.4, 6.8, -8.4, 7.9, -4.4);
      ctx.quadraticCurveTo(0, -2.5, -7.9, -4.4);
      ctx.closePath();
      ctx.fill();

      // Steel bezel perimeter around glass lid
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 0.85;
      ctx.beginPath();
      ctx.ellipse(0, -4.4, 7.95, 2.05, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Curved glass dome reflection & tiny chrome-ringed steam vent
      ctx.strokeStyle = 'rgba(255,255,255,0.72)';
      ctx.lineWidth = 0.65;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-5.0, -5.6);
      ctx.quadraticCurveTo(-2.5, -7.2, 0.2, -7.2);
      ctx.stroke();

      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.arc(3.8, -5.5, 0.65, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(3.8, -5.5, 0.32, 0, Math.PI * 2);
      ctx.fill();

      // Arched stainless steel bridge handle on lid top
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.45;
      ctx.beginPath();
      ctx.moveTo(-2.4, -6.9);
      ctx.quadraticCurveTo(0, -9.8, 2.4, -6.9);
      ctx.stroke();
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 0.45;
      ctx.beginPath();
      ctx.moveTo(-2.1, -7.3);
      ctx.quadraticCurveTo(0, -9.5, 2.1, -7.3);
      ctx.stroke();
      return true;
    }

    // =========================================================================
    // 3. ALUMINUM POT (Алюминиевая кастрюля)
    // =========================================================================
    case 'kitchen_pot_aluminum': {
      drawShadow(ctx, 9.2, 2.9, 8.2, 0.28);

      // Stamped flat aluminum ear loop handles
      for (const side of [-1, 1]) {
        ctx.fillStyle = '#94a3b8';
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 0.35;
        ctx.beginPath();
        ctx.roundRect(side < 0 ? -10.3 : 7.5, -2.5, 2.8, 3.6, 0.8);
        ctx.fill();
        ctx.stroke();
        // Cutout grip slot
        ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
        ctx.beginPath();
        ctx.roundRect(side < 0 ? -9.6 : 8.1, -1.6, 1.5, 1.8, 0.45);
        ctx.fill();
      }

      // Matte spun-aluminum cylindrical pot body
      const alGrad = ctx.createLinearGradient(-7.8, 0, 7.8, 0);
      alGrad.addColorStop(0.0, '#64748b');
      alGrad.addColorStop(0.24, '#e2e8f0');
      alGrad.addColorStop(0.52, '#cbd5e1');
      alGrad.addColorStop(0.82, '#94a3b8');
      alGrad.addColorStop(1.0, '#475569');
      ctx.fillStyle = alGrad;
      ctx.beginPath();
      ctx.moveTo(-7.7, -4.4);
      ctx.lineTo(7.7, -4.4);
      ctx.lineTo(7.3, 6.0);
      ctx.quadraticCurveTo(0, 7.8, -7.3, 6.0);
      ctx.closePath();
      ctx.fill();

      // Subtle spun-lathe horizontal brushing micro-striations
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(-7.7, -4.4);
      ctx.lineTo(7.7, -4.4);
      ctx.lineTo(7.3, 6.0);
      ctx.quadraticCurveTo(0, 7.8, -7.3, 6.0);
      ctx.closePath();
      ctx.clip();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
      ctx.lineWidth = 0.25;
      for (let sy = -3.0; sy <= 5.6; sy += 1.15) {
        ctx.beginPath();
        ctx.moveTo(-7.8, sy);
        ctx.quadraticCurveTo(0, sy + 1.0, 7.8, sy);
        ctx.stroke();
      }
      ctx.restore();

      // Twin aluminum handle rivets on sides
      ctx.fillStyle = '#475569';
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(side * 6.8, -1.5, 0.42, 0, Math.PI * 2);
        ctx.arc(side * 6.8, 0.1, 0.42, 0, Math.PI * 2);
        ctx.fill();
      }

      // Flared rolled aluminum rim + low-profile stamped aluminum lid
      const lidGrad = ctx.createRadialGradient(-2.0, -5.6, 0.6, 0, -4.8, 8.2);
      lidGrad.addColorStop(0.0, '#f8fafc');
      lidGrad.addColorStop(0.55, '#cbd5e1');
      lidGrad.addColorStop(1.0, '#64748b');
      ctx.fillStyle = lidGrad;
      ctx.beginPath();
      ctx.ellipse(0, -4.6, 8.1, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 0.38;
      ctx.stroke();

      // Stamped concentric stiffening bead ring on lid
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.42)';
      ctx.lineWidth = 0.4;
      ctx.beginPath();
      ctx.ellipse(0, -4.8, 5.6, 1.4, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Riveted flat-bent aluminum wire loop handle on center of lid
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(-2.1, -5.1);
      ctx.quadraticCurveTo(0, -8.4, 2.1, -5.1);
      ctx.stroke();
      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 0.42;
      ctx.beginPath();
      ctx.moveTo(-1.8, -5.4);
      ctx.quadraticCurveTo(0, -8.0, 1.8, -5.4);
      ctx.stroke();
      return true;
    }

    // =========================================================================
    // 4. CAST IRON DUTCH POT / KAZAN (Чугунный казан / кастрюля)
    // =========================================================================
    case 'kitchen_pot_cast_iron': {
      drawShadow(ctx, 9.6, 3.3, 8.2, 0.42);

      // Thick integrated cast-iron loop handles
      for (const side of [-1, 1]) {
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.roundRect(side < 0 ? -10.4 : 7.4, -2.8, 3.0, 3.4, 1.0);
        ctx.fill();
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 0.38;
        ctx.stroke();
      }

      // Heavy rounded matte-black seasoned cast-iron cauldron belly
      const drawCauldron = () => {
        ctx.beginPath();
        ctx.moveTo(-7.8, -4.2);
        ctx.lineTo(7.8, -4.2);
        ctx.bezierCurveTo(8.8, 1.4, 6.8, 7.6, 0, 7.8);
        ctx.bezierCurveTo(-6.8, 7.6, -8.8, 1.4, -7.8, -4.2);
        ctx.closePath();
      };
      const ciGrad = ctx.createRadialGradient(-2.8, -1.0, 0.8, 0, 1.5, 9.5);
      ciGrad.addColorStop(0.0, '#475569');
      ciGrad.addColorStop(0.32, '#1e293b');
      ciGrad.addColorStop(0.72, '#0f172a');
      ciGrad.addColorStop(1.0, '#020617');
      ctx.fillStyle = ciGrad;
      drawCauldron();
      ctx.fill();

      // Subtle rough sand-cast iron micro-pebble grain texture
      ctx.save();
      drawCauldron();
      ctx.clip();
      for (let i = 0; i < 28; i++) {
        const px = (hash01('castiron', i * 3) - 0.5) * 14.4;
        const py = -3.4 + hash01('castiron', i * 3 + 1) * 10.4;
        ctx.fillStyle = i % 2 === 0 ? 'rgba(148, 163, 184, 0.14)' : 'rgba(2, 6, 23, 0.45)';
        ctx.beginPath();
        ctx.arc(px, py, 0.24, 0, Math.PI * 2);
        ctx.fill();
      }
      // Faint seasoned oil shoulder sheen
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.24)';
      ctx.lineWidth = 0.55;
      ctx.beginPath();
      ctx.moveTo(-6.4, -1.2);
      ctx.quadraticCurveTo(-2.5, 0.4, 2.5, -0.4);
      ctx.stroke();
      ctx.restore();

      // Thick heavy cast-iron lid with concentric stepped basting rings
      const lidGrad = ctx.createRadialGradient(-2.4, -5.8, 0.5, 0, -4.5, 8.4);
      lidGrad.addColorStop(0.0, '#475569');
      lidGrad.addColorStop(0.45, '#1e293b');
      lidGrad.addColorStop(1.0, '#020617');
      ctx.fillStyle = lidGrad;
      ctx.beginPath();
      ctx.ellipse(0, -4.5, 8.2, 2.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 0.45;
      ctx.stroke();

      ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
      ctx.lineWidth = 0.4;
      ctx.beginPath();
      ctx.ellipse(0, -4.7, 5.8, 1.65, 0, 0, Math.PI * 2);
      ctx.ellipse(0, -4.85, 3.6, 1.0, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Gleaming turned solid-brass lid finial knob
      ctx.fillStyle = '#92400e';
      ctx.fillRect(-0.75, -7.2, 1.5, 1.6);
      drawLitSphere(ctx, 0, -7.6, 1.55, '#fef08a', '#eab308', '#854d0e', undefined, 0.72);
      return true;
    }

    // =========================================================================
    // 5. ENAMEL TEA KETTLE (Эмалированный чайник)
    // =========================================================================
    case 'kitchen_kettle_enamel': {
      drawShadow(ctx, 9.0, 3.0, 8.2, 0.3);

      // Graceful curved swan-neck pouring spout on right with dark rim lip
      const spGrad = ctx.createLinearGradient(4.8, -5.2, 10.6, 1.8);
      spGrad.addColorStop(0.0, '#5eead4');
      spGrad.addColorStop(0.5, '#0d9488');
      spGrad.addColorStop(1.0, '#134e4a');
      ctx.fillStyle = spGrad;
      ctx.beginPath();
      ctx.moveTo(4.6, 2.2);
      ctx.bezierCurveTo(7.4, 0.8, 8.4, -2.5, 10.4, -4.8);
      ctx.lineTo(9.2, -5.6);
      ctx.bezierCurveTo(7.2, -3.4, 6.2, -1.2, 4.4, -1.6);
      ctx.closePath();
      ctx.fill();
      // Dark enameled spout mouth
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(9.8, -5.2, 0.9, 0.42, 0.65, 0, Math.PI * 2);
      ctx.fill();

      // Arching enameled steel overhead bail handle
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.45;
      ctx.beginPath();
      ctx.arc(-0.4, -2.2, 6.8, Math.PI * 1.08, Math.PI * 1.92);
      ctx.stroke();

      // Turned warm-walnut wood grip sleeve at top of handle
      const woodGrad = ctx.createLinearGradient(0, -10.2, 0, -7.8);
      woodGrad.addColorStop(0.0, '#f59e0b');
      woodGrad.addColorStop(0.45, '#b45309');
      woodGrad.addColorStop(1.0, '#451a03');
      ctx.strokeStyle = woodGrad;
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(-0.4, -2.2, 6.8, Math.PI * 1.32, Math.PI * 1.68);
      ctx.stroke();

      // Glossy turquoise-teal enameled steel kettle belly
      const ketGrad = ctx.createRadialGradient(-3.0, -0.5, 0.8, -0.4, 1.4, 8.2);
      ketGrad.addColorStop(0.0, '#99f6e4');
      ketGrad.addColorStop(0.35, '#14b8a6');
      ketGrad.addColorStop(0.75, '#0f766e');
      ketGrad.addColorStop(1.0, '#115e59');
      ctx.fillStyle = ketGrad;
      ctx.beginPath();
      ctx.moveTo(-4.6, -4.0);
      ctx.bezierCurveTo(-8.4, -1.5, -8.6, 5.8, -5.6, 7.2);
      ctx.quadraticCurveTo(-0.4, 8.4, 4.8, 7.2);
      ctx.bezierCurveTo(7.8, 5.8, 7.6, -1.5, 3.8, -4.0);
      ctx.closePath();
      ctx.fill();

      // Dark bottom rim accent + retro white floral decal dot cluster
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(-0.4, 7.2, 5.8, 0.9, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      for (let p = 0; p < 5; p++) {
        const a = (p / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(-0.6 + Math.cos(a) * 1.05, 2.0 + Math.sin(a) * 1.05, 0.55, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(-0.6, 2.0, 0.52, 0, Math.PI * 2);
      ctx.fill();

      // Curved porcelain glaze reflection highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.34)';
      ctx.beginPath();
      ctx.ellipse(-3.8, 1.2, 1.35, 3.4, 0.25, 0, Math.PI * 2);
      ctx.fill();

      // Steel collar rim + domed teal lid + brass-collared knob
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.ellipse(-0.4, -4.0, 4.3, 1.3, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#0d9488';
      ctx.beginPath();
      ctx.ellipse(-0.4, -4.2, 4.0, 1.45, 0, 0, Math.PI * 2);
      ctx.fill();
      drawLitSphere(ctx, -0.4, -6.0, 1.15, '#475569', '#18181b', '#020617', undefined, 0.5);
      return true;
    }

    // =========================================================================
    // 6. STEEL WHISTLING KETTLE (Стальной чайник со свистком)
    // =========================================================================
    case 'kitchen_kettle_steel': {
      drawShadow(ctx, 9.2, 3.0, 8.2, 0.34);

      // Tapered stainless spout on right with iconic crimson flip-whistle cap
      const spGrad = ctx.createLinearGradient(5.0, -3.5, 10.4, 2.0);
      spGrad.addColorStop(0.0, '#ffffff');
      spGrad.addColorStop(0.5, '#94a3b8');
      spGrad.addColorStop(1.0, '#334155');
      ctx.fillStyle = spGrad;
      ctx.beginPath();
      ctx.moveTo(4.2, 2.6);
      ctx.lineTo(9.8, -3.6);
      ctx.lineTo(8.4, -4.8);
      ctx.lineTo(3.8, -0.6);
      ctx.closePath();
      ctx.fill();

      // Red whistle flip-cap + black trigger lever
      const whGrad = ctx.createLinearGradient(8.4, -5.2, 10.6, -2.8);
      whGrad.addColorStop(0.0, '#f87171');
      whGrad.addColorStop(0.5, '#dc2626');
      whGrad.addColorStop(1.0, '#7f1d1d');
      ctx.fillStyle = whGrad;
      ctx.beginPath();
      ctx.roundRect(8.3, -5.1, 2.2, 2.0, 0.55);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(9.2, -4.4, 0.9, 0.5);

      // Sculpted ergonomic matte-black overhead Bakelite handle
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-6.2, -1.6);
      ctx.bezierCurveTo(-7.2, -8.8, 4.6, -9.8, 4.8, -3.8);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
      ctx.lineWidth = 0.55;
      ctx.beginPath();
      ctx.moveTo(-5.8, -4.4);
      ctx.bezierCurveTo(-4.8, -8.6, 2.2, -8.9, 3.6, -5.6);
      ctx.stroke();

      // Mirror-polished conical stainless steel dome kettle body
      const bodyGrad = ctx.createLinearGradient(-7.8, 0, 7.0, 0);
      bodyGrad.addColorStop(0.0, '#334155');
      bodyGrad.addColorStop(0.16, '#cbd5e1');
      bodyGrad.addColorStop(0.32, '#ffffff');
      bodyGrad.addColorStop(0.5, '#64748b');
      bodyGrad.addColorStop(0.76, '#e2e8f0');
      bodyGrad.addColorStop(1.0, '#1e293b');
      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.moveTo(-4.4, -4.0);
      ctx.lineTo(3.6, -4.0);
      ctx.bezierCurveTo(6.8, -0.5, 7.6, 4.6, 6.2, 6.8);
      ctx.quadraticCurveTo(-0.4, 8.2, -7.0, 6.8);
      ctx.bezierCurveTo(-8.4, 4.6, -7.6, -0.5, -4.4, -4.0);
      ctx.closePath();
      ctx.fill();

      // Encapsulated heavy steel induction base ring
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-6.8, 5.8, 12.8, 1.15);

      // Flush brushed-steel top lid + insulated black knob
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.ellipse(-0.4, -4.0, 4.1, 1.35, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 0.38;
      ctx.stroke();
      drawLitSphere(ctx, -0.4, -5.4, 1.25, '#475569', '#18181b', '#020617', undefined, 0.5);
      return true;
    }

    // =========================================================================
    // 7. ELECTRIC GLASS KETTLE (Электрический стеклянный чайник)
    // =========================================================================
    case 'kitchen_kettle_electric': {
      drawShadow(ctx, 8.2, 2.7, 8.6, 0.3);

      // Sleek matte-black ergonomic C-handle on left with top lid-release button
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 2.05;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(-5.0, -5.6);
      ctx.lineTo(-8.4, -4.6);
      ctx.quadraticCurveTo(-9.2, 0.5, -8.2, 4.8);
      ctx.lineTo(-5.2, 5.4);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
      ctx.lineWidth = 0.45;
      ctx.beginPath();
      ctx.moveTo(-8.1, -4.2);
      ctx.lineTo(-8.0, 4.0);
      ctx.stroke();

      // 360° swivel obsidian power base with brushed-steel accent band
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.roundRect(-6.6, 6.2, 13.2, 2.2, 0.85);
      ctx.fill();
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(-5.6, 6.9, 1.4, 0.55); // illuminated power switch LED

      // Lower brushed-stainless heater deck collar
      const collarGrad = ctx.createLinearGradient(-5.8, 0, 5.8, 0);
      collarGrad.addColorStop(0.0, '#475569');
      collarGrad.addColorStop(0.28, '#f8fafc');
      collarGrad.addColorStop(0.7, '#94a3b8');
      collarGrad.addColorStop(1.0, '#1e293b');
      ctx.fillStyle = collarGrad;
      ctx.beginPath();
      ctx.roundRect(-5.8, 3.8, 11.6, 2.6, [0.2, 0.2, 0.9, 0.9]);
      ctx.fill();

      // Clear borosilicate glass cylinder carafe with pouring spout notch on right
      const glGrad = ctx.createLinearGradient(-5.5, 0, 6.4, 0);
      glGrad.addColorStop(0.0, 'rgba(148, 163, 184, 0.48)');
      glGrad.addColorStop(0.24, 'rgba(255, 255, 255, 0.46)');
      glGrad.addColorStop(0.72, 'rgba(224, 242, 254, 0.28)');
      glGrad.addColorStop(1.0, 'rgba(100, 116, 139, 0.55)');
      ctx.fillStyle = glGrad;
      ctx.beginPath();
      ctx.moveTo(-5.4, -6.0);
      ctx.lineTo(5.6, -6.0);
      ctx.lineTo(7.0, -4.6); // crisp glass pouring spout beak
      ctx.lineTo(5.6, -2.8);
      ctx.lineTo(5.6, 4.0);
      ctx.lineTo(-5.4, 4.0);
      ctx.closePath();
      ctx.fill();

      // Luminous sapphire-blue LED water illumination + meniscus + rising micro-bubbles
      const ledWater = ctx.createLinearGradient(0, -1.6, 0, 4.0);
      ledWater.addColorStop(0.0, 'rgba(56, 189, 248, 0.22)');
      ledWater.addColorStop(0.55, 'rgba(14, 165, 233, 0.52)');
      ledWater.addColorStop(1.0, 'rgba(2, 132, 199, 0.85)');
      ctx.fillStyle = ledWater;
      ctx.fillRect(-5.0, -1.4, 10.2, 5.2);

      // Meniscus bright water line & rising effervescent bubbles
      ctx.fillStyle = 'rgba(224, 242, 254, 0.78)';
      ctx.beginPath();
      ctx.ellipse(0.1, -1.4, 5.0, 0.65, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
      for (const [bx, by, br] of [[-2.4, 2.2, 0.42], [0.5, 1.2, 0.35], [2.2, 2.6, 0.45], [-0.8, 3.0, 0.3], [1.4, -0.2, 0.28]]) {
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.fill();
      }

      // Calibrated white water-level gauge ticks on glass front
      ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
      for (const ty of [-3.4, -1.6, 0.2, 2.0]) {
        ctx.fillRect(2.6, ty, 1.6, 0.32);
      }

      // Crisp glass Fresnel highlight & outer rim line
      drawGlossBand(ctx, -4.3, -5.4, 1.15, 9.0, 0.45);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.65)';
      ctx.lineWidth = 0.38;
      ctx.beginPath();
      ctx.moveTo(-5.4, -6.0);
      ctx.lineTo(-5.4, 4.0);
      ctx.moveTo(5.6, -2.8);
      ctx.lineTo(5.6, 4.0);
      ctx.stroke();

      // Hinged stainless & black top lid
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.roundRect(-5.7, -7.8, 11.4, 1.9, [1.2, 1.2, 0.3, 0.3]);
      ctx.fill();
      ctx.fillStyle = collarGrad;
      ctx.fillRect(-5.6, -6.4, 11.2, 0.85);
      return true;
    }

    // =========================================================================
    // 8. CLAY TEAPOT (Глиняный заварочный чайник)
    // =========================================================================
    case 'kitchen_kettle_clay': {
      drawShadow(ctx, 8.4, 2.8, 7.8, 0.28);

      // Hand-formed clay ear handle on left
      ctx.strokeStyle = '#9a3412';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.arc(-5.6, 0.8, 3.2, Math.PI * 0.46, Math.PI * 1.54);
      ctx.stroke();
      ctx.strokeStyle = '#fb923c';
      ctx.lineWidth = 0.55;
      ctx.beginPath();
      ctx.arc(-5.7, 0.5, 3.2, Math.PI * 0.75, Math.PI * 1.35);
      ctx.stroke();

      // Graceful S-curved clay pouring spout on right
      const spGrad = ctx.createLinearGradient(4.4, -3.5, 9.6, 3.0);
      spGrad.addColorStop(0.0, '#fb923c');
      spGrad.addColorStop(0.55, '#c2410c');
      spGrad.addColorStop(1.0, '#7c2d12');
      ctx.fillStyle = spGrad;
      ctx.beginPath();
      ctx.moveTo(4.4, 2.6);
      ctx.bezierCurveTo(7.4, 1.4, 8.2, -1.8, 9.8, -3.4);
      ctx.lineTo(8.7, -4.2);
      ctx.bezierCurveTo(7.0, -2.2, 6.2, -0.4, 4.4, -0.6);
      ctx.closePath();
      ctx.fill();

      // Hand-thrown terracotta Yixing clay rounded teapot belly
      const clayGrad = ctx.createRadialGradient(-2.4, -0.8, 0.6, 0, 1.2, 7.6);
      clayGrad.addColorStop(0.0, '#fdba74');
      clayGrad.addColorStop(0.32, '#ea580c');
      clayGrad.addColorStop(0.72, '#9a3412');
      clayGrad.addColorStop(1.0, '#431407');
      ctx.fillStyle = clayGrad;
      ctx.beginPath();
      ctx.ellipse(0, 1.4, 6.5, 5.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Subtle potter's wheel horizontal striations & warm kiln mineral speckles
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(0, 1.4, 6.5, 5.5, 0, 0, Math.PI * 2);
      ctx.clip();
      ctx.strokeStyle = 'rgba(67, 20, 7, 0.28)';
      ctx.lineWidth = 0.35;
      for (const cy of [-0.6, 1.2, 3.0]) {
        ctx.beginPath();
        ctx.moveTo(-6.6, cy);
        ctx.quadraticCurveTo(0, cy + 1.1, 6.6, cy);
        ctx.stroke();
      }
      for (let i = 0; i < 16; i++) {
        const fx = (hash01('claypot', i * 2) - 0.5) * 11.2;
        const fy = -2.6 + hash01('claypot', i * 2 + 1) * 8.0;
        ctx.fillStyle = i % 2 === 0 ? 'rgba(67, 20, 7, 0.35)' : 'rgba(255, 237, 213, 0.25)';
        ctx.beginPath();
        ctx.arc(fx, fy, 0.22, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // Recessed rim collar, domed fitted clay lid, steam pinhole & round knob
      ctx.fillStyle = '#7c2d12';
      ctx.beginPath();
      ctx.ellipse(0, -3.5, 3.8, 1.2, 0, 0, Math.PI * 2);
      ctx.fill();

      const lidGrad = ctx.createRadialGradient(-1.0, -4.6, 0.3, 0, -3.8, 3.8);
      lidGrad.addColorStop(0.0, '#fb923c');
      lidGrad.addColorStop(0.6, '#c2410c');
      lidGrad.addColorStop(1.0, '#7c2d12');
      ctx.fillStyle = lidGrad;
      ctx.beginPath();
      ctx.arc(0, -3.5, 3.3, Math.PI, Math.PI * 2);
      ctx.quadraticCurveTo(0, -2.6, -3.3, -3.5);
      ctx.closePath();
      ctx.fill();

      // Tiny steam vent hole on lid + terracotta knob
      ctx.fillStyle = '#431407';
      ctx.beginPath();
      ctx.arc(1.4, -4.4, 0.32, 0, Math.PI * 2);
      ctx.fill();
      drawLitSphere(ctx, 0, -6.2, 1.15, '#fdba74', '#c2410c', '#431407', undefined, 0.38);
      return true;
    }

    // =========================================================================
    // 9. CAST IRON SKILLET (Чугунная сковорода)
    // =========================================================================
    case 'kitchen_pan_cast_iron': {
      drawShadow(ctx, 8.8, 4.2, 7.6, 0.38, 1.4);

      // Angled turned walnut wooden handle + brass ferrule + hanging loop extending top-left
      ctx.save();
      ctx.translate(-3.4, -3.2);
      ctx.rotate(-2.35);

      // Forged iron tang neck
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, -1.1, 3.2, 2.2);
      // Gleaming brass ferrule collar
      const brGrad = ctx.createLinearGradient(0, -1.25, 0, 1.25);
      brGrad.addColorStop(0.0, '#fef08a');
      brGrad.addColorStop(0.5, '#ca8a04');
      brGrad.addColorStop(1.0, '#713f12');
      ctx.fillStyle = brGrad;
      ctx.fillRect(2.6, -1.2, 1.1, 2.4);

      // Sculpted walnut wood grip handle
      const wGrad = ctx.createLinearGradient(0, -1.5, 0, 1.5);
      wGrad.addColorStop(0.0, '#d97706');
      wGrad.addColorStop(0.35, '#92400e');
      wGrad.addColorStop(0.8, '#451a03');
      wGrad.addColorStop(1.0, '#271203');
      ctx.fillStyle = wGrad;
      ctx.beginPath();
      ctx.moveTo(3.6, -1.15);
      ctx.quadraticCurveTo(6.8, -1.65, 9.6, -1.25);
      ctx.arc(9.6, 0, 1.25, -Math.PI * 0.5, Math.PI * 0.5);
      ctx.quadraticCurveTo(6.8, 1.65, 3.6, 1.15);
      ctx.closePath();
      ctx.fill();

      // Wood grain highlight streak + brass hanging ring
      ctx.strokeStyle = 'rgba(254, 215, 170, 0.28)';
      ctx.lineWidth = 0.32;
      ctx.beginPath();
      ctx.moveTo(4.2, -0.5);
      ctx.quadraticCurveTo(6.8, -0.85, 9.2, -0.45);
      ctx.stroke();

      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 0.65;
      ctx.beginPath();
      ctx.arc(11.0, 0, 0.85, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Helper front cast-iron tab opposite main handle
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(6.8, 6.2, 2.0, 1.35, 0.78, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 0.35;
      ctx.stroke();

      // Symmetrical pouring lip spouts on flanks
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(-4.6, 5.4, 1.5, 1.0, -0.7, 0, Math.PI * 2);
      ctx.ellipse(6.6, -2.6, 1.5, 1.0, -0.7, 0, Math.PI * 2);
      ctx.fill();

      // Outer heavy cast-iron wall bevel
      const outerGrad = ctx.createRadialGradient(-0.8, -0.8, 1.0, 1.4, 1.6, 8.6);
      outerGrad.addColorStop(0.0, '#475569');
      outerGrad.addColorStop(0.5, '#1e293b');
      outerGrad.addColorStop(0.85, '#0f172a');
      outerGrad.addColorStop(1.0, '#020617');
      ctx.fillStyle = outerGrad;
      ctx.beginPath();
      ctx.arc(1.4, 1.6, 7.8, 0, Math.PI * 2);
      ctx.fill();

      // Recessed seasoned inner skillet cooking bed
      const bedGrad = ctx.createRadialGradient(0.0, 0.2, 0.5, 1.4, 1.6, 6.6);
      bedGrad.addColorStop(0.0, '#334155');
      bedGrad.addColorStop(0.45, '#1e293b');
      bedGrad.addColorStop(0.88, '#0f172a');
      bedGrad.addColorStop(1.0, '#020617');
      ctx.fillStyle = bedGrad;
      ctx.beginPath();
      ctx.arc(1.4, 1.6, 6.45, 0, Math.PI * 2);
      ctx.fill();

      // Subtle seasoned iron pebble texture & concentric machined rings
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
      ctx.lineWidth = 0.32;
      ctx.beginPath();
      ctx.arc(1.4, 1.6, 4.6, 0, Math.PI * 2);
      ctx.arc(1.4, 1.6, 2.5, 0, Math.PI * 2);
      ctx.stroke();

      // Top-left rim catchlight arc
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.42)';
      ctx.lineWidth = 0.65;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(1.4, 1.6, 7.15, Math.PI * 1.08, Math.PI * 1.55);
      ctx.stroke();
      return true;
    }

    // =========================================================================
    // 10. NON-STICK TEFLON PAN (Тефлоновая сковорода)
    // =========================================================================
    case 'kitchen_pan_teflon': {
      drawShadow(ctx, 8.8, 4.0, 7.6, 0.34, 1.4);

      // Contoured matte-black Bakelite handle with stainless tang & hanging slot
      ctx.save();
      ctx.translate(-3.4, -3.2);
      ctx.rotate(-2.35);

      // Brushed stainless steel riveted tang bracket
      const tangGrad = ctx.createLinearGradient(0, -1.1, 0, 1.1);
      tangGrad.addColorStop(0.0, '#f8fafc');
      tangGrad.addColorStop(0.5, '#94a3b8');
      tangGrad.addColorStop(1.0, '#334155');
      ctx.fillStyle = tangGrad;
      ctx.fillRect(-0.5, -1.15, 2.8, 2.3);

      // Ergonomic matte-black Bakelite handle body
      const bkGrad = ctx.createLinearGradient(0, -1.6, 0, 1.6);
      bkGrad.addColorStop(0.0, '#475569');
      bkGrad.addColorStop(0.32, '#1e293b');
      bkGrad.addColorStop(0.8, '#09090b');
      bkGrad.addColorStop(1.0, '#18181b');
      ctx.fillStyle = bkGrad;
      ctx.beginPath();
      ctx.moveTo(2.0, -1.25);
      ctx.quadraticCurveTo(6.2, -1.8, 10.6, -1.35);
      ctx.arc(10.6, 0, 1.35, -Math.PI * 0.5, Math.PI * 0.5);
      ctx.quadraticCurveTo(6.2, 1.8, 2.0, 1.25);
      ctx.closePath();
      ctx.fill();

      // Hanging slot cutout at end + crimson ergonomic thumb accent
      ctx.fillStyle = '#020617';
      ctx.beginPath();
      ctx.roundRect(8.4, -0.5, 1.6, 1.0, 0.45);
      ctx.fill();
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.roundRect(2.6, -0.65, 1.3, 1.3, 0.5);
      ctx.fill();
      ctx.restore();

      // Machined brushed-aluminum outer lip rim
      const rimGrad = ctx.createLinearGradient(-6.2, -5.5, 9.0, 9.0);
      rimGrad.addColorStop(0.0, '#f8fafc');
      rimGrad.addColorStop(0.35, '#cbd5e1');
      rimGrad.addColorStop(0.7, '#64748b');
      rimGrad.addColorStop(1.0, '#334155');
      ctx.fillStyle = rimGrad;
      ctx.beginPath();
      ctx.arc(1.4, 1.6, 7.9, 0, Math.PI * 2);
      ctx.fill();

      // Deep matte titanium-speckled PTFE non-stick cooking interior
      const tefGrad = ctx.createRadialGradient(-0.2, 0.0, 0.5, 1.4, 1.6, 7.2);
      tefGrad.addColorStop(0.0, '#27272a');
      tefGrad.addColorStop(0.55, '#18181b');
      tefGrad.addColorStop(0.9, '#09090b');
      tefGrad.addColorStop(1.0, '#020617');
      ctx.fillStyle = tefGrad;
      ctx.beginPath();
      ctx.arc(1.4, 1.6, 7.05, 0, Math.PI * 2);
      ctx.fill();

      // Mineral granite/titanium micro-speckles across non-stick coating
      for (let i = 0; i < 26; i++) {
        const a = hash01('teflon', i * 3) * Math.PI * 2;
        const r = Math.sqrt(hash01('teflon', i * 3 + 1)) * 6.0;
        ctx.fillStyle = i % 3 === 0 ? 'rgba(226, 232, 240, 0.22)' : 'rgba(148, 163, 184, 0.14)';
        ctx.beginPath();
        ctx.arc(1.4 + Math.cos(a) * r, 1.6 + Math.sin(a) * r, 0.22, 0, Math.PI * 2);
        ctx.fill();
      }

      // Iconic central crimson Thermo-Spot heat indicator medallion
      ctx.fillStyle = '#991b1b';
      ctx.beginPath();
      ctx.arc(1.4, 1.6, 1.75, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 0.35;
      ctx.setLineDash([0.65, 0.5]);
      ctx.beginPath();
      ctx.arc(1.4, 1.6, 1.2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Twin internal stainless handle rivets inside wall
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.arc(-2.6, -1.6, 0.48, 0, Math.PI * 2);
      ctx.arc(-1.4, -2.8, 0.48, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    // =========================================================================
    // 11. GLAZED CERAMIC PLATE (Керамическая тарелка)
    // =========================================================================
    case 'kitchen_plate_ceramic': {
      drawShadow(ctx, 8.8, 4.8, 6.2, 0.26);

      // Outer glazed stoneware rim with subtle warm toasted clay lip edge
      const outerGrad = ctx.createRadialGradient(-2.8, -2.8, 0.8, 0, 0, 8.8);
      outerGrad.addColorStop(0.0, '#ffffff');
      outerGrad.addColorStop(0.62, '#f8f5ef');
      outerGrad.addColorStop(0.92, '#e2ddd4');
      outerGrad.addColorStop(1.0, '#b8a995');
      ctx.fillStyle = outerGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 8.6, 0, Math.PI * 2);
      ctx.fill();

      // Artisanal warm toasted ceramic outer rim band
      ctx.strokeStyle = 'rgba(180, 146, 110, 0.55)';
      ctx.lineWidth = 0.55;
      ctx.beginPath();
      ctx.arc(0, 0, 8.35, 0, Math.PI * 2);
      ctx.stroke();

      // Concave inner dinner well with soft inverse studio shadow
      const wellGrad = ctx.createRadialGradient(2.2, 2.2, 0.5, 0, 0, 6.2);
      wellGrad.addColorStop(0.0, '#ffffff');
      wellGrad.addColorStop(0.65, '#f1ede4');
      wellGrad.addColorStop(1.0, '#d6cfc2');
      ctx.fillStyle = wellGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 5.75, 0, Math.PI * 2);
      ctx.fill();

      // Crisp inner shoulder bevel catchlight
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.arc(0, 0, 5.75, Math.PI * 0.05, Math.PI * 0.65);
      ctx.stroke();

      // Subtle artisanal stoneware micro-flecks & curved ceramic glaze reflection
      ctx.fillStyle = 'rgba(120, 113, 108, 0.24)';
      for (let i = 0; i < 12; i++) {
        const a = hash01('cerplate', i * 2) * Math.PI * 2;
        const r = 1.5 + hash01('cerplate', i * 2 + 1) * 6.2;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * r, Math.sin(a) * r, 0.18, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.62)';
      ctx.lineWidth = 0.75;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, 0, 7.1, Math.PI * 1.12, Math.PI * 1.48);
      ctx.stroke();
      return true;
    }

    // =========================================================================
    // 12. FINE PORCELAIN PLATE WITH GZHEL PATTERN (Фарфоровая тарелка с гжелью)
    // =========================================================================
    case 'kitchen_plate_porcelain': {
      drawShadow(ctx, 8.8, 4.8, 6.2, 0.26);

      // Pure translucent fine bone-china porcelain disk
      const porGrad = ctx.createRadialGradient(-2.6, -2.6, 0.8, 0, 0, 8.8);
      porGrad.addColorStop(0.0, '#ffffff');
      porGrad.addColorStop(0.7, '#f8fafc');
      porGrad.addColorStop(1.0, '#cbd5e1');
      ctx.fillStyle = porGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 8.6, 0, Math.PI * 2);
      ctx.fill();

      // 24k Gold-leaf outer gilded edge rim
      ctx.strokeStyle = '#ca8a04';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.arc(0, 0, 8.3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 0.28;
      ctx.beginPath();
      ctx.arc(0, 0, 8.2, Math.PI * 0.9, Math.PI * 1.7);
      ctx.stroke();

      // Hand-painted Cobalt-Blue Gzhel scalloped botanical flange wreath
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const px = Math.cos(a) * 6.95;
        const py = Math.sin(a) * 6.95;
        ctx.fillStyle = i % 2 === 0 ? '#1d4ed8' : '#3b82f6';
        ctx.beginPath();
        ctx.ellipse(px, py, 0.95, 0.45, a + Math.PI * 0.5, 0, Math.PI * 2);
        ctx.fill();
        // Delicate pale-cobalt accent dots between petals
        const da = a + Math.PI / 12;
        ctx.fillStyle = '#60a5fa';
        ctx.beginPath();
        ctx.arc(Math.cos(da) * 7.2, Math.sin(da) * 7.2, 0.28, 0, Math.PI * 2);
        ctx.fill();
      }

      // Inner well depression + fine gold inner ring
      const wellGrad = ctx.createRadialGradient(1.8, 1.8, 0.4, 0, 0, 5.6);
      wellGrad.addColorStop(0.0, '#ffffff');
      wellGrad.addColorStop(0.72, '#f1f5f9');
      wellGrad.addColorStop(1.0, '#cbd5e1');
      ctx.fillStyle = wellGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 5.55, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 0.42;
      ctx.beginPath();
      ctx.arc(0, 0, 5.55, 0, Math.PI * 2);
      ctx.stroke();

      // Central hand-painted cobalt-blue Gzhel 6-petal rosette flower
      for (let p = 0; p < 6; p++) {
        const a = (p / 6) * Math.PI * 2;
        const pGrad = ctx.createRadialGradient(
          Math.cos(a) * 1.3, Math.sin(a) * 1.3, 0.1,
          Math.cos(a) * 1.7, Math.sin(a) * 1.7, 1.2
        );
        pGrad.addColorStop(0.0, '#93c5fd');
        pGrad.addColorStop(0.55, '#2563eb');
        pGrad.addColorStop(1.0, '#1e3a8a');
        ctx.fillStyle = pGrad;
        ctx.beginPath();
        ctx.ellipse(Math.cos(a) * 1.7, Math.sin(a) * 1.7, 1.15, 0.65, a, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#1e3a8a';
      ctx.beginPath();
      ctx.arc(0, 0, 0.72, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(0, 0, 0.3, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    // =========================================================================
    // 13. ENAMEL DEEP BOWL (Эмалированная глубокая миска)
    // =========================================================================
    case 'kitchen_plate_enamel': {
      drawShadow(ctx, 8.4, 4.4, 6.4, 0.28);

      // Outer white porcelain-enameled steel rolled lip
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(0, 0, 8.2, 0, Math.PI * 2);
      ctx.fill();

      // Deep concave glossy white enamel bowl interior gradient
      const bowlGrad = ctx.createRadialGradient(2.2, 2.2, 0.6, 0, 0, 7.6);
      bowlGrad.addColorStop(0.0, '#ffffff');
      bowlGrad.addColorStop(0.55, '#e2e8f0');
      bowlGrad.addColorStop(0.88, '#94a3b8');
      bowlGrad.addColorStop(1.0, '#cbd5e1');
      ctx.fillStyle = bowlGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
      ctx.fill();

      // Flat interior base circle shading
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.beginPath();
      ctx.arc(0.4, 0.5, 3.6, 0, Math.PI * 2);
      ctx.fill();

      // Signature Soviet/camping midnight-cobalt rolled enamel rim border
      ctx.strokeStyle = '#1e3a8a';
      ctx.lineWidth = 1.15;
      ctx.beginPath();
      ctx.arc(0, 0, 7.9, 0, Math.PI * 2);
      ctx.stroke();

      // Crisp glossy rim highlight arc
      ctx.strokeStyle = 'rgba(191, 219, 254, 0.65)';
      ctx.lineWidth = 0.42;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, 0, 7.9, Math.PI * 1.05, Math.PI * 1.55);
      ctx.stroke();

      // Subtle authentic small dark-steel enamel wear chip on rim edge
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.ellipse(5.5, 5.5, 0.85, 0.5, -0.75, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    // =========================================================================
    // 14. CARVED WOODEN BOWL (Деревянная резная пиала)
    // =========================================================================
    case 'kitchen_bowl_wooden': {
      drawShadow(ctx, 8.4, 4.4, 6.4, 0.3);

      // Thick lathe-turned honey-walnut wooden rim wall
      const rimGrad = ctx.createRadialGradient(-2.6, -2.6, 0.8, 0, 0, 8.4);
      rimGrad.addColorStop(0.0, '#f59e0b');
      rimGrad.addColorStop(0.45, '#b45309');
      rimGrad.addColorStop(0.82, '#78350f');
      rimGrad.addColorStop(1.0, '#451a03');
      ctx.fillStyle = rimGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 8.2, 0, Math.PI * 2);
      ctx.fill();

      // Deep carved concave hardwood interior cavity
      const inGrad = ctx.createRadialGradient(2.2, 2.2, 0.6, 0, 0, 7.2);
      inGrad.addColorStop(0.0, '#d97706');
      inGrad.addColorStop(0.45, '#92400e');
      inGrad.addColorStop(0.85, '#451a03');
      inGrad.addColorStop(1.0, '#271203');
      ctx.fillStyle = inGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 6.85, 0, Math.PI * 2);
      ctx.fill();

      // Organic flowing concentric tree growth-ring grain lines
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, 8.0, 0, Math.PI * 2);
      ctx.clip();
      ctx.strokeStyle = 'rgba(69, 26, 3, 0.38)';
      ctx.lineWidth = 0.45;
      for (const r of [1.8, 3.2, 4.7, 6.1, 7.4]) {
        ctx.beginPath();
        ctx.ellipse(0.3, -0.2, r * 1.04, r * 0.94, 0.35, 0, Math.PI * 2);
        ctx.stroke();
      }
      // Subtle radial wood grain medullary rays
      ctx.strokeStyle = 'rgba(254, 215, 170, 0.16)';
      ctx.lineWidth = 0.35;
      ctx.beginPath();
      ctx.moveTo(-7.0, -3.5); ctx.quadraticCurveTo(0, -1.5, 7.0, -3.0);
      ctx.moveTo(-6.5, 2.5);  ctx.quadraticCurveTo(0, 4.0, 6.5, 2.0);
      ctx.stroke();
      ctx.restore();

      // Satin beeswax oil-finish catchlight along beveled rim
      ctx.strokeStyle = 'rgba(254, 240, 138, 0.45)';
      ctx.lineWidth = 0.65;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, 0, 7.45, Math.PI * 1.1, Math.PI * 1.56);
      ctx.stroke();
      return true;
    }

    // =========================================================================
    // 15. CERAMIC COFFEE MUG (Керамическая кружка)
    // =========================================================================
    case 'kitchen_mug_ceramic': {
      drawShadow(ctx, 7.2, 2.7, 7.8, 0.28);

      // Sculpted sturdy cobalt-glazed ceramic C-handle on right
      ctx.strokeStyle = '#1e3a8a';
      ctx.lineWidth = 2.35;
      ctx.beginPath();
      ctx.arc(4.2, 0.8, 3.3, -Math.PI * 0.44, Math.PI * 0.44);
      ctx.stroke();
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 0.65;
      ctx.beginPath();
      ctx.arc(4.3, 0.5, 3.45, -Math.PI * 0.38, Math.PI * 0.14);
      ctx.stroke();

      // Cobalt-navy glazed stoneware cylindrical body
      const mugGrad = ctx.createLinearGradient(-5.6, 0, 4.6, 0);
      mugGrad.addColorStop(0.0, '#172554');
      mugGrad.addColorStop(0.22, '#3b82f6');
      mugGrad.addColorStop(0.45, '#1d4ed8');
      mugGrad.addColorStop(0.8, '#1e3a8a');
      mugGrad.addColorStop(1.0, '#0f172a');
      ctx.fillStyle = mugGrad;
      ctx.beginPath();
      ctx.roundRect(-5.6, -5.4, 10.2, 12.2, [0.9, 0.9, 2.4, 2.4]);
      ctx.fill();

      // Raw unglazed warm stoneware clay foot ring at bottom
      const footGrad = ctx.createLinearGradient(-5.2, 0, 4.2, 0);
      footGrad.addColorStop(0.0, '#78350f');
      footGrad.addColorStop(0.4, '#d6b88d');
      footGrad.addColorStop(1.0, '#5c3d22');
      ctx.fillStyle = footGrad;
      ctx.beginPath();
      ctx.roundRect(-5.0, 5.2, 9.0, 1.75, [0, 0, 1.8, 1.8]);
      ctx.fill();

      // Subtle decorative cream-glazed horizontal ceramic stripe
      ctx.fillStyle = 'rgba(241, 245, 249, 0.25)';
      ctx.fillRect(-5.6, 2.0, 10.2, 0.9);

      // Thick glazed top rim + warm cream inner wall + dark coffee depth
      ctx.fillStyle = '#93c5fd';
      ctx.beginPath();
      ctx.ellipse(-0.5, -5.3, 5.1, 1.65, 0, 0, Math.PI * 2);
      ctx.fill();

      const inGrad = ctx.createRadialGradient(-1.0, -5.5, 0.4, -0.5, -5.3, 4.5);
      inGrad.addColorStop(0.0, '#334155');
      inGrad.addColorStop(0.65, '#1e293b');
      inGrad.addColorStop(1.0, '#020617');
      ctx.fillStyle = inGrad;
      ctx.beginPath();
      ctx.ellipse(-0.5, -5.3, 4.35, 1.25, 0, 0, Math.PI * 2);
      ctx.fill();

      // Glossy vertical glaze catchlight
      drawGlossBand(ctx, -4.1, -3.6, 1.35, 8.6, 0.34);
      return true;
    }

    // =========================================================================
    // 16. ENAMEL CAMPING MUG (Эмалированная кружка)
    // =========================================================================
    case 'kitchen_mug_enamel': {
      drawShadow(ctx, 7.2, 2.6, 7.8, 0.28);

      // Stamped steel enamel strap handle with cobalt-blue edge line
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.arc(4.2, 0.6, 3.1, -Math.PI * 0.44, Math.PI * 0.44);
      ctx.stroke();
      ctx.strokeStyle = '#1e3a8a';
      ctx.lineWidth = 0.55;
      ctx.beginPath();
      ctx.arc(4.2, 0.6, 3.9, -Math.PI * 0.4, Math.PI * 0.4);
      ctx.stroke();

      // Glossy off-white enameled steel cylinder body
      const enGrad = ctx.createLinearGradient(-5.4, 0, 4.4, 0);
      enGrad.addColorStop(0.0, '#94a3b8');
      enGrad.addColorStop(0.24, '#ffffff');
      enGrad.addColorStop(0.62, '#f1f5f9');
      enGrad.addColorStop(1.0, '#64748b');
      ctx.fillStyle = enGrad;
      ctx.beginPath();
      ctx.roundRect(-5.4, -5.4, 9.8, 12.2, [0.5, 0.5, 1.4, 1.4]);
      ctx.fill();

      // Rolled midnight-blue enameled steel rim lip
      ctx.fillStyle = '#1e3a8a';
      ctx.beginPath();
      ctx.ellipse(-0.5, -5.4, 5.15, 1.65, 0, 0, Math.PI * 2);
      ctx.fill();

      // Shadowed white enamel inner cavity
      const cavGrad = ctx.createRadialGradient(0.4, -5.3, 0.3, -0.5, -5.4, 4.5);
      cavGrad.addColorStop(0.0, '#e2e8f0');
      cavGrad.addColorStop(1.0, '#64748b');
      ctx.fillStyle = cavGrad;
      ctx.beginPath();
      ctx.ellipse(-0.5, -5.4, 4.35, 1.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Authentic speckled camping enamel patina + tiny exposed dark-iron wear chip
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.ellipse(-1.4, 1.8, 0.95, 0.65, -0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#92400e';
      ctx.beginPath();
      ctx.arc(-1.2, 1.9, 0.42, 0, Math.PI * 2);
      ctx.fill();

      drawGlossBand(ctx, -3.9, -3.8, 1.3, 9.4, 0.42);
      return true;
    }

    // =========================================================================
    // 17. FACETED GLASS MUG (Стеклянная граненая кружка)
    // =========================================================================
    case 'kitchen_mug_glass': {
      drawShadow(ctx, 7.2, 2.6, 7.8, 0.25);

      // Thick molded clear glass ear handle with bright refractive rim
      ctx.strokeStyle = 'rgba(186, 230, 253, 0.72)';
      ctx.lineWidth = 2.1;
      ctx.beginPath();
      ctx.arc(4.2, 0.6, 3.2, -Math.PI * 0.44, Math.PI * 0.44);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 0.55;
      ctx.beginPath();
      ctx.arc(4.3, 0.3, 3.35, -Math.PI * 0.38, Math.PI * 0.14);
      ctx.stroke();

      // Clear heavy-walled borosilicate glass outer shell
      const glGrad = ctx.createLinearGradient(-5.5, 0, 4.5, 0);
      glGrad.addColorStop(0.0, 'rgba(148, 163, 184, 0.56)');
      glGrad.addColorStop(0.22, 'rgba(255, 255, 255, 0.58)');
      glGrad.addColorStop(0.55, 'rgba(224, 242, 254, 0.28)');
      glGrad.addColorStop(0.85, 'rgba(241, 245, 249, 0.45)');
      glGrad.addColorStop(1.0, 'rgba(100, 116, 139, 0.58)');
      ctx.fillStyle = glGrad;
      ctx.beginPath();
      ctx.roundRect(-5.5, -5.6, 10.0, 12.6, [0.7, 0.7, 1.5, 1.5]);
      ctx.fill();

      // Warm golden-amber steeped tea visible inside glass wall
      const teaGrad = ctx.createLinearGradient(-4.6, -2.0, 3.6, 5.2);
      teaGrad.addColorStop(0.0, 'rgba(245, 158, 11, 0.75)');
      teaGrad.addColorStop(0.5, 'rgba(180, 83, 9, 0.88)');
      teaGrad.addColorStop(1.0, 'rgba(120, 53, 15, 0.92)');
      ctx.fillStyle = teaGrad;
      ctx.beginPath();
      ctx.roundRect(-4.6, -2.0, 8.2, 7.2, [0.2, 0.2, 0.9, 0.9]);
      ctx.fill();

      // Top liquid meniscus ring
      ctx.fillStyle = 'rgba(253, 224, 71, 0.55)';
      ctx.beginPath();
      ctx.ellipse(-0.5, -2.0, 4.1, 0.9, 0, 0, Math.PI * 2);
      ctx.fill();

      // Iconic vertical prismatic fluted glass facets
      for (const fx of [-3.6, -1.6, 0.5, 2.5]) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.24)';
        ctx.fillRect(fx, -4.6, 0.65, 9.6);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.14)';
        ctx.fillRect(fx + 0.65, -4.6, 0.32, 9.6);
      }

      // Thick solid refractive glass base punt
      ctx.fillStyle = 'rgba(241, 245, 249, 0.65)';
      ctx.beginPath();
      ctx.roundRect(-5.0, 5.2, 9.0, 1.65, [0, 0, 1.2, 1.2]);
      ctx.fill();

      // Crisp glass rim ellipse & vertical softbox catchlight
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 0.55;
      ctx.beginPath();
      ctx.ellipse(-0.5, -5.5, 4.95, 1.35, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.55)';
      ctx.lineWidth = 0.35;
      ctx.beginPath();
      ctx.roundRect(-5.5, -5.6, 10.0, 12.6, [0.7, 0.7, 1.5, 1.5]);
      ctx.stroke();
      return true;
    }

    // =========================================================================
    // 18. PORCELAIN TEA CUP ON SAUCER (Фарфоровая чайная чашка)
    // =========================================================================
    case 'kitchen_cup_porcelain': {
      drawShadow(ctx, 8.6, 3.0, 7.6, 0.26);

      // Sculpted fine porcelain saucer with recessed well & 24k gold rim
      const saucGrad = ctx.createRadialGradient(-2.0, 3.2, 0.6, 0, 4.2, 8.6);
      saucGrad.addColorStop(0.0, '#ffffff');
      saucGrad.addColorStop(0.7, '#f1f5f9');
      saucGrad.addColorStop(1.0, '#cbd5e1');
      ctx.fillStyle = saucGrad;
      ctx.beginPath();
      ctx.ellipse(0, 4.2, 8.4, 3.1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ca8a04';
      ctx.lineWidth = 0.52;
      ctx.stroke();

      // Inner saucer cup-rest recess shadow
      ctx.fillStyle = 'rgba(148, 163, 184, 0.35)';
      ctx.beginPath();
      ctx.ellipse(0, 4.0, 4.2, 1.45, 0, 0, Math.PI * 2);
      ctx.fill();

      // Delicate ornate curved gilt porcelain ear handle on right
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.bezierCurveTo(4.2, -4.4, 7.6, -4.8, 7.2, -1.6);
      ctx.bezierCurveTo(6.8, 0.8, 4.8, 0.8, 3.4, 1.2);
      ctx.stroke();
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 0.55;
      ctx.beginPath();
      ctx.moveTo(4.5, -4.4);
      ctx.bezierCurveTo(7.4, -4.6, 7.2, -1.6, 4.0, 0.9);
      ctx.stroke();

      // Tapered translucent bone-china teacup body with curved foot
      const cupGrad = ctx.createLinearGradient(-5.2, 0, 5.2, 0);
      cupGrad.addColorStop(0.0, '#cbd5e1');
      cupGrad.addColorStop(0.28, '#ffffff');
      cupGrad.addColorStop(0.68, '#f8fafc');
      cupGrad.addColorStop(1.0, '#94a3b8');
      ctx.fillStyle = cupGrad;
      ctx.beginPath();
      ctx.moveTo(-5.0, -5.2);
      ctx.lineTo(5.0, -5.2);
      ctx.bezierCurveTo(4.8, -0.4, 3.8, 2.8, 2.6, 3.8);
      ctx.quadraticCurveTo(0, 4.6, -2.6, 3.8);
      ctx.bezierCurveTo(-3.8, 2.8, -4.8, -0.4, -5.0, -5.2);
      ctx.closePath();
      ctx.fill();

      // Delicate cobalt-blue porcelain blossom motif on cup belly
      ctx.fillStyle = '#2563eb';
      for (let p = 0; p < 5; p++) {
        const a = (p / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(-0.3 + Math.cos(a) * 0.8, -0.5 + Math.sin(a) * 0.8, 0.42, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.arc(-0.3, -0.5, 0.35, 0, Math.PI * 2);
      ctx.fill();

      // Top rim ellipse with 24k gold-leaf lip & warm amber tea glimpse inside
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.ellipse(0, -5.2, 5.0, 1.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 0.65;
      ctx.stroke();

      const teaGrad = ctx.createRadialGradient(-0.8, -5.2, 0.3, 0, -5.1, 4.2);
      teaGrad.addColorStop(0.0, '#f59e0b');
      teaGrad.addColorStop(0.65, '#92400e');
      teaGrad.addColorStop(1.0, '#451a03');
      ctx.fillStyle = teaGrad;
      ctx.beginPath();
      ctx.ellipse(0, -5.05, 4.2, 1.15, 0, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    // =========================================================================
    // 19. CHEF'S KNIFE (Кухонный нож шеф-повара)
    // =========================================================================
    case 'kitchen_knife_chef': {
      drawShadow(ctx, 10.2, 2.4, 7.6, 0.28);

      ctx.save();
      ctx.rotate(-0.42);

      // Forged wide high-carbon stainless steel Gyuto / Chef's blade
      const drawBlade = () => {
        ctx.beginPath();
        ctx.moveTo(-2.2, -2.0);
        ctx.lineTo(10.8, -1.65); // straight spine to needle tip
        ctx.bezierCurveTo(9.8, 0.8, 6.2, 2.8, -2.2, 2.85); // sweeping rocking belly edge
        ctx.lineTo(-2.6, 1.2);
        ctx.closePath();
      };
      const bladeGrad = ctx.createLinearGradient(-2.2, -2.2, 10.4, 3.0);
      bladeGrad.addColorStop(0.0, '#ffffff');
      bladeGrad.addColorStop(0.32, '#e2e8f0');
      bladeGrad.addColorStop(0.68, '#94a3b8');
      bladeGrad.addColorStop(1.0, '#64748b');
      ctx.fillStyle = bladeGrad;
      drawBlade();
      ctx.fill();

      // Subtle brushed satin blade texture & granton hollow-grind dimples
      ctx.save();
      drawBlade();
      ctx.clip();
      // Razor-honed mirror secondary bevel edge along belly
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
      ctx.lineWidth = 0.65;
      ctx.beginPath();
      ctx.moveTo(-2.2, 2.65);
      ctx.bezierCurveTo(6.2, 2.55, 9.6, 0.65, 10.8, -1.65);
      ctx.stroke();

      // Precision scalloped Granton air-pocket dimples along mid-blade
      ctx.fillStyle = 'rgba(71, 85, 105, 0.24)';
      for (let gx = -0.4; gx <= 6.8; gx += 1.45) {
        ctx.beginPath();
        ctx.ellipse(gx, 0.85, 0.45, 0.85, 0.1, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // Crisp dark spine line
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 0.32;
      ctx.beginPath();
      ctx.moveTo(-2.2, -2.0);
      ctx.lineTo(10.8, -1.65);
      ctx.stroke();

      // Heavy forged integral stainless steel finger bolster
      const bolGrad = ctx.createLinearGradient(0, -2.2, 0, 2.8);
      bolGrad.addColorStop(0.0, '#f8fafc');
      bolGrad.addColorStop(0.45, '#cbd5e1');
      bolGrad.addColorStop(1.0, '#475569');
      ctx.fillStyle = bolGrad;
      ctx.beginPath();
      ctx.moveTo(-3.6, -1.9);
      ctx.lineTo(-2.0, -2.0);
      ctx.lineTo(-2.0, 2.85);
      ctx.lineTo(-3.4, 1.5);
      ctx.closePath();
      ctx.fill();

      // Sculpted ergonomic dark walnut full-tang wooden handle
      const hGrad = ctx.createLinearGradient(0, -1.9, 0, 1.8);
      hGrad.addColorStop(0.0, '#92400e');
      hGrad.addColorStop(0.35, '#5c2808');
      hGrad.addColorStop(0.85, '#3b1604');
      hGrad.addColorStop(1.0, '#1c0a00');
      ctx.fillStyle = hGrad;
      ctx.beginPath();
      ctx.moveTo(-3.4, -1.85);
      ctx.quadraticCurveTo(-7.2, -2.0, -10.8, -1.55);
      ctx.quadraticCurveTo(-11.6, -0.2, -10.6, 1.65);
      ctx.quadraticCurveTo(-7.0, 1.25, -3.4, 1.45);
      ctx.closePath();
      ctx.fill();

      // 3 flush polished stainless full-tang rivets
      for (const rx of [-9.4, -7.0, -4.6]) {
        drawLitSphere(ctx, rx, -0.2, 0.58, '#ffffff', '#cbd5e1', '#475569', undefined, 0.6);
      }

      // Warm wood specular highlight along spine
      ctx.fillStyle = 'rgba(254, 215, 170, 0.22)';
      ctx.fillRect(-10.2, -1.4, 6.4, 0.45);
      ctx.restore();
      return true;
    }

    // =========================================================================
    // 20. STAINLESS STEEL FORK (Стальная вилка)
    // =========================================================================
    case 'kitchen_fork_steel': {
      drawShadow(ctx, 9.4, 2.2, 7.2, 0.22);

      ctx.save();
      ctx.rotate(-0.48);

      const stGrad = ctx.createLinearGradient(-10.5, -2.2, 10.5, 2.2);
      stGrad.addColorStop(0.0, '#64748b');
      stGrad.addColorStop(0.28, '#f8fafc');
      stGrad.addColorStop(0.55, '#cbd5e1');
      stGrad.addColorStop(0.8, '#ffffff');
      stGrad.addColorStop(1.0, '#94a3b8');
      ctx.fillStyle = stGrad;

      // Sculpted teardrop ergonomic handle & tapered neck
      ctx.beginPath();
      ctx.moveTo(-10.6, 0);
      ctx.bezierCurveTo(-10.6, -1.8, -7.2, -1.85, -3.2, -0.95);
      ctx.lineTo(1.8, -0.8);
      ctx.quadraticCurveTo(3.4, -2.5, 4.8, -2.55);
      ctx.lineTo(4.8, 2.55);
      ctx.quadraticCurveTo(3.4, 2.5, 1.8, 0.8);
      ctx.lineTo(-3.2, 0.95);
      ctx.bezierCurveTo(-7.2, 1.85, -10.6, 1.8, -10.6, 0);
      ctx.closePath();
      ctx.fill();

      // 4 finely tapered mirror-polished stainless tines
      for (const ty of [-2.05, -0.7, 0.7, 2.05]) {
        ctx.beginPath();
        ctx.moveTo(4.4, ty - 0.42);
        ctx.lineTo(10.6, ty - 0.16);
        ctx.lineTo(10.9, ty);
        ctx.lineTo(10.6, ty + 0.16);
        ctx.lineTo(4.4, ty + 0.42);
        ctx.closePath();
        ctx.fill();
      }

      // Crisp specular highlight ridge along handle & tine spines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
      ctx.lineWidth = 0.35;
      ctx.beginPath();
      ctx.moveTo(-9.4, -0.45);
      ctx.lineTo(2.4, -0.35);
      for (const ty of [-2.05, -0.7, 0.7, 2.05]) {
        ctx.moveTo(4.8, ty - 0.14);
        ctx.lineTo(10.4, ty - 0.05);
      }
      ctx.stroke();

      ctx.strokeStyle = 'rgba(51, 65, 85, 0.42)';
      ctx.lineWidth = 0.25;
      ctx.beginPath();
      ctx.moveTo(-9.8, 0.95);
      ctx.quadraticCurveTo(-5.0, 1.15, 2.0, 0.72);
      ctx.stroke();
      ctx.restore();
      return true;
    }

    // =========================================================================
    // 21. ANTIQUE SILVER FORK (Серебряная вилка)
    // =========================================================================
    case 'kitchen_fork_silver': {
      drawShadow(ctx, 9.4, 2.2, 7.2, 0.25);

      ctx.save();
      ctx.rotate(-0.48);

      // Warm heirloom sterling silver gradient with antique patina
      const silvGrad = ctx.createLinearGradient(-10.8, -2.5, 10.8, 2.5);
      silvGrad.addColorStop(0.0, '#94a3b8');
      silvGrad.addColorStop(0.22, '#ffffff');
      silvGrad.addColorStop(0.5, '#e2e8f0');
      silvGrad.addColorStop(0.76, '#f8fafc');
      silvGrad.addColorStop(1.0, '#64748b');
      ctx.fillStyle = silvGrad;

      // Ornate Baroque/Rococo scalloped shell-tip handle + collared neck
      ctx.beginPath();
      ctx.moveTo(-10.8, 0);
      ctx.bezierCurveTo(-10.8, -2.2, -8.2, -2.35, -6.4, -1.6);
      ctx.quadraticCurveTo(-4.0, -1.1, 1.8, -0.95);
      ctx.quadraticCurveTo(3.4, -2.55, 4.8, -2.6);
      ctx.lineTo(4.8, 2.6);
      ctx.quadraticCurveTo(3.4, 2.55, 1.8, 0.95);
      ctx.quadraticCurveTo(-4.0, 1.1, -6.4, 1.6);
      ctx.bezierCurveTo(-8.2, 2.35, -10.8, 2.2, -10.8, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 0.28;
      ctx.stroke();

      // 4 refined slender silver tines
      for (const ty of [-2.05, -0.7, 0.7, 2.05]) {
        ctx.fillStyle = silvGrad;
        ctx.beginPath();
        ctx.moveTo(4.4, ty - 0.4);
        ctx.lineTo(10.6, ty - 0.14);
        ctx.lineTo(10.9, ty);
        ctx.lineTo(10.6, ty + 0.14);
        ctx.lineTo(4.4, ty + 0.4);
        ctx.closePath();
        ctx.fill();
      }

      // Fine dark-oxidized Rococo filigree scrollwork & beaded neck collar
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.65)';
      ctx.lineWidth = 0.35;
      ctx.beginPath();
      ctx.ellipse(-8.4, 0, 1.45, 0.85, 0, 0, Math.PI * 2);
      ctx.moveTo(-6.6, 0);
      ctx.quadraticCurveTo(-4.6, -0.75, -2.8, 0);
      ctx.quadraticCurveTo(-1.0, 0.75, 0.8, 0);
      ctx.stroke();

      // Beaded silver collar rings at neck
      ctx.fillStyle = '#475569';
      ctx.fillRect(1.5, -1.05, 0.45, 2.1);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-8.4, 0, 0.38, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return true;
    }

    // =========================================================================
    // 22. STAINLESS STEEL SPOON (Стальная ложка)
    // =========================================================================
    case 'kitchen_spoon_steel': {
      drawShadow(ctx, 9.4, 2.5, 7.2, 0.22);

      ctx.save();
      ctx.rotate(-0.48);

      // Polished contoured stainless handle & slender neck
      const hGrad = ctx.createLinearGradient(-10.8, -1.5, 2.4, 1.5);
      hGrad.addColorStop(0.0, '#64748b');
      hGrad.addColorStop(0.32, '#ffffff');
      hGrad.addColorStop(0.7, '#94a3b8');
      hGrad.addColorStop(1.0, '#cbd5e1');
      ctx.fillStyle = hGrad;
      ctx.beginPath();
      ctx.moveTo(-10.8, 0);
      ctx.bezierCurveTo(-10.8, -1.65, -7.4, -1.65, -3.4, -0.85);
      ctx.lineTo(2.4, -0.68);
      ctx.lineTo(2.4, 0.68);
      ctx.lineTo(-3.4, 0.85);
      ctx.bezierCurveTo(-7.4, 1.65, -10.8, 1.65, -10.8, 0);
      ctx.closePath();
      ctx.fill();

      // Deep ovoid stainless spoon bowl with inverted concave chrome reflection
      const outerBowl = ctx.createLinearGradient(1.6, -3.2, 10.6, 3.2);
      outerBowl.addColorStop(0.0, '#e2e8f0');
      outerBowl.addColorStop(0.5, '#94a3b8');
      outerBowl.addColorStop(1.0, '#475569');
      ctx.fillStyle = outerBowl;
      ctx.beginPath();
      ctx.ellipse(6.0, 0, 4.75, 3.05, 0, 0, Math.PI * 2);
      ctx.fill();

      // Concave inner mirror bowl gradient (light catches bottom-right inside hollow)
      const innerBowl = ctx.createRadialGradient(7.2, 0.9, 0.35, 5.8, 0, 4.4);
      innerBowl.addColorStop(0.0, '#ffffff');
      innerBowl.addColorStop(0.45, '#cbd5e1');
      innerBowl.addColorStop(0.82, '#64748b');
      innerBowl.addColorStop(1.0, '#94a3b8');
      ctx.fillStyle = innerBowl;
      ctx.beginPath();
      ctx.ellipse(6.0, 0, 4.15, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Crisp specular rim & handle spine highlight
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.82)';
      ctx.lineWidth = 0.4;
      ctx.beginPath();
      ctx.moveTo(-9.4, -0.4);
      ctx.lineTo(2.0, -0.25);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(6.0, 0, 4.45, 2.75, 0, Math.PI * 1.1, Math.PI * 1.75);
      ctx.stroke();
      ctx.restore();
      return true;
    }

    // =========================================================================
    // 23. KHOKHLOMA WOODEN SPOON (Деревянная хохломская ложка)
    // =========================================================================
    case 'kitchen_spoon_wooden': {
      drawShadow(ctx, 9.6, 2.7, 7.2, 0.28);

      ctx.save();
      ctx.rotate(-0.48);

      // Turned lacquered birchwood handle with golden Khokhloma lacquer bands
      const hGrad = ctx.createLinearGradient(0, -1.35, 0, 1.35);
      hGrad.addColorStop(0.0, '#fef08a');
      hGrad.addColorStop(0.35, '#d97706');
      hGrad.addColorStop(0.8, '#92400e');
      hGrad.addColorStop(1.0, '#451a03');
      ctx.fillStyle = hGrad;
      ctx.beginPath();
      ctx.moveTo(-10.4, 0);
      ctx.quadraticCurveTo(-9.6, -1.35, -7.8, -1.1);
      ctx.lineTo(2.2, -0.85);
      ctx.lineTo(2.2, 0.85);
      ctx.lineTo(-7.8, 1.1);
      ctx.quadraticCurveTo(-9.6, 1.35, -10.4, 0);
      ctx.closePath();
      ctx.fill();

      // Turned decorative scarlet & black Khokhloma stripes on handle
      ctx.fillStyle = '#09090b';
      ctx.fillRect(-7.4, -1.05, 1.2, 2.1);
      ctx.fillRect(-3.8, -0.95, 1.0, 1.9);
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(-9.8, 0, 1.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-5.6, -1.0, 1.2, 2.0);

      // Glossy crimson-and-black lacquered carved wooden spoon bowl
      const rimGrad = ctx.createRadialGradient(4.8, -1.0, 0.5, 5.8, 0, 5.4);
      rimGrad.addColorStop(0.0, '#ef4444');
      rimGrad.addColorStop(0.65, '#b91c1c');
      rimGrad.addColorStop(1.0, '#450a0a');
      ctx.fillStyle = rimGrad;
      ctx.beginPath();
      ctx.ellipse(5.8, 0, 5.0, 3.4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Deep black-lacquer Khokhloma medallion interior
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.ellipse(5.8, 0, 4.1, 2.65, 0, 0, Math.PI * 2);
      ctx.fill();

      // Luminous 24k gold-leaf curling botanical vine & scarlet rowanberries motif
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 0.52;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(2.6, 0.4);
      ctx.bezierCurveTo(4.2, -2.0, 7.2, 2.0, 8.8, -0.4);
      ctx.stroke();

      // Gold leaf fronds
      ctx.fillStyle = '#eab308';
      for (const [lx, ly, rot] of [[4.2, -1.0, -0.5], [7.2, 1.0, 0.6], [5.8, -1.2, 0.2]] as Array<[number, number, number]>) {
        ctx.beginPath();
        ctx.ellipse(lx, ly, 0.95, 0.42, rot, 0, Math.PI * 2);
        ctx.fill();
      }

      // Vivid scarlet Khokhloma berries with tiny white specular dots
      for (const [bx, by] of [[4.8, 0.65], [6.2, 0.15], [7.5, -0.75]]) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(bx, by, 0.68, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(bx - 0.2, by - 0.2, 0.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Glossy clear-varnish specular curved reflection over bowl
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.48)';
      ctx.lineWidth = 0.55;
      ctx.beginPath();
      ctx.ellipse(5.8, 0, 4.4, 2.8, 0, Math.PI * 1.12, Math.PI * 1.56);
      ctx.stroke();
      ctx.restore();
      return true;
    }

    // =========================================================================
    // 24. SOUP BOWL & EMPTY SOUP BOWL (Суповая пиала с ложкой — кухонная тара)
    // =========================================================================
    case 'soup_bowl':
    case 'soup_bowl_empty': {
      drawShadow(ctx, 8.2, 3.0, 8.0, 0.28);

      // Porcelain foot base ring
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.ellipse(0, 6.8, 4.1, 1.15, 0, 0, Math.PI * 2);
      ctx.fill();

      // Deep glazed white porcelain bowl outer contour
      const bowlGrad = ctx.createLinearGradient(-7.8, -2.5, 7.8, 6.8);
      bowlGrad.addColorStop(0.0, '#f8fafc');
      bowlGrad.addColorStop(0.32, '#ffffff');
      bowlGrad.addColorStop(0.72, '#cbd5e1');
      bowlGrad.addColorStop(1.0, '#64748b');
      ctx.fillStyle = bowlGrad;
      ctx.beginPath();
      ctx.moveTo(-7.8, -2.2);
      ctx.bezierCurveTo(-7.4, 4.4, -4.4, 6.8, 0, 7.0);
      ctx.bezierCurveTo(4.4, 6.8, 7.4, 4.4, 7.8, -2.2);
      ctx.closePath();
      ctx.fill();

      // Twin classic cobalt-blue porcelain outer stripe bands
      ctx.strokeStyle = '#1d4ed8';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(-7.5, -0.4);
      ctx.quadraticCurveTo(0, 1.5, 7.5, -0.4);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(37, 99, 235, 0.55)';
      ctx.lineWidth = 0.35;
      ctx.beginPath();
      ctx.moveTo(-7.2, 0.7);
      ctx.quadraticCurveTo(0, 2.5, 7.2, 0.7);
      ctx.stroke();

      // Ceramic top rim & deep concave interior cavity
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(0, -2.2, 7.8, 2.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 0.55;
      ctx.stroke();

      const cavGrad = ctx.createRadialGradient(1.2, -1.6, 0.5, 0, -2.2, 7.2);
      cavGrad.addColorStop(0.0, '#f1f5f9');
      cavGrad.addColorStop(0.65, '#cbd5e1');
      cavGrad.addColorStop(1.0, '#64748b');
      ctx.fillStyle = cavGrad;
      ctx.beginPath();
      ctx.ellipse(0, -2.2, 7.1, 2.15, 0, 0, Math.PI * 2);
      ctx.fill();

      const hasSoup = item?.fluidStorage ? item.fluidStorage.currentMl > 0 : itemId === 'soup_bowl';
      if (hasSoup) {
        const soupColor =
          item?.fluidStorage?.attributes?.customColor ||
          (item?.fluidStorage?.liquidId === 'broth' ? '#b45309' : '#d97706');
        const liqGrad = ctx.createRadialGradient(-1.8, -2.4, 0.4, 0, -2.0, 6.5);
        liqGrad.addColorStop(0.0, '#f59e0b');
        liqGrad.addColorStop(0.55, soupColor);
        liqGrad.addColorStop(1.0, '#78350f');
        ctx.fillStyle = liqGrad;
        ctx.beginPath();
        ctx.ellipse(0, -1.9, 6.45, 1.85, 0, 0, Math.PI * 2);
        ctx.fill();

        // Floating golden fat pearls, diced carrot bits & fresh parsley leaves
        ctx.fillStyle = 'rgba(254, 240, 138, 0.65)';
        ctx.beginPath();
        ctx.ellipse(-2.6, -2.1, 0.72, 0.28, 0, 0, Math.PI * 2);
        ctx.ellipse(1.9, -1.5, 0.62, 0.24, 0, 0, Math.PI * 2);
        ctx.ellipse(-0.4, -2.7, 0.48, 0.2, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ea580c';
        ctx.fillRect(-1.2, -1.8, 0.85, 0.65);
        ctx.fillRect(2.4, -2.4, 0.75, 0.55);

        drawBotanicalLeaf(ctx, -2.4, -2.0, 1.7, 0.52, -0.25, '#4ade80', '#14532d');
        drawBotanicalLeaf(ctx, 1.0, -1.8, 1.55, 0.48, 0.35, '#22c55e', '#14532d');
      }

      // Resting polished steel/porcelain soup spoon handle emerging neatly over right rim
      const spGrad = ctx.createLinearGradient(3.2, -1.6, 9.6, -7.2);
      spGrad.addColorStop(0.0, '#94a3b8');
      spGrad.addColorStop(0.5, '#ffffff');
      spGrad.addColorStop(1.0, '#cbd5e1');
      ctx.fillStyle = spGrad;
      ctx.beginPath();
      ctx.moveTo(3.0, -1.5);
      ctx.lineTo(8.6, -7.6);
      ctx.quadraticCurveTo(9.8, -7.5, 9.6, -6.4);
      ctx.lineTo(4.2, -0.9);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.45)';
      ctx.lineWidth = 0.26;
      ctx.stroke();

      drawGlossBand(ctx, -5.6, 0.0, 1.2, 4.8, 0.3);
      return true;
    }

    // =========================================================================
    // 25. CLAY BAKING POTS (Глиняные кухонные горшочки 0.25л / 0.5л / 1.0л)
    // =========================================================================
    case 'pot_clay_small':
    case 'pot_clay_small_open':
    case 'pot_clay_medium':
    case 'pot_clay_medium_open':
    case 'pot_clay_large':
    case 'pot_clay_large_open': {
      const isSm = itemId.includes('small');
      const isLg = itemId.includes('large');
      const isOpen = Boolean(
        item?.isOpen || item?.fluidStorage?.attributes?.isOpened || itemId.endsWith('_open')
      );
      const scale = isLg ? 1.14 : isSm ? 0.84 : 1.0;

      ctx.save();
      ctx.scale(scale, scale);
      drawShadow(ctx, 6.8, 2.7, 7.8, 0.3);

      // Small sculpted terracotta side ear-lugs
      for (const side of [-1, 1]) {
        ctx.strokeStyle = '#7c2d12';
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.arc(side * 5.6, -1.0, 1.45, side < 0 ? Math.PI * 0.5 : -Math.PI * 0.5, side < 0 ? Math.PI * 1.5 : Math.PI * 0.5);
        ctx.stroke();
      }

      // Hand-thrown rounded Russian terracotta baking pot belly
      const drawPotBody = () => {
        ctx.beginPath();
        ctx.moveTo(-4.4, -3.8);
        ctx.bezierCurveTo(-7.8, -0.2, -7.4, 5.2, -4.6, 6.8);
        ctx.quadraticCurveTo(0, 8.2, 4.6, 6.8);
        ctx.bezierCurveTo(7.4, 5.2, 7.8, -0.2, 4.4, -3.8);
        ctx.closePath();
      };

      const clayGrad = ctx.createRadialGradient(-2.4, -0.5, 0.6, 0, 1.8, 8.4);
      clayGrad.addColorStop(0.0, '#fb923c');
      clayGrad.addColorStop(0.38, '#c2410c');
      clayGrad.addColorStop(0.78, '#7c2d12');
      clayGrad.addColorStop(1.0, '#431407');
      ctx.fillStyle = clayGrad;
      drawPotBody();
      ctx.fill();

      ctx.save();
      drawPotBody();
      ctx.clip();

      // Glossy dark-caramel upper kiln glaze drip collar
      const glazeGrad = ctx.createLinearGradient(0, -4.0, 0, 0.8);
      glazeGrad.addColorStop(0.0, '#78350f');
      glazeGrad.addColorStop(0.6, '#451a03');
      glazeGrad.addColorStop(1.0, '#9a3412');
      ctx.fillStyle = glazeGrad;
      ctx.beginPath();
      ctx.moveTo(-6.5, -4.2);
      ctx.lineTo(6.5, -4.2);
      ctx.lineTo(6.5, -0.4);
      ctx.bezierCurveTo(4.0, 0.8, 2.2, -0.8, 0.0, 0.5);
      ctx.bezierCurveTo(-2.2, 1.4, -4.0, -0.6, -6.5, 0.2);
      ctx.closePath();
      ctx.fill();

      // Incised traditional Russian folk-wave shoulder band
      ctx.strokeStyle = 'rgba(254, 215, 170, 0.42)';
      ctx.lineWidth = 0.42;
      ctx.beginPath();
      for (let wx = -5.6; wx <= 4.6; wx += 2.0) {
        ctx.moveTo(wx, 1.2);
        ctx.quadraticCurveTo(wx + 0.5, 0.4, wx + 1.0, 1.2);
        ctx.quadraticCurveTo(wx + 1.5, 2.0, wx + 2.0, 1.2);
      }
      ctx.stroke();

      // Glaze highlight streak
      ctx.fillStyle = 'rgba(255, 237, 213, 0.34)';
      ctx.beginPath();
      ctx.ellipse(-3.6, 1.2, 1.05, 3.2, 0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Thick flared glazed ceramic rim lip
      ctx.fillStyle = '#7c2d12';
      ctx.beginPath();
      ctx.ellipse(0, -3.9, 5.4, 1.75, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(253, 186, 116, 0.48)';
      ctx.lineWidth = 0.38;
      ctx.stroke();

      if (!isOpen) {
        // Fitted domed terracotta clay lid OR rustic parchment wrap tied with hemp twine
        const clothGrad = ctx.createRadialGradient(-1.5, -5.8, 0.4, 0, -4.8, 5.6);
        clothGrad.addColorStop(0.0, '#fffbeb');
        clothGrad.addColorStop(0.55, '#fde68a');
        clothGrad.addColorStop(1.0, '#d97706');
        ctx.fillStyle = clothGrad;
        ctx.beginPath();
        ctx.moveTo(-4.8, -5.6);
        ctx.quadraticCurveTo(0, -7.2, 4.8, -5.6);
        ctx.lineTo(5.4, -3.1);
        ctx.quadraticCurveTo(2.6, -2.3, 0, -3.1);
        ctx.quadraticCurveTo(-2.6, -2.3, -5.4, -3.1);
        ctx.closePath();
        ctx.fill();

        // Tightly knotted brown hemp twine around neck
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 0.78;
        ctx.beginPath();
        ctx.moveTo(-5.0, -3.6);
        ctx.quadraticCurveTo(0, -2.8, 5.0, -3.6);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(2.4, -3.3);
        ctx.lineTo(3.8, -2.0);
        ctx.moveTo(2.4, -3.3);
        ctx.lineTo(2.8, -1.7);
        ctx.stroke();
      } else {
        // Open deep glazed interior cavity + dynamic contents if filled
        const hasFluid = item?.fluidStorage && item.fluidStorage.currentMl > 0;
        const innerC = hasFluid
          ? item.fluidStorage.attributes?.customColor || '#f59e0b'
          : '#1c1917';
        ctx.fillStyle = innerC;
        ctx.beginPath();
        ctx.ellipse(0, -3.85, 4.4, 1.3, 0, 0, Math.PI * 2);
        ctx.fill();
        if (hasFluid) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
          ctx.beginPath();
          ctx.ellipse(-1.4, -4.05, 1.3, 0.32, -0.1, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
      return true;
    }

    default:
      return false;
  }
}
