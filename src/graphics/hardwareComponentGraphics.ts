// Attribute-Driven Procedural 2.5D Studio Canvas Models for Unified Hardware Components
// Renders unified components: hw_display, hw_cpu, hw_ram, hw_ssd, hw_hdd, hw_battery,
// hw_motherboard, hw_camera, hw_modem, hw_speaker, hw_charging_port

import type { HardwareComponentAttributes, HardwareComponentKind } from '../types';
import { drawShadow, drawGlossBand } from './itemGraphicShared';

function shadeHex(hex: string, amount: number): string {
  const clean = (hex || '#334155').replace('#', '');
  const full = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean.padEnd(6, '0').slice(0, 6);
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return hex || '#334155';
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  const mix = (c: number) =>
    amount >= 0
      ? Math.min(255, Math.round(c + (255 - c) * amount))
      : Math.max(0, Math.round(c * (1 + amount)));
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

function getColors(kind: HardwareComponentKind, item?: any): { base: string; accent: string; attrs?: HardwareComponentAttributes } {
  const attrs: HardwareComponentAttributes | undefined = item?.hardwareAttributes;
  const defaults: Record<HardwareComponentKind, { base: string; accent: string }> = {
    hw_display: { base: '#0f172a', accent: '#d97706' },
    hw_cpu: { base: '#1e293b', accent: '#eab308' },
    hw_ram: { base: '#18181b', accent: '#38bdf8' },
    hw_ssd: { base: '#14532d', accent: '#f59e0b' },
    hw_hdd: { base: '#475569', accent: '#22c55e' },
    hw_battery: { base: '#1f2937', accent: '#fbbf24' },
    hw_motherboard: { base: '#064e3b', accent: '#eab308' },
    hw_camera: { base: '#111827', accent: '#0284c7' },
    hw_modem: { base: '#334155', accent: '#38bdf8' },
    hw_speaker: { base: '#27272a', accent: '#b45309' },
    hw_charging_port: { base: '#3f3f46', accent: '#d97706' }
  };
  const d = defaults[kind];
  return {
    base: attrs?.colorHex || d.base,
    accent: attrs?.accentHex || d.accent,
    attrs
  };
}

export function drawHardwareComponentItem(
  ctx: CanvasRenderingContext2D,
  itemId: string,
  item?: any
): boolean {
  switch (itemId) {
    // 1. Display Module (OLED / AMOLED / LCD + FPC ribbon)
    case 'hw_display': {
      const { base, accent } = getColors('hw_display', item);
      drawShadow(ctx, 6.2, 2.3, 8.6, 0.28);

      // Flex ribbon cable protruding at bottom right
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.roundRect(1.2, 6.2, 3.2, 3.3, 0.5);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(1.5 + i * 0.72, 8.4, 0.42, 0.9);
      }

      // Slim anodized frame
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.roundRect(-5.8, -8.8, 11.6, 16.4, 1.8);
      ctx.fill();

      // Deep anti-reflective glass panel
      const glassGrad = ctx.createLinearGradient(-5.2, -8.2, 5.2, 7.0);
      glassGrad.addColorStop(0.0, shadeHex(base, 0.22));
      glassGrad.addColorStop(0.45, base);
      glassGrad.addColorStop(1.0, shadeHex(base, -0.35));
      ctx.fillStyle = glassGrad;
      ctx.beginPath();
      ctx.roundRect(-5.2, -8.2, 10.4, 15.2, 1.3);
      ctx.fill();

      // Subtle OLED diagonal reflection + punch-hole
      ctx.fillStyle = 'rgba(148, 163, 184, 0.16)';
      ctx.beginPath();
      ctx.moveTo(-4.8, -7.8);
      ctx.lineTo(2.4, -7.8);
      ctx.lineTo(-4.8, 2.4);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#020617';
      ctx.beginPath();
      ctx.arc(0, -7.0, 0.55, 0, Math.PI * 2);
      ctx.fill();

      drawGlossBand(ctx, -4.4, -7.4, 1.6, 13.0, 0.14);
      return true;
    }

    // 2. Processor (CPU / SoC BGA Package)
    case 'hw_cpu': {
      const { base, accent } = getColors('hw_cpu', item);
      drawShadow(ctx, 7.0, 2.4, 7.2, 0.28);

      // Multi-layer organic substrate PCB
      ctx.fillStyle = '#065f46';
      ctx.beginPath();
      ctx.roundRect(-7.2, -7.2, 14.4, 14.4, 1.2);
      ctx.fill();
      ctx.strokeStyle = accent;
      ctx.lineWidth = 0.45;
      ctx.stroke();

      // Gold perimeter contact pads / SMD capacitors
      ctx.fillStyle = accent;
      for (let i = -5.6; i <= 5.6; i += 1.6) {
        ctx.fillRect(i - 0.3, -6.7, 0.6, 0.8);
        ctx.fillRect(i - 0.3, 5.9, 0.6, 0.8);
        ctx.fillRect(-6.7, i - 0.3, 0.8, 0.6);
        ctx.fillRect(5.9, i - 0.3, 0.8, 0.6);
      }

      // Metallic heatspreader / silicon die
      const dieGrad = ctx.createLinearGradient(-4.8, -4.8, 4.8, 4.8);
      dieGrad.addColorStop(0.0, shadeHex(base, 0.42));
      dieGrad.addColorStop(0.5, base);
      dieGrad.addColorStop(1.0, shadeHex(base, -0.35));
      ctx.fillStyle = dieGrad;
      ctx.beginPath();
      ctx.roundRect(-4.8, -4.8, 9.6, 9.6, 0.9);
      ctx.fill();

      // Pin-1 orientation gold triangle
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.moveTo(-4.4, 4.4);
      ctx.lineTo(-2.6, 4.4);
      ctx.lineTo(-4.4, 2.6);
      ctx.closePath();
      ctx.fill();

      // Laser-etched die markings
      ctx.fillStyle = 'rgba(226, 232, 240, 0.72)';
      ctx.fillRect(-2.6, -1.6, 5.2, 0.6);
      ctx.fillRect(-2.0, -0.3, 4.0, 0.5);
      ctx.fillRect(-1.4, 1.0, 2.8, 0.5);
      return true;
    }

    // 3. RAM Module (LPDDR5X / DDR DIMM chip)
    case 'hw_ram': {
      const { base, accent } = getColors('hw_ram', item);
      drawShadow(ctx, 8.2, 2.2, 5.4, 0.26);

      // Compact dark PCB module
      ctx.fillStyle = '#064e3b';
      ctx.beginPath();
      ctx.roundRect(-8.8, -4.4, 17.6, 8.8, 0.8);
      ctx.fill();

      // Gold edge connector pins along bottom
      ctx.fillStyle = '#eab308';
      for (let x = -7.8; x <= 7.4; x += 1.15) {
        if (Math.abs(x + 1.2) < 0.7) continue; // key notch
        ctx.fillRect(x, 3.2, 0.65, 1.3);
      }

      // 4 black DRAM IC dies
      for (let i = 0; i < 4; i++) {
        const dx = -7.6 + i * 3.95;
        const icGrad = ctx.createLinearGradient(dx, -3.2, dx + 3.2, 2.2);
        icGrad.addColorStop(0, shadeHex(base, 0.25));
        icGrad.addColorStop(1, shadeHex(base, -0.35));
        ctx.fillStyle = icGrad;
        ctx.beginPath();
        ctx.roundRect(dx, -3.2, 3.2, 5.2, 0.35);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.22)';
        ctx.fillRect(dx + 0.5, -2.2, 2.2, 0.45);
      }

      // Accent top bar
      ctx.fillStyle = accent;
      ctx.fillRect(-8.2, -4.2, 16.4, 0.6);
      return true;
    }

    // 4. SSD / Flash Storage (NVMe / UFS)
    case 'hw_ssd': {
      const { base, accent } = getColors('hw_ssd', item);
      drawShadow(ctx, 8.4, 2.3, 5.2, 0.26);

      // PCB body
      const pcbGrad = ctx.createLinearGradient(-8.8, -4.0, 8.8, 4.0);
      pcbGrad.addColorStop(0, shadeHex(base, 0.22));
      pcbGrad.addColorStop(1, shadeHex(base, -0.3));
      ctx.fillStyle = pcbGrad;
      ctx.beginPath();
      ctx.roundRect(-8.8, -4.2, 17.6, 8.4, 0.9);
      ctx.fill();

      // Gold M.2 / UFS connector edge on left
      ctx.fillStyle = '#eab308';
      for (let y = -3.0; y <= 2.6; y += 0.95) {
        if (Math.abs(y - 0.8) < 0.4) continue;
        ctx.fillRect(-9.2, y, 1.4, 0.55);
      }

      // Metallic controller chip
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.roundRect(-6.4, -2.4, 3.8, 4.8, 0.4);
      ctx.fill();
      ctx.fillStyle = '#334155';
      ctx.fillRect(-5.6, -1.6, 2.2, 3.2);

      // 2 NAND Flash packages + copper thermal label stripe
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(-1.8, -3.0, 4.5, 6.0, 0.4);
      ctx.roundRect(3.4, -3.0, 4.5, 6.0, 0.4);
      ctx.fill();

      ctx.fillStyle = accent;
      ctx.fillRect(-1.4, -0.6, 9.0, 1.2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0.2, -0.25, 3.5, 0.45);
      return true;
    }

    // 5. Hard Disk Drive (HDD 2.5" / 3.5" Aluminum Enclosure + Platter Window)
    case 'hw_hdd': {
      const { base, accent } = getColors('hw_hdd', item);
      drawShadow(ctx, 6.8, 2.5, 8.4, 0.3);

      // Die-cast dark aluminum chassis
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(-6.6, -8.6, 13.2, 17.2, 1.3);
      ctx.fill();

      // Brushed stainless top cover
      const topGrad = ctx.createLinearGradient(-6.0, -8.0, 6.0, 8.0);
      topGrad.addColorStop(0.0, shadeHex(base, 0.45));
      topGrad.addColorStop(0.5, base);
      topGrad.addColorStop(1.0, shadeHex(base, -0.35));
      ctx.fillStyle = topGrad;
      ctx.beginPath();
      ctx.roundRect(-5.9, -7.9, 11.8, 15.8, 0.9);
      ctx.fill();

      // Magnetic platter hub & recessed contour
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.45)';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.arc(0, -1.5, 4.3, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.arc(0, -1.5, 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(0, -1.5, 0.6, 0, Math.PI * 2);
      ctx.fill();

      // Spec label sticker at bottom
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.roundRect(-4.6, 3.0, 9.2, 3.8, 0.5);
      ctx.fill();
      ctx.fillStyle = accent;
      ctx.fillRect(-4.6, 3.0, 9.2, 1.1);
      ctx.fillStyle = '#334155';
      ctx.fillRect(-3.6, 4.8, 4.8, 0.55);
      ctx.fillRect(-3.6, 5.7, 3.2, 0.45);

      // Corner Torx screws + SATA gold pins at bottom edge
      ctx.fillStyle = '#0f172a';
      [[-5.0, -7.0], [5.0, -7.0], [-5.0, 7.0], [5.0, 7.0]].forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(sx, sy, 0.55, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.fillStyle = '#eab308';
      ctx.fillRect(-4.2, 8.1, 3.6, 0.7);
      ctx.fillRect(0.4, 8.1, 4.2, 0.7);
      return true;
    }

    // 6. Battery (Li-Pol prismatic pouch + BMS + FPC B2B connector)
    case 'hw_battery': {
      const { base, accent } = getColors('hw_battery', item);
      drawShadow(ctx, 6.2, 2.3, 8.0, 0.28);

      // Flex cable with B2B connector on top-right
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.roundRect(1.6, -9.8, 2.2, 2.6, 0.4);
      ctx.fill();
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.roundRect(1.2, -10.3, 3.0, 1.2, 0.3);
      ctx.fill();

      // Li-Pol pouch body
      const batGrad = ctx.createLinearGradient(-5.8, -7.4, 5.8, 7.6);
      batGrad.addColorStop(0.0, shadeHex(base, 0.25));
      batGrad.addColorStop(0.5, base);
      batGrad.addColorStop(1.0, shadeHex(base, -0.35));
      ctx.fillStyle = batGrad;
      ctx.beginPath();
      ctx.roundRect(-5.8, -7.4, 11.6, 15.2, 1.1);
      ctx.fill();

      // Kapton protective top BMS tape
      ctx.fillStyle = 'rgba(217, 119, 6, 0.78)';
      ctx.fillRect(-5.6, -7.4, 11.2, 1.8);

      // Lightning charge icon & technical label
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.moveTo(0.8, -3.5);
      ctx.lineTo(-1.8, 0.4);
      ctx.lineTo(-0.1, 0.4);
      ctx.lineTo(-1.1, 3.6);
      ctx.lineTo(1.9, -0.4);
      ctx.lineTo(0.2, -0.4);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
      ctx.fillRect(-3.6, 4.8, 7.2, 0.6);
      ctx.fillRect(-2.4, 5.9, 4.8, 0.5);
      return true;
    }

    // 7. Motherboard / Logic Board (Multi-layer HDI PCB with EMI shields & traces)
    case 'hw_motherboard': {
      const { base, accent } = getColors('hw_motherboard', item);
      drawShadow(ctx, 7.2, 2.5, 8.2, 0.28);

      // L-shaped smartphone logic board PCB
      const pcbGrad = ctx.createLinearGradient(-6.8, -8.2, 6.8, 8.2);
      pcbGrad.addColorStop(0.0, shadeHex(base, 0.24));
      pcbGrad.addColorStop(1.0, shadeHex(base, -0.32));
      ctx.fillStyle = pcbGrad;
      ctx.beginPath();
      ctx.moveTo(-6.4, -8.2);
      ctx.lineTo(6.4, -8.2);
      ctx.lineTo(6.4, 8.2);
      ctx.lineTo(0.2, 8.2);
      ctx.lineTo(0.2, 1.0);
      ctx.lineTo(-6.4, 1.0);
      ctx.closePath();
      ctx.fill();

      // Stainless steel EMI shields
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.roundRect(-5.2, -7.0, 5.0, 6.4, 0.6);
      ctx.roundRect(1.0, -6.4, 4.4, 5.4, 0.6);
      ctx.roundRect(1.2, 0.4, 4.2, 6.4, 0.6);
      ctx.fill();

      // Copper/gold PCB traces & B2B connectors
      ctx.strokeStyle = accent;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(-4.8, 0.2); ctx.lineTo(0.6, 0.2);
      ctx.moveTo(0.4, -7.6); ctx.lineTo(0.4, 7.4);
      ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-5.2, -0.4, 2.8, 1.0);
      ctx.fillRect(1.6, 7.0, 3.2, 0.9);

      // Gold mounting screw holes
      ctx.fillStyle = accent;
      [[-5.4, -7.4], [5.4, -7.4], [5.4, 7.4]].forEach(([hx, hy]) => {
        ctx.beginPath();
        ctx.arc(hx, hy, 0.65, 0, Math.PI * 2);
        ctx.fill();
      });
      return true;
    }

    // 8. Camera Module (Triple Optical Array + Flex Cables)
    case 'hw_camera': {
      const { base, accent } = getColors('hw_camera', item);
      drawShadow(ctx, 6.6, 2.4, 6.8, 0.28);

      // Dual FPC ribbons at bottom
      ctx.fillStyle = '#b45309';
      ctx.fillRect(-3.6, 4.8, 2.2, 3.4);
      ctx.fillRect(1.2, 4.8, 2.4, 3.4);
      ctx.fillStyle = '#eab308';
      ctx.fillRect(-3.4, 7.4, 1.8, 0.7);
      ctx.fillRect(1.4, 7.4, 2.0, 0.7);

      // Anodized optical frame
      ctx.fillStyle = base;
      ctx.beginPath();
      ctx.roundRect(-6.4, -6.8, 12.8, 12.2, 2.0);
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 0.6;
      ctx.stroke();

      // 3 optical barrels with sapphire reflections
      const lenses = [
        { x: -2.8, y: -3.2, r: 2.3 },
        { x: -2.8, y: 2.1, r: 2.0 },
        { x: 2.6, y: -0.6, r: 2.4 }
      ];
      for (const l of lenses) {
        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.arc(l.x, l.y, l.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#020617';
        ctx.beginPath();
        ctx.arc(l.x, l.y, l.r - 0.55, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(l.x - 0.55, l.y - 0.55, 0.65, 0, Math.PI * 2);
        ctx.fill();
      }
      return true;
    }

    // 9. Modem / Wireless Radio Module (RF Shielded Chip + Coax Connectors)
    case 'hw_modem': {
      const { base, accent } = getColors('hw_modem', item);
      drawShadow(ctx, 6.8, 2.2, 6.2, 0.26);

      // Dark RF substrate
      ctx.fillStyle = '#1e3a8a';
      ctx.beginPath();
      ctx.roundRect(-7.2, -5.6, 14.4, 11.2, 1.0);
      ctx.fill();

      // Brushed steel EMI RF shield can
      const canGrad = ctx.createLinearGradient(-5.8, -4.4, 5.8, 4.4);
      canGrad.addColorStop(0.0, shadeHex(base, 0.42));
      canGrad.addColorStop(1.0, shadeHex(base, -0.25));
      ctx.fillStyle = canGrad;
      ctx.beginPath();
      ctx.roundRect(-5.8, -4.4, 11.6, 8.8, 0.7);
      ctx.fill();

      // 3 gold coaxial MHF4 antenna ports on top edge
      ctx.fillStyle = '#eab308';
      [-3.6, 0, 3.6].forEach(cx => {
        ctx.beginPath();
        ctx.arc(cx, -5.0, 0.9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(cx, -5.0, 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#eab308';
      });

      // Wireless wave icon etched on shield
      ctx.strokeStyle = accent;
      ctx.lineWidth = 0.75;
      for (const r of [1.4, 2.6]) {
        ctx.beginPath();
        ctx.arc(0, 1.4, r, -Math.PI * 0.78, -Math.PI * 0.22);
        ctx.stroke();
      }
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(0, 1.6, 0.55, 0, Math.PI * 2);
      ctx.fill();
      return true;
    }

    // 10. Speaker & Haptic Module
    case 'hw_speaker': {
      const { base, accent } = getColors('hw_speaker', item);
      drawShadow(ctx, 7.6, 2.3, 5.6, 0.26);

      // Acoustic chamber box
      const boxGrad = ctx.createLinearGradient(-7.8, -4.6, 7.8, 4.6);
      boxGrad.addColorStop(0, shadeHex(base, 0.25));
      boxGrad.addColorStop(1, shadeHex(base, -0.35));
      ctx.fillStyle = boxGrad;
      ctx.beginPath();
      ctx.roundRect(-7.8, -4.6, 15.6, 9.2, 1.4);
      ctx.fill();

      // Acoustic driver mesh grille (left)
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.roundRect(-6.4, -3.2, 7.2, 6.4, 1.0);
      ctx.fill();
      ctx.strokeStyle = accent;
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.arc(-2.8, 0, 2.1, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#52525b';
      ctx.beginPath();
      ctx.arc(-2.8, 0, 0.9, 0, Math.PI * 2);
      ctx.fill();

      // Haptic actuator coil & gold pogo contacts (right)
      ctx.fillStyle = '#3f3f46';
      ctx.beginPath();
      ctx.roundRect(1.8, -3.0, 4.8, 6.0, 0.8);
      ctx.fill();
      ctx.fillStyle = '#eab308';
      ctx.fillRect(6.9, -2.0, 1.4, 1.1);
      ctx.fillRect(6.9, 0.9, 1.4, 1.1);
      return true;
    }

    // 11. Charging Port & Power Flex (USB-C)
    case 'hw_charging_port': {
      const { base, accent } = getColors('hw_charging_port', item);
      drawShadow(ctx, 7.4, 2.2, 5.4, 0.26);

      // Copper FPC flex ribbon
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.roundRect(-7.4, -2.0, 14.8, 4.0, 0.8);
      ctx.fill();
      ctx.fillStyle = '#18181b';
      ctx.fillRect(-6.8, -1.2, 2.6, 2.4);
      ctx.fillRect(4.2, -1.2, 2.6, 2.4);

      // Central USB Type-C nickel steel receptacle
      const portGrad = ctx.createLinearGradient(-3.0, -5.2, 3.0, 4.8);
      portGrad.addColorStop(0, shadeHex(base, 0.55));
      portGrad.addColorStop(1, shadeHex(base, -0.25));
      ctx.fillStyle = portGrad;
      ctx.beginPath();
      ctx.roundRect(-3.4, -5.0, 6.8, 10.0, 1.2);
      ctx.fill();

      // USB-C oval cavity + central tongue
      ctx.fillStyle = '#020617';
      ctx.beginPath();
      ctx.roundRect(-2.4, 1.2, 4.8, 2.6, 1.2);
      ctx.fill();
      ctx.fillStyle = '#eab308';
      ctx.fillRect(-1.7, 2.25, 3.4, 0.55);
      return true;
    }

    default:
      return false;
  }
}
