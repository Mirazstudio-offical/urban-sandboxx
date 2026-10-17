import React, { useState, useEffect, useRef } from 'react';
import { CarType, Vehicle, Player, GameWorld } from '../types';
import { CAR_CONFIGS, createDefaultEngineState, createDefaultFuelSystem, createDefaultVehicleDamage, isRoadMachinery } from '../vehicleHelpers';
import { 
  getVehicleBasePolygon, 
  getVehicleCabinDimensions, 
  renderVehicleGreenhouseAndBodyPanels, 
  renderSpecializedVehicleAttachments, 
  VehicleRenderContext 
} from '../vehicleVisuals';
import { traceSoftbodyPath, renderSoftbodyStressLines } from '../softbodyVisuals';
import { getPlayerCash, deductPlayerCash, createItem, addItemToPlayer, getCarKeyTier, getCarKeyFeatures, getVehicleRequiredKeyType, addPlayerNotification } from '../items';
import { sound } from '../audio';
import { Car, Sparkles, Clock, Coins, CheckCircle2, X } from 'lucide-react';

export interface DealershipCarModel {
  id: string;
  type: CarType;
  name: string;
  nameRu: string;
  brand: string;
  classType: string;
  year: number;
  engineSpec: string;
  powerHp: number;
  displacementL: number;
  fuelType: 'ai92'| 'ai95'| 'diesel';
  fuelTypeLabel: string;
  topSpeedKmh: number;
  accelSec: number;
  weightKg: number;
  tankCapacityL: number;
  dimensionsM: string;
  hasAutoTrans: boolean;
  hasManualTrans: boolean;
  priceRub: number;
  availableColors: { name: string; hex: string; roofHex?: string }[];
  descriptionRu: string;
}

