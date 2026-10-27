import { CarType } from './types';
import { DEALERSHIP_CARS } from './components/CarDealershipModal';

export type VehicleCategory = 
  | 'passenger' 
  | 'sport' 
  | 'suv' 
  | 'commercial' 
  | 'special' 
  | 'emergency' 
  | 'bus'
  | 'moto'
  | 'trailers';

export interface VehicleCatalogEntry {
  id: string;
  type: CarType;
  nameRu: string;
  brand: string;
  category: VehicleCategory;
  classType: string;
  year?: number;
  powerHp: number;
  topSpeedKmh: number;
  weightKg: number;
  engineSpec?: string;
  fuelType: 'ai92' | 'ai95' | 'diesel';
  fuelTypeLabel: string;
  colors: { name: string; hex: string; roofHex?: string }[];
  descriptionRu: string;
  gearRatios?: number[];
  finalDriveRatio?: number;
  transmissionType?: 'AUTO' | 'MANUAL';
  hasTransferCase?: boolean;
  tankCapacity?: number;
}

function getDefaultsForCatalogEntry(type: string, category: VehicleCategory, fuelType: 'ai92' | 'ai95' | 'diesel', weightKg: number) {
  const isMachinery = ['paver_asphalt_wheeled', 'roller_heavy_tandem', 'roller_compact_sidewalk', 'roller_pneumatic'].includes(type);
  const isTruckOrBus = category === 'commercial' || category === 'bus' || (category === 'emergency' && type !== 'police');
  const isTractor = type.startsWith('tractor_');
  const isMoto = category === 'moto';
  const isSport = category === 'sport';
  const isVintage = fuelType === 'ai92' || type.includes('classic') || type.includes('retro');

  let gearRatios = [-3.4, 0, 3.5, 2.05, 1.38, 1.00, 0.78];
  let finalDriveRatio = 3.9;
  let transmissionType: 'AUTO' | 'MANUAL' = 'AUTO';
  let hasTransferCase = isTractor || isTruckOrBus;
  let tankCapacity = 55;

  if (type.startsWith('trailer_') || type === 'trailer_barrel' || type === 'trailer_flatbed_2axle') {
    gearRatios = [0];
    finalDriveRatio = 1;
    tankCapacity = 0;
  } else if (isMachinery) {
    gearRatios = [-3.6, 0, 5.2, 2.0];
    finalDriveRatio = 6.2;
    transmissionType = 'AUTO';
    tankCapacity = 90;
  } else if (isTractor) {
    gearRatios = [-4.5, 0, 5.5, 4.3, 3.3, 2.5, 1.9, 1.4, 1.0, 0.8, 0.65];
    finalDriveRatio = 5.4;
    transmissionType = 'MANUAL';
    tankCapacity = 130;
  } else if (isTruckOrBus) {
    gearRatios = [-4.5, 0, 4.8, 3.1, 2.0, 1.42, 1.00, 0.75];
    finalDriveRatio = 4.8;
    transmissionType = 'MANUAL';
    tankCapacity = type === 'truck_semi' ? 350 : 170;
  } else if (isSport) {
    gearRatios = [-3.2, 0, 3.1, 2.1, 1.55, 1.22, 1.00, 0.80];
    finalDriveRatio = 3.4;
    transmissionType = 'AUTO';
    tankCapacity = 75;
  } else if (isMoto) {
    gearRatios = type === 'moped_soviet' ? [-3.0, 0, 3.2, 1.8, 1.10] : [-2.8, 0, 2.7, 1.85, 1.35, 1.05, 0.85];
    finalDriveRatio = 3.2;
    transmissionType = 'MANUAL';
    tankCapacity = type === 'moped_soviet' ? 8 : (type === 'moto_ural_sidecar' ? 19 : 14);
  } else if (isVintage) {
    gearRatios = [-3.5, 0, 3.6, 2.1, 1.36, 0.96];
    finalDriveRatio = 4.1;
    transmissionType = 'MANUAL';
    tankCapacity = weightKg > 1500 ? 65 : 45;
  } else {
    gearRatios = [-3.4, 0, 3.5, 2.05, 1.38, 1.00, 0.78];
    finalDriveRatio = 3.9;
    transmissionType = 'AUTO';
    tankCapacity = weightKg > 1800 ? 70 : 50;
  }

  return { gearRatios, finalDriveRatio, transmissionType, hasTransferCase, tankCapacity };
}

export const DEFAULT_PALETTE = [
  { name: 'Охра Тракт', hex: '#c68a35' },
  { name: 'Белое облако', hex: '#f8fafc' },
  { name: 'Мокрый асфальт', hex: '#334155' },
  { name: 'Черный обсидиан', hex: '#0f172a' },
  { name: 'Коррида (красный)', hex: '#dc2626' },
  { name: 'Океан (синий)', hex: '#1d4ed8' },
  { name: 'Изумруд', hex: '#15803d' },
  { name: 'Песочный', hex: '#ca8a04' }
];

