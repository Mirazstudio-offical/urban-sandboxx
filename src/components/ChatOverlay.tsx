import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, X, Minimize2, Maximize2 } from 'lucide-react';
import { onlineManager, ChatMessage } from '../onlineSystem';
import { sound } from '../audio';

interface ChatOverlayProps {
  isChatFocused: boolean;
  onSetChatFocused: (focused: boolean) => void;
}

export const ChatOverlay: React.FC<ChatOverlayProps> = ({
  isChatFocused,
  onSetChatFocused
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(onlineManager.chatMessages);
  const [inputText, setInputText] = useState<string>('');
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = onlineManager.subscribe(() => {
      setMessages([...onlineManager.chatMessages]);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (isChatFocused && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isChatFocused]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isChatFocused]);

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) {
      onSetChatFocused(false);
      return;
    }
    sound.playButtonPress();
    onlineManager.sendChatMessage(trimmed);
    setInputText('');
    onSetChatFocused(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      onSetChatFocused(false);
      inputRef.current?.blur();
      e.stopPropagation();
    }
  };

  // Only show full overlay if there are messages or online mode is active or user focused it
  const hasMessages = messages.length > 0;
  const isOnline = onlineManager.status === 'connected';

  if (!isOnline && !hasMessages && !isChatFocused) {
    return null;
  }

  return (
    <div 
      className={`fixed bottom-4 left-4 z-40 transition-all duration-200 pointer-events-auto ${
        isMinimized 
          ? 'w-64' 
          : 'w-80 sm:w-96'
      }`}
    >
      <div className="bg-slate-950/85 backdrop-blur-md border border-slate-800/90 rounded-2xl shadow-xl overflow-hidden flex flex-col">
        
        {/* Chat Bar Header */}
        <div className="px-3 py-2 bg-slate-900/70 border-b border-slate-800/70 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
            <span className="font-bold tracking-wide text-[11px] uppercase">
              Чат Комнаты {onlineManager.roomCode ? `(${onlineManager.roomCode})` : ''}
            </span>
          </div>

          <div className="flex items-center gap-1">
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
                    <div key={msg.id} className="text-[11px] text-amber-400/90 italic bg-amber-950/20 px-2 py-1 rounded border border-amber-500/20">
                      ⚡ {msg.text}
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
                    <span className="text-slate-200">{msg.text}</span>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input Field */}
        <form onSubmit={handleSendMessage} className="p-2 bg-slate-900/90 border-t border-slate-800/80 flex items-center gap-1.5">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            maxLength={100}
            onFocus={() => onSetChatFocused(true)}
            onBlur={() => {
              // slight delay so clicking Send button still triggers onSubmit
              setTimeout(() => {
                if (document.activeElement !== inputRef.current) {
                  onSetChatFocused(false);
                }
              }, 150);
            }}
            onKeyDown={handleKeyDown}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={isChatFocused ? 'Напишите сообщение...' : 'Нажмите Enter для чата...'}
            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
          <button
            type="submit"
            className="p-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl transition-colors cursor-pointer disabled:opacity-40"
            disabled={!inputText.trim()}
            title="Отправить (Enter)"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>

      </div>
    </div>
  );
};
