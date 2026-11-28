import {
  Animal,
  AnimalCoatVariant,
  AnimalHabitat,
  AnimalSpecies,
  AnimalTemperament,
  Building,
  GameWorld,
  Pedestrian,
  Player,
  StreetProp,
  Tree,
  Vehicle,
} from './types';
import { getBiomeSampleAt } from './biomeSystem';
import { getUniversalWaterDepthAt } from './riverSystem';
import {
  addOrGrowFluidStain,
  applyVehicleDamageAndDeformation,
  checkPedestrianBuildingCollision,
  checkPedestrianRollingStockCollision,
  checkPedestrianVehicleCollision,
  getPropHitbox,
} from './physics';
import { registerSoftBodyImpactContext } from './softbodyDamage';
import { distributeImpactDamage } from './bodySystem';
import { addPlayerNotification } from './items';
import { PX_S_TO_SPEED_KMH, SPEED_KMH_TO_PX_S } from './vehicleHelpers';
import { sound } from './audio';
import { performanceConfig } from './performanceConfig';
import { ForestSystem } from './forestSystem';
import { SpatialGrid } from './spatialGrid';
import { updateAnimalAnatomy } from './anatomySystem';

interface SpeciesBioConfig {
  nameRu: string;
  nameAccRu: string; // Accusative case for notifications ("Сбит ...")
  habitats: AnimalHabitat[];
  baseMassKg: number;
  baseLengthPx: number;
  baseWidthPx: number;
  maxHp: number;
  walkSpeed: number;     // px/s (1 m = 16 px)
  trotSpeed: number;
  runSpeed: number;
  visionRange: number;
  fidWalk: number;       // Flight Initiation Distance vs slow walking human
  fidSprint: number;     // FID vs sprinting human
  fidVehicle: number;    // Base vehicle scare distance
  alertDist: number;
  herdMin: number;
  herdMax: number;
  activity: 'diurnal' | 'crepuscular' | 'nocturnal' | 'cathemeral';
  diet: 'herbivore' | 'omnivore' | 'carnivore';
  preySpecies: AnimalSpecies[];
  predatorSpecies: AnimalSpecies[];
  canChargeHuman: boolean;
  chargeDist: number;
  attackDamage: number;
  headlightFreezeProb: number;
  zigZagFlight: boolean;
  boundsOnFlee: boolean;
  curlsOnThreat: boolean;
  climbsTrees: boolean;
  temperamentPool: AnimalTemperament[];
  coats: AnimalCoatVariant[];
}

