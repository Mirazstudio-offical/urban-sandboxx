import {
  Animal,
  BallisticProjectile,
  Building,
  Camera,
  GameWorld,
  InputState,
  InventoryItem,
  Pedestrian,
  Player,
  PlayerWeaponRuntime,
  ShellCasing,
  Vehicle,
  WeaponItemState,
} from './types';
import {
  AMMO_SPECS,
  AmmoSpec,
  MAGAZINE_SPECS,
  WEAPON_SPECS,
  WeaponSpec,
  buildInitialMagazineState,
  buildInitialWeaponState,
  getFireModeLabelRu,
  getWeaponCurrentAmmoCount,
  getWeaponEffectiveCo2,
  isAmmoItemId,
  isMagazineItemId,
  isWeaponItemId,
  recalculateMagazineWeight,
  recalculateWeaponWeight,
  setWeaponEffectiveCo2,
} from './weaponData';
import {
  applyBallisticTraumaToAnimal,
  applyBallisticTraumaToPedestrian,
  broadcastGunshotAlert,
  spawnBloodImpactEffects,
} from './anatomySystem';
import { ANIMAL_SPECIES_CONFIG } from './animalSystem';
import { addItemToPlayer, addPlayerNotification, createItem } from './items';
import { addOrGrowFluidStain } from './physics';
import { sound } from './audio';

const PX_PER_METER = 16;

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

function normalizeAngle(a: number): number {
  let r = a;
  while (r > Math.PI) r -= Math.PI * 2;
  while (r < -Math.PI) r += Math.PI * 2;
  return r;
}

// ============================================================================
// HELD WEAPON & RUNTIME HELPERS
// ============================================================================

export interface ActiveHeldWeapon {
  item: InventoryItem;
  hand: 'left' | 'right';
  spec: WeaponSpec;
  state: WeaponItemState;
}

export function getActiveHeldWeapon(player: Player | null | undefined): ActiveHeldWeapon | null {
  if (!player) return null;
  const primaryHand: 'left' | 'right' = player.activeHand === 'left' ? 'left' : 'right';
  const secondaryHand: 'left' | 'right' = primaryHand === 'left' ? 'right' : 'left';
  const primaryItem = primaryHand === 'left' ? player.leftHandItem : player.rightHandItem;
  const secondaryItem = secondaryHand === 'left' ? player.leftHandItem : player.rightHandItem;

  let chosen: InventoryItem | null = null;
  let chosenHand: 'left' | 'right' = primaryHand;

  if (primaryItem && isWeaponItemId(primaryItem.itemId)) {
    chosen = primaryItem;
    chosenHand = primaryHand;
  } else if (!primaryItem && secondaryItem && isWeaponItemId(secondaryItem.itemId)) {
    chosen = secondaryItem;
    chosenHand = secondaryHand;
  }
  if (!chosen) return null;

  const spec = WEAPON_SPECS[chosen.itemId];
  if (!spec) return null;
  if (!chosen.weaponState) {
    chosen.weaponState = buildInitialWeaponState(chosen.itemId, true);
    recalculateWeaponWeight(chosen);
  }
  return { item: chosen, hand: chosenHand, spec, state: chosen.weaponState };
}

export function ensurePlayerWeaponRuntime(player: Player): PlayerWeaponRuntime {
  if (!player.weaponRuntime) {
    player.weaponRuntime = {
      isAiming: false,
      aimProgress: 0,
      isHoldingBreath: false,
      breathHoldStamina: 1,
      breathPhase: 0,
      swayX: 0,
      swayY: 0,
      currentSpreadRad: 0.04,
      recoilKickPx: 0,
      recoilAngleOffset: 0,
      recoilBloomRad: 0,
      fireCooldown: 0,
      cycleBoltTimer: 0,
      cycleBoltDuration: 0,
      triggerWasDown: false,
      burstShotsLeft: 0,
      muzzleFlashTimer: 0,
      muzzleFlashKind: 'firearm',
      muzzleWorldX: player.x,
      muzzleWorldY: player.y,
      muzzleAngle: player.angle,
      reloadState: null,
      lastShotTime: -10,
      lastDryFireTime: -10,
      aimWorldX: player.x + Math.cos(player.angle) * 80,
      aimWorldY: player.y + Math.sin(player.angle) * 80,
      effectiveAimAngle: player.angle,
    };
  }
  return player.weaponRuntime;
}

// ============================================================================
// INVENTORY SEARCH & CONSUMPTION HELPERS FOR AMMO / MAGS / CO2
// ============================================================================

function findLooseAmmoIndex(player: Player, compatibleAmmoIds: string[], preferredId?: string): number {
  if (preferredId && compatibleAmmoIds.includes(preferredId)) {
    const idx = player.inventory.findIndex(
      (it) => it.itemId === preferredId && (it.count ?? 1) > 0
    );
    if (idx !== -1) return idx;
  }
  for (const aid of compatibleAmmoIds) {
    const idx = player.inventory.findIndex(
      (it) => it.itemId === aid && (it.count ?? 1) > 0
    );
    if (idx !== -1) return idx;
  }
  return -1;
}

function consumeOneLooseRound(player: Player, compatibleAmmoIds: string[], preferredId?: string): string | null {
  const idx = findLooseAmmoIndex(player, compatibleAmmoIds, preferredId);
  if (idx === -1) return null;
  const item = player.inventory[idx];
  const ammoId = item.itemId;
  const currentCount = item.count ?? 1;
  if (currentCount <= 1) {
    player.inventory.splice(idx, 1);
  } else {
    item.count = currentCount - 1;
    const spec = AMMO_SPECS[ammoId];
    if (spec) {
      item.weight = Number((spec.unitWeightKg * item.count).toFixed(3));
    }
  }
  return ammoId;
}

function findBestCompatibleMagIndex(player: Player, compatibleMagIds: string[]): number {
  let bestIdx = -1;
  let bestRounds = -1;
  let bestCo2 = -1;
  for (let i = 0; i < player.inventory.length; i++) {
    const it = player.inventory[i];
    if (!compatibleMagIds.includes(it.itemId)) continue;
    if (!it.magazineState) {
      it.magazineState = buildInitialMagazineState(it.itemId, false);
    }
    const r = it.magazineState.rounds.length;
    const co2 = it.magazineState.hasIntegratedCo2 ? (it.magazineState.co2Pressure ?? 0) : 100;
    if (r > bestRounds || (r === bestRounds && co2 > bestCo2)) {
      bestRounds = r;
      bestCo2 = co2;
      bestIdx = i;
    }
  }
  return bestRounds > 0 ? bestIdx : -1;
}

// ============================================================================
// MAGAZINE & MAINTENANCE OPERATIONS (USED BY INVENTORY, HAND & RELOAD)
// ============================================================================

export function loadMagazineFromInventory(
  player: Player,
  magItem: InventoryItem,
  specificAmmoId?: string
): { loadedCount: number; messageRu: string } {
  if (!isMagazineItemId(magItem.itemId)) {
    return { loadedCount: 0, messageRu: 'Этот предмет не является магазином.' };
  }
  const magSpec = MAGAZINE_SPECS[magItem.itemId];
  if (!magItem.magazineState) {
    magItem.magazineState = buildInitialMagazineState(magItem.itemId, false);
  }
  const ms = magItem.magazineState;
  const freeSlots = ms.capacity - ms.rounds.length;
  if (freeSlots <= 0) {
    return { loadedCount: 0, messageRu: `Магазин уже полностью снаряжён (${ms.rounds.length}/${ms.capacity}).` };
  }

  let loaded = 0;
  let lastAmmoId: string | null = null;
  for (let i = 0; i < freeSlots; i++) {
    const aid = consumeOneLooseRound(player, magSpec.compatibleAmmoIds, specificAmmoId);
    if (!aid) break;
    ms.rounds.push(aid);
    lastAmmoId = aid;
    loaded++;
  }

  if (loaded === 0) {
    return {
      loadedCount: 0,
      messageRu: `Нет подходящих боеприпасов (${magSpec.caliber}) для снаряжения магазина.`,
    };
  }

  recalculateMagazineWeight(magItem);
  sound.playWeaponMechanical('shell_insert', 0.9);
  const ammoLabel = lastAmmoId ? (AMMO_SPECS[lastAmmoId]?.shortLabelRu || lastAmmoId) : magSpec.caliber;
  return {
    loadedCount: loaded,
    messageRu: `Снаряжено +${loaded} (${ammoLabel}) · В магазине ${ms.rounds.length}/${ms.capacity}`,
  };
}

export function unloadMagazineToInventory(
  player: Player,
  magItem: InventoryItem
): { unloadedCount: number; messageRu: string } {
  if (!isMagazineItemId(magItem.itemId) || !magItem.magazineState) {
    return { unloadedCount: 0, messageRu: 'Магазин пуст.' };
  }
  const ms = magItem.magazineState;
  if (ms.rounds.length === 0) {
    return { unloadedCount: 0, messageRu: 'В магазине нет патронов.' };
  }

  const counts = new Map<string, number>();
  while (ms.rounds.length > 0) {
    const aid = ms.rounds.pop()!;
    counts.set(aid, (counts.get(aid) || 0) + 1);
  }

  let total = 0;
  for (const [aid, cnt] of counts.entries()) {
    const pack = createItem(aid, cnt);
    addItemToPlayer(player, pack, { preferPockets: true });
    total += cnt;
  }

  recalculateMagazineWeight(magItem);
  sound.playWeaponMechanical('shell_insert', 0.7);
  return { unloadedCount: total, messageRu: `Разряжено ${total} шт. в инвентарь.` };
}

export function ejectWeaponMagazine(
  player: Player,
  targetWeaponItem?: InventoryItem
): { ok: boolean; messageRu: string } {
  const held = targetWeaponItem ? null : getActiveHeldWeapon(player);
  const wpnItem = targetWeaponItem || held?.item;
  if (!wpnItem || !wpnItem.weaponState) {
    return { ok: false, messageRu: 'Оружие не выбрано.' };
  }
  const spec = WEAPON_SPECS[wpnItem.itemId];
  const ws = wpnItem.weaponState;
  if (!spec || !ws.insertedMag) {
    return { ok: false, messageRu: 'В оружии нет отъёмного магазина.' };
  }
  const mag = ws.insertedMag;
  ws.insertedMag = null;
  recalculateWeaponWeight(wpnItem);
  addItemToPlayer(player, mag, { preferPockets: true });
  sound.playWeaponMechanical('mag_out', 0.95);
  const cnt = mag.magazineState?.rounds.length ?? 0;
  const cap = mag.magazineState?.capacity ?? 0;
  return { ok: true, messageRu: `Магазин извлечён (${cnt}/${cap}).` };
}

export function installCo2IntoWeapon(
  player: Player,
  targetWeaponItem?: InventoryItem
): { ok: boolean; messageRu: string } {
  const held = targetWeaponItem ? null : getActiveHeldWeapon(player);
  let wpnItem = targetWeaponItem || held?.item || null;
  if (!wpnItem) {
    // Look in inventory for a CO2 weapon needing gas
    wpnItem =
      player.inventory.find(
        (it) => isWeaponItemId(it.itemId) && WEAPON_SPECS[it.itemId]?.propellant === 'co2_12g'
      ) || null;
  }
  if (!wpnItem || !isWeaponItemId(wpnItem.itemId)) {
    return { ok: false, messageRu: 'Возьмите в руки или держите при себе CO2-пневматику.' };
  }
  const spec = WEAPON_SPECS[wpnItem.itemId];
  if (spec.propellant !== 'co2_12g') {
    return { ok: false, messageRu: `${spec.shortNameRu} не использует баллончики CO2 12г.` };
  }
  if (!wpnItem.weaponState) {
    wpnItem.weaponState = buildInitialWeaponState(wpnItem.itemId, false);
  }
  const ws = wpnItem.weaponState;
  if (ws.insertedMag?.magazineState?.hasIntegratedCo2) {
    ws.insertedMag.magazineState.co2Pressure = 100;
  } else {
    ws.co2Pressure = 100;
  }
  ws.co2TempPenalty = 0;
  sound.playWeaponMechanical('co2_pierce', 1.0);
  return { ok: true, messageRu: `Установлен новый баллончик CO2 12г в ${spec.shortNameRu} (100%).` };
}

