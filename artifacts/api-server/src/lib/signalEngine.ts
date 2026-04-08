// Backend Signal Engine — Node.js adaptation of the frontend signalEngine.ts
// All pure math + runEngine (adapted: no localStorage, no browser APIs)

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
  // Forex
  EURUSD: 1.085, GBPUSD: 1.265, USDJPY: 149.0, AUDUSD: 0.653,
  USDCAD: 1.365, NZDUSD: 0.608, EURGBP: 0.858, GBPJPY: 188.0,
  // Commodities
  XAUUSD: 3200.0, XAGUSD: 32.0, USOIL: 62.0,
  // Crypto (approximate April 2026 prices)
  BTCUSD: 72000, ETHUSD: 1600, SOLUSD: 130, BNBUSD: 580,
  XRPUSD: 2.1, ADAUSD: 0.65, DOGEUSD: 0.16, LTCUSD: 90,
};

export const PAIR_VOL: Record<string, number> = {
  EURUSD: 0.0003, GBPUSD: 0.0005, USDJPY: 0.03, AUDUSD: 0.0004,
  USDCAD: 0.0004, NZDUSD: 0.0004, EURGBP: 0.0002, GBPJPY: 0.05,
  XAUUSD: 8.0, XAGUSD: 0.08, USOIL: 0.25,
  // Crypto — calibrated so sigma*sqrt(1/1440)*100 ≈ 0.1-0.2% of base price per M1 candle
  BTCUSD: 27, ETHUSD: 0.9, SOLUSD: 0.1, BNBUSD: 0.33,
  XRPUSD: 0.0016, ADAUSD: 0.0005, DOGEUSD: 0.00012, LTCUSD: 0.051,
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
}

export const BASE_WEIGHTS: Record<string, number> = {
  ema: 0.20, htf: 0.15, m15: 0.12,
  rsi: 0.13, rsidiv: 0.14, macd: 0.13,
  bb: 0.09, bsq: 0.10, stoch: 0.09,
  sr: 0.12, candle: 0.09,
  volume: 0.07, obv: 0.07
};

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

