import React, { useState, useEffect } from 'react';
import { Radio, Play, X, Sparkles, User } from 'lucide-react';
import { auth, subscribeToWorldInvites, respondToWorldInvite, WorldInviteData } from '../firebase';
import { sound } from '../audio';

interface WorldInviteToastProps {
  onJoinRoom: (roomCode: string) => void;
}

export const WorldInviteToast: React.FC<WorldInviteToastProps> = ({ onJoinRoom }) => {
  const [invites, setInvites] = useState<WorldInviteData[]>([]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const unsub = subscribeToWorldInvites(user.uid, (fetchedInvites) => {
      if (fetchedInvites.length > invites.length) {
        sound.playButtonPress();
      }
      setInvites(fetchedInvites);
    });

    return () => unsub();
  }, []);

  if (invites.length === 0) return null;

  const currentInvite = invites[0];

  const handleAccept = async () => {
    sound.playButtonPress();
    if (currentInvite.id) {
      await respondToWorldInvite(currentInvite.id, 'accepted');
    }
    onJoinRoom(currentInvite.roomCode);
  };

  const handleDecline = async () => {
    sound.playButtonPress();
    if (currentInvite.id) {
      await respondToWorldInvite(currentInvite.id, 'declined');
    }
  };

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4 animate-in slide-in-from-top duration-300 pointer-events-auto">
      <div className="bg-slate-900/95 border-2 border-sky-500/80 rounded-2xl p-4 shadow-2xl shadow-sky-500/20 backdrop-blur-md flex items-center justify-between gap-3 select-none">
        
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/40 text-sky-400 flex items-center justify-center font-bold text-lg shrink-0">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase text-white tracking-wider">
                Приглашение в мир
              </span>
              <span className="text-[10px] px-1.5 py-0.2 bg-sky-950 text-sky-300 border border-sky-500/40 rounded font-mono font-bold">
                P2P Live
              </span>
            </div>
            
            <div className="text-xs text-slate-300 mt-0.5">
              Игрок <strong className="text-emerald-400">{currentInvite.senderName}</strong> зовёт вас на сервер:
            </div>
            <div className="text-xs font-mono font-bold text-sky-300">
              [{currentInvite.roomCode}]
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleAccept}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition-all cursor-pointer flex items-center gap-1"
          >
            <Play className="w-3.5 h-3.5 fill-white" /> Войти
          </button>

          <button
            onClick={handleDecline}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Отклонить"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
