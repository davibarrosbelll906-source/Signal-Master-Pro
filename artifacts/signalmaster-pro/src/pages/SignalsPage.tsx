import { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";

// ── Pares Ebinex (12 crypto) ──────────────────────────────────────────────
const PAIRS = [
  'BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','XRPUSDT','ADAUSDT',
  'DOGEUSDT','LTCUSDT','AVAXUSDT','DOTUSDT','LINKUSDT','MATICUSDT',
];

const PAIR_LABEL: Record<string, string> = {
  BTCUSDT:'BTC/USD', ETHUSDT:'ETH/USD', SOLUSDT:'SOL/USD', BNBUSDT:'BNB/USD',
  XRPUSDT:'XRP/USD', ADAUSDT:'ADA/USD', DOGEUSDT:'DOGE/USD', LTCUSDT:'LTC/USD',
  AVAXUSDT:'AVAX/USD', DOTUSDT:'DOT/USD', LINKUSDT:'LINK/USD', MATICUSDT:'MATIC/USD',
};

const PAIR_ICON: Record<string, string> = {
  BTCUSDT:'₿', ETHUSDT:'Ξ', SOLUSDT:'◎', BNBUSDT:'⬡',
  XRPUSDT:'✕', ADAUSDT:'₳', DOGEUSDT:'Ð', LTCUSDT:'Ł',
  AVAXUSDT:'🔺', DOTUSDT:'●', LINKUSDT:'🔗', MATICUSDT:'⬟',
};

// ── Constantes ────────────────────────────────────────────────────────────
const LOOKBACK   = 200;
const EMA_PERIOD = 50;
const MIN_TOUCHES = 2;
const ZONE_PCT    = 0.0025;
const ALERT_SECS  = 12;

// ── Tipos ─────────────────────────────────────────────────────────────────
interface Candle { open: number; high: number; low: number; close: number; }

interface Zone { price: number; touches: number; type: 'S' | 'R'; }

interface PairState {
  signal:      'CALL' | 'PUT' | 'AGUARDAR';
  trend:       'ALTA' | 'BAIXA' | 'NEUTRO';
  price:       number;
  ema50:       number | null;
  touchedZone: Zone | null;
  supports:    Zone[];
  resistances: Zone[];
}

interface LogEntry {
  id:      string;
  time:    string;
  pair:    string;
  signal:  'CALL' | 'PUT';
  price:   number;
  zType:   'S' | 'R';
  zPrice:  number;
  touches: number;
}

// ── Algoritmos ────────────────────────────────────────────────────────────
function calcEMA(closes: number[], period: number): number | null {
  if (closes.length < period) return null;
  const k = 2 / (period + 1);
  let e = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < closes.length; i++) e = closes[i] * k + e * (1 - k);
  return e;
}

function findStrongZones(candles: Candle[]): Zone[] {
  const highs = candles.map(c => c.high);
  const lows  = candles.map(c => c.low);
  const n = candles.length;
  const pivotLows: number[]  = [];
  const pivotHighs: number[] = [];

  for (let i = 3; i < n - 3; i++) {
    if (lows[i] < lows[i-1] && lows[i] < lows[i-2] && lows[i] < lows[i-3] &&
        lows[i] < lows[i+1] && lows[i] < lows[i+2] && lows[i] < lows[i+3])
      pivotLows.push(lows[i]);
    if (highs[i] > highs[i-1] && highs[i] > highs[i-2] && highs[i] > highs[i-3] &&
        highs[i] > highs[i+1] && highs[i] > highs[i+2] && highs[i] > highs[i+3])
      pivotHighs.push(highs[i]);
  }

  function cluster(pivots: number[], type: 'S' | 'R'): Zone[] {
    const sorted = [...pivots].sort((a, b) => a - b);
    const clusters: Zone[] = [];
    for (const p of sorted) {
      const ex = clusters.find(c => Math.abs(c.price - p) / c.price < ZONE_PCT);
      if (ex) { ex.touches++; ex.price = (ex.price + p) / 2; }
      else clusters.push({ price: p, touches: 1, type });
    }
    return clusters.filter(c => c.touches >= MIN_TOUCHES);
  }

  return [...cluster(pivotLows, 'S'), ...cluster(pivotHighs, 'R')]
    .sort((a, b) => b.price - a.price);
}

