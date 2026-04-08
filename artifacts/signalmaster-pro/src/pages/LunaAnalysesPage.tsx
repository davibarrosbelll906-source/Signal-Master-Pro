import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Search, X, ChevronDown, ChevronUp, Tag, Clock, TrendingUp, Star } from "lucide-react";
import { apiClient } from "../lib/apiClient";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Analysis {
  id: number;
  pair: string;
  timeframe: string;
  userQuestion: string;
  lunaResponse: string;
  keyLessons: string[];
  tags: string[];
  thumbnailBase64?: string | null;
  createdAt: string;
}

const PAIRS = ["Todos", "EURUSD", "GBPUSD", "USDJPY", "BTCUSDT", "ETHUSDT", "XAUUSD", "AUDUSD", "USDCAD"];
const TIMEFRAMES = ["Todos", "M1", "M5", "M15", "H1", "H4"];

export default function LunaAnalysesPage() {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterPair, setFilterPair] = useState("Todos");
  const [filterTf, setFilterTf] = useState("Todos");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [starred, setStarred] = useState<Set<number>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem("smpLunaStarred7") || "[]")); }
    catch { return new Set(); }
  });
  const [showStarredOnly, setShowStarredOnly] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<any[]>("/luna/analyses");
      setAnalyses(data.map((a: any) => ({
        ...a,
        keyLessons: typeof a.keyLessons === "string" ? JSON.parse(a.keyLessons) : a.keyLessons,
        tags: typeof a.tags === "string" ? JSON.parse(a.tags) : a.tags,
      })));
    } catch {
      const local = localStorage.getItem("smpLunaAnalyses7");
      if (local) setAnalyses(JSON.parse(local));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleStar = (id: number) => {
    setStarred(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      localStorage.setItem("smpLunaStarred7", JSON.stringify([...next]));
      return next;
    });
  };

  const filtered = analyses
    .filter(a => {
      if (filterPair !== "Todos" && a.pair !== filterPair) return false;
      if (filterTf !== "Todos" && a.timeframe !== filterTf) return false;
      if (showStarredOnly && !starred.has(a.id)) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          a.pair.toLowerCase().includes(q) ||
          a.lunaResponse.toLowerCase().includes(q) ||
          a.userQuestion.toLowerCase().includes(q) ||
          a.tags.some((t: string) => t.toLowerCase().includes(q)) ||
          a.keyLessons.some((l: string) => l.toLowerCase().includes(q))
        );
      }
      return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const allPairs = ["Todos", ...Array.from(new Set(analyses.map(a => a.pair).filter(Boolean)))];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}>📚</div>
            <h1 className="text-2xl font-bold text-white">Minhas Análises com Luna</h1>
          </div>
          <p className="text-gray-400 text-sm ml-13">Revisão do seu aprendizado em análise gráfica</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <BookOpen size={14} />
          <span>{analyses.length} análise{analyses.length !== 1 ? "s" : ""} salva{analyses.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por par, conceito, lição..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white outline-none"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
              <X size={14} />
            </button>
          )}
        </div>

        <select
          value={filterPair}
          onChange={e => setFilterPair(e.target.value)}
          className="px-3 py-2.5 rounded-xl text-sm text-white outline-none"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {allPairs.map(p => <option key={p} value={p} style={{ background: "#1a1a2e" }}>{p}</option>)}
        </select>

        <select
          value={filterTf}
          onChange={e => setFilterTf(e.target.value)}
          className="px-3 py-2.5 rounded-xl text-sm text-white outline-none"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {TIMEFRAMES.map(t => <option key={t} value={t} style={{ background: "#1a1a2e" }}>{t}</option>)}
        </select>

        <button
          onClick={() => setShowStarredOnly(s => !s)}
          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${showStarredOnly ? "text-yellow-400" : "text-gray-400 hover:text-white"}`}
          style={{
            background: showStarredOnly ? "rgba(250,204,21,0.12)" : "rgba(255,255,255,0.06)",
            border: `1px solid ${showStarredOnly ? "rgba(250,204,21,0.3)" : "rgba(255,255,255,0.08)"}`,
          }}
        >
          <Star size={14} fill={showStarredOnly ? "currentColor" : "none"} />
          Favoritas
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-6xl mb-4">🌙</div>
          <h3 className="text-xl font-semibold text-white mb-2">
            {analyses.length === 0 ? "Nenhuma análise salva ainda" : "Nenhum resultado encontrado"}
          </h3>
          <p className="text-gray-500 text-sm max-w-sm">
            {analyses.length === 0
              ? 'Clique em "📸 Analisar gráfico com Luna" no chat para começar sua jornada de aprendizado.'
              : "Tente outros filtros ou termos de busca."}
          </p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence>
            {filtered.map((a, idx) => {
              const isExpanded = expanded === a.id;
              const isStarred = starred.has(a.id);
              return (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ delay: idx * 0.04 }}
                  className="rounded-2xl overflow-hidden flex flex-col"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                >
                  {a.thumbnailBase64 && (
                    <div className="h-36 overflow-hidden relative">
                      <img src={a.thumbnailBase64} alt="Gráfico" className="w-full h-full object-cover" />
                      <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 50%, rgba(10,10,20,0.9))" }} />
                    </div>
                  )}

                  <div className="p-4 flex flex-col flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-lg text-xs font-bold"
                          style={{ background: "rgba(124,58,237,0.2)", color: "#c4b5fd" }}>
                          {a.pair || "—"}
                        </span>
                        <span className="px-2 py-0.5 rounded-lg text-xs"
                          style={{ background: "rgba(0,255,136,0.1)", color: "#00ff88" }}>
                          {a.timeframe || "—"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => toggleStar(a.id)} className="transition-colors"
                          style={{ color: isStarred ? "#facc15" : "#4b5563" }}>
                          <Star size={14} fill={isStarred ? "currentColor" : "none"} />
                        </button>
                        <span className="text-gray-600 text-xs flex items-center gap-1">
                          <Clock size={10} />
                          {format(new Date(a.createdAt), "dd MMM", { locale: ptBR })}
                        </span>
                      </div>
                    </div>

                    <p className="text-gray-400 text-xs italic mb-2 line-clamp-2">"{a.userQuestion}"</p>

                    <p className="text-gray-200 text-sm leading-relaxed mb-3 flex-1"
                      style={{ display: "-webkit-box", WebkitLineClamp: isExpanded ? "none" : 4, WebkitBoxOrient: "vertical", overflow: isExpanded ? "visible" : "hidden" }}>
                      {a.lunaResponse}
                    </p>

                    {a.keyLessons.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {a.keyLessons.slice(0, isExpanded ? undefined : 2).map((lesson: string, i: number) => (
                          <span key={i} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                            style={{ background: "rgba(0,255,136,0.08)", color: "#4ade80" }}>
                            <TrendingUp size={9} /> {lesson}
                          </span>
                        ))}
                        {!isExpanded && a.keyLessons.length > 2 && (
                          <span className="text-xs text-gray-600">+{a.keyLessons.length - 2} mais</span>
                        )}
                      </div>
                    )}

                    {a.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {a.tags.map((tag: string, i: number) => (
                          <span key={i} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full cursor-pointer hover:opacity-80"
                            style={{ background: "rgba(124,58,237,0.15)", color: "#a78bfa" }}
                            onClick={() => setSearch(tag)}>
                            <Tag size={8} /> {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <button
                      onClick={() => setExpanded(isExpanded ? null : a.id)}
                      className="flex items-center gap-1 text-xs transition-colors mt-auto"
                      style={{ color: "#7c3aed" }}
                    >
                      {isExpanded ? <><ChevronUp size={12} /> Recolher</> : <><ChevronDown size={12} /> Ver análise completa</>}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
