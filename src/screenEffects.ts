import { Camera, Player, GameWorld } from './types';

/**
 * ScreenEffectsSystem — High-fidelity Canvas 2D Post-Processing
 * Handles:
 * 1. Rhythmic Bloody Vignette (driven by painPulse and effectivePain)
 * 2. Grayscale, Desaturation & Shock Contrast (driven by blood loss and shock)
 * 3. Cold Shivering Camera Micro-Jitter & Icy Frost Vignette
 * 4. Heat Distortion, Nausea & Exhaustion Amber Wave
 * 5. Impact Flash & Tinnitus Overlay
 */
export class ScreenEffectsSystem {
  private noiseSeed: number = 0;
  private breathTimer: number = 0;

  /**
   * Applies pre-render camera modifications (e.g. from cold shivering or panic hyperventilation)
   */
  public applyPreRenderCameraModifiers(camera: Camera, player: Player, dt: number) {
    if (!player.bodyState) return;
    const bs = player.bodyState;
    const shiver = bs.shiverIntensity || 0;
    const panicLevel = bs.panicLevel || 0;

    if (shiver > 0.05) {
      // Extremely high-frequency, chaotic muscle shivering/tremor (55-80 Hz) to simulate real physical shuddering
      this.noiseSeed += dt * 140; // Extremely rapid progression
      const jitterX = (Math.sin(this.noiseSeed * 1.8) + Math.cos(this.noiseSeed * 3.7) * 0.4) * (shiver * 2.8);
      const jitterY = (Math.cos(this.noiseSeed * 2.5) + Math.sin(this.noiseSeed * 4.3) * 0.4) * (shiver * 2.8);
      const rotJitter = Math.sin(this.noiseSeed * 3.1) * (shiver * 0.013);

      camera.x += jitterX;
      camera.y += jitterY;
      camera.angle += rotJitter;
    }

    // Frantic breathing zoom & camera disorientation from acute Panic & Fear ("бешенный зум от дыхания")
    if (panicLevel > 8) {
      const panicNorm = Math.min(1.0, panicLevel / 100);
      const breathFreq = 12 + panicNorm * 18; // Very rapid frantic hyperventilation
      this.breathTimer += dt * breathFreq;

      // Frantic dynamic camera zoom pulsing in & out with heavy panting/breathing
      const panicZoomOscillation = Math.sin(this.breathTimer) * (panicNorm * 0.14);
      camera.zoom *= (1.0 + panicZoomOscillation);

      // Camera orientation sway & disorientation
      const cameraDisorientationSway = Math.sin(this.breathTimer * 0.5) * (panicNorm * 0.035);
      camera.angle += cameraDisorientationSway;
    }
  }

