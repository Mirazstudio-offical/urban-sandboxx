import { Player, GameWorld } from './types';
import { sound } from './audio';
import { addPlayerNotification } from './items';

export type BedSleepPhase =
  | 'idle'
  | 'lying_down'
  | 'falling_asleep'
  | 'deep_sleep'
  | 'night_awakening'
  | 'waking_up';

export interface BedSleepState {
  isActive: boolean;
  furnitureType: string;
  buildingId: string;
  apartmentId?: string;
  bedPos: { x: number; y: number };
  playerOriginalPos: { x: number; y: number };
  phase: BedSleepPhase;
  phaseTimer: number;             // Seconds in current phase
  totalSleptHours: number;        // Accumulated in-game hours slept
  startHour: number;              // Hour of day when laid down
  lastTimeHour: number;           // Track time progression
  awokeAtNight: boolean;          // Has the player already had a night awakening?
  nightAwakeReason?: string;
  targetSleepHours: number;       // Target hours (e.g., 8.0)
  wakeMood?: 'well_rested' | 'slightly_tired' | 'exhausted' | 'overslept';
  dreamText?: string;
}

export const initialBedSleepState: BedSleepState = {
  isActive: false,
  furnitureType: 'bed',
  buildingId: '',
  bedPos: { x: 0, y: 0 },
  playerOriginalPos: { x: 0, y: 0 },
  phase: 'idle',
  phaseTimer: 0,
  totalSleptHours: 0,
  startHour: 12,
  lastTimeHour: 12,
  awokeAtNight: false,
  targetSleepHours: 8.0
};

const DREAM_THOUGHTS = [
  'Вам снится тихий загородный рассвет и шелест сосен...',
  'Вам снится бесконечная ночная трасса под мягким светом фар...',
  'Вам снится теплый летний дождь по крыше...',
  'Вы чувствуете, как усталость постепенно покидает мышцы...',
  'Глубокий спокойный сон восстанавливает силы организма...'
];

const NIGHT_AWAKE_REASONS = [
  'Вас разбудила легкая жажда...',
  'Вы проснулись от шума ветра за окном...',
  'Вам приснился тревожный сон...',
  'Вы проснулись в полной ночной тишине...'
];

/**
 * Initializes lying down on a bed or sofa
 */
export function startLyingOnBed(
  player: Player,
  furnitureType: string,
  buildingId: string,
  bedWorldX: number,
  bedWorldY: number,
  currentHour: number,
  aptId?: string
): BedSleepState {
  const originalX = player.x;
  const originalY = player.y;

  // Move player smoothly onto the bed surface
  player.x = bedWorldX;
  player.y = bedWorldY;
  player.vx = 0;
  player.vy = 0;
  player.speed = 0;

  sound.playUseItem();

  const isSofa = furnitureType === 'sofa';
  addPlayerNotification(
    player,
    isSofa ? 'Вы прилегли на диван. Нажмите [E], чтобы уснуть, или [Пробел], чтобы встать.' : 'Вы легли на кровать. Нажмите [E], чтобы уснуть, или [Пробел], чтобы встать.',
    'info'
  );

  return {
    isActive: true,
    furnitureType,
    buildingId,
    apartmentId: aptId,
    bedPos: { x: bedWorldX, y: bedWorldY },
    playerOriginalPos: { x: originalX, y: originalY },
    phase: 'lying_down',
    phaseTimer: 0,
    totalSleptHours: 0,
    startHour: currentHour,
    lastTimeHour: currentHour,
    awokeAtNight: false,
    targetSleepHours: 8.0
  };
}

/**
 * Initiates the falling asleep transition from lying down
 */
export function triggerFallingAsleep(bedState: BedSleepState, player: Player): BedSleepState {
  if (bedState.phase !== 'lying_down' && bedState.phase !== 'night_awakening') return bedState;

  sound.playUseItem();
  return {
    ...bedState,
    phase: 'falling_asleep',
    phaseTimer: 0
  };
}

/**
 * Player chooses to stand up from bed
 */
export function standUpFromBed(
  bedState: BedSleepState,
  player: Player
): BedSleepState {
  // Move player slightly beside the bed
  if (bedState.playerOriginalPos) {
    player.x = bedState.playerOriginalPos.x;
    player.y = bedState.playerOriginalPos.y;
  }
  player.isSleeping = false;
  player.sleepTimer = 0;

  sound.playUseItem();
  addPlayerNotification(player, 'Вы встали с кровати.', 'info');

  return { ...initialBedSleepState, isActive: false };
}

/**
 * Updates the bed sleep cycle every frame
 */
