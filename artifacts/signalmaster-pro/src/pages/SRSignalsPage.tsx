import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSignalStore, type BackendSignal } from "@/lib/signalStore";

const ALL_PAIRS = [
  'BTCUSD','ETHUSD','SOLUSD','BNBUSD','XRPUSD','ADAUSD',
  'DOGEUSD','LTCUSD','AVAXUSD','DOTUSD','LINKUSD','MATICUSD',
];

const PAIR_LABELS: Record<string, string> = {
  BTCUSD:'BTC/USD', ETHUSD:'ETH/USD', SOLUSD:'SOL/USD', BNBUSD:'BNB/USD',
  XRPUSD:'XRP/USD', ADAUSD:'ADA/USD', DOGEUSD:'DOGE/USD', LTCUSD:'LTC/USD',
  AVAXUSD:'AVAX/USD', DOTUSD:'DOT/USD', LINKUSD:'LINK/USD', MATICUSD:'MATIC/USD',
};

const PAIR_ICONS: Record<string, string> = {
  BTCUSD:'₿', ETHUSD:'Ξ', SOLUSD:'◎', BNBUSD:'⬡',
  XRPUSD:'✕', ADAUSD:'₳', DOGEUSD:'Ð', LTCUSD:'Ł',
  AVAXUSD:'🔺', DOTUSD:'●', LINKUSD:'⬡', MATICUSD:'⬟',
};

const QUALITY_RANK: Record<string, number> = {
  ULTRA: 7, ELITE: 6, PREMIUM: 5, FORTE: 4, MÉDIO: 3, FRACO: 2, EVITAR: 1,
};

const QUALITY_COLOR: Record<string, string> = {
  ULTRA:   '#fef3c7',
  ELITE:   '#ffffff',
  PREMIUM: '#facc15',
  FORTE:   '#00e87a',
  MÉDIO:   '#60a5fa',
  FRACO:   '#9ca3af',
  EVITAR:  '#6b7280',
};

interface LogEntry {
  id: string;
  time: string;
  pair: string;
  signal: 'CALL' | 'PUT';
  score: number;
  quality: string;
  price: number;
  zoneStrength: number;
  trend: string;
}

function fmt(p: number | undefined | null): string {
  if (p == null || isNaN(p)) return '—';
  if (p > 1000)  return p.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (p > 1)     return p.toFixed(4);
  return p.toFixed(6);
}

function nowStr(): string {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function beep(type: 'CALL' | 'PUT') {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const freq1 = type === 'CALL' ? 880 : 440;
    const freq2 = type === 'CALL' ? 1100 : 330;
    [freq1, freq2].forEach((freq, i) => {
      setTimeout(() => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.35, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        osc.start(); osc.stop(ctx.currentTime + 0.6);
      }, i * 220);
    });
  } catch {}
}

function StrengthDots({ touches, type }: { touches: number; type: 'S' | 'R' }) {
  const filled = Math.min(touches, 5);
  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }, (_, i) => (
        <div
          key={i}
          className="w-2 h-2 rounded-sm"
          style={{
            background: i < filled
              ? (type === 'S' ? '#00e87a' : '#ff4466')
              : 'rgba(255,255,255,0.08)',
          }}
        />
      ))}
    </div>
  );
}

