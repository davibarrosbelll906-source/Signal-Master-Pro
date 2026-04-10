/**
 * Backend AssetDataManager — Node.js version
 * Uses the `ws` package for WebSocket, native fetch for REST.
 * Maintains candle buffers for all 19 trading pairs.
 *
 * Crypto data source cascade:
 *  1. Binance WebSocket (wss://stream.binance.com)
 *  2. Bybit REST + WebSocket (api.bybit.com) — fallback quando Binance bloqueado
 *  3. Kraken REST + WebSocket (api.kraken.com) — segundo fallback
 *  4. Ornstein-Uhlenbeck simulation — último recurso
 *
 * Forex/Commodities:
 *  - Twelve Data REST + WebSocket (se TWELVE_DATA_API_KEY configurada)
 *  - Ornstein-Uhlenbeck simulation — fallback
 */

import WebSocket from 'ws';
import {
  ASSET_CATEGORIES, CRYPTO_SYMBOLS, BASE_PRICES, PAIR_VOL,
  generateOUCandle, type Candle
} from './signalEngine.js';

export interface AssetBuffer {
  m1: Candle[];
  price: number;
  connected: boolean;
  source?: string;
}

type BufferCallback = (asset: string, buf: AssetBuffer) => void;

const buffers   = new Map<string, AssetBuffer>();
const callbacks: BufferCallback[] = [];
const wsMap     = new Map<string, WebSocket>();
const ouTimers  = new Map<string, ReturnType<typeof setInterval>>();

// ── Twelve Data symbol mapping ────────────────────────────────
const TWELVE_SYMBOLS: Record<string, string> = {
  EURUSD: 'EUR/USD', GBPUSD: 'GBP/USD', USDJPY: 'USD/JPY',
  AUDUSD: 'AUD/USD', USDCAD: 'USD/CAD', NZDUSD: 'NZD/USD',
  EURGBP: 'EUR/GBP', GBPJPY: 'GBP/JPY',
  XAUUSD: 'XAU/USD', XAGUSD: 'XAG/USD', USOIL: 'WTI/USD',
};
const TWELVE_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(TWELVE_SYMBOLS).map(([k, v]) => [v, k])
);

// ── Kraken symbol mapping ─────────────────────────────────────
const KRAKEN_SYMBOLS: Record<string, string> = {
  BTCUSD: 'XBT/USD', ETHUSD: 'ETH/USD', SOLUSD: 'SOL/USD',
  XRPUSD: 'XRP/USD', ADAUSD: 'ADA/USD', DOGEUSD: 'DOGE/USD',
  LTCUSD: 'LTC/USD', BNBUSD: 'BNB/USD',
};
const KRAKEN_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(KRAKEN_SYMBOLS).map(([k, v]) => [v, k])
);
// Pares alternativos que Kraken usa (respostas do REST)
const KRAKEN_REST_ALT: Record<string, string> = {
  BTCUSD: 'XXBTZUSD', ETHUSD: 'XETHZUSD',
};

// Live tick tracking for building M1 candles from ticks
const liveTick = new Map<string, { o: number; h: number; l: number; c: number; t: number }>();

function notify(asset: string) {
  const buf = buffers.get(asset);
  if (!buf) return;
  for (const cb of callbacks) cb(asset, buf);
}

export function onBufferUpdate(cb: BufferCallback) { callbacks.push(cb); }

function initBuffer(asset: string): AssetBuffer {
  const existing = buffers.get(asset);
  if (existing) return existing;
  const buf: AssetBuffer = { m1: [], price: BASE_PRICES[asset] || 1.0, connected: false };
  buffers.set(asset, buf);
  return buf;
}

// ── Helper: atualiza candle buffer a partir de um candle recebido ──────────
function pushCandle(buf: AssetBuffer, candle: Candle, isClosed: boolean) {
  const lastT = buf.m1.length > 0 ? buf.m1[buf.m1.length - 1].t : -1;
  if (lastT === candle.t) {
    buf.m1[buf.m1.length - 1] = candle;
  } else {
    buf.m1.push(candle);
    if (buf.m1.length > 210) buf.m1.shift();
  }
}