export function updateBedSleepCycle(
  bedState: BedSleepState,
  player: Player,
  dt: number,
  timeHour: number,
  setTimeHour: (h: number) => void
): BedSleepState {
  if (!bedState.isActive) return bedState;

  const nextState = { ...bedState };
  nextState.phaseTimer += dt;

  // Keep player aligned with bed position
  player.x = bedState.bedPos.x;
  player.y = bedState.bedPos.y;
  player.vx = 0;
  player.vy = 0;
  player.speed = 0;

  switch (bedState.phase) {
    case 'lying_down': {
      // Resting on bed: stamina recovers, pain decreases slightly
      player.needs.energy = Math.min(100, player.needs.energy + 12 * dt);
      if (player.bodyState && player.bodyState.painLevel > 0) {
        player.bodyState.painLevel = Math.max(0, player.bodyState.painLevel - 1.5 * dt);
      }

      // If player is very tired (sleepiness >= 65), auto-drift into sleep after 4 seconds
      if (player.needs.sleepiness >= 65 && nextState.phaseTimer >= 4.0) {
        nextState.phase = 'falling_asleep';
        nextState.phaseTimer = 0;
      }
      break;
    }

    case 'falling_asleep': {
      // 3.5 seconds of lying with closed eyes trying to fall asleep
      if (nextState.phaseTimer >= 3.5) {
        const sleepiness = player.needs.sleepiness;
        const pain = player.bodyState?.painLevel || 0;
        
        // 1. Extreme alertness check - too awake to sleep
        if (sleepiness < 25) {
          nextState.phase = 'lying_down';
          nextState.phaseTimer = 0;
          addPlayerNotification(player, 'Вы слишком бодры, чтобы уснуть. Организм полон энергии.', 'warning');
          break;
        }

        // 2. High physical pain check (unless extremely exhausted and passing out)
        if (pain > 30 && sleepiness < 75) {
          nextState.phase = 'lying_down';
          nextState.phaseTimer = 0;
          addPlayerNotification(player, 'Ноющая физическая боль в теле не дает вам провалиться в сон. Требуется обезболивающее.', 'warning');
          break;
        }

        // 3. Random insomnia / low sleepiness check
        if (sleepiness < 45 && Math.random() < 0.4) {
          nextState.phase = 'lying_down';
          nextState.phaseTimer = 0;
          addPlayerNotification(player, 'Вы долго ворочались в темноте, но сон так и не пришел. Мысли мешают уснуть.', 'info');
          break;
        }

        // --- SUCCESSFUL FALLING ASLEEP ---
        nextState.phase = 'deep_sleep';
        nextState.phaseTimer = 0;
        player.isSleeping = true;
        sound.playSleep();

        // Calculate dynamic sleep duration based on physiological needs
        let targetHours = 8.0;
        if (sleepiness >= 80) {
          targetHours = 8.5 + Math.random() * 2.0; // 8.5 to 10.5 hours of heavy sleep
        } else if (sleepiness >= 50) {
          targetHours = 7.0 + Math.random() * 1.5; // 7.0 to 8.5 hours
        } else {
          targetHours = 3.5 + Math.random() * 2.0; // 3.5 to 5.5 hours of light rest
        }

        // Sofa/Couch comfort penalty (shorter sleep and early wakeup)
        const isSofa = nextState.furnitureType === 'sofa';
        if (isSofa) {
          targetHours = Math.max(3.0, targetHours - (1.2 + Math.random() * 0.8));
        }

        // Physical pain penalty (disrupts sleep earlier)
        if (pain > 10) {
          targetHours = Math.max(2.0, targetHours - (pain / 15.0));
        }

        nextState.targetSleepHours = targetHours;
        nextState.totalSleptHours = 0; // reset
      }
      break;
    }

    case 'deep_sleep': {
      // In deep sleep: fast-forward time
      // 1 real second = 0.85 in-game hours
      const hourStep = 0.85 * dt;
      let newHour = (timeHour + hourStep) % 24;
      setTimeHour(newHour);

      nextState.totalSleptHours += hourStep;
      nextState.lastTimeHour = newHour;

      // Restore sleepiness and energy
      player.needs.sleepiness = Math.max(0, player.needs.sleepiness - 13.0 * hourStep);
      player.needs.energy = Math.min(100, player.needs.energy + 14.5 * hourStep);
      player.needs.health = Math.min(100, player.needs.health + 10.0 * hourStep);

      // Realistic slow hunger & thirst drain over sleeping hours
      player.needs.hunger = Math.max(0, player.needs.hunger - 1.8 * hourStep);
      player.needs.thirst = Math.max(0, player.needs.thirst - 2.6 * hourStep);

      // Heal physical injuries and alleviate pain during deep rest
      if (player.bodyState) {
        player.bodyState.painLevel = Math.max(0, player.bodyState.painLevel - 8.0 * hourStep);
        if (player.bodyState.dizziness) {
          player.bodyState.dizziness = Math.max(0, player.bodyState.dizziness - 15.0 * hourStep);
        }
        if (player.bodyState.panicLevel) {
          player.bodyState.panicLevel = Math.max(0, player.bodyState.panicLevel - 20.0 * hourStep);
        }
      }

      // Rotate dream thoughts dynamically every 5 seconds of sleep simulation
      const dreamIndex = Math.floor(nextState.phaseTimer / 5.0) % DREAM_THOUGHTS.length;
      nextState.dreamText = DREAM_THOUGHTS[dreamIndex];

      // Realistic Night Awakening Chance:
      // If sleeping at night (between 02:00 and 04:30) and has slept at least 1.5 hours, and haven't awakened tonight yet
      const isNightTime = (newHour >= 2.0 && newHour <= 4.5);
      const isThirstyOrHungry = player.needs.thirst < 35 || player.needs.hunger < 35;
      const hasPain = (player.bodyState?.painLevel || 0) > 15;

      if (!nextState.awokeAtNight && nextState.totalSleptHours >= 1.8 && (isNightTime && (Math.random() < 0.08 * dt || isThirstyOrHungry || hasPain))) {
        nextState.phase = 'night_awakening';
        nextState.phaseTimer = 0;
        nextState.awokeAtNight = true;
        player.isSleeping = false;

        let reason = NIGHT_AWAKE_REASONS[Math.floor(Math.random() * NIGHT_AWAKE_REASONS.length)];
        if (isThirstyOrHungry) reason = 'Вас разбудила сильная жажда — хочется пить...';
        if (hasPain) reason = 'Вас разбудила ноющая боль в теле...';
        nextState.nightAwakeReason = reason;

        addPlayerNotification(player, `Вы проснулись среди ночи (${formatInGameTime(newHour)}). ${reason}`, 'warning');
        return nextState;
      }

      // Normal target sleep completion (e.g. 7.5 - 8 hours or morning 07:00-08:00)
      if (nextState.totalSleptHours >= nextState.targetSleepHours || (newHour >= 7.0 && newHour <= 7.5 && nextState.totalSleptHours >= 5.0)) {
        return finishSleep(nextState, player);
      }
      break;
    }

    case 'night_awakening': {
      // Sitting in bed at night. Stamina recovers slowly, waiting for player choice
      player.needs.energy = Math.min(100, player.needs.energy + 8 * dt);
      break;
    }

    case 'waking_up': {
      // Displaying morning result card. If player moves or presses space, dismiss
      break;
    }
  }

  return nextState;
}