export function pumpPcpWeapon(
  player: Player,
  targetWeaponItem?: InventoryItem
): { ok: boolean; messageRu: string } {
  const held = targetWeaponItem ? null : getActiveHeldWeapon(player);
  let wpnItem = targetWeaponItem || held?.item || null;
  if (!wpnItem) {
    wpnItem =
      player.inventory.find(
        (it) => isWeaponItemId(it.itemId) && WEAPON_SPECS[it.itemId]?.propellant === 'pcp_tank'
      ) || null;
  }
  if (!wpnItem || !isWeaponItemId(wpnItem.itemId)) {
    return { ok: false, messageRu: 'Нет PCP-винтовки в руках или инвентаре.' };
  }
  const spec = WEAPON_SPECS[wpnItem.itemId];
  if (spec.propellant !== 'pcp_tank') {
    return { ok: false, messageRu: `${spec.shortNameRu} не является PCP-пневматикой.` };
  }
  if (!wpnItem.weaponState) {
    wpnItem.weaponState = buildInitialWeaponState(wpnItem.itemId, false);
  }
  const ws = wpnItem.weaponState;
  const maxBar = spec.pcpMaxBar || 250;
  const curBar = ws.pcpPressureBar ?? 0;
  if (curBar >= maxBar - 2) {
    return { ok: false, messageRu: `Резервуар ${spec.shortNameRu} уже полностью заправлен (${Math.round(curBar)} бар).` };
  }
  if (player.needs.energy < 10) {
    return { ok: false, messageRu: 'Слишком устали для накачки PCP-насосом высокого давления.' };
  }
  const addedBar = Math.min(maxBar - curBar, 55);
  ws.pcpPressureBar = Math.min(maxBar, curBar + addedBar);
  player.needs.energy = Math.max(0, player.needs.energy - 8);
  if (player.bodyState) {
    player.bodyState.oxygenDebt = Math.min(100, (player.bodyState.oxygenDebt || 0) + 12);
    player.bodyState.muscleFatigue = Math.min(100, (player.bodyState.muscleFatigue || 0) + 7);
  }
  sound.playWeaponMechanical('pump_air', 1.1);
  return {
    ok: true,
    messageRu: `Резервуар ${spec.shortNameRu} накачан до ${Math.round(ws.pcpPressureBar)}/${maxBar} бар.`,
  };
}

export function cleanWeaponWithOil(
  player: Player,
  targetWeaponItem?: InventoryItem
): { ok: boolean; messageRu: string } {
  const held = targetWeaponItem ? null : getActiveHeldWeapon(player);
  let wpnItem = targetWeaponItem || held?.item || null;
  if (!wpnItem) {
    wpnItem =
      player.inventory.find(
        (it) => isWeaponItemId(it.itemId) && ((it.weaponState?.fouling ?? 0) > 5 || it.weaponState?.isJammed)
      ) ||
      player.inventory.find((it) => isWeaponItemId(it.itemId)) ||
      null;
  }
  if (!wpnItem || !isWeaponItemId(wpnItem.itemId)) {
    return { ok: false, messageRu: 'Нет оружия для чистки и смазки.' };
  }
  if (!wpnItem.weaponState) {
    wpnItem.weaponState = buildInitialWeaponState(wpnItem.itemId, false);
  }
  const spec = WEAPON_SPECS[wpnItem.itemId];
  wpnItem.weaponState.fouling = 0;
  wpnItem.weaponState.isJammed = false;
  sound.playWeaponMechanical('bolt_rack', 0.8);
  return { ok: true, messageRu: `${spec.shortNameRu} очищен и смазан (нагар 0%).` };
}

// ============================================================================
// FIRE MODE, PUMPING, INSPECTION & STAGED RELOAD START
// ============================================================================

export function cycleWeaponFireMode(player: Player): void {
  const active = getActiveHeldWeapon(player);
  if (!active) return;
  const { spec, state } = active;
  if (spec.fireModes.length <= 1) return;
  const idx = spec.fireModes.indexOf(state.fireMode);
  const next = spec.fireModes[(idx + 1) % spec.fireModes.length];
  state.fireMode = next;
  sound.playWeaponMechanical('safety_click', 0.9);
  const labels: Record<string, string> = {
    safe: 'Предохранитель',
    semi: 'Одиночный огонь',
    burst: `Очередь по ${spec.burstCount || 3}`,
    auto: 'Автоматический огонь',
  };
  addPlayerNotification(player, `${spec.shortNameRu}: ${labels[next] || next}`, 'info');
}

export function inspectOrPumpWeapon(player: Player): void {
  const active = getActiveHeldWeapon(player);
  if (!active) return;
  const { item, spec, state } = active;
  const runtime = ensurePlayerWeaponRuntime(player);
  if (runtime.reloadState) return;

  // Multi-pump pneumatic (Crosman 1377 / 2100): V pumps compressed air stroke!
  if (spec.propellant === 'multi_pump') {
    const maxPumps = spec.maxPumpStrokes || 10;
    const cur = state.pumpStrokes ?? 0;
    if (cur >= maxPumps) {
      addPlayerNotification(player, `${spec.shortNameRu}: максимум накачки (${cur}/${maxPumps})`, 'info');
      return;
    }
    if (player.needs.energy < 2) {
      addPlayerNotification(player, 'Слишком устали для накачки цевья', 'warning');
      return;
    }
    runtime.reloadState = {
      phase: 'pump_air',
      hand: active.hand,
      weaponItemId: item.itemId,
      progress: 0,
      duration: 0.38,
      labelRu: `Накачка (${cur + 1}/${maxPumps})`,
    };
    sound.playWeaponMechanical('pump_air', 0.95);
    return;
  }

  // Otherwise inspect chamber / pressure / fouling status
  const counts = getWeaponCurrentAmmoCount(item);
  const nextAmmo = counts.nextAmmoId ? AMMO_SPECS[counts.nextAmmoId]?.shortLabelRu : 'пусто';
  const details: string[] = [
    `${spec.shortNameRu} (${getFireModeLabelRu(state.fireMode)})`,
    `Патронник: ${counts.chamber > 0 ? nextAmmo : 'пуст'}`,
  ];
  if (spec.feedType === 'detachable_mag' || spec.feedType === 'rotary_clip' || spec.feedType === 'linear_clip') {
    details.push(state.insertedMag ? `Магазин: ${counts.mag}/${counts.maxMag}` : 'Магазин отсутствует');
  } else if (spec.feedType === 'cylinder' || spec.feedType === 'internal_tube' || spec.feedType === 'internal_mag') {
    details.push(`Внутри: ${counts.mag}/${counts.maxMag}`);
  }
  if (spec.propellant === 'co2_12g') {
    details.push(`CO2: ${Math.round(getWeaponEffectiveCo2(state))}%`);
  } else if (spec.propellant === 'pcp_tank') {
    details.push(`Резервуар: ${Math.round(state.pcpPressureBar ?? 0)}/${spec.pcpMaxBar || 250} бар`);
  } else if (spec.weaponClass === 'firearm') {
    details.push(`Нагар: ${Math.round(state.fouling)}%`);
  }
  if (state.isJammed) details.push('КЛИН ЗАТВОРА');
  sound.playWeaponMechanical('safety_click', 0.55);
  addPlayerNotification(player, details.join(' · '), state.isJammed ? 'warning' : 'info');
}

