import React, { useEffect } from 'react';
import { FuelType, GasPumpDispenser } from '../types';
import { FUEL_GRADES } from '../gasStationSystem';
import { Fuel, Flame, Info } from 'lucide-react';
import { sound } from '../audio';
import { ModalShell } from './gameUi';

interface FuelNozzleSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  pump: GasPumpDispenser | null;
  onSelectNozzle: (fuelType: FuelType) => void;
}

export const FuelNozzleSelectorModal: React.FC<FuelNozzleSelectorModalProps> = ({
  isOpen,
  onClose,
  pump,
  onSelectNozzle,
}) => {
  useEffect(() => {
    if (!isOpen || !pump) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '1' && pump.nozzles[0]) {
        sound.playUseItem();
        onSelectNozzle(pump.nozzles[0].fuelType);
      } else if (e.key === '2' && pump.nozzles[1]) {
        sound.playUseItem();
        onSelectNozzle(pump.nozzles[1].fuelType);
      } else if (e.key === '3' && pump.nozzles[2]) {
        sound.playUseItem();
        onSelectNozzle(pump.nozzles[2].fuelType);
      } else if (e.key === '4' && pump.nozzles[3]) {
        sound.playUseItem();
        onSelectNozzle(pump.nozzles[3].fuelType);
      } else if (e.key === '5' && pump.nozzles[4]) {
        sound.playUseItem();
        onSelectNozzle(pump.nozzles[4].fuelType);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, pump, onSelectNozzle]);

  if (!isOpen || !pump) return null;

  const isLpgStation = pump.id === 'gas_pump_5_lpg';

  return (
    <ModalShell
      id="fuel-nozzle-modal"
      title={isLpgStation ? `Газовая колонка №${pump.pumpNumber} (LPG)` : `Колонка ТРК №${pump.pumpNumber}`}
      subtitle={
        isLpgStation
          ? 'Раздаточная колонка сжиженного углеводородного газа (Пропан-Бутан)'
          : 'Топливораздаточная колонка · Выберите марку топлива и снимите пистолет'
      }
      onClose={onClose}
      width={560}
      headRight={
        <span className={`gu-tag ${pump.status === 'idle' ? 'good' : 'warn'}`}>
          {pump.status === 'idle'
            ? 'Готова к работе'
            : pump.status === 'nozzle_held'
            ? 'Пистолет снят'
            : pump.status === 'inserted'
            ? 'Пистолет в баке'
            : 'Подача топлива'}
        </span>
      }
      footerHints={[
        ['1–5', 'Быстрый выбор пистолета'],
        ['Esc', 'Отойти от колонки'],
      ]}
      footerRight={
        <button type="button" onClick={onClose} className="gu-btn gu-btn-s gu-btn-sm">
          Отмена
        </button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="gu-nozzle-list">
          {pump.nozzles.map((nozzle, index) => {
            const grade = FUEL_GRADES[nozzle.fuelType];
            const isLpg = nozzle.fuelType === 'lpg';
            const isDiesel = nozzle.fuelType === 'diesel';

            return (
              <button
                key={nozzle.fuelType}
                type="button"
                onClick={() => {
                  sound.playUseItem();
                  onSelectNozzle(nozzle.fuelType);
                }}
                className="gu-nozzle-row"
                style={{ '--nozzle-color': nozzle.color } as React.CSSProperties}
              >
                <span className="gu-k">[{index + 1}]</span>

                <div
                  className="gu-nozzle-badge"
                  style={{ '--nozzle-color': nozzle.color } as React.CSSProperties}
                >
                  {nozzle.badgeText}
                </div>

                <div className="gu-nozzle-main">
                  <div className="gu-row" style={{ gap: 6 }}>
                    <span className="gu-nozzle-name">{nozzle.nameRu}</span>
                    <span className="gu-tag" style={{ height: 18, padding: '0 6px', fontSize: 10 }}>
                      {isLpg ? 'ГБО Пропан' : isDiesel ? 'Цетан 55' : `Октан ${nozzle.octane}`}
                    </span>
                  </div>
                  <div className="gu-nozzle-sub" title={grade?.engineCompatibility || nozzle.description}>
                    {grade?.engineCompatibility || nozzle.description}
                  </div>
                </div>

                <div className="gu-nozzle-right">
                  <div className="gu-shop-price" style={{ fontSize: 18 }}>
                    {nozzle.pricePerLiter.toFixed(2)}
                    <small>₽/л</small>
                  </div>

                  <span className="gu-btn gu-btn-p gu-btn-sm" style={{ height: 28, padding: '0 10px' }}>
                    {isLpg ? <Flame className="w-3.5 h-3.5" /> : <Fuel className="w-3.5 h-3.5" />}
                    <span>Снять</span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div
          className="gu-note"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 10px',
            fontSize: 11.5,
          }}
        >
          <Info className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--gu-amber-hi)' }} />
          <span>
            Снимите пистолет, подойдите к лючку бензобака автомобиля и нажмите <b>[E]</b>, затем оплатите литраж на кассе АЗС.
          </span>
        </div>
      </div>
    </ModalShell>
  );
};
