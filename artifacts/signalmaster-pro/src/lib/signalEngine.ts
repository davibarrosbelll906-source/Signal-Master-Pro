export const ASSET_CATEGORIES: Record<string, string> = {
  BTCUSD: 'crypto', ETHUSD: 'crypto', SOLUSD: 'crypto', BNBUSD: 'crypto',
  ADAUSD: 'crypto', DOGEUSD: 'crypto', XRPUSD: 'crypto', LTCUSD: 'crypto',
  EURUSD: 'forex', GBPUSD: 'forex', USDJPY: 'forex', AUDUSD: 'forex',
  USDCAD: 'forex', NZDUSD: 'forex', EURGBP: 'forex', GBPJPY: 'forex',
  XAUUSD: 'commodity', XAGUSD: 'commodity', USOIL: 'commodity'
};

export const CRYPTO_SYMBOLS: Record<string, string> = {
  BTCUSD: 'btcusdt', ETHUSD: 'ethusdt', SOLUSD: 'solusdt', BNBUSD: 'bnbusdt',
  ADAUSD: 'adausdt', DOGEUSD: 'dogeusdt', XRPUSD: 'xrpusdt', LTCUSD: 'ltcusdt'
};

export const BASE_PRICES: Record<string, number> = {
  EURUSD: 1.085, GBPUSD: 1.265, USDJPY: 149.0, AUDUSD: 0.653,
  USDCAD: 1.365, NZDUSD: 0.608, EURGBP: 0.858, GBPJPY: 188.0,
  XAUUSD: 3200.0, XAGUSD: 32.0, USOIL: 62.0,
  BTCUSD: 72000, ETHUSD: 1600, SOLUSD: 130, BNBUSD: 580,
  XRPUSD: 2.1, ADAUSD: 0.65, DOGEUSD: 0.16, LTCUSD: 90,
};

export const PAIR_VOL: Record<string, number> = {
  EURUSD: 0.0003, GBPUSD: 0.0005, USDJPY: 0.03, AUDUSD: 0.0004,
  USDCAD: 0.0004, NZDUSD: 0.0004, EURGBP: 0.0002, GBPJPY: 0.05,
  XAUUSD: 8.0, XAGUSD: 0.08, USOIL: 0.25,
  BTCUSD: 27, ETHUSD: 0.9, SOLUSD: 0.1, BNBUSD: 0.33,
  XRPUSD: 0.0016, ADAUSD: 0.0005, DOGEUSD: 0.00012, LTCUSD: 0.051,
};

export const TV_SYMBOLS: Record<string, string> = {
  BTCUSD: 'BINANCE:BTCUSDT', ETHUSD: 'BINANCE:ETHUSDT', SOLUSD: 'BINANCE:SOLUSDT',
  BNBUSD: 'BINANCE:BNBUSDT', ADAUSD: 'BINANCE:ADAUSDT', DOGEUSD: 'BINANCE:DOGEUSDT',
  XRPUSD: 'BINANCE:XRPUSDT', LTCUSD: 'BINANCE:LTCUSDT',
  EURUSD: 'FX:EURUSD', GBPUSD: 'FX:GBPUSD', USDJPY: 'FX:USDJPY', AUDUSD: 'FX:AUDUSD',
  USDCAD: 'FX:USDCAD', NZDUSD: 'FX:NZDUSD', EURGBP: 'FX:EURGBP', GBPJPY: 'FX:GBPJPY',
  XAUUSD: 'TVC:GOLD', XAGUSD: 'TVC:SILVER', USOIL: 'TVC:USOIL'
};

export interface Candle {
  o: number; h: number; l: number; c: number; v: number; t: number;
}

export interface CandleBuffer {
  m1: Candle[];
  m5: Candle[];
  m15: Candle[];
}

export type MarketRegime = 'TRENDING' | 'RANGING' | 'CHOPPY';

export interface SignalResult {
  direction: 'CALL' | 'PUT';
  score: number;
  quality: 'EVITAR' | 'FRACO' | 'MÉDIO' | 'FORTE' | 'PREMIUM' | 'ELITE' | 'ULTRA';
  marketRegime: MarketRegime;
  adx: number;
  rsi: number;
  entropy: number;
  dnaMatch: number;
  consensus: number;
  confirmed?: number;
  mmTrap: boolean;
  mmTrapType: string;
  sess: string;
  votes: Record<string, string>;
  blocked?: string;
  blockedBy?: string | null;
  passed?: boolean;
  asset: string;
  category: string;
  fingerprint: FingerprintPoint[];
  ts: number;
  // Luna Oracle Engine fields
  oracleApproved?: boolean;
  oracleConfidence?: number;
  oracleReason?: string;
  oracleScore?: number;
}

export interface FingerprintPoint {
  bodyRatio: number;
  direction: number;
  upperShadow: number;
  lowerShadow: number;
}

// BASE_WEIGHTS removed — era dead code (nunca usado no scoring)

// ─── INDICATORS ────────────────────────────────────────────────────────────

export function calcEMA(closes: number[], period: number): number[] {
  if (closes.length < period) return [];
  const k = 2 / (period + 1);
  const ema = [closes.slice(0, period).reduce((a, b) => a + b, 0) / period];
  for (let i = period; i < closes.length; i++) {
    ema.push(closes[i] * k + ema[ema.length - 1] * (1 - k));
  }
  return ema;
}

export function calcRSI(closes: number[], period = 14): number {
  if (closes.length <= period) return 50;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff; else losses -= diff;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    avgGain = ((avgGain * (period - 1)) + (diff >= 0 ? diff : 0)) / period;
    avgLoss = ((avgLoss * (period - 1)) + (diff < 0 ? -diff : 0)) / period;
  }
  return avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
}

export function calcMACD(closes: number[]) {
  const ema12 = calcEMA(closes, 12);
  const ema26 = calcEMA(closes, 26);
  if (!ema12.length || !ema26.length) return { macd: 0, signal: 0, hist: 0 };
  const macdSeries: number[] = [];
  for (let i = 0; i < ema26.length; i++) {
    macdSeries.push(ema12[i + (ema12.length - ema26.length)] - ema26[i]);
  }
  const signalLine = calcEMA(macdSeries, 9);
  const last = macdSeries[macdSeries.length - 1];
  const sig = signalLine[signalLine.length - 1] ?? 0;
  return { macd: last, signal: sig, hist: last - sig };
}

export function calcBollinger(closes: number[], period = 20) {
  if (closes.length < period) return { upper: 0, lower: 0, mean: 0, pct: 0.5 };
  const slice = closes.slice(-period);
  const m = slice.reduce((a, b) => a + b, 0) / period;
  const std = Math.sqrt(slice.reduce((a, b) => a + Math.pow(b - m, 2), 0) / period);
  const upper = m + 2 * std;
  const lower = m - 2 * std;
  const last = closes[closes.length - 1];
  const pct = std === 0 ? 0.5 : (last - lower) / (upper - lower);
  return { upper, lower, mean: m, pct };
}

export function calcStoch(highs: number[], lows: number[], closes: number[], period = 14): number {
  if (closes.length < period) return 50;
  const h = Math.max(...highs.slice(-period));
  const l = Math.min(...lows.slice(-period));
  return h === l ? 50 : ((closes[closes.length - 1] - l) / (h - l)) * 100;
}

