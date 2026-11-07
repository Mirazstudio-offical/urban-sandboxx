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
  TrendingUp
} from 'lucide-react';
import { Player, GameWorld, Vehicle } from '../types';
import { TaxiFleetSystem } from '../taxiSystem';
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
    <div className="ph-view">
      {/* MainMenu-styled App Header */}
      <div className="ph-app-top">
        <div className="ph-app-top-l">
          <button
            type="button"
            onClick={onBack}
            className="ph-back"
            title="Назад"
            aria-label="Назад"
          >
            <ChevronLeft width={18} height={18} />
          </button>
          <div style={{ minWidth: 0 }}>
            <div className="ph-app-ttl">Степь-Такси</div>
            <div className="ph-app-sub">Диспетчерская таксопарка · 24/7</div>
          </div>
        </div>

        {/* Clean unboxed tabular rating */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Star width={15} height={15} fill="#e0ab45" color="#e0ab45" />
          <span className="ph-num" style={{ fontSize: 20 }}>{profile.rating.toFixed(2)}</span>
        </div>
      </div>

      {/* MainMenu-styled Tabs */}
      <div className="ph-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'shift'}
          onClick={() => { sound.click(); setActiveTab('shift'); }}
          className={'ph-tab' + (activeTab === 'shift' ? ' on' : '')}
        >
          <Car width={14} height={14} />
          <span>Смена</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'reviews'}
          onClick={() => { sound.click(); setActiveTab('reviews'); }}
          className={'ph-tab' + (activeTab === 'reviews' ? ' on' : '')}
        >
          <Star width={14} height={14} />
          <span>Отзывы · {profile.reviews.length}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'earnings'}
          onClick={() => { sound.click(); setActiveTab('earnings'); }}
          className={'ph-tab' + (activeTab === 'earnings' ? ' on' : '')}
        >
          <Coins width={14} height={14} />
          <span>Доходы</span>
        </button>
      </div>

      {/* Main Scrollable Content */}
      <div className="ph-scroll" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* ===================== TAB: SHIFT & ORDERS ===================== */}
        {activeTab === 'shift' && (
          <>
            {/* Shift Control Card */}
            <div className="ph-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div className="ph-cn" style={{ fontSize: 16, fontWeight: 700, color: profile.isShiftActive ? '#9ac985' : '#e9e6df' }}>
                  {profile.isShiftActive ? 'На линии · Активна' : 'Смена закрыта'}
                </div>
                <div className="ph-mut" style={{ fontSize: 12, marginTop: 2 }}>
                  {profile.isShiftActive
                    ? activeOrder
                      ? 'Выполняется заказ клиента'
                      : 'Поиск заказов поблизости...'
                    : 'Выйдите на линию для приёма вызовов'}
                </div>
              </div>

              {profile.isShiftActive ? (
                <button type="button" onClick={handleEndShift} className="ph-btn ph-btn-d ph-btn-sm">
                  <Square width={13} height={13} /> Завершить
                </button>
              ) : (
                <button type="button" onClick={handleStartShift} className="ph-btn ph-btn-p ph-btn-sm">
                  <Play width={13} height={13} fill="#1a1409" /> На линию
                </button>
              )}
            </div>

            {/* Vehicle Status Row */}
            <div className="ph-list">
              <div className="ph-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <Car width={17} height={17} color={carName ? '#e0ab45' : '#a29e93'} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {carName || 'Пешком (сядьте в авто)'}
                    </div>
                    <div className="ph-mut" style={{ fontSize: 11 }}>
                      {carName ? 'Транспорт допущен к смене' : 'Для работы требуется автомобиль'}
                    </div>
                  </div>
                </div>
                {carName ? (
                  <CheckCircle2 width={16} height={16} color="#9ac985" />
                ) : (
                  <AlertTriangle width={16} height={16} color="#e0ab45" />
                )}
              </div>
            </div>

            {/* --- INCOMING ORDER OFFER ALERT --- */}
            {pendingOffer && !activeOrder && (
              <div
                className="ph-panel"
                style={{
                  borderColor: '#c9922b',
                  background: 'linear-gradient(180deg, rgba(201, 146, 43, 0.16), rgba(20, 20, 22, 0.94))'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span className="ph-cn" style={{ fontSize: 14, fontWeight: 700, color: '#f0c264' }}>
                    Входящий вызов · Новый заказ
                  </span>
                  <span className="ph-num" style={{ fontSize: 18 }}>
                    {Math.max(0, Math.ceil((pendingOffer.expiresAt - Date.now()) / 1000))} с
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 15, color: '#fff' }}>
                    <User width={15} height={15} color="#e0ab45" />
                    <span>{pendingOffer.passengerName}</span>
                  </div>
                  <div className="ph-num" style={{ fontSize: 24 }}>
                    ~{pendingOffer.estimatedFare} ₽
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, padding: '8px 0', borderTop: '1px solid rgba(255,255,255,0.08)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <MapPin width={14} height={14} color="#d9745a" style={{ flex: 'none' }} />
                    <span className="ph-mut">Подача:</span>
                    <span style={{ color: '#fff', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pendingOffer.pickup.name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <Navigation width={14} height={14} color="#e0ab45" style={{ flex: 'none' }} />
                    <span className="ph-mut">Куда:</span>
                    <span style={{ color: '#fff', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pendingOffer.dropoff.name}</span>
                  </div>
                  <div className="ph-mut" style={{ fontSize: 11, marginTop: 2 }}>
                    Дистанция маршрута · {(pendingOffer.estimatedDistanceMeters / 1000).toFixed(1)} км
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
                  <button type="button" onClick={handleDeclineOffer} className="ph-btn ph-btn-s ph-btn-sm">
                    <X width={14} height={14} /> Отклонить
                  </button>
                  <button type="button" onClick={handleAcceptOffer} className="ph-btn ph-btn-p ph-btn-sm">
                    <CheckCircle2 width={14} height={14} /> Принять
                  </button>
                </div>
              </div>
            )}

            {/* --- ACTIVE ORDER CARD & TAXIMETER --- */}
            {activeOrder && (
              <div className="ph-panel" style={{ borderColor: 'rgba(201, 146, 43, 0.55)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <div>
                    <div className="ph-cn ph-mut" style={{ fontSize: 11 }}>Активный заказ</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 700, color: '#fff', marginTop: 2 }}>
                      <User width={14} height={14} color="#e0ab45" />
                      <span>{activeOrder.passengerName}</span>
                    </div>
                  </div>
                  <div className="ph-cn" style={{ fontSize: 13, fontWeight: 700, color: '#f0c264' }}>
                    {activeOrder.stage === 'driving_to_pickup' && 'Подача авто'}
                    {activeOrder.stage === 'waiting_for_passenger' && 'Ожидание посадки'}
                    {activeOrder.stage === 'passenger_boarding' && 'Посадка'}
                    {activeOrder.stage === 'in_transit' && 'В пути'}
                    {activeOrder.stage === 'passenger_alighting' && 'Высадка'}
                  </div>
                </div>

                {activeOrder.stage === 'driving_to_pickup' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="ph-mut">Точка подачи:</span>
                      <strong style={{ color: '#fff' }}>{activeOrder.pickup.name}</strong>
                    </div>
                    <div className="ph-mut" style={{ fontSize: 11, lineHeight: 1.4 }}>
                      Подъезжайте к клиенту и остановитесь у обочины для посадки.
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSetGpsToTarget(activeOrder.pickup)}
                      className="ph-btn ph-btn-s ph-btn-sm ph-btn-block"
                    >
                      <Navigation width={13} height={13} color="#e0ab45" /> Маршрут к подаче в GPS
                    </button>
                  </div>
                )}

                {activeOrder.stage === 'waiting_for_passenger' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="ph-mut" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Clock width={13} height={13} color="#e0ab45" /> Ожидание клиента:
                      </span>
                      <span className="ph-num" style={{ fontSize: 18 }}>{Math.floor(activeOrder.waitingSeconds)} сек</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                      <span className="ph-mut">Бесплатное ожидание:</span>
                      <span>{Math.max(0, Math.floor(activeOrder.freeWaitingSeconds - activeOrder.waitingSeconds))} сек</span>
                    </div>
                    {activeOrder.paidWaitingFare > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#f0c264', fontWeight: 600 }}>
                        <span>Платное ожидание:</span>
                        <span>+{activeOrder.paidWaitingFare} ₽</span>
                      </div>
                    )}
                  </div>
                )}

                {activeOrder.stage === 'in_transit' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {/* Taximeter */}
                    <div style={{ background: 'rgba(0,0,0,0.38)', borderRadius: 9, padding: '10px 12px', border: '1px solid rgba(255,255,255,0.07)', textAlign: 'center' }}>
                      <div className="ph-cn ph-mut" style={{ fontSize: 11 }}>Таксометр · Текущий чек</div>
                      <div className="ph-num" style={{ fontSize: 34, margin: '4px 0' }}>
                        {Math.round(
                          activeOrder.baseFare +
                          (activeOrder.distanceDrivenMeters / 1000) * activeOrder.ratePerKm +
                          activeOrder.paidWaitingFare
                        )} ₽
                      </div>
                      <div className="ph-mut" style={{ fontSize: 11 }}>
                        Пробег {(activeOrder.distanceDrivenMeters / 1000).toFixed(2)} км · Посадка {activeOrder.baseFare} ₽
                        {activeOrder.paidWaitingFare > 0 ? ` · Ожидание +${activeOrder.paidWaitingFare} ₽` : ''}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span className="ph-mut">Пункт назначения:</span>
                      <strong style={{ color: '#fff' }}>{activeOrder.dropoff.name}</strong>
                    </div>

                    {/* Comfort bar */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                        <span className="ph-mut">Плавность вождения</span>
                        <span style={{ fontWeight: 700, color: activeOrder.comfortScore >= 80 ? '#9ac985' : activeOrder.comfortScore >= 50 ? '#e0ab45' : '#d9745a' }}>
                          {Math.round(activeOrder.comfortScore)}%
                        </span>
                      </div>
                      <div className="ph-bar">
                        <i style={{
                          width: `${Math.max(5, activeOrder.comfortScore)}%`,
                          background: activeOrder.comfortScore >= 80 ? '#9ac985' : activeOrder.comfortScore >= 50 ? '#c9922b' : '#d9745a'
                        }} />
                      </div>
                    </div>

                    {activeOrder.passengerSpeech && (
                      <div style={{ padding: '7px 10px', borderRadius: 8, background: 'rgba(201,146,43,0.1)', border: '1px solid rgba(201,146,43,0.3)', fontSize: 12, color: '#f0c264', fontStyle: 'italic' }}>
                        «{activeOrder.passengerSpeech}»
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => handleSetGpsToTarget(activeOrder.dropoff)}
                      className="ph-btn ph-btn-s ph-btn-sm ph-btn-block"
                    >
                      <Navigation width={13} height={13} color="#e0ab45" /> Маршрут к высадке в GPS
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Tariff Schedule */}
            <div className="ph-panel">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <Shield width={14} height={14} color="#e0ab45" />
                <span className="ph-cn" style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Тариф «Эконом-Степь»</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, textAlign: 'center' }}>
                <div style={{ padding: '8px 6px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="ph-mut" style={{ fontSize: 10 }}>Посадка</div>
                  <div className="ph-num" style={{ fontSize: 20, marginTop: 2 }}>150 ₽</div>
                </div>
                <div style={{ padding: '8px 6px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="ph-mut" style={{ fontSize: 10 }}>За 1 км</div>
                  <div className="ph-num" style={{ fontSize: 20, marginTop: 2, color: '#9ac985' }}>45 ₽</div>
                </div>
                <div style={{ padding: '8px 6px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="ph-mut" style={{ fontSize: 10 }}>Ожидание</div>
                  <div className="ph-num" style={{ fontSize: 20, marginTop: 2 }}>15 ₽/м</div>
                </div>
              </div>
              <div className="ph-mut" style={{ fontSize: 11, marginTop: 8, lineHeight: 1.45 }}>
                Первые 2 минуты ожидания бесплатны. Расчёт наличными по завершении маршрута.
              </div>
            </div>
          </>
        )}

        {/* ===================== TAB: REVIEWS & REPUTATION ===================== */}
        {activeTab === 'reviews' && (
          <>
            <div className="ph-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div className="ph-cn ph-mut" style={{ fontSize: 11 }}>Рейтинг водителя</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                  <Star width={20} height={20} fill="#e0ab45" color="#e0ab45" />
                  <span className="ph-num" style={{ fontSize: 32 }}>{profile.rating.toFixed(2)}</span>
                </div>
                <div className="ph-mut" style={{ fontSize: 11, marginTop: 2 }}>
                  Выполнено заказов · {profile.totalRidesCompleted}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="ph-cn" style={{ fontSize: 14, fontWeight: 700, color: '#9ac985' }}>Высший приоритет</div>
                <div className="ph-mut" style={{ fontSize: 11, marginTop: 2 }}>Все тарифы открыты</div>
              </div>
            </div>

            <div className="ph-grp">Отзывы пассажиров</div>

            {profile.reviews.length === 0 ? (
              <div className="ph-panel" style={{ textAlign: 'center', padding: '28px 16px' }}>
                <div className="ph-mut" style={{ fontSize: 12 }}>
                  Отзывов пока нет. Завершите первую поездку на линии.
                </div>
              </div>
            ) : (
              <div className="ph-list">
                {profile.reviews.map(rev => (
                  <div key={rev.id} className="ph-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6, padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 600, fontSize: 13, color: '#fff' }}>{rev.author}</span>
                      <div style={{ display: 'flex', gap: 2 }}>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            width={12}
                            height={12}
                            fill={i < rev.rating ? '#e0ab45' : 'none'}
                            color={i < rev.rating ? '#e0ab45' : '#5d5a52'}
                          />
                        ))}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: '#cfcbc1', lineHeight: 1.4 }}>«{rev.comment}»</div>
                    {rev.tags && rev.tags.length > 0 && (
                      <div className="ph-mut" style={{ fontSize: 11 }}>
                        {rev.tags.join(' · ')}
                      </div>
                    )}
                    <div className="ph-mut" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, paddingTop: 4, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <span>{rev.date}</span>
                      <span>Оплата {rev.farePaid} ₽{rev.tipPaid > 0 ? ` · Чай +${rev.tipPaid} ₽` : ''}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ===================== TAB: EARNINGS & STATS ===================== */}
        {activeTab === 'earnings' && (
          <>
            <div className="ph-panel" style={{ textAlign: 'center', padding: '16px 14px' }}>
              <div className="ph-cn ph-mut" style={{ fontSize: 12 }}>Общая выручка в таксопарке</div>
              <div className="ph-num" style={{ fontSize: 38, margin: '6px 0', color: '#9ac985' }}>
                {profile.totalIncome.toLocaleString('ru-RU')} ₽
              </div>
              <div className="ph-mut" style={{ fontSize: 11 }}>
                Выплачено наличными без комиссии парка
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div className="ph-panel">
                <div className="ph-mut" style={{ fontSize: 11 }}>Поездок завершено</div>
                <div className="ph-num" style={{ fontSize: 28, marginTop: 4, color: '#fff' }}>{profile.totalRidesCompleted}</div>
                <div className="ph-mut" style={{ fontSize: 10, marginTop: 2 }}>За всё время</div>
              </div>
              <div className="ph-panel">
                <div className="ph-mut" style={{ fontSize: 11 }}>Средний чек</div>
                <div className="ph-num" style={{ fontSize: 28, marginTop: 4 }}>
                  {profile.totalRidesCompleted > 0
                    ? Math.round(profile.totalIncome / profile.totalRidesCompleted)
                    : 0} ₽
                </div>
                <div className="ph-mut" style={{ fontSize: 10, marginTop: 2 }}>С учётом чаевых</div>
              </div>
            </div>

            <div className="ph-panel">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <TrendingUp width={14} height={14} color="#e0ab45" />
                <span className="ph-cn" style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Памятка водителя</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#cfcbc1', lineHeight: 1.4 }}>
                <div>· Плавное вождение без аварий гарантирует 5 звёзд и чаевые до 300 ₽.</div>
                <div>· Ожидание свыше 2 минут тарифицируется по 15 ₽/мин.</div>
                <div>· Следите за запасом топлива на АЗС и техническим состоянием в СТО PIT-STOP.</div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
