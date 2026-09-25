import { CarType } from '../types';

export type VehicleControlTheme = 
  | 'sport' 
  | 'tractor' 
  | 'machinery'
  | 'truck' 
  | 'retro' 
  | 'luxury' 
  | 'offroad' 
  | 'emergency' 
  | 'standard';

/**
 * Maps any carType to its authentic interior controls archetype (steering wheel & shift knob).
 * Synchronized with the dashboard cluster theme.
 */
export function getVehicleControlTheme(carType?: string): VehicleControlTheme {
  if (!carType) return 'standard';

  // 1a. Road Construction Machinery (Rollers, Asphalt Paver - Hydrostatic Drive ГСТ)
  if (
    carType.startsWith('roller_') ||
    carType.startsWith('paver_')
  ) {
    return 'machinery';
  }

  // 1b. Soviet Tractors (MTZ-80, MTZ-82)
  if (carType.startsWith('tractor_')) {
    return 'tractor';
  }

  // 2. Heavy Commercial Trucks, Buses, Utilities
  if (
    carType.startsWith('truck_') ||
    carType === 'cement_mixer' ||
    carType === 'garbage_truck' ||
    carType === 'delivery_truck' ||
    carType === 'bus' ||
    carType === 'bus_minibus'
  ) {
    return 'truck';
  }

  // 3. Vintage / Soviet Classics & Retro vehicles
  if (
    carType === 'retro_bubble' ||
    carType === 'classic_compact' ||
    carType === 'micro_car' ||
    carType === 'sedan_classic' ||
    carType === 'wagon_classic' ||
    carType === 'van_cargo_old' || // Authentic UAZ "Bukhanka"
    carType === 'moto_izh_jupiter' ||
    carType === 'moto_ural_sidecar' ||
    carType === 'moto_jawa350' ||
    carType === 'moto_chopper' ||
    carType === 'moped_soviet'
  ) {
    return 'retro';
  }

  // 4. Sport / Supercars / Muscle
  if (
    carType === 'supercar' ||
    carType === 'sports' ||
    carType === 'muscle' ||
    carType === 'muscle_classic' ||
    carType === 'hatch_hot' ||
    carType === 'coupe_gt' ||
    carType === 'moto_sport'
  ) {
    return 'sport';
  }

  // 5. Executive / Luxury
  if (
    carType === 'sedan_luxury' ||
    carType === 'suv_luxury'
  ) {
    return 'luxury';
  }

  // 6. Hardcore Off-road & 4x4 Pickups
  if (
    carType === 'offroad_hardcore' ||
    carType === 'pickup' ||
    carType === 'pickup_heavy' ||
    carType === 'suv_classic_box'
  ) {
    return 'offroad';
  }

  // 7. Municipal Emergency & Service Vehicles
  if (
    carType === 'police' ||
    carType === 'ambulance' ||
    carType === 'ambulance_van' ||
    carType === 'ambulance_suv' ||
    carType === 'fire_engine' ||
    carType === 'fire_ladder' ||
    carType === 'fire_rescue' ||
    carType === 'taxi'
  ) {
    return 'emergency';
  }

  // 8. Standard Modern Civilian (Sedan, Compact, Hatchback, Crossover, Wagon, Van, Camper)
  return 'standard';
}

export interface ControlThemeMeta {
  wheelName: string;
  knobName: string;
  badgeText: string;
  accentColor: string;
  dialBorderColor: string;
  dialBgColor: string;
  bootStyle: 'rubber_bellows' | 'vintage_pleated' | 'sport_alcantara' | 'luxury_leather' | 'rugged_vinyl' | 'standard_leather';
  shaftStyle: 'black_industrial' | 'chrome_slender' | 'titanium_sport' | 'satin_silver' | 'standard_steel';
}

