import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Battery,
  BatteryCharging,
  Wifi,
  Signal,
  Cpu,
  HardDrive,
  Layers,
  Zap,
  Phone as PhoneIcon,
  MessageSquare,
  Camera,
  Compass,
  FileText,
  Settings,
  Flashlight,
  ChevronLeft,
  Send,
  Smartphone,
  ShieldCheck,
  MapPin,
  Navigation,
  CloudRain,
  CloudLightning,
  CloudFog,
  Sun,
  Wrench,
  Ambulance,
  Car,
  Image as ImageIcon,
  Wind,
  Cloud,
  CloudDrizzle,
  Snowflake,
  Trash2
} from 'lucide-react';
import { InventoryItem, Player, PhoneSpecs, GameWorld } from '../types';
import { sound } from '../audio';
import {
  formatGameDate,
  formatGameTime,
  getRussianSeasonName,
  getRussianWeatherDescription,
  calculateClimateAtmosphere,
  createInitialCalendarState
} from '../calendarSystem';
import {
  PHONE_WALLPAPERS,
  PHONE_CONTACTS,
  PhoneContact,
  getPhoneSpecsForItemId
} from '../phoneData';
import { addPlayerNotification } from '../items';
import { PhoneTaxiApp } from './PhoneTaxiApp';
import { TaxiFleetSystem } from '../taxiSystem';
import { useTopmostEscape } from './gameUi';
import './phoneMenu.css';

interface PhoneModalProps {
  item: InventoryItem | null;
  player: Player | null;
  world?: GameWorld | null;
  onSetGpsTarget?: (dest: { x: number; y: number; name?: string } | null) => void;
  onClose: () => void;
}

type ActiveApp = 'home' | 'specs' | 'messages' | 'camera' | 'notes' | 'gps' | 'settings' | 'taxi';

export interface PhoneChatMessage {
  id: string;
  contactId: string;
  sender: 'player' | 'contact';
  text: string;
  timestamp: string;
  read: boolean;
}

interface CapturedPhoto {
  id: string;
  dataUrl: string;
  timestamp: string;
  locationName: string;
}

const APP_POS: Record<ActiveApp, number> = {
  home: 0,
  messages: 1,
  taxi: 2,
  gps: 3,
  camera: 4,
  notes: 5,
  specs: 6,
  settings: 7
};

