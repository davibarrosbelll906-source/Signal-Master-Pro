import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, CheckCheck, X } from "lucide-react";
import {
  ASSET_CATEGORIES,
  runEngine, runEngineDiag,
  playSignalSound, vibrate, updateMLWeights,
  type CandleBuffer, type SignalResult
} from "@/lib/signalEngine";
import { subscribeAsset } from "@/lib/assetDataManager";

const ASSET_ICONS: Record<string, string> = {
  BTCUSD: '₿', ETHUSD: 'Ξ', SOLUSD: '◎', BNBUSD: '⬡', XRPUSD: '✕', ADAUSD: '₳',
  DOGEUSD: 'Ð', LTCUSD: 'Ł', EURUSD: '€/$', GBPUSD: '£/$', USDJPY: '$/¥', AUDUSD: 'A$',
  USDCAD: 'C$', NZDUSD: 'N$', EURGBP: '€/£', GBPJPY: '£/¥',
  XAUUSD: 'XAU', XAGUSD: 'XAG', USOIL: '🛢'
};

const CATEGORY_COLOR: Record<string, string> = {
  crypto: 'text-yellow-400', forex: 'text-blue-400', commodity: 'text-orange-400'
};
const CATEGORY_BG: Record<string, string> = {
  crypto: 'from-yellow-400/10 to-yellow-400/5', forex: 'from-blue-400/10 to-blue-400/5', commodity: 'from-orange-400/10 to-orange-400/5'
};

const QUALITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  ELITE:   { label: '👑 ELITE',   color: 'text-white',       bg: 'bg-white/10 border-white/30' },
  PREMIUM: { label: '💎 PREMIUM', color: 'text-yellow-300',  bg: 'bg-yellow-400/10 border-yellow-400/30' },
  FORTE:   { label: '🟢 FORTE',   color: 'text-[var(--green)]', bg: 'bg-[var(--green)]/10 border-[var(--green)]/30' },
  MÉDIO:   { label: '🔵 MÉDIO',   color: 'text-blue-300',    bg: 'bg-blue-400/10 border-blue-400/30' },
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
  const [prevPrice, setPrevPrice] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [bufferSize, setBufferSize] = useState(0);
  const [resultSaved, setResultSaved] = useState<'win' | 'loss' | null>(null);
  const [seconds, setSeconds] = useState(new Date().getSeconds());
  const [blockReason, setBlockReason] = useState<string | null>(null);
  const [lastRunMin, setLastRunMin] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  const bufRef = useRef<CandleBuffer>({ m1: [], m5: [], m15: [] });
  const fireMinuteRef = useRef<number>(-1);
  const hasInitFired = useRef(false);
  const category = ASSET_CATEGORIES[asset] as 'crypto' | 'forex' | 'commodity';

  const runAnalysis = useCallback(() => {
    const buf = bufRef.current;
    if (buf.m1.length < 30) return;
    try {
      const diag = runEngineDiag(buf, asset);
      const result = runEngine(buf, asset);
      setHasAnalyzed(true);
      if (result) {
        setSignal(result);
        setPendingSignal(result);
        setResultSaved(null);
        setBlockReason(null);
        playSignalSound(result.quality === 'PREMIUM' ? 'premium' : category === 'crypto' ? 'crypto' : 'forte');
        vibrate('forte');
      } else {
        setBlockReason(diag?.blockedBy || 'condições insuficientes');
      }
    } catch {
      setBlockReason('erro no motor');
    }
  }, [asset, category]);

  // Subscribe to shared asset data manager
  useEffect(() => {
    setSignal(null);
    setPendingSignal(null);
    setResultSaved(null);
    setBlockReason(null);
    setHasAnalyzed(false);
    hasInitFired.current = false;
    fireMinuteRef.current = -1;
    bufRef.current = { m1: [], m5: [], m15: [] };

    const id = `pair-card-${asset}-${Math.random().toString(36).slice(2)}`;
    const unsub = subscribeAsset(asset, id, (buf, p, _dir, connected, bufSize) => {
      bufRef.current = buf;
      if (p) {
        setPrevPrice(prev => prev);
        setPrice(p);
      }
      setIsConnected(connected);
      setBufferSize(bufSize);

      // Fire immediately when we first have enough data
      if (!hasInitFired.current && connected && bufSize >= 30) {
        hasInitFired.current = true;
        setTimeout(runAnalysis, 300);
      }
    });

    return () => { unsub(); };
  }, [asset]);

  // Re-run analysis when runAnalysis function changes (asset/category change)
  useEffect(() => {
    if (hasInitFired.current && bufRef.current.m1.length >= 30) {
      hasInitFired.current = false;
    }
  }, [asset]);

  // 1-second ticker for periodic re-analysis at :48
  const shouldFireNow = useCallback((sec: number, min: number): boolean => {
    if (sec !== 48) return false;
    if (timeframe === 'M1') return true;
    if (timeframe === 'M5') return min % 5 === 0;
    if (timeframe === 'M15') return min % 15 === 0;
    return false;
  }, [timeframe]);

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

  useEffect(() => {
    const tick = setInterval(() => {
      const now = new Date();
      const sec = now.getSeconds();
      const min = now.getMinutes();
      setSeconds(sec);

      if (!shouldFireNow(sec, min)) return;

      const thisMinute = Math.floor(Date.now() / 60000);
      const bucketKey = timeframe === 'M1' ? thisMinute
        : timeframe === 'M5' ? Math.floor(min / 5) + thisMinute * 100
        : Math.floor(min / 15) + thisMinute * 100;
      if (fireMinuteRef.current === bucketKey) return;
      fireMinuteRef.current = bucketKey;

      if (bufRef.current.m1.length < 30) return;
      setLastRunMin(min);
      runAnalysis();
    }, 1000);

    return () => clearInterval(tick);
  }, [asset, category, timeframe, shouldFireNow, runAnalysis]);

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

  const fmtPrice = (p: number) =>
    p < 10 ? p.toFixed(5) : p < 1000 ? p.toFixed(4) : p.toFixed(2);

  const curMin = new Date().getMinutes();
  const secsToNext = getSecsToNext(curMin, seconds);
  const tfTotalSecs = timeframe === 'M1' ? 60 : timeframe === 'M5' ? 300 : 900;
  const progressPct = Math.max(0, Math.min(100, ((tfTotalSecs - secsToNext) / tfTotalSecs) * 100));
  const isFiring = shouldFireNow(seconds, curMin);

  const priceUp = price !== null && prevPrice !== null && price > prevPrice;
  const priceDown = price !== null && prevPrice !== null && price < prevPrice;

  const handleCopy = () => {
    const s = pendingSignal || signal;
    if (!s) return;
    const txt = `📊 ${asset} — ${s.direction === 'CALL' ? '▲ CALL' : '▼ PUT'}\nQualidade: ${s.quality} | Score: ${s.score}%\n${timeframe} | ${new Date(s.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}\n— SignalMaster Pro`;
    navigator.clipboard.writeText(txt).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); }).catch(() => {});
  };

  const qualCfg = pendingSignal ? QUALITY_CONFIG[pendingSignal.quality] : null;
  const lastQualCfg = signal ? QUALITY_CONFIG[signal.quality] : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', damping: 20 }}
      className={`relative rounded-2xl overflow-hidden flex flex-col transition-all duration-500 ${
        pendingSignal
          ? pendingSignal.direction === 'CALL'
            ? 'shadow-[0_0_25px_rgba(0,255,136,0.12)] border border-[var(--green)]/30'
            : 'shadow-[0_0_25px_rgba(255,68,102,0.12)] border border-[var(--red)]/30'
          : 'border border-white/8'
      }`}
      style={{ background: 'rgba(12,12,24,0.85)', backdropFilter: 'blur(20px)' }}
    >
      {/* Category accent bar */}
      <div className={`h-1 w-full bg-gradient-to-r ${CATEGORY_BG[category]}`} />

      {/* Card content */}
      <div className="p-4 flex flex-col gap-3 flex-1">

        {/* ── Header ── */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black border bg-gradient-to-br ${CATEGORY_BG[category]} ${category === 'crypto' ? 'border-yellow-400/20' : category === 'forex' ? 'border-blue-400/20' : 'border-orange-400/20'}`}>
              <span className={CATEGORY_COLOR[category]}>{ASSET_ICONS[asset] || asset.slice(0, 2)}</span>
            </div>
            <div>
              <div className="font-black text-white text-sm leading-none">
                {asset.replace('USD', '/USD')}
              </div>
              <div className={`text-[10px] font-bold mt-0.5 ${CATEGORY_COLOR[category]}`}>
                {category === 'crypto' ? 'Cripto' : category === 'forex' ? 'Forex' : 'Commodity'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Connection dot */}
            <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-[var(--green)] animate-pulse' : 'bg-yellow-500 animate-pulse'}`} />
            <button
              onClick={onRemove}
              className="w-6 h-6 rounded-full bg-white/5 hover:bg-red-500/20 text-gray-600 hover:text-red-400 transition-all flex items-center justify-center"
            >
              <X size={12} />
            </button>
          </div>
        </div>

        {/* ── Price ── */}
        {price !== null && (
          <div className="flex items-baseline gap-2">
            <span className={`text-xl font-black font-mono tabular-nums transition-colors ${
              isFiring ? 'text-white' : priceUp ? 'text-[var(--green)]' : priceDown ? 'text-[var(--red)]' : 'text-white'
            }`}>
              {fmtPrice(price)}
            </span>
            {(priceUp || priceDown) && (
              <span className={`text-xs font-bold ${priceUp ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                {priceUp ? '▲' : '▼'}
              </span>
            )}
          </div>
        )}

        {/* ── Progress bar + countdown ── */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            {isFiring ? (
              <span className="text-[var(--green)] font-bold animate-pulse">⚡ Analisando...</span>
            ) : (
              <span className="text-gray-600">
                Próx. <span className={`font-bold ${timeframe === 'M15' ? 'text-amber-400' : timeframe === 'M5' ? 'text-blue-400' : 'text-gray-400'}`}>{timeframe}</span>
                {' '}em <span className="tabular-nums text-gray-500 font-mono">
                  {secsToNext >= 60 ? `${Math.floor(secsToNext/60)}m${secsToNext%60 > 0 ? String(secsToNext%60).padStart(2,'0')+'s' : ''}` : `${secsToNext}s`}
                </span>
              </span>
            )}
            {lastRunMin !== null && (
              <span className="text-gray-700">ult: {String(lastRunMin).padStart(2,'0')}m</span>
            )}
          </div>
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${isFiring ? 'bg-[var(--green)]' : timeframe === 'M15' ? 'bg-amber-500/60' : timeframe === 'M5' ? 'bg-blue-400/70' : 'bg-blue-500/50'}`}
              animate={{ width: isFiring ? '100%' : `${progressPct}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* ── Signal Area ── */}
        <AnimatePresence mode="wait">

          {/* Pending signal — awaiting WIN/LOSS */}
          {pendingSignal && (
            <motion.div key="pending" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              className={`rounded-xl p-3 space-y-2.5 ${pendingSignal.direction === 'CALL' ? 'bg-[var(--green)]/8 border border-[var(--green)]/20' : 'bg-[var(--red)]/8 border border-[var(--red)]/20'}`}
            >
              {/* Direction + quality */}
              <div className="flex items-center justify-between">
                <div className={`text-2xl font-black tracking-tight ${pendingSignal.direction === 'CALL' ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                  {pendingSignal.direction === 'CALL' ? '▲ CALL' : '▼ PUT'}
                </div>
                <div className="text-right">
                  {qualCfg && (
                    <div className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${qualCfg.bg} ${qualCfg.color}`}>
                      {qualCfg.label}
                    </div>
                  )}
                  <div className="text-[10px] text-gray-500 mt-0.5 tabular-nums">{pendingSignal.score}%</div>
                </div>
              </div>

              {/* Score bar */}
              <div className="h-1 bg-white/8 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-[var(--green)] to-[var(--blue)]"
                  style={{ width: `${pendingSignal.score}%` }} />
              </div>

              {/* WIN/LOSS buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => handleResult('win')}
                  className="py-2.5 rounded-xl font-black text-sm flex items-center justify-center gap-1 bg-[var(--green)]/15 text-[var(--green)] hover:bg-[var(--green)]/25 border border-[var(--green)]/25 transition-all active:scale-95">
                  ✅ WIN
                </button>
                <button onClick={() => handleResult('loss')}
                  className="py-2.5 rounded-xl font-black text-sm flex items-center justify-center gap-1 bg-[var(--red)]/15 text-[var(--red)] hover:bg-[var(--red)]/25 border border-[var(--red)]/25 transition-all active:scale-95">
                  ❌ LOSS
                </button>
              </div>

              {/* Copy button */}
              <button onClick={handleCopy}
                className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${copied ? 'text-[var(--green)] border-[var(--green)]/30 bg-[var(--green)]/5' : 'text-gray-500 border-white/8 bg-white/3 hover:text-white'}`}>
                {copied ? <><CheckCheck size={10} /> Copiado!</> : <><Copy size={10} /> Copiar sinal</>}
              </button>
            </motion.div>
          )}

          {/* Result saved */}
          {!pendingSignal && resultSaved && (
            <motion.div key="saved" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className={`rounded-xl py-3 text-center text-sm font-black flex items-center justify-center gap-2 ${
                resultSaved === 'win' ? 'text-[var(--green)] bg-[var(--green)]/10 border border-[var(--green)]/20' : 'text-[var(--red)] bg-[var(--red)]/10 border border-[var(--red)]/20'
              }`}>
              {resultSaved === 'win' ? '✅ WIN registrado!' : '❌ LOSS registrado'}
            </motion.div>
          )}

          {/* Last signal (already resolved) */}
          {!pendingSignal && !resultSaved && signal && (
            <motion.div key="last" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className={`rounded-xl px-3 py-2.5 border flex items-center gap-3 ${
                signal.direction === 'CALL' ? 'bg-[var(--green)]/5 border-[var(--green)]/15' : 'bg-[var(--red)]/5 border-[var(--red)]/15'
              }`}>
              <span className={`text-lg font-black ${signal.direction === 'CALL' ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                {signal.direction === 'CALL' ? '▲' : '▼'}
              </span>
              <div className="flex-1 min-w-0">
                <div className={`text-xs font-black ${signal.direction === 'CALL' ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                  {signal.direction} — {lastQualCfg?.label || signal.quality}
                </div>
                <div className="text-[9px] text-gray-600 tabular-nums">
                  {new Date(signal.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · {signal.score}%
                </div>
              </div>
              <button onClick={handleCopy} className="text-gray-600 hover:text-gray-400 transition">
                {copied ? <CheckCheck size={11} className="text-[var(--green)]" /> : <Copy size={11} />}
              </button>
            </motion.div>
          )}

          {/* Block reason */}
          {!pendingSignal && !resultSaved && !signal && blockReason && (
            <motion.div key="blocked" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex items-start gap-2 px-3 py-2 rounded-xl bg-orange-500/5 border border-orange-500/15 text-[10px] text-orange-400/80">
              <span className="shrink-0 mt-0.5">⚠</span>
              <span className="truncate" title={blockReason}>{blockReason}</span>
            </motion.div>
          )}

          {/* Initial loading */}
          {!pendingSignal && !resultSaved && !signal && !blockReason && (
            <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="py-3 text-center space-y-1">
              {!isConnected || bufferSize < 30 ? (
                <>
                  <div className="text-[10px] text-gray-600">
                    {!isConnected ? 'Conectando...' : `Carregando (${bufferSize}/30 velas)`}
                  </div>
                  <div className="w-16 h-0.5 bg-white/5 rounded-full mx-auto overflow-hidden">
                    <motion.div className="h-full bg-[var(--blue)]" animate={{ x: ['-100%', '200%'] }} transition={{ repeat: Infinity, duration: 1.2 }} />
                  </div>
                </>
              ) : (
                <div className="text-[10px] text-gray-700">Aguardando próximo ciclo :48...</div>
              )}
            </motion.div>
          )}

        </AnimatePresence>

        {/* Buffer size indicator (small) */}
        {bufferSize > 0 && bufferSize < 30 && (
          <div className="flex items-center gap-1.5">
            <div className="flex-1 h-0.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-[var(--blue)]/50 rounded-full" style={{ width: `${(bufferSize / 30) * 100}%` }} />
            </div>
            <span className="text-[9px] text-gray-700 tabular-nums">{bufferSize}/30</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