// ── 1. Binance ────────────────────────────────────────────────
async function connectBinance(asset: string): Promise<boolean> {
  const binanceSym = CRYPTO_SYMBOLS[asset];
  if (!binanceSym) return false;
  const buf = initBuffer(asset);
  try {
    const res = await fetch(
      `https://api.binance.com/api/v3/klines?symbol=${binanceSym.toUpperCase()}&interval=1m&limit=200`,
      { signal: AbortSignal.timeout(6000) }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: any[] = await res.json();
    if (!Array.isArray(data) || data.length === 0) throw new Error('empty');
    buf.m1 = data.map((k: any) => ({
      o: parseFloat(k[1]), h: parseFloat(k[2]), l: parseFloat(k[3]), c: parseFloat(k[4]),
      v: parseFloat(k[5]), t: k[0]
    }));
    buf.price = buf.m1[buf.m1.length - 1]?.c ?? buf.price;
    buf.connected = true;
    buf.source = 'Binance';
    notify(asset);
    console.log(`[AssetData] ✅ Binance → ${asset} (${buf.m1.length} candles)`);
  } catch {
    return false;
  }

  const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${binanceSym.toLowerCase()}@kline_1m`);
  wsMap.set(asset, ws);
  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      const k = msg.k;
      pushCandle(buf, {
        o: parseFloat(k.o), h: parseFloat(k.h), l: parseFloat(k.l), c: parseFloat(k.c),
        v: parseFloat(k.v), t: k.t
      }, k.x);
      buf.price = parseFloat(k.c);
      notify(asset);
    } catch {}
  });
  ws.on('close', () => { buf.connected = false; setTimeout(() => connectCrypto(asset), 5000); });
  ws.on('error', () => { buf.connected = false; });
  return true;
}

// ── 2. Bybit ──────────────────────────────────────────────────
async function connectBybit(asset: string): Promise<boolean> {
  const sym = CRYPTO_SYMBOLS[asset]?.toUpperCase(); // BTCUSDT
  if (!sym) return false;
  const buf = initBuffer(asset);
  try {
    const url = `https://api.bybit.com/v5/market/kline?category=spot&symbol=${sym}&interval=1&limit=200`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json() as any;
    if (json.retCode !== 0) throw new Error(json.retMsg || 'Bybit error');
    const list: string[][] = json.result?.list ?? [];
    if (list.length === 0) throw new Error('empty');
    // Bybit returns newest first → reverse
    const candles: Candle[] = list.reverse().map((k) => ({
      o: parseFloat(k[1]), h: parseFloat(k[2]), l: parseFloat(k[3]), c: parseFloat(k[4]),
      v: parseFloat(k[5]), t: parseInt(k[0])
    }));
    buf.m1 = candles;
    buf.price = candles[candles.length - 1]?.c ?? buf.price;
    buf.connected = true;
    buf.source = 'Bybit';
    notify(asset);
    console.log(`[AssetData] ✅ Bybit → ${asset} (${candles.length} candles)`);
  } catch (e: any) {
    console.log(`[AssetData] Bybit falhou para ${asset}: ${e?.message}`);
    return false;
  }

  // Bybit WebSocket para ticks ao vivo
  const ws = new WebSocket('wss://stream.bybit.com/v5/public/spot');
  wsMap.set(asset, ws);
  ws.on('open', () => {
    ws.send(JSON.stringify({ op: 'subscribe', args: [`kline.1.${sym}`] }));
  });
  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.topic !== `kline.1.${sym}` || !msg.data?.[0]) return;
      const k = msg.data[0];
      pushCandle(buf, {
        o: parseFloat(k.open), h: parseFloat(k.high), l: parseFloat(k.low), c: parseFloat(k.close),
        v: parseFloat(k.volume), t: parseInt(k.start)
      }, k.confirm);
      buf.price = parseFloat(k.close);
      notify(asset);
    } catch {}
  });
  ws.on('close', () => { buf.connected = false; setTimeout(() => connectCrypto(asset), 8000); });
  ws.on('error', () => { buf.connected = false; });
  return true;
}