export const PhoneModal: React.FC<PhoneModalProps> = ({ item, player, world, onSetGpsTarget, onClose }) => {
  if (!item) return null;

  const specs: PhoneSpecs = item.phoneSpecs || getPhoneSpecsForItemId(item.itemId);

  const [activeApp, setActiveApp] = useState<ActiveApp>('home');
  const [isBackNav, setIsBackNav] = useState<boolean>(false);
  const [selectedWallpaper, setSelectedWallpaper] = useState<string>(PHONE_WALLPAPERS[0].cssBackground);
  const [soundFeedbackOn, setSoundFeedbackOn] = useState<boolean>(true);
  const [flashlightOn, setFlashlightOn] = useState<boolean>(() => {
    return !!(player?.phoneFlashlightOn || specs.flashlightOn);
  });
  const [islandExpanded, setIslandExpanded] = useState<boolean>(false);
  const [batteryLevel, setBatteryLevel] = useState<number>(() => specs.batteryLevelPct ?? 88);

  const wipeRef = useRef<HTMLDivElement>(null);

  const triggerWipe = () => {
    const w = wipeRef.current;
    if (!w) return;
    w.classList.remove('on');
    void w.offsetWidth;
    w.classList.add('on');
  };

  // Messages App state
  const [contacts] = useState<PhoneContact[]>(PHONE_CONTACTS);
  const [selectedContact, setSelectedContact] = useState<PhoneContact | null>(null);
  const [messages, setMessages] = useState<PhoneChatMessage[]>(() => {
    return [
      {
        id: 'msg_pitstop_init',
        contactId: 'contact_pitstop',
        sender: 'contact',
        text: 'PIT-STOP: Напоминаем о плановой замене антифриза и масла в двигателе. Мастерская работает круглосуточно.',
        timestamp: '12:15',
        read: true
      },
      {
        id: 'msg_mchs_init',
        contactId: 'contact_mchs',
        sender: 'contact',
        text: 'МЧС 112: Внимание! Соблюдайте скоростной режим и дистанцию на трассе. При задымлении заглушите двигатель.',
        timestamp: '09:00',
        read: true
      }
    ];
  });
  const [replyInput, setReplyInput] = useState<string>('');

  // Notes App state
  const [notes, setNotes] = useState<string>(() => {
    try {
      return localStorage.getItem('player_phone_notes') ||
        'Мои заметки:\n· Проверить масло в двигателе\n· Купить канистру бензина АИ-95\n· Заехать в автосервис к Санычу\n· Проверить свечи зажигания';
    } catch {
      return 'Заметки';
    }
  });

  // Camera state
  const [cameraShutterEffect, setCameraShutterEffect] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([]);
  const [viewingPhoto, setViewingPhoto] = useState<CapturedPhoto | null>(null);
  const [liveCanvasSnapshot, setLiveCanvasSnapshot] = useState<string | null>(null);

  // Derive real game time & astronomical calendar
  const calendar = world?.calendar || createInitialCalendarState(2026, 10, 8, typeof world?.timeHour === 'number' ? world.timeHour : 12);
  const atmo = calculateClimateAtmosphere(calendar, world?.weather || 'clear');

  const getGameTimeStr = () => formatGameTime(calendar.timeHour);
  const [currentTimeStr, setCurrentTimeStr] = useState<string>(getGameTimeStr());

  // Clock sync
  useEffect(() => {
    const updateTime = () => setCurrentTimeStr(getGameTimeStr());
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [world?.calendar, world?.timeHour]);

  // Battery drain & in-car charging
  useEffect(() => {
    const batteryInterval = setInterval(() => {
      if (player?.isInVehicle) {
        setBatteryLevel(prev => {
          const next = Math.min(100, prev + 1);
          if (item.phoneSpecs) item.phoneSpecs.batteryLevelPct = next;
          return next;
        });
      } else if (flashlightOn) {
        setBatteryLevel(prev => {
          const next = Math.max(1, prev - 1);
          if (item.phoneSpecs) item.phoneSpecs.batteryLevelPct = next;
          return next;
        });
      }
    }, 15000);
    return () => clearInterval(batteryInterval);
  }, [player?.isInVehicle, flashlightOn, item]);

  // Grab live canvas preview when Camera app opens
  useEffect(() => {
    if (activeApp === 'camera') {
      try {
        const gameCanvas = document.querySelector('canvas') as HTMLCanvasElement;
        if (gameCanvas) {
          const dataUrl = gameCanvas.toDataURL('image/jpeg', 0.85);
          setLiveCanvasSnapshot(dataUrl);
        }
      } catch (err) {
        console.warn('Canvas snapshot capture error', err);
      }
    }
  }, [activeApp]);

  const playUiClick = () => {
    if (soundFeedbackOn) sound.click();
  };

  const handleAppOpen = (app: ActiveApp) => {
    playUiClick();
    setIsBackNav(false);
    triggerWipe();
    setActiveApp(app);
  };

  const handleBack = () => {
    playUiClick();
    setIsBackNav(true);
    triggerWipe();
    if (viewingPhoto) {
      setViewingPhoto(null);
    } else if (selectedContact) {
      setSelectedContact(null);
    } else if (activeApp !== 'home') {
      setActiveApp('home');
    } else {
      onClose();
    }
  };

  useTopmostEscape(() => {
    if (activeApp !== 'home' || selectedContact || viewingPhoto) {
      handleBack();
    } else {
      onClose();
    }
  });

  // Real flashlight toggle linked directly to game renderer
  const toggleTorch = () => {
    playUiClick();
    const newState = !flashlightOn;
    setFlashlightOn(newState);

    if (player) {
      player.phoneFlashlightOn = newState;
      player.flashlightOn = newState;
    }
    if (item.phoneSpecs) {
      item.phoneSpecs.flashlightOn = newState;
    }
    if (player) {
      addPlayerNotification(
        player,
        newState ? 'Фонарик телефона включён' : 'Фонарик телефона выключен',
        'info'
      );
    }
  };

  const handleSendMessage = () => {
    if (!replyInput.trim() || !selectedContact) return;
    if (soundFeedbackOn) sound.playPhoneKeypad(750);
    const sentText = replyInput.trim();
    const newMsg: PhoneChatMessage = {
      id: `msg_${Date.now()}`,
      contactId: selectedContact.id,
      sender: 'player',
      text: sentText,
      timestamp: currentTimeStr,
      read: true
    };
    setMessages(prev => [...prev, newMsg]);
    setReplyInput('');

    // Real game world dispatcher integration
    setTimeout(() => {
      if (soundFeedbackOn) sound.playNotificationPing();
      let responseText = 'Сообщение принято диспетчером службы.';

      if (selectedContact.id === 'contact_hospital') {
        if (player && player.needs && player.needs.health < 60) {
          responseText = 'Бригада скорой помощи выехала по вашим GPS координатам! Ожидайте на месте.';
          if (player) addPlayerNotification(player, 'Скорая помощь приняла ваш экстренный вызов!', 'heal');
        } else {
          responseText = 'Диспетчер Скорой: Если нет открытых переломов и артериального кровотечения, используйте бинты и анальгетики из аптечки.';
        }
      } else if (selectedContact.id === 'contact_pitstop') {
        responseText = 'PIT-STOP Сервис: Эвакуатор и дежурный механик готовы к выезду. Мастерская открыта 24/7.';
        if (player) addPlayerNotification(player, 'Автосервис PIT-STOP принял заявку на обслуживание.', 'info');
      } else if (selectedContact.id === 'contact_taxi') {
        responseText = 'Такси «Вираж»: Экипаж получил заказ. Ориентировочное время подачи 2-3 минуты.';
        if (player) addPlayerNotification(player, 'Такси «Вираж»: заказ принят в обработку.', 'info');
      } else if (selectedContact.id === 'contact_mchs') {
        const weatherDesc = world?.weather === 'storm'
          ? 'Штормовое предупреждение! Сильный ветер и гроза.'
          : world?.weather === 'rain'
          ? 'Дождь на трассе, снижение сцепления шин с дорогой.'
          : world?.weather === 'fog'
          ? 'Опасность: плотный туман, видимость снижена.'
          : 'Обстановка в районе штатная. Метеоусловия благоприятные.';
        responseText = `МЧС 112: ${weatherDesc} При возникновении ЧС оставайтесь на связи.`;
      }

      setMessages(p => [
        ...p,
        {
          id: `reply_${Date.now()}`,
          contactId: selectedContact.id,
          sender: 'contact',
          text: responseText,
          timestamp: currentTimeStr,
          read: true
        }
      ]);
    }, 1200);
  };

  // Real Camera Photo Capture from Game Canvas
  const handleCapturePhoto = () => {
    if (soundFeedbackOn) sound.playCameraShutter();
    setCameraShutterEffect(true);
    setTimeout(() => setCameraShutterEffect(false), 180);

    try {
      const gameCanvas = document.querySelector('canvas') as HTMLCanvasElement;
      if (gameCanvas) {
        const photoData = gameCanvas.toDataURL('image/jpeg', 0.92);
        const newPhoto: CapturedPhoto = {
          id: `photo_${Date.now()}`,
          dataUrl: photoData,
          timestamp: currentTimeStr,
          locationName: player ? `X: ${Math.round(player.x)} · Y: ${Math.round(player.y)}` : 'Flatbody'
        };
        setCapturedPhotos(prev => [newPhoto, ...prev]);
        setLiveCanvasSnapshot(photoData);
        if (player) {
          addPlayerNotification(player, 'Фотография сохранена в галерею телефона', 'pickup');
        }
      }
    } catch (err) {
      console.warn('Camera capture error', err);
    }
  };

  const handleSaveNotes = (text: string) => {
    setNotes(text);
    try {
      localStorage.setItem('player_phone_notes', text);
    } catch {}
  };

  // Real Points of Interest calculation
  const getPOIDistances = () => {
    if (!player) return [];
    const pois = [
      { name: 'Автосервис PIT-STOP', x: 2500, y: 3500, desc: 'Ремонт, шиномонтаж, запчасти', icon: Wrench },
      { name: 'АЗС «Транзит-Степь»', x: 5160, y: 5160, desc: 'Бензин АИ-92/95/ДТ, магазин', icon: Zap },
      { name: 'Автосалон «Степь Моторс»', x: 252, y: 5916, desc: 'Продажа и тест-драйв автомобилей', icon: Car },
      { name: 'Городская Больница №1', x: 1800, y: 2200, desc: 'Медицинская помощь и аптека', icon: Ambulance }
    ];

    return pois.map(poi => {
      const dx = poi.x - player.x;
      const dy = poi.y - player.y;
      const dist = Math.round(Math.sqrt(dx * dx + dy * dy));
      return { ...poi, distance: dist };
    }).sort((a, b) => a.distance - b.distance);
  };

  const getWeatherInfo = () => {
    const w = world?.weather || 'clear';
    const tempVal = Math.round(atmo.temperature);
    const tempStr = `${tempVal >= 0 ? '+' : ''}${tempVal}°C`;
    const windSpeedMs = Math.round((world?.wind ? (world.wind.speed * (world.wind.gust ?? 1.0)) * 0.1 : 2.4) * 10) / 10;
    const windStr = `${windSpeedMs} м/с`;
    const desc = getRussianWeatherDescription(w, atmo.isFreezing);
    const seasonStr = getRussianSeasonName(calendar.season);

    switch (w) {
      case 'blizzard':
      case 'snow':
        return { icon: Snowflake, label: desc, temp: tempStr, windStr, seasonStr };
      case 'storm':
        return { icon: CloudLightning, label: desc, temp: tempStr, windStr, seasonStr };
      case 'rain':
        return { icon: CloudRain, label: desc, temp: tempStr, windStr, seasonStr };
      case 'drizzle':
        return { icon: CloudDrizzle, label: desc, temp: tempStr, windStr, seasonStr };
      case 'fog':
        return { icon: CloudFog, label: desc, temp: tempStr, windStr, seasonStr };
      case 'overcast':
        return { icon: Cloud, label: desc, temp: tempStr, windStr, seasonStr };
      default:
        return { icon: Sun, label: desc, temp: tempStr, windStr, seasonStr };
    }
  };

  const weather = getWeatherInfo();
  const WeatherIcon = weather.icon;
  const poiList = getPOIDistances();
  const posIdx = APP_POS[activeApp] || 0;
  const taxiSys = TaxiFleetSystem.getInstance();
  const taxiStatusText = taxiSys.activeOrder
    ? 'Активный заказ'
    : taxiSys.pendingOffer
    ? 'Новый вызов!'
    : taxiSys.profile.isShiftActive
    ? 'На линии'
    : 'Смена и заказы';

  return (
    <div
      id="phone-modal-backdrop"
      className="ph-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="ph-stage">
        {/* Physical Smartphone Chassis */}
        <div
          id="phone-chassis"
          className="ph-chassis"
          style={{
            ['--ph-chassis-accent' as any]: specs.accentHex || '#c9922b',
            background: `linear-gradient(145deg, ${specs.colorHex || '#24221f'}, #121110)`
          }}
        >
          {/* Side Hardware Buttons */}
          <div className="ph-hw-btn ph-hw-pwr" />
          <div className="ph-hw-btn ph-hw-vol1" />
          <div className="ph-hw-btn ph-hw-vol2" />

          {/* Floating Lock / Close Button */}
          <button
            id="phone-power-off-btn"
            type="button"
            onClick={onClose}
            className="ph-close-btn"
            title="Убрать телефон (Esc)"
            aria-label="Убрать телефон"
          >
            <X width={18} height={18} color="#e0ab45" />
          </button>

          {/* Inner Bezel */}
          <div className="ph-bezel">
            {/* AMOLED Screen */}
            <div id="phone-screen" className="ph-screen" style={{ background: selectedWallpaper }}>
              {/* MainMenu Layered Mountain Silhouette Scene */}
              <div className="ph-bg-scene">
                <div
                  className="ph-bg-glow"
                  style={{ transform: `translateX(${(3 - posIdx) * 14}px)` }}
                />
                <svg
                  className="ph-bg-mtn1"
                  viewBox="0 0 800 360"
                  preserveAspectRatio="none"
                  style={{ transform: `translateX(${-posIdx * 6}px)` }}
                >
                  <path
                    d="M0 220 L110 140 L210 195 L340 95 L460 185 L590 120 L710 190 L800 145 L800 360 L0 360 Z"
                    fill="#2a1f14"
                    opacity="0.72"
                  />
                </svg>
                <svg
                  className="ph-bg-mtn2"
                  viewBox="0 0 800 360"
                  preserveAspectRatio="none"
                  style={{ transform: `translateX(${-posIdx * 12}px)` }}
                >
                  <path
                    d="M0 265 L140 195 L270 250 L410 180 L550 255 L680 205 L800 245 L800 360 L0 360 Z"
                    fill="#1a140e"
                  />
                </svg>
                <svg
                  className="ph-bg-mtn3"
                  viewBox="0 0 800 360"
                  preserveAspectRatio="none"
                  style={{ transform: `translateX(${-posIdx * 18}px)` }}
                >
                  <path
                    d="M0 310 L190 278 L390 312 L610 284 L800 315 L800 360 L0 360 Z"
                    fill="#0f0c09"
                  />
                </svg>
                <div className={'ph-bg-scrim' + (activeApp !== 'home' ? ' app-open' : '')} />
              </div>

              {/* Amber Wipe Line */}
              <div className="ph-wipe" ref={wipeRef} />

              {/* Top Status Bar */}
              <div className="ph-statusbar">
                <span className="ph-clock">{currentTimeStr}</span>

                {/* Dynamic Camera Island */}
                <button
                  id="phone-dynamic-island"
                  type="button"
                  onClick={() => {
                    playUiClick();
                    setIslandExpanded(!islandExpanded);
                  }}
                  className={'ph-island' + (islandExpanded ? ' expanded' : '')}
                  title="Информация об устройстве"
                >
                  {islandExpanded ? (
                    <span style={{ fontSize: 10, fontWeight: 600, color: '#f0c264', whiteSpace: 'nowrap' }}>
                      {specs.seriesName} · {specs.osName}
                    </span>
                  ) : (
                    <>
                      <span className="ph-lens" />
                      <span className="ph-led" />
                    </>
                  )}
                </button>

                {/* Signal & Battery */}
                <div className="ph-status-r">
                  <span className="ph-net-tag">{specs.networkType || '5G'}</span>
                  <Signal width={12} height={12} color="#e9e6df" />
                  <Wifi width={12} height={12} color="#e9e6df" />
                  <span style={{ fontWeight: 700, color: batteryLevel < 20 ? '#d9745a' : '#e9e6df' }}>
                    {batteryLevel}%
                  </span>
                  {player?.isInVehicle ? (
                    <BatteryCharging width={14} height={14} color="#9ac985" />
                  ) : (
                    <Battery width={14} height={14} color={batteryLevel < 20 ? '#d9745a' : '#e0ab45'} />
                  )}
                </div>
              </div>

              {/* Main Application Viewport */}
              <div className="ph-viewport">
                {/* ====================== HOME SCREEN ====================== */}
                {activeApp === 'home' && (
                  <div className={'ph-view' + (isBackNav ? ' back' : '')} key="home">
                    <div className="ph-home">
                      {/* Top Brand & Device Header */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <svg width="22" height="22" viewBox="0 0 36 36" aria-hidden="true">
                            <path d="M18 2 32 10v16L18 34 4 26V10z" fill="none" stroke="#c9922b" strokeWidth="2.8" />
                            <path d="M11 22 18 11l7 11z" fill="#c9922b" />
                          </svg>
                          <span className="ph-cn" style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>
                            {specs.seriesName}
                          </span>
                        </div>
                        <span className="ph-mut" style={{ fontSize: 11 }}>
                          {specs.osName} {specs.osVersion}
                        </span>
                      </div>

                      {/* Weather & Astronomical Telemetry Panel */}
                      <div className="ph-hero">
                        <div className="ph-hero-banner">
                          <div className="ph-hero-top">
                            <div>
                              <div className="ph-hero-time">{currentTimeStr}</div>
                              <div className="ph-hero-date">{formatGameDate(calendar, 'full')}</div>
                              <div className="ph-hero-wx">
                                <WeatherIcon width={14} height={14} color="#e0ab45" />
                                <span>{weather.label}</span>
                                <span>·</span>
                                <span style={{ color: '#f0c264', fontWeight: 600 }}>{weather.seasonStr}</span>
                              </div>
                            </div>
                            <div>
                              <div className="ph-hero-temp">{weather.temp}</div>
                              <div className="ph-hero-meta" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                                <Wind width={11} height={11} color="#e0ab45" />
                                <span>{weather.windStr}</span>
                              </div>
                              <div className="ph-hero-meta">
                                {atmo.pressureMmHg} мм · {atmo.humidity}%
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="ph-hero-bar">
                          <span>Восход {formatGameTime(calendar.sunriseHour)}</span>
                          <span>·</span>
                          <span>Закат {formatGameTime(calendar.sunsetHour)}</span>
                          <span>·</span>
                          <span>День {calendar.daylightHours.toFixed(1)} ч</span>
                        </div>
                      </div>

                      {/* 2-Column MainMenu-styled App Tiles */}
                      <div className="ph-app-grid">
                        {/* Экстренные службы */}
                        <button
                          id="app-messages"
                          type="button"
                          onClick={() => handleAppOpen('messages')}
                          className="ph-app-tile"
                        >
                          <span className="ph-tile-ico">
                            <MessageSquare width={18} height={18} />
                          </span>
                          <div className="ph-tile-txt">
                            <div className="ph-tile-ttl">Службы</div>
                            <div className="ph-tile-sub">Диспетчеры · {contacts.length}</div>
                          </div>
                        </button>

                        {/* Таксопарк */}
                        <button
                          id="app-taxi"
                          type="button"
                          onClick={() => handleAppOpen('taxi')}
                          className={'ph-app-tile' + (taxiSys.profile.isShiftActive || taxiSys.pendingOffer ? ' active-tile' : '')}
                        >
                          <span className="ph-tile-ico">
                            <Car width={18} height={18} />
                          </span>
                          <div className="ph-tile-txt">
                            <div className="ph-tile-ttl">Таксопарк</div>
                            <div className="ph-tile-sub">{taxiStatusText}</div>
                          </div>
                        </button>

                        {/* Навигатор */}
                        <button
                          id="app-gps"
                          type="button"
                          onClick={() => handleAppOpen('gps')}
                          className="ph-app-tile"
                        >
                          <span className="ph-tile-ico">
                            <Compass width={18} height={18} />
                          </span>
                          <div className="ph-tile-txt">
                            <div className="ph-tile-ttl">Навигатор</div>
                            <div className="ph-tile-sub">
                              {player ? `X:${Math.round(player.x)} Y:${Math.round(player.y)}` : 'Точки карты'}
                            </div>
                          </div>
                        </button>

                        {/* Камера */}
                        <button
                          id="app-camera"
                          type="button"
                          onClick={() => handleAppOpen('camera')}
                          className="ph-app-tile"
                        >
                          <span className="ph-tile-ico">
                            <Camera width={18} height={18} />
                          </span>
                          <div className="ph-tile-txt">
                            <div className="ph-tile-ttl">Камера</div>
                            <div className="ph-tile-sub">Снимки · {capturedPhotos.length}</div>
                          </div>
                        </button>

                        {/* Блокнот */}
                        <button
                          id="app-notes"
                          type="button"
                          onClick={() => handleAppOpen('notes')}
                          className="ph-app-tile"
                        >
                          <span className="ph-tile-ico">
                            <FileText width={18} height={18} />
                          </span>
                          <div className="ph-tile-txt">
                            <div className="ph-tile-ttl">Блокнот</div>
                            <div className="ph-tile-sub">Заметки и план</div>
                          </div>
                        </button>

                        {/* Система / Характеристики */}
                        <button
                          id="app-specs"
                          type="button"
                          onClick={() => handleAppOpen('specs')}
                          className="ph-app-tile"
                        >
                          <span className="ph-tile-ico">
                            <Cpu width={18} height={18} />
                          </span>
                          <div className="ph-tile-txt">
                            <div className="ph-tile-ttl">Система</div>
                            <div className="ph-tile-sub">{specs.ramGb} ГБ · {specs.storageGb} ГБ</div>
                          </div>
                        </button>

                        {/* Фонарик */}
                        <button
                          id="app-flashlight"
                          type="button"
                          onClick={toggleTorch}
                          className={'ph-app-tile' + (flashlightOn ? ' active-tile' : '')}
                        >
                          <span className="ph-tile-ico">
                            <Flashlight width={18} height={18} />
                          </span>
                          <div className="ph-tile-txt">
                            <div className="ph-tile-ttl">Фонарик</div>
                            <div className="ph-tile-sub">{flashlightOn ? 'Включён · Луч' : 'Выключен'}</div>
                          </div>
                        </button>

                        {/* Опции */}
                        <button
                          id="app-settings"
                          type="button"
                          onClick={() => handleAppOpen('settings')}
                          className="ph-app-tile"
                        >
                          <span className="ph-tile-ico">
                            <Settings width={18} height={18} />
                          </span>
                          <div className="ph-tile-txt">
                            <div className="ph-tile-ttl">Опции</div>
                            <div className="ph-tile-sub">Обои и звук</div>
                          </div>
                        </button>
                      </div>

                      {/* Quick Access Dock */}
                      <div className="ph-dock">
                        <button
                          type="button"
                          onClick={() => handleAppOpen('messages')}
                          className="ph-dock-btn"
                          title="Службы и связь"
                        >
                          <PhoneIcon width={17} height={17} color="#e0ab45" />
                          <span>Связь</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAppOpen('taxi')}
                          className="ph-dock-btn"
                          title="Таксопарк"
                        >
                          <Car width={17} height={17} color="#e0ab45" />
                          <span>Такси</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAppOpen('gps')}
                          className="ph-dock-btn"
                          title="Навигатор"
                        >
                          <Compass width={17} height={17} color="#e0ab45" />
                          <span>Карта</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAppOpen('camera')}
                          className="ph-dock-btn"
                          title="Камера"
                        >
                          <Camera width={17} height={17} color="#e0ab45" />
                          <span>Камера</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ====================== HARDWARE SPECS APP ====================== */}
                {activeApp === 'specs' && (
                  <div className={'ph-view' + (isBackNav ? ' back' : '')} key="specs">
                    <div className="ph-app-top">
                      <div className="ph-app-top-l">
                        <button type="button" onClick={handleBack} className="ph-back" aria-label="Назад">
                          <ChevronLeft width={18} height={18} />
                        </button>
                        <div style={{ minWidth: 0 }}>
                          <div className="ph-app-ttl">Система</div>
                          <div className="ph-app-sub">{specs.modelName}</div>
                        </div>
                      </div>
                      <Smartphone width={18} height={18} color="#e0ab45" />
                    </div>

                    <div className="ph-scroll" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {/* Finish & Chassis Card */}
                      <div className="ph-panel" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div
                          style={{
                            width: 42,
                            height: 42,
                            borderRadius: 10,
                            backgroundColor: specs.colorHex,
                            border: `2px solid ${specs.accentHex || '#c9922b'}`,
                            flex: 'none'
                          }}
                        />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div className="ph-cn ph-mut" style={{ fontSize: 11 }}>{specs.brand} · {specs.seriesName}</div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginTop: 1 }}>{specs.colorNameRu}</div>
                          <div className="ph-mut" style={{ fontSize: 11, marginTop: 1 }}>{specs.osName} {specs.osVersion}</div>
                        </div>
                      </div>

                      {/* 2x2 Key Metrics */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <div className="ph-panel">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#e0ab45', fontSize: 11, fontWeight: 600 }}>
                            <Cpu width={13} height={13} />
                            <span className="ph-cn">Процессор</span>
                          </div>
                          <div className="ph-num" style={{ fontSize: 24, marginTop: 6, color: '#fff' }}>
                            {specs.cpuFrequencyGhz} ГГц
                          </div>
                          <div className="ph-mut" style={{ fontSize: 11, marginTop: 4, lineHeight: 1.3 }}>
                            {specs.cpuCores} ядер · {specs.cpuModel.split('(')[0].trim()}
                          </div>
                        </div>

                        <div className="ph-panel">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#e0ab45', fontSize: 11, fontWeight: 600 }}>
                            <Layers width={13} height={13} />
                            <span className="ph-cn">Память ОЗУ</span>
                          </div>
                          <div className="ph-num" style={{ fontSize: 24, marginTop: 6, color: '#fff' }}>
                            {specs.ramGb} ГБ
                          </div>
                          <div className="ph-bar" style={{ marginTop: 6 }}>
                            <i style={{ width: '38%' }} />
                          </div>
                          <div className="ph-mut" style={{ fontSize: 10, marginTop: 4 }}>
                            Активно: {specs.ramUsedGb || 3.8} / {specs.ramGb} ГБ
                          </div>
                        </div>

                        <div className="ph-panel">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#e0ab45', fontSize: 11, fontWeight: 600 }}>
                            <HardDrive width={13} height={13} />
                            <span className="ph-cn">Накопитель</span>
                          </div>
                          <div className="ph-num" style={{ fontSize: 24, marginTop: 6, color: '#fff' }}>
                            {specs.storageGb} ГБ
                          </div>
                          <div className="ph-bar" style={{ marginTop: 6 }}>
                            <i style={{ width: '24%' }} />
                          </div>
                          <div className="ph-mut" style={{ fontSize: 10, marginTop: 4 }}>
                            Свободно: {Math.round(specs.storageGb * 0.76)} ГБ
                          </div>
                        </div>

                        <div className="ph-panel">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#e0ab45', fontSize: 11, fontWeight: 600 }}>
                            <Zap width={13} height={13} />
                            <span className="ph-cn">Батарея</span>
                          </div>
                          <div className="ph-num" style={{ fontSize: 24, marginTop: 6 }}>
                            {batteryLevel}%
                          </div>
                          <div className="ph-bar" style={{ marginTop: 6 }}>
                            <i style={{ width: `${batteryLevel}%`, background: batteryLevel < 20 ? '#d9745a' : '#9ac985' }} />
                          </div>
                          <div className="ph-mut" style={{ fontSize: 10, marginTop: 4 }}>
                            {specs.batteryCapacityMah} мА·ч · {player?.isInVehicle ? 'Зарядка' : 'От сети'}
                          </div>
                        </div>
                      </div>

                      {/* Spec Table */}
                      <div className="ph-grp">Спецификация оборудования</div>
                      <div className="ph-list">
                        <div className="ph-row">
                          <span className="ph-mut" style={{ fontSize: 12 }}>Дисплей</span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{specs.screenSizeInches || 6.7}" AMOLED 120 Гц</span>
                        </div>
                        <div className="ph-row">
                          <span className="ph-mut" style={{ fontSize: 12 }}>Оптика</span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#fff', textAlign: 'right' }}>{(specs.cameraSpecs || '48 MP Fusion').split('+')[0].trim()}</span>
                        </div>
                        <div className="ph-row">
                          <span className="ph-mut" style={{ fontSize: 12 }}>Платформа</span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#f0c264' }}>{specs.osName} {specs.osVersion}</span>
                        </div>
                        <div className="ph-row">
                          <span className="ph-mut" style={{ fontSize: 12 }}>Защита корпуса</span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: '#9ac985' }}>
                            <ShieldCheck width={14} height={14} /> IP68 Титан
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ====================== MESSAGES & SERVICES APP ====================== */}
                {activeApp === 'messages' && (
                  <div className={'ph-view' + (isBackNav ? ' back' : '')} key="messages">
                    <div className="ph-app-top">
                      <div className="ph-app-top-l">
                        <button type="button" onClick={handleBack} className="ph-back" aria-label="Назад">
                          <ChevronLeft width={18} height={18} />
                        </button>
                        {selectedContact ? (
                          <div style={{ minWidth: 0 }}>
                            <div className="ph-app-ttl">{selectedContact.nameRu}</div>
                            <div className="ph-app-sub">{selectedContact.role} · {selectedContact.number}</div>
                          </div>
                        ) : (
                          <div style={{ minWidth: 0 }}>
                            <div className="ph-app-ttl">Службы и связь</div>
                            <div className="ph-app-sub">Экстренные каналы и диспетчеры</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {selectedContact ? (
                      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                        {/* Chat Thread */}
                        <div className="ph-scroll" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {messages
                            .filter(m => m.contactId === selectedContact.id)
                            .map((m) => {
                              const isPlayer = m.sender === 'player';
                              return (
                                <div
                                  key={m.id}
                                  style={{
                                    alignSelf: isPlayer ? 'flex-end' : 'flex-start',
                                    maxWidth: '86%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: isPlayer ? 'flex-end' : 'flex-start'
                                  }}
                                >
                                  <div
                                    style={{
                                      padding: '8px 11px',
                                      borderRadius: 10,
                                      fontSize: 12,
                                      lineHeight: 1.45,
                                      background: isPlayer ? '#c9922b' : 'rgba(24, 24, 27, 0.95)',
                                      color: isPlayer ? '#1a1409' : '#e9e6df',
                                      fontWeight: isPlayer ? 600 : 400,
                                      border: isPlayer ? 'none' : '1px solid rgba(255,255,255,0.09)'
                                    }}
                                  >
                                    {m.text}
                                  </div>
                                  <span className="ph-mut" style={{ fontSize: 10, marginTop: 3, padding: '0 3px' }}>
                                    {m.timestamp}
                                  </span>
                                </div>
                              );
                            })}
                        </div>

                        {/* Quick Dispatch Presets */}
                        <div style={{ display: 'flex', gap: 6, padding: '6px 12px', overflowX: 'auto', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(16,16,18,0.9)' }}>
                          {[
                            'Нужна помощь по координатам',
                            'Запрос статуса и погоды',
                            'Вызвать экипаж'
                          ].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setReplyInput(preset)}
                              style={{
                                padding: '4px 9px',
                                borderRadius: 6,
                                background: 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                fontSize: 11,
                                color: '#cfcbc1',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {preset}
                            </button>
                          ))}
                        </div>

                        {/* Input Bar */}
                        <div style={{ display: 'flex', gap: 8, padding: '10px 12px', background: 'rgba(18,18,20,0.96)', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                          <input
                            id="chat-reply-input"
                            type="text"
                            value={replyInput}
                            onChange={(e) => setReplyInput(e.target.value)}
                            onKeyDown={(e) => {
                              e.stopPropagation();
                              if (e.key === 'Enter') handleSendMessage();
                            }}
                            placeholder="Сообщение диспетчеру..."
                            className="ph-inp"
                            style={{ flex: 1, height: 38 }}
                          />
                          <button
                            id="chat-reply-send-btn"
                            type="button"
                            onClick={handleSendMessage}
                            disabled={!replyInput.trim()}
                            className="ph-btn ph-btn-p"
                            style={{ width: 40, height: 38, padding: 0 }}
                            aria-label="Отправить"
                          >
                            <Send width={15} height={15} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="ph-scroll">
                        <div className="ph-grp">Оперативные каналы связи</div>
                        <div className="ph-list">
                          {contacts.map((c) => {
                            const lastMsg = [...messages].reverse().find(m => m.contactId === c.id);
                            return (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => {
                                  playUiClick();
                                  triggerWipe();
                                  setSelectedContact(c);
                                }}
                                className="ph-row clickable"
                                style={{ width: '100%', padding: '10px 12px' }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0, flex: 1 }}>
                                  <div
                                    style={{
                                      width: 38,
                                      height: 38,
                                      borderRadius: 9,
                                      background: 'rgba(201, 146, 43, 0.14)',
                                      border: '1px solid rgba(201, 146, 43, 0.45)',
                                      color: '#f0c264',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontFamily: "'Barlow Condensed', sans-serif",
                                      fontSize: 18,
                                      fontWeight: 700,
                                      flex: 'none'
                                    }}
                                  >
                                    {c.nameRu.charAt(0)}
                                  </div>
                                  <div style={{ minWidth: 0, flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6 }}>
                                      <span style={{ fontSize: 14, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {c.nameRu}
                                      </span>
                                      <span className="ph-cn" style={{ fontSize: 11, color: '#e0ab45', flex: 'none' }}>
                                        {c.number}
                                      </span>
                                    </div>
                                    <div className="ph-mut" style={{ fontSize: 11, marginTop: 1 }}>
                                      {c.role}
                                    </div>
                                    <div style={{ fontSize: 11, color: '#cfcbc1', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {lastMsg ? lastMsg.text : c.description}
                                    </div>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ====================== CAMERA APP ====================== */}
                {activeApp === 'camera' && (
                  <div className={'ph-view' + (isBackNav ? ' back' : '')} key="camera">
                    <div className="ph-app-top">
                      <div className="ph-app-top-l">
                        <button type="button" onClick={handleBack} className="ph-back" aria-label="Назад">
                          <ChevronLeft width={18} height={18} />
                        </button>
                        <div style={{ minWidth: 0 }}>
                          <div className="ph-app-ttl">{viewingPhoto ? 'Галерея снимков' : 'Камера'}</div>
                          <div className="ph-app-sub">
                            {viewingPhoto ? viewingPhoto.locationName : (specs.cameraSpecs || '48 MP Fusion').split('+')[0].trim()}
                          </div>
                        </div>
                      </div>
                      {viewingPhoto && (
                        <button
                          type="button"
                          onClick={() => {
                            playUiClick();
                            setCapturedPhotos(prev => prev.filter(p => p.id !== viewingPhoto.id));
                            setViewingPhoto(null);
                          }}
                          className="ph-btn ph-btn-d ph-btn-sm"
                          title="Удалить снимок"
                        >
                          <Trash2 width={13} height={13} />
                        </button>
                      )}
                    </div>

                    {viewingPhoto ? (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#09090a', padding: 12, gap: 10 }}>
                        <div style={{ flex: 1, position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.12)', background: '#000' }}>
                          <img
                            src={viewingPhoto.dataUrl}
                            alt="Снимок экрана"
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          />
                        </div>
                        <div className="ph-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                          <span>Время: <strong>{viewingPhoto.timestamp}</strong></span>
                          <span className="ph-mut">{viewingPhoto.locationName}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setViewingPhoto(null)}
                          className="ph-btn ph-btn-s ph-btn-block"
                        >
                          Вернуться к видоискателю
                        </button>
                      </div>
                    ) : (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#08080a' }}>
                        {/* Viewfinder */}
                        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {liveCanvasSnapshot ? (
                            <img
                              src={liveCanvasSnapshot}
                              alt="Видоискатель"
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                transform: `scale(${zoomLevel})`,
                                transition: 'transform 0.25s ease'
                              }}
                            />
                          ) : (
                            <div className="ph-mut" style={{ fontSize: 12 }}>Видоискатель активен</div>
                          )}

                          {/* Rule of thirds grid */}
                          <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(3, 1fr)', pointerEvents: 'none', opacity: 0.22 }}>
                            <div style={{ borderRight: '1px solid #fff', borderBottom: '1px solid #fff' }} />
                            <div style={{ borderRight: '1px solid #fff', borderBottom: '1px solid #fff' }} />
                            <div style={{ borderBottom: '1px solid #fff' }} />
                            <div style={{ borderRight: '1px solid #fff', borderBottom: '1px solid #fff' }} />
                            <div style={{ borderRight: '1px solid #fff', borderBottom: '1px solid #fff' }} />
                            <div style={{ borderBottom: '1px solid #fff' }} />
                            <div style={{ borderRight: '1px solid #fff' }} />
                            <div style={{ borderRight: '1px solid #fff' }} />
                            <div />
                          </div>

                          {/* Center Amber Target Frame */}
                          <div style={{ width: 64, height: 64, border: '1.5px solid rgba(224, 171, 69, 0.85)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5 }}>
                            <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#e0ab45' }} />
                          </div>

                          {/* Shutter Flash */}
                          {cameraShutterEffect && (
                            <div style={{ position: 'absolute', inset: 0, background: '#fff', zIndex: 20 }} />
                          )}

                          {/* Telemetry Overlay */}
                          <div style={{ position: 'absolute', bottom: 10, left: 12, right: 12, display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#e9e6df', background: 'rgba(12,12,14,0.72)', padding: '5px 10px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.1)' }}>
                            <span className="ph-cn">HDR · {zoomLevel}x</span>
                            <span>X: {player ? Math.round(player.x) : 0} · Y: {player ? Math.round(player.y) : 0}</span>
                          </div>
                        </div>

                        {/* Zoom Selector */}
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '8px 0', background: '#0e0e10', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                          {[0.5, 1, 2, 5].map((z) => (
                            <button
                              key={z}
                              type="button"
                              onClick={() => {
                                playUiClick();
                                setZoomLevel(z);
                              }}
                              style={{
                                minWidth: 36,
                                height: 26,
                                padding: '0 8px',
                                borderRadius: 6,
                                fontFamily: "'Barlow Condensed', sans-serif",
                                fontSize: 13,
                                fontWeight: 700,
                                background: zoomLevel === z ? '#c9922b' : 'rgba(255,255,255,0.07)',
                                color: zoomLevel === z ? '#1a1409' : '#cfcbc1',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              {z}x
                            </button>
                          ))}
                        </div>

                        {/* Shutter Bar */}
                        <div style={{ height: 74, background: '#121214', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '0 24px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              if (capturedPhotos.length > 0) {
                                playUiClick();
                                setViewingPhoto(capturedPhotos[0]);
                              }
                            }}
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: 9,
                              background: 'rgba(255,255,255,0.06)',
                              border: '1px solid rgba(255,255,255,0.14)',
                              overflow: 'hidden',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            title="Открыть последний снимок"
                          >
                            {capturedPhotos.length > 0 ? (
                              <img src={capturedPhotos[0].dataUrl} alt="Превью" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <ImageIcon width={18} height={18} color="#a29e93" />
                            )}
                          </button>

                          <button
                            id="camera-shutter-button"
                            type="button"
                            onClick={handleCapturePhoto}
                            style={{
                              width: 56,
                              height: 56,
                              borderRadius: '50%',
                              border: '3px solid #e0ab45',
                              padding: 4,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            aria-label="Сделать снимок"
                          >
                            <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#c9922b' }} />
                          </button>

                          <div style={{ width: 44, textAlign: 'center' }}>
                            <div className="ph-num" style={{ fontSize: 18 }}>{capturedPhotos.length}</div>
                            <div className="ph-mut" style={{ fontSize: 10 }}>кадров</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ====================== NOTES APP ====================== */}
                {activeApp === 'notes' && (
                  <div className={'ph-view' + (isBackNav ? ' back' : '')} key="notes">
                    <div className="ph-app-top">
                      <div className="ph-app-top-l">
                        <button type="button" onClick={handleBack} className="ph-back" aria-label="Назад">
                          <ChevronLeft width={18} height={18} />
                        </button>
                        <div style={{ minWidth: 0 }}>
                          <div className="ph-app-ttl">Блокнот</div>
                          <div className="ph-app-sub">Личные записи · Автосохранение</div>
                        </div>
                      </div>
                      <FileText width={17} height={17} color="#e0ab45" />
                    </div>

                    <div className="ph-scroll" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <textarea
                        id="phone-notes-area"
                        value={notes}
                        onChange={(e) => handleSaveNotes(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                        placeholder="Запишите важные задачи, координаты или список запчастей..."
                        className="ph-inp"
                        style={{
                          flex: 1,
                          minHeight: 380,
                          padding: '12px 14px',
                          resize: 'none',
                          lineHeight: 1.55,
                          fontSize: 13
                        }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }} className="ph-mut">
                        <span>Символов: {notes.length}</span>
                        <span>Сохранено в памяти устройства</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* ====================== GPS NAVIGATOR APP ====================== */}
                {activeApp === 'gps' && (
                  <div className={'ph-view' + (isBackNav ? ' back' : '')} key="gps">
                    <div className="ph-app-top">
                      <div className="ph-app-top-l">
                        <button type="button" onClick={handleBack} className="ph-back" aria-label="Назад">
                          <ChevronLeft width={18} height={18} />
                        </button>
                        <div style={{ minWidth: 0 }}>
                          <div className="ph-app-ttl">Навигатор</div>
                          <div className="ph-app-sub">Спутниковое позиционирование</div>
                        </div>
                      </div>
                      {onSetGpsTarget && (
                        <button
                          type="button"
                          onClick={() => {
                            playUiClick();
                            onSetGpsTarget(null);
                            if (player) addPlayerNotification(player, 'Маршрут GPS сброшен', 'info');
                          }}
                          className="ph-btn ph-btn-s ph-btn-sm"
                        >
                          Сброс
                        </button>
                      )}
                    </div>

                    <div className="ph-scroll" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {/* Current Telemetry Panel */}
                      <div className="ph-panel" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div>
                          <div className="ph-cn ph-mut" style={{ fontSize: 11 }}>Координаты</div>
                          <div className="ph-num" style={{ fontSize: 22, marginTop: 3, color: '#fff' }}>
                            {player ? `${Math.round(player.x)} · ${Math.round(player.y)}` : '0 · 0'}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div className="ph-cn ph-mut" style={{ fontSize: 11 }}>Азимут курса</div>
                          <div className="ph-num" style={{ fontSize: 22, marginTop: 3 }}>
                            {player ? `${Math.round(((player.angle * 180) / Math.PI + 360) % 360)}°` : '0°'}
                          </div>
                        </div>
                      </div>

                      <div className="ph-grp">Ключевые объекты инфраструктуры</div>
                      <div className="ph-list">
                        {poiList.map((poi, idx) => {
                          const Icon = poi.icon;
                          const distLabel = poi.distance > 1000
                            ? `${(poi.distance / 1000).toFixed(1)} км`
                            : `${poi.distance} м`;
                          return (
                            <div key={idx} className="ph-row" style={{ padding: '10px 12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                                <div
                                  style={{
                                    width: 34,
                                    height: 34,
                                    borderRadius: 8,
                                    background: 'rgba(201,146,43,0.12)',
                                    border: '1px solid rgba(201,146,43,0.4)',
                                    color: '#e0ab45',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flex: 'none'
                                  }}
                                >
                                  <Icon width={16} height={16} />
                                </div>
                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {poi.name}
                                  </div>
                                  <div className="ph-mut" style={{ fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>
                                    <span style={{ color: '#f0c264', fontWeight: 700 }}>{distLabel}</span>
                                    <span> · {poi.desc}</span>
                                  </div>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  playUiClick();
                                  if (onSetGpsTarget) {
                                    onSetGpsTarget({ x: poi.x, y: poi.y, name: poi.name });
                                  }
                                  if (player) {
                                    addPlayerNotification(player, `Маршрут построен: ${poi.name}`, 'info');
                                  }
                                }}
                                className="ph-btn ph-btn-p ph-btn-sm"
                              >
                                <Navigation width={12} height={12} /> Курс
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* ====================== TAXI FLEET APP ====================== */}
                {activeApp === 'taxi' && (
                  <PhoneTaxiApp
                    player={player}
                    world={world}
                    onSetGpsTarget={onSetGpsTarget}
                    onBack={handleBack}
                  />
                )}

                {/* ====================== SETTINGS APP ====================== */}
                {activeApp === 'settings' && (
                  <div className={'ph-view' + (isBackNav ? ' back' : '')} key="settings">
                    <div className="ph-app-top">
                      <div className="ph-app-top-l">
                        <button type="button" onClick={handleBack} className="ph-back" aria-label="Назад">
                          <ChevronLeft width={18} height={18} />
                        </button>
                        <div style={{ minWidth: 0 }}>
                          <div className="ph-app-ttl">Опции телефона</div>
                          <div className="ph-app-sub">Оформление и параметры</div>
                        </div>
                      </div>
                      <Settings width={17} height={17} color="#e0ab45" />
                    </div>

                    <div className="ph-scroll" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div className="ph-grp">Фоновая тема экрана</div>
                      <div className="ph-list">
                        {PHONE_WALLPAPERS.map((wp) => {
                          const isSelected = selectedWallpaper === wp.cssBackground;
                          return (
                            <button
                              key={wp.id}
                              type="button"
                              onClick={() => {
                                playUiClick();
                                setSelectedWallpaper(wp.cssBackground);
                              }}
                              className={'ph-row clickable' + (isSelected ? ' on' : '')}
                              style={{ width: '100%' }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span
                                  style={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: 7,
                                    background: wp.cssBackground,
                                    border: isSelected ? '2px solid #f0c264' : '1px solid rgba(255,255,255,0.2)',
                                     display: 'inline-block'
                                  }}
                                />
                                <span style={{ fontSize: 13, fontWeight: isSelected ? 700 : 500, color: isSelected ? '#fff' : '#cfcbc1' }}>
                                  {wp.nameRu}
                                </span>
                              </div>
                              {isSelected && (
                                <span className="ph-cn" style={{ fontSize: 12, fontWeight: 700, color: '#f0c264' }}>Активна</span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      <div className="ph-grp">Системные переключатели</div>
                      <div className="ph-list">
                        <div className="ph-row">
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Светодиодный фонарик</div>
                            <div className="ph-mut" style={{ fontSize: 11 }}>Освещение пространства перед игроком</div>
                          </div>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={flashlightOn}
                            onClick={toggleTorch}
                            className={'ph-tg' + (flashlightOn ? ' on' : '')}
                          />
                        </div>

                        <div className="ph-row">
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Звуковой отклик</div>
                            <div className="ph-mut" style={{ fontSize: 11 }}>Щелчки клавиш и уведомления</div>
                          </div>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={soundFeedbackOn}
                            onClick={() => {
                              const next = !soundFeedbackOn;
                              setSoundFeedbackOn(next);
                              if (next) sound.click();
                            }}
                            className={'ph-tg' + (soundFeedbackOn ? ' on' : '')}
                          />
                        </div>

                        <div className="ph-row">
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Частота обновления</div>
                            <div className="ph-mut" style={{ fontSize: 11 }}>Адаптивная развёртка матрицы</div>
                          </div>
                          <span className="ph-cn" style={{ fontSize: 14, fontWeight: 700, color: '#e0ab45' }}>120 Гц</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Home Gesture Indicator */}
              <div className="ph-home-bar-wrap">
                <button
                  id="phone-home-gesture-bar"
                  type="button"
                  onClick={() => {
                    playUiClick();
                    setIsBackNav(true);
                    triggerWipe();
                    setActiveApp('home');
                    setSelectedContact(null);
                    setViewingPhoto(null);
                  }}
                  className="ph-home-bar"
                  title="На главный экран"
                  aria-label="На главный экран"
                />
              </div>
            </div>
          </div>
        </div>

        {/* MainMenu-styled Keyboard Hints Strip below Phone */}
        <div className="ph-hint-strip">
          <span>
            <span className="ph-key">Esc</span>
            {activeApp === 'home' ? 'Убрать телефон' : 'Назад'}
          </span>
          <span>
            <span className="ph-key">Клик</span>
            Выбрать раздел
          </span>
        </div>
      </div>
    </div>
  );
};
