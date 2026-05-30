"use client";
import type { ChatMessage } from "@/lib/types";
import { useEffect, useRef, useState } from "react";

interface Props {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  myPlayerId?: number | null;
}

const QUICK_EMOJIS = ["💥", "😱", "👏", "🤝", "😈", "🎯"];

export default function Chat({ messages, onSend, myPlayerId }: Props) {
  const [input, setInput] = useState("");
  const [unread, setUnread] = useState(0);
  const [isOpen, setIsOpen] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(messages.length);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (!isOpen) {
      const newCount = messages.length - prevCountRef.current;
      if (newCount > 0) setUnread((u) => u + newCount);
    } else {
      setUnread(0);
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevCountRef.current = messages.length;
  }, [messages, isOpen]);

  function handleSend() {
    const trimmed = input.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setInput("");
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function formatTime(ts: number) {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="flex flex-col border border-gray-800 rounded-xl overflow-hidden bg-gray-950 self-stretch w-full lg:w-[260px]">
      {/* Header */}
      <button
        onClick={() => { setIsOpen((o) => !o); setUnread(0); }}
        className="flex items-center justify-between px-3 py-2 bg-gray-900 hover:bg-gray-800 transition-colors flex-shrink-0"
      >
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
          Chat
        </span>
        <div className="flex items-center gap-2">
          {unread > 0 && (
            <span className="bg-blue-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {unread}
            </span>
          )}
          <span className="text-gray-600 text-xs">{isOpen ? "▲" : "▼"}</span>
        </div>
      </button>

      {isOpen && (
        <>
          {/* Message list */}
          <div
            ref={listRef}
            className="flex flex-col gap-1 p-2 overflow-y-auto flex-1"
          >
            {messages.length === 0 && (
              <p className="text-xs text-gray-600 text-center mt-6">
                No messages yet.<br />Say something!
              </p>
            )}
            {messages.map((msg) => {
              const isMe = !msg.isSystem && myPlayerId != null && msg.playerId === myPlayerId;
              return (
                <div key={msg.id} className={`flex flex-col gap-0.5 ${msg.isSystem ? "items-center" : isMe ? "items-end" : "items-start"}`}>
                  {msg.isSystem ? (
                    <span className="text-[10px] text-gray-600 italic">{msg.text}</span>
                  ) : (
                    <>
                      <div className={`flex items-baseline gap-1.5 ${isMe ? "flex-row-reverse" : ""}`}>
                        <span
                          className="text-[10px] font-semibold leading-none"
                          style={{ color: msg.color }}
                        >
                          {msg.playerName}
                        </span>
                        <span className="text-[9px] text-gray-700">{formatTime(msg.timestamp)}</span>
                      </div>
                      <div
                        className={`text-xs text-gray-200 leading-snug px-2 py-1 max-w-full break-words ${isMe ? "rounded-lg rounded-br-none" : "rounded-lg rounded-tl-none"}`}
                        style={{ backgroundColor: `${msg.color}1a`, border: `0.5px solid ${msg.color}30` }}
                      >
                        {msg.text}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Quick emojis */}
          <div className="flex gap-1 px-2 pb-1 flex-shrink-0">
            {QUICK_EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => onSend(e)}
                className="text-base hover:scale-125 transition-transform leading-none"
                title={e}
              >
                {e}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="flex gap-1 px-2 pb-2 flex-shrink-0">
            <input
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-gray-500 placeholder-gray-600"
              placeholder="Say something…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              maxLength={200}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="px-2 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-30 rounded-lg text-xs transition-colors"
            >
              ↑
            </button>
          </div>
        </>
      )}
    </div>
  );
}