// ── 3. Kraken ─────────────────────────────────────────────────
async function connectKraken(asset: string): Promise<boolean> {
  const krakenSym = KRAKEN_SYMBOLS[asset];
  if (!krakenSym) return false;
  const buf = initBuffer(asset);
  try {
    const pair = krakenSym.replace('/', '');
    const url = `https://api.kraken.com/0/public/OHLC?pair=${pair}&interval=1`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json() as any;
    if (json.error?.length) throw new Error(json.error[0]);
    const resultKey = Object.keys(json.result ?? {}).find(k => k !== 'last');
    const raw: any[] = json.result?.[resultKey ?? ''] ?? [];
    if (raw.length === 0) throw new Error('empty');
    const candles: Candle[] = raw.map((k: any) => ({
      o: parseFloat(k[1]), h: parseFloat(k[2]), l: parseFloat(k[3]), c: parseFloat(k[4]),
      v: parseFloat(k[6]), t: parseInt(k[0]) * 1000
    }));
    buf.m1 = candles.slice(-200);
    buf.price = buf.m1[buf.m1.length - 1]?.c ?? buf.price;
    buf.connected = true;
    buf.source = 'Kraken';
    notify(asset);
    console.log(`[AssetData] ✅ Kraken → ${asset} (${buf.m1.length} candles)`);
  } catch (e: any) {
    console.log(`[AssetData] Kraken falhou para ${asset}: ${e?.message}`);
    return false;
  }

  // Kraken WebSocket para ticks ao vivo
  const ws = new WebSocket('wss://ws.kraken.com');
  wsMap.set(asset, ws);
  ws.on('open', () => {
    ws.send(JSON.stringify({
      event: 'subscribe',
      pair: [krakenSym],
      subscription: { name: 'ohlc', interval: 1 }
    }));
  });
  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (!Array.isArray(msg)) return;
      const [, data, chanName] = msg;
      if (!chanName?.startsWith('ohlc-')) return;
      const nowMinT = parseInt(data[1]) ? Math.floor(parseFloat(data[1]) * 1000 / 60000) * 60000 :
        Math.floor(Date.now() / 60000) * 60000;
      const candle: Candle = {
        o: parseFloat(data[2]), h: parseFloat(data[3]), l: parseFloat(data[4]),
        c: parseFloat(data[5]), v: parseFloat(data[7]), t: nowMinT
      };
      pushCandle(buf, candle, false);
      buf.price = candle.c;
      notify(asset);
    } catch {}
  });
  ws.on('close', () => { buf.connected = false; setTimeout(() => connectCrypto(asset), 10000); });
  ws.on('error', () => { buf.connected = false; });
  return true;
}

// ── Cascade: Binance → Bybit → Kraken → Simulação ────────────
async function connectCrypto(asset: string) {
  const existing = wsMap.get(asset);
  if (existing) { try { existing.terminate(); } catch {} wsMap.delete(asset); }

  const ok =
    await connectBinance(asset) ||
    await connectBybit(asset)   ||
    await connectKraken(asset);

  if (!ok) {
    console.log(`[AssetData] ⚠️ Todos os feeds falharam para ${asset} — usando simulação`);
    connectOU(asset);
  }
}

// ── Twelve Data (Forex + Commodities) ────────────────────────

let twelveValidAssets: string[] = [];