export const DEALERSHIP_CARS: DealershipCarModel[] = [
  {
    id: 'deal_liftback_tavria',
    type: 'liftback_tavria',
    name: 'Vanguard Nova 1.1L Liftback',
    nameRu: 'Vanguard Nova',
    brand: 'Vanguard',
    classType: 'Ultra-Budget Liftback',
    year: 1998,
    engineSpec: '1.1L Carburetor Inline-4',
    powerHp: 53,
    displacementL: 1.1,
    fuelType: 'ai92',
    fuelTypeLabel: 'Regular 92',
    topSpeedKmh: 145,
    accelSec: 16.2,
    weightKg: 710,
    tankCapacityL: 39,
    dimensionsM: '3.70 x 1.55 m',
    hasAutoTrans: false,
    hasManualTrans: true,
    priceRub: 68000,
    availableColors: [
      { name: 'Alpine White', hex: '#f8fafc' },
      { name: 'Ocean Blue', hex: '#1d4ed8' },
      { name: 'Matador Red', hex: '#dc2626' },
      { name: 'Teal Green', hex: '#0f766e' },
      { name: 'Desert Sand', hex: '#ca8a04' }
    ],
    descriptionRu: 'Lightweight and nimble front-wheel-drive liftback with a single windshield wiper and unpretentious carburetor engine. Weighs only 710 kg!'
  },
  {
    id: 'deal_hatch_samara',
    type: 'hatch_samara',
    name: 'Vanguard Apex 1.5L Hatchback',
    nameRu: 'Vanguard Apex',
    brand: 'Vanguard',
    classType: 'B-Class Hatchback',
    year: 2002,
    engineSpec: '1.5L 8V EFI Inline-4',
    powerHp: 78,
    displacementL: 1.5,
    fuelType: 'ai92',
    fuelTypeLabel: 'Regular 92',
    topSpeedKmh: 160,
    accelSec: 13.0,
    weightKg: 945,
    tankCapacityL: 43,
    dimensionsM: '4.00 x 1.65 m',
    hasAutoTrans: false,
    hasManualTrans: true,
    priceRub: 120000,
    availableColors: [
      { name: 'Dark Slate Gray', hex: '#334155' },
      { name: 'Silver Metallic', hex: '#cbd5e1' },
      { name: 'Cherry Burgundy', hex: '#991b1b' },
      { name: 'Baltic Blue', hex: '#1e40af' },
      { name: 'Cloud White', hex: '#f8fafc' },
      { name: 'Deep Purple', hex: '#4c1d95' }
    ],
    descriptionRu: 'Wedge-shaped 5-door hatchback with a rear spoiler and reliable 8-valve electronic fuel injection motor.'
  },
  {
    id: 'deal_sedan_samara',
    type: 'sedan_samara',
    name: 'Vanguard Envoy 1.5L Sedan',
    nameRu: 'Vanguard Envoy',
    brand: 'Vanguard',
    classType: 'B-Class Sedan',
    year: 2003,
    engineSpec: '1.5L 8V EFI Inline-4',
    powerHp: 78,
    displacementL: 1.5,
    fuelType: 'ai92',
    fuelTypeLabel: 'Regular 92',
    topSpeedKmh: 165,
    accelSec: 13.2,
    weightKg: 970,
    tankCapacityL: 43,
    dimensionsM: '4.20 x 1.65 m',
    hasAutoTrans: false,
    hasManualTrans: true,
    priceRub: 135000,
    availableColors: [
      { name: 'Silver Frost', hex: '#cbd5e1' },
      { name: 'Graphite Metallic', hex: '#1e293b' },
      { name: 'Seafoam Teal', hex: '#0f766e' },
      { name: 'Ruby Red', hex: '#b91c1c' },
      { name: 'Ice Blue', hex: '#93c5fd' }
    ],
    descriptionRu: 'Aerodynamic sleek sedan featuring a factory trunklid spoiler and spacious cargo compartment.'
  },
  {
    id: 'deal_compact_matiz',
    type: 'compact_matiz',
    name: 'Kestrel Sprite 0.8L City Micro',
    nameRu: 'Kestrel Sprite',
    brand: 'Kestrel',
    classType: 'A-Class Microcar',
    year: 2012,
    engineSpec: '0.8L 3-Cylinder SOHC',
    powerHp: 52,
    displacementL: 0.8,
    fuelType: 'ai92',
    fuelTypeLabel: 'Regular 92',
    topSpeedKmh: 144,
    accelSec: 17.0,
    weightKg: 770,
    tankCapacityL: 35,
    dimensionsM: '3.49 x 1.49 m',
    hasAutoTrans: false,
    hasManualTrans: true,
    priceRub: 145000,
    availableColors: [
      { name: 'Lime Green', hex: '#84cc16' },
      { name: 'Sunburst Yellow', hex: '#facc15' },
      { name: 'Cornflower Blue', hex: '#2563eb' },
      { name: 'Silver Metallic', hex: '#cbd5e1' },
      { name: 'Ripe Cherry', hex: '#991b1b' },
      { name: 'Snow White', hex: '#ffffff' }
    ],
    descriptionRu: 'Compact, nimble and exceptionally fuel-efficient urban microcar. Fits into any parking spot with minimal fuel consumption.'
  },
  {
    id: 'deal_sedan_nexia',
    type: 'sedan_nexia',
    name: 'Kestrel Meridian 1.5L 16V Sedan',
    nameRu: 'Kestrel Meridian',
    brand: 'Kestrel',
    classType: 'C-Class Sedan',
    year: 2007,
    engineSpec: '1.5L 16V DOHC Inline-4',
    powerHp: 85,
    displacementL: 1.5,
    fuelType: 'ai92',
    fuelTypeLabel: 'Regular 92',
    topSpeedKmh: 172,
    accelSec: 12.2,
    weightKg: 1020,
    tankCapacityL: 50,
    dimensionsM: '4.48 x 1.66 m',
    hasAutoTrans: false,
    hasManualTrans: true,
    priceRub: 160000,
    availableColors: [
      { name: 'Sterling Silver', hex: '#cbd5e1' },
      { name: 'Deep Ocean Blue', hex: '#1e3a8a' },
      { name: 'Golden Sand', hex: '#d97706' },
      { name: 'Burgundy Garnet', hex: '#881337' },
      { name: 'Gloss White', hex: '#f8fafc' }
    ],
    descriptionRu: 'Time-tested comfortable sedan with a massive trunk, plush suspension and a robust 16-valve engine.'
  },
  {
    id: 'deal_sedan_accent',
    type: 'sedan_accent',
    name: 'Kestrel Horizon 1.5L 16V Sedan',
    nameRu: 'Kestrel Horizon',
    brand: 'Kestrel',
    classType: 'B-Class Urban Sedan',
    year: 2008,
    engineSpec: '1.5L 16V DOHC Inline-4',
    powerHp: 102,
    displacementL: 1.5,
    fuelType: 'ai92',
    fuelTypeLabel: 'Regular 92',
    topSpeedKmh: 180,
    accelSec: 10.5,
    weightKg: 1030,
    tankCapacityL: 45,
    dimensionsM: '4.23 x 1.67 m',
    hasAutoTrans: true,
    hasManualTrans: true,
    priceRub: 270000,
    availableColors: [
      { name: 'Platinum Quartz', hex: '#cbd5e1' },
      { name: 'Obsidian Black', hex: '#0f172a' },
      { name: 'Sapphire Blue', hex: '#1e3a8a' },
      { name: 'Ruby Garnet', hex: '#991b1b' },
      { name: 'Pure White', hex: '#ffffff' }
    ],
    descriptionRu: 'Reliable, responsive and smooth sedan featuring independent multi-link rear suspension and 102 hp power.'
  },
  {
    id: 'deal_sedan_logan',
    type: 'sedan_logan',
    name: 'Stellar Nomad 1.6L Rugged Sedan',
    nameRu: 'Stellar Nomad',
    brand: 'Stellar',
    classType: 'Budget B-Class Sedan',
    year: 2011,
    engineSpec: '1.6L 8V Inline-4',
    powerHp: 87,
    displacementL: 1.6,
    fuelType: 'ai92',
    fuelTypeLabel: 'Regular 92',
    topSpeedKmh: 175,
    accelSec: 11.5,
    weightKg: 980,
    tankCapacityL: 50,
    dimensionsM: '4.29 x 1.74 m',
    hasAutoTrans: false,
    hasManualTrans: true,
    priceRub: 295000,
    availableColors: [
      { name: 'Light Basalt Metallic', hex: '#d4c5b9' },
      { name: 'Glacial White', hex: '#f8fafc' },
      { name: 'Pearl Black', hex: '#0f172a' },
      { name: 'Mineral Blue', hex: '#1d4ed8' },
      { name: 'Titanium Silver', hex: '#94a3b8' }
    ],
    descriptionRu: 'Legendary commuter with bulletproof heavy-duty suspension, high ground clearance and spacious cabin.'
  },
  {
    id: 'deal_sedan_polo',
    type: 'sedan_polo',
    name: 'Stellar Aero 1.6L Comfort Sedan',
    nameRu: 'Stellar Aero',
    brand: 'Stellar',
    classType: 'B+ Class Comfort Sedan',
    year: 2016,
    engineSpec: '1.6L 16V MPI Inline-4',
    powerHp: 110,
    displacementL: 1.6,
    fuelType: 'ai95',
    fuelTypeLabel: 'Premium 95',
    topSpeedKmh: 191,
    accelSec: 10.4,
    weightKg: 1160,
    tankCapacityL: 55,
    dimensionsM: '4.39 x 1.70 m',
    hasAutoTrans: true,
    hasManualTrans: true,
    priceRub: 520000,
    availableColors: [
      { name: 'Candy White', hex: '#ffffff' },
      { name: 'Urano Gray', hex: '#475569' },
      { name: 'Reflex Silver', hex: '#cbd5e1' },
      { name: 'Deep Black Pearl', hex: '#0f172a' },
      { name: 'Toffee Brown', hex: '#78350f' }
    ],
    descriptionRu: 'Crisp engineering, refined ergonomics, reliable 110 hp 1.6 MPI motor and excellent high-speed stability.'
  },
  {
    id: 'deal_sedan_compact',
    type: 'sedan_compact',
    name: 'Stellar Prime 1.6L Compact Sedan',
    nameRu: 'Stellar Prime',
    brand: 'Stellar',
    classType: 'Compact Sedan',
    year: 2021,
    engineSpec: '1.6L 16V EFI Inline-4',
    powerHp: 106,
    displacementL: 1.6,
    fuelType: 'ai92',
    fuelTypeLabel: 'Regular 92',
    topSpeedKmh: 180,
    accelSec: 10.8,
    weightKg: 1080,
    tankCapacityL: 50,
    dimensionsM: '4.26 x 1.70 m',
    hasAutoTrans: true,
    hasManualTrans: true,
    priceRub: 390000,
    availableColors: [
      { name: 'Cloud White', hex: '#f8fafc' },
      { name: 'Obsidian Pearl', hex: '#0f172a' },
      { name: 'Borneo Silver', hex: '#94a3b8' },
      { name: 'Platinum Metallic', hex: '#cbd5e1' },
      { name: 'Coriander Gold', hex: '#d97706' }
    ],
    descriptionRu: 'Mass-market favorite sedan. Inexpensive maintenance, efficient 1.6L engine, choice of manual or automatic transmission.'
  },
  {
    id: 'deal_sedan_standard',
    type: 'sedan_standard',
    name: 'Apex Vantage 1.6L Family Sedan',
    nameRu: 'Apex Vantage',
    brand: 'Apex',
    classType: 'C-Class Family Sedan',
    year: 2022,
    engineSpec: '1.6L 16V DOHC Inline-4',
    powerHp: 122,
    displacementL: 1.6,
    fuelType: 'ai95',
    fuelTypeLabel: 'Premium 95',
    topSpeedKmh: 195,
    accelSec: 9.8,
    weightKg: 1270,
    tankCapacityL: 55,
    dimensionsM: '4.44 x 1.76 m',
    hasAutoTrans: true,
    hasManualTrans: true,
    priceRub: 580000,
    availableColors: [
      { name: 'Carnelian Red', hex: '#dc2626' },
      { name: 'Diving Blue', hex: '#2563eb' },
      { name: 'Glacial White', hex: '#ffffff' },
      { name: 'Pluto Dark Gray', hex: '#334155' }
    ],
    descriptionRu: 'Modern urban sedan with elevated ground clearance, large trunk and advanced safety systems.'
  },
  {
    id: 'deal_wagon_modern',
    type: 'wagon_modern',
    name: 'Apex Tourer 1.8L Estate',
    nameRu: 'Apex Tourer',
    brand: 'Apex',
    classType: 'Modern Estate Wagon',
    year: 2022,
    engineSpec: '1.8L 16V Inline-4',
    powerHp: 122,
    displacementL: 1.8,
    fuelType: 'ai95',
    fuelTypeLabel: 'Premium 95',
    topSpeedKmh: 185,
    accelSec: 10.2,
    weightKg: 1320,
    tankCapacityL: 55,
    dimensionsM: '4.42 x 1.78 m',
    hasAutoTrans: true,
    hasManualTrans: true,
    priceRub: 640000,
    availableColors: [
      { name: 'Mars Orange', hex: '#ea580c' },
      { name: 'Carthage Silver', hex: '#e2e8f0' },
      { name: 'Ankor Metallic Black', hex: '#1e293b' },
      { name: 'Amazon Green', hex: '#166534' }
    ],
    descriptionRu: 'Spacious family wagon featuring roof rails, massive cargo capacity and practical interior.'
  },
  {
    id: 'deal_crossover_compact',
    type: 'crossover_compact',
    name: 'Apex Trailblazer 2.0L 4WD Crossover',
    nameRu: 'Apex Trailblazer',
    brand: 'Apex',
    classType: 'Compact 4WD Crossover',
    year: 2021,
    engineSpec: '2.0L 16V Inline-4',
    powerHp: 143,
    displacementL: 2.0,
    fuelType: 'ai95',
    fuelTypeLabel: 'Premium 95',
    topSpeedKmh: 180,
    accelSec: 10.4,
    weightKg: 1420,
    tankCapacityL: 50,
    dimensionsM: '4.32 x 1.82 m',
    hasAutoTrans: true,
    hasManualTrans: true,
    priceRub: 750000,
    availableColors: [
      { name: 'Khaki Orange', hex: '#f97316' },
      { name: 'Dark Emerald', hex: '#065f46' },
      { name: 'Pearl White', hex: '#f8fafc' },
      { name: 'Wet Asphalt', hex: '#475569' }
    ],
    descriptionRu: 'All-wheel-drive crossover with high off-road capability, elevated wheel arches and smooth automatic gearbox.'
  },
  {
    id: 'deal_hatchback',
    type: 'hatchback',
    name: 'Apex Swift 1.6L City Hatchback',
    nameRu: 'Apex Swift',
    brand: 'Apex',
    classType: 'City Hatchback',
    year: 2020,
    engineSpec: '1.6L 16V EFI Inline-4',
    powerHp: 106,
    displacementL: 1.6,
    fuelType: 'ai92',
    fuelTypeLabel: 'Regular 92',
    topSpeedKmh: 175,
    accelSec: 11.2,
    weightKg: 1120,
    tankCapacityL: 50,
    dimensionsM: '4.16 x 1.71 m',
    hasAutoTrans: true,
    hasManualTrans: true,
    priceRub: 430000,
    availableColors: [
      { name: 'Vibrant Red', hex: '#ef4444' },
      { name: 'Cobalt Blue', hex: '#3b82f6' },
      { name: 'Alpine White', hex: '#ffffff' },
      { name: 'Graphite Gray', hex: '#64748b' }
    ],
    descriptionRu: 'Compact 5-door hatchback. Extremely convenient for tight city parking and nimble traffic maneuvering.'
  },
  {
    id: 'deal_offroad_hardcore',
    type: 'offroad_hardcore',
    name: 'Titan Pathfinder 1.7L 4x4 Off-Road',
    nameRu: 'Titan Pathfinder',
    brand: 'Titan',
    classType: '4x4 Hardcore Offroader',
    year: 2022,
    engineSpec: '1.7L EFI Inline-4',
    powerHp: 83,
    displacementL: 1.7,
    fuelType: 'ai92',
    fuelTypeLabel: 'Regular 92',
    topSpeedKmh: 142,
    accelSec: 17.0,
    weightKg: 1285,
    tankCapacityL: 65,
    dimensionsM: '3.74 x 1.68 m',
    hasAutoTrans: true,
    hasManualTrans: true,
    priceRub: 490000,
    availableColors: [
      { name: 'Tactical Khaki', hex: '#3f6212' },
      { name: 'Deep Forest Green', hex: '#14532d' },
      { name: 'Snow White', hex: '#f8fafc' },
      { name: 'Nessie Navy', hex: '#1e3a8a' }
    ],
    descriptionRu: 'Legendary compact 4x4 offroader featuring permanent four-wheel drive, low-range transfer case and center differential lock.'
  },
  {
    id: 'deal_suv_luxury',
    type: 'suv_luxury',
    name: 'Titan Overland 2.7L Framed SUV',
    nameRu: 'Titan Overland',
    brand: 'Titan',
    classType: 'Framed Luxury SUV',
    year: 2022,
    engineSpec: '2.7L PRO Inline-4',
    powerHp: 150,
    displacementL: 2.7,
    fuelType: 'ai95',
    fuelTypeLabel: 'Premium 95',
    topSpeedKmh: 150,
    accelSec: 12.7,
    weightKg: 2125,
    tankCapacityL: 68,
    dimensionsM: '4.78 x 1.90 m',
    hasAutoTrans: true,
    hasManualTrans: true,
    priceRub: 1150000,
    availableColors: [
      { name: 'Obsidian Black', hex: '#020617' },
      { name: 'Asteroid Gray', hex: '#475569' },
      { name: 'Pearl White', hex: '#ffffff' },
      { name: 'Pine Green', hex: '#166534' }
    ],
    descriptionRu: 'Flagship body-on-frame SUV with automatic transmission, leather interior and touchscreen multimedia.'
  },
  {
    id: 'deal_pickup',
    type: 'pickup',
    name: 'Titan HeavyDuty 2.5L 4x4 Pickup',
    nameRu: 'Titan HeavyDuty',
    brand: 'Titan',
    classType: 'Double Cab 4WD Pickup',
    year: 2021,
    engineSpec: '2.5L Turbo Diesel Inline-4',
    powerHp: 143,
    displacementL: 2.5,
    fuelType: 'diesel',
    fuelTypeLabel: 'Diesel',
    topSpeedKmh: 160,
    accelSec: 12.0,
    weightKg: 1950,
    tankCapacityL: 75,
    dimensionsM: '5.12 x 1.86 m',
    hasAutoTrans: true,
    hasManualTrans: true,
    priceRub: 880000,
    availableColors: [
      { name: 'Titanium Gray', hex: '#475569' },
      { name: 'Midnight Black', hex: '#020617' },
      { name: 'Matte Khaki', hex: '#3f6212' },
      { name: 'Alpine White', hex: '#f8fafc' }
    ],
    descriptionRu: 'Robust dual-cab cargo-passenger pickup truck with selectable 4WD and spacious cargo bed.'
  },
  {
    id: 'deal_hatch_hot',
    type: 'hatch_hot',
    name: 'Titan Vanguard GT 2.0L Turbo Hatch',
    nameRu: 'Titan Vanguard GT',
    brand: 'Titan',
    classType: 'Sport Hot Hatch',
    year: 2021,
    engineSpec: '2.0L Turbocharged Inline-4',
    powerHp: 220,
    displacementL: 2.0,
    fuelType: 'ai95',
    fuelTypeLabel: 'Premium 95',
    topSpeedKmh: 240,
    accelSec: 6.2,
    weightKg: 1280,
    tankCapacityL: 50,
    dimensionsM: '4.20 x 1.79 m',
    hasAutoTrans: true,
    hasManualTrans: true,
    priceRub: 980000,
    availableColors: [
      { name: 'Venom Yellow', hex: '#eab308' },
      { name: 'Scarlet Metallic', hex: '#dc2626' },
      { name: 'Cobalt Blue', hex: '#2563eb' },
      { name: 'Tuner Black', hex: '#09090b' }
    ],
    descriptionRu: 'Dynamic turbocharged hot hatch featuring sports suspension, upgraded brakes and razor-sharp steering.'
  },
  {
    id: 'deal_van',
    type: 'van',
    name: 'Horizon Express 2.0L TDI Van',
    nameRu: 'Horizon Express',
    brand: 'Horizon',
    classType: 'Business Cargo Van',
    year: 2022,
    engineSpec: '2.0L TDI Turbo Diesel',
    powerHp: 150,
    displacementL: 2.0,
    fuelType: 'diesel',
    fuelTypeLabel: 'Diesel',
    topSpeedKmh: 165,
    accelSec: 12.8,
    weightKg: 2150,
    tankCapacityL: 75,
    dimensionsM: '5.30 x 2.05 m',
    hasAutoTrans: true,
    hasManualTrans: true,
    priceRub: 1250000,
    availableColors: [
      { name: 'Snow White', hex: '#ffffff' },
      { name: 'Silver Metallic', hex: '#cbd5e1' },
      { name: 'Deep Sapphire', hex: '#1e3a8a' },
      { name: 'Executive Black', hex: '#1e293b' }
    ],
    descriptionRu: 'Spacious and stylish business van with aerodynamic styling, sliding side doors, rear swing doors and refined cabin.'
  },
  {
    id: 'deal_bus_minibus',
    type: 'bus_minibus',
    name: 'Horizon Shuttle 2.7L 12-Seat Minibus',
    nameRu: 'Horizon Shuttle',
    brand: 'Horizon',
    classType: 'Urban Minibus',
    year: 2021,
    engineSpec: '2.7L Inline-4 Engine',
    powerHp: 107,
    displacementL: 2.7,
    fuelType: 'ai92',
    fuelTypeLabel: 'Regular 92',
    topSpeedKmh: 135,
    accelSec: 16.0,
    weightKg: 2450,
    tankCapacityL: 64,
    dimensionsM: '5.50 x 2.07 m',
    hasAutoTrans: false,
    hasManualTrans: true,
    priceRub: 820000,
    availableColors: [
      { name: 'Transit Yellow', hex: '#eab308' },
      { name: 'Glacial White', hex: '#ffffff' },
      { name: 'Baltic Blue', hex: '#1e3a8a' },
      { name: 'Titanium Gray', hex: '#64748b' }
    ],
    descriptionRu: 'Reliable passenger minibus. Perfect solution for scheduled municipal passenger transit and small shuttle businesses.'
  },
  {
    id: 'deal_van_camper',
    type: 'van_camper',
    name: 'Horizon Voyager 2.7L 4x4 Camper',
    nameRu: 'Horizon Voyager',
    brand: 'Horizon',
    classType: '4x4 Expedition Camper',
    year: 2022,
    engineSpec: '2.7L PRO Inline-4',
    powerHp: 150,
    displacementL: 2.7,
    fuelType: 'ai95',
    fuelTypeLabel: 'Premium 95',
    topSpeedKmh: 140,
    accelSec: 15.2,
    weightKg: 2600,
    tankCapacityL: 68,
    dimensionsM: '5.20 x 2.05 m',
    hasAutoTrans: false,
    hasManualTrans: true,
    priceRub: 1380000,
    availableColors: [
      { name: 'Sand Expedition', hex: '#d97706' },
      { name: 'Tactical Khaki', hex: '#3f6212' },
      { name: 'Glacial White', hex: '#ffffff' },
      { name: 'Graphite Gray', hex: '#334155' }
    ],
    descriptionRu: 'All-terrain camper van built for autonomous wilderness travel: rooftop A/C, solar panels, bike rack and awning.'
  },
  {
    id: 'deal_sedan_classic',
    type: 'sedan_classic',
    name: 'Aegis Classic B100 Sedan',
    nameRu: 'Aegis Classic B100',
    brand: 'Aegis',
    classType: 'Classic B-Class Sedan',
    year: 2011,
    engineSpec: '1.6L EFI Inline-4',
    powerHp: 74,
    displacementL: 1.6,
    fuelType: 'ai92',
    fuelTypeLabel: 'Regular 92',
    topSpeedKmh: 150,
    accelSec: 14.5,
    weightKg: 1060,
    tankCapacityL: 39,
    dimensionsM: '4.14 x 1.62 m',
    hasAutoTrans: false,
    hasManualTrans: true,
    priceRub: 180000,
    availableColors: [
      { name: 'Cherry Red', hex: '#881337' },
      { name: 'Teal Green', hex: '#0f766e' },
      { name: 'Baltic Navy', hex: '#1e3a8a' },
      { name: 'Cloud White', hex: '#f8fafc' },
      { name: 'Jasper Wine', hex: '#9f1239' }
    ],
    descriptionRu: 'Folk classic model. Rear-wheel drive, straightforward bulletproof mechanics, cheap parts available everywhere.'
  },
  {
    id: 'deal_classic_compact',
    type: 'classic_compact',
    name: 'Aegis Compact H210 Hatchback',
    nameRu: 'Aegis Compact H210',
    brand: 'Aegis',
    classType: 'Compact Hatchback',
    year: 2004,
    engineSpec: '1.5L 8V EFI Inline-4',
    powerHp: 78,
    displacementL: 1.5,
    fuelType: 'ai92',
    fuelTypeLabel: 'Regular 92',
    topSpeedKmh: 156,
    accelSec: 13.2,
    weightKg: 945,
    tankCapacityL: 43,
    dimensionsM: '4.00 x 1.65 m',
    hasAutoTrans: false,
    hasManualTrans: true,
    priceRub: 220000,
    availableColors: [
      { name: 'Wet Asphalt', hex: '#475569' },
      { name: 'Iguana Metallic', hex: '#15803d' },
      { name: 'Currency Silver', hex: '#cbd5e1' },
      { name: 'Pearl Black', hex: '#09090b' }
    ],
    descriptionRu: 'Cult front-wheel-drive hatchback. Lightweight, nimble in city traffic and well known to every enthusiast.'
  },
  {
    id: 'deal_wagon_classic',
    type: 'wagon_classic',
    name: 'Aegis Estate W210 Station Wagon',
    nameRu: 'Aegis Estate W210',
    brand: 'Aegis',
    classType: 'Family Station Wagon',
    year: 2008,
    engineSpec: '1.6L 16V Inline-4',
    powerHp: 89,
    displacementL: 1.6,
    fuelType: 'ai92',
    fuelTypeLabel: 'Regular 92',
    topSpeedKmh: 165,
    accelSec: 12.5,
    weightKg: 1040,
    tankCapacityL: 43,
    dimensionsM: '4.28 x 1.68 m',
    hasAutoTrans: false,
    hasManualTrans: true,
    priceRub: 210000,
    availableColors: [
      { name: 'Snow Queen Silver', hex: '#e2e8f0' },
      { name: 'Ruby Garnet', hex: '#991b1b' },
      { name: 'Franconia Wine', hex: '#831843' },
      { name: 'Crystal Dark Gray', hex: '#334155' }
    ],
    descriptionRu: 'Practical family station wagon with a large tailgate. Indispensable helper for country trips and cargo hauling.'
  },
  {
    id: 'deal_micro_car',
    type: 'micro_car',
    name: 'Aegis Micro M75 City Microcar',
    nameRu: 'Aegis Micro M75',
    brand: 'Aegis',
    classType: 'City Microcar',
    year: 2006,
    engineSpec: '0.75L 2-Cylinder Engine',
    powerHp: 33,
    displacementL: 0.75,
    fuelType: 'ai92',
    fuelTypeLabel: 'Regular 92',
    topSpeedKmh: 130,
    accelSec: 18.0,
    weightKg: 645,
    tankCapacityL: 30,
    dimensionsM: '3.20 x 1.42 m',
    hasAutoTrans: false,
    hasManualTrans: true,
    priceRub: 140000,
    availableColors: [
      { name: 'Cornflower Blue', hex: '#2563eb' },
      { name: 'Lemon Yellow', hex: '#eab308' },
      { name: 'Lime Green', hex: '#16a34a' },
      { name: 'Snow White', hex: '#ffffff' }
    ],
    descriptionRu: 'Supercompact microcar with minuscule fuel consumption. Ideal for narrow alleys and minimal upkeep budget.'
  },
  {
    id: 'deal_suv_classic_box',
    type: 'suv_classic_box',
    name: 'Aegis Defender 2.7L 4x4 Utility SUV',
    nameRu: 'Aegis Defender 4x4',
    brand: 'Aegis',
    classType: 'Framed Utility 4x4',
    year: 2021,
    engineSpec: '2.7L Inline-4 Engine',
    powerHp: 112,
    displacementL: 2.7,
    fuelType: 'ai92',
    fuelTypeLabel: 'Regular 92',
    topSpeedKmh: 140,
    accelSec: 16.5,
    weightKg: 1845,
    tankCapacityL: 70,
    dimensionsM: '4.10 x 1.73 m',
    hasAutoTrans: false,
    hasManualTrans: true,
    priceRub: 520000,
    availableColors: [
      { name: 'Military Olive Khaki', hex: '#3f6212' },
      { name: 'White Night', hex: '#f8fafc' },
      { name: 'Obsidian Black', hex: '#09090b' },
      { name: 'Deep Forest Green', hex: '#14532d' }
    ],
    descriptionRu: 'Authentic body-on-frame utility 4x4 with selectable front axle, low-range gearing and solid live axles.'
  },
  {
    id: 'deal_wagon_allroad',
    type: 'wagon_allroad',
    name: 'Aegis Allroad 1.8L 4WD Estate',
    nameRu: 'Aegis Allroad W4WD',
    brand: 'Aegis',
    classType: 'Rugged Station Wagon',
    year: 2022,
    engineSpec: '1.8L 16V Inline-4',
    powerHp: 122,
    displacementL: 1.8,
    fuelType: 'ai95',
    fuelTypeLabel: 'Premium 95',
    topSpeedKmh: 180,
    accelSec: 10.5,
    weightKg: 1350,
    tankCapacityL: 55,
    dimensionsM: '4.41 x 1.78 m',
    hasAutoTrans: true,
    hasManualTrans: true,
    priceRub: 720000,
    availableColors: [
      { name: 'Mars Metallic Orange', hex: '#ea580c' },
      { name: 'Diving Blue Pearl', hex: '#2563eb' },
      { name: 'Carnelian Red', hex: '#dc2626' },
      { name: 'Platinum Silver', hex: '#cbd5e1' }
    ],
    descriptionRu: 'All-terrain family wagon with protective plastic body cladding, elevated 203 mm ground clearance and disc brakes.'
  },
  {
    id: 'deal_retro_bubble',
    type: 'retro_bubble',
    name: 'Aegis Vintage R40 Microcar',
    nameRu: 'Aegis Vintage R40',
    brand: 'Aegis Retro',
    classType: 'Vintage Bubble Car',
    year: 1982,
    engineSpec: '1.2L V4 Air-Cooled',
    powerHp: 40,
    displacementL: 1.2,
    fuelType: 'ai92',
    fuelTypeLabel: 'Regular 92',
    topSpeedKmh: 120,
    accelSec: 22.0,
    weightKg: 790,
    tankCapacityL: 30,
    dimensionsM: '3.73 x 1.57 m',
    hasAutoTrans: false,
    hasManualTrans: true,
    priceRub: 110000,
    availableColors: [
      { name: 'Matador Red', hex: '#dc2626' },
      { name: 'Retro Turquoise', hex: '#0891b2' },
      { name: 'Lemon Yellow', hex: '#f59e0b' },
      { name: 'Cream Beige', hex: '#fef08a' }
    ],
    descriptionRu: 'Compact retro automobile with rear-engine layout and air cooling. A soulful classic vehicle!'
  },
  {
    id: 'deal_paver_asphalt_wheeled',
    type: 'paver_asphalt_wheeled',
    name: 'IronForge PaveMaster 1800 Paver',
    nameRu: 'IronForge PaveMaster 1800',
    brand: 'IronForge',
    classType: '6x4 Wheeled Asphalt Paver',
    year: 2021,
    engineSpec: '6.7L Turbo Diesel (175 hp)',
    powerHp: 175,
    displacementL: 6.7,
    fuelType: 'diesel',
    fuelTypeLabel: 'Diesel',
    topSpeedKmh: 30,
    accelSec: 18.0,
    weightKg: 18500,
    tankCapacityL: 220,
    dimensionsM: '6.40 x 3.20 m',
    hasAutoTrans: false,
    hasManualTrans: true,
    priceRub: 4800000,
    availableColors: [
      { name: 'Signal Yellow', hex: '#eab308' },
      { name: 'Construction Orange', hex: '#ea580c' },
      { name: 'Industrial Gray', hex: '#475569' }
    ],
    descriptionRu: 'High-performance wheeled asphalt paver with hydraulic material hopper, screed with extensions and dual swivel operator stations.'
  },
  {
    id: 'deal_roller_heavy_tandem',
    type: 'roller_heavy_tandem',
    name: 'IronForge TandemRoll 161 Road Roller',
    nameRu: 'IronForge TandemRoll 161',
    brand: 'IronForge',
    classType: '12T Articulated Tandem Roller',
    year: 2022,
    engineSpec: '3.6L Turbo Diesel (130 hp)',
    powerHp: 130,
    displacementL: 3.6,
    fuelType: 'diesel',
    fuelTypeLabel: 'Diesel',
    topSpeedKmh: 25,
    accelSec: 15.0,
    weightKg: 12500,
    tankCapacityL: 160,
    dimensionsM: '5.00 x 2.20 m',
    hasAutoTrans: false,
    hasManualTrans: true,
    priceRub: 3200000,
    availableColors: [
      { name: 'Bright Yellow', hex: '#eab308' },
      { name: 'Builder Orange', hex: '#ea580c' },
      { name: 'Industrial Green', hex: '#15803d' }
    ],
    descriptionRu: 'Heavy 12-ton double-drum asphalt roller featuring articulated steering frame, water sprinkler system and hydrostatic drive.'
  },
  {
    id: 'deal_roller_compact_sidewalk',
    type: 'roller_compact_sidewalk',
    name: 'IronForge SidewalkComp 90 Roller',
    nameRu: 'IronForge SidewalkComp 90',
    brand: 'IronForge',
    classType: '2.2T Articulated Sidewalk Roller',
    year: 2023,
    engineSpec: '1.7L 3-Cyl Diesel (25 hp)',
    powerHp: 25,
    displacementL: 1.7,
    fuelType: 'diesel',
    fuelTypeLabel: 'Diesel',
    topSpeedKmh: 22,
    accelSec: 12.0,
    weightKg: 2200,
    tankCapacityL: 40,
    dimensionsM: '2.30 x 1.10 m',
    hasAutoTrans: false,
    hasManualTrans: true,
    priceRub: 1450000,
    availableColors: [
      { name: 'Vibrant Orange', hex: '#f97316' },
      { name: 'Signal Yellow', hex: '#facc15' },
      { name: 'Snow White', hex: '#ffffff' }
    ],
    descriptionRu: 'Nimble sidewalk roller with articulated frame for compacting asphalt on pedestrian paths, walkways, parking lots and tight alleys.'
  },
  {
    id: 'deal_roller_pneumatic',
    type: 'roller_pneumatic',
    name: 'IronForge PneumoRoll 24 Roller',
    nameRu: 'IronForge PneumoRoll 24',
    brand: 'IronForge',
    classType: '14-24T Pneumatic Tire Roller',
    year: 2020,
    engineSpec: '4.1L Turbo Diesel (100 hp)',
    powerHp: 100,
    displacementL: 4.1,
    fuelType: 'diesel',
    fuelTypeLabel: 'Diesel',
    topSpeedKmh: 28,
    accelSec: 16.0,
    weightKg: 14000,
    tankCapacityL: 200,
    dimensionsM: '5.20 x 2.20 m',
    hasAutoTrans: false,
    hasManualTrans: true,
    priceRub: 3600000,
    availableColors: [
      { name: 'Deep Orange', hex: '#ea580c' },
      { name: 'Signature Yellow', hex: '#eab308' },
      { name: 'Highway Gray', hex: '#334155' }
    ],
    descriptionRu: 'Pneumatic tire roller with staggered 8-smooth-tire overlap for pristine finishing compaction on asphalt wearing courses.'
  }
];

