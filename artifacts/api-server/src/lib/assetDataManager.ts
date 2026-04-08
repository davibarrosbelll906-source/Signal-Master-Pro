/**
 * Backend AssetDataManager — Node.js version
 * Uses the `ws` package for WebSocket, native fetch for REST.
 * Maintains candle buffers for all 19 trading pairs.
 */

import WebSocket from 'ws';
import {
  ASSET_CATEGORIES, CRYPTO_SYMBOLS, BASE_PRICES,
  generateOUCandle, type Candle
} from './signalEngine.js';

export interface AssetBuffer {
  m1: Candle[];
  price: number;
  connected: boolean;
}

type BufferCallback = (asset: string, buf: AssetBuffer) => void;

const buffers = new Map<string, AssetBuffer>();
const callbacks: BufferCallback[] = [];
const wsMap = new Map<string, WebSocket>();
const ouTimers = new Map<string, ReturnType<typeof setInterval>>();

function notify(asset: string) {
  const buf = buffers.get(asset);
  if (!buf) return;
  for (const cb of callbacks) cb(asset, buf);
}

export function onBufferUpdate(cb: BufferCallback) {
  callbacks.push(cb);
}

function initBuffer(asset: string): AssetBuffer {
  const existing = buffers.get(asset);
  if (existing) return existing;
  const buf: AssetBuffer = { m1: [], price: BASE_PRICES[asset] || 1.0, connected: false };
  buffers.set(asset, buf);
  return buf;
}

async function connectCrypto(asset: string) {
  const binanceSym = CRYPTO_SYMBOLS[asset];
  if (!binanceSym) return;

  const buf = initBuffer(asset);

  try {
    const res = await fetch(
      `https://api.binance.com/api/v3/klines?symbol=${binanceSym.toUpperCase()}&interval=1m&limit=200`
    );
    const data: any[] = await res.json();
    const candles: Candle[] = data.map((k: any) => ({
      o: parseFloat(k[1]), h: parseFloat(k[2]), l: parseFloat(k[3]), c: parseFloat(k[4]),
      v: parseFloat(k[5]), t: k[0]
    }));
    buf.m1 = candles;
    buf.price = candles[candles.length - 1]?.c ?? buf.price;
    buf.connected = true;
    notify(asset);
  } catch {
    buf.connected = false;
  }

  // Open streaming WebSocket
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
      if (k.x) {
        buf.m1.push(candle);
        if (buf.m1.length > 200) buf.m1.shift();
      } else if (buf.m1.length > 0) {
        buf.m1[buf.m1.length - 1] = candle;
      }
      notify(asset);
    } catch {}
  });

  ws.on('close', () => {
    buf.connected = false;
    setTimeout(() => connectCrypto(asset), 5000);
  });

  ws.on('error', () => { buf.connected = false; });
}

function connectOU(asset: string) {
  const buf = initBuffer(asset);
  const basePrice = BASE_PRICES[asset] || 1.0;
  let p = basePrice;

  const history: Candle[] = [];
  for (let i = 0; i < 150; i++) {
    const fakePast = Date.now() - (150 - i) * 60000;
    const seed = fakePast % 1000000;
    const r1 = Math.abs(Math.sin(seed * 9301 + 49297 + i * 1337) % 1) || 0.01;
    const r2 = Math.abs(Math.sin(seed * 49297 + 233 + i * 7919) % 1) || 0.01;
    const mu = BASE_PRICES[asset] || p;
    const theta = 0.05;
    const sigma = (asset === 'XAUUSD' ? 0.002 : asset === 'USOIL' ? 0.003 : 0.0003);
    const dt = 1 / 1440;
    const drift = theta * (mu - p) * dt;
    const normal = Math.sqrt(-2 * Math.log(r1)) * Math.cos(2 * Math.PI * r2);
    const close = p + drift + sigma * normal * Math.sqrt(dt) * 100;
    const range = sigma * (0.8 + Math.abs(normal) * 0.5);
    const open = p;
    const high = Math.max(open, close) + range * 0.3;
    const low = Math.min(open, close) - range * 0.3;
    history.push({ o: open, h: high, l: low, c: close, v: 1000 + Math.abs(normal) * 500, t: fakePast });
    p = close;
  }

  buf.m1 = history;
  buf.price = p;
  buf.connected = true;
  notify(asset);

  const timer = setInterval(() => {
    const c = generateOUCandle(buf.price, asset);
    buf.price = c.c;
    buf.m1.push(c);
    if (buf.m1.length > 200) buf.m1.shift();
    notify(asset);
  }, 60000);

  ouTimers.set(asset, timer);
}

export function getBuffer(asset: string): AssetBuffer | undefined {
  return buffers.get(asset);
}

export async function initAllAssets(assets: string[]) {
  for (const asset of assets) {
    const category = ASSET_CATEGORIES[asset] || 'forex';
    if (category === 'crypto') {
      connectCrypto(asset).catch(() => {});
    } else {
      connectOU(asset);
    }
  }
}
