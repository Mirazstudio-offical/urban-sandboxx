const fs = require('fs');
let code = fs.readFileSync('src/vehicleVisuals.ts', 'utf8');

const startStr = "  // --- TRUCK DUMP (REDESIGNED HEAVY 3-AXLE TIPPER / САМОСВАЛ НА ВЫСШЕМ УРОВНЕ) ---";
const endStr = "  // --- TRUCK WATER (ПОЛИВОМОЕЧНЫЙ ВОДОВОЗ КО-829А НА ШАССИ ЗИЛ-4331) ---";

const startIdx = code.indexOf(startStr);
const endIdx = code.indexOf(endStr);

if (startIdx !== -1 && endIdx !== -1) {
  const replacement = `  // --- TRUCK DUMP (КАМАЗ-5511 САМОСВАЛ - PREMIUM TOP-DOWN TEXTURE) ---
  else if (car.type === 'truck_dump') {
    const dumpColor = car.color || '#d97706';
    
    // Hydraulic lifting cylinder between cab and tipper body
    const cylX = cabinX - cabinL / 2 - 2;
    drawDeformedRect(cylX - 2.5, -3, 3.5, 6, '#334155');
    drawDeformedRect(cylX - 1.5, -2, 2, 4, '#cbd5e1'); // Chrome piston rod

    // Dump body (кузов)
    // Starts behind the spare tire and cab, ends at the rear bumper
    const dumpX1 = -halfL + rc + 2; 
    const dumpX2 = cabinX - cabinL / 2 - 3.5; 
    const dumpW = halfW * 2 - 1.0;
    
    // Outer tipper frame (The orange scoop body)
    drawDeformedRect(dumpX1, -dumpW / 2, dumpX2 - dumpX1, dumpW, dumpColor);
    
    // Edge highlights / shadows (gives premium texture)
    drawDeformedLine(dumpX1, -dumpW / 2, dumpX2, -dumpW / 2, 'rgba(0,0,0,0.4)', 1.5);
    drawDeformedLine(dumpX2, -dumpW / 2, dumpX2, dumpW / 2, 'rgba(0,0,0,0.4)', 1.5);
    drawDeformedLine(dumpX2, dumpW / 2, dumpX1, dumpW / 2, 'rgba(0,0,0,0.4)', 1.5);
    drawDeformedLine(dumpX1, dumpW / 2, dumpX1, -dumpW / 2, 'rgba(0,0,0,0.4)', 1.5);

    // Heavy vertical stiffening ribs (ребра жесткости) on sides
    for (let rx = dumpX1 + 5; rx <= dumpX2 - 5; rx += 7) {
      drawDeformedRect(rx, -dumpW / 2, 3, 2.5, 'rgba(0,0,0,0.3)');
      drawDeformedRect(rx, dumpW / 2 - 2.5, 3, 2.5, 'rgba(0,0,0,0.3)');
    }

    // Heavy protective canopy (козырек) overhang over the cab
    // KAMAZ 5511 canopy covers the gap and extends slightly over the roof
    const canopyX2 = cabinX + cabinL * 0.15;
    const canopyW = dumpW * 0.94;
    drawDeformedRect(dumpX2, -canopyW / 2, canopyX2 - dumpX2, canopyW, dumpColor);
    drawDeformedLine(canopyX2, -canopyW / 2, canopyX2, canopyW / 2, 'rgba(0,0,0,0.5)', 1.5);
    drawDeformedLine(dumpX2, -canopyW / 2, canopyX2, -canopyW / 2, 'rgba(0,0,0,0.3)', 1.2);
    drawDeformedLine(dumpX2, canopyW / 2, canopyX2, canopyW / 2, 'rgba(0,0,0,0.3)', 1.2);
    
    // Slanted reinforcement ribs on the canopy
    drawDeformedLine(dumpX2, -canopyW * 0.35, canopyX2 - 1, -canopyW * 0.2, 'rgba(0,0,0,0.2)', 1.2);
    drawDeformedLine(dumpX2, canopyW * 0.35, canopyX2 - 1, canopyW * 0.2, 'rgba(0,0,0,0.2)', 1.2);

    // Inner cargo bed (scuffed steel floor)
    const bedX1 = dumpX1 + 3.5;
    const bedX2 = dumpX2 - 2.5;
    const bedW = dumpW - 6.0;
    
    // Empty scuffed metal bucket interior
    drawDeformedRect(bedX1, -bedW / 2, bedX2 - bedX1, bedW, '#475569');
    drawDeformedRect(bedX1 + 2, -bedW / 2 + 2, bedX2 - bedX1 - 4, bedW - 4, '#334155');
    // Scrape marks from dumping
    drawDeformedLine(bedX1 + 5, -bedW / 3, bedX2 - 5, -bedW / 3, '#1e293b', 2.0);
    drawDeformedLine(bedX1 + 5, bedW / 3, bedX2 - 5, bedW / 3, '#1e293b', 2.0);
    drawDeformedLine(bedX1 + 2, 0, bedX2 - 2, 0, '#1e293b', 2.5);

    // Slanted rear tail of the scoop (Kamaz 5511 scoop ends without a flat tailgate, it slants up)
    drawDeformedRect(dumpX1, -dumpW / 2 + 0.5, 3.5, dumpW - 1.0, 'rgba(0,0,0,0.25)');
    drawDeformedLine(dumpX1 + 3.5, -dumpW / 2 + 0.5, dumpX1 + 3.5, dumpW / 2 - 0.5, 'rgba(0,0,0,0.4)', 1.5);
    
    // Rear mudflaps
    drawDeformedRect(dumpX1 - 1.5, -dumpW / 2 + 1, 1.5, 3.5, '#0f172a');
    drawDeformedRect(dumpX1 - 1.5, dumpW / 2 - 4.5, 1.5, 3.5, '#0f172a');
  }

`;
  
  code = code.substring(0, startIdx) + replacement + code.substring(endIdx);
  fs.writeFileSync('src/vehicleVisuals.ts', code);
  console.log("Patched dump truck!");
} else {
  console.log("Could not find start or end index.", startIdx, endIdx);
}
