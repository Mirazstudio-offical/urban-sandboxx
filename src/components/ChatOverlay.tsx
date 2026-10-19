import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Minus, Maximize2, Minimize2, Zap, Trash2, Copy, Check, CornerDownLeft } from 'lucide-react';
import { onlineManager, ChatMessage } from '../onlineSystem';
import { sound } from '../audio';

interface ChatOverlayProps {
  isChatFocused: boolean;
  onSetChatFocused: (focused: boolean) => void;
  /** Touch devices: chat starts collapsed to a button on the right edge (bottom-left is the joystick). */
  isMobileTouch?: boolean;
}

const STORAGE_KEY_DRAFT = 'm2d_chat_draft_prompt';
const STORAGE_KEY_HISTORY = 'm2d_chat_prompt_history';
const MAX_PROMPT_LENGTH = 4000;

export const ChatOverlay: React.FC<ChatOverlayProps> = ({
  isChatFocused,
  onSetChatFocused,
  isMobileTouch = false
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

  const [isMinimized, setIsMinimized] = useState<boolean>(isMobileTouch);
  const [isExpandedView, setIsExpandedView] = useState<boolean>(false);
  const [copiedDraft, setCopiedDraft] = useState<boolean>(false);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [unread, setUnread] = useState<number>(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastMessageIdRef = useRef<string | null>(
    onlineManager.chatMessages.length ? onlineManager.chatMessages[onlineManager.chatMessages.length - 1].id : null
  );
  const isMinimizedRef = useRef<boolean>(isMinimized);
  isMinimizedRef.current = isMinimized;

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

  // Subscribe to online room messages (and count unread while collapsed)
  useEffect(() => {
    const unsub = onlineManager.subscribe(() => {
      const list = [...onlineManager.chatMessages];
      setMessages(list);
      const last = list.length ? list[list.length - 1] : null;
      if (last && last.id !== lastMessageIdRef.current) {
        lastMessageIdRef.current = last.id;
        if (isMinimizedRef.current && last.senderPeerId !== onlineManager.localPeerId) {
          setUnread((n) => n + 1);
        }
      }
    });
    return () => { unsub(); };
  }, []);

  // Auto-focus when focus requested (and open the panel if it was collapsed)
  useEffect(() => {
    if (!isChatFocused) return;
    if (isMinimizedRef.current) {
      setIsMinimized(false);
      setUnread(0);
    }
    if (textareaRef.current) textareaRef.current.focus();
  }, [isChatFocused]);

  // Auto-scroll message list
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isChatFocused, isMinimized]);

  // Auto-adjust textarea height based on content
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const newH = Math.min(Math.max(el.scrollHeight, 40), isMobileTouch ? 84 : 140);
    el.style.height = `${newH}px`;
  }, [inputText, isMinimized, isMobileTouch]);

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

  const openPanel = () => {
    setIsMinimized(false);
    setUnread(0);
  };

  const hasMessages = messages.length > 0;
  const isOnline = onlineManager.status === 'connected';
  const hasDraft = inputText.trim().length > 0;

  if (!isOnline && !hasMessages && !isChatFocused && !hasDraft) {
    return null;
  }

  const rootClass =
    'hud-chat' +
    (isMobileTouch ? ' touch' : '') +
    (isMinimized ? ' collapsed' : '') +
    (isExpandedView && !isMobileTouch ? ' wide' : '');

  // Touch + collapsed: a single button, nothing else covers the playfield
  if (isMobileTouch && isMinimized) {
    return (
      <div id="chat-overlay-container" className={rootClass}>
        <button
          type="button"
          className="hud-btn hud-sq hud-chat-fab"
          onClick={openPanel}
          title="Открыть чат"
          aria-label="Открыть чат"
        >
          <MessageSquare className="w-5 h-5" />
          {unread > 0 && <span className="hud-chat-badge">{unread > 99 ? '99+' : unread}</span>}
        </button>
      </div>
    );
  }

  return (
    <div id="chat-overlay-container" className={rootClass}>
      <div className="hud-chat-panel">

        {/* Header */}
        <div className="hud-chat-head">
          <div className="hud-chat-title">
            <MessageSquare className="w-4 h-4 shrink-0" />
            <span>Чат{onlineManager.roomCode ? ` · ${onlineManager.roomCode}` : ''}</span>
          </div>

          <div className="hud-chat-tools">
            {!isMobileTouch && (
              <button
                type="button"
                className={`hud-btn hud-sm ${isExpandedView ? 'on' : ''}`}
                onClick={() => setIsExpandedView(!isExpandedView)}
                title={isExpandedView ? 'Обычный размер' : 'Широкий режим'}
                aria-label={isExpandedView ? 'Обычный размер' : 'Широкий режим'}
              >
                {isExpandedView ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            )}
            <button
              type="button"
              className="hud-btn hud-sm"
              onClick={() => setIsMinimized(!isMinimized)}
              title={isMinimized ? 'Развернуть' : 'Свернуть'}
              aria-label={isMinimized ? 'Развернуть' : 'Свернуть'}
            >
              {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Message log */}
        {!isMinimized && (
          <div className="hud-chat-log">
            {messages.length === 0 ? (
              <div className="hud-chat-empty">
                {isMobileTouch ? 'Сообщений пока нет.' : 'Сообщений пока нет. Нажмите Enter, чтобы написать.'}
              </div>
            ) : (
              messages.slice(-40).map((msg) => {
                const isLocal = msg.senderPeerId === onlineManager.localPeerId;

                if (msg.isSystem) {
                  return (
                    <div key={msg.id} className="hud-chat-sys">
                      <Zap className="w-3.5 h-3.5 shrink-0" />
                      <span>{msg.text}</span>
                    </div>
                  );
                }

                return (
                  <div key={msg.id} className="hud-chat-msg">
                    <span className={`hud-chat-name ${isLocal ? 'me' : ''}`}>{msg.senderName}:</span>
                    {msg.text}
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSendMessage} className="hud-chat-form">
          {!isMobileTouch && inputText.length > 0 && (
            <div className="hud-chat-draft">
              <span>{inputText.length} / {MAX_PROMPT_LENGTH}</span>
              <div className="hud-chat-draft-r">
                <button type="button" className="hud-chat-link" onClick={handleCopyDraft} title="Скопировать черновик">
                  {copiedDraft ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copiedDraft ? 'Скопировано' : 'Копия'}
                </button>
                <button type="button" className="hud-chat-link" onClick={handleClearDraft} title="Очистить поле ввода">
                  <Trash2 className="w-3 h-3" />
                  Очистить
                </button>
              </div>
            </div>
          )}

          <div className="hud-chat-row">
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputText}
              maxLength={MAX_PROMPT_LENGTH}
              className="hud-chat-input"
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
              placeholder={
                isMobileTouch
                  ? 'Сообщение...'
                  : isChatFocused
                  ? 'Сообщение (Enter — отправить, Shift+Enter — строка)'
                  : 'Нажмите Enter для чата...'
              }
            />
            <button
              type="submit"
              className={`hud-btn hud-sq ${hasDraft ? 'on' : ''}`}
              disabled={!hasDraft}
              title="Отправить (Enter или Ctrl+Enter)"
              aria-label="Отправить"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          {!isMobileTouch && isChatFocused && (
            <div className="hud-chat-hints">
              <span>Shift+Enter — перенос</span>
              <span><CornerDownLeft className="w-3 h-3" /> Enter — отправить</span>
            </div>
          )}
        </form>

      </div>
    </div>
  );
};
