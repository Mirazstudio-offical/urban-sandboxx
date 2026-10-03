/**
 * Railway Signaling System (Сигнализация по ИСИ - Инструкция по сигнализации)
 *
 * Implements a complete, ultra-realistic Russian/Soviet railway signaling system:
 * - Entry signals (Входные Н, Ч, НД, ЧД) - 5-aspect / 3-aspect mast before throats
 * - Exit signals (Выходные Ч1, Н1, Ч2, Н2, Ч3, Н3, Ч4, Н4) - station track ends
 * - Shunting signals (Маневровые М1..М14) - dwarf and mast before every switch with clear target indicators
 * - Block signals (Проходные 1, 3, 4, 6) - automatic block (АБ) on open line
 * - Obstacle signals (Заградительные З1, З2) - diamond zebra shield with red lens
 * - Level Crossing automatic signaling (СП1, СП2) - alternating twin red lanterns + lunar white
 *
 * Fully simulated:
 * - Dynamic track circuit occupancy detection from rolling stock and vehicles
 * - 3-aspect automatic block cascade (Green -> Yellow -> Red)
 * - Station electric interlocking route checks
 * - Upright, non-inverted nameplates with track/switch badges
 * - In-cab / driver diegetic signal explanation badge when within 90px of signal
 */

import { GameWorld, RailwaySignal, RailwaySignalType, RailwaySignalAspect, RailwayLensColor, StreetProp, RailwaySignalFilament, RailwayRelayPhase } from './types';
import { sound } from './audio';
import { TrainSystem } from './trainSystem';
import { getLevelCrossings, isCrossingApproachOccupied } from './levelCrossingSystem';

export class RailwaySignalingSystem {
  // Flash cycle timer (1.1 Hz for ISI standard flashes, 1.2 Hz for crossings)
  private static globalTime = 0;
  private static cachedSignals: Map<string, RailwaySignal> = new Map();
  private static initialized = false;
  private static lastChimeTime = 0;

  /**
   * Initialize or synchronize signal map from world
   */
  public static ensureInitialized(world: GameWorld): void {
    if (!world.railwaySignals || world.railwaySignals.length === 0) {
      this.populateDefaultSignals(world);
    }

    this.cachedSignals.clear();
    for (const sig of world.railwaySignals || []) {
      this.cachedSignals.set(sig.id, sig);
      if (!sig.filaments || sig.filaments.length !== sig.lenses.length) {
        const activeIdxs = this.getActiveIndicesForAspect(sig, sig.currentAspect);
        sig.filaments = sig.lenses.map((_, idx) => {
          const isInitiallyLit = activeIdxs.includes(idx) && sig.currentAspect !== 'dark';
          return {
            temp: isInitiallyLit ? 1.0 : 0.0,
            brightness: isInitiallyLit ? 1.0 : 0.0,
            voltage: isInitiallyLit ? 1.0 : 0.0,
            coldTestPulse: 0
          };
        });
        sig.relayPhase = 'steady';
        sig.relayTimer = 0;
        sig.targetAspect = sig.currentAspect;
        sig.pendingAspect = sig.currentAspect;
      }
    }
    this.initialized = true;
  }

