const fs = require('fs');
const path = require('path');

const mapPath = path.join(__dirname, 'public', 'map.json');
const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

/**
 * Renders an SVG visualization of any bounding box [minX, minY, maxX, maxY]
 */
function renderAreaSVG(minX, minY, maxX, maxY, filename = 'area_preview.svg', options = {}) {
  const width = maxX - minX;
  const height = maxY - minY;
  const maxDim = Math.max(width, height);
  const targetPx = options.size || 1200;
  const scale = targetPx / maxDim;
  const svgW = Math.round(width * scale);
  const svgH = Math.round(height * scale);

  let svg = `<!-- Generated Map Fragment: [${minX}, ${minY}] to [${maxX}, ${maxY}] -->\n`;
  svg += `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgW} ${svgH}" width="${svgW}" height="${svgH}" style="background-color: #1e293b; font-family: ui-sans-serif, system-ui, sans-serif;">\n`;

  // Coordinate Grid
  const gridStep = 500;
  const startGridX = Math.floor(minX / gridStep) * gridStep;
  const startGridY = Math.floor(minY / gridStep) * gridStep;

  function tx(x) { return Math.round((x - minX) * scale * 10) / 10; }
  function ty(y) { return Math.round((y - minY) * scale * 10) / 10; }
  function tw(w) { return Math.round(w * scale * 10) / 10; }

  // Grid lines
  svg += '<g stroke="#334155" stroke-width="0.8" opacity="0.6">\n';
  for (let gx = startGridX; gx <= maxX; gx += gridStep) {
    if (gx >= minX) {
      svg += `  <line x1="${tx(gx)}" y1="0" x2="${tx(gx)}" y2="${svgH}"/>\n`;
      svg += `  <text x="${tx(gx) + 4}" y="14" fill="#64748b" font-size="10">x:${gx}</text>\n`;
    }
  }
  for (let gy = startGridY; gy <= maxY; gy += gridStep) {
    if (gy >= minY) {
      svg += `  <line x1="0" y1="${ty(gy)}" x2="${svgW}" y2="${ty(gy)}"/>\n`;
      svg += `  <text x="4" y="${ty(gy) - 4}" fill="#64748b" font-size="10">y:${gy}</text>\n`;
    }
  }
  svg += '</g>\n';

  // Draw Roads
  svg += '<g id="roads">\n';
  map.roads.forEach(r => {
    const isDirt = r.isDirt;
    const isGravel = r.isGravel;
    const roadColor = isDirt ? '#553d2c' : (isGravel ? '#5d5e62' : '#32343a');

    if (r.direction === 'horizontal') {
      if (r.x2 >= minX && r.x1 <= maxX && r.y1 + r.width >= minY && r.y1 - r.width <= maxY) {
        const rx = tx(r.x1);
        const ry = ty(r.y1 - r.width / 2);
        const rw = tw(r.x2 - r.x1);
        const rh = tw(r.width);
        svg += `  <rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="${roadColor}" stroke="#475569" stroke-width="1"/>\n`;
        // Markings
        if (r.lanes >= 4) {
          svg += `  <line x1="${rx}" y1="${ty(r.y1 - 2)}" x2="${rx + rw}" y2="${ty(r.y1 - 2)}" stroke="#eab308" stroke-width="2"/>\n`;
          svg += `  <line x1="${rx}" y1="${ty(r.y1 + 2)}" x2="${rx + rw}" y2="${ty(r.y1 + 2)}" stroke="#eab308" stroke-width="2"/>\n`;
          svg += `  <line x1="${rx}" y1="${ty(r.y1 - r.width/4)}" x2="${rx + rw}" y2="${ty(r.y1 - r.width/4)}" stroke="#ffffff" stroke-width="1.5" stroke-dasharray="8,8"/>\n`;
          svg += `  <line x1="${rx}" y1="${ty(r.y1 + r.width/4)}" x2="${rx + rw}" y2="${ty(r.y1 + r.width/4)}" stroke="#ffffff" stroke-width="1.5" stroke-dasharray="8,8"/>\n`;
        } else if (!isDirt) {
          svg += `  <line x1="${rx}" y1="${ty(r.y1)}" x2="${rx + rw}" y2="${ty(r.y1)}" stroke="#eab308" stroke-width="1.5" stroke-dasharray="6,6"/>\n`;
        }
      }
    } else if (r.direction === 'vertical') {
      if (r.x1 + r.width >= minX && r.x1 - r.width <= maxX && r.y2 >= minY && r.y1 <= maxY) {
        const rx = tx(r.x1 - r.width / 2);
        const ry = ty(r.y1);
        const rw = tw(r.width);
        const rh = tw(r.y2 - r.y1);
        svg += `  <rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="${roadColor}" stroke="#475569" stroke-width="1"/>\n`;
        if (r.lanes >= 4) {
          svg += `  <line x1="${tx(r.x1 - 2)}" y1="${ry}" x2="${tx(r.x1 - 2)}" y2="${ry + rh}" stroke="#eab308" stroke-width="2"/>\n`;
          svg += `  <line x1="${tx(r.x1 + 2)}" y1="${ry}" x2="${tx(r.x1 + 2)}" y2="${ry + rh}" stroke="#eab308" stroke-width="2"/>\n`;
        } else if (!isDirt) {
          svg += `  <line x1="${tx(r.x1)}" y1="${ry}" x2="${tx(r.x1)}" y2="${ry + rh}" stroke="#eab308" stroke-width="1.5" stroke-dasharray="6,6"/>\n`;
        }
      }
    } else if (r.curvePoints && r.curvePoints.length > 1) {
      let pathD = '';
      r.curvePoints.forEach((p, idx) => {
        if (idx === 0) pathD += `M ${tx(p.x)} ${ty(p.y)}`;
        else pathD += ` L ${tx(p.x)} ${ty(p.y)}`;
      });
      svg += `  <path d="${pathD}" fill="none" stroke="${roadColor}" stroke-width="${tw(r.width)}" stroke-linecap="round" stroke-linejoin="round"/>\n`;
      if (!isDirt) {
        svg += `  <path d="${pathD}" fill="none" stroke="#eab308" stroke-width="2" stroke-dasharray="6,6"/>\n`;
      }
    }
  });
  svg += '</g>\n';

  // Draw Intersections
  svg += '<g id="intersections">\n';
  map.intersections.forEach(inter => {
    if (inter.x + inter.width >= minX && inter.x - inter.width <= maxX &&
        inter.y + inter.height >= minY && inter.y - inter.height <= maxY) {
      const ix = tx(inter.x - inter.width/2);
      const iy = ty(inter.y - inter.height/2);
      const iw = tw(inter.width);
      const ih = tw(inter.height);

      if (inter.type === 'turnaround' || inter.id.includes('terminal') || inter.id.includes('summit')) {
        const radius = tw(Math.max(inter.width, inter.height) / 2);
        svg += `  <circle cx="${tx(inter.x)}" cy="${ty(inter.y)}" r="${radius}" fill="#32343a" stroke="#38bdf8" stroke-width="2"/>\n`;
        svg += `  <circle cx="${tx(inter.x)}" cy="${ty(inter.y)}" r="${radius * 0.55}" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="1.5" stroke-dasharray="4,4"/>\n`;
      } else {
        svg += `  <rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" fill="#32343a" stroke="#38bdf8" stroke-width="1.5" rx="8"/>\n`;
      }

      svg += `  <rect x="${tx(inter.x) - 40}" y="${ty(inter.y) - 8}" width="80" height="16" fill="rgba(15,23,42,0.85)" rx="4"/>\n`;
      svg += `  <text x="${tx(inter.x)}" y="${ty(inter.y) + 3}" fill="#38bdf8" font-size="9" font-weight="bold" text-anchor="middle">${inter.id}</text>\n`;
    }
  });
  svg += '</g>\n';

  // Draw Lane Waypoints & Connection trajectories (Optional detailed overlay)
  if (options.showWaypoints) {
    svg += '<g id="waypoints" opacity="0.8">\n';
    map.roads.forEach(r => {
      if (r.lanePaths) {
        r.lanePaths.forEach(lp => {
          if (lp.waypoints) {
            lp.waypoints.forEach((wp, idx) => {
              if (wp.x >= minX && wp.x <= maxX && wp.y >= minY && wp.y <= maxY) {
                if (idx % 3 === 0) {
                  svg += `  <circle cx="${tx(wp.x)}" cy="${ty(wp.y)}" r="1.5" fill="#a855f7"/>\n`;
                }
              }
            });
          }
          if (lp.connections) {
            lp.connections.forEach(conn => {
              if (conn.pathWaypoints && conn.pathWaypoints.length > 1) {
                let connD = '';
                conn.pathWaypoints.forEach((cp, cidx) => {
                  if (cidx === 0) connD += `M ${tx(cp.x)} ${ty(cp.y)}`;
                  else connD += ` L ${tx(cp.x)} ${ty(cp.y)}`;
                });
                const connColor = conn.turnType === 'straight' ? '#22c55e' : (conn.turnType === 'right' ? '#3b82f6' : '#eab308');
                svg += `  <path d="${connD}" fill="none" stroke="${connColor}" stroke-width="1.2" stroke-dasharray="3,3"/>\n`;
              }
            });
          }
        });
      }
    });
    svg += '</g>\n';
  }

  // Draw Props
  svg += '<g id="props">\n';
  map.props.forEach(p => {
    if (p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY) {
      if (p.type === 'road_sign_km') {
        svg += `  <circle cx="${tx(p.x)}" cy="${ty(p.y)}" r="4" fill="#0284c7" stroke="#ffffff" stroke-width="1"/>\n`;
        svg += `  <text x="${tx(p.x)}" y="${ty(p.y) - 6}" fill="#93c5fd" font-size="8" text-anchor="middle">KM ${p.kmNumber}</text>\n`;
      }
    }
  });
  svg += '</g>\n';

  svg += '</svg>';
  fs.writeFileSync(filename, svg, 'utf8');
  console.log(`[Preview Generator] Rendered fragment [${minX}, ${minY}] to [${maxX}, ${maxY}] -> ${filename}`);
  return filename;
}

