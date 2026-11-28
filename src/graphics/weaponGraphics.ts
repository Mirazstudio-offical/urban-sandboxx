import {
  GameWorld,
  InventoryItem,
  Player,
} from '../types';
import {
  AMMO_SPECS,
  MAGAZINE_SPECS,
  WEAPON_SPECS,
  WeaponSpec,
  isAmmoItemId,
  isMagazineItemId,
  isWeaponItemId,
} from '../weaponData';
import { getActiveHeldWeapon } from '../weaponSystem';
import { HumanPose3D } from '../humanAnimationSystem';
import { drawShadow } from './itemGraphicShared';

// ============================================================================
// 1. SIDE-PROFILE 2D ITEM MODELS (INVENTORY, GROUND, CATALOG)
//    Canonical coordinate space: centered at (0, 0), box [-11..+11]
// ============================================================================

function drawWeaponSideProfile(
  ctx: CanvasRenderingContext2D,
  spec: WeaponSpec,
  item?: InventoryItem
): void {
  drawShadow(ctx, 7.2, 2.2, 9.0, 0.22);

  const ws = item?.weaponState;
  const finish = spec.finishColor;
  const sec = spec.secondaryColor;
  const furn = spec.furnitureColor;
  const isPistolLike =
    spec.category === 'pistol' ||
    spec.category === 'revolver' ||
    spec.category === 'air_pistol_co2' ||
    spec.category === 'air_pistol_pump';

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  if (spec.category === 'revolver') {
    // Classic 6-shot revolver silhouette
    ctx.rotate(-0.18);
    // Wooden curved grip
    ctx.fillStyle = furn;
    ctx.beginPath();
    ctx.moveTo(-6.8, 0.5);
    ctx.lineTo(-9.0, 6.2);
    ctx.lineTo(-5.6, 6.8);
    ctx.lineTo(-3.6, 1.8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Frame & trigger guard
    ctx.fillStyle = finish;
    ctx.fillRect(-5.2, -2.8, 7.2, 4.4);
    ctx.strokeStyle = finish;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(-2.6, 2.4, 1.6, 0, Math.PI);
    ctx.stroke();

    // Fluted cylinder
    ctx.fillStyle = sec;
    ctx.beginPath();
    ctx.roundRect(-3.8, -2.5, 4.2, 3.6, 0.6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 0.45;
    ctx.beginPath();
    ctx.moveTo(-3.4, -1.4);
    ctx.lineTo(0.0, -1.4);
    ctx.moveTo(-3.4, -0.2);
    ctx.lineTo(0.0, -0.2);
    ctx.stroke();

    // Long barrel + underlug + front sight
    ctx.fillStyle = finish;
    ctx.fillRect(1.2, -2.8, 8.2, 1.8);
    ctx.fillStyle = sec;
    ctx.fillRect(1.2, -1.0, 6.6, 0.9);
    ctx.fillStyle = finish;
    ctx.beginPath();
    ctx.moveTo(8.0, -2.8);
    ctx.lineTo(9.1, -2.8);
    ctx.lineTo(9.1, -4.0);
    ctx.closePath();
    ctx.fill();
    // Hammer spur
    ctx.fillStyle = sec;
    ctx.fillRect(-6.0, -3.5, 1.3, 1.2);
    ctx.restore();
    return;
  }

  if (isPistolLike) {
    ctx.rotate(-0.14);
    const isPumpPistol = spec.category === 'air_pistol_pump';

    // Grip
    ctx.fillStyle = furn;
    ctx.beginPath();
    ctx.moveTo(-6.2, 0.0);
    ctx.lineTo(-7.8, 6.4);
    ctx.lineTo(-4.0, 6.8);
    ctx.lineTo(-2.5, 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 0.45;
    ctx.stroke();

    // Checkered grip panel detail
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(-6.4, 1.6, 2.3, 3.8);

    // Lower frame & trigger guard
    ctx.fillStyle = sec;
    ctx.fillRect(-6.0, -0.8, isPumpPistol ? 12.6 : 11.4, 2.0);
    ctx.strokeStyle = sec;
    ctx.lineWidth = 0.75;
    ctx.beginPath();
    ctx.moveTo(-2.5, 1.2);
    ctx.lineTo(-1.8, 3.2);
    ctx.lineTo(1.2, 3.2);
    ctx.lineTo(1.6, 1.2);
    ctx.stroke();

    // Slide / upper receiver
    const slideBack = ws?.slideLockedOpen ? -1.4 : 0;
    ctx.fillStyle = finish;
    ctx.beginPath();
    ctx.roundRect(-6.6 + slideBack, -3.6, isPumpPistol ? 14.2 : 13.6, 3.0, 0.5);
    ctx.fill();

    // Ejection port & slide serrations
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(-0.8 + slideBack, -3.4, 2.8, 1.1);
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 0.4;
    for (let s = 0; s < 4; s++) {
      const sx = -5.6 + slideBack + s * 0.85;
      ctx.beginPath();
      ctx.moveTo(sx, -3.3);
      ctx.lineTo(sx, -1.0);
      ctx.stroke();
    }

    // Pump forend for Crosman 1377
    if (isPumpPistol) {
      ctx.fillStyle = furn;
      ctx.beginPath();
      ctx.roundRect(0.2, 0.4, 7.6, 2.2, 0.5);
      ctx.fill();
      // Extended barrel tip + brass bolt knob
      ctx.fillStyle = finish;
      ctx.fillRect(7.4, -3.2, 2.6, 1.4);
      ctx.fillStyle = '#d4af37';
      ctx.beginPath();
      ctx.arc(-4.8, -2.2, 0.75, 0, Math.PI * 2);
      ctx.fill();
    } else if (spec.id === 'air_beretta92_co2') {
      // Exposed Beretta barrel tip
      ctx.fillStyle = '#9ca3af';
      ctx.fillRect(6.8, -3.0, 1.6, 1.5);
    }

    // Iron sights
    ctx.fillStyle = '#e5e7eb';
    ctx.fillRect(-6.2 + slideBack, -4.2, 0.9, 0.6);
    ctx.fillRect(5.8 + slideBack, -4.2, 0.8, 0.6);

    // Baseplate if magazine inserted
    if (ws?.insertedMag || !ws) {
      ctx.fillStyle = '#111827';
      ctx.fillRect(-7.9, 6.2, 3.9, 0.85);
    }
    ctx.restore();
    return;
  }

  // Long guns, SMGs, shotguns, air rifles — angled diagonally across the 24x24 frame
  ctx.rotate(-0.46);

  const isBullpup = spec.id === 'air_edgun_matador';
  const isSmg = spec.category === 'smg' || spec.category === 'air_smg_co2';
  const isShotgun = spec.category === 'shotgun';
  const isAirRifle = spec.weaponClass === 'pneumatic' && !isSmg;
  const isSniper = spec.category === 'sniper_rifle';
  const isAk = spec.id === 'wpn_ak74m' || spec.id === 'wpn_akm';
  const hasMag = !ws || !!ws.insertedMag;

  // 1. Buttstock
  if (isSmg && spec.id === 'wpn_kedr') {
    // Compact folded top wire stock
    ctx.strokeStyle = sec;
    ctx.lineWidth = 0.85;
    ctx.beginPath();
    ctx.moveTo(-6.2, -2.8);
    ctx.lineTo(1.2, -2.8);
    ctx.stroke();
  } else if (spec.id === 'air_drozd') {
    // Drozd compact tactical stock
    ctx.fillStyle = furn;
    ctx.beginPath();
    ctx.moveTo(-10.5, -1.2);
    ctx.lineTo(-5.2, -1.6);
    ctx.lineTo(-5.2, 1.2);
    ctx.lineTo(-10.5, 2.2);
    ctx.closePath();
    ctx.fill();
  } else if (isSniper) {
    // SVD skeletonized wooden/polymer stock
    ctx.fillStyle = furn;
    ctx.beginPath();
    ctx.moveTo(-11.4, -1.6);
    ctx.lineTo(-4.8, -1.8);
    ctx.lineTo(-4.8, 1.8);
    ctx.lineTo(-11.4, 2.6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#111827';
    ctx.fillRect(-9.8, -0.4, 3.8, 1.5); // thumbhole cutout
  } else if (isBullpup) {
    // EDgun bullpup integrated walnut chassis
    ctx.fillStyle = furn;
    ctx.beginPath();
    ctx.roundRect(-10.2, -1.6, 13.8, 3.6, 0.8);
    ctx.fill();
  } else {
    // Classic rifle / shotgun / airgun stock
    ctx.fillStyle = furn;
    ctx.beginPath();
    ctx.moveTo(-11.2, -1.2);
    ctx.lineTo(-4.6, -1.7);
    ctx.lineTo(-4.6, 1.0);
    ctx.lineTo(-11.2, 2.5);
    ctx.closePath();
    ctx.fill();
    // Buttpad
    ctx.fillStyle = '#111827';
    ctx.fillRect(-11.4, -1.3, 0.8, 3.9);
  }

  // 2. Pistol grip (for AK, SVD, SMGs, tactical airguns)
  if (isAk || isSmg || isSniper || isBullpup || spec.id === 'air_izh61') {
    ctx.fillStyle = isAk && spec.id === 'wpn_akm' ? '#7c3f1c' : furn;
    ctx.beginPath();
    ctx.moveTo(-4.8, 0.8);
    ctx.lineTo(-6.2, 4.6);
    ctx.lineTo(-3.9, 4.9);
    ctx.lineTo(-2.7, 0.9);
    ctx.closePath();
    ctx.fill();
  }

  // 3. Receiver body
  ctx.fillStyle = finish;
  const recX = isBullpup ? -7.2 : -5.4;
  const recW = isSmg ? 8.2 : isBullpup ? 9.6 : 8.6;
  ctx.beginPath();
  ctx.roundRect(recX, -2.5, recW, 3.2, 0.4);
  ctx.fill();

  // Receiver highlight & bolt/ejection port
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.fillRect(recX + 0.8, -2.2, recW - 1.6, 0.7);
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(recX + 3.2, -1.8, 2.2, 1.0);

  // 4. Handguard / Forend
  if (!isBullpup) {
    ctx.fillStyle = isAk || isShotgun || isAirRifle || spec.id === 'wpn_mosin' || spec.id === 'wpn_sks' || spec.id === 'wpn_toz78' ? furn : sec;
    const fgX = recX + recW - 0.5;
    const fgW = isSmg ? 3.4 : isShotgun ? 5.6 : 5.2;
    ctx.beginPath();
    ctx.roundRect(fgX, -1.7, fgW, 2.3, 0.4);
    ctx.fill();
  }

  // 5. Barrel & specialized underbarrel hardware
  ctx.fillStyle = finish;
  if (spec.id === 'wpn_toz34') {
    // Over-under twin barrels!
    ctx.fillRect(2.6, -2.4, 8.8, 1.0);
    ctx.fillRect(2.6, -1.2, 8.8, 1.0);
  } else if (spec.id === 'wpn_mp155') {
    // Long barrel + underbarrel tubular magazine
    ctx.fillRect(2.6, -2.3, 8.9, 1.2);
    ctx.fillStyle = sec;
    ctx.fillRect(2.6, -0.9, 6.2, 1.0);
  } else if (spec.propellant === 'pcp_tank') {
    // Moderated barrel + thick cylindrical PCP air reservoir below
    ctx.fillStyle = finish;
    ctx.fillRect(2.2, -2.5, 8.6, 1.3);
    ctx.fillStyle = sec;
    ctx.beginPath();
    ctx.roundRect(1.4, -0.9, 7.2, 1.7, 0.5);
    ctx.fill();
    // Brass manometer tip
    ctx.fillStyle = '#eab308';
    ctx.fillRect(8.3, -0.7, 0.6, 1.3);
  } else if (isAk) {
    // AK gas tube + barrel + front sight post + muzzle brake
    ctx.fillStyle = sec;
    ctx.fillRect(3.2, -2.7, 4.4, 0.8);
    ctx.fillStyle = finish;
    ctx.fillRect(3.2, -1.7, 8.2, 1.1);
    // Front sight tower
    ctx.fillRect(9.2, -3.1, 0.8, 1.6);
    // Muzzle brake
    ctx.fillStyle = sec;
    ctx.fillRect(10.8, -2.0, 1.1, 1.6);
  } else {
    const barrelLen = isSmg ? 4.8 : isSniper || spec.id === 'wpn_mosin' ? 8.8 : 7.8;
    ctx.fillRect(recX + recW - 0.2, -2.2, barrelLen, 1.2);
    // Front sight post
    ctx.fillRect(recX + recW + barrelLen - 1.3, -3.1, 0.7, 1.1);
  }

  // 6. Detachable magazine silhouette
  if (hasMag && (spec.feedType === 'detachable_mag' || spec.feedType === 'linear_clip')) {
    if (isAk) {
      ctx.fillStyle = spec.id === 'wpn_ak74m' ? '#8f3f1b' : '#252930';
      ctx.beginPath();
      ctx.moveTo(-1.0, 0.6);
      ctx.lineTo(1.5, 0.6);
      ctx.quadraticCurveTo(2.4, 3.8, 3.8, 6.2);
      ctx.lineTo(1.4, 6.8);
      ctx.quadraticCurveTo(0.0, 4.0, -1.0, 0.6);
      ctx.closePath();
      ctx.fill();
    } else if (spec.category === 'smg') {
      ctx.fillStyle = '#1e242b';
      ctx.beginPath();
      ctx.moveTo(-0.4, 0.6);
      ctx.lineTo(1.7, 0.6);
      ctx.lineTo(spec.id === 'wpn_mp5' ? 2.8 : 1.9, 6.4);
      ctx.lineTo(spec.id === 'wpn_mp5' ? 0.8 : -0.2, 6.4);
      ctx.closePath();
      ctx.fill();
    } else if (spec.id === 'air_drozd') {
      ctx.fillStyle = '#18181b';
      ctx.fillRect(-1.2, 0.6, 2.3, 5.8);
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(-3.6, -1.4, 1.8, 0.9); // iconic Drozd orange selector
    } else if (isSniper || spec.id === 'wpn_toz78') {
      ctx.fillStyle = sec;
      ctx.fillRect(-0.8, 0.6, 2.8, 2.8);
    }
  }

  // 7. Optical scope (SVD, Hatsan 125, Diana 54, EDgun, Ataman)
  if (spec.hasOptic) {
    ctx.fillStyle = '#111827';
    // Scope rings
    ctx.fillRect(-3.2, -3.6, 0.8, 1.3);
    ctx.fillRect(0.4, -3.6, 0.8, 1.3);
    // Main scope tube + bells
    ctx.fillRect(-5.0, -4.7, 8.2, 1.3);
    ctx.fillRect(-5.6, -5.0, 1.5, 1.9);
    ctx.fillRect(2.6, -5.1, 1.8, 2.1);
    // Objective lens glass glint
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(4.2, -4.9, 0.4, 1.7);
  }

  ctx.restore();
}

function drawMagazineSideProfile(
  ctx: CanvasRenderingContext2D,
  magId: string,
  item?: InventoryItem
): void {
  const spec = MAGAZINE_SPECS[magId];
  if (!spec) return;
  drawShadow(ctx, 7.6, 1.8, 6.2, 0.2);

  const ms = item?.magazineState;
  const loaded = ms ? ms.rounds.length : spec.capacity;
  const fillRatio = spec.capacity > 0 ? loaded / spec.capacity : 0;

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  if (spec.style === 'rotary_drum') {
    // Circular machined pellet drum showing loaded pellets
    ctx.fillStyle = spec.color;
    ctx.beginPath();
    ctx.arc(0, 0, 6.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = spec.accentColor;
    ctx.lineWidth = 0.85;
    ctx.stroke();

    // Center hub
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(0, 0, 2.1, 0, Math.PI * 2);
    ctx.fill();

    // Individual pellet chambers
    const n = spec.capacity;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 - Math.PI * 0.5;
      const cx = Math.cos(a) * 4.35;
      const cy = Math.sin(a) * 4.35;
      ctx.fillStyle = i < loaded ? '#94a3b8' : '#090d16';
      ctx.beginPath();
      ctx.arc(cx, cy, 1.05, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return;
  }

  if (spec.style === 'linear_clip') {
    // IZh-61 5-shot linear pellet strip
    ctx.rotate(-0.22);
    ctx.fillStyle = spec.color;
    ctx.beginPath();
    ctx.roundRect(-7.5, -2.1, 15.0, 4.2, 0.7);
    ctx.fill();
    ctx.strokeStyle = spec.accentColor;
    ctx.lineWidth = 0.5;
    ctx.stroke();
    for (let i = 0; i < 5; i++) {
      const cx = -5.2 + i * 2.6;
      ctx.fillStyle = i < loaded ? '#cbd5e1' : '#090d16';
      ctx.beginPath();
      ctx.arc(cx, 0, 0.95, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return;
  }

  if (spec.style === 'ak_bakelite' || spec.style === 'ak_steel') {
    // Iconic curved banana AK magazine
    ctx.fillStyle = spec.color;
    ctx.beginPath();
    ctx.moveTo(-4.0, -7.8);
    ctx.lineTo(2.4, -7.8);
    ctx.quadraticCurveTo(3.8, 0.0, 6.0, 6.8);
    ctx.lineTo(-0.4, 8.2);
    ctx.quadraticCurveTo(-2.6, 1.0, -4.0, -7.8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 0.6;
    ctx.stroke();

    // Ribbing for steel AKM mag
    if (spec.style === 'ak_steel') {
      ctx.strokeStyle = spec.accentColor;
      ctx.lineWidth = 0.55;
      for (let r = -4; r <= 4; r += 2.6) {
        ctx.beginPath();
        ctx.moveTo(-2.2 + r * 0.18, r);
        ctx.lineTo(2.8 + r * 0.22, r - 0.6);
        ctx.stroke();
      }
    }
    // Feed lips & visible top brass cartridge
    if (loaded > 0) {
      ctx.fillStyle = '#d4af37';
      ctx.beginPath();
      ctx.ellipse(-0.8, -8.1, 2.3, 0.9, -0.05, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return;
  }

  // Pistol / SMG / CO2-integrated / SVD box magazine
  ctx.rotate(spec.style === 'smg_stick' ? 0.14 : 0.18);
  const w = spec.style === 'co2_pistol_mag' ? 6.2 : spec.style === 'svd_box' ? 7.6 : 4.8;
  const h = spec.style === 'smg_stick' ? 16.0 : spec.style === 'svd_box' ? 11.2 : 13.6;

  ctx.fillStyle = spec.color;
  ctx.beginPath();
  ctx.roundRect(-w * 0.5, -h * 0.5, w, h, 0.6);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 0.45;
  ctx.stroke();

  // Baseplate
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-w * 0.5 - 0.6, h * 0.5 - 1.4, w + 1.2, 1.6);

  // Integrated CO2 cartridge window on MP-654K mag
  if (spec.style === 'co2_pistol_mag') {
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.roundRect(-1.7, -3.5, 3.4, 7.6, 1.2);
    ctx.fill();
    ctx.fillStyle = '#eab308';
    ctx.fillRect(-1.2, 5.2, 2.4, 1.1); // piercing screw
  } else {
    // Witness holes / ammo level bar
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(-0.8, -h * 0.32, 1.6, h * 0.6);
    if (fillRatio > 0) {
      const barH = h * 0.6 * fillRatio;
      ctx.fillStyle = '#d4af37';
      ctx.fillRect(-0.6, h * 0.28 - barH, 1.2, barH);
    }
  }

  // Top round visible at feed lips
  if (loaded > 0) {
    ctx.fillStyle = spec.caliber.includes('bb') ? '#e2e8f0' : '#d4af37';
    ctx.beginPath();
    ctx.ellipse(0, -h * 0.5 - 0.35, w * 0.36, 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawAmmoPackSideProfile(ctx: CanvasRenderingContext2D, ammoId: string): void {
  const spec = AMMO_SPECS[ammoId];
  if (!spec) return;
  drawShadow(ctx, 7.5, 2.0, 7.5, 0.22);

  ctx.save();
  // Round metallic pellet tin for airgun pellets
  if (spec.weaponClass === 'pneumatic' && !spec.isSteelBb) {
    const grad = ctx.createRadialGradient(-2, -2, 1, 0, 0, 7.6);
    grad.addColorStop(0, spec.boxAccent);
    grad.addColorStop(0.55, spec.boxColor);
    grad.addColorStop(1, '#0f172a');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, 7.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Inner label ring
    ctx.fillStyle = 'rgba(15,23,42,0.72)';
    ctx.beginPath();
    ctx.arc(0, 0, 5.2, 0, Math.PI * 2);
    ctx.fill();

    // Diabolo pellet silhouette in center
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(-2.5, -1.6);
    ctx.lineTo(-0.5, -0.7);
    ctx.lineTo(2.4, -1.3);
    ctx.quadraticCurveTo(3.6, 0, 2.4, 1.3);
    ctx.lineTo(-0.5, 0.7);
    ctx.lineTo(-2.5, 1.6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    return;
  }

  // Steel BB bottle for 4.5mm BBs
  if (spec.isSteelBb) {
    ctx.fillStyle = spec.boxColor;
    ctx.beginPath();
    ctx.roundRect(-4.6, -4.2, 9.2, 11.2, 1.6);
    ctx.fill();
    ctx.fillStyle = spec.boxAccent;
    ctx.fillRect(-4.6, -0.8, 9.2, 4.2);
    // Funnel cap
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.moveTo(-2.2, -4.2);
    ctx.lineTo(-1.1, -7.8);
    ctx.lineTo(1.1, -7.8);
    ctx.lineTo(2.2, -4.2);
    ctx.closePath();
    ctx.fill();
    // Metallic BB dots
    ctx.fillStyle = '#e5e7eb';
    ctx.beginPath();
    ctx.arc(-1.8, 1.3, 1.1, 0, Math.PI * 2);
    ctx.arc(0.5, 1.3, 1.1, 0, Math.PI * 2);
    ctx.arc(2.5, 1.3, 1.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  // Firearm cardboard / military ammo box
  ctx.fillStyle = spec.boxColor;
  ctx.beginPath();
  ctx.roundRect(-7.8, -5.6, 15.6, 11.4, 1.0);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = 0.6;
  ctx.stroke();

  // Accent caliber stripe
  ctx.fillStyle = spec.boxAccent;
  ctx.fillRect(-7.8, -2.0, 15.6, 3.8);

  // Top flap seam
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 0.45;
  ctx.beginPath();
  ctx.moveTo(-7.6, -3.7);
  ctx.lineTo(7.6, -3.7);
  ctx.stroke();

  // Miniature cartridge / shotgun shell row drawn on front
  const is12g = spec.caliber === '12g';
  const count = is12g ? 3 : 4;
  for (let i = 0; i < count; i++) {
    const cx = -((count - 1) * 0.5) * (is12g ? 3.8 : 2.8) + i * (is12g ? 3.8 : 2.8);
    if (is12g) {
      ctx.fillStyle = spec.casingColor;
      ctx.fillRect(cx - 1.2, -3.2, 2.4, 5.2);
      ctx.fillStyle = '#d4af37';
      ctx.fillRect(cx - 1.25, 1.4, 2.5, 1.7);
    } else {
      ctx.fillStyle = spec.casingColor;
      ctx.fillRect(cx - 0.85, -0.4, 1.7, 3.8);
      ctx.fillStyle = spec.tipColor;
      ctx.beginPath();
      ctx.moveTo(cx - 0.85, -0.4);
      ctx.quadraticCurveTo(cx, -3.4, cx + 0.85, -0.4);
      ctx.closePath();
      ctx.fill();
    }
  }

  ctx.restore();
}

function drawSupportWeaponGear(ctx: CanvasRenderingContext2D, itemId: string): boolean {
  if (itemId === 'co2_cartridge_12g') {
    drawShadow(ctx, 7.6, 1.6, 5.4, 0.2);
    ctx.save();
    ctx.rotate(-0.35);
    const grad = ctx.createLinearGradient(-3, 0, 3, 0);
    grad.addColorStop(0, '#94a3b8');
    grad.addColorStop(0.45, '#f1f5f9');
    grad.addColorStop(1, '#475569');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(-2.7, -2.5, 5.4, 9.8, 2.4);
    ctx.fill();
    // Narrow neck
    ctx.beginPath();
    ctx.moveTo(-2.4, -2.2);
    ctx.lineTo(-1.1, -6.4);
    ctx.lineTo(-1.1, -8.4);
    ctx.lineTo(1.1, -8.4);
    ctx.lineTo(1.1, -6.4);
    ctx.lineTo(2.4, -2.2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 0.45;
    ctx.stroke();
    ctx.restore();
    return true;
  }

  if (itemId === 'pcp_hand_pump') {
    drawShadow(ctx, 8.2, 2.0, 7.0, 0.22);
    ctx.save();
    // Stirrup footplate
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(-6.2, 6.8, 12.4, 1.9);
    // Stainless steel pressure barrel
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(-1.5, -5.8, 3.0, 12.8);
    ctx.fillStyle = '#334155';
    ctx.fillRect(-1.8, 0.5, 3.6, 6.4);
    // T-Handle
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.roundRect(-6.4, -7.8, 12.8, 2.1, 0.8);
    ctx.fill();
    // Manometer dial at base
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(3.8, 4.4, 2.0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 0.65;
    ctx.stroke();
    ctx.strokeStyle = '#dc2626';
    ctx.beginPath();
    ctx.moveTo(3.8, 4.4);
    ctx.lineTo(4.9, 3.3);
    ctx.stroke();
    // Flexible high-pressure hose
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(-1.8, 5.2);
    ctx.quadraticCurveTo(-6.8, 3.2, -5.5, -2.5);
    ctx.stroke();
    ctx.restore();
    return true;
  }

  if (itemId === 'gun_oil_kit') {
    drawShadow(ctx, 7.8, 1.8, 6.5, 0.2);
    ctx.save();
    // Oil spray bottle
    ctx.fillStyle = '#1e3a5f';
    ctx.beginPath();
    ctx.roundRect(-5.6, -3.5, 6.8, 10.6, 1.1);
    ctx.fill();
    ctx.fillStyle = '#e0ab45';
    ctx.fillRect(-5.6, -0.5, 6.8, 4.0);
    // Spray nozzle cap
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(-3.6, -6.2, 2.8, 2.7);
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(-1.0, -5.1);
    ctx.lineTo(3.6, -6.2);
    ctx.stroke();
    // Brass cleaning rod & rag
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(4.2, -6.8);
    ctx.lineTo(4.2, 6.6);
    ctx.stroke();
    ctx.fillStyle = '#f1f5f9';
    ctx.beginPath();
    ctx.roundRect(2.2, 2.5, 4.8, 4.2, 0.7);
    ctx.fill();
    ctx.restore();
    return true;
  }

  return false;
}

export function drawWeaponOrAmmoItem(
  ctx: CanvasRenderingContext2D,
  itemId: string,
  item?: InventoryItem
): boolean {
  if (isWeaponItemId(itemId)) {
    const spec = WEAPON_SPECS[itemId];
    if (spec) {
      drawWeaponSideProfile(ctx, spec, item);
      return true;
    }
  }
  if (isMagazineItemId(itemId)) {
    drawMagazineSideProfile(ctx, itemId, item);
    return true;
  }
  if (isAmmoItemId(itemId)) {
    drawAmmoPackSideProfile(ctx, itemId);
    return true;
  }
  return drawSupportWeaponGear(ctx, itemId);
}

// ============================================================================
// 2. TOP-DOWN IN-HAND WEAPON RENDERER (IN PLAYER LOCAL SPACE: +X FORWARD)
// ============================================================================

export function drawHeldWeaponTopDown(
  ctx: CanvasRenderingContext2D,
  player: Player,
  weaponItem: InventoryItem,
  pose: HumanPose3D,
  hand: 'left' | 'right',
  _nowSec: number
): void {
  const spec = WEAPON_SPECS[weaponItem.itemId];
  if (!spec) return;

  const rt = player.weaponRuntime;
  const ws = weaponItem.weaponState;
  const aim = rt?.aimProgress ?? 0;
  const kick = rt?.recoilKickPx ?? 0;
  const reload = rt?.reloadState;

  const domHand = hand === 'left' ? pose.armL.hand : pose.armR.hand;
  const supHand = hand === 'left' ? pose.armR.hand : pose.armL.hand;
  const isLeft = hand === 'left';

  ctx.save();

  // Compute weapon anchor & axis in player-local space
  let originX = domHand.x;
  let originY = domHand.y;
  let weaponAngle = 0;

  if (spec.twoHanded) {
    // Long gun aligned from dominant hand toward support hand (or forward when hip/ADS)
    const dx = supHand.x - domHand.x;
    const dy = supHand.y - domHand.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 2.2) {
      weaponAngle = Math.atan2(dy, dx);
    } else {
      weaponAngle = isLeft ? 0.14 * (1 - aim) : -0.14 * (1 - aim);
    }
  } else {
    // Pistol points slightly inward at low-ready, dead-straight forward at ADS
    weaponAngle = (isLeft ? 0.12 : -0.12) * (1 - aim);
  }

  // Reload animation canting
  if (reload) {
    const wave = Math.sin(reload.progress * Math.PI);
    weaponAngle += (isLeft ? 0.45 : -0.45) * wave;
  }

  ctx.translate(originX, originY);
  ctx.rotate(weaponAngle);
  // Apply longitudinal recoil kickback along barrel axis
  ctx.translate(-kick * 0.55, 0);

  const finish = spec.finishColor;
  const sec = spec.secondaryColor;
  const furn = spec.furnitureColor;
  const isPistol =
    spec.category === 'pistol' ||
    spec.category === 'revolver' ||
    spec.category === 'air_pistol_co2' ||
    spec.category === 'air_pistol_pump';

  if (isPistol) {
    // Ground drop shadow
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(-1.2, -0.6, spec.lengthPx + 0.8, 2.2);

    // Grip base under fingers
    ctx.fillStyle = furn;
    ctx.fillRect(-1.5, -1.0, 2.8, 2.0);

    // Slide / top rail
    const slideShift = ws?.slideLockedOpen ? -1.1 : 0;
    ctx.fillStyle = finish;
    ctx.beginPath();
    ctx.roundRect(-1.6 + slideShift, -0.95, spec.lengthPx, 1.9, 0.35);
    ctx.fill();

    // Revolver cylinder bulge
    if (spec.category === 'revolver') {
      ctx.fillStyle = sec;
      ctx.beginPath();
      ctx.roundRect(0.2, -1.45, 2.4, 2.9, 0.5);
      ctx.fill();
    }

    // Ejection port & sights
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(0.8 + slideShift, -0.55, 1.6, 1.1);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-1.2 + slideShift, -0.4, 0.5, 0.8);
    ctx.fillRect(spec.lengthPx - 2.3 + slideShift, -0.25, 0.6, 0.5);
  } else {
    // Long gun / SMG / Shotgun / Rifle / Air Rifle
    const totalLen = spec.lengthPx;
    const stockLen = spec.id === 'air_edgun_matador' ? 4.2 : spec.category === 'smg' ? 3.8 : 6.2;
    const recLen = 5.4;
    const foreLen = Math.max(3.2, totalLen - stockLen - recLen * 0.65);

    // Subtle shadow
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(-stockLen, -0.7, totalLen + 1.0, 2.8);

    // Buttstock extending behind grip toward shoulder
    ctx.fillStyle = furn;
    ctx.beginPath();
    ctx.roundRect(-stockLen, -1.05, stockLen + 1.2, 2.1, 0.4);
    ctx.fill();

    // Receiver
    ctx.fillStyle = finish;
    ctx.beginPath();
    ctx.roundRect(-0.8, -1.25, recLen, 2.5, 0.4);
    ctx.fill();

    // Top dust cover highlight & side charging handle
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.fillRect(-0.2, -0.65, recLen - 1.2, 1.3);
    ctx.fillStyle = '#cbd5e1';
    const boltPull = rt && rt.cycleBoltTimer > 0 ? -1.4 : 0;
    ctx.fillRect(1.8 + boltPull, 1.15, 0.9, 0.9);

    // Handguard
    ctx.fillStyle = furn;
    ctx.beginPath();
    ctx.roundRect(recLen - 1.0, -1.15, foreLen * 0.56, 2.3, 0.45);
    ctx.fill();

    // Barrel(s) extending past handguard
    const barrelStart = recLen - 1.0 + foreLen * 0.52;
    const barrelEnd = totalLen - stockLen;
    const barrelLen = Math.max(2.6, barrelEnd - barrelStart);
    ctx.fillStyle = finish;
    if (spec.id === 'wpn_toz34') {
      ctx.fillRect(barrelStart, -0.9, barrelLen, 0.78);
      ctx.fillRect(barrelStart, 0.12, barrelLen, 0.78);
    } else {
      ctx.fillRect(barrelStart, -0.62, barrelLen, 1.24);
    }

    // Muzzle brake / moderator tip
    ctx.fillStyle = sec;
    ctx.fillRect(barrelStart + barrelLen - 1.4, -0.82, 1.5, 1.64);

    // Mounted optical scope (top-down black tube + bright lenses)
    if (spec.hasOptic) {
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(-1.2, -0.9, 6.2, 1.8, 0.5);
      ctx.fill();
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(4.7, -0.65, 0.45, 1.3);
    }
  }

  // Muzzle flash / CO2 cold vapor puff directly at barrel tip
  if (rt && rt.muzzleFlashTimer > 0) {
    const tipX = isPistol ? spec.lengthPx - 1.2 : spec.lengthPx - (spec.category === 'smg' ? 3.8 : 6.2) + 0.5;
    const alpha = Math.min(1, rt.muzzleFlashTimer / 0.055);
    if (rt.muzzleFlashKind === 'pneumatic') {
      // Cool crisp CO2 / compressed-air vapor cone
      const grad = ctx.createRadialGradient(tipX + 2.5, 0, 0.3, tipX + 4.0, 0, 5.5);
      grad.addColorStop(0, `rgba(224, 242, 254, ${(alpha * 0.85).toFixed(3)})`);
      grad.addColorStop(1, 'rgba(186, 230, 253, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(tipX + 3.8, 0, 5.2, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Firearm supersonic muzzle flash star + incandescent core
      const scaleF = rt.muzzleFlashKind === 'suppressed' ? 0.55 : spec.category === 'shotgun' || spec.category === 'sniper_rifle' ? 1.45 : 1.0;
      const g = ctx.createRadialGradient(tipX + 3 * scaleF, 0, 0.4, tipX + 5 * scaleF, 0, 9.5 * scaleF);
      g.addColorStop(0, `rgba(255, 255, 235, ${alpha.toFixed(3)})`);
      g.addColorStop(0.35, `rgba(251, 191, 36, ${(alpha * 0.9).toFixed(3)})`);
      g.addColorStop(0.75, `rgba(234, 88, 12, ${(alpha * 0.55).toFixed(3)})`);
      g.addColorStop(1, 'rgba(234, 88, 12, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(tipX, 0);
      ctx.lineTo(tipX + 11.5 * scaleF, -2.5 * scaleF);
      ctx.lineTo(tipX + 7.5 * scaleF, 0);
      ctx.lineTo(tipX + 11.5 * scaleF, 2.5 * scaleF);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(tipX + 4.2 * scaleF, 0, 4.6 * scaleF, 2.3 * scaleF, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

// ============================================================================
// 3. WORLD BALLISTIC EFFECTS (IMPACTS, SHELL CASINGS, PROJECTILES, RETICLE)
// ============================================================================

export function renderWeaponWorldEffects(
  ctx: CanvasRenderingContext2D,
  world: GameWorld,
  player: Player,
  cameraZoom: number,
  _nowSec: number
): void {
  // 1. Bullet impact marks
  if (world.bulletImpacts && world.bulletImpacts.length > 0) {
    for (let i = 0; i < world.bulletImpacts.length; i++) {
      const m = world.bulletImpacts[i];
      const alpha = Math.max(0, 1 - m.life / m.maxLife);
      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.globalAlpha = alpha * 0.85;
      if (m.surface === 'blood') {
        ctx.fillStyle = '#7f1d1d';
        ctx.beginPath();
        ctx.arc(0, 0, m.radius, 0, Math.PI * 2);
        ctx.fill();
      } else if (m.surface === 'glass') {
        ctx.strokeStyle = '#e0f2fe';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.arc(0, 0, m.radius * 0.8, 0, Math.PI * 2);
        for (let k = 0; k < 5; k++) {
          const a = m.angle + k * 1.25;
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(a) * m.radius * 1.9, Math.sin(a) * m.radius * 1.9);
        }
        ctx.stroke();
      } else {
        ctx.fillStyle = m.surface === 'metal' ? '#1e293b' : m.surface === 'wood' ? '#451a03' : '#292524';
        ctx.beginPath();
        ctx.arc(0, 0, m.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = m.surface === 'metal' ? '#94a3b8' : '#78716c';
        ctx.lineWidth = 0.45;
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  // 2. Ejected spinning shell casings
  if (world.shellCasings && world.shellCasings.length > 0) {
    for (let i = 0; i < world.shellCasings.length; i++) {
      const c = world.shellCasings[i];
      const alpha = Math.min(1, (c.maxLife - c.life) / 3.0);
      ctx.save();
      ctx.globalAlpha = alpha;
      // Ground shadow
      if (c.z > 0.3) {
        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        ctx.beginPath();
        ctx.ellipse(c.x + c.z * 0.15, c.y + c.z * 0.25, c.lengthPx * 0.55, c.widthPx * 0.45, c.angle, 0, Math.PI * 2);
        ctx.fill();
      }
      // Casing body
      ctx.translate(c.x, c.y - c.z * 0.4);
      ctx.rotate(c.angle);
      ctx.fillStyle = c.color;
      ctx.fillRect(-c.lengthPx * 0.5, -c.widthPx * 0.5, c.lengthPx, c.widthPx);
      ctx.fillStyle = c.rimColor;
      ctx.fillRect(-c.lengthPx * 0.5, -c.widthPx * 0.5, c.lengthPx * 0.28, c.widthPx);
      ctx.restore();
    }
  }

  // 3. Active ballistic projectiles (bright kinetic streaks & tracers)
  if (world.projectiles && world.projectiles.length > 0) {
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 0; i < world.projectiles.length; i++) {
      const p = world.projectiles[i];
      const dx = p.x - p.prevX;
      const dy = p.y - p.prevY;
      const segLen = Math.hypot(dx, dy);
      const tailLen = Math.min(Math.max(segLen, p.weaponClass === 'pneumatic' ? 3.5 : 8), p.isTracer ? 44 : 26);
      const tx = p.x - Math.cos(p.angle) * tailLen;
      const ty = p.y - Math.sin(p.angle) * tailLen;

      if (p.isTracer) {
        ctx.strokeStyle = p.tracerColor || '#4ade80';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 0.85;
        ctx.beginPath();
        ctx.moveTo(p.x - Math.cos(p.angle) * (tailLen * 0.45), p.y - Math.sin(p.angle) * (tailLen * 0.45));
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      } else if (p.weaponClass === 'firearm') {
        const grad = ctx.createLinearGradient(tx, ty, p.x, p.y);
        grad.addColorStop(0, 'rgba(253, 224, 71, 0)');
        grad.addColorStop(0.65, 'rgba(253, 224, 71, 0.55)');
        grad.addColorStop(1, 'rgba(255, 255, 255, 0.95)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = p.isNonLethal ? 1.5 : 1.15;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      } else {
        // Pneumatic pellet / BB glint streak
        const grad = ctx.createLinearGradient(tx, ty, p.x, p.y);
        grad.addColorStop(0, 'rgba(203, 213, 225, 0)');
        grad.addColorStop(1, p.isSteelBb ? 'rgba(241, 245, 249, 0.85)' : 'rgba(203, 213, 225, 0.72)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // 4. Dynamic physiological aiming reticle (only when holding a weapon on foot)
  const active = getActiveHeldWeapon(player);
  const rt = player.weaponRuntime;
  if (!active || !rt || player.isInVehicle) return;

  const { spec } = active;
  const distToAim = Math.max(24, Math.hypot(rt.aimWorldX - player.x, rt.aimWorldY - player.y));
  // Actual point of aim including real physiological sway & recoil climb
  const reticleX = player.x + Math.cos(rt.effectiveAimAngle) * distToAim;
  const reticleY = player.y + Math.sin(rt.effectiveAimAngle) * distToAim;

  // Cone half-radius in world pixels at the aim distance
  const spreadPx = Math.max(2.2, Math.min(48, distToAim * Math.tan(rt.currentSpreadRad)));
  const invZ = 1 / Math.max(0.45, cameraZoom);
  const tickLen = (4.5 + (1 - rt.aimProgress) * 2.5) * invZ;
  const lineW = Math.max(0.85, 1.2 * invZ);

  ctx.save();
  ctx.translate(reticleX, reticleY);

  // Subtle dark halo for readability on snow / bright asphalt
  const accentColor = rt.isHoldingBreath
    ? '#38bdf8'
    : rt.aimProgress > 0.65
    ? '#e0ab45'
    : 'rgba(248, 250, 252, 0.88)';

  // Scoped optic tactical ring when ADS with scoped weapons
  if (spec.hasOptic && rt.aimProgress > 0.3) {
    const opticAlpha = Math.min(0.85, (rt.aimProgress - 0.3) / 0.7);
    const ringR = Math.max(spreadPx + 10 * invZ, 18 * invZ);
    ctx.strokeStyle = `rgba(15, 23, 42, ${(opticAlpha * 0.65).toFixed(3)})`;
    ctx.lineWidth = 2.4 * invZ;
    ctx.beginPath();
    ctx.arc(0, 0, ringR, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = `rgba(224, 171, 69, ${(opticAlpha * 0.8).toFixed(3)})`;
    ctx.lineWidth = 0.9 * invZ;
    ctx.beginPath();
    ctx.arc(0, 0, ringR, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 4 dynamic spread ticks
  const dirs: [number, number][] = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  ctx.lineCap = 'round';
  for (const [dx, dy] of dirs) {
    ctx.strokeStyle = 'rgba(0,0,0,0.65)';
    ctx.lineWidth = lineW + 1.1 * invZ;
    ctx.beginPath();
    ctx.moveTo(dx * spreadPx, dy * spreadPx);
    ctx.lineTo(dx * (spreadPx + tickLen), dy * (spreadPx + tickLen));
    ctx.stroke();

    ctx.strokeStyle = accentColor;
    ctx.lineWidth = lineW;
    ctx.beginPath();
    ctx.moveTo(dx * spreadPx, dy * spreadPx);
    ctx.lineTo(dx * (spreadPx + tickLen), dy * (spreadPx + tickLen));
    ctx.stroke();
  }

  // Center sight dot
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.beginPath();
  ctx.arc(0, 0, 1.9 * invZ, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = accentColor;
  ctx.beginPath();
  ctx.arc(0, 0, 1.15 * invZ, 0, Math.PI * 2);
  ctx.fill();

  // Breath-hold stamina arc when aiming
  if (rt.aimProgress > 0.35 && (rt.isHoldingBreath || rt.breathHoldStamina < 0.98)) {
    const r = Math.max(spreadPx + 7 * invZ, 12 * invZ);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.78)';
    ctx.lineWidth = 1.4 * invZ;
    ctx.beginPath();
    ctx.arc(0, 0, r, -Math.PI * 0.5, -Math.PI * 0.5 + Math.PI * 2 * rt.breathHoldStamina);
    ctx.stroke();
  }

  // Reload / bolt-cycle progress ring right at reticle
  if (rt.reloadState) {
    const r = 13 * invZ;
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.72)';
    ctx.lineWidth = 2.6 * invZ;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#e0ab45';
    ctx.lineWidth = 1.8 * invZ;
    ctx.beginPath();
    ctx.arc(0, 0, r, -Math.PI * 0.5, -Math.PI * 0.5 + Math.PI * 2 * Math.min(1, rt.reloadState.progress));
    ctx.stroke();
  }

  ctx.restore();
}