  /**
   * Fallback population if public/map.json was not yet loaded
   */
    private static populateDefaultSignals(world: GameWorld): void {
    const signals: RailwaySignal[] = [
      {
            "id": "sig_entry_N",
            "name": "Входной светофор «Н» (Западный подход, Главный I путь)",
            "nameRu": "Входной «Н»",
            "type": "entry",
            "mastType": "mast",
            "designation": "Н",
            "targetTrack": "Главный I путь",
            "x": 8400,
            "y": 8792,
            "angle": 3.141592653589793,
            "lenses": [
                  "yellow",
                  "green",
                  "red",
                  "yellow",
                  "white"
            ],
            "currentAspect": "red",
            "linkedTrackId": "rail_main_1_west",
            "nextSignalId": "sig_exit_N1"
      },
      {
            "id": "sig_entry_ND",
            "name": "Дополнительный входной светофор «НД» (Западный подход, II путь)",
            "nameRu": "Входной «НД»",
            "type": "entry",
            "mastType": "mast",
            "designation": "НД",
            "targetTrack": "II неправильный путь",
            "x": 8400,
            "y": 8932,
            "angle": 3.141592653589793,
            "lenses": [
                  "yellow",
                  "green",
                  "red",
                  "yellow",
                  "white"
            ],
            "currentAspect": "red",
            "linkedTrackId": "rail_main_2_west"
      },
      {
            "id": "sig_entry_Ch",
            "name": "Входной светофор «Ч» (Восточный подход, Главный II путь)",
            "nameRu": "Входной «Ч»",
            "type": "entry",
            "mastType": "mast",
            "designation": "Ч",
            "targetTrack": "Главный II путь",
            "x": 14100,
            "y": 8828,
            "angle": 0,
            "lenses": [
                  "yellow",
                  "green",
                  "red",
                  "yellow",
                  "white"
            ],
            "currentAspect": "red",
            "linkedTrackId": "rail_main_2_east",
            "nextSignalId": "sig_exit_Ch2"
      },
      {
            "id": "sig_entry_ChD",
            "name": "Дополнительный входной светофор «ЧД» (Восточный подход, I путь)",
            "nameRu": "Входной «ЧД»",
            "type": "entry",
            "mastType": "mast",
            "designation": "ЧД",
            "targetTrack": "I неправильный путь",
            "x": 14100,
            "y": 8688,
            "angle": 0,
            "lenses": [
                  "yellow",
                  "green",
                  "red",
                  "yellow",
                  "white"
            ],
            "currentAspect": "red",
            "linkedTrackId": "rail_main_1_east"
      },
       {
            "id": "sig_exit_N3",
            "name": "Выходной светофор «Н3» (Путь 3, отправление на восток)",
            "nameRu": "Выходной «Н3»",
            "type": "exit",
            "mastType": "dwarf",
            "designation": "Н3",
            "targetTrack": "Путь 3 (Платформа 1)",
            "x": 11650,
            "y": 8642,
            "angle": 3.141592653589793,
            "lenses": [
                  "yellow",
                  "green",
                  "red",
                  "yellow",
                  "white"
            ],
            "currentAspect": "red",
            "nextSignalId": "sig_block_e_13"
      },
      {
            "id": "sig_exit_N1",
            "name": "Выходной светофор «Н1» (Главный I путь, отправление на восток)",
            "nameRu": "Выходной «Н1»",
            "type": "exit",
            "mastType": "dwarf",
            "designation": "Н1",
            "targetTrack": "Главный I путь",
            "x": 11650,
            "y": 8782,
            "angle": 3.141592653589793,
            "lenses": [
                  "yellow",
                  "green",
                  "red",
                  "yellow",
                  "white"
            ],
            "currentAspect": "red",
            "nextSignalId": "sig_block_e_13"
      },
      {
            "id": "sig_exit_N2",
            "name": "Выходной светофор «Н2» (Главный II путь, отправление на восток)",
            "nameRu": "Выходной «Н2»",
            "type": "exit",
            "mastType": "dwarf",
            "designation": "Н2",
            "targetTrack": "Главный II путь",
            "x": 11650,
            "y": 8922,
            "angle": 3.141592653589793,
            "lenses": [
                  "yellow",
                  "green",
                  "red",
                  "yellow",
                  "white"
            ],
            "currentAspect": "red",
            "nextSignalId": "sig_block_e_13"
      },
      {
            "id": "sig_exit_N4",
            "name": "Выходной светофор «Н4» (Путь 4, отправление на восток)",
            "nameRu": "Выходной «Н4»",
            "type": "exit",
            "mastType": "dwarf",
            "designation": "Н4",
            "targetTrack": "Путь 4 (Южный)",
            "x": 11650,
            "y": 9062,
            "angle": 3.141592653589793,
            "lenses": [
                  "yellow",
                  "green",
                  "red",
                  "yellow",
                  "white"
            ],
            "currentAspect": "red",
            "nextSignalId": "sig_block_e_13"
      },
      {
            "id": "sig_exit_Ch3",
            "name": "Выходной светофор «Ч3» (Путь 3, отправление на запад)",
            "nameRu": "Выходной «Ч3»",
            "type": "exit",
            "mastType": "dwarf",
            "designation": "Ч3",
            "targetTrack": "Путь 3 (Платформа 1)",
            "x": 9950,
            "y": 8558,
            "angle": 0,
            "lenses": [
                  "yellow",
                  "green",
                  "red",
                  "yellow",
                  "white"
            ],
            "currentAspect": "red",
            "nextSignalId": "sig_block_w_8"
      },
      {
            "id": "sig_exit_Ch1",
            "name": "Выходной светофор «Ч1» (Главный I путь, отправление на запад)",
            "nameRu": "Выходной «Ч1»",
            "type": "exit",
            "mastType": "dwarf",
            "designation": "Ч1",
            "targetTrack": "Главный I путь",
            "x": 9950,
            "y": 8698,
            "angle": 0,
            "lenses": [
                  "yellow",
                  "green",
                  "red",
                  "yellow",
                  "white"
            ],
            "currentAspect": "red",
            "nextSignalId": "sig_block_w_8"
      },
      {
            "id": "sig_exit_Ch2",
            "name": "Выходной светофор «Ч2» (Главный II путь, отправление на запад)",
            "nameRu": "Выходной «Ч2»",
            "type": "exit",
            "mastType": "dwarf",
            "designation": "Ч2",
            "targetTrack": "Главный II путь",
            "x": 9950,
            "y": 8838,
            "angle": 0,
            "lenses": [
                  "yellow",
                  "green",
                  "red",
                  "yellow",
                  "white"
            ],
            "currentAspect": "red",
            "nextSignalId": "sig_block_w_8"
      },
      {
            "id": "sig_exit_Ch4",
            "name": "Выходной светофор «Ч4» (Путь 4, отправление на запад)",
            "nameRu": "Выходной «Ч4»",
            "type": "exit",
            "mastType": "dwarf",
            "designation": "Ч4",
            "targetTrack": "Путь 4 (Южный)",
            "x": 9950,
            "y": 8978,
            "angle": 0,
            "lenses": [
                  "yellow",
                  "green",
                  "red",
                  "yellow",
                  "white"
            ],
            "currentAspect": "red",
            "nextSignalId": "sig_block_w_8"
      },
      {
            "id": "sig_shunt_M1",
            "name": "Маневровый светофор «М1» (Главный I, перед съездом 5/6)",
            "nameRu": "Маневровый «М1»",
            "type": "shunting",
            "mastType": "dwarf",
            "designation": "М1",
            "targetTrack": "Съезд 5/6",
            "switchNumber": "5/6",
            "x": 8620,
            "y": 8782,
            "angle": 0,
            "lenses": [
                  "white",
                  "blue"
            ],
            "currentAspect": "blue"
      },
      {
            "id": "sig_shunt_M3",
            "name": "Маневровый светофор «М3» (Главный I, перед стрелкой №1)",
            "nameRu": "Маневровый «М3»",
            "type": "shunting",
            "mastType": "dwarf",
            "designation": "М3",
            "targetTrack": "Стрелка 1 (Путь 3)",
            "switchNumber": "1",
            "x": 9120,
            "y": 8782,
            "angle": 0,
            "lenses": [
                  "white",
                  "blue"
            ],
            "currentAspect": "blue"
      },
      {
            "id": "sig_shunt_M5",
            "name": "Маневровый светофор «М5» (Главный II, перед стрелкой №2)",
            "nameRu": "Маневровый «М5»",
            "type": "shunting",
            "mastType": "dwarf",
            "designation": "М5",
            "targetTrack": "Стрелка 2 (Путь 4)",
            "switchNumber": "2",
            "x": 9120,
            "y": 8922,
            "angle": 0,
            "lenses": [
                  "white",
                  "blue"
            ],
            "currentAspect": "blue"
      },
      {
            "id": "sig_shunt_M7",
            "name": "Маневровый светофор «М7» (Главный II, перед съездом 5/6)",
            "nameRu": "Маневровый «М7»",
            "type": "shunting",
            "mastType": "dwarf",
            "designation": "М7",
            "targetTrack": "Съезд 5/6",
            "switchNumber": "5/6",
            "x": 8980,
            "y": 8838,
            "angle": 3.141592653589793,
            "lenses": [
                  "white",
                  "blue"
            ],
            "currentAspect": "blue"
      },
      {
            "id": "sig_shunt_M9",
            "name": "Маневровый светофор «М9» (Путь 3, в горловину со стрелки 1)",
            "nameRu": "Маневровый «М9»",
            "type": "shunting",
            "mastType": "dwarf",
            "designation": "М9",
            "targetTrack": "Горловина",
            "switchNumber": "1",
            "x": 9580,
            "y": 8558,
            "angle": 3.141592653589793,
            "lenses": [
                  "white",
                  "blue"
            ],
            "currentAspect": "blue"
      },
      {
            "id": "sig_shunt_M11",
            "name": "Маневровый светофор «М11» (Путь 4, в горловину со стрелки 2)",
            "nameRu": "Маневровый «М11»",
            "type": "shunting",
            "mastType": "dwarf",
            "designation": "М11",
            "targetTrack": "Горловина",
            "switchNumber": "2",
            "x": 9580,
            "y": 8978,
            "angle": 3.141592653589793,
            "lenses": [
                  "white",
                  "blue"
            ],
            "currentAspect": "blue"
      },
      {
            "id": "sig_shunt_M2",
            "name": "Маневровый светофор «М2» (Путь 3, перед стрелкой №3)",
            "nameRu": "Маневровый «М2»",
            "type": "shunting",
            "mastType": "dwarf",
            "designation": "М2",
            "targetTrack": "Стрелка 3",
            "switchNumber": "3",
            "x": 12880,
            "y": 8642,
            "angle": 0,
            "lenses": [
                  "white",
                  "blue"
            ],
            "currentAspect": "blue"
      },
      {
            "id": "sig_shunt_M4",
            "name": "Маневровый светофор «М4» (Путь 4, перед стрелкой №4)",
            "nameRu": "Маневровый «М4»",
            "type": "shunting",
            "mastType": "dwarf",
            "designation": "М4",
            "targetTrack": "Стрелка 4",
            "switchNumber": "4",
            "x": 12880,
            "y": 9062,
            "angle": 0,
            "lenses": [
                  "white",
                  "blue"
            ],
            "currentAspect": "blue"
      },
      {
            "id": "sig_shunt_M6",
            "name": "Маневровый светофор «М6» (Главный II, перед съездом 7/8)",
            "nameRu": "Маневровый «М6»",
            "type": "shunting",
            "mastType": "dwarf",
            "designation": "М6",
            "targetTrack": "Съезд 7/8",
            "switchNumber": "7/8",
            "x": 13520,
            "y": 8838,
            "angle": 3.141592653589793,
            "lenses": [
                  "white",
                  "blue"
            ],
            "currentAspect": "blue"
      },
      {
            "id": "sig_shunt_M8",
            "name": "Маневровый светофор «М8» (Главный I, перед стрелкой №3)",
            "nameRu": "Маневровый «М8»",
            "type": "shunting",
            "mastType": "dwarf",
            "designation": "М8",
            "targetTrack": "Стрелка 3",
            "switchNumber": "3",
            "x": 13380,
            "y": 8698,
            "angle": 3.141592653589793,
            "lenses": [
                  "white",
                  "blue"
            ],
            "currentAspect": "blue"
      },
      {
            "id": "sig_shunt_M10",
            "name": "Маневровый светофор «М10» (Главный II, перед стрелкой №4)",
            "nameRu": "Маневровый «М10»",
            "type": "shunting",
            "mastType": "dwarf",
            "designation": "М10",
            "targetTrack": "Стрелка 4",
            "switchNumber": "4",
            "x": 13380,
            "y": 8922,
            "angle": 0,
            "lenses": [
                  "white",
                  "blue"
            ],
            "currentAspect": "blue"
      },
      {
            "id": "sig_shunt_M12",
            "name": "Маневровый светофор «М12» (Главный I, перед съездом 7/8)",
            "nameRu": "Маневровый «М12»",
            "type": "shunting",
            "mastType": "dwarf",
            "designation": "М12",
            "targetTrack": "Съезд 7/8",
            "switchNumber": "7/8",
            "x": 13880,
            "y": 8698,
            "angle": 3.141592653589793,
            "lenses": [
                  "white",
                  "blue"
            ],
            "currentAspect": "blue"
      },
      {
            "id": "sig_shunt_M14",
            "name": "Маневровый светофор «М14» (Путь 4, стрелка пакгауза)",
            "nameRu": "Маневровый «М14»",
            "type": "shunting",
            "mastType": "dwarf",
            "designation": "М14",
            "targetTrack": "Пакгауз",
            "switchNumber": "пакгауз",
            "x": 10580,
            "y": 8978,
            "angle": 3.141592653589793,
            "lenses": [
                  "white",
                  "blue"
            ],
            "currentAspect": "blue"
      },
      {
            "id": "sig_shunt_M16",
            "name": "Маневровый светофор «М16» (Вытяжка пакгауза)",
            "nameRu": "Маневровый «М16»",
            "type": "shunting",
            "mastType": "dwarf",
            "designation": "М16",
            "targetTrack": "Путь 4",
            "switchNumber": "пакгауз",
            "x": 10980,
            "y": 9078,
            "angle": 3.141592653589793,
            "lenses": [
                  "white",
                  "blue"
            ],
            "currentAspect": "blue"
      },
      {
            "id": "sig_shunt_M18",
            "name": "Маневровый светофор «М18» (Тупик пакгауза)",
            "nameRu": "Маневровый «М18»",
            "type": "shunting",
            "mastType": "dwarf",
            "designation": "М18",
            "targetTrack": "Вытяжной тупик",
            "switchNumber": "тупик",
            "x": 12400,
            "y": 9138,
            "angle": 3.141592653589793,
            "lenses": [
                  "white",
                  "blue"
            ],
            "currentAspect": "blue"
      },
      {
            "id": "sig_obst_Z1",
            "name": "Заградительный светофор «З1» (Степной переезд, Путь I)",
            "nameRu": "Заградительный «З1»",
            "type": "obstacle",
            "mastType": "mast",
            "designation": "З1",
            "targetTrack": "Главный I путь",
            "x": 12450,
            "y": 8792,
            "angle": 3.141592653589793,
            "lenses": [
                  "red"
            ],
            "currentAspect": "dark"
      },
      {
            "id": "sig_obst_Z2",
            "name": "Заградительный светофор «З2» (Степной переезд, Путь II)",
            "nameRu": "Заградительный «З2»",
            "type": "obstacle",
            "mastType": "mast",
            "designation": "З2",
            "targetTrack": "Главный II путь",
            "x": 12750,
            "y": 8828,
            "angle": 0,
            "lenses": [
                  "red"
            ],
            "currentAspect": "dark"
      },
      {
            "id": "sig_cross_north",
            "name": "Переездный светофор «СП1» (Север, Станция Степная)",
            "nameRu": "Переездный «СП1»",
            "type": "crossing",
            "mastType": "crossing",
            "designation": "СП1",
            "targetTrack": "Автодорога",
            "x": 12530,
            "y": 8525,
            "angle": -1.5708,
            "lenses": ["red", "red", "white"],
            "currentAspect": "lunar_white_flashing",
            "isCrossingGate": true,
            "barrierLength": 66
      },
      {
            "id": "sig_cross_south",
            "name": "Переездный светофор «СП2» (Юг, Станция Степная)",
            "nameRu": "Переездный «СП2»",
            "type": "crossing",
            "mastType": "crossing",
            "designation": "СП2",
            "targetTrack": "Автодорога",
            "x": 12670,
            "y": 9095,
            "angle": 1.5708,
            "lenses": ["red", "red", "white"],
            "currentAspect": "lunar_white_flashing",
            "isCrossingGate": true,
            "barrierLength": 66
      },
      {
            "id": "sig_cross_canyon_w_n",
            "name": "Переездный светофор «СП-К1» (Каньон Запад, Север)",
            "nameRu": "Переездный «СП-К1»",
            "type": "crossing",
            "mastType": "crossing",
            "designation": "СП-К1",
            "targetTrack": "Каньонное Шоссе",
            "x": 18100,
            "y": 8680,
            "angle": -2.366,
            "lenses": ["red", "red", "white"],
            "currentAspect": "lunar_white_flashing",
            "isCrossingGate": true,
            "barrierLength": 54
      },
      {
            "id": "sig_cross_canyon_w_s",
            "name": "Переездный светофор «СП-К2» (Каньон Запад, Юг)",
            "nameRu": "Переездный «СП-К2»",
            "type": "crossing",
            "mastType": "crossing",
            "designation": "СП-К2",
            "targetTrack": "Каньонное Шоссе",
            "x": 18546,
            "y": 8945,
            "angle": 0.776,
            "lenses": ["red", "red", "white"],
            "currentAspect": "lunar_white_flashing",
            "isCrossingGate": true,
            "barrierLength": 54
      },
      {
            "id": "sig_cross_quarry_n",
            "name": "Переездный светофор «СП-КР1» (Карьер, Север)",
            "nameRu": "Переездный «СП-КР1»",
            "type": "crossing",
            "mastType": "crossing",
            "designation": "СП-КР1",
            "targetTrack": "Спуск в карьер",
            "x": 23816,
            "y": 8665,
            "angle": -2.156,
            "lenses": ["red", "red", "white"],
            "currentAspect": "lunar_white_flashing",
            "isCrossingGate": true,
            "barrierLength": 54
      },
      {
            "id": "sig_cross_quarry_s",
            "name": "Переездный светофор «СП-КР2» (Карьер, Юг)",
            "nameRu": "Переездный «СП-КР2»",
            "type": "crossing",
            "mastType": "crossing",
            "designation": "СП-КР2",
            "targetTrack": "Спуск в карьер",
            "x": 24142,
            "y": 8945,
            "angle": 0.985,
            "lenses": ["red", "red", "white"],
            "currentAspect": "lunar_white_flashing",
            "isCrossingGate": true,
            "barrierLength": 54
      },
      {
            "id": "sig_cross_canyon_e_n",
            "name": "Переездный светофор «СП-К3» (Каньон Восток, Север)",
            "nameRu": "Переездный «СП-К3»",
            "type": "crossing",
            "mastType": "crossing",
            "designation": "СП-К3",
            "targetTrack": "Каньонное Шоссе",
            "x": 30055,
            "y": 8631,
            "angle": -0.67,
            "lenses": ["red", "red", "white"],
            "currentAspect": "lunar_white_flashing",
            "isCrossingGate": true,
            "barrierLength": 54
      },
      {
            "id": "sig_cross_canyon_e_s",
            "name": "Переездный светофор «СП-К4» (Каньон Восток, Юг)",
            "nameRu": "Переездный «СП-К4»",
            "type": "crossing",
            "mastType": "crossing",
            "designation": "СП-К4",
            "targetTrack": "Каньонное Шоссе",
            "x": 29790,
            "y": 8997,
            "angle": 2.47,
            "lenses": ["red", "red", "white"],
            "currentAspect": "lunar_white_flashing",
            "isCrossingGate": true,
            "barrierLength": 54
      },
      {
            "id": "sig_cross_dunes_n",
            "name": "Переездный светофор «СП-Б1» (Барханы, Север)",
            "nameRu": "Переездный «СП-Б1»",
            "type": "crossing",
            "mastType": "crossing",
            "designation": "СП-Б1",
            "targetTrack": "Трасса «Золотые Пески»",
            "x": 47112,
            "y": 8635,
            "angle": -1.393,
            "lenses": ["red", "red", "white"],
            "currentAspect": "lunar_white_flashing",
            "isCrossingGate": true,
            "barrierLength": 54
      },
      {
            "id": "sig_cross_dunes_s",
            "name": "Переездный светофор «СП-Б2» (Барханы, Юг)",
            "nameRu": "Переездный «СП-Б2»",
            "type": "crossing",
            "mastType": "crossing",
            "designation": "СП-Б2",
            "targetTrack": "Трасса «Золотые Пески»",
            "x": 47167,
            "y": 8985,
            "angle": 1.7464,
            "lenses": ["red", "red", "white"],
            "currentAspect": "lunar_white_flashing",
            "isCrossingGate": true,
            "barrierLength": 54
      },
      {
            "id": "sig_cross_border_n",
            "name": "Переездный светофор «СП-П1» (Погранзастава, Север)",
            "nameRu": "Переездный «СП-П1»",
            "type": "crossing",
            "mastType": "crossing",
            "designation": "СП-П1",
            "targetTrack": "Восточный Рубеж",
            "x": 49747,
            "y": 8646,
            "angle": -1.5827,
            "lenses": ["red", "red", "white"],
            "currentAspect": "lunar_white_flashing",
            "isCrossingGate": true,
            "barrierLength": 54
      },
      {
            "id": "sig_cross_border_s",
            "name": "Переездный светофор «СП-П2» (Погранзастава, Юг)",
            "nameRu": "Переездный «СП-П2»",
            "type": "crossing",
            "mastType": "crossing",
            "designation": "СП-П2",
            "targetTrack": "Восточный Рубеж",
            "x": 49849,
            "y": 8980,
            "angle": 1.6559,
            "lenses": ["red", "red", "white"],
            "currentAspect": "lunar_white_flashing",
            "isCrossingGate": true,
            "barrierLength": 54
      },
      {
            "id": "sig_block_w_7",
            "name": "Проходной светофор «7» (Западный перегон, I путь)",
            "nameRu": "Проходной «7»",
            "type": "block",
            "mastType": "mast",
            "designation": "7",
            "targetTrack": "Главный I путь",
            "x": -1200,
            "y": 8792,
            "angle": 3.141592653589793,
            "lenses": [
                  "green",
                  "yellow",
                  "red"
            ],
            "currentAspect": "green",
            "nextSignalId": "sig_block_w_5"
      },
      {
            "id": "sig_block_w_5",
            "name": "Проходной светофор «5» (Западный перегон, I путь)",
            "nameRu": "Проходной «5»",
            "type": "block",
            "mastType": "mast",
            "designation": "5",
            "targetTrack": "Главный I путь",
            "x": 500,
            "y": 8792,
            "angle": 3.141592653589793,
            "lenses": [
                  "green",
                  "yellow",
                  "red"
            ],
            "currentAspect": "green",
            "nextSignalId": "sig_block_w_3"
      },
      {
            "id": "sig_block_w_3",
            "name": "Проходной светофор «3» (Западный перегон, I путь)",
            "nameRu": "Проходной «3»",
            "type": "block",
            "mastType": "mast",
            "designation": "3",
            "targetTrack": "Главный I путь",
            "x": 3000,
            "y": 8792,
            "angle": 3.141592653589793,
            "lenses": [
                  "green",
                  "yellow",
                  "red"
            ],
            "currentAspect": "green",
            "nextSignalId": "sig_block_w_1"
      },
      {
            "id": "sig_block_w_1",
            "name": "Предвходной светофор «1» (Западный перегон, I путь к станции Степная)",
            "nameRu": "Предвходной «1»",
            "type": "block",
            "mastType": "mast",
            "designation": "1",
            "targetTrack": "Главный I путь",
            "x": 6000,
            "y": 8792,
            "angle": 3.141592653589793,
            "lenses": [
                  "green",
                  "yellow",
                  "red"
            ],
            "currentAspect": "green",
            "isApproachSignal": true,
            "nextSignalId": "sig_entry_N"
      },
      {
            "id": "sig_block_w_8",
            "name": "Проходной светофор «8» (Западный перегон, II путь)",
            "nameRu": "Проходной «8»",
            "type": "block",
            "mastType": "mast",
            "designation": "8",
            "targetTrack": "Главный II путь",
            "x": 6000,
            "y": 8828,
            "angle": 0,
            "lenses": [
                  "green",
                  "yellow",
                  "red"
            ],
            "currentAspect": "green",
            "nextSignalId": "sig_block_w_6"
      },
      {
            "id": "sig_block_w_6",
            "name": "Проходной светофор «6» (Западный перегон, II путь)",
            "nameRu": "Проходной «6»",
            "type": "block",
            "mastType": "mast",
            "designation": "6",
            "targetTrack": "Главный II путь",
            "x": 3000,
            "y": 8828,
            "angle": 0,
            "lenses": [
                  "green",
                  "yellow",
                  "red"
            ],
            "currentAspect": "green",
            "nextSignalId": "sig_block_w_4"
      },
      {
            "id": "sig_block_w_4",
            "name": "Проходной светофор «4» (Западный перегон, II путь)",
            "nameRu": "Проходной «4»",
            "type": "block",
            "mastType": "mast",
            "designation": "4",
            "targetTrack": "Главный II путь",
            "x": 500,
            "y": 8828,
            "angle": 0,
            "lenses": [
                  "green",
                  "yellow",
                  "red"
            ],
            "currentAspect": "green",
            "nextSignalId": "sig_block_w_2"
      },
      {
            "id": "sig_block_w_2",
            "name": "Предвходной светофор «2» (Западный перегон, II путь к след. станции)",
            "nameRu": "Предвходной «2»",
            "type": "block",
            "mastType": "mast",
            "designation": "2",
            "targetTrack": "Главный II путь",
            "x": -1200,
            "y": 8828,
            "angle": 0,
            "lenses": [
                  "green",
                  "yellow",
                  "red"
            ],
            "currentAspect": "green",
            "isApproachSignal": true
      },
      {
            "id": "sig_block_e_13",
            "name": "Проходной светофор «13» (Восточный перегон, I путь)",
            "nameRu": "Проходной «13»",
            "type": "block",
            "mastType": "mast",
            "designation": "13",
            "targetTrack": "Главный I путь",
            "x": 18000,
            "y": 8792,
            "angle": 3.141592653589793,
            "lenses": [
                  "green",
                  "yellow",
                  "red"
            ],
            "currentAspect": "green",
            "nextSignalId": "sig_block_e_11"
      },
      {
            "id": "sig_block_e_11",
            "name": "Проходной светофор «11» (Восточный перегон, I путь)",
            "nameRu": "Проходной «11»",
            "type": "block",
            "mastType": "mast",
            "designation": "11",
            "targetTrack": "Главный I путь",
            "x": 23500,
            "y": 8792,
            "angle": 3.141592653589793,
            "lenses": [
                  "green",
                  "yellow",
                  "red"
            ],
            "currentAspect": "green",
            "nextSignalId": "sig_block_e_9"
      },
      {
            "id": "sig_block_e_9",
            "name": "Проходной светофор «9» (Восточный перегон, I путь)",
            "nameRu": "Проходной «9»",
            "type": "block",
            "mastType": "mast",
            "designation": "9",
            "targetTrack": "Главный I путь",
            "x": 29000,
            "y": 8792,
            "angle": 3.141592653589793,
            "lenses": [
                  "green",
                  "yellow",
                  "red"
            ],
            "currentAspect": "green",
            "nextSignalId": "sig_block_e_7"
      },
      {
            "id": "sig_block_e_7",
            "name": "Проходной светофор «7» (Восточный перегон, I путь)",
            "nameRu": "Проходной «7»",
            "type": "block",
            "mastType": "mast",
            "designation": "7",
            "targetTrack": "Главный I путь",
            "x": 35000,
            "y": 8792,
            "angle": 3.141592653589793,
            "lenses": [
                  "green",
                  "yellow",
                  "red"
            ],
            "currentAspect": "green",
            "nextSignalId": "sig_block_e_5"
      },
      {
            "id": "sig_block_e_5",
            "name": "Проходной светофор «5» (Восточный перегон, I путь)",
            "nameRu": "Проходной «5»",
            "type": "block",
            "mastType": "mast",
            "designation": "5",
            "targetTrack": "Главный I путь",
            "x": 41000,
            "y": 8792,
            "angle": 3.141592653589793,
            "lenses": [
                  "green",
                  "yellow",
                  "red"
            ],
            "currentAspect": "green",
            "nextSignalId": "sig_block_e_3"
      },
      {
            "id": "sig_block_e_3",
            "name": "Проходной светофор «3» (Восточный перегон, I путь)",
            "nameRu": "Проходной «3»",
            "type": "block",
            "mastType": "mast",
            "designation": "3",
            "targetTrack": "Главный I путь",
            "x": 47500,
            "y": 8792,
            "angle": 3.141592653589793,
            "lenses": [
                  "green",
                  "yellow",
                  "red"
            ],
            "currentAspect": "green",
            "nextSignalId": "sig_block_e_1"
      },
      {
            "id": "sig_block_e_1",
            "name": "Предвходной светофор «1» (Восточный перегон, I путь к восточной станции)",
            "nameRu": "Предвходной «1»",
            "type": "block",
            "mastType": "mast",
            "designation": "1",
            "targetTrack": "Главный I путь",
            "x": 53000,
            "y": 8792,
            "angle": 3.141592653589793,
            "lenses": [
                  "green",
                  "yellow",
                  "red"
            ],
            "currentAspect": "green",
            "isApproachSignal": true
      },
      {
            "id": "sig_block_e_14",
            "name": "Проходной светофор «14» (Восточный перегон, II путь)",
            "nameRu": "Проходной «14»",
            "type": "block",
            "mastType": "mast",
            "designation": "14",
            "targetTrack": "Главный II путь",
            "x": 53000,
            "y": 8828,
            "angle": 0,
            "lenses": [
                  "green",
                  "yellow",
                  "red"
            ],
            "currentAspect": "green",
            "nextSignalId": "sig_block_e_12"
      },
      {
            "id": "sig_block_e_12",
            "name": "Проходной светофор «12» (Восточный перегон, II путь)",
            "nameRu": "Проходной «12»",
            "type": "block",
            "mastType": "mast",
            "designation": "12",
            "targetTrack": "Главный II путь",
            "x": 47500,
            "y": 8828,
            "angle": 0,
            "lenses": [
                  "green",
                  "yellow",
                  "red"
            ],
            "currentAspect": "green",
            "nextSignalId": "sig_block_e_10"
      },
      {
            "id": "sig_block_e_10",
            "name": "Проходной светофор «10» (Восточный перегон, II путь)",
            "nameRu": "Проходной «10»",
            "type": "block",
            "mastType": "mast",
            "designation": "10",
            "targetTrack": "Главный II путь",
            "x": 41000,
            "y": 8828,
            "angle": 0,
            "lenses": [
                  "green",
                  "yellow",
                  "red"
            ],
            "currentAspect": "green",
            "nextSignalId": "sig_block_e_8"
      },
      {
            "id": "sig_block_e_8",
            "name": "Проходной светофор «8» (Восточный перегон, II путь)",
            "nameRu": "Проходной «8»",
            "type": "block",
            "mastType": "mast",
            "designation": "8",
            "targetTrack": "Главный II путь",
            "x": 35000,
            "y": 8828,
            "angle": 0,
            "lenses": [
                  "green",
                  "yellow",
                  "red"
            ],
            "currentAspect": "green",
            "nextSignalId": "sig_block_e_6"
      },
      {
            "id": "sig_block_e_6",
            "name": "Проходной светофор «6» (Восточный перегон, II путь)",
            "nameRu": "Проходной «6»",
            "type": "block",
            "mastType": "mast",
            "designation": "6",
            "targetTrack": "Главный II путь",
            "x": 29000,
            "y": 8828,
            "angle": 0,
            "lenses": [
                  "green",
                  "yellow",
                  "red"
            ],
            "currentAspect": "green",
            "nextSignalId": "sig_block_e_4"
      },
      {
            "id": "sig_block_e_4",
            "name": "Проходной светофор «4» (Восточный перегон, II путь)",
            "nameRu": "Проходной «4»",
            "type": "block",
            "mastType": "mast",
            "designation": "4",
            "targetTrack": "Главный II путь",
            "x": 23500,
            "y": 8828,
            "angle": 0,
            "lenses": [
                  "green",
                  "yellow",
                  "red"
            ],
            "currentAspect": "green",
            "nextSignalId": "sig_block_e_2"
      },
      {
            "id": "sig_block_e_2",
            "name": "Предвходной светофор «2» (Восточный перегон, II путь к станции Степная)",
            "nameRu": "Предвходной «2»",
            "type": "block",
            "mastType": "mast",
            "designation": "2",
            "targetTrack": "Главный II путь",
            "x": 18000,
            "y": 8828,
            "angle": 0,
            "lenses": [
                  "green",
                  "yellow",
                  "red"
            ],
            "currentAspect": "green",
            "isApproachSignal": true,
            "nextSignalId": "sig_entry_Ch"
      }
];
    world.railwaySignals = signals;
  }

