import { Camera, FuelType, GameWorld, GasPumpDispenser, Player, Vehicle } from './types';
import { FUEL_GRADES, GAS_STATION_CONFIG } from './gasStationSystem';
import { getVehicleFuelCapPosition } from './vehicleHelpers';

export class GasStationRenderer {
  /**
   * Render full heavy-duty asphalt ground apron, paved driveways connecting to 4 surrounding roads,
   * parking bays, pedestrian crossings, directional arrows, speed limit markings, and tire marks.
   */
  public static renderGroundApron(
    ctx: CanvasRenderingContext2D,
    world: GameWorld,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    nightAlpha: number = 0
  ) {
    // Outer block boundaries (block 6_6)
    const blockLeft = 4848;
    const blockRight = 5504;
    const blockTop = 4848;
    const blockBottom = 5504;

    // Compact gas station asphalt lot bounds (leaving spacious lawn/sidewalk perimeter!)
    const lotLeft = 4940;
    const lotRight = 5460;
    const lotTop = 4900;
    const lotBottom = 5480;
    const lotWidth = lotRight - lotLeft;
    const lotHeight = lotBottom - lotTop;

    // Viewport cull
    if (maxX < 4780 || minX > 5560 || maxY < 4780 || minY > 5600) return;

    ctx.save();

    // 0. Green Grass Lawn Cushion around the Gas Station Lot
    ctx.fillStyle = '#1b3223'; // Dark manicured lawn green
    ctx.fillRect(blockLeft, blockTop, blockRight - blockLeft, blockBottom - blockTop);

    // Subtle lawn grass texture/blades
    ctx.strokeStyle = '#22442e';
    ctx.lineWidth = 1;
    for (let gx = blockLeft + 15; gx < blockRight - 15; gx += 40) {
      for (let gy = blockTop + 15; gy < blockBottom - 15; gy += 40) {
        if (gx >= lotLeft - 10 && gx <= lotRight + 10 && gy >= lotTop - 10 && gy <= lotBottom + 10) continue;
        ctx.beginPath();
        ctx.moveTo(gx, gy);
        ctx.lineTo(gx - 2, gy - 5);
        ctx.moveTo(gx, gy);
        ctx.lineTo(gx + 2, gy - 6);
        ctx.stroke();
      }
    }

    // Outer Sidewalk along West, North, East, South city roads
    ctx.fillStyle = '#334155';
    ctx.fillRect(blockLeft, blockTop, 16, blockBottom - blockTop); // West curb sidewalk
    ctx.fillRect(blockLeft, blockTop, blockRight - blockLeft, 16); // North curb sidewalk
    ctx.fillRect(blockRight - 16, blockTop, 16, blockBottom - blockTop); // East curb sidewalk
    ctx.fillRect(blockLeft, blockBottom - 16, blockRight - blockLeft, 16); // South curb sidewalk

    // 1. Compact Gas Station Heavy-Duty Industrial Asphalt Apron
    ctx.fillStyle = '#222730';
    ctx.beginPath();
    ctx.roundRect(lotLeft, lotTop, lotWidth, lotHeight, 14);
    ctx.fill();

    // Property Boundary Curb Edge (Granite curb)
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 3.5;
    ctx.stroke();

    // 2. STRICTLY 1 ENTRANCE (ВЪЕЗД) & 1 EXIT (ВЫЕЗД) DRIVEWAYS
    ctx.fillStyle = '#222730';

    // 1 ENTRANCE (West Spacious Flared Ingress: x: 4848..4940, y: 4940..5120 flaring to 4900..5160)
    ctx.beginPath();
    ctx.moveTo(blockLeft, 4940);
    ctx.lineTo(lotLeft + 4, 4900);
    ctx.lineTo(lotLeft + 4, 5160);
    ctx.lineTo(blockLeft, 5120);
    ctx.closePath();
    ctx.fill();

    // 1 EXIT (South Egress onto Meadow Lane: y: 5480..5552, x: 5000..5070)
    ctx.fillRect(5000, lotBottom - 4, 70, blockBottom - lotBottom + 48);

    // Clean drop curb radii at driveway mouths
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2.5;

    // West Entrance curb radii (Top at 4940, Bottom at 5120)
    ctx.beginPath();
    ctx.arc(blockLeft, 4940, 8, Math.PI * 0.5, Math.PI * 1.5, true);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(blockLeft, 5120, 8, Math.PI * 0.5, Math.PI * 1.5, false);
    ctx.stroke();

    // South Exit curb radii
    ctx.beginPath();
    ctx.arc(5000, blockBottom, 8, 0, Math.PI, false);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(5070, blockBottom, 8, 0, Math.PI, false);
    ctx.stroke();

    // Entrance Signboard Post (Green "ВЪЕЗД ➔" on post near West entry, shifted slightly North on the lawn)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(4875, 4912, 4, 14); // post
    ctx.fillStyle = '#16a34a';
    ctx.fillRect(4860, 4902, 34, 12); // sign box
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(4860, 4902, 34, 12);
    ctx.font = 'bold 7px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ВЪЕЗД ➔', 4877, 4908);

    // Exit Signboard Post (Amber "➔ ВЫЕЗД" on post near South exit)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(5085, 5510, 4, 14);
    ctx.fillStyle = '#d97706';
    ctx.fillRect(5070, 5522, 34, 12);
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(5070, 5522, 34, 12);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('➔ ВЫЕЗД', 5087, 5528);

    // 3. Reinforced Concrete Fuel Island Pad (under canopy)
    const canopyX = GAS_STATION_CONFIG.canopyX;
    const canopyY = GAS_STATION_CONFIG.canopyY;
    const canopyW = GAS_STATION_CONFIG.canopyW;
    const canopyH = GAS_STATION_CONFIG.canopyH;

    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.roundRect(canopyX - 10, canopyY - 10, canopyW + 20, canopyH + 20, 10);
    ctx.fill();

