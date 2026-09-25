import React from 'react';
import { Player } from '../types';
import { BedSleepState, formatInGameTime } from '../bedSleepSystem';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Moon, 
  Sun, 
  Clock, 
  Sparkles, 
  AlertCircle, 
  Eye, 
  LogOut, 
  Activity
} from 'lucide-react';

interface BedSleepOverlayProps {
  bedState: BedSleepState;
  player: Player;
  timeHour: number;
  onStandUp: () => void;
  onSleep: () => void;
  onWakeUp: () => void;
  onFallBackAsleep: () => void;
}

// Immersive body sensation mappers to replace precise percentage values
const getEnergySensation = (sleepiness: number): string => {
  if (sleepiness >= 85) return 'Глаза слипаются сами собой, сознание затуманивается от предельного истощения.';
  if (sleepiness >= 65) return 'В мышцах нарастает свинцовая тяжесть, веки кажутся невероятно тяжелыми.';
  if (sleepiness >= 40) return 'Приятная усталость растекается по телу, настойчиво хочется закрыть глаза.';
  if (sleepiness >= 15) return 'Чувствуется легкое утомление после активности.';
  return 'Организм полон сил и энергии, сна ни в одном глазу.';
};

const getHungerSensation = (hunger: number): string => {
  if (hunger <= 15) return 'В желудке жгучая пустота, сильные спазмы от острого голода.';
  if (hunger <= 45) return 'Живот пуст и урчит, настойчивое чувство голода мешает сосредоточиться.';
  if (hunger <= 75) return 'Легкое желание перекусить.';
  return 'Вы чувствуете себя сытым и удовлетворенным.';
};

const getThirstSensation = (thirst: number): string => {
  if (thirst <= 15) return 'Рот полностью пересох, язык прилипает к небу от критического обезвоживания.';
  if (thirst <= 45) return 'Горло сильно иссохло, мучает навязчивая жажда.';
  if (thirst <= 75) return 'Хочется сделать пару глотков прохладной воды.';
  return 'Жажда полностью утолена, организм насыщен влагой.';
};

const getBodySensation = (health: number, pain: number = 0): string => {
  if (pain >= 50) return 'Тело сотрясает острая, пульсирующая физическая боль.';
  if (pain >= 15) return 'Ноющие тупые боли в поврежденных участках мешают полностью расслабиться.';
  if (health <= 35) return 'Вы чувствуете себя крайне скверно, тело бьет озноб, силы на исходе.';
  if (health <= 70) return 'Общая слабость, организм нуждается в покое и лечении.';
  return 'Никакой боли или недомогания, дыхание спокойное и глубокое.';
};

// Moving closed-eyes phosphenes neural pattern under eyelids
const ClosedEyesPhosphenes: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* Drifting blurred organic blobs simulating visual sensations in dark sleep */}
      <motion.div
        className="absolute w-96 h-96 rounded-full bg-indigo-950/20 blur-[80px]"
        animate={{
          x: [40, -60, 20, -40, 40],
          y: [-50, 60, -20, 30, -50],
          scale: [1, 1.15, 0.9, 1.05, 1],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{ left: '15%', top: '25%' }}
      />
      <motion.div
        className="absolute w-80 h-80 rounded-full bg-violet-950/15 blur-[90px]"
        animate={{
          x: [-30, 80, -50, 40, -30],
          y: [60, -50, 40, -30, 60],
          scale: [1.1, 0.85, 1.15, 0.95, 1.1],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{ right: '20%', bottom: '30%' }}
      />
    </div>
  );
};

