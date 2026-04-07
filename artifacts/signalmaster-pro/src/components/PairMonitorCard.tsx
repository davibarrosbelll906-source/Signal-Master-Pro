import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ASSET_CATEGORIES, CRYPTO_SYMBOLS, BASE_PRICES,
  runEngine, runEngineDiag, generateOUCandle,
  playSignalSound, vibrate, updateMLWeights,
  type Candle, type CandleBuffer, type SignalResult
} from "@/lib/signalEngine";

const ASSET_ICONS: Record<string, string> = {
  BTCUSD: '₿', ETHUSD: 'Ξ', SOLUSD: '◎', BNBUSD: '⬡', XRPUSD: '✕', ADAUSD: '₳',
  DOGEUSD: 'Ð', LTCUSD: 'Ł', EURUSD: '€$', GBPUSD: '£$', USDJPY: '$¥', AUDUSD: 'A$',
  USDCAD: 'C$', NZDUSD: 'N$', EURGBP: '€£', GBPJPY: '£¥',
  XAUUSD: 'Au', XAGUSD: 'Ag', USOIL: '🛢'
};

const CATEGORY_COLOR: Record<string, string> = {
  crypto: 'text-yellow-400', forex: 'text-blue-400', commodity: 'text-orange-400'
};
const CATEGORY_LABEL: Record<string, string> = {
  crypto: 'Crypto', forex: 'Forex', commodity: 'Comod.'
};

interface Props {
  asset: string;
  timeframe?: 'M1' | 'M5' | 'M15';
  onRemove: () => void;
}

