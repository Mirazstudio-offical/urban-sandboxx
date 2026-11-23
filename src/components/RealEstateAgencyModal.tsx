import React, { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
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
  Navigation,
  X
} from 'lucide-react';
import { Player } from '../types';
import { PropertyApartment, getCityApartments, purchaseApartment } from '../propertySystem';
import { getPlayerCash } from '../items';
import { ShadowHost, attachStageFit } from './ShadowHost';
import { useTopmostEscape } from './gameUi';
import { sound } from '../audio';
import realEstateCss from './realEstate.css?inline';

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

const INITIAL_VISIBLE = 60;
const LOAD_MORE_STEP = 60;

const RealEstateAgencyContent: React.FC<Omit<RealEstateAgencyModalProps, 'isOpen'>> = ({
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
  const [visibleCount, setVisibleCount] = useState<number>(INITIAL_VISIBLE);
  const [entered, setEntered] = useState(false);
  const [, setRefreshTick] = useState(0);

  const wrapRef = useRef<HTMLDivElement>(null);
  const gmRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => attachStageFit(() => wrapRef.current, () => gmRef.current), []);

  useEffect(() => {
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setEntered(true)));
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleBackOrClose = () => {
    if (purchaseStep === 'contract') {
      setPurchaseStep('inspect');
      setStatusMessage('');
      return;
    }
    onClose();
  };

  useTopmostEscape(handleBackOrClose);

  const filteredApartments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return apartments.filter(apt => {
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
  }, [apartments, searchQuery, activeFilter, purchaseStep]);

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE);
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [searchQuery, activeFilter]);

  const currentApt =
    filteredApartments.find(a => a.id === selectedAptId) ||
    filteredApartments[0] ||
    null;

  useEffect(() => {
    if (currentApt && currentApt.id !== selectedAptId) {
      setSelectedAptId(currentApt.id);
    }
  }, [currentApt?.id, selectedAptId]);

  const visibleApartments = useMemo(
    () => filteredApartments.slice(0, visibleCount),
    [filteredApartments, visibleCount]
  );

  const handleListScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (visibleCount < filteredApartments.length && el.scrollTop + el.clientHeight >= el.scrollHeight - 240) {
      setVisibleCount(c => Math.min(filteredApartments.length, c + LOAD_MORE_STEP));
    }
  };

  const stopGameKeys = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Escape') {
      e.stopPropagation();
      e.nativeEvent.stopPropagation();
    }
  };

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
      setRefreshTick(t => t + 1);
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

  const stepSubtitle =
    purchaseStep === 'contract'
      ? 'Нотариальное оформление договора купли-продажи'
      : purchaseStep === 'success'
      ? 'Регистрация права собственности в ЕГРН'
      : 'Городской реестр недвижимости';

  return (
    <ShadowHost css={realEstateCss} zIndex={50} background="transparent">
      <div id="w" ref={wrapRef}>
        <div className={'bd' + (!entered ? ' gone' : '')} />
        <div className={'gm' + (!entered ? ' gone' : '')} ref={gmRef}>
          {/* Main Menu ambient glow & vignette */}
          <div
            className="a"
            style={{
              inset: 0,
              background: 'radial-gradient(900px 520px at 72% 84%, rgba(201,146,43,.24), transparent 62%)'
            }}
          />
          <div
            className="a"
            style={{
              inset: 0,
              background: 'linear-gradient(90deg, rgba(9,9,10,.88), rgba(9,9,10,.36) 50%, rgba(9,9,10,.6) 100%)'
            }}
          />

          {/* Top Bar */}
          <div className="top">
            <div className="top-l">
              <button
                type="button"
                className="chip back"
                onClick={handleBackOrClose}
                aria-label={purchaseStep === 'contract' ? 'Вернуться к каталогу' : 'Закрыть агентство'}
                title={purchaseStep === 'contract' ? 'Назад к каталогу' : 'Закрыть'}
              >
                {purchaseStep === 'contract' ? (
                  <ChevronLeft size={21} strokeWidth={2} color="#e9e6df" />
                ) : (
                  <X size={20} strokeWidth={2} color="#e9e6df" />
                )}
              </button>
              <span className="cn ttl">Агентство недвижимости</span>
              <span className="sub-top">{stepSubtitle}</span>
            </div>

            <div className="top-r">
              <div className="chip" title="Наличные средства">
                <Coins size={16} strokeWidth={1.8} color="#e0ab45" />
                <span className="tab-num" style={{ fontSize: 15, fontWeight: 700, color: '#f4f1ea' }}>
                  {playerCash.toLocaleString('ru-RU')} ₽
                </span>
              </div>
              {purchaseStep === 'contract' && (
                <button
                  type="button"
                  className="chip back"
                  onClick={onClose}
                  aria-label="Закрыть окно"
                  title="Закрыть"
                >
                  <X size={19} strokeWidth={2} color="#a29e93" />
                </button>
              )}
            </div>
          </div>

          {/* Main Workspace */}
          <div className="re-body">
            {/* ==================== STEP 3: SUCCESS ==================== */}
            {purchaseStep === 'success' && purchasedApt ? (
              <div className="re-success-wrap">
                <div className="panel re-success">
                  <div className="re-success-top">
                    <div className="re-success-mark">
                      <ShieldCheck size={28} strokeWidth={1.8} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div className="cn" style={{ fontSize: 28, fontWeight: 700, color: '#fff', lineHeight: 1.08 }}>
                        Право собственности зарегистрировано
                      </div>
                      <div className="mut tab-num" style={{ fontSize: 14, marginTop: 4 }}>
                        {purchasedApt.address} · ЕГРН {purchasedApt.cadastralNumber}
                      </div>
                    </div>
                  </div>

                  <div className="re-docs-box">
                    <div className="re-sec-head" style={{ paddingBottom: 8 }}>
                      <span className="cn re-grp">Переданные ключи и документы</span>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: '#9ac985' }}>
                        Добавлено в инвентарь
                      </span>
                    </div>

                    <ul className="re-docs-grid">
                      <li className="re-doc-item">
                        <KeyIcon size={15} strokeWidth={1.8} color="#e0ab45" style={{ flex: 'none' }} />
                        <span>Основной ключ · код {purchasedApt.lockCode}</span>
                      </li>
                      <li className="re-doc-item">
                        <KeyIcon size={15} strokeWidth={1.8} color="#e0ab45" style={{ flex: 'none' }} />
                        <span>Дубликат ключа в опечатанном пенале</span>
                      </li>
                      <li className="re-doc-item">
                        <FileText size={15} strokeWidth={1.8} color="#9ac985" style={{ flex: 'none' }} />
                        <span className="tab-num">Выписка из ЕГРН · {purchasedApt.cadastralNumber}</span>
                      </li>
                      <li className="re-doc-item">
                        <FileText size={15} strokeWidth={1.8} color="#9ac985" style={{ flex: 'none' }} />
                        <span>Нотариальный договор купли-продажи</span>
                      </li>
                      <li className="re-doc-item">
                        <FileText size={15} strokeWidth={1.8} color="#a29e93" style={{ flex: 'none' }} />
                        <span>Технический паспорт помещения БТИ</span>
                      </li>
                    </ul>
                  </div>

                  <div className="re-success-acts">
                    {onSetGpsDestination && (
                      <button
                        type="button"
                        onClick={() => handleSetGps(purchasedApt)}
                        className="btn btn-s"
                      >
                        <Navigation size={16} strokeWidth={1.8} />
                        <span>{gpsPinnedId === purchasedApt.id ? 'Маршрут проложен' : 'Проложить GPS маршрут'}</span>
                      </button>
                    )}
                    <button type="button" onClick={onClose} className="btn btn-p">
                      Завершить оформление
                    </button>
                  </div>
                </div>
              </div>
            ) : purchaseStep === 'contract' && currentApt ? (
              /* ==================== STEP 2: CONTRACT ==================== */
              <div className="re-contract-wrap">
                <div className="re-contract">
                  {/* Left Panel: Buyer & Property Summary */}
                  <div className="panel re-card-pad">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div className="re-sec-head">
                        <span className="cn re-grp" style={{ fontSize: 16 }}>Договор купли-продажи</span>
                        <span className="mut tab-num" style={{ fontSize: 12.5 }}>
                          Кадастр {currentApt.cadastralNumber}
                        </span>
                      </div>

                      <div>
                        <label className="re-lbl" htmlFor="re-buyer-name">
                          ФИО собственника для внесения в ЕГРН
                        </label>
                        <input
                          id="re-buyer-name"
                          type="text"
                          value={buyerName}
                          maxLength={60}
                          onChange={e => setBuyerName(e.target.value)}
                          onKeyDown={stopGameKeys}
                          className="inp"
                          placeholder="Фамилия Имя Отчество"
                        />
                        <div className="mut" style={{ fontSize: 12, marginTop: 6 }}>
                          Указывается в выписке из реестра и нотариальном договоре
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <span className="cn re-grp">Сведения об объекте</span>
                      <div className="re-kv2">
                        <div className="re-kv">
                          <span className="re-kv-k">Адрес</span>
                          <span className="re-kv-v" title={currentApt.address}>{currentApt.address}</span>
                        </div>
                        <div className="re-kv">
                          <span className="re-kv-k">Площадь и комнаты</span>
                          <span className="re-kv-v tab-num">
                            {currentApt.areaSqM} м² · {currentApt.roomsCount} комн.
                          </span>
                        </div>
                        <div className="re-kv">
                          <span className="re-kv-k">Этаж</span>
                          <span className="re-kv-v tab-num">
                            {currentApt.floor + 1} из {currentApt.totalBuildingFloors}
                          </span>
                        </div>
                        <div className="re-kv">
                          <span className="re-kv-k">Материал стен</span>
                          <span className="re-kv-v" title={currentApt.wallMaterial}>{currentApt.wallMaterial}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Panel: Financial Ledger & Sign CTA */}
                  <div className="panel re-card-pad">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div className="re-sec-head">
                        <span className="cn re-grp" style={{ fontSize: 16 }}>Финансовая смета</span>
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: canAfford ? '#9ac985' : '#f2b4a0' }}>
                          {canAfford ? 'Средств достаточно' : 'Недостаточно средств'}
                        </span>
                      </div>

                      <div className="re-ledger tab-num">
                        <div className="re-ledger-row">
                          <span className="mut">Стоимость объекта</span>
                          <span style={{ fontWeight: 600, color: '#fff' }}>
                            {currentApt.priceRub.toLocaleString('ru-RU')} ₽
                          </span>
                        </div>
                        <div className="re-ledger-row">
                          <span className="mut">Госпошлина Росреестра</span>
                          <span style={{ color: '#cfcbc1' }}>
                            {currentApt.stateDutyRub.toLocaleString('ru-RU')} ₽
                          </span>
                        </div>
                        <div className="re-ledger-row">
                          <span className="mut">Нотариальный тариф</span>
                          <span style={{ color: '#cfcbc1' }}>
                            {currentApt.notaryFeeRub.toLocaleString('ru-RU')} ₽
                          </span>
                        </div>
                        <div className="re-ledger-row is-total">
                          <span style={{ fontWeight: 600, color: '#fff' }}>Итого к оплате</span>
                          <span className="cn re-total" style={{ marginTop: 0 }}>
                            {totalCost.toLocaleString('ru-RU')} ₽
                          </span>
                        </div>
                        <div className="re-ledger-row">
                          <span className="mut">Остаток после сделки</span>
                          <span style={{ fontWeight: 600, color: cashAfterDeal >= 0 ? '#9ac985' : '#f2b4a0' }}>
                            {cashAfterDeal.toLocaleString('ru-RU')} ₽
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="re-contract-acts">
                      {statusMessage && <div className="re-err-box">{statusMessage}</div>}
                      <button
                        type="button"
                        onClick={handleConfirmPurchase}
                        disabled={!canAfford}
                        className="btn btn-p btn-block"
                      >
                        <ShieldCheck size={17} strokeWidth={1.8} />
                        <span>Подписать договор и оплатить</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPurchaseStep('inspect');
                          setStatusMessage('');
                        }}
                        className="btn btn-s btn-block"
                      >
                        <ChevronLeft size={16} strokeWidth={1.8} />
                        <span>Вернуться к каталогу</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* ==================== STEP 1: CATALOG + DOSSIER ==================== */
              <>
                {/* Single compact horizontal toolbar */}
                <div className="re-toolbar">
                  <div className="re-search">
                    <Search size={15} strokeWidth={1.8} color="#a29e93" style={{ flex: 'none' }} />
                    <input
                      type="text"
                      placeholder="Поиск: адрес, комнаты, дом"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      onKeyDown={stopGameKeys}
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        className="re-clear"
                        onClick={() => setSearchQuery('')}
                        aria-label="Очистить поиск"
                      >
                        <X size={14} strokeWidth={2} />
                      </button>
                    )}
                  </div>

                  <div className="re-pills" role="tablist" aria-label="Фильтр недвижимости">
                    {PROPERTY_FILTERS.map(f => (
                      <button
                        key={f.id}
                        type="button"
                        role="tab"
                        aria-selected={activeFilter === f.id}
                        onClick={() => {
                          setActiveFilter(f.id);
                          setStatusMessage('');
                        }}
                        className={`pill${activeFilter === f.id ? ' pill-on' : ''}`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  <span className="re-count tab-num">
                    {filteredApartments.length.toLocaleString('ru-RU')} из {apartments.length.toLocaleString('ru-RU')}
                  </span>
                </div>

                {/* 2-Column Split: Left scrollable registry list | Right zero-scroll dossier */}
                <div className="re-split">
                  <section className="panel re-list-panel">
                    <div
                      ref={listRef}
                      className="re-list scroll"
                      onScroll={handleListScroll}
                    >
                      {filteredApartments.length === 0 ? (
                        <div className="re-empty">
                          <div style={{ fontSize: 15, fontWeight: 600, color: '#e9e6df' }}>
                            Объекты не найдены
                          </div>
                          <div style={{ fontSize: 13 }}>
                            Попробуйте изменить фильтр или поисковый запрос
                          </div>
                        </div>
                      ) : (
                        <>
                          {visibleApartments.map(apt => {
                            const isSelected = currentApt?.id === apt.id;
                            return (
                              <button
                                key={apt.id}
                                type="button"
                                onClick={() => {
                                  setSelectedAptId(apt.id);
                                  setStatusMessage('');
                                }}
                                className={`re-row${isSelected ? ' re-row-on' : ''}`}
                              >
                                <div className="re-row-top">
                                  <span className="re-row-title">{apt.roomsLabel}</span>
                                  {apt.isOwned ? (
                                    <span className="re-row-price is-owned">В собственности</span>
                                  ) : (
                                    <span className="re-row-price tab-num">
                                      {apt.priceRub.toLocaleString('ru-RU')} ₽
                                    </span>
                                  )}
                                </div>
                                <div className="re-row-bot">
                                  <span className="re-row-addr">{apt.address}</span>
                                  <span className="re-row-meta tab-num">
                                    {apt.areaSqM} м² · {apt.floor + 1}/{apt.totalBuildingFloors} эт. · {apt.yearBuilt} г.
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                          {visibleCount < filteredApartments.length && (
                            <button
                              type="button"
                              className="re-more-btn"
                              onClick={() =>
                                setVisibleCount(c => Math.min(filteredApartments.length, c + LOAD_MORE_STEP))
                              }
                            >
                              Показать ещё ({(filteredApartments.length - visibleCount).toLocaleString('ru-RU')})
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </section>

                  <section className="panel re-detail">
                    {!currentApt ? (
                      <div className="re-empty">
                        <div style={{ fontSize: 16, fontWeight: 600, color: '#e9e6df' }}>
                          Объект не выбран
                        </div>
                        <div style={{ fontSize: 13.5 }}>
                          Выберите квартиру из реестра слева
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Dossier Header */}
                        <div className="re-detail-head">
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div className="cn re-bld-title" title={currentApt.buildingNameRu}>
                              {currentApt.buildingNameRu}
                            </div>
                            <div className="re-addr-line" title={currentApt.address}>
                              <MapPin size={14} strokeWidth={1.8} color="#e0ab45" style={{ flex: 'none' }} />
                              <span>{currentApt.address}</span>
                            </div>
                            <div className="re-cadastral tab-num">
                              <span>{currentApt.roomsLabel}</span>
                              <span aria-hidden="true">·</span>
                              <span>ЕГРН {currentApt.cadastralNumber}</span>
                            </div>
                          </div>

                          {onSetGpsDestination && (
                            <button
                              type="button"
                              onClick={() => handleSetGps(currentApt)}
                              className="btn btn-s btn-sm"
                              style={{ flex: 'none' }}
                            >
                              <Navigation size={14} strokeWidth={1.8} />
                              <span>{gpsPinnedId === currentApt.id ? 'Маршрут задан' : 'Маршрут GPS'}</span>
                            </button>
                          )}
                        </div>

                        {/* Specs 3x2 Grid */}
                        <div className="re-specs">
                          <div className="re-kv">
                            <span className="re-kv-k">Площадь</span>
                            <span className="re-kv-v tab-num">{currentApt.areaSqM} м²</span>
                          </div>
                          <div className="re-kv">
                            <span className="re-kv-k">Этаж</span>
                            <span className="re-kv-v tab-num">
                              {currentApt.floor + 1} из {currentApt.totalBuildingFloors}
                            </span>
                          </div>
                          <div className="re-kv">
                            <span className="re-kv-k">Потолки</span>
                            <span className="re-kv-v tab-num">{currentApt.ceilingHeightM} м</span>
                          </div>
                          <div className="re-kv">
                            <span className="re-kv-k">Постройка</span>
                            <span className="re-kv-v tab-num">{currentApt.yearBuilt} г.</span>
                          </div>
                          <div className="re-kv">
                            <span className="re-kv-k">Коммунальные</span>
                            <span className="re-kv-v tab-num">
                              {currentApt.monthlyUtilitiesRub.toLocaleString('ru-RU')} ₽/мес
                            </span>
                          </div>
                          <div className="re-kv">
                            <span className="re-kv-k">Стены</span>
                            <span className="re-kv-v" title={currentApt.wallMaterial}>
                              {currentApt.wallMaterial}
                            </span>
                          </div>
                        </div>

                        {/* Description & Features (compact, never overflows) */}
                        <div className="re-info">
                          <div className="re-desc" title={currentApt.descriptionRu}>
                            {currentApt.descriptionRu}
                          </div>

                          <div className="re-feat-wrap">
                            <span className="cn re-grp">Планировка и оснащение</span>
                            <ul className="re-feats">
                              {currentApt.features.slice(0, 6).map((feat, idx) => (
                                <li key={idx} className="re-feat" title={feat}>
                                  <Check size={14} strokeWidth={2.2} color="#9ac985" style={{ flex: 'none' }} />
                                  <span>{feat}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {/* Bottom Purchase Bar */}
                        <div className="re-buybar">
                          <div style={{ minWidth: 0 }}>
                            <div className="re-buy-sub tab-num">
                              <span>
                                Объект {currentApt.priceRub.toLocaleString('ru-RU')} ₽ + сборы {feesTotal.toLocaleString('ru-RU')} ₽
                              </span>
                              <span
                                className="re-status-inline"
                                style={{
                                  color: currentApt.isOwned
                                    ? '#9ac985'
                                    : canAfford
                                    ? '#f0c264'
                                    : '#f2b4a0'
                                }}
                              >
                                {currentApt.isOwned
                                  ? '· В собственности'
                                  : canAfford
                                  ? '· Доступна'
                                  : '· Недостаточно средств'}
                              </span>
                            </div>
                            <div className="cn re-total tab-num">
                              {totalCost.toLocaleString('ru-RU')} ₽
                            </div>
                          </div>

                          {currentApt.isOwned ? (
                            <button type="button" disabled className="btn btn-s">
                              <CheckCircle2 size={17} strokeWidth={1.8} color="#9ac985" />
                              <span>Квартира выкуплена</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={handleStartContract}
                              disabled={!canAfford}
                              className="btn btn-p"
                            >
                              <FileText size={17} strokeWidth={1.8} />
                              <span>Оформить договор</span>
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </section>
                </div>
              </>
            )}
          </div>

          {/* Bottom Keyboard Hints (auto-hidden on touch) */}
          <div className="hint">
            <div className="hint-g">
              {purchaseStep === 'inspect' && (
                <>
                  <span className="key">ЛКМ</span>
                  <span>Выбрать объект</span>
                </>
              )}
              <span className="key">Esc</span>
              <span>{purchaseStep === 'contract' ? 'Назад к каталогу' : 'Закрыть'}</span>
            </div>
            <div className="tab-num">Наличные: {playerCash.toLocaleString('ru-RU')} ₽</div>
          </div>
        </div>
      </div>
    </ShadowHost>
  );
};

export const RealEstateAgencyModal: React.FC<RealEstateAgencyModalProps> = ({
  isOpen,
  ...rest
}) => {
  if (!isOpen) return null;
  return <RealEstateAgencyContent {...rest} />;
};