export const BedSleepOverlay: React.FC<BedSleepOverlayProps> = ({
  bedState,
  player,
  timeHour,
  onStandUp,
  onSleep,
  onWakeUp,
  onFallBackAsleep
}) => {
  if (!bedState.isActive) return null;

  const isLying = bedState.phase === 'lying_down';
  const isFalling = bedState.phase === 'falling_asleep';
  const isDeepSleep = bedState.phase === 'deep_sleep';
  const isNightAwake = bedState.phase === 'night_awakening';
  const isWakingUp = bedState.phase === 'waking_up';

  const formattedTime = formatInGameTime(timeHour);
  const isSofa = bedState.furnitureType === 'sofa';

  // Keyboard shortcut listener for seamless physical interaction
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!bedState.isActive) return;
      const code = e.code;

      if (isLying) {
        if (code === 'KeyE') {
          e.preventDefault();
          e.stopPropagation();
          onSleep();
        } else if (code === 'Space') {
          e.preventDefault();
          e.stopPropagation();
          onStandUp();
        }
      } else if (isNightAwake) {
        if (code === 'KeyE') {
          e.preventDefault();
          e.stopPropagation();
          onFallBackAsleep();
        } else if (code === 'Space') {
          e.preventDefault();
          e.stopPropagation();
          onStandUp();
        }
      } else if (isWakingUp) {
        if (code === 'Space') {
          e.preventDefault();
          e.stopPropagation();
          onStandUp();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [bedState.isActive, bedState.phase, onSleep, onStandUp, onFallBackAsleep, isLying, isNightAwake, isWakingUp]);

  return (
    <div 
      id="bed-sleep-container"
      className={`fixed inset-0 z-50 flex items-center justify-center select-none transition-all duration-1000 ${
        isFalling || isDeepSleep
          ? 'bg-zinc-950'
          : isNightAwake
          ? 'bg-zinc-950/95 backdrop-blur-md'
          : isWakingUp
          ? 'bg-gradient-to-t from-zinc-950 via-amber-950/20 to-amber-900/10'
          : 'bg-black/60 backdrop-blur-[2px]'
      }`}
    >
      {/* Heavy Vignette */}
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_120px_rgba(0,0,0,0.9)] z-10" />

      {/* Background phosphenes for closed eyes */}
      {(isFalling || isDeepSleep) && <ClosedEyesPhosphenes />}

      {/* Moon Light Bleed in Night Awakening */}
      {isNightAwake && (
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 bg-radial-gradient from-indigo-500/5 via-transparent to-transparent" style={{ background: 'radial-gradient(circle at 15% 15%, rgba(99, 102, 241, 0.08) 0%, rgba(0, 0, 0, 0) 65%)' }} />
      )}

      {/* Sunrise Light Bleed in Waking Up */}
      {isWakingUp && (
        <div className="absolute top-0 right-0 w-full h-full pointer-events-none z-0 bg-radial-gradient from-amber-500/10 via-transparent to-transparent" style={{ background: 'radial-gradient(circle at 85% 15%, rgba(245, 158, 11, 0.12) 0%, rgba(0, 0, 0, 0) 70%)' }} />
      )}

      <div className="z-20 w-full max-w-md px-4 flex flex-col items-center">
        
        {/* 1. LYING DOWN PHASE (Conscious Rest) */}
        {isLying && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="w-full bg-zinc-900/95 border border-zinc-800 rounded-lg shadow-2xl p-6 text-zinc-100 flex flex-col items-center text-center"
          >
            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-full mb-3 text-indigo-400">
              <Eye className="w-6 h-6" />
            </div>

            <h2 className="text-lg font-bold tracking-tight text-white mb-1">
              {isSofa ? 'Вы прилегли на диван' : 'Вы легли на кровать'}
            </h2>
            <p className="text-xs text-zinc-400 mb-5 leading-relaxed">
              Тело постепенно расслабляется на мягкой поверхности, дыхание выравнивается.
            </p>

            {/* Immersive Sensory Summary */}
            <div className="w-full bg-zinc-950 p-4 rounded border border-zinc-850 mb-5 text-xs text-left space-y-3">
              <div className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider flex items-center gap-1.5 border-b border-zinc-800 pb-1.5">
                <Activity className="w-3.5 h-3.5 text-zinc-400" /> Ощущения тела
              </div>
              <div className="space-y-2.5">
                <p className="text-zinc-300 leading-normal">
                  <span className="font-semibold text-zinc-400">Сонливость:</span> {getEnergySensation(player.needs.sleepiness)}
                </p>
                <p className="text-zinc-300 leading-normal">
                  <span className="font-semibold text-zinc-400">Жажда:</span> {getThirstSensation(player.needs.thirst)}
                </p>
                <p className="text-zinc-300 leading-normal">
                  <span className="font-semibold text-zinc-400">Голод:</span> {getHungerSensation(player.needs.hunger)}
                </p>
                <p className="text-zinc-300 leading-normal">
                  <span className="font-semibold text-zinc-400">Состояние:</span> {getBodySensation(player.needs.health, player.bodyState?.painLevel || 0)}
                </p>
              </div>
            </div>

            {/* Bedside Clock View */}
            <div className="flex items-center gap-2 mb-6 px-3 py-1 bg-zinc-950 border border-zinc-800/60 rounded text-[11px] text-zinc-400 font-mono">
              <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>Будильник на тумбочке:</span>
              <strong className="text-zinc-200">{formattedTime}</strong>
            </div>

            {/* Actions */}
            <div className="w-full space-y-2">
              <button
                onClick={onSleep}
                className="w-full py-2.5 bg-zinc-100 hover:bg-white text-zinc-950 rounded text-xs font-bold tracking-wide flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99]"
              >
                Закрыть глаза и уснуть [E]
              </button>
              <button
                onClick={onStandUp}
                className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded text-xs font-semibold border border-zinc-800 transition-all cursor-pointer active:scale-[0.99]"
              >
                Встать с постели [Пробел]
              </button>
            </div>
          </motion.div>
        )}

        {/* 2. FALLING ASLEEP PHASE */}
        {isFalling && (
          <div className="flex flex-col items-center justify-center text-center p-6 text-zinc-300 max-w-sm">
            <motion.div
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <Moon className="w-10 h-10 text-indigo-500/60 mb-4" />
            </motion.div>
            <h3 className="text-md font-semibold text-white mb-2 tracking-wide">Веки тяжелеют...</h3>
            <p className="text-xs text-zinc-500 italic">
              Мысли затихают, окружающий мир медленно растворяется в полной темноте.
            </p>
          </div>
        )}

        {/* 3. DEEP SLEEP PHASE (Autonomous simulation - no buttons, no clocks on eyelids, pure closed-eye state) */}
        {isDeepSleep && (
          <div className="flex flex-col items-center justify-center text-center w-full min-h-[160px]">
            {/* Drifting thoughts and sensations */}
            <AnimatePresence mode="wait">
              {bedState.dreamText && (
                <motion.div
                  key={bedState.dreamText}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 0.35, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 1.8 }}
                  className="text-xs font-sans italic text-zinc-400 max-w-sm px-6 leading-relaxed"
                >
                  « {bedState.dreamText} »
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* 4. NIGHT AWAKENING */}
        {isNightAwake && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="w-full bg-zinc-900/98 border border-zinc-800 rounded-lg shadow-2xl p-6 text-zinc-100 flex flex-col items-center text-center"
          >
            <div className="p-3 bg-zinc-950 border border-zinc-850 text-amber-500 rounded-full mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>

            <h2 className="text-md font-bold text-white mb-1 tracking-tight">
              Вы внезапно открыли глаза среди ночи
            </h2>
            
            {/* Glowing Bedside Alarm Clock */}
            <div className="my-3 bg-zinc-950 px-4 py-2 border border-zinc-850 inline-block rounded font-mono text-xl font-bold tracking-widest text-red-600/90 drop-shadow-[0_0_6px_rgba(220,38,38,0.5)]">
              {formattedTime}
            </div>

            <p className="text-xs text-zinc-300 bg-zinc-950/80 p-3.5 rounded border border-zinc-850/60 mb-5 leading-relaxed w-full">
              {bedState.nightAwakeReason || 'В комнате царит глухая ночная темнота. Кажется, какой-то шорох или мысль разбудили вас.'}
            </p>

            {/* Context Physical Warnings (Thirst, Hunger, Pain) */}
            {(player.needs.thirst < 40 || player.needs.hunger < 40 || (player.bodyState?.painLevel || 0) > 15) && (
              <div className="w-full text-left bg-red-950/20 border border-red-900/30 p-3 rounded mb-5 space-y-2 text-[11px] text-red-300/90 leading-relaxed">
                <div className="font-bold text-[10px] uppercase tracking-wider text-red-400">Сигналы организма:</div>
                {player.needs.thirst < 40 && (
                  <p className="flex items-center gap-1.5">• {getThirstSensation(player.needs.thirst)}</p>
                )}
                {player.needs.hunger < 40 && (
                  <p className="flex items-center gap-1.5">• {getHungerSensation(player.needs.hunger)}</p>
                )}
                {(player.bodyState?.painLevel || 0) > 15 && (
                  <p className="flex items-center gap-1.5">• {getBodySensation(player.needs.health, player.bodyState?.painLevel)}</p>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="w-full space-y-2">
              <button
                onClick={onFallBackAsleep}
                className="w-full py-2.5 bg-zinc-100 hover:bg-white text-zinc-950 rounded text-xs font-bold tracking-wide flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99]"
              >
                Повернуться на другой бок и спать дальше [E]
              </button>
              <button
                onClick={onStandUp}
                className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded text-xs font-semibold border border-zinc-800 transition-all cursor-pointer active:scale-[0.99]"
              >
                Подняться с постели [Пробел]
              </button>
            </div>
          </motion.div>
        )}

        {/* 5. WAKING UP OUTCOME SUMMARY (Conscious Rest after wake) */}
        {isWakingUp && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="w-full bg-zinc-900/95 border border-zinc-800 rounded-lg shadow-2xl p-6 text-zinc-100 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200"
          >
            <div className={`p-3 rounded-full mb-3 border ${
              bedState.wakeMood === 'well_rested' 
                ? 'bg-zinc-950 border-emerald-800/40 text-emerald-400'
                : 'bg-zinc-950 border-amber-800/40 text-amber-400'
            }`}>
              {bedState.wakeMood === 'well_rested' ? (
                <Sparkles className="w-6 h-6" />
              ) : (
                <Sun className="w-6 h-6" />
              )}
            </div>

            <h2 className="text-md font-bold text-white mb-1 tracking-tight">
              {bedState.wakeMood === 'well_rested' && 'Вы отлично выспались и полны сил!'}
              {bedState.wakeMood === 'slightly_tired' && 'Вы проснулись, но чувствуется легкий недосып'}
              {bedState.wakeMood === 'exhausted' && 'Вы проснулись совершенно разбитым'}
              {bedState.wakeMood === 'overslept' && 'Вы проспали слишком долго'}
            </h2>

            {/* Glowing clock showing morning time */}
            <div className="my-2 bg-zinc-950 px-4 py-1.5 border border-zinc-850 inline-flex items-center gap-1.5 rounded font-mono text-lg font-bold tracking-widest text-emerald-500 drop-shadow-[0_0_5px_rgba(16,185,129,0.4)]">
              <Clock className="w-4 h-4" />
              {formattedTime}
            </div>

            <div className="text-[10px] text-zinc-500 mb-4 uppercase tracking-wider font-mono">
              Сон длился: {bedState.totalSleptHours.toFixed(1)} Ч
            </div>

            {/* Immersive Physical Sensation Description */}
            <div className="w-full bg-zinc-950 p-4 rounded border border-zinc-850 text-xs text-zinc-300 text-left space-y-2.5 mb-5 leading-relaxed">
              <div className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider flex items-center gap-1.5 border-b border-zinc-800 pb-1.5">
                <Activity className="w-3.5 h-3.5 text-zinc-400" /> Самочувствие утром
              </div>
              
              {/* Mood Description */}
              <p className="text-zinc-200">
                {bedState.wakeMood === 'well_rested' && 'Голова чистая, тело легкое и расслабленное. Энергия восстановилась на максимум.'}
                {bedState.wakeMood === 'slightly_tired' && 'Веки все еще слипаются, хочется полежать еще пять минут. В мышцах ощущается остаточная слабость.'}
                {bedState.wakeMood === 'exhausted' && 'Организм не успел восстановиться. В теле ломота и слабость, глаза режет от сильной усталости.'}
                {bedState.wakeMood === 'overslept' && 'В голове стоит легкий чугунный туман, тело ватное и непослушное после избыточного сна.'}
              </p>

              {/* Specific Urgent Symptoms */}
              {(player.needs.thirst < 40 || player.needs.hunger < 40 || (player.bodyState?.painLevel || 0) > 15) && (
                <div className="pt-2 border-t border-zinc-800 space-y-1.5 text-[11px] text-amber-400">
                  {player.needs.thirst < 40 && (
                    <p className="leading-tight">• Губы и горло сильно пересохли от обезвоживания.</p>
                  )}
                  {player.needs.hunger < 40 && (
                    <p className="leading-tight">• Желудок настойчиво требует утреннего приема пищи.</p>
                  )}
                  {(player.bodyState?.painLevel || 0) > 15 && (
                    <p className="leading-tight">• Поврежденные конечности неприятно ноют после сна.</p>
                  )}
                </div>
              )}
            </div>

            {/* Action */}
            <button
              onClick={onStandUp}
              className="w-full py-2.5 bg-zinc-100 hover:bg-white text-zinc-950 rounded text-xs font-bold tracking-wide flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99]"
            >
              Встать с постели [Пробел]
            </button>
          </motion.div>
        )}

      </div>
    </div>
  );
};