// Helper to deduce category
export function deduceCategory(type: string, classType?: string): VehicleCategory {
  const t = type.toLowerCase();
  const c = (classType || '').toLowerCase();
  if (t.startsWith('trailer') || t.includes('trailer') || t.includes('lowboy') || t.includes('barrel') || t.includes('vacuum') || c.includes('прицеп') || c.includes('трал') || c.includes('полуприцеп')) return 'trailers';
  if (t.startsWith('moto') || t.startsWith('moped') || c.includes('мотоцикл') || c.includes('мопед') || c.includes('байк')) return 'moto';
  if (t.includes('police') || t.includes('fire') || t.includes('ambulance') || c.includes('дпс') || c.includes('мчс') || c.includes('скорая')) return 'emergency';
  if (t.includes('bus') || t.includes('paz') || t.includes('ikarus') || c.includes('автобус')) return 'bus';
  if (t.includes('tractor') || t.includes('roller') || t.includes('paver') || t.includes('cement') || t.includes('garbage') || c.includes('каток') || c.includes('трактор') || c.includes('укладчик')) return 'special';
  if (t.includes('truck') || t.includes('van') || t.includes('kamaz') || t.includes('zil') || t.includes('semi') || c.includes('груз') || c.includes('фургон') || c.includes('тягач') || c.includes('самосвал')) return 'commercial';
  if (t.includes('suv') || t.includes('offroad') || t.includes('niva') || t.includes('uaz') || t.includes('pickup') || t.includes('crossover') || c.includes('внедорож') || c.includes('джип') || c.includes('4x4') || c.includes('кроссовер') || c.includes('пикап')) return 'suv';
  if (t.includes('sport') || t.includes('supercar') || t.includes('coupe') || t.includes('muscle') || t.includes('hatch_hot') || c.includes('спорт') || c.includes('суперкар') || c.includes('купе') || c.includes('маслкар')) return 'sport';
  return 'passenger';
}

// Build unified catalog
const catalogMap = new Map<string, VehicleCatalogEntry>();

// 1. Add all dealership cars
for (const car of DEALERSHIP_CARS) {
  const category = deduceCategory(car.type, car.classType);
  const defaults = getDefaultsForCatalogEntry(car.type, category, car.fuelType, car.weightKg);
  catalogMap.set(car.type, {
    id: car.id,
    type: car.type,
    nameRu: car.nameRu,
    brand: car.brand,
    category,
    classType: car.classType,
    year: car.year,
    powerHp: car.powerHp,
    topSpeedKmh: car.topSpeedKmh,
    weightKg: car.weightKg,
    engineSpec: car.engineSpec,
    fuelType: car.fuelType,
    fuelTypeLabel: car.fuelTypeLabel,
    colors: car.availableColors && car.availableColors.length > 0 ? car.availableColors : DEFAULT_PALETTE,
    descriptionRu: car.descriptionRu,
    ...defaults
  });
}

