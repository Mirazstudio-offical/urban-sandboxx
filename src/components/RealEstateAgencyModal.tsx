import React, { useState, useEffect } from 'react';
import {
  FileText,
  Key as KeyIcon,
  CheckCircle2,
  Coins,
  ShieldCheck,
  MapPin,
  Check,
  Search,
  ChevronLeft,
  Navigation
} from 'lucide-react';
import { Player } from '../types';
import { PropertyApartment, getCityApartments, purchaseApartment } from '../propertySystem';
import { getPlayerCash } from '../items';
import { ModalShell, Seg } from './gameUi';
import { sound } from '../audio';

interface RealEstateAgencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player;
  onSetGpsDestination?: (dest: { x: number; y: number; name?: string } | null) => void;
  world?: any;
  onPropertyPurchased?: () => void;
}

type PropertyFilter = 'all' | 'panel' | 'brick' | 'modern' | 'suburban' | 'owned';

const PROPERTY_FILTERS: { id: PropertyFilter; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'panel', label: 'Панель' },
  { id: 'brick', label: 'Сталинка' },
  { id: 'modern', label: 'ЖК' },
  { id: 'suburban', label: 'Коттедж' },
  { id: 'owned', label: 'Мои' }
];

export const RealEstateAgencyModal: React.FC<RealEstateAgencyModalProps> = ({
  isOpen,
  onClose,
  player,
  onSetGpsDestination,
  world,
  onPropertyPurchased
}) => {
  const apartments = getCityApartments();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<PropertyFilter>('all');
  const [selectedAptId, setSelectedAptId] = useState<string>(() => apartments[0]?.id || '');
  const [buyerName, setBuyerName] = useState<string>('Иванов Иван Иванович');
  const [purchaseStep, setPurchaseStep] = useState<'inspect' | 'contract' | 'success'>('inspect');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [purchasedApt, setPurchasedApt] = useState<PropertyApartment | null>(null);
  const [gpsPinnedId, setGpsPinnedId] = useState<string | null>(null);
  const [narrowPane, setNarrowPane] = useState<'list' | 'detail'>('list');

  const filteredApartments = apartments.filter(apt => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      apt.address.toLowerCase().includes(q) ||
      apt.roomsLabel.toLowerCase().includes(q) ||
      apt.buildingNameRu.toLowerCase().includes(q);
    if (!matchesSearch) return false;

    if (activeFilter === 'all') return true;
    if (activeFilter === 'owned') return apt.isOwned;
    if (activeFilter === 'panel') return apt.buildingType === 'panel_apartment';
    if (activeFilter === 'brick') return apt.buildingType === 'brick_residential';
    if (activeFilter === 'modern') return apt.buildingType === 'modern_residential';
    if (activeFilter === 'suburban') return apt.buildingType === 'suburban';
    return true;
  });

  const currentApt =
    filteredApartments.find(a => a.id === selectedAptId) ||
    filteredApartments[0] ||
    apartments[0] ||
    null;

  useEffect(() => {
    if (currentApt && currentApt.id !== selectedAptId) {
      setSelectedAptId(currentApt.id);
    }
  }, [currentApt?.id, selectedAptId]);

  if (!isOpen) return null;

  const playerCash = getPlayerCash(player);
  const feesTotal = currentApt ? currentApt.stateDutyRub + currentApt.notaryFeeRub : 0;
  const totalCost = currentApt ? currentApt.priceRub + feesTotal : 0;
  const canAfford = playerCash >= totalCost;
  const cashAfterDeal = playerCash - totalCost;

  const handleStartContract = () => {
    if (!currentApt || !canAfford || currentApt.isOwned) return;
    sound.playUseItem();
    setStatusMessage('');
    setPurchaseStep('contract');
  };

  const handleConfirmPurchase = () => {
    if (!currentApt || !canAfford) return;
    const res = purchaseApartment(
      player,
      currentApt,
      buyerName.trim() || 'Иванов Иван Иванович',
      world
    );
    if (res.success) {
      sound.playUseItem();
      setPurchasedApt(currentApt);
      setPurchaseStep('success');
      setStatusMessage('');
      onPropertyPurchased?.();
    } else {
      setStatusMessage(res.message);
    }
  };

  const handleSetGps = (apt: PropertyApartment | null) => {
    if (!apt || !onSetGpsDestination) return;
    const bld = world?.buildings?.find((b: any) => b.id === apt.buildingId);
    if (bld) {
      onSetGpsDestination({
        x: bld.x + bld.width / 2,
        y: bld.y + bld.height / 2,
        name: apt.address
      });
    } else if (apt.entranceWorldX && apt.entranceWorldY) {
      onSetGpsDestination({
        x: apt.entranceWorldX,
        y: apt.entranceWorldY,
        name: apt.address
      });
    } else {
      onSetGpsDestination({
        x: 4920,
        y: 4440,
        name: apt.address
      });
    }
    sound.playUseItem();
    setGpsPinnedId(apt.id);
  };

  const handleResetAndClose = () => {
    setPurchaseStep('inspect');
    setStatusMessage('');
    onClose();
  };

  const modalSubtitle =
    purchaseStep === 'contract'
      ? 'Нотариальное оформление договора купли-продажи'
      : purchaseStep === 'success'
      ? 'Регистрация права собственности в ЕГРН'
      : 'Городской реестр недвижимости и оформление права собственности';

  const footerHints: [string, string][] =
    purchaseStep === 'inspect'
      ? [
          ['Клик', 'Выбрать объект'],
          ['Esc', 'Закрыть']
        ]
      : [['Esc', 'Закрыть']];

  return (
    <ModalShell
      id="real-estate-modal"
      title="Агентство недвижимости"
      subtitle={modalSubtitle}
      width={1080}
      tall
      wipeKey={purchaseStep}
      onClose={handleResetAndClose}
      headRight={
        <div className="gu-chip" title="Наличные средства">
          <Coins size={15} strokeWidth={1.75} color="#e0ab45" />
          <span
            style={{
              fontWeight: 700,
              color: '#e9e6df',
              fontVariantNumeric: 'tabular-nums'
            }}
          >
            {playerCash.toLocaleString('ru-RU')} ₽
          </span>
        </div>
      }
      footerHints={footerHints}
      footerRight={
        purchaseStep === 'contract' ? (
          <button
            type="button"
            onClick={() => {
              setPurchaseStep('inspect');
              setStatusMessage('');
            }}
            className="gu-btn gu-btn-s gu-btn-sm"
          >
            <ChevronLeft size={15} strokeWidth={1.75} />
            <span>К списку объектов</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleResetAndClose}
            className="gu-btn gu-btn-s gu-btn-sm"
          >
            Закрыть
          </button>
        )
      }
    >
      {/* ==================== STEP 3: SUCCESS ==================== */}
      {purchaseStep === 'success' && purchasedApt ? (
        <div className="gu-re-success">
          <div className="gu-re-success-mark">
            <ShieldCheck size={28} strokeWidth={1.75} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxWidth: 560 }}>
            <div className="gu-cn" style={{ fontSize: 28, fontWeight: 700, color: '#fff', lineHeight: 1.1 }}>
              Право собственности зарегистрировано
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--gu-mut)', fontVariantNumeric: 'tabular-nums' }}>
              {purchasedApt.address} · ЕГРН {purchasedApt.cadastralNumber}
            </div>
          </div>

          <div className="gu-re-success-docs">
            <div className="gu-row-between" style={{ paddingBottom: 8, borderBottom: '1px solid var(--gu-line)' }}>
              <span className="gu-grp">Переданные ключи и документы</span>
              <span style={{ fontSize: 12, color: 'var(--gu-good)', fontWeight: 600 }}>
                Добавлено в инвентарь
              </span>
            </div>
            <ul className="gu-re-docs-grid">
              <li className="gu-re-doc-item">
                <KeyIcon size={15} strokeWidth={1.75} color="#e0ab45" style={{ flex: 'none' }} />
                <span>Основной ключ · код {purchasedApt.lockCode}</span>
              </li>
              <li className="gu-re-doc-item">
                <KeyIcon size={15} strokeWidth={1.75} color="#e0ab45" style={{ flex: 'none' }} />
                <span>Дубликат ключа в опечатанном пенале</span>
              </li>
              <li className="gu-re-doc-item">
                <FileText size={15} strokeWidth={1.75} color="#9ac985" style={{ flex: 'none' }} />
                <span>Выписка из ЕГРН · {purchasedApt.cadastralNumber}</span>
              </li>
              <li className="gu-re-doc-item">
                <FileText size={15} strokeWidth={1.75} color="#9ac985" style={{ flex: 'none' }} />
                <span>Нотариальный договор купли-продажи</span>
              </li>
              <li className="gu-re-doc-item">
                <FileText size={15} strokeWidth={1.75} color="#a29e93" style={{ flex: 'none' }} />
                <span>Технический паспорт помещения БТИ</span>
              </li>
            </ul>
          </div>

          <div className="gu-row" style={{ gap: 10 }}>
            {onSetGpsDestination && (
              <button
                type="button"
                onClick={() => handleSetGps(purchasedApt)}
                className="gu-btn gu-btn-s"
              >
                <Navigation size={15} strokeWidth={1.75} />
                <span>{gpsPinnedId === purchasedApt.id ? 'Маршрут проложен' : 'Проложить GPS маршрут'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleResetAndClose}
              className="gu-btn gu-btn-p"
            >
              Завершить оформление
            </button>
          </div>
        </div>
      ) : purchaseStep === 'contract' && currentApt ? (
        /* ==================== STEP 2: CONTRACT ==================== */
        <div className="gu-re-contract">
          {/* Left Panel: Buyer & Object Details */}
          <div className="gu-re-panel">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="gu-row-between" style={{ paddingBottom: 8, borderBottom: '1px solid var(--gu-line)' }}>
                <span className="gu-grp">Договор купли-продажи</span>
                <span style={{ fontSize: 12, color: 'var(--gu-mut)', fontVariantNumeric: 'tabular-nums' }}>
                  Кадастр {currentApt.cadastralNumber}
                </span>
              </div>

              <div>
                <label className="gu-lbl" htmlFor="re-buyer-name" style={{ display: 'block' }}>
                  ФИО собственника для внесения в ЕГРН
                </label>
                <input
                  id="re-buyer-name"
                  type="text"
                  value={buyerName}
                  maxLength={60}
                  onChange={e => setBuyerName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key !== 'Escape') e.stopPropagation();
                  }}
                  className="gu-inp"
                  style={{ height: 42, fontSize: 15 }}
                  placeholder="Фамилия Имя Отчество"
                />
                <div style={{ fontSize: 12, color: 'var(--gu-mut)', marginTop: 6 }}>
                  Указывается в выписке из реестра и нотариальном договоре
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span className="gu-grp">Сведения об объекте</span>
              <div className="gu-kv-grid">
                <div className="gu-kv">
                  <span className="gu-kv-k">Адрес</span>
                  <span className="gu-kv-v" title={currentApt.address} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {currentApt.address}
                  </span>
                </div>
                <div className="gu-kv">
                  <span className="gu-kv-k">Общая площадь</span>
                  <span className="gu-kv-v">{currentApt.areaSqM} м² · {currentApt.roomsCount} комн.</span>
                </div>
                <div className="gu-kv">
                  <span className="gu-kv-k">Этаж</span>
                  <span className="gu-kv-v">{currentApt.floor + 1} из {currentApt.totalBuildingFloors}</span>
                </div>
                <div className="gu-kv">
                  <span className="gu-kv-k">Материал стен</span>
                  <span className="gu-kv-v" title={currentApt.wallMaterial} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {currentApt.wallMaterial}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel: Financial Ledger & Sign CTA */}
          <div className="gu-re-panel">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="gu-row-between" style={{ paddingBottom: 8, borderBottom: '1px solid var(--gu-line)' }}>
                <span className="gu-grp">Финансовая смета</span>
                <span style={{ fontSize: 12, color: canAfford ? 'var(--gu-good)' : '#efa690', fontWeight: 600 }}>
                  {canAfford ? 'Средств достаточно' : 'Недостаточно средств'}
                </span>
              </div>

              <div className="gu-re-ledger">
                <div className="gu-re-ledger-row">
                  <span className="gu-mut">Стоимость объекта</span>
                  <span style={{ fontWeight: 600, color: '#fff' }}>
                    {currentApt.priceRub.toLocaleString('ru-RU')} ₽
                  </span>
                </div>
                <div className="gu-re-ledger-row">
                  <span className="gu-mut">Госпошлина Росреестра</span>
                  <span style={{ color: 'var(--gu-ink-dim)' }}>
                    {currentApt.stateDutyRub.toLocaleString('ru-RU')} ₽
                  </span>
                </div>
                <div className="gu-re-ledger-row">
                  <span className="gu-mut">Нотариальный тариф</span>
                  <span style={{ color: 'var(--gu-ink-dim)' }}>
                    {currentApt.notaryFeeRub.toLocaleString('ru-RU')} ₽
                  </span>
                </div>
                <div className="gu-re-ledger-row is-total">
                  <span style={{ fontWeight: 600, color: '#fff' }}>Итого к оплате</span>
                  <span className="gu-re-total-val">{totalCost.toLocaleString('ru-RU')} ₽</span>
                </div>
                <div className="gu-re-ledger-row">
                  <span className="gu-mut">Остаток после сделки</span>
                  <span style={{ fontWeight: 600, color: cashAfterDeal >= 0 ? 'var(--gu-good)' : '#efa690' }}>
                    {cashAfterDeal.toLocaleString('ru-RU')} ₽
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {statusMessage && (
                <div className="gu-note gu-err" style={{ padding: '8px 12px', fontSize: 12.5 }}>
                  {statusMessage}
                </div>
              )}

              <button
                type="button"
                onClick={handleConfirmPurchase}
                disabled={!canAfford}
                className="gu-btn gu-btn-p gu-btn-block"
              >
                <ShieldCheck size={16} strokeWidth={1.75} />
                <span>Подписать договор и оплатить</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ==================== STEP 1: CATALOG & DOSSIER ==================== */
        <>
          <div className="gu-re-tabs-narrow">
            <Seg
              full
              value={narrowPane}
              onChange={setNarrowPane}
              options={[
                { v: 'list', label: `Каталог · ${filteredApartments.length}` },
                { v: 'detail', label: 'Карточка объекта' }
              ]}
            />
          </div>

          <div className="gu-re-layout">
            {/* LEFT COLUMN: Filterable & Scrollable Property List (ONLY scrollable region) */}
            <div className={`gu-re-side ${narrowPane !== 'list' ? 'is-narrow-hidden' : ''}`}>
              <div className="gu-re-side-head">
                <span className="gu-grp">Объекты в реестре</span>
                <span style={{ fontSize: 12, color: 'var(--gu-mut)', fontVariantNumeric: 'tabular-nums' }}>
                  {filteredApartments.length} из {apartments.length}
                </span>
              </div>

              <div className="gu-search gu-re-search">
                <Search size={15} strokeWidth={1.75} color="#a29e93" style={{ flex: 'none' }} />
                <input
                  type="text"
                  placeholder="Адрес, комнаты или дом"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => {
                    if (e.key !== 'Escape') e.stopPropagation();
                  }}
                />
              </div>

              <div className="gu-re-filters">
                {PROPERTY_FILTERS.map(f => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      setActiveFilter(f.id);
                      setStatusMessage('');
                    }}
                    className={`gu-re-filter ${activeFilter === f.id ? 'on' : ''}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="gu-re-list">
                {filteredApartments.length === 0 ? (
                  <div className="gu-empty" style={{ padding: '24px 12px', fontSize: 13 }}>
                    По выбранному фильтру объектов нет
                  </div>
                ) : (
                  filteredApartments.map(apt => {
                    const isSelected = currentApt?.id === apt.id;
                    return (
                      <button
                        key={apt.id}
                        type="button"
                        onClick={() => {
                          setSelectedAptId(apt.id);
                          setStatusMessage('');
                          setNarrowPane('detail');
                        }}
                        className={`gu-re-item ${isSelected ? 'is-on' : ''}`}
                      >
                        <div className="gu-re-item-top">
                          <span className="gu-re-item-title">{apt.roomsLabel}</span>
                          {apt.isOwned ? (
                            <span className="gu-re-item-price is-owned">В собственности</span>
                          ) : (
                            <span className="gu-re-item-price">
                              {apt.priceRub.toLocaleString('ru-RU')} ₽
                            </span>
                          )}
                        </div>
                        <div className="gu-re-item-addr">{apt.address}</div>
                        <div className="gu-re-item-meta">
                          <span>{apt.areaSqM} м²</span>
                          <span aria-hidden="true">·</span>
                          <span>{apt.floor + 1}/{apt.totalBuildingFloors} эт.</span>
                          <span aria-hidden="true">·</span>
                          <span>{apt.yearBuilt} г.</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Property Dossier — ZERO SCROLL, fits cleanly */}
            <div className={`gu-re-detail ${narrowPane !== 'detail' ? 'is-narrow-hidden' : ''}`}>
              {!currentApt ? (
                <div className="gu-empty" style={{ flex: 1 }}>
                  <div className="gu-empty-title">Объект не выбран</div>
                  <div style={{ fontSize: 13 }}>Выберите квартиру из реестра слева</div>
                </div>
              ) : (
                <>
                  {/* Header */}
                  <div className="gu-re-detail-head">
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="gu-re-building-title" title={currentApt.buildingNameRu}>
                        {currentApt.buildingNameRu}
                      </div>
                      <div className="gu-re-address" title={currentApt.address}>
                        <MapPin size={14} strokeWidth={1.75} style={{ flex: 'none' }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {currentApt.address}
                        </span>
                      </div>
                      <div className="gu-re-meta-line">
                        <span>{currentApt.roomsLabel}</span>
                        <span aria-hidden="true">·</span>
                        <span>Кадастр {currentApt.cadastralNumber}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flex: 'none' }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: currentApt.isOwned
                            ? 'var(--gu-good)'
                            : canAfford
                            ? 'var(--gu-amber-soft)'
                            : '#efa690'
                        }}
                      >
                        {currentApt.isOwned
                          ? 'В собственности'
                          : canAfford
                          ? 'Доступна к покупке'
                          : 'Недостаточно средств'}
                      </span>
                      {onSetGpsDestination && (
                        <button
                          type="button"
                          onClick={() => handleSetGps(currentApt)}
                          className="gu-btn gu-btn-s gu-btn-xs"
                        >
                          <Navigation size={13} strokeWidth={1.75} />
                          <span>{gpsPinnedId === currentApt.id ? 'Маршрут задан' : 'Маршрут GPS'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Specs 3x2 Grid */}
                  <div className="gu-re-specs">
                    <div className="gu-kv">
                      <span className="gu-kv-k">Общая площадь</span>
                      <span className="gu-kv-v">{currentApt.areaSqM} м²</span>
                    </div>
                    <div className="gu-kv">
                      <span className="gu-kv-k">Этаж</span>
                      <span className="gu-kv-v">
                        {currentApt.floor + 1} из {currentApt.totalBuildingFloors}
                      </span>
                    </div>
                    <div className="gu-kv">
                      <span className="gu-kv-k">Потолки</span>
                      <span className="gu-kv-v">{currentApt.ceilingHeightM} м</span>
                    </div>
                    <div className="gu-kv">
                      <span className="gu-kv-k">Год постройки</span>
                      <span className="gu-kv-v">{currentApt.yearBuilt} г.</span>
                    </div>
                    <div className="gu-kv">
                      <span className="gu-kv-k">Коммунальные</span>
                      <span className="gu-kv-v">
                        {currentApt.monthlyUtilitiesRub.toLocaleString('ru-RU')} ₽/мес
                      </span>
                    </div>
                    <div className="gu-kv">
                      <span className="gu-kv-k">Стены</span>
                      <span className="gu-kv-v" title={currentApt.wallMaterial}>
                        {currentApt.wallMaterial}
                      </span>
                    </div>
                  </div>

                  {/* Description & Features (compact, fits without scrolling) */}
                  <div className="gu-re-middle">
                    <div className="gu-re-desc" title={currentApt.descriptionRu}>
                      {currentApt.descriptionRu}
                    </div>

                    <div className="gu-re-features-box">
                      <span className="gu-grp">Планировка и оснащение</span>
                      <ul className="gu-re-features">
                        {currentApt.features.map((feat, idx) => (
                          <li key={idx} className="gu-re-feature" title={feat}>
                            <Check size={14} strokeWidth={2} color="#9ac985" style={{ flex: 'none' }} />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Bottom Purchase Bar */}
                  <div className="gu-re-buybar">
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 12,
                          color: 'var(--gu-mut)',
                          fontVariantNumeric: 'tabular-nums',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        Итого с пошлинами · объект {currentApt.priceRub.toLocaleString('ru-RU')} ₽ + сборы {feesTotal.toLocaleString('ru-RU')} ₽
                      </div>
                      <div className="gu-re-total-val" style={{ marginTop: 4 }}>
                        {totalCost.toLocaleString('ru-RU')} ₽
                      </div>
                    </div>

                    {currentApt.isOwned ? (
                      <button type="button" disabled className="gu-btn gu-btn-s">
                        <CheckCircle2 size={16} strokeWidth={1.75} color="#9ac985" />
                        <span>Квартира выкуплена</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleStartContract}
                        disabled={!canAfford}
                        className="gu-btn gu-btn-p"
                      >
                        <FileText size={16} strokeWidth={1.75} />
                        <span>Оформить договор</span>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </ModalShell>
  );
};
