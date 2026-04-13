import { useState, useEffect, useRef, useCallback } from "react";

// ── Types ─────────────────────────────────────────────────────────────────
type Provider = "claude" | "chatgpt" | "gemini" | "grok" | "dalle";
type MsgType = "text" | "image";
interface Message {
  role: "user" | "assistant";
  content: string;
  provider?: Provider;
  ts?: number;
  type?: MsgType;
  imageUrl?: string;
  revised_prompt?: string;
}
interface Conversation { id: string; title: string; provider: Provider; messages: Message[]; created: number; }

// ── Provider config ───────────────────────────────────────────────────────
const PROVIDERS: { id: Provider; name: string; model: string; color: string; bg: string; border: string; icon: string; isImage?: boolean }[] = [
  { id: "claude",  name: "Claude",   model: "Sonnet 4.6",   color: "#d4956a", bg: "rgba(212,149,106,0.10)", border: "rgba(212,149,106,0.25)", icon: "✦" },
  { id: "chatgpt", name: "ChatGPT",  model: "GPT-5.2",      color: "#10a37f", bg: "rgba(16,163,127,0.10)",  border: "rgba(16,163,127,0.25)",  icon: "◈" },
  { id: "gemini",  name: "Gemini",   model: "3.1 Pro",      color: "#4488ff", bg: "rgba(68,136,255,0.10)",  border: "rgba(68,136,255,0.25)",  icon: "◆" },
  { id: "grok",    name: "Grok",     model: "Grok-3",       color: "#e040fb", bg: "rgba(224,64,251,0.10)",  border: "rgba(224,64,251,0.25)",  icon: "⬡" },
  { id: "dalle",   name: "Imagem AI", model: "gpt-image-1",  color: "#ff6b6b", bg: "rgba(255,107,107,0.10)", border: "rgba(255,107,107,0.25)", icon: "🎨", isImage: true },
];

const providerMap = Object.fromEntries(PROVIDERS.map(p => [p.id, p])) as Record<Provider, typeof PROVIDERS[0]>;

// ── Utils ─────────────────────────────────────────────────────────────────
const LS_KEY = "omnichat_conversations";

function loadConvos(): Conversation[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? "[]"); } catch { return []; }
}
function saveConvos(convos: Conversation[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(convos));
}
function newConvo(provider: Provider): Conversation {
  return { id: crypto.randomUUID(), title: "Nova conversa", provider, messages: [], created: Date.now() };
}
function titleFrom(text: string) {
  return text.length > 42 ? text.slice(0, 42) + "…" : text;
}

// ── API client ────────────────────────────────────────────────────────────
const API_BASE = "/api/ai-chat";