function analyze(candles: Candle[]): PairState {
  const closed = candles.slice(0, -1); // só velas fechadas
  const closes = closed.map(c => c.close);
  const last   = closed[closed.length - 1];
  const price  = last?.close ?? 0;
  const low    = last?.low   ?? 0;
  const high   = last?.high  ?? 0;

  const ema50 = calcEMA(closes, EMA_PERIOD);
  const trend: PairState['trend'] =
    !ema50          ? 'NEUTRO'
    : price > ema50 * 1.001 ? 'ALTA'
    : price < ema50 * 0.999 ? 'BAIXA'
    : 'NEUTRO';

  const zones = findStrongZones(closed.slice(-LOOKBACK));
  let signal: PairState['signal'] = 'AGUARDAR';
  let touchedZone: Zone | null = null;

  for (const z of zones) {
    const touchPrice = z.type === 'S' ? low : high;
    if (Math.abs(touchPrice - z.price) / z.price < ZONE_PCT) {
      if (z.type === 'S' && trend === 'ALTA') { signal = 'CALL'; touchedZone = z; break; }
      if (z.type === 'R' && trend === 'BAIXA') { signal = 'PUT';  touchedZone = z; break; }
    }
  }

  return {
    signal, trend, price, ema50, touchedZone,
    supports:    zones.filter(z => z.type === 'S').slice(0, 3),
    resistances: zones.filter(z => z.type === 'R').slice(0, 3),
  };
}

// ── Utilitários ───────────────────────────────────────────────────────────
function fmt(p: number | null | undefined): string {
  if (p == null || isNaN(p) || p === 0) return '—';
  if (p > 1000) return p.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (p > 1)    return p.toFixed(4);
  return p.toFixed(6);
}

function nowStr(): string {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function beep(type: 'CALL' | 'PUT') {
  try {
    const ctx = new ((window as any).AudioContext || (window as any).webkitAudioContext)();
    [[type === 'CALL' ? 880 : 440, 0], [type === 'CALL' ? 1100 : 330, 220]].forEach(([freq, delay]) => {
      setTimeout(() => {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine'; osc.frequency.value = freq as number;
        gain.gain.setValueAtTime(0.35, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        osc.start(); osc.stop(ctx.currentTime + 0.6);
      }, delay as number);
    });
  } catch {}
}

// ── Componentes ───────────────────────────────────────────────────────────

function StrengthDots({ touches, type }: { touches: number; type: 'S' | 'R' }) {
  const filled = Math.min(touches, 5);
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: 2,
          background: i < filled ? (type === 'S' ? '#00e87a' : '#ff4466') : '#1e2535',
        }} />
      ))}
    </div>
  );
}

function AlertOverlay({
  pair, state, onClose,
}: { pair: string; state: PairState; onClose: () => void }) {
  const [cd, setCd] = useState(ALERT_SECS);
  const { signal, touchedZone, trend, price } = state;
  const isCall = signal === 'CALL';

  useEffect(() => {
    const t = setInterval(() => setCd(c => { if (c <= 1) { clearInterval(t); onClose(); return 0; } return c - 1; }), 1000);
    return () => clearInterval(t);
  }, [onClose]);

  if (!touchedZone) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
        onClick={e => e.stopPropagation()}
        style={{
          borderRadius: 16, padding: '36px 48px', textAlign: 'center',
          minWidth: 340, position: 'relative', overflow: 'hidden',
          background: isCall ? '#040f08' : '#0f0408',
          border: `1.5px solid ${isCall ? '#00e87a' : '#ff4466'}`,
          boxShadow: isCall
            ? '0 0 60px rgba(0,232,122,0.3), inset 0 0 40px rgba(0,232,122,0.05)'
            : '0 0 60px rgba(255,68,102,0.3), inset 0 0 40px rgba(255,68,102,0.05)',
        }}
      >
        <motion.div
          animate={{ scale: [1, 1.04], opacity: [0.6, 0] }}
          transition={{ duration: 1, repeat: Infinity }}
          style={{
            position: 'absolute', inset: 0, borderRadius: 16, pointerEvents: 'none',
            border: `2px solid ${isCall ? 'rgba(0,232,122,0.4)' : 'rgba(255,68,102,0.4)'}`,
          }}
        />
        <div style={{
          fontFamily: 'Syne, sans-serif', fontSize: 52, fontWeight: 800,
          letterSpacing: -1, lineHeight: 1, marginBottom: 8,
          color: isCall ? '#00ff88' : '#ff2255',
        }}>
          {isCall ? '▲ COMPRA' : '▼ VENDA'}
        </div>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, color: '#e8eaf0', marginBottom: 4 }}>
          {PAIR_LABEL[pair]}
        </div>
        <div style={{ fontSize: 11, color: '#5a6480', marginBottom: 20, lineHeight: 1.7 }}>
          Zona {touchedZone.type === 'S' ? 'suporte' : 'resistência'} forte ×{touchedZone.touches} @ {fmt(touchedZone.price)}<br />
          Tendência: {trend} — EMA 50
        </div>
        <div style={{
          fontFamily: 'Syne, sans-serif', fontSize: 38, fontWeight: 700, marginBottom: 16,
          color: isCall ? '#00e87a' : '#ff4466',
        }}>{cd}</div>
        <button onClick={onClose} style={{
          padding: '8px 24px', borderRadius: 8, fontSize: 11, cursor: 'pointer',
          background: 'transparent', color: '#5a6480', border: '1px solid #2a3348',
          fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.05em',
        }}>FECHAR</button>
      </motion.div>
    </motion.div>
  );
}

