// Backend Signal Engine — Node.js adaptation of the frontend signalEngine.ts
// All pure math + runEngine (adapted: no localStorage, no browser APIs)

// ── Ebinex Crypto Pairs Only ─────────────────────────────────────────
export const ASSET_CATEGORIES: Record<string, string> = {
  BTCUSD: 'crypto', ETHUSD: 'crypto', SOLUSD: 'crypto', BNBUSD: 'crypto',
  ADAUSD: 'crypto', DOGEUSD: 'crypto', XRPUSD: 'crypto', LTCUSD: 'crypto',
  AVAXUSD: 'crypto', DOTUSD: 'crypto', LINKUSD: 'crypto', MATICUSD: 'crypto',
};

export const CRYPTO_SYMBOLS: Record<string, string> = {
  BTCUSD: 'btcusdt', ETHUSD: 'ethusdt', SOLUSD: 'solusdt', BNBUSD: 'bnbusdt',
  ADAUSD: 'adausdt', DOGEUSD: 'dogeusdt', XRPUSD: 'xrpusdt', LTCUSD: 'ltcusdt',
  AVAXUSD: 'avaxusdt', DOTUSD: 'dotusdt', LINKUSD: 'linkusdt', MATICUSD: 'maticusdt',
};

export const BASE_PRICES: Record<string, number> = {
  // Crypto (approximate April 2026 prices)
  BTCUSD: 72000, ETHUSD: 1600, SOLUSD: 130, BNBUSD: 580,
  XRPUSD: 2.1, ADAUSD: 0.65, DOGEUSD: 0.16, LTCUSD: 90,
  AVAXUSD: 28.0, DOTUSD: 6.5, LINKUSD: 14.0, MATICUSD: 0.55,
};

export const PAIR_VOL: Record<string, number> = {
  // Crypto — calibrated so sigma*sqrt(1/1440)*100 ≈ 0.1-0.2% of base price per M1 candle
  BTCUSD: 27, ETHUSD: 0.9, SOLUSD: 0.1, BNBUSD: 0.33,
  XRPUSD: 0.0016, ADAUSD: 0.0005, DOGEUSD: 0.00012, LTCUSD: 0.051,
  AVAXUSD: 0.014, DOTUSD: 0.004, LINKUSD: 0.007, MATICUSD: 0.0003,
};

