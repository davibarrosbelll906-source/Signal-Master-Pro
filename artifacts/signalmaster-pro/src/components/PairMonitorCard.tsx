import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ASSET_CATEGORIES, CRYPTO_SYMBOLS, BASE_PRICES,
  getCurrentSession, runEngine, generateOUCandle,
  playSignalSound, vibrate, updateMLWeights,
  type Candle, type CandleBuffer, type SignalResult
} from "@/lib/signalEngine";

const ASSET_ICONS: Record<string, string> = {
  BTCUSD: '₿', ETHUSD: 'Ξ', SOLUSD: '◎', BNBUSD: '⬡', XRPUSD: '✕', ADAUSD: '₳',
  DOGEUSD: 'Ð', LTCUSD: 'Ł', EURUSD: '€$', GBPUSD: '£$', USDJPY: '$¥', AUDUSD: 'A$',
  USDCAD: 'C$', NZDUSD: 'N$', EURGBP: '€£', GBPJPY: '£¥',
  XAUUSD: 'Au', XAGUSD: 'Ag', USOIL: '🛢'
};

const CATEGORY_LABEL: Record<string, string> = {
  crypto: 'Crypto', forex: 'Forex', commodity: 'Comod.'
};
const CATEGORY_COLOR: Record<string, string> = {
  crypto: 'text-yellow-400', forex: 'text-blue-400', commodity: 'text-orange-400'
};

interface Props {
  asset: string;
  seconds: number;
  onRemove: () => void;
  onSignalFired?: (asset: string, signal: SignalResult) => void;
}

