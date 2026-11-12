import React, { useEffect, useState } from 'react';
import { togglePto, isPtoOn, hasPtoDrive, vehicleHasPto } from '../ptoSystem';
import { Player, GameWorld } from '../types';
import { X } from 'lucide-react';
import { sound } from '../audio';
import { toggleTrailerHitch } from '../physics';
import { getLiquidNameRu, hasRoadTrainLights, getVehicleDiffCapabilities, cycleVehicleDiffLock } from '../vehicleHelpers';
import { isVehicleCraneTruck, isVehicleVacuumTruck, getVehicleVacuumBodyId } from '../truckChassisVariants';
import { getVehicleControlTheme, VehicleControlTheme, CONTROL_THEME_META } from './vehicleControlStyles';
import { Cell, Group, HwPush, HwRotary, HwSwitch, Lamp, Lcd, Screw, THEME_FAMILY } from './boardHardware';

interface VehicleBoardMenuProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player | null;
  world: GameWorld | null;
  onToggleWipers: () => void;
  onToggleHeadlights: () => void;
  onToggleFrontFogLights?: () => void;
  onToggleRearFogLights?: () => void;
  onToggleSiren: () => void;
  onToggleTurnSignal: (signal: 'left' | 'right' | 'hazard') => void;
  onChangeHeaterMode: (mode: 'off' | 'low' | 'med' | 'high') => void;
  onToggleWindow?: () => void;
  onToggleEngine?: () => void;
  onToggleTrailerHitch?: () => void;
  onToggleRoadTrainLights?: () => void;
  onCycleDiffLock?: () => void;
  onToggleAC?: () => void;
  onToggleRecirc?: () => void;
}

