import React, { useEffect, useState } from 'react';
import { RotateCcw, Smartphone } from 'lucide-react';

interface LandscapeGuardProps {
  onDismiss?: () => void;
}

export const LandscapeGuard: React.FC<LandscapeGuardProps> = ({ onDismiss }) => {
  const [isPortrait, setIsPortrait] = useState<boolean>(false);
  const [dismissed, setDismissed] = useState<boolean>(false);

  useEffect(() => {
    const checkOrientation = () => {
      // Check if width < height and device is touch/mobile
      const portrait = window.innerHeight > window.innerWidth && window.innerWidth < 900;
      setIsPortrait(portrait);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  const handleRequestLandscape = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
      // @ts-ignore
      if (window.screen?.orientation?.lock) {
        // @ts-ignore
        await window.screen.orientation.lock('landscape');
      }
    } catch (err) {
      console.log('Orientation lock or fullscreen not supported/allowed by browser:', err);
    }
  };

  if (!isPortrait || dismissed) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center text-white select-none">
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-3xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center animate-pulse">
          <Smartphone className="w-10 h-10 text-sky-400 rotate-90" />
        </div>
        <div className="absolute -bottom-2 -right-2 bg-amber-500 text-slate-950 p-2 rounded-full shadow-lg animate-bounce">
          <RotateCcw className="w-5 h-5" />
        </div>
      </div>

      <h2 className="text-2xl font-black text-white tracking-wide mb-2">
        Поверните устройство
      </h2>
      <p className="text-slate-300 text-sm max-w-sm mb-6 leading-relaxed">
        Для лучшего опыта и управления двумя руками поверните телефон в <span className="text-sky-400 font-bold">альбомный (горизонтальный)</span> режим.
      </p>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={handleRequestLandscape}
          className="w-full py-3.5 px-4 bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-slate-950 font-extrabold rounded-2xl shadow-lg shadow-sky-500/30 flex items-center justify-center gap-2 transition-all"
        >
          <RotateCcw className="w-5 h-5" />
          Включить альбомный режим
        </button>

        <button
          onClick={() => setDismissed(true)}
          className="w-full py-2.5 px-4 bg-slate-800/80 hover:bg-slate-700 text-slate-400 text-xs font-semibold rounded-xl border border-slate-700/60 transition-all"
        >
          Продолжить так
        </button>
      </div>
    </div>
  );
};