export function startWeaponReload(player: Player, _world?: GameWorld): void {
  const active = getActiveHeldWeapon(player);
  if (!active) return;
  const { item, hand, spec, state } = active;
  const runtime = ensurePlayerWeaponRuntime(player);
  if (runtime.reloadState) return;

  // 1. Clear jam first
  if (state.isJammed) {
    runtime.reloadState = {
      phase: 'clear_jam',
      hand,
      weaponItemId: item.itemId,
      progress: 0,
      duration: Math.max(0.7, spec.reloadRackSec * 1.45),
      labelRu: 'Устранение задержки',
    };
    sound.playWeaponMechanical('bolt_rack', 1.0);
    return;
  }

  // 2. If CO2 weapon has depleted cartridge and player has a fresh 12g CO2 cartridge -> swap CO2
  if (spec.propellant === 'co2_12g' && getWeaponEffectiveCo2(state) <= 2) {
    const co2Idx = player.inventory.findIndex((it) => it.itemId === 'co2_cartridge_12g' && (it.count ?? 1) > 0);
    if (co2Idx !== -1) {
      runtime.reloadState = {
        phase: 'swap_co2',
        hand,
        weaponItemId: item.itemId,
        progress: 0,
        duration: 1.55,
        labelRu: 'Замена баллончика CO2',
      };
      sound.playWeaponMechanical('mag_out', 0.8);
      return;
    }
  }

  // 3. Single-shot break-barrel / single-shot pump rifle/pistol
  if (spec.feedType === 'break_single') {
    if (state.chamberedAmmoId && (spec.propellant !== 'spring_piston' || state.isCocked)) {
      if (spec.propellant === 'multi_pump' && (state.pumpStrokes ?? 0) < (spec.maxPumpStrokes || 10)) {
        inspectOrPumpWeapon(player);
        return;
      }
      addPlayerNotification(player, `${spec.shortNameRu} уже заряжен и взведён`, 'info');
      return;
    }
    const needAmmo = !state.chamberedAmmoId;
    if (needAmmo && findLooseAmmoIndex(player, spec.compatibleAmmoIds) === -1) {
      addPlayerNotification(player, `Нет пулек (${spec.caliberRu}) в инвентаре`, 'warning');
      return;
    }
    runtime.reloadState = {
      phase: 'break_barrel',
      hand,
      weaponItemId: item.itemId,
      progress: 0,
      duration: spec.shellLoadSec || 1.35,
      labelRu: spec.propellant === 'spring_piston' ? 'Взведение и зарядка пули' : 'Зарядка пули в казённик',
    };
    sound.playWeaponMechanical('break_barrel', 0.95);
    return;
  }

  // 4. Double-barrel break-action shotgun (TOZ-34)
  if (spec.feedType === 'break_double') {
    const loadedNow = (state.chamberedAmmoId ? 1 : 0) + (state.secondChamberAmmoId ? 1 : 0);
    if (loadedNow >= 2) {
      addPlayerNotification(player, 'Оба ствола уже заряжены (2/2)', 'info');
      return;
    }
    if (findLooseAmmoIndex(player, spec.compatibleAmmoIds) === -1) {
      addPlayerNotification(player, `Нет патронов ${spec.caliberRu} в инвентаре`, 'warning');
      return;
    }
    runtime.reloadState = {
      phase: 'break_barrel',
      hand,
      weaponItemId: item.itemId,
      progress: 0,
      duration: 0.72,
      labelRu: 'Перелом стволов',
    };
    sound.playWeaponMechanical('break_barrel', 1.0);
    return;
  }

  // 5. Revolver cylinder (eject spent brass, then load shell by shell)
  if (spec.feedType === 'cylinder') {
    const cap = spec.internalCapacity || 6;
    const rounds = state.internalRounds || (state.internalRounds = []);
    if (rounds.length >= cap) {
      addPlayerNotification(player, `Барабан полон (${rounds.length}/${cap})`, 'info');
      return;
    }
    if (findLooseAmmoIndex(player, spec.compatibleAmmoIds) === -1) {
      addPlayerNotification(player, `Нет патронов ${spec.caliberRu} в инвентаре`, 'warning');
      return;
    }
    if ((state.spentShellsInCylinder || 0) > 0) {
      runtime.reloadState = {
        phase: 'eject_shells',
        hand,
        weaponItemId: item.itemId,
        progress: 0,
        duration: 0.7,
        labelRu: 'Экстракция гильз',
      };
      sound.playWeaponMechanical('mag_out', 0.9);
    } else {
      runtime.reloadState = {
        phase: 'load_shell',
        hand,
        weaponItemId: item.itemId,
        progress: 0,
        duration: spec.shellLoadSec || 0.45,
        labelRu: `Зарядка барабана (${rounds.length}/${cap})`,
      };
      sound.playWeaponMechanical('shell_insert', 0.85);
    }
    return;
  }

  // 6. Internal tube / internal box magazine (MP-155, SKS, Mosin)
  if (spec.feedType === 'internal_tube' || spec.feedType === 'internal_mag') {
    const cap = spec.internalCapacity || 5;
    const rounds = state.internalRounds || (state.internalRounds = []);
    if (rounds.length >= cap && state.chamberedAmmoId) {
      addPlayerNotification(player, `Магазин полон (${rounds.length}+1/${cap})`, 'info');
      return;
    }
    if (rounds.length >= cap && !state.chamberedAmmoId) {
      runtime.reloadState = {
        phase: 'rack_bolt',
        hand,
        weaponItemId: item.itemId,
        progress: 0,
        duration: spec.reloadRackSec,
        labelRu: 'Досылание патрона',
      };
      sound.playWeaponMechanical('bolt_rack', 0.95);
      return;
    }
    if (findLooseAmmoIndex(player, spec.compatibleAmmoIds) === -1) {
      addPlayerNotification(player, `Нет патронов ${spec.caliberRu} в инвентаре`, 'warning');
      return;
    }
    runtime.reloadState = {
      phase: 'load_shell',
      hand,
      weaponItemId: item.itemId,
      progress: 0,
      duration: spec.shellLoadSec || 0.48,
      wasChamberEmpty: !state.chamberedAmmoId,
      labelRu: `Дозарядка (${rounds.length}/${cap})`,
    };
    sound.playWeaponMechanical('shell_insert', 0.9);
    return;
  }

  // 7. Detachable magazine / rotary drum / linear clip
  const bestMagIdx = findBestCompatibleMagIndex(player, spec.compatibleMagIds);
  const currentMag = state.insertedMag;
  const currentMagCount = currentMag?.magazineState?.rounds.length ?? 0;
  const currentMagCap = currentMag?.magazineState?.capacity ?? 0;

  if (bestMagIdx !== -1) {
    const targetMag = player.inventory[bestMagIdx];
    const wasChamberEmpty = spec.weaponClass === 'firearm' ? !state.chamberedAmmoId : false;
    if (currentMag) {
      runtime.reloadState = {
        phase: 'eject_mag',
        hand,
        weaponItemId: item.itemId,
        progress: 0,
        duration: spec.reloadMagOutSec,
        targetMagInvIndex: bestMagIdx,
        targetMagItemId: targetMag.id,
        wasChamberEmpty,
        labelRu: 'Смена магазина',
      };
      sound.playWeaponMechanical('mag_out', 0.95);
    } else {
      runtime.reloadState = {
        phase: 'insert_mag',
        hand,
        weaponItemId: item.itemId,
        progress: 0,
        duration: spec.reloadMagInSec,
        targetMagInvIndex: bestMagIdx,
        targetMagItemId: targetMag.id,
        wasChamberEmpty,
        labelRu: 'Установка магазина',
      };
      sound.playWeaponMechanical('mag_in', 0.95);
    }
    return;
  }

  // No spare loaded magazine -> if current mag has room and loose ammo exists, top up current mag directly!
  if (currentMag && currentMag.magazineState && currentMagCount < currentMagCap) {
    if (findLooseAmmoIndex(player, spec.compatibleAmmoIds) !== -1) {
      runtime.reloadState = {
        phase: 'load_shell',
        hand,
        weaponItemId: item.itemId,
        progress: 0,
        duration: Math.max(0.28, spec.reloadMagInSec * 0.45),
        wasChamberEmpty: spec.weaponClass === 'firearm' ? !state.chamberedAmmoId : false,
        labelRu: `Снаряжение магазина (${currentMagCount}/${currentMagCap})`,
      };
      sound.playWeaponMechanical('shell_insert', 0.85);
      return;
    }
  }

  // If mag has ammo and firearm chamber is empty -> rack bolt!
  if (spec.weaponClass === 'firearm' && !state.chamberedAmmoId && currentMagCount > 0) {
    runtime.reloadState = {
      phase: 'rack_bolt',
      hand,
      weaponItemId: item.itemId,
      progress: 0,
      duration: spec.reloadRackSec,
      labelRu: 'Передёргивание затвора',
    };
    sound.playWeaponMechanical('bolt_rack', 0.95);
    return;
  }

  if (currentMag && currentMagCount >= currentMagCap && (spec.weaponClass === 'pneumatic' || state.chamberedAmmoId)) {
    addPlayerNotification(player, `${spec.shortNameRu}: полностью заряжен`, 'info');
    return;
  }

  addPlayerNotification(
    player,
    `Нет снаряжённых магазинов или патронов (${spec.caliberRu}) в инвентаре`,
    'warning'
  );
}

// ============================================================================
// PHYSIOLOGICAL AIMING, SWAY, BREATH HOLD & DISPERSION MODEL
// ============================================================================

function computeArmImpairment(player: Player): { left: number; right: number; eitherBroken: boolean } {
  const bs = player.bodyState;
  if (!bs || !bs.bodyParts) return { left: 0, right: 0, eitherBroken: false };
  const evalPart = (injuries: { type: string; severity: number }[] | undefined) => {
    if (!injuries || injuries.length === 0) return { imp: 0, broken: false };
    let imp = 0;
    let broken = false;
    for (const inj of injuries) {
      imp += (inj.severity || 20) * 0.01;
      if (inj.type === 'fracture' || inj.type === 'deep_laceration') {
        broken = true;
        imp += 0.55;
      }
    }
    return { imp: Math.min(1.8, imp), broken };
  };
  const l = evalPart(bs.bodyParts.leftArm);
  const r = evalPart(bs.bodyParts.rightArm);
  return { left: l.imp, right: r.imp, eitherBroken: l.broken || r.broken };
}

function updatePhysiologicalAim(
  player: Player,
  active: ActiveHeldWeapon,
  runtime: PlayerWeaponRuntime,
  input: InputState,
  dt: number,
  nowSec: number
): void {
  const { spec, hand } = active;
  const bs = player.bodyState;
  const otherHandOccupied = !!(hand === 'left' ? player.rightHandItem : player.leftHandItem);
  const armImp = computeArmImpairment(player);
  const oneHandedPenalty = spec.twoHanded && (otherHandOccupied || armImp.eitherBroken);

  const isReloading = !!runtime.reloadState;
  const wantAim = !!input.isRightMouseDown && !isReloading;
  runtime.isAiming = wantAim;

  // Aim transition speed affected by weapon ergonomics, fatigue, pain, one-handed penalty
  const fatiguePenalty = 1 + (1 - clamp(player.needs.energy / 100, 0, 1)) * 0.5 + (bs?.muscleFatigue || 0) * 0.006;
  const armSpeedPenalty = 1 + (hand === 'left' ? armImp.left : armImp.right) * 0.55 + (oneHandedPenalty ? 0.65 : 0);
  const effectiveAimTime = Math.max(0.12, spec.aimTimeSec * fatiguePenalty * armSpeedPenalty);

  if (wantAim) {
    runtime.aimProgress = clamp(runtime.aimProgress + dt / effectiveAimTime, 0, 1);
  } else {
    runtime.aimProgress = clamp(runtime.aimProgress - dt / Math.max(0.14, effectiveAimTime * 0.72), 0, 1);
  }

  // Breath-hold (Shift while aiming steady)
  const canHoldBreath =
    wantAim &&
    runtime.aimProgress > 0.42 &&
    !!input.sprint &&
    Math.hypot(player.vx, player.vy) < 28 &&
    runtime.breathHoldStamina > 0.04;

  if (canHoldBreath) {
    runtime.isHoldingBreath = true;
    const drainRate = 0.22 + (bs?.oxygenDebt || 0) * 0.0045;
    runtime.breathHoldStamina = Math.max(0, runtime.breathHoldStamina - drainRate * dt);
    if (bs) {
      bs.oxygenDebt = Math.min(100, (bs.oxygenDebt || 0) + 4.5 * dt);
    }
  } else {
    runtime.isHoldingBreath = false;
    const recoverRate = 0.28 * (1 - clamp((bs?.oxygenDebt || 0) / 140, 0, 0.75));
    runtime.breathHoldStamina = Math.min(1, runtime.breathHoldStamina + recoverRate * dt);
  }

  // Respiratory & cardiac rhythm from actual Player BodyState
  const heartRate = bs?.heartRate ?? 72;
  const oxygenDebt = bs?.oxygenDebt ?? 0;
  const panic = bs?.panicLevel ?? 0;
  const pain = bs?.effectivePain ?? bs?.painLevel ?? 0;
  const shiver = bs?.shiverIntensity ?? 0;
  const dizziness = bs?.dizziness ?? 0;
  const bloodLoss = bs?.bloodLoss ?? 0;
  const fatigue = clamp((100 - player.needs.energy) / 100, 0, 1);

  const breathRateHz = 0.24 + (oxygenDebt / 100) * 0.52 + (panic / 100) * 0.28 + fatigue * 0.16;
  runtime.breathPhase += dt * breathRateHz * Math.PI * 2;

  // Base sway amplitude (radians)
  const weightFactor = clamp(0.65 + spec.weightKg * 0.14, 0.7, 1.55);
  let swayAmp =
    (0.0042 +
      fatigue * 0.011 +
      (oxygenDebt / 100) * 0.014 +
      (pain / 100) * 0.016 +
      (panic / 100) * 0.014 +
      (dizziness / 100) * 0.018 +
      (bloodLoss / 100) * 0.015 +
      (armImp.left + armImp.right) * 0.012) *
    weightFactor;

  if (oneHandedPenalty) swayAmp *= 2.05;
  if (runtime.isHoldingBreath) swayAmp *= 0.22;
  else if (runtime.breathHoldStamina < 0.15) swayAmp *= 1.38; // air-hunger gasp rebound

  const breathX = Math.sin(runtime.breathPhase) * swayAmp;
  const breathY = Math.sin(runtime.breathPhase * 2) * swayAmp * 0.58;

  // Cardiac pulse micro-tremor (scales with elevated BPM)
  const heartHz = heartRate / 60;
  const pulseAmp = clamp((heartRate - 65) / 115, 0.05, 1) * 0.0038 * (runtime.isHoldingBreath ? 0.55 : 1);
  const pulseVal = Math.pow(Math.max(0, Math.sin(nowSec * heartHz * Math.PI * 2)), 6) * pulseAmp;

  // High-frequency cold shivering tremor
  const shiverAmp = shiver * 0.016;
  const shiverX = shiverAmp > 0.0005 ? Math.sin(nowSec * 41.3) * shiverAmp : 0;
  const shiverY = shiverAmp > 0.0005 ? Math.cos(nowSec * 37.7) * shiverAmp : 0;

  runtime.swayX = breathX + shiverX + pulseVal * 0.4;
  runtime.swayY = breathY + shiverY + pulseVal;

  // Dynamic dispersion cone (half-angle in radians)
  const moveSpeed = Math.hypot(player.vx, player.vy);
  const moveNorm = clamp(moveSpeed / 95, 0, 1.4);
  const stanceSpread = spec.hipSpreadRad * (1 - runtime.aimProgress) + spec.baseSpreadRad * runtime.aimProgress;
  const physSpread =
    moveNorm * (spec.twoHanded ? 0.055 : 0.036) +
    swayAmp * (1.25 - runtime.aimProgress * 0.45) +
    (oneHandedPenalty ? 0.042 : 0) +
    runtime.recoilBloomRad;

  runtime.currentSpreadRad = clamp(stanceSpread + physSpread, spec.baseSpreadRad * 0.72, 0.32);

  // Recoil & bloom exponential recovery
  const recDecay = Math.exp(-dt * (spec.twoHanded ? 9.5 : 11.5));
  runtime.recoilKickPx *= Math.exp(-dt * 14.0);
  runtime.recoilAngleOffset *= recDecay;
  runtime.recoilBloomRad = Math.max(0, runtime.recoilBloomRad * Math.exp(-dt * 6.8) - dt * 0.012);

  // Compute target angle from player toward mouse world position
  const baseAngle = Math.atan2(runtime.aimWorldY - player.y, runtime.aimWorldX - player.x);
  runtime.effectiveAimAngle = normalizeAngle(baseAngle + runtime.swayX + runtime.recoilAngleOffset);

  // Rotate player smoothly toward aim direction when aiming or firing
  if (wantAim || runtime.muzzleFlashTimer > 0 || nowSec - runtime.lastShotTime < 0.75) {
    const diff = normalizeAngle(baseAngle - player.angle);
    const turnRate = wantAim ? 18 : 13;
    player.angle = normalizeAngle(player.angle + diff * Math.min(1, dt * turnRate));
  }
}