export default function PairMonitorCard({ asset, seconds, onRemove, onSignalFired }: Props) {
  const [signal, setSignal] = useState<SignalResult | null>(null);
  const [pendingSignal, setPendingSignal] = useState<SignalResult | null>(null);
  const [price, setPrice] = useState<number | null>(null);
  const [priceDir, setPriceDir] = useState<'up' | 'down' | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [bufferSize, setBufferSize] = useState(0);
  const [statusText, setStatusText] = useState('iniciando...');
  const [resultSaved, setResultSaved] = useState<'win' | 'loss' | null>(null);

  const bufRef = useRef<CandleBuffer>({ m1: [], m5: [], m15: [] });
  const wsRef = useRef<WebSocket | null>(null);
  const ouTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ouPriceRef = useRef<number>(1.0);
  const fireMinuteRef = useRef<number>(-1);
  const prevPriceRef = useRef<number | null>(null);

  const category = ASSET_CATEGORIES[asset] as 'crypto' | 'forex' | 'commodity';

  // ── Binance WebSocket connection ───────────────────────────────────────────
  const connectBinance = useCallback((sym: string) => {
    const binanceSym = CRYPTO_SYMBOLS[sym];
    if (!binanceSym) return;
    setStatusText('conectando...');
    setIsConnected(false);

    fetch(`https://api.binance.com/api/v3/klines?symbol=${binanceSym.toUpperCase()}&interval=1m&limit=200`)
      .then(r => r.json())
      .then((data: any[]) => {
        const candles: Candle[] = data.map((k: any) => ({
          o: parseFloat(k[1]), h: parseFloat(k[2]), l: parseFloat(k[3]), c: parseFloat(k[4]),
          v: parseFloat(k[5]), t: k[0]
        }));
        bufRef.current.m1 = candles;
        setBufferSize(candles.length);
        const last = candles[candles.length - 1];
        setPrice(last.c);
        prevPriceRef.current = last.c;
        setIsConnected(true);
        setStatusText(`${candles.length} velas`);

        const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${binanceSym.toLowerCase()}@kline_1m`);
        wsRef.current = ws;
        ws.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data);
            const k = msg.k;
            const candle: Candle = {
              o: parseFloat(k.o), h: parseFloat(k.h), l: parseFloat(k.l), c: parseFloat(k.c),
              v: parseFloat(k.v), t: k.t
            };
            const newPrice = candle.c;
            const prev = prevPriceRef.current;
            if (prev !== null) setPriceDir(newPrice >= prev ? 'up' : 'down');
            prevPriceRef.current = newPrice;
            setPrice(newPrice);
            const buf = bufRef.current;
            if (k.x) {
              buf.m1.push(candle);
              if (buf.m1.length > 200) buf.m1.shift();
            } else {
              if (buf.m1.length > 0) buf.m1[buf.m1.length - 1] = candle;
            }
            setBufferSize(buf.m1.length);
          } catch {}
        };
        ws.onclose = () => setIsConnected(false);
        ws.onerror = () => setIsConnected(false);
      })
      .catch(() => setStatusText('erro Binance'));
  }, []);

  // ── Ornstein-Uhlenbeck simulation ─────────────────────────────────────────
  const startOU = useCallback((sym: string) => {
    const basePrice = BASE_PRICES[sym] || 1.0;
    let p = basePrice;
    const history: Candle[] = [];
    for (let i = 0; i < 100; i++) {
      const c = generateOUCandle(p, sym);
      history.push(c);
      p = c.c;
    }
    bufRef.current.m1 = history;
    ouPriceRef.current = p;
    setBufferSize(history.length);
    setPrice(p);
    prevPriceRef.current = p;
    setIsConnected(true);
    setStatusText(`${history.length} velas sim.`);

    ouTimerRef.current = setInterval(() => {
      const c = generateOUCandle(ouPriceRef.current, sym);
      const newP = c.c;
      setPriceDir(newP >= ouPriceRef.current ? 'up' : 'down');
      ouPriceRef.current = newP;
      const buf = bufRef.current;
      buf.m1.push(c);
      if (buf.m1.length > 200) buf.m1.shift();
      setBufferSize(buf.m1.length);
      setPrice(newP);
    }, 60000);
  }, []);

  // ── Connect on mount / asset change ───────────────────────────────────────
  useEffect(() => {
    wsRef.current?.close();
    if (ouTimerRef.current) clearInterval(ouTimerRef.current);
    bufRef.current = { m1: [], m5: [], m15: [] };
    setBufferSize(0);
    setIsConnected(false);
    setSignal(null);
    setPendingSignal(null);
    setResultSaved(null);
    fireMinuteRef.current = -1;

    if (category === 'crypto') connectBinance(asset);
    else startOU(asset);

    return () => {
      wsRef.current?.close();
      if (ouTimerRef.current) clearInterval(ouTimerRef.current);
    };
  }, [asset, category, connectBinance, startOU]);

  // ── Signal engine: fires at second 48 ────────────────────────────────────
  useEffect(() => {
    if (seconds !== 48) return;
    const thisMinute = Math.floor(Date.now() / 60000);
    if (fireMinuteRef.current === thisMinute) return;
    fireMinuteRef.current = thisMinute;

    const buf = bufRef.current;
    if (buf.m1.length < 30) {
      setStatusText(`aguardando dados (${buf.m1.length}/30)`);
      return;
    }

    try {
      const result = runEngine(buf, asset);
      if (result) {
        setSignal(result);
        setPendingSignal(result);
        setResultSaved(null);
        const soundType = result.quality === 'PREMIUM' ? 'premium' : category === 'crypto' ? 'crypto' : 'forte';
        playSignalSound(soundType);
        vibrate('forte');
        setStatusText(`sinal ${result.quality}!`);
        onSignalFired?.(asset, result);
      } else {
        setStatusText('sem sinal — aguardando');
      }
    } catch {
      setStatusText('erro no motor');
    }
  }, [seconds, asset, category, onSignalFired]);

  // ── WIN/LOSS handlers ─────────────────────────────────────────────────────
  const handleResult = (type: 'win' | 'loss') => {
    if (!pendingSignal) return;
    playSignalSound(type);
    vibrate(type);
    const entry = { ...pendingSignal, result: type, id: Date.now(), ts: pendingSignal.ts || Date.now() };
    try {
      const hist = JSON.parse(localStorage.getItem('smpH7') || '[]');
      hist.push(entry);
      localStorage.setItem('smpH7', JSON.stringify(hist));
    } catch {}
    updateMLWeights(pendingSignal, type);
    setResultSaved(type);
    setPendingSignal(null);
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const fmtPrice = (p: number) =>
    p < 10 ? p.toFixed(5) : p < 1000 ? p.toFixed(4) : p.toFixed(2);

  const progressPct = seconds < 48 ? (seconds / 48) * 100 : 100;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`glass-card p-4 relative flex flex-col gap-3 transition-all duration-300 ${
        pendingSignal
          ? pendingSignal.direction === 'CALL'
            ? 'border border-[var(--green)]/40 shadow-lg shadow-[var(--green)]/10'
            : 'border border-[var(--red)]/40 shadow-lg shadow-[var(--red)]/10'
          : 'border border-white/5'
      }`}
    >
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold ${CATEGORY_COLOR[category]}`}>
              {ASSET_ICONS[asset] || asset.slice(0, 2)}
            </span>
            <span className="text-sm font-black text-white tracking-wide">{asset.replace('USD', '/USD')}</span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold bg-white/5 ${CATEGORY_COLOR[category]}`}>
              {CATEGORY_LABEL[category]}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-[var(--green)] animate-pulse' : 'bg-gray-600'}`} />
            <span className="text-[10px] text-gray-600">{statusText}</span>
          </div>
        </div>
        <button
          onClick={onRemove}
          className="w-5 h-5 rounded-full bg-white/5 hover:bg-white/15 text-gray-600 hover:text-white transition-all text-[10px] flex items-center justify-center shrink-0 mt-0.5"
        >✕</button>
      </div>

      {/* ── Price ── */}
      {price !== null && (
        <div className="flex items-center gap-2">
          <span className={`text-xl font-black font-mono tabular-nums ${
            priceDir === 'up' ? 'text-[var(--green)]' : priceDir === 'down' ? 'text-[var(--red)]' : 'text-white'
          }`}>
            {fmtPrice(price)}
          </span>
          {priceDir && (
            <span className={`text-sm ${priceDir === 'up' ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
              {priceDir === 'up' ? '▲' : '▼'}
            </span>
          )}
        </div>
      )}

      {/* ── Countdown bar ── */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px] text-gray-600">
          <span>Próximo sinal</span>
          <span className={`font-mono font-bold ${seconds === 48 ? 'text-[var(--green)] animate-pulse' : ''}`}>
            :{String(seconds).padStart(2, '0')}s
          </span>
        </div>
        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${seconds === 48 ? 'bg-[var(--green)]' : 'bg-blue-500/60'}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* ── Signal / Result area ── */}
      <AnimatePresence mode="wait">
        {pendingSignal ? (
          <motion.div
            key="pending"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="space-y-2"
          >
            {/* Direction + quality */}
            <div className="flex items-center gap-2">
              <span className={`font-black text-lg ${pendingSignal.direction === 'CALL' ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                {pendingSignal.direction === 'CALL' ? '▲ CALL' : '▼ PUT'}
              </span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                pendingSignal.quality === 'PREMIUM'
                  ? 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10'
                  : 'text-[var(--green)] border-[var(--green)]/30 bg-[var(--green)]/10'
              }`}>
                {pendingSignal.quality}
              </span>
              <span className="text-[10px] text-gray-500 ml-auto">{pendingSignal.score}%</span>
            </div>

            {/* WIN / LOSS buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleResult('win')}
                className="py-2.5 rounded-xl font-black text-sm flex items-center justify-center gap-1.5
                  bg-[var(--green)]/15 text-[var(--green)] hover:bg-[var(--green)]/25
                  border border-[var(--green)]/25 transition-all active:scale-95"
              >
                ✅ WIN
              </button>
              <button
                onClick={() => handleResult('loss')}
                className="py-2.5 rounded-xl font-black text-sm flex items-center justify-center gap-1.5
                  bg-[var(--red)]/15 text-[var(--red)] hover:bg-[var(--red)]/25
                  border border-[var(--red)]/25 transition-all active:scale-95"
              >
                ❌ LOSS
              </button>
            </div>
          </motion.div>
        ) : resultSaved ? (
          <motion.div
            key="saved"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`text-center py-1 text-sm font-bold rounded-lg ${
              resultSaved === 'win'
                ? 'text-[var(--green)] bg-[var(--green)]/10'
                : 'text-[var(--red)] bg-[var(--red)]/10'
            }`}
          >
            {resultSaved === 'win' ? '✅ WIN registrado' : '❌ LOSS registrado'}
          </motion.div>
        ) : signal ? (
          <motion.div
            key="last"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 py-1"
          >
            <span className="text-[10px] text-gray-600">Último:</span>
            <span className={`text-xs font-bold ${signal.direction === 'CALL' ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
              {signal.direction === 'CALL' ? '▲ CALL' : '▼ PUT'}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
              signal.quality === 'PREMIUM' ? 'text-yellow-400 bg-yellow-400/10' : 'text-[var(--green)] bg-[var(--green)]/10'
            }`}>{signal.quality}</span>
            <span className="text-[10px] text-gray-600 ml-auto">
              {new Date(signal.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </motion.div>
        ) : (
          <motion.div
            key="waiting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-1"
          >
            <span className="text-[10px] text-gray-700">Aguardando próximo ciclo...</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
