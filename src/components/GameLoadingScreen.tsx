import React, { useLayoutEffect, useRef } from 'react';
import menuCss from './mainMenu.css?inline';
import { ShadowHost, attachStageFit } from './ShadowHost';
import { VehiclePreviewCanvas } from './VehiclePreviewCanvas';

export interface LoadingScreenState {
  isOpen: boolean;
  /** 'new_career' | 'new_freeroam' | 'load_save' | 'save_game' | 'exit_menu' */
  actionType: 'new_career' | 'new_freeroam' | 'load_save' | 'save_game' | 'exit_menu';
  title: string;
  subtitle?: string;
  stepText: string;
  progress: number;
  mode?: 'career' | 'freeroam';
  locationName?: string;
  locationCategory?: string;
  timeHour?: number;
  weather?: string;
  vehicleType?: string;
  vehicleName?: string;
  vehicleColor?: string;
  vehicleRoofColor?: string;
  frameId?: string;
  bodyId?: string;
  saveName?: string;
}

const WEATHER_LABELS: Record<string, string> = {
  clear: 'Ясно',
  overcast: 'Пасмурно',
  rain: 'Дождь',
  fog: 'Туман',
  snow: 'Снег'
};

const CATEGORY_THUMB: Record<string, string> = {
  city: 'm4',
  highway: 'm2',
  nature: 'm3',
  mountain: 'm5',
  industrial: 'm7'
};

const fmtHour = (h?: number) => {
  if (h === undefined || !Number.isFinite(h)) return '12:00';
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
};

const LOADING_TIPS: Record<LoadingScreenState['actionType'], string> = {
  new_career: 'В режиме карьеры работают все городские службы, трафик, пешеходы, смена времени суток и экономика.',
  new_freeroam: 'В режиме свободной езды отключён трафик и пешеходы. Переключать узлы автомобиля и время можно через радиальное меню.',
  load_save: 'Восстанавливаются координаты игрока, состояние кузова и узлов сохранённых автомобилей, инвентарь и недвижимость.',
  save_game: 'Запись состояния мира, припаркованного транспорта с ключами и параметров персонажа в память браузера.',
  exit_menu: 'Завершение активной сессии и выгрузка динамических объектов мира.'
};

const extraCss = `
@keyframes pulseBar {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.72; }
}
.ld-bar-fill {
  height: 100%;
  background: #c9922b;
  transition: width 0.28s cubic-bezier(.2,.8,.2,1);
  animation: pulseBar 1.8s ease-in-out infinite;
}
.ld-step-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #c9922b;
  flex: none;
}
.ld-grid {
  display: grid;
  grid-template-columns: 1fr 440px;
  gap: 28px;
  align-items: stretch;
}
.gm[data-mob] .ld-wrap {
  left: 28px !important;
  right: 28px !important;
  top: 72px !important;
  bottom: 24px !important;
  width: auto !important;
  height: auto !important;
}
.gm[data-mob] .ld-grid {
  grid-template-columns: 1fr 340px;
  gap: 18px;
}
.gm[data-mob] .ld-title {
  font-size: 32px !important;
}
.gm[data-mob] .ld-preview {
  height: 150px !important;
}
`;

