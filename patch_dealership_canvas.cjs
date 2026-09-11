const fs = require('fs');
let content = fs.readFileSync('src/components/CarDealershipModal.tsx', 'utf8');

const startStr = '// Render top-down live preview of vehicle on Canvas using true in-game vehicle graphics engine';
const endStr = '    ctx.restore();\n  }, [isOpen, selectedCarIndex, selectedColorIndex]);';

const startIdx = content.indexOf(startStr);
const endIdx = content.indexOf(endStr) + endStr.length;

if (startIdx === -1 || endIdx === -1) {
    console.error("Could not find start or end bounds!");
    process.exit(1);
}

const newUseEffect = `// Render top-down live preview of vehicle on Canvas using true in-game vehicle graphics engine
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const config = CAR_CONFIGS[currentCar.type] || CAR_CONFIGS.sedan;
    const scale = Math.min(canvas.width / (config.length * 1.65), canvas.height / (config.width * 2.8));
    
    // UNSCALED logical game units for the graphics engine
    const halfL = config.length / 2;
    const halfW = config.width / 2;

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(scale, scale);

    // Draw showroom rotating pedestal platform
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.ellipse(0, 0, halfL * 1.44, halfW * 3.1, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2 / scale;
    ctx.beginPath();
    ctx.ellipse(0, 0, halfL * 1.40, halfW * 3.0, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Create dummy Vehicle object for in-game render engine
    const dummyCar = {
      id: 'preview',
      type: currentCar.type,
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
      mass: config.mass,
      length: config.length,
      width: config.width,
      wheelBase: config.wheelBase,
      color: currentColor.hex,
      roofColor: currentColor.roofHex || currentColor.hex,
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
      requiredFuel: currentCar.fuelType === 'diesel' ? 'diesel' : (currentCar.fuelType === 'ai92' ? 'ai92' : 'ai95'),
      damage: createDefaultVehicleDamage(config.length, config.width)
    } as unknown as Vehicle;

    // Shadow under vehicle
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    ctx.ellipse(2 / scale, 4 / scale, halfL * 1.05, halfW * 1.15, 0, 0, Math.PI * 2);
    ctx.fill();

    // Base Polygon
    const poly = getVehicleBasePolygon(dummyCar, halfL, halfW, 0, 0, 0, 0, 0, 0, 0, 0);
    ctx.fillStyle = dummyCar.color;
    ctx.beginPath();
    poly.forEach((p, idx) => {
      if (idx === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1.2 / scale;
    ctx.stroke();

    // Wheels
    const wheelW = Math.max(2, halfW * 0.35);
    const wheelL = Math.max(4, halfL * 0.32);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(halfL * 0.4, -halfW - wheelW * 0.3, wheelL, wheelW);
    ctx.fillRect(halfL * 0.4, halfW - wheelW * 0.7, wheelL, wheelW);
    ctx.fillRect(-halfL * 0.6, -halfW - wheelW * 0.3, wheelL, wheelW);
    ctx.fillRect(-halfL * 0.6, halfW - wheelW * 0.7, wheelL, wheelW);

    // Vehicle Cabin & Body Panels
    const cabinDim = getVehicleCabinDimensions(dummyCar, halfL, halfW, 0, 0);
    const deformFunc = (x: number, y: number): [number, number] => [x, y];
    
    const drawDeformedRect = (x: number, y: number, w: number, h: number, fill: string | CanvasGradient) => {
      ctx.fillStyle = fill;
      ctx.fillRect(x, y, w, h);
    };
    
    const drawDeformedLine = (x1: number, y1: number, x2: number, y2: number, stroke: string, width = 1) => {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = width;
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

    renderVehicleGreenhouseAndBodyPanels(vCtx);
    renderSpecializedVehicleAttachments(vCtx);

    // Front Headlights Glow
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(halfL - 2, -halfW * 0.7, 3.5, 0, Math.PI * 2);
    ctx.arc(halfL - 2, halfW * 0.7, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Rear Taillights Glow
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(-halfL + 2, -halfW * 0.75, 3.0, 0, Math.PI * 2);
    ctx.arc(-halfL + 2, halfW * 0.75, 3.0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }, [isOpen, selectedCarIndex, selectedColorIndex]);`;

content = content.substring(0, startIdx) + newUseEffect + content.substring(endIdx);
fs.writeFileSync('src/components/CarDealershipModal.tsx', content);