export default function PairMonitorCard({ asset, timeframe = 'M1', onRemove }: Props) {
  const [signal, setSignal] = useState<SignalResult | null>(null);
  const [pendingSignal, setPendingSignal] = useState<SignalResult | null>(null);
  const [price, setPrice] = useState<number | null>(null);
  const [priceDir, setPriceDir] = useState<'up' | 'down' | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [bufferSize, setBufferSize] = useState(0);
  const [statusText, setStatusText] = useState('iniciando...');
  const [resultSaved, setResultSaved] = useState<'win' | 'loss' | null>(null);
  const [seconds, setSeconds] = useState(new Date().getSeconds());
  const [blockReason, setBlockReason] = useState<string | null>(null);
  const [lastRunTime, setLastRunTime] = useState<string | null>(null);

  const bufRef = useRef<CandleBuffer>({ m1: [], m5: [], m15: [] });
  const wsRef = useRef<WebSocket | null>(null);
  const ouTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ouPriceRef = useRef<number>(1.0);
  const fireMinuteRef = useRef<number>(-1);
  const prevPriceRef = useRef<number | null>(null);

  const category = ASSET_CATEGORIES[asset] as 'crypto' | 'forex' | 'commodity';

  // ── Binance WebSocket ───────────────────────────────────────────────────
  const connectBinance = useCallback((sym: string) => {
    const binanceSym = CRYPTO_SYMBOLS[sym];
    if (!binanceSym) return;
    setStatusText('conectando Binance...');
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
        setStatusText(`${candles.length} velas prontas`);

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
            if (prevPriceRef.current !== null) setPriceDir(newPrice >= prevPriceRef.current ? 'up' : 'down');
            prevPriceRef.current = newPrice;
            setPrice(newPrice);
            const buf = bufRef.current;
            if (k.x) { buf.m1.push(candle); if (buf.m1.length > 200) buf.m1.shift(); }
            else if (buf.m1.length > 0) buf.m1[buf.m1.length - 1] = candle;
            setBufferSize(buf.m1.length);
          } catch {}
        };
        ws.onclose = () => { setIsConnected(false); setStatusText('reconectando...'); };
        ws.onerror = () => setIsConnected(false);
      })
      .catch(() => setStatusText('erro Binance - usando simulação'));
  }, []);

  // ── Ornstein-Uhlenbeck simulation ───────────────────────────────────────
  const startOU = useCallback((sym: string) => {
    const basePrice = BASE_PRICES[sym] || 1.0;
    let p = basePrice;

    // Pre-generate 150 candles with a time offset per candle for variety
    const history: Candle[] = [];
    for (let i = 0; i < 150; i++) {
      // Use fake past timestamps so each candle seed differs
      const fakePast = Date.now() - (150 - i) * 60000;
      const seed = fakePast % 1000000;
      const r1 = Math.abs(Math.sin(seed * 9301 + 49297 + i * 1337) % 1) || 0.01;
      const r2 = Math.abs(Math.sin(seed * 49297 + 233 + i * 7919) % 1) || 0.01;
      const mu = BASE_PRICES[sym] || p;
      const theta = 0.05;
      const sigma = (sym === 'XAUUSD' ? 0.002 : sym === 'USOIL' ? 0.003 : 0.0003);
      const dt = 1 / 1440;
      const drift = theta * (mu - p) * dt;
      const normal = Math.sqrt(-2 * Math.log(r1)) * Math.cos(2 * Math.PI * r2);
      const close = p + drift + sigma * normal * Math.sqrt(dt) * 100;
      const range = sigma * (0.8 + Math.abs(normal) * 0.5);
      const open = p;
      const high = Math.max(open, close) + range * 0.3;
      const low = Math.min(open, close) - range * 0.3;
      history.push({ o: open, h: high, l: low, c: close, v: 1000 + Math.abs(normal) * 500, t: fakePast });
      p = close;
    }
    bufRef.current.m1 = history;
    ouPriceRef.current = p;
    setBufferSize(history.length);
    setPrice(p);
    prevPriceRef.current = p;
    setIsConnected(true);
    setStatusText(`${history.length} velas prontas`);

    // Live candle every 60s
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

  // ── Connect on mount / asset change ────────────────────────────────────
  useEffect(() => {
    wsRef.current?.close();
    if (ouTimerRef.current) clearInterval(ouTimerRef.current);
    bufRef.current = { m1: [], m5: [], m15: [] };
    setBufferSize(0);
    setIsConnected(false);
    setSignal(null);
    setPendingSignal(null);
    setResultSaved(null);
    setBlockReason(null);
    setLastRunTime(null);
    fireMinuteRef.current = -1;

    if (category === 'crypto') connectBinance(asset);
    else startOU(asset);

    return () => {
      wsRef.current?.close();
      if (ouTimerRef.current) clearInterval(ouTimerRef.current);
    };
  }, [asset, category, connectBinance, startOU]);

  // ── Timeframe helpers ─────────────────────────────────────────────────
  const shouldFireNow = (sec: number, min: number): boolean => {
    if (sec !== 48) return false;
    if (timeframe === 'M1') return true;
    if (timeframe === 'M5') return min % 5 === 0;
    if (timeframe === 'M15') return min % 15 === 0;
    return false;
  };

  const getSecsToNext = (min: number, sec: number): number => {
    if (timeframe === 'M1') return sec <= 48 ? 48 - sec : 60 - sec + 48;
    const interval = timeframe === 'M5' ? 5 : 15;
    const intervalSecs = interval * 60;
    const cur = min * 60 + sec;
    let n = Math.floor(cur / intervalSecs);
    let next = n * intervalSecs + 48;
    if (next <= cur) { n++; next = n * intervalSecs + 48; }
    return next - cur;
  };

  // ── Own 1-second ticker — completely independent from parent ───────────
  useEffect(() => {
    const tick = setInterval(() => {
      const now = new Date();
      const sec = now.getSeconds();
      const min = now.getMinutes();
      setSeconds(sec);

      if (shouldFireNow(sec, min)) {
        const thisMinute = Math.floor(Date.now() / 60000);
        // For M5/M15, use a key that combines minute with interval bucket
        const bucketKey = timeframe === 'M1' ? thisMinute
          : timeframe === 'M5' ? Math.floor(min / 5) + thisMinute * 100
          : Math.floor(min / 15) + thisMinute * 100;
        if (fireMinuteRef.current === bucketKey) return;
        fireMinuteRef.current = bucketKey;

        const buf = bufRef.current;
        if (buf.m1.length < 30) {
          setStatusText(`aguardando dados (${buf.m1.length}/30)`);
          return;
        }

        setLastRunTime(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

        try {
          // Run diag first to show block reason
          const diag = runEngineDiag(buf, asset);
          const result = runEngine(buf, asset);

          if (result) {
            setSignal(result);
            setPendingSignal(result);
            setResultSaved(null);
            setBlockReason(null);
            const soundType = result.quality === 'PREMIUM' ? 'premium' : category === 'crypto' ? 'crypto' : 'forte';
            playSignalSound(soundType);
            vibrate('forte');
            setStatusText(`✦ ${result.quality}`);
          } else {
            const reason = diag?.blockedBy || 'condições insuficientes';
            setBlockReason(reason);
            setStatusText('sem sinal');
          }
        } catch (e) {
          setStatusText('erro motor');
        }
      }
    }, 1000);

    return () => clearInterval(tick);
  }, [asset, category, timeframe]);

  // ── WIN/LOSS ─────────────────────────────────────────────────────────────
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

  const curMin = new Date().getMinutes();
  const secsToNext = getSecsToNext(curMin, seconds);
  const tfTotalSecs = timeframe === 'M1' ? 60 : timeframe === 'M5' ? 300 : 900;
  const progressPct = Math.max(0, Math.min(100, ((tfTotalSecs - secsToNext) / tfTotalSecs) * 100));
  const isFiring = shouldFireNow(seconds, curMin);
  const TF_COLORS: Record<string, string> = { M1: 'bg-blue-500/50', M5: 'bg-blue-400/70', M15: 'bg-amber-500/70' };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`glass-card p-4 relative flex flex-col gap-3 transition-colors duration-500 ${
        pendingSignal
          ? pendingSignal.direction === 'CALL'
            ? 'border border-[var(--green)]/50 shadow-lg shadow-[var(--green)]/10'
            : 'border border-[var(--red)]/50 shadow-lg shadow-[var(--red)]/10'
          : 'border border-white/5'
      }`}
    >
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-xs font-bold ${CATEGORY_COLOR[category]}`}>
              {ASSET_ICONS[asset] || asset.slice(0, 2)}
            </span>
            <span className="text-sm font-black text-white tracking-wide">
              {asset.length > 6 ? asset : asset.replace('USD', '/USD')}
            </span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold bg-white/5 ${CATEGORY_COLOR[category]}`}>
              {CATEGORY_LABEL[category]}
            </span>
            {/* Quality + Score badge — shown when there's any signal */}
            {(pendingSignal || signal) && (() => {
              const s = pendingSignal || signal!;
              return (
                <>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black border ${
                    s.quality === 'ELITE'
                      ? 'text-white border-white/40 bg-white/10'
                      : s.quality === 'PREMIUM'
                      ? 'text-yellow-300 border-yellow-400/40 bg-yellow-400/10'
                      : s.quality === 'FORTE'
                      ? 'text-[var(--green)] border-[var(--green)]/30 bg-[var(--green)]/10'
                      : 'text-blue-300 border-blue-400/30 bg-blue-400/10'
                  }`}>
                    {s.quality === 'ELITE' ? '👑' : s.quality}
                  </span>
                  <span className="text-[9px] font-black text-white/70 tabular-nums">{s.score}%</span>
                </>
              );
            })()}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isConnected ? 'bg-[var(--green)] animate-pulse' : 'bg-yellow-500'}`} />
            <span className="text-[10px] text-gray-500 truncate">{statusText}</span>
          </div>
        </div>
        <button
          onClick={onRemove}
          className="w-5 h-5 rounded-full bg-white/5 hover:bg-red-500/20 text-gray-600 hover:text-red-400 transition-all text-[10px] flex items-center justify-center shrink-0"
        >✕</button>
      </div>

      {/* ── Price ── */}
      {price !== null && (
        <div className="flex items-baseline gap-2">
          <span className={`text-xl font-black font-mono tabular-nums ${
            priceDir === 'up' ? 'text-[var(--green)]' : priceDir === 'down' ? 'text-[var(--red)]' : 'text-white'
          }`}>
            {fmtPrice(price)}
          </span>
          {priceDir && (
            <span className={`text-xs font-bold ${priceDir === 'up' ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
              {priceDir === 'up' ? '▲' : '▼'}
            </span>
          )}
        </div>
      )}

      {/* ── Countdown progress bar ── */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-600">
            {isFiring
              ? <span className="text-[var(--green)] font-bold animate-pulse">⚡ Analisando {timeframe}...</span>
              : <span>
                  Próximo{' '}
                  <span className={`font-bold text-[10px] ${timeframe === 'M15' ? 'text-amber-400' : timeframe === 'M5' ? 'text-blue-400' : 'text-blue-300'}`}>{timeframe}</span>
                  {' '}em <span className="font-mono tabular-nums text-gray-400">
                    {secsToNext >= 60 ? `${Math.floor(secsToNext/60)}m${secsToNext%60 > 0 ? String(secsToNext%60).padStart(2,'0')+'s' : ''}` : `${secsToNext}s`}
                  </span>
                </span>
            }
          </span>
          {lastRunTime && (
            <span className="text-[9px] text-gray-700 tabular-nums">última: {lastRunTime}</span>
          )}
        </div>
        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              isFiring ? 'bg-[var(--green)]' : TF_COLORS[timeframe]
            }`}
            style={{ width: isFiring ? '100%' : `${progressPct}%` }}
          />
        </div>
      </div>

      {/* ── Signal / Result / Blocked area ── */}
      <AnimatePresence mode="wait">
        {pendingSignal ? (
          <motion.div key="pending" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="space-y-2">
            <div className="flex items-center gap-2">
              <span className={`font-black text-xl ${pendingSignal.direction === 'CALL' ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
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
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => handleResult('win')}
                className="py-2.5 rounded-xl font-black text-sm flex items-center justify-center gap-1
                  bg-[var(--green)]/15 text-[var(--green)] hover:bg-[var(--green)]/25
                  border border-[var(--green)]/25 transition-all active:scale-95"
              >✅ WIN</button>
              <button
                onClick={() => handleResult('loss')}
                className="py-2.5 rounded-xl font-black text-sm flex items-center justify-center gap-1
                  bg-[var(--red)]/15 text-[var(--red)] hover:bg-[var(--red)]/25
                  border border-[var(--red)]/25 transition-all active:scale-95"
              >❌ LOSS</button>
            </div>
          </motion.div>

        ) : resultSaved ? (
          <motion.div key="saved" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className={`text-center py-1.5 text-sm font-bold rounded-lg ${
              resultSaved === 'win' ? 'text-[var(--green)] bg-[var(--green)]/10' : 'text-[var(--red)] bg-[var(--red)]/10'
            }`}>
            {resultSaved === 'win' ? '✅ WIN registrado' : '❌ LOSS registrado'}
          </motion.div>

        ) : signal ? (
          <motion.div key="last" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className={`rounded-xl px-3 py-2 border flex items-center gap-2 ${
              signal.direction === 'CALL'
                ? 'bg-[var(--green)]/5 border-[var(--green)]/20'
                : 'bg-[var(--red)]/5 border-[var(--red)]/20'
            }`}>
            <span className={`text-sm font-black ${signal.direction === 'CALL' ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
              {signal.direction === 'CALL' ? '▲ CALL' : '▼ PUT'}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black border ${
              signal.quality === 'ELITE'
                ? 'text-white border-white/40 bg-white/10'
                : signal.quality === 'PREMIUM'
                ? 'text-yellow-300 border-yellow-400/40 bg-yellow-400/10'
                : signal.quality === 'FORTE'
                ? 'text-[var(--green)] border-[var(--green)]/30 bg-[var(--green)]/10'
                : 'text-blue-300 border-blue-400/30 bg-blue-400/10'
            }`}>{signal.quality === 'ELITE' ? '👑 ELITE' : signal.quality}</span>
            <span className="text-xs font-black text-white/60 tabular-nums">{signal.score}%</span>
            <span className="text-[9px] text-gray-600 ml-auto tabular-nums">
              {new Date(signal.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </motion.div>

        ) : blockReason ? (
          <motion.div key="blocked" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex items-center gap-1.5 text-[10px] text-gray-600 py-0.5">
            <span>🔒</span>
            <span className="truncate" title={blockReason}>{blockReason}</span>
          </motion.div>

        ) : (
          <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center py-0.5">
            <span className="text-[10px] text-gray-700">Aguardando ciclo :48...</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