  /**
   * Update signaling states based on rolling stock tracking & auto-block logic
   */
    public static update(world: GameWorld, dt: number): void {
    this.ensureInitialized(world);
    this.globalTime += dt;

    const signals = world.railwaySignals || [];
    const cars = world.rollingStock || [];
    const vehicles = world.vehicles || [];
    const sigMap = this.cachedSignals;

    // Helper: test track occupancy by rolling stock envelope (from front nose to rear coupler)
    const isTrackOccupied = (minX: number, maxX: number, minY: number, maxY: number) => {
      for (const car of cars) {
        const halfL = car.length / 2;
        const noseWest = car.x - halfL;
        const noseEast = car.x + halfL;
        if (noseEast >= minX && noseWest <= maxX && car.y >= minY && car.y <= maxY) {
          return true;
        }
      }
      return false;
    };

    // Helper to request target aspect without instant switching
    const setDesired = (sig: RailwaySignal | undefined, aspect: RailwaySignalAspect) => {
      if (!sig) return;
      if (!sig.targetAspect) sig.targetAspect = sig.currentAspect;
      sig.targetAspect = aspect;
    };

    // Helper to check if a train consist is currently on or approaching a specific track section
    const consists = TrainSystem.getConsists();

    // --- A. ISOLATED TRACK CIRCUITS & STATION THROATS ---
    // Open Line Block Sections (Track I Eastbound)
    const occ_w7 = isTrackOccupied(-4000, 500, 8710, 8810);
    const occ_w5 = isTrackOccupied(500, 3000, 8710, 8810);
    const occ_w3 = isTrackOccupied(3000, 6000, 8710, 8810);
    const occ_w1_app = isTrackOccupied(6000, 8400, 8710, 8810);

    // Station Switch Throat Sections (Стрелочно-путные секции горловин)
    const occ_west_throat = isTrackOccupied(8400, 9650, 8550, 9110);
    const occ_east_throat = isTrackOccupied(12850, 14100, 8550, 9110);

    // Station Internal Tracks (Приемо-отправочные пути)
    const occ_station_I_track = isTrackOccupied(9650, 12850, 8710, 8810); // Mainline I (IП)
    const occ_station_II_track = isTrackOccupied(9650, 12850, 8815, 8920); // Mainline II (IIП)
    const occ_track3 = isTrackOccupied(9650, 12850, 8550, 8680); // Track 3 (3П - Platform 1)
    const occ_track4 = isTrackOccupied(9650, 12850, 8980, 9110); // Track 4 (4П - South Track)
    const occ_siding = isTrackOccupied(10600, 12500, 9115, 9250); // Freight siding

    // Open Line Departure & Block Sections (Track I Eastbound)
    const occ_dep_e13 = isTrackOccupied(12850, 18000, 8710, 8810);
    const occ_e11 = isTrackOccupied(18000, 23500, 8710, 8810);
    const occ_e9 = isTrackOccupied(23500, 29000, 8710, 8810);
    const occ_e7 = isTrackOccupied(29000, 35000, 8710, 8810);
    const occ_e5 = isTrackOccupied(35000, 41000, 8710, 8810);
    const occ_e3 = isTrackOccupied(41000, 47500, 8710, 8810);
    const occ_e1_app = isTrackOccupied(47500, 53000, 8710, 8810);
    const occ_beyond_e1 = isTrackOccupied(53000, 65000, 8710, 8810);

    // Open Line Block Sections (Track II Westbound)
    const occ_e14 = isTrackOccupied(47500, 53000, 8815, 8920);
    const occ_e12 = isTrackOccupied(41000, 47500, 8815, 8920);
    const occ_e10 = isTrackOccupied(35000, 41000, 8815, 8920);
    const occ_e8 = isTrackOccupied(29000, 35000, 8815, 8920);
    const occ_e6 = isTrackOccupied(23500, 29000, 8815, 8920);
    const occ_e4 = isTrackOccupied(18000, 23500, 8815, 8920);
    const occ_e2_app = isTrackOccupied(14100, 18000, 8815, 8920);
    const occ_dep_w8 = isTrackOccupied(6000, 9650, 8815, 8920);
    const occ_w6 = isTrackOccupied(3000, 6000, 8815, 8920);
    const occ_w4 = isTrackOccupied(500, 3000, 8815, 8920);
    const occ_w2_app = isTrackOccupied(-1200, 500, 8815, 8920);
    const occ_beyond_w2 = isTrackOccupied(-5000, -1200, 8815, 8920);

    // Level Crossings
    const levelCrossings = getLevelCrossings(world);
    const occupiedCrossingIds = new Set<string>();
    for (const cross of levelCrossings) {
      if (isCrossingApproachOccupied(cross, world)) {
        occupiedCrossingIds.add(cross.id);
        if (cross.signalNorthId) occupiedCrossingIds.add(cross.signalNorthId);
        if (cross.signalSouthId) occupiedCrossingIds.add(cross.signalSouthId);
      }
    }

    let crossingObstacle = false;
    for (const cross of levelCrossings) {
      const minTY = Math.min(...cross.tracksY) - 30;
      const maxTY = Math.max(...cross.tracksY) + 30;
      for (const v of vehicles) {
        if (v.x >= cross.minX && v.x <= cross.maxX && v.y >= minTY && v.y <= maxTY) {
          crossingObstacle = true;
          break;
        }
      }
      if (crossingObstacle) break;
    }

    // --- B. AUTO-BLOCK CASCADE (АВТОБЛОКИРОВКА НА ПЕРЕГОНАХ) ---

    // 1. EAST OPEN LINE - TRACK I (Eastbound +X)
    const sE1 = sigMap.get('sig_block_e_1');
    setDesired(sE1, occ_beyond_e1 ? 'red' : 'green');

    const sE3 = sigMap.get('sig_block_e_3');
    if (sE3) {
      if (occ_e1_app) setDesired(sE3, 'red');
      else setDesired(sE3, sE1?.currentAspect === 'red' ? 'yellow' : 'green');
    }

    const sE5 = sigMap.get('sig_block_e_5');
    if (sE5) {
      if (occ_e3) setDesired(sE5, 'red');
      else setDesired(sE5, sE3?.currentAspect === 'red' ? 'yellow' : 'green');
    }

    const sE7 = sigMap.get('sig_block_e_7');
    if (sE7) {
      if (occ_e5) setDesired(sE7, 'red');
      else setDesired(sE7, sE5?.currentAspect === 'red' ? 'yellow' : 'green');
    }

    const sE9 = sigMap.get('sig_block_e_9');
    if (sE9) {
      if (occ_e7) setDesired(sE9, 'red');
      else setDesired(sE9, sE7?.currentAspect === 'red' ? 'yellow' : 'green');
    }

    const sE11 = sigMap.get('sig_block_e_11');
    if (sE11) {
      if (occ_e9) setDesired(sE11, 'red');
      else setDesired(sE11, sE9?.currentAspect === 'red' ? 'yellow' : 'green');
    }

    const sE13 = sigMap.get('sig_block_e_13');
    if (sE13) {
      if (occ_e11) setDesired(sE13, 'red');
      else setDesired(sE13, sE11?.currentAspect === 'red' ? 'yellow' : 'green');
    }

    // 2. STATION STEPNAYA - EASTBOUND EXIT SIGNALS (Н1, Н2, Н3, Н4)
    // Normal state: RED (Закрыто). Opens ONLY when route is set and train is ready to depart.

    // Exit N3 (Track 3 / Platform 1 to East)
    const sExitN3 = sigMap.get('sig_exit_N3');
    if (sExitN3) {
      // Find train actually standing on or departing from Track 3 platform/throat
      let trainOnTrack3 = consists.find(c => {
        const hc = cars.find(car => car.id === c.headCarId);
        return hc && Math.abs(hc.y - 8600) < 55 && hc.x >= 9650 && hc.x <= 13500;
      });

      // OR pre-clear for approaching non-stop train targeting Track 3
      if (!trainOnTrack3) {
        trainOnTrack3 = consists.find(c => {
          if (c.direction !== 1) return false;
          const hc = cars.find(car => car.id === c.headCarId);
          if (!hc || hc.x < 5000 || hc.x >= 9650) return false;
          const targetIsTrack3 = c.routeType === 'mainline_east' ||
            (c.schedule?.routeSteps?.some((step, idx) => idx >= (c.currentStepIndex || 0) && step.targetY === 8600));
          if (!targetIsTrack3) return false;
          const stopsAtStation = c.schedule?.routeSteps?.some(step => step.type === 'station_stop');
          return !stopsAtStation;
        });
      }

      const stopsAtStationN3 = trainOnTrack3 && (trainOnTrack3.routeType === 'mainline_east' ||
        trainOnTrack3.schedule?.routeSteps?.some(step => step.type === 'station_stop'));
      const isReadyToDepartN3 = trainOnTrack3 && (stopsAtStationN3 ? trainOnTrack3.stationDwellTimer === -1 : trainOnTrack3.stationDwellTimer <= 0);

      if (isReadyToDepartN3 && !occ_east_throat && !occ_dep_e13) {
        setDesired(sExitN3, sE13?.currentAspect === 'red' ? 'two_yellows' : 'two_yellows_one_flashing');
      } else {
        setDesired(sExitN3, 'red');
      }
    }

    // Exit N1 (Mainline I to East)
    const sExitN1 = sigMap.get('sig_exit_N1');
    if (sExitN1) {
      // Find train actually standing on or departing from Mainline I platform/throat
      let trainOnMainI = consists.find(c => {
        const hc = cars.find(car => car.id === c.headCarId);
        return hc && Math.abs(hc.y - 8740) < 40 && hc.x >= 9650 && hc.x <= 13500;
      });

      // OR pre-clear for approaching non-stop train targeting Mainline I
      if (!trainOnMainI) {
        trainOnMainI = consists.find(c => {
          if (c.direction !== 1) return false;
          const hc = cars.find(car => car.id === c.headCarId);
          if (!hc || hc.x < 5000 || hc.x >= 9650) return false;
          const targetIsTrack3Or4 = c.schedule?.routeSteps?.some((step, idx) => idx >= (c.currentStepIndex || 0) && (step.targetY === 8600 || step.targetY === 9020));
          if (targetIsTrack3Or4) return false;
          const stopsAtStation = c.schedule?.routeSteps?.some(step => step.type === 'station_stop');
          return !stopsAtStation;
        });
      }

      const stopsAtStationN1 = trainOnMainI && (trainOnMainI.routeType === 'mainline_east' ||
        trainOnMainI.schedule?.routeSteps?.some(step => step.type === 'station_stop'));
      const isReadyToPassN1 = trainOnMainI && (stopsAtStationN1 ? trainOnMainI.stationDwellTimer === -1 : trainOnMainI.stationDwellTimer <= 0);

      if (isReadyToPassN1 && !occ_east_throat && !occ_dep_e13) {
        setDesired(sExitN1, sE13?.currentAspect === 'red' ? 'yellow' : 'green');
      } else {
        setDesired(sExitN1, 'red');
      }
    }

    // Exit N2 (Mainline II Eastbound - Normal CLOSED)
    const sExitN2 = sigMap.get('sig_exit_N2');
    if (sExitN2) setDesired(sExitN2, 'red');

    // Exit N4 (Track 4 to East)
    const sExitN4 = sigMap.get('sig_exit_N4');
    if (sExitN4) {
      // Find train actually standing on or departing from Track 4 platform/throat
      let trainOnTrack4 = consists.find(c => {
        const hc = cars.find(car => car.id === c.headCarId);
        return hc && Math.abs(hc.y - 9020) < 55 && hc.x >= 9650 && hc.x <= 13500;
      });

      // OR pre-clear for approaching non-stop train targeting Track 4
      if (!trainOnTrack4) {
        trainOnTrack4 = consists.find(c => {
          if (c.direction !== 1) return false;
          const hc = cars.find(car => car.id === c.headCarId);
          if (!hc || hc.x < 5000 || hc.x >= 9650) return false;
          const targetIsTrack4 = c.schedule?.routeSteps?.some((step, idx) => idx >= (c.currentStepIndex || 0) && step.targetY === 9020);
          if (!targetIsTrack4) return false;
          const stopsAtStation = c.schedule?.routeSteps?.some(step => step.type === 'station_stop');
          return !stopsAtStation;
        });
      }

      const stopsAtStationN4 = trainOnTrack4 && (trainOnTrack4.routeType === 'mainline_east' ||
        trainOnTrack4.schedule?.routeSteps?.some(step => step.type === 'station_stop'));
      const isReadyToDepartN4 = trainOnTrack4 && (stopsAtStationN4 ? trainOnTrack4.stationDwellTimer === -1 : trainOnTrack4.stationDwellTimer <= 0);

      if (isReadyToDepartN4 && !occ_east_throat && !occ_dep_e13) {
        setDesired(sExitN4, sE13?.currentAspect === 'red' ? 'two_yellows' : 'two_yellows_one_flashing');
      } else {
        setDesired(sExitN4, 'red');
      }
    }

    // 3. WEST APPROACH - TRACK I (Eastbound: w7 -> w5 -> w3 -> w1 -> Entry Н)
    const sEntryN = sigMap.get('sig_entry_N');
    if (sEntryN) {
      const trainApproachingN = consists.find(c => {
        if (c.direction !== 1) return false;
        const hc = cars.find(car => car.id === c.headCarId);
        return hc && hc.x >= 5000 && hc.x <= 8400;
      });

      if (trainApproachingN) {
        // Eastbound train on West approach
        const targetIsTrack3 = (trainApproachingN.routeType as string) === 'siding_track3' ||
          Boolean(trainApproachingN.schedule?.routeSteps?.some((step, idx) => idx >= (trainApproachingN.currentStepIndex || 0) && step.targetY === 8600));

        if (targetIsTrack3) {
          // Reception to Track 3 (side platform track via turnout Switch #1)
          if (occ_west_throat || occ_track3) {
            setDesired(sEntryN, 'red');
          } else {
            // According to ISI:
            // - If exit signal N3 is closed (RED): Entrance signal shows Two Yellows (-ж-ж-)
            // - If exit signal N3 is open: Entrance signal shows Two Yellows, top flashing (-жм-ж-)
            const sExitN3 = sigMap.get('sig_exit_N3');
            const isExitOpen = sExitN3 && sExitN3.currentAspect !== 'red';
            setDesired(sEntryN, isExitOpen ? 'two_yellows_one_flashing' : 'two_yellows');
          }
        } else {
          // Reception straight along Mainline I
          if (occ_west_throat || occ_station_I_track) {
            setDesired(sEntryN, 'red');
          } else {
            setDesired(sEntryN, sExitN1?.currentAspect === 'red' ? 'yellow' : 'green');
          }
        }
      } else {
        // No train on approach -> Entry N remains RED
        setDesired(sEntryN, 'red');
      }
    }

    // Approach Signal w1 (Предвходной светофор 1)
    const sW1 = sigMap.get('sig_block_w_1');
    if (sW1) {
      if (occ_w1_app) {
        setDesired(sW1, 'red');
      } else if (sEntryN?.currentAspect === 'two_yellows' || sEntryN?.currentAspect === 'two_yellows_one_flashing') {
        // According to ISI: Approach signal to 2 yellows MUST be Yellow Flashing (Жм)
        setDesired(sW1, 'yellow_flashing');
      } else if (sEntryN?.currentAspect === 'red') {
        setDesired(sW1, 'yellow');
      } else {
        setDesired(sW1, 'green');
      }
    }

    const sW3 = sigMap.get('sig_block_w_3');
    if (sW3) {
      if (occ_w3) setDesired(sW3, 'red');
      else setDesired(sW3, sW1?.currentAspect === 'red' ? 'yellow' : 'green');
    }

    const sW5 = sigMap.get('sig_block_w_5');
    if (sW5) {
      if (occ_w5) setDesired(sW5, 'red');
      else setDesired(sW5, sW3?.currentAspect === 'red' ? 'yellow' : 'green');
    }

    const sW7 = sigMap.get('sig_block_w_7');
    if (sW7) {
      if (occ_w7) setDesired(sW7, 'red');
      else setDesired(sW7, sW5?.currentAspect === 'red' ? 'yellow' : 'green');
    }

    // 4. WEST OPEN LINE - TRACK II (Westbound -X)
    const sW2 = sigMap.get('sig_block_w_2');
    if (sW2) setDesired(sW2, occ_beyond_w2 ? 'red' : 'green');

    const sW4 = sigMap.get('sig_block_w_4');
    if (sW4) {
      if (occ_w2_app) setDesired(sW4, 'red');
      else setDesired(sW4, sW2?.currentAspect === 'red' ? 'yellow' : 'green');
    }

    const sW6 = sigMap.get('sig_block_w_6');
    if (sW6) {
      if (occ_w4) setDesired(sW6, 'red');
      else setDesired(sW6, sW4?.currentAspect === 'red' ? 'yellow' : 'green');
    }

    const sW8 = sigMap.get('sig_block_w_8');
    if (sW8) {
      if (occ_w6) setDesired(sW8, 'red');
      else setDesired(sW8, sW6?.currentAspect === 'red' ? 'yellow' : 'green');
    }

    // STATION STEPNAYA - WESTBOUND EXIT SIGNALS (Ч1, Ч2, Ч3, Ч4)
    // Normal state: RED (Закрыто)

    // Exit Ch2 (Mainline II Westbound Exit)
    const sExitCh2 = sigMap.get('sig_exit_Ch2');
    if (sExitCh2) {
      // Find train actually standing on Mainline II platform track
      let trainOnMainII = consists.find(c => {
        const hc = cars.find(car => car.id === c.headCarId);
        return hc && Math.abs(hc.y - 8880) < 40 && hc.x >= 9650 && hc.x <= 12850;
      });

      // OR pre-clear for approaching non-stop train targeting Mainline II from East
      if (!trainOnMainII) {
        trainOnMainII = consists.find(c => {
          if (c.direction !== -1) return false;
          const hc = cars.find(car => car.id === c.headCarId);
          if (!hc || hc.x < 12850 || hc.x > 18500) return false;
          const targetIsTrack3Or4 = c.schedule?.routeSteps?.some((step, idx) => idx >= (c.currentStepIndex || 0) && (step.targetY === 8600 || step.targetY === 9020));
          if (targetIsTrack3Or4) return false;
          const stopsAtStation = c.schedule?.routeSteps?.some(step => step.type === 'station_stop');
          return !stopsAtStation;
        });
      }

      const stopsAtStationCh2 = trainOnMainII && (trainOnMainII.routeType === 'mainline_west' ||
        trainOnMainII.schedule?.routeSteps?.some(step => step.type === 'station_stop'));
      const isReadyToPassCh2 = trainOnMainII && (stopsAtStationCh2 ? trainOnMainII.stationDwellTimer === -1 : trainOnMainII.stationDwellTimer <= 0);

      if (isReadyToPassCh2 && !occ_west_throat && !occ_dep_w8) {
        setDesired(sExitCh2, sW8?.currentAspect === 'red' ? 'yellow' : 'green');
      } else {
        setDesired(sExitCh2, 'red');
      }
    }

    // Exit Ch3 (Track 3 Westbound Exit)
    const sExitCh3 = sigMap.get('sig_exit_Ch3');
    if (sExitCh3) {
      // Find train actually standing on Track 3 platform track
      let trainOnTrack3W = consists.find(c => {
        if (c.direction !== -1) return false;
        const hc = cars.find(car => car.id === c.headCarId);
        return hc && Math.abs(hc.y - 8600) < 40 && hc.x >= 9650 && hc.x <= 12850;
      });

      // OR pre-clear for approaching non-stop train targeting Track 3 from East
      if (!trainOnTrack3W) {
        trainOnTrack3W = consists.find(c => {
          if (c.direction !== -1) return false;
          const hc = cars.find(car => car.id === c.headCarId);
          if (!hc || hc.x < 12850 || hc.x > 18500) return false;
          const targetIsTrack3 = c.routeType === 'mainline_west' ||
            (c.schedule?.routeSteps?.some((step, idx) => idx >= (c.currentStepIndex || 0) && step.targetY === 8600));
          if (!targetIsTrack3) return false;
          const stopsAtStation = c.schedule?.routeSteps?.some(step => step.type === 'station_stop');
          return !stopsAtStation;
        });
      }

      const stopsAtStationCh3 = trainOnTrack3W && (trainOnTrack3W.routeType === 'mainline_west' ||
        trainOnTrack3W.schedule?.routeSteps?.some(step => step.type === 'station_stop'));
      const isReadyToDepartCh3 = trainOnTrack3W && (stopsAtStationCh3 ? trainOnTrack3W.stationDwellTimer === -1 : trainOnTrack3W.stationDwellTimer <= 0);

      if (isReadyToDepartCh3 && !occ_west_throat && !occ_dep_w8) {
        setDesired(sExitCh3, sW8?.currentAspect === 'red' ? 'two_yellows' : 'two_yellows_one_flashing');
      } else {
        setDesired(sExitCh3, 'red');
      }
    }

    // Exit Ch4 (Track 4 Westbound Exit)
    const sExitCh4 = sigMap.get('sig_exit_Ch4');
    if (sExitCh4) {
      // Find train actually standing on Track 4 platform track
      let trainOnTrack4W = consists.find(c => {
        if (c.direction !== -1) return false;
        const hc = cars.find(car => car.id === c.headCarId);
        return hc && Math.abs(hc.y - 9020) < 40 && hc.x >= 9650 && hc.x <= 12850;
      });

      // OR pre-clear for approaching non-stop train targeting Track 4 from East
      if (!trainOnTrack4W) {
        trainOnTrack4W = consists.find(c => {
          if (c.direction !== -1) return false;
          const hc = cars.find(car => car.id === c.headCarId);
          if (!hc || hc.x < 12850 || hc.x > 18500) return false;
          const targetIsTrack4 = c.schedule?.routeSteps?.some((step, idx) => idx >= (c.currentStepIndex || 0) && step.targetY === 9020);
          if (!targetIsTrack4) return false;
          const stopsAtStation = c.schedule?.routeSteps?.some(step => step.type === 'station_stop');
          return !stopsAtStation;
        });
      }

      const stopsAtStationCh4 = trainOnTrack4W && (trainOnTrack4W.routeType === 'mainline_west' ||
        trainOnTrack4W.schedule?.routeSteps?.some(step => step.type === 'station_stop'));
      const isReadyToDepartCh4 = trainOnTrack4W && (stopsAtStationCh4 ? trainOnTrack4W.stationDwellTimer === -1 : trainOnTrack4W.stationDwellTimer <= 0);

      if (isReadyToDepartCh4 && !occ_west_throat && !occ_dep_w8) {
        setDesired(sExitCh4, sW8?.currentAspect === 'red' ? 'two_yellows' : 'two_yellows_one_flashing');
      } else {
        setDesired(sExitCh4, 'red');
      }
    }

    // Exit Ch1 (Mainline I Westbound - Normal CLOSED)
    const sExitCh1 = sigMap.get('sig_exit_Ch1');
    if (sExitCh1) setDesired(sExitCh1, 'red');

    // 5. EAST APPROACH - TRACK II (Westbound: e14 -> e12 -> e10 -> e8 -> e6 -> e4 -> e2 -> Entry Ч)
    const sEntryCh = sigMap.get('sig_entry_Ch');
    if (sEntryCh) {
      const trainApproachingCh = consists.find(c => {
        if (c.direction !== -1) return false;
        const hc = cars.find(car => car.id === c.headCarId);
        return hc && hc.x >= 14100 && hc.x <= 18500;
      });

      if (trainApproachingCh) {
        const targetIsTrack4 = (trainApproachingCh.routeType as string) === 'siding_track4' ||
          Boolean(trainApproachingCh.schedule?.routeSteps?.some((step, idx) => idx >= (trainApproachingCh.currentStepIndex || 0) && step.targetY === 9020));

        if (targetIsTrack4) {
          if (occ_east_throat || occ_track4) {
            setDesired(sEntryCh, 'red');
          } else {
            setDesired(sEntryCh, sExitCh4?.currentAspect === 'red' ? 'two_yellows' : 'two_yellows_one_flashing');
          }
        } else {
          if (occ_east_throat || occ_station_II_track) {
            setDesired(sEntryCh, 'red');
          } else {
            setDesired(sEntryCh, sExitCh2?.currentAspect === 'red' ? 'yellow' : 'green');
          }
        }
      } else {
        // No train on approach -> Entry Ч remains RED
        setDesired(sEntryCh, 'red');
      }
    }

    // Approach Signal e2 (Предвходной светофор 2)
    const sE2 = sigMap.get('sig_block_e_2');
    if (sE2) {
      if (occ_e2_app) {
        setDesired(sE2, 'red');
      } else if (sEntryCh?.currentAspect === 'two_yellows' || sEntryCh?.currentAspect === 'two_yellows_one_flashing') {
        setDesired(sE2, 'yellow_flashing'); // Yellow Flashing (Жм)
      } else if (sEntryCh?.currentAspect === 'red') {
        setDesired(sE2, 'yellow');
      } else {
        setDesired(sE2, 'green');
      }
    }

    const sE4 = sigMap.get('sig_block_e_4');
    if (sE4) {
      if (occ_e4) setDesired(sE4, 'red');
      else setDesired(sE4, sE2?.currentAspect === 'red' ? 'yellow' : 'green');
    }

    const sE6 = sigMap.get('sig_block_e_6');
    if (sE6) {
      if (occ_e6) setDesired(sE6, 'red');
      else setDesired(sE6, sE4?.currentAspect === 'red' ? 'yellow' : 'green');
    }

    const sE8 = sigMap.get('sig_block_e_8');
    if (sE8) {
      if (occ_e8) setDesired(sE8, 'red');
      else setDesired(sE8, sE6?.currentAspect === 'red' ? 'yellow' : 'green');
    }

    const sE10 = sigMap.get('sig_block_e_10');
    if (sE10) {
      if (occ_e10) setDesired(sE10, 'red');
      else setDesired(sE10, sE8?.currentAspect === 'red' ? 'yellow' : 'green');
    }

    const sE12 = sigMap.get('sig_block_e_12');
    if (sE12) {
      if (occ_e12) setDesired(sE12, 'red');
      else setDesired(sE12, sE10?.currentAspect === 'red' ? 'yellow' : 'green');
    }

    const sE14 = sigMap.get('sig_block_e_14');
    if (sE14) {
      if (occ_e14) setDesired(sE14, 'red');
      else setDesired(sE14, sE12?.currentAspect === 'red' ? 'yellow' : 'green');
    }

    // 6. SHUNTING SIGNALS (М1..М16), OBSTACLE & CROSSING SIGNALS
    for (const sig of signals) {
      switch (sig.id) {
        case 'sig_entry_ND':
        case 'sig_entry_ChD':
          setDesired(sig, 'red');
          break;

        case 'sig_shunt_M1':
        case 'sig_shunt_M2':
        case 'sig_shunt_M3':
        case 'sig_shunt_M4':
        case 'sig_shunt_M5':
        case 'sig_shunt_M6':
        case 'sig_shunt_M7':
        case 'sig_shunt_M8':
        case 'sig_shunt_M9':
        case 'sig_shunt_M10':
        case 'sig_shunt_M11':
        case 'sig_shunt_M12':
        case 'sig_shunt_M14':
        case 'sig_shunt_M16':
        case 'sig_shunt_M18': {
          // Normal state for shunting signals is strictly BLUE (Синий огонь - маневры запрещены).
          // Opens to LUNAR WHITE (Лунно-белый огонь) ONLY when a shunting locomotive / consist
          // is actually on the approach section on that exact track.
          const isTrainApproaching = cars.some(car => {
            // Strict track Y tolerance (< 35px) so mainline or adjacent track trains don't falsely open shunting signals
            if (Math.abs(car.y - sig.y) > 35) return false;

            const isShuntingLoco = car.type.includes('chme3') || car.type.includes('shunter') ||
              consists.some(c => c.carIds.includes(car.id) && (c.routeType === 'shunting' || Boolean(c.schedule?.id.includes('shunter'))));
            if (!isShuntingLoco) return false;

            const halfL = car.length / 2;
            const facesWest = (Math.abs(sig.angle - Math.PI) < 0.2);

            if (facesWest) {
              // Signal faces West (-X), regulates Eastbound (+X) movements approaching from the West
              const frontNoseX = car.x + halfL;
              const distToSig = sig.x - frontNoseX;
              return distToSig >= -50 && distToSig <= 350;
            } else {
              // Signal faces East (+X), regulates Westbound (-X) movements approaching from the East
              const frontNoseX = car.x - halfL;
              const distToSig = frontNoseX - sig.x;
              return distToSig >= -50 && distToSig <= 350;
            }
          });

          setDesired(sig, isTrainApproaching ? 'lunar_white' : 'blue');
          break;
        }

        case 'sig_cross_north':
        case 'sig_cross_south':
        case 'sig_cross_canyon_w_n':
        case 'sig_cross_canyon_w_s':
        case 'sig_cross_quarry_n':
        case 'sig_cross_quarry_s':
        case 'sig_cross_canyon_e_n':
        case 'sig_cross_canyon_e_s':
        case 'sig_cross_dunes_n':
        case 'sig_cross_dunes_s':
        case 'sig_cross_border_n':
        case 'sig_cross_border_s': {
          const isCrossActive = occupiedCrossingIds.has(sig.id) ||
            (sig.id.includes('canyon_w') && occupiedCrossingIds.has('crossing_canyon_west')) ||
            (sig.id.includes('canyon_e') && occupiedCrossingIds.has('crossing_canyon_east')) ||
            (sig.id.includes('quarry') && occupiedCrossingIds.has('crossing_quarry')) ||
            (sig.id.includes('dunes') && occupiedCrossingIds.has('crossing_dunes')) ||
            (sig.id.includes('border') && occupiedCrossingIds.has('crossing_border')) ||
            ((sig.id === 'sig_cross_north' || sig.id === 'sig_cross_south') && occupiedCrossingIds.has('crossing_station_42')) ||
            levelCrossings.some(c => (c.signalNorthId === sig.id || c.signalSouthId === sig.id || Math.hypot(c.centerX - sig.x, c.centerY - sig.y) < 250) && occupiedCrossingIds.has(c.id));
          setDesired(sig, isCrossActive ? 'red_alternating_flashing' : 'lunar_white_flashing');
          break;
        }

        case 'sig_obst_Z1':
        case 'sig_obst_Z2':
        case 'sig_obst_Z3':
        case 'sig_obst_Z4':
          setDesired(sig, crossingObstacle ? 'red' : 'dark');
          break;
      }
    }

    // 7. Physical Electro-Mechanical Relays and Tungsten Filament Simulation
    this.updateSignalPhysics(world, dt);
  }

