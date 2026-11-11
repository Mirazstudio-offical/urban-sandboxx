import { Player, GameWorld } from './types';
import { getLiquidColor } from './vehicleHelpers';

export class WaterHoseRenderer {
  /**
   * Renders the physical water hose, nozzle, micro-leaks, and pressurized water/sludge jet.
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

    const isJetter = !!hose.isJetterHose;
    const isVacuum = !isJetter && (!!hose.isVacuumHose || hose.sourceType === 'trailer_vacuum' || hose.sourceType === 'truck_vacuum');
    const isSuction = !!hose.isSuctionActive;
    const veh = world.vehicles?.find((v) => v.id === hose.vehicleId);
    const liquidColor = veh?.fluidTank ? getLiquidColor(veh.fluidTank.liquidType) : '#5c6b32';

    // 2. Main Hose Body (Matte black rubber OR КО-560 high-pressure orange РВД jacket)
    ctx.strokeStyle = isJetter ? '#ea580c' : '#09090b';
    ctx.lineWidth = isVacuum ? 3.2 : isJetter ? 1.6 : 1.8;
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

    if (isVacuum) {
      // Draw ultra-realistic transverse corrugated rib rings along the physics segments of the hose.
      for (let i = 0; i < nodes.length - 1; i++) {
        const n1 = nodes[i];
        const n2 = nodes[i + 1];
        const dx = n2.x - n1.x;
        const dy = n2.y - n1.y;
        const segLen = Math.hypot(dx, dy);
        
        if (segLen > 0.1) {
          const ux = dx / segLen;
          const uy = dy / segLen;
          const nx = -uy; // Perpendicular normal vector
          const ny = ux;
          
          // Place corrugation ribs every 1.5 pixels along the segment
          const spacing = 1.5;
          for (let d = 0; d < segLen; d += spacing) {
            const rx = n1.x + ux * d;
            const ry = n1.y + uy * d;
            
            // 1. Dark-gray base rib representing the raised rubber ring
            ctx.strokeStyle = '#27272a';
            ctx.lineWidth = 1.05;
            ctx.beginPath();
            ctx.moveTo(rx - nx * 1.7, ry - ny * 1.7);
            ctx.lineTo(rx + nx * 1.7, ry + ny * 1.7);
            ctx.stroke();

            // 2. Bright steel core of the rib for industrial reflection
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 0.65;
            ctx.beginPath();
            ctx.moveTo(rx - nx * 1.55, ry - ny * 1.55);
            ctx.lineTo(rx + nx * 1.55, ry + ny * 1.55);
            ctx.stroke();

            // 3. Highlight sheen/glint on the left/top edge for 3D roundness
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(rx - nx * 1.55, ry - ny * 1.55);
            ctx.lineTo(rx - nx * 0.6, ry - ny * 0.6);
            ctx.stroke();
          }
        }
      }
    } else {
      // 3. Subtle Upper Rubber Sheen / Ridge for 3D depth on normal hose
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
    }

    // 4. Compact Brass & Steel Hose Fitting at Vehicle Anchor
    const anchorNode = nodes[0];
    if (isVacuum) {
      ctx.fillStyle = '#475569'; // Steel camlock coupler
      ctx.beginPath();
      ctx.arc(anchorNode.x, anchorNode.y, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#94a3b8'; // Silver ring
      ctx.beginPath();
      ctx.arc(anchorNode.x, anchorNode.y, 1.7, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#1e293b'; // Steel threaded coupler
      ctx.beginPath();
      ctx.arc(anchorNode.x, anchorNode.y, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#b45309'; // Brass nipple ring
      ctx.beginPath();
      ctx.arc(anchorNode.x, anchorNode.y, 1.0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 5. Micro-leak Punctures & Tiny Droplets along the hose (only on pressurized water hoses)
    if (!isVacuum) {
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
    }

    // 6. Nozzle / Suction Lance in Player's Hands
    const nozzleNode = nodes[nodes.length - 1];
    this.renderHandNozzle(ctx, nozzleNode.x, nozzleNode.y, player.angle, isSpraying, time, isVacuum, isSuction);

    // 7. Full Stream when spraying OR Vacuum Suction Vortex when sucking
    if (isSuction && isVacuum) {
      this.renderVacuumSuctionVortex(ctx, nozzleNode.x, nozzleNode.y, player.angle, time, hose.suctionLiquidColor || '#5c6b32');
    } else if (isSpraying && isVacuum) {
      this.renderVacuumDischargeStream(ctx, nozzleNode.x, nozzleNode.y, player.angle, time, !!hose.isPressurized, liquidColor);
    } else if (isSpraying) {
      this.renderWaterStream(ctx, nozzleNode.x, nozzleNode.y, player.angle, time, !!hose.isPressurized);
    }

    ctx.restore();
  }

  /**
   * Renders the compact spray pistol OR heavy ANM-53 / KO-505 steel & brass vacuum suction lance.
   */
  private static renderHandNozzle(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    angle: number,
    isSpraying: boolean,
    time: number,
    isVacuum: boolean = false,
    isSuction: boolean = false
  ) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    if (isVacuum) {
      // Heavy Camlock coupler ring at rear
      ctx.fillStyle = '#475569';
      ctx.fillRect(-1.8, -1.5, 2.0, 3.0);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-1.2, -1.8, 0.8, 3.6);

