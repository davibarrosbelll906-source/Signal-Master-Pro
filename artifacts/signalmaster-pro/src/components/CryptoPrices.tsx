import { useEffect, useState } from "react";
import { RefreshCw, TrendingUp, TrendingDown } from "lucide-react";

interface CoinData {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
  market_cap: number;
  image: string;
  total_volume: number;
}

function fmtPrice(p: number): string {
  if (p >= 1000) return p.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
  if (p >= 1) return p.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  return p.toLocaleString("pt-BR", { minimumFractionDigits: 4, maximumFractionDigits: 6 });
}

function fmtVol(v: number): string {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
  return `$${v.toLocaleString()}`;
}

const COIN_COLORS: Record<string, string> = {
  bitcoin: "#f7931a",
  ethereum: "#627eea",
  solana: "#9945ff",
  binancecoin: "#f3ba2f",
  ripple: "#346aa9",
  dogecoin: "#c2a633",
  cardano: "#0d1e2d",
  "shiba-inu": "#ffa409",
};

export default function CryptoPrices() {
  const [coins, setCoins] = useState<CoinData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchCoins = async () => {
    try {
      setLoading(true);
      setError(false);
      const url =
        "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false&price_change_percentage=24h";
      const res = await fetch(url);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCoins(data);
      setLastUpdate(new Date());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoins();
    const interval = setInterval(fetchCoins, 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="glass-card p-4 flex flex-col h-full min-h-[320px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-yellow-500/15 border border-yellow-500/20 flex items-center justify-center">
            <span className="text-sm">₿</span>
          </div>
          <div>
            <h3 className="text-xs font-bold text-white">Top Criptomoedas</h3>
            <p className="text-[10px] text-gray-600">Preços em tempo real</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdate && (
            <span className="text-[9px] text-gray-600">
              {lastUpdate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <button
            onClick={fetchCoins}
            className="w-6 h-6 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all"
          >
            <RefreshCw size={10} className={`text-gray-500 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1.5 mb-3">
        <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
        <span className="text-[9px] text-yellow-400">CoinGecko API • Ao vivo</span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-12 gap-1 text-[9px] text-gray-600 uppercase tracking-widest mb-1.5 px-1">
        <span className="col-span-5">Moeda</span>
        <span className="col-span-4 text-right">Preço</span>
        <span className="col-span-3 text-right">24h</span>
      </div>

      {/* Coins list */}
      <div className="flex-1 overflow-y-auto space-y-1 scrollbar-hide">
        {loading && !coins.length ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse h-8 bg-white/5 rounded-lg" />
          ))
        ) : error && !coins.length ? (
          <div className="text-center py-8">
            <p className="text-gray-600 text-xs">Erro ao carregar preços</p>
            <button onClick={fetchCoins} className="mt-2 text-yellow-400 text-xs hover:underline">Tentar novamente</button>
          </div>
        ) : (
          coins.map((coin) => {
            const pct = coin.price_change_percentage_24h ?? 0;
            const isUp = pct >= 0;
            const color = COIN_COLORS[coin.id] ?? "#9ca3af";
            return (
              <div
                key={coin.id}
                className="grid grid-cols-12 gap-1 items-center px-2 py-1.5 rounded-lg bg-white/3 hover:bg-white/6 border border-white/5 transition-all"
              >
                {/* Coin */}
                <div className="col-span-5 flex items-center gap-2 min-w-0">
                  <img src={coin.image} alt={coin.name} className="w-5 h-5 rounded-full shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-white uppercase">{coin.symbol}</div>
                    <div className="text-[9px] text-gray-600 truncate">{coin.name}</div>
                  </div>
                </div>

                {/* Price */}
                <div className="col-span-4 text-right">
                  <div className="text-[11px] font-mono font-bold text-white">${fmtPrice(coin.current_price)}</div>
                  <div className="text-[9px] text-gray-600">{fmtVol(coin.total_volume)}</div>
                </div>

                {/* 24h change */}
                <div className={`col-span-3 flex items-center justify-end gap-0.5 ${isUp ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
                  {isUp ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                  <span className="text-[10px] font-bold">{isUp ? "+" : ""}{pct.toFixed(2)}%</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
