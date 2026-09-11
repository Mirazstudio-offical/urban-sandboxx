import { Player, GameWorld } from './types';

export class WaterHoseRenderer {
  /**
   * Renders the physical water hose, nozzle, micro-leaks, and pressurized water jet.
   */
  public static render(ctx: CanvasRenderingContext2D, world: GameWorld, player: Player) {
    if (!player.heldWaterHose) return;

    const hose = player.heldWaterHose;
    const nodes = hose.segments;
    if (nodes.length < 2) return;

    const time = Date.now() / 1000;
    const isSpraying = hose.isSpraying;

    ctx.save();

    // 1. Soft Shadow on Ground
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.30)';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(nodes[0].x + 1.8, nodes[0].y + 2.5);
    for (let i = 1; i < nodes.length - 1; i++) {
      const xc = (nodes[i].x + nodes[i + 1].x) / 2 + 1.8;
      const yc = (nodes[i].y + nodes[i + 1].y) / 2 + 2.5;
      ctx.quadraticCurveTo(nodes[i].x + 1.8, nodes[i].y + 2.5, xc, yc);
    }
    ctx.lineTo(nodes[nodes.length - 1].x + 1.8, nodes[nodes.length - 1].y + 2.5);
    ctx.stroke();

    // 2. Main Realistic Black Rubber Hose Body (Classic matte black)
    ctx.strokeStyle = '#09090b'; // Solid matte black rubber
    ctx.lineWidth = 1.8; // Slim, realistic top-down hose gauge
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(nodes[0].x, nodes[0].y);
    for (let i = 1; i < nodes.length - 1; i++) {
      const xc = (nodes[i].x + nodes[i + 1].x) / 2;
      const yc = (nodes[i].y + nodes[i + 1].y) / 2;
      ctx.quadraticCurveTo(nodes[i].x, nodes[i].y, xc, yc);
    }
    ctx.lineTo(nodes[nodes.length - 1].x, nodes[nodes.length - 1].y);
    ctx.stroke();

    // 3. Subtle Upper Rubber Sheen / Ridge for 3D depth
    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(nodes[0].x, nodes[0].y - 0.3);
    for (let i = 1; i < nodes.length - 1; i++) {
      const xc = (nodes[i].x + nodes[i + 1].x) / 2;
      const yc = (nodes[i].y + nodes[i + 1].y) / 2 - 0.3;
      ctx.quadraticCurveTo(nodes[i].x, nodes[i].y - 0.3, xc, yc);
    }
    ctx.lineTo(nodes[nodes.length - 1].x, nodes[nodes.length - 1].y - 0.3);
    ctx.stroke();

    // 4. Compact Brass & Steel Hose Fitting at Vehicle Anchor
    const anchorNode = nodes[0];
    ctx.fillStyle = '#1e293b'; // Steel threaded coupler
    ctx.beginPath();
    ctx.arc(anchorNode.x, anchorNode.y, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#b45309'; // Brass nipple ring
    ctx.beginPath();
    ctx.arc(anchorNode.x, anchorNode.y, 1.0, 0, Math.PI * 2);
    ctx.fill();

    // 5. Micro-leak Punctures & Tiny Droplets along the hose
    for (const leak of hose.leaks) {
      const segIdx = Math.min(nodes.length - 2, Math.max(1, leak.segmentIndex));
      const node = nodes[segIdx];
      const next = nodes[segIdx + 1];

      // Perpendicular angle to hose
      const hdx = next.x - node.x;
      const hdy = next.y - node.y;
      const hlen = Math.hypot(hdx, hdy) || 1;
      const normX = -hdy / hlen;
      const normY = hdx / hlen;

      // Tiny worn puncture spot
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.arc(node.x, node.y, 1.2, 0, Math.PI * 2);
      ctx.fill();

      // Fine micro water spray / drip escaping from the hole
      const squirtLen = isSpraying ? (3.5 + Math.sin(time * 16 + segIdx) * 1.8) : (1.2 + Math.sin(time * 6 + segIdx) * 0.8);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(node.x, node.y);
      ctx.lineTo(node.x + normX * squirtLen, node.y + normY * squirtLen);
      ctx.stroke();
    }

    // 6. Compact Realistic Spray Gun / Nozzle in Player's Hands
    const nozzleNode = nodes[nodes.length - 1];
    this.renderHandNozzle(ctx, nozzleNode.x, nozzleNode.y, player.angle, isSpraying, time);

    // 7. Full Water Stream when spraying
    if (isSpraying) {
      this.renderWaterStream(ctx, nozzleNode.x, nozzleNode.y, player.angle, time, !!hose.isPressurized);
    }

    ctx.restore();
  }

  /**
   * Renders the compact, realistic spray pistol / nozzle proportional to player hands.
   */
  private static renderHandNozzle(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    angle: number,
    isSpraying: boolean,
    time: number
  ) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // Hose crimp nut / coupling at rear
    ctx.fillStyle = '#334155';
    ctx.fillRect(-1.5, -0.7, 1.5, 1.4);