export interface UsedCarModel {
  id: string;
  type: CarType;
  name: string;
  nameRu: string;
  brand: string;
  classType: string;
  year: number;
  priceRub: number;
  engineSpec: string;
  powerHp: number;
  displacementL: number;
  fuelType: 'ai92'| 'ai95'| 'diesel';
  fuelTypeLabel: string;
  topSpeedKmh: number;
  accelSec: number;
  weightKg: number;
  tankCapacityL: number;
  dimensionsM: string;
  hasAutoTrans: boolean;
  hasManualTrans: boolean;
  color: { name: string; hex: string };
  descriptionRu: string;
  mileageKm: number;
  engineHealth: number;
  transmissionHealth: number;
  radiatorWater: number;
  radiatorPunctured: boolean;
  batteryCharge: number;
  bodyCondition: string;
  isChiptuned: boolean;
  hasGBO: boolean;
  isHeavySuspended: boolean;
}

export function generateUsedCars(count: number = 15): UsedCarModel[] {
  const possibleTypes = [
    { type: 'classic_compact', name: 'Aegis Vintage 2101', basePrice: 45000 },
    { type: 'retro_bubble', name: 'Aegis Retro Bubble R40', basePrice: 35000 },
    { type: 'sedan_classic', name: 'Aegis Classic B100', basePrice: 75000 },
    { type: 'wagon_classic', name: 'Aegis Estate W210', basePrice: 85000 },
    { type: 'micro_car', name: 'Aegis Micro M75', basePrice: 55000 },
    { type: 'sedan_compact', name: 'Stellar Prime (B-Class)', basePrice: 280000 },
    { type: 'hatchback', name: 'Vanguard Apex Hatchback', basePrice: 65000 },
    { type: 'van_cargo_old', name: 'Horizon Retro Utility Van', basePrice: 120000 },
    { type: 'offroad_hardcore', name: 'Titan Pathfinder 4x4', basePrice: 180000 },
    { type: 'suv_classic_box', name: 'Aegis Defender 4x4', basePrice: 220000 },
    { type: 'tractor_mtz80_old', name: 'Agritech Fieldmaster 80', basePrice: 140000 },
    { type: 'tractor_mtz82', name: 'Agritech Fieldmaster 82.1', basePrice: 380000 },
    { type: 'truck_flatbed', name: 'Atlas Flatbed 53', basePrice: 150000 },
    { type: 'truck_covered', name: 'Atlas Covered Cargo 53', basePrice: 165000 },
    { type: 'truck_zil_dump', name: 'Atlas Dump Truck 130', basePrice: 195000 },
    { type: 'truck_dump', name: 'Titan Heavy Dump 5511', basePrice: 420000 },
    { type: 'sports', name: 'Velocity GT Sport (Wrecked)', basePrice: 950000 },
    { type: 'sedan_luxury', name: 'Sovereign Executive Sedan (Project)', basePrice: 1200000 }
  ];

  const descriptions = [
    "Машина — пушка! Мотор заводится с полтычка, но коробка иногда вылетает. Кузов требует внимания.",
    "Дедушкин вариант. Стояла в сухом гараже последние 12 лет. Пробег родной, состояние достойное.",
    "Рабочая лошадка для дачи и стройки. Внешний вид боевой, местами ржавчина, но доедет куда угодно.",
    "Кузов переварен и покрашен из баллончика. Мотор бодрый, стоит спортивный выхлоп и чип-тюнинг!",
    "Продаю под восстановление или на запчасти. Аккумулятор севший, радиатор течёт, подвеска стучит.",
    "Идеальный вариант для первой машины. Простая как велосипед, чинится на коленке в поле.",
    "Продаю верного друга. Кузов гниловат, но мотор шепчет. Идеально для села или леса.",
    "Заводится, едет, тормозит (иногда). Состояние: «ещё походит». За такие деньги — подарок!",
    "Взял под проект, но перегорел. Половина запчастей в багажнике, вторая половина — в гараже.",
    "Полный фарш: дырки в полу для вентиляции, музыка через хрипящий динамик, люфт руля 45 градусов."];

  const bodyConds = [
    "Ржавые пороги, боевые царапины, сквозные дыры",
    "Отличное гаражное состояние, без ржавчины",
    "Помяты крылья, краска выгорела, следы мелких ДТП",
    "Свежеокрашен из баллончика, кузов переварен",
    "Музейный экспонат, родная краска",
    "Среднее рабочее состояние, мелкие вмятины и сколы"];

  const colors = [
    { name: 'Гнилая вишня', hex: '#6b1d1d'},
    { name: 'Защитный хаки', hex: '#3f6212'},
    { name: 'Морская волна', hex: '#0891b2'},
    { name: 'Липовый зеленый', hex: '#4d7c0f'},
    { name: 'Серый грунт', hex: '#475569'},
    { name: 'Оранжевая охра', hex: '#ea580c'},
    { name: 'Мутно-белый', hex: '#e2e8f0'},
    { name: 'Пыльно-черный', hex: '#1e293b'},
    { name: 'Старый синий', hex: '#1d4ed8'}
  ];

  const cars: UsedCarModel[] = [];

  for (let i = 0; i < count; i++) {
    const raw = possibleTypes[Math.floor(Math.random() * possibleTypes.length)];
    const config = CAR_CONFIGS[raw.type] || CAR_CONFIGS.sedan;

    // Mileage
    const mileageKm = Math.floor(15000 + Math.random() * 450000);
    const ageFactor = Math.min(1, mileageKm / 500000);

    // Health states - allow for even lower health (junk)
    let engineHealth = Math.floor(5 + Math.random() * 90); 
    let transmissionHealth = Math.floor(10 + Math.random() * 85);
    let batteryCharge = Math.floor(5 + Math.random() * 95);
    let radiatorWater = Math.floor(0 + Math.random() * 100);
    let radiatorPunctured = Math.random() < 0.35; // More likely to be punctured

    // Randomly force some cars to be "absolute junk"
    const isTotalJunk = Math.random() < 0.2; // 20% chance for a real beater
    if (isTotalJunk) {
      engineHealth = Math.floor(1 + Math.random() * 15);
      transmissionHealth = Math.floor(5 + Math.random() * 20);
      batteryCharge = Math.floor(0 + Math.random() * 15);
      radiatorWater = Math.floor(0 + Math.random() * 20);
      radiatorPunctured = true;
    }

    // Upgrades
    const rawType = raw.type || '';
    const isChiptuned = Math.random() < 0.15;
    const hasGBO = (rawType.includes('classic') || rawType === 'sedan_compact'|| rawType === 'hatchback'|| rawType === 'van_cargo_old') && Math.random() < 0.4;
    const isHeavySuspended = Math.random() < 0.1;

    // Calculate actual price
    const ageMultiplier = 1.0 - (ageFactor * 0.6);
    const engineMultiplier = 0.2 + (engineHealth / 100) * 0.8;
    const bodyMultiplier = 0.3 + (Math.random() * 0.7);

    let finalPrice = Math.round(raw.basePrice * ageMultiplier * engineMultiplier * bodyMultiplier);
    
    // Minimum price floor for "junk"
    if (finalPrice < 15000) finalPrice = 15000 + Math.floor(Math.random() * 5000);
    
    // Add value for upgrades
    if (isChiptuned) finalPrice += 15000;
    if (hasGBO) finalPrice += 20000;
    if (isHeavySuspended) finalPrice += 10000;

    // Minimum price floors
    if (rawType.startsWith('tractor_')) {
      finalPrice = Math.max(finalPrice, 60000);
    } else if (rawType.startsWith('truck_')) {
      finalPrice = Math.max(finalPrice, 80000);
    } else {
      // Allow very cheap junk cars
      finalPrice = Math.max(finalPrice, isTotalJunk ? 12000 : 25000);
    }

    const year = Math.floor(1975 + Math.random() * (2018 - 1975));
    const dIdx = Math.floor(Math.random() * descriptions.length);
    const bIdx = Math.floor(Math.random() * bodyConds.length);
    const color = colors[Math.floor(Math.random() * colors.length)];

    cars.push({
      id: `used_car_${Date.now()}_${i}_${Math.floor(Math.random()*1000)}`,
      type: raw.type as CarType,
      name: raw.name,
      nameRu: raw.name,
      brand: config.name || 'Авто',
      classType: config.name || 'Легковой автомобиль',
      year,
      priceRub: finalPrice,
      engineSpec: `${config.transmission === 'MANUAL'? 'МКПП': 'АКПП'} (Объем ${config.mass > 3000 ? '4.8L': (config.mass > 1500 ? '2.4L': '1.5L')})`,
      powerHp: Math.round(config.acceleration * 2.5),
      displacementL: config.mass > 3000 ? 4.8 : (config.mass > 1500 ? 2.4 : 1.5),
      fuelType: config.mass > 3000 || raw.type.startsWith('tractor_') ? 'diesel': 'ai92',
      fuelTypeLabel: config.mass > 3000 || raw.type.startsWith('tractor_') ? 'Дизель': 'АИ-92',
      topSpeedKmh: config.maxSpeed,
      accelSec: Math.round((100 / config.acceleration) * 4 * 10) / 10,
      weightKg: config.mass,
      tankCapacityL: config.mass > 3000 ? 150 : 45,
      dimensionsM: `${(config.length / 10).toFixed(2)} x ${(config.width / 10).toFixed(2)} м`,
      hasAutoTrans: config.transmission === 'AUTO',
      hasManualTrans: config.transmission === 'MANUAL',
      color,
      descriptionRu: descriptions[dIdx],
      mileageKm,
      engineHealth,
      transmissionHealth,
      radiatorWater,
      radiatorPunctured,
      batteryCharge,
      bodyCondition: bodyConds[bIdx],
      isChiptuned,
      hasGBO,
      isHeavySuspended
    });
  }

  return cars;
}