export function calcADX(highs: number[], lows: number[], closes: number[], period = 14): number {
  if (closes.length < period + 1) return 0;
  const trueRanges: number[] = [];
  const plusDM: number[] = [];
  const minusDM: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    const tr = Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1]));
    trueRanges.push(tr);
    const up = highs[i] - highs[i - 1];
    const down = lows[i - 1] - lows[i];
    plusDM.push(up > down && up > 0 ? up : 0);
    minusDM.push(down > up && down > 0 ? down : 0);
  }
  const smooth = (arr: number[], p: number) => {
    let sum = arr.slice(0, p).reduce((a, b) => a + b, 0);
    const res = [sum];
    for (let i = p; i < arr.length; i++) res.push(res[res.length - 1] - res[res.length - 1] / p + arr[i]);
    return res;
  };
  const atr = smooth(trueRanges, period);
  const sPlusDM = smooth(plusDM, period);
  const sMinusDM = smooth(minusDM, period);
  const dxArr: number[] = [];
  for (let i = 0; i < atr.length; i++) {
    const pdi = atr[i] === 0 ? 0 : (sPlusDM[i] / atr[i]) * 100;
    const mdi = atr[i] === 0 ? 0 : (sMinusDM[i] / atr[i]) * 100;
    const sum = pdi + mdi;
    dxArr.push(sum === 0 ? 0 : (Math.abs(pdi - mdi) / sum) * 100);
  }
  if (!dxArr.length) return 0;
  return dxArr.slice(-period).reduce((a, b) => a + b, 0) / Math.min(period, dxArr.length);
}

export function calcATR(highs: number[], lows: number[], closes: number[], period = 14): number {
  if (closes.length < 2) return 0;
  const trs: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    trs.push(Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1])));
  }
  return trs.slice(-period).reduce((a, b) => a + b, 0) / Math.min(period, trs.length);
}

export function calcOBV(closes: number[], volumes: number[]): number {
  let obv = 0;
  for (let i = 1; i < closes.length; i++) {
    if (closes[i] > closes[i - 1]) obv += volumes[i];
    else if (closes[i] < closes[i - 1]) obv -= volumes[i];
  }
  return obv;
}

export function calcEntropy(candles: Candle[]): number {
  if (candles.length < 5) return 0.5;
  const seq = candles.map(c => c.c > c.o ? 1 : 0);
  const patterns: Record<string, number> = {};
  for (let i = 0; i < seq.length - 2; i++) {
    const key = `${seq[i]}${seq[i + 1]}${seq[i + 2]}`;
    patterns[key] = (patterns[key] || 0) + 1;
  }
  const total = Object.values(patterns).reduce((a, b) => a + b, 0);
  let entropy = 0;
  for (const count of Object.values(patterns)) {
    const p = count / total;
    if (p > 0) entropy -= p * Math.log2(p);
  }
  return Math.min(1, entropy / 3);
}

export function generateFingerprint(candles: Candle[]): FingerprintPoint[] {
  return candles.slice(-7).map(c => {
    const body = Math.abs(c.c - c.o);
    const range = (c.h - c.l) || 0.0001;
    return {
      bodyRatio: Math.round((body / range) * 10) / 10,
      direction: c.c > c.o ? 1 : -1,
      upperShadow: Math.round(((c.h - Math.max(c.c, c.o)) / range) * 10) / 10,
      lowerShadow: Math.round(((Math.min(c.c, c.o) - c.l) / range) * 10) / 10
    };
  });
}

export function matchFingerprint(fp: FingerprintPoint[], history: any[]): { matches: number; winRate: number; confidence: string } {
  let matches = 0, wins = 0;
  for (const h of history) {
    if (!h.fingerprint || !h.result) continue;
    const sim = fp.reduce((score, curr, i) => {
      if (!h.fingerprint[i]) return score;
      const bodyMatch = Math.abs(curr.bodyRatio - h.fingerprint[i].bodyRatio) < 0.2;
      const dirMatch = curr.direction === h.fingerprint[i].direction;
      return score + (bodyMatch && dirMatch ? 1 : 0);
    }, 0) / fp.length;
    if (sim >= 0.7) { matches++; if (h.result === 'win') wins++; }
  }
  return {
    matches,
    winRate: matches > 0 ? wins / matches : 0.5,
    confidence: matches >= 20 ? 'ALTA' : matches >= 10 ? 'MÉDIA' : 'BAIXA'
  };
}

export function detectMMTrap(buf: CandleBuffer): { detected: boolean; type: string; direction: string } {
  const candles = buf.m1;
  if (candles.length < 10) return { detected: false, type: '', direction: '' };
  const highs = candles.map(c => c.h);
  const lows = candles.map(c => c.l);
  const volumes = candles.map(c => c.v);
  const resistance = Math.max(...highs.slice(-50, -3));
  const support = Math.min(...lows.slice(-50, -3));
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  const avgVol = volumes.slice(-20, -1).reduce((a, b) => a + b, 0) / 19;
  const lastVol = volumes[volumes.length - 1];
  const bullTrap = prev.h > resistance * 1.001 && last.c < resistance && last.c < prev.o && lastVol > avgVol * 1.5;
  const bearTrap = prev.l < support * 0.999 && last.c > support && last.c > prev.o && lastVol > avgVol * 1.5;
  if (bullTrap) return { detected: true, type: 'BULL_TRAP', direction: 'PUT' };
  if (bearTrap) return { detected: true, type: 'BEAR_TRAP', direction: 'CALL' };
  return { detected: false, type: '', direction: '' };
}

export function detectCandlePattern(candles: Candle[]): { pattern: string; direction: number } {
  if (candles.length < 3) return { pattern: 'none', direction: 0 };
  const c = candles[candles.length - 1];
  const p = candles[candles.length - 2];
  const body = Math.abs(c.c - c.o);
  const range = (c.h - c.l) || 0.0001;
  // Doji
  if (body / range < 0.1) return { pattern: 'doji', direction: 0 };
  // Hammer
  const lowerShadow = Math.min(c.c, c.o) - c.l;
  const upperShadow = c.h - Math.max(c.c, c.o);
  if (lowerShadow > body * 2 && upperShadow < body * 0.3) return { pattern: 'hammer', direction: 1 };
  // Shooting Star
  if (upperShadow > body * 2 && lowerShadow < body * 0.3) return { pattern: 'shootingStar', direction: -1 };
  // Bullish Engulfing
  if (c.c > c.o && p.c < p.o && c.o < p.c && c.c > p.o) return { pattern: 'bullEngulfing', direction: 1 };
  // Bearish Engulfing
  if (c.c < c.o && p.c > p.o && c.o > p.c && c.c < p.o) return { pattern: 'bearEngulfing', direction: -1 };
  // Three white soldiers
  if (candles.length >= 3) {
    const c2 = candles[candles.length - 3];
    const allBull = c2.c > c2.o && p.c > p.o && c.c > c.o;
    if (allBull && p.o > c2.o && c.o > p.o) return { pattern: 'threeWhiteSoldiers', direction: 1 };
    const allBear = c2.c < c2.o && p.c < p.o && c.c < c.o;
    if (allBear && p.o < c2.o && c.o < p.o) return { pattern: 'threeBlackCrows', direction: -1 };
  }
  return { pattern: 'none', direction: c.c > c.o ? 1 : -1 };
}

export function deriveM5(m1: Candle[]): Candle[] {
  const m5: Candle[] = [];
  for (let i = 0; i + 4 < m1.length; i += 5) {
    const group = m1.slice(i, i + 5);
    m5.push({
      o: group[0].o,
      h: Math.max(...group.map(c => c.h)),
      l: Math.min(...group.map(c => c.l)),
      c: group[group.length - 1].c,
      v: group.reduce((a, b) => a + b.v, 0),
      t: group[0].t
    });
  }
  return m5;
}

export function deriveM15(m1: Candle[]): Candle[] {
  const m15: Candle[] = [];
  for (let i = 0; i + 14 < m1.length; i += 15) {
    const group = m1.slice(i, i + 15);
    m15.push({
      o: group[0].o,
      h: Math.max(...group.map(c => c.h)),
      l: Math.min(...group.map(c => c.l)),
      c: group[group.length - 1].c,
      v: group.reduce((a, b) => a + b.v, 0),
      t: group[0].t
    });
  }
  return m15;
}

export function getCurrentSession(): string {
  const h = new Date().getUTCHours();
  if (h >= 8 && h < 13) return 'london';
  if (h >= 13 && h < 17) return 'overlap';
  if (h >= 17 && h < 22) return 'ny';
  return 'asia';
}

