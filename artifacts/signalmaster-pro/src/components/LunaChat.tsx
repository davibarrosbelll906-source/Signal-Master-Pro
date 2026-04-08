import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { apiClient } from "../lib/apiClient";
import html2canvas from "html2canvas";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  hasImage?: boolean;
}

interface LunaChatProps {
  chartRef?: React.RefObject<HTMLDivElement | null>;
  currentPair?: string;
  currentTimeframe?: string;
  tradeStats?: string;
}

export default function LunaChat({ chartRef, currentPair, currentTimeframe, tradeStats }: LunaChatProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, scrollToBottom]);

  useEffect(() => {
    if (open && conversationId === null) {
      initConversation();
    }
  }, [open]);

  useEffect(() => {
    if (open && messages.length === 0 && conversationId) {
      setMessages([{
        id: "welcome",
        role: "assistant",
        content: "Olá! Sou a **Luna** 🌙, sua assistente educacional aqui no SignalMaster Pro.\n\nPosso te ajudar com:\n- 📊 **Análise de gráficos** — envie uma captura e explico em detalhes\n- 📚 **Ensinar análise técnica** — suporte/resistência, tendências, padrões\n- 🏦 **Gestão de banca** — Kelly, stops, metas\n- 🧠 **Coach de risco** — disciplina e controle emocional\n\nO que você gostaria de aprender hoje?",
        timestamp: new Date(),
      }]);
    }
  }, [conversationId, open, messages.length]);

  async function initConversation() {
    try {
      const conv = await apiClient.post<{ id: number }>("/luna/conversations", {});
      setConversationId(conv.id);
      const existing = await apiClient.get<any[]>(`/luna/conversations/${conv.id}/messages`);
      if (existing.length > 0) {
        setMessages(existing.map((m: any) => ({
          id: m.id.toString(),
          role: m.role,
          content: m.content,
          timestamp: new Date(m.createdAt),
        })));
      }
    } catch (err) {
      console.error("Luna init error:", err);
    }
  }

  async function sendMessage(text: string, imageBase64?: string) {
    if (!conversationId) return;
    if (!text.trim() && !imageBase64) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text || "📸 Analisando gráfico...",
      timestamp: new Date(),
      hasImage: !!imageBase64,
    };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setStreamingContent("");

    try {
      const token = localStorage.getItem("smpJwt7");
      const response = await fetch(`/api/luna/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: text,
          imageBase64,
          tradeContext: tradeStats,
        }),
      });

      if (!response.body) throw new Error("No stream");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                full += data.content;
                setStreamingContent(full);
              }
              if (data.done) {
                setMessages(prev => [...prev, {
                  id: (Date.now() + 1).toString(),
                  role: "assistant",
                  content: full,
                  timestamp: new Date(),
                }]);
                setStreamingContent("");
                if (imageBase64) {
                  autoSaveAnalysis(text, full, imageBase64);
                }
              }
            } catch {}
          }
        }
      }
    } catch (err) {
      console.error("Luna send error:", err);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Desculpe, tive um problema técnico. Pode tentar novamente? 🙏",
        timestamp: new Date(),
      }]);
      setStreamingContent("");
    } finally {
      setLoading(false);
    }
  }

  async function captureAndAnalyze() {
    const target = chartRef?.current || document.querySelector("[data-chart-container]") as HTMLElement;
    if (!target) {
      sendMessage("Por favor, analise o mercado atual e me ensine sobre análise gráfica.");
      return;
    }
    setCapturing(true);
    try {
      const canvas = await html2canvas(target as HTMLElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#07070d",
        logging: false,
      });
      const base64 = canvas.toDataURL("image/png");
      const pair = currentPair || "par atual";
      const tf = currentTimeframe || "M5";
      await sendMessage(
        `Analise este gráfico de ${pair} no ${tf} de forma educativa. Identifique a tendência, suportes, resistências, padrões de velas e o que eu posso aprender com este setup.`,
        base64
      );
    } catch {
      sendMessage("Analise o mercado atual e me ensine sobre o que observar em gráficos binários.");
    } finally {
      setCapturing(false);
    }
  }

  async function autoSaveAnalysis(question: string, response: string, imageBase64: string) {
    try {
      const lines = response.split("\n").filter(l => l.trim().startsWith("-") || l.trim().startsWith("•"));
      const keyLessons = lines.slice(0, 4).map(l => l.replace(/^[-•]\s*/, "").replace(/\*\*/g, "").trim()).filter(Boolean);
      const tagMap: Record<string, string[]> = {
        tendencia: ["tendência", "alta", "baixa", "lateral", "trend"],
        suporte_resistencia: ["suporte", "resistência", "sr", "zona"],
        price_action: ["vela", "candle", "pin bar", "engolfo", "doji", "hammer"],
        volatilidade: ["volatilidade", "atr", "bollinger", "banda"],
        momentum: ["rsi", "macd", "momentum", "divergência"],
        sessao: ["london", "nova york", "ásia", "sessão", "overlap"],
      };
      const rLow = response.toLowerCase();
      const tags = Object.entries(tagMap).filter(([, kws]) => kws.some(kw => rLow.includes(kw))).map(([tag]) => tag);

      const thumbnail = imageBase64.length > 500_000
        ? await compressThumbnail(imageBase64)
        : imageBase64;

      await apiClient.post("/luna/analyses", {
        pair: currentPair || "",
        timeframe: currentTimeframe || "",
        userQuestion: question,
        lunaResponse: response,
        keyLessons,
        tags,
        thumbnailBase64: thumbnail,
      });
    } catch (err) {
      console.warn("Análise não pôde ser salva:", err);
    }
  }

  async function compressThumbnail(base64: string): Promise<string> {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ratio = Math.min(320 / img.width, 180 / img.height);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.6));
      };
      img.onerror = () => resolve("");
      img.src = base64;
    });
  }

  function formatMarkdown(text: string) {
    return text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/^- (.+)$/gm, "• $1")
      .replace(/\n/g, "<br/>");
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-24 right-4 z-[9999] w-[370px] max-h-[580px] flex flex-col rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
            style={{ background: "rgba(10,10,20,0.97)", backdropFilter: "blur(20px)" }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10"
              style={{ background: "linear-gradient(135deg, #0d1117 0%, #1a0a2e 100%)" }}>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg font-bold"
                    style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}>
                    🌙
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 border-2 border-black" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm leading-none">Luna</p>
                  <p className="text-green-400 text-[10px] mt-0.5">Assistente IA • Online</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white/80 transition-colors text-xl leading-none">×</button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0" style={{ maxHeight: "400px" }}>
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2 flex-shrink-0 mt-0.5"
                      style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}>🌙</div>
                  )}
                  <div
                    className="max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed"
                    style={{
                      background: msg.role === "user"
                        ? "linear-gradient(135deg, #00ff88, #00cc66)"
                        : "rgba(255,255,255,0.07)",
                      color: msg.role === "user" ? "#000" : "#e2e8f0",
                    }}
                  >
                    {msg.hasImage && (
                      <div className="flex items-center gap-1 text-xs opacity-70 mb-1">
                        <span>📸</span><span>Gráfico capturado</span>
                      </div>
                    )}
                    <span dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.content) }} />
                  </div>
                </div>
              ))}

              {streamingContent && (
                <div className="flex justify-start">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2 flex-shrink-0 mt-0.5"
                    style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}>🌙</div>
                  <div className="max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed"
                    style={{ background: "rgba(255,255,255,0.07)", color: "#e2e8f0" }}>
                    <span dangerouslySetInnerHTML={{ __html: formatMarkdown(streamingContent) }} />
                    <span className="inline-block w-1.5 h-4 bg-purple-400 ml-0.5 animate-pulse rounded-sm" />
                  </div>
                </div>
              )}

              {loading && !streamingContent && (
                <div className="flex justify-start">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2 flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}>🌙</div>
                  <div className="rounded-xl px-4 py-3" style={{ background: "rgba(255,255,255,0.07)" }}>
                    <div className="flex gap-1 items-center">
                      <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div className="border-t border-white/10 p-3 space-y-2" style={{ background: "rgba(10,10,20,0.9)" }}>
              <button
                onClick={captureAndAnalyze}
                disabled={capturing || loading}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #7c3aed33, #4f46e533)", border: "1px solid #7c3aed55", color: "#c4b5fd" }}
              >
                {capturing ? (
                  <><span className="animate-spin">⟳</span> Capturando gráfico...</>
                ) : (
                  <><span>📸</span> Analisar gráfico com Luna</>
                )}
              </button>
              <div className="flex gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Pergunte à Luna... (Enter para enviar)"
                  rows={1}
                  disabled={loading}
                  className="flex-1 resize-none rounded-xl px-3 py-2 text-sm outline-none disabled:opacity-50"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#e2e8f0",
                    maxHeight: "80px",
                  }}
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || loading}
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" />
                  </svg>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-4 z-[9998] w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-2xl"
        style={{
          background: open
            ? "linear-gradient(135deg, #4f46e5, #7c3aed)"
            : "linear-gradient(135deg, #7c3aed, #4f46e5)",
          boxShadow: "0 0 24px rgba(124,58,237,0.6)",
        }}
        title="Falar com Luna"
      >
        {open ? "×" : "🌙"}
      </motion.button>
    </>
  );
}
