import React, { useState } from 'react';
import { Play, Save, Sliders, LogOut, User, Globe, Activity, Check, Sparkles, Calendar } from 'lucide-react';
import { BrandMark } from './gameUi';

interface PauseMenuProps {
  onResume: () => void;
  onSave: () => void;
  onOpenSettings: () => void;
  onExitToMainMenu: () => void;
  onOpenOnline?: () => void;
  onOpenProfile?: () => void;
  onOpenDiagnostics?: () => void;
  onOpenCreative?: () => void;
  onOpenCalendar?: () => void;
}

const ICON = { width: 24, height: 24, color: '#c9922b', strokeWidth: 2 } as const;

export const PauseMenu: React.FC<PauseMenuProps> = ({
  onResume,
  onSave,
  onOpenSettings,
  onExitToMainMenu,
  onOpenOnline,
  onOpenProfile,
  onOpenDiagnostics,
  onOpenCreative,
  onOpenCalendar
}) => {
  const [savedFeedback, setSavedFeedback] = useState<boolean>(false);
  const [confirmExit, setConfirmExit] = useState<boolean>(false);

  const handleSaveClick = () => {
    onSave();
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2200);
  };

  return (
    <div className="gu-backdrop" style={{ background: 'radial-gradient(900px 520px at 70% 90%, rgba(201,146,43,.3), transparent 62%), linear-gradient(180deg, rgba(23,20,15,.94), rgba(18,15,11,.97))' }}>
      <div className="gu-pause">
        <nav className="gu-nav" aria-label="Меню паузы">
          <div className="gu-pause-brand">
            <BrandMark size={34} />
            <span className="gu-cn" style={{ fontSize: 15, fontWeight: 600 }}>Степной Тракт 2D</span>
          </div>

          <button type="button" className="gu-nav-i gu-big" onClick={onResume}>
            <span>Продолжить</span>
            <span className="gu-nav-d">Вернуться в игру</span>
          </button>

          <button type="button" className="gu-nav-i" onClick={handleSaveClick}>
            {savedFeedback ? <Check {...ICON} color="#9ac985" /> : <Save {...ICON} />}
            <span>{savedFeedback ? 'Сохранено' : 'Сохранить'}</span>
            <span className="gu-nav-k">F5</span>
          </button>

          {onOpenCreative && (
            <button type="button" className="gu-nav-i" onClick={onOpenCreative}>
              <Sparkles {...ICON} />Творчество
            </button>
          )}
          {onOpenCalendar && (
            <button type="button" className="gu-nav-i" onClick={onOpenCalendar}>
              <Calendar {...ICON} />Календарь и климат
            </button>
          )}
          <button type="button" className="gu-nav-i" onClick={onOpenSettings}>
            <Sliders {...ICON} />Настройки
          </button>
          {onOpenProfile && (
            <button type="button" className="gu-nav-i" onClick={onOpenProfile}>
              <User {...ICON} />Аккаунт
            </button>
          )}
          {onOpenOnline && (
            <button type="button" className="gu-nav-i" onClick={onOpenOnline}>
              <Globe {...ICON} />Онлайн
            </button>
          )}
          {onOpenDiagnostics && (
            <button type="button" className="gu-nav-i" onClick={onOpenDiagnostics}>
              <Activity {...ICON} />Диагностика
              <span className="gu-nav-k">F2</span>
            </button>
          )}

          <div className="gu-nav-sep" />

          {confirmExit ? (
            <>
              <div className="gu-nav-i gu-danger" style={{ cursor: 'default', height: 'auto', padding: '10px 22px', flexDirection: 'column', alignItems: 'flex-start', gap: 2, background: 'none', borderLeftColor: '#d9745a' }}>
                <span style={{ color: '#efa690' }}>Выйти в главное меню?</span>
                <span className="gu-nav-d">Несохранённый прогресс будет потерян</span>
              </div>
              <div className="gu-confirm">
                <button type="button" className="gu-btn gu-btn-d" onClick={onExitToMainMenu}>Да, выйти</button>
                <button type="button" className="gu-btn gu-btn-s" onClick={() => setConfirmExit(false)}>Отмена</button>
              </div>
            </>
          ) : (
            <button type="button" className="gu-nav-i gu-danger" onClick={() => setConfirmExit(true)}>
              <LogOut {...ICON} color="#a29e93" />
              <span style={{ color: '#a29e93' }}>В главное меню</span>
            </button>
          )}
        </nav>

        <aside className="gu-pause-side">
          <div>
            <div className="gu-cn gu-mut" style={{ fontSize: 14 }}>Симуляция приостановлена</div>
            <div className="gu-pause-big">Пауза</div>
          </div>
          <div className="gu-panel gu-pad">
            <div className="gu-grp" style={{ marginBottom: 14 }}>Горячие клавиши</div>
            <div className="gu-keys">
              <span className="gu-key">Esc</span><span>Продолжить игру</span>
              <span className="gu-key">F5</span><span>Быстрое сохранение</span>
              <span className="gu-key">T</span><span>Замедление времени вкл/выкл</span>
              <span className="gu-key">O</span><span>Онлайн</span>
              <span className="gu-key">I</span><span>Инвентарь</span>
              <span className="gu-key">F2</span><span>Диагностика</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