// Granular pair×session quality matrix
function getPairSessionBonus(sess: string, category: string, asset: string): number {
  const matrix: Record<string, Record<string, number>> = {
    EURUSD: { london: 0.18, overlap: 0.22, ny: 0.14, asia: -0.15 },
    GBPUSD: { london: 0.18, overlap: 0.20, ny: 0.13, asia: -0.16 },
    GBPJPY: { london: 0.16, overlap: 0.22, ny: 0.12, asia: -0.06 },
    USDJPY: { london: 0.10, overlap: 0.18, ny: 0.16, asia: 0.02 },
    AUDUSD: { london: 0.08, overlap: 0.16, ny: 0.10, asia: 0.06 },
    USDCAD: { london: 0.10, overlap: 0.18, ny: 0.16, asia: -0.12 },
    NZDUSD: { london: 0.06, overlap: 0.14, ny: 0.08, asia: 0.04 },
    EURGBP: { london: 0.15, overlap: 0.18, ny: 0.08, asia: -0.18 },
    XAUUSD: { london: 0.16, overlap: 0.21, ny: 0.18, asia: -0.09 },
    XAGUSD: { london: 0.12, overlap: 0.18, ny: 0.16, asia: -0.12 },
    USOIL:  { london: 0.10, overlap: 0.18, ny: 0.18, asia: -0.12 },
    BTCUSD: { london: 0.10, overlap: 0.22, ny: 0.20, asia: 0.05 },
    ETHUSD: { london: 0.10, overlap: 0.20, ny: 0.18, asia: 0.04 },
    SOLUSD: { london: 0.08, overlap: 0.20, ny: 0.18, asia: 0.02 },
    BNBUSD: { london: 0.08, overlap: 0.18, ny: 0.16, asia: 0.02 },
    XRPUSD: { london: 0.06, overlap: 0.16, ny: 0.14, asia: 0.00 },
  };
  if (matrix[asset]?.[sess] !== undefined) return matrix[asset][sess];
  if (category === 'crypto') {
    if (sess === 'overlap') return 0.18; if (sess === 'ny') return 0.14;
    if (sess === 'london') return 0.08; return -0.10;
  }
  if (sess === 'overlap') return 0.18; if (sess === 'ny') return 0.14;
  if (sess === 'london') return 0.12; return -0.10;
}

// ─── NEW HIGH-PRECISION INDICATORS ─────────────────────────────────────────

// Detect RSI Divergence: most reliable reversal signal
function detectRSIDivergence(closes: number[], highs: number[], lows: number[]): 'bullish' | 'bearish' | null {
  if (closes.length < 30) return null;
  const half = 10;
  const rsi1 = calcRSI(closes.slice(-30, -half), 14);
  const rsi2 = calcRSI(closes.slice(-half), 14);
  const priceLow1 = Math.min(...lows.slice(-30, -half));
  const priceLow2 = Math.min(...lows.slice(-half));
  const priceHigh1 = Math.max(...highs.slice(-30, -half));
  const priceHigh2 = Math.max(...highs.slice(-half));
  // Bullish divergence: price lower low, RSI higher low — reversal up
  if (priceLow2 < priceLow1 * 0.9997 && rsi2 > rsi1 + 4 && rsi2 < 48) return 'bullish';
  // Bearish divergence: price higher high, RSI lower high — reversal down
  if (priceHigh2 > priceHigh1 * 1.0003 && rsi2 < rsi1 - 4 && rsi2 > 52) return 'bearish';
  return null;
}

// OBV recent trend (direction of money flow in last N bars)
function calcOBVTrend(closes: number[], volumes: number[], lookback = 12): 'up' | 'down' | 'flat' {
  if (closes.length < lookback + 1) return 'flat';
  let obv = 0;
  const obvSeries: number[] = [0];
  for (let i = 1; i < closes.length; i++) {
    obv += closes[i] > closes[i - 1] ? volumes[i] : closes[i] < closes[i - 1] ? -volumes[i] : 0;
    obvSeries.push(obv);
  }
  const recent = obvSeries.slice(-lookback);
  const slope = recent[recent.length - 1] - recent[0];
  const maxAbs = Math.max(...recent.map(Math.abs)) || 1;
  const norm = slope / maxAbs;
  if (norm > 0.06) return 'up';
  if (norm < -0.06) return 'down';
  return 'flat';
}

// Bollinger Band Squeeze: contraction → expansion = breakout
function detectBBSqueeze(closes: number[]): { squeeze: boolean; breakout: 'up' | 'down' | null } {
  if (closes.length < 40) return { squeeze: false, breakout: null };
  const calcBW = (data: number[]) => {
    const b = calcBollinger(data, 20);
    return b.mean > 0 ? (b.upper - b.lower) / b.mean : 0;
  };
  const histBW = calcBW(closes.slice(-40, -5));
  const currBW = calcBW(closes.slice(-20));
  if (currBW >= histBW * 0.68) return { squeeze: false, breakout: null };
  // Squeeze detected → find breakout direction from last 3 closes
  const bb = calcBollinger(closes, 20);
  const last = closes[closes.length - 1];
  const breakout: 'up' | 'down' = last > bb.mean ? 'up' : 'down';
  return { squeeze: true, breakout };
}

// S/R Swing Level detector (StrongSRConfluence style)
interface SRBounceResult {
  nearSupport: boolean;
  nearResistance: boolean;
  supportStrength: number;     // contagem real de toques
  resistanceStrength: number;
  rejectionLong: boolean;      // wick inferior > 1.5× corpo → confirmação CALL
  rejectionShort: boolean;     // wick superior > 1.5× corpo → confirmação PUT
}

function detectSRBounce(
  highs: number[], lows: number[], closes: number[], opens?: number[]
): SRBounceResult {
  const empty: SRBounceResult = {
    nearSupport: false, nearResistance: false,
    supportStrength: 0, resistanceStrength: 0,
    rejectionLong: false, rejectionShort: false,
  };
  if (closes.length < 15) return empty;

  const DEPTH = 5;
  const lookback = Math.min(150, closes.length);
  const h = highs.slice(-lookback);
  const l = lows.slice(-lookback);
  const price = closes[closes.length - 1];
  const atr = calcATR(highs.slice(-20), lows.slice(-20), closes.slice(-20), 14) || price * 0.001;

  const clusterTol   = atr * 1.5;
  const proximityTol = atr * 2.0;

  // Swing highs — fractal 5 barras
  const swingHighs: number[] = [];
  for (let i = DEPTH; i < h.length - DEPTH; i++) {
    let ok = true;
    for (let j = 1; j <= DEPTH && ok; j++) {
      if (h[i - j] >= h[i] || h[i + j] >= h[i]) ok = false;
    }
    if (ok) swingHighs.push(h[i]);
  }

  // Swing lows — fractal 5 barras
  const swingLows: number[] = [];
  for (let i = DEPTH; i < l.length - DEPTH; i++) {
    let ok = true;
    for (let j = 1; j <= DEPTH && ok; j++) {
      if (l[i - j] <= l[i] || l[i + j] <= l[i]) ok = false;
    }
    if (ok) swingLows.push(l[i]);
  }

  const supClusters: { level: number; count: number }[] = [];
  for (const sl of swingLows) {
    const hit = supClusters.find(c => Math.abs(c.level - sl) <= clusterTol);
    if (hit) { hit.count++; hit.level = (hit.level * (hit.count - 1) + sl) / hit.count; }
    else supClusters.push({ level: sl, count: 1 });
  }

  const resClusters: { level: number; count: number }[] = [];
  for (const sh of swingHighs) {
    const hit = resClusters.find(c => Math.abs(c.level - sh) <= clusterTol);
    if (hit) { hit.count++; hit.level = (hit.level * (hit.count - 1) + sh) / hit.count; }
    else resClusters.push({ level: sh, count: 1 });
  }

  // Contagem REAL de toques (todos os candles que visitam a zona)
  for (const c of supClusters) {
    let t = 0;
    const lo = c.level - clusterTol; const hi = c.level + clusterTol;
    for (let i = 0; i < l.length; i++) { if (l[i] >= lo && l[i] <= hi) t++; }
    c.count = Math.max(c.count, t);
  }
  for (const c of resClusters) {
    let t = 0;
    const lo = c.level - clusterTol; const hi = c.level + clusterTol;
    for (let i = 0; i < h.length; i++) { if (h[i] >= lo && h[i] <= hi) t++; }
    c.count = Math.max(c.count, t);
  }

  const nearestSup = supClusters
    .filter(c => price >= c.level - proximityTol && price <= c.level + proximityTol)
    .sort((a, b) => b.count - a.count)[0];

  const nearestRes = resClusters
    .filter(c => price >= c.level - proximityTol && price <= c.level + proximityTol)
    .sort((a, b) => b.count - a.count)[0];

  // Wick de rejeição na última vela
  const lastH = highs[highs.length - 1];
  const lastL = lows[lows.length - 1];
  const lastC = closes[closes.length - 1];
  const lastO = opens ? opens[opens.length - 1] : lastC;
  const bodySize = Math.abs(lastC - lastO) || atr * 0.1;
  const lowerWick = Math.min(lastO, lastC) - lastL;
  const upperWick = lastH - Math.max(lastO, lastC);

  return {
    nearSupport:        nearestSup !== undefined,
    nearResistance:     nearestRes !== undefined,
    supportStrength:    nearestSup?.count ?? 0,
    resistanceStrength: nearestRes?.count ?? 0,
    rejectionLong:  lowerWick > bodySize * 1.5,
    rejectionShort: upperWick > bodySize * 1.5,
  };
}