export const VehicleBoardMenu: React.FC<VehicleBoardMenuProps> = ({
  isOpen,
  onClose,
  player,
  world,
  onToggleWipers,
  onToggleHeadlights,
  onToggleFrontFogLights,
  onToggleRearFogLights,
  onToggleSiren,
  onToggleTurnSignal,
  onChangeHeaterMode,
  onToggleWindow,
  onToggleEngine,
  onToggleTrailerHitch,
  onToggleRoadTrainLights,
  onCycleDiffLock,
  onToggleAC,
  onToggleRecirc
}) => {
  const [, setTick] = useState(0);
  // Close menu on Escape or E key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !player || !world) return null;

  const veh = world.vehicles.find(v => v.id === player.currentVehicleId);
  if (!veh) return null;

  const theme: VehicleControlTheme = getVehicleControlTheme(veh.type);
  const themeMeta = CONTROL_THEME_META[theme] || CONTROL_THEME_META.standard;

  const wipersActive = !!veh.wipersOn;
  const headlightsMode = veh.headlightMode || 'off';
  const sirenActive = !!veh.sirenOn;
  const heaterMode = veh.heaterMode || 'off';
  const heaterTemp = Math.round(veh.heaterTemp ?? 18);
  const engTemp = Math.round(typeof veh.engineTemp === 'number' ? veh.engineTemp : (veh.engineState?.temperature ?? 20));
  const rawFog = veh.fogLevel ?? 0;
  const fogPercent = Math.round(rawFog <= 1.0 ? rawFog * 100 : rawFog);
  const rainPercent = Math.round(veh.windshieldRainLevel ?? 0);
  const turnSignal = veh.turnSignal || 'none';
  const isEngineRunning = veh.engineState?.engineRunning ?? false;
  const isStalled = !!veh.engineState?.isStalled || !!veh.engineState?.engineStalled;
  const isWindowOpen = !!veh.windowOpen;
  const acActive = !!veh.acOn;
  const recircActive = !!veh.recircOn;
  const speedKmh = Math.round(Math.abs(veh.speed) * 3.6);
  const rpm = isEngineRunning ? Math.round(veh.engineState?.engineRPM || 800) : 0;
  const batteryCharge = Math.round(veh.engineState?.batteryCharge ?? 100);
  const voltage = isEngineRunning ? (14.1 + (batteryCharge / 100) * 0.3).toFixed(1) : (11.9 + (batteryCharge / 100) * 0.7).toFixed(1);

  // Differential Lock info
  const diffCaps = getVehicleDiffCapabilities(veh.type);
  const dl = veh.diffLock;
  const isDiffLocked = !!(dl?.center || dl?.rear || dl?.front);
  let diffLockDesc = 'СВОБОДНЫЙ';
  if (dl?.front && dl?.rear && dl?.center) diffLockDesc = 'ПОЛНАЯ (100%)';
  else if (dl?.center && dl?.rear) diffLockDesc = 'МОБ + МКБ-З';
  else if (dl?.center) diffLockDesc = 'МОБ (МЕЖОСЕВАЯ)';
  else if (dl?.rear) diffLockDesc = 'МКБ-З (ЗАДНЯЯ)';
  else if (dl?.front) diffLockDesc = 'МКБ-П (ПЕРЕДНЯЯ)';

  const family = THEME_FAMILY[theme] ?? 'rocker';
  const press = () => sound.playButtonPress();
  const hasSiren = ['police', 'ambulance', 'ambulance_van', 'ambulance_suv', 'fire_engine', 'fire_ladder', 'fire_rescue'].includes(veh.type);
  const roadTrainOn = veh.roadTrainLightsOn !== false;
  const gboOn = veh.fuelSystem?.gboActive !== false;
  const tank = veh.fluidTank;
  const covered = family === 'guard';

  return (
    <div id="radial-menu-backdrop" className="hw-backdrop" onClick={onClose}>
      <div id="cockpit-switchboard-panel" className="hw-board" data-skin={theme} onClick={(e) => e.stopPropagation()}>
        <Screw className="is-tl" turn={20} />
        <Screw className="is-tr" turn={-35} />
        <Screw className="is-bl" turn={70} />
        <Screw className="is-br" turn={-10} />

        <header className="hw-head">
          <div className="hw-nameplate">
            <small>{themeMeta.badgeText}</small>
            <strong>{veh.nameRu || veh.type}</strong>
          </div>
          <div className="hw-meters">
            <Lcd label="БОРТ, В" value={voltage} warn={Number(voltage) < 12} />
            <Lcd label="САЛОН, °C" value={String(heaterTemp)} />
            <Lcd label="МОТОР, °C" value={String(engTemp)} warn={engTemp > 100} />
            <Lcd label="КМ/Ч" value={String(speedKmh)} />
            <Lcd label="ОБ/МИН" value={String(rpm)} />
            <button id="radial-menu-close" type="button" className="hw-close" onClick={onClose} title="Закрыть панель [Esc]" aria-label="Закрыть панель">
              <X />
            </button>
          </div>
        </header>

        <div className="hw-groups">
          <Group title="СВЕТ">
            <Cell label="Фары" keyHint="L" wide lamp={<Lamp on={headlightsMode !== 'off'} tone={headlightsMode === 'high' ? 'blue' : 'green'} />}>
              <HwRotary
                label="Фары"
                value={headlightsMode}
                options={[
                  { id: 'off', label: 'ВЫКЛ' },
                  { id: 'low', label: 'БЛИЖ' },
                  { id: 'high', label: 'ДАЛЬН' },
                ]}
                onSelect={(m) => {
                  press();
                  if (headlightsMode !== m) onToggleHeadlights();
                }}
                onKnob={() => {
                  press();
                  onToggleHeadlights();
                }}
                spread={52}
              />
            </Cell>
            <Cell label="ПТФ передние" keyHint="U" lamp={<Lamp on={!!veh.frontFogLightsOn} tone="green" />}>
              <HwSwitch
                family={family}
                on={!!veh.frontFogLightsOn}
                label="Передние противотуманные фары"
                lens="green"
                onClick={() => {
                  press();
                  if (onToggleFrontFogLights) onToggleFrontFogLights();
                  else veh.frontFogLightsOn = !veh.frontFogLightsOn;
                  setTick((t) => t + 1);
                }}
              />
            </Cell>
            <Cell label="ПТФ задние" keyHint="Y" lamp={<Lamp on={!!veh.rearFogLightsOn} tone="amber" />}>
              <HwSwitch
                family={family}
                on={!!veh.rearFogLightsOn}
                label="Задний противотуманный фонарь"
                lens="amber"
                onClick={() => {
                  press();
                  if (onToggleRearFogLights) onToggleRearFogLights();
                  else veh.rearFogLightsOn = !veh.rearFogLightsOn;
                  setTick((t) => t + 1);
                }}
              />
            </Cell>
            {hasRoadTrainLights(veh) && (
              <Cell label="Огни автопоезда" keyHint="N" lamp={<Lamp on={roadTrainOn} tone="amber" />}>
                <HwSwitch
                  family={family}
                  on={roadTrainOn}
                  label="Опознавательные огни автопоезда"
                  onClick={() => {
                    press();
                    if (onToggleRoadTrainLights) onToggleRoadTrainLights();
                    else veh.roadTrainLightsOn = !veh.roadTrainLightsOn;
                    setTick((t) => t + 1);
                  }}
                />
              </Cell>
            )}
          </Group>

          <Group title="СИГНАЛИЗАЦИЯ">
            <Cell label="Левый" keyHint="Z" lamp={<Lamp on={turnSignal === 'left' || turnSignal === 'hazard'} tone="green" blink />}>
              <HwPush shape="square" glyph="left" label="Левый поворот" lit={turnSignal === 'left'} tone="green" onClick={() => { press(); onToggleTurnSignal('left'); }} />
            </Cell>
            <Cell label="Аварийка" keyHint="X" lamp={<Lamp on={turnSignal === 'hazard'} tone="red" blink />}>
              <HwPush shape="wide" tone="red" glyph="hazard" label="Аварийная сигнализация" lit={turnSignal === 'hazard'} blink onClick={() => { press(); onToggleTurnSignal('hazard'); }} />
            </Cell>
            <Cell label="Правый" keyHint="C" lamp={<Lamp on={turnSignal === 'right' || turnSignal === 'hazard'} tone="green" blink />}>
              <HwPush shape="square" glyph="right" label="Правый поворот" lit={turnSignal === 'right'} tone="green" onClick={() => { press(); onToggleTurnSignal('right'); }} />
            </Cell>
            {hasSiren && (
              <Cell label="Спецсигнал" keyHint="B" lamp={<Lamp on={sirenActive} tone="blue" blink />}>
                <HwSwitch family={family === 'rocker' || family === 'piano' ? family : 'guard'} on={sirenActive} label="Проблесковые маяки и сирена" lens="blue" onClick={() => { press(); onToggleSiren(); }} />
              </Cell>
            )}
          </Group>

          <Group title="КУЗОВ И САЛОН">
            <Cell label="Дворники" keyHint="K" lamp={<Lamp on={wipersActive} tone="green" />}>
              <HwSwitch family={family} on={wipersActive} label="Очиститель лобового стекла" lens="green" onClick={() => { press(); onToggleWipers(); }} />
            </Cell>
            <Cell label="Окно двери" keyHint="O" note={isWindowOpen ? 'опущено' : 'поднято'} lamp={<Lamp on={isWindowOpen} tone="amber" />}>
              <HwSwitch
                family={family}
                on={isWindowOpen}
                label="Стеклоподъёмник"
                onClick={() => {
                  sound.playUseItem();
                  if (onToggleWindow) onToggleWindow();
                  else veh.windowOpen = !veh.windowOpen;
                  setTick((t) => t + 1);
                }}
              />
            </Cell>
            <Cell label="Печка" wide lamp={<Lamp on={heaterMode !== 'off'} tone="amber" />}>
              <HwRotary
                label="Отопитель"
                value={heaterMode}
                options={[
                  { id: 'off', label: '0' },
                  { id: 'low', label: '1' },
                  { id: 'med', label: '2' },
                  { id: 'high', label: '3' },
                ]}
                onSelect={(m) => {
                  sound.playButtonPress();
                  onChangeHeaterMode(m as 'off' | 'low' | 'med' | 'high');
                }}
                spread={60}
              />
            </Cell>
            <Cell label="A/C" lamp={<Lamp on={acActive} tone="blue" />}>
              <HwSwitch family={family} on={acActive} label="Кондиционер" lens="blue" onClick={() => { press(); onToggleAC?.(); }} />
            </Cell>
            <Cell label="Рециркуляция" note={recircActive ? 'салонный воздух' : 'уличный воздух'} lamp={<Lamp on={recircActive} tone="amber" />}>
              <HwSwitch family={family} on={recircActive} label="Рециркуляция воздуха" onClick={() => { press(); onToggleRecirc?.(); }} />
            </Cell>
          </Group>

          <Group title="ДВИГАТЕЛЬ И ТРАНСМИССИЯ">
            <Cell
              label="Стартер"
              keyHint="J"
              note={isEngineRunning ? 'двигатель работает' : isStalled ? 'заглох' : 'двигатель стоит'}
              lamp={<Lamp on={isEngineRunning || isStalled} tone={isStalled && !isEngineRunning ? 'red' : 'green'} blink={isStalled && !isEngineRunning} />}
            >
              <HwPush
                shape="round"
                tone={isEngineRunning ? 'green' : 'plain'}
                glyph="power"
                label="Пуск и остановка двигателя"
                lit={isEngineRunning}
                covered={covered}
                onClick={() => {
                  press();
                  if (onToggleEngine) onToggleEngine();
                  if (navigator.vibrate) navigator.vibrate(25);
                }}
              />
            </Cell>
            {diffCaps.supported && (
              <Cell label="Блокировка диффа" keyHint="V" note={diffLockDesc.toLowerCase()} lamp={<Lamp on={isDiffLocked} tone="red" />}>
                <HwSwitch
                  family={family}
                  on={isDiffLocked}
                  label="Блокировка дифференциала"
                  lens="red"
                  onClick={() => {
                    if (onCycleDiffLock) {
                      onCycleDiffLock();
                    } else {
                      const res = cycleVehicleDiffLock(veh);
                      if (res.isEngaged) sound.playDiffLockEngage();
                      else if (res.changed) sound.playDiffLockDisengage();
                      else sound.playDiffLockWarning();
                    }
                    setTick((t) => t + 1);
                  }}
                />
              </Cell>
            )}
            {veh.hasGBO && (
              <Cell label="Газ / бензин" note={gboOn ? `газ ${Math.round(veh.fuelSystem?.gboLevel ?? 0)}%` : 'бензин'} lamp={<Lamp on={gboOn} tone="green" />}>
                <HwSwitch
                  family={family}
                  on={gboOn}
                  label="Переключатель ГБО"
                  lens="green"
                  onClick={() => {
                    press();
                    if (veh.fuelSystem) veh.fuelSystem.gboActive = !veh.fuelSystem.gboActive;
                    setTick((t) => t + 1);
                  }}
                />
              </Cell>
            )}
            {vehicleHasPto(veh) && (() => {
              const on = isPtoOn(veh);
              const drive = hasPtoDrive(veh);
              const what = isVehicleCraneTruck(veh) ? 'гидронасос крана' : isVehicleVacuumTruck(veh) ? 'вакуум-насос' : 'водонасос';
              return (
                <Cell label="КОМ" note={on && !drive ? 'заведите двигатель' : what} lamp={<Lamp on={drive} tone="green" />}>
                  <HwSwitch
                    family={family === 'guard' ? 'guard' : family}
                    on={on}
                    label={`Коробка отбора мощности: ${what}`}
                    lens="green"
                    onClick={() => {
                      togglePto(veh, player);
                      setTick((t) => t + 1);
                    }}
                  />
                </Cell>
              );
            })()}
          </Group>

          <Group title="ПРИЦЕП">
            <Cell label="Сцепка" keyHint="H" note={veh.trailerId ? 'сцеплен' : 'расцеплен'} lamp={<Lamp on={!!veh.trailerId} tone="green" />}>
              <HwSwitch
                family={family}
                on={!!veh.trailerId}
                label="Тягово-сцепное устройство"
                lens="green"
                onClick={() => {
                  if (onToggleTrailerHitch) onToggleTrailerHitch();
                  else toggleTrailerHitch(veh, world);
                  setTick((t) => t + 1);
                }}
              />
            </Cell>
          </Group>

          {isVehicleVacuumTruck(veh) && tank && (() => {
            const vacBodyId = getVehicleVacuumBodyId(veh);
            const isKo505 = vacBodyId === 'body_vacuum_sludge_ko505';
            const isKo560 = vacBodyId === 'body_vacuum_kombi_ko560';
            const hasPower = hasPtoDrive(veh);
            const bar = tank.vacuumPressureBar ?? 0;
            const step = (field: 'sludgeBoomAngle' | 'sludgeBoomExtension', delta: number) => {
              sound.playHydraulicHiss(0.18);
              if (field === 'sludgeBoomAngle') {
                tank.sludgeBoomAngle = Math.max(-1.35, Math.min(1.35, +((tank.sludgeBoomAngle ?? 0) + delta).toFixed(2)));
              } else {
                tank.sludgeBoomExtension = Math.max(0, Math.min(1, +((tank.sludgeBoomExtension ?? 0.35) + delta).toFixed(2)));
              }
              setTick((t) => t + 1);
            };
            return (
              <Group title="ЦИСТЕРНА">
                <Cell label="Давление" note="бар">
                  <Lcd label="ЦИСТЕРНА" value={`${bar > 0 ? '+' : ''}${bar.toFixed(2)}`} />
                </Cell>
                <Cell label="4-ходовой кран" note="переключается снаружи">
                  <Lcd label="РЕЖИМ" value={(tank.vacuumPumpMode ?? 'suction') === 'suction' ? 'ОТКАЧКА' : 'НАПОР'} />
                </Cell>
                <Cell label="Шибер АНМ-53" note="закрывается снаружи">
                  <Lcd label="ЗАДВИЖКА" value={tank.drainValveOpen ? 'ОТКРЫТ' : 'ЗАКРЫТ'} />
                </Cell>
                {isKo505 && (
                  <>
                    <Cell label="Стрела">
                      <HwPush shape="square" glyph="left" label="Стрела влево" disabled={!hasPower} onClick={() => step('sludgeBoomAngle', -0.22)} />
                      <HwPush shape="square" glyph="right" label="Стрела вправо" disabled={!hasPower} onClick={() => step('sludgeBoomAngle', 0.22)} />
                    </Cell>
                    <Cell label="Вылет">
                      <HwPush shape="square" glyph="minus" label="Вылет меньше" disabled={!hasPower} onClick={() => step('sludgeBoomExtension', -0.18)} />
                      <HwPush shape="square" glyph="plus" label="Вылет больше" disabled={!hasPower} onClick={() => step('sludgeBoomExtension', 0.18)} />
                    </Cell>
                    <Cell label="Заднее днище" note={tank.rearDoorOpen ? 'открыто' : 'закрыто'} lamp={<Lamp on={!!tank.rearDoorOpen} tone="red" />}>
                      <HwSwitch
                        family={family}
                        on={!!tank.rearDoorOpen}
                        label="Заднее днище цистерны"
                        lens="red"
                        disabled={!hasPower && !tank.rearDoorOpen}
                        onClick={() => {
                          sound.playHydraulicHiss(0.32);
                          tank.rearDoorOpen = !tank.rearDoorOpen;
                          setTick((t) => t + 1);
                        }}
                      />
                    </Cell>
                  </>
                )}
                {isKo560 && (
                  <Cell label="Насос ВД" note="РВД" lamp={<Lamp on={!!tank.isJetterPumpActive} tone="green" />}>
                    <HwSwitch
                      family={family}
                      on={!!tank.isJetterPumpActive}
                      label="Насос высокого давления"
                      lens="green"
                      onClick={() => {
                        press();
                        tank.isJetterPumpActive = !tank.isJetterPumpActive;
                        if (tank.isJetterPumpActive) sound.playHydraulicHiss(0.25);
                        setTick((t) => t + 1);
                      }}
                    />
                  </Cell>
                )}
              </Group>
            );
          })()}

          {tank && tank.capacity > 0 && !isVehicleVacuumTruck(veh) && (
            <Group title="ЦИСТЕРНА">
              <Cell
                label={`Слив ${getLiquidNameRu(tank.liquidType)}`}
                note={`${Math.round(tank.currentVolume ?? tank.currentAmount ?? 0)} / ${tank.capacity} л`}
                lamp={<Lamp on={!!tank.drainValveOpen} tone="amber" />}
              >
                <HwSwitch
                  family={family}
                  on={!!tank.drainValveOpen}
                  label="Сливной кран"
                  onClick={() => {
                    press();
                    tank.drainValveOpen = !tank.drainValveOpen;
                    setTick((t) => t + 1);
                  }}
                />
              </Cell>
            </Group>
          )}

          {isVehicleCraneTruck(veh) && (
            <Group title="АВТОКРАН КС-3577 «ИВАНОВЕЦ»">
              <p className="hw-text">
                Краном управляют из поворотной кабины: на неё поднимаются снаружи по лесенке. Гидронасос питает КОМ.
                Давление в системе: {hasPtoDrive(veh) ? '16 МПа' : '0 МПа, КОМ выключена'}. Опоры выдвигают снаружи, на пульте шасси.
              </p>
            </Group>
          )}
        </div>

        <footer className="hw-foot">
          <span>
            Клавиши: <kbd>J L U Y X Z C K O V H</kbd>
          </span>
          <span>Закрыть: <kbd>Esc</kbd></span>
        </footer>
      </div>
    </div>
  );
};