async function streamChat(
  provider: Provider,
  messages: Message[],
  systemPrompt: string,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (e: string) => void,
) {
  const res = await fetch(`${API_BASE}/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      provider,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      systemPrompt,
    }),
  });

  if (!res.ok || !res.body) { onError("Falha na conexão com o servidor"); return; }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try {
        const json = JSON.parse(line.slice(6));
        if (json.content) onChunk(json.content);
        if (json.done) { onDone(); return; }
        if (json.error) { onError(json.error); return; }
      } catch {}
    }
  }
  onDone();
}

async function generateImage(
  prompt: string,
  size: "1024x1024" | "1536x1024" | "1024x1536",
): Promise<{ b64_json: string }> {
  const res = await fetch(`${API_BASE}/image`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, size }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Erro desconhecido" }));
    throw new Error(err.error ?? "Erro ao gerar imagem");
  }
  return res.json();
}

// ── Markdown-lite renderer ────────────────────────────────────────────────
function renderMarkdown(text: string): string {
  return text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) =>
      `<pre><code class="lang-${lang}">${code.trimEnd()}</code></pre>`)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^### (.+)$/gm, "<h3 style='font-size:15px;font-weight:700;margin:12px 0 4px'>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2 style='font-size:17px;font-weight:700;margin:14px 0 6px'>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1 style='font-size:20px;font-weight:800;margin:16px 0 8px'>$1</h1>")
    .replace(/^\- (.+)$/gm, "<li style='margin-left:20px;list-style:disc'>$1</li>")
    .replace(/^\d+\. (.+)$/gm, "<li style='margin-left:20px;list-style:decimal'>$1</li>")
    .replace(/\n{2,}/g, "<br/><br/>")
    .replace(/\n/g, "<br/>");
}

// ── Components ────────────────────────────────────────────────────────────

function ProviderChip({ p, active, onClick }: { p: typeof PROVIDERS[0]; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 7, padding: "8px 14px",
      borderRadius: 10, border: `1px solid ${active ? p.border : "rgba(255,255,255,0.07)"}`,
      background: active ? p.bg : "transparent",
      cursor: "pointer", transition: "all .15s",
      color: active ? p.color : "rgba(220,220,240,0.5)",
      fontFamily: "inherit", fontSize: 13, fontWeight: active ? 700 : 400,
      position: "relative",
    }}>
      <span style={{ fontSize: p.isImage ? 14 : 16 }}>{p.icon}</span>
      <span>{p.name}</span>
      <span style={{ fontSize: 10, opacity: 0.6, marginLeft: 2 }}>{p.model}</span>
      {p.isImage && (
        <span style={{
          position: "absolute", top: -6, right: -4,
          background: p.color, color: "#fff",
          fontSize: 8, fontWeight: 800, padding: "1px 5px",
          borderRadius: 6, letterSpacing: "0.04em",
        }}>IMG</span>
      )}
    </button>
  );
}

function MessageBubble({ msg, isStreaming }: { msg: Message; isStreaming?: boolean }) {
  const isUser = msg.role === "user";
  const prov = msg.provider ? providerMap[msg.provider] : null;
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <div style={{
      display: "flex", flexDirection: isUser ? "row-reverse" : "row",
      gap: 12, marginBottom: 18, alignItems: "flex-start",
    }}>
      {!isUser && (
        <div style={{
          width: 34, height: 34, borderRadius: 10, flexShrink: 0, marginTop: 2,
          background: prov ? prov.bg : "rgba(255,255,255,0.06)",
          border: `1px solid ${prov ? prov.border : "rgba(255,255,255,0.1)"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: prov?.isImage ? 14 : 16, color: prov?.color,
        }}>
          {prov?.icon ?? "AI"}
        </div>
      )}
      {isUser && (
        <div style={{
          width: 34, height: 34, borderRadius: 10, flexShrink: 0, marginTop: 2,
          background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 15, color: "rgba(220,220,240,0.7)",
        }}>U</div>
      )}

      <div style={{ maxWidth: msg.type === "image" ? "520px" : "75%", minWidth: 80 }}>
        {!isUser && prov && (
          <div style={{ fontSize: 11, color: prov.color, marginBottom: 4, fontWeight: 600, letterSpacing: "0.04em" }}>
            {prov.name} · {prov.model}
          </div>
        )}

        {/* Image message */}
        {msg.type === "image" && msg.imageUrl ? (
          <div>
            <div style={{
              borderRadius: 16, overflow: "hidden",
              border: `1px solid ${prov ? prov.border : "rgba(255,255,255,0.1)"}`,
              background: "rgba(0,0,0,0.3)",
            }}>
              {!imgLoaded && (
                <div style={{
                  width: 400, height: 400, display: "flex", alignItems: "center", justifyContent: "center",
                  color: "rgba(220,220,240,0.3)", fontSize: 13,
                }}>
                  Carregando imagem…
                </div>
              )}
              <img
                src={`data:image/png;base64,${msg.imageUrl}`}
                alt={msg.content}
                onLoad={() => setImgLoaded(true)}
                style={{ maxWidth: "100%", display: imgLoaded ? "block" : "none", borderRadius: 16 }}
              />
            </div>
            <button onClick={() => {
              const a = document.createElement("a");
              a.href = `data:image/png;base64,${msg.imageUrl}`;
              a.download = "imagem-ai.png";
              a.click();
            }} style={{
              display: "inline-block", marginTop: 8, padding: "6px 14px",
              borderRadius: 8, border: "1px solid rgba(255,107,107,0.3)",
              background: "rgba(255,107,107,0.08)", color: "#ff6b6b",
              fontSize: 12, cursor: "pointer", fontFamily: "inherit",
            }}>
              ⬇ Baixar imagem
            </button>
          </div>
        ) : (
          <div style={{
            padding: "12px 16px",
            borderRadius: isUser ? "16px 6px 16px 16px" : "6px 16px 16px 16px",
            background: isUser ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.04)",
            border: isUser
              ? "1px solid rgba(255,255,255,0.1)"
              : `1px solid ${prov ? prov.border : "rgba(255,255,255,0.07)"}`,
            fontSize: 14, lineHeight: 1.65, color: "#dde2f0", wordBreak: "break-word",
          }}>
            {isUser ? (
              <span>{msg.content}</span>
            ) : (
              <>
                <span dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                {isStreaming && <span className="cursor" style={{ color: prov?.color ?? "#4488ff", marginLeft: 2 }}>▌</span>}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ThinkingIndicator({ provider }: { provider: Provider }) {
  const p = providerMap[provider];
  const isImg = p.isImage;
  return (
    <div style={{ display: "flex", gap: 12, marginBottom: 18, alignItems: "flex-start" }}>
      <div style={{
        width: 34, height: 34, borderRadius: 10, flexShrink: 0, marginTop: 2,
        background: p.bg, border: `1px solid ${p.border}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: isImg ? 14 : 16, color: p.color,
      }}>{p.icon}</div>
      <div style={{
        padding: "14px 18px", borderRadius: "6px 16px 16px 16px",
        background: "rgba(255,255,255,0.04)", border: `1px solid ${p.border}`,
        display: "flex", gap: 8, alignItems: "center", color: "rgba(220,220,240,0.4)", fontSize: 13,
      }}>
        {isImg ? (
          <>
            <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⏳</span>
            Gerando imagem ultra-realista…
          </>
        ) : (
          [0, 1, 2].map(i => (
            <span key={i} className="thinking-dot" style={{
              width: 7, height: 7, borderRadius: "50%", background: p.color,
              display: "inline-block", animationDelay: `${i * 0.2}s`,
            }} />
          ))
        )}
      </div>
    </div>
  );
}

// ── Image size picker ──────────────────────────────────────────────────────
type ImgSize = "1024x1024" | "1536x1024" | "1024x1536";
const IMG_SIZES: { value: ImgSize; label: string }[] = [
  { value: "1024x1024", label: "Quadrado (1:1)" },
  { value: "1536x1024", label: "Paisagem (3:2)" },
  { value: "1024x1536", label: "Retrato (2:3)" },
];

// ── Main App ──────────────────────────────────────────────────────────────
export default function App() {
  const [convos, setConvos] = useState<Conversation[]>(loadConvos);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [provider, setProvider] = useState<Provider>("claude");
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamMsg, setStreamMsg] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [systemPrompt, setSystemPrompt] = useState("Você é um assistente inteligente, útil e direto. Responda sempre em português.");
  const [showSettings, setShowSettings] = useState(false);
  const [imgSize, setImgSize] = useState<ImgSize>("1024x1024");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeConvo = convos.find(c => c.id === activeId) ?? null;
  const isImageMode = provider === "dalle";
  const activeProvider = providerMap[provider];

  useEffect(() => { saveConvos(convos); }, [convos]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [activeConvo?.messages.length, streamMsg]);

  const startNew = useCallback(() => {
    const c = newConvo(provider);
    setConvos(prev => [c, ...prev]);
    setActiveId(c.id);
    setStreamMsg("");
  }, [provider]);

  const selectConvo = (id: string) => {
    const c = convos.find(cv => cv.id === id);
    if (c) setProvider(c.provider);
    setActiveId(id);
    setStreamMsg("");
  };

  const deleteConvo = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConvos(prev => prev.filter(c => c.id !== id));
    if (activeId === id) setActiveId(null);
  };

  const sendMessage = async () => {
    if (!input.trim() || streaming) return;
    const text = input.trim();
    setInput("");

    let convo = activeConvo;
    if (!convo) {
      convo = newConvo(provider);
      setConvos(prev => [convo!, ...prev]);
      setActiveId(convo.id);
    }

    const userMsg: Message = { role: "user", content: text, ts: Date.now() };
    const updatedMessages = [...convo.messages, userMsg];

    setConvos(prev => prev.map(c => c.id === convo!.id ? {
      ...c, provider,
      messages: updatedMessages,
      title: c.messages.length === 0 ? titleFrom(text) : c.title,
    } : c));

    setStreaming(true);
    setStreamMsg("");
    const cid = convo.id;
    const prov = provider;

    // ── Image generation mode ───────────────────────────────────────────
    if (isImageMode) {
      try {
        const { b64_json } = await generateImage(text, imgSize);
        const imgMsg: Message = {
          role: "assistant", content: text,
          provider: prov, ts: Date.now(),
          type: "image", imageUrl: b64_json,
        };
        setConvos(prev => prev.map(c => c.id === cid ? { ...c, messages: [...updatedMessages, imgMsg] } : c));
      } catch (err: any) {
        const errMsg: Message = {
          role: "assistant", content: `❌ Erro ao gerar imagem: ${err.message}`,
          provider: prov, ts: Date.now(),
        };
        setConvos(prev => prev.map(c => c.id === cid ? { ...c, messages: [...updatedMessages, errMsg] } : c));
      }
      setStreaming(false);
      return;
    }

    // ── Text streaming mode ─────────────────────────────────────────────
    let full = "";
    await streamChat(
      prov,
      updatedMessages,
      systemPrompt,
      (chunk) => { full += chunk; setStreamMsg(full); },
      () => {
        const assistantMsg: Message = { role: "assistant", content: full || "Sem resposta.", provider: prov, ts: Date.now() };
        setConvos(prev => prev.map(c => c.id === cid ? { ...c, messages: [...updatedMessages, assistantMsg] } : c));
        setStreamMsg("");
        setStreaming(false);
      },
      (err) => {
        const errMsg: Message = { role: "assistant", content: `❌ Erro: ${err}`, provider: prov, ts: Date.now() };
        setConvos(prev => prev.map(c => c.id === cid ? { ...c, messages: [...updatedMessages, errMsg] } : c));
        setStreamMsg("");
        setStreaming(false);
      },
    );
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div style={{ display: "flex", height: "100dvh", background: "hsl(222 47% 5%)", color: "#dde2f0", fontFamily: "Inter, system-ui, sans-serif", overflow: "hidden" }}>

      {/* ── Sidebar ── */}
      <div style={{
        width: sidebarOpen ? 260 : 0, flexShrink: 0, overflow: "hidden",
        transition: "width .2s ease", borderRight: sidebarOpen ? "1px solid rgba(255,255,255,0.07)" : "none",
        background: "hsl(222 40% 6%)", display: "flex", flexDirection: "column",
      }}>
        <div style={{ padding: "18px 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg,#4488ff,#e040fb)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>⊞</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, letterSpacing: -0.3 }}>OmniChat</div>
              <div style={{ fontSize: 10, color: "rgba(220,220,240,0.4)" }}>Multi-IA + Imagens</div>
            </div>
          </div>
        </div>

        <div style={{ padding: "10px 10px 4px" }}>
          <button onClick={startNew} style={{
            width: "100%", padding: "9px 14px", borderRadius: 10, border: "1px dashed rgba(255,255,255,0.15)",
            background: "transparent", color: "rgba(220,220,240,0.55)", fontSize: 13, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 8, fontFamily: "inherit",
          }}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>＋</span> Nova conversa
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "4px 10px" }}>
          {convos.length === 0 && (
            <div style={{ textAlign: "center", padding: "24px 12px", color: "rgba(220,220,240,0.3)", fontSize: 12 }}>
              Sem conversas ainda
            </div>
          )}
          {convos.map(c => {
            const prov = providerMap[c.provider];
            const isActive = c.id === activeId;
            return (
              <div key={c.id} onClick={() => selectConvo(c.id)} style={{
                display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8,
                cursor: "pointer", marginBottom: 2,
                background: isActive ? "rgba(255,255,255,0.06)" : "transparent",
                border: isActive ? "1px solid rgba(255,255,255,0.08)" : "1px solid transparent",
              }}>
                <span style={{ fontSize: 13, color: prov.color, flexShrink: 0 }}>{prov.icon}</span>
                <span style={{ flex: 1, fontSize: 12, color: isActive ? "#dde2f0" : "rgba(220,220,240,0.5)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {c.title}
                </span>
                <button onClick={(e) => deleteConvo(c.id, e)} style={{
                  background: "none", border: "none", color: "rgba(220,220,240,0.3)", cursor: "pointer",
                  fontSize: 14, padding: 2, lineHeight: 1, opacity: 0,
                }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                  onMouseLeave={e => (e.currentTarget.style.opacity = "0")}
                >×</button>
              </div>
            );
          })}
        </div>

        <div style={{ padding: "8px 10px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <button onClick={() => setShowSettings(v => !v)} style={{
            width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)",
            background: showSettings ? "rgba(255,255,255,0.06)" : "transparent",
            color: "rgba(220,220,240,0.55)", fontSize: 12, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 8, fontFamily: "inherit",
          }}>
            ⚙ Instruções do sistema
          </button>
        </div>
      </div>

      {/* ── Main area ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

        <div style={{
          display: "flex", alignItems: "center", gap: 10, padding: "12px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.07)", background: "hsl(222 40% 6%)",
          flexShrink: 0, flexWrap: "wrap",
        }}>
          <button onClick={() => setSidebarOpen(v => !v)} style={{
            background: "none", border: "none", color: "rgba(220,220,240,0.4)", cursor: "pointer", fontSize: 18, padding: 4,
          }}>☰</button>

          <div style={{ width: 1, height: 22, background: "rgba(255,255,255,0.1)", flexShrink: 0 }} />

          <div style={{ display: "flex", gap: 6, flex: 1, flexWrap: "wrap" }}>
            {PROVIDERS.map(p => (
              <ProviderChip key={p.id} p={p} active={provider === p.id} onClick={() => setProvider(p.id)} />
            ))}
          </div>

          {activeConvo && (
            <button onClick={() => { setConvos(prev => prev.map(c => c.id === activeConvo.id ? { ...c, messages: [] } : c)); }} style={{
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(220,220,240,0.4)", cursor: "pointer", borderRadius: 8, padding: "6px 12px",
              fontSize: 12, fontFamily: "inherit",
            }}>
              Limpar
            </button>
          )}
        </div>

        {showSettings && !isImageMode && (
          <div style={{ padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.03)" }}>
            <div style={{ fontSize: 11, color: "rgba(220,220,240,0.4)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Instruções do sistema (system prompt)
            </div>
            <textarea value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)}
              style={{
                width: "100%", padding: "10px 14px", borderRadius: 10,
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                color: "#dde2f0", fontSize: 13, fontFamily: "inherit", resize: "vertical",
                outline: "none", lineHeight: 1.5, minHeight: 60,
              }}
            />
          </div>
        )}

        {/* Image mode controls */}
        {isImageMode && (
          <div style={{
            padding: "10px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)",
            background: "rgba(255,107,107,0.04)",
            display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
          }}>
            <div style={{ fontSize: 12, color: "#ff6b6b", fontWeight: 700 }}>🎨 DALL-E 3 · Imagens ultra-realistas</div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "rgba(220,220,240,0.4)" }}>Formato:</span>
              {IMG_SIZES.map(s => (
                <button key={s.value} onClick={() => setImgSize(s.value)} style={{
                  padding: "4px 10px", borderRadius: 7, border: `1px solid ${imgSize === s.value ? "rgba(255,107,107,0.5)" : "rgba(255,255,255,0.1)"}`,
                  background: imgSize === s.value ? "rgba(255,107,107,0.15)" : "transparent",
                  color: imgSize === s.value ? "#ff6b6b" : "rgba(220,220,240,0.45)",
                  fontSize: 11, cursor: "pointer", fontFamily: "inherit",
                }}>{s.label}</button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 24px 0" }}>
          {(!activeConvo || activeConvo.messages.length === 0) && !streaming && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 16, opacity: 0.7 }}>
              <div style={{
                width: 64, height: 64, borderRadius: 18,
                background: `linear-gradient(135deg,${activeProvider.bg},${activeProvider.border})`,
                border: `1px solid ${activeProvider.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: isImageMode ? 28 : 32, color: activeProvider.color,
              }}>{activeProvider.icon}</div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 6 }}>
                  {isImageMode ? "Geração de Imagens" : `Chat com ${activeProvider.name}`}
                </div>
                <div style={{ fontSize: 13, color: "rgba(220,220,240,0.4)" }}>
                  {isImageMode
                    ? "DALL-E 3 HD · Descreva a imagem que deseja criar"
                    : `${activeProvider.model} · Pronto para conversar`}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", maxWidth: 520 }}>
                {isImageMode ? [
                  "Uma paisagem futurista cyberpunk ultra-realista",
                  "Retrato fotorrealista de um guerreiro medieval",
                  "Cidade à beira-mar ao pôr do sol, 8K",
                  "Floresta encantada com criaturas mágicas",
                ].map(s => (
                  <button key={s} onClick={() => { setInput(s); textareaRef.current?.focus(); }} style={{
                    padding: "8px 14px", borderRadius: 20, border: `1px solid ${activeProvider.border}`,
                    background: activeProvider.bg, color: activeProvider.color, cursor: "pointer",
                    fontSize: 12, fontFamily: "inherit",
                  }}>{s}</button>
                )) : [
                  "O que você pode fazer?", "Explique machine learning",
                  "Escreva um código Python", "Faça um resumo do Brasil",
                ].map(s => (
                  <button key={s} onClick={() => { setInput(s); textareaRef.current?.focus(); }} style={{
                    padding: "8px 14px", borderRadius: 20, border: `1px solid ${activeProvider.border}`,
                    background: activeProvider.bg, color: activeProvider.color, cursor: "pointer",
                    fontSize: 12, fontFamily: "inherit",
                  }}>{s}</button>
                ))}
              </div>
            </div>
          )}

          {activeConvo?.messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} isStreaming={false} />
          ))}

          {streaming && streamMsg === "" && <ThinkingIndicator provider={provider} />}
          {streaming && streamMsg !== "" && (
            <MessageBubble msg={{ role: "assistant", content: streamMsg, provider }} isStreaming={true} />
          )}

          <div ref={bottomRef} style={{ height: 20 }} />
        </div>

        {/* Input area */}
        <div style={{
          padding: "16px 20px 20px", borderTop: "1px solid rgba(255,255,255,0.07)",
          background: "hsl(222 40% 6%)", flexShrink: 0,
        }}>
          <div style={{
            display: "flex", gap: 10, alignItems: "flex-end",
            background: "rgba(255,255,255,0.05)", border: `1px solid ${streaming ? activeProvider.border : "rgba(255,255,255,0.12)"}`,
            borderRadius: 16, padding: "10px 14px", transition: "border-color .2s",
          }}>
            <div style={{ width: 28, height: 28, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: isImageMode ? 16 : 18, color: activeProvider.color }}>
              {activeProvider.icon}
            </div>

            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={isImageMode
                ? "Descreva a imagem que deseja criar… (Enter para gerar)"
                : `Mensagem para ${activeProvider.name}… (Enter para enviar, Shift+Enter para nova linha)`
              }
              disabled={streaming}
              style={{
                flex: 1, background: "transparent", border: "none", outline: "none",
                color: "#dde2f0", fontSize: 14, fontFamily: "inherit", resize: "none",
                lineHeight: 1.55, maxHeight: 160, minHeight: 22, overflow: "auto",
              }}
              rows={1}
              onInput={e => {
                const t = e.currentTarget;
                t.style.height = "auto";
                t.style.height = Math.min(t.scrollHeight, 160) + "px";
              }}
            />

            <button
              onClick={sendMessage}
              disabled={streaming || !input.trim()}
              style={{
                width: 36, height: 36, borderRadius: 10, border: "none", flexShrink: 0,
                background: input.trim() && !streaming ? activeProvider.color : "rgba(255,255,255,0.08)",
                color: input.trim() && !streaming ? "#fff" : "rgba(220,220,240,0.3)",
                cursor: input.trim() && !streaming ? "pointer" : "default",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, transition: "all .15s",
              }}
            >
              {isImageMode ? "🎨" : "↑"}
            </button>
          </div>

          <div style={{ textAlign: "center", marginTop: 8, fontSize: 11, color: "rgba(220,220,240,0.2)" }}>
            OmniChat · Claude, ChatGPT, Gemini, Grok & DALL-E 3 · Ilimitado via Replit AI
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:.4;transform:scale(.85)} 50%{opacity:1;transform:scale(1)} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .thinking-dot { animation: pulse 1.2s ease-in-out infinite; }
        .cursor { animation: pulse 1s ease-in-out infinite; }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        pre { background: rgba(0,0,0,0.35); border-radius: 8px; padding: 12px 14px; overflow-x: auto; font-size: 13px; border: 1px solid rgba(255,255,255,0.08); margin: 8px 0; }
        code { font-family: 'JetBrains Mono', 'Fira Code', monospace; }
      `}</style>
    </div>
  );
}