// EMA Retest: price touched EMA21 in last 3 bars and bounced in signal direction
function detectEMARetest(closes: number[], ema21: number[], direction: 'CALL' | 'PUT'): boolean {
  if (closes.length < 5 || ema21.length < 5) return false;
  for (let i = 2; i <= 4; i++) {
    const c = closes[closes.length - i];
    const e = ema21[ema21.length - i];
    if (!e) continue;
    if (Math.abs(c - e) / e < 0.0012) {
      const lastC = closes[closes.length - 1];
      if (direction === 'CALL' && lastC > c) return true;
      if (direction === 'PUT' && lastC < c) return true;
    }
  }
  return false;
}

// MACD Histogram momentum: is it accelerating (stronger) or decelerating?
function calcMACDMomentum(closes: number[]): 'growing' | 'shrinking' {
  if (closes.length < 36) return 'growing';
  const curr = calcMACD(closes).hist;
  const prev = calcMACD(closes.slice(0, -1)).hist;
  return Math.abs(curr) > Math.abs(prev) ? 'growing' : 'shrinking';
}

// ─── MARKET REGIME DETECTOR ────────────────────────────────────────────────

export function detectMarketRegime(
  highs: number[], lows: number[], closes: number[]
): MarketRegime {
  if (closes.length < 20) return 'RANGING';

  const adx = calcADX(highs, lows, closes, 14);
  const atr = calcATR(highs, lows, closes, 14);
  const lastClose = closes[closes.length - 1];
  const atrPct = lastClose > 0 ? (atr / lastClose) * 100 : 0;

  // Bollinger band width as choppiness proxy
  const bb = calcBollinger(closes, 20);
  const bbWidth = bb.mean > 0 ? (bb.upper - bb.lower) / bb.mean : 0;

  // Choppiness Index approximation using ATR vs range
  const highestH = Math.max(...highs.slice(-14));
  const lowestL = Math.min(...lows.slice(-14));
  const totalRange = highestH - lowestL || 0.0001;
  const atrSum = closes.slice(-14).reduce((acc, _, i, arr) => {
    if (i === 0) return acc;
    const tr = Math.max(
      highs[highs.length - 14 + i] - lows[lows.length - 14 + i],
      Math.abs(highs[highs.length - 14 + i] - closes[closes.length - 14 + i - 1]),
      Math.abs(lows[lows.length - 14 + i] - closes[closes.length - 14 + i - 1])
    );
    return acc + tr;
  }, 0);
  const chopIndex = atrSum > 0 ? (Math.log10(atrSum / totalRange) / Math.log10(14)) * 100 : 50;

  if (adx >= 28 && chopIndex < 61.8) return 'TRENDING';
  if (chopIndex >= 61.8 || (atrPct < 0.05 && bbWidth < 0.008)) return 'CHOPPY';
  return 'RANGING';
}

// ─── MAIN ENGINE ───────────────────────────────────────────────────────────