function PairCard({
  asset,
  sig,
  price,
  isActive,
}: {
  asset: string;
  sig: BackendSignal | undefined;
  price: number | undefined;
  isActive: boolean;
}) {
  const ind = sig?.indicators;
  const currentPrice = price ?? ind?.lastClose;
  const ema50 = ind?.ema50;

  const trend =
    !ema50 || !currentPrice ? 'NEUTRO'
    : currentPrice > ema50 * 1.001 ? 'ALTA'
    : currentPrice < ema50 * 0.999 ? 'BAIXA'
    : 'NEUTRO';

  const hasSignal = sig?.passed === true;
  const direction = sig?.direction;
  const quality = sig?.quality ?? 'EVITAR';
  const score = sig?.score ?? 0;
  const zoneStrength = ind?.zoneStrength ?? sig?.consensus ?? 0;

  const borderColor =
    hasSignal && direction === 'CALL' ? '#00e87a'
    : hasSignal && direction === 'PUT' ? '#ff4466'
    : 'rgba(255,255,255,0.08)';

  const bgGradient =
    hasSignal && direction === 'CALL'
      ? 'linear-gradient(135deg, rgba(0,232,122,0.06) 0%, rgba(13,16,23,0.95) 60%)'
      : hasSignal && direction === 'PUT'
      ? 'linear-gradient(135deg, rgba(255,68,102,0.06) 0%, rgba(13,16,23,0.95) 60%)'
      : 'rgba(13,16,23,0.85)';

  const trendColor = trend === 'ALTA' ? '#00e87a' : trend === 'BAIXA' ? '#ff4466' : '#5a6480';
  const trendArrow = trend === 'ALTA' ? '▲' : trend === 'BAIXA' ? '▼' : '→';

  const candlePattern = ind?.candlePattern;
  const blockedReason = sig?.blockedBy;

  const voteCount = sig
    ? Object.values(sig.votes).filter(v => v === direction).length
    : 0;

  return (
    <motion.div
      layout
      style={{
        background: bgGradient,
        border: `1px solid ${borderColor}`,
        borderLeft: `3px solid ${borderColor}`,
        boxShadow: hasSignal ? `0 0 20px ${borderColor}22` : 'none',
        borderRadius: 10,
        padding: '14px 16px',
        position: 'relative',
        transition: 'border-color 0.3s, box-shadow 0.3s',
      }}
    >
      {/* pair + icon */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-base">{PAIR_ICONS[asset]}</span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#5a6480', letterSpacing: '0.05em' }}>
            {PAIR_LABELS[asset]}
          </span>
        </div>
        {isActive && (
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#00e87a', boxShadow: '0 0 6px #00e87a' }} />
        )}
      </div>

      {/* price */}
      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 700, color: '#e8eaf0', lineHeight: 1, marginBottom: 4 }}>
        {currentPrice ? fmt(currentPrice) : <span style={{ fontSize: 13, color: '#5a6480' }}>Carregando...</span>}
      </div>

      {/* EMA50 + trend */}
      <div style={{ fontSize: 10, color: '#5a6480', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
        EMA 50: {fmt(ema50)}
        <span style={{
          fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 4,
          background: trend === 'ALTA' ? 'rgba(0,232,122,0.12)' : trend === 'BAIXA' ? 'rgba(255,68,102,0.12)' : 'rgba(255,255,255,0.05)',
          color: trendColor,
          border: `1px solid ${trendColor}40`,
        }}>
          {trendArrow} {trend}
        </span>
      </div>

      {/* signal badge */}
      {hasSignal && direction ? (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px',
          borderRadius: 6, fontSize: 13, fontWeight: 700, fontFamily: 'Syne, sans-serif',
          marginBottom: 8,
          background: direction === 'CALL' ? 'rgba(0,232,122,0.12)' : 'rgba(255,68,102,0.12)',
          color: direction === 'CALL' ? '#00ff88' : '#ff2255',
          border: `1px solid ${direction === 'CALL' ? '#00e87a44' : '#ff446644'}`,
        }}>
          {direction === 'CALL' ? '▲ COMPRA' : '▼ VENDA'}
          <span style={{ fontSize: 10, color: QUALITY_COLOR[quality], fontWeight: 600 }}>
            {score}% {quality}
          </span>
        </div>
      ) : (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px',
          borderRadius: 6, fontSize: 12, fontWeight: 600, fontFamily: 'Syne, sans-serif',
          marginBottom: 8,
          background: 'rgba(255,255,255,0.04)',
          color: '#5a6480',
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          · Aguardar
        </div>
      )}

      {/* zone info */}
      {hasSignal ? (
        <div style={{ fontSize: 10, marginBottom: 6, color: direction === 'CALL' ? '#00e87a' : '#ff4466' }}>
          Zona {direction === 'CALL' ? 'suporte' : 'resistência'} — {zoneStrength} toques
        </div>
      ) : (
        <div style={{ fontSize: 10, marginBottom: 6, color: '#5a6480' }}>
          {blockedReason ? `⛔ ${blockedReason.slice(0, 42)}${blockedReason.length > 42 ? '…' : ''}` : 'Sem sinal ativo'}
        </div>
      )}

      {/* strength dots */}
      {zoneStrength > 0 && (
        <div className="flex items-center gap-2 mb-2">
          <span style={{ fontSize: 9, color: '#5a6480', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Força:</span>
          <StrengthDots touches={zoneStrength} type={direction === 'CALL' ? 'S' : 'R'} />
        </div>
      )}

      {/* indicator pills */}
      {ind && (
        <div className="flex flex-wrap gap-1">
          {ind.candlePattern !== 'none' && (
            <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}>
              🕯 {ind.candlePattern}
            </span>
          )}
          <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}>
            RSI {sig?.rsi}
          </span>
          {voteCount > 0 && (
            <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', color: '#60a5fa' }}>
              {voteCount}/9 votos
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}

function AlertOverlay({
  sig,
  price,
  onClose,
}: {
  sig: BackendSignal;
  price: number | undefined;
  onClose: () => void;
}) {
  const [countdown, setCountdown] = useState(12);
  const ind = sig.indicators;
  const zoneStrength = ind?.zoneStrength ?? sig.consensus;
  const trend = ind && (price ?? ind.lastClose) && ind.ema50
    ? ((price ?? ind.lastClose) > ind.ema50 * 1.001 ? 'ALTA' : (price ?? ind.lastClose) < ind.ema50 * 0.999 ? 'BAIXA' : 'NEUTRO')
    : '—';

  useEffect(() => {
    const t = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(t); onClose(); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [onClose]);

  const isCall = sig.direction === 'CALL';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.88)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.88, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.88, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        style={{
          borderRadius: 16, padding: '40px 52px', textAlign: 'center',
          minWidth: 340, position: 'relative', overflow: 'hidden',
          background: isCall ? '#040f08' : '#0f0408',
          border: `1.5px solid ${isCall ? '#00e87a' : '#ff4466'}`,
          boxShadow: isCall
            ? '0 0 60px rgba(0,232,122,0.35), inset 0 0 40px rgba(0,232,122,0.06)'
            : '0 0 60px rgba(255,68,102,0.35), inset 0 0 40px rgba(255,68,102,0.06)',
        }}
      >
        {/* pulse ring */}
        <motion.div
          animate={{ scale: [1, 1.04], opacity: [0.5, 0] }}
          transition={{ duration: 1, repeat: Infinity }}
          style={{
            position: 'absolute', inset: 0, borderRadius: 16,
            border: `2px solid ${isCall ? 'rgba(0,232,122,0.4)' : 'rgba(255,68,102,0.4)'}`,
            pointerEvents: 'none',
          }}
        />

        <div style={{
          fontFamily: 'Syne, sans-serif', fontSize: 54, fontWeight: 800,
          letterSpacing: -1, lineHeight: 1, marginBottom: 8,
          color: isCall ? '#00ff88' : '#ff2255',
        }}>
          {isCall ? '▲ COMPRA' : '▼ VENDA'}
        </div>

        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 700, color: '#e8eaf0', marginBottom: 4 }}>
          {PAIR_LABELS[sig.asset]}
        </div>

        <div style={{ fontSize: 11, color: '#5a6480', marginBottom: 6, lineHeight: 1.8 }}>
          Zona {sig.direction === 'CALL' ? 'suporte' : 'resistência'} — {zoneStrength} toques<br />
          Tendência: {trend} — EMA 50<br />
          Score: <span style={{ color: QUALITY_COLOR[sig.quality] }}>{sig.score}% {sig.quality}</span>
          {sig.oracleApproved && (
            <><br /><span style={{ color: '#a78bfa' }}>✓ Oracle aprovado</span></>
          )}
        </div>

        <div style={{
          fontFamily: 'Syne, sans-serif', fontSize: 44, fontWeight: 700, marginBottom: 20,
          color: isCall ? '#00e87a' : '#ff4466',
        }}>
          {countdown}
        </div>

        <button
          onClick={onClose}
          style={{
            padding: '8px 28px', borderRadius: 8, fontSize: 11, cursor: 'pointer',
            background: 'transparent', color: '#5a6480',
            border: '1px solid rgba(255,255,255,0.1)',
            fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.05em',
          }}
        >
          FECHAR
        </button>
      </motion.div>
    </motion.div>
  );
}

export default function SRSignalsPage() {
  const allSignals = useSignalStore(s => s.signals);
  const allPrices  = useSignalStore(s => s.prices);
  const socketConnected = useSignalStore(s => s.socketConnected);

  const [filter, setFilter] = useState<'all' | 'CALL' | 'PUT'>('all');
  const [soundOn, setSoundOn] = useState(true);
  const [alertSig, setAlertSig] = useState<BackendSignal | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [statsCall, setStatsCall] = useState(0);
  const [statsPut, setStatsPut] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const prevPassedRef = useRef<Record<string, number>>({});
  const alertShownRef = useRef<Set<string>>(new Set());

  // Candle countdown
  useEffect(() => {
    const tick = () => {
      const s = Math.floor(Date.now() / 1000);
      setSecondsLeft(60 - (s % 60));
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  // Detect new passed signals
  useEffect(() => {
    for (const [asset, sig] of Object.entries(allSignals)) {
      if (!sig.passed) continue;
      const prev = prevPassedRef.current[asset];
      if (prev === sig.ts) continue;
      prevPassedRef.current[asset] = sig.ts;

      const key = `${asset}-${sig.ts}`;
      if (alertShownRef.current.has(key)) continue;
      alertShownRef.current.add(key);

      // Add to log
      const price = allPrices[asset]?.price ?? sig.indicators?.lastClose ?? 0;
      const ind = sig.indicators;
      const ema50 = ind?.ema50;
      const trend = ema50 && price
        ? (price > ema50 * 1.001 ? 'ALTA' : price < ema50 * 0.999 ? 'BAIXA' : 'NEUTRO')
        : '—';

      setLogs(prev => [{
        id: key,
        time: nowStr(),
        pair: PAIR_LABELS[asset],
        signal: sig.direction,
        score: sig.score,
        quality: sig.quality,
        price,
        zoneStrength: ind?.zoneStrength ?? sig.consensus ?? 0,
        trend,
      }, ...prev].slice(0, 60));

      if (sig.direction === 'CALL') setStatsCall(c => c + 1);
      else setStatsPut(c => c + 1);

      // Show alert + beep
      setAlertSig(sig);
      if (soundOn) beep(sig.direction);
    }
  }, [allSignals, allPrices, soundOn]);

  const activePairs = ALL_PAIRS.filter(a => allSignals[a]?.passed);
  const displayPairs = filter === 'all'
    ? ALL_PAIRS
    : ALL_PAIRS.filter(a => allSignals[a]?.passed && allSignals[a]?.direction === filter);

  const countdownColor =
    secondsLeft <= 5  ? '#ff4466'
    : secondsLeft <= 15 ? '#ffaa00'
    : '#e8eaf0';

  return (
    <div style={{ background: '#07090f', minHeight: '100vh', color: '#e8eaf0', fontFamily: 'JetBrains Mono, monospace' }}>
      {/* Alert overlay */}
      <AnimatePresence>
        {alertSig && (
          <AlertOverlay
            sig={alertSig}
            price={allPrices[alertSig.asset]?.price}
            onClose={() => setAlertSig(null)}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)',
        background: '#0d1017', position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div className="flex items-center gap-3">
          <div style={{
            width: 10, height: 10, borderRadius: '50%',
            background: socketConnected ? '#00e87a' : '#ff4466',
            boxShadow: socketConnected ? '0 0 8px #00e87a' : '0 0 8px #ff4466',
            animation: 'pulse 2s infinite',
          }} />
          <div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 800, letterSpacing: -0.3 }}>
              SR + EMA 50 — Sinais M1
            </div>
            <div style={{ fontSize: 10, color: '#5a6480', marginTop: 1 }}>
              12 pares · Kraken/Binance · Zonas Fortes
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Candle countdown */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#131720', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 8, padding: '6px 14px',
          }}>
            <span style={{ fontSize: 10, color: '#5a6480' }}>Fecha em</span>
            <span style={{
              fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 700,
              color: countdownColor, minWidth: 32, textAlign: 'right',
              transition: 'color 0.3s',
              animation: secondsLeft <= 5 ? 'flash 0.4s infinite' : 'none',
            }}>
              {secondsLeft}
            </span>
            <span style={{ fontSize: 10, color: '#5a6480' }}>s</span>
          </div>

          {/* Sound toggle */}
          <button
            onClick={() => setSoundOn(v => !v)}
            style={{
              padding: '6px 14px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
              background: 'transparent', border: `1px solid ${soundOn ? 'rgba(0,232,122,0.3)' : 'rgba(255,255,255,0.1)'}`,
              color: soundOn ? '#00e87a' : '#5a6480',
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            {soundOn ? '🔔 Som ON' : '🔕 Som OFF'}
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        {[
          { label: 'Sinais hoje', value: statsCall + statsPut, color: '#e8eaf0' },
          { label: 'Compra',      value: statsCall,              color: '#00e87a' },
          { label: 'Venda',       value: statsPut,               color: '#ff4466' },
          { label: 'Pares ativos',value: activePairs.length,     color: '#ffaa00' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            flex: 1, padding: '10px 20px',
            borderRight: '1px solid rgba(255,255,255,0.07)',
          }}>
            <div style={{ fontSize: 9, color: '#5a6480', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>
              {label}
            </div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 700, color }}>
              {value}
            </div>
          </div>
        ))}
        <div style={{ flex: 1, padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 9, color: '#5a6480', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Filtro</span>
          {(['all','CALL','PUT'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '3px 10px', borderRadius: 5, fontSize: 10, cursor: 'pointer',
                fontFamily: 'JetBrains Mono, monospace',
                background: filter === f ? 'rgba(255,255,255,0.1)' : 'transparent',
                border: `1px solid ${filter === f ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)'}`,
                color: filter === f
                  ? (f === 'CALL' ? '#00e87a' : f === 'PUT' ? '#ff4466' : '#e8eaf0')
                  : '#5a6480',
              }}
            >
              {f === 'all' ? 'Todos' : f === 'CALL' ? '▲ CALL' : '▼ PUT'}
            </button>
          ))}
        </div>
      </div>

      {/* Main grid + log */}
      <div style={{ padding: '20px 24px' }}>
        {/* Section label */}
        <div style={{
          fontSize: 9, color: '#5a6480', textTransform: 'uppercase', letterSpacing: '0.1em',
          marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          Pares monitorados ({displayPairs.length})
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
        </div>

        {/* Pair grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 10,
          marginBottom: 28,
        }}>
          <AnimatePresence>
            {displayPairs.map(asset => (
              <PairCard
                key={asset}
                asset={asset}
                sig={allSignals[asset]}
                price={allPrices[asset]?.price}
                isActive={allSignals[asset]?.passed === true}
              />
            ))}
          </AnimatePresence>
          {displayPairs.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px 0', color: '#5a6480', fontSize: 13 }}>
              Nenhum sinal {filter !== 'all' ? `de ${filter} ` : ''}ativo no momento
            </div>
          )}
        </div>

        {/* Log */}
        <div style={{ fontSize: 9, color: '#5a6480', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          Log de sinais ({logs.length})
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
        </div>

        <div style={{
          background: '#0d1017', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 10, overflow: 'hidden',
        }}>
          <div style={{ padding: '7px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', fontSize: 9, color: '#5a6480', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Histórico da sessão
          </div>

          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {logs.length === 0 ? (
              <div style={{ padding: '16px', fontSize: 11, color: '#5a6480', textAlign: 'center' }}>
                Aguardando sinais do backend...
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {logs.map(l => (
                  <motion.div
                    key={l.id}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)',
                      fontSize: 11,
                    }}
                  >
                    <span style={{ color: '#5a6480', minWidth: 64, fontSize: 10 }}>{l.time}</span>
                    <span style={{
                      fontWeight: 700, fontFamily: 'Syne, sans-serif', fontSize: 12, minWidth: 44,
                      color: l.signal === 'CALL' ? '#00e87a' : '#ff4466',
                    }}>
                      {l.signal}
                    </span>
                    <span style={{ color: '#e8eaf0', flex: 1 }}>
                      {l.pair} @ {fmt(l.price)}
                    </span>
                    <span style={{ color: QUALITY_COLOR[l.quality], fontSize: 10 }}>
                      {l.score}% {l.quality}
                    </span>
                    <span style={{ color: '#5a6480', fontSize: 10 }}>
                      {l.trend} · {l.zoneStrength} toques
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* How it works */}
        <div style={{
          marginTop: 24, padding: '14px 18px',
          background: '#0d1017', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 10, fontSize: 10, color: '#5a6480', lineHeight: 1.9,
        }}>
          <div style={{ color: '#e8eaf0', marginBottom: 6, fontSize: 11, fontWeight: 600 }}>Como funciona</div>
          <span style={{ color: '#00e87a' }}>▲ COMPRA</span> — Preço toca zona de suporte forte + EMA 50 indica tendência de <span style={{ color: '#00e87a' }}>ALTA</span>&nbsp;&nbsp;
          <span style={{ color: '#ff4466' }}>▼ VENDA</span> — Preço toca zona de resistência forte + EMA 50 indica tendência de <span style={{ color: '#ff4466' }}>BAIXA</span><br />
          Zonas são detectadas por pivôs de 5 barras com clustering automático. Score = convergência de até 9 indicadores.
          Oracle (IA) valida cada sinal antes de liberar.
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes flash  { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>
    </div>
  );
}