function connectTwelveDataWS(validAssets: string[]) {
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey || validAssets.length === 0) return;

  const symbols = validAssets.map(a => TWELVE_SYMBOLS[a]).join(',');
  const ws = new WebSocket(`wss://ws.twelvedata.com/v1/quotes/price?apikey=${apiKey}`);
  wsMap.set('_twelve_ws', ws);

  ws.on('open', () => {
    console.log(`[AssetData] Twelve Data WebSocket conectado (${validAssets.length} pares)`);
    ws.send(JSON.stringify({ action: 'subscribe', params: { symbols } }));
  });

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.event !== 'price') return;
      const asset = TWELVE_REVERSE[msg.symbol];
      if (!asset) return;
      const buf = buffers.get(asset);
      if (!buf) return;
      const price = parseFloat(msg.price);
      if (!price || isNaN(price)) return;
      const nowMinT = Math.floor(Date.now() / 60000) * 60000;
      buf.price = price;
      let tick = liveTick.get(asset);
      if (!tick || tick.t !== nowMinT) {
        if (tick && buf.m1.length > 0) {
          const last = buf.m1[buf.m1.length - 1];
          if (last.t === tick.t)
            buf.m1[buf.m1.length - 1] = { o: tick.o, h: tick.h, l: tick.l, c: tick.c, v: last.v, t: tick.t };
        }
        tick = { o: price, h: price, l: price, c: price, t: nowMinT };
        liveTick.set(asset, tick);
        buf.m1.push({ o: price, h: price, l: price, c: price, v: 1000, t: nowMinT });
        if (buf.m1.length > 202) buf.m1.shift();
      } else {
        tick.h = Math.max(tick.h, price);
        tick.l = Math.min(tick.l, price);
        tick.c = price;
        if (buf.m1.length > 0) {
          const last = buf.m1[buf.m1.length - 1];
          buf.m1[buf.m1.length - 1] = { ...last, h: tick.h, l: tick.l, c: tick.c };
        }
      }
      notify(asset);
    } catch {}
  });

  ws.on('close', () => {
    console.log('[AssetData] Twelve Data WebSocket fechado — reconectando em 30s');
    setTimeout(() => connectTwelveDataWS(twelveValidAssets), 30000);
  });
  ws.on('error', (e) => {
    console.log(`[AssetData] Twelve Data WebSocket erro: ${e.message}`);
  });
}

async function connectTwelveData(assets: string[]) {
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) {
    console.log('[AssetData] TWELVE_DATA_API_KEY não configurada — usando simulação para Forex');
    for (const asset of assets) connectOU(asset);
    return;
  }

  const BATCH_SIZE = 8;
  for (let i = 0; i < assets.length; i += BATCH_SIZE) {
    const batch = assets.slice(i, i + BATCH_SIZE);
    if (i > 0) {
      console.log(`[AssetData] Aguardando 65s antes do próximo lote (rate limit TwelveData)...`);
      await new Promise(r => setTimeout(r, 65000));
    }
    for (const asset of batch) {
      const sym = TWELVE_SYMBOLS[asset];
      if (!sym) { connectOU(asset); continue; }
      const buf = initBuffer(asset);
      try {
        const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(sym)}&interval=1min&outputsize=200&apikey=${apiKey}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
        const json = await res.json() as any;
        if (json.status === 'error' || !json.values) throw new Error(json.message || 'API error');
        const candles: Candle[] = (json.values as any[]).reverse().map((v: any) => ({
          o: parseFloat(v.open), h: parseFloat(v.high), l: parseFloat(v.low), c: parseFloat(v.close),
          v: parseFloat(v.volume || '1000'), t: new Date(v.datetime).getTime(),
        }));
        buf.m1 = candles;
        buf.price = candles[candles.length - 1]?.c ?? buf.price;
        buf.connected = true;
        buf.source = 'TwelveData';
        notify(asset);
        console.log(`[AssetData] ✅ Twelve Data → ${asset} (${candles.length} candles)`);
      } catch (e: any) {
        console.log(`[AssetData] Twelve Data falhou para ${asset}: ${e?.message} — usando simulação`);
        connectOU(asset);
      }
    }
  }

  twelveValidAssets = assets.filter(a => TWELVE_SYMBOLS[a] && buffers.get(a)?.connected);
  connectTwelveDataWS(twelveValidAssets);
}