export function runEngine(buf: CandleBuffer, asset: string, lunaMode = false): SignalResult | null {
  const m1 = buf.m1;
  if (m1.length < 50) return null;

  const closes  = m1.map(c => c.c);
  const highs   = m1.map(c => c.h);
  const lows    = m1.map(c => c.l);
  const opens   = m1.map(c => c.o);
  const category = ASSET_CATEGORIES[asset] || 'forex';
  const sess     = getCurrentSession();

  // ── Indicadores core ──────────────────────────────────────────────────
  const ema9  = calcEMA(closes, 9);
  const ema21 = calcEMA(closes, 21);
  const ema50 = calcEMA(closes, 50);
  const rsi   = calcRSI(closes, 14);
  const adx   = calcADX(highs, lows, closes, 14);
  const atr   = calcATR(highs, lows, closes, 14);
  const candle   = detectCandlePattern(m1);
  const srBounce = detectSRBounce(highs, lows, closes, opens);
  const marketRegime = detectMarketRegime(highs, lows, closes);
  const entropy  = calcEntropy(m1);
  const volumes  = m1.map(c => c.v);
  const obvTrend = calcOBVTrend(closes, volumes, 12);
  const bbSq     = detectBBSqueeze(closes);

  // ── HTF tendência ────────────────────────────────────────────────────
  const m5closes  = deriveM5(m1).map(c => c.c);
  const m5ema9    = calcEMA(m5closes, 9);
  const m5ema21   = calcEMA(m5closes, 21);
  const htfBull   = m5ema9.length > 0 && m5ema21.length > 0 &&
    m5ema9[m5ema9.length - 1] > m5ema21[m5ema21.length - 1];

  const m15closes = deriveM15(m1).map(c => c.c);
  const m15ema9   = calcEMA(m15closes, 9);
  const m15ema21  = calcEMA(m15closes, 21);
  const m15Bull   = m15ema9.length > 0 && m15ema21.length > 0 &&
    m15ema9[m15ema9.length - 1] > m15ema21[m15ema21.length - 1];

  const lastClose = closes[closes.length - 1];
  const lastEma9  = ema9[ema9.length - 1]   ?? lastClose;
  const lastEma21 = ema21[ema21.length - 1] ?? lastClose;
  const lastEma50 = ema50[ema50.length - 1] ?? lastClose;
  const atrPct    = lastClose > 0 ? atr / lastClose : 0;

  const emaBull = lastEma9 > lastEma21 && lastEma21 > lastEma50;
  const emaBear = lastEma9 < lastEma21 && lastEma21 < lastEma50;

  // ── GATE 1: Deve estar em zona S/R ────────────────────────────────────
  if (!srBounce.nearSupport && !srBounce.nearResistance) return null;

  // ── GATE 2: Determina direção + exige candle de reversão ─────────────
  let direction: 'CALL' | 'PUT';
  if (srBounce.nearSupport && !srBounce.nearResistance) direction = 'CALL';
  else if (srBounce.nearResistance && !srBounce.nearSupport) direction = 'PUT';
  else direction = (srBounce.rejectionLong || candle.direction > 0) ? 'CALL' : 'PUT';

  let candleScore = 0;
  if (direction === 'CALL') {
    if (candle.pattern === 'hammer' || candle.pattern === 'threeWhiteSoldiers') candleScore = 30;
    else if (candle.pattern === 'bullEngulfing') candleScore = 24;
    else if (srBounce.rejectionLong) candleScore = 18;
    else if (candle.pattern === 'doji') candleScore = 10;
    // Sem padrão: score 0 (penaliza ≈28% do max) — não bloqueia mais
    else candleScore = 0;
  } else {
    if (candle.pattern === 'shootingStar' || candle.pattern === 'threeBlackCrows') candleScore = 30;
    else if (candle.pattern === 'bearEngulfing') candleScore = 24;
    else if (srBounce.rejectionShort) candleScore = 18;
    else if (candle.pattern === 'doji') candleScore = 10;
    else candleScore = 0;
  }

  // ── GATE 3: EMA Stack perfeito oposto bloqueia (ema9/21/50 alinhadas) ─
  if (direction === 'CALL' && emaBear) return null;
  if (direction === 'PUT'  && emaBull) return null;

  // ── GATE 4: ADX — crypto M1 pode ter ADX baixo mesmo em tendência
  if (adx < 10) return null;

  // ── GATE 5: ATR — apenas mercado verdadeiramente congelado (<1 bp)
  if (atrPct < 0.0001) return null;
  if (atrPct > 0.025)  return null;

  // ── GATE 6: RSI extremo contrário bloqueia ───────────────────────────
  if (direction === 'CALL' && rsi > 75) return null;
  if (direction === 'PUT'  && rsi < 25) return null;

  // CHOPPY: hard block removido — score já penaliza naturalmente (sem TRENDING +4%, sem ADX bônus)
  // Em zonas S/R fortes, mercado RANGING/CHOPPY pode produzir bons bounces em binary options

  // ── SCORE (máximo 108 pontos) ─────────────────────────────────────────
  // 1. Força da zona S/R (0–40 pts)
  const zoneStrength = direction === 'CALL' ? srBounce.supportStrength : srBounce.resistanceStrength;
  let srScore = 0;
  if      (zoneStrength >= 7) srScore = 40;
  else if (zoneStrength >= 5) srScore = 35;
  else if (zoneStrength >= 3) srScore = 28;
  else if (zoneStrength >= 2) srScore = 20;
  else                         srScore = 12;

  // 2. Candle de reversão (0–30 pts) — calculado acima

  // 3. Alinhamento EMA M1 (0–20 pts)
  let emaScore = 0;
  if (direction === 'CALL') {
    if (emaBull)                   emaScore = 20;
    else if (lastEma9 > lastEma21) emaScore = 12;
    else                           emaScore = 4;
  } else {
    if (emaBear)                   emaScore = 20;
    else if (lastEma9 < lastEma21) emaScore = 12;
    else                           emaScore = 4;
  }

  // 4. Confirmação HTF M5 + M15 (0–10 pts)
  let htfScore = 0;
  if (direction === 'CALL') {
    if (htfBull && m15Bull) htfScore = 10;
    else if (htfBull)       htfScore = 7;
    else if (m15Bull)       htfScore = 4;
  } else {
    if (!htfBull && !m15Bull) htfScore = 10;
    else if (!htfBull)        htfScore = 7;
    else if (!m15Bull)        htfScore = 4;
  }

  // 5. Posição do RSI (0–8 pts, bônus)
  let rsiBonus = 0;
  if (direction === 'CALL') {
    if (rsi < 30) rsiBonus = 8;
    else if (rsi < 40) rsiBonus = 4;
    else if (rsi < 50) rsiBonus = 2;
  } else {
    if (rsi > 70) rsiBonus = 8;
    else if (rsi > 60) rsiBonus = 4;
    else if (rsi > 50) rsiBonus = 2;
  }

  // Normaliza (máx 108 → 0.0–1.0) — FIX-5: floor honesto 0.25
  let rawScore = (srScore + candleScore + emaScore + htfScore + rsiBonus) / 108;
  rawScore = Math.min(0.97, Math.max(0.25, rawScore + getPairSessionBonus(sess, category, asset) * 0.20));

  if (adx >= 30)      rawScore = Math.min(0.97, rawScore + 0.03);
  else if (adx >= 25) rawScore = Math.min(0.97, rawScore + 0.015);
  if (marketRegime === 'TRENDING') rawScore = Math.min(0.97, rawScore + 0.04);
  const htfAgrees = direction === 'CALL' ? htfBull : !htfBull;
  const m15Agrees = direction === 'CALL' ? m15Bull : !m15Bull;
  if (htfAgrees && m15Agrees) rawScore = Math.min(0.97, rawScore + 0.03);

  // FIX-4: MACD momentum como modificador de score (±4%)
  const macdMom  = calcMACDMomentum(closes);
  const macdData = calcMACD(closes);
  const macdAligned =
    (direction === 'CALL' && macdData.hist > 0 && macdMom === 'growing') ||
    (direction === 'PUT'  && macdData.hist < 0 && macdMom === 'growing');
  if (!macdAligned) rawScore = Math.max(0.25, rawScore - 0.04);
  else              rawScore = Math.min(0.97, rawScore + 0.02);

  // ASSERT-4: Bollinger Squeeze booster (+5% quando breakout confirma direção)
  const bbBoost =
    bbSq.squeeze && bbSq.breakout !== null &&
    ((direction === 'CALL' && bbSq.breakout === 'up') ||
     (direction === 'PUT'  && bbSq.breakout === 'down'));
  if (bbBoost) rawScore = Math.min(0.97, rawScore + 0.05);

  // OBV: penalidade –8% aplicada ANTES do score final
  if (direction === 'CALL' && obvTrend === 'down') rawScore = Math.max(0.25, rawScore - 0.08);
  if (direction === 'PUT'  && obvTrend === 'up')   rawScore = Math.max(0.25, rawScore - 0.08);

  const score = Math.round(rawScore * 100);

  // ASSERT-3: thresholds calibrados
  let quality: SignalResult['quality'] = 'EVITAR';
  if      (score >= 90) quality = 'ULTRA';
  else if (score >= 82) quality = 'ELITE';
  else if (score >= 74) quality = 'PREMIUM';
  else if (score >= 66) quality = 'FORTE';
  else if (score >= 58) quality = 'MÉDIO';
  else if (score >= 50) quality = 'FRACO';

  // ── Config gates ──────────────────────────────────────────────────────
  const cfg = (() => {
    try { return JSON.parse(localStorage.getItem('smpCfg7') || '{}'); } catch { return {}; }
  })();
  const minScore  = cfg.minScore ?? 66;
  const forteOnly = cfg.forteOnly ?? false;

  if (score < minScore) return null;
  if (forteOnly && !['FORTE', 'PREMIUM', 'ELITE', 'ULTRA'].includes(quality)) return null;
  if (quality === 'EVITAR') return null;

  // Entropia crypto M1 é estruturalmente alta (90%+); só bloqueia acima de 96%
  if (entropy > 0.96) return null;

  // Luna Mode
  if (lunaMode && zoneStrength < 3) return null;
  if (lunaMode && direction === 'CALL' && !srBounce.rejectionLong)  return null;
  if (lunaMode && direction === 'PUT'  && !srBounce.rejectionShort) return null;

  // Horário morto
  const mins = new Date().getMinutes();
  if (mins === 59 || mins === 0) return null;

  const votes: Record<string, string> = {
    sr:     direction,
    candle: candle.direction > 0 ? 'CALL' : candle.direction < 0 ? 'PUT' : 'NEUTRAL',
    ema:    emaBull ? 'CALL' : emaBear ? 'PUT' : 'NEUTRAL',
    htf:    htfBull ? 'CALL' : 'PUT',
    m15:    m15closes.length >= 9 ? (m15Bull ? 'CALL' : 'PUT') : 'NEUTRAL',
    rsi:    rsi < 40 ? 'CALL' : rsi > 60 ? 'PUT' : 'NEUTRAL',
    obv:    obvTrend === 'up' ? 'CALL' : obvTrend === 'down' ? 'PUT' : 'NEUTRAL',
    bb:     bbSq.squeeze ? (bbSq.breakout === 'up' ? 'CALL' : bbSq.breakout === 'down' ? 'PUT' : 'NEUTRAL') : 'NEUTRAL',
    macd:   macdData.hist > 0 ? 'CALL' : macdData.hist < 0 ? 'PUT' : 'NEUTRAL',
  };

  return {
    direction, score, quality, marketRegime,
    adx: Math.round(adx), rsi: Math.round(rsi),
    entropy: Math.round(entropy * 100) / 100, dnaMatch: 0, consensus: Math.round(zoneStrength),
    confirmed: candleScore > 0 ? 1 : 0,
    mmTrap: false, mmTrapType: '',
    sess, votes, asset, category,
    fingerprint: [], ts: Date.now(),
  };
}

