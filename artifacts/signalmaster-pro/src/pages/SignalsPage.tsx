import { useState, useEffect, useRef, useCallback } from "react";
import TradingViewWidget from "@/components/TradingViewWidget";
import PairMonitorCard from "@/components/PairMonitorCard";
import { Activity, Check, X, TrendingUp, TrendingDown, Clock, Cpu, Shield, Eye, Layers } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ASSET_CATEGORIES, TV_SYMBOLS,
  getCurrentSession, runEngine, runEngineDiag, updateMLWeights,
  playSignalSound, vibrate, unlockAudio, isAudioUnlocked,
  type CandleBuffer, type SignalResult, type DiagResult
} from "@/lib/signalEngine";
import { subscribeAsset } from "@/lib/assetDataManager";
const CRYPTO_ASSETS = ['BTCUSD', 'ETHUSD', 'SOLUSD', 'BNBUSD', 'XRPUSD', 'ADAUSD', 'DOGEUSD', 'LTCUSD'];
const FOREX_ASSETS = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD', 'EURGBP', 'GBPJPY'];
const COMMODITY_ASSETS = ['XAUUSD', 'XAGUSD', 'USOIL'];

const ASSET_ICONS: Record<string, string> = {
  BTCUSD: '₿', ETHUSD: 'Ξ', SOLUSD: '◎', BNBUSD: '⬡', XRPUSD: '✕', ADAUSD: '₳',
  DOGEUSD: 'Ð', LTCUSD: 'Ł', EURUSD: '€$', GBPUSD: '£$', USDJPY: '$¥', AUDUSD: 'A$',
  USDCAD: 'C$', NZDUSD: 'N$', EURGBP: '€£', GBPJPY: '£¥',
  XAUUSD: 'Au', XAGUSD: 'Ag', USOIL: '🛢'
};