// ── Simulação OU (último recurso) ────────────────────────────
function connectOU(asset: string) {
  if (ouTimers.has(asset)) return;
  const buf = initBuffer(asset);
  const basePrice = BASE_PRICES[asset] || 1.0;
  let p = basePrice;
  const history: Candle[] = [];
  const nowMin = Math.floor(Date.now() / 60000) * 60000;
  for (let i = 0; i < 150; i++) {
    const t = nowMin - (150 - i) * 60000;
    const seed = t % 1000000;
    const r1 = Math.abs(Math.sin(seed * 9301 + 49297 + i * 1337) % 1) || 0.01;
    const r2 = Math.abs(Math.sin(seed * 49297 + 233 + i * 7919) % 1) || 0.01;
    const mu = BASE_PRICES[asset] || p;
    const theta = 0.05;
    const sigma = PAIR_VOL[asset] || 0.0003;
    const dt = 1 / 1440;
    const drift = theta * (mu - p) * dt;
    const normal = Math.sqrt(-2 * Math.log(r1)) * Math.cos(2 * Math.PI * r2);
    const close = p + drift + sigma * normal * Math.sqrt(dt) * 100;
    const range = sigma * (0.8 + Math.abs(normal) * 0.5);
    const open = p;
    history.push({ o: open, h: Math.max(open, close) + range * 0.3, l: Math.min(open, close) - range * 0.3, c: close, v: 1000 + Math.abs(normal) * 500, t });
    p = close;
  }
  buf.m1 = history;
  buf.price = p;
  buf.connected = true;
  buf.source = 'Simulation';
  const currentMinT = Math.floor(Date.now() / 60000) * 60000;
  buf.m1.push({ o: p, h: p, l: p, c: p, v: 500, t: currentMinT });
  notify(asset);

  const timer = setInterval(() => {
    const c = generateOUCandle(buf.price, asset);
    const alignedT = Math.floor(Date.now() / 60000) * 60000;
    c.t = alignedT;
    buf.price = c.c;
    buf.m1[buf.m1.length - 1] = { ...buf.m1[buf.m1.length - 1], c: c.o };
    buf.m1.push(c);
    if (buf.m1.length > 202) buf.m1.shift();
    notify(asset);
  }, 60000);

  const liveTimer = setInterval(() => {
    if (buf.m1.length === 0) return;
    const sigma = PAIR_VOL[asset] || 0.0003;
    const tick = (Math.random() - 0.5) * sigma * Math.sqrt(2 / 1440) * 100;
    const newPrice = buf.price + tick;
    const last = buf.m1[buf.m1.length - 1];
    buf.m1[buf.m1.length - 1] = { ...last, c: newPrice, h: Math.max(last.h, newPrice), l: Math.min(last.l, newPrice) };
    buf.price = newPrice;
    notify(asset);
  }, 2000);

  ouTimers.set(asset, timer);
  ouTimers.set(asset + '_live', liveTimer);
}

// ── Exports ───────────────────────────────────────────────────
export function getBuffer(asset: string): AssetBuffer | undefined {
  return buffers.get(asset);
}

export async function initAllAssets(assets: string[]) {
  const cryptoAssets = assets.filter(a => ASSET_CATEGORIES[a] === 'crypto');
  const forexAssets  = assets.filter(a => ASSET_CATEGORIES[a] !== 'crypto');

  // Crypto: Binance → Bybit → Kraken → Simulação (paralelo)
  await Promise.all(cryptoAssets.map(asset => connectCrypto(asset)));

  // Forex/Commodities via Twelve Data (ou simulação se sem chave)
  if (process.env.TWELVE_DATA_API_KEY) {
    await connectTwelveData(forexAssets);
  } else {
    for (const asset of forexAssets) connectOU(asset);
  }
}
