import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, CheckCheck, X, HelpCircle, ChevronDown, ChevronUp, Lock } from "lucide-react";
import { usePlanGuard } from "@/lib/usePlanGuard";
import { useLocation } from "wouter";
import {
  ASSET_CATEGORIES,
  playSignalSound, vibrate, updateMLWeights, explainSignal,
  type SignalResult
} from "@/lib/signalEngine";
import { subscribeAsset } from "@/lib/assetDataManager";
import { useSignalStore } from "@/lib/signalStore";

function PairMonitorIAButton({ showExplain, setShowExplain }: { showExplain: boolean; setShowExplain: (v: (p: boolean) => boolean) => void }) {
  const allowed = usePlanGuard("pro");
  const [, navigate] = useLocation();
  if (!allowed) {
    return (
      <button
        onClick={() => navigate("/dashboard/plans")}
        className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg bg-white/3 border border-white/8 transition-all text-[10px] text-gray-500 cursor-pointer hover:border-purple-500/40 group"
        title="Requer plano PRO"
      >
        <span className="flex items-center gap-1 font-bold group-hover:text-purple-400 transition-colors">
          <HelpCircle size={10} /> Por que este sinal?
        </span>
        <span className="flex items-center gap-1 bg-purple-500/20 text-purple-400 rounded px-1 py-0.5 text-[9px] font-bold">
          <Lock size={8} /> PRO
        </span>
      </button>
    );
  }
  return (
    <button
      onClick={() => setShowExplain(v => !v)}
      className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg bg-white/3 hover:bg-white/6 border border-white/8 transition-all text-[10px] text-gray-500 hover:text-gray-300"
    >
      <span className="flex items-center gap-1 font-bold">
        <HelpCircle size={10} /> Por que este sinal?
      </span>
      {showExplain ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
    </button>
  );
}

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
  const [price, setPrice] = useState<number | null>(null);
  const [prevPrice, setPrevPrice] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [bufferSize, setBufferSize] = useState(0);
  const [resultSaved, setResultSaved] = useState<'win' | 'loss' | null>(null);
  const [markedTs, setMarkedTs] = useState<number | null>(null);
  const [seconds, setSeconds] = useState(new Date().getSeconds());
  const [copied, setCopied] = useState(false);
  const [showExplain, setShowExplain] = useState(false);

  const category = ASSET_CATEGORIES[asset] as 'crypto' | 'forex' | 'commodity';

  // ── Backend signal from Socket.io ──────────────────────────────────────────
  const backendSignal = useSignalStore(s => s.signals[asset]) || null;
  const pendingSignal = backendSignal && backendSignal.ts !== markedTs && backendSignal.passed
    ? backendSignal : null;
  const blockReason = backendSignal?.blockedBy || null;

  // Notify user when a new passing signal arrives
  const prevTsRef = useRef<number | null>(null);
  useEffect(() => {
    if (pendingSignal && pendingSignal.ts !== prevTsRef.current) {
      prevTsRef.current = pendingSignal.ts;
      setResultSaved(null);
      playSignalSound(pendingSignal.quality === 'PREMIUM' || pendingSignal.quality === 'ELITE'
        ? 'premium' : category === 'crypto' ? 'crypto' : 'forte');
      vibrate('forte');
    }
  }, [pendingSignal?.ts]);

  // Subscribe to shared asset data manager for live price display
  useEffect(() => {
    setResultSaved(null);
    setMarkedTs(null);

    const id = `pair-card-${asset}-${Math.random().toString(36).slice(2)}`;
    const unsub = subscribeAsset(asset, id, (_buf, p, _dir, connected, bufSize) => {
      if (p) {
        setPrevPrice(prev => prev);
        setPrice(p);
      }
      setIsConnected(connected);
      setBufferSize(bufSize);
    });

    return () => { unsub(); };
  }, [asset]);

  // 1-second ticker for countdown display
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

  const shouldFireNow = (sec: number, min: number): boolean => {
    if (sec !== 48) return false;
    if (timeframe === 'M1') return true;
    if (timeframe === 'M5') return min % 5 === 0;
    if (timeframe === 'M15') return min % 15 === 0;
    return false;
  };

  useEffect(() => {
    const tick = setInterval(() => {
      setSeconds(new Date().getSeconds());
    }, 1000);
    return () => clearInterval(tick);
  }, []);

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
    updateMLWeights(pendingSignal as unknown as SignalResult, type);
    setResultSaved(type);
    setMarkedTs(pendingSignal.ts);
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
    const s = pendingSignal || backendSignal;
    if (!s) return;
    const txt = `📊 ${asset} — ${s.direction === 'CALL' ? '▲ CALL' : '▼ PUT'}\nQualidade: ${s.quality} | Score: ${s.score}%\n${timeframe} | ${new Date(s.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}\n— SignalMaster Pro`;
    navigator.clipboard.writeText(txt).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); }).catch(() => {});
  };

  const qualCfg = pendingSignal ? QUALITY_CONFIG[pendingSignal.quality] : null;
  const lastQualCfg = backendSignal ? QUALITY_CONFIG[backendSignal.quality] : null;

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
            {backendSignal && (
              <span className="text-gray-700">ult: {new Date(backendSignal.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
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

              {/* Por que este sinal? — PRO+ */}
              <PairMonitorIAButton showExplain={showExplain} setShowExplain={setShowExplain} />

              <AnimatePresence>
                {showExplain && (() => {
                  const exp = explainSignal(pendingSignal as unknown as SignalResult);
                  return (
                    <motion.div
                      key="explain"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-2 pb-1">
                        <p className="text-[10px] text-gray-400 leading-relaxed">{exp.summary}</p>
                        <div className="space-y-1">
                          {exp.bullets.map((b, i) => (
                            <div key={i} className="text-[10px] text-gray-500 leading-snug pl-1">{b}</div>
                          ))}
                        </div>
                        {exp.warning && (
                          <div className="mt-1 px-2 py-1.5 rounded-lg bg-orange-500/8 border border-orange-500/20 text-[10px] text-orange-400 leading-snug">
                            {exp.warning}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })()}
              </AnimatePresence>

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

          {/* Last signal (already resolved or blocked) */}
          {!pendingSignal && !resultSaved && backendSignal?.passed && backendSignal?.ts === markedTs && (
            <motion.div key="last" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className={`rounded-xl px-3 py-2.5 border flex items-center gap-3 ${
                backendSignal.direction === 'CALL' ? 'bg-[var(--green)]/5 border-[var(--green)]/15' : 'bg-[var(--red)]/5 border-[var(--red)]/15'
              }`}>
              <span className={`text-lg font-black ${backendSignal.direction === 'CALL' ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                {backendSignal.direction === 'CALL' ? '▲' : '▼'}
              </span>
              <div className="flex-1 min-w-0">
                <div className={`text-xs font-black ${backendSignal.direction === 'CALL' ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                  {backendSignal.direction} — {lastQualCfg?.label || backendSignal.quality}
                </div>
                <div className="text-[9px] text-gray-600 tabular-nums">
                  {new Date(backendSignal.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · {backendSignal.score}%
                </div>
              </div>
              <button onClick={handleCopy} className="text-gray-600 hover:text-gray-400 transition">
                {copied ? <CheckCheck size={11} className="text-[var(--green)]" /> : <Copy size={11} />}
              </button>
            </motion.div>
          )}

          {/* Block reason */}
          {!pendingSignal && !resultSaved && !backendSignal?.passed && blockReason && (
            <motion.div key="blocked" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex items-start gap-2 px-3 py-2 rounded-xl bg-orange-500/5 border border-orange-500/15 text-[10px] text-orange-400/80">
              <span className="shrink-0 mt-0.5">⚠</span>
              <span className="truncate" title={blockReason}>{blockReason}</span>
            </motion.div>
          )}

          {/* Initial loading */}
          {!pendingSignal && !resultSaved && !backendSignal?.passed && !blockReason && (
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