/**
 * Calculates final sleep quality and wake up outcome
 */
export function finishSleep(bedState: BedSleepState, player: Player): BedSleepState {
  const sleptHours = bedState.totalSleptHours;
  let mood: 'well_rested' | 'slightly_tired' | 'exhausted' | 'overslept' = 'well_rested';
  let message = '';

  if (sleptHours < 3.5) {
    mood = 'exhausted';
    player.needs.sleepiness = Math.max(45, player.needs.sleepiness);
    player.needs.energy = Math.min(55, player.needs.energy);
    message = `Вы поспали всего ${sleptHours.toFixed(1)}ч и проснулись совершенно разбитым и не выспавшимся.`;
    addPlayerNotification(player, message, 'warning');
  } else if (sleptHours < 6.0) {
    mood = 'slightly_tired';
    player.needs.sleepiness = Math.max(20, player.needs.sleepiness);
    player.needs.energy = Math.min(80, player.needs.energy);
    message = `Вы поспали ${sleptHours.toFixed(1)}ч. Чувствуется легкий недосып и усталость.`;
    addPlayerNotification(player, message, 'info');
  } else if (sleptHours <= 9.5) {
    mood = 'well_rested';
    player.needs.sleepiness = 0;
    player.needs.energy = 100;
    player.needs.health = Math.min(100, player.needs.health + 25);
    message = `Вы отлично выспались (${sleptHours.toFixed(1)}ч)! Тело полно сил и бодрости.`;
    addPlayerNotification(player, message, 'sleep');
  } else {
    mood = 'overslept';
    player.needs.sleepiness = 5;
    player.needs.energy = 88;
    message = `Вы проспали слишком долго (${sleptHours.toFixed(1)}ч) — в голове легкая тяжесть от долгого сна.`;
    addPlayerNotification(player, message, 'info');
  }

  player.isSleeping = false;
  player.sleepTimer = 0;

  return {
    ...bedState,
    phase: 'waking_up',
    phaseTimer: 0,
    wakeMood: mood
  };
}

/**
 * Formats time float (0.0 - 23.99) to HH:MM
 */
export function formatInGameTime(timeHour: number): string {
  const h = Math.floor(timeHour);
  const m = Math.floor((timeHour - h) * 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}
