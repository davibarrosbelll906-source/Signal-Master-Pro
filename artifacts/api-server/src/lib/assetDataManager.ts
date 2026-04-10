/**
 * Backend AssetDataManager — Node.js version
 * Uses the `ws` package for WebSocket, native fetch for REST.
 * Maintains candle buffers for all 19 trading pairs.
 *
 * Data sources:
 *  - Crypto:   Binance WebSocket (wss://stream.binance.com)
 *  - Forex/Commodities: Twelve Data REST + WebSocket (if TWELVE_DATA_API_KEY set)
 *  - Fallback: Ornstein-Uhlenbeck simulation
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

// Live tick tracking for building M1 candles from Twelve Data ticks
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

// ── Binance (Crypto) ──────────────────────────────────────────
async function connectCrypto(asset: string) {
  const binanceSym = CRYPTO_SYMBOLS[asset];
  if (!binanceSym) return;

  const buf = initBuffer(asset);

  try {
    const res = await fetch(
      `https://api.binance.com/api/v3/klines?symbol=${binanceSym.toUpperCase()}&interval=1m&limit=200`,
      { signal: AbortSignal.timeout(6000) }
    );
    const data: any[] = await res.json();
    if (!Array.isArray(data) || data.length === 0) throw new Error('Binance unavailable');
    const candles: Candle[] = data.map((k: any) => ({
      o: parseFloat(k[1]), h: parseFloat(k[2]), l: parseFloat(k[3]), c: parseFloat(k[4]),
      v: parseFloat(k[5]), t: k[0]
    }));
    buf.m1 = candles;
    buf.price = candles[candles.length - 1]?.c ?? buf.price;
    buf.connected = true;
    notify(asset);
    console.log(`[AssetData] Binance connected for ${asset} (${candles.length} candles)`);
  } catch {
    console.log(`[AssetData] Binance unavailable for ${asset}, using OU simulation`);
    connectOU(asset);
    return;
  }

  const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${binanceSym.toLowerCase()}@kline_1m`);
  wsMap.set(asset, ws);

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      const k = msg.k;
      const candle: Candle = {
        o: parseFloat(k.o), h: parseFloat(k.h), l: parseFloat(k.l), c: parseFloat(k.c),
        v: parseFloat(k.v), t: k.t
      };
      buf.price = candle.c;
      const lastT = buf.m1.length > 0 ? buf.m1[buf.m1.length - 1].t : -1;
      if (k.x) {
        if (lastT === candle.t) buf.m1[buf.m1.length - 1] = candle;
        else { buf.m1.push(candle); if (buf.m1.length > 200) buf.m1.shift(); }
      } else {
        if (lastT === candle.t) buf.m1[buf.m1.length - 1] = candle;
        else { buf.m1.push(candle); if (buf.m1.length > 200) buf.m1.shift(); }
      }
      notify(asset);
    } catch {}
  });

  ws.on('close', () => { buf.connected = false; setTimeout(() => connectCrypto(asset), 5000); });
  ws.on('error', () => { buf.connected = false; });
}

// ── Twelve Data (Forex + Commodities) ────────────────────────

// Guarda os assets válidos para reconexão sem recarregar REST
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
          if (last.t === tick.t) {
            buf.m1[buf.m1.length - 1] = { o: tick.o, h: tick.h, l: tick.l, c: tick.c, v: last.v, t: tick.t };
          }
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
    // Reconecta apenas o WebSocket, sem recarregar dados históricos via REST
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

  // Carregar histórico via REST em lotes de 8 por minuto (limite free tier)
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
          o: parseFloat(v.open),
          h: parseFloat(v.high),
          l: parseFloat(v.low),
          c: parseFloat(v.close),
          v: parseFloat(v.volume || '1000'),
          t: new Date(v.datetime).getTime(),
        }));

        buf.m1 = candles;
        buf.price = candles[candles.length - 1]?.c ?? buf.price;
        buf.connected = true;
        notify(asset);
        console.log(`[AssetData] Twelve Data ✓ ${asset} — ${candles.length} candles carregados`);
      } catch (e: any) {
        console.log(`[AssetData] Twelve Data falhou para ${asset}: ${e?.message} — usando simulação`);
        connectOU(asset);
      }
    }
  }

  // WebSocket para ticks em tempo real
  twelveValidAssets = assets.filter(a => TWELVE_SYMBOLS[a] && buffers.get(a)?.connected);
  connectTwelveDataWS(twelveValidAssets);
}

// ── Simulação OU (fallback) ───────────────────────────────────
function connectOU(asset: string) {
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
    const high = Math.max(open, close) + range * 0.3;
    const low = Math.min(open, close) - range * 0.3;
    history.push({ o: open, h: high, l: low, c: close, v: 1000 + Math.abs(normal) * 500, t });
    p = close;
  }

  buf.m1 = history;
  buf.price = p;
  buf.connected = true;

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

  // Crypto via Binance
  for (const asset of cryptoAssets) {
    connectCrypto(asset).catch(() => {});
  }

  // Forex/Commodities via Twelve Data (ou simulação se sem chave)
  if (process.env.TWELVE_DATA_API_KEY) {
    await connectTwelveData(forexAssets);
  } else {
    for (const asset of forexAssets) connectOU(asset);
  }
}