      // Transverse two-handed operator grip bar on the suction pipe (Рукоятки заборной штанги АНМ-53)
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(1.2, -2.8);
      ctx.lineTo(1.2, 2.8);
      ctx.stroke();

      // Main galvanized steel intake pipe (Стальной заборный наконечник d=100 мм)
      ctx.fillStyle = '#334155';
      ctx.fillRect(0.2, -1.25, 4.6, 2.5);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(0.4, -0.75, 4.2, 1.5);

      // Flared brass intake bell mouth (Латунный заборный раструб с защитной сеткой)
      ctx.fillStyle = '#b45309';
      ctx.fillRect(4.8, -1.5, 1.5, 3.0);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(5.8, -1.65, 0.55, 3.3);

      // Active suction glow at bell mouth
      if (isSuction) {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.55)';
        ctx.beginPath();
        ctx.arc(6.4, 0, 1.9 + Math.sin(time * 28) * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
      return;
    }

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
   * Renders the animated inward suction vortex at the vacuum intake bell mouth.
   */
  private static renderVacuumSuctionVortex(
    ctx: CanvasRenderingContext2D,
    muzzleX: number,
    muzzleY: number,
    angle: number,
    time: number,
    liquidColor: string
  ) {
    ctx.save();
    ctx.translate(muzzleX, muzzleY);
    ctx.rotate(angle);

    const intakeTipX = 6.3;
    const coneReach = 24;

    // 1. Soft vacuum depression cone in front of intake bell
    const grad = ctx.createLinearGradient(intakeTipX + coneReach, 0, intakeTipX, 0);
    grad.addColorStop(0, 'rgba(56, 189, 248, 0)');
    grad.addColorStop(0.6, 'rgba(56, 189, 248, 0.22)');
    grad.addColorStop(1, 'rgba(224, 242, 254, 0.65)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(intakeTipX, -1.5);
    ctx.lineTo(intakeTipX + coneReach, -11);
    ctx.lineTo(intakeTipX + coneReach, 11);
    ctx.lineTo(intakeTipX, 1.5);
    ctx.closePath();
    ctx.fill();

    // 2. Three animated inward-collapsing suction rings & fluid streaks
    for (let r = 0; r < 3; r++) {
      const phase = ((time * 3.2 + r * 0.33) % 1.0); // 0 -> 1
      const invPhase = 1.0 - phase; // Moves inward from coneReach -> 0
      const ringX = intakeTipX + invPhase * coneReach;
      const ringRy = 1.5 + invPhase * 8.5;
      const ringRx = 1.0 + invPhase * 3.0;

      ctx.strokeStyle = r === 0 ? liquidColor : 'rgba(224, 242, 254, 0.65)';
      ctx.globalAlpha = Math.min(1, phase * 1.4);
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.ellipse(ringX, 0, ringRx, ringRy, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1.0;

    // 3. Inward streamline streaks converging into the brass bell mouth
    ctx.strokeStyle = liquidColor;
    ctx.lineWidth = 1.2;
    for (let s = -1; s <= 1; s++) {
      const offsetPhase = ((time * 5.0 + (s + 1) * 0.3) % 1.0);
      const startX = intakeTipX + (1.0 - offsetPhase) * coneReach;
      const startY = s * (1.0 - offsetPhase) * 8.0;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(intakeTipX + 0.5, s * 0.6);
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Renders realistic wide-bore d=100mm liquid/sludge gusher stream from the vacuum hose bell mouth
   * matching the actual color of the liquid stored in the cistern.
   */
  private static renderVacuumDischargeStream(
    ctx: CanvasRenderingContext2D,
    muzzleX: number,
    muzzleY: number,
    angle: number,
    time: number,
    isCompressorPushing: boolean,
    liquidColor: string
  ) {
    ctx.save();
    ctx.translate(muzzleX, muzzleY);
    ctx.rotate(angle);

    const startX = 6.2;
    const streamLen = isCompressorPushing ? 46 : 24;

    ctx.strokeStyle = liquidColor;
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = isCompressorPushing ? 3.8 : 2.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(startX, 0);
    ctx.quadraticCurveTo(
      startX + (streamLen - startX) * 0.5,
      1.2 + Math.sin(time * 18) * 1.1,
      streamLen,
      3.5 + Math.cos(time * 15) * 1.4
    );
    ctx.stroke();

    // Impact puddle splash at end of wide-bore gusher
    const splashR = (isCompressorPushing ? 6.5 : 4.2) + Math.sin(time * 14) * 1.2;
    ctx.fillStyle = liquidColor;
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.ellipse(streamLen, 3.5, splashR, splashR * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();

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