function PairCard({ pair, data }: { pair: string; data: PairState | null }) {
  if (!data) {
    return (
      <div style={{
        background: '#0d1017', border: '1px solid #1e2535', borderLeft: '3px solid #1e2535',
        borderRadius: 10, padding: '14px 16px', opacity: 0.5,
      }}>
        <div style={{ fontSize: 10, color: '#5a6480', marginBottom: 4 }}>{PAIR_LABEL[pair]}</div>
        <div style={{ fontSize: 13, color: '#5a6480' }}>Carregando...</div>
      </div>
    );
  }

  const { signal, trend, price, ema50, touchedZone, supports, resistances } = data;
  const isCall = signal === 'CALL';
  const isPut  = signal === 'PUT';
  const active = isCall || isPut;

  const borderColor = isCall ? '#00e87a' : isPut ? '#ff4466' : '#1e2535';
  const bg = isCall
    ? 'linear-gradient(135deg, rgba(0,232,122,0.04) 0%, #0d1017 60%)'
    : isPut
    ? 'linear-gradient(135deg, rgba(255,68,102,0.04) 0%, #0d1017 60%)'
    : '#0d1017';

  const tColor = trend === 'ALTA' ? '#00e87a' : trend === 'BAIXA' ? '#ff4466' : '#5a6480';
  const tArrow = trend === 'ALTA' ? '▲' : trend === 'BAIXA' ? '▼' : '→';

  return (
    <div style={{
      background: bg,
      border: `1px solid ${borderColor}`,
      borderLeft: `3px solid ${borderColor}`,
      borderRadius: 10, padding: '14px 16px',
      boxShadow: active ? `0 0 20px ${borderColor}14` : 'none',
      transition: 'border-color .2s, box-shadow .2s',
    }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
        <div style={{ fontSize: 10, color: '#5a6480', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 5 }}>
          <span>{PAIR_ICON[pair]}</span> {PAIR_LABEL[pair]}
        </div>
        {active && <div style={{ width: 6, height: 6, borderRadius: '50%', background: borderColor, boxShadow: `0 0 5px ${borderColor}` }} />}
      </div>

      {/* price */}
      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 700, color: '#e8eaf0', marginBottom: 5, lineHeight: 1 }}>
        {fmt(price)}
      </div>

      {/* EMA50 + trend */}
      <div style={{ fontSize: 10, color: '#5a6480', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
        EMA 50: {fmt(ema50)}
        <span style={{
          fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4, marginLeft: 2,
          background: trend === 'ALTA' ? 'rgba(0,232,122,0.08)' : trend === 'BAIXA' ? 'rgba(255,68,102,0.08)' : '#131720',
          color: tColor,
          border: `1px solid ${tColor}44`,
        }}>{tArrow} {trend}</span>
      </div>

      {/* signal badge */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px',
        borderRadius: 6, fontSize: 12, fontWeight: 700, fontFamily: 'Syne, sans-serif',
        letterSpacing: '0.02em', marginBottom: 8,
        background: isCall ? 'rgba(0,232,122,0.08)' : isPut ? 'rgba(255,68,102,0.08)' : '#131720',
        color:  isCall ? '#00e87a' : isPut ? '#ff4466' : '#5a6480',
        border: `1px solid ${isCall ? 'rgba(0,232,122,0.25)' : isPut ? 'rgba(255,68,102,0.25)' : '#1e2535'}`,
      }}>
        {isCall ? '▲ COMPRA' : isPut ? '▼ VENDA' : '· Aguardar'}
      </div>

      {/* zone touch info */}
      <div style={{
        fontSize: 10, marginBottom: 6,
        color: isCall ? '#00e87a' : isPut ? '#ff4466' : '#5a6480',
      }}>
        {touchedZone
          ? `Tocou ${touchedZone.type === 'S' ? 'suporte' : 'resist.'} forte ×${touchedZone.touches} @ ${fmt(touchedZone.price)}`
          : 'Sem toque em zona forte'}
      </div>

      {/* strength dots */}
      {touchedZone && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
          <span style={{ fontSize: 9, color: '#5a6480' }}>Força:</span>
          <StrengthDots touches={touchedZone.touches} type={touchedZone.type} />
        </div>
      )}

      {/* zone tags */}
      <div style={{ fontSize: 9, color: '#5a6480', lineHeight: 1.9 }}>
        {resistances.length > 0 && (
          <div>R: {resistances.map((z, i) => (
            <span key={i} style={{
              display: 'inline-block', padding: '1px 5px', borderRadius: 4, fontSize: 9, margin: 1,
              background: 'rgba(255,68,102,0.08)', color: '#ff4466', border: '1px solid rgba(255,68,102,0.25)',
            }}>{fmt(z.price)} ×{z.touches}</span>
          ))}</div>
        )}
        {supports.length > 0 && (
          <div>S: {supports.map((z, i) => (
            <span key={i} style={{
              display: 'inline-block', padding: '1px 5px', borderRadius: 4, fontSize: 9, margin: 1,
              background: 'rgba(0,232,122,0.08)', color: '#00e87a', border: '1px solid rgba(0,232,122,0.25)',
            }}>{fmt(z.price)} ×{z.touches}</span>
          ))}</div>
        )}
      </div>
    </div>
  );
}

