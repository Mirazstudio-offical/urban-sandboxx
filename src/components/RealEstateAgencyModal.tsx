import React, { useState } from 'react';
import {
  Building2,
  X,
  FileText,
  Key,
  CheckCircle2,
  Coins,
  ShieldCheck,
  Home,
  Layers,
  MapPin,
  Ruler,
  Calendar,
  Zap,
  Check,
  Award,
  Search
} from 'lucide-react';
import { Player } from '../types';
import { PropertyApartment, getCityApartments, purchaseApartment } from '../propertySystem';
import { getPlayerCash } from '../items';

interface RealEstateAgencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player;
  onSetGpsDestination?: (dest: { x: number; y: number; name?: string } | null) => void;
  world?: any;
}

export const RealEstateAgencyModal: React.FC<RealEstateAgencyModalProps> = ({
  isOpen,
  onClose,
  player,
  onSetGpsDestination,
  world
}) => {
  const apartments = getCityApartments();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'panel' | 'brick' | 'modern' | 'suburban' | 'owned'>('all');
  const [selectedAptId, setSelectedAptId] = useState<string>('');
  const [buyerName, setBuyerName] = useState<string>('Иванов Иван Иванович');
  const [purchaseStep, setPurchaseStep] = useState<'inspect' | 'contract' | 'success'>('inspect');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [purchasedApt, setPurchasedApt] = useState<PropertyApartment | null>(null);

  if (!isOpen) return null;

  const filteredApartments = apartments.filter(apt => {
    const matchesSearch = apt.address.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          apt.roomsLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          apt.buildingNameRu.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (activeFilter === 'all') return true;
    if (activeFilter === 'owned') return apt.isOwned;
    if (activeFilter === 'panel') return apt.buildingType === 'panel_apartment';
    if (activeFilter === 'brick') return apt.buildingType === 'brick_residential';
    if (activeFilter === 'modern') return apt.buildingType === 'modern_residential';
    if (activeFilter === 'suburban') return apt.buildingType === 'suburban';
    return true;
  });

  // Ensure selectedAptId is valid and within filtered selection
  const currentApt = filteredApartments.find(a => a.id === selectedAptId) || filteredApartments[0] || apartments[0];
  
  // Set selected if empty
  if (!selectedAptId && currentApt) {
    setSelectedAptId(currentApt.id);
  }
  const playerCash = getPlayerCash(player);
  const totalCost = currentApt ? currentApt.priceRub + currentApt.stateDutyRub + currentApt.notaryFeeRub : 0;
  const canAfford = playerCash >= totalCost;

  const handleStartContract = () => {
    if (!canAfford || currentApt.isOwned) return;
    setPurchaseStep('contract');
  };

  const handleConfirmPurchase = () => {
    if (!currentApt || !canAfford) return;
    const res = purchaseApartment(player, currentApt, buyerName.trim() || 'Иванов Иван Иванович', world);
    if (res.success) {
      setPurchasedApt(currentApt);
      setPurchaseStep('success');
      setStatusMessage(res.message);
    } else {
      setStatusMessage(res.message);
    }
  };

  const handleSetGps = () => {
    if (!currentApt || !onSetGpsDestination) return;
    const bld = world?.buildings?.find((b: any) => b.id === currentApt.buildingId);
    if (bld) {
      onSetGpsDestination({
        x: bld.x + bld.width / 2,
        y: bld.y + bld.height / 2,
        name: currentApt.address
      });
    } else if (currentApt.entranceWorldX && currentApt.entranceWorldY) {
      onSetGpsDestination({
        x: currentApt.entranceWorldX,
        y: currentApt.entranceWorldY,
        name: currentApt.address
      });
    } else {
      // Fallback
      onSetGpsDestination({
        x: 4920,
        y: 4440,
        name: currentApt.address
      });
    }
  };

  return (
    <div
      id="real-estate-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="real-estate-modal-container"
        className="w-full max-w-5xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden text-zinc-100 flex flex-col max-h-[92vh] sm:max-h-[88vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-zinc-900 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-zinc-100">
                  Агентство Недвижимости «ГлавНедвижимость»
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Гос. реестр Росреестра
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Купля-продажа квартир с государственной регистрацией права и выдачей документов
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800">
              <Coins className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-mono font-bold text-emerald-400">
                {playerCash.toLocaleString('ru-RU')} ₽
              </span>
            </div>
            <button
              id="btn-close-real-estate-modal"
              onClick={onClose}
              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        {purchaseStep === 'success' && purchasedApt ? (
          <div className="p-8 sm:p-12 flex flex-col items-center justify-center text-center space-y-6 overflow-y-auto">
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 animate-bounce">
              <Award className="w-10 h-10" />
            </div>

            <div className="space-y-2 max-w-xl">
              <h3 className="text-2xl font-bold text-zinc-100">
                Сделка успешно зарегистрирована!
              </h3>
              <p className="text-zinc-300 text-sm">
                Право собственности внесено в Единый Государственный Реестр Недвижимости (ЕГРН).
              </p>
            </div>

            <div className="w-full max-w-2xl bg-zinc-900/80 border border-zinc-800 rounded-xl p-5 text-left space-y-3">
              <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span className="font-bold text-sm text-zinc-200">Переданный пакет документов и ключей:</span>
              </div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-zinc-300">
                <li className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Основной стальной ключ (Код: {purchasedApt.lockCode})</span>
                </li>
                <li className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Дубликат ключа в опечатанном латунном пенале</span>
                </li>
                <li className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Выписка из ЕГРН (Кадастр № {purchasedApt.cadastralNumber})</span>
                </li>
                <li className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Нотариальный Договор купли-продажи (ДКП)</span>
                </li>
                <li className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>Технический паспорт помещения БТИ</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => {
                setPurchaseStep('inspect');
                onClose();
              }}
              className="px-8 py-3.5 min-h-[48px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg transition-all"
            >
              Завершить и осмотреть инвентарь
            </button>
          </div>
        ) : purchaseStep === 'contract' && currentApt ? (
          <div className="p-6 overflow-y-auto space-y-6">
            <div className="border-b border-zinc-800 pb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-amber-400 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Нотариальное оформление Договора купли-продажи (ДКП)
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Проверьте паспортные данные покупателя и суммы обязательных государственных сборов
                </p>
              </div>
              <button
                onClick={() => setPurchaseStep('inspect')}
                className="text-xs text-zinc-400 hover:text-zinc-200 underline"
              >
                Вернуться к выбору
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left column: Buyer info & terms */}
              <div className="lg:col-span-7 space-y-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">
                    ФИО Покупателя (Собственника по ЕГРН)
                  </label>
                  <input
                    type="text"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-amber-500 font-mono"
                    placeholder="Фамилия Имя Отчество"
                  />
                  <p className="text-[11px] text-zinc-400">
                    На данное имя будет оформлена Выписка из ЕГРН и свидетельство о государственной регистрации.
                  </p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2 text-xs text-zinc-300">
                  <h4 className="font-bold text-zinc-200 text-sm mb-1">Объект недвижимости:</h4>
                  <p><span className="text-zinc-400">Адрес:</span> {currentApt.address}</p>
                  <p><span className="text-zinc-400">Кадастровый номер:</span> {currentApt.cadastralNumber}</p>
                  <p><span className="text-zinc-400">Общая площадь:</span> {currentApt.areaSqM} м² ({currentApt.roomsLabel})</p>
                  <p><span className="text-zinc-400">Материал стен:</span> {currentApt.wallMaterial}</p>
                </div>
              </div>

              {/* Right column: Financial breakdown */}
              <div className="lg:col-span-5 bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col justify-between space-y-4">
                <div>
                  <h4 className="font-bold text-sm text-zinc-200 mb-3 border-b border-zinc-800 pb-2">
                    Финансовая смета сделки
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-zinc-300">
                      <span>Стоимость квартиры:</span>
                      <span className="font-mono font-bold">{currentApt.priceRub.toLocaleString('ru-RU')} ₽</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>Госпошлина Росреестра:</span>
                      <span className="font-mono">{currentApt.stateDutyRub.toLocaleString('ru-RU')} ₽</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>Нотариальный тариф:</span>
                      <span className="font-mono">{currentApt.notaryFeeRub.toLocaleString('ru-RU')} ₽</span>
                    </div>
                    <div className="border-t border-zinc-800 pt-2 flex justify-between text-sm font-bold text-emerald-400">
                      <span>Итого к оплате:</span>
                      <span className="font-mono text-base">{totalCost.toLocaleString('ru-RU')} ₽</span>
                    </div>
                  </div>
                </div>

                {statusMessage && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                    {statusMessage}
                  </div>
                )}

                <button
                  onClick={handleConfirmPurchase}
                  disabled={!canAfford}
                  className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                    canAfford
                      ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg'
                      : 'bg-zinc-800 text-zinc-500 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <ShieldCheck className="w-5 h-5" />
                  Подписать ДКП и Подтвердить Оплату
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Main Apartment Inspection View */
          <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto">
            {/* Left Column: Apartment Selection List */}
            <div className="lg:col-span-5 space-y-3 flex flex-col max-h-[600px]">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">
                Доступные квартиры в реестре ({filteredApartments.length})
              </span>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Поиск по адресу, комнатам..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500 font-medium"
                />
              </div>

              {/* Filter Tabs */}
              <div className="flex flex-wrap gap-1 pb-1">
                <button
                  onClick={() => { setActiveFilter('all'); setSelectedAptId(''); }}
                  className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${
                    activeFilter === 'all'
                      ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                      : 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Все
                </button>
                <button
                  onClick={() => { setActiveFilter('panel'); setSelectedAptId(''); }}
                  className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${
                    activeFilter === 'panel'
                      ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                      : 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Панель
                </button>
                <button
                  onClick={() => { setActiveFilter('brick'); setSelectedAptId(''); }}
                  className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${
                    activeFilter === 'brick'
                      ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                      : 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Сталинка
                </button>
                <button
                  onClick={() => { setActiveFilter('modern'); setSelectedAptId(''); }}
                  className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${
                    activeFilter === 'modern'
                      ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                      : 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  ЖК
                </button>
                <button
                  onClick={() => { setActiveFilter('suburban'); setSelectedAptId(''); }}
                  className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${
                    activeFilter === 'suburban'
                      ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                      : 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Коттедж
                </button>
                <button
                  onClick={() => { setActiveFilter('owned'); setSelectedAptId(''); }}
                  className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${
                    activeFilter === 'owned'
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                      : 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Мои
                </button>
              </div>

              {/* Apartment List Scroll */}
              <div className="space-y-2.5 overflow-y-auto pr-1 flex-1 max-h-[420px]">
                {filteredApartments.length === 0 ? (
                  <div className="text-center py-8 text-xs text-zinc-500 font-medium">
                    Ничего не найдено
                  </div>
                ) : (
                  filteredApartments.map((apt) => {
                    const isSelected = apt.id === selectedAptId;
                    return (
                      <button
                        key={apt.id}
                        onClick={() => {
                          setSelectedAptId(apt.id);
                          setStatusMessage('');
                        }}
                        className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500 text-zinc-100 shadow-md'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-850 hover:text-zinc-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-zinc-100">{apt.roomsLabel}</span>
                          {apt.isOwned ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              В собственности
                            </span>
                          ) : (
                            <span className="font-mono text-xs font-bold text-emerald-400">
                              {apt.priceRub.toLocaleString('ru-RU')} ₽
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-zinc-400 mt-1 truncate">
                          {apt.address}
                        </div>

                        <div className="flex items-center gap-3 mt-2 text-[11px] text-zinc-400 border-t border-zinc-800/60 pt-2">
                          <span>{apt.areaSqM} м²</span>
                          <span>•</span>
                          <span>{apt.floor + 1}/{apt.totalBuildingFloors} этаж</span>
                          <span>•</span>
                          <span>{apt.yearBuilt} г.</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column: Detailed Apartment Dossier */}
            <div className="lg:col-span-7 flex flex-col justify-between space-y-4 bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
              <div className="space-y-4">
                <div className="flex items-start justify-between border-b border-zinc-800 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-zinc-100">
                      {currentApt.buildingNameRu}
                    </h3>
                    <p className="text-xs text-amber-400 mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {currentApt.address}
                    </p>
                    {onSetGpsDestination && (
                      <button
                        onClick={handleSetGps}
                        className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/20 hover:border-sky-500/40 text-[11px] font-bold text-sky-400 transition-all select-none"
                      >
                        <MapPin className="w-3.5 h-3.5 text-sky-400" />
                        Проложить GPS маршрут к дому
                      </button>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-zinc-400">Кадастровый номер:</div>
                    <div className="text-xs font-mono font-bold text-zinc-200">{currentApt.cadastralNumber}</div>
                  </div>
                </div>

                {/* Specs Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="bg-zinc-900 p-2.5 rounded-lg border border-zinc-800">
                    <span className="text-[10px] text-zinc-400 block">Площадь помещения</span>
                    <span className="text-sm font-bold text-zinc-100 flex items-center gap-1">
                      <Ruler className="w-3.5 h-3.5 text-amber-400" />
                      {currentApt.areaSqM} м²
                    </span>
                  </div>

                  <div className="bg-zinc-900 p-2.5 rounded-lg border border-zinc-800">
                    <span className="text-[10px] text-zinc-400 block">Этаж / Этажность</span>
                    <span className="text-sm font-bold text-zinc-100 flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-amber-400" />
                      {currentApt.floor + 1} из {currentApt.totalBuildingFloors}
                    </span>
                  </div>

                  <div className="bg-zinc-900 p-2.5 rounded-lg border border-zinc-800">
                    <span className="text-[10px] text-zinc-400 block">Высота потолков</span>
                    <span className="text-sm font-bold text-zinc-100 flex items-center gap-1">
                      <Home className="w-3.5 h-3.5 text-amber-400" />
                      {currentApt.ceilingHeightM} м
                    </span>
                  </div>
                </div>

                {/* Description & Features */}
                <div className="space-y-2">
                  <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-900/80 p-3 rounded-lg border border-zinc-800">
                    {currentApt.descriptionRu}
                  </p>

                  <div className="space-y-1">
                    <span className="text-xs font-bold text-zinc-300 block">Особенности и планировка:</span>
                    <ul className="space-y-1 text-xs text-zinc-400">
                      {currentApt.features.map((feat, idx) => (
                        <li key={idx} className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Bottom Action Section */}
              <div className="border-t border-zinc-800 pt-4 flex items-center justify-between gap-4">
                <div>
                  <span className="text-xs text-zinc-400 block">Полная стоимость (с учетом пошлин):</span>
                  <span className="text-xl font-mono font-bold text-emerald-400">
                    {totalCost.toLocaleString('ru-RU')} ₽
                  </span>
                </div>

                {currentApt.isOwned ? (
                  <button
                    disabled
                    className="px-6 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-sm flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Квартира выкуплена
                  </button>
                ) : (
                  <button
                    onClick={handleStartContract}
                    disabled={!canAfford}
                    className={`px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${
                      canAfford
                        ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg'
                        : 'bg-zinc-800 text-zinc-500 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    Оформить покупку
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
