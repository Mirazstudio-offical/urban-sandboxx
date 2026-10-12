import React, { useState, useEffect, useRef } from 'react';
import { formatGameDate, formatGameTime } from '../calendarSystem';

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

interface MainMenuProps {
  onResume: () => void;
  onNewGame: (saveName: string, spawnLocationId: string) => void;
  saves: SaveSlot[];
  onLoadSave: (id: string) => void;
  onDeleteSave: (id: string) => void;
  onCreateSave?: (name?: string) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  settings: {
    fpsLimit: number;
    autoSaveInterval: number;
    timeAutoCycle: boolean;
    mouseSensitivity: number;
  };
  onUpdateSettings: (newSettings: any) => void;
  spawnLocations?: SpawnLocation[];
  onOpenOnline?: () => void;
  onOpenProfile?: () => void;
}

const DEFAULT_SPAWNS: SpawnLocation[] = [
  { id: 'central_park', name: 'Central Park Promenade', nameRu: 'Городской Сквер', x: 4400, y: 2800, description: 'Парковый фонтан, аллеи и кольцевые проезды.', icon: null },
  { id: 'downtown_plaza', name: 'Downtown Commercial Plaza', nameRu: 'Площадь Администрации', x: 4350, y: 2000, description: 'Центр города, парковка и широкий проспект.', icon: null },
  { id: 'residential_courtyard', name: 'Residential Courtyard', nameRu: 'Жилой Двор', x: 2750, y: 2750, description: 'Панельные пятиэтажки и гаражи.', icon: null },
  { id: 'industrial_district', name: 'Freight Logistics Yard', nameRu: 'Промзона', x: 6530, y: 1030, description: 'Ангары, склады и бетонные плиты.', icon: null }
];

const LOADING_TIPS = [
  'Совет: следите за уровнем моторного масла и температурой охлаждающей жидкости.',
  'Совет: стояночный ручной тормоз (Пробел) помогает при резких поворотах и парковке.',
  'Совет: заправляйте автомобиль подходящей маркой топлива на АЗС (АИ-92, АИ-95, ДТ).'
];

