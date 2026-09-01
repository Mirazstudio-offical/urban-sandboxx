import React, { useState } from 'react';
import { 
  Play, 
  Settings, 
  Save, 
  PlusCircle, 
  X, 
  ChevronRight, 
  Volume2, 
  VolumeX, 
  HardDrive, 
  Trash2, 
  Gamepad2,
  Check, 
  Info,
  Layers,
  Compass,
  MapPin,
  Edit3
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
  gpsDestination?: any;
  needs?: any;
  inventory?: any;
}

interface MainMenuProps {
  onResume: () => void;
  onNewGame: () => void;
  saves: SaveSlot[];
  onLoadSave: (id: string) => void;
  onDeleteSave: (id: string) => void;
  onCreateSave: (name?: string) => void;
  
  // Settings
  isMuted: boolean;
  onToggleMute: () => void;
}

type MenuState = 'main' | 'saves' | 'create_save' | 'settings' | 'controls';

export const MainMenu: React.FC<MainMenuProps> = ({ 
  onResume, 
  onNewGame, 
  saves, 
  onLoadSave, 
  onDeleteSave, 
  onCreateSave,
  isMuted,
  onToggleMute
}) => {
  const [activeScreen, setActiveScreen] = useState<MenuState>('main');
  const [customSaveName, setCustomSaveName] = useState<string>('');
  const [showSavedFeedback, setShowSavedFeedback] = useState<boolean>(false);

  // Quick helper to check if an autosave or save exists
  const hasSave = saves.length > 0;

  const handleCreateSaveClick = (e: React.FormEvent) => {
    e.preventDefault();
    const nameToSave = customSaveName.trim() || undefined;
    onCreateSave(nameToSave);
    setCustomSaveName('');
    setShowSavedFeedback(true);
    setTimeout(() => {
      setShowSavedFeedback(false);
      setActiveScreen('main');
    }, 1500);
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md text-slate-100 font-sans select-none animate-in fade-in duration-300">
      
      {/* Decorative Warm Sunset Background Flare */}
      <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-900/90 to-amber-950/20 pointer-events-none z-0" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none z-0" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none z-0" />

      {/* Main Container Card */}
      <div className="relative z-10 w-full max-w-lg bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl flex flex-col p-8 md:p-10 transition-all">
        
        {/* Game Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-400 text-xs font-bold tracking-widest uppercase mb-3">
            <Compass className="w-3.5 h-3.5" /> Симулятор Вождения
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-1.5 bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-200">
            NEON CITY
          </h1>
          <p className="text-xs text-slate-400 tracking-wider">
            Двумерный живой мегаполис и физика автомобилей
          </p>
        </div>

        {/* Screen: Main Menu Options */}
        {activeScreen === 'main' && (
          <div className="flex flex-col gap-3 flex-1">
            
            {/* Resume button */}
            <button
              onClick={onResume}
              className="group flex items-center gap-4 px-5 py-4 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 rounded-xl transition-all active:scale-[0.99]"
            >
              <Play className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
              <div className="text-left">
                <div className="font-bold text-slate-100">Продолжить игру</div>
                <div className="text-[11px] text-slate-400">Вернуться в текущую сессию города</div>
              </div>
              <ChevronRight className="w-4 h-4 ml-auto text-slate-500 group-hover:text-white transition-colors" />
            </button>

            {/* Saves list screen button */}
            <button
              onClick={() => setActiveScreen('saves')}
              className="group flex items-center gap-4 px-5 py-4 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 rounded-xl transition-all active:scale-[0.99]"
            >
              <Save className="w-5 h-5 text-sky-400 group-hover:scale-110 transition-transform" />
              <div className="text-left">
                <div className="font-bold text-slate-100">Загрузить сохранение</div>
                <div className="text-[11px] text-slate-400">
                  {hasSave ? `Доступно сохранений: ${saves.length}` : 'Сохранений нет'}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 ml-auto text-slate-500 group-hover:text-white transition-colors" />
            </button>

            {/* Create manual save */}
            <button
              onClick={() => setActiveScreen('create_save')}
              className="group flex items-center gap-4 px-5 py-4 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 rounded-xl transition-all active:scale-[0.99]"
            >
              <PlusCircle className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
              <div className="text-left">
                <div className="font-bold text-slate-100">Создать новое сохранение</div>
                <div className="text-[11px] text-slate-400">Зафиксировать текущие координаты и состояние</div>
              </div>
              <ChevronRight className="w-4 h-4 ml-auto text-slate-500 group-hover:text-white transition-colors" />
            </button>

            {/* New Game trigger */}
            <button
              onClick={onNewGame}
              className="group flex items-center gap-4 px-5 py-4 bg-slate-800/40 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 rounded-xl transition-all active:scale-[0.99]"
            >
              <PlusCircle className="w-5 h-5 text-indigo-400" />
              <div className="text-left">
                <div className="font-bold text-slate-300 group-hover:text-white">Начать заново</div>
                <div className="text-[11px] text-slate-500 group-hover:text-slate-400">Сбросить позицию и начать с Центрального Парка</div>
              </div>
              <ChevronRight className="w-4 h-4 ml-auto text-slate-600 group-hover:text-white transition-colors" />
            </button>

            {/* Map Editor Launch */}
            <a
              href="/editor.html"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-4 px-5 py-3.5 bg-gradient-to-r from-sky-950/40 to-slate-800/60 hover:from-sky-900/60 hover:to-slate-800 border border-sky-800/40 hover:border-sky-500/60 rounded-xl transition-all active:scale-[0.99]"
            >
              <Edit3 className="w-5 h-5 text-sky-400 group-hover:scale-110 transition-transform" />
              <div className="text-left">
                <div className="font-bold text-sky-200 group-hover:text-white flex items-center gap-2">
                  Редактор карты города <span className="text-[9px] bg-sky-500/20 text-sky-300 px-1.5 py-0.5 rounded uppercase font-extrabold tracking-wider">PRO</span>
                </div>
                <div className="text-[11px] text-slate-400">Создание дорог, кривых, зданий и расстановка объектов</div>
              </div>
              <ChevronRight className="w-4 h-4 ml-auto text-sky-500 group-hover:text-white transition-colors" />
            </a>

            {/* Split row for Settings and Controls */}
            <div className="grid grid-cols-2 gap-3 mt-2">
              <button
                onClick={() => setActiveScreen('settings')}
                className="flex items-center justify-center gap-2 py-3 bg-slate-800/40 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 rounded-xl font-bold text-xs tracking-wider uppercase transition-colors text-slate-300 hover:text-white"
              >
                <Settings className="w-4 h-4" /> Настройки
              </button>
              <button
                onClick={() => setActiveScreen('controls')}
                className="flex items-center justify-center gap-2 py-3 bg-slate-800/40 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 rounded-xl font-bold text-xs tracking-wider uppercase transition-colors text-slate-300 hover:text-white"
              >
                <Gamepad2 className="w-4 h-4" /> Управление
              </button>
            </div>
          </div>
        )}

        {/* Screen: Real Saves Loader */}
        {activeScreen === 'saves' && (
          <div className="flex flex-col flex-1 animate-in slide-in-from-right-4 duration-150 h-full">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2.5">
              <Save className="text-sky-400 w-5 h-5" /> Архивы сохранений
            </h2>

            <div className="flex-1 overflow-y-auto max-h-[260px] pr-1 flex flex-col gap-2">
              {!hasSave ? (
                <div className="text-slate-500 text-xs italic text-center py-10 flex flex-col items-center justify-center gap-2">
                  <Info className="w-8 h-8 text-slate-700" />
                  У вас пока нет сохраненных файлов сессий.
                  <span className="text-[10px] mt-1 text-slate-600">Сохраните игру из меню или катайтесь для автосохранения.</span>
                </div>
              ) : (
                saves.map((save) => (
                  <div key={save.id} className="group bg-slate-800/60 hover:bg-slate-800 border border-slate-800 hover:border-slate-750 rounded-xl p-3.5 flex flex-col gap-2 transition-all">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-sm text-slate-200 group-hover:text-white transition-colors">
                          {save.name}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                          <HardDrive className="w-3 h-3 text-slate-500" /> {save.date}
                        </div>
                      </div>
                      <button
                        onClick={() => onDeleteSave(save.id)}
                        className="text-slate-500 hover:text-rose-400 transition-colors p-1 rounded hover:bg-slate-900"
                        title="Удалить сохранение"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1 border-t border-slate-900/60">
                      <span>Координаты: <span className="text-slate-300 font-mono">[{Math.round(save.playerX)}, {Math.round(save.playerY)}]</span></span>
                      <span>Статус: <span className="text-sky-400">{save.isInVehicle ? 'В машине' : 'Пешком'}</span></span>
                    </div>

                    <button
                      onClick={() => onLoadSave(save.id)}
                      className="w-full mt-1.5 py-1.5 bg-sky-600/20 hover:bg-sky-600 border border-sky-600/30 text-sky-200 hover:text-white text-xs font-bold rounded-lg tracking-wider transition-all"
                    >
                      ЗАГРУЗИТЬ
                    </button>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setActiveScreen('main')}
              className="mt-6 w-full py-2.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 font-bold text-xs tracking-wider uppercase rounded-xl transition-all"
            >
              Назад в меню
            </button>
          </div>
        )}

        {/* Screen: Create Custom Save */}
        {activeScreen === 'create_save' && (
          <div className="flex flex-col flex-1 animate-in slide-in-from-right-4 duration-150">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2.5">
              <PlusCircle className="text-amber-400 w-5 h-5" /> Создать сохранение
            </h2>

            {showSavedFeedback ? (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-6 text-center text-emerald-400 flex flex-col items-center justify-center gap-2 py-10">
                <Check className="w-8 h-8" />
                <span className="font-bold text-sm">Успешно сохранено!</span>
                <span className="text-xs text-slate-400">Запись добавлена в архивы.</span>
              </div>
            ) : (
              <form onSubmit={handleCreateSaveClick} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Название записи
                  </label>
                  <input
                    type="text"
                    placeholder="Например: Моя парковка, У фонтана"
                    value={customSaveName}
                    onChange={(e) => setCustomSaveName(e.target.value)}
                    maxLength={32}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 text-sm placeholder:text-slate-600 outline-none focus:border-amber-500 transition-colors"
                  />
                  <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">
                    Если оставить пустым, игра подставит название вашей текущей улицы в городе.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setActiveScreen('main')}
                    className="py-2.5 bg-slate-800 border border-slate-700 hover:bg-slate-750 text-slate-400 text-xs font-bold tracking-wider uppercase rounded-xl transition-all"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black tracking-wider uppercase rounded-xl shadow-lg hover:shadow-amber-500/10 transition-all"
                  >
                    Подтвердить
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Screen: Settings */}
        {activeScreen === 'settings' && (
          <div className="flex flex-col flex-1 animate-in slide-in-from-right-4 duration-150">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2.5">
              <Settings className="text-indigo-400 w-5 h-5" /> Параметры игры
            </h2>

            <div className="space-y-4">
              {/* Sound Option */}
              <div className="flex items-center justify-between bg-slate-800/40 border border-slate-800 p-4 rounded-xl">
                <div>
                  <div className="text-sm font-bold text-slate-200">Звуковые эффекты</div>
                  <div className="text-[10px] text-slate-500">Двигатели машин, дрифт и сирены</div>
                </div>
                <button
                  onClick={onToggleMute}
                  className={`flex items-center justify-center p-2 rounded-lg border transition-all ${
                    isMuted 
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' 
                      : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  }`}
                >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
              </div>

              {/* Game Mode Info */}
              <div className="bg-slate-800/20 border border-slate-800 p-4 rounded-xl">
                <div className="flex items-start gap-3">
                  <Layers className="w-5 h-5 text-indigo-400 pt-0.5" />
                  <div>
                    <div className="text-sm font-bold text-slate-300">Состояние мира</div>
                    <div className="text-xs text-slate-500 leading-relaxed mt-1">
                      Размер и плотность симуляции заданы параметрами движка. Чтобы зафиксировать прогресс, используйте кнопки ручного сохранения.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setActiveScreen('main')}
              className="mt-6 w-full py-2.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 font-bold text-xs tracking-wider uppercase rounded-xl transition-all"
            >
              Назад
            </button>
          </div>
        )}

        {/* Screen: Key Controls Guide */}
        {activeScreen === 'controls' && (
          <div className="flex flex-col flex-1 animate-in slide-in-from-right-4 duration-150">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2.5">
              <Gamepad2 className="text-emerald-400 w-5 h-5" /> Управление симулятором
            </h2>

            <div className="grid grid-cols-2 gap-3 text-xs max-h-[250px] overflow-y-auto pr-1">
              <div className="bg-slate-850 border border-slate-800 p-2.5 rounded-lg flex flex-col">
                <span className="font-bold text-slate-200">WASD / Стрелки</span>
                <span className="text-[10px] text-slate-500 mt-1">Езда на машине / Ходьба персонажем</span>
              </div>
              <div className="bg-slate-850 border border-slate-800 p-2.5 rounded-lg flex flex-col">
                <span className="font-bold text-slate-200">F / Enter</span>
                <span className="text-[10px] text-slate-500 mt-1">Войти в машину или выйти из нее</span>
              </div>
              <div className="bg-slate-850 border border-slate-800 p-2.5 rounded-lg flex flex-col">
                <span className="font-bold text-slate-200">Q / E</span>
                <span className="text-[10px] text-slate-500 mt-1">Левый / Правый поворотники автомобиля</span>
              </div>
              <div className="bg-slate-850 border border-slate-800 p-2.5 rounded-lg flex flex-col">
                <span className="font-bold text-slate-200">Z</span>
                <span className="text-[10px] text-slate-500 mt-1">Включить аварийную сигнализацию</span>
              </div>
              <div className="bg-slate-850 border border-slate-800 p-2.5 rounded-lg flex flex-col">
                <span className="font-bold text-slate-200">L</span>
                <span className="text-[10px] text-slate-500 mt-1">Переключить фары (Ближний/Дальний)</span>
              </div>
              <div className="bg-slate-850 border border-slate-800 p-2.5 rounded-lg flex flex-col">
                <span className="font-bold text-slate-200">Space (Пробел)</span>
                <span className="text-[10px] text-slate-500 mt-1">Ручной тормоз автомобиля для заноса</span>
              </div>
              <div className="bg-slate-850 border border-slate-800 p-2.5 rounded-lg flex flex-col col-span-2">
                <span className="font-bold text-slate-200">Esc (Escape)</span>
                <span className="text-[10px] text-slate-500 mt-1">Открыть или закрыть это Главное меню</span>
              </div>
            </div>

            <button
              onClick={() => setActiveScreen('main')}
              className="mt-6 w-full py-2.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 font-bold text-xs tracking-wider uppercase rounded-xl transition-all"
            >
              Назад
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-[10px] text-slate-600 border-t border-slate-800/50 pt-4">
          Версия 1.1.2 // Нажмите Esc во время игры, чтобы вызвать это меню
        </div>

      </div>

    </div>
  );
};