// ============================================================================
// SHELL CASING SPAWNER & MUZZLE POSITION
// ============================================================================

function computeMuzzleWorldPos(player: Player, spec: WeaponSpec, aimAngle: number, hand: 'left' | 'right'): { x: number; y: number } {
  const sideOffset = spec.twoHanded ? 1.5 : hand === 'left' ? -3.4 : 3.4;
  const forwardOffset = 5.5 + spec.barrelTipOffsetPx;
  const cos = Math.cos(aimAngle);
  const sin = Math.sin(aimAngle);
  return {
    x: player.x + cos * forwardOffset - sin * sideOffset,
    y: player.y + sin * forwardOffset + cos * sideOffset,
  };
}

function spawnShellCasing(
  world: GameWorld,
  x: number,
  y: number,
  weaponAngle: number,
  ammo: AmmoSpec,
  isManualEject: boolean = false
): void {
  if (!world.shellCasings) world.shellCasings = [];
  const ejectAngle = weaponAngle + Math.PI * 0.5 + (Math.random() - 0.5) * 0.55;
  const spd = isManualEject ? 14 + Math.random() * 14 : 34 + Math.random() * 28;
  const casing: ShellCasing = {
    x,
    y,
    z: 6.5,
    vx: Math.cos(ejectAngle) * spd,
    vy: Math.sin(ejectAngle) * spd,
    vz: isManualEject ? 16 + Math.random() * 10 : 28 + Math.random() * 22,
    angle: weaponAngle + Math.random() * Math.PI,
    angularVel: (Math.random() > 0.5 ? 1 : -1) * (10 + Math.random() * 16),
    lengthPx: ammo.casingLengthPx || 2.4,
    widthPx: ammo.casingWidthPx || 1.1,
    color: ammo.casingColor || '#d4af37',
    rimColor: '#e5c158',
    life: 0,
    maxLife: 24,
    bounces: 0,
  };
  world.shellCasings.push(casing);
  if (world.shellCasings.length > 180) {
    world.shellCasings.shift();
  }
}

// ============================================================================
// FIRING ENGINE
// ============================================================================

function attemptFireWeapon(
  player: Player,
  world: GameWorld,
  active: ActiveHeldWeapon,
  runtime: PlayerWeaponRuntime,
  nowSec: number
): boolean {
  const { item, hand, spec, state } = active;

  // Interruptible shell-by-shell reload if player already has a round ready!
  if (runtime.reloadState) {
    const canInterrupt =
      runtime.reloadState.phase === 'load_shell' &&
      (state.chamberedAmmoId || (spec.feedType === 'cylinder' && (state.internalRounds?.length || 0) > 0));
    if (canInterrupt) {
      runtime.reloadState = null;
    } else {
      return false;
    }
  }

  if (runtime.fireCooldown > 0 || runtime.cycleBoltTimer > 0) return false;

  const dryFireCooldown = nowSec - runtime.lastDryFireTime > 0.35;

  // Safety engaged
  if (state.fireMode === 'safe') {
    if (dryFireCooldown) {
      runtime.lastDryFireTime = nowSec;
      sound.playWeaponMechanical('safety_click', 0.9);
      addPlayerNotification(player, `${spec.shortNameRu} на предохранителе (клавиша B)`, 'warning');
    }
    return false;
  }

  // Weapon jammed
  if (state.isJammed) {
    if (dryFireCooldown) {
      runtime.lastDryFireTime = nowSec;
      sound.playWeaponMechanical('dry_fire', 0.9);
      addPlayerNotification(player, 'Задержка при стрельбе — нажмите R для устранения', 'warning');
    }
    return false;
  }

  // Spring-piston cocking check
  if (spec.propellant === 'spring_piston' && !state.isCocked) {
    if (dryFireCooldown) {
      runtime.lastDryFireTime = nowSec;
      sound.playWeaponMechanical('dry_fire', 0.7);
      addPlayerNotification(player, 'Пружина не взведена — нажмите R (взведение и зарядка)', 'info');
    }
    return false;
  }

  // Multi-pump check
  if (spec.propellant === 'multi_pump' && (state.pumpStrokes ?? 0) <= 0) {
    if (dryFireCooldown) {
      runtime.lastDryFireTime = nowSec;
      sound.playWeaponMechanical('dry_fire', 0.75);
      addPlayerNotification(player, 'Нет давления в накопителе — нажмите V для накачки', 'info');
    }
    return false;
  }

  // Determine ammo to fire
  let firedAmmoId: string | null = null;
  if (spec.feedType === 'break_double') {
    if (state.chamberedAmmoId) {
      firedAmmoId = state.chamberedAmmoId;
      state.chamberedAmmoId = null;
    } else if (state.secondChamberAmmoId) {
      firedAmmoId = state.secondChamberAmmoId;
      state.secondChamberAmmoId = null;
    }
  } else if (spec.feedType === 'break_single') {
    firedAmmoId = state.chamberedAmmoId;
    state.chamberedAmmoId = null;
  } else if (spec.feedType === 'cylinder') {
    if (state.internalRounds && state.internalRounds.length > 0) {
      firedAmmoId = state.internalRounds.pop()!;
      state.spentShellsInCylinder = (state.spentShellsInCylinder || 0) + 1;
    }
  } else if (spec.feedType === 'internal_tube' || spec.feedType === 'internal_mag') {
    firedAmmoId = state.chamberedAmmoId;
    state.chamberedAmmoId = null;
  } else if (spec.weaponClass === 'pneumatic') {
    // Pneumatic detachable mag / rotary drum / linear clip feeds directly from mag
    if (state.insertedMag?.magazineState && state.insertedMag.magazineState.rounds.length > 0) {
      firedAmmoId = state.insertedMag.magazineState.rounds.pop()!;
    }
  } else {
    // Firearm detachable mag: fires chambered round
    firedAmmoId = state.chamberedAmmoId;
    state.chamberedAmmoId = null;
  }

  if (!firedAmmoId) {
    if (dryFireCooldown) {
      runtime.lastDryFireTime = nowSec;
      sound.playWeaponMechanical('dry_fire', 0.85);
      const counts = getWeaponCurrentAmmoCount(item);
      if (counts.mag > 0 && spec.weaponClass === 'firearm') {
        addPlayerNotification(player, 'Патронник пуст — нажмите R чтобы дослать патрон', 'info');
      } else {
        addPlayerNotification(player, `${spec.shortNameRu}: нет патронов (R — перезарядка)`, 'info');
      }
    }
    return false;
  }

  // Propellant pressure validation & consumption
  let propellantVelMult = 1.0;
  if (spec.propellant === 'co2_12g') {
    const co2 = getWeaponEffectiveCo2(state);
    if (co2 < 1.2) {
      // Put pellet/BB back since gas is completely empty
      if (state.insertedMag?.magazineState) state.insertedMag.magazineState.rounds.push(firedAmmoId);
      if (dryFireCooldown) {
        runtime.lastDryFireTime = nowSec;
        sound.playWeaponMechanical('dry_fire', 0.7);
        addPlayerNotification(player, 'Баллончик CO2 пуст — замените его (R или в инвентаре)', 'warning');
      }
      return false;
    }
    const perShot = 100 / Math.max(15, spec.co2ShotsPerCartridge || 45);
    setWeaponEffectiveCo2(state, co2 - perShot);
    const coolPen = clamp(state.co2TempPenalty || 0, 0, 0.32);
    const lowGasFactor = co2 < 18 ? 0.58 + (co2 / 18) * 0.42 : 1.0;
    propellantVelMult = lowGasFactor * (1 - coolPen);
    state.co2TempPenalty = clamp((state.co2TempPenalty || 0) + 0.045, 0, 0.32);
  } else if (spec.propellant === 'pcp_tank') {
    const curBar = state.pcpPressureBar ?? 0;
    const minBar = spec.pcpMinBar || 95;
    if (curBar < 35) {
      if (state.insertedMag?.magazineState) state.insertedMag.magazineState.rounds.push(firedAmmoId);
      if (dryFireCooldown) {
        runtime.lastDryFireTime = nowSec;
        sound.playWeaponMechanical('dry_fire', 0.7);
        addPlayerNotification(player, 'Резервуар PCP пуст — накачайте насосом ВД', 'warning');
      }
      return false;
    }
    state.pcpPressureBar = Math.max(0, curBar - (spec.pcpBarPerShot || 3.5));
    propellantVelMult = curBar >= minBar ? 1.0 : clamp(0.45 + (curBar / minBar) * 0.55, 0.45, 1.0);
  } else if (spec.propellant === 'multi_pump') {
    const strokes = clamp(state.pumpStrokes ?? 1, 1, spec.maxPumpStrokes || 10);
    const maxS = spec.maxPumpStrokes || 10;
    propellantVelMult = 0.42 + 0.58 * Math.pow(strokes / maxS, 0.74);
    state.pumpStrokes = 0;
  } else if (spec.propellant === 'spring_piston') {
    state.isCocked = false;
  }

  const ammo = AMMO_SPECS[firedAmmoId] || AMMO_SPECS[spec.defaultAmmoId];
  if (!ammo) return false;

  // Cycle next round / check fouling jam for semi/auto firearms
  const isManualBolt = !!spec.boltCycleSec && spec.boltCycleSec > 0;
  if (spec.weaponClass === 'firearm') {
    state.fouling = clamp((state.fouling || 0) + 0.45, 0, 100);
    state.barrelTempC = Math.min(480, (state.barrelTempC || 20) + (spec.category === 'shotgun' || spec.category === 'sniper_rifle' ? 7.5 : 3.2));
  } else {
    state.fouling = clamp((state.fouling || 0) + 0.08, 0, 100);
  }
  state.totalShotsFired = (state.totalShotsFired || 0) + 1;

  // Eject casing if semi/auto firearm
  const aimAngle = runtime.effectiveAimAngle;
  const muzzle = computeMuzzleWorldPos(player, spec, aimAngle, hand);
  if (spec.ejectsCasing && !isManualBolt && spec.feedType !== 'break_double' && spec.feedType !== 'cylinder') {
    const breechX = player.x + Math.cos(aimAngle) * 5;
    const breechY = player.y + Math.sin(aimAngle) * 5;
    spawnShellCasing(world, breechX, breechY, aimAngle, ammo, false);
  }

  // Check malfunction / jam on high fouling
  const jamRisk =
    spec.weaponClass === 'firearm' && state.fouling > 35 && !isManualBolt && spec.feedType !== 'break_double' && spec.feedType !== 'cylinder'
      ? spec.jamChanceBase * Math.pow((state.fouling - 30) / 70, 1.5)
      : 0;
  const didJam = jamRisk > 0 && Math.random() < jamRisk;

  if (didJam) {
    state.isJammed = true;
    addPlayerNotification(player, `${spec.shortNameRu}: клин затвора (утыкание/невыброс)! Нажмите R`, 'warning');
  } else if (isManualBolt) {
    // Manual bolt-action / pump-action / side-lever PCP
    runtime.cycleBoltDuration = spec.boltCycleSec!;
    runtime.cycleBoltTimer = spec.boltCycleSec!;
    if (spec.ejectsCasing) {
      const breechX = player.x + Math.cos(aimAngle) * 4.5;
      const breechY = player.y + Math.sin(aimAngle) * 4.5;
      spawnShellCasing(world, breechX, breechY, aimAngle, ammo, true);
    }
  } else if (spec.feedType === 'detachable_mag' && spec.weaponClass === 'firearm') {
    const magRounds = state.insertedMag?.magazineState?.rounds;
    if (magRounds && magRounds.length > 0) {
      state.chamberedAmmoId = magRounds.pop()!;
      state.slideLockedOpen = false;
    } else {
      state.slideLockedOpen = true;
    }
  } else if ((spec.feedType === 'internal_tube' || spec.feedType === 'internal_mag') && spec.weaponClass === 'firearm') {
    if (state.internalRounds && state.internalRounds.length > 0) {
      state.chamberedAmmoId = state.internalRounds.pop()!;
      state.slideLockedOpen = false;
    } else {
      state.slideLockedOpen = true;
    }
  }

  recalculateWeaponWeight(item);

  // Spawn ballistic projectile(s)
  if (!world.projectiles) world.projectiles = [];
  const baseSpeedMs = spec.muzzleVelocityMs * ammo.velocityMult * propellantVelMult;
  const pelletCount = Math.max(1, ammo.pelletCount || 1);

  for (let p = 0; p < pelletCount; p++) {
    // Gaussian-like angular scatter
    const r1 = (Math.random() + Math.random() - 1) * runtime.currentSpreadRad;
    const r2 = ammo.spreadConeRad > 0 ? (Math.random() + Math.random() - 1) * ammo.spreadConeRad : 0;
    const shotAngle = aimAngle + r1 + r2;
    const pelletSpeed = baseSpeedMs * (0.97 + Math.random() * 0.06);
    const speedPx = pelletSpeed * PX_PER_METER;
    const proj: BallisticProjectile = {
      id: `proj_${nowSec.toFixed(3)}_${Math.random().toString(36).slice(2, 7)}`,
      ownerId: 'player',
      weaponId: spec.id,
      weaponClass: spec.weaponClass,
      ammoId: ammo.id,
      x: muzzle.x,
      y: muzzle.y,
      prevX: muzzle.x - Math.cos(shotAngle) * 2.5,
      prevY: muzzle.y - Math.sin(shotAngle) * 2.5,
      vx: Math.cos(shotAngle) * speedPx,
      vy: Math.sin(shotAngle) * speedPx,
      angle: shotAngle,
      speedMs: pelletSpeed,
      initialSpeedMs: pelletSpeed,
      massGrams: ammo.massGrams,
      caliberMm: ammo.caliberMm,
      dragCoeff: ammo.dragCoeff,
      penetration: ammo.penetration * (0.75 + 0.25 * propellantVelMult),
      expansion: ammo.expansion,
      bluntFactor: ammo.bluntFactor,
      isNonLethal: ammo.isNonLethal,
      isTracer: ammo.isTracer,
      tracerColor: ammo.tracerColor,
      isSteelBb: ammo.isSteelBb,
      ricochetCount: 0,
      maxRicochets: ammo.isSteelBb ? 2 : ammo.bulletType === 'fmj' || ammo.bulletType === 'ap' ? 1 : 0,
      distanceTraveledM: 0,
      maxRangeM: Math.max(35, spec.effectiveRangeM * (spec.weaponClass === 'pneumatic' ? 1.55 : 2.1)),
      age: 0,
      alive: true,
      hitEntityIds: [],
    };
    world.projectiles.push(proj);
  }

  // Recoil impulse, muzzle climb, bloom & physiological feedback
  const otherOccupied = !!(hand === 'left' ? player.rightHandItem : player.leftHandItem);
  const armImp = computeArmImpairment(player);
  const oneHandMult = spec.twoHanded && (otherOccupied || armImp.eitherBroken) ? 1.85 : 1.0;
  const recScale = spec.recoilImpulse * ammo.recoilMult * oneHandMult;

  runtime.recoilKickPx = clamp(runtime.recoilKickPx + 1.8 + recScale * 2.4, 0, 9.5);
  const sideKickDir = (Math.random() - 0.45) * 2;
  runtime.recoilAngleOffset = clamp(
    runtime.recoilAngleOffset + sideKickDir * spec.recoilAngularRad * ammo.recoilMult * oneHandMult,
    -0.28,
    0.28
  );
  runtime.recoilBloomRad = clamp(
    runtime.recoilBloomRad + spec.recoilAngularRad * (0.72 + (spec.isSpringDoubleRecoil ? 0.4 : 0)) * oneHandMult,
    0,
    0.22
  );
  runtime.fireCooldown = 60 / Math.max(20, spec.rpm);
  runtime.lastShotTime = nowSec;
  runtime.muzzleWorldX = muzzle.x;
  runtime.muzzleWorldY = muzzle.y;
  runtime.muzzleAngle = aimAngle;
  runtime.muzzleFlashTimer = spec.weaponClass === 'firearm' ? 0.055 : 0.075;
  runtime.muzzleFlashKind =
    spec.weaponClass === 'pneumatic' ? 'pneumatic' : spec.isSuppressed || ammo.bulletType === 'subsonic' ? 'suppressed' : 'firearm';

  // Muzzle smoke / CO2 vapor particles
  const smokeCount = spec.weaponClass === 'firearm' ? (spec.category === 'shotgun' ? 8 : 5) : 3;
  for (let i = 0; i < smokeCount; i++) {
    const a = aimAngle + (Math.random() - 0.5) * 0.55;
    const s = 18 + Math.random() * 44;
    world.particles.push({
      x: muzzle.x,
      y: muzzle.y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      radius: spec.weaponClass === 'pneumatic' ? 1.8 + Math.random() * 1.6 : 2.2 + Math.random() * 2.5,
      color: spec.weaponClass === 'pneumatic' ? '#e2f1ff' : '#cbd5e1',
      alpha: spec.weaponClass === 'pneumatic' ? 0.45 : 0.55,
      life: 0,
      maxLife: 0.25 + Math.random() * 0.3,
      type: 'smoke',
      z: 6.5,
      vz: 4 + Math.random() * 8,
    });
  }

  // Audio & indoor acoustic trauma (tinnitus on loud unsuppressed firearms indoors)
  const isIndoors = !!player.insideBuildingId;
  const effectiveDb = spec.loudnessDb * ammo.noiseMult;
  sound.playGunshot(spec.soundProfile, ammo.noiseMult * (0.75 + 0.25 * propellantVelMult), isIndoors);

  if (isIndoors && spec.weaponClass === 'firearm' && effectiveDb >= 148 && player.bodyState) {
    player.bodyState.tinnitusTimer = Math.max(player.bodyState.tinnitusTimer || 0, effectiveDb >= 160 ? 3.8 : 2.0);
  }
  if (player.bodyState && spec.weaponClass === 'firearm') {
    player.bodyState.heartRate = Math.min(180, (player.bodyState.heartRate || 72) + 4.5);
  }

  // Alert nearby NPCs & wildlife with exact acoustic radius and dB
  const alertRadius = spec.alertRadiusPx * ammo.noiseMult * (isIndoors ? 0.62 : 1.0);
  broadcastGunshotAlert(world, muzzle.x, muzzle.y, alertRadius, effectiveDb, spec.weaponClass === 'firearm', nowSec);

  return true;
}

