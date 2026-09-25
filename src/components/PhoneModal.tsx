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
  Sparkles,
  Smartphone,
  ShieldCheck,
  Eye,
  MapPin,
  Navigation,
  CloudSun,
  CloudRain,
  CloudLightning,
  CloudFog,
  Sun,
  Truck,
  Wrench,
  Ambulance,
  Car,
  AlertTriangle,
  Download,
  Image as ImageIcon,
  CheckCircle2
} from 'lucide-react';
import { InventoryItem, Player, PhoneSpecs, GameWorld } from '../types';
import { sound } from '../audio';
import { getOutsideTemperature } from '../physics';
import {
  PHONE_WALLPAPERS,
  PHONE_CONTACTS,
  INITIAL_PHONE_MESSAGES,
  PhoneContact,
  PhoneSmsMessage,
  getPhoneSpecsForItemId
} from '../phoneData';
import { addPlayerNotification } from '../items';

interface PhoneModalProps {
  item: InventoryItem | null;
  player: Player | null;
  world?: GameWorld | null;
  onClose: () => void;
}

type ActiveApp = 'home' | 'specs' | 'messages' | 'camera' | 'notes' | 'gps' | 'settings';

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

export const PhoneModal: React.FC<PhoneModalProps> = ({ item, player, world, onClose }) => {
  if (!item) return null;

  // Resolve specs from item or fallback
  const specs: PhoneSpecs = item.phoneSpecs || getPhoneSpecsForItemId(item.itemId);

  const [activeApp, setActiveApp] = useState<ActiveApp>('home');
  const [selectedWallpaper, setSelectedWallpaper] = useState<string>(PHONE_WALLPAPERS[0].cssBackground);
  const [flashlightOn, setFlashlightOn] = useState<boolean>(() => {
    return !!(player?.phoneFlashlightOn || specs.flashlightOn);
  });
  const [islandExpanded, setIslandExpanded] = useState<boolean>(false);
  const [batteryLevel, setBatteryLevel] = useState<number>(() => specs.batteryLevelPct ?? 88);

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
        'Мои заметки:\n• Проверить масло в двигателе\n• Купить канистру бензина АИ-95\n• Заехать в автосервис к Санычу\n• Проверить свечи зажигания';
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

  // Derive real game time
  const getGameTimeStr = () => {
    if (world && typeof world.timeOfDay === 'number') {
      const totalMinutes = Math.floor(world.timeOfDay * 24 * 60);
      const hours = Math.floor(totalMinutes / 60) % 24;
      const minutes = totalMinutes % 60;
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const [currentTimeStr, setCurrentTimeStr] = useState<string>(getGameTimeStr());

  // Clock sync
  useEffect(() => {
    const updateTime = () => {
      setCurrentTimeStr(getGameTimeStr());
    };
    updateTime();
    const interval = setInterval(updateTime, 3000);
    return () => clearInterval(interval);
  }, [world?.timeOfDay]);

  // Battery drain & in-car charging
  useEffect(() => {
    const batteryInterval = setInterval(() => {
      if (player?.isInVehicle) {
        // Charging inside car
        setBatteryLevel(prev => {
          const next = Math.min(100, prev + 1);
          if (item.phoneSpecs) item.phoneSpecs.batteryLevelPct = next;
          return next;
        });
      } else if (flashlightOn) {
        // Flashlight active drain
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

  const handleAppOpen = (app: ActiveApp) => {
    sound.click();
    setActiveApp(app);
  };

  const handleBack = () => {
    sound.click();
    if (viewingPhoto) {
      setViewingPhoto(null);
    } else if (selectedContact) {
      setSelectedContact(null);
    } else {
      setActiveApp('home');
    }
  };

  // Real flashlight toggle linked directly to game renderer
  const toggleTorch = () => {
    sound.click();
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
        newState ? 'Фонарик телефона включен' : 'Фонарик телефона выключен',
        'info'
      );
    }
  };

  const handleSendMessage = () => {
    if (!replyInput.trim() || !selectedContact) return;
    sound.playPhoneKeypad(750);
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
      sound.playNotificationPing();
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
    sound.playCameraShutter();
    setCameraShutterEffect(true);
    setTimeout(() => setCameraShutterEffect(false), 200);

    try {
      const gameCanvas = document.querySelector('canvas') as HTMLCanvasElement;
      if (gameCanvas) {
        const photoData = gameCanvas.toDataURL('image/jpeg', 0.92);
        const newPhoto: CapturedPhoto = {
          id: `photo_${Date.now()}`,
          dataUrl: photoData,
          timestamp: currentTimeStr,
          locationName: player ? `X: ${Math.round(player.x)} Y: ${Math.round(player.y)}` : 'Степной Край'
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
      { name: 'Автосервис PIT-STOP', x: 2500, y: 3500, desc: 'Ремонт, шиномонтаж, запчасти', icon: Wrench, color: 'text-cyan-400' },
      { name: 'АЗС «Транзит-Степь»', x: 5160, y: 5160, desc: 'Бензин АИ-92/95/ДТ, подкачка шин', icon: Zap, color: 'text-amber-400' },
      { name: 'Автосалон «Степь Моторс»', x: 252, y: 5916, desc: 'Продажа и тест-драйв автомобилей', icon: Car, color: 'text-emerald-400' },
      { name: 'Городская Больница №1', x: 1800, y: 2200, desc: 'Медицинская помощь и аптека', icon: Ambulance, color: 'text-rose-400' }
    ];

    return pois.map(poi => {
      const dx = poi.x - player.x;
      const dy = poi.y - player.y;
      const dist = Math.round(Math.sqrt(dx * dx + dy * dy));
      return { ...poi, distance: dist };
    }).sort((a, b) => a.distance - b.distance);
  };

  // Real Weather Icon & Name
  const getWeatherInfo = () => {
    const w = world?.weather || 'clear';
    const tempVal = Math.round(world ? getOutsideTemperature(world) : 20);
    const tempStr = `${tempVal >= 0 ? '+' : ''}${tempVal}°C`;
    switch (w) {
      case 'storm':
        return { icon: CloudLightning, label: 'Грозовой Шторм', temp: tempStr, color: 'text-amber-400' };
      case 'rain':
        return { icon: CloudRain, label: 'Дождь', temp: tempStr, color: 'text-blue-400' };
      case 'fog':
        return { icon: CloudFog, label: 'Густой Туман', temp: tempStr, color: 'text-slate-300' };
      default:
        return { icon: Sun, label: 'Ясно • Солнечно', temp: tempStr, color: 'text-amber-300' };
    }
  };

  const weather = getWeatherInfo();
  const WeatherIcon = weather.icon;
  const poiList = getPOIDistances();

  return (
    <div
      id="phone-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 select-none animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Phone Body Container */}
      <div
        id="phone-chassis"
        className="relative flex flex-col items-center justify-between rounded-[48px] shadow-2xl p-3 sm:p-4 transition-transform duration-300"
        style={{
          width: '380px',
          maxWidth: '96vw',
          height: '740px',
          maxHeight: '92vh',
          backgroundColor: specs.colorHex || '#1e2022',
          border: `4px solid ${specs.accentHex || '#64748b'}`,
          boxShadow: `0 25px 60px -15px rgba(0,0,0,0.8), 0 0 30px ${specs.accentHex}33`
        }}
      >
        {/* Hardware side button accents (Power & Volume) */}
        <div
          className="absolute -right-1.5 top-28 w-1 h-14 rounded-r-sm"
          style={{ backgroundColor: specs.accentHex }}
        />
        <div
          className="absolute -left-1.5 top-24 w-1 h-10 rounded-l-sm"
          style={{ backgroundColor: specs.accentHex }}
        />
        <div
          className="absolute -left-1.5 top-36 w-1 h-10 rounded-l-sm"
          style={{ backgroundColor: specs.accentHex }}
        />

        {/* Outer Bezel Rim */}
        <div className="relative w-full h-full rounded-[38px] bg-black p-2 flex flex-col overflow-hidden shadow-inner border border-white/10">
          {/* AMOLED Screen Canvas */}
          <div
            id="phone-screen"
            className="relative w-full h-full rounded-[30px] flex flex-col overflow-hidden text-white transition-all duration-300"
            style={{
              background: activeApp === 'home' || activeApp === 'settings' ? selectedWallpaper : '#090a0f'
            }}
          >
            {/* Top Status Bar with Dynamic Island / Punch Hole */}
            <div className="relative z-30 flex items-center justify-between px-6 pt-3 pb-1.5 text-xs font-semibold tracking-tight text-white/90">
              {/* Clock */}
              <span className="text-[13px] font-medium tracking-wide">{currentTimeStr}</span>

              {/* Dynamic Island / Camera Notch */}
              <div
                id="phone-dynamic-island"
                onClick={() => {
                  sound.click();
                  setIslandExpanded(!islandExpanded);
                }}
                className={`flex items-center justify-center transition-all duration-300 cursor-pointer bg-black text-white ${
                  islandExpanded
                    ? 'w-48 h-8 rounded-full px-3 shadow-lg border border-white/20 gap-2'
                    : specs.modelName.includes('Cyber')
                    ? 'w-24 h-5 rounded-md px-2 border-t-2 border-cyan-400 gap-1'
                    : 'w-24 h-5 rounded-full px-2 gap-1.5'
                }`}
              >
                {islandExpanded ? (
                  <div className="flex items-center justify-between w-full text-[10px]">
                    <span className="flex items-center gap-1 text-emerald-400 font-medium">
                      <Sparkles className="w-3 h-3 animate-spin" /> {specs.modelName}
                    </span>
                    <span className="text-white/70 text-[9px]">{specs.cpuModel.split(' ')[0]}</span>
                  </div>
                ) : (
                  <>
                    <div className="w-2 h-2 rounded-full bg-blue-900 ring-1 ring-blue-500/50 flex items-center justify-center">
                      <div className="w-0.5 h-0.5 rounded-full bg-blue-400" />
                    </div>
                    {specs.modelName.includes('Aura') && (
                      <div className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
                    )}
                  </>
                )}
              </div>

              {/* Status Icons */}
              <div className="flex items-center gap-1.5 text-white/80">
                <span className="text-[9px] font-bold text-emerald-400">5G</span>
                <Signal className="w-3.5 h-3.5" />
                <Wifi className="w-3.5 h-3.5" />
                <div className="flex items-center gap-0.5">
                  <span className="text-[11px] font-medium">{batteryLevel}%</span>
                  {player?.isInVehicle ? (
                    <BatteryCharging className="w-4 h-4 text-emerald-400 fill-emerald-400/30" />
                  ) : (
                    <Battery className={`w-4 h-4 ${batteryLevel < 20 ? 'text-rose-500' : 'text-emerald-400'}`} />
                  )}
                </div>
              </div>
            </div>

            {/* Main Application Area */}
            <div className="relative flex-1 flex flex-col overflow-hidden">
              {/* HOME SCREEN */}
              {activeApp === 'home' && (
                <div className="flex-1 flex flex-col justify-between p-4 pb-2 animate-in fade-in duration-200">
                  {/* Weather & Clock Widget */}
                  <div className="mt-4 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 shadow-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-3xl font-light tracking-tight">{currentTimeStr}</div>
                        <div className="text-xs text-white/80 font-medium mt-0.5 flex items-center gap-1">
                          <WeatherIcon className={`w-3.5 h-3.5 ${weather.color}`} />
                          <span>{weather.label}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-semibold text-amber-300">{weather.temp}</div>
                        <div className="text-[10px] text-white/60">
                          {player?.isInVehicle ? 'Зарядка от авто' : 'Степной район'}
                        </div>
                      </div>
                    </div>

                    {/* Quick Specs Pill */}
                    <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px] text-white/80">
                      <span className="font-medium text-cyan-300">{specs.modelName}</span>
                      <span className="text-white/60">{specs.storageGb} ГБ • {specs.ramGb} ГБ RAM</span>
                    </div>
                  </div>

                  {/* App Grid */}
                  <div className="grid grid-cols-4 gap-y-5 gap-x-2 my-auto px-1">
                    {/* Характеристики */}
                    <button
                      id="app-specs"
                      onClick={() => handleAppOpen('specs')}
                      className="flex flex-col items-center gap-1.5 group"
                    >
                      <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-500 p-3 shadow-md group-hover:scale-105 transition-transform flex items-center justify-center">
                        <Cpu className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-[11px] font-medium text-white/90 drop-shadow">Система</span>
                    </button>

                    {/* Сообщения */}
                    <button
                      id="app-messages"
                      onClick={() => handleAppOpen('messages')}
                      className="flex flex-col items-center gap-1.5 group relative"
                    >
                      <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-3 shadow-md group-hover:scale-105 transition-transform flex items-center justify-center">
                        <MessageSquare className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-[11px] font-medium text-white/90 drop-shadow">Службы</span>
                      <span className="absolute top-0 right-3 w-4 h-4 bg-emerald-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center ring-2 ring-black">
                        {contacts.length}
                      </span>
                    </button>

                    {/* GPS Навигатор */}
                    <button
                      id="app-gps"
                      onClick={() => handleAppOpen('gps')}
                      className="flex flex-col items-center gap-1.5 group"
                    >
                      <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-rose-600 to-pink-500 p-3 shadow-md group-hover:scale-105 transition-transform flex items-center justify-center">
                        <Compass className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-[11px] font-medium text-white/90 drop-shadow">Навигатор</span>
                    </button>

                    {/* Камера */}
                    <button
                      id="app-camera"
                      onClick={() => handleAppOpen('camera')}
                      className="flex flex-col items-center gap-1.5 group"
                    >
                      <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 p-3 shadow-md group-hover:scale-105 transition-transform flex items-center justify-center">
                        <Camera className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-[11px] font-medium text-white/90 drop-shadow">Камера</span>
                    </button>

                    {/* Заметки */}
                    <button
                      id="app-notes"
                      onClick={() => handleAppOpen('notes')}
                      className="flex flex-col items-center gap-1.5 group"
                    >
                      <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 p-3 shadow-md group-hover:scale-105 transition-transform flex items-center justify-center">
                        <FileText className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-[11px] font-medium text-white/90 drop-shadow">Блокнот</span>
                    </button>

                    {/* Фонарик (Реальный игровой источник света) */}
                    <button
                      id="app-flashlight"
                      onClick={toggleTorch}
                      className="flex flex-col items-center gap-1.5 group"
                    >
                      <div
                        className={`w-13 h-13 rounded-2xl p-3 shadow-md group-hover:scale-105 transition-transform flex items-center justify-center ${
                          flashlightOn
                            ? 'bg-amber-400 text-black shadow-amber-400/50 shadow-lg ring-2 ring-amber-300'
                            : 'bg-white/20 text-white backdrop-blur-md'
                        }`}
                      >
                        <Flashlight className="w-6 h-6" />
                      </div>
                      <span className="text-[11px] font-medium text-white/90 drop-shadow">
                        {flashlightOn ? 'Фонарь: ВКЛ' : 'Фонарик'}
                      </span>
                    </button>

                    {/* Настройки */}
                    <button
                      id="app-settings"
                      onClick={() => handleAppOpen('settings')}
                      className="flex flex-col items-center gap-1.5 group"
                    >
                      <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-slate-600 to-zinc-500 p-3 shadow-md group-hover:scale-105 transition-transform flex items-center justify-center">
                        <Settings className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-[11px] font-medium text-white/90 drop-shadow">Опции</span>
                    </button>
                  </div>

                  {/* Dock / Fixed Bottom Bar */}
                  <div className="bg-white/15 backdrop-blur-xl rounded-3xl p-2.5 flex justify-around items-center border border-white/15 shadow-xl mb-1">
                    <button
                      onClick={() => handleAppOpen('messages')}
                      className="p-2.5 rounded-2xl bg-emerald-500 text-white shadow-md active:scale-95"
                      title="Экстренные службы"
                    >
                      <PhoneIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleAppOpen('gps')}
                      className="p-2.5 rounded-2xl bg-rose-500 text-white shadow-md active:scale-95"
                      title="GPS Навигатор"
                    >
                      <Compass className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleAppOpen('camera')}
                      className="p-2.5 rounded-2xl bg-zinc-700 text-white shadow-md active:scale-95"
                      title="Камера"
                    >
                      <Camera className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleAppOpen('settings')}
                      className="p-2.5 rounded-2xl bg-slate-700 text-white shadow-md active:scale-95"
                      title="Настройки"
                    >
                      <Settings className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}

              {/* HARDWARE SPECS APP */}
              {activeApp === 'specs' && (
                <div className="flex-1 flex flex-col bg-zinc-950 p-4 overflow-y-auto animate-in fade-in duration-150">
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-4 pb-2 border-b border-zinc-800">
                    <button onClick={handleBack} className="p-1 text-cyan-400 hover:text-cyan-300">
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div className="flex-1">
                      <h2 className="text-base font-bold text-white flex items-center gap-1.5">
                        <Smartphone className="w-4 h-4 text-cyan-400" />
                        {specs.modelName}
                      </h2>
                      <p className="text-[11px] text-zinc-400">Характеристики устройства</p>
                    </div>
                  </div>

                  {/* Color Finish Card */}
                  <div className="bg-zinc-900 rounded-2xl p-3.5 mb-3 border border-zinc-800 flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl shadow-inner border border-white/20 flex-shrink-0"
                      style={{ backgroundColor: specs.colorHex }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-zinc-400">Цвет и исполнение корпуса</div>
                      <div className="text-sm font-semibold text-white truncate">{specs.colorNameRu}</div>
                      <div className="text-[10px] text-zinc-500">{specs.brand} • {specs.seriesName}</div>
                    </div>
                  </div>

                  {/* Core Hardware Metrics Grid */}
                  <div className="grid grid-cols-2 gap-2.5 mb-3">
                    {/* CPU */}
                    <div className="bg-zinc-900 rounded-2xl p-3 border border-zinc-800 flex flex-col justify-between">
                      <div className="flex items-center gap-1.5 text-cyan-400 text-xs font-semibold mb-1">
                        <Cpu className="w-4 h-4" /> Процессор
                      </div>
                      <div className="text-sm font-bold text-white leading-tight">{specs.cpuModel}</div>
                      <div className="text-[10px] text-zinc-400 mt-1">
                        {specs.cpuCores} ядер • {specs.cpuFrequencyGhz} ГГц
                      </div>
                    </div>

                    {/* RAM */}
                    <div className="bg-zinc-900 rounded-2xl p-3 border border-zinc-800 flex flex-col justify-between">
                      <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold mb-1">
                        <Layers className="w-4 h-4" /> Оперативная память
                      </div>
                      <div className="text-sm font-bold text-white">{specs.ramGb} ГБ LPDDR5X</div>
                      <div className="w-full bg-zinc-800 rounded-full h-1.5 mt-2 overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full w-2/5" />
                      </div>
                      <div className="text-[10px] text-zinc-400 mt-1">Занято: 3.8 / {specs.ramGb} ГБ</div>
                    </div>

                    {/* Storage */}
                    <div className="bg-zinc-900 rounded-2xl p-3 border border-zinc-800 flex flex-col justify-between">
                      <div className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold mb-1">
                        <HardDrive className="w-4 h-4" /> Накопитель
                      </div>
                      <div className="text-sm font-bold text-white">{specs.storageGb} ГБ UFS 4.0</div>
                      <div className="w-full bg-zinc-800 rounded-full h-1.5 mt-2 overflow-hidden">
                        <div className="bg-amber-500 h-full rounded-full w-1/4" />
                      </div>
                      <div className="text-[10px] text-zinc-400 mt-1">Свободно: {Math.round(specs.storageGb * 0.75)} ГБ</div>
                    </div>

                    {/* Battery */}
                    <div className="bg-zinc-900 rounded-2xl p-3 border border-zinc-800 flex flex-col justify-between">
                      <div className="flex items-center gap-1.5 text-rose-400 text-xs font-semibold mb-1">
                        <Zap className="w-4 h-4" /> Аккумулятор
                      </div>
                      <div className="text-sm font-bold text-white">{specs.batteryCapacityMah} мА·ч</div>
                      <div className="text-[10px] text-zinc-400 mt-1">
                        {player?.isInVehicle ? 'Заряжается в машине' : `Уровень: ${batteryLevel}%`}
                      </div>
                    </div>
                  </div>

                  {/* Display & Camera Details */}
                  <div className="bg-zinc-900 rounded-2xl p-3.5 mb-3 border border-zinc-800 space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-zinc-800/60">
                      <span className="text-zinc-400">Экран</span>
                      <span className="text-white font-medium">{specs.screenSizeInches || 6.7}" AMOLED HDR</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-zinc-800/60">
                      <span className="text-zinc-400">Камера</span>
                      <span className="text-white font-medium">{specs.cameraSpecs || '48 MP Fusion'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-zinc-800/60">
                      <span className="text-zinc-400">Операционная система</span>
                      <span className="text-cyan-400 font-medium">{specs.osName || 'AuraOS'}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-zinc-400">Защита корпуса</span>
                      <span className="text-emerald-400 font-medium flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" /> IP68 Водонепроницаемый
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* MESSAGES & SERVICES APP */}
              {activeApp === 'messages' && (
                <div className="flex-1 flex flex-col bg-zinc-950 animate-in fade-in duration-150 overflow-hidden">
                  {/* Chat Header */}
                  <div className="flex items-center gap-2 p-3 bg-zinc-900 border-b border-zinc-800">
                    <button onClick={handleBack} className="p-1 text-emerald-400 hover:text-emerald-300">
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    {selectedContact ? (
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm text-white border border-white/20"
                          style={{ backgroundColor: selectedContact.avatarColor }}
                        >
                          {selectedContact.nameRu[0]}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-white truncate">{selectedContact.nameRu}</div>
                          <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            {selectedContact.role}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1">
                        <h2 className="text-sm font-bold text-white">Экстренные службы и чат</h2>
                        <p className="text-[10px] text-zinc-400">Диспетчеры и горячие линии</p>
                      </div>
                    )}
                  </div>

                  {/* Chat Content */}
                  {selectedContact ? (
                    <div className="flex-1 flex flex-col overflow-hidden">
                      {/* Message History */}
                      <div className="flex-1 p-3 overflow-y-auto space-y-2.5">
                        {messages
                          .filter(m => m.contactId === selectedContact.id)
                          .map((m) => (
                            <div
                              key={m.id}
                              className={`flex flex-col max-w-[85%] ${
                                m.sender === 'player' ? 'ml-auto items-end' : 'mr-auto items-start'
                              }`}
                            >
                              <div
                                className={`rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                                  m.sender === 'player'
                                    ? 'bg-emerald-600 text-white rounded-tr-xs'
                                    : 'bg-zinc-800 text-zinc-200 rounded-tl-xs border border-zinc-700/50'
                                }`}
                              >
                                {m.text}
                              </div>
                              <span className="text-[9px] text-zinc-500 mt-0.5 px-1">{m.timestamp}</span>
                            </div>
                          ))}
                      </div>

                      {/* Reply Input Bar */}
                      <div className="p-2.5 bg-zinc-900 border-t border-zinc-800 flex items-center gap-2">
                        <input
                          id="chat-reply-input"
                          type="text"
                          value={replyInput}
                          onChange={(e) => setReplyInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                          placeholder="Написать диспетчеру..."
                          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-full px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                        />
                        <button
                          id="chat-reply-send-btn"
                          onClick={handleSendMessage}
                          className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-400 active:scale-95 transition-transform"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Contact List */
                    <div className="flex-1 p-2 overflow-y-auto divide-y divide-zinc-900">
                      {contacts.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => {
                            sound.click();
                            setSelectedContact(c);
                          }}
                          className="flex items-center gap-3 p-3 rounded-2xl hover:bg-zinc-900 cursor-pointer transition-colors"
                        >
                          <div
                            className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center font-bold text-sm text-white shrink-0"
                            style={{ backgroundColor: c.avatarColor }}
                          >
                            {c.nameRu[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-bold text-white truncate">{c.nameRu}</span>
                              <span className="text-[10px] text-zinc-500">{currentTimeStr}</span>
                            </div>
                            <div className="text-[11px] text-zinc-400 truncate">{c.role}</div>
                            <div className="text-[10px] text-emerald-400/80 truncate mt-0.5">{c.description}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* CAMERA APPARATUS APP */}
              {activeApp === 'camera' && (
                <div className="flex-1 flex flex-col bg-black relative animate-in fade-in duration-150 select-none">
                  {/* Viewfinder Header */}
                  <div className="absolute top-2 left-0 right-0 z-10 flex justify-between items-center px-4 text-xs text-white/80">
                    <button onClick={handleBack} className="p-1 bg-black/40 rounded-full backdrop-blur-md">
                      <ChevronLeft className="w-5 h-5 text-white" />
                    </button>
                    <div className="px-2 py-0.5 bg-black/40 rounded-full text-[10px] font-mono backdrop-blur-md">
                      4K 60FPS • LIVE
                    </div>
                    <div className="text-[10px] font-medium text-amber-300">RAW</div>
                  </div>

                  {/* Real Viewfinder Scene */}
                  {viewingPhoto ? (
                    <div className="flex-1 relative flex flex-col items-center justify-center bg-black p-2">
                      <img
                        src={viewingPhoto.dataUrl}
                        alt="Photo"
                        className="max-h-[75%] max-w-full rounded-lg object-contain shadow-lg"
                      />
                      <div className="mt-2 text-xs text-zinc-300 text-center">
                        <div>{viewingPhoto.timestamp}</div>
                        <div className="text-[10px] text-zinc-500">{viewingPhoto.locationName}</div>
                      </div>
                      <button
                        onClick={() => setViewingPhoto(null)}
                        className="mt-3 px-4 py-1 bg-zinc-800 rounded-full text-xs text-white hover:bg-zinc-700"
                      >
                        Вернуться к камере
                      </button>
                    </div>
                  ) : (
                    <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-zinc-950">
                      {liveCanvasSnapshot ? (
                        <img
                          src={liveCanvasSnapshot}
                          alt="Game Viewfinder"
                          className="absolute inset-0 w-full h-full object-cover opacity-85"
                        />
                      ) : (
                        <div className="text-zinc-500 text-xs">Инициализация видоискателя...</div>
                      )}

                      {/* Viewfinder Grid Lines */}
                      <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-25">
                        <div className="border-r border-b border-white" />
                        <div className="border-r border-b border-white" />
                        <div className="border-b border-white" />
                        <div className="border-r border-b border-white" />
                        <div className="border-r border-b border-white" />
                        <div className="border-b border-white" />
                        <div className="border-r border-b border-white" />
                        <div className="border-r border-b border-white" />
                        <div />
                      </div>

                      {/* Shutter White Flash */}
                      {cameraShutterEffect && (
                        <div className="absolute inset-0 bg-white z-20 animate-out fade-out duration-150" />
                      )}

                      {/* Central Focus Reticle */}
                      <div className="w-16 h-16 border border-amber-300/80 rounded-lg flex items-center justify-center animate-pulse z-10">
                        <div className="w-1 h-1 bg-amber-300 rounded-full" />
                      </div>

                      <div className="absolute bottom-4 text-center text-[10px] text-white/80 bg-black/50 px-2.5 py-1 rounded-full backdrop-blur-sm z-10">
                        {specs.cameraSpecs || '48 MP Fusion'} • X: {player ? Math.round(player.x) : 0} Y: {player ? Math.round(player.y) : 0}
                      </div>
                    </div>
                  )}

                  {/* Zoom Controls */}
                  {!viewingPhoto && (
                    <div className="flex justify-center gap-4 py-1.5 bg-black text-xs">
                      {[0.5, 1, 2, 5].map((z) => (
                        <button
                          key={z}
                          onClick={() => {
                            sound.click();
                            setZoomLevel(z);
                          }}
                          className={`w-7 h-7 rounded-full text-[10px] font-bold flex items-center justify-center transition-all ${
                            zoomLevel === z ? 'bg-amber-400 text-black scale-110' : 'bg-zinc-800 text-white/80'
                          }`}
                        >
                          {z}x
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Shutter & Gallery Bar */}
                  <div className="h-20 bg-black flex items-center justify-around px-8 pb-3">
                    {/* Gallery Thumbnail Preview */}
                    <button
                      onClick={() => {
                        if (capturedPhotos.length > 0) {
                          setViewingPhoto(capturedPhotos[0]);
                        }
                      }}
                      className="w-11 h-11 rounded-xl bg-zinc-800 border border-zinc-700 overflow-hidden flex items-center justify-center active:scale-95 transition-transform"
                    >
                      {capturedPhotos.length > 0 ? (
                        <img
                          src={capturedPhotos[0].dataUrl}
                          alt="Thumbnail"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="w-5 h-5 text-white/40" />
                      )}
                    </button>

                    {/* Big Shutter Trigger */}
                    <button
                      id="camera-shutter-button"
                      onClick={handleCapturePhoto}
                      className="w-15 h-15 rounded-full border-4 border-white p-1 flex items-center justify-center active:scale-95 transition-transform"
                    >
                      <div className="w-full h-full rounded-full bg-white active:bg-zinc-300" />
                    </button>

                    <div className="w-11 h-11" />
                  </div>
                </div>
              )}

              {/* NOTES / SCRATCHPAD APP */}
              {activeApp === 'notes' && (
                <div className="flex-1 flex flex-col bg-zinc-950 p-4 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-zinc-800">
                    <button onClick={handleBack} className="p-1 text-orange-400 hover:text-orange-300">
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div>
                      <h2 className="text-sm font-bold text-white">Заметки и План</h2>
                      <p className="text-[10px] text-zinc-400">Автономная память телефона</p>
                    </div>
                  </div>

                  <textarea
                    id="phone-notes-area"
                    value={notes}
                    onChange={(e) => handleSaveNotes(e.target.value)}
                    placeholder="Напишите здесь важные заметки по выживанию и авто..."
                    className="flex-1 w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-3.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500 resize-none font-mono leading-relaxed"
                  />
                  <div className="text-[10px] text-zinc-500 mt-2 text-right">
                    Символов: {notes.length} • Сохранено локально
                  </div>
                </div>
              )}

              {/* GPS NAVIGATOR APP */}
              {activeApp === 'gps' && (
                <div className="flex-1 flex flex-col bg-zinc-950 p-4 overflow-y-auto animate-in fade-in duration-150">
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-zinc-800">
                    <button onClick={handleBack} className="p-1 text-rose-400 hover:text-rose-300">
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div>
                      <h2 className="text-sm font-bold text-white">Спутниковая Навигация</h2>
                      <p className="text-[10px] text-zinc-400">GPS / ГЛОНАСС • Реальное положение</p>
                    </div>
                  </div>

                  {/* Real Coordinates & Zone Card */}
                  <div className="bg-zinc-900 rounded-2xl p-3.5 mb-3 border border-zinc-800">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="text-zinc-400 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400" /> Координаты игрока
                      </span>
                      <span className="text-emerald-400 font-mono font-bold">
                        X: {player ? Math.round(player.x) : 0} • Y: {player ? Math.round(player.y) : 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400 flex items-center gap-1">
                        <Navigation className="w-3.5 h-3.5 text-rose-400" /> Азимут движения
                      </span>
                      <span className="text-rose-400 font-semibold font-mono">
                        {player ? `${Math.round(((player.angle * 180) / Math.PI + 360) % 360)}°` : '0°'}
                      </span>
                    </div>
                  </div>

                  {/* Real Dynamic POI List calculated from world */}
                  <div className="bg-zinc-900 rounded-2xl p-3.5 border border-zinc-800 text-xs space-y-2.5">
                    <div className="font-semibold text-white flex items-center justify-between">
                      <span>Ключевые точки карты</span>
                      <span className="text-[10px] text-zinc-500 font-normal">По удалению</span>
                    </div>
                    {poiList.map((poi, idx) => {
                      const Icon = poi.icon;
                      return (
                        <div key={idx} className="flex items-center justify-between py-1.5 border-b border-zinc-800/60 last:border-0">
                          <div className="flex items-center gap-2">
                            <Icon className={`w-4 h-4 ${poi.color}`} />
                            <div>
                              <div className="text-white font-medium">{poi.name}</div>
                              <div className="text-[10px] text-zinc-400">{poi.desc}</div>
                            </div>
                          </div>
                          <span className="text-cyan-400 font-mono font-bold text-[11px] shrink-0 ml-2">
                            {poi.distance > 1000 ? `${(poi.distance / 1000).toFixed(1)} км` : `${poi.distance} м`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SETTINGS APP */}
              {activeApp === 'settings' && (
                <div className="flex-1 flex flex-col bg-zinc-950 p-4 overflow-y-auto animate-in fade-in duration-150">
                  <div className="flex items-center gap-2 mb-4 pb-2 border-b border-zinc-800">
                    <button onClick={handleBack} className="p-1 text-slate-400 hover:text-slate-300">
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div>
                      <h2 className="text-sm font-bold text-white">Настройки телефона</h2>
                      <p className="text-[10px] text-zinc-400">Персонализация и система</p>
                    </div>
                  </div>

                  {/* Wallpaper Picker */}
                  <div className="bg-zinc-900 rounded-2xl p-3.5 mb-3 border border-zinc-800">
                    <div className="text-xs font-semibold text-white mb-2">Обои рабочего стола</div>
                    <div className="grid grid-cols-5 gap-2">
                      {PHONE_WALLPAPERS.map((wp) => (
                        <button
                          key={wp.id}
                          onClick={() => {
                            sound.click();
                            setSelectedWallpaper(wp.cssBackground);
                          }}
                          className={`h-14 rounded-xl border-2 transition-transform ${
                            selectedWallpaper === wp.cssBackground
                              ? 'border-cyan-400 scale-105 shadow-md'
                              : 'border-transparent'
                          }`}
                          style={{ background: wp.cssBackground }}
                          title={wp.nameRu}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Quick Toggles */}
                  <div className="bg-zinc-900 rounded-2xl p-3.5 border border-zinc-800 text-xs space-y-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-white font-medium">Звуки и вибрация</div>
                        <div className="text-[10px] text-zinc-400">Акустический отклик кнопок</div>
                      </div>
                      <div className="w-10 h-6 bg-emerald-500 rounded-full p-0.5 flex justify-end">
                        <div className="w-5 h-5 bg-white rounded-full shadow" />
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-zinc-800">
                      <div>
                        <div className="text-white font-medium">Частота обновления</div>
                        <div className="text-[10px] text-zinc-400">Плавность 120 Гц ProMotion</div>
                      </div>
                      <span className="text-cyan-400 font-bold">120 Hz</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Home Indicator Gesture Bar */}
            <div className="relative z-30 h-6 flex items-center justify-center">
              <button
                id="phone-home-gesture-bar"
                onClick={() => {
                  sound.click();
                  setActiveApp('home');
                  setSelectedContact(null);
                  setViewingPhoto(null);
                }}
                className="w-32 h-1 bg-white/70 hover:bg-white rounded-full active:scale-95 transition-all"
                title="На главный экран"
              />
            </div>
          </div>
        </div>

        {/* Outer Top Power / Close Button */}
        <button
          id="phone-power-off-btn"
          onClick={onClose}
          className="absolute -top-3.5 right-6 bg-zinc-800 hover:bg-red-600 text-white rounded-full p-1.5 shadow-lg border border-zinc-600 transition-colors"
          title="Заблокировать и спрятать телефон"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
