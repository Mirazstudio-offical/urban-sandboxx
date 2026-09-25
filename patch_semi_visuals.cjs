const fs = require('fs');
let code = fs.readFileSync('src/vehicleVisuals.ts', 'utf8');

const anchor = "  // --- TRUCK DUMP";
const insertion = `  // --- TRUCK SEMI (СЕДЕЛЬНЫЙ ТЯГАЧ КАМАЗ-5410) ---
  else if (car.type === 'truck_semi') {
    const cabColor = car.color || '#1e3a8a';
    
    // Chassis frame rails extended to the rear
    const frameX1 = -halfL + rc + 2;
    const frameX2 = cabinX - cabinL / 2 - 2;
    drawDeformedRect(frameX1, -3, frameX2 - frameX1, 6, '#0f172a');
    
    // Fifth wheel coupling (седло)
    const fifthWheelX = car.hitchOffset !== undefined ? car.hitchOffset : -12;
    // Grease plate
    drawDeformedRect(fifthWheelX - 4, -5, 8, 10, '#1e293b');
    // Hitch slot/jaws
    drawDeformedRect(fifthWheelX - 4, -1, 4, 2, '#0f172a');
    
    // Fuel tanks and air reservoirs on the sides
    drawDeformedRect(frameX2 - 12, -halfW + 1.5, 10, 3, '#475569'); // Fuel tank right
    drawDeformedRect(frameX2 - 12, halfW - 4.5, 10, 3, '#475569');  // Air tanks left
    
    // Spare tire behind cab
    drawDeformedRect(frameX2 + 0.5, -halfW + 4, 3, 7, '#0f172a');
    drawDeformedLine(frameX2 + 2, -halfW + 4.5, frameX2 + 2, -halfW + 10.5, '#475569', 1.2);
    
    // Rear mudflaps
    drawDeformedRect(frameX1 - 1, -halfW + 1, 1.5, 5, '#0f172a');
    drawDeformedRect(frameX1 - 1, halfW - 6, 1.5, 5, '#0f172a');
  }

  // --- TRAILER SEMI (ПОЛУПРИЦЕП БОРТОВОЙ) ---
  else if (car.type === 'trailer_semi') {
    const trailerColor = car.color || '#475569';
    
    const boxX1 = -halfL + rc + 1;
    const boxX2 = halfL - fc - 2;
    const boxW = halfW * 2 - 1.2;
    
    // Wooden/Steel bed floor
    drawDeformedRect(boxX1, -boxW / 2, boxX2 - boxX1, boxW, '#d6d3d1');
    drawDeformedLine(boxX1, -boxW / 2, boxX2, -boxW / 2, trailerColor, 1.5);
    drawDeformedLine(boxX2, -boxW / 2, boxX2, boxW / 2, trailerColor, 1.5);
    drawDeformedLine(boxX2, boxW / 2, boxX1, boxW / 2, trailerColor, 1.5);
    drawDeformedLine(boxX1, boxW / 2, boxX1, -boxW / 2, trailerColor, 1.5);
    
    // Cargo straps/ribs
    for (let bx = boxX1 + 10; bx < boxX2 - 5; bx += 10) {
      drawDeformedLine(bx, -boxW / 2 + 1, bx, boxW / 2 - 1, '#a8a29e', 0.8);
    }
  }
`;

code = code.replace(anchor, insertion + anchor);
fs.writeFileSync('src/vehicleVisuals.ts', code);
console.log("Patched semi visuals!");