// If run from command line:
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length >= 4) {
    const minX = parseFloat(args[0]);
    const minY = parseFloat(args[1]);
    const maxX = parseFloat(args[2]);
    const maxY = parseFloat(args[3]);
    const outName = args[4] || 'preview.svg';
    renderAreaSVG(minX, minY, maxX, maxY, outName, { showWaypoints: true });
  } else {
    // Generate previews of all key highway hubs and junctions
    console.log('Generating key region previews...');
    renderAreaSVG(7000, 3000, 9500, 5000, 'preview_city_exit.svg', { showWaypoints: true });
    renderAreaSVG(10500, 3000, 12500, 5000, 'preview_village_turnoff.svg', { showWaypoints: true });
    renderAreaSVG(13400, 3000, 15400, 5000, 'preview_hub1.svg', { showWaypoints: true });
    renderAreaSVG(23000, 3000, 25000, 5000, 'preview_hub2.svg', { showWaypoints: true });
    renderAreaSVG(35000, 3000, 37000, 5000, 'preview_hub3.svg', { showWaypoints: true });
    renderAreaSVG(47000, 3000, 49000, 5000, 'preview_hub4.svg', { showWaypoints: true });
    renderAreaSVG(22600, 100, 24600, 1200, 'preview_north_summit.svg', { showWaypoints: true });
    renderAreaSVG(23000, 17500, 25000, 19500, 'preview_canyon_terminal.svg', { showWaypoints: true });
    renderAreaSVG(23000, 11000, 25000, 13000, 'preview_canyon_dunes_fork.svg', { showWaypoints: true });
    renderAreaSVG(49800, 26500, 51800, 28500, 'preview_east_terminal.svg', { showWaypoints: true });
    console.log('All previews generated successfully!');
  }
}

module.exports = { renderAreaSVG };