    // Concrete expansion joints
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let jx = canopyX; jx <= canopyX + canopyW; jx += 45) {
      ctx.beginPath();
      ctx.moveTo(jx, canopyY - 10);
      ctx.lineTo(jx, canopyY + canopyH + 10);
      ctx.stroke();
    }
    for (let jy = canopyY; jy <= canopyY + canopyH; jy += 45) {
      ctx.beginPath();
      ctx.moveTo(canopyX - 10, jy);
      ctx.lineTo(canopyX + canopyW + 10, jy);
      ctx.stroke();
    }

    // 4. White Road Markings & Directional Flow
    // Dashed lane divider between fuel lanes
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(5090, canopyY - 30);
    ctx.lineTo(5090, canopyY + canopyH + 30);
    ctx.stroke();
    ctx.setLineDash([]);

    // White Stop Lines before pump dispensers
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(4980, 5185, 30, 4); // Island 1 North pump
    ctx.fillRect(4980, 5305, 30, 4); // Island 1 South pump
    ctx.fillRect(5120, 5185, 30, 4); // Island 2 North pump
    ctx.fillRect(5120, 5305, 30, 4); // Island 2 South pump

    // Ingress Directional Arrow pointing East (+X) from West Entrance
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(4880, 5028, 18, 4);
    ctx.beginPath();
    ctx.moveTo(4898, 5023);
    ctx.lineTo(4898, 5037);
    ctx.lineTo(4908, 5030);
    ctx.closePath();
    ctx.fill();

    // Directional Arrows pointing South (+Y) along fueling lanes
    const southArrows = [
      { x: 4995, y: 5125 },
      { x: 5135, y: 5125 },
      { x: 4995, y: 5420 },
      { x: 5135, y: 5420 },
      { x: 5035, y: 5490 } // South exit arrow
    ];

    for (const arr of southArrows) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(arr.x - 2, arr.y - 8, 4, 14);
      ctx.beginPath();
      ctx.moveTo(arr.x - 6, arr.y + 6);
      ctx.lineTo(arr.x + 6, arr.y + 6);
      ctx.lineTo(arr.x, arr.y + 14);
      ctx.closePath();
      ctx.fill();
    }

    // Speed limit "10 км/ч" painted on asphalt
    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('10 км/ч', 4970, 5030);

    // Standard horizontal second "10 км/ч"
    ctx.fillText('10 км/ч', 5035, 5460);

    // Clean painted text "ВЪЕЗД" / "ВЫЕЗД" on asphalt
    ctx.fillStyle = '#22c55e'; // Green
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('ВЪЕЗД', 4915, 5030);

    ctx.fillStyle = '#f59e0b'; // Amber
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('ВЫЕЗД', 5035, 5510);

    // 5. Minimarket Customer Sidewalk & Parking Bays (Spaced well away from entrance canopy!)
    // Shop is at y: 4910..5040. Wide concrete sidewalk extends from y: 5040..5105.
    ctx.fillStyle = '#475569'; // Concrete pedestrian plaza in front of shop
    ctx.fillRect(5230, 5040, 210, 65);
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1;
    for (let cx = 5230; cx <= 5440; cx += 20) {
      ctx.strokeRect(cx, 5040, 20, 65);
    }

    // Parking Bays placed at parkY: 5110 (70px below shop door, clear of canopy!)
    const parkStartX = 5240;
    const parkY = 5110;
    const spotW = 32;
    const spotH = 50;

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;

    for (let i = 0; i < 5; i++) {
      const px = parkStartX + i * (spotW + 6);
      ctx.strokeRect(px, parkY, spotW, spotH);

      // Yellow wheel stops
      ctx.fillStyle = '#eab308';
      ctx.fillRect(px + 3, parkY + 3, spotW - 6, 4);

      if (i === 0) {
        // Disabled parking icon
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(px + 6, parkY + 18, spotW - 12, 20);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText('♿', px + spotW / 2, parkY + 28);
      }
    }

    // Pedestrian Zebra Crossing across the lane connecting parking plaza to canopy
    ctx.fillStyle = '#ffffff';
    for (let zx = 5210; zx <= 5235; zx += 12) {
      ctx.fillRect(zx, 5070, 8, 30);
    }

    // 6. Underground Storage Tank Manholes (East Apron)
    const ustX = 5400;
    const ustY = 5280;

    // Tanker unloading bay outline
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    ctx.strokeRect(ustX - 30, ustY - 45, 45, 90);
    ctx.setLineDash([]);

    ctx.font = 'bold 7px sans-serif';
    ctx.fillStyle = '#eab308';
    ctx.fillText('СЛИВ ТОПЛИВА', ustX - 8, ustY - 35);
    ctx.fillText('ЗОНА АЦ', ustX - 8, ustY + 35);

    // 4 Underground Tank Manhole Covers (Люки резервуаров)
    const tankTypes = [
      { name: '92', color: '#eab308', y: ustY - 20 },
      { name: '95', color: '#22c55e', y: ustY - 7 },
      { name: '100', color: '#ef4444', y: ustY + 6 },
      { name: 'ДТ', color: '#94a3b8', y: ustY + 19 }
    ];

    for (const tank of tankTypes) {
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(ustX - 8, tank.y, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = tank.color;
      ctx.beginPath();
      ctx.arc(ustX - 8, tank.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // 7. Realistic Tire Wear & Oil Spots in front of fuel dispensers
    ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
    ctx.beginPath();
    ctx.ellipse(4995, 5220, 8, 22, 0, 0, Math.PI * 2);
    ctx.ellipse(4995, 5340, 8, 22, 0, 0, Math.PI * 2);
    ctx.ellipse(5135, 5220, 8, 22, 0, 0, Math.PI * 2);
    ctx.ellipse(5135, 5340, 8, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    // 8. High-mast floodlight poles around the lot
    this.renderYardFloodlightPoles(ctx, nightAlpha);

    ctx.restore();
  }

  /**
   * Render high-mast floodlight pole fixtures on the gas station lot.
   */
  private static renderYardFloodlightPoles(ctx: CanvasRenderingContext2D, nightAlpha: number) {
    const poles = [
      { x: 4940, y: 4905 },
      { x: 5440, y: 5280 }
    ];

    for (const p of poles) {
      ctx.save();
      // Concrete Base Plinth Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.arc(p.x + 2, p.y + 3, 8, 0, Math.PI * 2);
      ctx.fill();

      // Concrete Plinth
      ctx.fillStyle = '#64748b';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Steel Pole Post
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Dual Floodlight Crossbar
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(p.x - 10, p.y - 2, 20, 4);

      // Two LED Floodlight Fixtures
      for (const lx of [p.x - 8, p.x + 8]) {
        ctx.fillStyle = nightAlpha > 0.1 ? '#fef08a' : '#94a3b8';
        ctx.fillRect(lx - 3, p.y - 3, 6, 6);
        ctx.strokeStyle = '#020617';
        ctx.strokeRect(lx - 3, p.y - 3, 6, 6);
      }
      ctx.restore();
    }
  }

  /**
   * Render ground apron, pump island concrete pads, markings, bollards, and pump dispensers.
   */
  public static renderGroundPumpsAndIslands(
    ctx: CanvasRenderingContext2D,
    world: GameWorld,
    player: Player,
    nightAlpha: number = 0
  ) {
    if (!world.gasPumps || world.gasPumps.length === 0) return;

    // 1. Concrete Pump Islands (2 large islands under canopy + 1 separate LPG island)
    const island1X = 5020;
    const island2X = 5160;
    const islandCenterY = 5280;
    const islandW = 34;
    const islandH = 180;

    const islands = [
      { x: island1X, y: islandCenterY, isLpg: false, w: islandW, h: islandH },
      { x: island2X, y: islandCenterY, isLpg: false, w: islandW, h: islandH },
      { x: 5040, y: 4940, isLpg: true, w: 180, h: 34 } // separate horizontal LPG island
    ];

    for (const isl of islands) {
      ctx.save();
      // Concrete island shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.beginPath();
      ctx.roundRect(isl.x - isl.w / 2 + 3, isl.y - isl.h / 2 + 4, isl.w, isl.h, 12);
      ctx.fill();

      // Concrete island base
      ctx.fillStyle = '#cbd5e1';
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(isl.x - isl.w / 2, isl.y - isl.h / 2, isl.w, isl.h, 12);
      ctx.fill();
      ctx.stroke();

      // Hazard curb yellow/black border pattern along rounded caps
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.roundRect(isl.x - isl.w / 2 + 2, isl.y - isl.h / 2 + 2, isl.w - 4, isl.h - 4, 10);
      ctx.stroke();
      ctx.setLineDash([]);

      // Safety Crash Bollards at the ends
      if (isl.isLpg) {
        const bollardOffsetsX = [-isl.w / 2 + 14, isl.w / 2 - 14];
        for (const bx of bollardOffsetsX) {
          // Bollard shadow
          ctx.fillStyle = 'rgba(0,0,0,0.3)';
          ctx.beginPath();
          ctx.arc(isl.x + bx + 2, isl.y + 2, 6, 0, Math.PI * 2);
          ctx.fill();

          // Bollard yellow metal cylinder
          ctx.fillStyle = '#eab308';
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(isl.x + bx, isl.y, 5.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Inner reflective dot
          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.arc(isl.x + bx, isl.y, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        const bollardOffsetsY = [-isl.h / 2 + 14, isl.h / 2 - 14];
        for (const by of bollardOffsetsY) {
          // Bollard shadow
          ctx.fillStyle = 'rgba(0,0,0,0.3)';
          ctx.beginPath();
          ctx.arc(isl.x + 2, isl.y + by + 2, 6, 0, Math.PI * 2);
          ctx.fill();

          // Bollard yellow metal cylinder
          ctx.fillStyle = '#eab308';
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(isl.x, isl.y + by, 5.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Inner reflective dot
          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.arc(isl.x, isl.y + by, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Windshield squeegee bucket & fire extinguisher box on island
      if (isl.isLpg) {
        ctx.fillStyle = '#dc2626'; // Red fire extinguisher box
        ctx.fillRect(isl.x - 14, isl.y - 4, 10, 8);
        ctx.strokeStyle = '#7f1d1d';
        ctx.lineWidth = 1;
        ctx.strokeRect(isl.x - 14, isl.y - 4, 10, 8);

        ctx.fillStyle = '#0284c7'; // Blue water bucket
        ctx.beginPath();
        ctx.arc(isl.x + 14, isl.y, 4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#dc2626'; // Red fire extinguisher box
        ctx.fillRect(isl.x - 5, isl.y - 12, 10, 8);
        ctx.strokeStyle = '#7f1d1d';
        ctx.lineWidth = 1;
        ctx.strokeRect(isl.x - 5, isl.y - 12, 10, 8);

        ctx.fillStyle = '#0284c7'; // Blue water bucket
        ctx.beginPath();
        ctx.arc(isl.x, isl.y + 10, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // If this is the LPG island, draw the horizontal LPG storage cylinder tank (цистерна с газом)
      if (isl.isLpg) {
        const cx = isl.x - 42;
        const cy = isl.y;
        const r = 12; // radius
        const len = 56; // cylinder length

        ctx.save();
        
        // Shadow of the cylinder
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath();
        ctx.roundRect(cx - len / 2 - 2, cy - r - 2, len + 4, (r + 2) * 2, r + 2);
        ctx.fill();

        // Steel mounting legs (saddles) holding the cylinder
        ctx.fillStyle = '#475569';
        ctx.fillRect(cx - len / 2 + 8, cy + r - 1, 4, 4);
        ctx.fillRect(cx + len / 2 - 12, cy + r - 1, 4, 4);

        // Cylinder body with linear metallic gradient
        const tankGrad = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
        tankGrad.addColorStop(0, '#94a3b8');
        tankGrad.addColorStop(0.2, '#f1f5f9');
        tankGrad.addColorStop(0.6, '#cbd5e1');
        tankGrad.addColorStop(1, '#64748b');

        ctx.fillStyle = tankGrad;
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.5;

        // Capsule shape for the horizontal tank
        ctx.beginPath();
        ctx.roundRect(cx - len / 2, cy - r, len, r * 2, r);
        ctx.fill();
        ctx.stroke();

        // Bright red vertical warning stripe in the middle of the tank
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(cx - 6, cy - r + 0.5, 12, r * 2 - 1);

        // Warning text written in bold Russian
        ctx.fillStyle = '#1e293b'; // dark slate for extreme contrast
        ctx.font = 'bold 5.5px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('ПРОПАН', cx - 18, cy);
        ctx.fillText('LPG ГАЗ', cx + 18, cy);

        // Analog pressure gauge (манометр)
        ctx.fillStyle = '#f8fafc';
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx - len / 2 - 4, cy, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Gauge pointer
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx - len / 2 - 4, cy);
        ctx.lineTo(cx - len / 2 - 5.5, cy - 1.5);
        ctx.stroke();

        // Metal connection pipes
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx + len / 2, cy);
        ctx.lineTo(cx + len / 2 + 16, cy);
        ctx.stroke();

        ctx.restore();
      }

      ctx.restore();
    }

    // 2. Render each Gas Pump Dispenser Unit
    for (const pump of world.gasPumps) {
      this.renderPumpDispenserUnit(ctx, pump, nightAlpha);
    }

    // 3. Render Price Totem at roadside
    this.renderPriceTotem(ctx, GAS_STATION_CONFIG.priceTotemX, GAS_STATION_CONFIG.priceTotemY, nightAlpha);
  }

  /**
   * Calculate precise origin coordinates for a nozzle / hose on a dispenser unit.
   */
  public static getPumpNozzleOrigin(pump: GasPumpDispenser, fuelType?: FuelType | null): { x: number; y: number } {
    const isLpg = pump.id === 'gas_pump_5_lpg';
    const pumpW = 28;

    if (isLpg) {
      // High-pressure hose manifold on the East side (driveway) of the LPG dispenser
      return { x: pump.x + pumpW / 2 + 1, y: pump.y + 3 };
    }

    // Modern MPD: dispensers 1, 3 face West (-1) and dispensers 2, 4 face East (+1)
    const facingSide = pump.pumpNumber % 2 === 1 ? -1 : 1;
    const holsterX = pump.x + facingSide * (pumpW / 2 + 1);

    const yOffsets: Record<string, number> = {
      ai92: -15,
      ai95: -7.5,
      ai98: 0,
      ai100: 7.5,
      diesel: 15
    };

    const yOff = (fuelType && yOffsets[fuelType] !== undefined) ? yOffsets[fuelType] : 0;
    return { x: holsterX, y: pump.y + yOff };
  }

  /**
   * Render individual high-detail gas pump unit in realistic top-down perspective.
   */
  private static renderPumpDispenserUnit(
    ctx: CanvasRenderingContext2D,
    pump: GasPumpDispenser,
    nightAlpha: number
  ) {
    ctx.save();
    ctx.translate(pump.x, pump.y);

    const pumpW = 28;
    const pumpH = 44;
    const isLpg = pump.id === 'gas_pump_5_lpg';

    if (isLpg) {
      // ==========================================
      // 1. LPG AUTOGAS DISPENSER UNIT (ГРК №5 АГЗС)
      // ==========================================
      const lpgW = 26;
      const lpgH = 32;

      // Island anchor shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.roundRect(-lpgW / 2 + 3, -lpgH / 2 + 4, lpgW, lpgH, 4);
      ctx.fill();

      // Stainless steel pedestal base plate with corner hex bolts
      ctx.fillStyle = '#475569';
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(-lpgW / 2 - 1, -lpgH / 2 - 1, lpgW + 2, lpgH + 2, 3);
      ctx.fill();
      ctx.stroke();

      // Bolts on pedestal corners
      ctx.fillStyle = '#94a3b8';
      const boltPts = [
        [-lpgW / 2 + 1, -lpgH / 2 + 1],
        [lpgW / 2 - 1, -lpgH / 2 + 1],
        [-lpgW / 2 + 1, lpgH / 2 - 1],
        [lpgW / 2 - 1, lpgH / 2 - 1]
      ];
      for (const [bx, by] of boltPts) {
        ctx.fillRect(bx - 0.75, by - 0.75, 1.5, 1.5);
      }

      // Main LPG Column Body (Dual-tone cyan/slate industrial powder-coated metal)
      const lpgBodyGrad = ctx.createLinearGradient(-lpgW / 2, -lpgH / 2, lpgW / 2, lpgH / 2);
      lpgBodyGrad.addColorStop(0, '#0369a1');
      lpgBodyGrad.addColorStop(0.5, '#0284c7');
      lpgBodyGrad.addColorStop(1, '#0f172a');
      ctx.fillStyle = lpgBodyGrad;
      ctx.strokeStyle = '#082f49';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.roundRect(-lpgW / 2, -lpgH / 2, lpgW, lpgH, 3);
      ctx.fill();
      ctx.stroke();

      // Stainless steel central column cap trim
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-lpgW / 2 + 3, -lpgH / 2 + 2, lpgW - 6, 2);

      // Top Glass Head with Russian ADR Flammable Gas Class 2 Placard (Красный ромб "2")
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      const diamondSize = 3.5;
      const dX = -lpgW / 2 + 6;
      const dY = -lpgH / 2 + 7;
      ctx.moveTo(dX, dY - diamondSize);
      ctx.lineTo(dX + diamondSize, dY);
      ctx.lineTo(dX, dY + diamondSize);
      ctx.lineTo(dX - diamondSize, dY);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.6;
      ctx.stroke();

      // High-pressure Glycerin Manometer Dial (Манометр 1.6 МПа)
      const manoX = lpgW / 2 - 6;
      const manoY = -lpgH / 2 + 7;
      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(manoX, manoY, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Pointer
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(manoX, manoY);
      ctx.lineTo(manoX + 1.6, manoY - 1.2);
      ctx.stroke();

      // Emergency Gas Shut-off Mushroom Button (Аварийный СТОП)
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(-lpgW / 2 + 6, lpgH / 2 - 6, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(-lpgW / 2 + 6, lpgH / 2 - 6, 1.8, 0, Math.PI * 2);
      ctx.fill();

      // LCD Display Screen (Backlit Cyan Digital Panel)
      const scrW = 18;
      const scrH = 12;
      ctx.fillStyle = '#020617';
      ctx.fillRect(-scrW / 2 + 1, -scrH / 2 + 2, scrW, scrH);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(-scrW / 2 + 1, -scrH / 2 + 2, scrW, scrH);

      ctx.font = 'bold 4.5px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (pump.isPumping) {
        ctx.fillStyle = '#38bdf8';
        ctx.fillText(`${(pump.currentPumpedLiters || 0).toFixed(1)}L`, 1, -scrH / 2 + 5.5);
        ctx.fillStyle = '#4ade80';
        ctx.fillText(`${pump.displayCost || 0}₽`, 1, -scrH / 2 + 10.5);
      } else if (pump.status === 'completed') {
        ctx.fillStyle = '#4ade80';
        ctx.fillText('ГОТОВО', 1, -scrH / 2 + 5.5);
        ctx.fillText(`${(pump.currentPumpedLiters || 0).toFixed(1)}L`, 1, -scrH / 2 + 10.5);
      } else if (pump.status === 'inserted') {
        ctx.fillStyle = '#facc15';
        ctx.fillText('В БАКЕ', 1, -scrH / 2 + 5.5);
        ctx.fillText('КАССА', 1, -scrH / 2 + 10.5);
      } else {
        ctx.fillStyle = '#38bdf8';
        ctx.fillText('LPG №5', 1, -scrH / 2 + 5.5);
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('32.20₽', 1, -scrH / 2 + 10.5);
      }

      // Heavy LPG Fueling Gun Holster on East side (facing driveway)
      const isTaken = pump.nozzleTaken === 'lpg';
      const holsterY = 3;
      if (!isTaken) {
        // High-pressure brass/metallic clamp nozzle in holster
        ctx.fillStyle = '#0284c7'; // Cyan protective sleeve
        ctx.fillRect(lpgW / 2, holsterY - 2, 3.5, 4.5);
        ctx.fillStyle = '#f59e0b'; // Brass locking clamp
        ctx.fillRect(lpgW / 2 + 3.5, holsterY - 1.5, 2.5, 3);
        ctx.fillStyle = '#64748b'; // Trigger safety lever
        ctx.fillRect(lpgW / 2 + 1, holsterY + 2.5, 2, 1);

        // Heavy rubber hose looping down into holster
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(lpgW / 2 - 2, lpgH / 2 - 2, 4.5, 0, Math.PI);
        ctx.stroke();
      } else {
        // Empty holster slot with sensor switch
        ctx.fillStyle = '#082f49';
        ctx.fillRect(lpgW / 2 - 1, holsterY - 2, 2.5, 4.5);
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(lpgW / 2 - 0.5, holsterY, 1, 1);
      }

    } else {
      // ==============================================================
      // 2. MODERN MULTI-PRODUCT GASOLINE & DIESEL DISPENSER (ТРК 1-4)
      // ==============================================================
      // Dispenser drop shadow on concrete island
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.roundRect(-pumpW / 2 + 2, -pumpH / 2 + 3, pumpW, pumpH, 5);
      ctx.fill();

      // Island base mounting flange with corner anchor studs
      ctx.fillStyle = '#334155';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(-pumpW / 2 - 1.5, -pumpH / 2 - 1.5, pumpW + 3, pumpH + 3, 4);
      ctx.fill();
      ctx.stroke();

      // Anchor studs
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-pumpW / 2, -pumpH / 2, 1.5, 1.5);
      ctx.fillRect(pumpW / 2 - 1.5, -pumpH / 2, 1.5, 1.5);
      ctx.fillRect(-pumpW / 2, pumpH / 2 - 1.5, 1.5, 1.5);
      ctx.fillRect(pumpW / 2 - 1.5, pumpH / 2 - 1.5, 1.5, 1.5);

      // Main Column Housing (Dark graphite steel body with bevelled edges)
      const bodyGrad = ctx.createLinearGradient(-pumpW / 2, 0, pumpW / 2, 0);
      bodyGrad.addColorStop(0, '#1e293b');
      bodyGrad.addColorStop(0.5, '#0f172a');
      bodyGrad.addColorStop(1, '#1e293b');
      ctx.fillStyle = bodyGrad;
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(-pumpW / 2, -pumpH / 2, pumpW, pumpH, 4);
      ctx.fill();
      ctx.stroke();

      // Sleek Corporate Green Head Canopy Roof on top of dispenser
      const headH = 8;
      const headGrad = ctx.createLinearGradient(0, -pumpH / 2, 0, -pumpH / 2 + headH);
      headGrad.addColorStop(0, '#22c55e');
      headGrad.addColorStop(0.6, '#16a34a');
      headGrad.addColorStop(1, '#15803d');
      ctx.fillStyle = headGrad;
      ctx.beginPath();
      ctx.roundRect(-pumpW / 2, -pumpH / 2, pumpW, headH, [4, 4, 0, 0]);
      ctx.fill();

      // White brand accent pinstripe along head
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-pumpW / 2 + 3, -pumpH / 2 + 3, pumpW - 6, 1.5);

      // Emergency Stop Mushroom Button on top-left of roof
      ctx.fillStyle = '#facc15'; // yellow backing disc
      ctx.beginPath();
      ctx.arc(-pumpW / 2 + 5, -pumpH / 2 + headH / 2, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#dc2626'; // red push button
      ctx.beginPath();
      ctx.arc(-pumpW / 2 + 5, -pumpH / 2 + headH / 2, 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Overhead LED Status Beacon Lens on top-right
      let beaconColor = '#4ade80';
      if (pump.status === 'pumping') beaconColor = '#22c55e';
      else if (pump.status === 'completed') beaconColor = '#38bdf8';
      else if (pump.status === 'inserted') beaconColor = '#facc15';
      ctx.fillStyle = beaconColor;
      ctx.beginPath();
      ctx.arc(pumpW / 2 - 5, -pumpH / 2 + headH / 2, 1.8, 0, Math.PI * 2);
      ctx.fill();

      // North Display Screen Pod (Digital LED matrix)
      const dW = 18;
      const dH = 8.5;
      ctx.fillStyle = '#020617';
      ctx.fillRect(-dW / 2, -12.5, dW, dH);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(-dW / 2, -12.5, dW, dH);

      // South Display Screen Pod
      ctx.fillStyle = '#020617';
      ctx.fillRect(-dW / 2, 4, dW, dH);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(-dW / 2, 4, dW, dH);

      // Digital Screen Typography
      ctx.font = 'bold 4.5px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (pump.isPumping) {
        ctx.fillStyle = '#4ade80';
        ctx.fillText(`${(pump.currentPumpedLiters || 0).toFixed(1)}L`, 0, -8.2);
        ctx.fillText(`${pump.displayCost || 0}₽`, 0, 8.2);
      } else if (pump.status === 'completed') {
        ctx.fillStyle = '#38bdf8';
        ctx.fillText('ГОТОВО', 0, -8.2);
        ctx.fillText(`${(pump.currentPumpedLiters || 0).toFixed(1)}L`, 0, 8.2);
      } else if (pump.status === 'inserted') {
        ctx.fillStyle = '#facc15';
        ctx.fillText('В БАКЕ', 0, -8.2);
        ctx.fillText('КАССА', 0, 8.2);
      } else {
        ctx.fillStyle = '#38bdf8';
        ctx.fillText(`ТРК №${pump.pumpNumber}`, 0, -8.2);
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('СТОП', 0, 8.2);
      }

      // 5 Color-coded Nozzle Holsters & Boots along the lane side
      const nozzleTypes = [
        { type: 'ai92', color: '#eab308', y: -15, label: '92' },
        { type: 'ai95', color: '#22c55e', y: -7.5, label: '95' },
        { type: 'ai98', color: '#f97316', y: 0, label: '98' },
        { type: 'ai100', color: '#ef4444', y: 7.5, label: '100' },
        { type: 'diesel', color: '#334155', y: 15, label: 'ДТ' }
      ];

      // Lane-facing side: Odd pumps face West (-1), Even pumps face East (+1)
      const facingSide = pump.pumpNumber % 2 === 1 ? -1 : 1;

      for (const noz of nozzleTypes) {
        const isTaken = pump.nozzleTaken === noz.type;
        const holsterX = facingSide === -1 ? -pumpW / 2 : pumpW / 2;

        if (facingSide === -1) {
          // West side holster
          if (!isTaken) {
            // Stainless holster boot cradle
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(holsterX - 1, noz.y - 2.5, 2, 5);

            // Ergonomic color nozzle handle
            ctx.fillStyle = noz.color;
            ctx.fillRect(holsterX - 3.5, noz.y - 2, 3, 4);

            // Trigger lever guard
            ctx.fillStyle = '#475569';
            ctx.fillRect(holsterX - 2.5, noz.y + 2, 2, 0.8);

            // Metallic curved spout tip pointing into holster
            ctx.fillStyle = '#cbd5e1';
            ctx.fillRect(holsterX - 5.5, noz.y - 1, 2, 2);

            // Small flexible rubber hose loop
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(holsterX - 1, noz.y + 3);
            ctx.quadraticCurveTo(holsterX - 3, noz.y + 5, holsterX, noz.y + 4);
            ctx.stroke();
          } else {
            // Empty holster slot with microswitch
            ctx.fillStyle = '#090d16';
            ctx.fillRect(holsterX - 2, noz.y - 2.5, 2.5, 5);
            ctx.fillStyle = '#64748b';
            ctx.fillRect(holsterX - 1, noz.y, 0.8, 1);
          }
        } else {
          // East side holster
          if (!isTaken) {
            // Stainless holster boot cradle
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(holsterX - 1, noz.y - 2.5, 2, 5);

            // Ergonomic color nozzle handle
            ctx.fillStyle = noz.color;
            ctx.fillRect(holsterX + 0.5, noz.y - 2, 3, 4);

            // Trigger lever guard
            ctx.fillStyle = '#475569';
            ctx.fillRect(holsterX + 0.5, noz.y + 2, 2, 0.8);

            // Metallic curved spout tip pointing into holster
            ctx.fillStyle = '#cbd5e1';
            ctx.fillRect(holsterX + 3.5, noz.y - 1, 2, 2);

            // Small flexible rubber hose loop
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(holsterX + 1, noz.y + 3);
            ctx.quadraticCurveTo(holsterX + 3, noz.y + 5, holsterX, noz.y + 4);
            ctx.stroke();
          } else {
            // Empty holster slot with microswitch
            ctx.fillStyle = '#090d16';
            ctx.fillRect(holsterX - 0.5, noz.y - 2.5, 2.5, 5);
            ctx.fillStyle = '#64748b';
            ctx.fillRect(holsterX + 0.2, noz.y, 0.8, 1);
          }
        }
      }
    }

    ctx.restore();
  }

  /**
   * Render Price Totem with illuminated LED fuel prices.
   */
  private static renderPriceTotem(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    nightAlpha: number
  ) {
    ctx.save();
    ctx.translate(x, y);

    const totemW = 20;
    const totemH = 64;

    // Totem Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.roundRect(-totemW / 2 + 3, -totemH / 2 + 4, totemW, totemH, 4);
    ctx.fill();

    // Monolith Body
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-totemW / 2, -totemH / 2, totemW, totemH, 4);
    ctx.fill();
    ctx.stroke();

    // Brand Header (Bright Green)
    ctx.fillStyle = '#16a34a';
    ctx.beginPath();
    ctx.roundRect(-totemW / 2, -totemH / 2, totemW, 14, [4, 4, 0, 0]);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 5px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('АЗС', 0, -totemH / 2 + 7);

    // Fuel Price Rows
    const prices = [
      { label: '92', price: '52.9', color: '#eab308', y: -totemH / 2 + 19 },
      { label: '95', price: '58.4', color: '#22c55e', y: -totemH / 2 + 28 },
      { label: '100', price: '69.8', color: '#ef4444', y: -totemH / 2 + 37 },
      { label: 'ДТ', price: '64.5', color: '#e2e8f0', y: -totemH / 2 + 46 },
      { label: 'ГАЗ', price: '32.2', color: '#38bdf8', y: -totemH / 2 + 55 }
    ];

    for (const p of prices) {
      // LED segment glow background
      ctx.fillStyle = '#020617';
      ctx.fillRect(-totemW / 2 + 2, p.y - 3.5, totemW - 4, 7);

      ctx.font = 'bold 4px monospace';
      ctx.fillStyle = p.color;
      ctx.textAlign = 'left';
      ctx.fillText(p.label, -totemW / 2 + 3, p.y);
      ctx.textAlign = 'right';
      ctx.fillText(p.price, totemW / 2 - 3, p.y);
    }

    ctx.restore();
  }

  /**
   * Render dynamic rubber fuel hoses connected from pump to player or vehicle.
   */
  public static renderFuelHoses(
    ctx: CanvasRenderingContext2D,
    world: GameWorld,
    player: Player
  ) {
    if (!world.gasPumps) return;

    const time = Date.now() / 1000;

    // 1. Hose connected to player holding nozzle
    if (player.heldFuelNozzle) {
      const nozzle = player.heldFuelNozzle;
      const pump = world.gasPumps.find(p => p.id === nozzle.pumpId);
      if (pump) {
        const origin = this.getPumpNozzleOrigin(pump, nozzle.fuelType);
        const targetX = player.x + Math.cos(player.angle + 0.4) * 12;
        const targetY = player.y + Math.sin(player.angle + 0.4) * 12;

        this.drawCatenaryHose(ctx, origin.x, origin.y, targetX, targetY, nozzle.color, false, time);
        // Draw metallic nozzle in player's hand
        this.drawHandNozzle(ctx, targetX, targetY, player.angle, nozzle.color);
      }
    }

    // 2. Hoses connected to vehicles with inserted nozzles
    if (world.vehicles) {
      for (const veh of world.vehicles) {
        if (veh.fuelingState && veh.fuelingState.nozzleInTank) {
          const pump = world.gasPumps.find(p => p.id === veh.fuelingState?.pumpId);
          if (pump) {
            const origin = this.getPumpNozzleOrigin(pump, veh.fuelingState.fuelType);

            // Vehicle fuel cap position according to archetype
            const capPos = getVehicleFuelCapPosition(veh);

            const grade = FUEL_GRADES[veh.fuelingState.fuelType] || FUEL_GRADES.ai95;
            this.drawCatenaryHose(ctx, origin.x, origin.y, capPos.x, capPos.y, grade.color, pump.isPumping, time);
            this.drawInsertedNozzle(ctx, capPos.x, capPos.y, veh.angle + Math.PI / 2, grade.color, pump.isPumping);
          }
        }
      }
    }
  }

  /**
   * Draw realistic elastic catenary curve for rubber hose.
   */
  private static drawCatenaryHose(
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    gradeColor: string,
    isPumping: boolean,
    time: number
  ) {
    const dist = Math.hypot(x2 - x1, y2 - y1);
    const midX = (x1 + x2) / 2;
    // Sag down with gravity / distance
    const sag = Math.min(28, dist * 0.22);
    const midY = (y1 + y2) / 2 + sag;

    ctx.save();

    // Hose Drop Shadow on Asphalt
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(x1 + 3, y1 + 4);
    ctx.quadraticCurveTo(midX + 3, midY + 5, x2 + 3, y2 + 4);
    ctx.stroke();

    // Base Heavy Rubber Hose (Black)
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(midX, midY, x2, y2);
    ctx.stroke();

    // Highlight sheen along rubber hose
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x1, y1 - 0.5);
    ctx.quadraticCurveTo(midX, midY - 0.5, x2, y2 - 0.5);
    ctx.stroke();

    // If fuel is flowing, draw pulsating glowing energy dots inside hose
    if (isPumping) {
      ctx.strokeStyle = gradeColor;
      ctx.lineWidth = 1.6;
      ctx.setLineDash([6, 12]);
      ctx.lineDashOffset = -(time * 40);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo(midX, midY, x2, y2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }

  /**
   * Draw fuel nozzle in player's hands.
   */
  private static drawHandNozzle(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    angle: number,
    color: string
  ) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // Dark grey hose sleeve at the back
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-3, -1.2, 3, 2.4);

    // Main color-coded nozzle grip
    ctx.fillStyle = color;
    ctx.fillRect(0, -1.5, 5, 3);

    // Sleek metallic spout at the front
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(5, -0.8, 5, 1.6);

    // Small protective guard details
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(1, -1.8, 3, 3.6);

    ctx.restore();
  }

  /**
   * Draw fuel nozzle securely docked into vehicle tank filler.
   */
  private static drawInsertedNozzle(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    angle: number,
    color: string,
    isPumping: boolean
  ) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // Open fuel door flap
    ctx.fillStyle = '#64748b';
    ctx.fillRect(-1, -4, 2, 8);

    // Rubber filler seal
    ctx.fillStyle = '#020617';
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    // Metallic spout inserted into tank (pointing inward to the left)
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(-4, -0.8, 4, 1.6);

    // Color-coded nozzle handle (pointing outward to the right)
    ctx.fillStyle = color;
    ctx.fillRect(0, -1.5, 5, 3);

    // Hose connection sleeve at the rear of the nozzle
    ctx.fillStyle = '#334155';
    ctx.fillRect(5, -1, 2, 2);

    // If pumping, small splash glow ring around filler
    if (isPumping) {
      const pulse = Math.sin(Date.now() / 150) * 0.4 + 0.6;
      ctx.strokeStyle = `rgba(34, 197, 94, ${pulse})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  private static currentCanopyAlpha: number = 1.0;

  /**
   * Render grand overhead canopy roof and neon signage with smooth see-through transparency
   * when player or vehicle is under or near the canopy.
   */
  public static renderCanopyRoof(
    ctx: CanvasRenderingContext2D,
    nightAlpha: number = 0,
    player?: Player,
    world?: GameWorld
  ) {
    const x = GAS_STATION_CONFIG.canopyX;
    const y = GAS_STATION_CONFIG.canopyY;
    const w = GAS_STATION_CONFIG.canopyW;
    const h = GAS_STATION_CONFIG.canopyH;

    // 1. Calculate proximity of player or vehicle to the canopy footprint
    let targetAlpha = 1.0;
    if (player) {
      let targetX = player.x;
      let targetY = player.y;

      if (player.isInVehicle && world?.vehicles) {
        const veh = world.vehicles.find((v) => v.id === player.currentVehicleId);
        if (veh) {
          targetX = veh.x;
          targetY = veh.y;
        }
      }

      // Proximity to canopy rectangle
      const dx = Math.max(x - targetX, 0, targetX - (x + w));
      const dy = Math.max(y - targetY, 0, targetY - (y + h));
      const dist = Math.hypot(dx, dy);

      // Also check if any fuel nozzle is held or attached
      const isHoldingNozzle = player.heldFuelNozzle !== null && player.heldFuelNozzle !== undefined;

      if (dist <= 0 || isHoldingNozzle) {
        // Directly under canopy: high transparency (0.05) so ground, car, pumps, and hoses are crystal clear
        targetAlpha = 0.05;
      } else if (dist < 130) {
        // Smooth fade as approaching the canopy
        targetAlpha = 0.05 + (dist / 130) * 0.95;
      } else {
        targetAlpha = 1.0;
      }
    }

    // Smooth continuous transition
    this.currentCanopyAlpha += (targetAlpha - this.currentCanopyAlpha) * 0.16;
    if (this.currentCanopyAlpha < 0.02) this.currentCanopyAlpha = 0.02;
    if (this.currentCanopyAlpha > 1.0) this.currentCanopyAlpha = 1.0;

    const roofAlpha = this.currentCanopyAlpha;

    ctx.save();

    // 2. Always draw the 4 sturdy industrial steel support columns standing directly ON the concrete islands
    // (Island 0 centerline x=5020, Island 1 centerline x=5160, clear of all driving lanes)
    const columns = [
      { x: 5020, y: y + 36 },
      { x: 5160, y: y + 36 },
      { x: 5020, y: y + h - 36 },
      { x: 5160, y: y + h - 36 }
    ];

    for (const col of columns) {
      // Column base shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.roundRect(col.x - 7, col.y - 7 + 2, 14, 14, 3);
      ctx.fill();

      // Concrete plinth
      ctx.fillStyle = '#475569';
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(col.x - 6, col.y - 6, 12, 12, 3);
      ctx.fill();
      ctx.stroke();

      // Steel truss vertical post
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(col.x - 4, col.y - 4, 8, 8);
      ctx.fillStyle = '#16a34a'; // Green brand stripe on pillar
      ctx.fillRect(col.x - 4, col.y - 1, 8, 2);
    }

    // 3. When player is underneath, draw subtle translucent glass/truss skeleton and neon trim
    if (roofAlpha < 0.95) {
      // Translucent roof tint
      ctx.fillStyle = `rgba(15, 23, 42, ${(roofAlpha * 0.35).toFixed(3)})`;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 8);
      ctx.fill();

      // Translucent illuminated neon perimeter
      ctx.strokeStyle = `rgba(34, 197, 94, ${Math.max(0.22, roofAlpha).toFixed(3)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(x + 2, y + 2, w - 4, h - 4, 6);
      ctx.stroke();

      // Translucent truss grid
      ctx.strokeStyle = `rgba(51, 65, 85, ${Math.max(0.12, roofAlpha * 0.5).toFixed(3)})`;
      ctx.lineWidth = 1;
      for (let px = x + 35; px < x + w; px += 45) {
        ctx.beginPath();
        ctx.moveTo(px, y + 4);
        ctx.lineTo(px, y + h - 4);
        ctx.stroke();
      }
      for (let py = y + 35; py < y + h; py += 45) {
        ctx.beginPath();
        ctx.moveTo(x + 4, py);
        ctx.lineTo(x + w - 4, py);
        ctx.stroke();
      }

      // Floating brand neon sign (faintly glowing at 0.3 alpha when see-through)
      ctx.font = '900 12px sans-serif';
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.28, roofAlpha).toFixed(3)})`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = 6;
      ctx.fillText('НЕФТЬ • МАГИСТРАЛЬ  24/7', x + w / 2, y + 18);
      ctx.shadowBlur = 0;
    }

    // 4. Solid Roof Layers (Fading in with roofAlpha)
    if (roofAlpha > 0.05) {
      ctx.globalAlpha = roofAlpha;

      // Canopy Roof Base (Dark composite metal ceiling panel)
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 8);
      ctx.fill();
      ctx.stroke();

      // Outer Illuminated Neon Fascia Border (Brand Green & White)
      ctx.strokeStyle = '#16a34a';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(x + 2, y + 2, w - 4, h - 4, 6);
      ctx.stroke();

      // Inner Ceiling Panels Grid
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      for (let px = x + 30; px < x + w; px += 40) {
        ctx.beginPath();
        ctx.moveTo(px, y + 4);
        ctx.lineTo(px, y + h - 4);
        ctx.stroke();
      }
      for (let py = y + 30; py < y + h; py += 40) {
        ctx.beginPath();
        ctx.moveTo(x + 4, py);
        ctx.lineTo(x + w - 4, py);
        ctx.stroke();
      }

      // 8 Bright LED Ceiling Spotlights
      const lightCols = [x + 60, x + 135, x + 210];
      const lightRows = [y + 50, y + 105, y + 160];

      for (const lx of lightCols) {
        for (const ly of lightRows) {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(lx, ly, 4, 0, Math.PI * 2);
          ctx.fill();

          if (nightAlpha > 0.1) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.beginPath();
            ctx.arc(lx, ly, 22, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Brand Neon Signage on Canopy Front ("НЕФТЬ-МАГИСТРАЛЬ 24/7")
      ctx.font = '900 13px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = 10;
      ctx.fillText('НЕФТЬ • МАГИСТРАЛЬ  24/7', x + w / 2, y + 20);
      ctx.fillText('APEX PETROL • DRIVE-THRU', x + w / 2, y + h - 18);
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }

  /**
   * Render nighttime light cutouts on the offscreen lightmap canvas (Pass 1 - destination-out).
   * Cuts out darkness overlay for canopy, minimarket, price totem, signposts, and floodlights.
   */
  public static renderLightmapCutouts(
    lCtx: CanvasRenderingContext2D,
    nightAlpha: number,
    fogFactor: number = 1.0
  ) {
    if (nightAlpha < 0.05) return;

    const canopyX = GAS_STATION_CONFIG.canopyX;
    const canopyY = GAS_STATION_CONFIG.canopyY;
    const canopyW = GAS_STATION_CONFIG.canopyW;
    const canopyH = GAS_STATION_CONFIG.canopyH;

    // 1. Under-Canopy Floodlight Cutout (Bright overhead light under canopy)
    const cCenterX = canopyX + canopyW / 2;
    const cCenterY = canopyY + canopyH / 2;
    const canopyRadius = Math.max(canopyW, canopyH) * 0.82;

    const cGrad = lCtx.createRadialGradient(cCenterX, cCenterY, 30, cCenterX, cCenterY, canopyRadius);
    cGrad.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
    cGrad.addColorStop(0.6, 'rgba(0, 0, 0, 0.9)');
    cGrad.addColorStop(0.85, 'rgba(0, 0, 0, 0.45)');
    cGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');

    lCtx.fillStyle = cGrad;
    lCtx.beginPath();
    lCtx.roundRect(canopyX - 50, canopyY - 50, canopyW + 100, canopyH + 100, 35);
    lCtx.fill();

    // 2. Minimarket Shop Interior & Customer Plaza Cutout
    const shopX = 5230;
    const shopY = 4910;
    const shopW = 210;
    const shopH = 130;

    const sCenterX = shopX + shopW / 2;
    const sCenterY = shopY + shopH / 2 + 25;
    const shopRadius = 150 * fogFactor;

    const shopGrad = lCtx.createRadialGradient(sCenterX, sCenterY, 20, sCenterX, sCenterY, shopRadius);
    shopGrad.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
    shopGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.85)');
    shopGrad.addColorStop(0.85, 'rgba(0, 0, 0, 0.3)');
    shopGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');

    lCtx.fillStyle = shopGrad;
    lCtx.beginPath();
    lCtx.roundRect(shopX - 20, shopY - 20, shopW + 40, shopH + 110, 25);
    lCtx.fill();

    // 3. Price Totem Cutout
    const totemX = GAS_STATION_CONFIG.priceTotemX;
    const totemY = GAS_STATION_CONFIG.priceTotemY;
    const totemRadius = 85 * fogFactor;

    const totemGrad = lCtx.createRadialGradient(totemX, totemY, 4, totemX, totemY, totemRadius);
    totemGrad.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
    totemGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.65)');
    totemGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');

    lCtx.fillStyle = totemGrad;
    lCtx.beginPath();
    lCtx.arc(totemX, totemY, totemRadius, 0, Math.PI * 2);
    lCtx.fill();

    // 4. Entrance & Exit Signposts Cutouts
    const signs = [
      { x: 4877, y: 4898 },
      { x: 5087, y: 5528 }
    ];
    for (const s of signs) {
      const sGrad = lCtx.createRadialGradient(s.x, s.y, 2, s.x, s.y, 45 * fogFactor);
      sGrad.addColorStop(0, 'rgba(0, 0, 0, 0.95)');
      sGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      lCtx.fillStyle = sGrad;
      lCtx.beginPath();
      lCtx.arc(s.x, s.y, 45 * fogFactor, 0, Math.PI * 2);
      lCtx.fill();
    }

    // 5. High-Mast Yard Floodlight Poles (NW & East Apron)
    const yardLamps = [
      { x: 4940, y: 4905 },
      { x: 5440, y: 5280 }
    ];
    for (const yL of yardLamps) {
      const yRadius = 120 * fogFactor;
      const yGrad = lCtx.createRadialGradient(yL.x, yL.y, 6, yL.x, yL.y, yRadius);
      yGrad.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
      yGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.6)');
      yGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      lCtx.fillStyle = yGrad;
      lCtx.beginPath();
      lCtx.arc(yL.x, yL.y, yRadius, 0, Math.PI * 2);
      lCtx.fill();
    }
  }

  /**
   * Render additive glowing optics, halos, and neon streams for gas station (Pass 2 - lighter).
   */
  public static renderAdditiveGlow(
    ctx: CanvasRenderingContext2D,
    nightAlpha: number,
    fogFactor: number = 1.0
  ) {
    if (nightAlpha < 0.05) return;

    const canopyX = GAS_STATION_CONFIG.canopyX;
    const canopyY = GAS_STATION_CONFIG.canopyY;
    const canopyW = GAS_STATION_CONFIG.canopyW;
    const canopyH = GAS_STATION_CONFIG.canopyH;

    // 1. 8 Overhead Canopy LED Spotlight Optics & Floor Light Pools
    const lightCols = [canopyX + 60, canopyX + 135, canopyX + 210];
    const lightRows = [canopyY + 50, canopyY + 105, canopyY + 160];

    for (const lx of lightCols) {
      for (const ly of lightRows) {
        const spotRadius = 48 * fogFactor;
        const spotGrad = ctx.createRadialGradient(lx, ly, 2, lx, ly, spotRadius);
        spotGrad.addColorStop(0, `rgba(255, 255, 240, ${0.7 * nightAlpha})`);
        spotGrad.addColorStop(0.4, `rgba(250, 240, 190, ${0.35 * nightAlpha})`);
        spotGrad.addColorStop(1, 'rgba(250, 240, 190, 0)');

        ctx.fillStyle = spotGrad;
        ctx.beginPath();
        ctx.arc(lx, ly, spotRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 2. Canopy Fascia Neon Halo & Brand Signage Glow
    ctx.strokeStyle = `rgba(34, 197, 94, ${0.65 * nightAlpha})`;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(canopyX + 1, canopyY + 1, canopyW - 2, canopyH - 2, 6);
    ctx.stroke();

    ctx.font = '900 13px sans-serif';
    ctx.fillStyle = `rgba(255, 255, 255, ${0.92 * nightAlpha})`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#22c55e';
    ctx.shadowBlur = 18;
    ctx.fillText('НЕФТЬ • МАГИСТРАЛЬ  24/7', canopyX + canopyW / 2, canopyY + 20);
    ctx.fillText('APEX PETROL • DRIVE-THRU', canopyX + canopyW / 2, canopyY + canopyH - 18);
    ctx.shadowBlur = 0;

    // 3. Minimarket Storefront Golden Ambient Light Stream
    const shopX = 5230;
    const shopY = 4910;
    const shopW = 210;

    const shopGlow = ctx.createRadialGradient(shopX + shopW / 2, shopY + 130, 10, shopX + shopW / 2, shopY + 130, 95 * fogFactor);
    shopGlow.addColorStop(0, `rgba(254, 240, 138, ${0.6 * nightAlpha})`);
    shopGlow.addColorStop(0.5, `rgba(251, 191, 36, ${0.28 * nightAlpha})`);
    shopGlow.addColorStop(1, 'rgba(251, 191, 36, 0)');

    ctx.fillStyle = shopGlow;
    ctx.beginPath();
    ctx.arc(shopX + shopW / 2, shopY + 130, 95 * fogFactor, 0, Math.PI * 2);
    ctx.fill();

    // 4. Price Totem Digital LED Glow
    const totemX = GAS_STATION_CONFIG.priceTotemX;
    const totemY = GAS_STATION_CONFIG.priceTotemY;

    const totemGlow = ctx.createRadialGradient(totemX, totemY, 2, totemX, totemY, 40 * fogFactor);
    totemGlow.addColorStop(0, `rgba(34, 197, 94, ${0.85 * nightAlpha})`);
    totemGlow.addColorStop(0.5, `rgba(234, 179, 8, ${0.4 * nightAlpha})`);
    totemGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = totemGlow;
    ctx.beginPath();
    ctx.arc(totemX, totemY, 40 * fogFactor, 0, Math.PI * 2);
    ctx.fill();

    // 5. High-Mast Yard Floodlight Poles Additive Pools
    const yardLamps = [
      { x: 4940, y: 4905 },
      { x: 5440, y: 5280 }
    ];
    for (const yL of yardLamps) {
      const poolRadius = 100 * fogFactor;
      const yPool = ctx.createRadialGradient(yL.x, yL.y, 4, yL.x, yL.y, poolRadius);
      yPool.addColorStop(0, `rgba(255, 245, 200, ${0.55 * nightAlpha})`);
      yPool.addColorStop(0.5, `rgba(250, 210, 120, ${0.22 * nightAlpha})`);
      yPool.addColorStop(1, 'rgba(250, 210, 120, 0)');

      ctx.fillStyle = yPool;
      ctx.beginPath();
      ctx.arc(yL.x, yL.y, poolRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