// 2. Comprehensive catalog for all specialized, service, commercial, classic, motorcycle and trailer types
const EXTRA_VEHICLES: Partial<VehicleCatalogEntry>[] = [
  // --- EMERGENCY & PUBLIC SERVICES ---
  {
    type: 'police',
    nameRu: 'Sentinel Patrol Cruiser',
    brand: 'Sentinel Emergency',
    category: 'emergency',
    classType: 'Police Interceptor',
    year: 2014,
    powerHp: 98,
    topSpeedKmh: 185,
    weightKg: 1100,
    engineSpec: '1.6L 16V Turbo Police Spec',
    fuelType: 'ai95',
    fuelTypeLabel: 'AI-95',
    colors: [{ name: 'Patrol White/Blue', hex: '#f8fafc', roofHex: '#2563eb' }],
    descriptionRu: 'Tactical law enforcement patrol cruiser equipped with emergency lightbar and siren system.'
  },
  {
    type: 'ambulance',
    nameRu: 'Sentinel Medic Van',
    brand: 'Sentinel Emergency',
    category: 'emergency',
    classType: 'Advanced Life Support',
    year: 2018,
    powerHp: 107,
    topSpeedKmh: 130,
    weightKg: 2800,
    engineSpec: '2.8L Turbo Diesel ALS',
    fuelType: 'diesel',
    fuelTypeLabel: 'Diesel',
    colors: [{ name: 'Medic Yellow', hex: '#fef08a', roofHex: '#f8fafc' }, { name: 'Medic White', hex: '#f8fafc' }],
    descriptionRu: 'Emergency medical services ambulance with optical sirens and fully equipped medical cabin.'
  },
  {
    type: 'fire_engine',
    nameRu: 'Sentinel Fire Engine Pumper',
    brand: 'Sentinel Emergency',
    category: 'emergency',
    classType: 'Heavy Fire Pumper',
    year: 2005,
    powerHp: 150,
    topSpeedKmh: 90,
    weightKg: 9500,
    engineSpec: '6.0L V8 Carbureted Heavy Duty',
    fuelType: 'ai92',
    fuelTypeLabel: 'AI-92',
    colors: [{ name: 'Fire Engine Red', hex: '#dc2626', roofHex: '#ffffff' }],
    descriptionRu: 'Heavy-duty all-terrain fire pumper equipped with high-pressure water pump and acoustic sirens.'
  },
  {
    type: 'fire_ladder',
    nameRu: 'Sentinel 30m Aerial Ladder',
    brand: 'Sentinel Emergency',
    category: 'emergency',
    classType: 'Fire Aerial Ladder Truck',
    year: 2016,
    powerHp: 260,
    topSpeedKmh: 120,
    weightKg: 13500,
    engineSpec: '11.76L V8 Turbo Diesel Heavy',
    fuelType: 'diesel',
    fuelTypeLabel: 'Diesel',
    colors: [{ name: 'Fire Ladder Red', hex: '#dc2626', roofHex: '#ffffff' }],
    descriptionRu: 'Telescopic 30-meter extendable fire rescue aerial ladder on heavy multi-axle chassis.'
  },

  // --- PASSENGER & TAXI ---
  {
    type: 'sedan',
    nameRu: 'Vortex Solstice 1.6',
    brand: 'Vortex',
    category: 'passenger',
    classType: 'Family Sedan',
    year: 2020,
    powerHp: 123,
    topSpeedKmh: 180,
    weightKg: 1400,
    engineSpec: '1.6L MPI DOHC 16V',
    fuelType: 'ai95',
    fuelTypeLabel: 'AI-95',
    colors: DEFAULT_PALETTE,
    descriptionRu: 'Comfortable modern urban sedan designed for daily commuting and reliability.'
  },
  {
    type: 'hatchback',
    nameRu: 'Vortex Nova 1.6',
    brand: 'Vortex',
    category: 'passenger',
    classType: 'Compact Hatchback',
    year: 2019,
    powerHp: 106,
    topSpeedKmh: 175,
    weightKg: 1150,
    engineSpec: '1.6L 16V EFI',
    fuelType: 'ai95',
    fuelTypeLabel: 'AI-95',
    colors: DEFAULT_PALETTE,
    descriptionRu: 'Agile and fuel-efficient hatchback with excellent visibility and nimble handling.'
  },
  {
    type: 'taxi',
    nameRu: 'Vortex Solstice Taxi',
    brand: 'Vortex',
    category: 'passenger',
    classType: 'City Taxi Fleet',
    year: 2021,
    powerHp: 106,
    topSpeedKmh: 175,
    weightKg: 1450,
    engineSpec: '1.6L 16V Gasoline + LPG',
    fuelType: 'ai92',
    fuelTypeLabel: 'AI-92',
    colors: [{ name: 'Taxi Yellow', hex: '#facc15' }],
    descriptionRu: 'City taxi cab equipped with dispatch navigation terminal and economical LPG system.'
  },
  {
    type: 'bus',
    nameRu: 'Metro Linemaster CityBus',
    brand: 'Metro Transit',
    category: 'bus',
    classType: 'Transit City Bus',
    year: 2013,
    powerHp: 245,
    topSpeedKmh: 110,
    weightKg: 9500,
    engineSpec: '6.7L Cummins Diesel Turbo',
    fuelType: 'diesel',
    fuelTypeLabel: 'Diesel',
    colors: [
      { name: 'Transit Blue', hex: '#2563eb', roofHex: '#f8fafc' },
      { name: 'Suburban Orange', hex: '#ea580c', roofHex: '#f8fafc' }
    ],
    descriptionRu: 'Spacious high-capacity city transit bus with air suspension and three wide passenger doors.'
  },

  // --- SPORT & MUSCLE ---
  {
    type: 'sports',
    nameRu: 'Apex GT-Coupe 3.0',
    brand: 'Apex Motors',
    category: 'sport',
    classType: 'Sports Coupe',
    year: 2021,
    powerHp: 380,
    topSpeedKmh: 280,
    weightKg: 1320,
    engineSpec: '3.0L Twin-Turbo Inline-6',
    fuelType: 'ai95',
    fuelTypeLabel: 'AI-95',
    colors: [
      { name: 'Scarlet Metallic', hex: '#dc2626' },
      { name: 'Solar Yellow', hex: '#eab308' },
      { name: 'Ultramarine Blue', hex: '#2563eb' },
      { name: 'Midnight Graphite', hex: '#0f172a' }
    ],
    descriptionRu: 'Rear-wheel-drive sports coupe featuring 50:50 weight distribution and sharp track handling.'
  },
  {
    type: 'supercar',
    nameRu: 'Apex Venom GT 4.0',
    brand: 'Apex Motors',
    category: 'sport',
    classType: 'Mid-Engine Supercar',
    year: 2023,
    powerHp: 720,
    topSpeedKmh: 320,
    weightKg: 1250,
    engineSpec: '4.0L V8 Twin-Turbo Mid-Engine',
    fuelType: 'ai95',
    fuelTypeLabel: 'AI-95',
    colors: [
      { name: 'Neon Lime', hex: '#84cc16' },
      { name: 'Carbon Black', hex: '#09090b' },
      { name: 'Blood Orange', hex: '#ea580c' }
    ],
    descriptionRu: 'Uncompromising carbon-fiber mid-engine supercar with aggressive aerodynamic downforce.'
  },
  {
    type: 'muscle',
    nameRu: 'Detroit Rebel V8 1969',
    brand: 'Detroit Legend',
    category: 'sport',
    classType: 'Classic Muscle Car',
    year: 1969,
    powerHp: 425,
    topSpeedKmh: 230,
    weightKg: 1650,
    engineSpec: '7.0L Big Block V8',
    fuelType: 'ai95',
    fuelTypeLabel: 'AI-95',
    colors: [
      { name: 'Volcano Orange', hex: '#ea580c' },
      { name: 'Striped Black', hex: '#09090b' },
      { name: 'Cobalt Blue', hex: '#1d4ed8' },
      { name: 'Dark Burgundy', hex: '#881337' }
    ],
    descriptionRu: 'American legend powered by a roaring 7-liter naturally aspirated V8 with explosive straight-line acceleration.'
  },
  {
    type: 'muscle_classic',
    nameRu: 'Detroit Viper V8 1971',
    brand: 'Detroit Motor Co.',
    category: 'sport',
    classType: 'V8 Muscle Car',
    year: 1971,
    powerHp: 375,
    topSpeedKmh: 230,
    weightKg: 1650,
    engineSpec: '6.6L Big-Block V8 4-BBL',
    fuelType: 'ai95',
    fuelTypeLabel: 'AI-95',
    colors: [
      { name: 'Purple Metallic', hex: '#7c3aed' },
      { name: 'Satin Black', hex: '#0f172a' },
      { name: 'Racing Yellow', hex: '#eab308' }
    ],
    descriptionRu: 'Golden era muscle car featuring dual-carburetor induction and wide rear stance.'
  },
  {
    type: 'coupe_gt',
    nameRu: 'Apex Grand Tourer 3.8',
    brand: 'Apex Motors',
    category: 'sport',
    classType: 'Luxury GT Coupe',
    year: 2022,
    powerHp: 450,
    topSpeedKmh: 270,
    weightKg: 1650,
    engineSpec: '3.8L Twin-Turbo V6',
    fuelType: 'ai95',
    fuelTypeLabel: 'AI-95',
    colors: [
      { name: 'Titanium Silver', hex: '#94a3b8' },
      { name: 'Deep Sapphire', hex: '#1e3a8a' },
      { name: 'Gloss Black', hex: '#09090b' }
    ],
    descriptionRu: 'Luxurious high-speed grand touring coupe built for effortless high-velocity highway cruising.'
  },

  // --- SUV & 4X4 ---
  {
    type: 'suv',
    nameRu: 'Nordic Nomad 2.0',
    brand: 'Nordic Auto',
    category: 'suv',
    classType: 'Crossover 4x4',
    year: 2021,
    powerHp: 150,
    topSpeedKmh: 170,
    weightKg: 1450,
    engineSpec: '2.0L Turbo 16V AWD',
    fuelType: 'ai95',
    fuelTypeLabel: 'AI-95',
    colors: DEFAULT_PALETTE,
    descriptionRu: 'Versatile family crossover equipped with raised ground clearance and intelligent all-wheel drive.'
  },
  {
    type: 'pickup',
    nameRu: 'Bison Utility 4x4',
    brand: 'Bison Trucks',
    category: 'suv',
    classType: 'AWD Pickup',
    year: 2018,
    powerHp: 180,
    topSpeedKmh: 150,
    weightKg: 2200,
    engineSpec: '2.5L Turbo Diesel 4WD',
    fuelType: 'diesel',
    fuelTypeLabel: 'Diesel',
    colors: DEFAULT_PALETTE,
    descriptionRu: 'Rugged body-on-frame pickup truck with spacious cargo bed and low-range transfer case.'
  },
  {
    type: 'pickup_heavy',
    nameRu: 'Bison Heavy Duty V8',
    brand: 'Bison Trucks',
    category: 'suv',
    classType: 'Heavy Frame Pickup',
    year: 2022,
    powerHp: 385,
    topSpeedKmh: 160,
    weightKg: 3100,
    engineSpec: '6.7L V8 Turbo Diesel PowerStroke',
    fuelType: 'diesel',
    fuelTypeLabel: 'Diesel',
    colors: [
      { name: 'Desert Coyote', hex: '#b45309' },
      { name: 'Granite Black', hex: '#0f172a' },
      { name: 'Arctic White', hex: '#f8fafc' }
    ],
    descriptionRu: 'Heavy-duty utility truck with dual rear wheels and robust fifth-wheel towing capacity.'
  },

  // --- COMMERCIAL, TRUCKS & VANS ---
  {
    type: 'van',
    nameRu: 'Bison Transporter Van',
    brand: 'Bison Trucks',
    category: 'commercial',
    classType: 'Cargo Van',
    year: 2020,
    powerHp: 149,
    topSpeedKmh: 160,
    weightKg: 2100,
    engineSpec: '2.8L ISF Turbo Diesel',
    fuelType: 'diesel',
    fuelTypeLabel: 'Diesel',
    colors: DEFAULT_PALETTE,
    descriptionRu: 'Dependable all-steel cargo panel van built for commercial transport and logistics.'
  },
  {
    type: 'truck_tow',
    nameRu: 'Bison TowMaster Platform',
    brand: 'Bison Trucks',
    category: 'commercial',
    classType: 'Recovery Tow Truck',
    year: 2017,
    powerHp: 152,
    topSpeedKmh: 140,
    weightKg: 4200,
    engineSpec: '3.8L Turbo Diesel Hydraulic',
    fuelType: 'diesel',
    fuelTypeLabel: 'Diesel',
    colors: [{ name: 'Warning Amber', hex: '#eab308' }],
    descriptionRu: 'Specialized recovery tow truck featuring hydraulic slide bed and heavy-duty winch.'
  },
  {
    type: 'truck_armored',
    nameRu: 'Bison Vault Guard',
    brand: 'Bison Trucks',
    category: 'commercial',
    classType: 'Armored Cash-In-Transit',
    year: 2019,
    powerHp: 180,
    topSpeedKmh: 140,
    weightKg: 5500,
    engineSpec: '4.5L V8 Diesel Heavy Guard',
    fuelType: 'diesel',
    fuelTypeLabel: 'Diesel',
    colors: [{ name: 'Vault Sand', hex: '#ca8a04', roofHex: '#15803d' }],
    descriptionRu: 'Heavy armored security van with bulletproof ballistic plating and secure cash vault.'
  },
  {
    type: 'delivery_truck',
    nameRu: 'Bison Express Stepvan',
    brand: 'Bison Trucks',
    category: 'commercial',
    classType: 'Express Delivery Van',
    year: 2020,
    powerHp: 125,
    topSpeedKmh: 145,
    weightKg: 3200,
    engineSpec: '2.7L EFI Commercial',
    fuelType: 'ai92',
    fuelTypeLabel: 'AI-92',
    colors: [{ name: 'Express Yellow', hex: '#facc15' }, { name: 'Courier White', hex: '#f8fafc' }],
    descriptionRu: 'Dedicated delivery stepvan with sliding cabin doors for rapid package distribution.'
  },
  {
    type: 'truck_box',
    nameRu: 'Titan Cargo Box 5T',
    brand: 'Titan Heavy',
    category: 'commercial',
    classType: 'Medium Duty Box Truck',
    year: 2019,
    powerHp: 170,
    topSpeedKmh: 125,
    weightKg: 6200,
    engineSpec: '4.43L Turbo Diesel 5T',
    fuelType: 'diesel',
    fuelTypeLabel: 'Diesel',
    colors: [{ name: 'White Cab + Blue Box', hex: '#0284c7', roofHex: '#f8fafc' }],
    descriptionRu: 'Classic medium-duty cargo truck featuring rigid insulated box body.'
  },
  {
    type: 'truck_semi',
    nameRu: 'Titan Atlas 6x4 Prime Mover',
    brand: 'Titan Heavy',
    category: 'commercial',
    classType: 'Heavy Semi-Tractor',
    year: 2004,
    powerHp: 240,
    topSpeedKmh: 110,
    weightKg: 7500,
    engineSpec: '10.85L V8 Turbo Diesel Heavy',
    fuelType: 'diesel',
    fuelTypeLabel: 'Diesel',
    colors: [
      { name: 'Atlas Orange', hex: '#ea580c' },
      { name: 'Atlas Blue', hex: '#1e40af' },
      { name: 'Arctic White', hex: '#f8fafc' }
    ],
    descriptionRu: 'Triple-axle semi-tractor equipped with sleeper cab for long-haul semi-trailer operations.'
  },
  {
    type: 'truck_tanker',
    nameRu: 'Titan Fuel Tanker Hazmat',
    brand: 'Titan Heavy',
    category: 'commercial',
    classType: 'Fuel Tanker Truck',
    year: 2015,
    powerHp: 240,
    topSpeedKmh: 110,
    weightKg: 9200,
    engineSpec: '10.85L V8 Turbo Diesel Tanker',
    fuelType: 'diesel',
    fuelTypeLabel: 'Diesel',
    colors: [{ name: 'Hazmat Orange', hex: '#ea580c' }],
    descriptionRu: 'Hazardous material fuel tanker truck with delivery pump and flow meter for gas stations.'
  },
  {
    type: 'truck_water',
    nameRu: 'Titan Aqua Sprinkler',
    brand: 'Titan Heavy',
    category: 'commercial',
    classType: 'Municipal Water Tanker',
    year: 1991,
    powerHp: 150,
    topSpeedKmh: 118,
    weightKg: 8000,
    engineSpec: '6.0L V8 Municipal Spec',
    fuelType: 'ai92',
    fuelTypeLabel: 'AI-92',
    colors: [{ name: 'Municipal Orange', hex: '#ea580c', roofHex: '#0284c7' }],
    descriptionRu: 'Municipal utility water tanker with rear spray nozzles for street cleaning and dust control.'
  },
  {
    type: 'cement_mixer',
    nameRu: 'Titan MixMaster 7m³',
    brand: 'Titan Heavy',
    category: 'commercial',
    classType: 'Concrete Mixer Truck',
    year: 2014,
    powerHp: 280,
    topSpeedKmh: 105,
    weightKg: 9800,
    engineSpec: '11.76L V8 Turbo Diesel Drum',
    fuelType: 'diesel',
    fuelTypeLabel: 'Diesel',
    colors: [{ name: 'White Drum', hex: '#f8fafc', roofHex: '#ea580c' }],
    descriptionRu: 'Heavy construction mixer truck with rotating gravity mixing drum for fresh concrete delivery.'
  },
  {
    type: 'garbage_truck',
    nameRu: 'Titan EcoPress Compactor',
    brand: 'Titan Heavy',
    category: 'commercial',
    classType: 'Municipal Garbage Truck',
    year: 2018,
    powerHp: 240,
    topSpeedKmh: 100,
    weightKg: 10500,
    engineSpec: '6.7L Cummins Diesel Compactor',
    fuelType: 'diesel',
    fuelTypeLabel: 'Diesel',
    colors: [{ name: 'Sanitation Orange', hex: '#ea580c' }],
    descriptionRu: 'Municipal waste collection truck with rear mechanical loader and hydraulic compaction plate.'
  },

  // --- SPECIAL MACHINERY & TRACTORS ---
  {
    type: 'tractor_mtz82',
    nameRu: 'AgriTech Fieldmaster 82 (4x4)',
    brand: 'AgriTech',
    category: 'special',
    classType: 'AWD Utility Tractor',
    year: 1994,
    powerHp: 81,
    topSpeedKmh: 70,
    weightKg: 4000,
    engineSpec: '4.75L 4-Cyl Diesel 4WD',
    fuelType: 'diesel',
    fuelTypeLabel: 'Diesel',
    colors: [
      { name: 'Agri Blue', hex: '#1d4ed8' },
      { name: 'Agri Red', hex: '#dc2626' }
    ],
    descriptionRu: 'Reliable all-wheel-drive agricultural row-crop tractor with PTO and drawbar hitch.'
  },
  {
    type: 'tractor_mtz80',
    nameRu: 'AgriTech Workhorse 80',
    brand: 'AgriTech',
    category: 'special',
    classType: 'Row-Crop Tractor 2WD',
    year: 1988,
    powerHp: 75,
    topSpeedKmh: 70,
    weightKg: 3800,
    engineSpec: '4.75L 4-Cyl Diesel 2WD',
    fuelType: 'diesel',
    fuelTypeLabel: 'Diesel',
    colors: [
      { name: 'Agri Blue', hex: '#1d4ed8' },
      { name: 'Agri Red', hex: '#dc2626' }
    ],
    descriptionRu: 'Classic rear-wheel-drive farm tractor with narrow front steering axle for field operations.'
  },

  // --- MOTORCYCLES & MOPEDS ---
  {
    type: 'moto_izh_jupiter',
    nameRu: 'Stellar Cruiser 350',
    brand: 'Stellar Moto',
    category: 'moto',
    classType: 'Classic Road Motorcycle',
    year: 1992,
    powerHp: 24,
    topSpeedKmh: 165,
    weightKg: 175,
    engineSpec: '348cc 2-Stroke Twin',
    fuelType: 'ai92',
    fuelTypeLabel: 'AI-92',
    colors: [
      { name: 'Stellar Red', hex: '#dc2626' },
      { name: 'Stellar Azure', hex: '#0284c7' },
      { name: 'Stellar Black', hex: '#0f172a' }
    ],
    descriptionRu: 'Twin-cylinder classic road motorcycle with distinctive dual-exhaust note.'
  },
  {
    type: 'moto_ural_sidecar',
    nameRu: 'Stellar Outback Sidecar',
    brand: 'Stellar Moto',
    category: 'moto',
    classType: 'Heavy Sidecar Motorcycle',
    year: 1985,
    powerHp: 36,
    topSpeedKmh: 145,
    weightKg: 350,
    engineSpec: '649cc 4-Stroke Boxer Twin',
    fuelType: 'ai92',
    fuelTypeLabel: 'AI-92',
    colors: [
      { name: 'Militia Khaki', hex: '#4d5b38' },
      { name: 'Gloss Blue', hex: '#1d4ed8' }
    ],
    descriptionRu: 'Heavy-duty boxer twin motorcycle featuring shaft drive and passenger sidecar.'
  },
  {
    type: 'moto_jawa350',
    nameRu: 'Stellar Classic 350',
    brand: 'Stellar Moto',
    category: 'moto',
    classType: 'Vintage Two-Stroke Moto',
    year: 1989,
    powerHp: 26,
    topSpeedKmh: 175,
    weightKg: 160,
    engineSpec: '343cc 2-Stroke Twin Oil-Inject',
    fuelType: 'ai92',
    fuelTypeLabel: 'AI-92',
    colors: [{ name: 'Cherry Red', hex: '#881337' }],
    descriptionRu: 'Iconic retro motorcycle with exceptional agility and classic cigar-pipe exhausts.'
  },
  {
    type: 'moto_sport',
    nameRu: 'Stellar Superbike 1000',
    brand: 'Stellar Moto',
    category: 'moto',
    classType: 'High-Speed Sportbike',
    year: 2022,
    powerHp: 180,
    topSpeedKmh: 310,
    weightKg: 195,
    engineSpec: '998cc 16V DOHC Inline-4',
    fuelType: 'ai95',
    fuelTypeLabel: 'AI-95',
    colors: [
      { name: 'Racing Blue', hex: '#2563eb' },
      { name: 'Black / Red', hex: '#dc2626' },
      { name: 'Acid Green', hex: '#16a34a' }
    ],
    descriptionRu: 'Lightning-fast superbike delivering blistering acceleration up to 300+ km/h.'
  },
  {
    type: 'moto_chopper',
    nameRu: 'Stellar V-Twin Cruiser',
    brand: 'Stellar Moto',
    category: 'moto',
    classType: 'Custom V-Twin Chopper',
    year: 2018,
    powerHp: 78,
    topSpeedKmh: 190,
    weightKg: 310,
    engineSpec: '1200cc V-Twin Air-Cooled',
    fuelType: 'ai95',
    fuelTypeLabel: 'AI-95',
    colors: [{ name: 'Chrome Black', hex: '#09090b' }],
    descriptionRu: 'Custom cruiser with relaxed forward foot controls and deep low-frequency exhaust roar.'
  },
  {
    type: 'moped_soviet',
    nameRu: 'Stellar Cub Moped 50cc',
    brand: 'Stellar Moto',
    category: 'moto',
    classType: 'Light Utility Moped',
    year: 1989,
    powerHp: 2,
    topSpeedKmh: 95,
    weightKg: 55,
    engineSpec: '49.8cc 2-Stroke Single',
    fuelType: 'ai92',
    fuelTypeLabel: 'AI-92',
    colors: [
      { name: 'Cub Orange', hex: '#ea580c' },
      { name: 'Cub Green', hex: '#15803d' }
    ],
    descriptionRu: 'Lightweight two-speed step-through utility moped with auxiliary pedal assist.'
  },

  // --- TRAILERS & SEMI-TRAILERS ---
  {
    type: 'trailer_semi',
    nameRu: 'IronForge Prime Flatbed Trailer',
    brand: 'IronForge',
    category: 'trailers',
    classType: '3-Axle Semi Flatbed',
    year: 2016,
    powerHp: 0,
    topSpeedKmh: 120,
    weightKg: 6500,
    engineSpec: 'Kingpin 2" (50mm)',
    fuelType: 'diesel',
    fuelTypeLabel: 'Trailer',
    colors: [{ name: 'Flatbed Blue', hex: '#1d4ed8' }, { name: 'Industrial Gray', hex: '#475569' }],
    descriptionRu: 'Heavy-duty tri-axle semi-flatbed trailer for general cargo and freight transport.'
  },
  {
    type: 'trailer_semi_box',
    nameRu: 'IronForge Thermo Reefer Trailer',
    brand: 'IronForge',
    category: 'trailers',
    classType: 'Isothermal Reefer Trailer',
    year: 2015,
    powerHp: 0,
    topSpeedKmh: 120,
    weightKg: 7200,
    engineSpec: 'Thermo Unit Refrigeration',
    fuelType: 'diesel',
    fuelTypeLabel: 'Trailer',
    colors: [{ name: 'Reefer White', hex: '#f8fafc', roofHex: '#dc2626' }],
    descriptionRu: 'Insulated refrigerated semi-trailer designed for temperature-controlled cargo logistics.'
  },
  {
    type: 'trailer_semi_tanker',
    nameRu: 'IronForge Hazmat Fuel Tanker 30m³',
    brand: 'IronForge',
    category: 'trailers',
    classType: 'Fuel Semi-Tanker',
    year: 2018,
    powerHp: 0,
    topSpeedKmh: 115,
    weightKg: 7800,
    engineSpec: '3-Compartment 30m³ Tank',
    fuelType: 'diesel',
    fuelTypeLabel: 'Trailer',
    colors: [{ name: 'Hazmat Orange', hex: '#ea580c' }],
    descriptionRu: 'Large-capacity triple-compartment fuel tanker semi-trailer for bulk fuel distribution.'
  },
  {
    type: 'trailer_semi_container',
    nameRu: 'IronForge Intermodal Container 40ft',
    brand: 'IronForge',
    category: 'trailers',
    classType: 'Container Chassis Trailer',
    year: 2017,
    powerHp: 0,
    topSpeedKmh: 120,
    weightKg: 8500,
    engineSpec: 'Twist-Lock 40ft Locks',
    fuelType: 'diesel',
    fuelTypeLabel: 'Trailer',
    colors: [{ name: 'Container Red', hex: '#991b1b' }],
    descriptionRu: 'Container chassis semi-trailer equipped with secured 40-foot intermodal shipping container.'
  },
  {
    type: 'trailer_semi_lowboy',
    nameRu: 'IronForge Titan Lowboy 40T',
    brand: 'IronForge',
    category: 'trailers',
    classType: 'Heavy Lowboy Trailer',
    year: 2019,
    powerHp: 0,
    topSpeedKmh: 110,
    weightKg: 8900,
    engineSpec: 'Ramps 40-Ton Capacity',
    fuelType: 'diesel',
    fuelTypeLabel: 'Trailer',
    colors: [{ name: 'Lowboy Amber', hex: '#d97706' }],
    descriptionRu: 'Heavy-duty low-deck drop-deck trailer for transporting road rollers, pavers, and tractors.'
  },
  {
    type: 'trailer_barrel',
    nameRu: 'AgriTech FarmTank 3.5m³',
    brand: 'AgriTech',
    category: 'trailers',
    classType: 'Tractor Water Tanker',
    year: 2010,
    powerHp: 0,
    topSpeedKmh: 110,
    weightKg: 1400,
    engineSpec: 'Tractor Drawbar Hitch',
    fuelType: 'diesel',
    fuelTypeLabel: 'Trailer',
    colors: [{ name: 'Tank Yellow', hex: '#ca8a04' }],
    descriptionRu: 'Tractor-pulled cylindrical tank trailer for transporting water and liquid fertilizers.'
  },
  {
    type: 'trailer_vacuum',
    nameRu: 'AgriTech SlurryVac Tanker',
    brand: 'AgriTech',
    category: 'trailers',
    classType: 'Vacuum Slurry Tanker',
    year: 2012,
    powerHp: 0,
    topSpeedKmh: 110,
    weightKg: 1480,
    engineSpec: 'PTO Vacuum Pump System',
    fuelType: 'diesel',
    fuelTypeLabel: 'Trailer',
    colors: [{ name: 'Slurry Orange', hex: '#ea580c' }],
    descriptionRu: 'Tractor vacuum tank trailer equipped with PTO-driven pump for liquid waste extraction.'
  },
  {
    type: 'trailer_flatbed_2axle',
    nameRu: 'AgriTech AgriDump 4T',
    brand: 'AgriTech',
    category: 'trailers',
    classType: '2-Axle Farm Trailer',
    year: 1995,
    powerHp: 0,
    topSpeedKmh: 110,
    weightKg: 2400,
    engineSpec: 'Turntable Steering & Hydraulic Lift',
    fuelType: 'diesel',
    fuelTypeLabel: 'Trailer',
    colors: [{ name: 'Farm Green', hex: '#166534' }, { name: 'Flatbed Blue', hex: '#1d4ed8' }],
    descriptionRu: 'Universal 2-axle agricultural tipping trailer with 4-ton payload capacity.'
  }
];

