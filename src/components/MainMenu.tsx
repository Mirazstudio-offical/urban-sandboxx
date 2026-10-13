import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Plus, 
  FolderOpen, 
  Globe, 
  User, 
  Settings, 
  LogOut, 
  Bell, 
  ChevronLeft, 
  Check, 
  Volume2, 
  Monitor, 
  Gamepad2, 
  Sliders, 
  Shield, 
  Search, 
  Lock, 
  Star, 
  Activity, 
  RefreshCw,
  X,
  Compass,
  Key
} from 'lucide-react';

export interface SaveSlot {
  id: string;
  name: string;
  date: string;
  playerX: number;
  playerY: number;
  playerAngle?: number;
  isInVehicle: boolean;
  currentVehicleId: string | null;
  timeHour: number;
  weather: string;
  streetName: string;
  calendar?: any;
  season?: string;
  gpsDestination?: any;
  needs?: any;
  inventory?: any;
}

export interface SpawnLocation {
  id: string;
  name: string;
  nameRu: string;
  x: number;
  y: number;
  description: string;
  icon: React.ReactNode;
}

export interface MainMenuProps {
  onResume: () => void;
  onNewGame?: (saveName: string) => void;
}

type ScreenType = 'main' | 'new' | 'saves' | 'servers' | 'account' | 'settings' | 'notif' | 'create';

const MAPS = [
  ['Каньон', 'Серпантины, 94 км дорог', 'm1'],
  ['Побережье', 'Скоростные трассы', 'm2'],
  ['Северный лес', 'Грунтовки и лесовозы', 'm3'],
  ['Город', 'Плотный трафик', 'm4'],
  ['Перевал', 'Горы, снег, туман', 'm5'],
  ['Солончак', 'Открытое пространство', 'm6'],
  ['Полигон', 'Тесты и трюки', 'm7'],
  ['Остров', 'Побережье и бездорожье', 'm8']
];

const SAVES = [
  ['Серпантин · утро', 'Каньон', '14 ч 20 мин', '2 ч назад', 'm1'],
  ['Дорога вдоль берега', 'Побережье', '31 ч 05 мин', 'Вчера', 'm2'],
  ['Лесовоз · испытания', 'Северный лес', '8 ч 40 мин', '3 дня назад', 'm3'],
  ['Ночной город', 'Город', '19 ч 15 мин', '5 дней назад', 'm4'],
  ['Зимний перевал', 'Перевал', '6 ч 10 мин', '12 окт', 'm5'],
  ['Рекорд скорости', 'Солончак', '3 ч 55 мин', '2 окт', 'm6'],
  ['Остров · отпуск', 'Остров', '11 ч 30 мин', '28 сен', 'm8']
];

const SRV: [string, string, string, number, number, number, number, number, string, string][] = [
  ['Перевал · свободная езда', 'Alex_Dune', 'Перевал', 14, 24, 32, 0, 1, 'm5', 'Спокойная езда по серпантину без ограничений. Столкновения включены, без ночного режима.'],
  ['Дрифт-площадка №2', 'driftclub', 'Полигон', 22, 32, 41, 0, 0, 'm7', 'Открытая площадка для дрифта. Новичкам рады, правила в чате.'],
  ['Каньон: ралли-вечер', 'MariaK', 'Каньон', 8, 16, 55, 1, 0, 'm1', 'Закрытая гонка по каньону на закате. Вход по паролю от хоста.'],
  ['Город · неспешная езда', 'night_cruise', 'Город', 31, 32, 78, 0, 0, 'm4', 'Ночные покатушки по городу. Сервер почти полон.'],
  ['Грузовики и бездорожье', 'heavy_duty', 'Солончак', 5, 20, 92, 0, 0, 'm6', 'Тяжелая техника, груз и свободные просторы.'],
  ['Тест подвески (моды)', 'lab_rat', 'Полигон', 3, 8, 104, 1, 0, 'm7', 'Лаборатория для тестов. Требуются установленные моды.'],
  ['Горный серпантин', 'pass_hunter', 'Перевал', 11, 16, 148, 0, 0, 'm5', 'Горные дороги, снег и туман. Высокий пинг для вашего региона.'],
  ['Остров · фотосессия', 'lenscape', 'Остров', 2, 12, 163, 0, 0, 'm8', 'Тихий сервер для съёмки и скриншотов.']
];

const FR_NAMES = ['Alex_Dune', 'MariaK', 'tormoz_pro'];

const BADGE_ICONS = [
  'M12 6v6l3 2M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18',
  'M3 18l6-10 4 6 3-4 5 8z',
  'M4 16h16M6 16l1-5h10l1 5M8 19h.01M16 19h.01',
  'M12 3l2.5 6 6 .5-4.6 4 1.5 6.2L12 16.5 6.6 19.7l1.5-6.2-4.6-4 6-.5z',
  'M7 11h10v9H7zM9 11V8a3 3 0 0 1 6 0v3',
  'M7 11h10v9H7zM9 11V8a3 3 0 0 1 6 0v3',
  'M7 11h10v9H7zM9 11V8a3 3 0 0 1 6 0v3',
  'M7 11h10v9H7zM9 11V8a3 3 0 0 1 6 0v3'
];

const FRIENDS = [
  { initial: 'А', color: '#e0ab45', name: 'Alex_Dune', status: 'На сервере «Перевал»', dot: '#7fbf6a' },
  { initial: 'М', color: '#c9b98f', name: 'MariaK', status: 'Свободная езда', dot: '#7fbf6a' },
  { initial: 'Т', color: '#b98a4a', name: 'tormoz_pro', status: 'В главном меню', dot: '#7fbf6a' },
  { initial: 'Д', color: '#4a4741', name: 'Dimitri', status: 'Был в сети вчера', dot: '#5c5a54' }
];