export interface Candle {
  o: number; h: number; l: number; c: number; v: number; t: number;
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
  consensus: number;
  confirmed: number;
  mmTrap: boolean;
  mmTrapType: string;
  sess: string;
  votes: Record<string, string>;
  blockedBy: string | null;
  asset: string;
  category: string;
  ts: number;
  passed: boolean;
  // Luna Oracle fields (populated by backendSignalEngine after Oracle review)
  oracleApproved?: boolean;
  oracleConfidence?: number;
  oracleReason?: string;
  oracleScore?: number;
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

export function detectCandlePattern(candles: Candle[]): { pattern: string; direction: number } {
  if (candles.length < 3) return { pattern: 'none', direction: 0 };
  const c = candles[candles.length - 1];
  const p = candles[candles.length - 2];
  const body = Math.abs(c.c - c.o);
  const range = (c.h - c.l) || 0.0001;
  if (body / range < 0.1) return { pattern: 'doji', direction: 0 };
  const lowerShadow = Math.min(c.c, c.o) - c.l;
  const upperShadow = c.h - Math.max(c.c, c.o);
  if (lowerShadow > body * 2 && upperShadow < body * 0.3) return { pattern: 'hammer', direction: 1 };
  if (upperShadow > body * 2 && lowerShadow < body * 0.3) return { pattern: 'shootingStar', direction: -1 };
  if (c.c > c.o && p.c < p.o && c.o < p.c && c.c > p.o) return { pattern: 'bullEngulfing', direction: 1 };
  if (c.c < c.o && p.c > p.o && c.o > p.c && c.c < p.o) return { pattern: 'bearEngulfing', direction: -1 };
  if (candles.length >= 3) {
    const c2 = candles[candles.length - 3];
    const allBull = c2.c > c2.o && p.c > p.o && c.c > c.o;
    if (allBull && p.o > c2.o && c.o > p.o) return { pattern: 'threeWhiteSoldiers', direction: 1 };
    const allBear = c2.c < c2.o && p.c < p.o && c.c < c.o;
    if (allBear && p.o < c2.o && c.o < p.o) return { pattern: 'threeBlackCrows', direction: -1 };
  }
  return { pattern: 'none', direction: c.c > c.o ? 1 : -1 };
}

function groupByPeriod(m1: Candle[], periodMs: number): Candle[] {
  if (m1.length === 0) return [];
  const buckets = new Map<number, Candle[]>();
  for (const c of m1) {
    const key = Math.floor(c.t / periodMs) * periodMs;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(c);
  }
  return Array.from(buckets.entries())
    .sort(([a], [b]) => a - b)
    .map(([, group]) => ({
      o: group[0].o,
      h: Math.max(...group.map(c => c.h)),
      l: Math.min(...group.map(c => c.l)),
      c: group[group.length - 1].c,
      v: group.reduce((a, b) => a + b.v, 0),
      t: group[0].t
    }));
}

export function deriveM5(m1: Candle[]): Candle[] {
  return groupByPeriod(m1, 5 * 60 * 1000);
}

export function deriveM15(m1: Candle[]): Candle[] {
  return groupByPeriod(m1, 15 * 60 * 1000);
}

export function getCurrentSession(): string {
  const h = new Date().getUTCHours();
  if (h >= 8 && h < 13) return 'london';
  if (h >= 13 && h < 17) return 'overlap';
  if (h >= 17 && h < 22) return 'ny';
  return 'asia';
}

function getPairSessionBonus(sess: string, category: string, asset: string): number {
  // Crypto trades 24/7 — best hours are NY+London overlap and NY open
  const matrix: Record<string, Record<string, number>> = {
    BTCUSD:  { london: 0.10, overlap: 0.22, ny: 0.20, asia: 0.05 },
    ETHUSD:  { london: 0.10, overlap: 0.20, ny: 0.18, asia: 0.04 },
    SOLUSD:  { london: 0.08, overlap: 0.20, ny: 0.18, asia: 0.02 },
    BNBUSD:  { london: 0.08, overlap: 0.18, ny: 0.16, asia: 0.02 },
    XRPUSD:  { london: 0.06, overlap: 0.16, ny: 0.14, asia: 0.00 },
    ADAUSD:  { london: 0.06, overlap: 0.16, ny: 0.14, asia: 0.00 },
    DOGEUSD: { london: 0.04, overlap: 0.14, ny: 0.12, asia: -0.02 },
    LTCUSD:  { london: 0.06, overlap: 0.16, ny: 0.14, asia: 0.00 },
    AVAXUSD: { london: 0.08, overlap: 0.18, ny: 0.16, asia: 0.01 },
    DOTUSD:  { london: 0.06, overlap: 0.16, ny: 0.14, asia: 0.00 },
    LINKUSD: { london: 0.06, overlap: 0.16, ny: 0.14, asia: 0.00 },
    MATICUSD:{ london: 0.06, overlap: 0.14, ny: 0.12, asia: -0.01 },
  };
  if (matrix[asset]?.[sess] !== undefined) return matrix[asset][sess];
  // Default crypto session bonus
  if (sess === 'overlap') return 0.18; if (sess === 'ny') return 0.14;
  if (sess === 'london') return 0.08; return -0.05;
}

function detectRSIDivergence(closes: number[], highs: number[], lows: number[]): 'bullish' | 'bearish' | null {
  if (closes.length < 30) return null;
  const half = 10;
  const rsi1 = calcRSI(closes.slice(-30, -half), 14);
  const rsi2 = calcRSI(closes.slice(-half), 14);
  const priceLow1 = Math.min(...lows.slice(-30, -half));
  const priceLow2 = Math.min(...lows.slice(-half));
  const priceHigh1 = Math.max(...highs.slice(-30, -half));
  const priceHigh2 = Math.max(...highs.slice(-half));
  if (priceLow2 < priceLow1 * 0.9997 && rsi2 > rsi1 + 4 && rsi2 < 48) return 'bullish';
  if (priceHigh2 > priceHigh1 * 1.0003 && rsi2 < rsi1 - 4 && rsi2 > 52) return 'bearish';
  return null;
}

export function calcOBVTrend(closes: number[], volumes: number[], lookback = 12): 'up' | 'down' | 'flat' {
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

export function detectBBSqueeze(closes: number[]): { squeeze: boolean; breakout: 'up' | 'down' | null } {
  if (closes.length < 40) return { squeeze: false, breakout: null };
  const calcBW = (data: number[]) => {
    const b = calcBollinger(data, 20);
    return b.mean > 0 ? (b.upper - b.lower) / b.mean : 0;
  };
  const histBW = calcBW(closes.slice(-40, -5));
  const currBW = calcBW(closes.slice(-20));
  if (currBW >= histBW * 0.68) return { squeeze: false, breakout: null };
  const bb = calcBollinger(closes, 20);
  const last = closes[closes.length - 1];
  const breakout: 'up' | 'down' = last > bb.mean ? 'up' : 'down';
  return { squeeze: true, breakout };
}

interface SRBounceResult {
  nearSupport: boolean;
  nearResistance: boolean;
  supportStrength: number;     // 0–20+: contagem de toques na zona de suporte
  resistanceStrength: number;  // 0–20+: contagem de toques na zona de resistência
  rejectionLong: boolean;      // wick inferior > 1.5× corpo → confirmação CALL
  rejectionShort: boolean;     // wick superior > 1.5× corpo → confirmação PUT
}

/**
 * Detecta zonas S/R fortes com:
 *  - Fractal de 5 barras (mais seletivo e confiável)
 *  - Contagem real de toques: todos os candles que tocam a zona
 *  - Clustering de zonas próximas (dentro de 1.5 ATR)
 *  - Detecção de wick de rejeição (confirmação de padrão de vela)
 */
export function detectSRBounce(
  highs: number[], lows: number[], closes: number[], opens?: number[]
): SRBounceResult {
  const empty: SRBounceResult = {
    nearSupport: false, nearResistance: false,
    supportStrength: 0, resistanceStrength: 0,
    rejectionLong: false, rejectionShort: false,
  };
  if (closes.length < 15) return empty;

  const DEPTH = 5; // fractal de 5 barras (mais seletivo)
  const lookback = Math.min(150, closes.length);
  const h = highs.slice(-lookback);
  const l = lows.slice(-lookback);
  const price = closes[closes.length - 1];
  const atr = calcATR(highs.slice(-20), lows.slice(-20), closes.slice(-20), 14) || price * 0.001;

  const clusterTol   = atr * 1.5;
  const proximityTol = atr * 2.0;

  // Swing highs (resistência) — fractal DEPTH barras
  const swingHighs: number[] = [];
  for (let i = DEPTH; i < h.length - DEPTH; i++) {
    let ok = true;
    for (let j = 1; j <= DEPTH && ok; j++) {
      if (h[i - j] >= h[i] || h[i + j] >= h[i]) ok = false;
    }
    if (ok) swingHighs.push(h[i]);
  }

  // Swing lows (suporte) — fractal DEPTH barras
  const swingLows: number[] = [];
  for (let i = DEPTH; i < l.length - DEPTH; i++) {
    let ok = true;
    for (let j = 1; j <= DEPTH && ok; j++) {
      if (l[i - j] <= l[i] || l[i + j] <= l[i]) ok = false;
    }
    if (ok) swingLows.push(l[i]);
  }

  // Agrupa swing lows em clusters de suporte
  const supClusters: { level: number; count: number }[] = [];
  for (const sl of swingLows) {
    const hit = supClusters.find(c => Math.abs(c.level - sl) <= clusterTol);
    if (hit) { hit.count++; hit.level = (hit.level * (hit.count - 1) + sl) / hit.count; }
    else supClusters.push({ level: sl, count: 1 });
  }

  // Agrupa swing highs em clusters de resistência
  const resClusters: { level: number; count: number }[] = [];
  for (const sh of swingHighs) {
    const hit = resClusters.find(c => Math.abs(c.level - sh) <= clusterTol);
    if (hit) { hit.count++; hit.level = (hit.level * (hit.count - 1) + sh) / hit.count; }
    else resClusters.push({ level: sh, count: 1 });
  }

  // Contagem REAL de toques: todos os candles que visitam a zona (não só swings)
  for (const c of supClusters) {
    let touches = 0;
    const lo = c.level - clusterTol;
    const hi = c.level + clusterTol;
    for (let i = 0; i < l.length; i++) {
      if (l[i] >= lo && l[i] <= hi) touches++;
    }
    c.count = Math.max(c.count, touches); // usa o maior valor
  }
  for (const c of resClusters) {
    let touches = 0;
    const lo = c.level - clusterTol;
    const hi = c.level + clusterTol;
    for (let i = 0; i < h.length; i++) {
      if (h[i] >= lo && h[i] <= hi) touches++;
    }
    c.count = Math.max(c.count, touches);
  }

  // Zona mais próxima alinhada ao preço atual
  const nearestSup = supClusters
    .filter(c => price >= c.level - proximityTol && price <= c.level + proximityTol)
    .sort((a, b) => b.count - a.count)[0];

  const nearestRes = resClusters
    .filter(c => price >= c.level - proximityTol && price <= c.level + proximityTol)
    .sort((a, b) => b.count - a.count)[0];

  // Detecção de wick de rejeição na última vela
  const lastH = highs[highs.length - 1];
  const lastL = lows[lows.length - 1];
  const lastC = closes[closes.length - 1];
  const lastO = opens ? opens[opens.length - 1] : lastC;
  const bodySize = Math.abs(lastC - lastO) || atr * 0.1;
  const lowerWick = Math.min(lastO, lastC) - lastL;
  const upperWick = lastH - Math.max(lastO, lastC);
  const rejectionLong  = lowerWick > bodySize * 1.5; // wick longa inferior → bullish rejection
  const rejectionShort = upperWick > bodySize * 1.5; // wick longa superior → bearish rejection

  return {
    nearSupport:        nearestSup !== undefined,
    nearResistance:     nearestRes !== undefined,
    supportStrength:    nearestSup?.count ?? 0,
    resistanceStrength: nearestRes?.count ?? 0,
    rejectionLong,
    rejectionShort,
  };
}

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

function calcMACDMomentum(closes: number[]): 'growing' | 'shrinking' {
  if (closes.length < 36) return 'growing';
  const curr = calcMACD(closes).hist;
  const prev = calcMACD(closes.slice(0, -1)).hist;
  return Math.abs(curr) > Math.abs(prev) ? 'growing' : 'shrinking';
}

export function detectMarketRegime(highs: number[], lows: number[], closes: number[]): MarketRegime {
  if (closes.length < 20) return 'RANGING';
  const adx = calcADX(highs, lows, closes, 14);
  const atr = calcATR(highs, lows, closes, 14);
  const lastClose = closes[closes.length - 1];
  const atrPct = lastClose > 0 ? (atr / lastClose) * 100 : 0;
  const bb = calcBollinger(closes, 20);
  const bbWidth = bb.mean > 0 ? (bb.upper - bb.lower) / bb.mean : 0;
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

// ─── ORNSTEIN-UHLENBECK FOREX/COMMODITY SIMULATOR ─────────────────────────

export function generateOUCandle(lastPrice: number, asset: string): Candle {
  const mu    = BASE_PRICES[asset] || lastPrice;
  const theta = 0.05;
  const sigma = PAIR_VOL[asset] || 0.0003;
  const dt    = 1 / 1440;
  const drift = theta * (mu - lastPrice) * dt;

  // Box-Muller correto — padrão da indústria, sem sin/cos de timestamp
  let u1: number;
  do { u1 = Math.random(); } while (u1 === 0); // evita log(0)
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

// ─── MAIN ENGINE ───────────────────────────────────────────────────────────

export function runEngine(m1: Candle[], asset: string, pairWR?: number, lunaMode = false): SignalResult | null {
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
  const emaBull   = lastEma9 > lastEma21 && lastEma21 > lastEma50;
  const emaBear   = lastEma9 < lastEma21 && lastEma21 < lastEma50;

  // ── Direção baseada na zona tocada ────────────────────────────────────
  let direction: 'CALL' | 'PUT';
  if (srBounce.nearSupport && !srBounce.nearResistance) direction = 'CALL';
  else if (srBounce.nearResistance && !srBounce.nearSupport) direction = 'PUT';
  else direction = (srBounce.rejectionLong || candle.direction > 0) ? 'CALL' : 'PUT';

  // ── Candle score (0–30 pts) ───────────────────────────────────────────
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

  // ── S/R Zone strength (0–40 pts) ─────────────────────────────────────
  const zoneStrength = direction === 'CALL' ? srBounce.supportStrength : srBounce.resistanceStrength;
  let srScore = 0;
  if      (zoneStrength >= 7) srScore = 40;
  else if (zoneStrength >= 5) srScore = 35;
  else if (zoneStrength >= 3) srScore = 28;
  else if (zoneStrength >= 2) srScore = 20;
  else                         srScore = 12;

  // ── EMA alignment (0–20 pts) ─────────────────────────────────────────
  let emaScore = 0;
  if (direction === 'CALL') {
    if (emaBull) emaScore = 20; else if (lastEma9 > lastEma21) emaScore = 12; else emaScore = 4;
  } else {
    if (emaBear) emaScore = 20; else if (lastEma9 < lastEma21) emaScore = 12; else emaScore = 4;
  }

  // ── HTF M5 + M15 (0–10 pts) ──────────────────────────────────────────
  let htfScore = 0;
  if (direction === 'CALL') {
    if (htfBull && m15Bull) htfScore = 10; else if (htfBull) htfScore = 7; else if (m15Bull) htfScore = 4;
  } else {
    if (!htfBull && !m15Bull) htfScore = 10; else if (!htfBull) htfScore = 7; else if (!m15Bull) htfScore = 4;
  }

  // ── RSI bonus (0–8 pts) ───────────────────────────────────────────────
  let rsiBonus = 0;
  if (direction === 'CALL') {
    if (rsi < 30) rsiBonus = 8; else if (rsi < 40) rsiBonus = 4; else if (rsi < 50) rsiBonus = 2;
  } else {
    if (rsi > 70) rsiBonus = 8; else if (rsi > 60) rsiBonus = 4; else if (rsi > 50) rsiBonus = 2;
  }

  // ── Score (normalizado, max 108 pts) ─────────────────────────────────
  let rawScore = (srScore + candleScore + emaScore + htfScore + rsiBonus) / 108;
  // FIX-5: floor honesto 0.25 (era 0.40 — score alto em sinal ruim é enganoso)
  rawScore = Math.min(0.97, Math.max(0.25, rawScore + getPairSessionBonus(sess, category, asset) * 0.20));
  if (adx >= 30)      rawScore = Math.min(0.97, rawScore + 0.03);
  else if (adx >= 25) rawScore = Math.min(0.97, rawScore + 0.015);
  if (marketRegime === 'TRENDING') rawScore = Math.min(0.97, rawScore + 0.04);
  const htfAgrees = direction === 'CALL' ? htfBull : !htfBull;
  const m15Agrees = direction === 'CALL' ? m15Bull : !m15Bull;
  if (htfAgrees && m15Agrees) rawScore = Math.min(0.97, rawScore + 0.03);
  if (pairWR !== undefined && pairWR < 0.40) rawScore = Math.max(0.25, rawScore - 0.05);

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

  const score = Math.round(rawScore * 100);

  // ASSERT-3: thresholds calibrados (ligeiramente mais conservadores)
  let quality: SignalResult['quality'] = 'EVITAR';
  if      (score >= 90) quality = 'ULTRA';
  else if (score >= 82) quality = 'ELITE';
  else if (score >= 74) quality = 'PREMIUM';
  else if (score >= 66) quality = 'FORTE';
  else if (score >= 58) quality = 'MÉDIO';
  else if (score >= 50) quality = 'FRACO';

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

  // ── EMA50 Trend Gate (gate primário — fix para sinais contra tendência) ──
  // O bug: emaBull/emaBear só disparam com stack PERFEITO (ema9>ema21>ema50).
  // Em pullbacks (ema9 cruzou ema21 mas ema21 ainda acima de ema50),
  // nem emaBull nem emaBear é true → PUT passa sem bloqueio acima da EMA50.
  // Fix: EMA50 + EMA21 definem a tendência macro — independente da EMA9.
  const ema50BullTrend = lastEma21 > lastEma50 && lastClose > lastEma50;
  const ema50BearTrend = lastEma21 < lastEma50 && lastClose < lastEma50;
  // Exceção: zonas S/R muito fortes (5+ toques) com wick de rejeição
  // podem sinalizar reversão legítima mesmo contra EMA50 trend
  const strongReversalZone = zoneStrength >= 5 &&
    ((direction === 'PUT' && srBounce.rejectionShort) ||
     (direction === 'CALL' && srBounce.rejectionLong));

  // ── HTF hard gate: M5 + M15 devem confirmar a direção ───────────────────
  // Se AMBOS M5 e M15 são bullish → PUT bloqueado (bounce em andamento)
  // Se AMBOS M5 e M15 são bearish → CALL bloqueado (queda em andamento)
  // Exceção: strongReversalZone (zona de 5+ toques com wick de rejeição)
  const htfStrongBull = htfBull && m15Bull;
  const htfStrongBear = !htfBull && !m15Bull;

  const mins = new Date().getMinutes();
  let blockedBy: string | null = null;

  if (mins === 59 || mins === 0)
    blockedBy = 'Horário morto (min :00 ou :59)';
  else if (!srBounce.nearSupport && !srBounce.nearResistance)
    blockedBy = 'Fora de zona S/R — aguardando toque';
  else if (candleScore === 0)
    blockedBy = `Sem padrão de reversão em ${direction === 'CALL' ? 'suporte' : 'resistência'} (${candle.pattern})`;
  // ── HTF gate (M5+M15 confirmação obrigatória) ────────────────────────────
  else if (direction === 'PUT' && htfStrongBull && !strongReversalZone)
    blockedBy = 'HTF Alta (M5+M15 bullish) — PUT bloqueado contra tendência superior';
  else if (direction === 'CALL' && htfStrongBear && !strongReversalZone)
    blockedBy = 'HTF Baixa (M5+M15 bearish) — CALL bloqueado contra tendência superior';
  // ── EMA50 gate (verificado ANTES do stack perfeito) ──────────────────────
  else if (direction === 'PUT' && ema50BullTrend && !strongReversalZone)
    blockedBy = `EMA50 Trend Alta — PUT bloqueado (preço ${lastClose > lastEma50 ? 'acima' : ''} EMA50, EMA21>EMA50)`;
  else if (direction === 'CALL' && ema50BearTrend && !strongReversalZone)
    blockedBy = `EMA50 Trend Baixa — CALL bloqueado (preço ${lastClose < lastEma50 ? 'abaixo' : ''} EMA50, EMA21<EMA50)`;
  // ── Stack perfeito (ema9/21/50 totalmente alinhadas) ─────────────────────
  else if (direction === 'CALL' && emaBear)
    blockedBy = 'EMA Bear Stack — contra tendência de baixa';
  else if (direction === 'PUT' && emaBull)
    blockedBy = 'EMA Bull Stack — contra tendência de alta';
  else if (adx < 15)
    blockedBy = `ADX ${Math.round(adx)} < 15 — mercado sem força`;
  else if (atrPct < 0.0003)
    blockedBy = 'Mercado morto — ATR < 3 bps';
  else if (atrPct > 0.025)
    blockedBy = `Mercado caótico — ATR ${Math.round(atrPct * 10000)} bps`;
  else if (direction === 'CALL' && rsi > 75)
    blockedBy = `RSI ${Math.round(rsi)} sobrecomprado — CALL bloqueado`;
  else if (direction === 'PUT' && rsi < 25)
    blockedBy = `RSI ${Math.round(rsi)} sobrevendido — PUT bloqueado`;
  // FIX-3: Gate de entropia — mercado aleatório/ruidoso
  else if (entropy > 0.88)
    blockedBy = `Entropia ${Math.round(entropy * 100)}% — mercado aleatório`;
  // ASSERT-1: Gate de OBV — sem confirmação de volume
  else if (direction === 'CALL' && obvTrend === 'down')
    blockedBy = 'OBV descendente — pressão vendedora apesar do sinal de compra';
  else if (direction === 'PUT' && obvTrend === 'up')
    blockedBy = 'OBV ascendente — pressão compradora apesar do sinal de venda';
  else if (marketRegime === 'CHOPPY')
    blockedBy = 'Regime CHOPPY — sem sinal';
  else if (quality === 'EVITAR')
    blockedBy = `Score ${score}% — zona fraca (${zoneStrength} toques) ou candle fraco (${candle.pattern})`;
  else if (lunaMode && zoneStrength < 3)
    blockedBy = `Luna Mode: zona com ${zoneStrength} toques (mínimo 3)`;
  else if (lunaMode && direction === 'CALL' && !srBounce.rejectionLong)
    blockedBy = 'Luna Mode: sem wick de rejeição bullish';
  else if (lunaMode && direction === 'PUT' && !srBounce.rejectionShort)
    blockedBy = 'Luna Mode: sem wick de rejeição bearish';

  return {
    direction, score, quality, marketRegime,
    adx: Math.round(adx), rsi: Math.round(rsi),
    entropy: Math.round(entropy * 100) / 100, consensus: Math.round(zoneStrength),
    confirmed: candleScore > 0 ? 1 : 0,
    blockedBy, mmTrap: false, mmTrapType: '',
    sess, votes, asset, category,
    ts: Date.now(), passed: blockedBy === null,
  };
}

