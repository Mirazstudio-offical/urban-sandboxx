import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

const mapPath = path.resolve('public/map.json');
const map = JSON.parse(fs.readFileSync(mapPath, 'utf-8'));

const outDir = path.resolve('public/assets/aistudio/renders/courtyards');
fs.mkdirSync(outDir, { recursive: true });

// Target blocks to render
const courtBlocks = [
  'sidewalk_5_2',
  'sidewalk_2_3',
  'sidewalk_3_3',
  'sidewalk_2_4',
  'sidewalk_3_4',
  'sidewalk_4_4',
  'sidewalk_3_5',
  'sidewalk_4_5',
  'sidewalk_5_5',
  'sidewalk_2_6',
  'sidewalk_3_6',
  'sidewalk_4_6',
  'sidewalk_5_6',
];

const otherResBlocks = [
  'sidewalk_3_0',
  'sidewalk_6_1',
  'sidewalk_0_3',
  'sidewalk_0_4',
  'sidewalk_1_4',
  'sidewalk_5_4',
  'sidewalk_3_7',
  'sidewalk_4_7',
  'sidewalk_5_7',
];

function extractBlockData(swId: string) {
  const sw = map.sidewalks.find((s: any) => s.id === swId);
  if (!sw) return null;
  const pad = 45;
  const bx1 = sw.x - pad;
  const by1 = sw.y - pad;
  const bx2 = sw.x + sw.width + pad;
  const by2 = sw.y + sw.height + pad;

  const buildings = (map.buildings || []).filter(
    (b: any) => b.x + b.width >= bx1 && b.x <= bx2 && b.y + b.height >= by1 && b.y <= by2
  );
  const parkings = (map.parkings || []).filter(
    (p: any) => p.x + p.width >= bx1 && p.x <= bx2 && p.y + p.height >= by1 && p.y <= by2
  );
  const driveways = (map.driveways || []).filter(
    (d: any) => d.x + d.width >= bx1 && d.x <= bx2 && d.y + d.height >= by1 && d.y <= by2
  );
  const trees = (map.trees || []).filter(
    (t: any) => t.x >= bx1 && t.x <= bx2 && t.y >= by1 && t.y <= by2
  );
  const props = (map.props || []).filter(
    (p: any) => p.x >= bx1 && p.x <= bx2 && p.y >= by1 && p.y <= by2
  );
  const vehicles = (map.vehicles || []).filter(
    (v: any) => v.x >= bx1 && v.x <= bx2 && v.y >= by1 && v.y <= by2
  );
  const roads = (map.roads || []).filter((r: any) => {
    const rx1 = Math.min(r.x1, r.x2) - (r.width || 60);
    const rx2 = Math.max(r.x1, r.x2) + (r.width || 60);
    const ry1 = Math.min(r.y1, r.y2) - (r.width || 60);
    const ry2 = Math.max(r.y1, r.y2) + (r.width || 60);
    return rx2 >= bx1 && rx1 <= bx2 && ry2 >= by1 && ry1 <= by2;
  });
  const pedPaths = (map.pedestrianPaths || []).filter((pp: any) =>
    (pp.waypoints || []).some((w: any) => w.x >= bx1 && w.x <= bx2 && w.y >= by1 && w.y <= by2)
  );

  return { sw, bx1, by1, bx2, by2, buildings, parkings, driveways, trees, props, vehicles, roads, pedPaths };
}

