import { useState, useEffect, useRef, useCallback } from "react";
import TradingViewWidget from "@/components/TradingViewWidget";
import PairMonitorCard from "@/components/PairMonitorCard";
import ManagementPanel from "@/components/ManagementPanel";
import { Clock, Cpu, Layers, Copy, CheckCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ASSET_CATEGORIES, TV_SYMBOLS,
  getCurrentSession, runEngine, runEngineDiag, updateMLWeights,
  playSignalSound, vibrate, unlockAudio, isAudioUnlocked,
  type CandleBuffer, type SignalResult, type DiagResult
} from "@/lib/signalEngine";
import { subscribeAsset } from "@/lib/assetDataManager";
import { useAccountMode } from "@/lib/useAccountMode";
import { useSignalStore, type LunaExplanation, type NewsBlackout } from "@/lib/signalStore";
import { socket } from "@/lib/socket";
// Ebinex Crypto Pairs
const CRYPTO_ASSETS = [
  'BTCUSD', 'ETHUSD', 'SOLUSD', 'BNBUSD', 'XRPUSD',
  'ADAUSD', 'DOGEUSD', 'LTCUSD', 'AVAXUSD', 'DOTUSD',
  'LINKUSD', 'MATICUSD',
];

const ASSET_ICONS: Record<string, string> = {
  BTCUSD: '₿', ETHUSD: 'Ξ', SOLUSD: '◎', BNBUSD: '⬡',
  XRPUSD: '✕', ADAUSD: '₳', DOGEUSD: 'Ð', LTCUSD: 'Ł',
  AVAXUSD: '🔺', DOTUSD: '●', LINKUSD: '⬡', MATICUSD: '⬟',
};

const QUALITY_COLORS: Record<string, string> = {
  ULTRA:   'text-amber-200 border-amber-400/60 bg-gradient-to-r from-amber-500/25 via-yellow-300/15 to-amber-500/25 shadow-[0_0_12px_rgba(251,191,36,0.4)]',
  ELITE:   'text-white border-white/40 bg-gradient-to-r from-yellow-400/20 via-white/10 to-yellow-400/20',
  PREMIUM: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10',
  FORTE:   'text-[var(--green)] border-[var(--green)]/30 bg-[var(--green)]/10',
  MÉDIO:   'text-blue-400 border-blue-400/30 bg-blue-400/10',
  FRACO:   'text-gray-400 border-gray-400/30 bg-gray-400/10',
};

