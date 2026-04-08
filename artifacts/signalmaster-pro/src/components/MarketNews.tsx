import { useEffect, useState } from "react";
import { Newspaper, ExternalLink, RefreshCw, Wifi, WifiOff } from "lucide-react";

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const diff = (Date.now() - d.getTime()) / 60000;
  if (diff < 1) return "agora";
  if (diff < 60) return `${Math.floor(diff)}min`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h`;
  return `${Math.floor(diff / 1440)}d`;
}

const IMPACT_KEYWORDS: Record<string, { color: string; label: string }> = {
  rate: { color: "text-red-400", label: "JUROS" },
  fed: { color: "text-red-400", label: "FED" },
  inflation: { color: "text-orange-400", label: "INFLAÇÃO" },
  gdp: { color: "text-blue-400", label: "PIB" },
  recession: { color: "text-red-400", label: "RECESSÃO" },
  tariff: { color: "text-orange-400", label: "TARIFAS" },
  bank: { color: "text-blue-400", label: "BANCO" },
  market: { color: "text-green-400", label: "MERCADO" },
  oil: { color: "text-yellow-400", label: "PETRÓLEO" },
  gold: { color: "text-yellow-300", label: "OURO" },
  dollar: { color: "text-blue-300", label: "DÓLAR" },
  china: { color: "text-red-300", label: "CHINA" },
  trade: { color: "text-blue-400", label: "COMÉRCIO" },
  stock: { color: "text-green-400", label: "AÇÕES" },
  crypto: { color: "text-yellow-400", label: "CRIPTO" },
};

function getTag(title: string) {
  const t = title.toLowerCase();
  for (const [kw, cfg] of Object.entries(IMPACT_KEYWORDS)) {
    if (t.includes(kw)) return cfg;
  }
  return null;
}

export default function MarketNews() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchNews = async () => {
    try {
      setLoading(true);
      setError(false);
      const res = await fetch("/api/market/news");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setNews(data);
      setLastUpdate(new Date());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
    const interval = setInterval(fetchNews, 300_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="glass-card p-4 flex flex-col h-full min-h-[320px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/20 flex items-center justify-center">
            <Newspaper size={13} className="text-blue-400" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white">Notícias do Mercado</h3>
            <p className="text-[10px] text-gray-600">Impacto macroeconômico</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdate && (
            <span className="text-[9px] text-gray-600">
              {lastUpdate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <button
            onClick={fetchNews}
            className="w-6 h-6 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all"
          >
            <RefreshCw size={10} className={`text-gray-500 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Connection dot */}
      <div className="flex items-center gap-1.5 mb-3">
        {error ? (
          <><WifiOff size={10} className="text-red-400" /><span className="text-[9px] text-red-400">Sem conexão</span></>
        ) : (
          <><Wifi size={10} className="text-blue-400" /><span className="text-[9px] text-blue-400">Yahoo Finance RSS</span></>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto space-y-2 scrollbar-hide">
        {loading && !news.length ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse space-y-1">
              <div className="h-3 bg-white/5 rounded w-full" />
              <div className="h-2 bg-white/3 rounded w-2/3" />
            </div>
          ))
        ) : error && !news.length ? (
          <div className="text-center py-8">
            <p className="text-gray-600 text-xs">Não foi possível carregar notícias</p>
            <button onClick={fetchNews} className="mt-2 text-blue-400 text-xs hover:underline">Tentar novamente</button>
          </div>
        ) : (
          news.map((item, i) => {
            const tag = getTag(item.title);
            return (
              <a
                key={i}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block group p-2.5 rounded-lg bg-white/3 hover:bg-white/6 border border-white/5 hover:border-white/10 transition-all"
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    {tag && (
                      <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded mb-1 bg-white/5 ${tag.color}`}>
                        {tag.label}
                      </span>
                    )}
                    <p className="text-[11px] text-gray-300 group-hover:text-white leading-tight line-clamp-2 transition-colors">
                      {item.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] text-gray-600">{item.source}</span>
                      {item.pubDate && (
                        <span className="text-[9px] text-gray-700">{timeAgo(item.pubDate)}</span>
                      )}
                    </div>
                  </div>
                  <ExternalLink size={10} className="text-gray-700 group-hover:text-gray-400 shrink-0 mt-0.5 transition-colors" />
                </div>
              </a>
            );
          })
        )}
      </div>
    </div>
  );
}