export const MainMenu: React.FC<MainMenuProps> = ({ onResume, onNewGame }) => {
  const [cur, setCur] = useState<ScreenType>('main');
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [directionBack, setDirectionBack] = useState<boolean>(false);
  const [selectedMap, setSelectedMap] = useState<number>(0);
  const [selectedSave, setSelectedSave] = useState<number>(0);
  const [selectedSrv, setSelectedSrv] = useState<number>(0);
  const [srvFilter, setSrvFilter] = useState<string>('all');
  const [accTab, setAccTab] = useState<string>('acc-profile');
  const [settingsTab, setSettingsTab] = useState<string>('set-gfx');
  const [newGameName, setNewGameName] = useState<string>('Каньон · первая поездка');
  
  // Settings state
  const [vsync, setVsync] = useState<boolean>(true);
  const [refl, setRefl] = useState<boolean>(true);
  const [blur, setBlur] = useState<boolean>(false);
  const [renderDistance, setRenderDistance] = useState<number>(1600);
  const [brightness, setBrightness] = useState<number>(50);
  const [scale, setScale] = useState<number>(1);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Calculate scaling
  useEffect(() => {
    const updateScale = () => {
      if (!wrapperRef.current) return;
      const width = wrapperRef.current.clientWidth;
      const height = wrapperRef.current.clientHeight;
      const scaleX = width / 1440;
      const scaleY = height / 900;
      setScale(Math.min(scaleX, scaleY));
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  // Update newGameName when map changes
  useEffect(() => {
    setNewGameName(MAPS[selectedMap][0] + ' · первая поездка');
  }, [selectedMap]);

  const go = (target: ScreenType, back: boolean = false) => {
    if (isTransitioning || target === cur) return;
    setIsTransitioning(true);
    setDirectionBack(back);
    
    setTimeout(() => {
      setCur(target);
      setIsTransitioning(false);
    }, 240);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (cur === 'main') {
          onResume();
        } else if (cur === 'create') {
          go('servers', true);
        } else {
          go('main', true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cur, isTransitioning, onResume]);

  const calcFps = () => {
    return 128 - (vsync ? 8 : 0) - (refl ? 22 : 0) - (blur ? 14 : 0);
  };

  const getPingClass = (p: number) => {
    return p < 60 ? 'text-[#9ac985]' : p < 120 ? 'text-[#e0ab45]' : 'text-[#d9745a]';
  };

  const filteredServers = SRV.filter((v, i) => {
    if (srvFilter === 'fav') return !!v[7];
    if (srvFilter === 'recent') return i < 4;
    if (srvFilter === 'friends') return FR_NAMES.includes(v[1]);
    return true;
  });

  const selectedServerData = SRV[selectedSrv] || SRV[0];

  return (
    <div 
      ref={wrapperRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0d0e10] overflow-hidden select-none"
    >
      <style>{`
        .gmw {
          position: relative;
          width: 1440px;
          height: 900px;
          overflow: hidden;
          background: #121315;
          font-family: 'Barlow', system-ui, sans-serif;
          color: #e9e6df;
          font-size: 15px;
        }
        .cn {
          font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif;
          text-transform: uppercase;
          letter-spacing: .08em;
        }
        .mut { color: #a29e93; }
        .wipe {
          position: absolute; left: 0; top: 0; width: 100%; height: 3px; z-index: 9;
          opacity: 0; background: linear-gradient(90deg, transparent, #e0ab45 50%, transparent);
        }
        .wipe.on { animation: sweep .3s linear; }
        @keyframes sweep { 0% { opacity: 1; transform: translateX(-100%); } 100% { opacity: 1; transform: translateX(100%); } }
        @keyframes inF { from { opacity: 0; transform: translateX(48px); } to { opacity: 1; transform: none; } }
        @keyframes inB { from { opacity: 0; transform: translateX(-48px); } to { opacity: 1; transform: none; } }
        .scr-anim-in { animation: inF .35s cubic-bezier(.2,.8,.2,1) both; }
        .scr-anim-in-back { animation: inB .35s cubic-bezier(.2,.8,.2,1) both; }
        .chip {
          display: flex; align-items: center; gap: 10px; height: 44px; padding: 0 16px; border-radius: 10px;
          background: rgba(22,22,24,.75); border: 1px solid rgba(255,255,255,.09); transition: filter .15s, border-color .15s;
          cursor: pointer;
        }
        .chip:hover { filter: brightness(1.2); border-color: rgba(201,146,43,.5); }
        .panel {
          background: rgba(20,20,22,.85); border: 1px solid rgba(255,255,255,.09); border-radius: 14px;
        }
        .menu-i {
          display: flex; align-items: center; gap: 18px; height: 60px; padding: 0 22px;
          border-left: 3px solid transparent; font-size: 26px; font-weight: 600; color: #cfcbc1; width: 100%;
          transition: background .18s, border-color .18s, color .18s, padding .18s; cursor: pointer; text-align: left;
        }
        .menu-i:hover {
          background: rgba(255,255,255,.06); color: #fff; border-left-color: rgba(201,146,43,.8); padding-left: 28px;
        }
        .nav-i {
          display: flex; align-items: center; height: 50px; padding: 0 20px;
          border-left: 3px solid transparent; font-size: 20px; font-weight: 600; color: #cfcbc1; width: 100%;
          transition: background .18s, border-color .18s, color .18s, padding .18s; cursor: pointer; text-align: left;
        }
        .nav-i:hover { background: rgba(255,255,255,.05); padding-left: 24px; }
        .nav-on { background: rgba(201,146,43,.16); border-left-color: #c9922b; color: #fff; }
        .tab-btn {
          height: 44px; padding: 0 20px; display: inline-flex; align-items: center; font-size: 19px; font-weight: 600;
          color: #a29e93; border-bottom: 3px solid transparent; transition: color .15s, border-color .15s; cursor: pointer;
        }
        .tab-btn:hover { color: #fff; }
        .tab-btn-on { color: #fff; border-bottom-color: #c9922b; }
        .pill-btn {
          display: inline-flex; align-items: center; height: 34px; padding: 0 16px; border-radius: 17px;
          background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1); font-size: 14px; cursor: pointer;
        }
        .pill-btn:hover { background: rgba(255,255,255,.1); }
        .pill-btn-on { background: rgba(201,146,43,.2); border-color: rgba(201,146,43,.6); color: #f0c264; }
        .btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 46px; padding: 0 24px;
          border-radius: 10px; font-weight: 600; font-size: 15px; transition: filter .15s, transform .15s; cursor: pointer;
        }
        .btn:hover { filter: brightness(1.15); transform: translateY(-1px); }
        .btn-p { background: #c9922b; color: #1a1409; font-weight: 700; font-size: 16px; }
        .btn-s { background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.14); color: #e9e6df; }
        .card {
          display: block; width: 100%; border-radius: 13px; overflow: hidden; background: rgba(20,20,22,.86);
          border: 1px solid rgba(255,255,255,.09); transition: transform .2s, border-color .2s, box-shadow .2s; cursor: pointer; text-align: left;
        }
        .card:hover { transform: translateY(-3px); border-color: rgba(201,146,43,.6); }
        .card-on { border-color: #c9922b; box-shadow: 0 0 0 1px #c9922b, 0 14px 40px rgba(201,146,43,.22); }
        .tg {
          position: relative; width: 48px; height: 26px; border-radius: 13px; background: rgba(255,255,255,.14);
          transition: background .25s; flex: none; cursor: pointer;
        }
        .tg::after {
          content: ''; position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 50%;
          background: #cfcbc1; transition: left .25s cubic-bezier(.3,.7,.2,1), background .25s;
        }
        .tg.on { background: #c9922b; }
        .tg.on::after { left: 25px; background: #1a1409; }
        .seg { display: flex; border-radius: 10px; overflow: hidden; border: 1px solid rgba(255,255,255,.14); }
        .seg > button {
          flex: 1; display: flex; align-items: center; justify-content: center; height: 38px; padding: 0 16px;
          font-size: 13px; font-weight: 600; background: rgba(255,255,255,.04); border-left: 1px solid rgba(255,255,255,.1);
          color: #cfcbc1; cursor: pointer;
        }
        .seg > button:first-child { border-left: 0; }
        .seg > button.on { background: #c9922b; color: #1a1409; }
        .key {
          display: inline-flex; align-items: center; justify-content: center; min-width: 26px; height: 24px; padding: 0 8px;
          border-radius: 6px; border: 1px solid rgba(255,255,255,.22); font-size: 12px; font-weight: 600; margin-right: 8px;
        }
        .th { position: relative; overflow: hidden; }
        .th::before {
          content: ''; position: absolute; inset: 0; background: radial-gradient(circle at 70% 35%, rgba(255,200,120,.35), transparent 45%);
        }
        .th::after {
          content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 55%;
          background: rgba(8,8,9,.5); clip-path: polygon(0 60%,14% 28%,27% 52%,44% 12%,61% 48%,77% 22%,100% 54%,100% 100%,0 100%);
        }
        .m1 { background: linear-gradient(180deg,#3b2a1b,#c47a2a 75%); }
        .m2 { background: linear-gradient(180deg,#1c2a33,#6b8794 75%); }
        .m3 { background: linear-gradient(180deg,#18241b,#587a48 75%)}
        .m4 { background: linear-gradient(180deg,#14151c,#4a4468 75%); }
        .m5 { background: linear-gradient(180deg,#2a303a,#b3bcc6 78%); }
        .m6 { background: linear-gradient(180deg,#3b3326,#dcc48f 78%); }
        .m7 { background: linear-gradient(180deg,#2b2b2e,#7a6a58 78%); }
        .m8 { background: linear-gradient(180deg,#123036,#4fa0a5 75%); }
        .row-hover {
          display: grid; grid-template-columns: 34px 1fr 140px 90px 70px 40px; align-items: center; gap: 12px;
          width: 100%; height: 56px; padding: 0 18px; border-left: 3px solid transparent; border-bottom: 1px solid rgba(255,255,255,.05);
          transition: background .15s; cursor: pointer; text-align: left;
        }
        .row-hover:hover { background: rgba(255,255,255,.05); }
        .row-on { background: rgba(201,146,43,.15); border-left-color: #c9922b; }
      `}</style>

      {/* Main 1440x900 viewport wrapper scaled smoothly */}
      <div 
        ref={containerRef}
        className="gmw shrink-0 shadow-2xl"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'center center'
        }}
      >
        {/* Parallax Background & Atmospheric Sky */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#17140f] via-[#2b2218] to-[#120f0b]" />
        
        {/* Glow */}
        <div 
          className="absolute -left-[200px] top-0 w-[1840px] h-[900px] pointer-events-none transition-transform duration-1000"
          style={{
            background: 'radial-gradient(900px 520px at 70% 82%, rgba(201,146,43,0.38), transparent 62%)'
          }}
        />

        {/* Mountain Silhouette Layers */}
        <svg className="absolute left-0 top-0 w-[1760px] h-[900px] pointer-events-none opacity-75" viewBox="0 0 1760 900" preserveAspectRatio="none">
          <path d="M0 640 180 520 330 600 520 430 700 580 880 470 1080 600 1260 500 1440 590 1600 520 1760 600V900H0Z" fill="#2a1f14" />
        </svg>
        <svg className="absolute left-0 top-0 w-[1760px] h-[900px] pointer-events-none" viewBox="0 0 1760 900" preserveAspectRatio="none">
          <path d="M0 720 220 610 420 700 640 590 860 710 1060 630 1260 720 1440 650 1600 700 1760 640V900H0Z" fill="#1a140e" />
        </svg>
        <svg className="absolute left-0 top-0 w-[1760px] h-[900px] pointer-events-none" viewBox="0 0 1760 900" preserveAspectRatio="none">
          <path d="M0 800 300 740 620 800 980 750 1440 810 1760 770V900H0Z" fill="#0f0c09" />
        </svg>

        {/* Dark Vignette Overlay */}
        <div className="absolute inset-0 bg-[rgba(9,9,10,0.5)] pointer-events-none" />
        <div className="absolute left-0 right-0 top-0 h-36 bg-gradient-to-b from-black/50 to-transparent pointer-events-none" />
        <div className="wipe on" />

        {/* ========================================================= */}
        {/* SCREEN 1: MAIN MENU */}
        {/* ========================================================= */}
        {cur === 'main' && (
          <section className={`absolute inset-0 ${directionBack ? 'scr-anim-in-back' : 'scr-anim-in'}`}>
            <div className="absolute inset-0 bg-gradient-to-r from-[rgba(9,9,10,0.92)] via-[rgba(9,9,10,0.65)] to-transparent pointer-events-none" />

            {/* Header */}
            <div className="absolute left-16 right-16 top-9 h-11 flex items-center justify-between z-10">
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 border-2 border-[#c9922b] flex items-center justify-center -skew-x-6">
                  <div className="w-4 h-4 bg-[#c9922b]" />
                </div>
                <span className="cn text-base font-bold text-white tracking-wider">МЕТРОПОЛИС 2D</span>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => go('notif')}
                  className="chip"
                  title="Уведомления"
                >
                  <Bell className="w-5 h-5 text-[#cfcbc1]" />
                  <span className="mut text-sm font-bold">3</span>
                </button>
                <button 
                  onClick={() => go('account')}
                  className="chip"
                >
                  <span className="w-6 h-6 rounded-full bg-[#c9922b] text-[#1a1409] inline-flex items-center justify-center font-bold text-xs">
                    И
                  </span>
                  <span className="font-medium text-sm text-white">Игрок_0417</span>
                </button>
              </div>
            </div>

            {/* Navigation Menu Links */}
            <div className="absolute left-16 top-44 w-[420px] flex flex-col gap-1.5 z-10">
              <button 
                onClick={onResume}
                className="menu-i cn bg-[rgba(201,146,43,0.16)] border-l-[#c9922b] text-white flex-col items-start justify-center gap-0.5 h-[84px]"
              >
                <div className="flex items-center gap-2">
                  <Play className="w-5 h-5 fill-current text-[#e0ab45]" />
                  <span>Продолжить</span>
                </div>
                <span className="mut font-normal text-sm font-sans normal-case tracking-normal pl-7">
                  «Серпантин · утро» — 2 ч назад
                </span>
              </button>

              <button onClick={() => go('new')} className="menu-i cn">
                <Plus className="w-6 h-6 text-[#c9922b]" />
                <span>Новая сессия</span>
              </button>

              <button onClick={() => go('saves')} className="menu-i cn">
                <FolderOpen className="w-6 h-6 text-[#c9922b]" />
                <span>Загрузить</span>
              </button>

              <button onClick={() => go('servers')} className="menu-i cn">
                <Globe className="w-6 h-6 text-[#c9922b]" />
                <span>Онлайн</span>
              </button>

              <button onClick={() => go('account')} className="menu-i cn">
                <User className="w-6 h-6 text-[#c9922b]" />
                <span>Аккаунт</span>
              </button>

              <button onClick={() => go('settings')} className="menu-i cn">
                <Settings className="w-6 h-6 text-[#c9922b]" />
                <span>Настройки</span>
              </button>

              <button 
                onClick={onResume}
                className="menu-i cn mt-3.5 text-[#a29e93] hover:text-white"
              >
                <LogOut className="w-6 h-6 text-[#a29e93]" />
                <span>В игру</span>
              </button>
            </div>

            {/* Right Side: Session Card & Online Stats */}
            <div className="panel absolute left-[880px] top-44 w-[496px] p-4 z-10">
              <div className="th m1 h-64 rounded-xl" />
              <div className="pt-4 px-2 pb-1">
                <div className="cn mut text-xs">Последняя сохраненная сессия</div>
                <div className="cn text-3xl font-bold mt-1 text-white">Серпантин · утро</div>
                <div className="mut flex gap-6 mt-3 text-sm">
                  <span>Карта: Каньон</span>
                  <span>Время в игре: 14 ч 20 мин</span>
                </div>
                <button 
                  onClick={onResume}
                  className="btn btn-p mt-5"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Продолжить</span>
                </button>
              </div>
            </div>

            <div className="absolute left-[880px] top-[508px] w-[496px] flex gap-4 z-10">
              <button 
                onClick={() => go('servers')}
                className="panel flex-1 p-5 block text-left cursor-pointer hover:border-[rgba(201,146,43,0.5)] transition-all"
              >
                <div className="cn mut text-xs">Онлайн-мультиплеер</div>
                <div className="cn text-4xl font-bold mt-1.5 text-[#e0ab45]">1 248</div>
                <div className="mut text-sm mt-1">активных игроков на 128 серверах</div>
              </button>
            </div>

            {/* Bottom Hints */}
            <div className="absolute left-16 right-16 bottom-8 flex items-center justify-between text-xs text-[#a29e93] font-mono z-10">
              <div className="flex items-center">
                <span className="key">↑↓</span>Навигация
                <span className="key ml-4">Enter</span>Выбрать
                <span className="key ml-4">Esc</span>В игру
              </div>
              <div>МЕТРОПОЛИС 2D · РЕЖИМ СИМУЛЯЦИИ</div>
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* SCREEN 2: NEW SESSION */}
        {/* ========================================================= */}
        {cur === 'new' && (
          <section className={`absolute inset-0 ${directionBack ? 'scr-anim-in-back' : 'scr-anim-in'}`}>
            <div className="absolute left-16 right-16 top-9 h-11 flex items-center justify-between z-10">
              <div className="flex items-center gap-4">
                <button onClick={() => go('main', true)} className="chip w-11 justify-center p-0" title="Назад">
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>
                <span className="cn text-2xl font-bold text-white">Новая сессия</span>
              </div>
              <div className="mut text-sm flex items-center gap-2.5 font-mono">
                <b className="text-[#e0ab45]">1</b> Выбор карты <span className="w-7 h-[1px] bg-white/20" /> <b className="text-[#e0ab45]">2</b> Параметры
              </div>
            </div>

            {/* Map selection grid */}
            <div className="absolute left-16 top-28 w-[880px] z-10">
              <div className="flex gap-2.5 mb-5">
                <span className="pill-btn pill-btn-on">Все карты</span>
                <span className="pill-btn">Дороги</span>
                <span className="pill-btn">Бездорожье</span>
                <span className="pill-btn">Города</span>
                <span className="pill-btn">Полигоны</span>
              </div>
              
              <div className="grid grid-cols-4 grid-rows-2 gap-5 h-[560px]">
                {MAPS.map((m, idx) => (
                  <button
                    key={m[0]}
                    onClick={() => setSelectedMap(idx)}
                    className={`card ${selectedMap === idx ? 'card-on' : ''}`}
                  >
                    <div className={`th ${m[2]} h-40`} />
                    <div className="p-3">
                      <div className="cn text-lg font-bold text-white">{m[0]}</div>
                      <div className="mut text-xs mt-1">{m[1]}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Right Configuration panel */}
            <div className="panel absolute left-[976px] top-28 w-[400px] h-[730px] p-4 flex flex-col z-10">
              <div className={`th ${MAPS[selectedMap][2]} h-36 rounded-xl shrink-0`} />
              <div className="pt-4 px-2 flex-1 flex flex-col">
                <div className="cn mut text-xs">Выбранная локация</div>
                <div className="cn text-2xl font-bold text-white mt-1">{MAPS[selectedMap][0]}</div>

                <div className="mt-5">
                  <div className="text-xs text-[#a29e93] mb-2 font-mono">Название сохранения</div>
                  <input
                    type="text"
                    value={newGameName}
                    onChange={(e) => setNewGameName(e.target.value)}
                    className="w-full h-11 px-3 rounded-lg bg-white/[0.06] border border-[#c9922b] text-white text-base font-sans outline-none focus:ring-1 focus:ring-[#e0ab45]"
                  />
                </div>

                <div className="mt-4">
                  <div className="text-xs text-[#a29e93] mb-2 font-mono">Режим поездки</div>
                  <div className="seg">
                    <button className="on">Свободная езда</button>
                    <button>Сценарий</button>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex justify-between items-center text-xs text-[#a29e93] mb-2 font-mono">
                    <span>Погодные условия</span>
                  </div>
                  <div className="seg">
                    <button className="on">Ясно</button>
                    <button>Облачно</button>
                    <button>Дождь</button>
                    <button>Туман</button>
                  </div>
                </div>

                <div className="flex-1" />

                <button
                  onClick={() => {
                    if (onNewGame) onNewGame(newGameName);
                    else onResume();
                  }}
                  className="btn btn-p w-full h-12 text-base mb-2"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Начать сессию</span>
                </button>
              </div>
            </div>

            <div className="absolute left-16 right-16 bottom-8 flex items-center justify-between text-xs text-[#a29e93] font-mono z-10">
              <div className="flex items-center">
                <span className="key">←→↑↓</span>Выбор карты
                <span className="key ml-4">Enter</span>Начать
                <span className="key ml-4">Esc</span>Назад
              </div>
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* SCREEN 3: SAVES */}
        {/* ========================================================= */}
        {cur === 'saves' && (
          <section className={`absolute inset-0 ${directionBack ? 'scr-anim-in-back' : 'scr-anim-in'}`}>
            <div className="absolute left-16 right-16 top-9 h-11 flex items-center justify-between z-10">
              <div className="flex items-center gap-4">
                <button onClick={() => go('main', true)} className="chip w-11 justify-center p-0" title="Назад">
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>
                <span className="cn text-2xl font-bold text-white">Загрузить сессию</span>
              </div>
              <button className="chip">
                <span className="mut text-sm font-mono">Сначала новые</span>
              </button>
            </div>

            <div className="absolute left-16 top-24 w-[1312px] flex items-end justify-between border-b border-white/10 pb-1 z-10">
              <div className="flex gap-2">
                <button className="tab-btn tab-btn-on cn">Все сохранения</button>
                <button className="tab-btn cn">Свободная езда</button>
                <button className="tab-btn cn">Сценарии</button>
                <button className="tab-btn cn">Избранные</button>
              </div>
              <div className="mut text-xs font-mono pb-2">7 из 24 слотов</div>
            </div>

            {/* Grid of saves */}
            <div className="absolute left-16 top-44 w-[1312px] grid grid-cols-4 grid-rows-2 gap-5 h-[580px] z-10">
              {SAVES.map((save, idx) => (
                <button
                  key={save[0]}
                  onClick={() => setSelectedSave(idx)}
                  className={`card ${selectedSave === idx ? 'card-on' : ''}`}
                >
                  <div className={`th ${save[4]} h-40`} />
                  <div className="p-3.5">
                    <div className="cn text-xl font-bold text-white truncate">{save[0]}</div>
                    <div className="flex justify-between text-xs text-[#a29e93] mt-2 font-mono">
                      <span>{save[1]}</span>
                      <span>{save[2]}</span>
                    </div>
                    <div className="flex justify-between text-xs text-[#a29e93] mt-1 font-mono">
                      <span>{save[3]}</span>
                      {selectedSave === idx && <span className="text-[#e0ab45] font-bold">Выбрано</span>}
                    </div>
                  </div>
                </button>
              ))}

              {/* Add New Session Slot */}
              <button
                onClick={() => go('new')}
                className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-[#c9922b]/50 bg-[#c9922b]/[0.05] hover:bg-[#c9922b]/[0.12] rounded-xl text-[#e0ab45] transition-all cursor-pointer"
              >
                <Plus className="w-10 h-10" />
                <span className="cn text-lg font-bold">Новая сессия</span>
              </button>
            </div>

            {/* Bottom Actions */}
            <div className="absolute left-16 right-16 bottom-16 flex items-center justify-between z-10">
              <div className="mut text-sm font-mono">
                Выбрано: <span className="text-white font-bold">{SAVES[selectedSave] ? SAVES[selectedSave][0] : ''}</span>
              </div>
              <div className="flex gap-3">
                <button className="btn btn-s">Дублировать</button>
                <button 
                  onClick={onResume}
                  className="btn btn-p"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Загрузить</span>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* SCREEN 4: SERVERS */}
        {/* ========================================================= */}
        {cur === 'servers' && (
          <section className={`absolute inset-0 ${directionBack ? 'scr-anim-in-back' : 'scr-anim-in'}`}>
            <div className="absolute left-16 right-16 top-9 h-11 flex items-center justify-between z-10">
              <div className="flex items-center gap-4">
                <button onClick={() => go('main', true)} className="chip w-11 justify-center p-0" title="Назад">
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>
                <span className="cn text-2xl font-bold text-white">Онлайн серверы</span>
              </div>
              <div className="flex gap-3">
                <button onClick={() => go('create')} className="chip">
                  <Plus className="w-4 h-4 text-[#e0ab45]" />
                  <span className="font-semibold text-sm">Создать сервер</span>
                </button>
                <button onClick={() => go('account')} className="chip">
                  <span className="w-6 h-6 rounded-full bg-[#c9922b] text-[#1a1409] inline-flex items-center justify-center font-bold text-xs">
                    И
                  </span>
                  <span className="font-medium text-sm">Игрок_0417</span>
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="absolute left-16 top-24 w-[1312px] flex items-end justify-between border-b border-white/10 pb-1 z-10">
              <div className="flex gap-2">
                <button 
                  onClick={() => setSrvFilter('all')} 
                  className={`tab-btn cn ${srvFilter === 'all' ? 'tab-btn-on' : ''}`}
                >
                  Все серверы
                </button>
                <button 
                  onClick={() => setSrvFilter('fav')} 
                  className={`tab-btn cn ${srvFilter === 'fav' ? 'tab-btn-on' : ''}`}
                >
                  Избранные
                </button>
                <button 
                  onClick={() => setSrvFilter('recent')} 
                  className={`tab-btn cn ${srvFilter === 'recent' ? 'tab-btn-on' : ''}`}
                >
                  Недавние
                </button>
                <button 
                  onClick={() => setSrvFilter('friends')} 
                  className={`tab-btn cn ${srvFilter === 'friends' ? 'tab-btn-on' : ''}`}
                >
                  Друзья
                </button>
              </div>
            </div>

            {/* Table of servers */}
            <div className="panel absolute left-16 top-36 w-[850px] h-[610px] overflow-hidden flex flex-col z-10">
              <div className="grid grid-cols-[34px_1fr_140px_90px_70px_40px] items-center gap-3 px-4 h-10 border-b border-white/10 text-xs font-mono text-[#8f8b81] shrink-0">
                <span />
                <span>Название</span>
                <span>Карта</span>
                <span>Игроки</span>
                <span>Пинг</span>
                <span />
              </div>
              <div className="overflow-y-auto flex-1">
                {filteredServers.map((srv, idx) => (
                  <div
                    key={srv[0]}
                    onClick={() => setSelectedSrv(idx)}
                    className={`row-hover ${selectedSrv === idx ? 'row-on' : ''}`}
                  >
                    <Star className={`w-4 h-4 ${srv[7] ? 'text-[#e0ab45] fill-current' : 'text-[#6f6c65]'}`} />
                    <div className="truncate">
                      <div className="font-semibold text-white truncate text-sm">{srv[0]}</div>
                      <div className="mut text-xs font-mono truncate">Хост: {srv[1]}</div>
                    </div>
                    <span className="text-xs text-[#cfcbc1] truncate">{srv[2]}</span>
                    <span className="text-xs font-mono text-[#cfcbc1]">{srv[3]} / {srv[4]}</span>
                    <span className={`text-xs font-mono font-bold ${getPingClass(srv[5])}`}>{srv[5]} мс</span>
                    <span>
                      {srv[6] ? <Lock className="w-3.5 h-3.5 text-[#a29e93]" /> : null}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Server details card */}
            <div className="panel absolute left-[938px] top-36 w-[438px] h-[610px] p-4 flex flex-col z-10">
              <div className={`th ${selectedServerData[8]} h-48 rounded-xl shrink-0`} />
              <div className="pt-4 px-2 flex-1">
                <div className="cn mut text-xs">Выбранный сервер</div>
                <div className="cn text-2xl font-bold text-white mt-1 leading-snug">{selectedServerData[0]}</div>
                <div className="mut text-xs mt-2 leading-relaxed font-sans">{selectedServerData[9]}</div>

                <div className="grid grid-cols-2 gap-3 mt-5 text-xs font-mono">
                  <div>
                    <div className="mut">Регион</div>
                    <div className="text-white font-medium">Европа · Франкфурт</div>
                  </div>
                  <div>
                    <div className="mut">Пинг</div>
                    <div className={`font-bold ${getPingClass(selectedServerData[5])}`}>{selectedServerData[5]} мс</div>
                  </div>
                  <div>
                    <div className="mut">Карта</div>
                    <div className="text-white font-medium">{selectedServerData[2]}</div>
                  </div>
                  <div>
                    <div className="mut">Хост</div>
                    <div className="text-white font-medium">{selectedServerData[1]}</div>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="flex justify-between text-xs font-mono mb-1.5">
                    <span className="mut">Заполненность</span>
                    <span className="text-white font-bold">{selectedServerData[3]} / {selectedServerData[4]}</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#c9922b]"
                      style={{ width: `${(selectedServerData[3] / selectedServerData[4]) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={onResume}
                  className="btn btn-p flex-1"
                >
                  <span>Подключиться</span>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* SCREEN 5: ACCOUNT */}
        {/* ========================================================= */}
        {cur === 'account' && (
          <section className={`absolute inset-0 ${directionBack ? 'scr-anim-in-back' : 'scr-anim-in'}`}>
            <div className="absolute left-16 right-16 top-9 h-11 flex items-center justify-between z-10">
              <div className="flex items-center gap-4">
                <button onClick={() => go('main', true)} className="chip w-11 justify-center p-0" title="Назад">
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>
                <span className="cn text-2xl font-bold text-white">Аккаунт</span>
              </div>
              <div className="chip">
                <span className="w-6 h-6 rounded-full bg-[#c9922b] text-[#1a1409] inline-flex items-center justify-center font-bold text-xs">
                  И
                </span>
                <span className="font-medium text-sm">Игрок_0417</span>
              </div>
            </div>

            {/* Left Tabs */}
            <div className="absolute left-16 top-32 w-[280px] flex flex-col gap-1 z-10">
              <button 
                onClick={() => setAccTab('acc-profile')}
                className={`nav-i cn ${accTab === 'acc-profile' ? 'nav-on' : ''}`}
              >
                Профиль
              </button>
              <button 
                onClick={() => setAccTab('acc-friends')}
                className={`nav-i cn ${accTab === 'acc-friends' ? 'nav-on' : ''}`}
              >
                Друзья
              </button>
              <button 
                onClick={() => setAccTab('acc-security')}
                className={`nav-i cn ${accTab === 'acc-security' ? 'nav-on' : ''}`}
              >
                Безопасность
              </button>
            </div>

            {/* Tab: Profile */}
            {accTab === 'acc-profile' && (
              <div className="absolute left-[370px] top-32 w-[980px] flex flex-col gap-5 z-10">
                <div className="panel p-7 flex items-center gap-6">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-[#e0ab45] to-[#a8741c] flex items-center justify-center font-bold text-4xl text-[#1a1409]">
                    И
                  </div>
                  <div className="flex-1">
                    <div className="cn text-3xl font-bold text-white">Игрок_0417</div>
                    <div className="mut text-sm mt-1 font-mono">ID 0417-2291 · Профиль синхронизирован</div>
                    <div className="flex items-center gap-2 mt-2 text-xs text-[#9ac985]">
                      <span className="w-2 h-2 rounded-full bg-[#7fbf6a]" />
                      <span>В сети · Степной Тракт 2D</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div className="panel p-6">
                    <div className="flex justify-between items-baseline mb-4">
                      <span className="cn text-lg font-bold text-white">Достижения</span>
                      <span className="mut text-xs font-mono">4 из 24</span>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                      {BADGE_ICONS.map((d, i) => (
                        <div 
                          key={i} 
                          className={`w-16 h-16 rounded-xl border flex items-center justify-center ${i < 4 ? 'border-[#c9922b]/50 bg-[#c9922b]/10' : 'border-white/10 bg-white/[0.02]'}`}
                        >
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={i < 4 ? '#e0ab45' : '#6f6c65'} strokeWidth="1.8">
                            <path d={d} />
                          </svg>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="panel p-6">
                    <div className="flex justify-between items-baseline mb-4">
                      <span className="cn text-lg font-bold text-white">Друзья онлайн</span>
                      <span className="mut text-xs font-mono">3 в сети</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      {FRIENDS.map(f => (
                        <div key={f.name} className="flex items-center gap-3 py-2 border-b border-white/[0.06] last:border-0">
                          <span className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-[#1a1409]" style={{ backgroundColor: f.color }}>
                            {f.initial}
                          </span>
                          <div className="flex-1">
                            <div className="text-sm font-semibold text-white">{f.name}</div>
                            <div className="mut text-xs">{f.status}</div>
                          </div>
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: f.dot }} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Friends */}
            {accTab === 'acc-friends' && (
              <div className="panel absolute left-[370px] top-32 w-[980px] p-6 z-10">
                <div className="cn text-xl font-bold text-white mb-4">Список друзей</div>
                <div className="flex flex-col divide-y divide-white/10">
                  {FRIENDS.map(f => (
                    <div key={f.name} className="flex items-center gap-4 py-3">
                      <span className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-[#1a1409]" style={{ backgroundColor: f.color }}>
                        {f.initial}
                      </span>
                      <div className="flex-1">
                        <div className="font-semibold text-white">{f.name}</div>
                        <div className="mut text-xs font-mono">{f.status}</div>
                      </div>
                      <button className="btn btn-s text-xs h-8 px-3">Сообщение</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab: Security */}
            {accTab === 'acc-security' && (
              <div className="panel absolute left-[370px] top-32 w-[980px] p-6 flex flex-col gap-4 z-10">
                <div className="cn text-xl font-bold text-white mb-2">Безопасность профиля</div>
                <div className="flex justify-between items-center py-3 border-b border-white/10">
                  <span>Двухфакторная авторизация</span>
                  <div className="tg on" />
                </div>
                <div className="flex justify-between items-center py-3 border-b border-white/10">
                  <span>Облачная синхронизация сохранений</span>
                  <div className="tg on" />
                </div>
              </div>
            )}
          </section>
        )}

        {/* ========================================================= */}
        {/* SCREEN 6: SETTINGS */}
        {/* ========================================================= */}
        {cur === 'settings' && (
          <section className={`absolute inset-0 ${directionBack ? 'scr-anim-in-back' : 'scr-anim-in'}`}>
            <div className="absolute left-16 right-16 top-9 h-11 flex items-center justify-between z-10">
              <div className="flex items-center gap-4">
                <button onClick={() => go('main', true)} className="chip w-11 justify-center p-0" title="Назад">
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>
                <span className="cn text-2xl font-bold text-white">Параметры симуляции</span>
              </div>
            </div>

            {/* Navigation Categories */}
            <div className="absolute left-16 top-32 w-[260px] flex flex-col gap-1 z-10">
              <button 
                onClick={() => setSettingsTab('set-gfx')}
                className={`nav-i cn ${settingsTab === 'set-gfx' ? 'nav-on' : ''}`}
              >
                Графика
              </button>
              <button 
                onClick={() => setSettingsTab('set-sound')}
                className={`nav-i cn ${settingsTab === 'set-sound' ? 'nav-on' : ''}`}
              >
                Звук
              </button>
              <button 
                onClick={() => setSettingsTab('set-ctrl')}
                className={`nav-i cn ${settingsTab === 'set-ctrl' ? 'nav-on' : ''}`}
              >
                Управление
              </button>
              <button 
                onClick={() => setSettingsTab('set-game')}
                className={`nav-i cn ${settingsTab === 'set-game' ? 'nav-on' : ''}`}
              >
                Геймплей
              </button>
            </div>

            {/* Graphics Settings Panel */}
            {settingsTab === 'set-gfx' && (
              <>
                <div className="panel absolute left-[350px] top-32 w-[700px] h-[714px] p-6 overflow-y-auto flex flex-col gap-4 z-10">
                  <div className="cn text-sm text-[#e0ab45] font-bold">Дисплей и рендеринг</div>
                  
                  <div className="flex justify-between items-center py-2.5 border-b border-white/[0.06]">
                    <span className="font-medium text-sm">Вертикальная синхронизация (V-Sync)</span>
                    <button 
                      onClick={() => setVsync(!vsync)} 
                      className={`tg ${vsync ? 'on' : ''}`} 
                    />
                  </div>

                  <div className="flex justify-between items-center py-2.5 border-b border-white/[0.06]">
                    <span className="font-medium text-sm">Дальность прорисовки мира (px)</span>
                    <div className="flex items-center gap-4 w-72">
                      <input 
                        type="range" 
                        min="800" 
                        max="2400" 
                        step="100"
                        value={renderDistance}
                        onChange={(e) => setRenderDistance(Number(e.target.value))}
                        className="flex-1 accent-[#c9922b]"
                      />
                      <span className="text-xs font-mono font-bold w-12 text-right">{renderDistance}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center py-2.5 border-b border-white/[0.06]">
                    <span className="font-medium text-sm">Яркость и экспозиция</span>
                    <div className="flex items-center gap-4 w-72">
                      <input 
                        type="range" 
                        min="10" 
                        max="100" 
                        value={brightness}
                        onChange={(e) => setBrightness(Number(e.target.value))}
                        className="flex-1 accent-[#c9922b]"
                      />
                      <span className="text-xs font-mono font-bold w-12 text-right">{brightness}%</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center py-2.5 border-b border-white/[0.06]">
                    <span className="font-medium text-sm">Отражения в лужах и кузове</span>
                    <button 
                      onClick={() => setRefl(!refl)} 
                      className={`tg ${refl ? 'on' : ''}`} 
                    />
                  </div>

                  <div className="flex justify-between items-center py-2.5 border-b border-white/[0.06]">
                    <span className="font-medium text-sm">Эффект скорости и размытие</span>
                    <button 
                      onClick={() => setBlur(!blur)} 
                      className={`tg ${blur ? 'on' : ''}`} 
                    />
                  </div>
                </div>

                {/* Right Performance Estimation */}
                <div className="absolute left-[1074px] top-32 w-[302px] flex flex-col gap-4 z-10">
                  <div className="panel p-5">
                    <div className="cn mut text-xs">Ожидаемая частота кадров</div>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="font-bold text-5xl text-[#e0ab45] font-sans">{calcFps()}</span>
                      <span className="mut text-sm font-mono">кадров/с</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/10 rounded-full mt-3 overflow-hidden">
                      <div 
                        className="h-full bg-[#c9922b] transition-all"
                        style={{ width: `${Math.round((calcFps() / 128) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Sound Settings */}
            {settingsTab === 'set-sound' && (
              <div className="panel absolute left-[350px] top-32 w-[700px] h-[714px] p-6 flex flex-col gap-4 z-10">
                <div className="cn text-sm text-[#e0ab45] font-bold">Громкость звукового движка</div>
                <div className="flex justify-between items-center py-2.5 border-b border-white/[0.06]">
                  <span className="text-sm">Общий уровень</span>
                  <input type="range" defaultValue={80} className="w-64 accent-[#c9922b]" />
                </div>
                <div className="flex justify-between items-center py-2.5 border-b border-white/[0.06]">
                  <span className="text-sm">Рев двигателя и трансмиссия</span>
                  <input type="range" defaultValue={90} className="w-64 accent-[#c9922b]" />
                </div>
                <div className="flex justify-between items-center py-2.5 border-b border-white/[0.06]">
                  <span className="text-sm">Шум ветра и покрышек</span>
                  <input type="range" defaultValue={75} className="w-64 accent-[#c9922b]" />
                </div>
              </div>
            )}

            {/* Controls Settings */}
            {settingsTab === 'set-ctrl' && (
              <div className="panel absolute left-[350px] top-32 w-[700px] h-[714px] p-6 flex flex-col gap-4 z-10">
                <div className="cn text-sm text-[#e0ab45] font-bold">Настройки управления</div>
                <div className="flex justify-between items-center py-2.5 border-b border-white/[0.06]">
                  <span className="text-sm">Автоматическая трансмиссия</span>
                  <div className="tg on" />
                </div>
                <div className="flex justify-between items-center py-2.5 border-b border-white/[0.06]">
                  <span className="text-sm">Мягкий возврат руля к нулю</span>
                  <div className="tg on" />
                </div>
              </div>
            )}

            {/* Gameplay Settings */}
            {settingsTab === 'set-game' && (
              <div className="panel absolute left-[350px] top-32 w-[700px] h-[714px] p-6 flex flex-col gap-4 z-10">
                <div className="cn text-sm text-[#e0ab45] font-bold">Геймплей и симуляция</div>
                <div className="flex justify-between items-center py-2.5 border-b border-white/[0.06]">
                  <span className="text-sm">Единицы скорости</span>
                  <div className="seg">
                    <button className="on">км/ч</button>
                    <button>mph</button>
                  </div>
                </div>
                <div className="flex justify-between items-center py-2.5 border-b border-white/[0.06]">
                  <span className="text-sm">Отображение спидометра</span>
                  <div className="tg on" />
                </div>
              </div>
            )}
          </section>
        )}

        {/* ========================================================= */}
        {/* SCREEN 7: NOTIFICATIONS */}
        {/* ========================================================= */}
        {cur === 'notif' && (
          <section className={`absolute inset-0 ${directionBack ? 'scr-anim-in-back' : 'scr-anim-in'}`}>
            <div className="absolute left-16 right-16 top-9 h-11 flex items-center justify-between z-10">
              <div className="flex items-center gap-4">
                <button onClick={() => go('main', true)} className="chip w-11 justify-center p-0" title="Назад">
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>
                <span className="cn text-2xl font-bold text-white">Уведомления</span>
              </div>
              <button className="chip">
                <span className="mut text-xs font-mono">Прочитать все</span>
              </button>
            </div>

            <div className="absolute left-16 top-32 w-[1312px] flex flex-col gap-3.5 z-10">
              <div className="panel flex items-center gap-4 p-4">
                <span className="w-10 h-10 rounded-full bg-[#c9b98f] text-[#1a1409] font-bold flex items-center justify-center text-sm">
                  Д
                </span>
                <div className="flex-1">
                  <div className="font-semibold text-white text-sm">Dimitri отправил запрос на добавление в друзья</div>
                  <div className="mut text-xs font-mono mt-0.5">5 минут назад</div>
                </div>
                <button className="btn btn-s text-xs h-9 px-4">Отклонить</button>
                <button className="btn btn-p text-xs h-9 px-4">Принять</button>
              </div>

              <div className="panel flex items-center gap-4 p-4">
                <span className="w-10 h-10 rounded-full bg-[#e0ab45] text-[#1a1409] font-bold flex items-center justify-center text-sm">
                  А
                </span>
                <div className="flex-1">
                  <div className="font-semibold text-white text-sm">Alex_Dune пригласил вас на сервер «Перевал»</div>
                  <div className="mut text-xs font-mono mt-0.5">1 час назад</div>
                </div>
                <button onClick={onResume} className="btn btn-p text-xs h-9 px-4">Присоединиться</button>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* SCREEN 8: CREATE SERVER */}
        {/* ========================================================= */}
        {cur === 'create' && (
          <section className={`absolute inset-0 ${directionBack ? 'scr-anim-in-back' : 'scr-anim-in'}`}>
            <div className="absolute left-16 right-16 top-9 h-11 flex items-center justify-between z-10">
              <div className="flex items-center gap-4">
                <button onClick={() => go('servers', true)} className="chip w-11 justify-center p-0" title="Назад">
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>
                <span className="cn text-2xl font-bold text-white">Создать игровой сервер</span>
              </div>
            </div>

            <div className="panel absolute left-16 top-28 w-[880px] h-[730px] p-7 flex flex-col gap-5 z-10">
              <div>
                <div className="text-xs text-[#a29e93] mb-2 font-mono">Имя сервера</div>
                <input
                  type="text"
                  defaultValue="Свободная езда · Сессия"
                  className="w-full h-11 px-3 rounded-lg bg-white/[0.06] border border-[#c9922b] text-white text-base font-sans outline-none"
                />
              </div>

              <div>
                <div className="text-xs text-[#a29e93] mb-2 font-mono">Локация мира</div>
                <div className="flex flex-wrap gap-2">
                  {MAPS.map((m, i) => (
                    <span 
                      key={m[0]} 
                      onClick={() => setSelectedMap(i)}
                      className={`pill-btn ${selectedMap === i ? 'pill-btn-on' : ''}`}
                    >
                      {m[0]}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs text-[#a29e93] mb-2 font-mono">Максимум игроков: 16</div>
                <input type="range" min="2" max="32" defaultValue="16" className="w-full accent-[#c9922b]" />
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <div className="flex justify-between items-center py-2 border-b border-white/[0.06]">
                  <span className="text-sm">Физические столкновения между авто</span>
                  <div className="tg on" />
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/[0.06]">
                  <span className="text-sm">Динамическая смена погоды и времени</span>
                  <div className="tg on" />
                </div>
              </div>

              <div className="flex-1" />

              <div className="flex gap-3">
                <button onClick={() => go('servers', true)} className="btn btn-s flex-1">
                  Отмена
                </button>
                <button onClick={onResume} className="btn btn-p flex-1">
                  Запустить сервер
                </button>
              </div>
            </div>
          </section>
        )}

      </div>
    </div>
  );
};