export const CONTROL_THEME_META: Record<VehicleControlTheme, ControlThemeMeta> = {
  machinery: {
    wheelName: 'Руль спецтехники с лентяйкой',
    knobName: 'Джойстик хода ГСТ (Вперед/Стоп/Назад)',
    badgeText: 'ГСТ / СПЕЦТЕХНИКА',
    accentColor: '#eab308',
    dialBorderColor: '#854d0e',
    dialBgColor: 'rgba(28, 25, 23, 0.94)',
    bootStyle: 'rubber_bellows',
    shaftStyle: 'black_industrial',
  },
  tractor: {
    wheelName: 'Руль МТЗ с лентяйкой',
    knobName: 'Эбонитовый набалдашник МТЗ',
    badgeText: 'МТЗ-80',
    accentColor: '#f59e0b',
    dialBorderColor: '#78350f',
    dialBgColor: 'rgba(28, 25, 23, 0.92)',
    bootStyle: 'rubber_bellows',
    shaftStyle: 'black_industrial',
  },
  truck: {
    wheelName: 'Грузовой 2-спицевый руль',
    knobName: 'Рукоять с делителем КПП',
    badgeText: 'ЗИЛ / ГРУЗОВОЙ',
    accentColor: '#38bdf8',
    dialBorderColor: '#0369a1',
    dialBgColor: 'rgba(15, 23, 42, 0.92)',
    bootStyle: 'rubber_bellows',
    shaftStyle: 'black_industrial',
  },
  retro: {
    wheelName: 'Классический руль с кольцом',
    knobName: 'Эпоксидная «Розочка»',
    badgeText: 'СССР КЛАССИКА',
    accentColor: '#fbbf24',
    dialBorderColor: '#92400e',
    dialBgColor: 'rgba(24, 24, 27, 0.92)',
    bootStyle: 'vintage_pleated',
    shaftStyle: 'chrome_slender',
  },
  sport: {
    wheelName: 'Спортивный D-Cut руль с лепестками',
    knobName: 'Гоночный карбон/алюминий',
    badgeText: 'GT SPORT',
    accentColor: '#ef4444',
    dialBorderColor: '#dc2626',
    dialBgColor: 'rgba(15, 23, 42, 0.94)',
    bootStyle: 'sport_alcantara',
    shaftStyle: 'titanium_sport',
  },
  luxury: {
    wheelName: 'Премиум-руль с орехом и сенсорами',
    knobName: 'Хрустальный селектор',
    badgeText: 'EXECUTIVE',
    accentColor: '#e2e8f0',
    dialBorderColor: '#64748b',
    dialBgColor: 'rgba(15, 23, 42, 0.92)',
    bootStyle: 'luxury_leather',
    shaftStyle: 'satin_silver',
  },
  offroad: {
    wheelName: 'Внедорожный 4x4 руль',
    knobName: 'Протекторный 4WD набалдашник',
    badgeText: '4x4 HARDCORE',
    accentColor: '#10b981',
    dialBorderColor: '#059669',
    dialBgColor: 'rgba(6, 78, 59, 0.25)',
    bootStyle: 'rugged_vinyl',
    shaftStyle: 'black_industrial',
  },
  emergency: {
    wheelName: 'Служебный тактический руль',
    knobName: 'Спецслужбовый набалдашник',
    badgeText: 'СПЕЦСЛУЖБА',
    accentColor: '#38bdf8',
    dialBorderColor: '#0284c7',
    dialBgColor: 'rgba(15, 23, 42, 0.92)',
    bootStyle: 'rugged_vinyl',
    shaftStyle: 'standard_steel',
  },
  standard: {
    wheelName: 'Эргономичный 3-спицевый руль',
    knobName: 'Классический набалдашник',
    badgeText: 'ГОРОДСКОЙ',
    accentColor: '#94a3b8',
    dialBorderColor: '#475569',
    dialBgColor: 'rgba(15, 23, 42, 0.92)',
    bootStyle: 'standard_leather',
    shaftStyle: 'standard_steel',
  },
};
