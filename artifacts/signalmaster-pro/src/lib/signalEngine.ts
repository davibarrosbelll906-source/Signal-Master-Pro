export const ASSET_CATEGORIES = {
  BTCUSD: 'crypto', ETHUSD: 'crypto', SOLUSD: 'crypto', BNBUSD: 'crypto',
  ADAUSD: 'crypto', DOGEUSD: 'crypto', XRPUSD: 'crypto', LTCUSD: 'crypto',
  EURUSD: 'forex', GBPUSD: 'forex', USDJPY: 'forex', AUDUSD: 'forex',
  USDCAD: 'forex', NZDUSD: 'forex', EURGBP: 'forex', GBPJPY: 'forex',
  XAUUSD: 'commodity', XAGUSD: 'commodity', USOIL: 'commodity'
};

export const PAIR_VOLATILITY = {
  EURUSD: 0.0003, GBPUSD: 0.0005, USDJPY: 0.03, AUDUSD: 0.0004, USDCAD: 0.0004,
  NZDUSD: 0.0004, EURGBP: 0.0002, GBPJPY: 0.05, XAUUSD: 0.8, XAGUSD: 0.015, USOIL: 0.15
};

export const TV_SYMBOLS = {
  BTCUSD: 'BINANCE:BTCUSDT', ETHUSD: 'BINANCE:ETHUSDT', SOLUSD: 'BINANCE:SOLUSDT',
  BNBUSD: 'BINANCE:BNBUSDT', ADAUSD: 'BINANCE:ADAUSDT', DOGEUSD: 'BINANCE:DOGEUSDT',
  XRPUSD: 'BINANCE:XRPUSDT', LTCUSD: 'BINANCE:LTCUSDT',
  EURUSD: 'FX:EURUSD', GBPUSD: 'FX:GBPUSD', USDJPY: 'FX:USDJPY', AUDUSD: 'FX:AUDUSD',
  USDCAD: 'FX:USDCAD', NZDUSD: 'FX:NZDUSD', EURGBP: 'FX:EURGBP', GBPJPY: 'FX:GBPJPY',
  XAUUSD: 'TVC:GOLD', XAGUSD: 'TVC:SILVER', USOIL: 'TVC:USOIL'
};

export function calcEMA(closes: number[], period: number): number[] {
  if (closes.length < period) return [];
  const k = 2 / (period + 1);
  const ema = [closes.slice(0, period).reduce((a, b) => a + b, 0) / period];
  for (let i = period; i < closes.length; i++) {
    ema.push(closes[i] * k + ema[ema.length - 1] * (1 - k));
  }
  return ema;
}

export function calcRSI(closes: number[], period = 14): number[] {
  if (closes.length <= period) return [];
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  const rsi = [avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss))];
  
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    avgGain = ((avgGain * (period - 1)) + (diff >= 0 ? diff : 0)) / period;
    avgLoss = ((avgLoss * (period - 1)) + (diff < 0 ? -diff : 0)) / period;
    rsi.push(avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss)));
  }
  return rsi;
}

export function calcMACD(closes: number[]): { macdLine: number[], signalLine: number[], histogram: number[] } {
  const ema12 = calcEMA(closes, 12);
  const ema26 = calcEMA(closes, 26);
  const macdLine = [];
  const offset = ema26.length > 0 ? closes.length - ema26.length : 0;
  for (let i = 0; i < ema26.length; i++) {
    macdLine.push(ema12[i + (ema12.length - ema26.length)] - ema26[i]);
  }
  const signalLine = calcEMA(macdLine, 9);
  const histogram = [];
  for (let i = 0; i < signalLine.length; i++) {
    histogram.push(macdLine[i + (macdLine.length - signalLine.length)] - signalLine[i]);
  }
  return { macdLine, signalLine, histogram };
}

export function calcBollinger(closes: number[], period = 20, mult = 2) {
  const upper = [], lower = [], mean = [], width = [];
  for (let i = period - 1; i < closes.length; i++) {
    const slice = closes.slice(i - period + 1, i + 1);
    const m = slice.reduce((a, b) => a + b, 0) / period;
    const v = slice.reduce((a, b) => a + Math.pow(b - m, 2), 0) / period;
    const std = Math.sqrt(v);
    mean.push(m);
    upper.push(m + mult * std);
    lower.push(m - mult * std);
    width.push((m + mult * std) - (m - mult * std));
  }
  return { mean, upper, lower, width };
}

export function calcStoch(highs: number[], lows: number[], closes: number[], period = 14) {
  const k = [];
  for (let i = period - 1; i < closes.length; i++) {
    const h = Math.max(...highs.slice(i - period + 1, i + 1));
    const l = Math.min(...lows.slice(i - period + 1, i + 1));
    k.push(h === l ? 50 : ((closes[i] - l) / (h - l)) * 100);
  }
  return k;
}

export function getCurrentSession() {
  const hour = new Date().getUTCHours();
  if (hour >= 8 && hour < 13) return 'london';
  if (hour >= 13 && hour < 17) return 'overlap';
  if (hour >= 17 && hour < 22) return 'ny';
  if (hour >= 0 && hour < 8) return 'asia';
  return 'off';
}
