import { useState, useEffect, useRef, useCallback } from "react";
import TradingViewWidget from "@/components/TradingViewWidget";
import { Activity, Check, X, TrendingUp, TrendingDown, Clock, Cpu, Shield, Eye } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ASSET_CATEGORIES, CRYPTO_SYMBOLS, TV_SYMBOLS, BASE_PRICES,
  getCurrentSession, runEngine, generateOUCandle, updateMLWeights, playSignalSound, vibrate,
  type Candle, type CandleBuffer, type SignalResult
} from "@/lib/signalEngine";
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
  PREMIUM: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10',
  FORTE: 'text-[var(--green)] border-[var(--green)]/30 bg-[var(--green)]/10',
  MÉDIO: 'text-blue-400 border-blue-400/30 bg-blue-400/10',
  FRACO: 'text-gray-400 border-gray-400/30 bg-gray-400/10',
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
  const [engineStatus, setEngineStatus] = useState('aguardando dados...');

  const bufRef = useRef<CandleBuffer>({ m1: [], m5: [], m15: [] });
  const wsRef = useRef<WebSocket | null>(null);
  const ouTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ouPriceRef = useRef<number>(1.0);

  // Load stats from localStorage
  useEffect(() => {
    try {
      const hist = JSON.parse(localStorage.getItem('smpH7') || '[]');
      const today = new Date().toDateString();
      const todayHist = hist.filter((h: any) => new Date(h.ts).toDateString() === today);
      setWins(todayHist.filter((h: any) => h.result === 'win').length);
      setLosses(todayHist.filter((h: any) => h.result === 'loss').length);
      // Calculate current streak
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
  }, []);

  // Connect Binance WebSocket for crypto
  const connectBinance = useCallback((sym: string) => {
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    const binanceSym = CRYPTO_SYMBOLS[sym];
    if (!binanceSym) return;

    setIsConnected(false);
    setEngineStatus('conectando Binance WebSocket...');
    bufRef.current = { m1: [], m5: [], m15: [] };
    setBufferSize(0);

    // Load 200 historical candles first via REST
    fetch(`https://api.binance.com/api/v3/klines?symbol=${binanceSym.toUpperCase()}&interval=1m&limit=200`)
      .then(r => r.json())
      .then((data: any[]) => {
        if (!Array.isArray(data)) return;
        bufRef.current.m1 = data.map((k: any) => ({
          t: k[0], o: parseFloat(k[1]), h: parseFloat(k[2]),
          l: parseFloat(k[3]), c: parseFloat(k[4]), v: parseFloat(k[5])
        }));
        setBufferSize(bufRef.current.m1.length);
        const last = bufRef.current.m1[bufRef.current.m1.length - 1];
        const prev = bufRef.current.m1[bufRef.current.m1.length - 2];
        setLastPrice(last.c);
        setPriceChange(prev ? ((last.c - prev.c) / prev.c) * 100 : 0);
        setEngineStatus(`${bufRef.current.m1.length} velas carregadas — aguardando segundo 48`);

        // Now open WebSocket for live updates
        const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${binanceSym}@kline_1m`);
        wsRef.current = ws;
        ws.onopen = () => setIsConnected(true);
        ws.onclose = () => setIsConnected(false);
        ws.onerror = () => {
          setIsConnected(false);
          setEngineStatus('erro WebSocket — reconectando...');
        };
        ws.onmessage = (e) => {
          const msg = JSON.parse(e.data);
          const k = msg.k;
          const candle: Candle = {
            t: k.t, o: parseFloat(k.o), h: parseFloat(k.h),
            l: parseFloat(k.l), c: parseFloat(k.c), v: parseFloat(k.v)
          };
          setLastPrice(candle.c);
          const buf = bufRef.current;
          if (k.x) {
            // Candle closed — append
            buf.m1.push(candle);
            if (buf.m1.length > 200) buf.m1.shift();
          } else {
            // Update current (last) candle
            if (buf.m1.length > 0) {
              buf.m1[buf.m1.length - 1] = candle;
            }
          }
          setBufferSize(buf.m1.length);
        };
      })
      .catch(() => {
        setEngineStatus('erro ao carregar dados Binance');
      });
  }, []);

  // Start O-U simulation for forex/commodity
  const startOU = useCallback((sym: string) => {
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    if (ouTimerRef.current) { clearInterval(ouTimerRef.current); ouTimerRef.current = null; }

    setIsConnected(false);
    setEngineStatus('iniciando simulação...');
    bufRef.current = { m1: [], m5: [], m15: [] };
    setBufferSize(0);

    const basePrice = BASE_PRICES[sym] || 1.0;
    let price = basePrice;
    ouPriceRef.current = price;

    // Pre-generate 100 historical candles
    const history: Candle[] = [];
    for (let i = 0; i < 100; i++) {
      const c = generateOUCandle(price, sym);
      history.push(c);
      price = c.c;
    }
    bufRef.current.m1 = history;
    ouPriceRef.current = price;
    setBufferSize(history.length);
    setLastPrice(price);
    setIsConnected(true);
    setEngineStatus(`${history.length} velas simuladas — aguardando segundo 48`);

    // Generate new candle every 60 seconds
    ouTimerRef.current = setInterval(() => {
      const c = generateOUCandle(ouPriceRef.current, sym);
      ouPriceRef.current = c.c;
      const buf = bufRef.current;
      buf.m1.push(c);
      if (buf.m1.length > 200) buf.m1.shift();
      setBufferSize(buf.m1.length);
      setLastPrice(c.c);
    }, 60000);
  }, []);

  // Handle asset change
  const handleAssetChange = useCallback((newAsset: string) => {
    setAsset(newAsset);
    setSignal(null);
    setPendingSignal(null);
    const cat = ASSET_CATEGORIES[newAsset] as 'crypto' | 'forex' | 'commodity';
    setCategory(cat);
    if (cat === 'crypto') {
      connectBinance(newAsset);
    } else {
      startOU(newAsset);
    }
  }, [connectBinance, startOU]);

  // Initial load
  useEffect(() => {
    startOU('EURUSD');
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (ouTimerRef.current) clearInterval(ouTimerRef.current);
    };
  }, []);

  // 1-second tick — emit signal at second 48
  useEffect(() => {
    const tick = setInterval(() => {
      const now = new Date();
      const sec = now.getSeconds();
      setSeconds(sec);

      if (sec === 48) {
        const buf = bufRef.current;
        if (buf.m1.length < 30) {
          setEngineStatus(`aguardando dados... (${buf.m1.length}/30 velas)`);
          return;
        }
        setEngineStatus('calculando indicadores...');
        try {
          const result = runEngine(buf, asset);
          if (result) {
            setSignal(result);
            setPendingSignal(result);
            const soundType = result.quality === 'PREMIUM' ? 'premium' : category === 'crypto' ? 'crypto' : 'forte';
            playSignalSound(soundType);
            vibrate('forte');
            setEngineStatus(`sinal ${result.quality} emitido — marque WIN ou LOSS`);
          } else {
            setEngineStatus('sinal bloqueado — aguardando próximo ciclo');
          }
        } catch (err) {
          setEngineStatus('erro no motor — verificando dados');
        }
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [asset, category]);

  // WIN/LOSS handlers
  const handleResult = (type: 'win' | 'loss') => {
    if (!pendingSignal) return;
    playSignalSound(type);
    vibrate(type);

    const histEntry = { ...pendingSignal, result: type, id: Date.now() };
    try {
      const hist = JSON.parse(localStorage.getItem('smpH7') || '[]');
      hist.push(histEntry);
      localStorage.setItem('smpH7', JSON.stringify(hist));
    } catch {}

    updateMLWeights(pendingSignal, type);
    setPendingSignal(null);

    if (type === 'win') {
      setWins(w => w + 1);
      setStreak(s => s >= 0 ? s + 1 : 1);
    } else {
      setLosses(l => l + 1);
      setStreak(s => s <= 0 ? s - 1 : -1);
    }
  };

  const total = wins + losses;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
  const timeToNext = seconds <= 48 ? 48 - seconds : 60 - seconds + 48;
  const progressPct = (seconds / 60) * 100;

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
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>{bufferSize} velas M1</span>
          {lastPrice && <span className="font-mono text-white">{lastPrice < 10 ? lastPrice.toFixed(5) : lastPrice < 1000 ? lastPrice.toFixed(4) : lastPrice.toFixed(2)}</span>}
          {priceChange !== 0 && (
            <span className={priceChange >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}>
              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(3)}%
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">

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
          </div>

          {/* COUNTDOWN */}
          <div className="glass-card p-5 flex flex-col items-center">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Próximo Sinal</h3>
            <div className="relative w-24 h-24 mb-3">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 96 96">
                <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                <circle
                  cx="48" cy="48" r="40" fill="none"
                  stroke={seconds === 48 ? 'var(--green)' : 'var(--blue)'}
                  strokeWidth="6" strokeLinecap="round"
                  strokeDasharray="251.3"
                  strokeDashoffset={251.3 * (1 - progressPct / 100)}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-2xl font-bold font-mono tabular-nums text-white">
                  {String(Math.floor(timeToNext / 60)).padStart(2, '0')}:{String(timeToNext % 60).padStart(2, '0')}
                </div>
                <div className="text-[9px] text-gray-500 uppercase tracking-widest">seg {seconds}s</div>
              </div>
            </div>
            <div className="text-xs text-gray-600 text-center">Sinal emite no segundo 48</div>
          </div>

          {/* INDICATORS MINI */}
          {signal && (
            <div className="glass-card p-4 space-y-2">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Indicadores</h3>
              {Object.entries(signal.votes).map(([ind, vote]) => (
                <div key={ind} className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 uppercase">{ind}</span>
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
                    {signal.quality === 'PREMIUM' ? '💎' : signal.quality === 'FORTE' ? '🟢' : '🟡'} {signal.quality}
                  </div>
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
      </div>

      {/* TRADINGVIEW CHART */}
      <div className="glass-card p-1">
        <TradingViewWidget symbol={TV_SYMBOLS[asset] || `FX:${asset}`} height={380} />
      </div>
    </div>
  );
}