// ============================================================================
// MAIN PLAYER WEAPON TICK (AIMING, RELOAD PROGRESSION, BOLT CYCLE, FIRING)
// ============================================================================

export function updatePlayerWeaponSystem(
  player: Player,
  world: GameWorld,
  input: InputState,
  camera: Camera,
  dt: number,
  nowSec: number,
  canFireCanvas: boolean
): void {
  const runtime = ensurePlayerWeaponRuntime(player);
  const active = getActiveHeldWeapon(player);

  // Decay flash & cooldown timers even if weapon stowed
  if (runtime.muzzleFlashTimer > 0) runtime.muzzleFlashTimer = Math.max(0, runtime.muzzleFlashTimer - dt);
  if (runtime.fireCooldown > 0) runtime.fireCooldown = Math.max(0, runtime.fireCooldown - dt);

  if (!active || player.isInVehicle) {
    runtime.isAiming = false;
    runtime.aimProgress = Math.max(0, runtime.aimProgress - dt * 5);
    runtime.isHoldingBreath = false;
    runtime.reloadState = null;
    runtime.burstShotsLeft = 0;
    runtime.triggerWasDown = false;
    return;
  }

  const { item, hand, spec, state } = active;

  // Passive thermal cooling & CO2 bulb re-warming
  if (state.barrelTempC > 20) {
    state.barrelTempC = Math.max(20, state.barrelTempC - (2.4 + (state.barrelTempC - 20) * 0.04) * dt);
  }
  if ((state.co2TempPenalty || 0) > 0) {
    state.co2TempPenalty = Math.max(0, (state.co2TempPenalty || 0) - 0.08 * dt);
  }

  // Validate active reload still matches current held weapon
  if (runtime.reloadState && (runtime.reloadState.weaponItemId !== item.itemId || runtime.reloadState.hand !== hand)) {
    runtime.reloadState = null;
  }

  // Update manual bolt / pump / side-lever cycle timer
  if (runtime.cycleBoltTimer > 0) {
    const prev = runtime.cycleBoltTimer;
    runtime.cycleBoltTimer = Math.max(0, runtime.cycleBoltTimer - dt);
    if (prev > runtime.cycleBoltDuration * 0.5 && runtime.cycleBoltTimer <= runtime.cycleBoltDuration * 0.5) {
      sound.playWeaponMechanical('bolt_rack', 0.85);
    }
    if (runtime.cycleBoltTimer === 0) {
      // Chamber next round on completion of bolt/pump cycle
      if (spec.feedType === 'internal_tube' || spec.feedType === 'internal_mag') {
        if (state.internalRounds && state.internalRounds.length > 0) {
          state.chamberedAmmoId = state.internalRounds.pop()!;
        }
      } else if (spec.feedType === 'detachable_mag' && spec.weaponClass === 'firearm') {
        const magRounds = state.insertedMag?.magazineState?.rounds;
        if (magRounds && magRounds.length > 0) {
          state.chamberedAmmoId = magRounds.pop()!;
        }
      }
      state.isCocked = true;
    }
  }

  // Progress staged reload machine
  if (runtime.reloadState) {
    const rs = runtime.reloadState;
    rs.progress += dt / Math.max(0.08, rs.duration);
    if (rs.progress >= 1) {
      advanceReloadStage(player, world, active, runtime);
    }
  }

  // Physiological aiming & sway
  updatePhysiologicalAim(player, active, runtime, input, dt, nowSec);

  // Firing trigger logic (safe / semi / burst / auto)
  const triggerDown = canFireCanvas && !!input.isMouseDown;

  if (runtime.burstShotsLeft > 0) {
    if (runtime.fireCooldown <= 0) {
      const fired = attemptFireWeapon(player, world, active, runtime, nowSec);
      if (fired) {
        runtime.burstShotsLeft--;
        applyCameraShotShake(camera, spec);
      } else {
        runtime.burstShotsLeft = 0;
      }
    }
  } else if (triggerDown) {
    if (state.fireMode === 'auto') {
      if (runtime.fireCooldown <= 0) {
        const fired = attemptFireWeapon(player, world, active, runtime, nowSec);
        if (fired) applyCameraShotShake(camera, spec);
      }
    } else if (state.fireMode === 'burst') {
      if (!runtime.triggerWasDown && runtime.fireCooldown <= 0) {
        const fired = attemptFireWeapon(player, world, active, runtime, nowSec);
        if (fired) {
          runtime.burstShotsLeft = Math.max(0, (spec.burstCount || 3) - 1);
          applyCameraShotShake(camera, spec);
        }
      }
    } else {
      // semi or safe (one pull = one shot)
      if (!runtime.triggerWasDown) {
        const fired = attemptFireWeapon(player, world, active, runtime, nowSec);
        if (fired) applyCameraShotShake(camera, spec);
      }
    }
  }

  runtime.triggerWasDown = triggerDown;
}