  /**
   * Complete physical electro-mechanical relay and tungsten filament simulation
   * Implements:
   * - Track relay de-energization and numeric code cycle decoding (ЧКДАБ: 1.1 - 1.4s)
   * - Total inter-aspect circuit blackout (темновой промежуток при размыкании реле: 0.35 - 0.45s)
   * - Fire relay cold-filament continuity check (огневое реле КО/ЖО/ЗО: 0.25 - 0.30s)
   * - Non-linear tungsten filament heating (~0.28s) and thermal afterglow cooling (~0.38s)
   * - Realistic relay armature clicks in relay cabinets when player is nearby
   */
  private static updateSignalPhysics(world: GameWorld, dt: number): void {
    const signals = world.railwaySignals || [];
    const player = world.player;
    const time = this.globalTime;

    for (const sig of signals) {
      if (!sig.filaments || sig.filaments.length !== sig.lenses.length) {
        const activeIdxs = this.getActiveIndicesForAspect(sig, sig.currentAspect);
        sig.filaments = sig.lenses.map((_, idx) => {
          const isInitiallyLit = activeIdxs.includes(idx) && sig.currentAspect !== 'dark';
          return {
            temp: isInitiallyLit ? 1.0 : 0.0,
            brightness: isInitiallyLit ? 1.0 : 0.0,
            voltage: isInitiallyLit ? 1.0 : 0.0,
            coldTestPulse: 0
          };
        });
        sig.relayPhase = 'steady';
        sig.relayTimer = 0;
        sig.targetAspect = sig.currentAspect;
        sig.pendingAspect = sig.currentAspect;
      }

      if (!sig.relayPhase) sig.relayPhase = 'steady';
      if (sig.relayTimer === undefined) sig.relayTimer = 0;
      if (!sig.targetAspect) sig.targetAspect = sig.currentAspect;

      let clickVol = 0;
      if (player) {
        const dist = Math.hypot(sig.x - player.x, sig.y - player.y);
        if (dist < 150) {
          clickVol = Math.max(0, 1 - dist / 150) * 0.4;
        }
      }

      const desired = sig.targetAspect;

      // Relay State Machine
      switch (sig.relayPhase) {
        case 'steady': {
          if (desired !== sig.currentAspect) {
            sig.pendingAspect = desired;
            if (sig.type === 'shunting') {
              // Instant relay flip for shunting signals
              sig.relayPhase = 'blackout';
              sig.relayTimer = 0.08;
              sig.currentAspect = desired;
              if (clickVol > 0.01) sound.playRailwayRelayClick(clickVol);
            } else if (desired === 'red' || desired === 'blue' || desired === 'dark') {
              sig.relayPhase = 'blackout';
              sig.relayTimer = 0.35; // 350ms dark gap while contacts break
              sig.currentAspect = 'red'; // Instant safety stop for train AI
              if (clickVol > 0.01) sound.playRailwayRelayClick(clickVol);
            } else {
              sig.relayPhase = 'code_decoding';
              sig.relayTimer = 0.40; // 400ms automatic block code pulse decoding
              if (clickVol > 0.01) sound.playRailwayRelayClick(clickVol);
            }
          }
          break;
        }

        case 'code_decoding': {
          sig.relayTimer -= dt;
          if (desired === 'red' || desired === 'blue' || desired === 'dark') {
            sig.pendingAspect = desired;
            sig.relayPhase = 'blackout';
            sig.relayTimer = 0.35;
            sig.currentAspect = 'red';
            if (clickVol > 0.01) sound.playRailwayRelayClick(clickVol);
            break;
          }
          sig.pendingAspect = desired;
          if (sig.relayTimer <= 0) {
            sig.relayPhase = 'blackout';
            sig.relayTimer = 0.35; // 350ms inter-aspect blackout gap
            if (clickVol > 0.01) sound.playRailwayRelayClick(clickVol);
          }
          break;
        }

        case 'blackout': {
          sig.relayTimer -= dt;
          if (sig.relayTimer <= 0) {
            if (sig.pendingAspect === 'dark') {
              sig.relayPhase = 'steady';
              sig.currentAspect = 'dark';
            } else {
              sig.relayPhase = 'lamp_check';
              sig.relayTimer = 0.30; // 300ms cold filament pre-heating check
              sig.currentAspect = sig.pendingAspect || 'red';
              if (clickVol > 0.01) sound.playRailwayRelayClick(clickVol * 0.75);
            }
          }
          break;
        }

        case 'lamp_check': {
          sig.relayTimer -= dt;
          if (sig.relayTimer <= 0) {
            sig.relayPhase = 'steady';
            sig.currentAspect = sig.pendingAspect || 'red';
            if (clickVol > 0.01) sound.playRailwayRelayClick(clickVol);
          }
          break;
        }
      }

      // 3. Thermal and Optical Simulation for Each Tungsten Filament
      const activeIdxs = this.getActiveIndicesForAspect(sig, sig.relayPhase === 'lamp_check' ? (sig.pendingAspect || sig.currentAspect) : sig.currentAspect);

      for (let idx = 0; idx < sig.lenses.length; idx++) {
        const filament = sig.filaments[idx];
        let targetVoltage = 0.0;
        let coldPulse = 0.0;

        if (sig.relayPhase === 'blackout' || sig.relayPhase === 'code_decoding') {
          targetVoltage = 0.0;
        } else if (sig.relayPhase === 'lamp_check') {
          if (activeIdxs.includes(idx)) {
            targetVoltage = 0.35; // Pre-heating test voltage for cold tungsten filament
            coldPulse = 0.55; // Initial warm ember glow
          } else {
            targetVoltage = 0.0;
          }
        } else {
          targetVoltage = this.getAspectLensVoltage(sig, sig.currentAspect, idx, time);
        }

        filament.voltage = targetVoltage;
        filament.coldTestPulse = coldPulse;

        // Tungsten filament heating & cooling thermodynamics
        if (filament.voltage > filament.temp) {
          const heatRate = 1.0 / 0.20;
          filament.temp += (filament.voltage - filament.temp) * Math.min(1.0, dt * heatRate);
        } else {
          const coolRate = 1.0 / 0.35; // Smooth thermal cooldown over ~350ms
          filament.temp -= (filament.temp - filament.voltage) * Math.min(1.0, dt * coolRate);
        }
        filament.temp = Math.max(0.0, Math.min(1.0, filament.temp));

        if (filament.temp < 0.15) {
          filament.brightness = 0.0;
        } else {
          filament.brightness = Math.pow((filament.temp - 0.15) / 0.85, 2.0);
        }
      }

      // Automatic Level Crossing Barrier Gates Smooth Physics
      if (sig.type === 'crossing') {
        const isClosed = sig.currentAspect === 'red_alternating_flashing' || sig.currentAspect === 'red';
        const targetProg = isClosed ? 1.0 : 0.0;
        if (sig.barrierProgress === undefined) {
          sig.barrierProgress = isClosed ? 1.0 : 0.0;
        }
        if (sig.barrierProgress !== targetProg) {
          const moveSpeed = dt / 3.5; // Lower / raise over 3.5s
          if (targetProg > sig.barrierProgress) {
            sig.barrierProgress = Math.min(1.0, sig.barrierProgress + moveSpeed);
          } else {
            sig.barrierProgress = Math.max(0.0, sig.barrierProgress - moveSpeed);
          }
        }
      }
    }

    // Periodic Acoustic Crossing Alarm Chime
    if (player && (time - this.lastChimeTime > 0.72)) {
      let nearestDist = Infinity;
      for (const sig of signals) {
        if (sig.type === 'crossing' && (sig.currentAspect === 'red_alternating_flashing' || sig.currentAspect === 'red')) {
          const d = Math.hypot(sig.x - player.x, sig.y - player.y);
          if (d < nearestDist) nearestDist = d;
        }
      }
      if (nearestDist < 700) {
        const chimeVol = Math.max(0.02, (1 - nearestDist / 700) * 0.35);
        sound.playLevelCrossingChime(chimeVol);
        this.lastChimeTime = time;
      }
    }
  }