export const MainMenu: React.FC<MainMenuProps> = ({
  onResume,
  onNewGame,
  saves,
  onLoadSave,
  onDeleteSave,
  isMuted,
  onToggleMute,
  settings,
  onUpdateSettings,
  spawnLocations = DEFAULT_SPAWNS,
  onOpenOnline,
  onOpenProfile
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gmRef = useRef<HTMLDivElement>(null);
  const wipeRef = useRef<HTMLDivElement>(null);

  const [currentScreen, setCurrentScreen] = useState<string>('main');
  const [isBackNav, setIsBackNav] = useState<boolean>(false);
  const [wipeActive, setWipeActive] = useState<boolean>(false);

  // Selections
  const [selectedMapIdx, setSelectedMapIdx] = useState<number>(0);
  const [selectedSaveIdx, setSelectedSaveIdx] = useState<number>(0);
  const [selectedSrvIdx, setSelectedSrvIdx] = useState<number>(0);
  const [serverFilter, setServerFilter] = useState<string>('all');
  
  // Settings state values
  const [vsync, setVsync] = useState<number>(1);
  const [refl, setRefl] = useState<number>(1);
  const [blur, setBlur] = useState<number>(0);

  // New session input
  const [newGameName, setNewGameName] = useState<string>('Водитель #1');
  const [selectedSpawnId, setSelectedSpawnId] = useState<string>(spawnLocations[0]?.id || 'central_park');

  // Loading Screen State
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [loadingStageText, setLoadingStageText] = useState<string>('Инициализация мира...');
  const [loadingTipIndex, setLoadingTipIndex] = useState<number>(0);

  // Audio Click Feedback
  const playUiSound = (freq = 800) => {
    if (isMuted) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.035);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch {}
  };

  // Scale 1440x900 to container width
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && gmRef.current) {
        const w = containerRef.current.clientWidth;
        const scale = w / 1440;
        gmRef.current.style.transform = `scale(${scale})`;
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Keyboard Esc Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (currentScreen !== 'main') {
          goToScreen('main', true);
          playUiSound(500);
        } else {
          onResume();
          playUiSound(600);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentScreen, onResume]);

  const goToScreen = (target: string, back: boolean = false) => {
    if (target === currentScreen) return;
    playUiSound(750);
    setIsBackNav(back);
    setWipeActive(false);
    setTimeout(() => setWipeActive(true), 10);
    
    if (target === 'servers' && onOpenOnline) {
      onOpenOnline();
      return;
    }
    if (target === 'account' && onOpenProfile) {
      onOpenProfile();
      return;
    }

    setCurrentScreen(target);
  };

  const executeWithLoading = (onComplete: () => void) => {
    setIsLoading(true);
    setLoadingProgress(15);
    setLoadingTipIndex(Math.floor(Math.random() * LOADING_TIPS.length));
    setLoadingStageText('Инициализация физики шасси и подвески...');

    setTimeout(() => {
      setLoadingProgress(50);
      setLoadingStageText('Построение дорожного полотна и перекрёстков...');
    }, 180);

    setTimeout(() => {
      setLoadingProgress(80);
      setLoadingStageText('Синхронизация светофоров и трафика...');
    }, 380);

    setTimeout(() => {
      setLoadingProgress(100);
      setLoadingStageText('Прогрев двигателя. Выезд на трассу...');
    }, 580);

    setTimeout(() => {
      setIsLoading(false);
      onComplete();
    }, 750);
  };

  const handleStartNewGame = () => {
    playUiSound(950);
    executeWithLoading(() => {
      onNewGame(newGameName.trim() || 'Водитель #1', selectedSpawnId);
    });
  };

  const handleLoadSaveSlot = (saveId: string) => {
    playUiSound(950);
    executeWithLoading(() => {
      onLoadSave(saveId);
    });
  };

  const latestSave = saves.length > 0 ? saves[0] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0d0e10] overflow-hidden select-none">
      <style>{`
        .gmw{position:relative;width:100%;aspect-ratio:1440/900;overflow:hidden;background:#121315}
        .gm{position:absolute;left:0;top:0;width:1440px;height:900px;transform-origin:0 0;font-family:'Barlow',system-ui,sans-serif;color:#e9e6df;font-size:15px}
        .cn{font-family:'Barlow Condensed','Arial Narrow',sans-serif;text-transform:uppercase;letter-spacing:.08em}
        .mut{color:#a29e93}
        button{font:inherit;color:inherit;background:none;border:0;cursor:pointer;padding:0;text-align:left}
        .a{position:absolute}
        [hidden]{display:none!important}
        .scr{position:absolute;inset:0;display:none}
        .scr.on{display:block}
        .chip{display:flex;align-items:center;gap:10px;height:44px;padding:0 16px;border-radius:10px;background:rgba(22,22,24,.7);border:1px solid rgba(255,255,255,.09);transition:filter .15s,border-color .15s}
        .chip:hover{filter:brightness(1.2);border-color:rgba(201,146,43,.5)}
        .back{width:44px;padding:0;justify-content:center}
        .panel{background:rgba(20,20,22,.82);border:1px solid rgba(255,255,255,.09);border-radius:14px}
        .top{position:absolute;left:64px;right:64px;top:34px;height:44px;display:flex;align-items:center;justify-content:space-between}
        .ttl{font-size:26px;font-weight:700}
        .row2{display:flex;gap:12px}
        .ava{width:26px;height:26px;border-radius:50%;background:#c9922b;color:#1a1409;display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:13px}
        .menu-i{display:flex;align-items:center;gap:18px;height:62px;padding:0 22px;border-left:3px solid transparent;font-size:27px;font-weight:600;color:#cfcbc1;width:100%;transition:background .18s,border-color .18s,color .18s,padding .18s}
        .menu-i:hover{background:rgba(255,255,255,.06);color:#fff;border-left-color:rgba(201,146,43,.8);padding-left:30px}
        .nav-i{display:flex;align-items:center;height:52px;padding:0 20px;border-left:3px solid transparent;font-size:22px;font-weight:600;color:#cfcbc1;width:100%;transition:background .18s,border-color .18s,color .18s,padding .18s}
        .nav-i:hover{background:rgba(255,255,255,.05);padding-left:26px}
        .nav-on{background:rgba(201,146,43,.16);border-left-color:#c9922b;color:#fff}
        .tabs{position:absolute;left:64px;top:112px;width:1312px;display:flex;align-items:flex-end;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,.1)}
        .tab{height:44px;padding:0 22px;display:inline-flex;align-items:center;font-size:20px;font-weight:600;color:#a29e93;border-bottom:3px solid transparent;transition:color .15s}
        .tab:hover{color:#fff}
        .tab-on{color:#fff;border-bottom-color:#c9922b}
        .pill{display:inline-flex;align-items:center;height:34px;padding:0 16px;border-radius:17px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);font-size:14px}
        .pill-on{background:rgba(201,146,43,.2);border-color:rgba(201,146,43,.6);color:#f0c264}
        .btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:46px;padding:0 24px;border-radius:10px;font-weight:600;font-size:15px;transition:filter .15s,transform .15s}
        .btn:hover{filter:brightness(1.15);transform:translateY(-1px)}
        .btn-p{background:#c9922b;color:#1a1409;font-weight:700;font-size:16px}
        .btn-s{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14)}
        .key{display:inline-flex;align-items:center;justify-content:center;min-width:28px;height:26px;padding:0 8px;border-radius:6px;border:1px solid rgba(255,255,255,.22);font-size:12px;font-weight:600;margin-right:8px}
        .key+.key,.hint span+.key{margin-left:22px}
        .hint{position:absolute;left:64px;right:64px;bottom:34px;display:flex;align-items:center;justify-content:space-between;font-size:13px;color:#a29e93}
        .card{display:block;width:100%;border-radius:13px;overflow:hidden;background:rgba(20,20,22,.86);border:1px solid rgba(255,255,255,.09);transition:transform .2s,border-color .2s,box-shadow .2s}
        .card:hover{transform:translateY(-4px);border-color:rgba(201,146,43,.6)}
        .card-on{border-color:#c9922b;box-shadow:0 0 0 1px #c9922b,0 14px 40px rgba(201,146,43,.22)}
        .card-new{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;width:100%;height:100%;border:1.5px dashed rgba(201,146,43,.55);background:rgba(201,146,43,.06);border-radius:14px;color:#e0ab45;transition:background .2s,transform .2s}
        .card-new:hover{background:rgba(201,146,43,.14);transform:translateY(-4px)}
        .meta{display:flex;justify-content:space-between;font-size:13px;margin-top:8px;color:#a29e93}
        .fr{display:flex;align-items:center;gap:14px;height:62px;padding:0 6px;border-bottom:1px solid rgba(255,255,255,.06)}
        .av{width:38px;height:38px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;color:#1a1409}
        .dot{width:9px;height:9px;border-radius:50%}
        .row{display:grid;grid-template-columns:34px 1fr 150px 90px 70px 70px;align-items:center;gap:12px;width:100%;height:60px;padding:0 20px;border-left:3px solid transparent;border-bottom:1px solid rgba(255,255,255,.05);transition:background .15s}
        .row:hover{background:rgba(255,255,255,.05)}
        .row-on{background:rgba(201,146,43,.15);border-left-color:#c9922b}
        .hd{height:38px;font-size:12px;color:#8f8b81;cursor:default}
        .hd:hover{background:none}
        .bar{height:6px;border-radius:3px;background:rgba(255,255,255,.1);overflow:hidden}
        .bar>i{display:block;height:100%;background:#c9922b;transition:width .5s cubic-bezier(.2,.8,.2,1)}
        .pg{color:#9ac985}.py{color:#e0ab45}.pr{color:#d9745a}
        .grp{font-size:14px;color:#e0ab45;padding:22px 28px 8px}
        .set{display:flex;align-items:center;justify-content:space-between;height:58px;padding:0 28px;border-top:1px solid rgba(255,255,255,.06);transition:background .15s}
        .set:hover{background:rgba(255,255,255,.04)}
        .set-on{background:rgba(201,146,43,.1);box-shadow:inset 3px 0 0 #c9922b}
        .sel{display:inline-flex;align-items:center;justify-content:space-between;gap:14px;min-width:210px;height:38px;padding:0 14px;border-radius:8px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14);font-size:14px}
        .sld{display:flex;align-items:center;gap:16px;width:300px}
        .sld-t{position:relative;flex:1;height:6px;border-radius:3px;background:rgba(255,255,255,.12)}
        .sld-f{position:absolute;left:0;top:0;bottom:0;border-radius:3px;background:#c9922b}
        .sld-k{position:absolute;top:-6px;width:18px;height:18px;margin-left:-9px;border-radius:50%;background:#f0c264;border:3px solid #1a1409}
        .sld-v{width:44px;text-align:right;font-size:14px;font-weight:600}
        .tg{position:relative;width:48px;height:26px;border-radius:13px;background:rgba(255,255,255,.14);transition:background .25s;flex:none}
        .tg::after{content:'';position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#cfcbc1;transition:left .25s cubic-bezier(.3,.7,.2,1),background .25s}
        .tg.on{background:#c9922b}
        .tg.on::after{left:25px;background:#1a1409}
        .seg{display:flex;border-radius:10px;overflow:hidden;border:1px solid rgba(255,255,255,.14)}
        .seg>span{flex:1;display:flex;align-items:center;justify-content:center;height:40px;padding:0 20px;font-size:14px;font-weight:600;background:rgba(255,255,255,.04);border-left:1px solid rgba(255,255,255,.1)}
        .seg>span:first-child{border-left:0}
        .seg>.on{background:#c9922b;color:#1a1409}
        .lbl{font-size:12px;color:#a29e93;margin-bottom:8px}
        .inp{display:flex;align-items:center;justify-content:space-between;height:52px;padding:0 16px;border-radius:10px;background:rgba(255,255,255,.06);border:1.5px solid #c9922b;font-size:18px;font-weight:500}
        .caret{width:2px;height:22px;background:#e0ab45;animation:blink 1s steps(1) infinite}
        @keyframes blink{50%{opacity:0}}
        .th{position:relative;overflow:hidden}
        .th::before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 70% 35%,rgba(255,200,120,.35),transparent 45%)}
        .m1{background:linear-gradient(180deg,#3b2a1b,#c47a2a 75%)}
      `}</style>

      <div ref={containerRef} className="gmw">
        <div ref={gmRef} className="gm p0">
          
          {/* Scene Background */}
          <div className="a" style={{ inset: 0, background: 'linear-gradient(180deg,#17140f,#2b2218 58%,#120f0b)' }} />
          <div className="a" style={{ left: '-200px', top: 0, width: '1840px', height: '900px', background: 'radial-gradient(900px 520px at 70% 82%,rgba(201,146,43,.42),transparent 62%)' }} />
          <div className="a" style={{ inset: 0, background: 'rgba(9,9,10,.5)' }} />

          {/* Wipe transition element */}
          <div ref={wipeRef} className={`absolute left-0 top-0 w-full h-[3px] z-9 ${wipeActive ? 'animate-[sweep_.3s_linear]' : ''}`} style={{ background: 'linear-gradient(90deg,transparent,#e0ab45 50%,transparent)' }} />

          {/* LOADING SCREEN OVERLAY */}
          {isLoading && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-8 bg-[#080a0e]">
              <div className="w-full max-w-lg flex flex-col items-center text-center space-y-8 animate-in fade-in duration-150">
                <div className="flex items-center gap-4 px-7 py-3.5 bg-[#121620] border border-white/10 rounded-xl shadow-2xl">
                  <div className="w-3 h-8 bg-[#c9922b] -skew-x-12 shrink-0 shadow-[0_0_16px_rgba(201,146,43,0.6)]" />
                  <span className="text-2xl font-black italic tracking-widest text-white uppercase font-['Barlow_Condensed',sans-serif]">
                    СТЕПНОЙ ТРАКТ 2D
                  </span>
                  <div className="w-3 h-8 bg-[#c9922b] -skew-x-12 shrink-0 shadow-[0_0_16px_rgba(201,146,43,0.6)]" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-bold uppercase tracking-wider text-white font-mono">
                    {loadingStageText}
                  </h3>
                  <p className="text-xs font-mono text-[#a29e93]">
                    Подготовка транспортной симуляции...
                  </p>
                </div>
                <div className="w-full space-y-2.5">
                  <div className="w-full h-3 bg-[#181d2a] border border-white/10 rounded-lg overflow-hidden p-0.5">
                    <div 
                      className="h-full bg-[#c9922b] rounded transition-all duration-300 ease-out shadow-[0_0_16px_rgba(201,146,43,0.8)]"
                      style={{ width: `${loadingProgress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs font-mono text-[#a29e93]">
                    <span>ЗАГРУЗКА РЕСУРСОВ</span>
                    <span className="text-[#c9922b] font-bold">{loadingProgress}%</span>
                  </div>
                </div>
                <div className="p-5 bg-[#121620] border border-white/[0.08] rounded-xl text-xs font-mono text-[#a29e93] leading-relaxed max-w-md shadow-lg">
                  {LOADING_TIPS[loadingTipIndex]}
                </div>
              </div>
            </div>
          )}

          {/* 1. MAIN SCREEN */}
          <section className={`scr ${currentScreen === 'main' ? 'on' : ''}`}>
            <div className="a" style={{ inset: 0, background: 'linear-gradient(90deg,rgba(9,9,10,.9),rgba(9,9,10,.6) 36%,transparent 70%)' }} />
            
            <div className="top">
              <div className="row2" style={{ alignItems: 'center', gap: '14px' }}>
                <svg width="36" height="36" viewBox="0 0 36 36"><path d="M18 2 32 10v16L18 34 4 26V10z" fill="none" stroke="#c9922b" strokeWidth="2.5"/><path d="M11 22 18 11l7 11z" fill="#c9922b"/></svg>
                <span className="cn" style={{ fontSize: '15px', fontWeight: 600 }}>Главное меню</span>
              </div>
              <div className="row2">
                <button className="chip" onClick={() => goToScreen('notif')} aria-label="Уведомления">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#cfcbc1" strokeWidth="1.8"><path d="M6 17V11a6 6 0 0 1 12 0v6l1.5 2h-15zM10 21h4"/></svg>
                  <span className="mut" style={{ fontSize: '14px' }}>0</span>
                </button>
                <button className="chip" onClick={() => { if (onOpenProfile) onOpenProfile(); else goToScreen('account'); }}>
                  <span className="ava">И</span><span style={{ fontWeight: 500 }}>Игрок_0417</span>
                </button>
              </div>
            </div>

            <div className="a" style={{ left: '64px', top: '176px', width: '420px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <button 
                onClick={() => {
                  if (latestSave) handleLoadSaveSlot(latestSave.id);
                  else goToScreen('new');
                }}
                className="menu-i cn" 
                style={{ background: 'rgba(201,146,43,.16)', borderLeftColor: '#c9922b', color: '#fff', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: '2px', height: '84px' }}
              >
                <span>Продолжить</span>
                <span className="mut" style={{ font: '400 14px Barlow,sans-serif', textTransform: 'none', letterSpacing: 0 }}>
                  {latestSave ? `«${latestSave.name}»` : 'Свободная езда'}
                </span>
              </button>
              <button className="menu-i cn" onClick={() => goToScreen('new')}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c9922b" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>Новая сессия
              </button>
              <button className="menu-i cn" onClick={() => goToScreen('saves')}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c9922b" strokeWidth="2"><path d="M4 7h16M4 12h16M4 17h10"/></svg>Загрузить
              </button>
              <button className="menu-i cn" onClick={() => { if (onOpenOnline) onOpenOnline(); else goToScreen('servers'); }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c9922b" strokeWidth="2"><circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4c3 3 3 13 0 16M12 4c-3 3-3 13 0 16"/></svg>Онлайн
              </button>
              <button className="menu-i cn" onClick={() => { if (onOpenProfile) onOpenProfile(); else goToScreen('account'); }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c9922b" strokeWidth="2"><circle cx="12" cy="9" r="4"/><path d="M4 20c1-4 4-6 8-6s7 2 8 6"/></svg>Аккаунт
              </button>
              <button className="menu-i cn" onClick={() => goToScreen('settings')}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c9922b" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/></svg>Настройки
              </button>
              <button className="menu-i cn" onClick={onResume} style={{ marginTop: '14px', color: '#a29e93' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a29e93" strokeWidth="2"><path d="M9 4H5v16h4M15 8l4 4-4 4M19 12H9"/></svg>В игру [ESC]
              </button>
            </div>

            <div className="panel a" style={{ left: '880px', top: '176px', width: '496px', padding: '14px' }}>
              <div className="th m1" style={{ height: '268px', borderRadius: '10px' }} />
              <div style={{ padding: '16px 8px 6px' }}>
                <div className="cn mut" style={{ fontSize: '13px' }}>Последняя сессия</div>
                <div className="cn" style={{ fontSize: '30px', fontWeight: 700, marginTop: '4px' }}>
                  {latestSave ? latestSave.name : 'Степной Тракт · Утро'}
                </div>
                <div className="mut" style={{ display: 'flex', gap: '26px', marginTop: '12px', fontSize: '14px' }}>
                  <span>Карта: Степной Регион</span>
                  <span>Время: {latestSave ? formatGameTime(latestSave.timeHour || 10) : '10:00'}</span>
                </div>
                <button 
                  className="btn btn-p" 
                  onClick={() => {
                    if (latestSave) handleLoadSaveSlot(latestSave.id);
                    else goToScreen('new');
                  }}
                  style={{ marginTop: '18px' }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16"><path d="M4 2l10 6-10 6z" fill="#1a1409"/></svg>Продолжить
                </button>
              </div>
            </div>

            <div className="hint">
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className="key">↑↓</span>Навигация
                <span className="key">Enter</span>Выбрать
                <span className="key">Esc</span>Назад
              </div>
              <div>16:34 · Пн, 12 октября</div>
            </div>
          </section>

          {/* 2. SAVES SCREEN */}
          <section className={`scr ${currentScreen === 'saves' ? 'on' : ''}`}>
            <div className="top">
              <div className="row2" style={{ alignItems: 'center', gap: '16px' }}>
                <button className="chip back" onClick={() => goToScreen('main', true)} aria-label="Назад">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e9e6df" strokeWidth="2"><path d="M15 5l-7 7 7 7"/></svg>
                </button>
                <span className="cn ttl">Загрузить сессию</span>
              </div>
            </div>

            <div className="tabs">
              <div className="row2" style={{ gap: '6px' }}>
                <button className="tab tab-on cn">Все сохранения ({saves.length})</button>
              </div>
              <div className="mut" style={{ paddingBottom: '12px', fontSize: '13px' }}>{saves.length} слотов сохранений</div>
            </div>

            <div className="a" style={{ left: '64px', top: '182px', width: '1312px', display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: '20px' }}>
              {saves.map((v, i) => (
                <button 
                  key={v.id} 
                  className={`card ${i === selectedSaveIdx ? 'card-on' : ''}`}
                  onClick={() => {
                    setSelectedSaveIdx(i);
                    handleLoadSaveSlot(v.id);
                  }}
                >
                  <div className="th m1" style={{ height: '178px' }} />
                  <div style={{ padding: '14px 16px' }}>
                    <div className="cn" style={{ fontSize: '22px', fontWeight: 700 }}>{v.name}</div>
                    <div className="meta"><span>{v.streetName || 'Степной Тракт'}</span><span>{formatGameTime(v.timeHour || 10)}</span></div>
                    <div className="meta"><span>{v.calendar ? formatGameDate(v.calendar, 'medium') : '08.10.2026'}</span><span style={{ color: '#e0ab45' }}>{i === selectedSaveIdx ? 'Выбрано' : ''}</span></div>
                  </div>
                </button>
              ))}
              <div style={{ height: '280px' }}>
                <button className="card-new" onClick={() => goToScreen('new')}>
                  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#e0ab45" strokeWidth="1.6"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>
                  <span className="cn" style={{ fontSize: '20px', fontWeight: 600 }}>Новая сессия</span>
                </button>
              </div>
            </div>

            <div className="hint">
              <div style={{ display: 'flex', alignItems: 'center' }}><span className="key">Enter</span>Загрузить<span className="key">Esc</span>Назад</div>
            </div>
          </section>

          {/* 3. NEW SESSION SCREEN */}
          <section className={`scr ${currentScreen === 'new' ? 'on' : ''}`}>
            <div className="top">
              <div className="row2" style={{ alignItems: 'center', gap: '16px' }}>
                <button className="chip back" onClick={() => goToScreen('main', true)} aria-label="Назад">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e9e6df" strokeWidth="2"><path d="M15 5l-7 7 7 7"/></svg>
                </button>
                <span className="cn ttl">Новая сессия</span>
              </div>
              <div className="mut" style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <b style={{ color: '#e0ab45' }}>1</b> Выбор точки выезда <span style={{ width: '28px', height: '1px', background: 'rgba(255,255,255,.25)' }}></span> <b style={{ color: '#e0ab45' }}>2</b> Запуск
              </div>
            </div>

            <div className="a" style={{ left: '64px', top: '112px', width: '880px' }}>
              <div className="cn" style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Доступные сектора спавна</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '20px' }}>
                {spawnLocations.map((loc) => {
                  const isSelected = selectedSpawnId === loc.id;
                  return (
                    <button
                      key={loc.id}
                      onClick={() => setSelectedSpawnId(loc.id)}
                      className={`card p-5 text-left ${isSelected ? 'card-on' : ''}`}
                    >
                      <div className="cn" style={{ fontSize: '20px', fontWeight: 700 }}>{loc.nameRu}</div>
                      <div className="mut" style={{ fontSize: '13px', marginTop: '6px' }}>{loc.description}</div>
                      <div className="meta" style={{ marginTop: '14px' }}><span>Координаты: X:{loc.x} Y:{loc.y}</span><span style={{ color: '#e0ab45' }}>{isSelected ? 'Выбрано' : ''}</span></div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="panel a" style={{ left: '976px', top: '112px', width: '400px', height: '730px', padding: '14px', display: 'flex', flexDirection: 'column' }}>
              <div className="th m1" style={{ height: '150px', borderRadius: '9px', flex: 'none' }} />
              <div style={{ padding: '16px 10px 0', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div className="cn mut" style={{ fontSize: '12px' }}>Параметры</div>
                <div className="cn" style={{ fontSize: '28px', fontWeight: 700, marginTop: '2px' }}>Новый рейс</div>
                <div style={{ marginTop: '20px' }}>
                  <div className="lbl">Имя водителя</div>
                  <div className="inp">
                    <input 
                      type="text" 
                      value={newGameName} 
                      onChange={(e) => setNewGameName(e.target.value)} 
                      style={{ background: 'transparent', border: 0, color: 'inherit', width: '100%', outline: 'none', font: 'inherit' }}
                    />
                    <span className="caret" />
                  </div>
                </div>
                <div style={{ marginTop: '20px' }}>
                  <div className="lbl">Режим</div>
                  <div className="seg"><span className="on">Свободная езда</span></div>
                </div>
                <div style={{ flex: 1 }} />
                <button className="btn btn-p" onClick={handleStartNewGame} style={{ width: '100%', height: '52px', fontSize: '17px', marginBottom: '10px' }}>
                  <svg width="16" height="16" viewBox="0 0 16 16"><path d="M4 2l10 6-10 6z" fill="#1a1409"/></svg>Начать сессию
                </button>
              </div>
            </div>

            <div className="hint">
              <div style={{ display: 'flex', alignItems: 'center' }}><span className="key">Enter</span>Начать<span className="key">Esc</span>Назад</div>
            </div>
          </section>

          {/* 4. SETTINGS SCREEN */}
          <section className={`scr ${currentScreen === 'settings' ? 'on' : ''}`}>
            <div className="top">
              <div className="row2" style={{ alignItems: 'center', gap: '16px' }}>
                <button className="chip back" onClick={() => goToScreen('main', true)} aria-label="Назад">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e9e6df" strokeWidth="2"><path d="M15 5l-7 7 7 7"/></svg>
                </button>
                <span className="cn ttl">Настройки</span>
              </div>
            </div>

            <div className="a" style={{ left: '64px', top: '128px', width: '260px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <button className="nav-i nav-on cn">Графика</button>
              <button className="nav-i cn" onClick={() => goToScreen('settings-sound')}>Звук</button>
              <button className="nav-i cn" onClick={() => goToScreen('settings-ctrl')}>Управление</button>
              <button className="nav-i cn" onClick={() => goToScreen('settings-game')}>Геймплей</button>
            </div>

            <div className="panel a" style={{ left: '350px', top: '128px', width: '700px', height: '714px', overflowY: 'auto' }}>
              <div className="grp cn" style={{ paddingTop: '18px' }}>Производительность</div>
              <div className="set" style={{ height: '70px' }}>
                <span style={{ fontWeight: 500 }}>Ограничение FPS</span>
                <div className="seg">
                  {[30, 60, 120, 0].map(fps => (
                    <span 
                      key={fps} 
                      className={settings.fpsLimit === fps ? 'on' : ''}
                      onClick={() => onUpdateSettings({ ...settings, fpsLimit: fps })}
                    >
                      {fps === 0 ? 'Выкл' : `${fps}`}
                    </span>
                  ))}
                </div>
              </div>
              <div className="grp cn">Звук / Музыка</div>
              <div className="set">
                <span>Мute / Звук</span>
                <button className={`tg ${!isMuted ? 'on' : ''}`} onClick={onToggleMute} />
              </div>
              <div className="grp cn">Управление</div>
              <div className="set">
                <span>Чувствительность мыши</span>
                <span className="cn" style={{ color: '#c9922b', fontWeight: 700 }}>{settings.mouseSensitivity.toFixed(1)}x</span>
              </div>
            </div>

            <div className="hint">
              <div style={{ display: 'flex', alignItems: 'center' }}><span className="key">Esc</span>Назад</div>
            </div>
          </section>

          {/* 5. NOTIFICATIONS / MISC SCREENS FALLBACK */}
          <section className={`scr ${currentScreen === 'notif' ? 'on' : ''}`}>
            <div className="top">
              <div className="row2" style={{ alignItems: 'center', gap: '16px' }}>
                <button className="chip back" onClick={() => goToScreen('main', true)} aria-label="Назад">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e9e6df" strokeWidth="2"><path d="M15 5l-7 7 7 7"/></svg>
                </button>
                <span className="cn ttl">Уведомления</span>
              </div>
            </div>
            <div className="a" style={{ left: '64px', top: '160px', fontSize: '18px', color: '#a29e93' }}>
              Нет новых уведомлений.
            </div>
          </section>

        </div>
      </div>
    </div>
  );
};
