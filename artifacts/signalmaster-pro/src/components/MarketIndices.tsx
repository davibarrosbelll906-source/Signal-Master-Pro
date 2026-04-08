import { useEffect, useState } from "react";
import { BarChart2, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";

interface IndexData {
  symbol: string;
  label: string;
  price: number;
  change: number;
  currency: string;
}

const INDEX_ICONS: Record<string, string> = {
  "S&P 500": "📈",
  "NASDAQ": "💻",
  "DOW": "🏦",
  "Russell": "📊",
  "Ouro": "🥇",
  "Petróleo": "🛢️",
  "DXY": "💵",
  "Bitcoin": "₿",
};

const INDEX_COLORS: Record<string, string> = {
  "S&P 500": "#60a5fa",
  "NASDAQ": "#818cf8",
  "DOW": "#34d399",
  "Russell": "#a78bfa",
  "Ouro": "#fbbf24",
  "Petróleo": "#f97316",
  "DXY": "#38bdf8",
  "Bitcoin": "#f7931a",
};

function fmtPrice(price: number, label: string): string {
  if (label === "Ouro" || label === "Petróleo" || label === "DXY" || label === "Bitcoin") {
    if (price >= 1000) return price.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
    return price.toFixed(2);
  }
  if (price >= 1000) return price.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
  return price.toFixed(2);
}

export default function MarketIndices() {
  const [indices, setIndices] = useState<IndexData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchIndices = async () => {
    try {
      setLoading(true);
      setError(false);
      const res = await fetch("/api/market/indices");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setIndices(data);
      setLastUpdate(new Date());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIndices();
    const interval = setInterval(fetchIndices, 60_000);
    return () => clearInterval(interval);
  }, []);

  const advances = indices.filter((i) => i.change >= 0).length;
  const declines = indices.filter((i) => i.change < 0).length;

  return (
    <div className="glass-card p-4 flex flex-col h-full min-h-[320px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-green-500/15 border border-green-500/20 flex items-center justify-center">
            <BarChart2 size={13} className="text-green-400" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white">Índices & Cotações</h3>
            <p className="text-[10px] text-gray-600">Mercados globais</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdate && (
            <span className="text-[9px] text-gray-600">
              {lastUpdate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <button
            onClick={fetchIndices}
            className="w-6 h-6 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all"
          >
            <RefreshCw size={10} className={`text-gray-500 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Market breadth */}
      {!loading && !error && indices.length > 0 && (
        <div className="flex items-center gap-3 mb-3 px-1">
          <div className="flex items-center gap-1">
            <TrendingUp size={10} className="text-[var(--green)]" />
            <span className="text-[10px] font-bold text-[var(--green)]">{advances} em alta</span>
          </div>
          <div className="h-1 flex-1 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--green)] transition-all duration-700"
              style={{ width: `${indices.length ? (advances / indices.length) * 100 : 50}%` }}
            />
          </div>
          <div className="flex items-center gap-1">
            <TrendingDown size={10} className="text-[var(--red)]" />
            <span className="text-[10px] font-bold text-[var(--red)]">{declines} em baixa</span>
          </div>
        </div>
      )}

      {/* Indices grid */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {loading && !indices.length ? (
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse h-16 bg-white/5 rounded-xl" />
            ))}
          </div>
        ) : error && !indices.length ? (
          <div className="text-center py-8">
            <p className="text-gray-600 text-xs">Erro ao carregar índices</p>
            <button onClick={fetchIndices} className="mt-2 text-green-400 text-xs hover:underline">Tentar novamente</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {indices.map((idx) => {
              const isUp = idx.change >= 0;
              const color = INDEX_COLORS[idx.label] ?? "#9ca3af";
              const icon = INDEX_ICONS[idx.label] ?? "📊";
              return (
                <div
                  key={idx.symbol}
                  className="p-2.5 rounded-xl border bg-white/3 hover:bg-white/6 border-white/5 hover:border-white/10 transition-all group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{icon}</span>
                      <span className="text-[10px] font-bold text-gray-400">{idx.label}</span>
                    </div>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                        isUp
                          ? "text-[var(--green)] bg-[var(--green)]/10"
                          : "text-[var(--red)] bg-[var(--red)]/10"
                      }`}
                    >
                      {isUp ? "▲" : "▼"} {Math.abs(idx.change).toFixed(2)}%
                    </span>
                  </div>
                  <div className="font-mono font-black text-white text-sm">
                    {idx.currency === "USD" && idx.label !== "DXY" ? "$" : ""}
                    {fmtPrice(idx.price, idx.label)}
                    {idx.label === "DXY" && <span className="text-[9px] text-gray-600 ml-0.5">pts</span>}
                  </div>
                  {/* Mini trend bar */}
                  <div className="mt-1.5 h-0.5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${isUp ? "bg-[var(--green)]" : "bg-[var(--red)]"}`}
                      style={{ width: `${Math.min(100, Math.abs(idx.change) * 20)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
