import React, { useState } from 'react';
import { Player, BodyPartsMap, Injury } from '../types';
import { getDetailedBodySensations, getBodyPartLabel, getBodyPartStatusText } from '../sensations';
import { getMedicationRemainingSeconds } from '../medicineSystem';
import { useItemOnPlayer } from '../items';
import { ModalShell } from './gameUi';
import { sound } from '../audio';
import { Activity, Heart, ShieldCheck, Pill } from 'lucide-react';

interface SelfInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player | null;
}

export const SelfInspectionModal: React.FC<SelfInspectionModalProps> = ({
  isOpen,
  onClose,
  player
}) => {
  const [selectedPart, setSelectedPart] = useState<keyof BodyPartsMap>('torso');
  const [selectedInjuryId, setSelectedInjuryId] = useState<string | null>(null);
  const [, setTick] = useState(0);

  if (!isOpen || !player || !player.bodyState) return null;

  const bs = player.bodyState;
  const detailed = getDetailedBodySensations(player);

  const getPartColor = (partKey: keyof BodyPartsMap) => {
    const part = bs.bodyParts[partKey];
    const injuries = Array.isArray(part) ? part : ((part as any)?.injuries || []);
    if (!injuries || injuries.length === 0) return { fill: '#059669', stroke: '#10b981', pulse: false };
    if (injuries.some(i => i.type === 'fracture' && !i.treated)) return { fill: '#7f1d1d', stroke: '#ef4444', pulse: true };
    if (injuries.some(i => i.type === 'burn' && !i.treated)) {
      const maxDeg = Math.max(...injuries.filter(i => i.type === 'burn' && !i.treated).map(b => b.burnDegree || 1));
      return maxDeg >= 2 ? { fill: '#991b1b', stroke: '#ef4444', pulse: true } : { fill: '#c2410c', stroke: '#fb923c', pulse: true };
    }
    if (injuries.some(i => i.type === 'bleeding' && !i.treated)) return { fill: '#dc2626', stroke: '#ef4444', pulse: true };
    if (injuries.some(i => i.type === 'sprain' && !i.treated)) return { fill: '#ea580c', stroke: '#f97316', pulse: false };
    if (injuries.some(i => i.type === 'fracture' && i.treated)) return { fill: '#9f1239', stroke: '#fb7185', pulse: false };
    if (injuries.some(i => i.type === 'burn' && i.treated)) return { fill: '#b45309', stroke: '#f59e0b', pulse: false };
    if (injuries.some(i => (i.type === 'bruise' || i.type === 'abrasion') && !i.treated)) return { fill: '#d97706', stroke: '#f59e0b', pulse: false };
    return { fill: '#059669', stroke: '#10b981', pulse: false };
  };

  const getPartBadgeClass = (injuries: Injury[]) => {
    if (!injuries || injuries.length === 0) return 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60';
    if (injuries.some(i => (i.type === 'fracture' || i.type === 'bleeding') && !i.treated)) return 'bg-red-950/95 text-red-200 border-red-600 animate-pulse';
    if (injuries.some(i => i.type === 'burn' && !i.treated)) return 'bg-orange-950/95 text-orange-200 border-orange-600 animate-pulse';
    if (injuries.some(i => i.type === 'sprain' && !i.treated)) return 'bg-orange-950/80 text-orange-300 border-orange-700/60';
    if (injuries.some(i => !i.treated)) return 'bg-amber-950/80 text-amber-300 border-amber-700/60';
    return 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60';
  };

  const getInjuryTypeName = (injury: Injury) => {
    switch (injury.type) {
      case 'bruise': return 'Глубокий ушиб';
      case 'sprain': return 'Растяжение связок';
      case 'fracture': return 'Перелом кости';
      case 'bleeding': return 'Артериальное / венозное кровотечение';
      case 'abrasion': return 'Ссадина и рана';
      case 'burn': {
        const deg = injury.burnDegree || 1;
        return `Термический ожог (${deg}-я степень)`;
      }
      default: return injury.type;
    }
  };

  const currentPartRaw = bs.bodyParts[selectedPart];
  const currentInjuries: Injury[] = Array.isArray(currentPartRaw) ? currentPartRaw : ((currentPartRaw as any)?.injuries || []);
  const currentPartPain = !Array.isArray(currentPartRaw) ? ((currentPartRaw as any)?.pain ?? 0) : 0;

  // Find med items in inventory
  const findItemIndex = (itemId: string) => {
    return player.inventory?.findIndex(i => i && i.itemId === itemId) ?? -1;
  };

  const bandageIdx = findItemIndex('bandage');
  const splintIdx = findItemIndex('splint');
  const painkillersIdx = findItemIndex('painkillers');
  const medkitIdx = findItemIndex('medkit');

  const handleUseMedItem = (idx: number) => {
    if (idx >= 0) {
      useItemOnPlayer(player, idx, undefined, selectedInjuryId || undefined);
      sound.playUseItem();
    }
  };

  const selectPart = (part: keyof BodyPartsMap) => {
    setSelectedPart(part);
    setSelectedInjuryId(null);
  };

  const activeMeds = bs.activeMedications || [];

  const getCompatibleInventoryItems = (injury: Injury) => {
    if (!player.inventory || injury.treated) return [];
    
    return player.inventory
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) => {
        if (!item) return false;
        const id = item.itemId;
        if (id === 'splint') return injury.type === 'fracture';
        if (id === 'panthenol_spray') return injury.type === 'burn' || injury.type === 'abrasion';
        if (id === 'spasatel_ointment') return injury.type === 'burn' || injury.type === 'abrasion' || injury.type === 'bruise';
        if (id === 'zelenka') return injury.type === 'abrasion' || injury.type === 'bleeding' || injury.type === 'bruise' || injury.type === 'burn';
        if (id === 'iodine') return injury.type === 'abrasion' || injury.type === 'bruise' || injury.type === 'sprain';
        if (id === 'diclofenac_gel') return injury.type === 'sprain' || injury.type === 'bruise' || injury.type === 'fracture';
        if (id === 'hydrogen_peroxide') return injury.type === 'bleeding' || injury.type === 'abrasion';
        if (id === 'bandage') return injury.type === 'bleeding' || injury.type === 'abrasion' || injury.type === 'bruise' || injury.type === 'burn' || injury.type === 'sprain';
        if (id === 'medical_patch') return injury.type === 'abrasion' || injury.type === 'bruise' || injury.type === 'burn';
        if (id === 'antiseptic') return injury.type === 'abrasion' || injury.type === 'bleeding' || injury.type === 'bruise' || injury.type === 'burn';
        return false;
      });
  };

  const handleApplyToInjury = (itemIdx: number, injuryId: string) => {
    useItemOnPlayer(player, itemIdx, undefined, injuryId);
    sound.playUseItem();
    setTick(t => t + 1);
  };

  return (
    <ModalShell
      id="self-inspection-modal"
      title="Клинический самоосмотр"
      subtitle="Анатомическая карта травм, болевой порог и мониторинг медикаментов"
      width={1060}
      tall
      onClose={onClose}
      headRight={
        <span className="gu-tag amber">Клавиша C</span>
      }
      footerHints={[['Клик', 'Осмотреть конечность'], ['Esc', 'Закрыть']]}
      footerRight={
        <button type="button" onClick={onClose} className="gu-btn gu-btn-s gu-btn-sm">
          Закрыть
        </button>
      }
    >
      <div className="gu-inspect-grid">
        {/* COLUMN 1: Interactive Anatomy Silhouette */}
        <div className="gu-card" style={{ alignItems: 'center' }}>
          <div className="gu-sec" style={{ width: '100%', marginTop: 0 }}>
            <span>Карта тела</span>
            <span className="gu-sec-sub">клик по зоне</span>
          </div>

          <div className="relative w-44 h-64 flex items-center justify-center my-2">
            <svg viewBox="0 0 100 160" className="w-full h-full drop-shadow-md">
              <circle
                cx="50" cy="18" r="12"
                fill={getPartColor('head').fill}
                stroke={selectedPart === "head" ? "#e0ab45" : getPartColor('head').stroke}
                strokeWidth={selectedPart === "head" ? "2.5" : "1.5"}
                className={`cursor-pointer transition-all hover:opacity-80 ${getPartColor('head').pulse ? 'animate-pulse' : ''}`}
                onClick={() => selectPart('head')}
              />
              <rect
                x="36" y="34" width="28" height="46" rx="6"
                fill={getPartColor('torso').fill}
                stroke={selectedPart === "torso" ? "#e0ab45" : getPartColor('torso').stroke}
                strokeWidth={selectedPart === "torso" ? "2.5" : "1.5"}
                className={`cursor-pointer transition-all hover:opacity-80 ${getPartColor('torso').pulse ? 'animate-pulse' : ''}`}
                onClick={() => selectPart('torso')}
              />
              <rect
                x="18" y="36" width="14" height="44" rx="5"
                fill={getPartColor('leftArm').fill}
                stroke={selectedPart === "leftArm" ? "#e0ab45" : getPartColor('leftArm').stroke}
                strokeWidth={selectedPart === "leftArm" ? "2.5" : "1.5"}
                className={`cursor-pointer transition-all hover:opacity-80 ${getPartColor('leftArm').pulse ? 'animate-pulse' : ''}`}
                onClick={() => selectPart('leftArm')}
              />
              <rect
                x="68" y="36" width="14" height="44" rx="5"
                fill={getPartColor('rightArm').fill}
                stroke={selectedPart === "rightArm" ? "#e0ab45" : getPartColor('rightArm').stroke}
                strokeWidth={selectedPart === "rightArm" ? "2.5" : "1.5"}
                className={`cursor-pointer transition-all hover:opacity-80 ${getPartColor('rightArm').pulse ? 'animate-pulse' : ''}`}
                onClick={() => selectPart('rightArm')}
              />
              <rect
                x="36" y="84" width="12" height="58" rx="5"
                fill={getPartColor('leftLeg').fill}
                stroke={selectedPart === "leftLeg" ? "#e0ab45" : getPartColor('leftLeg').stroke}
                strokeWidth={selectedPart === "leftLeg" ? "2.5" : "1.5"}
                className={`cursor-pointer transition-all hover:opacity-80 ${getPartColor('leftLeg').pulse ? 'animate-pulse' : ''}`}
                onClick={() => selectPart('leftLeg')}
              />
              <rect
                x="52" y="84" width="12" height="58" rx="5"
                fill={getPartColor('rightLeg').fill}
                stroke={selectedPart === "rightLeg" ? "#e0ab45" : getPartColor('rightLeg').stroke}
                strokeWidth={selectedPart === "rightLeg" ? "2.5" : "1.5"}
                className={`cursor-pointer transition-all hover:opacity-80 ${getPartColor('rightLeg').pulse ? 'animate-pulse' : ''}`}
                onClick={() => selectPart('rightLeg')}
              />
            </svg>
          </div>

          <div className="gu-grid gu-g3" style={{ width: '100%', gap: 6 }}>
            {(['head', 'torso', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'] as const).map(p => (
              <button
                key={p}
                type="button"
                onClick={() => selectPart(p)}
                className={`gu-btn gu-btn-xs ${selectedPart === p ? 'gu-btn-p' : ''}`}
              >
                {getBodyPartLabel(p)}
              </button>
            ))}
          </div>
        </div>

        {/* COLUMN 2: Selected Part Injuries & Pharmacokinetics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="gu-card">
            <div className="gu-row-between">
              <span className="gu-card-t">{getBodyPartLabel(selectedPart)}</span>
              <span className={`gu-tag ${currentInjuries.length === 0 ? 'good' : 'bad'}`}>
                {getBodyPartStatusText(currentInjuries)}
              </span>
            </div>

            {currentPartPain > 0 && (
              <div className="gu-card-sm" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span className="gu-mute">Локальная боль:</span>
                <span className="gu-mono" style={{ color: '#efa690', fontWeight: 700 }}>{Math.round(currentPartPain)}%</span>
              </div>
            )}

            <div className="gu-sec" style={{ marginTop: 4 }}>
              <span>Диагностированные травмы</span>
              <span className="gu-sec-sub">{currentInjuries.length} шт.</span>
            </div>

            {currentInjuries.length === 0 ? (
              <div className="gu-note gu-ok" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Ткани и кости в норме. Повреждений нет.</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
                {currentInjuries.map(injury => (
                  <div
                    key={injury.id}
                    onClick={() => setSelectedInjuryId(injury.id)}
                    className={`gu-item ${selectedInjuryId === injury.id ? 'on' : ''}`}
                    style={{ flexDirection: 'column', alignItems: 'stretch', cursor: 'pointer' }}
                  >
                    <div className="gu-row-between">
                      <span className="gu-item-title">{getInjuryTypeName(injury)}</span>
                      <span className={`gu-tag ${injury.treated ? 'good' : 'bad'}`}>
                        {injury.treated ? 'Обработано' : 'Острая фаза'}
                      </span>
                    </div>
                    <div className="gu-item-sub">
                      {!injury.treated
                        ? (injury.type === 'fracture' ? 'Требуется наложение шины' : injury.type === 'bleeding' ? 'Требуется тугая повязка / бинт' : injury.type === 'burn' ? 'Требуется Пантенол / Спасатель' : 'Рекомендуется обработка')
                        : 'Повязка/мазь нанесена. Идёт постепенное заживление'}
                    </div>

                    {!injury.treated && (
                      <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--gu-line)' }} onClick={e => e.stopPropagation()}>
                        <div className="gu-mute" style={{ fontSize: 11, marginBottom: 6 }}>Доступные средства в инвентаре:</div>
                        {getCompatibleInventoryItems(injury).length === 0 ? (
                          <span className="gu-mute" style={{ fontSize: 11, fontStyle: 'italic' }}>Нет подходящих медикаментов в рюкзаке</span>
                        ) : (
                          <div className="gu-row" style={{ flexWrap: 'wrap', gap: 6 }}>
                            {getCompatibleInventoryItems(injury).map(({ item, idx }) => (
                              <button
                                key={`${item.itemId}_${idx}`}
                                type="button"
                                onClick={() => handleApplyToInjury(idx, injury.id)}
                                className="gu-btn gu-btn-p gu-btn-xs"
                              >
                                {item.nameRu}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Pharmacokinetics */}
          <div className="gu-card">
            <div className="gu-sec" style={{ marginTop: 0 }}>
              <span className="gu-row" style={{ gap: 6 }}>
                <Pill className="w-3.5 h-3.5" /> Активные медикаменты
              </span>
              <span className="gu-sec-sub">{activeMeds.length} в крови</span>
            </div>

            {activeMeds.length === 0 ? (
              <div className="gu-card-sm gu-mute" style={{ fontSize: 12, textAlign: 'center' }}>
                Медикаменты не принимались. Всасывание отсутствует.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 150, overflowY: 'auto' }}>
                {activeMeds.map(med => (
                  <div key={med.id} className="gu-card-sm">
                    <div className="gu-row-between" style={{ fontSize: 12, fontWeight: 700 }}>
                      <span>{med.nameRu || (med as any).name || 'Медикамент'}</span>
                      <span className="gu-tag amber">
                        {med.phase === 'absorption' ? 'Всасывание' : med.phase === 'peak' ? 'Пик' : med.phase === 'action' ? 'Терапия' : 'Выведение'}
                      </span>
                    </div>
                    <div className="gu-row-between gu-mute" style={{ fontSize: 11, marginTop: 4, marginBottom: 4 }}>
                      <span>Эффективность: {Math.round(med.currentEffectiveness * 100)}%</span>
                      <span className="gu-mono">{getMedicationRemainingSeconds(med)} сек</span>
                    </div>
                    <div className="gu-bar">
                      <span style={{ width: `${Math.round(med.currentEffectiveness * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* COLUMN 3: Vitals, Shock & Clinical Verdict */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="gu-card">
            <div className="gu-sec" style={{ marginTop: 0 }}>
              <span className="gu-row" style={{ gap: 6 }}>
                <Activity className="w-3.5 h-3.5" /> Порог боли и шок
              </span>
              <span className="gu-mono" style={{ fontSize: 12 }}>
                {Math.round(bs.effectivePain || bs.painLevel)} / 100
              </span>
            </div>

            <div className="gu-bar bad">
              <span style={{ width: `${Math.min(100, Math.max(0, bs.effectivePain || bs.painLevel))}%` }} />
            </div>

            <div className="gu-kv-grid" style={{ marginTop: 8 }}>
              <div className="gu-kv">
                <div className="gu-kv-k">Травм. шок</div>
                <div className="gu-kv-v gu-mono">{Math.round(bs.shockLevel || 0)}%</div>
              </div>
              <div className="gu-kv">
                <div className="gu-kv-k">Паника</div>
                <div className="gu-kv-v gu-mono">{Math.round(bs.panicLevel || 0)}%</div>
              </div>
            </div>
          </div>

          <div className="gu-card">
            <div className="gu-sec" style={{ marginTop: 0 }}>
              <span className="gu-row" style={{ gap: 6 }}>
                <Heart className="w-3.5 h-3.5" /> Клинический вердикт
              </span>
            </div>
            <div className="gu-card-sm" style={{ fontSize: 12, lineHeight: 1.5 }}>
              {detailed.overallSensorySummary || detailed.healthText}
            </div>
            <div className="gu-mute" style={{ fontSize: 11 }}>
              Применяйте бинты, шины и мази напрямую из списка травм или из инвентаря.
            </div>
          </div>
        </div>
      </div>
    </ModalShell>
  );
};