export const GameLoadingScreen: React.FC<{ state: LoadingScreenState }> = ({ state }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const gmRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => attachStageFit(() => wrapRef.current, () => gmRef.current), []);

  if (!state.isOpen) return null;

  const pct = Math.min(100, Math.max(4, Math.round(state.progress)));
  const isFreeroam = state.mode === 'freeroam' || state.actionType === 'new_freeroam';
  const thumbCls = CATEGORY_THUMB[state.locationCategory || ''] || (isFreeroam ? 'm5' : 'm1');
  const weatherLabel = WEATHER_LABELS[state.weather || 'clear'] || 'Ясно';

  return (
    <ShadowHost css={menuCss + '\n' + extraCss} zIndex={90} background="#0d0e10">
      <div className="gmw" id="w" ref={wrapRef}>
        <div className="gm p1" id="gm" ref={gmRef}>
          {/* Atmospheric layered background matching MainMenu */}
          <div className="a" style={{ inset: 0, background: 'linear-gradient(180deg,#17140f,#2b2218 58%,#120f0b)' }} />
          <div
            className="glow a"
            style={{
              left: -200,
              top: 0,
              width: 'calc(var(--sw,1440px) + 400px)',
              height: 900,
              background: 'radial-gradient(900px 520px at 70% 82%,rgba(201,146,43,.42),transparent 62%)'
            }}
          />
          <svg className="lay l1" viewBox="0 0 1760 900" preserveAspectRatio="none">
            <path d="M0 640 180 520 330 600 520 430 700 580 880 470 1080 600 1260 500 1440 590 1600 520 1760 600V900H0Z" fill="#2a1f14" opacity=".75" />
          </svg>
          <svg className="lay l2" viewBox="0 0 1760 900" preserveAspectRatio="none">
            <path d="M0 720 220 610 420 700 640 590 860 710 1060 630 1260 720 1440 650 1600 700 1760 640V900H0Z" fill="#1a140e" />
          </svg>
          <svg className="lay l3" viewBox="0 0 1760 900" preserveAspectRatio="none">
            <path d="M0 800 300 740 620 800 980 750 1440 810 1760 770V900H0Z" fill="#0f0c09" />
          </svg>
          <div className="a" style={{ inset: 0, background: 'rgba(9,9,10,.55)' }} />
          <div className="a" style={{ left: 0, right: 0, top: 0, height: 140, background: 'linear-gradient(180deg,rgba(0,0,0,.55),transparent)' }} />

          <div className="col">
            {/* Top header bar */}
            <div className="top st d0">
              <div className="row2" style={{ alignItems: 'center', gap: 14 }}>
                <svg width="36" height="36" viewBox="0 0 36 36">
                  <path d="M18 2 32 10v16L18 34 4 26V10z" fill="none" stroke="#c9922b" strokeWidth="2.5" />
                  <path d="M11 22 18 11l7 11z" fill="#c9922b" />
                </svg>
                <span className="cn" style={{ fontSize: 15, fontWeight: 600 }}>
                  {state.actionType === 'save_game' ? 'Сохранение данных' : 'Подготовка сессии'}
                </span>
              </div>
              <div className="row2" style={{ alignItems: 'center', gap: 10 }}>
                {state.mode && (
                  <span className={'mode-badge ' + (isFreeroam ? 'mode-freeroam' : 'mode-career')} style={{ fontSize: 13, padding: '4px 10px' }}>
                    {isFreeroam ? 'FREEROAM' : 'КАРЬЕРА'}
                  </span>
                )}
              </div>
            </div>

            {/* Main content container */}
            <div
              className="a ld-wrap"
              style={{
                left: 64,
                right: 64,
                top: 148,
                bottom: 92,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div className="ld-grid" style={{ flex: 1, minHeight: 0 }}>
                {/* Left column: Session summary & loading progress */}
                <div
                  className="panel st d1"
                  style={{
                    padding: '32px 36px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div className="cn mut" style={{ fontSize: 13 }}>
                      {state.subtitle || (isFreeroam ? 'Режим свободной езды' : 'Режим карьеры')}
                    </div>
                    <div className="cn ld-title" style={{ fontSize: 44, fontWeight: 700, marginTop: 6, lineHeight: 1.05, color: '#fff' }}>
                      {state.title}
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                        gap: 20,
                        marginTop: 28,
                        paddingTop: 22,
                        borderTop: '1px solid rgba(255,255,255,.08)'
                      }}
                    >
                      <div>
                        <div className="lbl">Точка старта</div>
                        <div style={{ fontSize: 16, fontWeight: 600, color: '#e9e6df' }}>
                          {state.locationName || 'Центральный район'}
                        </div>
                      </div>
                      <div>
                        <div className="lbl">Время и погода</div>
                        <div style={{ fontSize: 16, fontWeight: 600, color: '#e9e6df', fontVariantNumeric: 'tabular-nums' }}>
                          {fmtHour(state.timeHour)} · {weatherLabel}
                        </div>
                      </div>
                      <div>
                        <div className="lbl">Транспорт</div>
                        <div style={{ fontSize: 16, fontWeight: 600, color: '#e0ab45' }}>
                          {state.vehicleName || (state.vehicleType ? state.vehicleType : 'Пешком')}
                        </div>
                      </div>
                    </div>

                    {state.saveName && (
                      <div
                        style={{
                          marginTop: 20,
                          padding: '12px 16px',
                          borderRadius: 10,
                          background: 'rgba(255,255,255,.04)',
                          border: '1px solid rgba(255,255,255,.07)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <span className="mut" style={{ fontSize: 13 }}>Файл сохранения</span>
                        <span style={{ fontWeight: 600, fontSize: 14, color: '#e9e6df' }}>«{state.saveName}»</span>
                      </div>
                    )}
                  </div>

                  {/* Progress section at the bottom of the left card */}
                  <div style={{ marginTop: 28 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className="ld-step-dot" />
                        <span style={{ fontSize: 15, fontWeight: 500, color: '#e9e6df' }}>{state.stepText}</span>
                      </div>
                      <span
                        className="cn"
                        style={{
                          fontSize: 22,
                          fontWeight: 700,
                          color: '#e0ab45',
                          fontVariantNumeric: 'tabular-nums'
                        }}
                      >
                        {pct}%
                      </span>
                    </div>
                    <div className="bar" style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,.1)' }}>
                      <div className="ld-bar-fill" style={{ width: pct + '%' }} />
                    </div>
                    <div className="mut" style={{ fontSize: 13, marginTop: 14, lineHeight: 1.45 }}>
                      {LOADING_TIPS[state.actionType]}
                    </div>
                  </div>
                </div>

                {/* Right column: Visual preview of location & vehicle */}
                <div
                  className="panel st d2"
                  style={{
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <div
                    className={'th ld-preview ' + thumbCls}
                    style={{
                      height: 260,
                      borderRadius: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative'
                    }}
                  >
                    {state.vehicleType && (
                      <div style={{ position: 'relative', zIndex: 2, width: '88%', display: 'flex', justifyContent: 'center' }}>
                        <VehiclePreviewCanvas
                          carType={state.vehicleType}
                          color={state.vehicleColor || '#38bdf8'}
                          roofColor={state.vehicleRoofColor || state.vehicleColor || '#38bdf8'}
                          frameId={state.frameId}
                          bodyId={state.bodyId}
                          width={360}
                          height={200}
                          showPedestal={false}
                        />
                      </div>
                    )}
                  </div>

                  <div style={{ padding: '18px 10px 8px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div className="cn mut" style={{ fontSize: 12 }}>
                        {state.vehicleType ? 'Конфигурация транспорта' : 'Параметры мира'}
                      </div>
                      <div className="cn" style={{ fontSize: 26, fontWeight: 700, marginTop: 4, lineHeight: 1.1 }}>
                        {state.vehicleName || state.locationName || 'Flatbody'}
                      </div>
                      <div className="mut" style={{ fontSize: 13, marginTop: 8, lineHeight: 1.5 }}>
                        {isFreeroam
                          ? 'Автомобиль будет создан на выбранной точке старта с ключом в замке зажигания и запущенным двигателем.'
                          : 'Инициализация дорожной сети, интерьеров зданий, расписания поездов и симуляции трафика.'}
                      </div>
                    </div>

                    <div
                      style={{
                        paddingTop: 14,
                        borderTop: '1px solid rgba(255,255,255,.07)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 13
                      }}
                    >
                      <span className="mut">Статус мира</span>
                      <span style={{ color: '#e0ab45', fontWeight: 600 }}>Синхронизация...</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom hint bar */}
            <div className="hint st d3">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="mut">Пожалуйста, подождите завершения загрузки</span>
              </div>
              <div>Flatbody Simulator</div>
            </div>
          </div>
        </div>
      </div>
    </ShadowHost>
  );
};