// ─── DIAGNOSTIC ENGINE (returns analysis even when blocked) ────────────────

export interface DiagResult {
  direction: 'CALL' | 'PUT';
  score: number;
  quality: string;
  adx: number;
  rsi: number;
  entropy: number;
  consensus: number;
  confirmed: number;
  blockedBy: string | null;
  votes: Record<string, string>;
  passed: boolean;
  extras?: string[];
}

export function runEngineDiag(buf: CandleBuffer, asset: string, lunaMode = false): DiagResult | null {
  const m1 = buf.m1;
  if (m1.length < 50) return null;

  const closes  = m1.map(c => c.c);
  const highs   = m1.map(c => c.h);
  const lows    = m1.map(c => c.l);
  const opens   = m1.map(c => c.o);
  const category = ASSET_CATEGORIES[asset] || 'forex';
  const sess     = getCurrentSession();

  const ema9  = calcEMA(closes, 9);
  const ema21 = calcEMA(closes, 21);
  const ema50 = calcEMA(closes, 50);
  const rsi   = calcRSI(closes, 14);
  const adx   = calcADX(highs, lows, closes, 14);
  const atr   = calcATR(highs, lows, closes, 14);
  const candle   = detectCandlePattern(m1);
  const srBounce = detectSRBounce(highs, lows, closes, opens);
  const marketRegime = detectMarketRegime(highs, lows, closes);
  const entropy  = calcEntropy(m1);
  const volumes  = m1.map(c => c.v);
  const obvTrend = calcOBVTrend(closes, volumes, 12);
  const bbSq     = detectBBSqueeze(closes);

  const m5closes  = deriveM5(m1).map(c => c.c);
  const m5ema9    = calcEMA(m5closes, 9);
  const m5ema21   = calcEMA(m5closes, 21);
  const htfBull   = m5ema9.length > 0 && m5ema21.length > 0 &&
    m5ema9[m5ema9.length - 1] > m5ema21[m5ema21.length - 1];

  const m15closes = deriveM15(m1).map(c => c.c);
  const m15ema9   = calcEMA(m15closes, 9);
  const m15ema21  = calcEMA(m15closes, 21);
  const m15Bull   = m15ema9.length > 0 && m15ema21.length > 0 &&
    m15ema9[m15ema9.length - 1] > m15ema21[m15ema21.length - 1];

  const lastClose = closes[closes.length - 1];
  const lastEma9  = ema9[ema9.length - 1]   ?? lastClose;
  const lastEma21 = ema21[ema21.length - 1] ?? lastClose;
  const lastEma50 = ema50[ema50.length - 1] ?? lastClose;
  const atrPct    = lastClose > 0 ? atr / lastClose : 0;
  const emaBull   = lastEma9 > lastEma21 && lastEma21 > lastEma50;
  const emaBear   = lastEma9 < lastEma21 && lastEma21 < lastEma50;

  // Direção baseada na zona
  let direction: 'CALL' | 'PUT';
  if (srBounce.nearSupport && !srBounce.nearResistance) direction = 'CALL';
  else if (srBounce.nearResistance && !srBounce.nearSupport) direction = 'PUT';
  else direction = (srBounce.rejectionLong || candle.direction > 0) ? 'CALL' : 'PUT';

  // Candle score
  let candleScore = 0;
  if (direction === 'CALL') {
    if (candle.pattern === 'hammer' || candle.pattern === 'threeWhiteSoldiers') candleScore = 30;
    else if (candle.pattern === 'bullEngulfing') candleScore = 24;
    else if (srBounce.rejectionLong) candleScore = 18;
    else if (candle.pattern === 'doji') candleScore = 10;
  } else {
    if (candle.pattern === 'shootingStar' || candle.pattern === 'threeBlackCrows') candleScore = 30;
    else if (candle.pattern === 'bearEngulfing') candleScore = 24;
    else if (srBounce.rejectionShort) candleScore = 18;
    else if (candle.pattern === 'doji') candleScore = 10;
  }

  const zoneStrength = direction === 'CALL' ? srBounce.supportStrength : srBounce.resistanceStrength;
  let srScore = 0;
  if      (zoneStrength >= 7) srScore = 40;
  else if (zoneStrength >= 5) srScore = 35;
  else if (zoneStrength >= 3) srScore = 28;
  else if (zoneStrength >= 2) srScore = 20;
  else                         srScore = 12;

  let emaScore = 0;
  if (direction === 'CALL') {
    if (emaBull) emaScore = 20; else if (lastEma9 > lastEma21) emaScore = 12; else emaScore = 4;
  } else {
    if (emaBear) emaScore = 20; else if (lastEma9 < lastEma21) emaScore = 12; else emaScore = 4;
  }

  let htfScore = 0;
  if (direction === 'CALL') {
    if (htfBull && m15Bull) htfScore = 10; else if (htfBull) htfScore = 7; else if (m15Bull) htfScore = 4;
  } else {
    if (!htfBull && !m15Bull) htfScore = 10; else if (!htfBull) htfScore = 7; else if (!m15Bull) htfScore = 4;
  }

  let rsiBonus = 0;
  if (direction === 'CALL') {
    if (rsi < 30) rsiBonus = 8; else if (rsi < 40) rsiBonus = 4; else if (rsi < 50) rsiBonus = 2;
  } else {
    if (rsi > 70) rsiBonus = 8; else if (rsi > 60) rsiBonus = 4; else if (rsi > 50) rsiBonus = 2;
  }

  // FIX-5: floor honesto 0.25
  let rawScore = (srScore + candleScore + emaScore + htfScore + rsiBonus) / 108;
  rawScore = Math.min(0.97, Math.max(0.25, rawScore + getPairSessionBonus(sess, category, asset) * 0.20));
  if (adx >= 30)      rawScore = Math.min(0.97, rawScore + 0.03);
  else if (adx >= 25) rawScore = Math.min(0.97, rawScore + 0.015);
  if (marketRegime === 'TRENDING') rawScore = Math.min(0.97, rawScore + 0.04);
  const htfAgrees = direction === 'CALL' ? htfBull : !htfBull;
  const m15Agrees = direction === 'CALL' ? m15Bull : !m15Bull;
  if (htfAgrees && m15Agrees) rawScore = Math.min(0.97, rawScore + 0.03);

  // FIX-4: MACD momentum modificador de score
  const macdMomD  = calcMACDMomentum(closes);
  const macdDataD = calcMACD(closes);
  const macdAlignedD =
    (direction === 'CALL' && macdDataD.hist > 0 && macdMomD === 'growing') ||
    (direction === 'PUT'  && macdDataD.hist < 0 && macdMomD === 'growing');
  if (!macdAlignedD) rawScore = Math.max(0.25, rawScore - 0.04);
  else               rawScore = Math.min(0.97, rawScore + 0.02);

  // ASSERT-4: BB Squeeze booster
  const bbBoostD =
    bbSq.squeeze && bbSq.breakout !== null &&
    ((direction === 'CALL' && bbSq.breakout === 'up') ||
     (direction === 'PUT'  && bbSq.breakout === 'down'));
  if (bbBoostD) rawScore = Math.min(0.97, rawScore + 0.05);

  const score = Math.round(rawScore * 100);

  // ASSERT-3: thresholds calibrados
  let quality = 'EVITAR';
  if      (score >= 90) quality = 'ULTRA';
  else if (score >= 82) quality = 'ELITE';
  else if (score >= 74) quality = 'PREMIUM';
  else if (score >= 66) quality = 'FORTE';
  else if (score >= 58) quality = 'MÉDIO';
  else if (score >= 50) quality = 'FRACO';

  const cfg = (() => {
    try { return JSON.parse(localStorage.getItem('smpCfg7') || '{}'); } catch { return {}; }
  })();
  const minScore  = cfg.minScore ?? 66;
  const forteOnly = cfg.forteOnly ?? false;

  const votes: Record<string, string> = {
    sr:     direction,
    candle: candle.direction > 0 ? 'CALL' : candle.direction < 0 ? 'PUT' : 'NEUTRAL',
    ema:    emaBull ? 'CALL' : emaBear ? 'PUT' : 'NEUTRAL',
    htf:    htfBull ? 'CALL' : 'PUT',
    m15:    m15closes.length >= 9 ? (m15Bull ? 'CALL' : 'PUT') : 'NEUTRAL',
    rsi:    rsi < 40 ? 'CALL' : rsi > 60 ? 'PUT' : 'NEUTRAL',
    obv:    obvTrend === 'up' ? 'CALL' : obvTrend === 'down' ? 'PUT' : 'NEUTRAL',
    bb:     bbSq.squeeze ? (bbSq.breakout === 'up' ? 'CALL' : bbSq.breakout === 'down' ? 'PUT' : 'NEUTRAL') : 'NEUTRAL',
    macd:   macdDataD.hist > 0 ? 'CALL' : macdDataD.hist < 0 ? 'PUT' : 'NEUTRAL',
  };

  let blockedBy: string | null = null;
  if (!srBounce.nearSupport && !srBounce.nearResistance)
    blockedBy = 'Fora de zona S/R — aguardando toque';
  // candleScore=0 não bloqueia mais — já penaliza o score em ≈28%
  else if (direction === 'CALL' && emaBear)
    blockedBy = 'EMA Bear Stack — tendência de baixa, sem CALL';
  else if (direction === 'PUT' && emaBull)
    blockedBy = 'EMA Bull Stack — tendência de alta, sem PUT';
  else if (adx < 10)
    blockedBy = `ADX ${Math.round(adx)} < 10 — mercado completamente sem força`;
  else if (atrPct < 0.0001)
    blockedBy = 'Mercado congelado — ATR < 1 bp';
  else if (atrPct > 0.025)
    blockedBy = `Mercado caótico — ATR ${Math.round(atrPct * 10000)} bps`;
  else if (direction === 'CALL' && rsi > 75)
    blockedBy = `RSI ${Math.round(rsi)} sobrecomprado — CALL bloqueado`;
  else if (direction === 'PUT' && rsi < 25)
    blockedBy = `RSI ${Math.round(rsi)} sobrevendido — PUT bloqueado`;
  // FIX-3: só bloqueia entropia >96% (crypto M1 tem estruturalmente 90%+)
  else if (entropy > 0.96)
    blockedBy = `Entropia ${Math.round(entropy * 100)}% — mercado completamente aleatório`;
  // CHOPPY: não bloqueia mais — score reflete adequadamente o risco
  else if (score < minScore)
    blockedBy = `Score ${score}% < mínimo ${minScore}% — zona fraca ou candle fraco`;
  else if (forteOnly && !['FORTE', 'PREMIUM', 'ELITE', 'ULTRA'].includes(quality))
    blockedBy = `Qualidade ${quality} — modo "Apenas FORTE+" ativo`;
  else if (quality === 'EVITAR')
    blockedBy = `Score ${score}% — zona ou candle insuficiente`;
  else if (lunaMode && zoneStrength < 3)
    blockedBy = `Luna Mode: zona com ${zoneStrength} toques (mínimo 3)`;
  else if (lunaMode && direction === 'CALL' && !srBounce.rejectionLong)
    blockedBy = 'Luna Mode: sem wick de rejeição bullish';
  else if (lunaMode && direction === 'PUT' && !srBounce.rejectionShort)
    blockedBy = 'Luna Mode: sem wick de rejeição bearish';

  return {
    direction, score, quality,
    adx: Math.round(adx), rsi: Math.round(rsi),
    entropy: Math.round(entropy * 100) / 100, consensus: Math.round(zoneStrength),
    confirmed: candleScore > 0 ? 1 : 0,
    blockedBy, votes,
    passed: blockedBy === null,
    extras: [
      `Zona: ${direction === 'CALL' ? 'Suporte' : 'Resistência'} (${zoneStrength} toques — ${srScore}/40 pts)`,
      `Candle: ${candle.pattern} (${candleScore}/30 pts)`,
      `EMA M1: ${emaBull ? '▲ Bull Stack' : emaBear ? '▼ Bear Stack' : '↔ Neutro'}`,
      `HTF M5: ${htfBull ? '▲ Bull' : '▼ Bear'} | M15: ${m15Bull ? '▲ Bull' : '▼ Bear'}`,
      `RSI: ${Math.round(rsi)} | ADX: ${Math.round(adx)} | Regime: ${marketRegime}`,
      `Score: S/R ${srScore} + Candle ${candleScore} + EMA ${emaScore} + HTF ${htfScore} + RSI ${rsiBonus} = ${score}%`,
    ],
  };
}