function applyCameraShotShake(camera: Camera, spec: WeaponSpec): void {
  const intensity =
    spec.weaponClass === 'pneumatic'
      ? Math.min(1.6, spec.recoilImpulse * 1.4)
      : clamp(1.2 + spec.recoilImpulse * 2.1, 1.2, 6.8);
  camera.shakeIntensity = Math.max(camera.shakeIntensity || 0, intensity);
  camera.shakeTimer = Math.max(camera.shakeTimer || 0, spec.weaponClass === 'pneumatic' ? 0.08 : 0.14);
}

function advanceReloadStage(
  player: Player,
  world: GameWorld,
  active: ActiveHeldWeapon,
  runtime: PlayerWeaponRuntime
): void {
  const rs = runtime.reloadState;
  if (!rs) return;
  const { item, spec, state } = active;

  switch (rs.phase) {
    case 'clear_jam': {
      state.isJammed = false;
      state.fouling = Math.max(0, state.fouling - 12);
      if (spec.weaponClass === 'firearm' && !state.chamberedAmmoId) {
        const magRounds = state.insertedMag?.magazineState?.rounds;
        if (magRounds && magRounds.length > 0) {
          state.chamberedAmmoId = magRounds.pop()!;
        } else if (state.internalRounds && state.internalRounds.length > 0) {
          state.chamberedAmmoId = state.internalRounds.pop()!;
        }
      }
      runtime.reloadState = null;
      addPlayerNotification(player, `${spec.shortNameRu}: задержка устранена`, 'info');
      break;
    }

    case 'swap_co2': {
      const idx = player.inventory.findIndex((it) => it.itemId === 'co2_cartridge_12g' && (it.count ?? 1) > 0);
      if (idx !== -1) {
        const co2Item = player.inventory[idx];
        if ((co2Item.count ?? 1) <= 1) player.inventory.splice(idx, 1);
        else co2Item.count = (co2Item.count ?? 1) - 1;
        setWeaponEffectiveCo2(state, 100);
        state.co2TempPenalty = 0;
        sound.playWeaponMechanical('co2_pierce', 1.0);
        addPlayerNotification(player, `${spec.shortNameRu}: баллончик CO2 заменён (100%)`, 'info');
      }
      runtime.reloadState = null;
      break;
    }

    case 'pump_air': {
      const maxS = spec.maxPumpStrokes || 10;
      state.pumpStrokes = Math.min(maxS, (state.pumpStrokes ?? 0) + 1);
      player.needs.energy = Math.max(0, player.needs.energy - 0.6);
      runtime.reloadState = null;
      addPlayerNotification(player, `${spec.shortNameRu}: давление ${state.pumpStrokes}/${maxS} кач.`, 'info');
      break;
    }

    case 'break_barrel': {
      if (spec.feedType === 'break_single') {
        if (!state.chamberedAmmoId) {
          const aid = consumeOneLooseRound(player, spec.compatibleAmmoIds);
          if (aid) state.chamberedAmmoId = aid;
        }
        if (spec.propellant === 'spring_piston') state.isCocked = true;
        recalculateWeaponWeight(item);
        sound.playWeaponMechanical('mag_in', 0.85);
        runtime.reloadState = null;
      } else if (spec.feedType === 'break_double') {
        // Eject spent shells to ground if barrels were empty
        const emptyBarrels = (state.chamberedAmmoId ? 0 : 1) + (state.secondChamberAmmoId ? 0 : 1);
        const defAmmo = AMMO_SPECS[spec.defaultAmmoId];
        for (let i = 0; i < emptyBarrels && defAmmo; i++) {
          spawnShellCasing(world, player.x, player.y, player.angle, defAmmo, true);
        }
        runtime.reloadState = {
          phase: 'load_shell',
          hand: active.hand,
          weaponItemId: item.itemId,
          progress: 0,
          duration: spec.shellLoadSec || 0.55,
          labelRu: 'Зарядка стволов',
        };
        sound.playWeaponMechanical('shell_insert', 0.9);
      } else {
        runtime.reloadState = null;
      }
      break;
    }

    case 'eject_shells': {
      const spent = state.spentShellsInCylinder || 0;
      const defAmmo = AMMO_SPECS[spec.defaultAmmoId];
      for (let i = 0; i < spent && defAmmo; i++) {
        spawnShellCasing(world, player.x, player.y, player.angle, defAmmo, true);
      }
      state.spentShellsInCylinder = 0;
      const rounds = state.internalRounds || (state.internalRounds = []);
      const cap = spec.internalCapacity || 6;
      if (rounds.length < cap && findLooseAmmoIndex(player, spec.compatibleAmmoIds) !== -1) {
        runtime.reloadState = {
          phase: 'load_shell',
          hand: active.hand,
          weaponItemId: item.itemId,
          progress: 0,
          duration: spec.shellLoadSec || 0.45,
          labelRu: `Зарядка барабана (${rounds.length}/${cap})`,
        };
        sound.playWeaponMechanical('shell_insert', 0.85);
      } else {
        runtime.reloadState = null;
      }
      break;
    }

    case 'load_shell': {
      if (spec.feedType === 'break_double') {
        const aid = consumeOneLooseRound(player, spec.compatibleAmmoIds);
        if (aid) {
          if (!state.chamberedAmmoId) state.chamberedAmmoId = aid;
          else if (!state.secondChamberAmmoId) state.secondChamberAmmoId = aid;
        }
        recalculateWeaponWeight(item);
        const hasBoth = !!(state.chamberedAmmoId && state.secondChamberAmmoId);
        if (!hasBoth && findLooseAmmoIndex(player, spec.compatibleAmmoIds) !== -1) {
          rs.progress = 0;
          sound.playWeaponMechanical('shell_insert', 0.9);
        } else {
          sound.playWeaponMechanical('mag_in', 0.95);
          runtime.reloadState = null;
        }
        break;
      }

      if (spec.feedType === 'cylinder' || spec.feedType === 'internal_tube' || spec.feedType === 'internal_mag') {
        const cap = spec.internalCapacity || 5;
        const rounds = state.internalRounds || (state.internalRounds = []);
        const aid = consumeOneLooseRound(player, spec.compatibleAmmoIds);
        if (aid && rounds.length < cap) {
          rounds.push(aid);
          recalculateWeaponWeight(item);
        }
        if (rounds.length < cap && findLooseAmmoIndex(player, spec.compatibleAmmoIds) !== -1) {
          rs.progress = 0;
          rs.labelRu = `Дозарядка (${rounds.length}/${cap})`;
          sound.playWeaponMechanical('shell_insert', 0.88);
        } else if (spec.feedType !== 'cylinder' && !state.chamberedAmmoId && rounds.length > 0) {
          runtime.reloadState = {
            phase: 'rack_bolt',
            hand: active.hand,
            weaponItemId: item.itemId,
            progress: 0,
            duration: spec.reloadRackSec,
            labelRu: 'Досылание патрона',
          };
          sound.playWeaponMechanical('bolt_rack', 0.95);
        } else {
          if (spec.feedType === 'cylinder') sound.playWeaponMechanical('mag_in', 0.9);
          runtime.reloadState = null;
        }
        break;
      }

      // Direct top-up of inserted detachable magazine when no spare mag exists
      const ms = state.insertedMag?.magazineState;
      if (ms && ms.rounds.length < ms.capacity) {
        const batch = spec.weaponClass === 'pneumatic' ? Math.min(4, ms.capacity - ms.rounds.length) : 1;
        for (let b = 0; b < batch; b++) {
          const aid = consumeOneLooseRound(player, spec.compatibleAmmoIds);
          if (!aid) break;
          ms.rounds.push(aid);
        }
        recalculateWeaponWeight(item);
        if (ms.rounds.length < ms.capacity && findLooseAmmoIndex(player, spec.compatibleAmmoIds) !== -1) {
          rs.progress = 0;
          rs.labelRu = `Снаряжение (${ms.rounds.length}/${ms.capacity})`;
          sound.playWeaponMechanical('shell_insert', 0.82);
          break;
        }
      }
      if (spec.weaponClass === 'firearm' && !state.chamberedAmmoId && (ms?.rounds.length || 0) > 0) {
        runtime.reloadState = {
          phase: 'rack_bolt',
          hand: active.hand,
          weaponItemId: item.itemId,
          progress: 0,
          duration: spec.reloadRackSec,
          labelRu: 'Передёргивание затвора',
        };
        sound.playWeaponMechanical('bolt_rack', 0.95);
      } else {
        runtime.reloadState = null;
      }
      break;
    }

    case 'eject_mag': {
      const oldMag = state.insertedMag;
      state.insertedMag = null;
      if (oldMag) {
        addItemToPlayer(player, oldMag, { preferPockets: true });
      }
      recalculateWeaponWeight(item);
      runtime.reloadState = {
        phase: 'insert_mag',
        hand: active.hand,
        weaponItemId: item.itemId,
        progress: 0,
        duration: spec.reloadMagInSec,
        targetMagItemId: rs.targetMagItemId,
        wasChamberEmpty: rs.wasChamberEmpty,
        labelRu: 'Установка магазина',
      };
      sound.playWeaponMechanical('mag_in', 0.95);
      break;
    }

    case 'insert_mag': {
      let magIdx = rs.targetMagItemId
        ? player.inventory.findIndex((it) => it.id === rs.targetMagItemId)
        : -1;
      if (magIdx === -1) {
        magIdx = findBestCompatibleMagIndex(player, spec.compatibleMagIds);
      }
      if (magIdx !== -1) {
        const [newMag] = player.inventory.splice(magIdx, 1);
        if (!newMag.magazineState) {
          newMag.magazineState = buildInitialMagazineState(newMag.itemId, false);
        }
        state.insertedMag = newMag;
        recalculateWeaponWeight(item);
      }

      const needsRack =
        spec.weaponClass === 'firearm' &&
        !state.chamberedAmmoId &&
        (state.insertedMag?.magazineState?.rounds.length || 0) > 0;

      if (needsRack) {
        runtime.reloadState = {
          phase: 'rack_bolt',
          hand: active.hand,
          weaponItemId: item.itemId,
          progress: 0,
          duration: spec.reloadRackSec,
          labelRu: 'Досылание патрона',
        };
        sound.playWeaponMechanical('bolt_rack', 0.95);
      } else {
        runtime.reloadState = null;
      }
      break;
    }

    case 'rack_bolt': {
      if (!state.chamberedAmmoId) {
        if (state.insertedMag?.magazineState && state.insertedMag.magazineState.rounds.length > 0) {
          state.chamberedAmmoId = state.insertedMag.magazineState.rounds.pop()!;
        } else if (state.internalRounds && state.internalRounds.length > 0) {
          state.chamberedAmmoId = state.internalRounds.pop()!;
        }
      }
      state.slideLockedOpen = false;
      state.isCocked = true;
      recalculateWeaponWeight(item);
      runtime.reloadState = null;
      break;
    }

    default:
      runtime.reloadState = null;
      break;
  }
}

// ============================================================================
// GEOMETRY INTERSECTION HELPERS FOR SWEPT BALLISTICS
// ============================================================================

function segmentCircleHitT(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  cx: number,
  cy: number,
  r: number
): number | null {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const fx = x1 - cx;
  const fy = y1 - cy;
  const a = dx * dx + dy * dy;
  if (a < 1e-8) return null;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - r * r;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  const sqrtD = Math.sqrt(disc);
  const t1 = (-b - sqrtD) / (2 * a);
  if (t1 >= 0 && t1 <= 1) return t1;
  const t2 = (-b + sqrtD) / (2 * a);
  if (t2 >= 0 && t2 <= 1 && c <= 0) return 0;
  return null;
}

