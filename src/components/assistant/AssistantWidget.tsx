"use client";

import { useRef, useState, useEffect } from "react";
import { Bot, Send, Loader2, User } from "lucide-react";

type ChatMessage = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "What is Facility Forms for?",
  "What does Environmental Services (EVS) cover here?",
  "Where do I log weekly spending?",
];

export function AssistantWidget() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setSending(true);
    setError(null);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      setError("Couldn't reach the assistant — check your connection.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-lg border border-border-hairline bg-surface-1 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Bot className="h-4 w-4 text-series-1" />
        <h2 className="text-sm font-medium text-text-primary">Dashboard Assistant</h2>
      </div>

      {messages.length === 0 ? (
        <div className="mb-3 space-y-2">
          <p className="text-sm text-text-muted">
            Ask about how this dashboard works, or about the company&apos;s FS &amp; EVS operations.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="rounded-full border border-border-hairline px-2.5 py-1 text-xs text-text-secondary hover:bg-surface-2"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div ref={scrollRef} className="mb-3 max-h-80 space-y-3 overflow-y-auto pr-1">
          {messages.map((m, i) => (
            <div key={i} className={`flex items-start gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                  m.role === "user" ? "bg-surface-2 text-text-secondary" : "bg-series-1/10 text-series-1"
                }`}
              >
                {m.role === "user" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
              </span>
              <div
                className={`max-w-[80%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
                  m.role === "user" ? "bg-series-1 text-white" : "bg-surface-2 text-text-primary"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-series-1/10 text-series-1">
                <Bot className="h-3.5 w-3.5" />
              </span>
              <Loader2 className="h-4 w-4 animate-spin text-text-muted" />
            </div>
          )}
        </div>
      )}

      {error && <p className="mb-2 text-xs text-status-critical">{error}</p>}

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send(input);
          }}
          placeholder="Ask about the dashboard or the company…"
          className="flex-1 rounded-md border border-border-hairline bg-surface-1 px-2.5 py-1.5 text-sm text-text-primary"
        />
        <button
          onClick={() => send(input)}
          disabled={!input.trim() || sending}
          className="flex items-center justify-center gap-1.5 rounded-md bg-series-1 px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