  /**
   * Helper to retrieve lens indices matching an aspect
   */
  public static getActiveIndicesForAspect(signal: RailwaySignal, aspect: RailwaySignalAspect): number[] {
    const lenses = signal.lenses;
    if (aspect === 'dark') return [];

    if (signal.type === 'crossing') {
      if (aspect === 'red_alternating_flashing' || aspect === 'red') {
        return [0, 1]; // Only the two red lenses (indices 0 and 1)
      }
      if (aspect === 'lunar_white_flashing' || aspect === 'lunar_white') {
        const whiteIdx = lenses.indexOf('white');
        return whiteIdx !== -1 ? [whiteIdx] : [2]; // Only lunar white lens (index 2)
      }
      return [];
    }

    if (aspect === 'red_alternating_flashing') {
      const idx0 = lenses.indexOf('red');
      const idx1 = lenses.lastIndexOf('red');
      if (idx0 !== -1 && idx1 !== -1 && idx0 !== idx1) return [idx0, idx1];
      return lenses.length >= 2 ? [0, 1] : [0];
    }

    if (aspect === 'two_yellows' || aspect === 'two_yellows_one_flashing') {
      const firstY = lenses.indexOf('yellow');
      const secondY = lenses.lastIndexOf('yellow');
      if (firstY !== -1 && secondY !== -1 && firstY !== secondY) {
        return [firstY, secondY];
      }
      return firstY !== -1 ? [firstY] : [0];
    }

    let targetColor: RailwayLensColor = 'red';
    if (aspect === 'green') targetColor = 'green';
    else if (aspect === 'yellow' || aspect === 'yellow_flashing') targetColor = 'yellow';
    else if (aspect === 'blue') targetColor = 'blue';
    else if (aspect === 'lunar_white' || aspect === 'lunar_white_flashing') targetColor = 'white';
    else if (aspect === 'red') targetColor = 'red';

    const idx = lenses.indexOf(targetColor);
    return idx !== -1 ? [idx] : [0];
  }

  /**
   * Determines circuit voltage supplied to a specific lens
   */
  private static getAspectLensVoltage(
    signal: RailwaySignal,
    aspect: RailwaySignalAspect,
    lensIdx: number,
    time: number
  ): number {
    if (aspect === 'dark') return 0.0;

    // Strict crossing signal voltage control: Red and White can NEVER both have voltage
    if (signal.type === 'crossing') {
      if (aspect === 'red_alternating_flashing' || aspect === 'red') {
        if (lensIdx === 2 || signal.lenses[lensIdx] === 'white') return 0.0; // Lunar white is strictly 0V
        const cycle = (time * 1.5) % 1.0;
        if (lensIdx === 0) return cycle < 0.5 ? 1.0 : 0.0;
        if (lensIdx === 1) return cycle >= 0.5 ? 1.0 : 0.0;
        return 0.0;
      }
      if (aspect === 'lunar_white_flashing' || aspect === 'lunar_white') {
        if (lensIdx === 0 || lensIdx === 1 || signal.lenses[lensIdx] === 'red') return 0.0; // Both reds strictly 0V
        if (lensIdx === 2 || signal.lenses[lensIdx] === 'white') {
          const cycle = (time * 0.8) % 1.0;
          return cycle < 0.55 ? 1.0 : 0.0;
        }
        return 0.0;
      }
      return 0.0;
    }

    if (aspect === 'red_alternating_flashing') {
      const cycle = (time * 1.5) % 1.0;
      if (lensIdx === 0) return cycle < 0.5 ? 1.0 : 0.0;
      if (lensIdx === 1) return cycle >= 0.5 ? 1.0 : 0.0;
      return 0.0;
    }

    if (aspect === 'yellow_flashing') {
      if (signal.lenses[lensIdx] !== 'yellow') return 0.0;
      const cycle = (time * 1.35) % 1.0;
      return cycle < 0.55 ? 1.0 : 0.0;
    }

    if (aspect === 'lunar_white_flashing') {
      if (signal.lenses[lensIdx] !== 'white') return 0.0;
      const cycle = (time * 1.3) % 1.0;
      return cycle < 0.55 ? 1.0 : 0.0;
    }

    if (aspect === 'two_yellows_one_flashing') {
      const firstY = signal.lenses.indexOf('yellow');
      const secondY = signal.lenses.lastIndexOf('yellow');
      if (lensIdx === firstY) {
        const cycle = (time * 1.35) % 1.0;
        return cycle < 0.55 ? 1.0 : 0.0;
      }
      if (lensIdx === secondY) {
        return 1.0;
      }
      return 0.0;
    }

    const activeIndices = this.getActiveIndicesForAspect(signal, aspect);
    return activeIndices.includes(lensIdx) ? 1.0 : 0.0;
  }

  /**
   * Helper to retrieve signal by ID or prop location
   */
  public static getSignal(propId: string, customSigId?: string, propX?: number, propY?: number): RailwaySignal | undefined {
    if (customSigId && this.cachedSignals.has(customSigId)) {
      return this.cachedSignals.get(customSigId);
    }
    if (this.cachedSignals.has(propId)) {
      return this.cachedSignals.get(propId);
    }
    if (propX !== undefined && propY !== undefined) {
      for (const sig of this.cachedSignals.values()) {
        const dx = Math.abs(sig.x - propX);
        const dy = Math.abs(sig.y - propY);
        if (dx <= 45 && dy <= 30) return sig;
      }
    }
    return undefined;
  }