function segmentAABBHit(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number
): { t: number; nx: number; ny: number } | null {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tmin = 0;
  let tmax = 1;
  let nx = 0;
  let ny = 0;

  if (Math.abs(dx) < 1e-8) {
    if (x1 < minX || x1 > maxX) return null;
  } else {
    const invD = 1 / dx;
    let t1 = (minX - x1) * invD;
    let t2 = (maxX - x1) * invD;
    let n = -1;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
      n = 1;
    }
    if (t1 > tmin) {
      tmin = t1;
      nx = n;
      ny = 0;
    }
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;
  }

  if (Math.abs(dy) < 1e-8) {
    if (y1 < minY || y1 > maxY) return null;
  } else {
    const invD = 1 / dy;
    let t1 = (minY - y1) * invD;
    let t2 = (maxY - y1) * invD;
    let n = -1;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
      n = 1;
    }
    if (t1 > tmin) {
      tmin = t1;
      nx = 0;
      ny = n;
    }
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;
  }

  if (tmin >= 0 && tmin <= 1) return { t: tmin, nx, ny };
  return null;
}

function segmentVehicleOBBHit(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  v: Vehicle
): { t: number; nx: number; ny: number; localX: number; localY: number } | null {
  const hw = (v.width || 30) * 0.5;
  const hl = (v.length || 64) * 0.5;
  const cos = Math.cos(-v.angle);
  const sin = Math.sin(-v.angle);

  const rx1 = x1 - v.x;
  const ry1 = y1 - v.y;
  const lx1 = rx1 * cos - ry1 * sin;
  const ly1 = rx1 * sin + ry1 * cos;

  const rx2 = x2 - v.x;
  const ry2 = y2 - v.y;
  const lx2 = rx2 * cos - ry2 * sin;
  const ly2 = rx2 * sin + ry2 * cos;

  // Vehicle local frame: +X is forward (length), +Y is right (width)
  const hit = segmentAABBHit(lx1, ly1, lx2, ly2, -hl, -hw, hl, hw);
  if (!hit) return null;

  const localX = lx1 + (lx2 - lx1) * hit.t;
  const localY = ly1 + (ly2 - ly1) * hit.t;

  // Transform normal back to world space
  const wCos = Math.cos(v.angle);
  const wSin = Math.sin(v.angle);
  const nx = hit.nx * wCos - hit.ny * wSin;
  const ny = hit.nx * wSin + hit.ny * wCos;

  return { t: hit.t, nx, ny, localX, localY };
}

function addImpactMark(
  world: GameWorld,
  x: number,
  y: number,
  angle: number,
  surface: 'concrete' | 'metal' | 'wood' | 'glass' | 'dirt' | 'blood',
  radius: number
): void {
  if (!world.bulletImpacts) world.bulletImpacts = [];
  world.bulletImpacts.push({
    x,
    y,
    angle,
    surface,
    radius,
    life: 0,
    maxLife: 45,
  });
  if (world.bulletImpacts.length > 260) {
    world.bulletImpacts.shift();
  }
}

function spawnImpactSparks(
  world: GameWorld,
  x: number,
  y: number,
  nx: number,
  ny: number,
  surface: 'concrete' | 'metal' | 'wood' | 'glass'
): void {
  const baseAng = Math.atan2(ny, nx);
  const count = surface === 'metal' ? 7 : surface === 'glass' ? 8 : 5;
  for (let i = 0; i < count; i++) {
    const a = baseAng + (Math.random() - 0.5) * 1.65;
    const spd = 28 + Math.random() * 82;
    const color =
      surface === 'metal'
        ? i % 2 === 0
          ? '#fde047'
          : '#fb923c'
        : surface === 'glass'
        ? '#e0f2fe'
        : surface === 'wood'
        ? '#b45309'
        : '#d6d3d1';
    world.particles.push({
      x,
      y,
      vx: Math.cos(a) * spd,
      vy: Math.sin(a) * spd,
      radius: surface === 'metal' ? 1.1 : 1.5,
      color,
      alpha: 0.92,
      life: 0,
      maxLife: surface === 'metal' ? 0.16 + Math.random() * 0.14 : 0.28 + Math.random() * 0.25,
      type: surface === 'metal' ? 'spark' : 'debris',
      z: 5.5,
      vz: 14 + Math.random() * 24,
    });
  }
}

function applyProjectileDamageToVehicle(
  world: GameWorld,
  v: Vehicle,
  proj: BallisticProjectile,
  hitX: number,
  hitY: number,
  localX: number,
  localY: number
): 'metal' | 'glass' {
  const energyJ = 0.5 * (proj.massGrams / 1000) * proj.speedMs * proj.speedMs;
  const hl = (v.length || 64) * 0.5;
  const hw = (v.width || 30) * 0.5;
  const relX = localX / Math.max(1, hl); // -1 rear .. +1 front
  const relY = localY / Math.max(1, hw); // -1 left .. +1 right

  // Weak steel BB / low-energy airgun only leaves tiny paint ding or glass chip
  if (energyJ < 25) {
    sound.playWeaponMechanical('metal_hit', 0.45);
    return 'metal';
  }

  let surface: 'metal' | 'glass' = 'metal';
  const dmg = v.damage;

  if (relX > 0.08 && relX < 0.46 && Math.abs(relY) < 0.78) {
    // Windshield / glass hit
    surface = 'glass';
    if (dmg && energyJ > 45) {
      dmg.windshieldCracked = true;
    }
    sound.playWeaponMechanical('glass_hit', 0.95);
  } else if (relX >= 0.46) {
    // Engine bay / headlights / radiator
    sound.playWeaponMechanical('metal_hit', 0.95);
    if (dmg) {
      if (relX > 0.82 && relY < -0.25 && energyJ > 40) dmg.leftHeadlightBroken = true;
      if (relX > 0.82 && relY > 0.25 && energyJ > 40) dmg.rightHeadlightBroken = true;
      if (proj.penetration >= 28 && energyJ > 220) {
        v.engineHealth = Math.max(0, (v.engineHealth ?? 100) - clamp(energyJ * 0.0085, 2, 22));
        if (v.engineHealth < 55) dmg.engineSmoking = true;
        if (proj.penetration >= 42 && Math.random() < 0.4) {
          addOrGrowFluidStain(world, hitX, hitY, Math.random() < 0.5 ? 'oil' : 'coolant', 1.8);
        }
        if (proj.isTracer && energyJ > 450 && Math.random() < 0.35) {
          dmg.underHoodSmolder = true;
          dmg.engineFire = true;
          dmg.fireOrigin = 'front';
          dmg.fireIntensity = Math.max(dmg.fireIntensity || 0, 0.35);
        }
      }
    }
  } else if (relX <= -0.5) {
    // Rear trunk / taillights / fuel tank
    sound.playWeaponMechanical('metal_hit', 0.95);
    if (dmg) {
      if (relX < -0.82 && relY < -0.25 && energyJ > 40) dmg.leftTaillightBroken = true;
      if (relX < -0.82 && relY > 0.25 && energyJ > 40) dmg.rightTaillightBroken = true;
      if (proj.penetration >= 35 && energyJ > 320 && Math.random() < 0.45) {
        addOrGrowFluidStain(world, hitX, hitY, 'fuel', 2.4);
        v.fuel = Math.max(0, (v.fuel ?? 0) - 4.5);
        if (proj.isTracer && Math.random() < 0.55) {
          dmg.fuelTankFire = true;
          dmg.fireOrigin = 'rear';
          dmg.fireIntensity = Math.max(dmg.fireIntensity || 0, 0.45);
        }
      }
    }
  } else {
    // Doors / cabin body
    sound.playWeaponMechanical('metal_hit', 0.9);
  }

  // Wheel corner hits -> suspension damage
  if (dmg && Math.abs(relY) > 0.72 && energyJ > 160) {
    if (relX > 0.25 && relX < 0.78) {
      if (relY < 0) dmg.frontLeftSuspensionDamage = Math.min(1, (dmg.frontLeftSuspensionDamage || 0) + 0.35);
      else dmg.frontRightSuspensionDamage = Math.min(1, (dmg.frontRightSuspensionDamage || 0) + 0.35);
    } else if (relX < -0.25 && relX > -0.78) {
      if (relY < 0) dmg.rearLeftSuspensionDamage = Math.min(1, (dmg.rearLeftSuspensionDamage || 0) + 0.35);
      else dmg.rearRightSuspensionDamage = Math.min(1, (dmg.rearRightSuspensionDamage || 0) + 0.35);
    }
  }

  return surface;
}

// ============================================================================
// WORLD BALLISTICS, SHELL CASINGS & IMPACT MARK UPDATE
// ============================================================================

