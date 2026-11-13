import React, { useState, useEffect } from 'react';
import { FuelType, GameWorld, Player } from '../types';
import { FUEL_GRADES } from '../gasStationSystem';
import { CAR_CONFIGS } from '../vehicleHelpers';
import { getPlayerCash } from '../items';
import {
  Fuel,
  Car,
  AlertTriangle,
  CheckCircle2,
  Coins,
  CreditCard,
  Minus,
  Plus,
} from 'lucide-react';
import { sound } from '../audio';
import { ModalShell } from './gameUi';

interface GasStationCashierModalProps {
  isOpen: boolean;
  onClose: () => void;
  world: GameWorld;
  player: Player;
  onPayAndFuel: (pumpId: string, liters: number, fuelType: FuelType, totalCost: number) => void;
}

export const GasStationCashierModal: React.FC<GasStationCashierModalProps> = ({
  isOpen,
  onClose,
  world,
  player,
  onPayAndFuel,
}) => {
  const pumps = world.gasPumps || [];

  const findInitialPumpId = () => {
    const inserted = pumps.find((p) => p.status === 'inserted' && p.connectedVehicleId);
    if (inserted) return inserted.id;
    const held = pumps.find((p) => p.nozzleTaken !== null);
    if (held) return held.id;
    return pumps[0]?.id || 'gas_pump_1';
  };

  const [selectedPumpId, setSelectedPumpId] = useState<string>(findInitialPumpId);
  const [selectedFuelType, setSelectedFuelType] = useState<FuelType>('ai95');
  const [liters, setLiters] = useState<number>(20);

  useEffect(() => {
    if (isOpen) {
      const initId = findInitialPumpId();
      setSelectedPumpId(initId);
      const p = pumps.find((gp) => gp.id === initId);
      if (p) {
        if (p.connectedFuelType) {
          setSelectedFuelType(p.connectedFuelType);
        } else if (p.nozzleTaken) {
          setSelectedFuelType(p.nozzleTaken);
        } else if (p.id === 'gas_pump_5_lpg') {
          setSelectedFuelType('lpg');
        }
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedPump = pumps.find((p) => p.id === selectedPumpId) || pumps[0];
  const connectedVehicle = selectedPump?.connectedVehicleId
    ? world.vehicles.find((v) => v.id === selectedPump.connectedVehicleId) || null
    : null;

  const vehConfig = connectedVehicle
    ? CAR_CONFIGS[connectedVehicle.type] || CAR_CONFIGS.sedan
    : null;

  const isLpgPump =
    selectedPump?.id === 'gas_pump_5_lpg' || selectedFuelType === 'lpg';
  const tankCapacity = isLpgPump
    ? connectedVehicle?.fuelSystem?.gboCapacity || 42
    : connectedVehicle?.fuelSystem?.tankCapacity || 55;
  const currentPercent = isLpgPump
    ? connectedVehicle?.fuelSystem?.gboLevel || 0
    : connectedVehicle?.fuelSystem?.tankLevel || 0;
  const currentLitersInTank = Math.round((currentPercent / 100) * tankCapacity);
  const maxNeededLiters = Math.max(1, Math.round(tankCapacity - currentLitersInTank));

  const activeFuelGrade = FUEL_GRADES[selectedFuelType] || FUEL_GRADES.ai95;
  const totalCost = Math.round(liters * activeFuelGrade.pricePerLiter);
  const playerCash = getPlayerCash(player);
  const canAfford = playerCash >= totalCost;
  const isNozzleReady =
    selectedPump &&
    selectedPump.status === 'inserted' &&
    Boolean(selectedPump.connectedVehicleId);

  const presetLiters = [10, 20, 30, 40, 50];

  return (
    <ModalShell
      id="gas-cashier-modal"
      title="Касса АЗС «НефтьМагистраль» 24/7"
      subtitle="Пульт управления топливораздаточными колонками ТРК №1–5"
      onClose={onClose}
      width={860}
      headRight={
        <span className="gu-chip" title="Наличные средства">
          <Coins className="w-4 h-4" style={{ color: 'var(--gu-amber-hi)' }} />
          <span className="gu-num" style={{ fontSize: 16 }}>
            {playerCash.toLocaleString()} ₽
          </span>
        </span>
      }
      footerHints={[
        ['Клик', 'Выбрать колонку и объем'],
        ['Esc', 'Закрыть кассу'],
      ]}
      footerRight={
        <button type="button" onClick={onClose} className="gu-btn gu-btn-s gu-btn-sm">
          Закрыть
        </button>
      }
    >
      <div className="gu-trk-grid">
        {/* Left Column: Pump Dispenser Selector (ТРК №1..5) */}
        <div className="gu-panel gu-pad" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="gu-row-between">
            <span className="gu-grp">1. Выбор колонки (ТРК)</span>
            <span className="gu-tag">{pumps.length} постов</span>
          </div>

          <div className="gu-trk-pumps">
            {pumps.map((pump) => {
              const isSelected = pump.id === selectedPumpId;
              const veh = pump.connectedVehicleId
                ? world.vehicles.find((v) => v.id === pump.connectedVehicleId)
                : null;
              const vCfg = veh ? CAR_CONFIGS[veh.type] : null;
              const isLpg = pump.id === 'gas_pump_5_lpg';
              const isReady = pump.status === 'inserted' && Boolean(veh);

              return (
                <button
                  key={pump.id}
                  type="button"
                  onClick={() => {
                    sound.playUseItem();
                    setSelectedPumpId(pump.id);
                    if (pump.connectedFuelType) {
                      setSelectedFuelType(pump.connectedFuelType);
                    } else if (pump.nozzleTaken) {
                      setSelectedFuelType(pump.nozzleTaken);
                    } else if (isLpg) {
                      setSelectedFuelType('lpg');
                    }
                  }}
                  className={`gu-trk-pump ${isSelected ? 'is-on' : ''} ${isReady ? 'is-ready' : ''}`}
                >
                  <div className="gu-row" style={{ gap: 8, minWidth: 0 }}>
                    <span className="gu-trk-pump-num">№{pump.pumpNumber}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
                        {isLpg ? 'Газовая колонка (LPG)' : `Колонка ТРК №${pump.pumpNumber}`}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: 'var(--gu-mut)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {veh
                          ? `${vCfg?.name || veh.type} (${FUEL_GRADES[pump.connectedFuelType || 'ai95']?.badgeText})`
                          : pump.status === 'nozzle_held'
                          ? 'Пистолет в руке (не в баке)'
                          : 'Ожидание автомобиля'}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`gu-tag ${
                      pump.isPumping
                        ? 'warn'
                        : isReady
                        ? 'good'
                        : ''
                    }`}
                  >
                    {pump.isPumping
                      ? `${pump.displayLiters.toFixed(1)} л`
                      : isReady
                      ? 'В баке'
                      : 'Свободна'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Vehicle Tank Info + Fuel Grade + Volume + Pay */}
        <div className="gu-panel gu-pad" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 10 }}>
          {/* Connected Vehicle Banner */}
          {connectedVehicle && vehConfig ? (
            <div className="gu-card-sm" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div className="gu-row-between">
                <div className="gu-row" style={{ gap: 8 }}>
                  <Car className="w-4 h-4" style={{ color: 'var(--gu-good)' }} />
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: '#fff' }}>
                    {vehConfig.name}
                  </span>
                  <span className="gu-tag good">Готов к подаче</span>
                </div>
                <span className="gu-num" style={{ fontSize: 12.5, color: 'var(--gu-amber-hi)' }}>
                  В баке: {currentLitersInTank} / {tankCapacity} л ({Math.round(currentPercent)}%)
                </span>
              </div>
              <div className="gu-bar good">
                <span style={{ width: `${Math.min(100, currentPercent)}%` }} />
              </div>
            </div>
          ) : (
            <div className="gu-note warn" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', fontSize: 12 }}>
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                На ТРК №{selectedPump?.pumpNumber} пистолет не вставлен в бак. Сначала снимите пистолет на колонке <b>[E]</b> и вставьте его в горловину авто.
              </span>
            </div>
          )}

          {/* Fuel Grade Selection */}
          <div>
            <div className="gu-row-between" style={{ marginBottom: 5 }}>
              <span className="gu-grp">2. Марка топлива</span>
              <span style={{ fontSize: 12, color: 'var(--gu-amber-hi)', fontWeight: 700 }}>
                {activeFuelGrade.nameRu} · {activeFuelGrade.pricePerLiter.toFixed(2)} ₽/л
              </span>
            </div>

            <div className="gu-trk-grades">
              {(Object.keys(FUEL_GRADES) as FuelType[]).map((ft) => {
                const g = FUEL_GRADES[ft];
                const active = selectedFuelType === ft;
                const lockedByNozzle =
                  selectedPump?.connectedFuelType && selectedPump.connectedFuelType !== ft;
                const incompatibleWithPump =
                  selectedPump?.id === 'gas_pump_5_lpg' ? ft !== 'lpg' : ft === 'lpg';

                return (
                  <button
                    key={ft}
                    type="button"
                    disabled={Boolean(lockedByNozzle || incompatibleWithPump)}
                    onClick={() => {
                      sound.playUseItem();
                      setSelectedFuelType(ft);
                    }}
                    className={`gu-trk-grade ${active ? 'is-on' : ''}`}
                    style={{ '--grade-color': g.color } as React.CSSProperties}
                  >
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{g.badgeText}</span>
                    <span className="gu-num" style={{ fontSize: 12, color: 'var(--gu-amber-hi)' }}>
                      {g.pricePerLiter.toFixed(1)} ₽
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Volume Selection */}
          <div>
            <div className="gu-row-between" style={{ marginBottom: 5 }}>
              <span className="gu-grp">3. Объем заправки</span>
              <div className="gu-row" style={{ gap: 6 }}>
                <button
                  type="button"
                  onClick={() => setLiters(Math.max(5, liters - 5))}
                  className="gu-btn gu-btn-s gu-btn-xs"
                >
                  <Minus className="w-3 h-3" /> 5 л
                </button>
                <span className="gu-num" style={{ fontSize: 16, fontWeight: 700, color: '#fff', minWidth: 48, textAlign: 'center' }}>
                  {liters} л
                </span>
                <button
                  type="button"
                  onClick={() => setLiters(Math.min(120, liters + 5))}
                  className="gu-btn gu-btn-s gu-btn-xs"
                >
                  <Plus className="w-3 h-3" /> 5 л
                </button>
              </div>
            </div>

            <div className="gu-trk-presets">
              {presetLiters.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => {
                    sound.playUseItem();
                    setLiters(val);
                  }}
                  className={`gu-pill ${liters === val ? 'on' : ''}`}
                  style={{ justifyContent: 'center', height: 28 }}
                >
                  {val} л
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  sound.playUseItem();
                  setLiters(connectedVehicle ? maxNeededLiters : 45);
                }}
                className={`gu-pill ${connectedVehicle && liters === maxNeededLiters ? 'on' : ''}`}
                style={{ justifyContent: 'center', height: 28 }}
              >
                Полный ({connectedVehicle ? `${maxNeededLiters}л` : '45л'})
              </button>
            </div>
          </div>

          {/* Total & Pay Footer */}
          <div
            className="gu-row-between"
            style={{
              paddingTop: 8,
              borderTop: '1px solid var(--gu-line)',
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            <div>
              <div style={{ fontSize: 11, color: 'var(--gu-mut)', textTransform: 'uppercase' }}>
                Итого к оплате ({liters} л × {activeFuelGrade.pricePerLiter.toFixed(2)} ₽)
              </div>
              <div className="gu-shop-price" style={{ fontSize: 24 }}>
                {totalCost.toLocaleString()}
                <small>₽</small>
              </div>
            </div>

            <button
              type="button"
              disabled={!isNozzleReady || !canAfford || selectedPump?.isPumping}
              onClick={() => {
                if (!selectedPump) return;
                sound.playUseItem();
                onPayAndFuel(selectedPump.id, liters, selectedFuelType, totalCost);
              }}
              className="gu-btn gu-btn-p"
              style={{ height: 38, padding: '0 16px' }}
            >
              {selectedPump?.isPumping ? (
                <>
                  <Fuel className="w-4 h-4" />
                  <span>Идет заправка...</span>
                </>
              ) : !isNozzleReady ? (
                <span>Сначала вставьте пистолет в бак</span>
              ) : !canAfford ? (
                <span>Недостаточно средств ({totalCost} ₽)</span>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  <span>Оплатить и включить ТРК №{selectedPump?.pumpNumber}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </ModalShell>
  );
};