// ─── ORNSTEIN-UHLENBECK FOREX/COMMODITY SIMULATOR ──────────────────────────

export function generateOUCandle(lastPrice: number, asset: string): Candle {
  const mu    = BASE_PRICES[asset] || lastPrice;
  const theta = 0.05;
  const sigma = PAIR_VOL[asset] || 0.0003;
  const dt    = 1 / 1440;
  const drift = theta * (mu - lastPrice) * dt;

  // Box-Muller correto — padrão da indústria, sem sin/cos de timestamp
  let u1: number;
  do { u1 = Math.random(); } while (u1 === 0);
  const u2     = Math.random();
  const normal = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

  const close = lastPrice + drift + sigma * normal * Math.sqrt(dt) * 100;
  const range = sigma * (0.8 + Math.abs(normal) * 0.5);
  const open  = lastPrice;
  const high  = Math.max(open, close) + range * 0.3;
  const low   = Math.min(open, close) - range * 0.3;
  return {
    o: open, h: high, l: low, c: Math.max(low + 0.0001, close),
    v: 800 + Math.abs(normal) * 600,
    t: Date.now()
  };
}

// ─── ML WEIGHT UPDATE ──────────────────────────────────────────────────────

export function updateMLWeights(signal: SignalResult, resultType: 'win' | 'loss') {
  try {
    const ml = JSON.parse(localStorage.getItem('smpML7') || '{}');
    const ctx = `${signal.sess}_${signal.category}`;
    if (!ml[ctx]) ml[ctx] = { ...BASE_WEIGHTS };
    const lr = 0.015;
    Object.entries(signal.votes).forEach(([ind, vote]) => {
      if (vote === signal.direction && ml[ctx][ind] !== undefined) {
        if (resultType === 'win') ml[ctx][ind] = Math.min(0.40, ml[ctx][ind] + lr);
        else ml[ctx][ind] = Math.max(0.02, ml[ctx][ind] - lr * 0.5);
      }
    });
    const t = Object.values(ml[ctx] as Record<string, number>).reduce((a: number, b: number) => a + b, 0);
    if (t > 0) Object.keys(ml[ctx]).forEach(k => (ml[ctx][k] = ml[ctx][k] / t));
    localStorage.setItem('smpML7', JSON.stringify(ml));
  } catch {}
}

// ─── SOUND ENGINE ──────────────────────────────────────────────────────────
// Singleton AudioContext — reused across all sound calls to avoid autoplay block

