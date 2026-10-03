import React, { useState, useEffect } from 'react';
import {
  Car,
  ChevronLeft,
  Play,
  Square,
  Star,
  MapPin,
  Navigation,
  Clock,
  Coins,
  CheckCircle2,
  X,
  AlertTriangle,
  User,
  Shield,
  ThumbsUp,
  TrendingUp,
  DollarSign
} from 'lucide-react';
import { Player, GameWorld, Vehicle } from '../types';
import { TaxiFleetSystem, TaxiActiveOrder, TaxiOrderOffer } from '../taxiSystem';
import { sound } from '../audio';
import { CAR_CONFIGS } from '../vehicleHelpers';

interface PhoneTaxiAppProps {
  player: Player | null;
  world?: GameWorld | null;
  onSetGpsTarget?: (dest: { x: number; y: number; name?: string } | null) => void;
  onBack: () => void;
}

type TaxiTab = 'shift' | 'reviews' | 'earnings';

export const PhoneTaxiApp: React.FC<PhoneTaxiAppProps> = ({
  player,
  world,
  onSetGpsTarget,
  onBack
}) => {
  const taxi = TaxiFleetSystem.getInstance();
  const [activeTab, setActiveTab] = useState<TaxiTab>('shift');
  const [, setTick] = useState<number>(0);

  // Re-render interval to update live taximeter / timers every 500ms
  useEffect(() => {
    const timer = setInterval(() => {
      setTick(t => t + 1);
    }, 500);
    return () => clearInterval(timer);
  }, []);

  const currentVeh: Vehicle | null = player?.isInVehicle && player.currentVehicleId && world
    ? world.vehicles.find(v => v.id === player.currentVehicleId) || null
    : null;

  const vehConfig = currentVeh ? CAR_CONFIGS[currentVeh.type] : null;
  const carName = vehConfig ? vehConfig.name : (currentVeh ? 'Автомобиль' : null);

  const handleStartShift = () => {
    sound.click();
    const res = taxi.startShift(currentVeh);
    if (!res.success) {
      sound.playAlert();
    } else {
      sound.playPhoneChime();
    }
  };

  const handleEndShift = () => {
    sound.click();
    taxi.endShift();
  };

  const handleAcceptOffer = () => {
    if (!world || !player) return;
    sound.playPhoneChime();
    const order = taxi.acceptOrder(world, { x: player.x, y: player.y });
    if (order && onSetGpsTarget) {
      onSetGpsTarget({
        x: order.pickup.x,
        y: order.pickup.y,
        name: `Подача: ${order.passengerName}`
      });
    }
  };

  const handleDeclineOffer = () => {
    sound.click();
    taxi.declineOrder();
  };

  const handleSetGpsToTarget = (target: { x: number; y: number; name: string }) => {
    sound.click();
    if (onSetGpsTarget) {
      onSetGpsTarget({
        x: target.x,
        y: target.y,
        name: target.name
      });
    }
  };

  const profile = taxi.profile;
  const activeOrder = taxi.activeOrder;
  const pendingOffer = taxi.pendingOffer;

  return (
    <div className="flex-1 flex flex-col bg-zinc-950 text-white overflow-hidden animate-in fade-in duration-150">
      {/* App Header */}
      <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 p-3 text-black shadow-md flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="p-1 hover:bg-black/10 rounded-full transition-colors"
            title="Назад"
          >
            <ChevronLeft className="w-6 h-6 text-black" />
          </button>
          <div className="flex items-center gap-1.5">
            <div className="w-8 h-8 rounded-xl bg-black text-amber-400 flex items-center justify-center shadow-inner">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <div className="font-black text-xs tracking-tight uppercase leading-none">Степь-Такси</div>
              <div className="text-[10px] font-semibold text-black/75">Таксопарк 24/7</div>
            </div>
          </div>
        </div>

        {/* Rating Badge */}
        <div className="flex items-center gap-1 bg-black/90 text-amber-400 px-2 py-0.5 rounded-full text-xs font-bold shadow">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span>{profile.rating.toFixed(2)}</span>
        </div>
      </div>

      {/* App Navigation Tabs */}
      <div className="flex border-b border-zinc-800 bg-zinc-900/90 text-xs font-semibold">
        <button
          onClick={() => { sound.click(); setActiveTab('shift'); }}
          className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
            activeTab === 'shift'
              ? 'border-amber-400 text-amber-400 bg-zinc-800/50'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Car className="w-3.5 h-3.5" />
          <span>Смена</span>
          {activeOrder && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping ml-0.5" />
          )}
        </button>

        <button
          onClick={() => { sound.click(); setActiveTab('reviews'); }}
          className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
            activeTab === 'reviews'
              ? 'border-amber-400 text-amber-400 bg-zinc-800/50'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Star className="w-3.5 h-3.5" />
          <span>Отзывы</span>
          <span className="text-[10px] text-zinc-500">({profile.reviews.length})</span>
        </button>

        <button
          onClick={() => { sound.click(); setActiveTab('earnings'); }}
          className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
            activeTab === 'earnings'
              ? 'border-amber-400 text-amber-400 bg-zinc-800/50'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Coins className="w-3.5 h-3.5" />
          <span>Доходы</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* ===================== TAB: SHIFT & ORDERS ===================== */}
        {activeTab === 'shift' && (
          <>
            {/* Shift Status Bar */}
            <div className="bg-zinc-900 rounded-2xl p-3 border border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-3 h-3 rounded-full ${
                    profile.isShiftActive
                      ? 'bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse'
                      : 'bg-zinc-600'
                  }`}
                />
                <div>
                  <div className="text-xs font-bold text-white">
                    {profile.isShiftActive ? 'Вы на линии' : 'Смена закрыта (Оффлайн)'}
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    {profile.isShiftActive
                      ? activeOrder
                        ? 'Выполняется заказ'
                        : 'Ожидание вызовов по городу...'
                      : 'Нажмите кнопку, чтобы начать работу'}
                  </div>
                </div>
              </div>

              {profile.isShiftActive ? (
                <button
                  onClick={handleEndShift}
                  className="px-3 py-1.5 bg-red-600/80 hover:bg-red-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow active:scale-95 transition-all"
                >
                  <Square className="w-3.5 h-3.5" /> Закончить
                </button>
              ) : (
                <button
                  onClick={handleStartShift}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                >
                  <Play className="w-3.5 h-3.5 fill-black" /> Начать смену
                </button>
              )}
            </div>

            {/* Vehicle Status Card */}
            <div className="bg-zinc-900/60 rounded-2xl p-2.5 border border-zinc-800/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Car className={`w-4 h-4 ${carName ? 'text-amber-400' : 'text-zinc-500'}`} />
                <span className="text-zinc-300">
                  Авто: <strong className="text-white">{carName || 'Пешком (сядьте в машину)'}</strong>
                </span>
              </div>
              {carName ? (
                <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Готов к работе
                </span>
              ) : (
                <span className="text-[10px] text-amber-400 font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Нужна машина
                </span>
              )}
            </div>

            {/* --- INCOMING ORDER OFFER ALERT --- */}
            {pendingOffer && !activeOrder && (
              <div className="bg-gradient-to-b from-amber-950/80 to-zinc-900 border-2 border-amber-500/80 rounded-2xl p-3.5 shadow-xl animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 rounded-full bg-amber-500 text-black text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                    <Car className="w-3 h-3" /> Новый заказ!
                  </span>
                  <span className="text-amber-400 text-xs font-mono font-bold">
                    {Math.max(0, Math.ceil((pendingOffer.expiresAt - Date.now()) / 1000))}с
                  </span>
                </div>

                <div className="space-y-2 mb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white flex items-center gap-1.5">
                      <User className="w-4 h-4 text-amber-400" />
                      {pendingOffer.passengerName}
                    </span>
                    <span className="text-base font-extrabold text-amber-300">
                      ~{pendingOffer.estimatedFare} ₽
                    </span>
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-1.5 text-zinc-300">
                      <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span className="truncate">{pendingOffer.pickup.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-zinc-300">
                      <Navigation className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      <span className="truncate">{pendingOffer.dropoff.name}</span>
                    </div>
                  </div>

                  <div className="text-[10px] text-zinc-400 flex items-center justify-between pt-1 border-t border-zinc-800">
                    <span>Расстояние маршрута:</span>
                    <span className="font-semibold text-zinc-200">
                      {(pendingOffer.estimatedDistanceMeters / 1000).toFixed(1)} км
                    </span>
                  </div>
                </div>

                {/* Accept / Decline Action Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleDeclineOffer}
                    className="py-2 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <X className="w-4 h-4" /> Отклонить
                  </button>
                  <button
                    onClick={handleAcceptOffer}
                    className="py-2 px-3 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Принять
                  </button>
                </div>
              </div>
            )}

            {/* --- ACTIVE ORDER CARD & TAXIMETER --- */}
            {activeOrder && (
              <div className="bg-zinc-900 border border-amber-500/50 rounded-2xl p-3.5 shadow-xl space-y-3">
                {/* Order Header & Stage */}
                <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                  <div>
                    <div className="text-[10px] text-zinc-400 uppercase font-semibold">Активный заказ</div>
                    <div className="text-sm font-bold text-white flex items-center gap-1.5">
                      <User className="w-4 h-4 text-amber-400" />
                      {activeOrder.passengerName}
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        activeOrder.stage === 'driving_to_pickup'
                          ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
                          : activeOrder.stage === 'waiting_for_passenger'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                          : activeOrder.stage === 'in_transit'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : 'bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      {activeOrder.stage === 'driving_to_pickup' && 'Подача машины'}
                      {activeOrder.stage === 'waiting_for_passenger' && 'Ожидание посадки'}
                      {activeOrder.stage === 'passenger_boarding' && 'Посадка в салон'}
                      {activeOrder.stage === 'in_transit' && 'В пути'}
                      {activeOrder.stage === 'passenger_alighting' && 'Высадка'}
                    </span>
                  </div>
                </div>

                {/* Stage Specific Instructions */}
                {activeOrder.stage === 'driving_to_pickup' && (
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between text-zinc-300">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-rose-400" /> Точка подачи:
                      </span>
                      <strong className="text-white">{activeOrder.pickup.name}</strong>
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      Подъезжайте к пассажиру и притормозите у обочины. Пассажир подойдет и сядет в салон.
                    </div>
                    <button
                      onClick={() => handleSetGpsToTarget(activeOrder.pickup)}
                      className="w-full py-1.5 bg-sky-600/30 hover:bg-sky-600/50 border border-sky-500/50 text-sky-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Navigation className="w-3.5 h-3.5" /> Маршрут к подаче в GPS
                    </button>
                  </div>
                )}

                {activeOrder.stage === 'waiting_for_passenger' && (
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-300 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-400" /> Ожидание у точки:
                      </span>
                      <span className="font-mono font-bold text-amber-400">
                        {Math.floor(activeOrder.waitingSeconds)} сек
                      </span>
                    </div>

                    <div className="bg-zinc-800/80 rounded-xl p-2 text-[11px] space-y-1">
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Бесплатное ожидание:</span>
                        <span className="text-white">
                          {Math.max(0, Math.floor(activeOrder.freeWaitingSeconds - activeOrder.waitingSeconds))} сек
                        </span>
                      </div>
                      {activeOrder.paidWaitingFare > 0 && (
                        <div className="flex justify-between text-amber-400 font-semibold">
                          <span>Платное ожидание (15 ₽/мин):</span>
                          <span>+{activeOrder.paidWaitingFare} ₽</span>
                        </div>
                      )}
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      Остановитесь у правой стороны пассажира. Пассажир подходит к двери машины.
                    </div>
                  </div>
                )}

                {activeOrder.stage === 'in_transit' && (
                  <div className="space-y-2.5">
                    {/* Real-time Taximeter Display */}
                    <div className="bg-zinc-950 rounded-xl p-3 border border-zinc-800 text-center">
                      <div className="text-[10px] text-zinc-400 uppercase font-semibold">Счётчик поездки (Таксометр)</div>
                      <div className="text-2xl font-black text-amber-400 font-mono tracking-tight my-1">
                        {Math.round(
                          activeOrder.baseFare +
                          (activeOrder.distanceDrivenMeters / 1000) * activeOrder.ratePerKm +
                          activeOrder.paidWaitingFare
                        )} ₽
                      </div>
                      <div className="flex justify-around text-[10px] text-zinc-400 border-t border-zinc-800/80 pt-1.5">
                        <span>Пробег: {(activeOrder.distanceDrivenMeters / 1000).toFixed(2)} км</span>
                        <span>Посадка: {activeOrder.baseFare} ₽</span>
                        {activeOrder.paidWaitingFare > 0 && (
                          <span className="text-amber-400 font-semibold">Ожидание: +{activeOrder.paidWaitingFare} ₽</span>
                        )}
                      </div>
                    </div>

                    {/* Destination details */}
                    <div className="text-xs space-y-1">
                      <div className="flex items-center justify-between text-zinc-300">
                        <span className="flex items-center gap-1">
                          <Navigation className="w-3.5 h-3.5 text-sky-400" /> Высадка:
                        </span>
                        <strong className="text-white">{activeOrder.dropoff.name}</strong>
                      </div>
                    </div>

                    {/* Comfort & Driving Rating Meter */}
                    <div className="bg-zinc-800/60 rounded-xl p-2 text-xs space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-zinc-400">Комфорт поездки:</span>
                        <span
                          className={`font-bold ${
                            activeOrder.comfortScore >= 80
                              ? 'text-emerald-400'
                              : activeOrder.comfortScore >= 50
                              ? 'text-amber-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {Math.round(activeOrder.comfortScore)}%
                        </span>
                      </div>
                      <div className="w-full bg-zinc-700 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            activeOrder.comfortScore >= 80
                              ? 'bg-emerald-500'
                              : activeOrder.comfortScore >= 50
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.max(5, activeOrder.comfortScore)}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-zinc-500">
                        {activeOrder.comfortScore >= 80
                          ? 'Пассажир спокоен. Высокий шанс чаевых и 5 звёзд.'
                          : 'Избегайте резких заносов и столкновений с машинами!'}
                      </div>
                    </div>

                    {/* Passenger speech bubble if any */}
                    {activeOrder.passengerSpeech && (
                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-2 text-xs text-amber-200 italic">
                        "{activeOrder.passengerSpeech}"
                      </div>
                    )}

                    <button
                      onClick={() => handleSetGpsToTarget(activeOrder.dropoff)}
                      className="w-full py-1.5 bg-sky-600/30 hover:bg-sky-600/50 border border-sky-500/50 text-sky-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Navigation className="w-3.5 h-3.5" /> Маршрут к высадке в GPS
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Standard Fleet Tariffs Card */}
            <div className="bg-zinc-900 rounded-2xl p-3 border border-zinc-800 text-xs space-y-2">
              <div className="font-bold text-white flex items-center gap-1.5 text-xs">
                <Shield className="w-4 h-4 text-amber-400" />
                Тарифная сетка «Эконом-Степь»
              </div>
              <div className="grid grid-cols-3 gap-1.5 text-center pt-1">
                <div className="bg-zinc-800/80 p-2 rounded-xl">
                  <div className="text-[10px] text-zinc-400">Посадка</div>
                  <div className="text-sm font-extrabold text-amber-400">150 ₽</div>
                </div>
                <div className="bg-zinc-800/80 p-2 rounded-xl">
                  <div className="text-[10px] text-zinc-400">За 1 км</div>
                  <div className="text-sm font-extrabold text-emerald-400">45 ₽</div>
                </div>
                <div className="bg-zinc-800/80 p-2 rounded-xl">
                  <div className="text-[10px] text-zinc-400">Ожидание</div>
                  <div className="text-sm font-extrabold text-sky-400">15 ₽/мин</div>
                </div>
              </div>
              <div className="text-[10px] text-zinc-500">
                • Первые 2 минуты ожидания у клиента — бесплатно.<br />
                • Оплата передается пассажиром наличными в руки в конце поездки.
              </div>
            </div>
          </>
        )}

        {/* ===================== TAB: REVIEWS & REPUTATION ===================== */}
        {activeTab === 'reviews' && (
          <>
            {/* Rating Summary Card */}
            <div className="bg-zinc-900 rounded-2xl p-3.5 border border-zinc-800 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-zinc-400 uppercase font-bold">Рейтинг водителя</div>
                <div className="text-2xl font-black text-amber-400 flex items-center gap-1.5">
                  <Star className="w-6 h-6 fill-amber-400 text-amber-400" />
                  {profile.rating.toFixed(2)}
                </div>
                <div className="text-[10px] text-zinc-400">
                  Всего поездок: {profile.totalRidesCompleted}
                </div>
              </div>

              <div className="text-right">
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
                  Высший класс
                </span>
                <div className="text-[10px] text-zinc-400 mt-1">Доступ ко всем заказам</div>
              </div>
            </div>

            {/* Reviews Feed */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-zinc-300">Последние отзывы пассажиров:</div>

              {profile.reviews.length === 0 ? (
                <div className="text-xs text-zinc-500 text-center py-6 bg-zinc-900/50 rounded-2xl">
                  Пока нет отзывов. Выполняйте поездки, чтобы получать отзывы и оценки!
                </div>
              ) : (
                profile.reviews.map(rev => (
                  <div
                    key={rev.id}
                    className="bg-zinc-900 rounded-2xl p-3 border border-zinc-800 space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-zinc-400" />
                        {rev.author}
                      </span>
                      <div className="flex items-center gap-0.5 text-amber-400">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${
                              i < rev.rating
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-zinc-700'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <p className="text-zinc-300 text-[11px] leading-relaxed">
                      "{rev.comment}"
                    </p>

                    {rev.tags && rev.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {rev.tags.map((t, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400 text-[9px] font-medium"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1 border-t border-zinc-800/80">
                      <span>{rev.date}</span>
                      <span className="text-zinc-400">
                        Оплата: {rev.farePaid} ₽{rev.tipPaid > 0 ? ` (+${rev.tipPaid} ₽ чай)` : ''}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* ===================== TAB: EARNINGS & STATS ===================== */}
        {activeTab === 'earnings' && (
          <>
            {/* Total Income Card */}
            <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-2xl p-4 border border-zinc-800 text-center space-y-1">
              <div className="text-[10px] text-zinc-400 uppercase font-semibold">Всего заработано в такси</div>
              <div className="text-3xl font-black text-emerald-400 font-mono tracking-tight">
                {profile.totalIncome.toLocaleString('ru-RU')} ₽
              </div>
              <div className="text-[11px] text-zinc-400 flex items-center justify-center gap-1">
                <Coins className="w-3.5 h-3.5 text-amber-400" /> Получено наличными от клиентов
              </div>
            </div>

            {/* Stats Breakdown Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-zinc-900 p-3 rounded-2xl border border-zinc-800">
                <div className="text-[10px] text-zinc-400 mb-0.5">Выполнено поездок</div>
                <div className="text-lg font-bold text-white">{profile.totalRidesCompleted}</div>
                <div className="text-[9px] text-zinc-500">За все время</div>
              </div>

              <div className="bg-zinc-900 p-3 rounded-2xl border border-zinc-800">
                <div className="text-[10px] text-zinc-400 mb-0.5">Средний чек</div>
                <div className="text-lg font-bold text-amber-400">
                  {profile.totalRidesCompleted > 0
                    ? Math.round(profile.totalIncome / profile.totalRidesCompleted)
                    : 0}{' '}
                  ₽
                </div>
                <div className="text-[9px] text-zinc-500">За поездку</div>
              </div>
            </div>

            {/* Financial & Safety Tips */}
            <div className="bg-zinc-900 rounded-2xl p-3.5 border border-zinc-800 text-xs space-y-2">
              <div className="font-bold text-white flex items-center gap-1.5 text-xs">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Советы по заработку
              </div>
              <ul className="space-y-1.5 text-[11px] text-zinc-300 list-disc list-inside">
                <li>Водите плавно, не дрифтуйте на перекрестках — довольные пассажиры оставляют щедрые чаевые (до +100-300 ₽).</li>
                <li>Если клиент задерживается на посадке более 2 минут, включается платное ожидание (15 ₽ в минуту).</li>
                <li>Следите за уровнем бензина и маслом в двигателе на АЗС и СТО PIT-STOP.</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