export const ANIMAL_SPECIES_CONFIG: Record<AnimalSpecies, SpeciesBioConfig> = {
  moose: {
    nameRu: 'лось',
    nameAccRu: 'лося',
    habitats: ['forest', 'edge'],
    baseMassKg: 470,
    baseLengthPx: 41,
    baseWidthPx: 14.5,
    maxHp: 320,
    walkSpeed: 24,
    trotSpeed: 68,
    runSpeed: 156,
    visionRange: 260,
    fidWalk: 85,
    fidSprint: 135,
    fidVehicle: 180,
    alertDist: 230,
    herdMin: 1,
    herdMax: 2,
    activity: 'crepuscular',
    diet: 'herbivore',
    preySpecies: [],
    predatorSpecies: ['wolf', 'bear'],
    canChargeHuman: true,
    chargeDist: 92,
    attackDamage: 34,
    headlightFreezeProb: 0.42,
    zigZagFlight: false,
    boundsOnFlee: false,
    curlsOnThreat: false,
    climbsTrees: false,
    temperamentPool: ['cautious', 'territorial', 'territorial'],
    coats: [
      { id: 'dark_bay', baseColor: '#3f2e22', secondaryColor: '#261a12', bellyColor: '#6b5747', accentColor: '#291f19', pattern: 'solid' },
      { id: 'taiga_soot', baseColor: '#352b25', secondaryColor: '#1f1814', bellyColor: '#5c5048', accentColor: '#1c1917', pattern: 'solid' },
      { id: 'russet_elk', baseColor: '#543a27', secondaryColor: '#362316', bellyColor: '#7a6350', accentColor: '#2c1e16', pattern: 'solid' },
    ],
  },
  roe_deer: {
    nameRu: 'косуля',
    nameAccRu: 'косулю',
    habitats: ['forest', 'edge', 'field'],
    baseMassKg: 28,
    baseLengthPx: 20,
    baseWidthPx: 7.4,
    maxHp: 75,
    walkSpeed: 22,
    trotSpeed: 64,
    runSpeed: 172,
    visionRange: 250,
    fidWalk: 110,
    fidSprint: 185,
    fidVehicle: 190,
    alertDist: 240,
    herdMin: 2,
    herdMax: 4,
    activity: 'crepuscular',
    diet: 'herbivore',
    preySpecies: [],
    predatorSpecies: ['wolf', 'dog', 'bear'],
    canChargeHuman: false,
    chargeDist: 0,
    attackDamage: 0,
    headlightFreezeProb: 0.56,
    zigZagFlight: true,
    boundsOnFlee: true,
    curlsOnThreat: false,
    climbsTrees: false,
    temperamentPool: ['timid', 'timid', 'cautious'],
    coats: [
      { id: 'summer_rufous', baseColor: '#9c5c32', secondaryColor: '#78411f', bellyColor: '#d9c5a8', accentColor: '#1c1917', pattern: 'solid' },
      { id: 'amber_doe', baseColor: '#ad6d3b', secondaryColor: '#854d24', bellyColor: '#e5d4b7', accentColor: '#1c1917', pattern: 'solid' },
      { id: 'fawn_russet', baseColor: '#8d532d', secondaryColor: '#693a1d', bellyColor: '#d6c2a3', accentColor: '#1c1917', pattern: 'spotted' },
    ],
  },
  wild_boar: {
    nameRu: 'кабан',
    nameAccRu: 'кабана',
    habitats: ['forest', 'edge'],
    baseMassKg: 135,
    baseLengthPx: 25,
    baseWidthPx: 10.2,
    maxHp: 175,
    walkSpeed: 22,
    trotSpeed: 58,
    runSpeed: 138,
    visionRange: 195,
    fidWalk: 60,
    fidSprint: 95,
    fidVehicle: 145,
    alertDist: 175,
    herdMin: 1,
    herdMax: 4,
    activity: 'crepuscular',
    diet: 'omnivore',
    preySpecies: [],
    predatorSpecies: ['wolf', 'bear'],
    canChargeHuman: true,
    chargeDist: 118,
    attackDamage: 26,
    headlightFreezeProb: 0.14,
    zigZagFlight: false,
    boundsOnFlee: false,
    curlsOnThreat: false,
    climbsTrees: false,
    temperamentPool: ['cautious', 'territorial', 'aggressive', 'aggressive'],
    coats: [
      { id: 'bristle_charcoal', baseColor: '#3b332d', secondaryColor: '#211c19', bellyColor: '#574c44', accentColor: '#573b32', pattern: 'solid' },
      { id: 'rusty_boar', baseColor: '#543c2c', secondaryColor: '#302016', bellyColor: '#6e5240', accentColor: '#5c3c31', pattern: 'solid' },
      { id: 'muddy_sow', baseColor: '#484038', secondaryColor: '#2a241f', bellyColor: '#63584e', accentColor: '#4f3a32', pattern: 'solid' },
    ],
  },
  wolf: {
    nameRu: 'волк',
    nameAccRu: 'волка',
    habitats: ['forest'],
    baseMassKg: 42,
    baseLengthPx: 22,
    baseWidthPx: 7.8,
    maxHp: 115,
    walkSpeed: 28,
    trotSpeed: 74,
    runSpeed: 162,
    visionRange: 285,
    fidWalk: 65,
    fidSprint: 100,
    fidVehicle: 175,
    alertDist: 235,
    herdMin: 2,
    herdMax: 4,
    activity: 'nocturnal',
    diet: 'carnivore',
    preySpecies: ['hare', 'roe_deer', 'sheep', 'fox'],
    predatorSpecies: ['bear'],
    canChargeHuman: true,
    chargeDist: 130,
    attackDamage: 22,
    headlightFreezeProb: 0.12,
    zigZagFlight: false,
    boundsOnFlee: false,
    curlsOnThreat: false,
    climbsTrees: false,
    temperamentPool: ['territorial', 'territorial', 'aggressive', 'cautious'],
    coats: [
      { id: 'timber_grey', baseColor: '#78756e', secondaryColor: '#47443f', bellyColor: '#bdb8ad', accentColor: '#9c968b', pattern: 'saddle' },
      { id: 'taiga_ochre', baseColor: '#8c785c', secondaryColor: '#4f4232', bellyColor: '#cbbba4', accentColor: '#a69174', pattern: 'saddle' },
      { id: 'dark_phase', baseColor: '#43413e', secondaryColor: '#262523', bellyColor: '#78736c', accentColor: '#5c5954', pattern: 'saddle' },
    ],
  },
  bear: {
    nameRu: 'медведь',
    nameAccRu: 'медведя',
    habitats: ['forest'],
    baseMassKg: 265,
    baseLengthPx: 33,
    baseWidthPx: 16.5,
    maxHp: 360,
    walkSpeed: 23,
    trotSpeed: 64,
    runSpeed: 144,
    visionRange: 235,
    fidWalk: 40,
    fidSprint: 55,
    fidVehicle: 135,
    alertDist: 215,
    herdMin: 1,
    herdMax: 1,
    activity: 'crepuscular',
    diet: 'omnivore',
    preySpecies: ['roe_deer', 'wild_boar', 'sheep'],
    predatorSpecies: [],
    canChargeHuman: true,
    chargeDist: 145,
    attackDamage: 42,
    headlightFreezeProb: 0.08,
    zigZagFlight: false,
    boundsOnFlee: false,
    curlsOnThreat: false,
    climbsTrees: false,
    temperamentPool: ['territorial', 'aggressive', 'aggressive'],
    coats: [
      { id: 'russian_brown', baseColor: '#523420', secondaryColor: '#362012', bellyColor: '#69452d', accentColor: '#8c6649', pattern: 'solid' },
      { id: 'dark_taiga', baseColor: '#382519', secondaryColor: '#21150d', bellyColor: '#4f3524', accentColor: '#73533d', pattern: 'solid' },
      { id: 'cinnamon_bear', baseColor: '#6e4527', secondaryColor: '#4a2d18', bellyColor: '#875a38', accentColor: '#a67b56', pattern: 'solid' },
    ],
  },
  fox: {
    nameRu: 'лиса',
    nameAccRu: 'лису',
    habitats: ['edge', 'field', 'forest'],
    baseMassKg: 7.5,
    baseLengthPx: 14.5,
    baseWidthPx: 5.4,
    maxHp: 38,
    walkSpeed: 25,
    trotSpeed: 62,
    runSpeed: 145,
    visionRange: 220,
    fidWalk: 82,
    fidSprint: 140,
    fidVehicle: 150,
    alertDist: 190,
    herdMin: 1,
    herdMax: 1,
    activity: 'crepuscular',
    diet: 'carnivore',
    preySpecies: ['hare', 'squirrel'],
    predatorSpecies: ['wolf', 'dog'],
    canChargeHuman: false,
    chargeDist: 0,
    attackDamage: 0,
    headlightFreezeProb: 0.18,
    zigZagFlight: true,
    boundsOnFlee: false,
    curlsOnThreat: false,
    climbsTrees: false,
    temperamentPool: ['cautious', 'curious', 'timid'],
    coats: [
      { id: 'flame_red', baseColor: '#c9531c', secondaryColor: '#91340f', bellyColor: '#f1f5f9', accentColor: '#1c1917', pattern: 'solid' },
      { id: 'steppe_ochre', baseColor: '#d4742a', secondaryColor: '#9e4c19', bellyColor: '#f5efe6', accentColor: '#1c1917', pattern: 'solid' },
      { id: 'cross_fox', baseColor: '#b04d1f', secondaryColor: '#4a2717', bellyColor: '#e2dcd2', accentColor: '#18181b', pattern: 'saddle' },
    ],
  },
  squirrel: {
    nameRu: 'белка',
    nameAccRu: 'белку',
    habitats: ['forest', 'urban'],
    baseMassKg: 0.4,
    baseLengthPx: 7.8,
    baseWidthPx: 3.4,
    maxHp: 12,
    walkSpeed: 26,
    trotSpeed: 54,
    runSpeed: 98,
    visionRange: 140,
    fidWalk: 64,
    fidSprint: 105,
    fidVehicle: 110,
    alertDist: 125,
    herdMin: 1,
    herdMax: 1,
    activity: 'diurnal',
    diet: 'herbivore',
    preySpecies: [],
    predatorSpecies: ['fox', 'cat', 'dog'],
    canChargeHuman: false,
    chargeDist: 0,
    attackDamage: 0,
    headlightFreezeProb: 0,
    zigZagFlight: false,
    boundsOnFlee: true,
    curlsOnThreat: false,
    climbsTrees: true,
    temperamentPool: ['timid', 'curious'],
    coats: [
      { id: 'rufous_red', baseColor: '#c2410c', secondaryColor: '#7c2d12', bellyColor: '#fef3c7', accentColor: '#ea580c', pattern: 'solid' },
      { id: 'chestnut_pine', baseColor: '#9a3412', secondaryColor: '#5c210e', bellyColor: '#f5ead6', accentColor: '#c2410c', pattern: 'solid' },
    ],
  },
  hedgehog: {
    nameRu: 'ёж',
    nameAccRu: 'ежа',
    habitats: ['edge', 'forest', 'urban'],
    baseMassKg: 0.9,
    baseLengthPx: 6.8,
    baseWidthPx: 4.5,
    maxHp: 16,
    walkSpeed: 13,
    trotSpeed: 22,
    runSpeed: 30,
    visionRange: 80,
    fidWalk: 42,
    fidSprint: 68,
    fidVehicle: 70,
    alertDist: 75,
    herdMin: 1,
    herdMax: 1,
    activity: 'nocturnal',
    diet: 'omnivore',
    preySpecies: [],
    predatorSpecies: ['fox', 'dog'],
    canChargeHuman: false,
    chargeDist: 0,
    attackDamage: 0,
    headlightFreezeProb: 0.5,
    zigZagFlight: false,
    boundsOnFlee: false,
    curlsOnThreat: true,
    climbsTrees: false,
    temperamentPool: ['timid'],
    coats: [
      { id: 'spiny_brown', baseColor: '#574a3e', secondaryColor: '#362c24', bellyColor: '#948372', accentColor: '#d6cbb8', pattern: 'solid' },
      { id: 'dark_quill', baseColor: '#443b34', secondaryColor: '#29221d', bellyColor: '#827366', accentColor: '#cbd5e1', pattern: 'solid' },
    ],
  },
  hare: {
    nameRu: 'заяц',
    nameAccRu: 'зайца',
    habitats: ['field', 'edge', 'forest'],
    baseMassKg: 4.5,
    baseLengthPx: 11.2,
    baseWidthPx: 5.0,
    maxHp: 22,
    walkSpeed: 20,
    trotSpeed: 58,
    runSpeed: 165,
    visionRange: 210,
    fidWalk: 76,
    fidSprint: 135,
    fidVehicle: 145,
    alertDist: 175,
    herdMin: 1,
    herdMax: 2,
    activity: 'crepuscular',
    diet: 'herbivore',
    preySpecies: [],
    predatorSpecies: ['wolf', 'fox', 'dog', 'cat'],
    canChargeHuman: false,
    chargeDist: 0,
    attackDamage: 0,
    headlightFreezeProb: 0.35,
    zigZagFlight: true,
    boundsOnFlee: true,
    curlsOnThreat: false,
    climbsTrees: false,
    temperamentPool: ['timid'],
    coats: [
      { id: 'rusak_agouti', baseColor: '#8c623d', secondaryColor: '#5c3e24', bellyColor: '#e6dccf', accentColor: '#1c1917', pattern: 'solid' },
      { id: 'steppe_sandy', baseColor: '#9e7a52', secondaryColor: '#6e5235', bellyColor: '#ede4d5', accentColor: '#1c1917', pattern: 'solid' },
    ],
  },
  cow: {
    nameRu: 'корова',
    nameAccRu: 'корову',
    habitats: ['field'],
    baseMassKg: 540,
    baseLengthPx: 37,
    baseWidthPx: 15.5,
    maxHp: 350,
    walkSpeed: 18,
    trotSpeed: 48,
    runSpeed: 92,
    visionRange: 175,
    fidWalk: 28,
    fidSprint: 74,
    fidVehicle: 105,
    alertDist: 130,
    herdMin: 3,
    herdMax: 6,
    activity: 'diurnal',
    diet: 'herbivore',
    preySpecies: [],
    predatorSpecies: ['wolf', 'bear'],
    canChargeHuman: false,
    chargeDist: 0,
    attackDamage: 0,
    headlightFreezeProb: 0.28,
    zigZagFlight: false,
    boundsOnFlee: false,
    curlsOnThreat: false,
    climbsTrees: false,
    temperamentPool: ['curious', 'cautious', 'friendly'],
    coats: [
      { id: 'holstein', baseColor: '#f1f5f9', secondaryColor: '#1c1917', bellyColor: '#e2e8f0', accentColor: '#d6a39a', pattern: 'piebald' },
      { id: 'simmental', baseColor: '#f5efe6', secondaryColor: '#a65429', bellyColor: '#ebe2d5', accentColor: '#e0b0a4', pattern: 'piebald' },
      { id: 'brown_swiss', baseColor: '#7a573d', secondaryColor: '#543925', bellyColor: '#99775c', accentColor: '#36271f', pattern: 'solid' },
      { id: 'jersey_cream', baseColor: '#b88958', secondaryColor: '#8c6239', bellyColor: '#d4b28a', accentColor: '#29201b', pattern: 'solid' },
    ],
  },
  sheep: {
    nameRu: 'овца',
    nameAccRu: 'овцу',
    habitats: ['field'],
    baseMassKg: 58,
    baseLengthPx: 20,
    baseWidthPx: 10.6,
    maxHp: 85,
    walkSpeed: 19,
    trotSpeed: 54,
    runSpeed: 104,
    visionRange: 185,
    fidWalk: 48,
    fidSprint: 105,
    fidVehicle: 120,
    alertDist: 155,
    herdMin: 4,
    herdMax: 8,
    activity: 'diurnal',
    diet: 'herbivore',
    preySpecies: [],
    predatorSpecies: ['wolf', 'dog', 'bear'],
    canChargeHuman: false,
    chargeDist: 0,
    attackDamage: 0,
    headlightFreezeProb: 0.25,
    zigZagFlight: false,
    boundsOnFlee: false,
    curlsOnThreat: false,
    climbsTrees: false,
    temperamentPool: ['timid', 'cautious'],
    coats: [
      { id: 'merino_cream', baseColor: '#efeae0', secondaryColor: '#d1c8b8', bellyColor: '#dfd8cb', accentColor: '#292524', pattern: 'solid' },
      { id: 'romanov_grey', baseColor: '#a8a29e', secondaryColor: '#78716c', bellyColor: '#c7c2be', accentColor: '#1c1917', pattern: 'solid' },
      { id: 'white_face', baseColor: '#f5f2eb', secondaryColor: '#d6d0c4', bellyColor: '#e8e3d9', accentColor: '#c7b8a3', pattern: 'solid' },
    ],
  },
  horse: {
    nameRu: 'лошадь',
    nameAccRu: 'лошадь',
    habitats: ['field'],
    baseMassKg: 490,
    baseLengthPx: 39,
    baseWidthPx: 13.5,
    maxHp: 330,
    walkSpeed: 26,
    trotSpeed: 76,
    runSpeed: 185,
    visionRange: 250,
    fidWalk: 38,
    fidSprint: 110,
    fidVehicle: 145,
    alertDist: 190,
    herdMin: 2,
    herdMax: 4,
    activity: 'diurnal',
    diet: 'herbivore',
    preySpecies: [],
    predatorSpecies: ['wolf', 'bear'],
    canChargeHuman: false,
    chargeDist: 0,
    attackDamage: 0,
    headlightFreezeProb: 0.16,
    zigZagFlight: false,
    boundsOnFlee: false,
    curlsOnThreat: false,
    climbsTrees: false,
    temperamentPool: ['curious', 'cautious', 'friendly'],
    coats: [
      { id: 'bay', baseColor: '#784021', secondaryColor: '#4d2511', bellyColor: '#8c5332', accentColor: '#181311', pattern: 'solid' },
      { id: 'chestnut', baseColor: '#9c4e24', secondaryColor: '#733516', bellyColor: '#b3663b', accentColor: '#592912', pattern: 'solid' },
      { id: 'dapple_grey', baseColor: '#cbd5e1', secondaryColor: '#94a3b8', bellyColor: '#e2e8f0', accentColor: '#475569', pattern: 'dapple' },
      { id: 'black_steed', baseColor: '#272320', secondaryColor: '#171412', bellyColor: '#3b3632', accentColor: '#0c0a09', pattern: 'solid' },
      { id: 'pinto', baseColor: '#f1ede6', secondaryColor: '#6b3a1e', bellyColor: '#f8fafc', accentColor: '#291a12', pattern: 'piebald' },
    ],
  },
  dog: {
    nameRu: 'собака',
    nameAccRu: 'собаку',
    habitats: ['urban', 'edge', 'field'],
    baseMassKg: 23,
    baseLengthPx: 16.5,
    baseWidthPx: 6.8,
    maxHp: 70,
    walkSpeed: 28,
    trotSpeed: 68,
    runSpeed: 142,
    visionRange: 230,
    fidWalk: 28,
    fidSprint: 55,
    fidVehicle: 95,
    alertDist: 175,
    herdMin: 1,
    herdMax: 3,
    activity: 'cathemeral',
    diet: 'omnivore',
    preySpecies: ['cat', 'hare', 'squirrel'],
    predatorSpecies: ['wolf', 'bear'],
    canChargeHuman: true,
    chargeDist: 115,
    attackDamage: 14,
    headlightFreezeProb: 0.06,
    zigZagFlight: false,
    boundsOnFlee: false,
    curlsOnThreat: false,
    climbsTrees: false,
    temperamentPool: ['friendly', 'curious', 'territorial', 'territorial', 'cautious'],
    coats: [
      { id: 'shepherd_saddle', baseColor: '#b88346', secondaryColor: '#26211d', bellyColor: '#d9b584', accentColor: '#26211d', pattern: 'saddle', collarColor: '#b91c1c' },
      { id: 'courtyard_ginger', baseColor: '#c47933', secondaryColor: '#8c4f1c', bellyColor: '#e6be8a', accentColor: '#3b2618', pattern: 'solid' },
      { id: 'spotted_mutt', baseColor: '#ece7df', secondaryColor: '#4f3a2a', bellyColor: '#f8fafc', accentColor: '#29221d', pattern: 'spotted', collarColor: '#1d4ed8' },
      { id: 'dark_stray', baseColor: '#36322e', secondaryColor: '#1f1c1a', bellyColor: '#635c55', accentColor: '#18181b', pattern: 'solid' },
      { id: 'husky_mix', baseColor: '#64748b', secondaryColor: '#334155', bellyColor: '#f1f5f9', accentColor: '#1e293b', pattern: 'saddle', collarColor: '#15803d' },
    ],
  },
  cat: {
    nameRu: 'кошка',
    nameAccRu: 'кошку',
    habitats: ['urban', 'edge'],
    baseMassKg: 4.5,
    baseLengthPx: 10.6,
    baseWidthPx: 4.4,
    maxHp: 26,
    walkSpeed: 22,
    trotSpeed: 54,
    runSpeed: 124,
    visionRange: 175,
    fidWalk: 32,
    fidSprint: 86,
    fidVehicle: 115,
    alertDist: 145,
    herdMin: 1,
    herdMax: 1,
    activity: 'cathemeral',
    diet: 'carnivore',
    preySpecies: ['squirrel'],
    predatorSpecies: ['dog', 'fox', 'wolf'],
    canChargeHuman: false,
    chargeDist: 0,
    attackDamage: 0,
    headlightFreezeProb: 0.14,
    zigZagFlight: true,
    boundsOnFlee: false,
    curlsOnThreat: false,
    climbsTrees: false,
    temperamentPool: ['cautious', 'curious', 'friendly', 'timid'],
    coats: [
      { id: 'ginger_tabby', baseColor: '#d97724', secondaryColor: '#9c4511', bellyColor: '#f7d5a8', accentColor: '#c25917', pattern: 'tabby' },
      { id: 'mackerel_grey', baseColor: '#8c929c', secondaryColor: '#454a54', bellyColor: '#cbd5e1', accentColor: '#334155', pattern: 'tabby' },
      { id: 'tuxedo', baseColor: '#1e1e24', secondaryColor: '#09090b', bellyColor: '#f8fafc', accentColor: '#f8fafc', pattern: 'tuxedo' },
      { id: 'calico', baseColor: '#f8fafc', secondaryColor: '#d97724', bellyColor: '#f8fafc', accentColor: '#27272a', pattern: 'calico' },
      { id: 'solid_black', baseColor: '#1c1b20', secondaryColor: '#0f0e12', bellyColor: '#2d2c33', accentColor: '#09090b', pattern: 'solid' },
    ],
  },
};

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

