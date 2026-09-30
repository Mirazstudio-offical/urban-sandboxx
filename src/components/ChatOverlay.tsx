import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Minimize2, Maximize2, Zap, Trash2, Copy, Check, CornerDownLeft, Sparkles } from 'lucide-react';
import { onlineManager, ChatMessage } from '../onlineSystem';
import { sound } from '../audio';

interface ChatOverlayProps {
  isChatFocused: boolean;
  onSetChatFocused: (focused: boolean) => void;
}

const STORAGE_KEY_DRAFT = 'm2d_chat_draft_prompt';
const STORAGE_KEY_HISTORY = 'm2d_chat_prompt_history';
const MAX_PROMPT_LENGTH = 4000;

export const ChatOverlay: React.FC<ChatOverlayProps> = ({
  isChatFocused,
  onSetChatFocused
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(onlineManager.chatMessages);
  
  // Real-time auto-recovered draft (never lost across browser crashes, reloads or unmounts)
  const [inputText, setInputText] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_DRAFT) || '';
    } catch {
      return '';
    }
  });

  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [isExpandedView, setIsExpandedView] = useState<boolean>(false);
  const [copiedDraft, setCopiedDraft] = useState<boolean>(false);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-save draft on every change
  useEffect(() => {
    try {
      if (inputText) {
        localStorage.setItem(STORAGE_KEY_DRAFT, inputText);
      } else {
        localStorage.removeItem(STORAGE_KEY_DRAFT);
      }
    } catch {}
  }, [inputText]);

  // Subscribe to online room messages
  useEffect(() => {
    const unsub = onlineManager.subscribe(() => {
      setMessages([...onlineManager.chatMessages]);
    });
    return unsub;
  }, []);

  // Auto-focus when focus requested
  useEffect(() => {
    if (isChatFocused && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isChatFocused]);

  // Auto-scroll message list
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isChatFocused]);

  // Auto-adjust textarea height based on content
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const newH = Math.min(Math.max(el.scrollHeight, 36), 140);
    el.style.height = `${newH}px`;
  }, [inputText]);

  // Read message history
  const getPromptHistory = (): string[] => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  const pushToPromptHistory = (text: string) => {
    try {
      const history = getPromptHistory().filter((item) => item !== text);
      history.unshift(text);
      if (history.length > 30) history.pop();
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
    } catch {}
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) {
      onSetChatFocused(false);
      return;
    }

    sound.playButtonPress();
    onlineManager.sendChatMessage(trimmed);
    pushToPromptHistory(trimmed);

    setInputText('');
    setHistoryIndex(-1);
    try {
      localStorage.removeItem(STORAGE_KEY_DRAFT);
    } catch {}

    onSetChatFocused(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Isolate ALL keyboard events from leaking into game engine / canvas
    e.stopPropagation();

    if (e.key === 'Escape') {
      onSetChatFocused(false);
      textareaRef.current?.blur();
      e.preventDefault();
      return;
    }

    // Enter without Shift -> Send prompt / message
    // Shift + Enter -> Insert new line
    // Ctrl + Enter or Cmd + Enter -> Send prompt / message
    if (e.key === 'Enter') {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        handleSendMessage();
        return;
      }

      if (!e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
        return;
      }
    }

    // History navigation using ArrowUp / ArrowDown when at start or empty
    const el = textareaRef.current;
    if (e.key === 'ArrowUp' && el && (el.selectionStart === 0 || !inputText)) {
      const history = getPromptHistory();
      if (history.length > 0) {
        const nextIdx = Math.min(historyIndex + 1, history.length - 1);
        setHistoryIndex(nextIdx);
        setInputText(history[nextIdx] || '');
        e.preventDefault();
      }
    } else if (e.key === 'ArrowDown' && historyIndex >= 0) {
      const history = getPromptHistory();
      const nextIdx = historyIndex - 1;
      setHistoryIndex(nextIdx);
      if (nextIdx >= 0 && history[nextIdx]) {
        setInputText(history[nextIdx]);
      } else {
        setInputText('');
      }
      e.preventDefault();
    }
  };

  const handleCopyDraft = () => {
    if (!inputText) return;
    try {
      navigator.clipboard.writeText(inputText);
      setCopiedDraft(true);
      setTimeout(() => setCopiedDraft(false), 2000);
    } catch {}
  };

  const handleClearDraft = () => {
    setInputText('');
    setHistoryIndex(-1);
    try {
      localStorage.removeItem(STORAGE_KEY_DRAFT);
    } catch {}
  };

  const hasMessages = messages.length > 0;
  const isOnline = onlineManager.status === 'connected';
  const hasDraft = inputText.trim().length > 0;

  if (!isOnline && !hasMessages && !isChatFocused && !hasDraft) {
    return null;
  }

  return (
    <div 
      id="chat-overlay-container"
      className={`fixed bottom-4 left-4 z-40 transition-all duration-200 pointer-events-auto select-none ${
        isMinimized 
          ? 'w-72' 
          : isExpandedView 
          ? 'w-96 sm:w-[32rem]' 
          : 'w-80 sm:w-96'
      }`}
    >
      <div className="bg-slate-950/90 backdrop-blur-md border border-slate-800/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Chat Bar Header */}
        <div className="px-3 py-2 bg-slate-900/80 border-b border-slate-800/70 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
            <span className="font-bold tracking-wide text-[11px] uppercase">
              Чат Комнаты {onlineManager.roomCode ? `(${onlineManager.roomCode})` : ''}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsExpandedView(!isExpandedView)}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
              title={isExpandedView ? 'Обычный размер' : 'Широкий режим'}
            >
              <Sparkles className="w-3 h-3 text-sky-400" />
            </button>
            <button
              type="button"
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
              title={isMinimized ? 'Развернуть' : 'Свернуть'}
            >
              {isMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Message Log */}
        {!isMinimized && (
          <div className="p-3 max-h-48 overflow-y-auto space-y-2 text-xs font-medium">
            {messages.length === 0 ? (
              <div className="text-[11px] text-slate-500 italic text-center py-2">
                Сообщений пока нет. Нажмите Enter, чтобы написать!
              </div>
            ) : (
              messages.slice(-40).map((msg) => {
                const isLocal = msg.senderPeerId === onlineManager.localPeerId;
                const isSys = msg.isSystem;

                if (isSys) {
                  return (
                    <div key={msg.id} className="text-[11px] text-amber-400/90 italic bg-amber-950/20 px-2 py-1 rounded border border-amber-500/20 flex items-center gap-1">
                      <Zap className="w-3 h-3 text-amber-400 shrink-0" />
                      <span>{msg.text}</span>
                    </div>
                  );
                }

                return (
                  <div key={msg.id} className="break-words leading-relaxed">
                    <span 
                      className={`font-bold mr-1.5 ${
                        isLocal ? 'text-sky-400' : 'text-emerald-400'
                      }`}
                    >
                      {msg.senderName}:
                    </span>
                    <span className="text-slate-200 whitespace-pre-wrap">{msg.text}</span>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input Field & Draft Protection Bar */}
        <form onSubmit={handleSendMessage} className="p-2.5 bg-slate-900/95 border-t border-slate-800/80 flex flex-col gap-1.5">
          {/* Draft Status / Safety Toolbar (visible when text is entered) */}
          {inputText.length > 0 && (
            <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <Check className="w-2.5 h-2.5" />
                Черновик защищен в памяти
              </span>
              <div className="flex items-center gap-2">
                <span>{inputText.length} / {MAX_PROMPT_LENGTH}</span>
                <button
                  type="button"
                  onClick={handleCopyDraft}
                  className="hover:text-sky-300 transition-colors cursor-pointer flex items-center gap-0.5"
                  title="Скопировать черновик"
                >
                  {copiedDraft ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                  {copiedDraft ? 'Скопировано' : 'Копия'}
                </button>
                <button
                  type="button"
                  onClick={handleClearDraft}
                  className="hover:text-red-400 transition-colors cursor-pointer flex items-center gap-0.5"
                  title="Очистить поле ввода"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                  Очистить
                </button>
              </div>
            </div>
          )}

          <div className="flex items-end gap-1.5">
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputText}
              maxLength={MAX_PROMPT_LENGTH}
              onFocus={() => onSetChatFocused(true)}
              onBlur={() => {
                setTimeout(() => {
                  if (document.activeElement !== textareaRef.current) {
                    onSetChatFocused(false);
                  }
                }, 150);
              }}
              onKeyDown={handleKeyDown}
              onKeyUp={(e) => e.stopPropagation()}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={isChatFocused ? 'Напишите сообщение или промпт (Enter — отправить, Shift+Enter — строка)...' : 'Нажмите Enter для чата...'}
              className="flex-1 bg-slate-950 border border-slate-700/90 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 resize-none transition-all max-h-36 leading-relaxed select-text"
            />
            <button
              type="submit"
              className="p-2 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white rounded-xl transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              disabled={!inputText.trim()}
              title="Отправить (Enter или Ctrl+Enter)"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick usage hints */}
          {isChatFocused && (
            <div className="flex items-center justify-between text-[9.5px] text-slate-500 px-1 pt-0.5">
              <span>Shift+Enter — перенос строки</span>
              <span className="flex items-center gap-1">
                <CornerDownLeft className="w-2.5 h-2.5" /> Enter — отправить
              </span>
            </div>
          )}
        </form>

      </div>
    </div>
  );
};
