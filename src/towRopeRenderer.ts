import { Player, GameWorld } from './types';
import { CAR_CONFIGS } from './vehicleHelpers';

export class TowRopeRenderer {
  /**
   * Renders physical towing ropes in the game world.
   */
  public static render(ctx: CanvasRenderingContext2D, world: GameWorld, player: Player) {
    ctx.save();

    const animTime = performance.now() * 0.005;

    // 1. Render towing ropes connected between vehicles
    if (world.towingRopes && world.towingRopes.length > 0) {
      for (const rope of world.towingRopes) {
        const nodes = rope.segments;
        if (!nodes || nodes.length < 2) continue;

        const tension = rope.tension || 0;
        const isTaut = rope.isTaut || tension > 0.05;

        // Apply slight tension vibration to nodes when under heavy pulling force
        const vibrationAmount = tension > 0.2 ? Math.min(1.2, tension * 0.8) : 0;

        // Shadow of the rope on the ground
        const shadowOffsetY = isTaut ? 1.5 : 2.8;
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.lineWidth = 2.4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(nodes[0].x + 1.2, nodes[0].y + shadowOffsetY);
        for (let i = 1; i < nodes.length - 1; i++) {
          const jitter = vibrationAmount > 0 ? Math.sin(animTime * 15 + i) * vibrationAmount * 0.4 : 0;
          const xc = (nodes[i].x + nodes[i + 1].x) / 2 + 1.2;
          const yc = (nodes[i].y + nodes[i + 1].y) / 2 + shadowOffsetY + jitter;
          ctx.quadraticCurveTo(nodes[i].x + 1.2, nodes[i].y + shadowOffsetY + jitter, xc, yc);
        }
        ctx.lineTo(nodes[nodes.length - 1].x + 1.2, nodes[nodes.length - 1].y + shadowOffsetY);
        ctx.stroke();

        // Main Strap Body (Heavy-duty woven nylon recovery strap)
        // High tension shifts color slightly to alert bright orange/yellow
        let strapColor = '#ea580c';
        if (tension > 0.8) {
          strapColor = tension > 1.2 ? '#f97316' : '#f59e0b';
        }

        ctx.strokeStyle = strapColor;
        ctx.lineWidth = isTaut ? Math.max(1.4, 2.2 - tension * 0.3) : 2.2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(nodes[0].x, nodes[0].y);
        for (let i = 1; i < nodes.length - 1; i++) {
          const jitter = vibrationAmount > 0 ? Math.sin(animTime * 25 + i * 2) * vibrationAmount : 0;
          const xc = (nodes[i].x + nodes[i + 1].x) / 2;
          const yc = (nodes[i].y + nodes[i + 1].y) / 2 + jitter;
          ctx.quadraticCurveTo(nodes[i].x, nodes[i].y + jitter, xc, yc);
        }
        ctx.lineTo(nodes[nodes.length - 1].x, nodes[nodes.length - 1].y);
        ctx.stroke();

        // Inner stitched pattern stripe (High-contrast yellow/black stitching along center)
        ctx.strokeStyle = tension > 1.0 ? '#ef4444' : '#facc15';
        ctx.lineWidth = 0.6;
        ctx.setLineDash([3, 2.5]);
        ctx.beginPath();
        ctx.moveTo(nodes[0].x, nodes[0].y);
        for (let i = 1; i < nodes.length - 1; i++) {
          const xc = (nodes[i].x + nodes[i + 1].x) / 2;
          const yc = (nodes[i].y + nodes[i + 1].y) / 2;
          ctx.quadraticCurveTo(nodes[i].x, nodes[i].y, xc, yc);
        }
        ctx.lineTo(nodes[nodes.length - 1].x, nodes[nodes.length - 1].y);
        ctx.stroke();
        ctx.setLineDash([]); // Reset dash

        // Render standard red-and-white diagonal striped safety warning flag (ПДД флажок безопасности)
        if (nodes.length >= 4) {
          const midIdx = Math.floor(nodes.length / 2);
          const flagNode = nodes[midIdx];
          const nextNode = nodes[midIdx + 1] || nodes[midIdx];
          const angle = Math.atan2(nextNode.y - flagNode.y, nextNode.x - flagNode.x);
          this.renderSafetyWarningFlag(ctx, flagNode.x, flagNode.y, angle, isTaut);
        }

        // Render steel safety hooks at both anchor endpoints
        this.renderMetalHook(ctx, nodes[0].x, nodes[0].y);
        this.renderMetalHook(ctx, nodes[nodes.length - 1].x, nodes[nodes.length - 1].y);
      }
    }

    // 2. Render rope being dragged by the player
    if (player.heldTowRope) {
      const nodes = player.heldTowRope.segments;
      if (nodes && nodes.length >= 2) {
        // Shadow on the ground
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.lineWidth = 2.4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(nodes[0].x + 1.2, nodes[0].y + 2.5);
        for (let i = 1; i < nodes.length - 1; i++) {
          const xc = (nodes[i].x + nodes[i + 1].x) / 2 + 1.2;
          const yc = (nodes[i].y + nodes[i + 1].y) / 2 + 2.5;
          ctx.quadraticCurveTo(nodes[i].x + 1.2, nodes[i].y + 2.5, xc, yc);
        }
        ctx.lineTo(nodes[nodes.length - 1].x + 1.2, nodes[nodes.length - 1].y + 2.5);
        ctx.stroke();

        // Main Strap Body
        ctx.strokeStyle = '#ea580c';
        ctx.lineWidth = 2.0;
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

        // Inner stitched pattern stripe
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 0.6;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(nodes[0].x, nodes[0].y);
        for (let i = 1; i < nodes.length - 1; i++) {
          const xc = (nodes[i].x + nodes[i + 1].x) / 2;
          const yc = (nodes[i].y + nodes[i + 1].y) / 2;
          ctx.quadraticCurveTo(nodes[i].x, nodes[i].y, xc, yc);
        }
        ctx.lineTo(nodes[nodes.length - 1].x, nodes[nodes.length - 1].y);
        ctx.stroke();
        ctx.setLineDash([]); // Reset dash

        // Heavy safety carabiner on the vehicle bumper anchor
        this.renderMetalHook(ctx, nodes[0].x, nodes[0].y);

        // Simple loop / knot held in player's hands
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(nodes[nodes.length - 1].x, nodes[nodes.length - 1].y, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  /**
   * Renders a traffic safety warning flag (200x200 mm red & white diagonal striped flag)
   * required by traffic safety regulations on flexible towing links.
   */
  private static renderSafetyWarningFlag(ctx: CanvasRenderingContext2D, x: number, y: number, ropeAngle: number, isTaut: boolean) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ropeAngle);

    // Flag dimensions (scaled to world: 4.5 x 4.5 px)
    const flagW = 4.8;
    const flagH = 4.8;

    // Small mounting collar clip
    ctx.fillStyle = '#334155';
    ctx.fillRect(-1.0, -1.0, 2.0, 2.0);

    // Flag shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(-flagW / 2 + 0.8, 1.2, flagW, flagH);

    // White base plate
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-flagW / 2, 0.6, flagW, flagH);

    // Diagonal red stripes
    ctx.save();
    ctx.beginPath();
    ctx.rect(-flagW / 2, 0.6, flagW, flagH);
    ctx.clip();

    ctx.fillStyle = '#dc2626'; // Vivid red stripe
    ctx.beginPath();
    // Stripe 1
    ctx.moveTo(-flagW / 2 - 2, 0.6);
    ctx.lineTo(-flagW / 2 + 2, 0.6);
    ctx.lineTo(-flagW / 2 - 1, 0.6 + flagH);
    ctx.lineTo(-flagW / 2 - 5, 0.6 + flagH);
    ctx.fill();

    // Stripe 2
    ctx.beginPath();
    ctx.moveTo(-flagW / 2 + 1.5, 0.6);
    ctx.lineTo(-flagW / 2 + 5.5, 0.6);
    ctx.lineTo(-flagW / 2 + 2.5, 0.6 + flagH);
    ctx.lineTo(-flagW / 2 - 1.5, 0.6 + flagH);
    ctx.fill();

    // Stripe 3
    ctx.beginPath();
    ctx.moveTo(-flagW / 2 + 5.0, 0.6);
    ctx.lineTo(-flagW / 2 + 9.0, 0.6);
    ctx.lineTo(-flagW / 2 + 6.0, 0.6 + flagH);
    ctx.lineTo(-flagW / 2 + 2.0, 0.6 + flagH);
    ctx.fill();

    ctx.restore();

    // Fine border
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.4)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(-flagW / 2, 0.6, flagW, flagH);

    ctx.restore();
  }

  /**
   * Renders a heavy-duty steel towing shackle/hook at the bumper anchor position.
   */
  private static renderMetalHook(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.save();
    ctx.translate(x, y);

    // Steel ring collar
    ctx.fillStyle = '#475569'; // Galvanized steel base
    ctx.beginPath();
    ctx.arc(0, 0, 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#94a3b8'; // Polished silver finish
    ctx.beginPath();
    ctx.arc(0, 0, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Small locking latch gate
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-0.4, -0.4, 0.8, 0.8);

    ctx.restore();
  }
}