    // Main ergonomic pistol body (Impact-resistant black matte composite)
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, -0.75, 3.4, 1.5);

    // Ergonomic top trigger/valve lever
    ctx.fillStyle = isSpraying ? '#ef4444' : '#64748b';
    ctx.fillRect(0.8, -1.4, 1.2, 0.8);

    // Knurled brass/chrome adjustable tip at front
    ctx.fillStyle = '#ca8a04';
    ctx.fillRect(3.4, -0.6, 1.4, 1.2);

    // Tip orifice hole
    ctx.fillStyle = isSpraying ? '#38bdf8' : '#09090b';
    ctx.beginPath();
    ctx.arc(4.8, 0, 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Subtle water glow at tip when spraying
    if (isSpraying) {
      ctx.fillStyle = 'rgba(224, 242, 254, 0.7)';
      ctx.beginPath();
      ctx.arc(4.8, 0, 1.2 + Math.sin(time * 30) * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * Renders the realistic water stream (high-pressure motorized jet vs natural gravity trickle).
   */
  private static renderWaterStream(
    ctx: CanvasRenderingContext2D,
    muzzleX: number,
    muzzleY: number,
    angle: number,
    time: number,
    isPressurized: boolean
  ) {
    ctx.save();
    ctx.translate(muzzleX, muzzleY);
    ctx.rotate(angle);

    const startX = 4.8; // Aligns with the compact nozzle tip

    if (!isPressurized) {
      // --- NATURAL GRAVITY TRICKLE / GARDEN HOSE FLOW ---
      const streamLen = 34;

      // Soft water stream arching gently downwards
      const trickleGrad = ctx.createLinearGradient(startX, 0, streamLen, 0);
      trickleGrad.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
      trickleGrad.addColorStop(0.3, 'rgba(56, 189, 248, 0.7)');
      trickleGrad.addColorStop(0.8, 'rgba(186, 230, 253, 0.5)');
      trickleGrad.addColorStop(1, 'rgba(224, 242, 254, 0)');

      ctx.strokeStyle = trickleGrad;
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(startX, 0);
      // Parabolic drop curve
      ctx.quadraticCurveTo(
        startX + (streamLen - startX) * 0.5,
        1.5 + Math.sin(time * 12) * 0.8,
        streamLen,
        4.5 + Math.sin(time * 16) * 1.2
      );
      ctx.stroke();

      // Gentle small ground splash ripple at end
      const impactX = streamLen;
      const impactY = 4.5;
      const splashR = 3.5 + Math.sin(time * 10) * 1.2;

      ctx.fillStyle = 'rgba(224, 242, 254, 0.35)';
      ctx.beginPath();
      ctx.ellipse(impactX, impactY, splashR, splashR * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
      return;
    }

    // --- HIGH PRESSURE MOTORIZED PUMP STREAM (TRUCK ENGINE RUNNING) ---
    const streamLen = 135;

    // 1. Broad Outer Turbulent Spray Cone (Translucent sky-blue mist)
    const coneGrad = ctx.createLinearGradient(startX, 0, streamLen, 0);
    coneGrad.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
    coneGrad.addColorStop(0.3, 'rgba(186, 230, 253, 0.35)');
    coneGrad.addColorStop(0.7, 'rgba(224, 242, 254, 0.25)');
    coneGrad.addColorStop(1, 'rgba(255, 255, 255, 0.05)');

    ctx.fillStyle = coneGrad;
    ctx.beginPath();
    ctx.moveTo(startX, -1.2);
    ctx.lineTo(streamLen * 0.5, -7 + Math.sin(time * 25) * 1.5);
    ctx.lineTo(streamLen, -14 + Math.sin(time * 20) * 3);
    ctx.lineTo(streamLen, 14 + Math.cos(time * 20) * 3);
    ctx.lineTo(streamLen * 0.5, 7 + Math.cos(time * 25) * 1.5);
    ctx.lineTo(startX, 1.2);
    ctx.closePath();
    ctx.fill();

    // 2. High Pressure Dense Core Stream (White & Bright Cyan)
    const coreGrad = ctx.createLinearGradient(startX, 0, streamLen * 0.85, 0);
    coreGrad.addColorStop(0, '#ffffff');
    coreGrad.addColorStop(0.2, '#e0f2fe');
    coreGrad.addColorStop(0.6, '#38bdf8');
    coreGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');

    ctx.strokeStyle = coreGrad;
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(startX, 0);
    // Subtle high frequency wavy oscillation
    ctx.quadraticCurveTo(
      streamLen * 0.4,
      Math.sin(time * 35) * 1.8,
      streamLen * 0.85,
      Math.cos(time * 30) * 3.5
    );
    ctx.stroke();

    // Inner pure white razor core
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(startX, 0);
    ctx.lineTo(streamLen * 0.5, Math.sin(time * 35) * 0.8);
    ctx.stroke();

    // 3. Impact Ground Splash Rings at target range
    const impactX = streamLen * 0.9;
    const splashRadius = 14 + Math.sin(time * 15) * 4;

    ctx.fillStyle = 'rgba(224, 242, 254, 0.4)';
    ctx.beginPath();
    ctx.ellipse(impactX, 0, splashRadius * 0.7, splashRadius * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(impactX, 0, splashRadius, splashRadius * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }
}