  /**
   * Renders the full multi-layered 2D screen overlay and post-processing pass
   */
  public render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    player: Player,
    world?: GameWorld
  ) {
    if (!player || !player.bodyState) return;
    const bs = player.bodyState;
    const needs = player.needs;

    const effectivePain = Number.isFinite(bs.effectivePain) ? bs.effectivePain! : (Number.isFinite(bs.painLevel) ? bs.painLevel! : 0);
    const painPulse = Number.isFinite(bs.painPulse) ? bs.painPulse! : 0; // -1.0 to 1.0
    const bloodLoss = Number.isFinite(bs.bloodLoss) ? bs.bloodLoss! : 0;
    const shockLevel = Number.isFinite(bs.shockLevel) ? bs.shockLevel! : 0;
    const hp = Number.isFinite(needs?.health) ? needs.health : 100;
    const temp = Number.isFinite(bs.temperature) ? bs.temperature! : 36.6;
    const wetness = Number.isFinite(bs.wetness) ? bs.wetness! : 0;
    const energy = Number.isFinite(needs?.energy) ? needs.energy : 100;
    const nausea = Number.isFinite(needs?.nausea) ? needs.nausea : 0;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Guarantee screen coordinate space

    // =========================================================================
    // 1. SHOCK & BLOOD LOSS DESATURATION / CONTRAST DARKENING
    // =========================================================================
    const severeShock = shockLevel > 5 || bloodLoss > 5 || hp < 85;
    if (severeShock) {
      const shockProgress = Math.min(1.0, Math.max(
        (shockLevel - 5) / 45,
        (bloodLoss - 5) / 40,
        (85 - hp) / 60
      ));

      // 1a. Color Drain / Graying (Simulation using desaturating overlays)
      ctx.save();
      ctx.globalCompositeOperation = 'color';
      ctx.fillStyle = `rgba(100, 116, 139, ${Math.min(0.9, shockProgress * 0.95 + 0.15)})`;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();

      // 1b. Peripheral Dark Tunnel Vision (Much more noticeable)
      ctx.save();
      const cx = width / 2;
      const cy = height / 2;
      const maxR = Math.hypot(width, height) * 0.65;
      const innerR = Math.max(10, maxR * (0.8 - shockProgress * 0.6));
      const tunnelGrad = ctx.createRadialGradient(cx, cy, innerR, cx, cy, maxR);
      tunnelGrad.addColorStop(0, 'rgba(15, 23, 42, 0)');
      tunnelGrad.addColorStop(0.3, `rgba(15, 23, 42, ${Math.min(0.95, shockProgress * 0.85 + 0.3)})`);
      tunnelGrad.addColorStop(1, `rgba(0, 0, 0, 1.0)`);

      ctx.fillStyle = tunnelGrad;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    // =========================================================================
    // 1.5. PANIC & FEAR PURPLE/DARK VIGNETTE, DARKENING & BLUR ("потемнение в глазах, блюр, страх")
    // =========================================================================
    const panicLevel = bs.panicLevel ?? 0;
    if (panicLevel > 8) {
      ctx.save();
      const panicNorm = Math.min(1.0, panicLevel / 75);
      const cx = width / 2;
      const cy = height / 2;
      const maxR = Math.hypot(width, height) * 0.72;
      const innerR = Math.max(10, maxR * (0.75 - panicNorm * 0.55));

      // Dark violet / indigo panic radial gradient pulsing with breathing
      const panicPulseFactor = 0.85 + Math.sin(this.breathTimer) * 0.35;
      const panicAlpha = Math.min(0.98, (panicNorm * 0.85 + 0.15) * panicPulseFactor);

      const panicGrad = ctx.createRadialGradient(cx, cy, innerR, cx, cy, maxR);
      panicGrad.addColorStop(0, 'rgba(15, 23, 42, 0)');
      panicGrad.addColorStop(0.35, `rgba(88, 28, 135, ${panicAlpha * 0.5})`);
      panicGrad.addColorStop(0.75, `rgba(58, 12, 95, ${panicAlpha * 0.88})`);
      panicGrad.addColorStop(1, `rgba(15, 23, 42, ${panicAlpha * 0.98})`);

      ctx.fillStyle = panicGrad;
      ctx.fillRect(0, 0, width, height);

      // Vision Darkening / Blacking out ("потемнение в глазах")
      if (panicLevel > 22) {
        const darknessAlpha = Math.min(0.65, ((panicLevel - 22) / 78) * 0.65);
        ctx.fillStyle = `rgba(3, 7, 18, ${darknessAlpha})`;
        ctx.fillRect(0, 0, width, height);
      }

      // Edge Vision Blur Simulation ("блюр экрана") - replaced slow ctx.filter with fast layered vignette
      if (panicLevel > 18) {
        ctx.save();
        const panicNorm2 = Math.min(1.0, (panicLevel - 18) / 57);
        const grad = ctx.createRadialGradient(cx, cy, innerR * 0.8, cx, cy, maxR);
        grad.addColorStop(0, 'rgba(15, 23, 42, 0)');
        grad.addColorStop(1, `rgba(15, 23, 42, ${panicNorm2 * 0.4})`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }

      ctx.restore();
    }

    // =========================================================================
    // 2. RHYTHMIC BLOODY PAIN VIGNETTE (Pulsing with Heartbeat - Highly Visible)
    // =========================================================================
    if (effectivePain > 4) {
      ctx.save();
      const painNorm = Math.min(1.0, effectivePain / 60); // Maxes out earlier
      // Modulate alpha with painPulse
      const pulseFactor = 0.8 + (painPulse + 1) * 0.4; // Stronger pulse
      const vignetteAlpha = Math.min(1.0, (painNorm * 1.5 + 0.3) * pulseFactor); // Much stronger base alpha

      const cx = width / 2;
      const cy = height / 2;
      const maxR = Math.hypot(width, height) * 0.7;
      const innerR = Math.max(10, maxR * (0.75 - painNorm * 0.55 - (painPulse > 0 ? painPulse * 0.15 : 0))); // Tighter

      const bloodGrad = ctx.createRadialGradient(cx, cy, innerR, cx, cy, maxR);
      bloodGrad.addColorStop(0, 'rgba(159, 18, 57, 0)');
      bloodGrad.addColorStop(0.3, `rgba(190, 18, 60, ${Math.min(1.0, vignetteAlpha * 0.6)})`);
      bloodGrad.addColorStop(0.7, `rgba(159, 18, 57, ${Math.min(1.0, vignetteAlpha * 0.95)})`);
      bloodGrad.addColorStop(1, `rgba(88, 5, 25, 1.0)`);

      ctx.fillStyle = bloodGrad;
      ctx.fillRect(0, 0, width, height);

      // Striking bloody corner pulses removed to avoid artificial circles/borders
      ctx.restore();
    }

    // =========================================================================
    // 3. COLD SHIVERING & ICY FROST CYAN VIGNETTE
    // =========================================================================
    const tempDeficit = Math.max(0, 36.6 - temp);
    const coldSeverity = Math.min(1.0, tempDeficit / 1.8); // 1.8 degrees drop gives full effect
    const isCold = coldSeverity > 0.05;
    if (isCold) {
      ctx.save();
      const cx = width / 2;
      const cy = height / 2;
      const maxR = Math.hypot(width, height) * 0.6;
      const innerR = Math.max(20, maxR * (0.85 - coldSeverity * 0.5)); // brings vignette closer to center

      const frostGrad = ctx.createRadialGradient(cx, cy, innerR, cx, cy, maxR);
      frostGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
      frostGrad.addColorStop(0.4, `rgba(14, 165, 233, ${Math.min(1.0, coldSeverity * 0.7)})`);
      frostGrad.addColorStop(1, `rgba(2, 132, 199, ${Math.min(1.0, coldSeverity * 1.2)})`);

      ctx.fillStyle = frostGrad;
      ctx.fillRect(0, 0, width, height);

      // Frost crystalline corner patterns removed to keep vignette smooth
      ctx.restore();
    }

    // =========================================================================
    // 4. FEVER / EXHAUSTION / NAUSEA HEAT WAVE & AMBER TINT
    // =========================================================================
    const isFeverOrSick = temp > 37.8 || energy < 18 || nausea > 35;
    if (isFeverOrSick) {
      ctx.save();
      const sickSeverity = Math.min(1.0, Math.max(
        (temp - 37.5) / 2.0,
        (20 - energy) / 20,
        (nausea - 25) / 60
      ));

      // Amber/yellowish fever tint
      ctx.fillStyle = `rgba(217, 119, 6, ${sickSeverity * 0.18})`;
      ctx.fillRect(0, 0, width, height);

      // Subtle heat-wave swaying / vignette
      const cx = width / 2;
      const cy = height / 2;
      const maxR = Math.hypot(width, height) * 0.55;
      const heatGrad = ctx.createRadialGradient(cx, cy, maxR * 0.5, cx, cy, maxR);
      heatGrad.addColorStop(0, 'rgba(245, 158, 11, 0)');
      heatGrad.addColorStop(1, `rgba(180, 83, 9, ${sickSeverity * 0.35})`);
      ctx.fillStyle = heatGrad;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    // =========================================================================
    // 4.5. CARBON MONOXIDE POISONING & HYPOXIC TUNNEL VISION
    // =========================================================================
    const co = bs.coPoisoning || 0;
    if (co > 5) {
      ctx.save();
      const cx = width / 2;
      const cy = height / 2;
      const maxR = Math.hypot(width, height) * 0.72;
      const coRatio = Math.min(1.0, co / 100);

      // Tunnel vision aperture shrinks as CO increases towards 100%
      // 0% -> 0.75 maxR, 80% -> 0.18 maxR (severe tunnel vision)
      const tunnelInnerR = Math.max(10, maxR * (0.75 - coRatio * 0.58));
      const tunnelGrad = ctx.createRadialGradient(cx, cy, tunnelInnerR, cx, cy, maxR);
      
      tunnelGrad.addColorStop(0, 'rgba(15, 23, 42, 0)');
      tunnelGrad.addColorStop(0.45, `rgba(15, 23, 42, ${coRatio * 0.4})`);
      tunnelGrad.addColorStop(0.80, `rgba(2, 6, 23, ${coRatio * 0.85})`);
      tunnelGrad.addColorStop(1.0, `rgba(0, 0, 0, ${Math.min(0.98, coRatio * 0.98)})`);

      ctx.fillStyle = tunnelGrad;
      ctx.fillRect(0, 0, width, height);

      // Murky grey soot haze in breathing view
      if (co > 25) {
        ctx.fillStyle = `rgba(30, 41, 59, ${Math.min(0.35, (co - 20) * 0.005)})`;
        ctx.fillRect(0, 0, width, height);
      }

      // CO Poisoning Warning HUD Banner
      if (co > 35) {
        ctx.fillStyle = co > 70 ? 'rgba(239, 68, 68, 0.95)' : 'rgba(251, 146, 60, 0.9)';
        ctx.font = 'bold 14px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`☣️ ОСТРОЕ УДУШЬЕ: УГАРНЫЙ ГАЗ В КРОВИ (${Math.round(co)}% CO)! СРОЧНО НА СВЕЖИЙ ВОЗДУХ!`, width / 2, 105);
      }

      ctx.restore();
    }

    // =========================================================================
    // 4.6. SCALDING VEHICLE FIRE & 3-TIER CABIN HEAT VIGNETTE
    // =========================================================================
    let inFireVehicle = false;
    let fireProgress = 0;
    let cabinTemp = 20;
    let vehicleDamage: any = null;

    if (world && player.isInVehicle && player.currentVehicleId) {
      const v = world.vehicles.find(veh => veh.id === player.currentVehicleId);
      if (v) {
        cabinTemp = v.heaterTemp ?? 20;
        vehicleDamage = v.damage;
        fireProgress = v.damage?.fireProgress || ((v.damage?.engineFire || v.damage?.fuelTankFire) ? 0.2 : (v.damage?.underHoodSmolder ? 0.05 : 0));
        if (v.damage?.engineFire || v.damage?.fuelTankFire || v.damage?.cabinFire || cabinTemp > 45) {
          inFireVehicle = true;
        }
      }
    }

    if (inFireVehicle || temp >= 38.5 || cabinTemp > 45) {
      ctx.save();
      const timeMs = Date.now();
      const cx = width / 2;
      const cy = height / 2;
      const maxR = Math.hypot(width, height) * 0.72;

      // Three Tiers of Thermal Impact:
      // Tier 1: < 60°C (tolerable, sweating, slight amber aura)
      // Tier 2: 60 - 120°C (mild burns, pulsating crimson throbs)
      // Tier 3: > 150°C (severe burns, roaring inferno, dark soot border)
      const firePulse = 0.85 + Math.sin(timeMs * 0.012) * 0.15;

      if (cabinTemp <= 60.0) {
        // TIER 1: Tolerable warm amber shimmer
        const heatNorm = Math.max(0, (cabinTemp - 40) / 20);
        const innerR = maxR * (0.85 - heatNorm * 0.25);
        const fireGrad = ctx.createRadialGradient(cx, cy, innerR, cx, cy, maxR);
        fireGrad.addColorStop(0, 'rgba(245, 158, 11, 0)');
        fireGrad.addColorStop(0.7, `rgba(245, 158, 11, ${0.25 * heatNorm})`);
        fireGrad.addColorStop(1.0, `rgba(217, 119, 6, ${0.45 * heatNorm})`);
        ctx.fillStyle = fireGrad;
        ctx.fillRect(0, 0, width, height);
      } else if (cabinTemp <= 120.0) {
        // TIER 2: 60 - 120°C - Mild burns, pulsating crimson heat waves
        const heatNorm = (cabinTemp - 60) / 60; // 0..1
        const innerR = maxR * (0.60 - heatNorm * 0.25);
        const fireGrad = ctx.createRadialGradient(cx, cy, innerR, cx, cy, maxR);
        fireGrad.addColorStop(0, 'rgba(239, 68, 68, 0)');
        fireGrad.addColorStop(0.4, `rgba(249, 115, 22, ${0.45 * heatNorm * firePulse})`);
        fireGrad.addColorStop(0.75, `rgba(220, 38, 38, ${0.75 * heatNorm * firePulse})`);
        fireGrad.addColorStop(1.0, `rgba(153, 27, 27, ${0.88 * heatNorm})`);
        ctx.fillStyle = fireGrad;
        ctx.fillRect(0, 0, width, height);

        // Heat warning
        ctx.fillStyle = 'rgba(254, 215, 170, 0.95)';
        ctx.font = 'bold 15px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`🔥 ЖАР В САЛОНЕ (${Math.round(cabinTemp)}°C)! НАРАСТАЮЩАЯ БОЛЬ И ОЖОГИ!`, width / 2, 75);
      } else {
        // TIER 3: > 120°C (and > 150°C severe) - Roaring inferno, blistering edges
        const heatNorm = Math.min(1.0, (cabinTemp - 120) / 100);
        const innerR = Math.max(15, maxR * (0.35 - heatNorm * 0.2));
        const fireGrad = ctx.createRadialGradient(cx, cy, innerR, cx, cy, maxR);
        fireGrad.addColorStop(0, 'rgba(254, 240, 138, 0)');
        fireGrad.addColorStop(0.3, `rgba(249, 115, 22, ${0.65 * firePulse})`);
        fireGrad.addColorStop(0.65, `rgba(220, 38, 38, ${0.85 * firePulse})`);
        fireGrad.addColorStop(1.0, 'rgba(127, 29, 29, 0.98)');
        ctx.fillStyle = fireGrad;
        ctx.fillRect(0, 0, width, height);

        // Heavy charcoal soot corners
        const sootGrad = ctx.createRadialGradient(cx, cy, maxR * 0.35, cx, cy, maxR);
        sootGrad.addColorStop(0, 'rgba(15, 23, 42, 0)');
        sootGrad.addColorStop(0.65, 'rgba(15, 23, 42, 0.55)');
        sootGrad.addColorStop(1.0, 'rgba(2, 6, 23, 0.92)');
        ctx.fillStyle = sootGrad;
        ctx.fillRect(0, 0, width, height);

        // Critical Warning
        ctx.fillStyle = 'rgba(254, 202, 202, 0.98)';
        ctx.font = 'bold 16px system-ui, sans-serif';
        ctx.textAlign = 'center';
        const msg = cabinTemp >= 150 
          ? `🚨 СМЕРТЕЛЬНЫЙ ОГОНЬ В САЛОНЕ (${Math.round(cabinTemp)}°C)! СРОЧНО ВЫБИРАЙТЕСЬ!`
          : `🚨 САЛОН В ОГНЕ (${Math.round(cabinTemp)}°C)! СРОЧНО ПОКИНЬТЕ АВТОМОБИЛЬ!`;
        ctx.fillText(msg, width / 2, 75);
      }

      ctx.restore();
    }

    // =========================================================================
    // 5. HEAVY IMPACT WHITE FLASH & UNCONSCIOUSNESS BLACKOUT
    // =========================================================================
    if (bs.impactFlashTimer && bs.impactFlashTimer > 0) {
      ctx.save();
      const flashAlpha = Math.min(0.9, bs.impactFlashTimer * 0.85);
      ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    if (player.needsHospitalEvacuation && !player.isHospitalized) {
      ctx.save();
      const timeSec = Date.now() / 1000;
      const cx = width / 2;
      const cy = height / 2;
      const phase = player.evacPhase || 'ambulance_to_player';

      if (phase === 'return_dark') {
        // High-tech mobile ICU transit screen
        ctx.fillStyle = '#020617';
        ctx.fillRect(0, 0, width, height);

        // Subtle medical monitor grid pattern
        ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
        ctx.lineWidth = 1;
        const gridSize = 40;
        for (let gx = 0; gx < width; gx += gridSize) {
          ctx.beginPath();
          ctx.moveTo(gx, 0);
          ctx.lineTo(gx, height);
          ctx.stroke();
        }
        for (let gy = 0; gy < height; gy += gridSize) {
          ctx.beginPath();
          ctx.moveTo(0, gy);
          ctx.lineTo(width, gy);
          ctx.stroke();
        }

        // Dynamic EKG waveform in center
        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 10;

        const ekgY = cy - 20;
        const ekgSpeed = timeSec * 320;
        for (let x = width * 0.15; x <= width * 0.85; x += 3) {
          const xOffset = (x + ekgSpeed) % (width * 0.7 + 120) - 60;
          let yNoise = 0;
          
          const pulsePhase = (xOffset % 220);
          if (pulsePhase > 80 && pulsePhase < 95) {
            yNoise -= 28 * Math.sin((pulsePhase - 80) / 15 * Math.PI);
          } else if (pulsePhase >= 95 && pulsePhase < 110) {
            yNoise += 48 * Math.sin((pulsePhase - 95) / 15 * Math.PI);
          } else if (pulsePhase >= 110 && pulsePhase < 125) {
            yNoise -= 16 * Math.sin((pulsePhase - 110) / 15 * Math.PI);
          }

          const yPos = ekgY + yNoise;
          if (x === width * 0.15) ctx.moveTo(x, yPos);
          else ctx.lineTo(x, yPos);
        }
        ctx.stroke();
        ctx.restore();

        // Medical vital signs display
        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = '700 13px system-ui, sans-serif';
        ctx.fillStyle = '#38bdf8';
        ctx.fillText('ЧСС: 76 уд/мин   |   АД: 118/76 мм рт.ст.   |   SpO2: 98%   |   Инфузия: 250 мл/ч', cx, cy + 35);

        ctx.font = '800 16px system-ui, sans-serif';
        ctx.fillStyle = '#f8fafc';
        ctx.fillText('СКОРАЯ ПОМОЩЬ: ЭКСТРЕННАЯ ТРАНСПОРТИРОВКА В ГОРОДСКУЮ БОЛЬНИЦУ №1', cx, cy + 70);

        ctx.font = '500 12px system-ui, sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('«Бригада №3: Пациент зафиксирован на каталке, везем в реанимационное отделение ОРИТ»', cx, cy + 96);
        ctx.restore();
      } else {
        // Dramatic cinematic vignette while camera follows speeding ambulance to the player
        const maxR = Math.hypot(width, height) * 0.7;
        const vignGrad = ctx.createRadialGradient(cx, cy, maxR * 0.45, cx, cy, maxR);
        vignGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vignGrad.addColorStop(0.7, 'rgba(0, 0, 0, 0.2)');
        vignGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.6)');

        ctx.fillStyle = vignGrad;
        ctx.fillRect(0, 0, width, height);

        // Top Emergency Banner
        ctx.save();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.5;
        const bW = Math.min(width - 40, 560);
        const bH = 50;
        const bX = (width - bW) / 2;
        const bY = 24;
        ctx.beginPath();
        ctx.roundRect(bX, bY, bW, bH, 8);
        ctx.fill();
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.font = '800 14px system-ui, sans-serif';
        ctx.fillStyle = '#f87171';
        ctx.fillText('ЭКСТРЕННЫЙ ВЫЗОВ СКОРОЙ ПОМОЩИ • БРИГАДА СПЕШИТ К ВАМ', cx, bY + 22);

        ctx.font = '600 12px system-ui, sans-serif';
        ctx.fillStyle = '#e2e8f0';
        ctx.fillText('Камера отслеживает движение реанимационного автомобиля МЧС / СМП', cx, bY + 39);
        ctx.restore();
      }
      ctx.restore();
    } else if (player.isFainting && !player.isHospitalized) {
      ctx.save();
      ctx.fillStyle = 'rgba(2, 6, 23, 0.82)';
      ctx.fillRect(0, 0, width, height);

      // Pulsing heartbeat / unconsciousness
      const pulseAlpha = 0.4 + Math.sin(Date.now() / 350) * 0.3;
      ctx.fillStyle = `rgba(226, 232, 240, ${pulseAlpha})`;
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('ТРАВМАТИЧЕСКИЙ ШОК...', width / 2, height / 2);
      ctx.restore();
    }

    // =========================================================================
    // 6. VEHICLE WINDSHIELD RAIN & FOG VIGNETTE (FIELD OF VIEW NARROWING)
    // =========================================================================
    if (world && player.isInVehicle && player.currentVehicleId) {
      const veh = world.vehicles.find(v => v.id === player.currentVehicleId);
      if (veh) {
        const rainLevel = (typeof veh.windshieldRainLevel === 'number' && Number.isFinite(veh.windshieldRainLevel)) ? Math.max(0, veh.windshieldRainLevel) : 0;
        const rawFog = (typeof veh.fogLevel === 'number' && Number.isFinite(veh.fogLevel)) ? Math.max(0, veh.fogLevel) : 0;
        const fogLevel = rawFog <= 1.0 ? rawFog * 100 : rawFog;

        if (rainLevel > 5 || fogLevel > 5) {
          ctx.save();
          const cx = width / 2;
          const cy = height / 2;
          
          const maxLevel = Math.max(rainLevel, fogLevel);
          // Scale visible area so it completely closes in on the vehicle as maxLevel reaches 100%
          const levelFactor = Math.min(1.0, Math.max(0.0, maxLevel / 100));
          
          // Outer radius of the transition zone (fully opaque beyond this)
          const outerR = Math.max(85, 550 * (1.0 - levelFactor * 0.85));
          // Inner radius where visibility starts to fade
          const innerR = Math.max(40, outerR * 0.45);

          const windshieldGrad = ctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
          
          if (fogLevel > rainLevel) {
            const fogAlpha = Math.min(1.0, Math.max(0.0, levelFactor * 1.2));
            const a1 = (fogAlpha * 0.65).toFixed(3);
            const a2 = (fogAlpha * 0.95).toFixed(3);
            const a3 = fogAlpha.toFixed(3);
            // Dynamic white-out/gray-out fog
            windshieldGrad.addColorStop(0, 'rgba(235, 244, 255, 0)');
            windshieldGrad.addColorStop(0.35, `rgba(215, 228, 242, ${a1})`);
            windshieldGrad.addColorStop(0.7, `rgba(195, 210, 226, ${a2})`);
            windshieldGrad.addColorStop(1.0, `rgba(180, 196, 212, ${a3})`);
          } else {
            const rainAlpha = Math.min(1.0, Math.max(0.0, levelFactor * 1.25));
            const a1 = (rainAlpha * 0.65).toFixed(3);
            const a2 = (rainAlpha * 0.95).toFixed(3);
            const a3 = rainAlpha.toFixed(3);
            // Pitch-black storm blackout
            windshieldGrad.addColorStop(0, 'rgba(15, 23, 42, 0)');
            windshieldGrad.addColorStop(0.3, `rgba(10, 15, 28, ${a1})`);
            windshieldGrad.addColorStop(0.65, `rgba(4, 6, 12, ${a2})`);
            windshieldGrad.addColorStop(1.0, `rgba(0, 0, 0, ${a3})`);
          }

          ctx.fillStyle = windshieldGrad;
          ctx.fillRect(0, 0, width, height);

          // Additionally draw a solid outer mask to ensure absolutely nothing is visible outside the outerR circle
          if (maxLevel > 20) {
            const maskAlpha = Math.min(1.0, Math.max(0.0, (maxLevel - 20) / 75)).toFixed(3);
            ctx.strokeStyle = 'transparent';
            // We can draw a full screen mask with a cutout circle of outerR
            ctx.beginPath();
            ctx.rect(0, 0, width, height);
            ctx.arc(cx, cy, outerR, 0, Math.PI * 2, true); // clockwise cutout
            ctx.fillStyle = fogLevel > rainLevel 
              ? `rgba(180, 196, 212, ${maskAlpha})`
              : `rgba(0, 0, 0, ${maskAlpha})`;
            ctx.fill();
          }

          if (maxLevel > 40) {
            ctx.fillStyle = fogLevel > rainLevel ? 'rgba(30, 41, 59, 0.9)' : 'rgba(241, 245, 249, 0.95)';
            ctx.font = 'bold 12px system-ui, sans-serif';
            ctx.textAlign = 'center';
            if (fogLevel > rainLevel) {
              ctx.fillText('СТЕКЛО ЗАПОТЕЛО (ПРОГРЕЙТЕ ПЕЧКУ / ОТКРОЙТЕ ОКНО)', width / 2, 45);
            } else {
              ctx.fillText('СИЛЬНЫЕ ОСАДКИ (ВКЛЮЧИТЕ ДВОРНИКИ ДЛЯ ОЧИСТКИ)', width / 2, 45);
            }
          }

          ctx.restore();
        }
      }
    }

    ctx.restore();
  }
}

export const screenEffectsSystem = new ScreenEffectsSystem();