// Add extra items
for (const extra of EXTRA_VEHICLES) {
  if (extra.type && !catalogMap.has(extra.type)) {
    const category = extra.category || deduceCategory(extra.type, extra.classType);
    const fuelType = extra.fuelType || 'ai95';
    const weightKg = extra.weightKg || 1400;
    const defaults = getDefaultsForCatalogEntry(extra.type, category, fuelType, weightKg);
    catalogMap.set(extra.type, {
      id: `cat_${extra.type}`,
      type: extra.type as CarType,
      nameRu: extra.nameRu || extra.type,
      brand: extra.brand || 'Авто',
      category,
      classType: extra.classType || 'Транспорт',
      year: extra.year || 2020,
      powerHp: extra.powerHp || 100,
      topSpeedKmh: extra.topSpeedKmh || 160,
      weightKg,
      engineSpec: extra.engineSpec || 'ДВС',
      fuelType,
      fuelTypeLabel: extra.fuelTypeLabel || 'АИ-95',
      colors: extra.colors && extra.colors.length > 0 ? extra.colors : DEFAULT_PALETTE,
      descriptionRu: extra.descriptionRu || 'Надежный транспорт для любых дорог.',
      ...defaults
    });
  }
}

export const VEHICLE_CATALOG: VehicleCatalogEntry[] = Array.from(catalogMap.values());

export function getVehicleCatalogItem(type: string): VehicleCatalogEntry | undefined {
  return catalogMap.get(type);
}