  /**
   * Render all visible railway signals
   */
  public static renderAllSignals(
    ctx: CanvasRenderingContext2D,
    world: GameWorld,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    nightAlpha: number,
    playerX?: number,
    playerY?: number
  ): void {
    this.ensureInitialized(world);
    const signals = world.railwaySignals || [];
    const props = world.props || [];
    const pad = 120;

    for (const sig of signals) {
      if (sig.x < minX - pad || sig.x > maxX + pad || sig.y < minY - pad || sig.y > maxY + pad) {
        continue;
      }
      // Check if associated prop in world.props is broken
      const matchedProp = props.find(p => p.id === sig.id || (p as any).railwaySignalId === sig.id || (Math.abs(p.x - sig.x) < 30 && Math.abs(p.y - sig.y) < 20));
      if (matchedProp && matchedProp.isBroken) {
        sig.currentAspect = 'dark';
        sig.targetAspect = 'dark';
        continue; // Skip rendering standing upright signal when prop is broken
      }

      this.renderSignal(ctx, sig, nightAlpha);
    }
  }

  public static renderSignals(
    ctx: CanvasRenderingContext2D,
    world: GameWorld,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    nightAlpha: number
  ): void {
    this.renderAllSignals(ctx, world, minX, minY, maxX, maxY, nightAlpha);
  }

  /**
   * Render a single railway signal
   */
  public static renderSignal(
    ctx: CanvasRenderingContext2D,
    signal: RailwaySignal,
    nightAlpha: number
  ): void {
    ctx.save();
    ctx.translate(signal.x, signal.y);
    ctx.rotate(signal.angle);
    this.renderSignalAtOrigin(ctx, signal, nightAlpha);
    ctx.restore();
  }

  /**
   * Render a signal when the canvas context is already positioned and rotated at the signal origin
   */
  public static renderSignalAtOrigin(
    ctx: CanvasRenderingContext2D,
    signal: RailwaySignal,
    nightAlpha: number
  ): void {
    const time = this.globalTime;

    if (signal.type === 'crossing') {
      this.renderLevelCrossingSignal(ctx, signal, time, nightAlpha);
    } else if (signal.mastType === 'dwarf') {
      this.renderDwarfSignal(ctx, signal, time, nightAlpha);
    } else if (signal.type === 'obstacle') {
      this.renderObstacleSignal(ctx, signal, time, nightAlpha);
    } else if (signal.type === 'repeater') {
      this.renderRepeaterSignal(ctx, signal, time, nightAlpha);
    } else {
      this.renderMastSignal(ctx, signal, time, nightAlpha);
    }
  }