const REGIME_CONFIG = {
  TRENDING: { label: 'TENDÊNCIA', icon: '📈', color: 'text-[var(--green)] bg-[var(--green)]/10 border-[var(--green)]/25', tip: 'Mercado em tendência — condição ideal para sinais' },
  RANGING:  { label: 'LATERAL',   icon: '↔️', color: 'text-blue-400 bg-blue-400/10 border-blue-400/25',             tip: 'Mercado lateral — aguarde confirmação antes de entrar' },
  CHOPPY:   { label: 'CAÓTICO',   icon: '⚡', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/25',         tip: 'Mercado instável — evite entrar neste momento' },
};

export default function SignalsPage() {
  const [asset, setAsset] = useState('BTCUSD');
  const [category, setCategory] = useState<'crypto'>('crypto');
  const [seconds, setSeconds] = useState(new Date().getSeconds());
  const [signal, setSignal] = useState<SignalResult | null>(null);
  const [pendingSignal, setPendingSignal] = useState<SignalResult | null>(null);
  const [bufferSize, setBufferSize] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [lastPrice, setLastPrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState(0);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [streak, setStreak] = useState(0);
  const [recentTrades, setRecentTrades] = useState<any[]>([]);
  const [engineStatus, setEngineStatus] = useState('aguardando dados...');
  const [lastDiag, setLastDiag] = useState<DiagResult | null>(null);
  const [lastDiagTime, setLastDiagTime] = useState<Date | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualAsset, setManualAsset] = useState('');
  const [manualDir, setManualDir] = useState<'CALL'|'PUT'>('CALL');
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [copied, setCopied] = useState(false);
  const { isReal, mode, broker } = useAccountMode();
  const [timeframe, setTimeframe] = useState<'M1' | 'M5' | 'M15'>(() => {
    return (localStorage.getItem('smpTimeframe') as 'M1' | 'M5' | 'M15') || 'M1';
  });
  const [multiPairMode, setMultiPairMode] = useState(false);
  const [watchedPairs, setWatchedPairs] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('smpWatchedPairs') || '["BTCUSD","ETHUSD","SOLUSD","XRPUSD"]'); } catch { return ['BTCUSD', 'ETHUSD', 'SOLUSD', 'XRPUSD']; }
  });
  const [lunaExplanation, setLunaExplanation] = useState<LunaExplanation | null>(null);
  const [lunaLoading, setLunaLoading] = useState(false);
  const lunaExplanations = useSignalStore((s) => s.lunaExplanations);
  const newsBlackouts = useSignalStore((s) => s.newsBlackouts);
  const activeNewsBlackout: NewsBlackout | null = newsBlackouts[asset] ?? null;

  // ── Calendário Econômico + Notícias ──
  const [newsTab, setNewsTab] = useState<'calendar' | 'news'>('calendar');
  const [calendarEvents, setCalendarEvents] = useState<Array<{
    title: string; country: string; impact: string; date: string; minutesUntil: number;
  }>>([]);
  const [marketNews, setMarketNews] = useState<Array<{
    title: string; link: string; pubDate: string; source: string;
  }>>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [newsLoading, setNewsLoading] = useState(false);

  const MAX_PAIRS = 5;
  const ALL_ASSETS = [...CRYPTO_ASSETS];

  const bufRef = useRef<CandleBuffer>({ m1: [], m5: [], m15: [] });
  const lastFiredByPairRef = useRef<Map<string, number>>(new Map());

  const refreshStats = () => {
    try {
      const hist = JSON.parse(localStorage.getItem('smpH7') || '[]');
      const today = new Date().toDateString();
      const todayHist = hist.filter((h: any) => new Date(h.ts).toDateString() === today);
      setWins(todayHist.filter((h: any) => h.result === 'win').length);
      setLosses(todayHist.filter((h: any) => h.result === 'loss').length);
      setRecentTrades([...todayHist].reverse().slice(0, 10));
      let s = 0;
      for (let i = hist.length - 1; i >= 0; i--) {
        if (!hist[i].result) break;
        if (i === hist.length - 1) { s = hist[i].result === 'win' ? 1 : -1; }
        else if (hist[i].result === 'win' && s > 0) s++;
        else if (hist[i].result === 'loss' && s < 0) s--;
        else break;
      }
      setStreak(s);
    } catch {}
  };

  // Load stats from localStorage
  useEffect(() => { refreshStats(); }, []);

  // Sync audio unlocked state (poll every 2s in case user unlocks via other means)
  useEffect(() => {
    setAudioEnabled(isAudioUnlocked());
    const id = setInterval(() => setAudioEnabled(isAudioUnlocked()), 2000);
    return () => clearInterval(id);
  }, []);

  // Luna Mode — lido do localStorage
  const [lunaMode] = useState<boolean>(() => {
    try {
      const cfg = JSON.parse(localStorage.getItem('smpCfg7') || '{}');
      return cfg.lunaMode ?? false;
    } catch { return false; }
  });

  // Persist timeframe + re-sync on reconnect
  useEffect(() => {
    localStorage.setItem('smpTimeframe', timeframe);
    socket.emit('change_timeframe', timeframe);
  }, [timeframe]);

  // Sync lunaMode to backend whenever it changes or on mount
  useEffect(() => {
    socket.emit('set_luna_mode', lunaMode);
  }, [lunaMode]);

  // Re-envia o timeframe + lunaMode toda vez que o socket reconecta (ex: servidor reiniciou)
  useEffect(() => {
    const handleReconnect = () => {
      socket.emit('change_timeframe', timeframe);
      socket.emit('set_luna_mode', lunaMode);
    };
    socket.on('connect', handleReconnect);
    return () => { socket.off('connect', handleReconnect); };
  }, [timeframe, lunaMode]);

  // Reset Luna state when new signal fires for this asset
  useEffect(() => {
    if (!signal) return;
    setLunaExplanation(null);
    setLunaLoading(true);
    // Race-condition guard: explanation may already have arrived
    const existing = lunaExplanations[signal.asset];
    if (existing) {
      setLunaExplanation(existing);
      setLunaLoading(false);
    }
    // Auto-timeout: if no explanation in 15s, stop showing loading
    const timeout = setTimeout(() => setLunaLoading(false), 15000);
    return () => clearTimeout(timeout);
  }, [signal?.ts]);

  // Watch for Luna explanation arriving for the currently displayed asset
  useEffect(() => {
    if (!signal) return;
    const explanation = lunaExplanations[signal.asset];
    if (explanation) {
      setLunaExplanation(explanation);
      setLunaLoading(false);
    }
  }, [lunaExplanations, signal?.asset]);

  // Persist watched pairs
  useEffect(() => {
    localStorage.setItem('smpWatchedPairs', JSON.stringify(watchedPairs));
  }, [watchedPairs]);

  const togglePair = (a: string) => {
    setWatchedPairs(prev => {
      if (prev.includes(a)) return prev.filter(p => p !== a);
      if (prev.length >= MAX_PAIRS) return prev;
      return [...prev, a];
    });
  };

  // Subscribe to shared asset data (one connection per asset, shared with Multi-Par cards)
  const unsubRef = useRef<(() => void) | null>(null);

  const connectAsset = useCallback((sym: string) => {
    if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; }
    bufRef.current = { m1: [], m5: [], m15: [] };
    setBufferSize(0);
    setIsConnected(false);
    setEngineStatus('conectando...');
    const subId = `signals-page-${sym}`;
    unsubRef.current = subscribeAsset(sym, subId, (buf, p, _dir, connected, bufSize) => {
      bufRef.current = buf;
      setLastPrice(p);
      setIsConnected(connected);
      setBufferSize(bufSize);
      if (connected && bufSize >= 30) {
        setEngineStatus(`${bufSize} velas carregadas — aguardando segundo :48`);
      } else if (!connected) {
        setEngineStatus('conectando...');
      }
    });
  }, []);

  // Handle asset change
  const handleAssetChange = useCallback((newAsset: string) => {
    setAsset(newAsset);
    setSignal(null);
    setPendingSignal(null);
    setCategory('crypto');
    connectAsset(newAsset);
  }, [connectAsset]);

  // Initial load
  useEffect(() => {
    connectAsset('BTCUSD');
    return () => { if (unsubRef.current) unsubRef.current(); };
  }, []);

  // Helper: should the engine fire now given timeframe?
  const shouldFireNow = (sec: number, min: number, tf: 'M1' | 'M5' | 'M15'): boolean => {
    if (sec !== 48) return false;
    if (tf === 'M1') return true;
    // Dispara no segundo :48 do minuto de ABERTURA do candle (alinhado com corretoras)
    // M5:  minutos 0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55
    // M15: minutos 0, 15, 30, 45
    if (tf === 'M5') return min % 5 === 0;
    if (tf === 'M15') return min % 15 === 0;
    return false;
  };

  // Helper: segundos até o próximo sinal (usando fórmula getNextSignalMinute)
  const getSecsToNext = (min: number, sec: number, tf: 'M1' | 'M5' | 'M15'): number => {
    if (tf === 'M1') return sec <= 48 ? 48 - sec : 60 - sec + 48;
    const interval = tf === 'M5' ? 5 : 15;

    // Encontra o próximo minuto de disparo
    let nextMin: number;
    if (min % interval === 0 && sec < 48) {
      // Ainda dentro da janela do minuto atual (não disparou ainda)
      nextMin = min;
    } else {
      // Avança para o próximo múltiplo de `interval`
      nextMin = Math.ceil((min + 1) / interval) * interval;
      if (nextMin >= 60) nextMin -= 60; // volta ao próximo ciclo
    }

    let secsLeft: number;
    if (nextMin > min) {
      secsLeft = (nextMin - min) * 60 + 48 - sec;
    } else if (nextMin === min) {
      secsLeft = 48 - sec;
    } else {
      // Cruzou a hora (ex: 59→00)
      secsLeft = (60 - min + nextMin) * 60 + 48 - sec;
    }
    return Math.max(1, secsLeft);
  };

  // 1-second tick — emit signal based on selected timeframe
  useEffect(() => {
    const tick = setInterval(() => {
      const now = new Date();
      const sec = now.getSeconds();
      const min = now.getMinutes();
      setSeconds(sec);

      if (shouldFireNow(sec, min, timeframe)) {
        const buf = bufRef.current;
        if (buf.m1.length < 30) {
          setEngineStatus(`aguardando dados... (${buf.m1.length}/30 velas)`);
          return;
        }

        // Anti-overtrade: máximo 1 sinal por par a cada 4 minutos
        const lastFired = lastFiredByPairRef.current.get(asset) || 0;
        const elapsed = Date.now() - lastFired;
        if (elapsed < 240_000) {
          const remaining = Math.ceil((240_000 - elapsed) / 60000);
          setEngineStatus(`anti-overtrade: próximo sinal em ${remaining}min`);
          return;
        }

        setEngineStatus('calculando indicadores...');
        try {
          const diag = runEngineDiag(buf, asset, lunaMode);
          if (diag) { setLastDiag(diag); setLastDiagTime(new Date()); }

          const result = runEngine(buf, asset, lunaMode);
          if (result) {
            lastFiredByPairRef.current.set(asset, Date.now());
            setSignal(result);
            setPendingSignal(result);
            const soundType = result.quality === 'ULTRA' ? 'ultra' : result.quality === 'ELITE' || result.quality === 'PREMIUM' ? 'premium' : category === 'crypto' ? 'crypto' : 'forte';
            playSignalSound(soundType);
            vibrate('forte');
            setEngineStatus(`sinal ${result.quality} ${timeframe} emitido — marque WIN ou LOSS`);
          } else {
            setEngineStatus(diag?.blockedBy ? `bloqueado: ${diag.blockedBy}` : 'sem sinal — aguardando próximo ciclo');
          }
        } catch {
          setEngineStatus('erro no motor — verificando dados');
        }
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [asset, category, timeframe]);

  // WIN/LOSS handlers
  const handleResult = (type: 'win' | 'loss') => {
    if (!pendingSignal) return;
    playSignalSound(type);
    vibrate(type);
    const histEntry = { ...pendingSignal, result: type, id: Date.now(), ts: pendingSignal.ts || Date.now() };
    try {
      const hist = JSON.parse(localStorage.getItem('smpH7') || '[]');
      hist.push(histEntry);
      localStorage.setItem('smpH7', JSON.stringify(hist));
    } catch {}
    updateMLWeights(pendingSignal, type);
    setPendingSignal(null);
    refreshStats();
  };

  // Manual WIN/LOSS entry (without a signal)
  const handleManualResult = (type: 'win' | 'loss') => {
    playSignalSound(type);
    vibrate(type);
    const entry = {
      asset: manualAsset || asset,
      direction: manualDir,
      category: ASSET_CATEGORIES[manualAsset || asset] || 'crypto',
      result: type,
      score: 0,
      quality: 'MANUAL',
      sess: getCurrentSession(),
      ts: Date.now(),
      id: Date.now(),
      manual: true
    };
    try {
      const hist = JSON.parse(localStorage.getItem('smpH7') || '[]');
      hist.push(entry);
      localStorage.setItem('smpH7', JSON.stringify(hist));
    } catch {}
    setShowManualEntry(false);
    refreshStats();
  };

  const total = wins + losses;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

  // Timeframe-aware countdown
  const nowMin = new Date().getMinutes();
  const timeToNext = getSecsToNext(nowMin, seconds, timeframe);
  const tfTotalSecs = timeframe === 'M1' ? 60 : timeframe === 'M5' ? 300 : 900;
  const progressPct = Math.max(0, Math.min(100, ((tfTotalSecs - timeToNext) / tfTotalSecs) * 100));
  const isFiring = seconds === 48 && shouldFireNow(seconds, nowMin, timeframe);

  const sess = getCurrentSession();
  const sessLabels: Record<string, string> = {
    london: 'Londres 🇬🇧', overlap: 'Overlap 🌍', ny: 'Nova York 🇺🇸', asia: 'Ásia 🌏'
  };

  const chartRef = useRef<HTMLDivElement>(null);
  const tradeStats = `W:${wins} L:${losses} WR:${winRate}% Streak:${streak > 0 ? '+' + streak + 'W' : streak < 0 ? streak + 'L' : '-'}`;

  // Fetch do calendário econômico
  useEffect(() => {
    const load = async () => {
      setCalendarLoading(true);
      try {
        const r = await fetch('/api/market/calendar');
        if (r.ok) setCalendarEvents(await r.json());
      } catch {} finally { setCalendarLoading(false); }
    };
    load();
    const t = setInterval(load, 5 * 60 * 1000); // refresh a cada 5min
    return () => clearInterval(t);
  }, []);

  // Fetch das notícias
  useEffect(() => {
    if (newsTab !== 'news' || marketNews.length > 0) return;
    const load = async () => {
      setNewsLoading(true);
      try {
        const r = await fetch('/api/market/news');
        if (r.ok) setMarketNews(await r.json());
      } catch {} finally { setNewsLoading(false); }
    };
    load();
  }, [newsTab]);

  // Helpers para calendário
  const fmtCountdown = (min: number) => {
    if (Math.abs(min) < 1) return 'AGORA';
    if (min < 0) return `há ${Math.abs(min)}min`;
    if (min < 60) return `em ${min}min`;
    return `em ${Math.floor(min / 60)}h${min % 60 > 0 ? String(min % 60).padStart(2, '0') + 'min' : ''}`;
  };

  const COUNTRY_FLAG: Record<string, string> = {
    USD: '🇺🇸', EUR: '🇪🇺', GBP: '🇬🇧', JPY: '🇯🇵', AUD: '🇦🇺',
    CAD: '🇨🇦', NZD: '🇳🇿', CHF: '🇨🇭', CNY: '🇨🇳', ALL: '🌐',
  };

  // Crypto assets are not directly affected by fiat currency events
  const isBlackoutEvent = (_ev: typeof calendarEvents[0]) => false;

  const copySignal = () => {
    if (!signal) return;
    navigator.clipboard.writeText(`${signal.direction} ${signal.asset} ${timeframe} Score:${signal.score} ${signal.quality}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto relative space-y-5 pb-10">

      {/* DEMO watermark */}
      {!isReal && (
        <div className="pointer-events-none fixed inset-0 z-10 flex items-center justify-center overflow-hidden" style={{ top: 0, left: 240 }}>
          <div className="text-[120px] font-black text-blue-500/[0.04] select-none rotate-[-30deg] tracking-widest whitespace-nowrap">DEMO DEMO DEMO</div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          TOP HEADER — Asset selector + Session + Controls
      ═══════════════════════════════════════════════════════════ */}
      <div className="glass-card p-4 space-y-3">

        {/* Row 1: Ebinex crypto pairs + price */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--green)]/8 border border-[var(--green)]/20">
            <span className="text-[var(--green)] text-xs font-black">₿</span>
            <span className="text-[var(--green)] text-[10px] font-bold uppercase tracking-widest">Ebinex Crypto</span>
          </div>

          <div className="flex flex-wrap gap-1.5 flex-1">
            {CRYPTO_ASSETS.map(a => (
              <button key={a} onClick={() => handleAssetChange(a)} className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                asset === a
                  ? 'bg-[var(--green)]/20 text-[var(--green)] border border-[var(--green)]/30 shadow-[0_0_8px_rgba(0,255,136,0.12)]'
                  : 'bg-white/4 text-gray-400 hover:text-white border border-white/5 hover:border-white/10'
              }`}>
                {ASSET_ICONS[a] || ''} {a.replace('USD', '')}
              </button>
            ))}
          </div>

          {lastPrice && (
            <div className="flex items-baseline gap-1.5 ml-auto">
              <span className="font-mono text-white font-bold text-lg">
                {lastPrice < 10 ? lastPrice.toFixed(5) : lastPrice < 1000 ? lastPrice.toFixed(4) : lastPrice.toFixed(2)}
              </span>
              {priceChange !== 0 && (
                <span className={`text-xs font-bold ${priceChange >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                  {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(3)}%
                </span>
              )}
            </div>
          )}
        </div>

        {/* Row 2: Session | Countdown | Stats | Timeframe | Controls */}
        <div className="flex flex-wrap items-center gap-4">

          {/* Connection + session */}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[var(--green)] animate-pulse' : 'bg-red-400'}`} />
            <span className="text-sm font-semibold text-white">{sessLabels[sess] || sess}</span>
          </div>

          <div className="w-px h-6 bg-white/10" />

          {/* Countdown */}
          <div className="flex items-center gap-2">
            <div className="relative w-10 h-10">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 40 40">
                <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                <circle cx="20" cy="20" r="16" fill="none"
                  stroke={isFiring ? 'var(--green)' : 'var(--blue)'}
                  strokeWidth="3" strokeLinecap="round"
                  strokeDasharray="100.5"
                  strokeDashoffset={100.5 * (1 - progressPct / 100)}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                {isFiring ? <span className="text-[8px] font-black text-[var(--green)] animate-pulse">⚡</span> : (
                  <span className="text-[10px] font-bold font-mono tabular-nums text-white">
                    {timeToNext < 60 ? timeToNext : `${Math.floor(timeToNext/60)}:${String(timeToNext%60).padStart(2,'0')}`}
                  </span>
                )}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500 leading-none">próx. sinal</div>
              <div className="text-xs font-bold text-white leading-none mt-0.5">{timeframe}</div>
            </div>
          </div>

          <div className="w-px h-6 bg-white/10" />

          {/* Day stats */}
          <div className="flex items-center gap-3">
            <div className="text-center">
              <div className="text-xl font-black text-[var(--green)] leading-none">{wins}</div>
              <div className="text-[9px] text-gray-600 uppercase tracking-widest">WIN</div>
            </div>
            <div className="text-gray-700 text-lg font-thin">/</div>
            <div className="text-center">
              <div className="text-xl font-black text-[var(--red)] leading-none">{losses}</div>
              <div className="text-[9px] text-gray-600 uppercase tracking-widest">LOSS</div>
            </div>
            {total > 0 && (
              <>
                <div className="w-px h-6 bg-white/10" />
                <div className="text-center">
                  <div className={`text-xl font-black leading-none ${winRate >= 65 ? 'text-[var(--green)]' : winRate >= 50 ? 'text-yellow-400' : 'text-[var(--red)]'}`}>{winRate}%</div>
                  <div className="text-[9px] text-gray-600 uppercase tracking-widest">WR</div>
                </div>
                {streak !== 0 && (
                  <>
                    <div className="w-px h-6 bg-white/10" />
                    <div className={`px-2 py-0.5 rounded-lg text-xs font-black ${streak > 0 ? 'bg-[var(--green)]/10 text-[var(--green)]' : 'bg-[var(--red)]/10 text-[var(--red)]'}`}>
                      {streak > 0 ? `🔥 +${streak}W` : `❄️ ${streak}L`}
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Timeframe toggle */}
            <div className="flex gap-1 bg-white/5 p-0.5 rounded-lg">
              {(['M1','M5','M15'] as const).map(tf => (
                <button key={tf} onClick={() => { setTimeframe(tf); setSignal(null); setPendingSignal(null); }}
                  className={`px-2.5 py-1 rounded-md text-xs font-black transition-all ${
                    timeframe === tf ? 'bg-[var(--green)] text-black' : 'text-gray-500 hover:text-white'
                  }`}>{tf}</button>
              ))}
            </div>

            {/* Real/Demo badge */}
            <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-black text-xs ${
              isReal ? 'bg-red-500/15 text-red-400 border border-red-500/20' : 'bg-blue-500/12 text-blue-400 border border-blue-500/20'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full bg-current ${isReal ? 'animate-pulse' : ''}`} />
              {isReal ? 'REAL' : 'DEMO'}
            </span>

            {/* Multi-par toggle */}
            <button onClick={() => setMultiPairMode(v => !v)} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold transition-all ${
              multiPairMode ? 'border-[var(--green)] text-[var(--green)] bg-[var(--green)]/10' : 'border-white/15 text-gray-500 hover:text-white bg-white/4'
            }`}>
              <Layers size={10} />
              {multiPairMode ? `Multi (${watchedPairs.length})` : 'Multi-Par'}
            </button>

            {/* Audio toggle */}
            <button onClick={async () => { const ok = await unlockAudio(); setAudioEnabled(ok); if (ok) playSignalSound('alert'); }}
              className={`px-2.5 py-1 rounded-full border text-xs font-bold transition-all ${
                audioEnabled ? 'border-[var(--green)] text-[var(--green)] bg-[var(--green)]/10' : 'border-yellow-500/60 text-yellow-400 bg-yellow-500/8 animate-pulse'
              }`}>
              {audioEnabled ? '🔔' : '🔇'}
            </button>

            {/* News blackout */}
            {activeNewsBlackout && (Date.now() - activeNewsBlackout.at < 900_000) && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/10 border border-red-500/20">
                <span className="text-[10px]">📰</span>
                <span className="text-red-400 text-[10px] font-bold">
                  {activeNewsBlackout.event.slice(0, 16)}{activeNewsBlackout.minutesUntil > 0 ? ` ${activeNewsBlackout.minutesUntil}min` : ''}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          MULTI-PAR MODE
      ═══════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {multiPairMode && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
            <div className="rounded-2xl border border-white/8 overflow-hidden" style={{ background: 'rgba(12,12,24,0.7)', backdropFilter: 'blur(16px)' }}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[var(--green)]/10 flex items-center justify-center"><Layers size={14} className="text-[var(--green)]" /></div>
                  <div>
                    <div className="text-sm font-bold text-white">Monitor Multi-Par</div>
                    <div className="text-[10px] text-gray-600">Até {MAX_PAIRS} pares simultâneos</div>
                  </div>
                </div>
                <div className="flex gap-1">{Array.from({ length: MAX_PAIRS }).map((_, i) => (
                  <div key={i} className={`w-5 h-1.5 rounded-full ${i < watchedPairs.length ? 'bg-[var(--green)]' : 'bg-white/10'}`} />
                ))}</div>
              </div>
              <div className="p-4 space-y-4">
                {[{ label: '₿ Ebinex Crypto', color: 'yellow', assets: CRYPTO_ASSETS }].map(({ label, color, assets }) => (
                  <div key={label}>
                    <div className={`text-[10px] font-black text-${color}-400/80 uppercase tracking-widest mb-2`}>{label}</div>
                    <div className="flex flex-wrap gap-2">
                      {assets.map(a => {
                        const sel = watchedPairs.includes(a); const full = !sel && watchedPairs.length >= MAX_PAIRS;
                        return (
                          <button key={a} onClick={() => togglePair(a)} disabled={full} className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                            sel ? `bg-${color}-400/12 text-${color}-300 border-${color}-400/25` : full ? 'bg-white/2 text-gray-800 border-white/5 cursor-not-allowed' : `bg-white/4 text-gray-400 border-white/8 hover:text-${color}-400`
                          }`}>{ASSET_ICONS[a] || ''} {a.replace('USD','')}{sel && <span className={`inline-block w-1.5 h-1.5 rounded-full bg-${color}-400 ml-1.5 align-middle`} />}</button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {watchedPairs.length >= MAX_PAIRS && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-yellow-400/5 border border-yellow-400/10">
                    <span className="text-yellow-400">⚠</span>
                    <span className="text-[11px] text-yellow-400/80">Limite atingido. Remova um par para adicionar outro.</span>
                  </div>
                )}
              </div>
            </div>
            {watchedPairs.length === 0 ? (
              <div className="rounded-2xl border border-white/5 p-10 text-center" style={{ background: 'rgba(12,12,24,0.5)' }}>
                <div className="text-3xl mb-3">📡</div>
                <div className="text-gray-400 font-semibold mb-1">Nenhum par selecionado</div>
              </div>
            ) : (
              <div className={`grid gap-4 ${watchedPairs.length <= 2 ? 'grid-cols-1 sm:grid-cols-2' : watchedPairs.length === 3 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'}`}>
                <AnimatePresence>
                  {watchedPairs.map(a => <PairMonitorCard key={a} asset={a} timeframe={timeframe} onRemove={() => togglePair(a)} />)}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════
          SINGLE MODE — Main 8/4 grid
      ═══════════════════════════════════════════════════════════ */}
      {!multiPairMode && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">

          {/* ─── LEFT COLUMN (8/12): Signal card + Chart ─── */}
          <div className="xl:col-span-8 space-y-4">

            {/* ENGINE STATUS strip */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/3 border border-white/6">
              <Cpu size={12} className="text-gray-500 flex-shrink-0" />
              <span className="text-xs text-gray-400 truncate">{engineStatus}</span>
              <span className="ml-auto text-[10px] text-gray-600">{bufferSize} velas</span>
            </div>

            {/* ──── MAIN SIGNAL CARD ──── */}
            <AnimatePresence mode="wait">
              {signal ? (
                <motion.div key={signal.ts} initial={{ opacity: 0, scale: 0.97, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ type: 'spring', damping: 20, stiffness: 220 }}
                  className={`relative rounded-3xl overflow-hidden border ${
                    signal.quality === 'ULTRA'
                      ? 'border-amber-400/50 shadow-[0_0_60px_rgba(251,191,36,0.15),0_0_120px_rgba(251,191,36,0.06)]'
                      : signal.direction === 'CALL'
                        ? 'border-[var(--green)]/25 shadow-[0_0_50px_rgba(0,255,136,0.08)]'
                        : 'border-[var(--red)]/25 shadow-[0_0_50px_rgba(255,68,102,0.08)]'
                  }`}
                  style={{ background: 'rgba(10,10,20,0.85)', backdropFilter: 'blur(20px)' }}
                >
                  {/* ULTRA shimmer lines */}
                  {signal.quality === 'ULTRA' && (
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/70 to-transparent animate-pulse" />
                      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent animate-pulse" />
                    </div>
                  )}

                  {/* Glow blob */}
                  <div className={`absolute -top-16 -right-16 w-64 h-64 rounded-full blur-3xl opacity-15 pointer-events-none ${
                    signal.quality === 'ULTRA' ? 'bg-amber-400' : signal.direction === 'CALL' ? 'bg-[var(--green)]' : 'bg-[var(--red)]'
                  }`} />

                  <div className="relative p-8 md:p-10">
                    {/* Top row: pair + timeframe + quality badge + regime */}
                    <div className="flex items-start justify-between mb-8">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl font-black">
                          {ASSET_ICONS[signal.asset] || signal.asset.slice(0,2)}
                        </div>
                        <div>
                          <div className="text-2xl font-black text-white leading-none">{signal.asset}</div>
                          <div className="text-sm text-gray-500 mt-1">{timeframe} • {sessLabels[signal.sess] || signal.sess}</div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className={`px-4 py-1.5 rounded-full text-sm font-black border ${QUALITY_COLORS[signal.quality] || ''} ${signal.quality === 'ULTRA' ? 'animate-pulse' : ''}`}>
                          {signal.quality === 'ULTRA' ? '⚡' : signal.quality === 'ELITE' ? '👑' : signal.quality === 'PREMIUM' ? '💎' : signal.quality === 'FORTE' ? '🟢' : '🟡'} {signal.quality}
                        </div>
                        {signal.marketRegime && (() => {
                          const rc = REGIME_CONFIG[signal.marketRegime as keyof typeof REGIME_CONFIG];
                          return rc ? <div className={`px-3 py-1 rounded-full text-xs font-bold border ${rc.color}`}>{rc.icon} {rc.label}</div> : null;
                        })()}
                      </div>
                    </div>

                    {/* Center: CALL/PUT + Score */}
                    <div className="flex items-center justify-center gap-8 mb-8">
                      <div className="text-center">
                        <div className={`text-8xl md:text-9xl font-black leading-none tracking-tight ${
                          signal.quality === 'ULTRA' ? 'text-amber-300' : signal.direction === 'CALL' ? 'text-[var(--green)]' : 'text-[var(--red)]'
                        }`}>
                          {signal.direction === 'CALL' ? '▲' : '▼'}
                        </div>
                        <div className={`text-4xl font-black leading-none mt-1 ${
                          signal.quality === 'ULTRA' ? 'text-amber-200' : signal.direction === 'CALL' ? 'text-[var(--green)]' : 'text-[var(--red)]'
                        }`}>
                          {signal.direction}
                        </div>
                      </div>
                      <div className="w-px h-32 bg-white/8" />
                      <div className="text-center">
                        <div className={`text-7xl md:text-8xl font-black leading-none tabular-nums ${signal.quality === 'ULTRA' ? 'text-amber-300' : 'text-white'}`}>
                          {signal.score}
                        </div>
                        <div className="text-sm text-gray-500 uppercase tracking-widest mt-1">Score</div>
                        <div className="mt-2 text-xs text-gray-600 flex items-center justify-center gap-1">
                          <Clock size={10} /> {timeframe === 'M1' ? '1' : timeframe === 'M5' ? '5' : '15'}min expiração
                        </div>
                      </div>
                    </div>

                    {/* Copy signal button */}
                    <div className="flex justify-center mb-6">
                      <button onClick={copySignal} className={`flex items-center gap-3 px-10 py-4 rounded-2xl font-black text-lg transition-all active:scale-95 ${
                        copied
                          ? 'bg-[var(--green)] text-black'
                          : signal.quality === 'ULTRA'
                            ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-black hover:brightness-110'
                            : 'bg-white text-black hover:bg-gray-100'
                      }`}>
                        {copied ? <><CheckCheck size={20} /> Copiado!</> : <><Copy size={20} /> Copiar Sinal</>}
                      </button>
                    </div>

                    {/* Consensus / votes summary */}
                    {signal.votes && Object.keys(signal.votes).length > 0 && (
                      <div className="flex flex-wrap justify-center gap-2 mb-6">
                        {Object.entries(signal.votes).slice(0, 5).map(([ind, dir]) => (
                          <span key={ind} className={`px-2.5 py-1 rounded-full border text-xs font-bold ${dir === signal.direction ? 'bg-[var(--green)]/8 border-[var(--green)]/20 text-[var(--green)]' : 'bg-white/4 border-white/8 text-gray-500'}`}>
                            {ind}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Claude Analyst verdict */}
                    {(signal as any).claudeAnalysis && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-4 px-4 py-3 rounded-2xl border border-indigo-500/20 bg-indigo-950/30"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-700 flex items-center justify-center text-[11px] flex-shrink-0">🤖</div>
                          <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Analista IA</span>
                          {(signal as any).claudeVote && (
                            <span className={`ml-auto text-[10px] font-black px-2 py-0.5 rounded-full border ${
                              (signal as any).claudeVote === 'CONFIRM'
                                ? 'text-[var(--green)] border-[var(--green)]/30 bg-[var(--green)]/8'
                                : (signal as any).claudeVote === 'REJECT'
                                ? 'text-red-400 border-red-500/30 bg-red-900/20'
                                : 'text-gray-400 border-white/10 bg-white/5'
                            }`}>
                              {(signal as any).claudeVote === 'CONFIRM' ? '✓ CONFIRMA' : (signal as any).claudeVote === 'REJECT' ? '✗ REJEITA' : '→ NEUTRO'}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-300 text-xs leading-relaxed pl-8">{(signal as any).claudeAnalysis}</p>
                      </motion.div>
                    )}

                    {/* Luna explanation */}
                    <div className="border-t border-white/6 pt-6">
                      {lunaLoading && !lunaExplanation && (
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-sm flex-shrink-0 animate-pulse">✦</div>
                          <div className="flex gap-1.5 items-center">
                            <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                            <span className="text-xs text-gray-500 ml-2">Luna analisando...</span>
                          </div>
                        </div>
                      )}
                      {lunaExplanation && (
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-sm flex-shrink-0">✦</div>
                            <span className="text-sm font-bold text-violet-400">Luna diz:</span>
                          </div>
                          <p className="text-gray-300 text-sm leading-relaxed pl-10">{lunaExplanation.text}</p>
                          {lunaExplanation.keyPoints && lunaExplanation.keyPoints.length > 0 && (
                            <div className="pl-10 space-y-1">
                              {lunaExplanation.keyPoints.map((p, i) => (
                                <div key={i} className="flex items-start gap-2 text-xs text-gray-400">
                                  <span className="text-violet-500 mt-0.5">•</span>{p}
                                </div>
                              ))}
                            </div>
                          )}
                          {lunaExplanation.riskNote && (
                            <div className="pl-10">
                              <span className="text-xs text-amber-400/80 italic">⚠ {lunaExplanation.riskNote}</span>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ) : (
                /* ──── WAITING STATE ──── */
                <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="rounded-3xl border border-white/6 p-10 flex flex-col items-center justify-center min-h-[440px] text-center"
                  style={{ background: 'rgba(10,10,20,0.7)', backdropFilter: 'blur(20px)' }}
                >
                  <div className="relative w-32 h-32 mb-8">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
                      <circle cx="64" cy="64" r="56" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="6" />
                      <circle cx="64" cy="64" r="56" fill="none" stroke="var(--blue)" strokeWidth="6" strokeLinecap="round"
                        strokeDasharray="351.9" strokeDashoffset={351.9 * (1 - progressPct / 100)}
                        className="transition-all duration-1000" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      {isFiring ? (
                        <div className="text-center">
                          <div className="text-lg font-black text-[var(--green)] animate-pulse">⚡</div>
                          <div className="text-[10px] font-black text-[var(--green)] animate-pulse">ANÁLISE</div>
                        </div>
                      ) : (
                        <>
                          <div className="text-3xl font-bold font-mono tabular-nums text-white">
                            {String(Math.floor(timeToNext / 60)).padStart(2,'0')}:{String(timeToNext % 60).padStart(2,'0')}
                          </div>
                          <div className="text-[10px] text-gray-600 uppercase tracking-widest mt-1">{timeframe}</div>
                        </>
                      )}
                    </div>
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-3">Aguardando sinal</h2>
                  <p className="text-gray-500 max-w-sm text-sm leading-relaxed">
                    O motor analisa o mercado em cada segundo <span className="font-mono text-white">:48</span>.
                    {timeframe !== 'M1' && ` Para ${timeframe}, dispara em múltiplos do intervalo.`}
                  </p>

                  {/* Direção do último diagnóstico */}
                  {lastDiag && (
                    <div className="mt-6 flex flex-col items-center gap-3 w-full max-w-xs">
                      {lastDiag.blockedBy ? (
                        /* ── SINAL BLOQUEADO: sem seta, sem score, só razão ── */
                        <div className="w-full px-4 py-3 rounded-2xl border border-white/8 bg-white/3 flex flex-col items-center gap-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600 text-sm">⛔</span>
                            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Mercado filtrado</span>
                          </div>
                          <div className="text-[11px] text-gray-500 text-center leading-snug">{lastDiag.blockedBy}</div>
                          {lastDiagTime && <div className="text-[10px] text-gray-700">{lastDiagTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>}
                        </div>
                      ) : (
                        /* ── SINAL ATIVO: card colorido com direção + score ── */
                        <>
                          <div className={`flex items-center gap-4 px-8 py-4 rounded-2xl border w-full justify-center ${
                            lastDiag.direction === 'CALL'
                              ? 'border-[var(--green)]/35 bg-[var(--green)]/8 shadow-[0_0_24px_rgba(0,255,135,0.15)]'
                              : 'border-[var(--red)]/35 bg-[var(--red)]/8 shadow-[0_0_24px_rgba(255,60,60,0.15)]'
                          }`}>
                            <span className={`text-4xl font-black ${lastDiag.direction === 'CALL' ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                              {lastDiag.direction === 'CALL' ? '▲' : '▼'}
                            </span>
                            <div className="text-left">
                              <div className={`text-2xl font-black tracking-widest ${lastDiag.direction === 'CALL' ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                                {lastDiag.direction}
                              </div>
                              <div className="text-[10px] text-gray-600 uppercase tracking-widest">
                                {lastDiag.passed ? 'sinal gerado' : 'direção calculada'}
                              </div>
                            </div>
                            <div className="text-left pl-3 border-l border-white/8">
                              <div className="text-xs text-gray-500">Score</div>
                              <div className="text-lg font-black text-white">{lastDiag.score ?? '—'}</div>
                              <div className="text-[9px] font-bold text-gray-500">{lastDiag.quality}</div>
                            </div>
                          </div>
                          <div className="px-4 py-2 rounded-xl bg-white/4 border border-white/6 text-xs text-gray-500 text-center w-full">
                            <span className="font-bold text-gray-400">Último:</span> {lastDiag.passed ? 'sinal confirmado e emitido' : 'filtrado pelo motor'}
                            {lastDiagTime && <span className="ml-2 text-gray-600">• {lastDiagTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* WIN / LOSS buttons */}
            <AnimatePresence>
              {pendingSignal && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                  className="grid grid-cols-2 gap-3">
                  <button onClick={() => handleResult('win')}
                    className="py-5 rounded-2xl font-black text-2xl text-[var(--green)] bg-[var(--green)]/10 hover:bg-[var(--green)]/20 border-2 border-[var(--green)]/30 hover:border-[var(--green)]/50 transition-all active:scale-95 shadow-[0_0_30px_rgba(0,255,136,0.08)]">
                    ✅ WIN
                  </button>
                  <button onClick={() => handleResult('loss')}
                    className="py-5 rounded-2xl font-black text-2xl text-[var(--red)] bg-[var(--red)]/10 hover:bg-[var(--red)]/20 border-2 border-[var(--red)]/30 hover:border-[var(--red)]/50 transition-all active:scale-95 shadow-[0_0_30px_rgba(255,68,102,0.08)]">
                    ❌ LOSS
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* CHART */}
            <div ref={chartRef} className="glass-card p-0 overflow-hidden rounded-2xl" style={{ height: 420 }} data-chart-container>
              <TradingViewWidget symbol={asset} />
            </div>

            {/* ── PAINEL CALENDÁRIO + NOTÍCIAS ── */}
            <div className="glass-card p-0 overflow-hidden rounded-2xl">
              {/* Tabs */}
              <div className="flex border-b border-white/6">
                {([['calendar','📅 Calendário Econômico'],['news','📰 Notícias']] as const).map(([tab, label]) => (
                  <button
                    key={tab}
                    onClick={() => setNewsTab(tab)}
                    className={`flex-1 py-3 text-xs font-bold transition-all ${newsTab === tab ? 'text-white border-b-2 border-[var(--green)] bg-[var(--green)]/4' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    {label}
                    {tab === 'calendar' && calendarEvents.filter(e => Math.abs(e.minutesUntil) <= 15 && isBlackoutEvent(e)).length > 0 && (
                      <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    )}
                  </button>
                ))}
              </div>

              {/* CALENDÁRIO ECONÔMICO */}
              {newsTab === 'calendar' && (
                <div className="p-4">
                  {calendarLoading && calendarEvents.length === 0 ? (
                    <div className="flex items-center justify-center gap-2 py-6 text-gray-600 text-xs">
                      <div className="w-4 h-4 rounded-full border border-gray-700 border-t-gray-400 animate-spin" />
                      Carregando calendário...
                    </div>
                  ) : calendarEvents.length === 0 ? (
                    <p className="text-center text-gray-600 text-xs py-6">Nenhum evento de alto impacto esta semana.</p>
                  ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                      {calendarEvents.map((ev, i) => {
                        const isPast = ev.minutesUntil < -15;
                        const isActive = Math.abs(ev.minutesUntil) <= 15;
                        const isSoon = ev.minutesUntil > 0 && ev.minutesUntil <= 60;
                        const affectsAsset = isBlackoutEvent(ev);
                        const evDate = new Date(ev.date);

                        return (
                          <div
                            key={i}
                            className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                              isActive && affectsAsset ? 'border-red-500/40 bg-red-500/6 shadow-[0_0_8px_rgba(239,68,68,0.15)]' :
                              isActive ? 'border-orange-400/30 bg-orange-400/5' :
                              isSoon && affectsAsset ? 'border-yellow-400/25 bg-yellow-400/4' :
                              isPast ? 'border-white/4 bg-transparent opacity-40' :
                              'border-white/6 bg-white/2'
                            }`}
                          >
                            {/* Impacto + país */}
                            <div className="shrink-0 text-center min-w-[40px]">
                              <div className="text-lg leading-none">{COUNTRY_FLAG[ev.country] || '🌐'}</div>
                              <div className="text-[9px] text-gray-600 font-bold mt-0.5">{ev.country}</div>
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${ev.impact === 'High' ? 'text-red-400 border-red-400/30 bg-red-400/8' : 'text-orange-400 border-orange-400/30 bg-orange-400/8'}`}>
                                  {ev.impact === 'High' ? '🔴 ALTO' : '🟡 MÉD'}
                                </span>
                                {isActive && affectsAsset && (
                                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded border border-red-500/40 bg-red-500/10 text-red-400 animate-pulse">
                                    ⚡ BLOQUEIO ATIVO
                                  </span>
                                )}
                                {isSoon && affectsAsset && !isActive && (
                                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded border border-yellow-400/30 bg-yellow-400/8 text-yellow-400">
                                    ⚠️ AFETA {asset}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-white font-medium mt-1 truncate">{ev.title}</div>
                              <div className="text-[10px] text-gray-600 mt-0.5">
                                {evDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · {evDate.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
                              </div>
                            </div>

                            {/* Countdown */}
                            <div className={`shrink-0 text-right text-[10px] font-black ${isActive ? 'text-red-400' : isSoon ? 'text-yellow-400' : 'text-gray-600'}`}>
                              {fmtCountdown(ev.minutesUntil)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="mt-3 text-[9px] text-gray-700 text-center">
                    Fonte: ForexFactory · Atualizado a cada 5min · Bloqueio ±15min ao redor de eventos de ALTO impacto
                  </div>
                </div>
              )}

              {/* NOTÍCIAS */}
              {newsTab === 'news' && (
                <div className="p-4">
                  {newsLoading && marketNews.length === 0 ? (
                    <div className="flex items-center justify-center gap-2 py-6 text-gray-600 text-xs">
                      <div className="w-4 h-4 rounded-full border border-gray-700 border-t-gray-400 animate-spin" />
                      Carregando notícias...
                    </div>
                  ) : marketNews.length === 0 ? (
                    <p className="text-center text-gray-600 text-xs py-6">Nenhuma notícia disponível no momento.</p>
                  ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                      {marketNews.map((n, i) => {
                        const pub = n.pubDate ? new Date(n.pubDate) : null;
                        return (
                          <a
                            key={i}
                            href={n.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-start gap-3 p-3 rounded-xl border border-white/6 bg-white/2 hover:bg-white/4 hover:border-white/10 transition-all group block"
                          >
                            <div className="w-1.5 h-1.5 rounded-full bg-[var(--green)]/60 mt-1.5 shrink-0 group-hover:bg-[var(--green)] transition-colors" />
                            <div className="flex-1 min-w-0">
                              <div className="text-xs text-gray-300 group-hover:text-white transition-colors font-medium leading-snug line-clamp-2">{n.title}</div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-gray-600">{n.source}</span>
                                {pub && <span className="text-[10px] text-gray-700">· {pub.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>}
                              </div>
                            </div>
                            <span className="text-gray-700 group-hover:text-gray-400 text-xs shrink-0 mt-0.5">↗</span>
                          </a>
                        );
                      })}
                    </div>
                  )}
                  <div className="mt-3 text-[9px] text-gray-700 text-center">
                    Fonte: Yahoo Finance · Atualizado a cada 5min
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ─── RIGHT SIDEBAR (4/12) ─── */}
          <div className="xl:col-span-4 space-y-4">

            {/* ANALYSIS ENGINE */}
            <div className="glass-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Motor de Análise</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${isConnected ? 'text-[var(--green)] border-[var(--green)]/30 bg-[var(--green)]/10' : 'text-red-400 border-red-400/20 bg-red-400/8'}`}>
                  {isConnected ? '● ATIVO' : '○ OFF'}
                </span>
              </div>
              {lastDiag ? (
                <div className="space-y-2.5">
                  {/* ── DIREÇÃO CALL / PUT ── */}
                  <div className={`flex items-center justify-between p-3 rounded-xl border ${
                    lastDiag.blockedBy
                      ? 'border-white/6 bg-white/2'
                      : lastDiag.direction === 'CALL'
                        ? 'border-[var(--green)]/30 bg-[var(--green)]/8 shadow-[0_0_12px_rgba(0,255,135,0.12)]'
                        : 'border-[var(--red)]/30 bg-[var(--red)]/8 shadow-[0_0_12px_rgba(255,60,60,0.12)]'
                  }`}>
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Direção</span>
                    <div className="flex items-center gap-2">
                      {lastDiag.blockedBy ? (
                        <span className="text-[10px] text-gray-600 font-bold">⛔ filtrado</span>
                      ) : (
                        <span className={`text-xl font-black tracking-tight ${
                          lastDiag.direction === 'CALL' ? 'text-[var(--green)]' : 'text-[var(--red)]'
                        }`}>
                          {lastDiag.direction === 'CALL' ? '▲ CALL' : '▼ PUT'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ── MÉTRICAS ── */}
                  {[
                    { label: 'RSI (14)', value: lastDiag.rsi.toFixed(1), ok: lastDiag.rsi > 30 && lastDiag.rsi < 70 },
                    { label: 'ADX', value: lastDiag.adx.toFixed(1), ok: lastDiag.adx > 18 },
                    { label: 'Entropia', value: lastDiag.entropy.toFixed(2), ok: lastDiag.entropy < 0.65 },
                    { label: 'Consenso', value: `${lastDiag.consensus}/5`, ok: lastDiag.consensus >= 4 },
                    { label: 'Confirmação', value: `${lastDiag.confirmed}/6`, ok: lastDiag.confirmed >= 3 },
                    { label: 'Qualidade', value: lastDiag.quality, ok: lastDiag.quality !== 'EVITAR' && lastDiag.quality !== 'FRACO' },
                  ].map(({ label, value, ok }) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">{label}</span>
                      <span className={`text-xs font-bold ${ok ? 'text-[var(--green)]' : 'text-gray-400'}`}>{value}</span>
                    </div>
                  ))}
                  {lastDiag.blockedBy && (
                    <div className="mt-2 px-2 py-1.5 rounded-lg bg-orange-500/8 border border-orange-500/15">
                      <div className="text-[10px] text-orange-400 font-bold">Bloqueado: {lastDiag.blockedBy}</div>
                    </div>
                  )}
                  <div className="pt-1 text-[10px] text-gray-700">
                    {lastDiagTime?.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="text-2xl mb-2">🔍</div>
                  <div className="text-xs text-gray-600">Aguardando primeira análise...</div>
                  <div className="text-[10px] text-gray-700 mt-1">Motor dispara no segundo :48</div>
                </div>
              )}
            </div>

            {/* SCOREBOARD */}
            <div className="glass-card p-5">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Placar do Dia</h3>
              <div className="flex items-center justify-around mb-4">
                <div className="text-center">
                  <div className="text-4xl font-black text-[var(--green)]">{wins}</div>
                  <div className="text-[10px] text-gray-600 uppercase">WINS</div>
                </div>
                <div className="text-2xl text-gray-800 font-thin">/</div>
                <div className="text-center">
                  <div className="text-4xl font-black text-[var(--red)]">{losses}</div>
                  <div className="text-[10px] text-gray-600 uppercase">LOSSES</div>
                </div>
              </div>
              {total > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Assertividade</span>
                    <span className={`font-bold ${winRate >= 65 ? 'text-[var(--green)]' : winRate >= 50 ? 'text-yellow-400' : 'text-[var(--red)]'}`}>{winRate}%</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-1000"
                      style={{ width: `${winRate}%`, background: winRate >= 65 ? 'var(--green)' : winRate >= 50 ? '#f59e0b' : 'var(--red)' }} />
                  </div>
                  {streak !== 0 && (
                    <div className={`text-center text-xs font-bold mt-2 ${streak > 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                      {streak > 0 ? `🔥 Sequência de +${streak} WINS` : `❄️ Sequência de ${Math.abs(streak)} LOSSES`}
                    </div>
                  )}
                </div>
              )}

              {/* Manual entry */}
              <button onClick={() => { setManualAsset(asset); setShowManualEntry(v => !v); }}
                className="w-full mt-3 py-2 rounded-xl text-xs font-bold text-gray-500 hover:text-white border border-white/8 hover:border-white/15 bg-white/3 hover:bg-white/6 transition-all flex items-center justify-center gap-1.5">
                ✏️ Registrar manualmente
              </button>
              <AnimatePresence>
                {showManualEntry && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="mt-3 p-3 rounded-xl bg-white/4 border border-white/8 space-y-3">
                      <select value={manualAsset} onChange={e => setManualAsset(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none">
                        {CRYPTO_ASSETS.map(a => (
                          <option key={a} value={a} className="bg-[#07070d]">{a}</option>
                        ))}
                      </select>
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => setManualDir('CALL')} className={`py-1.5 rounded-lg text-xs font-bold transition-all ${manualDir === 'CALL' ? 'bg-[var(--green)]/20 text-[var(--green)] border border-[var(--green)]/30' : 'bg-white/5 text-gray-500 border border-white/5'}`}>▲ CALL</button>
                        <button onClick={() => setManualDir('PUT')} className={`py-1.5 rounded-lg text-xs font-bold transition-all ${manualDir === 'PUT' ? 'bg-[var(--red)]/20 text-[var(--red)] border border-[var(--red)]/30' : 'bg-white/5 text-gray-500 border border-white/5'}`}>▼ PUT</button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => handleManualResult('win')} className="py-2 rounded-lg text-xs font-black text-[var(--green)] bg-[var(--green)]/10 hover:bg-[var(--green)]/20 border border-[var(--green)]/20 transition-all active:scale-95">✅ WIN</button>
                        <button onClick={() => handleManualResult('loss')} className="py-2 rounded-lg text-xs font-black text-[var(--red)] bg-[var(--red)]/10 hover:bg-[var(--red)]/20 border border-[var(--red)]/20 transition-all active:scale-95">❌ LOSS</button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* BANK MANAGEMENT */}
            <ManagementPanel wins={wins} losses={losses} onResult={() => refreshStats()} />

            {/* RECENT TRADES */}
            {recentTrades.length > 0 && (
              <div className="glass-card p-5">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Operações de Hoje</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {recentTrades.map((t, i) => (
                    <div key={t.id || i} className="flex items-center justify-between py-1.5 border-b border-white/4 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-black ${t.direction === 'CALL' ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                          {t.direction === 'CALL' ? '▲' : '▼'}
                        </span>
                        <span className="text-xs text-gray-300 font-bold">{t.asset}</span>
                        {t.quality && t.quality !== 'MANUAL' && (
                          <span className="text-[9px] text-gray-600">{t.quality}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-700">{new Date(t.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className={`text-xs font-black ${t.result === 'win' ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                          {t.result === 'win' ? '✅' : '❌'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