let _audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext {
  if (!_audioCtx) {
    _audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return _audioCtx;
}

// Call once on a user-gesture (click) to unlock audio for the session
export async function unlockAudio(): Promise<boolean> {
  try {
    const ctx = getAudioCtx();
    if (ctx.state === 'suspended') await ctx.resume();
    // Play a silent buffer to fully unlock iOS/Safari
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
    return ctx.state === 'running';
  } catch { return false; }
}

export function isAudioUnlocked(): boolean {
  return _audioCtx !== null && _audioCtx.state === 'running';
}

function _doPlaySound(ctx: AudioContext, type: string) {
  const SIGNAL_NOTES: Record<string, Array<[number, number, number]>> = {
    // [frequency, startDelay, duration]
    forte:   [[440, 0.00, 0.18], [550, 0.18, 0.18], [660, 0.36, 0.28]],
    premium: [[440, 0.00, 0.14], [550, 0.14, 0.14], [660, 0.28, 0.14], [880, 0.42, 0.40], [1100, 0.60, 0.35]],
    crypto:  [[880, 0.00, 0.12], [1100, 0.12, 0.12], [1320, 0.24, 0.30]],
    // ULTRA: fanfara especial ascendente — 7 notas, som épico e único
    ultra:   [[330, 0.00, 0.10], [415, 0.10, 0.10], [523, 0.20, 0.10], [659, 0.30, 0.12], [784, 0.42, 0.14], [988, 0.56, 0.20], [1319, 0.72, 0.55]],
    win:     [[523, 0.00, 0.14], [659, 0.14, 0.14], [784, 0.28, 0.30]],
    loss:    [[400, 0.00, 0.16], [350, 0.18, 0.16], [300, 0.36, 0.28]],
    alert:   [[880, 0.00, 0.12], [880, 0.18, 0.12]],
  };
  const notes = SIGNAL_NOTES[type] ?? SIGNAL_NOTES.forte;
  notes.forEach(([freq, delay, dur]) => {
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type === 'premium' ? 'sine' : 'sine';
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + dur + 0.02);
    } catch {}
  });
}

export function playSignalSound(type: string) {
  try {
    const ctx = getAudioCtx();
    if (ctx.state === 'suspended') {
      // Resume then play — works if user previously unlocked
      ctx.resume().then(() => _doPlaySound(ctx, type)).catch(() => {});
    } else {
      _doPlaySound(ctx, type);
    }
  } catch {}
}

export function vibrate(type: string) {
  const patterns: Record<string, number[]> = {
    forte: [400], win: [100, 50, 100, 50, 200], loss: [150]
  };
  try { navigator.vibrate?.(patterns[type] || [200]); } catch {}
}

/**
 * explainSignal — gera explicação em linguagem simples do motivo do sinal.
 * Para o botão "Por que este sinal?" no frontend.
 */
export function explainSignal(signal: SignalResult): { summary: string; bullets: string[]; warning?: string } {
  const dir = signal.direction === 'CALL' ? '📈 CALL (Alta)' : '📉 PUT (Queda)';
  const { votes, rsi, adx, entropy, dnaMatch, consensus, marketRegime, mmTrap, mmTrapType, score, quality } = signal;

  const bullets: string[] = [];

  // EMA alignment
  if (votes.ema !== 'NEUTRAL') {
    bullets.push(votes.ema === 'CALL'
      ? '📐 EMAs 9/21/50 alinhadas em tendência de alta — momentum favorável'
      : '📐 EMAs 9/21/50 alinhadas em tendência de baixa — pressão vendedora');
  }

  // RSI
  if (rsi < 30) bullets.push(`📊 RSI em ${rsi.toFixed(0)} — zona de sobrevenda, reversão provável para cima`);
  else if (rsi > 70) bullets.push(`📊 RSI em ${rsi.toFixed(0)} — zona de sobrecompra, reversão provável para baixo`);
  else if (votes.rsi !== 'NEUTRAL') {
    bullets.push(`📊 RSI em ${rsi.toFixed(0)} — momentum ${votes.rsi === 'CALL' ? 'comprador' : 'vendedor'} moderado`);
  }

  // RSI Divergence
  if (votes.rsidiv !== 'NEUTRAL') {
    bullets.push(votes.rsidiv === 'CALL'
      ? '🔀 Divergência altista no RSI — preço caiu mas RSI subiu (sinal de inversão forte)'
      : '🔀 Divergência baixista no RSI — preço subiu mas RSI caiu (sinal de inversão forte)');
  }

  // MACD
  if (votes.macd !== 'NEUTRAL') {
    bullets.push(votes.macd === 'CALL'
      ? '⚡ MACD com histograma positivo — momentum de compra acelerando'
      : '⚡ MACD com histograma negativo — momentum de venda acelerando');
  }

  // Bollinger
  if (votes.bb === 'CALL') bullets.push('🎯 Preço na banda inferior de Bollinger — zona de suporte estatístico');
  if (votes.bb === 'PUT') bullets.push('🎯 Preço na banda superior de Bollinger — zona de resistência estatística');
  if (votes.bsq !== 'NEUTRAL') {
    bullets.push(votes.bsq === 'CALL'
      ? '💥 Squeeze de Bollinger com rompimento altista — expansão de volatilidade para cima'
      : '💥 Squeeze de Bollinger com rompimento baixista — expansão de volatilidade para baixo');
  }

  // ADX
  if (adx >= 28) bullets.push(`💪 ADX em ${adx.toFixed(0)} — tendência forte confirmada, sinal de maior confiança`);
  else if (adx < 18) bullets.push(`⚠️ ADX em ${adx.toFixed(0)} — mercado sem tendência clara, maior risco de falso sinal`);

  // Support/Resistance
  if (votes.sr !== 'NEUTRAL') {
    bullets.push(votes.sr === 'CALL'
      ? '🧱 Preço em suporte chave — zona de compra identificada'
      : '🧱 Preço em resistência chave — zona de venda identificada');
  }

  // Candle pattern
  const candleNames: Record<string, string> = {
    hammer: 'Hammer (martelo)',
    shootingStar: 'Shooting Star (estrela cadente)',
    bullEngulfing: 'Engolfo altista',
    bearEngulfing: 'Engolfo baixista',
    threeWhiteSoldiers: 'Três soldados brancos',
    threeBlackCrows: 'Três corvos negros',
    doji: 'Doji (indecisão)',
  };
  if (votes.candle !== 'NEUTRAL') {
    const cpName = candleNames['none'] || 'Padrão de vela';
    bullets.push(`🕯️ Padrão de candle ${votes.candle === 'CALL' ? 'altista' : 'baixista'} identificado`);
  }

  // Volume
  if (votes.volume !== 'NEUTRAL') {
    bullets.push(votes.volume === 'CALL'
      ? '📊 Volume acima da média — compradores com força'
      : '📊 Volume acima da média — vendedores com força');
  }

  // OBV
  if (votes.obv !== 'NEUTRAL') {
    bullets.push(votes.obv === 'CALL'
      ? '💰 OBV em tendência de alta — fluxo de dinheiro entrando no ativo'
      : '💰 OBV em tendência de queda — fluxo de dinheiro saindo do ativo');
  }

  // DNA Match
  if (dnaMatch > 0.6) bullets.push(`🧬 DNA de mercado ${Math.round(dnaMatch * 100)}% compatível com padrões históricos de ${signal.direction}`);

  // Market regime
  if (marketRegime === 'TRENDING') bullets.push('🌊 Regime de mercado: TENDÊNCIA — condição ideal para opções binárias');
  else if (marketRegime === 'CHOPPY') bullets.push('🌀 Regime de mercado: LATERAL — maior cuidado, sinal de menor confiança');

  // MM Trap
  if (mmTrap) {
    bullets.push(`🎣 Armadilha de market maker detectada: ${mmTrapType} — sinal contra o movimento falso`);
  }

  // Consensus
  const pct = Math.round(consensus * 100);
  const totalInd = Object.values(votes).filter(v => v !== 'NEUTRAL').length;
  const agreeing = Object.values(votes).filter(v => v === signal.direction).length;

  const summary = `Sinal ${dir} gerado com score ${Math.round(score * 100)}% (${quality}). ${agreeing} de ${totalInd} indicadores ativos apontam na mesma direção (${pct}% de consenso).`;

  // Warning
  let warning: string | undefined;
  if (entropy > 0.6) warning = '⚠️ Alta entropia no mercado — volatilidade irregular detectada. Considere reduzir o valor de entrada.';
  else if (adx < 18) warning = '⚠️ Tendência fraca (ADX baixo). Probabilidade de mercado lateral — opere com cautela.';
  else if (rsi > 80 || rsi < 20) warning = '⚠️ RSI em extremo — o preço pode já ter movido demais antes da entrada.';

  return { summary, bullets: bullets.slice(0, 8), warning };
}