  // =========================================================================
  // 1. STANDARD MAST SIGNAL (Входные, Выходные, Проходные)
  // =========================================================================
  private static renderMastSignal(
    ctx: CanvasRenderingContext2D,
    signal: RailwaySignal,
    time: number,
    nightAlpha: number
  ): void {
    const lensCount = signal.lenses.length;
    const lensSpacing = 5.2;
    const halfSpan = ((lensCount - 1) * lensSpacing) / 2;
    const shieldHeight = lensCount * lensSpacing + 10;
    const shieldDepth = 5.6;
    const shieldX = 2.4;

    // 1. Ambient Ground Shadow under signal installation
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
    ctx.beginPath();
    ctx.ellipse(-1, 3, 10.5, 7, 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. Concrete Foundation Base (Бетонный цоколь со скошенными фасками)
    ctx.save();
    ctx.fillStyle = '#475569';
    ctx.fillRect(-6, -6, 12, 12);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(-5, -5, 10, 10);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(-5, -5, 10, 10);

    // Inner beveled top
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(-3.5, -3.5, 7, 7);

    // 4 Heavy galvanized anchor bolts with washers
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(-3.2, -3.2, 0.85, 0, Math.PI * 2);
    ctx.arc(3.2, -3.2, 0.85, 0, Math.PI * 2);
    ctx.arc(-3.2, 3.2, 0.85, 0, Math.PI * 2);
    ctx.arc(3.2, 3.2, 0.85, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(-3.6, -3.6, 0.8, 0.8);
    ctx.fillRect(2.8, -3.6, 0.8, 0.8);
    ctx.fillRect(-3.6, 2.8, 0.8, 0.8);
    ctx.fillRect(2.8, 2.8, 0.8, 0.8);

    // 3. Trackside Transformer & Relay Junction Box (Путевой ящик ПЯ / ТЯ)
    ctx.fillStyle = '#111827';
    ctx.fillRect(-4.5, 4.5, 9, 6.5);
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 0.6;
    ctx.strokeRect(-4.5, 4.5, 9, 6.5);
    // Box cover bevel & brass padlock
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(-3.8, 5.2, 7.6, 5.1);
    ctx.fillStyle = '#eab308'; // High-voltage warning emblem
    ctx.beginPath();
    ctx.moveTo(0, 6.2);
    ctx.lineTo(1.4, 8.2);
    ctx.lineTo(-0.2, 8.2);
    ctx.lineTo(0.6, 9.6);
    ctx.lineTo(-1.2, 7.8);
    ctx.lineTo(0.2, 7.8);
    ctx.closePath();
    ctx.fill();

    // 4. Service Ladder & Safety Basket Cage (Лестница с дугами безопасности)
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 0.8;
    // Ladder vertical stringers
    ctx.beginPath();
    ctx.moveTo(-2.2, -halfSpan - 6); ctx.lineTo(-2.2, 4.5);
    ctx.moveTo(-4.2, -halfSpan - 6); ctx.lineTo(-4.2, 4.5);
    ctx.stroke();
    // Ladder rungs
    ctx.lineWidth = 0.6;
    for (let ry = -halfSpan - 4; ry < 4; ry += 2.8) {
      ctx.beginPath();
      ctx.moveTo(-4.2, ry); ctx.lineTo(-2.2, ry);
      ctx.stroke();
    }
    // Semicircular safety hoops (дуги ограждения)
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 0.7;
    for (let hy = -halfSpan - 2; hy < 2; hy += 4.5) {
      ctx.beginPath();
      ctx.arc(-3.2, hy, 2.4, Math.PI * 0.5, Math.PI * 1.5, false);
      ctx.stroke();
    }

    // 5. Inspection Platform with Safety Railings (Смотровая площадка за щитом)
    const platW = 7.5;
    const platH = shieldHeight + 4;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    ctx.fillRect(-platW + 1.2, -platH / 2, platW, platH);
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 0.7;
    ctx.strokeRect(-platW + 1.2, -platH / 2, platW, platH);
    // Anti-slip expanded metal grid texture
    ctx.fillStyle = '#1e293b';
    for (let py = -platH / 2 + 2; py < platH / 2 - 1; py += 3.2) {
      ctx.fillRect(-platW + 2.0, py, platW - 1.8, 0.8);
    }
    // Handrail perimeter
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 0.9;
    ctx.strokeRect(-platW + 0.5, -platH / 2 - 1, platW + 0.7, platH + 2);

    // 6. Mast Tube (Стальная трубчатая мачта)
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(0, 0, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 0.7;
    ctx.stroke();
    // Metallic specular line
    ctx.fillStyle = '#64748b';
    ctx.beginPath();
    ctx.arc(-0.6, -0.6, 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 7. Signal Head & Large Matte Black Background Shield (Большой черный фоновый щит)
    ctx.save();
    const bgShieldHalfW = shieldHeight / 2;

    // Shield back shadow on structure
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.beginPath();
    ctx.roundRect(shieldX - 0.5, -bgShieldHalfW - 1.5, shieldDepth + 1.0, shieldHeight + 3.0, 3.2);
    ctx.fill();

    // Massive Matte Black Background Shield (Глубокий матовый черный экран)
    ctx.fillStyle = '#0a0c10';
    ctx.beginPath();
    ctx.roundRect(shieldX, -bgShieldHalfW, shieldDepth, shieldHeight, 2.8);
    ctx.fill();

    // Shield outer structural steel trim / rim
    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = 0.9;
    ctx.stroke();

    // Mounting bolts on shield perimeter
    ctx.fillStyle = '#52525b';
    ctx.fillRect(shieldX + 0.4, -bgShieldHalfW + 1.2, 0.9, 0.9);
    ctx.fillRect(shieldX + shieldDepth - 1.3, -bgShieldHalfW + 1.2, 0.9, 0.9);
    ctx.fillRect(shieldX + 0.4, bgShieldHalfW - 2.1, 0.9, 0.9);
    ctx.fillRect(shieldX + shieldDepth - 1.3, bgShieldHalfW - 2.1, 0.9, 0.9);

    // Approach signal distinctive diagonal reflective zebra stripes (Предвходной светофор)
    if (signal.isApproachSignal) {
      // Top zebra border
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(shieldX, -bgShieldHalfW - 4.5, shieldDepth, 4.5);
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(shieldX, -bgShieldHalfW - 4.5);
      ctx.lineTo(shieldX + shieldDepth, -bgShieldHalfW - 2.2);
      ctx.lineTo(shieldX + shieldDepth, -bgShieldHalfW);
      ctx.lineTo(shieldX, -bgShieldHalfW - 2.3);
      ctx.closePath();
      ctx.fill();

      // Bottom zebra border
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(shieldX, bgShieldHalfW, shieldDepth, 4.5);
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(shieldX, bgShieldHalfW);
      ctx.lineTo(shieldX + shieldDepth, bgShieldHalfW + 2.3);
      ctx.lineTo(shieldX + shieldDepth, bgShieldHalfW + 4.5);
      ctx.lineTo(shieldX, bgShieldHalfW + 2.2);
      ctx.closePath();
      ctx.fill();
    }

    // 8. Individual Lens Units with Deep Visors / Hoods
    const activeLenses = this.getActiveLensesForAspect(signal, time);

    for (let i = 0; i < lensCount; i++) {
      const lensY = -halfSpan + i * lensSpacing;
      const color = signal.lenses[i];
      const filament = signal.filaments && signal.filaments[i];
      const isLitFallback = activeLenses.includes(i);
      this.renderLensUnit(ctx, shieldX + 2.4, lensY, color, filament, isLitFallback, nightAlpha, 1.8, 8.8);
    }

    // 9. Enameled Designation Nameplate with upright readability
    this.renderNameplate(ctx, signal, -1.5, -halfSpan - 9.5);
    ctx.restore();
  }

  // =========================================================================
  // 2. DWARF SHUNTING SIGNAL (Карликовый маневровый светофор)
  // =========================================================================
  private static renderDwarfSignal(
    ctx: CanvasRenderingContext2D,
    signal: RailwaySignal,
    time: number,
    nightAlpha: number
  ): void {
    ctx.save();
    // 1. Ground Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(-0.5, 2.5, 8.5, 6, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // 2. Reinforced Concrete Foundation Pad (Бетонная подушка с анкерами)
    ctx.fillStyle = '#475569';
    ctx.fillRect(-5, -5.5, 10, 11);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(-4.2, -4.7, 8.4, 9.4);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 0.6;
    ctx.strokeRect(-4.2, -4.7, 8.4, 9.4);

    // 4 Anchor bolts
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-3.6, -4.1, 1.1, 1.1);
    ctx.fillRect(2.5, -4.1, 1.1, 1.1);
    ctx.fillRect(-3.6, 3.0, 1.1, 1.1);
    ctx.fillRect(2.5, 3.0, 1.1, 1.1);

    // 3. Heavy Cast-Iron Dwarf Casing & Front Shield (Чугунный литой корпус с щитком)
    // Black cast iron main housing
    ctx.fillStyle = '#090c12';
    ctx.beginPath();
    ctx.roundRect(-3.2, -5.0, 6.4, 10.0, 1.8);
    ctx.fill();
    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Front protective black background plate
    ctx.fillStyle = '#05070a';
    ctx.beginPath();
    ctx.roundRect(1.2, -5.2, 2.6, 10.4, 1.2);
    ctx.fill();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    const activeLenses = this.getActiveLensesForAspect(signal, time);

    // Top Lens Unit (e.g. Lunar White or Green) with Long Sun Visor
    const topColor = signal.lenses[0] || 'white';
    const topFilament = signal.filaments && signal.filaments[0];
    const isTopLit = activeLenses.includes(0);
    this.renderLensUnit(ctx, 2.4, -2.6, topColor, topFilament, isTopLit, nightAlpha, 1.6, 7.5);

    // Bottom Lens Unit (e.g. Blue or Red) with Long Sun Visor
    const bottomColor = signal.lenses[1] || 'blue';
    const bottomFilament = signal.filaments && signal.filaments[1];
    const isBottomLit = activeLenses.includes(1);
    this.renderLensUnit(ctx, 2.4, 2.6, bottomColor, bottomFilament, isBottomLit, nightAlpha, 1.6, 7.5);

    // 4. Enameled designation plate with track/switch badge
    this.renderNameplate(ctx, signal, -1.8, -8.2, 9.5, 5.2, 'bold 4.8px sans-serif');
    ctx.restore();
  }

  // =========================================================================
  // 3. OBSTACLE SIGNAL (Заградительный светофор - крупный ромбовидный щит)
  // =========================================================================
  private static renderObstacleSignal(
    ctx: CanvasRenderingContext2D,
    signal: RailwaySignal,
    time: number,
    nightAlpha: number
  ): void {
    ctx.save();
    // 1. Concrete foundation
    ctx.fillStyle = '#475569';
    ctx.fillRect(-5.5, -5.5, 11, 11);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(-4.5, -4.5, 9, 9);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(-4.5, -4.5, 9, 9);

    // Anchor bolts
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-3.5, -3.5, 1.1, 1.1);
    ctx.fillRect(2.4, -3.5, 1.1, 1.1);
    ctx.fillRect(-3.5, 2.4, 1.1, 1.1);
    ctx.fillRect(2.4, 2.4, 1.1, 1.1);

    // 2. Mast tube
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(0, 0, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 0.7;
    ctx.stroke();

    // 3. Large Diamond (Rhombus) Shield rotated 45° according to ISI/GOST
    ctx.save();
    ctx.translate(3.2, 0);
    ctx.rotate(Math.PI / 4);

    // Outer black border
    ctx.fillStyle = '#080a0f';
    ctx.fillRect(-10, -10, 20, 20);

    // Contrasting white reflective border
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-8.5, -8.5, 17, 17);

    // Diagonal black zebra warning stripes along border
    ctx.strokeStyle = '#0a0c10';
    ctx.lineWidth = 1.8;
    ctx.strokeRect(-7, -7, 14, 14);

    // Inner deep matte black field
    ctx.fillStyle = '#05070a';
    ctx.fillRect(-5.5, -5.5, 11, 11);
    ctx.restore();

    // 4. Central Powerful Red Lens Unit with Extended Visor
    const fil = signal.filaments && signal.filaments[0];
    const isLit = signal.currentAspect === 'red';
    this.renderLensUnit(ctx, 3.2, 0, 'red', fil, isLit, nightAlpha, 2.2, 10.0);

    // 5. Nameplate
    this.renderNameplate(ctx, signal, -2, -10.5);
    ctx.restore();
  }

  // =========================================================================
  // 4. REPEATER SIGNAL (Повторительный светофор)
  // =========================================================================
  private static renderRepeaterSignal(
    ctx: CanvasRenderingContext2D,
    signal: RailwaySignal,
    time: number,
    nightAlpha: number
  ): void {
    ctx.save();
    // Foundation
    ctx.fillStyle = '#475569';
    ctx.fillRect(-4.5, -4.5, 9, 9);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(-3.5, -3.5, 7, 7);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 0.6;
    ctx.strokeRect(-3.5, -3.5, 7, 7);

    // Mast
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(0, 0, 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Large Oval Black Shield
    ctx.fillStyle = '#080a0f';
    ctx.beginPath();
    ctx.roundRect(2.0, -7.5, 4.6, 15, 2.4);
    ctx.fill();
    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = 0.7;
    ctx.stroke();

    const fil = signal.filaments && signal.filaments[0];
    const isLit = signal.currentAspect === 'green';
    this.renderLensUnit(ctx, 3.5, 0, 'green', fil, isLit, nightAlpha, 1.8, 8.5);
    this.renderNameplate(ctx, signal, -1.5, -9.5);
    ctx.restore();
  }

  // =========================================================================
  // 5. LEVEL CROSSING SIGNAL & BARRIER (Strict Top-Down 2D Architectural View)
  // =========================================================================
  private static renderLevelCrossingSignal(
    ctx: CanvasRenderingContext2D,
    signal: RailwaySignal,
    time: number,
    nightAlpha: number
  ): void {
    ctx.save();

    // 1. Soft ground shadow under installation
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(1, 2, 11, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Reinforced Concrete Foundation Base
    ctx.fillStyle = '#334155';
    ctx.fillRect(-7.5, -7.5, 15, 15);
    ctx.fillStyle = '#475569';
    ctx.fillRect(-6.5, -6.5, 13, 13);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(-5.5, -5.5, 11, 11);

    // 4 Galvanized anchor bolts with nuts
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-4.5, -4.5, 1.4, 1.4);
    ctx.fillRect(3.1, -4.5, 1.4, 1.4);
    ctx.fillRect(-4.5, 3.1, 1.4, 1.4);
    ctx.fillRect(3.1, 3.1, 1.4, 1.4);

    // 3. Electric Barrier Drive Cabinet Housing (Тумба электропривода ША-4)
    ctx.fillStyle = '#111827';
    ctx.fillRect(-4.5, -5.0, 9, 10);
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(-4.0, -4.5, 8, 9);
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 0.7;
    ctx.strokeRect(-4.0, -4.5, 8, 9);

    // Hazard warning stripes on cabinet top
    ctx.save();
    ctx.beginPath();
    ctx.rect(-4.0, -4.5, 8, 9);
    ctx.clip();
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 2.0;
    for (let d = -12; d < 18; d += 4.2) {
      ctx.beginPath();
      ctx.moveTo(-6 + d, -7);
      ctx.lineTo(6 + d, 7);
      ctx.stroke();
    }
    ctx.restore();

    // 4. Counterweight Beam
    ctx.fillStyle = '#111827';
    ctx.fillRect(-2.5, -12.0, 5, 7.5);
    ctx.fillStyle = '#374151';
    ctx.fillRect(-3.0, -11.5, 6, 2.6);
    ctx.fillRect(-3.0, -8.0, 6, 2.6);

    // 5. Vertical Tubular Mast
    ctx.fillStyle = '#090c10';
    ctx.beginPath();
    ctx.arc(0, 0, 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#64748b';
    ctx.beginPath();
    ctx.arc(-0.7, -0.7, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Acoustic Alarm Bell Dome
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.arc(0, 0, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.arc(-0.4, -0.4, 0.7, 0, Math.PI * 2);
    ctx.fill();

    // 6. Signal Head Traverse & St. Andrew's Cross (Траверса и Андреевский крест)
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(2.0, -12, 1.8, 24);
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(2.0, -12, 1.8, 3.2); // Top chevron
    ctx.fillRect(2.0, 8.8, 1.8, 3.2); // Bottom chevron

    // Steel traverse frame
    ctx.fillStyle = '#0a0c10';
    ctx.fillRect(1.0, -9.5, 2.2, 19);

    // 7. Large Matte Black Background Shields for Optical Heads
    ctx.fillStyle = '#05070a';
    // Left lantern backplate
    ctx.beginPath();
    ctx.arc(3.4, -6.8, 4.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = 0.6;
    ctx.stroke();

    // Right lantern backplate
    ctx.beginPath();
    ctx.arc(3.4, 6.8, 4.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Center lunar white backplate
    ctx.beginPath();
    ctx.arc(4.2, 0, 4.0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Optical Lantern Heads with Long Sun Visors
    const isCrossingClosed = signal.currentAspect === 'red_alternating_flashing' || signal.currentAspect === 'red';
    const blinkCycle = Math.floor(time * 1.5) % 2;

    const leftLit = isCrossingClosed && blinkCycle === 0;
    const rightLit = isCrossingClosed && blinkCycle === 1;
    const isLunarLit = !isCrossingClosed && signal.currentAspect === 'lunar_white_flashing' && (Math.floor(time * 0.8) % 2 === 0);

    const leftFil = signal.filaments && signal.filaments[0];
    const rightFil = signal.filaments && signal.filaments[1];
    const whiteFil = signal.filaments && signal.filaments[2];

    // Left red lantern unit at Y = -6.8
    this.renderTopDownLanternUnit(ctx, 3.4, -6.8, 'red', leftFil, leftLit, nightAlpha, isCrossingClosed);
    // Right red lantern unit at Y = +6.8
    this.renderTopDownLanternUnit(ctx, 3.4, 6.8, 'red', rightFil, rightLit, nightAlpha, isCrossingClosed);

    // Center lunar-white lantern at Y = 0
    this.renderTopDownLanternUnit(ctx, 4.2, 0, 'white', whiteFil, isLunarLit, nightAlpha, !isCrossingClosed);

    // 8. Automatic Barrier Boom (Брус шлагбаума)
    if (signal.isCrossingGate) {
      ctx.fillStyle = '#0a0c10';
      ctx.beginPath();
      ctx.arc(0, 2.4, 2.6, 0, Math.PI * 2);
      ctx.fill();

      const maxBoomLen = signal.barrierLength || 58;
      const progress = signal.barrierProgress !== undefined ? signal.barrierProgress : (isCrossingClosed ? 1.0 : 0.0);
      const currentLen = progress * maxBoomLen;

      if (currentLen > 3) {
        // Drop shadow on roadway asphalt
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(-0.6 + 1.8, 2.4 + 1.6, 2.4, currentLen);

        // Boom base (White aluminum beam)
        const boomW = 2.6;
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(-boomW / 2, 2.4, boomW, currentLen);

        // Alternating diagonal 45° red reflective safety stripes
        const stripePitch = 7.5;
        ctx.save();
        ctx.beginPath();
        ctx.rect(-boomW / 2, 2.4, boomW, currentLen);
        ctx.clip();
        ctx.fillStyle = '#dc2626';
        for (let py = 2.4; py < 2.4 + currentLen + stripePitch; py += stripePitch) {
          ctx.beginPath();
          ctx.moveTo(-boomW / 2, py);
          ctx.lineTo(boomW / 2, py + boomW);
          ctx.lineTo(boomW / 2, py + boomW + stripePitch * 0.5);
          ctx.lineTo(-boomW / 2, py + stripePitch * 0.5);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();

        // Red protective rubber tip on boom end
        ctx.fillStyle = '#991b1b';
        ctx.fillRect(-boomW / 2 - 0.4, 2.4 + currentLen - 2.8, boomW + 0.8, 2.8);

        // Red warning LED markers along boom
        if (isCrossingClosed && currentLen > 15) {
          const ledPositions = [0.28, 0.58, 0.88];
          const ledLit = blinkCycle === 0;
          for (const pos of ledPositions) {
            const ledY = 2.4 + currentLen * pos;
            ctx.fillStyle = ledLit ? '#ef4444' : '#7f1d1d';
            ctx.beginPath();
            ctx.arc(0, ledY, 1.2, 0, Math.PI * 2);
            ctx.fill();

            if (ledLit) {
              ctx.fillStyle = 'rgba(239, 68, 68, 0.55)';
              ctx.beginPath();
              ctx.arc(0, ledY, 3.0, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      }
    }

    ctx.restore();
  }

  private static renderTopDownLanternUnit(
    ctx: CanvasRenderingContext2D,
    lx: number,
    ly: number,
    color: RailwayLensColor,
    filament: RailwaySignalFilament | undefined,
    isLitFallback: boolean,
    nightAlpha: number,
    allowedToLight: boolean = true
  ): void {
    ctx.save();

    // 1. Long Cylindrical Sun Visor Hood extending forward (+X)
    const visorLength = 8.5;
    const visorHalfW = 2.8;

    // Visor drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(lx, ly - visorHalfW + 0.5, visorLength, visorHalfW * 2);

    // Deep matte black outer visor barrel
    ctx.fillStyle = '#080a0f';
    ctx.beginPath();
    ctx.arc(lx, ly, visorHalfW, -Math.PI / 2, Math.PI / 2, false);
    ctx.lineTo(lx + visorLength, ly + visorHalfW - 0.4);
    ctx.lineTo(lx + visorLength + 1.2, ly); // Beveled top hood brim
    ctx.lineTo(lx + visorLength, ly - visorHalfW + 0.4);
    ctx.closePath();
    ctx.fill();

    // Visor outer rim edge highlight
    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = 0.6;
    ctx.stroke();

    // Matte anti-reflective interior cavity
    ctx.fillStyle = '#020305';
    ctx.beginPath();
    ctx.arc(lx + 0.5, ly, visorHalfW - 0.6, -Math.PI / 2, Math.PI / 2, false);
    ctx.lineTo(lx + visorLength - 0.8, ly + visorHalfW - 0.9);
    ctx.lineTo(lx + visorLength - 0.8, ly - visorHalfW + 0.9);
    ctx.closePath();
    ctx.fill();

    // Top metal spine specular line
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(lx, ly - visorHalfW + 0.3);
    ctx.lineTo(lx + visorLength - 0.5, ly - visorHalfW + 0.6);
    ctx.stroke();

    // 2. Optical Glass Lens with Fresnel Rings
    const lensRadius = 1.8;
    const baseColor = color === 'red' ? '#3b0707' : '#0f172a';
    ctx.fillStyle = baseColor;
    ctx.beginPath();
    ctx.arc(lx, ly, lensRadius, 0, Math.PI * 2);
    ctx.fill();

    // Stepped Fresnel concentric rings
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 0.35;
    ctx.beginPath();
    ctx.arc(lx, ly, lensRadius * 0.65, 0, Math.PI * 2);
    ctx.stroke();

    const isLit = allowedToLight && (filament ? (filament.brightness > 0.05 && isLitFallback) : isLitFallback);
    if (isLit) {
      const brightness = filament ? filament.brightness : 1.0;
      if (color === 'red') {
        // Glowing ruby core
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(lx, ly, lensRadius, 0, Math.PI * 2);
        ctx.fill();

        // White-hot center
        ctx.fillStyle = '#fca5a5';
        ctx.beginPath();
        ctx.arc(lx + 0.5, ly, lensRadius * 0.55, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(lx + 0.6, ly, lensRadius * 0.25, 0, Math.PI * 2);
        ctx.fill();

        // Directional optical glow cone (+X)
        const coneGrad = ctx.createRadialGradient(lx, ly, 1, lx + 22, ly, 30);
        coneGrad.addColorStop(0, `rgba(239, 68, 68, ${0.55 * brightness})`);
        coneGrad.addColorStop(0.45, `rgba(239, 68, 68, ${0.22 * brightness})`);
        coneGrad.addColorStop(1, 'rgba(239, 68, 68, 0.0)');

        ctx.fillStyle = coneGrad;
        ctx.beginPath();
        ctx.moveTo(lx + 1.5, ly);
        ctx.arc(lx + 1.5, ly, 30, -0.45, 0.45);
        ctx.closePath();
        ctx.fill();
      } else {
        // Lunar white glowing core
        ctx.fillStyle = '#e0f2fe';
        ctx.beginPath();
        ctx.arc(lx, ly, lensRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(lx + 0.4, ly, lensRadius * 0.6, 0, Math.PI * 2);
        ctx.fill();

        // Soft forward glow
        const coneGrad = ctx.createRadialGradient(lx, ly, 1, lx + 18, ly, 24);
        coneGrad.addColorStop(0, `rgba(224, 242, 254, ${0.45 * brightness})`);
        coneGrad.addColorStop(1, 'rgba(224, 242, 254, 0.0)');
        ctx.fillStyle = coneGrad;
        ctx.beginPath();
        ctx.moveTo(lx + 1.5, ly);
        ctx.arc(lx + 1.5, ly, 24, -0.4, 0.4);
        ctx.closePath();
        ctx.fill();
      }
    }

    ctx.restore();
  }

  // =========================================================================
  // HELPER: LENS UNIT VECTOR RENDERING (INCANDESCENT FILAMENT & LONG HOOD)
  // =========================================================================
  private static renderLensUnit(
    ctx: CanvasRenderingContext2D,
    lx: number,
    ly: number,
    color: RailwayLensColor,
    filament: RailwaySignalFilament | undefined,
    isLitFallback: boolean,
    nightAlpha: number,
    radius: number = 1.8,
    visorLen: number = 8.5
  ): void {
    ctx.save();

    const visorHalfW = radius + 1.3;

    // 1. Long Sun Visor Hood extending forward in beam direction (+X)
    // Cast iron lens barrel collar
    ctx.fillStyle = '#090b10';
    ctx.beginPath();
    ctx.arc(lx, ly, visorHalfW + 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = 0.6;
    ctx.stroke();

    // Visor barrel body
    ctx.fillStyle = '#05070a';
    ctx.beginPath();
    ctx.arc(lx, ly, visorHalfW, -Math.PI / 2, Math.PI / 2, false);
    ctx.lineTo(lx + visorLen, ly + visorHalfW - 0.4);
    ctx.lineTo(lx + visorLen + 1.2, ly); // Protruding forward upper peak of the hood
    ctx.lineTo(lx + visorLen, ly - visorHalfW + 0.4);
    ctx.closePath();
    ctx.fill();

    // Outer edge highlight on visor rim
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Matte anti-glare interior cavity
    ctx.fillStyle = '#020305';
    ctx.beginPath();
    ctx.arc(lx + 0.4, ly, visorHalfW - 0.6, -Math.PI / 2, Math.PI / 2, false);
    ctx.lineTo(lx + visorLen - 0.8, ly + visorHalfW - 0.8);
    ctx.lineTo(lx + visorLen - 0.8, ly - visorHalfW + 0.8);
    ctx.closePath();
    ctx.fill();

    // Top metal spine specular reflection line
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(lx, ly - visorHalfW + 0.3);
    ctx.lineTo(lx + visorLen - 0.5, ly - visorHalfW + 0.5);
    ctx.stroke();

    // 2. Optical Glass Lens in its cast bezel
    let baseGlassColor = '#05070a';
    if (color === 'red') baseGlassColor = '#3b0707';
    else if (color === 'yellow') baseGlassColor = '#381a03';
    else if (color === 'green') baseGlassColor = '#022110';
    else if (color === 'blue') baseGlassColor = '#0c1a3b';
    else if (color === 'white') baseGlassColor = '#111827';

    ctx.fillStyle = baseGlassColor;
    ctx.beginPath();
    ctx.arc(lx, ly, radius, 0, Math.PI * 2);
    ctx.fill();

    // Concentric Fresnel stepped lens grooves
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 0.35;
    ctx.beginPath();
    ctx.arc(lx, ly, radius * 0.65, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(lx, ly, radius * 0.35, 0, Math.PI * 2);
    ctx.stroke();

    // Physical filament variables
    const isLensActive = isLitFallback;
    const b = filament ? (isLensActive ? filament.brightness : 0.0) : (isLensActive ? 1.0 : 0.0);
    const temp = filament ? filament.temp : (isLensActive ? 1.0 : 0.0);
    const coldPulse = (isLensActive && filament) ? filament.coldTestPulse : 0;

    // 3. Incandescent tungsten wire coil / warm ember during warm-up or cooldown
    if (temp > 0.05 || coldPulse > 0) {
      if (isLensActive || temp > 0.15) {
        let emberColor = 'rgba(239, 68, 68, 0.85)';
        if (temp > 0.7) {
          emberColor = 'rgba(255, 255, 255, 0.98)';
        } else if (temp > 0.4) {
          emberColor = 'rgba(251, 146, 60, 0.92)';
        } else if (coldPulse > 0 || temp > 0.05) {
          emberColor = 'rgba(253, 186, 116, 0.78)';
        }

        ctx.save();
        ctx.fillStyle = emberColor;
        ctx.shadowColor = emberColor;
        ctx.shadowBlur = 3.0 * Math.max(temp, coldPulse * 0.6);
        ctx.beginPath();
        ctx.arc(lx + 0.3, ly, radius * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // 4. Optical Luminous Flux and Directional Collimated Beam
    if (isLensActive && b > 0.01) {
      let r = 16, g = 185, bCol = 129;
      if (color === 'red') { r = 239; g = 68; bCol = 68; }
      else if (color === 'yellow') { r = 245; g = 158; bCol = 11; }
      else if (color === 'blue') { r = 59; g = 130; bCol = 246; }
      else if (color === 'white') { r = 241; g = 245; bCol = 249; }

      // Thermal spectrum shift when warming up or cooling down
      if (temp < 0.8 && color !== 'red') {
        const warmFactor = (0.8 - temp) / 0.8;
        r = Math.min(255, Math.round(r * (1 - warmFactor) + 245 * warmFactor));
        g = Math.round(g * (1 - warmFactor * 0.4) + 120 * warmFactor * 0.4);
      }

      const litRim = `rgb(${r}, ${g}, ${bCol})`;
      const glowAlpha = Math.min(0.90, b * 0.78);
      const glowColor = `rgba(${r}, ${g}, ${bCol}, ${glowAlpha})`;

      // Outer Bloom Halo
      const haloRadius = radius * (1.8 + b * 2.5);
      const bloomGrad = ctx.createRadialGradient(lx + 0.4, ly, radius * 0.3, lx + 0.4, ly, haloRadius);
      bloomGrad.addColorStop(0, glowColor);
      bloomGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = bloomGrad;
      ctx.beginPath();
      ctx.arc(lx + 0.4, ly, haloRadius, 0, Math.PI * 2);
      ctx.fill();

      // Saturated Lens Body
      ctx.fillStyle = litRim;
      ctx.beginPath();
      ctx.arc(lx + 0.4, ly, radius, 0, Math.PI * 2);
      ctx.fill();

      // White Hot Incandescent Center Core
      const coreColor = temp > 0.75 ? '#ffffff' : (temp > 0.5 ? '#fffbeb' : '#fed7aa');
      ctx.fillStyle = coreColor;
      ctx.beginPath();
      ctx.arc(lx + 0.4, ly, radius * (0.35 + b * 0.35), 0, Math.PI * 2);
      ctx.fill();

      // Directional Collimated Beam through Fresnel Lens
      if (b > 0.15) {
        const beamThrow = (28 + nightAlpha * 45) * b;
        const beamSpread = (18 + nightAlpha * 14) * b;
        const beamGrad = ctx.createRadialGradient(lx + 2, ly, radius, lx + beamThrow * 0.6, ly, beamThrow);
        const beamOpacity = Math.min(0.85, Math.pow(b, 1.3) * (0.42 + nightAlpha * 0.45));
        beamGrad.addColorStop(0, `rgba(${r}, ${g}, ${bCol}, ${beamOpacity})`);
        beamGrad.addColorStop(0.35, `rgba(${r}, ${g}, ${bCol}, ${beamOpacity * 0.4})`);
        beamGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = beamGrad;
        ctx.beginPath();
        ctx.moveTo(lx + visorLen, ly - radius);
        ctx.lineTo(lx + beamThrow, ly - beamSpread / 2);
        ctx.lineTo(lx + beamThrow, ly + beamSpread / 2);
        ctx.lineTo(lx + visorLen, ly + radius);
        ctx.closePath();
        ctx.fill();
      }
    }

    ctx.restore();
  }

  // =========================================================================
  // HELPER: ENAMELED DESIGNATION NAMEPLATE WITH UPRIGHT ROTATION & TRACK BADGE
  // =========================================================================
  private static renderNameplate(
    ctx: CanvasRenderingContext2D,
    signal: RailwaySignal,
    x: number,
    y: number,
    w: number = 9.5,
    h: number = 5.6,
    font: string = 'bold 5.2px sans-serif'
  ): void {
    ctx.save();
    ctx.translate(x, y + h / 2);
    // Counter-rotate if signal is rotated so text is NEVER upside down!
    if (Math.abs(signal.angle) > Math.PI / 2) {
      ctx.rotate(Math.PI);
    }
    const text = signal.designation;

    // Black enamel plate background with crisp border
    ctx.fillStyle = '#030712';
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, 1.2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.7;
    ctx.stroke();

    // Lettering
    ctx.fillStyle = '#ffffff';
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 0, 0.2);

    // Track or switch indicator badge for shunting signals
    const trackBadge = signal.switchNumber ? `№${signal.switchNumber}` : (signal.targetTrack ? (signal.targetTrack.includes('3') ? '3П' : signal.targetTrack.includes('4') ? '4П' : signal.targetTrack.includes('I') ? 'IП' : '') : '');
    if (trackBadge && signal.type === 'shunting') {
      const bw = 11;
      const bh = 4.6;
      const by = h / 2 + 2.8;
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(-bw / 2, by - bh / 2, bw, bh, 0.8);
      ctx.fill();
      ctx.strokeStyle = '#38bdf8'; // Blue rim for switch/track
      ctx.lineWidth = 0.6;
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 3.8px monospace';
      ctx.fillText(trackBadge, 0, by + 0.2);
    }

    ctx.restore();
  }

  // =========================================================================
  // DIEGETIC MACHINIST SIGNAL BADGE (HUD / On-Track Comprehension for Driver)
  // "чтоб машинист понимал для кого он"
  // =========================================================================
  private static renderMachinistSignalBadge(
    ctx: CanvasRenderingContext2D,
    signal: RailwaySignal
  ): void {
    ctx.save();
    const bx = signal.x;
    const by = signal.y - 24;

    // Determine type color and label
    let typeLabel = 'СВЕТОФОР';
    let typeColor = '#38bdf8';
    if (signal.type === 'shunting') {
      typeLabel = 'МАНЕВРОВЫЙ';
      typeColor = '#38bdf8'; // Sky blue
    } else if (signal.type === 'entry') {
      typeLabel = 'ВХОДНОЙ';
      typeColor = '#facc15'; // Amber gold
    } else if (signal.type === 'exit') {
      typeLabel = 'ВЫХОДНОЙ';
      typeColor = '#34d399'; // Emerald
    } else if (signal.type === 'block') {
      typeLabel = 'ПРОХОДНОЙ';
      typeColor = '#a78bfa'; // Violet
    } else if (signal.type === 'crossing') {
      typeLabel = 'ПЕРЕЕЗД';
      typeColor = '#f87171'; // Coral
    }

    const titleText = `[${signal.designation}] ${typeLabel}`;
    const targetText = signal.targetTrack || signal.name;

    let aspectText = 'Запрещающий (Красный)';
    let aspectColor = '#ef4444';

    if (signal.type === 'entry') {
      if (signal.currentAspect === 'green') {
        aspectText = 'Прием по главному пути (Зеленый)';
        aspectColor = '#10b981';
      } else if (signal.currentAspect === 'yellow' || signal.currentAspect === 'yellow_flashing') {
        aspectText = 'Прием на главный путь, следующий закрыт (Желтый)';
        aspectColor = '#f59e0b';
      } else if (signal.currentAspect === 'two_yellows') {
        aspectText = 'Прием на боковой путь по стрелке (2 желтых)';
        aspectColor = '#f59e0b';
      } else if (signal.currentAspect === 'two_yellows_one_flashing') {
        aspectText = 'Прием по стрелке, следующий открыт (2 желтых, 1 миг.)';
        aspectColor = '#eab308';
      } else {
        aspectText = 'Прием на станцию запрещен (Красный)';
        aspectColor = '#ef4444';
      }
    } else if (signal.type === 'exit') {
      if (signal.currentAspect === 'green') {
        aspectText = 'Отправление со станции (Зеленый)';
        aspectColor = '#10b981';
      } else if (signal.currentAspect === 'yellow' || signal.currentAspect === 'yellow_flashing') {
        aspectText = 'Отправление, следующий закрыт (Желтый)';
        aspectColor = '#f59e0b';
      } else if (signal.currentAspect === 'two_yellows') {
        aspectText = 'Отправление с отклонением по стрелке (2 желтых)';
        aspectColor = '#f59e0b';
      } else if (signal.currentAspect === 'two_yellows_one_flashing') {
        aspectText = 'Отправление по стрелке, следующий открыт (2 желтых, 1 миг.)';
        aspectColor = '#eab308';
      } else {
        aspectText = 'Отправление со станции запрещено (Красный)';
        aspectColor = '#ef4444';
      }
    } else if (signal.type === 'block') {
      if (signal.currentAspect === 'green') {
        aspectText = 'Перегон свободен (Зеленый)';
        aspectColor = '#10b981';
      } else if (signal.currentAspect === 'yellow') {
        aspectText = 'Свободен один блок-участок (Желтый)';
        aspectColor = '#f59e0b';
      } else {
        aspectText = 'Блок-участок занят (Красный)';
        aspectColor = '#ef4444';
      }
    } else if (signal.type === 'shunting') {
      if (signal.currentAspect === 'lunar_white' || signal.currentAspect === 'lunar_white_flashing') {
        aspectText = 'Маневры разрешены (Белый)';
        aspectColor = '#38bdf8';
      } else {
        aspectText = 'Маневры запрещены (Синий)';
        aspectColor = '#60a5fa';
      }
    } else if (signal.type === 'crossing') {
      if (signal.currentAspect === 'lunar_white_flashing') {
        aspectText = 'Переезд открыт (Белый мигающий)';
        aspectColor = '#38bdf8';
      } else {
        aspectText = 'Переезд закрыт (Красный мигающий)';
        aspectColor = '#ef4444';
      }
    }

    const bw = 140;
    const bh = 34;

    // Dark enameled railway HUD plate
    ctx.fillStyle = 'rgba(9, 13, 22, 0.92)';
    ctx.beginPath();
    ctx.roundRect(bx - bw / 2, by - bh / 2, bw, bh, 3);
    ctx.fill();

    ctx.strokeStyle = typeColor;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Connecting stem to the signal
    ctx.strokeStyle = typeColor;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(bx, by + bh / 2);
    ctx.lineTo(bx, signal.y - 2);
    ctx.stroke();

    // Header: Designation & Type
    ctx.font = 'bold 9px sans-serif';
    ctx.fillStyle = typeColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(titleText, bx - bw / 2 + 6, by - bh / 2 + 4);

    // Target Track / Switch
    ctx.font = '8px sans-serif';
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText(targetText.length > 25 ? targetText.substring(0, 25) + '...' : targetText, bx - bw / 2 + 6, by - bh / 2 + 15);

    // Aspect indication dot & text
    ctx.fillStyle = aspectColor;
    ctx.beginPath();
    ctx.arc(bx - bw / 2 + 9, by - bh / 2 + 27, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = '7.5px sans-serif';
    ctx.fillText(aspectText, bx - bw / 2 + 16, by - bh / 2 + 24);

    ctx.restore();
  }

  // =========================================================================
  // ASPECT LOGIC
  // =========================================================================
  private static getActiveLensesForAspect(signal: RailwaySignal, time: number): number[] {
    if (signal.relayPhase === 'blackout') {
      return []; // Dark gap during relay contact break
    }
    const aspect = (signal.relayPhase === 'lamp_check' && signal.pendingAspect) ? signal.pendingAspect : signal.currentAspect;
    const lenses = signal.lenses;

    if (aspect === 'dark') return [];

    if (signal.type === 'crossing') {
      if (aspect === 'red_alternating_flashing' || aspect === 'red') {
        const cycle = Math.floor(time * 1.5) % 2;
        return cycle === 0 ? [0] : [1];
      }
      if (aspect === 'lunar_white_flashing' || aspect === 'lunar_white') {
        const isLit = Math.floor(time * 0.8) % 2 === 0;
        const whiteIdx = lenses.indexOf('white');
        return isLit ? [whiteIdx !== -1 ? whiteIdx : 2] : [];
      }
      return [];
    }

    if (aspect === 'red_alternating_flashing') {
      const cycle = Math.floor(time * 1.6) % 2;
      return cycle === 0 ? [0] : [1 < lenses.length ? 1 : 0];
    }

    if (aspect === 'lunar_white_flashing') {
      const isLit = Math.floor(time * 1.3) % 2 === 0;
      if (!isLit) return [];
      const idx = lenses.indexOf('white');
      return idx !== -1 ? [idx] : [0];
    }

    if (aspect === 'yellow_flashing') {
      const isLit = Math.floor(time * 1.4) % 2 === 0;
      if (!isLit) return [];
      const idx = lenses.indexOf('yellow');
      return idx !== -1 ? [idx] : [0];
    }

    if (aspect === 'two_yellows' || aspect === 'two_yellows_one_flashing') {
      const firstY = lenses.indexOf('yellow');
      const secondY = lenses.lastIndexOf('yellow');
      if (firstY !== -1 && secondY !== -1 && firstY !== secondY) {
        if (aspect === 'two_yellows_one_flashing') {
          const topIsLit = Math.floor(time * 1.4) % 2 === 0;
          return topIsLit ? [firstY, secondY] : [secondY];
        }
        return [firstY, secondY];
      }
      return firstY !== -1 ? [firstY] : [0];
    }

    let targetColor: RailwayLensColor = 'red';
    if (aspect === 'green') targetColor = 'green';
    else if (aspect === 'yellow') targetColor = 'yellow';
    else if (aspect === 'blue') targetColor = 'blue';
    else if (aspect === 'lunar_white') targetColor = 'white';

    const idx = lenses.indexOf(targetColor);
    return idx !== -1 ? [idx] : [0];
  }

  // =========================================================================
  // NIGHT LIGHTMAP
  // =========================================================================
  public static renderLightmap(
    ctx: CanvasRenderingContext2D,
    world: GameWorld,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    nightAlpha: number
  ): void {
    if (nightAlpha <= 0.05) return;
    this.ensureInitialized(world);

    const signals = world.railwaySignals || [];
    const pad = 120;
    const time = this.globalTime;

    for (const sig of signals) {
      if (sig.x < minX - pad || sig.x > maxX + pad || sig.y < minY - pad || sig.y > maxY + pad) {
        continue;
      }

      const activeLenses = this.getActiveLensesForAspect(sig, time);
      if (activeLenses.length === 0) continue;

      ctx.save();
      ctx.translate(sig.x, sig.y);
      ctx.rotate(sig.angle);

      for (const idx of activeLenses) {
        const color = sig.lenses[idx];
        let rgb = '16, 185, 129';
        if (color === 'red') rgb = '239, 68, 68';
        else if (color === 'yellow') rgb = '245, 158, 11';
        else if (color === 'blue') rgb = '59, 130, 246';
        else if (color === 'white') rgb = '241, 245, 249';

        const groundGrad = ctx.createRadialGradient(0, 0, 1, 0, 0, 28);
        groundGrad.addColorStop(0.0, `rgba(${rgb}, ${0.50 * nightAlpha})`);
        groundGrad.addColorStop(0.4, `rgba(${rgb}, ${0.18 * nightAlpha})`);
        groundGrad.addColorStop(0.8, `rgba(${rgb}, ${0.04 * nightAlpha})`);
        groundGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = groundGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 28, 0, Math.PI * 2);
        ctx.fill();

        // Focused optical lens emission with curved parabolic penumbra and radial falloff (no harsh triangle polygon)
        const coneReach = 85;
        const coneHalfW = 28;
        const coneGrad = ctx.createRadialGradient(2, 0, 1, coneReach * 0.45, 0, coneReach);
        coneGrad.addColorStop(0.00, `rgba(${rgb}, ${0.60 * nightAlpha})`);
        coneGrad.addColorStop(0.30, `rgba(${rgb}, ${0.28 * nightAlpha})`);
        coneGrad.addColorStop(0.70, `rgba(${rgb}, ${0.07 * nightAlpha})`);
        coneGrad.addColorStop(0.92, `rgba(${rgb}, ${0.01 * nightAlpha})`);
        coneGrad.addColorStop(1.00, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = coneGrad;
        ctx.beginPath();
        ctx.moveTo(2, 0);
        ctx.quadraticCurveTo(coneReach * 0.45, -coneHalfW * 0.6, coneReach, -coneHalfW);
        ctx.bezierCurveTo(
          coneReach + 15, -coneHalfW * 0.4,
          coneReach + 15, coneHalfW * 0.4,
          coneReach, coneHalfW
        );
        ctx.quadraticCurveTo(coneReach * 0.45, coneHalfW * 0.6, 2, 0);
        ctx.closePath();
        ctx.fill();

        // Optical lens flare core directly on the signal optic
        const flareGrad = ctx.createRadialGradient(2, 0, 0.5, 2, 0, 7.5);
        flareGrad.addColorStop(0.0, `rgba(${rgb}, 0.95)`);
        flareGrad.addColorStop(0.5, `rgba(${rgb}, 0.45)`);
        flareGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = flareGrad;
        ctx.beginPath();
        ctx.arc(2, 0, 7.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }
}