export function updateWorldBallistics(
  world: GameWorld,
  player: Player,
  dt: number,
  nowSec: number
): void {
  const safeDt = Math.min(dt, 0.05);

  // 1. Update active ballistic projectiles
  if (world.projectiles && world.projectiles.length > 0) {
    const insideBldId = player.insideBuildingId;

    for (let i = world.projectiles.length - 1; i >= 0; i--) {
      const p = world.projectiles[i];
      if (!p.alive) {
        world.projectiles.splice(i, 1);
        continue;
      }

      p.age += safeDt;
      p.prevX = p.x;
      p.prevY = p.y;

      // Realistic aerodynamic drag deceleration
      const newSpeedMs = p.speedMs / (1 + p.dragCoeff * p.speedMs * safeDt);
      const speedRatio = p.speedMs > 1 ? newSpeedMs / p.speedMs : 0;
      p.speedMs = newSpeedMs;
      p.vx *= speedRatio;
      p.vy *= speedRatio;

      const nextX = p.x + p.vx * safeDt;
      const nextY = p.y + p.vy * safeDt;
      const stepDistPx = Math.hypot(nextX - p.x, nextY - p.y);
      p.distanceTraveledM += stepDistPx / PX_PER_METER;

      // Bounding box of segment for fast broad-phase culling
      const segMinX = Math.min(p.x, nextX) - 24;
      const segMaxX = Math.max(p.x, nextX) + 24;
      const segMinY = Math.min(p.y, nextY) - 24;
      const segMaxY = Math.max(p.y, nextY) + 24;

      // Find closest intersection along segment [0..1]
      type HitRecord =
        | { kind: 'building'; t: number; nx: number; ny: number; bld: Building }
        | { kind: 'vehicle'; t: number; nx: number; ny: number; veh: Vehicle; localX: number; localY: number }
        | { kind: 'ped'; t: number; ped: Pedestrian }
        | { kind: 'animal'; t: number; animal: Animal }
        | { kind: 'tree'; t: number; x: number; y: number }
        | { kind: 'prop'; t: number; x: number; y: number; surface: 'metal' | 'wood' };

      let bestHit: HitRecord | null = null;

      // A. Buildings (exterior walls)
      for (let bi = 0; bi < world.buildings.length; bi++) {
        const b = world.buildings[bi];
        if (insideBldId && b.id === insideBldId) continue;
        if (b.type === 'gas_station_canopy' || b.type === 'garage_ramp' || b.type === 'railway_platform') continue;
        if (b.x > segMaxX || b.x + b.width < segMinX || b.y > segMaxY || b.y + b.height < segMinY) continue;
        const hit = segmentAABBHit(p.x, p.y, nextX, nextY, b.x, b.y, b.x + b.width, b.y + b.height);
        if (hit && (!bestHit || hit.t < bestHit.t)) {
          bestHit = { kind: 'building', t: hit.t, nx: hit.nx, ny: hit.ny, bld: b };
        }
      }

      // B. Vehicles (OBB)
      for (let vi = 0; vi < world.vehicles.length; vi++) {
        const v = world.vehicles[vi];
        const bound = Math.max(v.length || 64, v.width || 30) * 0.65;
        if (v.x + bound < segMinX || v.x - bound > segMaxX || v.y + bound < segMinY || v.y - bound > segMaxY) continue;
        const hit = segmentVehicleOBBHit(p.x, p.y, nextX, nextY, v);
        if (hit && (!bestHit || hit.t < bestHit.t)) {
          bestHit = { kind: 'vehicle', t: hit.t, nx: hit.nx, ny: hit.ny, veh: v, localX: hit.localX, localY: hit.localY };
        }
      }

      // C. Pedestrians
      for (let pi = 0; pi < world.pedestrians.length; pi++) {
        const ped = world.pedestrians[pi];
        if (ped.state === 'dead') continue;
        if (p.hitEntityIds?.includes(ped.id)) continue;
        if (ped.x + 10 < segMinX || ped.x - 10 > segMaxX || ped.y + 10 < segMinY || ped.y - 10 > segMaxY) continue;
        const hitRad = ped.state === 'unconscious' || ped.state === 'crawling_injured' ? 5.2 : 6.8;
        const t = segmentCircleHitT(p.x, p.y, nextX, nextY, ped.x, ped.y, hitRad);
        if (t !== null && (!bestHit || t < bestHit.t)) {
          bestHit = { kind: 'ped', t, ped };
        }
      }

      // D. Animals
      if (world.animals) {
        for (let ai = 0; ai < world.animals.length; ai++) {
          const a = world.animals[ai];
          if (a.state === 'dead' || a.state === 'in_tree') continue;
          if (p.hitEntityIds?.includes(a.id)) continue;
          const cfg = ANIMAL_SPECIES_CONFIG[a.species];
          const rad = Math.max(3.6, (cfg?.bodyLen || 14) * 0.44);
          if (a.x + rad + 2 < segMinX || a.x - rad - 2 > segMaxX || a.y + rad + 2 < segMinY || a.y - rad - 2 > segMaxY) continue;
          const t = segmentCircleHitT(p.x, p.y, nextX, nextY, a.x, a.y, rad);
          if (t !== null && (!bestHit || t < bestHit.t)) {
            bestHit = { kind: 'animal', t, animal: a };
          }
        }
      }

      // E. Trees (trunks)
      for (let ti = 0; ti < world.trees.length; ti++) {
        const tr = world.trees[ti];
        const trunkR = Math.max(2.6, Math.min(6.5, (tr.radius || 16) * 0.22));
        if (tr.x + trunkR < segMinX || tr.x - trunkR > segMaxX || tr.y + trunkR < segMinY || tr.y - trunkR > segMaxY) continue;
        const t = segmentCircleHitT(p.x, p.y, nextX, nextY, tr.x, tr.y, trunkR);
        if (t !== null && (!bestHit || t < bestHit.t)) {
          bestHit = { kind: 'tree', t, x: tr.x, y: tr.y };
        }
      }

      // F. Solid street props
      for (let si = 0; si < world.streetProps.length; si++) {
        const sp = world.streetProps[si];
        if (sp.type === 'manhole' || sp.type === 'drain_grate' || sp.type === 'flowerbed' || sp.type === 'sandbox') continue;
        if (sp.x + 8 < segMinX || sp.x - 8 > segMaxX || sp.y + 8 < segMinY || sp.y - 8 > segMaxY) continue;
        const r = sp.type === 'dumpster' || sp.type === 'kiosk' ? 8.5 : sp.type === 'bench' ? 5.5 : 3.2;
        const t = segmentCircleHitT(p.x, p.y, nextX, nextY, sp.x, sp.y, r);
        if (t !== null && (!bestHit || t < bestHit.t)) {
          const surf = sp.type === 'bench' || sp.type === 'village_well' ? 'wood' : 'metal';
          bestHit = { kind: 'prop', t, x: sp.x, y: sp.y, surface: surf };
        }
      }

      if (bestHit) {
        const hitX = p.x + (nextX - p.x) * bestHit.t;
        const hitY = p.y + (nextY - p.y) * bestHit.t;

        if (bestHit.kind === 'ped') {
          const result = applyBallisticTraumaToPedestrian(bestHit.ped, p, hitX, hitY, world, nowSec);
          if (!p.hitEntityIds) p.hitEntityIds = [];
          p.hitEntityIds.push(bestHit.ped.id);
          sound.playWeaponMechanical('flesh_hit', result.penetrated ? 1.0 : 0.45);
          if (result.penetrated) {
            spawnBloodImpactEffects(world, hitX, hitY, p.angle, result.energyJ > 900 ? 1.4 : 0.9);
            addImpactMark(world, hitX, hitY, p.angle, 'blood', 2.4);
          }
          // High-energy AP/rifle rounds can over-penetrate human tissue
          if (result.penetrated && p.penetration >= 66 && p.speedMs > 420) {
            p.x = hitX + Math.cos(p.angle) * 2.5;
            p.y = hitY + Math.sin(p.angle) * 2.5;
            p.speedMs *= 0.62;
            p.vx *= 0.62;
            p.vy *= 0.62;
            p.penetration *= 0.55;
          } else {
            p.x = hitX;
            p.y = hitY;
            p.alive = false;
          }
        } else if (bestHit.kind === 'animal') {
          const result = applyBallisticTraumaToAnimal(bestHit.animal, p, hitX, hitY, world, nowSec);
          if (!p.hitEntityIds) p.hitEntityIds = [];
          p.hitEntityIds.push(bestHit.animal.id);
          sound.playWeaponMechanical('flesh_hit', result.penetrated ? 0.95 : 0.45);
          if (result.penetrated) {
            spawnBloodImpactEffects(world, hitX, hitY, p.angle, result.energyJ > 900 ? 1.35 : 0.85);
            addImpactMark(world, hitX, hitY, p.angle, 'blood', 2.1);
          }
          if (result.penetrated && p.penetration >= 72 && p.speedMs > 480) {
            p.x = hitX + Math.cos(p.angle) * 2.5;
            p.y = hitY + Math.sin(p.angle) * 2.5;
            p.speedMs *= 0.58;
            p.vx *= 0.58;
            p.vy *= 0.58;
            p.penetration *= 0.5;
          } else {
            p.x = hitX;
            p.y = hitY;
            p.alive = false;
          }
        } else if (bestHit.kind === 'vehicle') {
          const surf = applyProjectileDamageToVehicle(
            world,
            bestHit.veh,
            p,
            hitX,
            hitY,
            bestHit.localX,
            bestHit.localY
          );
          spawnImpactSparks(world, hitX, hitY, bestHit.nx, bestHit.ny, surf);
          addImpactMark(world, hitX, hitY, p.angle, surf, p.weaponClass === 'pneumatic' ? 1.1 : 1.9);
          if (!tryRicochet(p, hitX, hitY, bestHit.nx, bestHit.ny)) {
            p.x = hitX;
            p.y = hitY;
            p.alive = false;
          }
        } else if (bestHit.kind === 'building') {
          spawnImpactSparks(world, hitX, hitY, bestHit.nx, bestHit.ny, 'concrete');
          addImpactMark(world, hitX, hitY, p.angle, 'concrete', p.weaponClass === 'pneumatic' ? 1.1 : 2.1);
          sound.playWeaponMechanical('wood_hit', 0.65);
          if (!tryRicochet(p, hitX, hitY, bestHit.nx, bestHit.ny)) {
            p.x = hitX;
            p.y = hitY;
            p.alive = false;
          }
        } else if (bestHit.kind === 'tree') {
          const nx = (hitX - bestHit.x) / Math.max(0.1, Math.hypot(hitX - bestHit.x, hitY - bestHit.y));
          const ny = (hitY - bestHit.y) / Math.max(0.1, Math.hypot(hitX - bestHit.x, hitY - bestHit.y));
          spawnImpactSparks(world, hitX, hitY, nx, ny, 'wood');
          addImpactMark(world, hitX, hitY, p.angle, 'wood', 1.7);
          sound.playWeaponMechanical('wood_hit', 0.8);
          p.x = hitX;
          p.y = hitY;
          p.alive = false;
        } else if (bestHit.kind === 'prop') {
          const nx = (hitX - bestHit.x) / Math.max(0.1, Math.hypot(hitX - bestHit.x, hitY - bestHit.y));
          const ny = (hitY - bestHit.y) / Math.max(0.1, Math.hypot(hitX - bestHit.x, hitY - bestHit.y));
          spawnImpactSparks(world, hitX, hitY, nx, ny, bestHit.surface);
          addImpactMark(world, hitX, hitY, p.angle, bestHit.surface, 1.5);
          sound.playWeaponMechanical(bestHit.surface === 'metal' ? 'metal_hit' : 'wood_hit', 0.78);
          if (bestHit.surface !== 'metal' || !tryRicochet(p, hitX, hitY, nx, ny)) {
            p.x = hitX;
            p.y = hitY;
            p.alive = false;
          }
        }
      } else {
        p.x = nextX;
        p.y = nextY;
      }

      if (p.distanceTraveledM >= p.maxRangeM || p.speedMs < 18 || p.age > 3.5) {
        p.alive = false;
      }
      if (!p.alive) {
        world.projectiles.splice(i, 1);
      }
    }
  }

  // 2. Update ejected shell casings (2.5D parabolic bounce + brass clink)
  if (world.shellCasings && world.shellCasings.length > 0) {
    for (let i = world.shellCasings.length - 1; i >= 0; i--) {
      const c = world.shellCasings[i];
      c.life += safeDt;
      if (c.life >= c.maxLife) {
        world.shellCasings.splice(i, 1);
        continue;
      }
      if (c.z > 0 || Math.abs(c.vz) > 0.5 || Math.hypot(c.vx, c.vy) > 1.2) {
        c.x += c.vx * safeDt;
        c.y += c.vy * safeDt;
        c.vz -= 210 * safeDt;
        c.z += c.vz * safeDt;
        c.angle += c.angularVel * safeDt;
        if (c.z <= 0) {
          c.z = 0;
          if (Math.abs(c.vz) > 12 && c.bounces < 3) {
            c.vz = -c.vz * 0.42;
            c.vx *= 0.58;
            c.vy *= 0.58;
            c.angularVel *= 0.55;
            c.bounces++;
            if (c.bounces === 1) {
              sound.playWeaponMechanical('casing_clink', 0.65);
            }
          } else {
            c.vz = 0;
            c.vx *= 0.75;
            c.vy *= 0.75;
            c.angularVel *= 0.5;
          }
        }
      }
    }
  }

  // 3. Fade bullet impact marks
  if (world.bulletImpacts && world.bulletImpacts.length > 0) {
    for (let i = world.bulletImpacts.length - 1; i >= 0; i--) {
      const m = world.bulletImpacts[i];
      m.life += safeDt;
      if (m.life >= m.maxLife) {
        world.bulletImpacts.splice(i, 1);
      }
    }
  }
}

function tryRicochet(
  p: BallisticProjectile,
  hitX: number,
  hitY: number,
  nx: number,
  ny: number
): boolean {
  if (p.ricochetCount >= p.maxRicochets || p.speedMs < 55) return false;
  const spd = Math.hypot(p.vx, p.vy);
  if (spd < 1) return false;
  const dx = p.vx / spd;
  const dy = p.vy / spd;
  const dot = dx * nx + dy * ny; // negative when approaching surface
  const grazing = Math.abs(dot); // 0 = parallel graze, 1 = head-on
  const threshold = p.isSteelBb ? 0.52 : 0.36;
  if (grazing > threshold) return false;

  const rx = dx - 2 * dot * nx;
  const ry = dy - 2 * dot * ny;
  const scatter = (Math.random() - 0.5) * 0.18;
  const newAngle = Math.atan2(ry, rx) + scatter;
  const retained = p.isSteelBb ? 0.56 : 0.48;
  p.speedMs *= retained;
  const newSpdPx = p.speedMs * PX_PER_METER;
  p.vx = Math.cos(newAngle) * newSpdPx;
  p.vy = Math.sin(newAngle) * newSpdPx;
  p.angle = newAngle;
  p.x = hitX + nx * 1.4;
  p.y = hitY + ny * 1.4;
  p.ricochetCount++;
  sound.playWeaponMechanical('ricochet', 0.85);
  return true;
}