const QUALITY_COLORS: Record<string, string> = {
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
  const [asset, setAsset] = useState('EURUSD');
  const [category, setCategory] = useState<'crypto' | 'forex' | 'commodity'>('forex');
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
  const [timeframe, setTimeframe] = useState<'M1' | 'M5' | 'M15'>(() => {
    return (localStorage.getItem('smpTimeframe') as 'M1' | 'M5' | 'M15') || 'M1';
  });
  const [multiPairMode, setMultiPairMode] = useState(false);
  const [watchedPairs, setWatchedPairs] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('smpWatchedPairs') || '["EURUSD","BTCUSD"]'); } catch { return ['EURUSD', 'BTCUSD']; }
  });

  const MAX_PAIRS = 5;
  const ALL_ASSETS = [...CRYPTO_ASSETS, ...FOREX_ASSETS, ...COMMODITY_ASSETS];

  const bufRef = useRef<CandleBuffer>({ m1: [], m5: [], m15: [] });

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

  // Persist timeframe
  useEffect(() => { localStorage.setItem('smpTimeframe', timeframe); }, [timeframe]);

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
    const cat = ASSET_CATEGORIES[newAsset] as 'crypto' | 'forex' | 'commodity';
    setCategory(cat);
    connectAsset(newAsset);
  }, [connectAsset]);

  // Initial load
  useEffect(() => {
    connectAsset('EURUSD');
    return () => { if (unsubRef.current) unsubRef.current(); };
  }, []);

  // Helper: should the engine fire now given timeframe?
  const shouldFireNow = (sec: number, min: number, tf: 'M1' | 'M5' | 'M15'): boolean => {
    if (sec !== 48) return false;
    if (tf === 'M1') return true;
    if (tf === 'M5') return min % 5 === 0;
    if (tf === 'M15') return min % 15 === 0;
    return false;
  };

  // Helper: seconds until next signal for given timeframe
  const getSecsToNext = (min: number, sec: number, tf: 'M1' | 'M5' | 'M15'): number => {
    if (tf === 'M1') return sec <= 48 ? 48 - sec : 60 - sec + 48;
    const interval = tf === 'M5' ? 5 : 15;
    const intervalSecs = interval * 60;
    const cur = min * 60 + sec;
    let n = Math.floor(cur / intervalSecs);
    let next = n * intervalSecs + 48;
    if (next <= cur) { n++; next = n * intervalSecs + 48; }
    return next - cur;
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
        setEngineStatus('calculando indicadores...');
        try {
          const diag = runEngineDiag(buf, asset);
          if (diag) { setLastDiag(diag); setLastDiagTime(new Date()); }

          const result = runEngine(buf, asset);
          if (result) {
            setSignal(result);
            setPendingSignal(result);
            const soundType = result.quality === 'PREMIUM' ? 'premium' : category === 'crypto' ? 'crypto' : 'forte';
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
      category: ASSET_CATEGORIES[manualAsset || asset] || 'forex',
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

  return (
    <div className="space-y-4 max-w-7xl mx-auto">

      {/* STATUS BAR */}
      <div className="glass-card p-3 flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[var(--green)] animate-pulse' : 'bg-red-500'}`} />
            <span className="text-gray-400">{isConnected ? 'Conectado' : 'Desconectado'}</span>
          </div>
          <div className="text-gray-400">|</div>
          <div>
            <span className="text-gray-400">Sessão: </span>
            <span className="font-bold text-[var(--green)]">{sessLabels[sess] || sess}</span>
          </div>
          <div className="text-gray-400">|</div>
          <div className="flex items-center gap-1">
            <Cpu size={12} className="text-gray-500" />
            <span className="text-gray-400 text-xs">{engineStatus}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>{bufferSize} velas M1</span>
          {lastPrice && <span className="font-mono text-white">{lastPrice < 10 ? lastPrice.toFixed(5) : lastPrice < 1000 ? lastPrice.toFixed(4) : lastPrice.toFixed(2)}</span>}
          {priceChange !== 0 && (
            <span className={priceChange >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}>
              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(3)}%
            </span>
          )}
          {/* TOGGLE MODO MULTI-PAR */}
          <button
            onClick={() => setMultiPairMode(v => !v)}
            title="Monitorar múltiplos pares ao mesmo tempo"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold transition-all duration-200 ${
              multiPairMode
                ? 'border-[var(--green)] text-[var(--green)] bg-[var(--green)]/10'
                : 'border-white/20 text-gray-400 hover:text-white hover:border-white/30 bg-white/5'
            }`}
          >
            <Layers size={10} />
            {multiPairMode ? `Multi-Par (${watchedPairs.length})` : 'Multi-Par'}
          </button>
          {/* BOTÃO ATIVAR SOM */}
          <button
            onClick={async () => {
              const ok = await unlockAudio();
              setAudioEnabled(ok);
              if (ok) playSignalSound('alert');
            }}
            title={audioEnabled ? 'Som ativo — clique para testar' : 'Clique para ativar notificações sonoras'}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold transition-all duration-200 ${
              audioEnabled
                ? 'border-[var(--green)] text-[var(--green)] bg-[var(--green)]/10'
                : 'border-yellow-500 text-yellow-400 bg-yellow-500/10 animate-pulse'
            }`}
          >
            {audioEnabled ? '🔔 Som ativo' : '🔇 Ativar som'}
          </button>
        </div>
      </div>

      {/* ─── MODO MULTI-PAR ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {multiPairMode && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* PAIR PICKER */}
            <div className="glass-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers size={14} className="text-[var(--green)]" />
                  <h3 className="text-sm font-bold text-white">Selecionar Pares para Monitorar</h3>
                </div>
                <span className="text-xs text-gray-500 tabular-nums">
                  {watchedPairs.length}/{MAX_PAIRS} selecionados
                </span>
              </div>

              {/* Crypto */}
              <div>
                <div className="text-[10px] font-bold text-yellow-400/70 uppercase tracking-widest mb-2">₿ Cripto</div>
                <div className="flex flex-wrap gap-1.5">
                  {CRYPTO_ASSETS.map(a => {
                    const sel = watchedPairs.includes(a);
                    const full = !sel && watchedPairs.length >= MAX_PAIRS;
                    return (
                      <button
                        key={a}
                        onClick={() => togglePair(a)}
                        disabled={full}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                          sel
                            ? 'bg-yellow-400/15 text-yellow-400 border-yellow-400/30'
                            : full
                            ? 'bg-white/3 text-gray-700 border-white/5 cursor-not-allowed'
                            : 'bg-white/5 text-gray-400 hover:text-white border-white/10 hover:border-white/20'
                        }`}
                      >
                        {a.replace('USD', '')}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Forex */}
              <div>
                <div className="text-[10px] font-bold text-blue-400/70 uppercase tracking-widest mb-2">💱 Forex</div>
                <div className="flex flex-wrap gap-1.5">
                  {FOREX_ASSETS.map(a => {
                    const sel = watchedPairs.includes(a);
                    const full = !sel && watchedPairs.length >= MAX_PAIRS;
                    return (
                      <button
                        key={a}
                        onClick={() => togglePair(a)}
                        disabled={full}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                          sel
                            ? 'bg-blue-400/15 text-blue-400 border-blue-400/30'
                            : full
                            ? 'bg-white/3 text-gray-700 border-white/5 cursor-not-allowed'
                            : 'bg-white/5 text-gray-400 hover:text-white border-white/10 hover:border-white/20'
                        }`}
                      >
                        {a}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Commodities */}
              <div>
                <div className="text-[10px] font-bold text-orange-400/70 uppercase tracking-widest mb-2">🏅 Commodities</div>
                <div className="flex flex-wrap gap-1.5">
                  {COMMODITY_ASSETS.map(a => {
                    const sel = watchedPairs.includes(a);
                    const full = !sel && watchedPairs.length >= MAX_PAIRS;
                    return (
                      <button
                        key={a}
                        onClick={() => togglePair(a)}
                        disabled={full}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                          sel
                            ? 'bg-orange-400/15 text-orange-400 border-orange-400/30'
                            : full
                            ? 'bg-white/3 text-gray-700 border-white/5 cursor-not-allowed'
                            : 'bg-white/5 text-gray-400 hover:text-white border-white/10 hover:border-white/20'
                        }`}
                      >
                        {a}
                      </button>
                    );
                  })}
                </div>
              </div>

              {watchedPairs.length >= MAX_PAIRS && (
                <p className="text-[11px] text-yellow-400/70 text-center">
                  Limite de {MAX_PAIRS} pares atingido. Remova um par para adicionar outro.
                </p>
              )}
            </div>

            {/* MONITOR GRID */}
            {watchedPairs.length === 0 ? (
              <div className="glass-card p-8 text-center">
                <div className="text-gray-600 mb-2">Nenhum par selecionado</div>
                <div className="text-gray-700 text-sm">Selecione de 1 a 5 pares acima para monitorar</div>
              </div>
            ) : (
              <div className={`grid gap-4 ${
                watchedPairs.length === 1 ? 'grid-cols-1 max-w-sm' :
                watchedPairs.length === 2 ? 'grid-cols-1 sm:grid-cols-2' :
                watchedPairs.length === 3 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' :
                'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
              }`}>
                <AnimatePresence>
                  {watchedPairs.map(a => (
                    <PairMonitorCard
                      key={a}
                      asset={a}
                      timeframe={timeframe}
                      onRemove={() => togglePair(a)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── MODO SINGLE (layout original) ─────────────────────────────────── */}
      {!multiPairMode && <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">

        {/* LEFT PANEL */}
        <div className="xl:col-span-1 space-y-4">

          {/* SCOREBOARD */}
          <div className="glass-card p-5 relative overflow-hidden">
            <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full blur-3xl bg-[var(--green)]/10 pointer-events-none" />
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Placar do Dia</h3>
            <div className="flex items-end gap-3 mb-4">
              <div>
                <div className="text-4xl font-black text-[var(--green)]">{wins}</div>
                <div className="text-xs text-gray-500 mt-0.5">WINS</div>
              </div>
              <div className="text-2xl text-gray-700 pb-1">/</div>
              <div>
                <div className="text-4xl font-black text-[var(--red)]">{losses}</div>
                <div className="text-xs text-gray-500 mt-0.5">LOSSES</div>
              </div>
            </div>

            {total > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Assertividade</span>
                  <span className="font-bold text-white">{winRate}%</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{ width: `${winRate}%`, background: winRate >= 65 ? 'var(--green)' : winRate >= 50 ? 'var(--yellow)' : 'var(--red)' }}
                  />
                </div>
                <div className="flex justify-between text-xs pt-1">
                  <span className="text-gray-500">Sequência</span>
                  <span className={`font-bold ${streak > 0 ? 'text-[var(--green)]' : streak < 0 ? 'text-[var(--red)]' : 'text-gray-400'}`}>
                    {streak > 0 ? `🔥 +${streak}W` : streak < 0 ? `❄️ ${streak}L` : '—'}
                  </span>
                </div>
              </div>
            )}

            {total === 0 && (
              <p className="text-xs text-gray-600 text-center py-2">Aguardando primeiros sinais...</p>
            )}

            {/* MANUAL ENTRY BUTTON */}
            <button
              onClick={() => { setManualAsset(asset); setShowManualEntry(v => !v); }}
              className="w-full mt-3 py-2 rounded-lg text-xs font-bold text-gray-400 hover:text-white border border-white/10 hover:border-white/20 bg-white/3 hover:bg-white/6 transition-all flex items-center justify-center gap-1.5"
            >
              <span className="text-[10px]">✏️</span> Registrar manualmente
            </button>

            {/* MANUAL ENTRY FORM */}
            <AnimatePresence>
              {showManualEntry && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 p-3 rounded-xl bg-white/5 border border-white/10 space-y-3">
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Entrada Manual</div>

                    {/* Asset selector */}
                    <select
                      value={manualAsset}
                      onChange={e => setManualAsset(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[var(--green)]/50"
                    >
                      {[...CRYPTO_ASSETS, ...FOREX_ASSETS, ...COMMODITY_ASSETS].map(a => (
                        <option key={a} value={a} className="bg-[#07070d]">{a}</option>
                      ))}
                    </select>

                    {/* Direction toggle */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setManualDir('CALL')}
                        className={`py-1.5 rounded-lg text-xs font-bold transition-all ${manualDir === 'CALL' ? 'bg-[var(--green)]/20 text-[var(--green)] border border-[var(--green)]/30' : 'bg-white/5 text-gray-500 border border-white/5'}`}
                      >▲ CALL</button>
                      <button
                        onClick={() => setManualDir('PUT')}
                        className={`py-1.5 rounded-lg text-xs font-bold transition-all ${manualDir === 'PUT' ? 'bg-[var(--red)]/20 text-[var(--red)] border border-[var(--red)]/30' : 'bg-white/5 text-gray-500 border border-white/5'}`}
                      >▼ PUT</button>
                    </div>

                    {/* W/L buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleManualResult('win')}
                        className="py-2 rounded-lg text-xs font-black text-[var(--green)] bg-[var(--green)]/10 hover:bg-[var(--green)]/20 border border-[var(--green)]/20 transition-all active:scale-95"
                      >✅ WIN</button>
                      <button
                        onClick={() => handleManualResult('loss')}
                        className="py-2 rounded-lg text-xs font-black text-[var(--red)] bg-[var(--red)]/10 hover:bg-[var(--red)]/20 border border-[var(--red)]/20 transition-all active:scale-95"
                      >❌ LOSS</button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* TIMEFRAME + COUNTDOWN */}
          <div className="glass-card p-5 flex flex-col items-center space-y-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Timeframe</h3>

            {/* TIMEFRAME SELECTOR */}
            <div className="flex gap-1.5 bg-white/5 p-1 rounded-xl w-full">
              {(['M1', 'M5', 'M15'] as const).map(tf => (
                <button
                  key={tf}
                  onClick={() => { setTimeframe(tf); setSignal(null); setPendingSignal(null); }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all duration-200 ${
                    timeframe === tf
                      ? 'bg-[var(--green)] text-black shadow-[0_0_12px_rgba(0,255,136,0.3)]'
                      : 'text-gray-500 hover:text-white'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>

            {/* TF description */}
            <div className="text-[10px] text-gray-600 text-center">
              {timeframe === 'M1' && 'Sinal a cada minuto — alta frequência'}
              {timeframe === 'M5' && 'Sinal a cada 5 min — mais confiável'}
              {timeframe === 'M15' && 'Sinal a cada 15 min — máxima confiança'}
            </div>

            {/* COUNTDOWN RING */}
            <div className="relative w-24 h-24">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 96 96">
                <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                <circle
                  cx="48" cy="48" r="40" fill="none"
                  stroke={isFiring ? 'var(--green)' : timeframe === 'M15' ? '#f59e0b' : timeframe === 'M5' ? '#3b82f6' : 'var(--blue)'}
                  strokeWidth="6" strokeLinecap="round"
                  strokeDasharray="251.3"
                  strokeDashoffset={251.3 * (1 - progressPct / 100)}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                {isFiring ? (
                  <div className="text-xs font-black text-[var(--green)] animate-pulse text-center">⚡<br/>ANALISANDO</div>
                ) : (
                  <>
                    <div className="text-2xl font-bold font-mono tabular-nums text-white">
                      {String(Math.floor(timeToNext / 60)).padStart(2, '0')}:{String(timeToNext % 60).padStart(2, '0')}
                    </div>
                    <div className="text-[9px] text-gray-500 uppercase tracking-widest">{timeframe}</div>
                  </>
                )}
              </div>
            </div>
            <div className="text-[10px] text-gray-700 text-center">
              {timeframe === 'M1' && 'Próximo: :{48}s de cada minuto'}
              {timeframe === 'M5' && 'Próximo: min :00/:05/:10... seg :48'}
              {timeframe === 'M15' && 'Próximo: min :00/:15/:30/:45 seg :48'}
            </div>
          </div>

          {/* LAST ANALYSIS DIAGNOSTIC */}
          {lastDiag && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`glass-card p-4 space-y-3 border ${lastDiag.passed ? 'border-[var(--green)]/30' : 'border-orange-500/20'}`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Última Análise</h3>
                <span className="text-[10px] text-gray-600">
                  {lastDiagTime?.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>

              {/* Score + direction */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-gray-600 mb-0.5">Direção</div>
                  <div className={`font-black text-lg ${lastDiag.direction === 'CALL' ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                    {lastDiag.direction === 'CALL' ? '▲ CALL' : '▼ PUT'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-600 mb-0.5">Score</div>
                  <div className={`font-black text-xl ${
                    lastDiag.score >= 92 ? 'text-white font-black' :
                    lastDiag.score >= 83 ? 'text-yellow-400' :
                    lastDiag.score >= 74 ? 'text-[var(--green)]' :
                    lastDiag.score >= 68 ? 'text-[var(--blue)]' : 'text-gray-400'
                  }`}>{lastDiag.score}%</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-600 mb-0.5">Qualidade</div>
                  <div className={`font-bold text-sm ${
                    lastDiag.quality === 'ELITE' ? 'text-white' :
                    lastDiag.quality === 'PREMIUM' ? 'text-yellow-400' :
                    lastDiag.quality === 'FORTE' ? 'text-[var(--green)]' :
                    lastDiag.quality === 'MÉDIO' ? 'text-[var(--blue)]' : 'text-gray-500'
                  }`}>{lastDiag.quality}</div>
                </div>
              </div>

              {/* Mini stats row */}
              <div className="grid grid-cols-3 gap-1.5 text-center">
                <div className="bg-white/5 rounded-lg p-1.5">
                  <div className="text-[10px] text-gray-600">ADX</div>
                  <div className={`text-sm font-bold ${lastDiag.adx >= 25 ? 'text-[var(--green)]' : lastDiag.adx >= 18 ? 'text-yellow-400' : 'text-[var(--red)]'}`}>{lastDiag.adx}</div>
                </div>
                <div className="bg-white/5 rounded-lg p-1.5">
                  <div className="text-[10px] text-gray-600">Consenso</div>
                  <div className={`text-sm font-bold ${lastDiag.consensus >= 4 ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>{lastDiag.consensus}/5</div>
                </div>
                <div className="bg-white/5 rounded-lg p-1.5">
                  <div className="text-[10px] text-gray-600">Confirmados</div>
                  <div className={`text-sm font-bold ${lastDiag.confirmed >= 3 ? 'text-[var(--green)]' : 'text-yellow-400'}`}>{lastDiag.confirmed}/5</div>
                </div>
              </div>

              {/* Extras (confirmed patterns) */}
              {lastDiag.extras && lastDiag.extras.length > 0 && (
                <div className="space-y-1">
                  {lastDiag.extras.map((e, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[10px] text-emerald-400">
                      <span className="w-1 h-1 rounded-full bg-emerald-400 shrink-0" />
                      {e}
                    </div>
                  ))}
                </div>
              )}

              {/* Blocked reason */}
              {lastDiag.blockedBy ? (
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-orange-500/10 border border-orange-500/15">
                  <span className="text-orange-400 text-xs shrink-0">⚠</span>
                  <span className="text-xs text-orange-300 leading-relaxed">{lastDiag.blockedBy}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[var(--green)]/10 border border-[var(--green)]/20">
                  <span className="text-[var(--green)] text-xs">✓</span>
                  <span className="text-xs text-[var(--green)] font-bold">Sinal aprovado e emitido</span>
                </div>
              )}
            </motion.div>
          )}

          {/* INDICATORS MINI — readable names */}
          {(signal || lastDiag) && (() => {
            const VOTE_LABELS: Record<string, string> = {
              ema: 'EMA Stack (M1)', htf: 'HTF M5', m15: 'HTF M15',
              rsi: 'RSI', rsidiv: 'RSI Divergência',
              macd: 'MACD', bb: 'Bollinger %B', bsq: 'BB Squeeze',
              stoch: 'Estocástico', sr: 'Suporte/Resistência',
              candle: 'Candle Pattern', volume: 'Volume', obv: 'OBV Fluxo'
            };
            return (
              <div className="glass-card p-4 space-y-1.5">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Votos dos Indicadores</h3>
                {Object.entries((signal || lastDiag)!.votes).map(([ind, vote]) => (
                  <div key={ind} className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">{VOTE_LABELS[ind] || ind.toUpperCase()}</span>
                    <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                      vote === 'CALL' ? 'text-[var(--green)] bg-[var(--green)]/10' :
                      vote === 'PUT' ? 'text-[var(--red)] bg-[var(--red)]/10' :
                      'text-gray-500 bg-white/5'
                    }`}>
                      {vote === 'CALL' ? '▲ CALL' : vote === 'PUT' ? '▼ PUT' : '— NEU'}
                    </span>
                  </div>
                ))}
              </div>
            );
          })()}

          {!lastDiag && (
            <div className="glass-card p-4 text-center">
              <div className="text-gray-600 text-xs mb-1">Aguardando primeira análise</div>
              <div className="text-gray-700 text-[10px]">O motor analisa a cada segundo :48</div>
            </div>
          )}
        </div>

        {/* CENTER / MAIN */}
        <div className="xl:col-span-2 space-y-4">

          {/* ASSET SELECTOR */}
          <div className="glass-card p-4">
            <div className="flex gap-2 mb-3">
              {['crypto', 'forex', 'commodity'].map(c => (
                <button
                  key={c}
                  onClick={() => {
                    const first = c === 'crypto' ? 'BTCUSD' : c === 'forex' ? 'EURUSD' : 'XAUUSD';
                    handleAssetChange(first);
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    category === c ? 'bg-[var(--green)]/20 text-[var(--green)] border border-[var(--green)]/30' :
                    'text-gray-500 hover:text-white border border-transparent'
                  }`}
                >
                  {c === 'crypto' ? '₿ Cripto' : c === 'forex' ? '💱 Forex' : '🏅 Commodities'}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {(category === 'crypto' ? CRYPTO_ASSETS : category === 'forex' ? FOREX_ASSETS : COMMODITY_ASSETS).map(a => (
                <button
                  key={a}
                  onClick={() => handleAssetChange(a)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                    asset === a
                      ? 'bg-[var(--green)]/20 text-[var(--green)] border border-[var(--green)]/30 shadow-[0_0_10px_rgba(0,255,136,0.15)]'
                      : 'bg-white/5 text-gray-400 hover:text-white border border-white/5 hover:border-white/10'
                  }`}
                >
                  <span className="font-mono">{ASSET_ICONS[a] || ''}</span>
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* SIGNAL CARD */}
          <AnimatePresence mode="wait">
            {signal ? (
              <motion.div
                key={signal.ts}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`glass-card p-6 relative overflow-hidden border ${
                  signal.direction === 'CALL' ? 'border-[var(--green)]/20 shadow-[0_0_30px_rgba(0,255,136,0.07)]' : 'border-[var(--red)]/20 shadow-[0_0_30px_rgba(255,68,102,0.07)]'
                }`}
              >
                {/* Glow bg */}
                <div className={`absolute -top-8 -right-8 w-32 h-32 rounded-full blur-3xl opacity-20 pointer-events-none ${signal.direction === 'CALL' ? 'bg-[var(--green)]' : 'bg-[var(--red)]'}`} />

                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center font-bold text-lg border border-white/10">
                      {ASSET_ICONS[signal.asset] || signal.asset[0]}
                    </div>
                    <div>
                      <div className="font-bold text-white text-lg">{signal.asset} <span className="text-gray-500 text-sm font-normal">M1</span></div>
                      <div className="text-xs text-gray-500">{sessLabels[signal.sess] || signal.sess}</div>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold border ${QUALITY_COLORS[signal.quality] || ''}`}>
                    {signal.quality === 'ELITE' ? '👑' : signal.quality === 'PREMIUM' ? '💎' : signal.quality === 'FORTE' ? '🟢' : '🟡'} {signal.quality}
                  </div>
                  {/* Market Regime Badge */}
                  {signal.marketRegime && (() => {
                    const rc = REGIME_CONFIG[signal.marketRegime];
                    return (
                      <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${rc.color}`} title={rc.tip}>
                        {rc.icon} {rc.label}
                      </div>
                    );
                  })()}
                </div>

                {/* Direction */}
                <div className="text-center my-6">
                  <div className={`text-7xl font-black tracking-tight mb-2 ${
                    signal.direction === 'CALL'
                      ? 'text-[var(--green)] drop-shadow-[0_0_20px_rgba(0,255,136,0.5)]'
                      : 'text-[var(--red)] drop-shadow-[0_0_20px_rgba(255,68,102,0.5)]'
                  }`}>
                    {signal.direction === 'CALL' ? '▲ CALL' : '▼ PUT'}
                  </div>
                  <div className="flex justify-center items-center gap-2 text-sm text-gray-400">
                    {signal.direction === 'CALL' ? <TrendingUp size={16} className="text-[var(--green)]" /> : <TrendingDown size={16} className="text-[var(--red)]" />}
                    Operar no próximo minuto
                  </div>
                </div>

                {/* Score bar */}
                <div className="mb-5">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-gray-400">Score do Motor</span>
                    <span className="font-bold text-white">{signal.score}%</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${signal.score}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ background: signal.score >= 82 ? 'var(--gold)' : signal.score >= 74 ? 'var(--green)' : 'var(--blue)' }}
                    />
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-4 gap-3 mb-5">
                  {[
                    { label: 'ADX', value: signal.adx, unit: '' },
                    { label: 'RSI', value: signal.rsi, unit: '' },
                    { label: 'Entropia', value: signal.entropy, unit: '%' },
                    { label: 'Consenso', value: signal.consensus, unit: '/5' },
                  ].map(({ label, value, unit }) => (
                    <div key={label} className="bg-white/5 rounded-lg p-2 text-center border border-white/5">
                      <div className="text-[10px] text-gray-500 mb-1">{label}</div>
                      <div className="font-bold text-white text-sm">{value}{unit}</div>
                    </div>
                  ))}
                </div>

                {/* DNA + MM */}
                <div className="flex gap-3 mb-5">
                  <div className="flex-1 bg-white/5 rounded-lg p-3 border border-white/5 text-center">
                    <div className="text-[10px] text-gray-500 mb-1">🧬 DNA Match</div>
                    <div className="font-bold text-white">{signal.dnaMatch}%</div>
                  </div>
                  <div className={`flex-1 rounded-lg p-3 border text-center ${signal.mmTrap ? 'bg-orange-500/10 border-orange-500/20' : 'bg-white/5 border-white/5'}`}>
                    <div className="text-[10px] text-gray-500 mb-1">🪤 MM Trap</div>
                    <div className={`font-bold text-sm ${signal.mmTrap ? 'text-orange-400' : 'text-gray-500'}`}>
                      {signal.mmTrap ? signal.mmTrapType : 'Não detectado'}
                    </div>
                  </div>
                </div>

                {/* WIN/LOSS */}
                {pendingSignal && pendingSignal.ts === signal.ts ? (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleResult('win')}
                      className="py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 bg-[var(--green)]/10 text-[var(--green)] hover:bg-[var(--green)]/20 border border-[var(--green)]/20 transition-all hover:scale-[1.02] active:scale-95"
                    >
                      <Check size={20} /> DEU WIN ✅
                    </button>
                    <button
                      onClick={() => handleResult('loss')}
                      className="py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 bg-[var(--red)]/10 text-[var(--red)] hover:bg-[var(--red)]/20 border border-[var(--red)]/20 transition-all hover:scale-[1.02] active:scale-95"
                    >
                      <X size={20} /> DEU LOSS ❌
                    </button>
                  </div>
                ) : (
                  <div className="py-3 rounded-xl text-center text-gray-500 text-sm border border-white/5 bg-white/3">
                    <Eye size={14} className="inline mr-2" />
                    Sinal já registrado — aguardando próximo
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="waiting"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass-card p-8 flex flex-col items-center justify-center text-center min-h-[300px]"
              >
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4 border border-white/10">
                  <Activity size={28} className="text-[var(--green)] animate-pulse" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Motor Ativo</h3>
                <p className="text-gray-500 text-sm max-w-xs">
                  {bufferSize < 30
                    ? `Carregando dados... (${bufferSize}/30 velas mínimas)`
                    : `Analisando ${asset} — sinal será emitido no segundo 48 de cada minuto`}
                </p>
                <div className="mt-4 flex items-center gap-2 text-xs text-gray-600">
                  <Clock size={12} />
                  Próximo ciclo em {timeToNext}s
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* RIGHT PANEL */}
        <div className="xl:col-span-1 space-y-4">

          {/* CONFIDENCE INDEX */}
          <div className="glass-card p-5 flex flex-col items-center">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Índice de Confiança</h3>
            <div className="relative w-28 h-28 mb-2">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 112 112">
                <circle cx="56" cy="56" r="46" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                <circle
                  cx="56" cy="56" r="46" fill="none"
                  stroke={winRate >= 65 ? 'var(--green)' : winRate >= 50 ? 'var(--yellow)' : 'var(--red)'}
                  strokeWidth="8" strokeLinecap="round"
                  strokeDasharray="289"
                  strokeDashoffset={289 * (1 - (signal ? signal.score / 100 : total > 0 ? winRate / 100 : 0.5))}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-2xl font-black text-white">
                  {signal ? signal.score : total > 0 ? winRate : '—'}
                  {(signal || total > 0) ? '%' : ''}
                </div>
                <div className="text-[9px] text-gray-500 uppercase tracking-widest">
                  {signal ? signal.quality : total > 0 ? 'WIN RATE' : 'AGUARD.'}
                </div>
              </div>
            </div>
            <div className="text-xs text-gray-600 text-center">
              {signal ? `Motor: ${signal.consensus}/5 universos` : 'Aguardando sinal'}
            </div>
          </div>

          {/* ENGINE INFO */}
          <div className="glass-card p-4 space-y-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Motor de Análise</h3>
            {[
              { label: 'EMA 9/21/50', ok: true },
              { label: 'RSI (14)', ok: true },
              { label: 'MACD (12,26,9)', ok: true },
              { label: 'Bollinger Bands', ok: true },
              { label: 'ADX (14)', ok: true },
              { label: 'ATR (14)', ok: true },
              { label: 'OBV', ok: true },
              { label: 'Stochastic', ok: true },
              { label: category === 'crypto' ? 'Binance WebSocket' : 'Simulação O-U', ok: isConnected },
              { label: 'DNA de Candle', ok: true },
              { label: 'MM Trap Detector', ok: true },
              { label: 'Shannon Entropy', ok: true },
              { label: 'Multi-Universo 5x', ok: true },
            ].map(({ label, ok }) => (
              <div key={label} className="flex items-center justify-between text-xs">
                <span className="text-gray-500">{label}</span>
                <div className={`w-2 h-2 rounded-full ${ok ? 'bg-[var(--green)]' : 'bg-yellow-500 animate-pulse'}`} />
              </div>
            ))}
          </div>

          {/* PROTECTION */}
          {Math.abs(streak) >= 3 && (
            <div className={`glass-card p-4 border ${streak < 0 ? 'border-red-500/30 bg-red-500/5' : 'border-green-500/30 bg-green-500/5'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Shield size={14} className={streak < 0 ? 'text-red-400' : 'text-green-400'} />
                <span className="text-xs font-bold text-white">
                  {streak < 0 ? '⚠️ Alerta de Sequência' : '🔥 Sequência Positiva'}
                </span>
              </div>
              <p className="text-xs text-gray-400">
                {streak < 0
                  ? `${Math.abs(streak)} perdas consecutivas. Considere fazer uma pausa.`
                  : `${streak} vitórias seguidas! Continue com disciplina.`}
              </p>
            </div>
          )}
        </div>
      </div>}

      {/* TRADINGVIEW CHART — só no modo single */}
      {!multiPairMode && <div className="glass-card p-1">
        <TradingViewWidget symbol={TV_SYMBOLS[asset] || `FX:${asset}`} height={380} />
      </div>}

      {/* MINI TRADE HISTORY */}
      {recentTrades.length > 0 && (
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Operações de Hoje</h3>
            <span className="text-xs text-gray-600">{recentTrades.length} registros</span>
          </div>
          <div className="space-y-1.5">
            {recentTrades.map((t, i) => (
              <div key={t.id || i} className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-xs ${
                t.result === 'win' ? 'bg-[var(--green)]/5 border-[var(--green)]/15' : 'bg-[var(--red)]/5 border-[var(--red)]/15'
              }`}>
                <span className={`text-base leading-none ${t.result === 'win' ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                  {t.result === 'win' ? '✅' : '❌'}
                </span>
                <span className="font-bold text-white w-16 shrink-0">{t.asset || '—'}</span>
                <span className={`font-bold text-[10px] px-1.5 py-0.5 rounded ${
                  t.direction === 'CALL' ? 'text-[var(--green)] bg-[var(--green)]/10' : 'text-[var(--red)] bg-[var(--red)]/10'
                }`}>{t.direction === 'CALL' ? '▲ CALL' : '▼ PUT'}</span>
                {t.quality && t.quality !== 'MANUAL' && (
                  <span className="text-gray-600 text-[10px]">{t.quality}</span>
                )}
                {t.manual && <span className="text-gray-600 text-[10px]">manual</span>}
                <span className="ml-auto text-gray-600 tabular-nums">
                  {new Date(t.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── FLOATING WIN/LOSS BAR (apenas no modo single) ─── */}
      <AnimatePresence>
        {pendingSignal && !multiPairMode && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 p-4 safe-area-pb"
            style={{ background: 'linear-gradient(to top, rgba(7,7,13,0.98) 70%, transparent)' }}
          >
            <div className="max-w-2xl mx-auto">
              {/* Signal summary row */}
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full animate-pulse ${pendingSignal.direction === 'CALL' ? 'bg-[var(--green)]' : 'bg-[var(--red)]'}`} />
                  <span className="text-xs font-bold text-white">{pendingSignal.asset}</span>
                  <span className={`text-xs font-black ${pendingSignal.direction === 'CALL' ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                    {pendingSignal.direction === 'CALL' ? '▲ CALL' : '▼ PUT'}
                  </span>
                  <span className="text-[10px] text-gray-500">{pendingSignal.quality} · {pendingSignal.score}%</span>
                </div>
                <span className="text-[10px] text-gray-600 animate-pulse">Marque o resultado →</span>
              </div>

              {/* Big WIN/LOSS buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleResult('win')}
                  className="py-4 rounded-2xl font-black text-xl flex items-center justify-center gap-2 bg-[var(--green)]/15 text-[var(--green)] hover:bg-[var(--green)]/25 border border-[var(--green)]/25 transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-[var(--green)]/10"
                >
                  ✅ DEU WIN
                </button>
                <button
                  onClick={() => handleResult('loss')}
                  className="py-4 rounded-2xl font-black text-xl flex items-center justify-center gap-2 bg-[var(--red)]/15 text-[var(--red)] hover:bg-[var(--red)]/25 border border-[var(--red)]/25 transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-[var(--red)]/10"
                >
                  ❌ DEU LOSS
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom spacer when floating bar is visible */}
      {pendingSignal && <div className="h-32" />}
    </div>
  );
}