function wrapAngleDiff(target: number, current: number): number {
  let d = (target - current) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

type VehicleImpactClass = 'motorcycle' | 'compact_car' | 'suv_van' | 'heavy_truck';

function classifyVehicle(v: Vehicle): { cls: VehicleImpactClass; massKg: number; isLoud: boolean } {
  const t = (v.type || '').toLowerCase();
  if (
    t.includes('moto') ||
    t.includes('moped') ||
    t.includes('bike') ||
    t.includes('ural_m') ||
    t.includes('izh') ||
    t.includes('jawa') ||
    t.includes('minsk') ||
    t.includes('alpha')
  ) {
    return { cls: 'motorcycle', massKg: Math.max(110, v.mass || 210), isLoud: true };
  }
  if (
    t.includes('truck') ||
    t.includes('kamaz') ||
    t.includes('ural') ||
    t.includes('zil') ||
    t.includes('maz') ||
    t.includes('kraz') ||
    t.includes('tractor') ||
    t.includes('mtz') ||
    t.includes('kirovets') ||
    t.includes('excavator') ||
    t.includes('bus') ||
    t.includes('fire') ||
    t.includes('garbage') ||
    t.includes('cement') ||
    t.includes('crane') ||
    t.includes('vacuum') ||
    t.includes('trailer') ||
    (v.mass || 0) >= 4200
  ) {
    return { cls: 'heavy_truck', massKg: Math.max(4500, v.mass || 9500), isLoud: true };
  }
  if (
    t.includes('gazelle') ||
    t.includes('van') ||
    t.includes('uaz') ||
    t.includes('niva') ||
    t.includes('suv') ||
    t.includes('pickup') ||
    t.includes('ambulance') ||
    (v.mass || 0) >= 2100
  ) {
    return { cls: 'suv_van', massKg: Math.max(1950, v.mass || 2400), isLoud: false };
  }
  return { cls: 'compact_car', massKg: Math.max(850, v.mass || 1320), isLoud: false };
}

function getCircadianActivityMultiplier(activity: SpeciesBioConfig['activity'], timeHour: number): number {
  const h = ((timeHour % 24) + 24) % 24;
  if (activity === 'diurnal') {
    return h >= 6 && h <= 20.5 ? 1.0 : 0.22;
  }
  if (activity === 'nocturnal') {
    return h < 6 || h > 20 ? 1.0 : 0.24;
  }
  if (activity === 'crepuscular') {
    const dawn = Math.max(0, 1 - Math.abs(h - 6.5) / 3.2);
    const dusk = Math.max(0, 1 - Math.abs(h - 20.0) / 3.2);
    return 0.42 + 0.58 * Math.max(dawn, dusk);
  }
  return 0.78;
}

export class AnimalSystem {
  private static nextAnimalId = 1;
  private static nextGroupId = 1;
  private static spawnCooldown = 0;
  private static lastGlobalVocalSec = 0;
  private static scratchVehicles: Vehicle[] = [];
  private static scratchBuildings: Building[] = [];
  private static scratchProps: StreetProp[] = [];
  private static scratchPeds: Pedestrian[] = [];

  private static findNearestTree(world: GameWorld, x: number, y: number, maxDist: number): Tree | null {
    const trees = world.trees;
    if (!trees || trees.length === 0) return null;
    let best: Tree | null = null;
    let bestSq = maxDist * maxDist;
    // Stride if massive tree array without tree grid
    const step = trees.length > 6000 ? 3 : 1;
    for (let i = 0; i < trees.length; i += step) {
      const t = trees[i];
      const dx = t.x - x;
      const dy = t.y - y;
      const dSq = dx * dx + dy * dy;
      if (dSq < bestSq) {
        bestSq = dSq;
        best = t;
      }
    }
    return best;
  }

  private static isPointInsideAnyBuilding(
    x: number,
    y: number,
    pad: number,
    world: GameWorld,
    bldGrid?: SpatialGrid<Building>
  ): boolean {
    const blds = bldGrid ? bldGrid.queryRadius(x, y, 160, this.scratchBuildings) : world.buildings;
    for (let i = 0; i < blds.length; i++) {
      const b = blds[i];
      if (x > b.x - pad && x < b.x + b.width + pad && y > b.y - pad && y < b.y + b.height + pad) {
        return true;
      }
    }
    return false;
  }

  private static isPointOnPavedRoad(x: number, y: number, world: GameWorld): boolean {
    const roads = world.roads;
    if (!roads) return false;
    for (let i = 0; i < roads.length; i++) {
      const r = roads[i];
      if (r.isDirt) continue;
      const halfW = (r.width || 44) * 0.52 + 12;
      if (r._minX !== undefined && r._maxX !== undefined && r._minY !== undefined && r._maxY !== undefined) {
        if (x < r._minX - halfW || x > r._maxX + halfW || y < r._minY - halfW || y > r._maxY + halfW) continue;
      }
      if (r.curvePoints && r.curvePoints.length >= 2) {
        for (let k = 0; k < r.curvePoints.length - 1; k++) {
          const p1 = r.curvePoints[k];
          const p2 = r.curvePoints[k + 1];
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const lenSq = dx * dx + dy * dy;
          if (lenSq < 1) continue;
          const t = clamp(((x - p1.x) * dx + (y - p1.y) * dy) / lenSq, 0, 1);
          const dSq = (x - (p1.x + dx * t)) ** 2 + (y - (p1.y + dy * t)) ** 2;
          if (dSq < halfW * halfW) return true;
        }
      } else if (r.x1 !== undefined && r.x2 !== undefined && r.y1 !== undefined && r.y2 !== undefined) {
        const dx = r.x2 - r.x1;
        const dy = r.y2 - r.y1;
        const lenSq = dx * dx + dy * dy;
        if (lenSq < 1) continue;
        const t = clamp(((x - r.x1) * dx + (y - r.y1) * dy) / lenSq, 0, 1);
        const dSq = (x - (r.x1 + dx * t)) ** 2 + (y - (r.y1 + dy * t)) ** 2;
        if (dSq < halfW * halfW) return true;
      }
    }
    return false;
  }

  private static createAnimal(
    species: AnimalSpecies,
    habitat: AnimalHabitat,
    x: number,
    y: number,
    groupId: string | undefined,
    isLeader: boolean,
    forceJuvenile: boolean = false
  ): Animal {
    const cfg = ANIMAL_SPECIES_CONFIG[species];
    const seed = (Math.floor(Math.random() * 1_000_000) ^ (this.nextAnimalId * 7919)) >>> 0;
    const sex: 'male' | 'female' = seed % 2 === 0 ? 'male' : 'female';
    const ageRoll = (seed % 100) / 100;
    const age: 'juvenile' | 'adult' | 'elder' = forceJuvenile
      ? 'juvenile'
      : ageRoll < 0.16
        ? 'juvenile'
        : ageRoll > 0.88
          ? 'elder'
          : 'adult';

    // Natural biological size & mass variation
    const ageScale = age === 'juvenile' ? 0.72 : age === 'elder' ? 1.04 : 1.0;
    const sexScale = sex === 'male' && (species === 'moose' || species === 'bear' || species === 'wild_boar' || species === 'roe_deer') ? 1.08 : 0.96;
    const indivScale = 0.92 + ((seed % 17) / 100);
    const sizeScale = clamp(ageScale * sexScale * indivScale, 0.65, 1.22);

    const coat = cfg.coats[seed % cfg.coats.length];
    const temperament = cfg.temperamentPool[seed % cfg.temperamentPool.length];
    const massKg = Math.round(cfg.baseMassKg * sizeScale * sizeScale * 10) / 10;
    const bodyLength = cfg.baseLengthPx * sizeScale;
    const bodyWidth = cfg.baseWidthPx * sizeScale;
    const radius = Math.max(2.6, Math.min(bodyLength, bodyWidth) * 0.56);
    const maxHp = Math.round(cfg.maxHp * sizeScale);

    return {
      id: `animal_${species}_${this.nextAnimalId++}`,
      species,
      habitat,
      groupId,
      isGroupLeader: isLeader,
      x,
      y,
      vx: 0,
      vy: 0,
      z: 0,
      vz: 0,
      angle: Math.random() * Math.PI * 2,
      angularVelocity: 0,
      homeX: x,
      homeY: y,
      seed,
      sex,
      age,
      sizeScale,
      massKg,
      bodyLength,
      bodyWidth,
      radius,
      coat,
      hasAntlers: (species === 'moose' || species === 'roe_deer') && sex === 'male' && age !== 'juvenile',
      hasHorns: species === 'cow' && age !== 'juvenile' && seed % 3 !== 0,
      hasTusks: species === 'wild_boar' && sex === 'male' && age !== 'juvenile',
      temperament,
      hp: maxHp,
      maxHp,
      injuryLevel: 0,
      hunger: 0.25 + Math.random() * 0.45,
      thirst: 0.15 + Math.random() * 0.35,
      fatigue: Math.random() * 0.35,
      fear: 0,
      curiosity: temperament === 'curious' || temperament === 'friendly' ? 0.65 : 0.2,
      aggression: temperament === 'aggressive' ? 0.72 : temperament === 'territorial' ? 0.45 : 0.08,
      state: 'idle',
      stateTimer: 1.0 + Math.random() * 2.5,
      alarmDelay: 0,
      headlightFreezeTimer: 0,
      zigZagTimer: 0,
      zigZagSign: seed % 2 === 0 ? 1 : -1,
      attackCooldown: 0,
      lastVocalTime: -10,
      lastHitTime: -10,
      knockdownTimer: 0,
      deadTimer: 0,
      deathSide: seed % 2 === 0 ? 1 : -1,
      crushedLevel: 0,
      gaitPhase: Math.random() * Math.PI * 2,
      gaitType: 'stand',
      spineBend: 0,
      headYaw: 0,
      targetHeadYaw: 0,
      headPitch: 0,
      earAlert: 0.4,
      tailPhase: Math.random() * Math.PI * 2,
      tailWagSpeed: 3.0,
      tailHeight: 0.5,
      breathPhase: Math.random() * Math.PI * 2,
      eyeShineIntensity: 0,
    };
  }

  private static pickSpeciesForLocation(
    x: number,
    y: number,
    world: GameWorld,
    timeHour: number
  ): { species: AnimalSpecies; habitat: AnimalHabitat } | null {
    const biome = getBiomeSampleAt(x, y);
    if (biome.industrialWeight > 0.62 || biome.saltWeight > 0.65) {
      // Sparse strays only in industrial outskirts
      if (Math.random() < 0.25) return { species: 'dog', habitat: 'urban' };
      return null;
    }

    const isNight = timeHour < 6 || timeHour > 20.5;
    const isCrepuscular = (timeHour >= 4.5 && timeHour <= 8.5) || (timeHour >= 18.0 && timeHour <= 22.5);

    // 1. Urban & Courtyard Zone (Dogs, Cats, Park Squirrels, Nocturnal Hedgehogs)
    if (biome.urbanWeight > 0.35) {
      const r = Math.random();
      if (r < 0.42) return { species: 'dog', habitat: 'urban' };
      if (r < 0.80) return { species: 'cat', habitat: 'urban' };
      if (!isNight && r < 0.93) return { species: 'squirrel', habitat: 'urban' };
      return { species: 'hedgehog', habitat: 'urban' };
    }

    // 2. Dense Boreal / Pine Forest (Moose, Roe Deer, Boar, Wolf, Bear, Squirrel, Fox, Hare, Hedgehog)
    if (biome.forestWeight > 0.45) {
      const pool: [AnimalSpecies, number][] = [
        ['roe_deer', 20],
        ['squirrel', isNight ? 4 : 18],
        ['wild_boar', 22],
        ['moose', isCrepuscular ? 16 : 12],
        ['fox', 11],
        ['hare', 10],
        ['wolf', isNight ? 22 : 12],
        ['bear', biome.forestWeight > 0.60 ? 10 : 5],
        ['hedgehog', isNight ? 9 : 3],
      ];
      return { species: this.weightedPick(pool), habitat: 'forest' };
    }

    // 3. Woodland / Forest-Steppe Edge & Cottage Settlement Belt
    if (biome.woodlandWeight > 0.38) {
      const pool: [AnimalSpecies, number][] = [
        ['roe_deer', 20],
        ['fox', 15],
        ['hare', 16],
        ['wild_boar', 16],
        ['wolf', isNight ? 10 : 4],
        ['squirrel', isNight ? 3 : 13],
        ['dog', 14],
        ['cat', 9],
        ['moose', 8],
        ['hedgehog', isNight ? 10 : 4],
      ];
      return { species: this.weightedPick(pool), habitat: 'edge' };
    }

    // 4. Open Fields, Meadows & Steppe (Cows, Sheep, Horses, Hares, Foxes, Roe Deer, Rural Dogs)
    if (biome.meadowWeight + biome.steppeWeight > 0.35) {
      const pool: [AnimalSpecies, number][] = [
        ['cow', 24],
        ['sheep', 22],
        ['horse', 18],
        ['hare', 22],
        ['fox', 14],
        ['roe_deer', 10],
        ['dog', 7],
      ];
      return { species: this.weightedPick(pool), habitat: 'field' };
    }

    // Fallback open countryside
    return { species: Math.random() < 0.5 ? 'hare' : 'fox', habitat: 'field' };
  }

  private static weightedPick(entries: [AnimalSpecies, number][]): AnimalSpecies {
    let total = 0;
    for (let i = 0; i < entries.length; i++) total += entries[i][1];
    let r = Math.random() * total;
    for (let i = 0; i < entries.length; i++) {
      r -= entries[i][1];
      if (r <= 0) return entries[i][0];
    }
    return entries[0][0];
  }

  private static trySpawnEcologicalGroup(
    world: GameWorld,
    anchorX: number,
    anchorY: number,
    minDist: number,
    maxDist: number,
    bldGrid?: SpatialGrid<Building>
  ) {
    if (!world.animals) world.animals = [];
    const timeHour = world.timeHour ?? 12;

    for (let attempt = 0; attempt < 6; attempt++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = minDist + Math.random() * (maxDist - minDist);
      const sx = clamp(anchorX + Math.cos(ang) * dist, 120, world.width - 120);
      const sy = clamp(anchorY + Math.sin(ang) * dist, 120, world.height - 120);

      // Avoid deep water & building footprints
      if (getUniversalWaterDepthAt(world, sx, sy) > 0.25) continue;
      if (this.isPointInsideAnyBuilding(sx, sy, 18, world, bldGrid)) continue;
      // Avoid spawning herds directly in the middle of asphalt highways
      if (this.isPointOnPavedRoad(sx, sy, world)) continue;

      const pick = this.pickSpeciesForLocation(sx, sy, world, timeHour);
      if (!pick) continue;

      const cfg = ANIMAL_SPECIES_CONFIG[pick.species];

      // Squirrels anchor right beside an actual tree!
      let finalX = sx;
      let finalY = sy;
      let treeRef: Tree | null = null;
      if (pick.species === 'squirrel') {
        treeRef = this.findNearestTree(world, sx, sy, 220);
        if (!treeRef) continue;
        const ta = Math.random() * Math.PI * 2;
        const tr = (treeRef.radius || 16) * 0.72 + 5;
        finalX = treeRef.x + Math.cos(ta) * tr;
        finalY = treeRef.y + Math.sin(ta) * tr;
      }

      const maxCap = performanceConfig.maxActiveAnimals || 52;
      const remaining = maxCap - world.animals.length;
      if (remaining <= 0) return;

      const groupSize = Math.min(
        remaining,
        cfg.herdMin + Math.floor(Math.random() * (cfg.herdMax - cfg.herdMin + 1))
      );
      const groupId = groupSize > 1 ? `herd_${pick.species}_${this.nextGroupId++}` : undefined;

      for (let m = 0; m < groupSize; m++) {
        const offsetAng = Math.random() * Math.PI * 2;
        const offsetDist = m === 0 ? 0 : 18 + Math.random() * 34;
        const mx = clamp(finalX + Math.cos(offsetAng) * offsetDist, 100, world.width - 100);
        const my = clamp(finalY + Math.sin(offsetAng) * offsetDist, 100, world.height - 100);
        if (m > 0 && (getUniversalWaterDepthAt(world, mx, my) > 0.25 || this.isPointInsideAnyBuilding(mx, my, 12, world, bldGrid))) {
          continue;
        }
        // Family herd realism: cow+calf, deer+fawn, boar+piglets
        const isFamilyJuvenile = m >= 2 && (pick.species === 'wild_boar' || pick.species === 'roe_deer' || pick.species === 'cow' || pick.species === 'sheep');
        const animal = this.createAnimal(pick.species, pick.habitat, mx, my, groupId, m === 0, isFamilyJuvenile);
        if (treeRef && pick.species === 'squirrel') {
          animal.homeX = treeRef.x;
          animal.homeY = treeRef.y;
          animal.perchTreeId = treeRef.id;
        }
        world.animals.push(animal);
      }
      return;
    }
  }

  private static emitVocalThrottled(
    a: Animal,
    mood: 'calm' | 'alert' | 'angry' | 'hurt',
    listenerX: number,
    listenerY: number,
    nowSec: number
  ) {
    if (nowSec - a.lastVocalTime < (mood === 'hurt' ? 0.5 : 4.2)) return;
    if (mood !== 'hurt' && nowSec - this.lastGlobalVocalSec < 1.15) return;
    const dist = Math.hypot(a.x - listenerX, a.y - listenerY);
    const maxHearDist = a.species === 'wolf' ? 880 : a.species === 'cow' || a.species === 'horse' || a.species === 'bear' ? 540 : 380;
    if (dist > maxHearDist) return;
    a.lastVocalTime = nowSec;
    this.lastGlobalVocalSec = nowSec;
    const atten = clamp(1.0 - dist / maxHearDist, 0.05, 1.0);
    sound.playAnimalVocalization(a.species, mood, atten);
  }

  private static triggerHerdAlarmCascade(
    world: GameWorld,
    source: Animal,
    threatX: number,
    threatY: number
  ) {
    const animals = world.animals;
    if (!animals) return;
    for (let i = 0; i < animals.length; i++) {
      const other = animals[i];
      if (other === source || other.state === 'dead' || other.state === 'knocked_down' || other.state === 'fleeing' || other.state === 'charging') continue;
      if (other.alarmDelay > 0) continue;
      const d = Math.hypot(other.x - source.x, other.y - source.y);
      const sameGroup = Boolean(source.groupId && other.groupId === source.groupId);
      const sameSpecies = other.species === source.species;
      if ((sameGroup && d < 210) || (sameSpecies && d < 120) || (ANIMAL_SPECIES_CONFIG[other.species].diet === 'herbivore' && d < 85)) {
        other.alarmDelay = 0.08 + d * 0.0014 + Math.random() * 0.14;
        other.threatX = threatX;
        other.threatY = threatY;
        other.fear = Math.max(other.fear, 0.72);
        other.earAlert = 1.0;
      }
    }
  }

  private static triggerPackChargeCascade(
    world: GameWorld,
    source: Animal,
    threatX: number,
    threatY: number
  ) {
    const animals = world.animals;
    if (!animals) return;
    for (let i = 0; i < animals.length; i++) {
      const other = animals[i];
      if (other === source || other.state === 'dead' || other.state === 'knocked_down' || other.state === 'charging') continue;
      const otherCfg = ANIMAL_SPECIES_CONFIG[other.species];
      if (!otherCfg.canChargeHuman) continue;
      if (other.temperament === 'timid' || other.temperament === 'friendly') continue;
      const sameGroup = Boolean(source.groupId && other.groupId === source.groupId);
      const sameSpecies = other.species === source.species;
      if (!sameGroup && !sameSpecies) continue;
      const d = Math.hypot(other.x - source.x, other.y - source.y);
      if ((sameGroup && d < 230) || (sameSpecies && d < 140)) {
        other.state = 'charging';
        other.threatX = threatX;
        other.threatY = threatY;
        other.stateTimer = 4.2;
        other.alarmDelay = 0;
        other.earAlert = 0.1;
        other.tailHeight = 0.85;
      }
    }
  }

  private static spawnAnimalImpactParticles(
    world: GameWorld,
    x: number,
    y: number,
    nx: number,
    ny: number,
    animal: Animal,
    severity: number,
    glassBurst: boolean
  ) {
    if (!world.particles) return;
    const count = Math.min(14, Math.floor(4 + severity * 10));
    for (let i = 0; i < count; i++) {
      const spread = (Math.random() - 0.5) * 1.5;
      const baseAng = Math.atan2(ny, nx) + spread;
      const spd = 25 + Math.random() * (65 + severity * 95);
      const isBloodDrop = severity > 0.35 && i % 2 === 0;
      world.particles.push({
        x: x + (Math.random() - 0.5) * 4,
        y: y + (Math.random() - 0.5) * 4,
        vx: Math.cos(baseAng) * spd,
        vy: Math.sin(baseAng) * spd,
        radius: isBloodDrop ? 1.3 + Math.random() * 1.4 : 1.6 + Math.random() * 1.4,
        color: isBloodDrop ? '#7f1d1d' : animal.coat.baseColor,
        secondaryColor: isBloodDrop ? '#450a0a' : animal.coat.secondaryColor,
        alpha: 0.9,
        life: 0,
        maxLife: isBloodDrop ? 0.55 + Math.random() * 0.45 : 0.9 + Math.random() * 0.8,
        type: isBloodDrop ? 'debris' : 'feather',
        debrisSubtype: isBloodDrop ? 'liquid_drop' : undefined,
        angle: Math.random() * Math.PI * 2,
        angularVelocity: (Math.random() - 0.5) * 14,
        z: 1.5 + Math.random() * 3.0,
        vz: 14 + Math.random() * 28,
        bounces: 1,
      });
    }

    if (glassBurst) {
      for (let g = 0; g < 10; g++) {
        const ang = Math.atan2(ny, nx) + (Math.random() - 0.5) * 1.8;
        const spd = 40 + Math.random() * 110;
        world.particles.push({
          x,
          y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          radius: 1.1 + Math.random() * 1.1,
          color: '#e0f2fe',
          secondaryColor: '#94a3b8',
          alpha: 0.85,
          life: 0,
          maxLife: 1.2 + Math.random() * 1.5,
          type: 'glass_shard',
          glassSubtype: 'headlight',
          angle: Math.random() * Math.PI * 2,
          angularVelocity: (Math.random() - 0.5) * 22,
          z: 2.0 + Math.random() * 3.0,
          vz: 18 + Math.random() * 30,
          bounces: 2,
        });
      }
    }
  }

  /**
   * Resolves physically accurate, vehicle-class-dependent collisions between an animal and vehicles/trains.
   */
  private static resolveVehicleAndTrainCollisions(
    a: Animal,
    world: GameWorld,
    player: Player,
    vehGrid: SpatialGrid<Vehicle> | undefined,
    nowSec: number
  ) {
    const cfg = ANIMAL_SPECIES_CONFIG[a.species];
    const nearbyCars = vehGrid ? vehGrid.queryRadius(a.x, a.y, 92, this.scratchVehicles) : world.vehicles;

    for (let i = 0; i < nearbyCars.length; i++) {
      const car = nearbyCars[i];
      const res = checkPedestrianVehicleCollision(a.x, a.y, a.radius, car);
      if (!res.collided) continue;

      const carVx = car.vx || Math.cos(car.angle) * (car.speed || 0);
      const carVy = car.vy || Math.sin(car.angle) * (car.speed || 0);
      const relVx = carVx - a.vx;
      const relVy = carVy - a.vy;
      const normalImpactPxS = relVx * res.normalX + relVy * res.normalY;
      const tangentialPxS = Math.abs(-relVx * res.normalY + relVy * res.normalX);
      const impactKmh = Math.max(0, normalImpactPxS) * PX_S_TO_SPEED_KMH;
      const { cls, massKg: vehMass } = classifyVehicle(car);

      // Push animal outside vehicle polygon unless it is small and being run over underneath a heavy high-clearance truck
      const isUnderWheelCrush =
        cls === 'heavy_truck' && a.massKg < 40 && Math.hypot(carVx, carVy) * PX_S_TO_SPEED_KMH > 12;

      if (!isUnderWheelCrush) {
        a.x = res.x;
        a.y = res.y;
      }

      if (impactKmh < 5 && !isUnderWheelCrush) {
        // Gentle brush against stationary or crawling car -> step aside
        if (a.state !== 'dead' && a.state !== 'knocked_down') {
          a.vx += res.normalX * 22;
          a.vy += res.normalY * 22;
          if (Math.hypot(carVx, carVy) > 5) {
            a.state = 'fleeing';
            a.threatX = car.x;
            a.threatY = car.y;
            a.stateTimer = 3.2;
          }
        }
        continue;
      }

      if (nowSec - a.lastHitTime < 0.42) continue;
      a.lastHitTime = nowSec;
      a.hitByVehicleClass = cls;

      const effectiveKmh = Math.max(impactKmh, isUnderWheelCrush ? Math.hypot(carVx, carVy) * PX_S_TO_SPEED_KMH : 0);
      const massRatio = a.massKg / (vehMass + a.massKg);
      const isPlayerCar = Boolean(car.isPlayerControlled || (player.isInVehicle && player.currentVehicleId === car.id));

      // --- A. LIGHT BUMPER NUDGE (5..14 km/h) ---
      if (effectiveKmh < 14 && !isUnderWheelCrush) {
        const pushSpeed = clamp(effectiveKmh * 5.2, 28, 85);
        a.vx = res.normalX * pushSpeed + carVx * 0.35;
        a.vy = res.normalY * pushSpeed + carVy * 0.35;
        if (a.state !== 'dead' && a.state !== 'knocked_down') {
          a.fear = 1.0;
          a.state = cfg.canChargeHuman && a.massKg > 90 && Math.random() < 0.35 ? 'charging' : 'fleeing';
          a.threatX = car.x;
          a.threatY = car.y;
          a.stateTimer = 4.5;
          this.triggerHerdAlarmCascade(world, a, car.x, car.y);
          this.emitVocalThrottled(a, 'alert', player.x, player.y, nowSec);
        }
        sound.playAnimalImpact(a.massKg, 0.2);
        continue;
      }

      // --- B. SIGNIFICANT COLLISION / RUN-OVER (>= 14 km/h) ---
      // Animal trauma scales with impact kinetic energy and vehicle mass advantage
      const vehAdvantage = clamp(Math.pow(vehMass / Math.max(12, a.massKg), 0.28), 0.72, 2.35);
      const rawDamage = (effectiveKmh - 8) * 2.55 * vehAdvantage * (isUnderWheelCrush ? 2.4 : 1.0);
      a.hp = Math.max(0, a.hp - rawDamage);
      const severity = clamp(rawDamage / Math.max(1, a.maxHp), 0.15, 1.0);
      a.injuryLevel = clamp(a.injuryLevel + severity * 0.85, 0, 1);

      // Launch / knockback / run-over trajectory
      const launchBase = isUnderWheelCrush ? 0.25 : cls === 'compact_car' ? 1.15 : cls === 'motorcycle' ? 0.85 : 1.0;
      const knockSpeed = clamp(effectiveKmh * 4.9 * launchBase * (1.0 - massRatio * 0.45), 45, 340);
      a.vx = res.normalX * knockSpeed + carVx * (isUnderWheelCrush ? 0.15 : 0.36);
      a.vy = res.normalY * knockSpeed + carVy * (isUnderWheelCrush ? 0.15 : 0.36);
      a.angularVelocity = (Math.random() - 0.5) * clamp(effectiveKmh * 0.18, 3, 14);

      if (isUnderWheelCrush) {
        a.crushedLevel = Math.min(1, a.crushedLevel + 0.75);
        a.z = 0;
        a.vz = 0;
      } else if (cls === 'compact_car' && a.massKg < 180) {
        // Low hood scoops animal slightly airborne
        a.vz = clamp(effectiveKmh * 0.55, 10, 42);
      } else {
        a.vz = clamp(effectiveKmh * 0.28, 6, 22);
      }

      if (a.hp <= 0) {
        a.state = 'dead';
        a.deadTimer = 0;
        a.knockdownTimer = 0;
      } else {
        a.state = 'knocked_down';
        a.knockdownTimer = clamp(1.8 + severity * 4.5, 2.0, 6.8);
      }

      // Organic blood stain + fur/glass particles
      const contactX = a.x - res.normalX * a.radius * 0.65;
      const contactY = a.y - res.normalY * a.radius * 0.65;
      const bigVehicleHit = a.massKg >= 100 && effectiveKmh >= 28 && cls !== 'heavy_truck';
      this.spawnAnimalImpactParticles(world, contactX, contactY, res.normalX, res.normalY, a, severity, bigVehicleHit);

      if (severity > 0.32 || a.state === 'dead') {
        addOrGrowFluidStain(world, a.x, a.y, 'blood');
      }

      // Audio & herd panic
      sound.playAnimalImpact(a.massKg, clamp(effectiveKmh / 65, 0.25, 1.0));
      this.emitVocalThrottled(a, 'hurt', player.x, player.y, nowSec);
      this.triggerHerdAlarmCascade(world, a, car.x, car.y);

      // --- C. PHYSICAL RECOIL & BEAMNG SOFTBODY DAMAGE TO VEHICLE ---
      // 1) Momentum conservation: heavy animal decelerates vehicle & induces off-center yaw recoil
      const recoilScale = cls === 'motorcycle' ? 1.55 : cls === 'compact_car' ? 1.2 : cls === 'suv_van' ? 1.05 : 0.85;
      const deltaV = normalImpactPxS * massRatio * recoilScale;
      if (deltaV > 1.2) {
        const dvX = -res.normalX * deltaV;
        const dvY = -res.normalY * deltaV;
        car.knockbackVx = (car.knockbackVx || 0) + dvX;
        car.knockbackVy = (car.knockbackVy || 0) + dvY;
        const fwdReduction = (dvX * Math.cos(car.angle) + dvY * Math.sin(car.angle));
        car.speed = (car.speed || 0) + fwdReduction * 0.85;

        // Off-center lever arm induces realistic yaw spin on the struck corner
        const rx = contactX - car.x;
        const ry = contactY - car.y;
        const cross = rx * dvY - ry * dvX;
        const invInertia = 1 / Math.max(1200, vehMass * 0.9);
        car.knockbackSpin = (car.knockbackSpin || 0) + clamp(cross * invInertia * 0.28, -2.6, 2.6);
      }

      // 2) Structural softbody deformation proportional to animal mass & vehicle class
      const deformThresholdKmh =
        cls === 'motorcycle' ? 18 :
        cls === 'compact_car' ? (a.massKg >= 100 ? 18 : 26) :
        cls === 'suv_van' ? (a.massKg >= 120 ? 22 : 34) :
        36; // Heavy trucks resist light animal impacts

      const minMassForDeform = cls === 'heavy_truck' ? 140 : cls === 'motorcycle' ? 12 : 20;
      if (a.massKg >= minMassForDeform && effectiveKmh >= deformThresholdKmh) {
        // Scale effective impact speed so hitting a 500 kg moose at 60 km/h truly crumples a Lada hood,
        // while hitting a 25 kg dog at 40 km/h causes a smaller localized bumper dent.
        const massSoftFactor = clamp(Math.pow(a.massKg / 260, 0.52), 0.32, 1.38);
        const classArmorFactor = cls === 'heavy_truck' ? 0.55 : cls === 'suv_van' ? 0.82 : 1.05;
        const effectiveDeformPxS = normalImpactPxS * massSoftFactor * classArmorFactor;
        const contactWidthPx = clamp(a.bodyWidth * 1.15, 5, car.width * 0.85);

        if (effectiveDeformPxS >= 18) {
          applyVehicleDamageAndDeformation(
            car,
            contactX,
            contactY,
            effectiveDeformPxS,
            tangentialPxS,
            world,
            Math.round(a.massKg * 1.45),
            contactWidthPx
          );
          if (isPlayerCar) {
            registerSoftBodyImpactContext(car, cfg.nameRu);
          }
          sound.playCollision(clamp((effectiveKmh * massSoftFactor) / 95, 0.2, 0.95));
        }
      }

      // 3) Motorcycle rider destabilization / injury when striking medium-to-large animals
      if (isPlayerCar && cls === 'motorcycle' && a.massKg >= 14 && effectiveKmh >= 24 && !player.isInvincible && !player.isCleanMode) {
        const riderForce = clamp((effectiveKmh - 16) * (0.45 + massRatio * 2.2), 10, 68);
        distributeImpactDamage(player, riderForce, Math.atan2(-res.normalY, -res.normalX), true);
        sound.playHurt();
      }

      // 4) Grounded Russian player feedback notification (zero emojis, zero exclamation marks)
      if (isPlayerCar) {
        const kmhRounded = Math.round(effectiveKmh);
        if (a.massKg >= 120) {
          addPlayerNotification(
            player,
            `Тяжелое столкновение: сбит ${cfg.nameRu} (${Math.round(a.massKg)} кг) на скорости ${kmhRounded} км/ч`,
            'warning'
          );
        } else if (cls === 'motorcycle' && a.massKg >= 14) {
          addPlayerNotification(
            player,
            `Наезд на ${cfg.nameAccRu} (${kmhRounded} км/ч): резкий удар в переднее колесо`,
            'warning'
          );
        } else if (cls === 'heavy_truck' && a.massKg < 40) {
          addPlayerNotification(
            player,
            `Наезд тяжелой техникой на ${cfg.nameAccRu} (${kmhRounded} км/ч)`,
            'info'
          );
        } else {
          addPlayerNotification(
            player,
            `Сбит ${cfg.nameRu} на скорости ${kmhRounded} км/ч`,
            'warning'
          );
        }
      } else if (a.massKg >= 80 && effectiveKmh >= 24) {
        // AI driver stops with hazards on after striking a large animal
        car.brakeLightsOn = true;
        car.turnSignal = 'hazard';
        car.targetSpeed = 0;
        car.aiState = 'stopping_obstacle';
      }
    }

    // --- D. RAILWAY ROLLING STOCK / TRAIN COLLISIONS ---
    if (world.rollingStock && world.rollingStock.length > 0) {
      for (let i = 0; i < world.rollingStock.length; i++) {
        const railCar = world.rollingStock[i];
        const dx = a.x - railCar.x;
        const dy = a.y - railCar.y;
        if (dx * dx + dy * dy > 220 * 220) continue;
        const col = checkPedestrianRollingStockCollision(a.x, a.y, a.radius, railCar);
        if (col.collided) {
          a.x = col.x;
          a.y = col.y;
          const trainSpd = Math.abs((railCar as any).speed || 0);
          if (trainSpd > 14 && nowSec - a.lastHitTime > 0.5) {
            a.lastHitTime = nowSec;
            a.hp = 0;
            a.state = 'dead';
            a.deadTimer = 0;
            a.injuryLevel = 1.0;
            const outAng = Math.atan2(a.y - railCar.y, a.x - railCar.x);
            a.vx = Math.cos(outAng) * clamp(trainSpd * 1.4, 90, 320);
            a.vy = Math.sin(outAng) * clamp(trainSpd * 1.4, 90, 320);
            a.vz = 26;
            a.angularVelocity = (Math.random() - 0.5) * 16;
            addOrGrowFluidStain(world, a.x, a.y, 'blood');
            this.spawnAnimalImpactParticles(world, a.x, a.y, Math.cos(outAng), Math.sin(outAng), a, 1.0, false);
            sound.playAnimalImpact(a.massKg, 1.0);
          }
        }
      }
    }
  }

  private static resolveStaticObstacles(
    a: Animal,
    world: GameWorld,
    bldGrid: SpatialGrid<Building> | undefined,
    propGrid: SpatialGrid<StreetProp> | undefined
  ): boolean {
    let blocked = false;

    // 1. Buildings
    const blds = bldGrid ? bldGrid.queryRadius(a.x, a.y, 110, this.scratchBuildings) : world.buildings;
    for (let i = 0; i < blds.length; i++) {
      const b = blds[i];
      if (a.x + a.radius > b.x && a.x - a.radius < b.x + b.width && a.y + a.radius > b.y && a.y - a.radius < b.y + b.height) {
        const res = checkPedestrianBuildingCollision(a.x, a.y, a.radius, b);
        if (res.collided) {
          a.x = res.x;
          a.y = res.y;
          blocked = true;
        }
      }
    }

    // 2. Street props
    const props = propGrid ? propGrid.queryRadius(a.x, a.y, 50, this.scratchProps) : world.props;
    for (let i = 0; i < props.length; i++) {
      const prop = props[i];
      const hb = getPropHitbox(prop);
      if (hb.shape === 'none' || (prop.isBroken && hb.isWalkableWhenBroken)) continue;
      if (hb.shape === 'circle') {
        const r = hb.radius || 3.5;
        const dx = a.x - prop.x;
        const dy = a.y - prop.y;
        const minD = a.radius + r;
        const d2 = dx * dx + dy * dy;
        if (d2 < minD * minD && d2 > 0.0001) {
          const dist = Math.sqrt(d2);
          const ov = minD - dist;
          a.x += (dx / dist) * ov;
          a.y += (dy / dist) * ov;
          blocked = true;
        }
      }
    }

    // 3. Guardrails (large deer/moose/horses can leap low guardrails when fleeing; others bounce off)
    const rails = world.guardrails;
    const canLeapRail = a.state === 'fleeing' && (a.species === 'roe_deer' || a.species === 'moose' || a.species === 'horse');
    if (rails && rails.length > 0 && !canLeapRail) {
      for (let i = 0; i < rails.length; i++) {
        const rail = rails[i];
        const pad = a.radius + (rail.width || 4) * 0.5 + 4;
        const minX = (rail.x1 < rail.x2 ? rail.x1 : rail.x2) - pad;
        const maxX = (rail.x1 > rail.x2 ? rail.x1 : rail.x2) + pad;
        if (a.x < minX || a.x > maxX) continue;
        const minY = (rail.y1 < rail.y2 ? rail.y1 : rail.y2) - pad;
        const maxY = (rail.y1 > rail.y2 ? rail.y1 : rail.y2) + pad;
        if (a.y < minY || a.y > maxY) continue;
        const rdx = rail.x2 - rail.x1;
        const rdy = rail.y2 - rail.y1;
        const lenSq = rdx * rdx + rdy * rdy;
        if (lenSq < 1) continue;
        const t = clamp(((a.x - rail.x1) * rdx + (a.y - rail.y1) * rdy) / lenSq, 0, 1);
        const cx = rail.x1 + rdx * t;
        const cy = rail.y1 + rdy * t;
        const distX = a.x - cx;
        const distY = a.y - cy;
        const effW = (rail.width || 4) * 0.5 + a.radius;
        const d2 = distX * distX + distY * distY;
        if (d2 < effW * effW) {
          const dist = Math.sqrt(d2) || 0.001;
          a.x += (distX / dist) * (effW - dist);
          a.y += (distY / dist) * (effW - dist);
          blocked = true;
        }
      }
    }

    // 4. Deep river avoidance (moose & bears can wade deeper than small mammals)
    const maxSafeDepth = a.species === 'moose' || a.species === 'bear' ? 0.72 : 0.36;
    const waterDepth = getUniversalWaterDepthAt(world, a.x, a.y);
    if (waterDepth > maxSafeDepth && a.state !== 'knocked_down' && a.state !== 'dead') {
      // Gently steer back toward home or away from velocity
      a.x -= a.vx * 0.032;
      a.y -= a.vy * 0.032;
      a.vx *= -0.45;
      a.vy *= -0.45;
      blocked = true;
    }

    a.x = clamp(a.x, 40, world.width - 40);
    a.y = clamp(a.y, 40, world.height - 40);
    return blocked;
  }

  /**
   * Main per-frame ecological, ethological & vehicle-collision simulation update for all world animals.
   */
  public static updateAnimals(
    world: GameWorld,
    player: Player,
    dt: number,
    vehGrid?: SpatialGrid<Vehicle>,
    bldGrid?: SpatialGrid<Building>,
    propGrid?: SpatialGrid<StreetProp>,
    pedGrid?: SpatialGrid<Pedestrian>
  ) {
    if (!performanceConfig.enableAnimals) {
      if (world.animals && world.animals.length > 0) world.animals.length = 0;
      return;
    }
    if (!world.animals) world.animals = [];

    const safeDt = Math.min(0.05, Math.max(0.001, dt));
    const nowSec = typeof performance !== 'undefined' ? performance.now() * 0.001 : 0;
    const timeHour = world.timeHour ?? 12;
    const isNight = timeHour < 5.6 || timeHour > 20.6;
    const isRaining = world.weather === 'rain' || world.weather === 'storm';
    const isSnowGround = (world.snowCover ?? 0) > 0.35;
    const maxActive = performanceConfig.maxActiveAnimals || 52;

    // Anchor around player (or current vehicle)
    const anchorX = player.x;
    const anchorY = player.y;
    const playerOnFoot = !player.isInVehicle && !player.isInsideBuilding && !player.insideCarId && !player.insideBusId;
    const playerSpeed = playerOnFoot ? Math.hypot(player.vx || 0, player.vy || 0) : 0;

    // 1. Ecological Streaming Spawner & Far-Range Despawner
    this.spawnCooldown -= safeDt;
    if (world.animals.length < maxActive && this.spawnCooldown <= 0) {
      // Initial burst when world is empty so player encounters wildlife naturally right away
      const isInitialFill = world.animals.length < Math.min(18, maxActive * 0.4);
      const batch = isInitialFill ? 3 : 1;
      for (let b = 0; b < batch && world.animals.length < maxActive; b++) {
        const minR = isInitialFill ? 240 : 480;
        const maxR = isInitialFill ? 1150 : 1450;
        this.trySpawnEcologicalGroup(world, anchorX, anchorY, minR, maxR, bldGrid);
      }
      this.spawnCooldown = isInitialFill ? 0.15 : 0.65;
    }

    // Despawn far off-screen animals (> 1750 px) or old carcasses (> 95s and > 420px away)
    for (let i = world.animals.length - 1; i >= 0; i--) {
      const a = world.animals[i];
      const d = Math.hypot(a.x - anchorX, a.y - anchorY);
      if (d > 1750 || (a.state === 'dead' && a.deadTimer > 95 && d > 420)) {
        world.animals.splice(i, 1);
      }
    }

    // 2. Per-Animal Biological, Ethological & Physical Update
    for (let i = 0; i < world.animals.length; i++) {
      const a = world.animals[i];
      const cfg = ANIMAL_SPECIES_CONFIG[a.species];

      a.breathPhase += safeDt * (a.state === 'fleeing' || a.state === 'charging' ? 6.5 : 2.3);
      if (a.attackCooldown > 0) a.attackCooldown -= safeDt;
      a.eyeShineIntensity = Math.max(0, a.eyeShineIntensity - safeDt * 2.5);

      // --- VERTICAL BALLISTICS (LEAPING OR LAUNCHED BY VEHICLE) ---
      if (a.z > 0 || a.vz !== 0) {
        a.z += a.vz * safeDt;
        a.vz -= 125 * safeDt;
        if (a.z <= 0) {
          a.z = 0;
          if (Math.abs(a.vz) > 14 && (a.state === 'knocked_down' || a.state === 'dead')) {
            a.vz = -a.vz * 0.25;
          } else {
            a.vz = 0;
          }
        }
      }

      // --- ANATOMICAL TRAUMA PROGRESSION (Bleeding trails, shock collapse, fatal vitals) ---
      if (a.anatomy) {
        updateAnimalAnatomy(a, world, safeDt);
      }

      // --- DEAD / KNOCKED DOWN TRAUMA KINEMATICS ---
      if (a.state === 'dead' || a.state === 'knocked_down') {
        a.x += a.vx * safeDt;
        a.y += a.vy * safeDt;
        a.angle += a.angularVelocity * safeDt;
        const drag = a.z > 0.5 ? 0.85 : 5.4;
        a.vx *= Math.max(0, 1 - drag * safeDt);
        a.vy *= Math.max(0, 1 - drag * safeDt);
        a.angularVelocity *= Math.max(0, 1 - 6.2 * safeDt);
        this.resolveStaticObstacles(a, world, bldGrid, propGrid);
        // Dead or downed bodies can still be run over / nudged by subsequent vehicles
        this.resolveVehicleAndTrainCollisions(a, world, player, vehGrid, nowSec);

        if (a.state === 'dead') {
          a.deadTimer += safeDt;
        } else {
          a.knockdownTimer -= safeDt;
          if (a.knockdownTimer <= 0 && Math.hypot(a.vx, a.vy) < 12) {
            // Injured survivor struggles back up and limps away!
            a.state = 'fleeing';
            a.stateTimer = 6.0;
            a.fear = 1.0;
            a.angularVelocity = 0;
          }
        }
        continue;
      }

      // --- SQUIRREL HIDING UP IN TREE CANOPY ---
      if (a.state === 'in_tree') {
        a.stateTimer -= safeDt;
        const dPlayer = Math.hypot(player.x - a.homeX, player.y - a.homeY);
        if (a.stateTimer <= 0 && dPlayer > 130) {
          a.state = 'foraging';
          const outA = Math.random() * Math.PI * 2;
          a.x = a.homeX + Math.cos(outA) * 14;
          a.y = a.homeY + Math.sin(outA) * 14;
          a.stateTimer = 2.5 + Math.random() * 3.0;
        }
        continue;
      }

      // --- PHYSIOLOGICAL NEEDS PROGRESSION ---
      a.hunger = clamp(a.hunger + safeDt * 0.004, 0, 1);
      a.thirst = clamp(a.thirst + safeDt * 0.003, 0, 1);
      a.fatigue = clamp(
        a.fatigue + (a.state === 'fleeing' || a.state === 'charging' ? 0.035 : a.state === 'resting' ? -0.05 : 0.002) * safeDt,
        0,
        1
      );
      a.fear = Math.max(0, a.fear - safeDt * 0.14);

      const isBoldDefender =
        cfg.canChargeHuman &&
        (a.temperament === 'aggressive' || a.temperament === 'territorial' || a.injuryLevel > 0.25);

      // --- STAGGERED HERD ALARM CASCADE ---
      if (a.alarmDelay > 0) {
        a.alarmDelay -= safeDt;
        if (a.alarmDelay <= 0) {
          if (cfg.curlsOnThreat) {
            a.state = 'curled';
            a.stateTimer = 5.0;
          } else if (isBoldDefender) {
            // Bold predators/boars turn alert rather than panicking when a nervous neighbor bolts
            if (a.state !== 'charging') {
              a.state = 'alert';
              a.stateTimer = 2.4;
            }
          } else {
            a.state = 'fleeing';
            a.stateTimer = 4.2 + Math.random() * 2.5;
          }
        }
      }

      // --- THREAT, HUMAN & VEHICLE SENSING ---
      let closestThreatDist = Infinity;
      let threatX = a.threatX ?? player.x;
      let threatY = a.threatY ?? player.y;
      let threatIsVehicle = false;
      let threatIsHuman = false;
      let shouldFlee = false;
      let shouldCharge = false;
      let shouldWarnStand = false;
      let shouldBeCurious = false;

      const dPlayerNow = playerOnFoot ? Math.hypot(player.x - a.x, player.y - a.y) : Infinity;
      const alreadyChargingHuman = a.state === 'charging' && playerOnFoot && dPlayerNow < cfg.alertDist * 1.45;

      // 1) Moving / Honking / Headlight-Shining Vehicles
      const nearbyVehs = vehGrid ? vehGrid.queryRadius(a.x, a.y, 260, this.scratchVehicles) : world.vehicles;
      for (let v = 0; v < nearbyVehs.length; v++) {
        const veh = nearbyVehs[v];
        const vSpdPx = Math.hypot(veh.vx || 0, veh.vy || 0) || Math.abs(veh.speed || 0);
        const vKmh = vSpdPx * PX_S_TO_SPEED_KMH;
        const dVeh = Math.hypot(veh.x - a.x, veh.y - a.y);
        const { isLoud } = classifyVehicle(veh);

        // Nighttime headlight cone check: tapetum eye-shine & "deer in headlights" freeze reflex!
        if (isNight && veh.headlightsOn && dVeh < 270) {
          const toAx = a.x - veh.x;
          const toAy = a.y - veh.y;
          const angToA = Math.atan2(toAy, toAx);
          const coneDiff = Math.abs(wrapAngleDiff(angToA, veh.angle));
          if (coneDiff < 0.38) {
            a.eyeShineIntensity = clamp(1.1 - dVeh / 270, 0.25, 1.0);
            if (
              vKmh > 22 &&
              dVeh > 52 &&
              dVeh < 200 &&
              a.headlightFreezeTimer <= 0 &&
              a.state !== 'fleeing' &&
              a.state !== 'charging' &&
              cfg.headlightFreezeProb > 0 &&
              Math.random() < cfg.headlightFreezeProb * safeDt * 3.5
            ) {
              a.headlightFreezeTimer = 0.85 + Math.random() * 0.95;
              a.state = 'alert';
              a.threatX = veh.x;
              a.threatY = veh.y;
            }
          }
        }

        if (vKmh < 3 && !veh.hornActive) continue;

        const noiseBonus = (veh.hornActive ? 115 : 0) + (isLoud ? 42 : 0) + Math.min(95, vKmh * 1.15);
        const effFid = cfg.fidVehicle + noiseBonus * 0.55;

        // Territorial courtyard dogs sometimes bark & chase slow cars/motorcycles!
        if (
          a.species === 'dog' &&
          a.temperament === 'territorial' &&
          !alreadyChargingHuman &&
          !veh.hornActive &&
          vKmh >= 8 &&
          vKmh <= 32 &&
          dVeh < 115 &&
          dVeh > 28 &&
          a.state !== 'fleeing'
        ) {
          threatX = veh.x;
          threatY = veh.y;
          a.targetX = veh.x;
          a.targetY = veh.y;
          a.state = 'charging';
          a.stateTimer = 2.6;
          this.emitVocalThrottled(a, 'angry', player.x, player.y, nowSec);
          continue;
        }

        if (dVeh < closestThreatDist) {
          closestThreatDist = dVeh;
          threatX = veh.x;
          threatY = veh.y;
          threatIsVehicle = true;
        }

        // While actively attacking a human on foot, only a close fast/honking vehicle scares the predator off
        if (alreadyChargingHuman) {
          if ((vKmh > 18 && dVeh < 125) || (veh.hornActive && dVeh < 185)) {
            shouldFlee = true;
            threatX = veh.x;
            threatY = veh.y;
            threatIsVehicle = true;
          }
        } else if (dVeh < effFid || (veh.hornActive && dVeh < 220)) {
          shouldFlee = true;
          threatX = veh.x;
          threatY = veh.y;
          threatIsVehicle = true;
        }
      }

      // 2) Player on Foot Reaction (distance, movement speed, species temperament, pack courage)
      if (playerOnFoot && !shouldFlee) {
        const dPlayer = dPlayerNow;
        const isSprinting = playerSpeed > 72;
        const isWalking = playerSpeed > 14;
        const playerFid = isSprinting ? cfg.fidSprint : isWalking ? (cfg.fidWalk + cfg.fidSprint) * 0.48 : cfg.fidWalk * 0.72;

        if (dPlayer < cfg.alertDist && dPlayer < closestThreatDist) {
          closestThreatDist = dPlayer;
          threatX = player.x;
          threatY = player.y;
          threatIsHuman = true;
        }

        let effectiveChargeDist = cfg.chargeDist;
        if (isBoldDefender) {
          if (a.species === 'wolf') {
            if (isNight) effectiveChargeDist += 30;
            // Pack courage: wolves with nearby packmates engage from further away
            for (let m = 0; m < world.animals.length; m++) {
              const mate = world.animals[m];
              if (mate !== a && mate.species === 'wolf' && mate.state !== 'dead' && Math.hypot(mate.x - a.x, mate.y - a.y) < 190) {
                effectiveChargeDist += 25;
                break;
              }
            }
          }
          if (isSprinting) {
            effectiveChargeDist += 18;
          }
        }

        const commitChargeDist = Math.max(effectiveChargeDist * 1.4, cfg.alertDist * 1.2);

        if (isBoldDefender && (dPlayer < effectiveChargeDist || (a.state === 'charging' && dPlayer < commitChargeDist))) {
          shouldCharge = true;
          threatX = player.x;
          threatY = player.y;
          threatIsHuman = true;
        } else if (isBoldDefender && dPlayer < cfg.alertDist) {
          // Territorial/aggressive animals hold their ground and warn the human before charging
          shouldWarnStand = true;
          threatX = player.x;
          threatY = player.y;
          threatIsHuman = true;
        } else if ((a.temperament === 'friendly' || a.temperament === 'curious') && !isSprinting && dPlayer < 135) {
          shouldBeCurious = true;
          threatX = player.x;
          threatY = player.y;
          threatIsHuman = true;
        } else if (dPlayer < playerFid) {
          shouldFlee = true;
          threatX = player.x;
          threatY = player.y;
          threatIsHuman = true;
        }
      }

      // 3) Nearby AI Pedestrians (timid/cautious wildlife flees; bold defenders & city pets tolerate passersby)
      if (!shouldFlee && !shouldCharge && !shouldWarnStand && !isBoldDefender && a.habitat !== 'urban' && pedGrid) {
        const nearPeds = pedGrid.queryRadius(a.x, a.y, cfg.fidWalk * 0.85, this.scratchPeds);
        for (let p = 0; p < nearPeds.length; p++) {
          const ped = nearPeds[p];
          if (ped.isInsideBuilding) continue;
          const dP = Math.hypot(ped.x - a.x, ped.y - a.y);
          if (dP < cfg.fidWalk * 0.78) {
            shouldFlee = true;
            threatX = ped.x;
            threatY = ped.y;
            threatIsHuman = true;
            break;
          }
        }
      }

      // 4) Predator-Prey Ecological Sensing between Animals
      let preyTarget: Animal | null = null;
      let predatorThreat: Animal | null = null;
      for (let j = 0; j < world.animals.length; j++) {
        const other = world.animals[j];
        if (other === a || other.state === 'dead' || other.state === 'in_tree') continue;
        const dO = Math.hypot(other.x - a.x, other.y - a.y);
        if (dO > cfg.visionRange) continue;
        if (cfg.predatorSpecies.includes(other.species) && dO < cfg.alertDist * 0.85) {
          predatorThreat = other;
          shouldFlee = true;
          shouldCharge = false;
          threatX = other.x;
          threatY = other.y;
          break;
        }
        if (
          !shouldFlee &&
          !shouldCharge &&
          cfg.preySpecies.includes(other.species) &&
          (a.hunger > 0.42 || a.species === 'dog' || a.species === 'cat') &&
          dO < 185 &&
          (!preyTarget || dO < Math.hypot(preyTarget.x - a.x, preyTarget.y - a.y))
        ) {
          preyTarget = other;
        }
      }

      // --- APPLY STATE TRANSITIONS ---
      if (a.headlightFreezeTimer > 0) {
        a.headlightFreezeTimer -= safeDt;
        a.vx *= Math.max(0, 1 - 9 * safeDt);
        a.vy *= Math.max(0, 1 - 9 * safeDt);
        a.gaitType = 'stand';
        a.earAlert = 1.0;
        if (closestThreatDist < 48 || a.headlightFreezeTimer <= 0) {
          a.headlightFreezeTimer = 0;
          a.state = 'fleeing';
          a.stateTimer = 4.0;
        }
      } else if (shouldCharge) {
        if (a.state !== 'charging') {
          this.emitVocalThrottled(a, 'angry', player.x, player.y, nowSec);
          if (threatIsHuman) {
            this.triggerPackChargeCascade(world, a, threatX, threatY);
          }
        }
        a.state = 'charging';
        a.threatX = threatX;
        a.threatY = threatY;
        a.stateTimer = 4.2;
        a.earAlert = 0.1; // Pinned back ears in aggression
        a.tailHeight = 0.85;
      } else if (shouldFlee) {
        if (cfg.curlsOnThreat) {
          a.state = 'curled';
          a.stateTimer = 5.5;
          a.vx *= 0.2;
          a.vy *= 0.2;
        } else {
          if (a.state !== 'fleeing') {
            this.triggerHerdAlarmCascade(world, a, threatX, threatY);
            if (threatIsVehicle || predatorThreat) {
              this.emitVocalThrottled(a, 'alert', player.x, player.y, nowSec);
            }
          }
          a.state = 'fleeing';
          a.threatX = threatX;
          a.threatY = threatY;
          a.fear = 1.0;
          a.stateTimer = Math.max(a.stateTimer, 3.6 + Math.random() * 2.2);
          a.tailHeight = a.species === 'roe_deer' ? 1.0 : 0.15;
        }
      } else if (shouldWarnStand) {
        if (a.state !== 'alert') {
          this.emitVocalThrottled(a, 'angry', player.x, player.y, nowSec);
        }
        a.state = 'alert';
        a.threatX = threatX;
        a.threatY = threatY;
        a.stateTimer = Math.max(a.stateTimer, 1.6);
        a.earAlert = 0.25;
        a.headPitch = 0.45;
      } else if (preyTarget && a.state !== 'fleeing' && a.state !== 'charging') {
        a.state = 'hunting';
        a.targetEntityId = preyTarget.id;
        a.targetX = preyTarget.x;
        a.targetY = preyTarget.y;
        a.stateTimer = 4.0;
      } else if (shouldBeCurious && a.state !== 'fleeing' && a.state !== 'charging') {
        a.state = 'curious';
        a.targetX = threatX;
        a.targetY = threatY;
        a.stateTimer = 2.6;
        a.tailHeight = 0.92;
        a.tailWagSpeed = a.species === 'dog' ? 13.0 : 4.5;
        if (Math.random() < safeDt * 0.25) {
          this.emitVocalThrottled(a, 'calm', player.x, player.y, nowSec);
        }
      } else if (closestThreatDist < cfg.alertDist && a.state !== 'fleeing' && a.state !== 'charging' && a.state !== 'curled') {
        a.state = 'alert';
        a.threatX = threatX;
        a.threatY = threatY;
        a.earAlert = 1.0;
        a.headPitch = 0.6;
      }

      // --- EXECUTE ACTIVE STATE KINEMATICS & GOALS ---
      const injurySpeedMult = 1.0 - a.injuryLevel * 0.48;
      let desiredVX = 0;
      let desiredVY = 0;
      let targetHeadPitch = 0;

      if (a.state === 'curled') {
        a.stateTimer -= safeDt;
        a.vx *= Math.max(0, 1 - 10 * safeDt);
        a.vy *= Math.max(0, 1 - 10 * safeDt);
        a.gaitType = 'rest';
        if (a.stateTimer <= 0 && closestThreatDist > 90) {
          a.state = 'foraging';
          a.stateTimer = 3.0;
        }
      } else if (a.state === 'fleeing') {
        a.stateTimer -= safeDt;
        if (cfg.climbsTrees) {
          // Squirrels bolt directly to home tree trunk and vanish into canopy!
          const dx = a.homeX - a.x;
          const dy = a.homeY - a.y;
          const dHome = Math.hypot(dx, dy);
          if (dHome < 8.5) {
            a.state = 'in_tree';
            a.stateTimer = 6.5 + Math.random() * 5.0;
            a.vx = 0;
            a.vy = 0;
            continue;
          }
          const runSpd = cfg.runSpeed * injurySpeedMult;
          desiredVX = (dx / (dHome || 1)) * runSpd;
          desiredVY = (dy / (dHome || 1)) * runSpd;
        } else {
          const awayX = a.x - (a.threatX ?? player.x);
          const awayY = a.y - (a.threatY ?? player.y);
          let fleeAng = Math.atan2(awayY, awayX);

          // Evasive zig-zag jinking for hares, foxes, roe deer!
          if (cfg.zigZagFlight) {
            a.zigZagTimer -= safeDt;
            if (a.zigZagTimer <= 0) {
              a.zigZagTimer = 0.45 + Math.random() * 0.55;
              a.zigZagSign = -a.zigZagSign;
            }
            fleeAng += a.zigZagSign * 0.42;
          }

          const runSpd = cfg.runSpeed * injurySpeedMult * (0.9 + (a.seed % 15) * 0.012);
          desiredVX = Math.cos(fleeAng) * runSpd;
          desiredVY = Math.sin(fleeAng) * runSpd;

          // Bounding leaps for deer & hares
          if (cfg.boundsOnFlee && a.z <= 0.1 && Math.sin(a.gaitPhase) > 0.85) {
            a.vz = a.species === 'roe_deer' ? 28 : 20;
          }
        }

        if (a.stateTimer <= 0 && closestThreatDist > cfg.alertDist * 0.9) {
          a.state = 'alert';
          a.stateTimer = 2.0;
        }
      } else if (a.state === 'charging') {
        a.stateTimer -= safeDt;
        // Keep tracking live player position when attacking the player on foot
        if (playerOnFoot && dPlayerNow < cfg.alertDist * 1.45 && !threatIsVehicle) {
          a.threatX = player.x;
          a.threatY = player.y;
        }
        const tx = a.threatX ?? player.x;
        const ty = a.threatY ?? player.y;
        const dx = tx - a.x;
        const dy = ty - a.y;
        const dist = Math.hypot(dx, dy) || 1;
        const chargeSpd = cfg.runSpeed * 0.94 * injurySpeedMult;

        if (a.attackCooldown > 0.75 && dist < a.radius + 38) {
          // Brief predatory circling/pacing right after landing a bite or strike
          const orbitAng = Math.atan2(dy, dx) + (a.seed % 2 === 0 ? 1.15 : -1.15);
          desiredVX = Math.cos(orbitAng) * cfg.trotSpeed * 0.72 * injurySpeedMult;
          desiredVY = Math.sin(orbitAng) * cfg.trotSpeed * 0.72 * injurySpeedMult;
        } else {
          desiredVX = (dx / dist) * chargeSpd;
          desiredVY = (dy / dist) * chargeSpd;
        }

        // Melee gore / bite / lunge against player on foot!
        if (playerOnFoot && dPlayerNow < a.radius + 11.5 && a.attackCooldown <= 0) {
          a.attackCooldown = 1.45;
          const hitAng = Math.atan2(player.y - a.y, player.x - a.x);
          const kb = clamp(a.massKg * 0.65, 65, 220);
          player.vx = (player.vx || 0) + Math.cos(hitAng) * kb;
          player.vy = (player.vy || 0) + Math.sin(hitAng) * kb;
          if (!player.isInvincible && !player.isCleanMode) {
            distributeImpactDamage(player, cfg.attackDamage, hitAng, true);
            sound.playHurt();
          }
          this.emitVocalThrottled(a, 'angry', player.x, player.y, nowSec);
          const attackMsg =
            a.species === 'bear'
              ? 'Медведь нанес тяжелый удар лапой'
              : a.species === 'wild_boar'
                ? 'Кабан сбил с ног в атаке'
                : a.species === 'wolf'
                  ? 'Волк укусил при нападении'
                  : a.species === 'moose'
                    ? 'Лось отбросил ударом копыта'
                    : 'Агрессивная собака укусила за ногу';
          addPlayerNotification(player, attackMsg, 'warning');
          a.stateTimer = 3.6;
        } else if (a.stateTimer <= 0 || dist > cfg.alertDist * 1.45) {
          a.state = 'patrolling';
          a.stateTimer = 3.0;
        }
      } else if (a.state === 'hunting') {
        a.stateTimer -= safeDt;
        const prey = world.animals.find((o) => o.id === a.targetEntityId && o.state !== 'dead' && o.state !== 'in_tree');
        if (!prey) {
          a.state = 'patrolling';
          a.stateTimer = 2.5;
        } else {
          const dx = prey.x - a.x;
          const dy = prey.y - a.y;
          const dist = Math.hypot(dx, dy) || 1;
          const stalkSpd = (dist > 75 ? cfg.trotSpeed : cfg.runSpeed * 0.94) * injurySpeedMult;
          desiredVX = (dx / dist) * stalkSpd;
          desiredVY = (dy / dist) * stalkSpd;
          if (dist < a.radius + prey.radius + 4 && a.attackCooldown <= 0) {
            a.attackCooldown = 1.4;
            prey.hp -= 28;
            prey.injuryLevel = clamp(prey.injuryLevel + 0.45, 0, 1);
            if (prey.hp <= 0) {
              prey.state = 'dead';
              prey.deadTimer = 0;
              addOrGrowFluidStain(world, prey.x, prey.y, 'blood');
              a.hunger = Math.max(0, a.hunger - 0.55);
              a.state = 'foraging';
              a.stateTimer = 4.5;
            }
          }
          if (a.stateTimer <= 0 || dist > cfg.visionRange * 1.3) {
            a.state = 'patrolling';
            a.stateTimer = 3.0;
          }
        }
      } else if (a.state === 'curious') {
        a.stateTimer -= safeDt;
        const dx = (a.targetX ?? player.x) - a.x;
        const dy = (a.targetY ?? player.y) - a.y;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist > 30) {
          desiredVX = (dx / dist) * cfg.walkSpeed * 0.95;
          desiredVY = (dy / dist) * cfg.walkSpeed * 0.95;
        } else {
          // Stop politely & face the human
          a.targetHeadYaw = clamp(wrapAngleDiff(Math.atan2(dy, dx), a.angle), -0.85, 0.85);
        }
        if (a.stateTimer <= 0 || dist > 150) {
          a.state = 'idle';
          a.stateTimer = 2.0;
        }
      } else if (a.state === 'alert') {
        a.stateTimer -= safeDt;
        const lookAng = Math.atan2((a.threatY ?? player.y) - a.y, (a.threatX ?? player.x) - a.x);
        a.targetHeadYaw = clamp(wrapAngleDiff(lookAng, a.angle), -0.95, 0.95);
        targetHeadPitch = 0.65;
        if (a.stateTimer <= 0 && closestThreatDist > cfg.alertDist * 0.92) {
          a.state = 'idle';
          a.stateTimer = 1.8;
        }
      } else if (a.state === 'resting') {
        a.stateTimer -= safeDt;
        a.gaitType = 'rest';
        targetHeadPitch = -0.3;
        if (a.stateTimer <= 0) {
          a.state = 'idle';
          a.stateTimer = 1.5 + Math.random() * 2.0;
        }
      } else {
        // Routine ecological goal selection: grazing, foraging, drinking, patrolling, resting
        a.stateTimer -= safeDt;
        if (a.stateTimer <= 0) {
          const activityMult = getCircadianActivityMultiplier(cfg.activity, timeHour);
          const restChance = (1.0 - activityMult) * 0.65 + (a.fatigue > 0.65 ? 0.35 : 0) + (isRaining ? 0.25 : 0);
          const roll = Math.random();

          if (roll < restChance && a.species !== 'moose' && a.species !== 'horse') {
            a.state = 'resting';
            a.stateTimer = 5.5 + Math.random() * 8.0;
          } else if (a.thirst > 0.62 && world.puddles && world.puddles.length > 0) {
            // Seek nearest pond/puddle to drink
            let bestP = null;
            let bestD = 260;
            for (let p = 0; p < world.puddles.length; p++) {
              const pud = world.puddles[p];
              const dp = Math.hypot(pud.x - a.x, pud.y - a.y);
              if (dp < bestD) {
                bestD = dp;
                bestP = pud;
              }
            }
            if (bestP) {
              a.state = 'drinking';
              a.targetX = bestP.x;
              a.targetY = bestP.y;
              a.stateTimer = 6.0;
            } else {
              a.state = 'grazing';
              a.stateTimer = 3.5 + Math.random() * 4.0;
            }
          } else if (roll < 0.68) {
            // Wander / forage / patrol near home territory (crepuscular wildlife sometimes crosses forest roads!)
            a.state = cfg.diet === 'herbivore' ? 'grazing' : 'foraging';
            const wanderR = a.species === 'squirrel' ? 32 : a.species === 'wolf' || a.species === 'moose' ? 210 : 120;
            const ang = Math.random() * Math.PI * 2;
            const r = Math.random() * wanderR;
            a.targetX = clamp(a.homeX + Math.cos(ang) * r, 80, world.width - 80);
            a.targetY = clamp(a.homeY + Math.sin(ang) * r, 80, world.height - 80);
            a.stateTimer = 3.2 + Math.random() * 4.8;
          } else {
            a.state = 'idle';
            a.stateTimer = 2.0 + Math.random() * 3.8;
            // Occasional atmospheric ambient vocalization (cow moo, distant night wolf howl, sheep bleat)
            if (Math.random() < (a.species === 'wolf' && isNight ? 0.22 : 0.08)) {
              this.emitVocalThrottled(a, 'calm', player.x, player.y, nowSec);
            }
          }
        }

        if (a.state === 'drinking' && a.targetX !== undefined && a.targetY !== undefined) {
          const dx = a.targetX - a.x;
          const dy = a.targetY - a.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 14) {
            desiredVX = (dx / dist) * cfg.walkSpeed;
            desiredVY = (dy / dist) * cfg.walkSpeed;
          } else {
            targetHeadPitch = -0.9;
            a.thirst = Math.max(0, a.thirst - safeDt * 0.25);
            if (a.thirst < 0.08) a.state = 'idle';
          }
        } else if ((a.state === 'grazing' || a.state === 'foraging' || a.state === 'patrolling') && a.targetX !== undefined && a.targetY !== undefined) {
          const dx = a.targetX - a.x;
          const dy = a.targetY - a.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 10) {
            const spd = (a.state === 'patrolling' ? cfg.trotSpeed * 0.65 : cfg.walkSpeed) * injurySpeedMult;
            desiredVX = (dx / dist) * spd;
            desiredVY = (dy / dist) * spd;
            targetHeadPitch = a.state === 'grazing' ? -0.45 : -0.2;
          } else {
            targetHeadPitch = a.state === 'grazing' ? -0.88 : -0.35;
            a.hunger = Math.max(0, a.hunger - safeDt * 0.08);
            // Wild boars root up small forest soil patches while foraging!
            if (a.species === 'wild_boar' && Math.random() < safeDt * 0.18) {
              addOrGrowFluidStain(world, a.x + Math.cos(a.angle) * 8, a.y + Math.sin(a.angle) * 8, 'soil');
            }
          }
        }
      }

      // --- SOCIAL BOIDS HERDING & PACK COHESION / SEPARATION ---
      if (a.groupId && a.state !== 'resting' && a.state !== 'curled') {
        let cx = 0;
        let cy = 0;
        let sepX = 0;
        let sepY = 0;
        let alignX = 0;
        let alignY = 0;
        let count = 0;
        const minSep = a.bodyWidth * 1.85 + 6;
        for (let j = 0; j < world.animals.length; j++) {
          const o = world.animals[j];
          if (o === a || o.groupId !== a.groupId || o.state === 'dead' || o.state === 'in_tree') continue;
          const dx = o.x - a.x;
          const dy = o.y - a.y;
          const d = Math.hypot(dx, dy);
          if (d < 260) {
            cx += o.x;
            cy += o.y;
            alignX += o.vx;
            alignY += o.vy;
            count++;
            if (d > 0.1 && d < minSep) {
              sepX -= (dx / d) * (minSep - d) * 3.5;
              sepY -= (dy / d) * (minSep - d) * 3.5;
            }
          }
        }
        if (count > 0) {
          cx /= count;
          cy /= count;
          const distCenter = Math.hypot(cx - a.x, cy - a.y);
          const cohWeight = a.species === 'sheep' ? 0.65 : 0.32;
          if (distCenter > minSep * 1.8) {
            desiredVX += (cx - a.x) * cohWeight;
            desiredVY += (cy - a.y) * cohWeight;
          }
          if (a.state === 'fleeing') {
            desiredVX += (alignX / count) * 0.25;
            desiredVY += (alignY / count) * 0.25;
          }
          desiredVX += sepX;
          desiredVY += sepY;
        }
      }

      // Clamp maximum biological speed
      const maxAllowSpd = (a.state === 'fleeing' || a.state === 'charging' || a.state === 'hunting' ? cfg.runSpeed : cfg.trotSpeed) * injurySpeedMult;
      const dSpd = Math.hypot(desiredVX, desiredVY);
      if (dSpd > maxAllowSpd && dSpd > 0.1) {
        desiredVX = (desiredVX / dSpd) * maxAllowSpd;
        desiredVY = (desiredVY / dSpd) * maxAllowSpd;
      }

      // Smooth inertial acceleration
      const accelRate = a.state === 'fleeing' || a.state === 'charging' ? 7.5 : 4.6;
      a.vx += (desiredVX - a.vx) * Math.min(1, safeDt * accelRate);
      a.vy += (desiredVY - a.vy) * Math.min(1, safeDt * accelRate);

      // Integrate position & heading
      const speed = Math.hypot(a.vx, a.vy);
      if (speed > 1.2) {
        a.x += a.vx * safeDt;
        a.y += a.vy * safeDt;
        const targetAng = Math.atan2(a.vy, a.vx);
        const turnDelta = wrapAngleDiff(targetAng, a.angle);
        const turnRate = clamp(7.5 - a.massKg * 0.006, 3.2, 8.5);
        a.angle += turnDelta * Math.min(1, safeDt * turnRate);
        a.spineBend += (clamp(turnDelta * 0.7, -0.55, 0.55) - a.spineBend) * Math.min(1, safeDt * 8);
      } else {
        a.spineBend *= Math.max(0, 1 - safeDt * 6);
      }

      // Update gait kinematics & grass trampling / snow tracks
      const prevStrideTick = Math.floor(a.gaitPhase / Math.PI);
      if (a.state === 'resting' || a.state === 'curled') {
        a.gaitType = 'rest';
      } else if (speed < 3.5) {
        a.gaitType = 'stand';
      } else if (a.injuryLevel > 0.32) {
        a.gaitType = 'limp';
        a.gaitPhase += safeDt * (4.5 + speed * 0.11);
      } else if (speed > cfg.trotSpeed * 1.12) {
        a.gaitType = cfg.boundsOnFlee ? 'bound' : 'gallop';
        a.gaitPhase += safeDt * (9.5 + speed * 0.12);
      } else if (speed > cfg.walkSpeed * 1.35) {
        a.gaitType = 'trot';
        a.gaitPhase += safeDt * (6.5 + speed * 0.12);
      } else {
        a.gaitType = 'walk';
        a.gaitPhase += safeDt * (4.0 + speed * 0.14);
      }

      const nextStrideTick = Math.floor(a.gaitPhase / Math.PI);
      if (speed > 18 && nextStrideTick !== prevStrideTick) {
        const invS = 1 / (speed || 1);
        ForestSystem.stampGrassTrample(a.x, a.y, Math.max(2.2, a.bodyWidth * 0.45), a.vx * invS, a.vy * invS, nowSec);
        if (isSnowGround && a.massKg >= 12 && Math.random() < 0.45) {
          addOrGrowFluidStain(world, a.x, a.y, 'snow_footprint');
        }
      }

      // Head yaw/pitch & tail expressiveness
      if (a.state !== 'alert' && a.state !== 'curious') {
        a.targetHeadYaw = clamp(a.spineBend * 0.85, -0.5, 0.5);
      }
      a.headYaw += (a.targetHeadYaw - a.headYaw) * Math.min(1, safeDt * 9);
      a.headPitch += (targetHeadPitch - a.headPitch) * Math.min(1, safeDt * 6);
      a.tailPhase += safeDt * (a.state === 'curious' ? a.tailWagSpeed : speed > 20 ? 7.5 : 3.2);

      // Static obstacle & water resolution
      const hitStatic = this.resolveStaticObstacles(a, world, bldGrid, propGrid);
      if (hitStatic && (a.state === 'grazing' || a.state === 'foraging' || a.state === 'patrolling')) {
        a.stateTimer = Math.min(a.stateTimer, 0.2);
      }

      // Vehicle & train collision physics!
      this.resolveVehicleAndTrainCollisions(a, world, player, vehGrid, nowSec);
    }
  }
}