export let USED_CAR_CATALOG: UsedCarModel[] = [];
export let LAST_USED_CAR_UPDATE_TIME = 0;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  player: Player | null;
  world: GameWorld | null;
  dealershipX?: number;
  dealershipY?: number;
}

export const CarDealershipModal: React.FC<Props> = ({
  isOpen,
  onClose,
  player,
  world,
  dealershipX = 82,
  dealershipY = 5704
}) => {
  const [activeTab, setActiveTab] = useState<'new'| 'used'>('new');
  const [catalogTick, setCatalogTick] = useState<number>(0);
  const [selectedCarIndex, setSelectedCarIndex] = useState<number>(0);
  const [selectedColorIndex, setSelectedColorIndex] = useState<number>(0);
  const [transmissionMode, setTransmissionMode] = useState<'MANUAL'| 'AUTO'>('MANUAL');
  const [purchaseSuccessMessage, setPurchaseSuccessMessage] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Dynamic initialization/updating of used car catalog
  useEffect(() => {
    if (!isOpen) return;
    const now = Date.now();
    if (USED_CAR_CATALOG.length === 0 || now - LAST_USED_CAR_UPDATE_TIME > 5 * 60 * 1000) {
      // Generate between 15 and 25 cars for a "crowded"feel
      const count = 15 + Math.floor(Math.random() * 11);
      USED_CAR_CATALOG = generateUsedCars(count);
      LAST_USED_CAR_UPDATE_TIME = now;
      setCatalogTick(t => t + 1);
    }
  }, [isOpen]);

  const carsList = activeTab === 'new'? DEALERSHIP_CARS : USED_CAR_CATALOG;
  const currentCar = carsList[selectedCarIndex] || carsList[0] || DEALERSHIP_CARS[0];
  const currentColor = activeTab === 'new'? ((currentCar as DealershipCarModel).availableColors[selectedColorIndex] || (currentCar as DealershipCarModel).availableColors[0])
    : { name: (currentCar as any).color.name, hex: (currentCar as any).color.hex };

  // Auto fallback transmission mode if selected car doesn't support manual
  useEffect(() => {
    if (activeTab === 'used') {
      const uCar = currentCar as any;
      setTransmissionMode(uCar.hasManualTrans ? 'MANUAL': 'AUTO');
    } else {
      if (!currentCar.hasManualTrans && currentCar.hasAutoTrans) {
        setTransmissionMode('AUTO');
      } else if (!currentCar.hasAutoTrans && currentCar.hasManualTrans) {
        setTransmissionMode('MANUAL');
      }
    }
    setSelectedColorIndex(0);
  }, [selectedCarIndex, activeTab, catalogTick]);

  // Render top-down live preview of vehicle on Canvas using true in-game vehicle graphics engine
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const config = CAR_CONFIGS[currentCar.type] || CAR_CONFIGS.sedan;
    const scale = Math.min(canvas.width / (config.length * 1.65), canvas.height / (config.width * 2.8));
    
    // UNSCALED logical game units for the graphics engine
    const halfL = config.length / 2;
    const halfW = config.width / 2;

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(scale, scale);

    // Draw showroom rotating pedestal platform
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.ellipse(0, 0, halfL * 1.44, halfW * 3.1, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2 / scale;
    ctx.beginPath();
    ctx.ellipse(0, 0, halfL * 1.40, halfW * 3.0, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Create dummy Vehicle object for in-game render engine
    const dummyCar = {
      id: 'preview',
      type: currentCar.type,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      angle: 0,
      steerAngle: 0,
      targetSteerAngle: 0,
      speed: 0,
      lateralVelocity: 0,
      angularVelocity: 0,
      mass: config.mass,
      length: config.length,
      width: config.width,
      wheelBase: config.wheelBase,
      color: currentColor.hex,
      roofColor: (currentColor as any).roofHex || currentColor.hex,
      headlightsOn: true,
      headlightMode: 'low_beam',
      brakeLightsOn: false,
      isReversing: false,
      turnSignal: 'none',
      turnSignalTimer: 0,
      isLocked: true,
      ownerId: 'player',
      isParked: true,
      isPlayerControlled: false,
      targetSpeed: 0,
      currentLaneId: null,
      targetWaypointIndex: 0,
      routeWaypoints: [],
      aiState: 'parked',
      requiredFuel: currentCar.fuelType === 'diesel'? 'diesel': (currentCar.fuelType === 'ai92'? 'ai92': 'ai95'),
      damage: createDefaultVehicleDamage(config.length, config.width)
    } as unknown as Vehicle;

    // 1. Drop Shadow under vehicle
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 0, halfL * 1.05, halfW * 1.15, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Wheels - Tucked realistically inside wheel wells BEFORE drawing body shell
    const isMachinery = isRoadMachinery(dummyCar.type);
    const isSport = dummyCar.type === 'sports'|| dummyCar.type === 'supercar'|| dummyCar.type === 'coupe_gt'|| dummyCar.type === 'hatch_hot';
    const isMicro = dummyCar.type === 'micro_car'|| dummyCar.type === 'retro_bubble';
    const isOffroadHeavy = dummyCar.type === 'offroad_hardcore'|| dummyCar.type === 'suv_classic_box';

    const wheelL = isSport ? 10.5 : (isMicro ? 7.6 : 9.5);
    const wheelW = isSport ? 5.8 : (isMicro ? 3.4 : (isOffroadHeavy ? 4.8 : 4.2));
    const frontAxleX = dummyCar.type === 'supercar'? halfL * 0.68 : halfL * 0.65;
    const rearAxleX = -halfL * 0.65;
    const trackY = halfW - 0.8;

    const renderFixedWheel = (wx: number, wy: number) => {
      ctx.fillStyle = '#0f172a'; // Tire
      ctx.fillRect(wx - wheelL / 2, wy, wheelL, wheelW);
      ctx.fillStyle = isSport ? '#cbd5e1': '#64748b'; // Rims
      ctx.fillRect(wx - wheelL / 2 + 2, wy + 0.8, wheelL - 4, wheelW - 1.6);
    };

    if (!isMachinery) {
      // Standard 4-wheel passenger car layout (wheels under body/fenders)
      renderFixedWheel(rearAxleX, -trackY);
      renderFixedWheel(rearAxleX, trackY - wheelW);

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(frontAxleX - wheelL / 2, -trackY, wheelL, wheelW);
      ctx.fillRect(frontAxleX - wheelL / 2, trackY - wheelW, wheelL, wheelW);
      ctx.fillStyle = isSport ? '#cbd5e1': '#64748b';
      ctx.fillRect(frontAxleX - wheelL / 2 + 2, -trackY + 0.8, wheelL - 4, wheelW - 1.6);
      ctx.fillRect(frontAxleX - wheelL / 2 + 2, trackY - wheelW + 0.8, wheelL - 4, wheelW - 1.6);

      // 3. Body Shell (Rendered ON TOP of wheels with smooth softbody spline)
      const basePoly = getVehicleBasePolygon(dummyCar, halfL, halfW, 0, 0, 0, 0, 0, 0, 0, 0);
      ctx.fillStyle = dummyCar.color;
      ctx.beginPath();
      traceSoftbodyPath(ctx, basePoly);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = 'rgba(0, 0, 0, 0.42)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Softbody metallic stress highlights and ambient crease shadow lines
      renderSoftbodyStressLines(ctx, basePoly);

      // Front bumper grille (only for standard production models without bespoke fascias)
      const hasCustomGrille = dummyCar.type === 'sedan_classic'|| dummyCar.type === 'sedan_luxury'|| 
                              dummyCar.type === 'classic_compact'|| dummyCar.type === 'retro_bubble'|| 
                              dummyCar.type === 'suv_classic_box'|| dummyCar.type === 'van'|| 
                              dummyCar.type === 'van_cargo_old'|| dummyCar.type === 'delivery_truck'||
                              dummyCar.type === 'van_camper'|| dummyCar.type === 'hatch_hot'||
                              dummyCar.type === 'police'|| dummyCar.type === 'sports'|| dummyCar.type === 'supercar'||
                              dummyCar.type === 'bus_minibus'|| dummyCar.type === 'wagon_allroad'|| dummyCar.type === 'wagon_classic';
      if (!hasCustomGrille) {
        const grilleW = Math.max(halfW * 1.0, halfW * 2 - 14);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(halfL - 2, -grilleW / 2, 1.5, grilleW);
      }

      // 4. In-Game Headlights (Accurate size & placement with subtle chrome bezels)
      const leftLampX = halfL - 3.2;
      const leftLampY = -halfW + 3.2;
      const rightLampX = halfL - 3.2;
      const rightLampY = halfW - 3.2;

      const drawHeadlight = (lx: number, ly: number) => {
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(lx, ly, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      };

      drawHeadlight(leftLampX, leftLampY);
      drawHeadlight(rightLampX, rightLampY);

      // 5. In-Game Taillights (Rectangular lenses matching in-game renderer)
      const rearLeftX = -halfL + 2.5;
      const rearLeftY = -halfW + 3.2;
      const rearRightX = -halfL + 2.5;
      const rearRightY = halfW - 3.2;

      const drawTaillight = (rx: number, ry: number) => {
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(rx - 1, ry - 1, 2, 2);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(rx - 1, ry - 1, 2, 2);
      };

      drawTaillight(rearLeftX, rearLeftY);
      drawTaillight(rearRightX, rearRightY);
    }

    // 6. Cabin, Greenhouse, Roof, Window Pillars & Specialized Attachments
    const cabinDim = getVehicleCabinDimensions(dummyCar, halfL, halfW, 0, 0);
    const deformFunc = (x: number, y: number): [number, number] => [x, y];
    
    const drawDeformedRect = (x: number, y: number, w: number, h: number, fill: string | CanvasGradient) => {
      ctx.fillStyle = fill;
      ctx.fillRect(x, y, w, h);
    };
    
    const drawDeformedLine = (x1: number, y1: number, x2: number, y2: number, stroke: string, width = 1) => {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    };
    
    const drawDeformedCircle = (cx: number, cy: number, r: number, fill: string, stroke?: string, lineWidth = 1) => {
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
      }
    };

    const vCtx: VehicleRenderContext = {
      ctx,
      car: dummyCar,
      halfL,
      halfW,
      fc: 0,
      rc: 0,
      cabinX: cabinDim.cabinX,
      cabinL: cabinDim.cabinL,
      cabinW: cabinDim.cabinW,
      deform: deformFunc,
      drawDeformedRect,
      drawDeformedLine,
      drawDeformedCircle,
      nightAlpha: 0.1
    };

    if (!isMachinery) {
      renderVehicleGreenhouseAndBodyPanels(vCtx);
    }
    renderSpecializedVehicleAttachments(vCtx);

    ctx.restore();
  }, [isOpen, selectedCarIndex, selectedColorIndex]);

  if (!isOpen) return null;

  const playerCash = getPlayerCash(player);
  const canAfford = playerCash >= currentCar.priceRub;

  const handleBuy = () => {
    if (!player || !world) return;

    if (!canAfford) {
      sound.playAlert();
      return;
    }

    const deducted = deductPlayerCash(player, currentCar.priceRub);
    if (!deducted) {
      sound.playAlert();
      return;
    }

    // Spawn Vehicle on designated Delivery Bay in front of Dealership main entrance
    const config = CAR_CONFIGS[currentCar.type] || CAR_CONFIGS.sedan;
    const newVehId = `player_car_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const baseSpawnX = 252;
    const baseSpawnY = 5970;
    let spawnX = baseSpawnX;
    let spawnY = baseSpawnY;

    if (world?.vehicles) {
      const isOccupied = (x: number, y: number) => 
        world.vehicles.some(v => Math.hypot(v.x - x, v.y - y) < 32);
      
      const candidateOffsets = [
        [0, 0],
        [46, 0],
        [-46, 0],
        [92, 0],
        [-92, 0],
        [0, 52],
        [46, 52],
        [-46, 52]
      ];
      for (const [ox, oy] of candidateOffsets) {
        if (!isOccupied(baseSpawnX + ox, baseSpawnY + oy)) {
          spawnX = baseSpawnX + ox;
          spawnY = baseSpawnY + oy;
          break;
        }
      }
    }

    const isUsed = activeTab === 'used';
    const uCar = currentCar as any;

    const requiredKeyType = getVehicleRequiredKeyType(currentCar.type);
    let keyTier: 'display'| 'smart'| 'classic'| 'flip'= 'classic';
    let keyFeatures: ('lock'| 'unlock'| 'engine_start'| 'headlights'| 'horn')[] = [];
    let keyItemId = 'car_key';

    if (requiredKeyType === 'gold') {
      keyItemId = 'car_key_gold';
      keyTier = 'classic';
    } else if (requiredKeyType === 'iron') {
      keyItemId = 'car_key_iron';
      keyTier = 'classic';
    } else {
      keyTier = getCarKeyTier(currentCar.type, currentCar.priceRub);
      keyFeatures = getCarKeyFeatures(keyTier);
      if (keyTier === 'classic') keyItemId = 'car_key_classic';
      else if (keyTier === 'flip') keyItemId = 'car_key_flip';
      else if (keyTier === 'smart') keyItemId = 'car_key_smart';
      else if (keyTier === 'display') keyItemId = 'car_key_display';
    }

    // Pre-calculate engine state and physical damage
    const initialEngineState = {
      ...createDefaultEngineState(currentCar.type, false, true),
      transmissionType: transmissionMode,
      autoGearMode: transmissionMode === 'AUTO'? 'P': undefined,
      currentGear: 0
    };

    const initialFuelSystem = {
      ...createDefaultFuelSystem(currentCar.type, false),
      tankLevel: 100,
      tankCapacity: currentCar.tankCapacityL,
      fuelType: currentCar.fuelType === 'diesel'? 'diesel': (currentCar.fuelType === 'ai92'? 'ai92': 'ai95'),
      octaneNumber: currentCar.fuelType === 'ai92'? 92 : (currentCar.fuelType === 'diesel'? 45 : 95)
    };

    const initialDamage = createDefaultVehicleDamage(config.length, config.width);

    if (isUsed) {
      initialEngineState.engineHealth = uCar.engineHealth;
      initialEngineState.starterWorking = uCar.engineHealth > 15;
      initialEngineState.batteryCharge = uCar.batteryCharge;
      initialEngineState.radiatorWater = uCar.radiatorWater;
      initialEngineState.radiatorPunctured = uCar.radiatorPunctured;
      initialEngineState.mileageKm = uCar.mileageKm;
      initialEngineState.isChiptuned = uCar.isChiptuned;
      initialEngineState.isHeavySuspended = uCar.isHeavySuspended;
      initialEngineState.hasGBO = uCar.hasGBO;

      initialFuelSystem.tankLevel = Math.floor(10 + Math.random() * 50); 
      if (uCar.hasGBO) {
        initialFuelSystem.gboInstalled = true;
        initialFuelSystem.gboLevel = Math.floor(10 + Math.random() * 80);
        initialFuelSystem.gboCapacity = 50;
      }

      // Volumetrically damage/dent the vehicle body vertices based on mechanical wear
      // Only apply visible dents if health is below 85%
      const rawIntensity = (100 - uCar.engineHealth) / 100;
      const damageIntensity = uCar.engineHealth > 85 ? 0 : rawIntensity;
      
      if (damageIntensity > 0) {
        initialDamage.deformedVertices.forEach((vertex) => {
          // Probability of denting a specific vertex scales with intensity
          if (Math.random() < 0.5 * damageIntensity) {
            vertex.offsetX = (Math.random() - 0.5) * 10 * damageIntensity;
            vertex.offsetY = (Math.random() - 0.5) * 10 * damageIntensity;
            vertex.plasticStrain = Math.random() * 1.5 * damageIntensity;
          }
        });
      }
    }

    const newVeh: Vehicle = {
      id: newVehId,
      keyId: newVehId,
      keyTier: keyTier,
      type: currentCar.type,
      x: spawnX,
      y: spawnY,
      vx: 0,
      vy: 0,
      angle: Math.PI / 2,
      steerAngle: 0,
      targetSteerAngle: 0,
      speed: 0,
      lateralVelocity: 0,
      angularVelocity: 0,
      isDrifting: false,
      driftFactor: 0,
      mass: currentCar.weightKg + (isUsed && uCar.isHeavySuspended ? 150 : 0),
      width: config.width,
      length: config.length,
      wheelBase: config.wheelBase,
      color: currentColor.hex,
      roofColor: (currentColor as any).roofHex || currentColor.hex,
      headlightsOn: false,
      headlightMode: 'off',
      brakeLightsOn: false,
      isReversing: false,
      turnSignal: 'none',
      turnSignalTimer: 0,
      isLocked: true,
      ownerId: 'player',
      isParked: true,
      isPlayerControlled: false,
      targetSpeed: 0,
      currentLaneId: null,
      targetWaypointIndex: 0,
      routeWaypoints: [],
      aiState: 'parked',
      requiredFuel: currentCar.fuelType === 'diesel'? 'diesel': (currentCar.fuelType === 'ai92'? 'ai92': 'ai95'),
      damage: initialDamage,
      engineState: initialEngineState,
      fuelSystem: initialFuelSystem,
      hasChiptuning: isUsed ? uCar.isChiptuned : false,
      hasGBO: isUsed ? uCar.hasGBO : false,
      isHeavySuspended: isUsed ? uCar.isHeavySuspended : false,
      stuckTimer: 0,
      honkTimer: 0,
      isHonking: false,
      hornEffectTimer: 0,
      inIntersection: false,
      plannedTurn: 'straight'} as Vehicle;

    if (!world.vehicles) world.vehicles = [];
    world.vehicles.push(newVeh);

    // Create & Add Items to Player: Key, PTS, Tech Passport
    const keyItem = createItem(keyItemId, 1);
    keyItem.vehicleId = newVehId;
    keyItem.keyTier = keyTier;
    keyItem.keyFeatures = keyFeatures;
    keyItem.carPrice = currentCar.priceRub;
    keyItem.carType = currentCar.type;
    keyItem.carName = currentCar.nameRu;
    keyItem.carColor = currentColor.name;

    if (requiredKeyType === 'gold') {
      keyItem.nameRu = `Золотой ключ зажигания (${currentCar.nameRu})`;
      keyItem.descriptionRu = `Механический "золотой"ключ зажигания от Вашего ретро-автомобиля «${currentCar.nameRu}» (${currentColor.name}). Вставьте в замок зажигания [E], чтобы завести мотор.`;
      keyItem.icon = '';
    } else if (requiredKeyType === 'iron') {
      keyItem.nameRu = `Железный ключ зажигания (${currentCar.nameRu})`;
      keyItem.descriptionRu = `Механический железный ключ зажигания от Вашего трактора/грузовика «${currentCar.nameRu}» (${currentColor.name}). Вставьте в замок зажигания [E], чтобы завести мотор.`;
      keyItem.icon = '';
    } else if (keyTier === 'display') {
      keyItem.nameRu = `Smart Display Key (${currentCar.nameRu})`;
      keyItem.descriptionRu = `Интерактивный цифровой смарт-ключ с цветным дисплеем от «${currentCar.nameRu}» (${currentColor.name}). Поддерживает дистанционный автозапуск ДВС [], управление фарами [], центральный замок [] и телеметрию.`;
      keyItem.icon = '';
    } else if (keyTier === 'smart') {
      keyItem.nameRu = `Смарт-ключ (${currentCar.nameRu})`;
      keyItem.descriptionRu = `Премиальный электронный смарт-ключ Keyless-Go от «${currentCar.nameRu}» (${currentColor.name}). Поддерживает дистанционный автозапуск [], управление фарами [] и ЦЗ [].`;
      keyItem.icon = '';
    } else if (keyTier === 'flip') {
      keyItem.nameRu = `Выкидной ключ (${currentCar.nameRu})`;
      keyItem.descriptionRu = `Складной выкидной ключ с радиопультом ЦЗ от «${currentCar.nameRu}» (${currentColor.name}). Нажмите [E] в руках или используйте из инвентаря для отпирания/запирания.`;
      keyItem.icon = '';
    } else {
      keyItem.nameRu = `Ключ зажигания (${currentCar.nameRu})`;
      keyItem.descriptionRu = `Механический ключ зажигания со стальным лезвием от «${currentCar.nameRu}» (${currentColor.name}).`;
      keyItem.icon = '';
    }

    const letters = ['А','В','Е','К','М','Н','О','Р','С','Т','У','Х'];
    const randomLetter = () => letters[Math.floor(Math.random() * letters.length)];
    const randomDigits = (len: number) => Array.from({length: len}, () => Math.floor(Math.random() * 10)).join('');

    // Generate unique VIN based on car manufacturer
    let wmi = 'XTA'; // VAZ/Lada default
    if (currentCar.id.includes('kamaz') || currentCar.id.includes('truck') || currentCar.id.includes('dump')) wmi = 'XTC';
    else if (currentCar.id.includes('gaz') || currentCar.id.includes('gazelle') || currentCar.id.includes('sobol')) wmi = 'Z8T';
    else if (currentCar.id.includes('uaz')) wmi = 'XTT';
    else if (currentCar.id.includes('bmw') || currentCar.id.includes('mercedes') || currentCar.id.includes('audi')) wmi = 'WBA';
    const vin = `${wmi}${currentCar.id.substring(0,4).toUpperCase().padEnd(4, '0')}${currentCar.year.toString().slice(-2)}0${randomDigits(7)}`;

    const licensePlate = `${randomLetter()}${Math.floor(100 + Math.random() * 900)}${randomLetter()}${randomLetter()} 777`;
    const engineNumber = `${currentCar.powerHp > 200 ? '21127' : '21126'}-${randomDigits(7)}`;
    const ptsSeries = `77 ТР ${randomDigits(6)}`;
    const stsSeries = `99 21 ${randomDigits(6)}`;
    const dkpSeries = `ДКП-${randomDigits(6)}`;
    const ownerName = player.name || 'Иванов Иван Иванович';
    const now = new Date();
    const registrationDate = `${now.getDate().toString().padStart(2, '0')}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getFullYear()} г.`;

    const ptsItem = {
      ...createItem('car_pts', 1),
      nameRu: `ПТС — ${currentCar.nameRu}`,
      descriptionRu: `Паспорт ТС № ${ptsSeries}. ТС: ${currentCar.nameRu}. VIN: ${vin}. Собственник: ${ownerName}.`,
      vehicleVin: vin,
      vehicleName: currentCar.nameRu,
      vehicleColor: currentColor.name,
      vehicleYear: currentCar.year,
      vehiclePowerHp: currentCar.powerHp,
      engineDisplacementCc: (currentCar as any).engineDisplacementCc || 1596,
      engineNumber: engineNumber,
      bodyNumber: vin,
      licensePlate: licensePlate,
      ownerName: ownerName,
      documentSeries: ptsSeries,
      registrationDate: registrationDate,
      issuingAuthority: 'МО ГИБДД ТНРЭР №1 ГУ МВД России по г. Москве',
      priceRub: currentCar.priceRub
    };

    const stsItem = {
      ...createItem('car_tech_passport', 1),
      nameRu: `СТС — ${currentCar.nameRu} (${licensePlate})`,
      descriptionRu: `Свидетельство о регистрации ТС № ${stsSeries}. Госномер: ${licensePlate}. VIN: ${vin}. Владелец: ${ownerName}.`,
      vehicleVin: vin,
      vehicleName: currentCar.nameRu,
      vehicleColor: currentColor.name,
      vehicleYear: currentCar.year,
      vehiclePowerHp: currentCar.powerHp,
      engineDisplacementCc: (currentCar as any).engineDisplacementCc || 1596,
      engineNumber: engineNumber,
      bodyNumber: vin,
      licensePlate: licensePlate,
      ownerName: ownerName,
      documentSeries: stsSeries,
      registrationDate: registrationDate,
      issuingAuthority: 'МО ГИБДД ТНРЭР №1 ГУ МВД России по г. Москве',
      priceRub: currentCar.priceRub
    };

    const dkpItem = {
      ...createItem('car_contract_dkp', 1),
      nameRu: `Договор купли-продажи (${currentCar.nameRu})`,
      descriptionRu: `Договор купли-продажи № ${dkpSeries}. Продавец: ООО «Премиум Моторс». Покупатель: ${ownerName}. VIN: ${vin}. Стоимость: ${currentCar.priceRub.toLocaleString('ru-RU')} ₽.`,
      vehicleVin: vin,
      vehicleName: currentCar.nameRu,
      vehicleColor: currentColor.name,
      vehicleYear: currentCar.year,
      vehiclePowerHp: currentCar.powerHp,
      engineDisplacementCc: (currentCar as any).engineDisplacementCc || 1596,
      engineNumber: engineNumber,
      bodyNumber: vin,
      licensePlate: licensePlate,
      ownerName: ownerName,
      sellerName: 'ООО «Премиум Моторс» (Автосалон)',
      documentSeries: dkpSeries,
      registrationDate: registrationDate,
      priceRub: currentCar.priceRub
    };

    const tryAddItem = (item: any, preferPockets = false) => {
      const added = addItemToPlayer(player, item, { preferPockets });
      if (!added && world) {
        if (!world.groundItems) world.groundItems = [];
        const angle = player.angle || 0;
        world.groundItems.push({
          id: `ground_dealership_${Date.now()}_${Math.random()}`,
          x: player.x + Math.cos(angle) * 15,
          y: player.y + Math.sin(angle) * 15,
          item: item,
          spawnTime: Date.now()
        });
        addPlayerNotification(player, `Инвентарь полон! ${item.nameRu} выпал на пол.`, 'warning');
      }
    };

    tryAddItem(keyItem, false);
    tryAddItem(ptsItem, true);
    tryAddItem(stsItem, true);
    tryAddItem(dkpItem, true);

    sound.playBuySell();
    setPurchaseSuccessMessage(`Поздравляем с покупкой ${currentCar.nameRu}! Автомобиль ожидает вас на площадке выдачи у главного входа автосалона. В инвентарь добавлены: Ключ с пультом ЦЗ, ПТС, СТС и Договор купли-продажи.`);
  };

  return (
    <div className="fixed inset-0 overflow-y-auto overflow-x-hidden bg-black/80 backdrop-blur-md z-50 flex items-start sm:items-center justify-center p-1 sm:p-3 md:p-4 font-sans text-zinc-100">
      <div className="my-auto relative bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-5xl max-h-[94vh] sm:max-h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-3 sm:px-4 py-2.5 sm:py-3 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="p-2 sm:p-2.5 rounded-xl bg-zinc-800 text-emerald-400 border border-zinc-700/50 shrink-0">
              <Car className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-lg font-bold text-zinc-100 truncate">
                  Автосалон "Премиум Моторс"
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shrink-0">
                  Продажа ТС
                </span>
              </div>
              <p className="text-xs text-zinc-400 truncate hidden sm:block">
                Новые автомобили из салона и подержанные авто с авторынка
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-xl bg-zinc-900 border border-zinc-800">
              <Coins className="w-4 h-4 text-emerald-400" />
              <span className="text-xs sm:text-sm font-mono font-bold text-emerald-400">
                {playerCash.toLocaleString('ru-RU')} ₽
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 min-h-[38px] min-w-[38px] sm:min-h-[44px] sm:min-w-[44px] flex items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-zinc-900/60 border-b border-zinc-800 px-4 py-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setActiveTab('new');
                setSelectedCarIndex(0);
                setPurchaseSuccessMessage(null);
              }}
              className={`px-4 py-2 min-h-[44px] rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'new'
                  ? 'bg-emerald-600 text-white border border-emerald-500 shadow-md'
                  : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-zinc-200'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Новые авто ({DEALERSHIP_CARS.length})</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('used');
                setSelectedCarIndex(0);
                setPurchaseSuccessMessage(null);
              }}
              className={`px-4 py-2 min-h-[44px] rounded-xl text-xs font-bold transition-all flex items-center gap-2 relative ${
                activeTab === 'used'
                  ? 'bg-amber-600 text-white border border-amber-500 shadow-md'
                  : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-zinc-200'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Авторынок Б/У ({USED_CAR_CATALOG.length})</span>
            </button>
          </div>

          {activeTab === 'used' && (
            <div className="text-[11px] text-amber-400 font-mono flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
              Обновление каждые 5 мин
            </div>
          )}
        </div>

        {/* Success Alert Banner */}
        {purchaseSuccessMessage && (
          <div className="bg-emerald-950/90 border-b border-emerald-700/60 px-4 py-3 flex items-center justify-between text-xs text-emerald-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{purchaseSuccessMessage}</span>
            </div>
            <button
              onClick={() => setPurchaseSuccessMessage(null)}
              className="px-3 py-1.5 min-h-[36px] rounded-lg bg-emerald-900 text-emerald-200 hover:bg-emerald-800 text-xs font-bold"
            >
              Отлично
            </button>
          </div>
        )}

        {/* Modal Main Grid */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
          
          {/* Left Column: Car Catalog List */}
          <div className="md:col-span-4 border-r border-zinc-800 bg-zinc-950/60 overflow-y-auto p-3 space-y-2 max-h-[220px] md:max-h-none">
            <div className="px-1 py-1 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              {activeTab === 'new' ? 'Новые из автосалона' : 'Подержанные авто на рынке'}:
            </div>
            {carsList.map((car, idx) => {
              const isSelected = idx === selectedCarIndex;
              const isUsedCar = activeTab === 'used';
              return (
                <button
                  key={car.id}
                  onClick={() => {
                    setSelectedCarIndex(idx);
                    setPurchaseSuccessMessage(null);
                  }}
                  className={`w-full text-left p-3 min-h-[56px] rounded-xl border transition-all flex flex-col gap-1 cursor-pointer ${
                    isSelected
                      ? isUsedCar
                        ? 'bg-amber-600/15 border-amber-500 text-white'
                        : 'bg-emerald-600/15 border-emerald-500 text-white'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider block ${isUsedCar ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {car.brand}
                      </span>
                      <h3 className="font-bold text-zinc-100 text-xs sm:text-sm leading-tight">{car.nameRu}</h3>
                    </div>
                    <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded border ${isUsedCar ? 'text-amber-300 bg-amber-500/10 border-amber-500/30' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'}`}>
                      {car.priceRub.toLocaleString('ru-RU')} ₽
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-zinc-400 mt-1">
                    <span className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300">{car.classType}</span>
                    <span>•</span>
                    <span>{car.year} г.</span>
                    <span>•</span>
                    <span className={isUsedCar ? 'text-amber-300' : 'text-emerald-400'}>
                      {isUsedCar ? `${((car as any).mileageKm / 1000).toFixed(0)}k км` : car.fuelTypeLabel}
                    </span>
                  </div>

                  {isUsedCar && (
                    <div className="w-full mt-1 flex items-center justify-between text-[10px] font-mono text-zinc-400 border-t border-zinc-800/60 pt-1">
                      <span>Состояние ДВС:</span>
                      <span className={(car as any).engineHealth > 50 ? 'text-emerald-400' : (car as any).engineHealth > 30 ? 'text-amber-400' : 'text-rose-400'}>
                        {(car as any).engineHealth}%
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right Column: Car Details & Customization */}
          <div className="md:col-span-8 overflow-y-auto p-4 sm:p-6 flex flex-col gap-5 bg-zinc-900">
            
            {/* Top Showcase: Live Canvas & High-level Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center bg-zinc-950 p-4 rounded-xl border border-zinc-800">
              
              {/* Canvas Preview */}
              <div className="sm:col-span-5 flex flex-col items-center justify-center bg-zinc-900 rounded-xl p-3 border border-zinc-800">
                <canvas
                  ref={canvasRef}
                  width={220}
                  height={150}
                  className="w-full h-[140px] object-contain drop-shadow-xl"
                />
                <span className="text-[10px] text-zinc-400 mt-2 font-mono">Вид сверху (Визуализация ТС)</span>
              </div>

              {/* Title & Price Card */}
              <div className="sm:col-span-7 flex flex-col gap-2">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">{currentCar.brand}</span>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-zinc-100">{currentCar.nameRu}</h2>
                  <p className="text-xs text-zinc-400 leading-relaxed mt-1">{currentCar.descriptionRu}</p>
                </div>

                <div className="flex items-center gap-3 mt-2">
                  <div className="text-2xl font-mono font-bold text-emerald-400">
                    {currentCar.priceRub.toLocaleString('ru-RU')} ₽
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-lg font-bold border ${
                    canAfford
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  }`}>
                    {canAfford ? 'Доступно к покупке' : 'Недостаточно денег'}
                  </span>
                </div>
              </div>
            </div>

            {/* Customization Options: Color & Transmission */}
            {activeTab === 'used' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Technical Health Indicators */}
                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 flex flex-col gap-3">
                  <label className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                    Техническое состояние:
                  </label>
                  
                  <div className="space-y-2 text-xs">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-zinc-400">Состояние двигателя:</span>
                        <span className="font-bold text-zinc-200">{(currentCar as any).engineHealth}%</span>
                      </div>
                      <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${(currentCar as any).engineHealth > 50 ? 'bg-emerald-500' : (currentCar as any).engineHealth > 25 ? 'bg-amber-500' : 'bg-rose-500'}`}
                          style={{ width: `${(currentCar as any).engineHealth}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-zinc-400">Состояние КПП:</span>
                        <span className="font-bold text-zinc-200">{(currentCar as any).transmissionHealth}%</span>
                      </div>
                      <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${(currentCar as any).transmissionHealth > 50 ? 'bg-emerald-500' : (currentCar as any).transmissionHealth > 25 ? 'bg-amber-500' : 'bg-rose-500'}`}
                          style={{ width: `${(currentCar as any).transmissionHealth}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-zinc-400">Заряд аккумулятора:</span>
                        <span className="font-bold text-zinc-200">{(currentCar as any).batteryCharge}%</span>
                      </div>
                      <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(currentCar as any).batteryCharge}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-zinc-400">Вода в радиаторе:</span>
                        <span className="font-bold text-zinc-200">{(currentCar as any).radiatorWater}%</span>
                      </div>
                      <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${(currentCar as any).radiatorPunctured ? 'bg-rose-600' : 'bg-sky-500'}`}
                          style={{ width: `${(currentCar as any).radiatorWater}%` }}
                        />
                      </div>
                      {(currentCar as any).radiatorPunctured && (
                        <div className="text-[10px] text-rose-400 mt-1 font-mono">
                          Внимание: Радиатор пробит (Течь ОЖ)
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Body & Modifications */}
                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 flex flex-col justify-between">
                  <div>
                    <label className="text-xs font-bold text-amber-400 uppercase tracking-wider block mb-2">
                      Модификации и кузов:
                    </label>
                    <div className="text-xs space-y-2 mt-1">
                      <div className="flex justify-between border-b border-zinc-800/80 pb-1">
                        <span className="text-zinc-400">Кузов:</span>
                        <span className="font-semibold text-zinc-200">{(currentCar as any).bodyCondition}</span>
                      </div>
                      <div className="flex justify-between border-b border-zinc-800/80 pb-1">
                        <span className="text-zinc-400">Цвет кузова:</span>
                        <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
                          <span className="w-3.5 h-3.5 rounded-full border border-zinc-700" style={{ backgroundColor: (currentCar as any).color.hex }} />
                          {(currentCar as any).color.name}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-zinc-800/80 pb-1">
                        <span className="text-zinc-400">Коробка:</span>
                        <span className="font-semibold text-zinc-200">{(currentCar as any).hasManualTrans ? 'МКПП (Механика)' : 'АКПП (Автомат)'}</span>
                      </div>
                      <div className="flex justify-between pb-1">
                        <span className="text-zinc-400">Пробег:</span>
                        <span className="font-mono font-bold text-amber-400">{(currentCar as any).mileageKm.toLocaleString()} км</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {(currentCar as any).hasGBO && (
                      <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded">
                        ГБО Пропан
                      </span>
                    )}
                    {(currentCar as any).isChiptuned && (
                      <span className="text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded">
                        Чип-тюнинг
                      </span>
                    )}
                    {(currentCar as any).isHeavySuspended && (
                      <span className="text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded">
                        Усиленная подвеска
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Color Selector */}
                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block mb-2">
                    Заводской цвет кузова:
                  </label>
                  <div className="text-xs font-semibold text-emerald-400 mb-3">
                    {currentColor.name}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(currentCar as DealershipCarModel).availableColors.map((col, cIdx) => (
                      <button
                        key={col.name}
                        onClick={() => setSelectedColorIndex(cIdx)}
                        title={col.name}
                        className={`w-9 h-9 min-h-[36px] min-w-[36px] rounded-full border-2 transition-transform ${
                          cIdx === selectedColorIndex ? 'border-emerald-400 scale-110 ring-2 ring-emerald-500/30' : 'border-zinc-700'
                        }`}
                        style={{ backgroundColor: col.hex }}
                      />
                    ))}
                  </div>
                </div>

                {/* Transmission Selector */}
                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block mb-2">
                    Коробка передач:
                  </label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <button
                      disabled={!currentCar.hasManualTrans}
                      onClick={() => setTransmissionMode('MANUAL')}
                      className={`p-2 min-h-[44px] rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center gap-0.5 ${
                        transmissionMode === 'MANUAL'
                          ? 'bg-emerald-600 border-emerald-500 text-white'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      } ${!currentCar.hasManualTrans ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      <span>МКПП (Механика)</span>
                      <span className="text-[10px] font-normal opacity-80">5-ступенчатая</span>
                    </button>

                    <button
                      disabled={!currentCar.hasAutoTrans}
                      onClick={() => setTransmissionMode('AUTO')}
                      className={`p-2 min-h-[44px] rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center gap-0.5 ${
                        transmissionMode === 'AUTO'
                          ? 'bg-emerald-600 border-emerald-500 text-white'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      } ${!currentCar.hasAutoTrans ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      <span>АКПП (Автомат)</span>
                      <span className="text-[10px] font-normal opacity-80">Гидротрансформатор</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Detailed Vehicle Specifications Table */}
            <div className="bg-zinc-950 rounded-xl border border-zinc-800 p-4">
              <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-3">
                Технические характеристики:
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div className="bg-zinc-900 p-2.5 rounded-lg border border-zinc-800/80">
                  <span className="text-zinc-400 block text-[10px]">Год выпуска</span>
                  <span className="font-bold text-zinc-200">{currentCar.year} г.</span>
                </div>

                <div className="bg-zinc-900 p-2.5 rounded-lg border border-zinc-800/80">
                  <span className="text-zinc-400 block text-[10px]">Двигатель</span>
                  <span className="font-bold text-zinc-200 truncate block">{currentCar.engineSpec}</span>
                </div>

                <div className="bg-zinc-900 p-2.5 rounded-lg border border-zinc-800/80">
                  <span className="text-zinc-400 block text-[10px]">Мощность</span>
                  <span className="font-bold text-emerald-400">{currentCar.powerHp} л.с.</span>
                </div>

                <div className="bg-zinc-900 p-2.5 rounded-lg border border-zinc-800/80">
                  <span className="text-zinc-400 block text-[10px]">Тип топлива</span>
                  <span className="font-bold text-amber-400">{currentCar.fuelTypeLabel}</span>
                </div>

                <div className="bg-zinc-900 p-2.5 rounded-lg border border-zinc-800/80">
                  <span className="text-zinc-400 block text-[10px]">Макс. скорость</span>
                  <span className="font-bold text-zinc-200">{currentCar.topSpeedKmh} км/ч</span>
                </div>

                <div className="bg-zinc-900 p-2.5 rounded-lg border border-zinc-800/80">
                  <span className="text-zinc-400 block text-[10px]">Разгон 0-100 км/ч</span>
                  <span className="font-bold text-zinc-200">{currentCar.accelSec} сек.</span>
                </div>

                <div className="bg-zinc-900 p-2.5 rounded-lg border border-zinc-800/80">
                  <span className="text-zinc-400 block text-[10px]">Снаряженная масса</span>
                  <span className="font-bold text-zinc-200">{currentCar.weightKg} кг</span>
                </div>

                <div className="bg-zinc-900 p-2.5 rounded-lg border border-zinc-800/80">
                  <span className="text-zinc-400 block text-[10px]">Объем бака</span>
                  <span className="font-bold text-zinc-200">{currentCar.tankCapacityL} литров</span>
                </div>

                <div className="bg-zinc-900 p-2.5 rounded-lg border border-zinc-800/80">
                  <span className="text-zinc-400 block text-[10px]">Габариты кузова</span>
                  <span className="font-bold text-zinc-200">{currentCar.dimensionsM}</span>
                </div>
              </div>
            </div>

            {/* Purchase Footer Action */}
            <div className="pt-3 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between border-t border-zinc-800">
              <div className="text-xs text-zinc-400">
                При покупке вы получаете:<br />
                <span className="text-zinc-200 font-medium">
                  {getVehicleRequiredKeyType(currentCar.type) === 'iron'
                    ? 'Ключ зажигания, ПТС и СТС'
                    : getVehicleRequiredKeyType(currentCar.type) === 'gold'
                    ? 'Золотой ключ зажигания, ПТС и СТС'
                    : 'Ключ с пультом ЦЗ, ПТС и СТС'}
                </span>
              </div>

              <button
                disabled={!canAfford}
                onClick={handleBuy}
                className={`w-full sm:w-auto px-6 py-3 min-h-[48px] rounded-xl font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2 ${
                  canAfford
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-zinc-800 text-zinc-500 opacity-50 cursor-not-allowed'
                }`}
              >
                <Car className="w-5 h-5" />
                <span>Оформить за {currentCar.priceRub.toLocaleString('ru-RU')} ₽</span>
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