function detectBBSqueeze(closes: number[]): { squeeze: boolean; breakout: 'up' | 'down' | null } {
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

function detectSRBounce(highs: number[], lows: number[], closes: number[]): { nearSupport: boolean; nearResistance: boolean } {
  if (closes.length < 20) return { nearSupport: false, nearResistance: false };
  const lookback = Math.min(50, closes.length - 3);
  const h = highs.slice(-lookback, -3);
  const l = lows.slice(-lookback, -3);
  const price = closes[closes.length - 1];
  const atr = calcATR(highs.slice(-20), lows.slice(-20), closes.slice(-20), 14);
  const tol = atr * 1.8;
  const swingHighs: number[] = [];
  const swingLows: number[] = [];
  for (let i = 1; i < h.length - 1; i++) {
    if (h[i] > h[i - 1] && h[i] > h[i + 1]) swingHighs.push(h[i]);
    if (l[i] < l[i - 1] && l[i] < l[i + 1]) swingLows.push(l[i]);
  }
  return {
    nearSupport: swingLows.some(sl => Math.abs(price - sl) <= tol && price >= sl - tol),
    nearResistance: swingHighs.some(sh => Math.abs(price - sh) <= tol && price <= sh + tol)
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
  const mu = BASE_PRICES[asset] || lastPrice;
  const theta = 0.05;
  const sigma = PAIR_VOL[asset] || 0.0003;
  const dt = 1 / 1440;
  const drift = theta * (mu - lastPrice) * dt;
  const seed = Date.now() % 1000000;
  const r1 = Math.abs(Math.sin(seed * 9301 + 49297) % 1);
  const r2 = Math.abs(Math.sin(seed * 49297 + 233) % 1);
  const normal = Math.sqrt(-2 * Math.log(r1 + 0.0001)) * Math.cos(2 * Math.PI * r2);
  const close = lastPrice + drift + sigma * normal * Math.sqrt(dt) * 100;
  const range = sigma * (0.8 + Math.abs(normal) * 0.5);
  const open = lastPrice;
  const high = Math.max(open, close) + range * 0.3;
  const low = Math.min(open, close) - range * 0.3;
  return { o: open, h: high, l: low, c: close, v: 1000 + Math.abs(normal) * 500, t: Date.now() };
}

// ─── MAIN ENGINE ───────────────────────────────────────────────────────────

export function runEngine(m1: Candle[], asset: string, pairWR?: number): SignalResult | null {
  if (m1.length < 30) return null;

  const closes = m1.map(c => c.c);
  const highs = m1.map(c => c.h);
  const lows = m1.map(c => c.l);
  const volumes = m1.map(c => c.v);
  const category = ASSET_CATEGORIES[asset] || 'forex';
  const sess = getCurrentSession();

  const ema9 = calcEMA(closes, 9);
  const ema21 = calcEMA(closes, 21);
  const ema50 = calcEMA(closes, 50);
  const rsi = calcRSI(closes, 14);
  const macd = calcMACD(closes);
  const bb = calcBollinger(closes, 20);
  const stoch = calcStoch(highs, lows, closes, 14);
  const adx = calcADX(highs, lows, closes, 14);
  const atr = calcATR(highs, lows, closes, 14);
  const candle = detectCandlePattern(m1);
  const entropy = calcEntropy(m1.slice(-20));
  const marketRegime = detectMarketRegime(highs, lows, closes);

  const m5closes = deriveM5(m1).map(c => c.c);
  const m5ema9 = calcEMA(m5closes, 9);
  const m5ema21 = calcEMA(m5closes, 21);
  const htfBull = m5ema9.length > 0 && m5ema21.length > 0 &&
    m5ema9[m5ema9.length - 1] > m5ema21[m5ema21.length - 1];

  const m15closes = deriveM15(m1).map(c => c.c);
  const m15ema9 = calcEMA(m15closes, 9);
  const m15ema21 = calcEMA(m15closes, 21);
  const m15Bull = m15ema9.length > 0 && m15ema21.length > 0 &&
    m15ema9[m15ema9.length - 1] > m15ema21[m15ema21.length - 1];

  const lastClose = closes[closes.length - 1];
  const lastEma9 = ema9[ema9.length - 1] ?? lastClose;
  const lastEma21 = ema21[ema21.length - 1] ?? lastClose;
  const lastEma50 = ema50[ema50.length - 1] ?? lastClose;

  const rsidiv = detectRSIDivergence(closes, highs, lows);
  const obvTrend = calcOBVTrend(closes, volumes, 12);
  const bbSqueeze = detectBBSqueeze(closes);
  const srBounce = detectSRBounce(highs, lows, closes);
  const emaRetest = detectEMARetest(closes, ema21, htfBull ? 'CALL' : 'PUT');
  const macdMomentum = calcMACDMomentum(closes);

  const mmTrapCandles = m1;
  const mmHighs = mmTrapCandles.map(c => c.h);
  const mmLows = mmTrapCandles.map(c => c.l);
  const mmVols = mmTrapCandles.map(c => c.v);
  let mmTrap = false;
  let mmTrapType = '';
  if (mmTrapCandles.length >= 10) {
    const resistance = Math.max(...mmHighs.slice(-50, -3));
    const support = Math.min(...mmLows.slice(-50, -3));
    const last = mmTrapCandles[mmTrapCandles.length - 1];
    const prev = mmTrapCandles[mmTrapCandles.length - 2];
    const avgVol = mmVols.slice(-20, -1).reduce((a, b) => a + b, 0) / 19;
    const lastVol = mmVols[mmVols.length - 1];
    const bullTrap = prev.h > resistance * 1.001 && last.c < resistance && last.c < prev.o && lastVol > avgVol * 1.5;
    const bearTrap = prev.l < support * 0.999 && last.c > support && last.c > prev.o && lastVol > avgVol * 1.5;
    if (bullTrap) { mmTrap = true; mmTrapType = 'BULL_TRAP'; }
    if (bearTrap) { mmTrap = true; mmTrapType = 'BEAR_TRAP'; }
  }

  const votes: Record<string, string> = {};
  const emaBull = lastEma9 > lastEma21 && lastEma21 > lastEma50 && lastClose > lastEma9;
  const emaBear = lastEma9 < lastEma21 && lastEma21 < lastEma50 && lastClose < lastEma9;
  votes.ema = emaBull ? 'CALL' : emaBear ? 'PUT' : 'NEUTRAL';
  votes.htf = m5closes.length >= 9 ? (htfBull ? 'CALL' : 'PUT') : 'NEUTRAL';
  votes.m15 = m15closes.length >= 9 ? (m15Bull ? 'CALL' : 'PUT') : 'NEUTRAL';
  votes.rsi = rsi < 35 ? 'CALL' : rsi > 65 ? 'PUT' : rsi < 40 ? 'CALL' : rsi > 60 ? 'PUT' : 'NEUTRAL';
  votes.rsidiv = rsidiv === 'bullish' ? 'CALL' : rsidiv === 'bearish' ? 'PUT' : 'NEUTRAL';
  votes.macd = macd.hist > 0 ? 'CALL' : 'PUT';
  votes.bb = bb.pct < 0.2 ? 'CALL' : bb.pct > 0.8 ? 'PUT' : 'NEUTRAL';
  votes.bsq = bbSqueeze.squeeze && bbSqueeze.breakout === 'up' ? 'CALL'
            : bbSqueeze.squeeze && bbSqueeze.breakout === 'down' ? 'PUT' : 'NEUTRAL';
  votes.stoch = stoch < 25 ? 'CALL' : stoch > 75 ? 'PUT' : 'NEUTRAL';
  votes.sr = srBounce.nearSupport ? 'CALL' : srBounce.nearResistance ? 'PUT' : 'NEUTRAL';
  votes.candle = candle.direction > 0 ? 'CALL' : candle.direction < 0 ? 'PUT' : 'NEUTRAL';
  const avgVol = volumes.slice(-20, -1).reduce((a, b) => a + b, 0) / 19 || 1;
  votes.volume = volumes[volumes.length - 1] > avgVol * 1.2
    ? (lastClose > closes[closes.length - 2] ? 'CALL' : 'PUT') : 'NEUTRAL';
  votes.obv = obvTrend === 'up' ? 'CALL' : obvTrend === 'down' ? 'PUT' : 'NEUTRAL';

  const mlWeights = { ...BASE_WEIGHTS };

  const callVotes = Object.entries(votes).filter(([, v]) => v === 'CALL');
  const putVotes = Object.entries(votes).filter(([, v]) => v === 'PUT');
  const callScore = callVotes.reduce((s, [k]) => s + (mlWeights[k] || 0), 0);
  const putScore = putVotes.reduce((s, [k]) => s + (mlWeights[k] || 0), 0);
  const total = callScore + putScore || 1;
  const direction: 'CALL' | 'PUT' = callScore >= putScore ? 'CALL' : 'PUT';
  let rawScore = Math.max(callScore, putScore) / total;

  // ── 3-Factor Confluence: Trend + RSI + Volume/PA ──────────────────────
  const confluenceTrend  = votes.ema === direction;
  const confluenceRSI    = votes.rsi === direction;
  const confluenceVolume = votes.volume === direction || votes.obv === direction;
  const confluenceFactors = [confluenceTrend, confluenceRSI, confluenceVolume].filter(Boolean).length;

  rawScore = Math.min(0.95, Math.max(0.35, rawScore + getPairSessionBonus(sess, category, asset)));
  if (adx >= 30) rawScore = Math.min(0.95, rawScore + 0.05);
  else if (adx >= 25) rawScore = Math.min(0.95, rawScore + 0.03);
  else if (adx < 18) rawScore = Math.max(0.35, rawScore - 0.06);
  if (rsi > 82 || rsi < 18) rawScore = Math.max(0.35, rawScore - 0.07);
  if (rsidiv !== null) rawScore = Math.min(0.95, rawScore + 0.08);
  if (bbSqueeze.squeeze) rawScore = Math.min(0.95, rawScore + 0.06);
  if (srBounce.nearSupport || srBounce.nearResistance) rawScore = Math.min(0.95, rawScore + 0.05);
  if (emaRetest) rawScore = Math.min(0.95, rawScore + 0.05);
  if (macdMomentum === 'growing') rawScore = Math.min(0.95, rawScore + 0.02);
  if (entropy > 0.72) rawScore = Math.max(0.35, rawScore - 0.06);
  if (entropy > 0.82) rawScore = Math.max(0.35, rawScore - 0.12);

  // ── ATR Volatility Filter: 0.03%–1.2% of price ───────────────────────
  const atrPct = lastClose > 0 ? atr / lastClose : 0;
  if (atrPct < 0.0003) rawScore = Math.max(0.35, rawScore - 0.10);      // mercado morto
  else if (atrPct > 0.012) rawScore = Math.max(0.35, rawScore - 0.08);  // mercado caótico
  else if (category === 'crypto' && atrPct > 0.02) rawScore = Math.max(0.35, rawScore - 0.05);

  // ── Confluence bonus/penalty ──────────────────────────────────────────
  if (confluenceFactors >= 3) rawScore = Math.min(0.95, rawScore + 0.06);
  else if (confluenceFactors <= 1) rawScore = Math.max(0.35, rawScore - 0.05);

  // ── Market Regime Detector (Solução 2) ───────────────────────────────
  if (marketRegime === 'RANGING')  rawScore = Math.max(0.35, rawScore - 0.08);
  if (marketRegime === 'TRENDING') rawScore = Math.min(0.95, rawScore + 0.06);

  // ── Multi-Timeframe Confluence Gate (Solução 1) ───────────────────────
  const tfDisagreeCount = [votes.ema, votes.htf, votes.m15]
    .filter(v => v !== 'NEUTRAL' && v !== direction).length;
  const tfAgreeCount = [votes.ema, votes.htf, votes.m15]
    .filter(v => v === direction).length;
  if (tfAgreeCount === 3) rawScore = Math.min(0.95, rawScore + 0.07);
  else if (tfAgreeCount === 2) rawScore = Math.min(0.95, rawScore + 0.03);
  else if (tfDisagreeCount === 3) rawScore = Math.max(0.35, rawScore - 0.16);

  // ── Adaptive Performance Memory (Solução 3) ───────────────────────────
  // pairWR is passed by the orchestrator (backendSignalEngine) from in-memory Map
  if (pairWR !== undefined) {
    const wrBonus = (pairWR - 0.65) * 0.7;
    rawScore = Math.min(0.95, Math.max(0.35, rawScore + wrBonus));
  }

  const score = Math.round(rawScore * 100);

  let quality: SignalResult['quality'] = 'EVITAR';
  if (score >= 94) quality = 'ULTRA';
  else if (score >= 88) quality = 'ELITE';
  else if (score >= 83) quality = 'PREMIUM';
  else if (score >= 74) quality = 'FORTE';
  else if (score >= 68) quality = 'MÉDIO';
  else if (score >= 62) quality = 'FRACO';

  const variations = [
    {},
    { ema: 0.08, rsidiv: -0.05, macd: -0.03, m15: 0.05 },
    { rsidiv: 0.10, stoch: 0.05, ema: -0.10, sr: 0.05 },
    { volume: 0.10, obv: 0.08, bsq: 0.08, candle: -0.15 },
    { rsidiv: -0.08, macd: -0.08, candle: 0.15, sr: 0.10 }
  ];
  let consensusCount = 0;
  for (const v of variations) {
    const w: Record<string, number> = { ...mlWeights };
    for (const [k, d] of Object.entries(v)) {
      if (w[k] !== undefined) w[k] = Math.max(0.01, w[k] + d);
    }
    const t = Object.values(w).reduce((a, b) => a + b, 0);
    Object.keys(w).forEach(k => (w[k] /= t));
    const cs = callVotes.reduce((s, [k]) => s + (w[k] || 0), 0);
    const ps = putVotes.reduce((s, [k]) => s + (w[k] || 0), 0);
    if ((direction === 'CALL' ? cs >= ps : ps > cs)) consensusCount++;
  }

  const mainCriteria = ['ema', 'htf', 'm15', 'rsi', 'macd', 'rsidiv'];
  const confirmed = mainCriteria.filter(k => votes[k] === direction).length;
  const mins = new Date().getMinutes();

  let blockedBy: string | null = null;
  if (mins === 59 || mins === 0) blockedBy = 'Horário morto (min :00 ou :59)';
  else if (adx < 18) blockedBy = `ADX fraco (${Math.round(adx)} < 18) — mercado lateral`;
  else if (atrPct < 0.0003) blockedBy = `Mercado morto — ATR ${(atrPct * 10000).toFixed(1)} bps (< 3 bps)`;
  else if (atrPct > 0.012) blockedBy = `Mercado caótico — ATR ${Math.round(atrPct * 10000)} bps (> 120 bps)`;
  else if (marketRegime === 'CHOPPY') blockedBy = `Regime CHOPPY — mercado sem direcionalidade`;
  else if (tfDisagreeCount === 3) blockedBy = `Conflito MTF total — todos os 3 timeframes contra a direção`;
  else if (entropy > 0.82) blockedBy = `Entropia muito alta (${Math.round(entropy * 100)}%) — mercado completamente aleatório`;
  else if (confluenceFactors < 2) blockedBy = `Confluência insuficiente (${confluenceFactors}/3 fatores: tendência, RSI, volume)`;
  else if (confirmed < 3) blockedBy = `Poucos confirmadores (${confirmed}/6 critérios principais)`;
  else if (consensusCount < 4) blockedBy = `Consenso insuficiente (${consensusCount}/5 universos)`;
  else if (quality === 'EVITAR') blockedBy = `Score muito baixo (${score}%) — sinal EVITAR`;

  return {
    direction, score, quality, marketRegime,
    adx: Math.round(adx), rsi: Math.round(rsi),
    entropy: Math.round(entropy * 100),
    consensus: consensusCount, confirmed,
    blockedBy,
    mmTrap, mmTrapType,
    sess, votes,
    asset, category,
    ts: Date.now(),
    passed: blockedBy === null,
  };
}
