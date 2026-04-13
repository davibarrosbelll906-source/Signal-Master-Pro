import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, RefreshCw, ChevronDown, BarChart2, Zap, AlertCircle } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { getToken } from "@/lib/apiClient";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
  ts: number;
}

const API_BASE = import.meta.env.VITE_API_URL || "";

const SUGGESTIONS = [
  "Quais pares têm os melhores sinais agora?",
  "Explique o regime de mercado atual do BTCUSD",
  "Quando devo evitar operar? Quais gates estão ativos?",
  "Qual a diferença entre sinal FORTE e ELITE?",
  "Como funciona o bloqueio por tendência HTF?",
  "Me explique o score do ETHUSD agora",
  "Qual é o melhor horário para operar cripto na Ebinex?",
  "Como gerenciar banca com sinais FRACO?",
];

export default function AnalystPage() {
  const currentUser = useAppStore((s) => s.currentUser);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(true);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || streaming) return;
      const token = getToken();
      if (!token) {
        setError("Sessão expirada. Faça login novamente.");
        return;
      }

      setError(null);
      setShowSuggestions(false);
      setInput("");

      const userMsg: Message = { role: "user", content: trimmed, ts: Date.now() };
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      setMessages((prev) => [...prev, userMsg]);
      setStreaming(true);
      setStreamingContent("");

      abortRef.current = new AbortController();

      try {
        const res = await fetch(`${API_BASE}/api/analyst/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ message: trimmed, history }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Erro ${res.status}`);
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let fullText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() || "";

          for (const part of parts) {
            const line = part.trim();
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);
              if (parsed.error) throw new Error(parsed.error);
              if (parsed.content) {
                fullText += parsed.content;
                setStreamingContent(fullText);
              }
              if (parsed.done) {
                setMessages((prev) => [
                  ...prev,
                  { role: "assistant", content: fullText, ts: Date.now() },
                ]);
                setStreamingContent("");
              }
            } catch (e: any) {
              if (e.message !== "JSON") setError(e.message);
            }
          }
        }
      } catch (e: any) {
        if (e.name !== "AbortError") {
          setError(e.message || "Erro de conexão");
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: "⚠️ Erro ao conectar com o analista. Tente novamente.",
              ts: Date.now(),
            },
          ]);
        }
      } finally {
        setStreaming(false);
        setStreamingContent("");
        abortRef.current = null;
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    },
    [messages, streaming]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearChat = () => {
    if (streaming) {
      abortRef.current?.abort();
    }
    setMessages([]);
    setStreamingContent("");
    setStreaming(false);
    setError(null);
    setShowSuggestions(true);
  };

  const allMessages = [
    ...messages,
    ...(streamingContent
      ? [{ role: "assistant" as const, content: streamingContent, ts: Date.now() }]
      : []),
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-900/40">
              <Bot size={22} className="text-white" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[var(--green)] rounded-full border-2 border-[var(--bg-1)]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">Analista IA</h1>
            <p className="text-[11px] text-gray-400">
              Claude Sonnet · 12 pares Ebinex · Contexto ao vivo
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-2)] border border-white/5 text-xs text-gray-400">
            <Zap size={11} className="text-violet-400" />
            Streaming ativo
          </div>
          <button
            onClick={clearChat}
            className="p-2 rounded-lg bg-[var(--bg-2)] border border-white/5 text-gray-400 hover:text-white hover:border-white/20 transition"
            title="Limpar conversa"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-violet-900/20 border border-violet-500/20 text-xs text-violet-300">
        <BarChart2 size={13} className="shrink-0" />
        <span>
          Análises baseadas no contexto real dos sinais do SignalMaster Pro v7 — atualizado a cada ciclo do engine
        </span>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
        {/* Welcome */}
        {allMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-6 pb-4">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-xl shadow-violet-900/40 mb-4">
                <Bot size={30} className="text-white" />
              </div>
              <h2 className="text-xl font-bold text-white mb-1">Analista de Cripto</h2>
              <p className="text-gray-400 text-sm max-w-sm">
                Analiso os 12 pares da Ebinex com dados ao vivo do SignalMaster Pro. Pergunte sobre sinais, regimes, indicadores ou estratégias.
              </p>
            </div>

            {showSuggestions && (
              <div className="w-full grid grid-cols-2 gap-2 max-w-2xl">
                {SUGGESTIONS.slice(0, 6).map((s, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(s)}
                    className="text-left px-3 py-2.5 rounded-xl bg-[var(--bg-2)] border border-white/5 hover:border-violet-500/40 hover:bg-violet-900/20 transition text-xs text-gray-300 hover:text-white"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Messages */}
        <AnimatePresence initial={false}>
          {allMessages.map((msg, i) => {
            const isUser = msg.role === "user";
            const isStreamingMsg = i === allMessages.length - 1 && !!streamingContent && !isUser;

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
              >
                {/* Avatar */}
                <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                  isUser
                    ? "bg-gradient-to-br from-[var(--green)] to-teal-600"
                    : "bg-gradient-to-br from-violet-600 to-indigo-600"
                }`}>
                  {isUser ? (
                    <User size={14} className="text-white" />
                  ) : (
                    <Bot size={14} className="text-white" />
                  )}
                </div>

                {/* Bubble */}
                <div className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  isUser
                    ? "bg-[var(--green)]/15 border border-[var(--green)]/20 text-gray-100 rounded-tr-sm"
                    : "bg-[var(--bg-2)] border border-white/5 text-gray-200 rounded-tl-sm"
                }`}>
                  {isUser ? (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <div className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-headings:text-white prose-strong:text-white prose-code:bg-black/40 prose-code:px-1 prose-code:rounded prose-pre:bg-black/40 prose-pre:rounded-lg prose-li:my-0.5 prose-table:text-xs">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                      {isStreamingMsg && (
                        <span className="inline-block w-1.5 h-4 bg-violet-400 rounded-sm animate-pulse ml-0.5 align-middle" />
                      )}
                    </div>
                  )}
                  <div className={`text-[10px] mt-1.5 opacity-40 ${isUser ? "text-right" : "text-left"}`}>
                    {new Date(msg.ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Typing indicator */}
        {streaming && !streamingContent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shrink-0">
              <Bot size={14} className="text-white" />
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-[var(--bg-2)] border border-white/5">
              <div className="flex gap-1.5 items-center h-4">
                {[0, 1, 2].map((n) => (
                  <div
                    key={n}
                    className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce"
                    style={{ animationDelay: `${n * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-900/20 border border-red-500/20 text-xs text-red-400">
            <AlertCircle size={13} className="shrink-0" />
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Quick suggestions during chat */}
      {messages.length > 0 && messages.length < 4 && !streaming && (
        <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-none pt-2">
          {SUGGESTIONS.slice(0, 4).map((s, i) => (
            <button
              key={i}
              onClick={() => sendMessage(s)}
              className="shrink-0 px-3 py-1.5 rounded-full bg-[var(--bg-2)] border border-white/5 hover:border-violet-500/30 text-xs text-gray-400 hover:text-white transition whitespace-nowrap"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="mt-2 flex gap-2 items-end">
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pergunte sobre sinais, pares, estratégias..."
            rows={1}
            className="w-full bg-[var(--bg-2)] border border-white/10 hover:border-white/20 focus:border-violet-500/60 rounded-xl px-4 py-3 pr-12 text-sm text-white placeholder-gray-500 resize-none outline-none transition scrollbar-thin"
            style={{ maxHeight: "120px" }}
            onInput={(e) => {
              const t = e.target as HTMLTextAreaElement;
              t.style.height = "auto";
              t.style.height = Math.min(t.scrollHeight, 120) + "px";
            }}
            disabled={streaming}
          />
        </div>
        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || streaming}
          className="shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center shadow-lg shadow-violet-900/40 transition"
        >
          {streaming ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Send size={16} className="text-white" />
          )}
        </button>
      </div>

      <p className="text-center text-[10px] text-gray-600 mt-2">
        Análises educacionais — não constituem recomendação financeira. Gerencie seu risco sempre.
      </p>
    </div>
  );
}