async function main() {
  const argBlocks = process.argv.slice(2);
  const targetIds = argBlocks.length > 0 ? argBlocks : [...courtBlocks, ...otherResBlocks];
  const blocksData = targetIds.map(extractBlockData).filter(Boolean);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();

  // Render function inside browser
  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <body style="margin:0; background:#0f172a; font-family: monospace;">
      <canvas id="cv"></canvas>
      <script>
        function drawBlock(ctx, data, ox, oy, scale) {
          const { sw, bx1, by1, bx2, by2, buildings, parkings, driveways, trees, props, vehicles, roads, pedPaths } = data;
          ctx.save();
          ctx.translate(ox, oy);
          ctx.scale(scale, scale);
          ctx.translate(-bx1, -by1);

          // 1. Background road/ground
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(bx1, by1, bx2 - bx1, by2 - by1);

          // Surrounding roads
          for (const r of roads) {
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = r.width || 60;
            ctx.lineCap = 'butt';
            ctx.beginPath();
            ctx.moveTo(r.x1, r.y1);
            ctx.lineTo(r.x2, r.y2);
            ctx.stroke();
          }

          // 2. Sidewalk outer concrete
          ctx.fillStyle = '#64748b';
          ctx.beginPath();
          ctx.roundRect(sw.x, sw.y, sw.width, sw.height, 20);
          ctx.fill();
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 2;
          ctx.stroke();

          // 3. Inner lawn
          const ix = sw.x + sw.sidewalkWidth;
          const iy = sw.y + sw.sidewalkWidth;
          const iw = sw.width - sw.sidewalkWidth * 2;
          const ih = sw.height - sw.sidewalkWidth * 2;
          ctx.fillStyle = sw.innerLawnColor || '#15803d';
          ctx.beginPath();
          ctx.roundRect(ix, iy, iw, ih, 8);
          ctx.fill();
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Grass texture dots
          ctx.fillStyle = 'rgba(34, 197, 94, 0.22)';
          for (let gx = ix + 12; gx < ix + iw - 12; gx += 24) {
            for (let gy = iy + 12; gy < iy + ih - 12; gy += 24) {
              ctx.fillRect(gx, gy, 3, 3);
            }
          }

          // 4. Plazas
          for (const pl of (sw.plazas || [])) {
            let pColor = '#94a3b8';
            if (pl.style === 'cobblestone') pColor = '#64748b';
            else if (pl.style === 'tile') pColor = '#cbd5e1';
            else if (pl.style === 'stone') pColor = '#78716c';
            ctx.fillStyle = pColor;
            if (pl.shape === 'circle') {
              const r = pl.width / 2;
              ctx.beginPath();
              ctx.arc(pl.x + r, pl.y + r, r, 0, Math.PI * 2);
              ctx.fill();
              ctx.strokeStyle = '#f8fafc';
              ctx.lineWidth = 1.5;
              ctx.stroke();
            } else {
              ctx.fillRect(pl.x, pl.y, pl.width, pl.height);
              ctx.strokeStyle = 'rgba(15,23,42,0.2)';
              ctx.lineWidth = 1;
              for (let px = pl.x; px <= pl.x + pl.width; px += 24) {
                ctx.beginPath(); ctx.moveTo(px, pl.y); ctx.lineTo(px, pl.y + pl.height); ctx.stroke();
              }
              for (let py = pl.y; py <= pl.y + pl.height; py += 24) {
                ctx.beginPath(); ctx.moveTo(pl.x, py); ctx.lineTo(pl.x + pl.width, py); ctx.stroke();
              }
              ctx.strokeStyle = '#f8fafc';
              ctx.lineWidth = 1.5;
              ctx.strokeRect(pl.x, pl.y, pl.width, pl.height);
            }
          }

          // 5. Walkways
          for (const wk of (sw.walkways || [])) {
            let wkColor = '#64748b';
            if (wk.style === 'stone') wkColor = '#78716c';
            else if (wk.style === 'cobblestone') wkColor = '#475569';
            else if (wk.style === 'asphalt') wkColor = '#334155';
            ctx.fillStyle = wkColor;
            ctx.fillRect(wk.x, wk.y, wk.width, wk.height);
            ctx.strokeStyle = wk.style === 'asphalt' ? '#475569' : '#94a3b8';
            ctx.lineWidth = 1.2;
            ctx.strokeRect(wk.x, wk.y, wk.width, wk.height);
          }

          // 6. Driveways
          for (const dw of driveways) {
            ctx.fillStyle = dw.type === 'dirt' ? '#5c3d23' : (dw.type === 'gravel' ? '#57534e' : '#32343a');
            ctx.fillRect(dw.x, dw.y, dw.width, dw.height);
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 1.2;
            ctx.strokeRect(dw.x, dw.y, dw.width, dw.height);
          }

          // 7. Parkings
          for (const pk of parkings) {
            ctx.fillStyle = '#32343a';
            ctx.fillRect(pk.x, pk.y, pk.width, pk.height);
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 2;
            ctx.strokeRect(pk.x, pk.y, pk.width, pk.height);
            for (const sp of (pk.spots || [])) {
              const w = sp.width || 38;
              const len = sp.length || 54;
              const hw = w / 2, hl = len / 2;
              const openSide = sp.openSide || 'west';
              ctx.strokeStyle = '#f8fafc';
              ctx.lineWidth = 1.8;
              ctx.beginPath();
              if (openSide === 'south') {
                ctx.moveTo(sp.x - hw, sp.y + hl); ctx.lineTo(sp.x - hw, sp.y - hl); ctx.lineTo(sp.x + hw, sp.y - hl); ctx.lineTo(sp.x + hw, sp.y + hl);
              } else if (openSide === 'north') {
                ctx.moveTo(sp.x - hw, sp.y - hl); ctx.lineTo(sp.x - hw, sp.y + hl); ctx.lineTo(sp.x + hw, sp.y + hl); ctx.lineTo(sp.x + hw, sp.y - hl);
              } else if (openSide === 'east') {
                ctx.moveTo(sp.x + hl, sp.y - hw); ctx.lineTo(sp.x - hl, sp.y - hw); ctx.lineTo(sp.x - hl, sp.y + hw); ctx.lineTo(sp.x + hl, sp.y + hw);
              } else {
                ctx.moveTo(sp.x - hl, sp.y - hw); ctx.lineTo(sp.x + hl, sp.y - hw); ctx.lineTo(sp.x + hl, sp.y + hw); ctx.lineTo(sp.x - hl, sp.y + hw);
              }
              ctx.stroke();
            }
          }

          // 8. Pedestrian paths (dashed cyan for verification)
          for (const pp of pedPaths) {
            const wps = pp.waypoints || [];
            if (wps.length < 2) continue;
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 4]);
            ctx.beginPath();
            ctx.moveTo(wps[0].x, wps[0].y);
            for (let i = 1; i < wps.length; i++) ctx.lineTo(wps[i].x, wps[i].y);
            ctx.stroke();
            ctx.setLineDash([]);
            for (const wp of wps) {
              ctx.fillStyle = '#38bdf8';
              ctx.beginPath(); ctx.arc(wp.x, wp.y, 2.5, 0, Math.PI * 2); ctx.fill();
            }
          }

          // 9. Buildings
          for (const b of buildings) {
            ctx.fillStyle = 'rgba(0,0,0,0.38)';
            ctx.fillRect(b.x + 6, b.y + 8, b.width, b.height);
            ctx.fillStyle = b.color || '#334155';
            ctx.fillRect(b.x, b.y, b.width, b.height);
            ctx.fillStyle = b.roofColor || '#1e293b';
            ctx.fillRect(b.x + 6, b.y + 6, b.width - 12, b.height - 12);
            ctx.strokeStyle = b.accentColor || '#94a3b8';
            ctx.lineWidth = 2;
            ctx.strokeRect(b.x, b.y, b.width, b.height);

            // Entrances (подъезды)
            for (const ent of (b.entrances || [])) {
              let ex = b.x, ey = b.y, ew = 22, eh = 10;
              if (ent.side === 'south') {
                ex = b.x + b.width * ent.offsetRatio - 11;
                ey = b.y + b.height;
                ew = 22; eh = 9;
              } else if (ent.side === 'north') {
                ex = b.x + b.width * ent.offsetRatio - 11;
                ey = b.y - 9;
                ew = 22; eh = 9;
              } else if (ent.side === 'east') {
                ex = b.x + b.width;
                ey = b.y + b.height * ent.offsetRatio - 11;
                ew = 9; eh = 22;
              } else if (ent.side === 'west') {
                ex = b.x - 9;
                ey = b.y + b.height * ent.offsetRatio - 11;
                ew = 9; eh = 22;
              }
              ctx.fillStyle = '#f59e0b';
              ctx.fillRect(ex, ey, ew, eh);
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 1;
              ctx.strokeRect(ex, ey, ew, eh);
            }

            // Label
            ctx.fillStyle = '#f8fafc';
            ctx.font = 'bold 11px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(b.id + ' (' + b.type + ')', b.x + b.width / 2, b.y + b.height / 2 + 4);
          }

          // 10. Props
          for (const p of props) {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.angle || 0);
            if (p.type === 'bench') {
              ctx.fillStyle = '#64748b'; ctx.fillRect(-13, -8, 26, 16);
              ctx.fillStyle = '#b45309'; ctx.fillRect(-9, -5, 18, 10);
            } else if (p.type === 'dumpster') {
              ctx.fillStyle = '#475569'; ctx.fillRect(-18, -13, 36, 26);
              ctx.fillStyle = '#15803d'; ctx.fillRect(-13, -9, 26, 18);
              ctx.strokeStyle = '#eab308'; ctx.lineWidth = 1; ctx.strokeRect(-17, -12, 34, 24);
            } else if (p.type === 'flowerbed') {
              ctx.fillStyle = '#94a3b8'; ctx.fillRect(-12, -8, 24, 16);
              ctx.fillStyle = '#15803d'; ctx.fillRect(-10, -6, 20, 12);
              ctx.fillStyle = '#ec4899'; ctx.beginPath(); ctx.arc(-4, 0, 3, 0, Math.PI*2); ctx.arc(4, 0, 3, 0, Math.PI*2); ctx.fill();
            } else if (p.type === 'tire_flowerbed') {
              ctx.fillStyle = '#06b6d4'; ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI*2); ctx.fill();
              ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI*2); ctx.fill();
            } else if (p.type === 'playground_swing') {
              ctx.fillStyle = 'rgba(234, 179, 8, 0.25)'; ctx.fillRect(-14, -10, 28, 22);
              ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2.5;
              ctx.strokeRect(-12, -7, 24, 16);
              ctx.strokeStyle = '#eab308'; ctx.lineWidth = 3;
              ctx.beginPath(); ctx.moveTo(-12, -4); ctx.lineTo(12, -4); ctx.stroke();
            } else if (p.type === 'trash_can') {
              ctx.fillStyle = '#cbd5e1'; ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI*2); ctx.fill();
              ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI*2); ctx.fill();
            } else if (p.type === 'bollard') {
              ctx.fillStyle = '#eab308'; ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, Math.PI*2); ctx.fill();
            } else if (p.type === 'manhole') {
              ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI*2); ctx.fill();
              ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1; ctx.stroke();
            } else if (p.type === 'drain_grate') {
              ctx.fillStyle = '#1e293b'; ctx.fillRect(-7, -5, 14, 10);
            } else if (p.type === 'lamp' || p.type === 'lamp_concrete' || p.type === 'lamp_highway') {
              ctx.fillStyle = '#fef08a'; ctx.beginPath(); ctx.arc(0, 0, 4.5, 0, Math.PI*2); ctx.fill();
              ctx.strokeStyle = '#ca8a04'; ctx.lineWidth = 1.5; ctx.stroke();
            } else if (p.type === 'fence_metal_vertical' || p.type === 'fence_wood_vertical') {
              ctx.fillStyle = '#14532d'; ctx.fillRect(-18, -3, 36, 6);
              ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 1; ctx.strokeRect(-18, -3, 36, 6);
            } else if (p.type === 'concrete_fence_po2') {
              ctx.fillStyle = '#94a3b8'; ctx.fillRect(-22, -4, 44, 8);
            } else if (p.type === 'tarp_covered_car' || p.type === 'car_on_blocks') {
              ctx.fillStyle = p.type === 'tarp_covered_car' ? '#475569' : '#0284c7';
              ctx.fillRect(-20, -10, 40, 20);
              ctx.strokeStyle = '#f8fafc'; ctx.strokeRect(-20, -10, 40, 20);
            } else if (p.type === 'garage_sand_pile') {
              ctx.fillStyle = '#ca8a04'; ctx.beginPath(); ctx.ellipse(0, 0, 11, 8, 0, 0, Math.PI*2); ctx.fill();
            } else if (p.type === 'garden_path_tile') {
              ctx.fillStyle = '#a8a29e'; ctx.beginPath(); ctx.ellipse(0, 0, 10, 5, 0, 0, Math.PI*2); ctx.fill();
            } else if (p.type === 'garage_sofa') {
              ctx.fillStyle = '#7f1d1d'; ctx.fillRect(-10, -6, 20, 12);
            } else {
              ctx.fillStyle = '#f43f5e'; ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI*2); ctx.fill();
            }
            ctx.restore();
          }

          // 11. Vehicles
          for (const v of vehicles) {
            ctx.save();
            ctx.translate(v.x, v.y);
            ctx.rotate(v.angle || 0);
            ctx.fillStyle = v.color || '#3b82f6';
            ctx.fillRect(-22, -10, 44, 20);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.2;
            ctx.strokeRect(-22, -10, 44, 20);
            ctx.restore();
          }

          // 12. Trees
          for (const t of trees) {
            ctx.fillStyle = t.type === 'birch' ? 'rgba(132, 204, 22, 0.72)' : (t.type === 'pine' ? 'rgba(21, 128, 61, 0.78)' : 'rgba(34, 197, 94, 0.72)');
            ctx.beginPath();
            ctx.arc(t.x, t.y, t.radius || 18, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#052e16';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.fillStyle = '#451a03';
            ctx.beginPath();
            ctx.arc(t.x, t.y, 3, 0, Math.PI * 2);
            ctx.fill();
          }

          // Header banner
          ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
          ctx.fillRect(bx1, by1, 320, 26);
          ctx.fillStyle = '#38bdf8';
          ctx.font = 'bold 15px monospace';
          ctx.textAlign = 'left';
          ctx.fillText(sw.id + ' [' + sw.x + ',' + sw.y + ' ' + sw.width + 'x' + sw.height + ']', bx1 + 8, by1 + 18);

          ctx.restore();
        }
        window.drawBlock = drawBlock;
      </script>
    </body>
    </html>
  `);

  // Render 1: Grid of the 13 courtBlocks (4 columns x 4 rows)
  const courtData = courtBlocks.map(extractBlockData).filter(Boolean);
  const cellW = 560;
  const cellH = 560;
  const cols = 4;
  const rows = Math.ceil(courtData.length / cols);

  await page.setViewport({ width: cols * cellW, height: rows * cellH });
  await page.evaluate(
    ({ blocks, cols, cellW, cellH }) => {
      const cv = document.getElementById('cv') as HTMLCanvasElement;
      cv.width = cols * cellW;
      cv.height = Math.ceil(blocks.length / cols) * cellH;
      const ctx = cv.getContext('2d')!;
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, cv.width, cv.height);
      blocks.forEach((b: any, i: number) => {
        const c = i % cols;
        const r = Math.floor(i / cols);
        const w = b.bx2 - b.bx1;
        const h = b.by2 - b.by1;
        const scale = Math.min((cellW - 16) / w, (cellH - 16) / h);
        (window as any).drawBlock(ctx, b, c * cellW + 8, r * cellH + 8, scale);
      });
    },
    { blocks: courtData, cols, cellW, cellH }
  );
  await page.screenshot({ path: path.join(outDir, 'court_blocks_overview.png') });

  // Render 2: Grid of the otherResBlocks (3 columns x 3 rows)
  const otherData = otherResBlocks.map(extractBlockData).filter(Boolean);
  const cols2 = 3;
  const rows2 = Math.ceil(otherData.length / cols2);
  await page.setViewport({ width: cols2 * cellW, height: rows2 * cellH });
  await page.evaluate(
    ({ blocks, cols, cellW, cellH }) => {
      const cv = document.getElementById('cv') as HTMLCanvasElement;
      cv.width = cols * cellW;
      cv.height = Math.ceil(blocks.length / cols) * cellH;
      const ctx = cv.getContext('2d')!;
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, cv.width, cv.height);
      blocks.forEach((b: any, i: number) => {
        const c = i % cols;
        const r = Math.floor(i / cols);
        const w = b.bx2 - b.bx1;
        const h = b.by2 - b.by1;
        const scale = Math.min((cellW - 16) / w, (cellH - 16) / h);
        (window as any).drawBlock(ctx, b, c * cellW + 8, r * cellH + 8, scale);
      });
    },
    { blocks: otherData, cols: cols2, cellW, cellH }
  );
  await page.screenshot({ path: path.join(outDir, 'other_res_overview.png') });

  // Also if specific blocks passed via CLI, render each at 900x900
  if (argBlocks.length > 0) {
    for (const b of blocksData) {
      if (!b) continue;
      await page.setViewport({ width: 900, height: 900 });
      await page.evaluate((block) => {
        const cv = document.getElementById('cv') as HTMLCanvasElement;
        cv.width = 900;
        cv.height = 900;
        const ctx = cv.getContext('2d')!;
        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, 900, 900);
        const w = block.bx2 - block.bx1;
        const h = block.by2 - block.by1;
        const scale = Math.min(880 / w, 880 / h);
        (window as any).drawBlock(ctx, block, 10, 10, scale);
      }, b);
      await page.screenshot({ path: path.join(outDir, `${b.sw.id}.png`) });
    }
  }

  await browser.close();
  console.log('Rendered to', outDir);
}

main().catch(console.error);
