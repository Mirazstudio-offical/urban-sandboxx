import React, { useEffect, useRef } from 'react';
import { CarType, Vehicle } from '../types';
import { CAR_CONFIGS, createDefaultVehicleDamage, isRoadMachinery } from '../vehicleHelpers';
import { 
  getVehicleBasePolygon, 
  getVehicleCabinDimensions, 
  renderVehicleGreenhouseAndBodyPanels, 
  renderSpecializedVehicleAttachments, 
  getTruckFrameAxlePositions,
  VehicleRenderContext 
} from '../vehicleVisuals';
import { resolveVehicleTruckFrameAndBody } from '../truckChassisVariants';
import { traceSoftbodyPath, renderSoftbodyStressLines } from '../softbodyVisuals';

export interface VehiclePreviewCanvasProps {
  carType: CarType | string;
  color: string;
  roofColor?: string;
  frameId?: string;
  bodyId?: string;
  width?: number;
  height?: number;
  className?: string;
  showPedestal?: boolean;
  angle?: number;
}

export const VehiclePreviewCanvas: React.FC<VehiclePreviewCanvasProps> = ({
  carType,
  color,
  roofColor,
  frameId,
  bodyId,
  width = 220,
  height = 140,
  className = '',
  showPedestal = true,
  angle = 0
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    const config = CAR_CONFIGS[carType] || CAR_CONFIGS.sedan || {
      width: 20,
      length: 42,
      wheelBase: 26,
      mass: 1400
    };

    const resolvedTruck = resolveVehicleTruckFrameAndBody({
      type: carType,
      frameId,
      bodyId
    });

    const effLength = resolvedTruck ? resolvedTruck.frame.lengthPx : config.length;
    const effWidth = config.width;
    const halfL = effLength / 2;
    const halfW = effWidth / 2;

    const scaleX = (canvas.width * 0.78) / (effLength + 10);
    const scaleY = (canvas.height * 0.74) / (effWidth * 2 + 10);
    const scale = Math.min(scaleX, scaleY, 2.9);

    ctx.translate(canvas.width / 2, canvas.height / 2);
    if (angle !== 0) {
      ctx.rotate(angle);
    }
    ctx.scale(scale, scale);

    // Showroom rotating pedestal platform
    if (showPedestal) {
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(0, 0, halfL * 1.42, halfW * 2.8, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#c68a35';
      ctx.lineWidth = 1.6 / scale;
      ctx.beginPath();
      ctx.ellipse(0, 0, halfL * 1.38, halfW * 2.7, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    const dummyCar = {
      id: 'preview',
      type: carType,
      frameId,
      bodyId,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      angle: 0,
      steerAngle: 0,
      targetSteerAngle: 0,
      speed: 0,
      lateralVelocity: 0,
      angularVelocity: 0,
      mass: resolvedTruck ? resolvedTruck.frame.massKg + resolvedTruck.body.massKg : config.mass,
      length: effLength,
      width: effWidth,
      wheelBase: resolvedTruck ? resolvedTruck.frame.wheelBasePx : config.wheelBase,
      hitchOffset: resolvedTruck && resolvedTruck.body.id === 'body_fifth_wheel' ? resolvedTruck.frame.fifthWheelOffsetPx : (config as { hitchOffset?: number }).hitchOffset,
      color: color || '#38bdf8',
      roofColor: roofColor || color || '#38bdf8',
      headlightsOn: true,
      headlightMode: 'low_beam',
      brakeLightsOn: false,
      isReversing: false,
      turnSignal: 'none',
      turnSignalTimer: 0,
      isLocked: true,
      ownerId: 'player',
      isParked: true,
      isPlayerControlled: false,
      targetSpeed: 0,
      currentLaneId: null,
      targetWaypointIndex: 0,
      routeWaypoints: [],
      aiState: 'parked',
      requiredFuel: 'ai95',
      damage: createDefaultVehicleDamage(effLength, effWidth)
    } as unknown as Vehicle;

    // Drop Shadow under vehicle
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.ellipse(0, 0, halfL * 1.05, halfW * 1.15, 0, 0, Math.PI * 2);
    ctx.fill();

    const isMachinery = isRoadMachinery(dummyCar.type);
    const isSport = dummyCar.type === 'sports' || dummyCar.type === 'supercar' || dummyCar.type === 'coupe_gt' || dummyCar.type === 'hatch_hot';
    const isMicro = dummyCar.type === 'micro_car' || dummyCar.type === 'retro_bubble';
    const isOffroadHeavy = dummyCar.type === 'offroad_hardcore' || dummyCar.type === 'suv_classic_box';

    const wheelL = resolvedTruck ? 11.5 : (isSport ? 10.5 : (isMicro ? 7.6 : 9.5));
    const wheelW = resolvedTruck ? 5.0 : (isSport ? 5.8 : (isMicro ? 3.4 : (isOffroadHeavy ? 4.8 : 4.2)));
    const frontAxleX = dummyCar.type === 'supercar' ? halfL * 0.68 : halfL * 0.65;
    const rearAxleX = -halfL * 0.65;
    const trackY = halfW - 0.8;

    const renderFixedWheel = (wx: number, wy: number, w = wheelW, offroad = false) => {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(wx - wheelL / 2, wy, wheelL, w);
      ctx.fillStyle = isSport ? '#cbd5e1' : '#64748b';
      ctx.fillRect(wx - wheelL / 2 + 2, wy + 0.8, wheelL - 4, w - 1.6);
      if (offroad) {
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 0.8;
        for (let tx = wx - wheelL / 2 + 1.5; tx <= wx + wheelL / 2 - 1.5; tx += 2.2) {
          ctx.beginPath();
          ctx.moveTo(tx - 0.5, wy);
          ctx.lineTo(tx + 0.5, wy + w / 2);
          ctx.lineTo(tx - 0.5, wy + w);
          ctx.stroke();
        }
      }
    };

    const cabinDim = getVehicleCabinDimensions(dummyCar, halfL, halfW, 0, 0);
    const deformFunc = (x: number, y: number): [number, number] => [x, y];
    
    const drawDeformedRect = (x: number, y: number, w: number, h: number, fill: string | CanvasGradient) => {
      ctx.fillStyle = fill;
      ctx.fillRect(x, y, w, h);
    };
    
    const drawDeformedLine = (x1: number, y1: number, x2: number, y2: number, stroke: string, lineWidth = 1) => {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    };
    
    const drawDeformedCircle = (cx: number, cy: number, r: number, fill: string, stroke?: string, lineWidth = 1) => {
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
      }
    };

    const vCtx: VehicleRenderContext = {
      ctx,
      car: dummyCar,
      halfL,
      halfW,
      fc: 0,
      rc: 0,
      cabinX: cabinDim.cabinX,
      cabinL: cabinDim.cabinL,
      cabinW: cabinDim.cabinW,
      deform: deformFunc,
      drawDeformedRect,
      drawDeformedLine,
      drawDeformedCircle,
      nightAlpha: 0.1
    };

    if (!isMachinery) {
      if (resolvedTruck) {
        const { frontAxlesX: frontAxles, rearAxlesX: rearAxles } = getTruckFrameAxlePositions(resolvedTruck.frame, halfL, resolvedTruck.platform);
        const tireType = resolvedTruck.frame.rearTireType;
        const isOffroad = tireType === 'offroad_single';

        for (const rx of rearAxles) {
          if (tireType === 'dual') {
            const dw = 4.2;
            renderFixedWheel(rx, -trackY, dw, false);
            renderFixedWheel(rx, -trackY + dw + 0.5, dw, false);
            renderFixedWheel(rx, trackY - dw, dw, false);
            renderFixedWheel(rx, trackY - dw * 2 - 0.5, dw, false);
          } else {
            const sw = isOffroad ? 6.0 : 5.4;
            renderFixedWheel(rx, -trackY, sw, isOffroad);
            renderFixedWheel(rx, trackY - sw, sw, isOffroad);
          }
        }
        const fw = isOffroad ? 5.6 : 4.8;
        for (const fx of frontAxles) {
          renderFixedWheel(fx, -trackY, fw, isOffroad);
          renderFixedWheel(fx, trackY - fw, fw, isOffroad);
        }
      } else {
        renderFixedWheel(rearAxleX, -trackY);
        renderFixedWheel(rearAxleX, trackY - wheelW);
        renderFixedWheel(frontAxleX, -trackY);
        renderFixedWheel(frontAxleX, trackY - wheelW);
      }

      // Body Shell
      const basePoly = getVehicleBasePolygon(dummyCar, halfL, halfW, 0, 0, 0, 0, 0, 0, 0, 0);
      if (resolvedTruck) {
        const cabRearX = cabinDim.cabinX - cabinDim.cabinL * 0.5 - 0.6;
        const isBareOrTractor = resolvedTruck.body.id === 'body_none' || resolvedTruck.body.id === 'body_fifth_wheel';
        const isZilDump = resolvedTruck.body.attachmentCarType === 'truck_zil_dump';

        ctx.save();
        ctx.beginPath();
        traceSoftbodyPath(ctx, basePoly);
        ctx.closePath();
        ctx.clip();

        ctx.fillStyle = '#141820';
        ctx.fillRect(-halfL - 2, -halfW - 2, halfL * 2 + 4, halfW * 2 + 4);

        if (!isBareOrTractor) {
          ctx.fillStyle = isZilDump ? '#d97706' : dummyCar.color;
          ctx.fillRect(-halfL - 2, -halfW - 2, (cabRearX + halfL) + 4, halfW * 2 + 4);
        }

        ctx.fillStyle = dummyCar.color;
        ctx.fillRect(cabRearX, -halfW - 2, (halfL - cabRearX) + 4, halfW * 2 + 4);
        ctx.restore();
      } else {
        ctx.fillStyle = dummyCar.color;
        ctx.beginPath();
        traceSoftbodyPath(ctx, basePoly);
        ctx.closePath();
        ctx.fill();
      }

      ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      renderSoftbodyStressLines(ctx, basePoly);

      const hasCustomGrille = dummyCar.type === 'sedan_classic' || dummyCar.type === 'sedan_luxury' || 
                              dummyCar.type === 'classic_compact' || dummyCar.type === 'retro_bubble' || 
                              dummyCar.type === 'suv_classic_box' || dummyCar.type === 'van' || 
                              dummyCar.type === 'van_cargo_old' || dummyCar.type === 'delivery_truck' ||
                              dummyCar.type === 'van_camper' || dummyCar.type === 'hatch_hot' ||
                              dummyCar.type === 'police' || dummyCar.type === 'sports' || dummyCar.type === 'supercar' ||
                              dummyCar.type === 'bus_minibus' || dummyCar.type === 'wagon_allroad' || dummyCar.type === 'wagon_classic' ||
                              !!resolvedTruck;
      if (!hasCustomGrille) {
        const grilleW = Math.max(halfW * 1.0, halfW * 2 - 14);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(halfL - 2, -grilleW / 2, 1.5, grilleW);
      }

      // Headlights
      const leftLampX = halfL - 3.2;
      const leftLampY = -halfW + 3.2;
      const rightLampX = halfL - 3.2;
      const rightLampY = halfW - 3.2;

      const drawHeadlight = (lx: number, ly: number) => {
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(lx, ly, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      };

      drawHeadlight(leftLampX, leftLampY);
      drawHeadlight(rightLampX, rightLampY);

      if (!resolvedTruck) {
        // Taillights (for configurable trucks, taillights are rendered on the rear frame crossmember)
        const rearLeftX = -halfL + 2.5;
        const rearLeftY = -halfW + 3.2;
        const rearRightX = -halfL + 2.5;
        const rearRightY = halfW - 3.2;

        const drawTaillight = (rx: number, ry: number) => {
          ctx.fillStyle = '#dc2626';
          ctx.fillRect(rx - 1, ry - 1, 2, 2);
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(rx - 1, ry - 1, 2, 2);
        };

        drawTaillight(rearLeftX, rearLeftY);
        drawTaillight(rearRightX, rearRightY);
      }
    }

    const isLowerLayerTruck = resolvedTruck
      ? (resolvedTruck.body.id === 'body_none' || resolvedTruck.body.id === 'body_fifth_wheel')
      : (dummyCar.type === 'truck_semi');

    if (isLowerLayerTruck) {
      renderSpecializedVehicleAttachments(vCtx);
    }
    if (!isMachinery) {
      renderVehicleGreenhouseAndBodyPanels(vCtx);
    }
    if (!isLowerLayerTruck) {
      renderSpecializedVehicleAttachments(vCtx);
    }

    ctx.restore();
  }, [carType, color, roofColor, frameId, bodyId, width, height, showPedestal, angle]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
      style={{ display: 'block' }}
    />
  );
};