// ── Página principal ─────────────────────────────────────────────────────
export default function SignalsPage() {
  const [pairStates, setPairStates]     = useState<Record<string, PairState>>({});
  const [logs, setLogs]                 = useState<LogEntry[]>([]);
  const [statsCall, setStatsCall]       = useState(0);
  const [statsPut, setStatsPut]         = useState(0);
  const [soundOn, setSoundOn]           = useState(true);
  const [selPair, setSelPair]           = useState('all');
  const [lastUpdate, setLastUpdate]     = useState('—');
  const [fetching, setFetching]         = useState(false);
  const [secondsLeft, setSecondsLeft]   = useState(60);
  const [alertData, setAlertData]       = useState<{ pair: string; state: PairState } | null>(null);

  const signalCacheRef = useRef<Record<string, string>>({});
  const prevStateRef   = useRef<Record<string, PairState>>({});
  const soundRef       = useRef(soundOn);
  soundRef.current = soundOn;

  // Fetch all pairs from Binance
  const fetchAll = useCallback(async () => {
    if (fetching) return;
    setFetching(true);
    const prev = prevStateRef.current;

    await Promise.allSettled(PAIRS.map(async (pair) => {
      try {
        const r = await fetch(
          `https://api.binance.com/api/v3/klines?symbol=${pair}&interval=1m&limit=${LOOKBACK + 10}`,
          { signal: AbortSignal.timeout(8000) }
        );
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data: any[] = await r.json();
        const candles: Candle[] = data.map(k => ({
          open: +k[1], high: +k[2], low: +k[3], close: +k[4],
        }));
        const result = analyze(candles);
        const prevSig = prev[pair]?.signal;

        setPairStates(s => ({ ...s, [pair]: result }));
        prevStateRef.current[pair] = result;

        // Novo sinal diferente do anterior
        if (result.signal !== 'AGUARDAR' && result.signal !== prevSig && result.touchedZone) {
          const key = pair + result.signal + fmt(result.touchedZone.price);
          const minute = nowStr().slice(0, 5);
          if (signalCacheRef.current[key] !== minute) {
            signalCacheRef.current[key] = minute;

            // Log
            const entry: LogEntry = {
              id:      `${pair}-${Date.now()}`,
              time:    nowStr(),
              pair:    PAIR_LABEL[pair],
              signal:  result.signal as 'CALL' | 'PUT',
              price:   result.price,
              zType:   result.touchedZone.type,
              zPrice:  result.touchedZone.price,
              touches: result.touchedZone.touches,
            };
            setLogs(prev => [entry, ...prev].slice(0, 60));
            if (result.signal === 'CALL') setStatsCall(c => c + 1);
            else setStatsPut(c => c + 1);

            // Alert + beep
            setAlertData({ pair, state: result });
            if (soundRef.current) beep(result.signal as 'CALL' | 'PUT');
          }
        }
      } catch {}
    }));

    setLastUpdate('Atualizado ' + nowStr());
    setFetching(false);
  }, [fetching]);

  // Candle countdown — dispara fetchAll quando restam 13s (analisa só velas fechadas)
  useEffect(() => {
    const tick = setInterval(() => {
      const sec = Math.floor(Date.now() / 1000);
      const left = 60 - (sec % 60);
      setSecondsLeft(left);
      if (left === 13) fetchAll();
    }, 1000);
    return () => clearInterval(tick);
  }, [fetchAll]);

  // Fetch inicial
  useEffect(() => { fetchAll(); }, []); // eslint-disable-line

  const displayed = selPair === 'all' ? PAIRS : [selPair];
  const activePairs = PAIRS.filter(p => pairStates[p]?.signal !== 'AGUARDAR' && pairStates[p]);
  const cdColor = secondsLeft <= ALERT_SECS ? '#ff4466' : secondsLeft <= 20 ? '#ffaa00' : '#e8eaf0';

  return (
    <div style={{ background: '#07090f', minHeight: '100vh', color: '#e8eaf0', fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}>

      {/* Alert overlay */}
      <AnimatePresence>
        {alertData && (
          <AlertOverlay
            pair={alertData.pair}
            state={alertData.state}
            onClose={() => setAlertData(null)}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 24px', borderBottom: '1px solid #1e2535',
        background: '#0d1017', position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%', background: '#00e87a',
            boxShadow: '0 0 8px #00e87a',
            animation: 'smp-blink 2s infinite',
          }} />
          <div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 800, color: '#e8eaf0', letterSpacing: -0.3 }}>
              Signal SR + EMA 50
            </div>
            <div style={{ fontSize: 10, color: '#5a6480', marginTop: 1 }}>
              M1 · Binance · Zonas Fortes
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Countdown */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#131720', border: '1px solid #1e2535', borderRadius: 8, padding: '6px 12px',
          }}>
            <span style={{ fontSize: 10, color: '#5a6480' }}>Fecha em</span>
            <span style={{
              fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700,
              color: cdColor, minWidth: 32, textAlign: 'right',
              transition: 'color .3s',
              animation: secondsLeft <= ALERT_SECS ? 'smp-flash .4s infinite' : 'none',
            }}>{secondsLeft}</span>
            <span style={{ fontSize: 10, color: '#5a6480' }}>s</span>
          </div>
          <span style={{ fontSize: 10, color: '#5a6480' }}>{lastUpdate}</span>
        </div>
      </div>

      {/* Controls */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        padding: '12px 24px', borderBottom: '1px solid #1e2535', background: '#0d1017',
      }}>
        <span style={{ fontSize: 10, color: '#5a6480', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Par</span>
        <select
          value={selPair}
          onChange={e => setSelPair(e.target.value)}
          style={{
            background: '#131720', border: '1px solid #2a3348', color: '#e8eaf0',
            fontFamily: 'JetBrains Mono, monospace', fontSize: 12, padding: '5px 10px',
            borderRadius: 6, cursor: 'pointer', outline: 'none',
          }}
        >
          <option value="all">Todos</option>
          {PAIRS.map(p => <option key={p} value={p}>{PAIR_LABEL[p]}</option>)}
        </select>

        <span style={{ fontSize: 10, color: '#5a6480', textTransform: 'uppercase', letterSpacing: '0.08em', marginLeft: 8 }}>Alerta</span>
        <button
          onClick={() => setSoundOn(v => !v)}
          style={{
            background: '#131720', border: `1px solid ${soundOn ? 'rgba(0,232,122,0.25)' : '#2a3348'}`,
            color: soundOn ? '#00e87a' : '#5a6480',
            fontFamily: 'JetBrains Mono, monospace', fontSize: 11, padding: '5px 14px',
            borderRadius: 6, cursor: 'pointer',
          }}
        >
          {soundOn ? '🔔 Som ON' : '🔕 Som OFF'}
        </button>

        <button
          onClick={fetchAll}
          style={{
            background: '#131720', border: '1px solid #2a3348', color: '#5a6480',
            fontFamily: 'JetBrains Mono, monospace', fontSize: 11, padding: '5px 14px',
            borderRadius: 6, cursor: 'pointer',
          }}
        >
          {fetching ? '...' : '↻ Atualizar'}
        </button>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid #1e2535' }}>
        {[
          { label: 'Sinais hoje', value: statsCall + statsPut, color: '#e8eaf0' },
          { label: 'Compra',      value: statsCall,              color: '#00e87a' },
          { label: 'Venda',       value: statsPut,               color: '#ff4466' },
          { label: 'Pares ativos',value: activePairs.length,     color: '#ffaa00' },
        ].map(({ label, value, color }, i, arr) => (
          <div key={label} style={{
            flex: 1, padding: '10px 20px', display: 'flex', flexDirection: 'column', gap: 2,
            borderRight: i < arr.length - 1 ? '1px solid #1e2535' : 'none',
          }}>
            <div style={{ fontSize: 9, color: '#5a6480', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Main */}
      <div style={{ padding: '20px 24px' }}>
        {/* Section label */}
        <div style={{
          fontSize: 9, color: '#5a6480', textTransform: 'uppercase', letterSpacing: '0.1em',
          marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          Pares monitorados
          <div style={{ flex: 1, height: 1, background: '#1e2535' }} />
        </div>

        {/* Grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
          gap: 10, marginBottom: 24,
        }}>
          {displayed.map(pair => (
            <PairCard key={pair} pair={pair} data={pairStates[pair] ?? null} />
          ))}
        </div>

        {/* Log section label */}
        <div style={{
          fontSize: 9, color: '#5a6480', textTransform: 'uppercase', letterSpacing: '0.1em',
          marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          Log de sinais
          <div style={{ flex: 1, height: 1, background: '#1e2535' }} />
        </div>

        {/* Log */}
        <div style={{ background: '#0d1017', border: '1px solid #1e2535', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '8px 16px', borderBottom: '1px solid #1e2535', fontSize: 9, color: '#5a6480', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Histórico da sessão
          </div>
          <div style={{ maxHeight: 160, overflowY: 'auto' }}>
            {logs.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 16px', fontSize: 11 }}>
                <span style={{ color: '#5a6480', minWidth: 60, fontSize: 10 }}>--:--:--</span>
                <span style={{ color: '#5a6480' }}>Aguardando dados da Binance...</span>
              </div>
            ) : logs.map(l => (
              <motion.div
                key={l.id}
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '7px 16px', borderBottom: '1px solid #1e2535', fontSize: 11,
                }}
              >
                <span style={{ color: '#5a6480', minWidth: 60, fontSize: 10 }}>{l.time}</span>
                <span style={{
                  fontWeight: 700, fontFamily: 'Syne, sans-serif', fontSize: 12, minWidth: 40,
                  color: l.signal === 'CALL' ? '#00e87a' : '#ff4466',
                }}>{l.signal}</span>
                <span style={{ color: '#e8eaf0', flex: 1 }}>{l.pair} @ {fmt(l.price)}</span>
                <span style={{ color: '#5a6480', fontSize: 10 }}>
                  {l.zType === 'S' ? 'suporte' : 'resist.'} ×{l.touches} @ {fmt(l.zPrice)}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes smp-blink { 0%,100%{opacity:1;box-shadow:0 0 8px #00e87a} 50%{opacity:.4;box-shadow:none} }
        @keyframes smp-flash  { 0%,100%{opacity:1} 50%{opacity:.4} }
      `}</style>
    </div>
  );
}
