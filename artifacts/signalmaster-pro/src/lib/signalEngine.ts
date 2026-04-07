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
  XAUUSD: 2350.0, XAGUSD: 27.5, USOIL: 78.0
};

export const PAIR_VOL: Record<string, number> = {
  EURUSD: 0.0003, GBPUSD: 0.0005, USDJPY: 0.03, AUDUSD: 0.0004,
  USDCAD: 0.0004, NZDUSD: 0.0004, EURGBP: 0.0002, GBPJPY: 0.05,
  XAUUSD: 0.8, XAGUSD: 0.015, USOIL: 0.15
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

export interface SignalResult {
  direction: 'CALL' | 'PUT';
  score: number;
  quality: 'EVITAR' | 'FRACO' | 'MÉDIO' | 'FORTE' | 'PREMIUM';
  adx: number;
  rsi: number;
  entropy: number;
  dnaMatch: number;
  consensus: number;
  mmTrap: boolean;
  mmTrapType: string;
  sess: string;
  votes: Record<string, string>;
  blocked?: string;
  asset: string;
  category: string;
  fingerprint: FingerprintPoint[];
  ts: number;
}

export interface FingerprintPoint {
  bodyRatio: number;
  direction: number;
  upperShadow: number;
  lowerShadow: number;
}

export const BASE_WEIGHTS: Record<string, number> = {
  ema: 0.22, htf: 0.20, rsi: 0.18, macd: 0.18,
  bb: 0.10, stoch: 0.10, candle: 0.10, volume: 0.08, obv: 0.08
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

function getSessionBonus(sess: string, category: string): number {
  if (category === 'crypto') {
    if (sess === 'overlap') return 0.20;
    if (sess === 'ny') return 0.15;
    if (sess === 'london') return 0.08;
    if (sess === 'asia') return -0.12;
    return -0.05;
  }
  if (sess === 'overlap') return 0.20;
  if (sess === 'ny') return 0.15;
  if (sess === 'london') return 0.12;
  if (sess === 'asia') return -0.08;
  return -0.05;
}

// ─── MAIN ENGINE ───────────────────────────────────────────────────────────

export function runEngine(buf: CandleBuffer, asset: string): SignalResult | null {
  const m1 = buf.m1;
  if (m1.length < 30) return null;

  const closes = m1.map(c => c.c);
  const highs = m1.map(c => c.h);
  const lows = m1.map(c => c.l);
  const volumes = m1.map(c => c.v);
  const category = ASSET_CATEGORIES[asset] || 'forex';
  const sess = getCurrentSession();

  // — Indicators —
  const ema9 = calcEMA(closes, 9);
  const ema21 = calcEMA(closes, 21);
  const ema50 = calcEMA(closes, 50);
  const rsi = calcRSI(closes, 14);
  const macd = calcMACD(closes);
  const bb = calcBollinger(closes, 20);
  const stoch = calcStoch(highs, lows, closes, 14);
  const adx = calcADX(highs, lows, closes, 14);
  const atr = calcATR(highs, lows, closes, 14);
  const obv = calcOBV(closes, volumes);
  const candle = detectCandlePattern(m1);
  const entropy = calcEntropy(m1.slice(-20));

  // HTF (M5)
  const m5closes = deriveM5(m1).map(c => c.c);
  const m5ema9 = calcEMA(m5closes, 9);
  const m5ema21 = calcEMA(m5closes, 21);
  const htfBull = m5ema9.length > 0 && m5ema21.length > 0 &&
    m5ema9[m5ema9.length - 1] > m5ema21[m5ema21.length - 1];

  const lastClose = closes[closes.length - 1];
  const lastEma9 = ema9[ema9.length - 1] ?? lastClose;
  const lastEma21 = ema21[ema21.length - 1] ?? lastClose;
  const lastEma50 = ema50[ema50.length - 1] ?? lastClose;

  // — Votes (each +1 = CALL, -1 = PUT) —
  const votes: Record<string, string> = {};

  // EMA trend
  const emaBull = lastEma9 > lastEma21 && lastEma21 > lastEma50 && lastClose > lastEma9;
  const emaBear = lastEma9 < lastEma21 && lastEma21 < lastEma50 && lastClose < lastEma9;
  votes.ema = emaBull ? 'CALL' : emaBear ? 'PUT' : 'NEUTRAL';

  // HTF
  votes.htf = htfBull ? 'CALL' : 'PUT';

  // RSI
  votes.rsi = rsi < 35 ? 'CALL' : rsi > 65 ? 'PUT' : rsi < 50 ? 'CALL' : 'PUT';

  // MACD
  votes.macd = macd.hist > 0 ? 'CALL' : 'PUT';

  // Bollinger
  votes.bb = bb.pct < 0.2 ? 'CALL' : bb.pct > 0.8 ? 'PUT' : 'NEUTRAL';

  // Stochastic
  votes.stoch = stoch < 25 ? 'CALL' : stoch > 75 ? 'PUT' : 'NEUTRAL';

  // Candle pattern
  votes.candle = candle.direction > 0 ? 'CALL' : candle.direction < 0 ? 'PUT' : 'NEUTRAL';

  // Volume
  const avgVol = volumes.slice(-20, -1).reduce((a, b) => a + b, 0) / 19 || 1;
  const lastVol = volumes[volumes.length - 1];
  votes.volume = lastVol > avgVol * 1.2 ? (lastClose > closes[closes.length - 2] ? 'CALL' : 'PUT') : 'NEUTRAL';

  // OBV trend (compare to EMA of OBV approximation)
  const obvDir = obv > 0 ? 'CALL' : 'PUT';
  votes.obv = obvDir;

  // — Weighted score —
  let mlWeights = { ...BASE_WEIGHTS };
  try {
    const ml = JSON.parse(localStorage.getItem('smpML7') || '{}');
    const ctx = `${sess}_${category}`;
    if (ml[ctx]) mlWeights = { ...BASE_WEIGHTS, ...ml[ctx] };
  } catch {}

  const callVotes = Object.entries(votes).filter(([, v]) => v === 'CALL');
  const putVotes = Object.entries(votes).filter(([, v]) => v === 'PUT');

  const callScore = callVotes.reduce((s, [k]) => s + (mlWeights[k] || 0), 0);
  const putScore = putVotes.reduce((s, [k]) => s + (mlWeights[k] || 0), 0);
  const total = callScore + putScore || 1;
  const direction: 'CALL' | 'PUT' = callScore >= putScore ? 'CALL' : 'PUT';
  let rawScore = Math.max(callScore, putScore) / total;

  // Session bonus
  rawScore = Math.min(0.95, Math.max(0.35, rawScore + getSessionBonus(sess, category)));

  // ADX bonus
  if (adx >= 25) rawScore = Math.min(0.95, rawScore + 0.04);
  else if (adx < 18) rawScore = Math.max(0.35, rawScore - 0.05);

  // RSI extreme penalty
  if (rsi > 80 || rsi < 20) rawScore = Math.max(0.35, rawScore - 0.06);

  // Entropy penalty
  if (entropy > 0.6) rawScore = Math.max(0.35, rawScore - 0.08);

  // ATR adaptive
  const avgATR = atr;
  const price = lastClose;
  const atrPct = price > 0 ? avgATR / price : 0;
  if (category === 'crypto' && atrPct > 0.02) rawScore = Math.max(0.35, rawScore - 0.05);

  const score = Math.round(rawScore * 100);

  // — Quality —
  let quality: SignalResult['quality'] = 'EVITAR';
  if (score >= 82) quality = 'PREMIUM';
  else if (score >= 74) quality = 'FORTE';
  else if (score >= 68) quality = 'MÉDIO';
  else if (score >= 62) quality = 'FRACO';

  // — Validation rules —
  const cfg = (() => {
    try { return JSON.parse(localStorage.getItem('smpCfg7') || '{}'); } catch { return {}; }
  })();
  const minScore = cfg.minScore ?? 65;
  const forteOnly = cfg.forteOnly ?? true;

  if (score < minScore) return null;
  if (forteOnly && quality !== 'FORTE' && quality !== 'PREMIUM') return null;
  if (quality === 'EVITAR') return null;
  if (adx < 18) return null;

  // Dead hour check
  const mins = new Date().getMinutes();
  if (mins === 59 || mins === 0) return null;

  // Main 5 indicators must have ≥3 confirmations
  const main5 = ['ema', 'htf', 'rsi', 'macd', 'volume'];
  const confirms = main5.filter(k => votes[k] === direction).length;
  if (confirms < 3) return null;

  // Entropy block
  if (entropy > 0.65) return null;

  // — Consensus (5 universes) —
  const variations = [
    {},
    { ema: 0.10, rsi: -0.05, macd: -0.05 },
    { rsi: 0.10, stoch: 0.05, ema: -0.15 },
    { volume: 0.15, obv: 0.10, candle: -0.25 },
    { rsi: -0.10, macd: -0.10, candle: 0.20 }
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

  if (consensusCount < 4) return null;

  // — Extras —
  const mmTrapResult = detectMMTrap(buf);
  const fp = generateFingerprint(m1);
  const history = (() => {
    try { return JSON.parse(localStorage.getItem('smpH7') || '[]'); } catch { return []; }
  })();
  const dnaResult = matchFingerprint(fp, history);

  return {
    direction,
    score,
    quality,
    adx: Math.round(adx),
    rsi: Math.round(rsi),
    entropy: Math.round(entropy * 100),
    dnaMatch: Math.round(dnaResult.winRate * 100),
    consensus: consensusCount,
    mmTrap: mmTrapResult.detected,
    mmTrapType: mmTrapResult.type,
    sess,
    votes,
    asset,
    category,
    fingerprint: fp,
    ts: Date.now()
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
}

export function runEngineDiag(buf: CandleBuffer, asset: string): DiagResult | null {
  const m1 = buf.m1;
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
  const obv = calcOBV(closes, volumes);
  const candle = detectCandlePattern(m1);
  const entropy = calcEntropy(m1.slice(-20));

  const m5closes = deriveM5(m1).map(c => c.c);
  const m5ema9 = calcEMA(m5closes, 9);
  const m5ema21 = calcEMA(m5closes, 21);
  const htfBull = m5ema9.length > 0 && m5ema21.length > 0 &&
    m5ema9[m5ema9.length - 1] > m5ema21[m5ema21.length - 1];

  const lastClose = closes[closes.length - 1];
  const lastEma9 = ema9[ema9.length - 1] ?? lastClose;
  const lastEma21 = ema21[ema21.length - 1] ?? lastClose;
  const lastEma50 = ema50[ema50.length - 1] ?? lastClose;

  const votes: Record<string, string> = {};
  const emaBull = lastEma9 > lastEma21 && lastEma21 > lastEma50 && lastClose > lastEma9;
  const emaBear = lastEma9 < lastEma21 && lastEma21 < lastEma50 && lastClose < lastEma9;
  votes.ema = emaBull ? 'CALL' : emaBear ? 'PUT' : 'NEUTRAL';
  votes.htf = htfBull ? 'CALL' : 'PUT';
  votes.rsi = rsi < 35 ? 'CALL' : rsi > 65 ? 'PUT' : rsi < 50 ? 'CALL' : 'PUT';
  votes.macd = macd.hist > 0 ? 'CALL' : 'PUT';
  votes.bb = bb.pct < 0.2 ? 'CALL' : bb.pct > 0.8 ? 'PUT' : 'NEUTRAL';
  votes.stoch = stoch < 25 ? 'CALL' : stoch > 75 ? 'PUT' : 'NEUTRAL';
  votes.candle = candle.direction > 0 ? 'CALL' : candle.direction < 0 ? 'PUT' : 'NEUTRAL';
  const avgVol = volumes.slice(-20, -1).reduce((a, b) => a + b, 0) / 19 || 1;
  const lastVol = volumes[volumes.length - 1];
  votes.volume = lastVol > avgVol * 1.2 ? (lastClose > closes[closes.length - 2] ? 'CALL' : 'PUT') : 'NEUTRAL';
  votes.obv = obv > 0 ? 'CALL' : 'PUT';

  let mlWeights = { ...BASE_WEIGHTS };
  try {
    const ml = JSON.parse(localStorage.getItem('smpML7') || '{}');
    const ctx = `${sess}_${category}`;
    if (ml[ctx]) mlWeights = { ...BASE_WEIGHTS, ...ml[ctx] };
  } catch {}

  const callVotes = Object.entries(votes).filter(([, v]) => v === 'CALL');
  const putVotes = Object.entries(votes).filter(([, v]) => v === 'PUT');
  const callScore = callVotes.reduce((s, [k]) => s + (mlWeights[k] || 0), 0);
  const putScore = putVotes.reduce((s, [k]) => s + (mlWeights[k] || 0), 0);
  const total = callScore + putScore || 1;
  const direction: 'CALL' | 'PUT' = callScore >= putScore ? 'CALL' : 'PUT';
  let rawScore = Math.max(callScore, putScore) / total;
  rawScore = Math.min(0.95, Math.max(0.35, rawScore + getSessionBonus(sess, category)));
  if (adx >= 25) rawScore = Math.min(0.95, rawScore + 0.04);
  else if (adx < 18) rawScore = Math.max(0.35, rawScore - 0.05);
  if (rsi > 80 || rsi < 20) rawScore = Math.max(0.35, rawScore - 0.06);
  if (entropy > 0.6) rawScore = Math.max(0.35, rawScore - 0.08);
  const atrPct = lastClose > 0 ? atr / lastClose : 0;
  if (category === 'crypto' && atrPct > 0.02) rawScore = Math.max(0.35, rawScore - 0.05);
  const score = Math.round(rawScore * 100);

  let quality = 'EVITAR';
  if (score >= 82) quality = 'PREMIUM';
  else if (score >= 74) quality = 'FORTE';
  else if (score >= 68) quality = 'MÉDIO';
  else if (score >= 62) quality = 'FRACO';

  const cfg = (() => { try { return JSON.parse(localStorage.getItem('smpCfg7') || '{}'); } catch { return {}; } })();
  const minScore = cfg.minScore ?? 65;
  const forteOnly = cfg.forteOnly ?? true;

  const variations = [
    {}, { ema: 0.10, rsi: -0.05, macd: -0.05 },
    { rsi: 0.10, stoch: 0.05, ema: -0.15 },
    { volume: 0.15, obv: 0.10, candle: -0.25 },
    { rsi: -0.10, macd: -0.10, candle: 0.20 }
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

  const main5 = ['ema', 'htf', 'rsi', 'macd', 'volume'];
  const confirmed = main5.filter(k => votes[k] === direction).length;
  const mins = new Date().getMinutes();

  let blockedBy: string | null = null;
  if (mins === 59 || mins === 0) blockedBy = 'Horário morto (min :00 ou :59)';
  else if (adx < 18) blockedBy = `ADX fraco (${Math.round(adx)} < 18) — mercado lateral`;
  else if (entropy > 0.65) blockedBy = `Entropia alta (${Math.round(entropy * 100)}%) — mercado aleatório`;
  else if (confirmed < 3) blockedBy = `Poucos confirmadores (${confirmed}/5 indicadores principais)`;
  else if (consensusCount < 4) blockedBy = `Consenso insuficiente (${consensusCount}/5 universos)`;
  else if (quality === 'EVITAR') blockedBy = `Score muito baixo (${score}%) — sinal EVITAR`;
  else if (score < minScore) blockedBy = `Score abaixo do mínimo (${score}% < ${minScore}%)`;
  else if (forteOnly && quality !== 'FORTE' && quality !== 'PREMIUM') blockedBy = `Qualidade ${quality} bloqueada — "Apenas FORTE+" ativo`;

  return {
    direction, score, quality,
    adx: Math.round(adx), rsi: Math.round(rsi),
    entropy: Math.round(entropy * 100),
    consensus: consensusCount, confirmed,
    blockedBy, votes,
    passed: blockedBy === null
  };
}

// ─── ORNSTEIN-UHLENBECK FOREX/COMMODITY SIMULATOR ──────────────────────────

export function generateOUCandle(lastPrice: number, asset: string): Candle {
  const mu = BASE_PRICES[asset] || lastPrice;
  const theta = 0.05;
  const sigma = PAIR_VOL[asset] || 0.0003;
  const dt = 1 / 1440;
  const drift = theta * (mu - lastPrice) * dt;
  // Simulate using pseudo-random from time-based seed (deterministic enough)
  const seed = Date.now() % 1000000;
  const r1 = Math.abs(Math.sin(seed * 9301 + 49297) % 1);
  const r2 = Math.abs(Math.sin(seed * 49297 + 233) % 1);
  const normal = Math.sqrt(-2 * Math.log(r1 + 0.0001)) * Math.cos(2 * Math.PI * r2);
  const close = lastPrice + drift + sigma * normal * Math.sqrt(dt) * 100;
  const range = sigma * (0.8 + Math.abs(normal) * 0.5);
  const open = lastPrice;
  const high = Math.max(open, close) + range * 0.3;
  const low = Math.min(open, close) - range * 0.3;
  return {
    o: open, h: high, l: low, c: close,
    v: 1000 + Math.abs(normal) * 500,
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

export function playSignalSound(type: string) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const configs: Record<string, number[][]> = {
      forte: [[440, 0.0], [550, 0.15], [660, 0.30]],
      premium: [[440, 0.0], [550, 0.15], [660, 0.30], [880, 0.45]],
      crypto: [[800, 0.0], [1000, 0.20]],
      win: [[523, 0.0], [659, 0.15], [784, 0.30]],
      loss: [[400, 0.0], [350, 0.20], [300, 0.40]],
      alert: [[800, 0.0]]
    };
    const notes = configs[type] || configs.forte;
    notes.forEach(([freq, delay]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.3, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.3);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.35);
    });
  } catch {}
}

export function vibrate(type: string) {
  const patterns: Record<string, number[]> = {
    forte: [400], win: [100, 50, 100, 50, 200], loss: [150]
  };
  try { navigator.vibrate?.(patterns[type] || [200]); } catch {}
}
