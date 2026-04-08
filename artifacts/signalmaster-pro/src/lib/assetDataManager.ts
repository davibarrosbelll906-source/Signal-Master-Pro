/**
 * AssetDataManager — Singleton that maintains ONE data feed per asset.
 * Crypto: tries Binance WebSocket first; falls back to OU simulation if blocked.
 * Forex/Commodity: always uses OU simulation.
 * All components subscribe to the SAME buffer so the signal engine sees identical data.
 */

import {
  ASSET_CATEGORIES, CRYPTO_SYMBOLS, BASE_PRICES, PAIR_VOL,
  generateOUCandle,
  type Candle, type CandleBuffer
} from './signalEngine';

type Subscriber = (buf: CandleBuffer, price: number, priceDir: 'up' | 'down' | null, connected: boolean, bufSize: number) => void;

interface AssetState {
  buf: CandleBuffer;
  price: number | null;
  priceDir: 'up' | 'down' | null;
  connected: boolean;
  ws: WebSocket | null;
  ouTimer: ReturnType<typeof setInterval> | null;
  ouLiveTimer: ReturnType<typeof setInterval> | null;
  ouPrice: number;
  subscribers: Map<string, Subscriber>;
  refCount: number;
  loading: boolean;
}

const assets = new Map<string, AssetState>();

function getOrCreate(asset: string): AssetState {
  if (!assets.has(asset)) {
    assets.set(asset, {
      buf: { m1: [], m5: [], m15: [] },
      price: null,
      priceDir: null,
      connected: false,
      ws: null,
      ouTimer: null,
      ouLiveTimer: null,
      ouPrice: BASE_PRICES[asset] || 1.0,
      subscribers: new Map(),
      refCount: 0,
      loading: false,
    });
  }
  return assets.get(asset)!;
}

function notify(asset: string) {
  const state = assets.get(asset);
  if (!state) return;
  for (const cb of state.subscribers.values()) {
    cb(state.buf, state.price ?? 0, state.priceDir, state.connected, state.buf.m1.length);
  }
}

function startOU(asset: string) {
  const state = assets.get(asset)!;
  if (state.ouTimer) return;

  const nowMin = Math.floor(Date.now() / 60000) * 60000;
  let p = BASE_PRICES[asset] || 1.0;
  const sigma = PAIR_VOL[asset] || 0.0003;
  const history: Candle[] = [];

  for (let i = 0; i < 150; i++) {
    const t = nowMin - (150 - i) * 60000;
    const seed = t % 1000000;
    const r1 = Math.abs(Math.sin(seed * 9301 + 49297 + i * 1337) % 1) || 0.01;
    const r2 = Math.abs(Math.sin(seed * 49297 + 233 + i * 7919) % 1) || 0.01;
    const mu = BASE_PRICES[asset] || p;
    const theta = 0.05;
    const dt = 1 / 1440;
    const drift = theta * (mu - p) * dt;
    const normal = Math.sqrt(-2 * Math.log(r1)) * Math.cos(2 * Math.PI * r2);
    const close = p + drift + sigma * normal * Math.sqrt(dt) * 100;
    const range = sigma * (0.8 + Math.abs(normal) * 0.5);
    const open = p;
    history.push({ o: open, h: Math.max(open, close) + range * 0.3, l: Math.min(open, close) - range * 0.3, c: close, v: 1000 + Math.abs(normal) * 500, t });
    p = close;
  }

  state.buf.m1 = history;
  state.ouPrice = p;
  state.price = p;
  state.connected = true;

  const currentMinT = Math.floor(Date.now() / 60000) * 60000;
  state.buf.m1.push({ o: p, h: p, l: p, c: p, v: 500, t: currentMinT });
  notify(asset);

  state.ouTimer = setInterval(() => {
    const c = generateOUCandle(state.ouPrice, asset);
    const alignedT = Math.floor(Date.now() / 60000) * 60000;
    c.t = alignedT;
    const newP = c.c;
    state.priceDir = newP >= state.ouPrice ? 'up' : 'down';
    state.ouPrice = newP;
    state.price = newP;
    state.buf.m1[state.buf.m1.length - 1] = { ...state.buf.m1[state.buf.m1.length - 1], c: c.o };
    state.buf.m1.push(c);
    if (state.buf.m1.length > 202) state.buf.m1.shift();
    notify(asset);
  }, 60000);

  state.ouLiveTimer = setInterval(() => {
    if (state.buf.m1.length === 0) return;
    const s = PAIR_VOL[asset] || 0.0003;
    const tick = (Math.random() - 0.5) * s * Math.sqrt(2 / 1440) * 100;
    const newPrice = state.ouPrice + tick;
    const last = state.buf.m1[state.buf.m1.length - 1];
    state.buf.m1[state.buf.m1.length - 1] = {
      ...last,
      c: newPrice,
      h: Math.max(last.h, newPrice),
      l: Math.min(last.l, newPrice),
    };
    state.priceDir = newPrice >= (state.price ?? newPrice) ? 'up' : 'down';
    state.price = newPrice;
    notify(asset);
  }, 2000);
}

function connectCrypto(asset: string) {
  const state = assets.get(asset)!;
  if (state.loading || state.connected) return;
  state.loading = true;

  const binanceSym = CRYPTO_SYMBOLS[asset];
  if (!binanceSym) { state.loading = false; return; }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  fetch(`https://api.binance.com/api/v3/klines?symbol=${binanceSym.toUpperCase()}&interval=1m&limit=200`, { signal: controller.signal })
    .then(r => r.json())
    .then((data: any[]) => {
      clearTimeout(timeout);
      if (!Array.isArray(data) || data.length === 0) throw new Error('Binance unavailable');
      const candles: Candle[] = data.map((k: any) => ({
        o: parseFloat(k[1]), h: parseFloat(k[2]), l: parseFloat(k[3]), c: parseFloat(k[4]),
        v: parseFloat(k[5]), t: k[0]
      }));
      state.buf.m1 = candles;
      const last = candles[candles.length - 1];
      state.price = last.c;
      state.connected = true;
      state.loading = false;
      notify(asset);

      const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${binanceSym.toLowerCase()}@kline_1m`);
      state.ws = ws;

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          const k = msg.k;
          const candle: Candle = {
            o: parseFloat(k.o), h: parseFloat(k.h), l: parseFloat(k.l), c: parseFloat(k.c),
            v: parseFloat(k.v), t: k.t
          };
          const newPrice = candle.c;
          const prev = state.price;
          state.priceDir = prev !== null ? (newPrice >= prev ? 'up' : 'down') : null;
          state.price = newPrice;

          const lastT = state.buf.m1.length > 0 ? state.buf.m1[state.buf.m1.length - 1].t : -1;
          if (k.x) {
            if (lastT === candle.t) {
              state.buf.m1[state.buf.m1.length - 1] = candle;
            } else {
              state.buf.m1.push(candle);
              if (state.buf.m1.length > 200) state.buf.m1.shift();
            }
          } else {
            if (lastT === candle.t) {
              state.buf.m1[state.buf.m1.length - 1] = candle;
            } else {
              state.buf.m1.push(candle);
              if (state.buf.m1.length > 200) state.buf.m1.shift();
            }
          }
          notify(asset);
        } catch {}
      };

      ws.onclose = () => {
        state.connected = false;
        state.ws = null;
        notify(asset);
        setTimeout(() => {
          if ((assets.get(asset)?.refCount ?? 0) > 0) {
            state.loading = false;
            connectCrypto(asset);
          }
        }, 3000);
      };

      ws.onerror = () => {
        state.connected = false;
        notify(asset);
      };
    })
    .catch(() => {
      clearTimeout(timeout);
      state.loading = false;
      state.connected = false;
      startOU(asset);
    });
}

function connectOU(asset: string) {
  const state = assets.get(asset)!;
  if (state.connected) return;
  startOU(asset);
}

export function subscribeAsset(
  asset: string,
  id: string,
  cb: Subscriber
): () => void {
  const state = getOrCreate(asset);
  state.subscribers.set(id, cb);
  state.refCount++;

  const category = ASSET_CATEGORIES[asset] || 'forex';

  if (state.price !== null) {
    cb(state.buf, state.price, state.priceDir, state.connected, state.buf.m1.length);
  }

  if (!state.connected && !state.loading) {
    if (category === 'crypto') connectCrypto(asset);
    else connectOU(asset);
  }

  return () => {
    state.subscribers.delete(id);
    state.refCount--;
    if (state.refCount <= 0) {
      state.ws?.close();
      state.ws = null;
      if (state.ouTimer) clearInterval(state.ouTimer);
      if (state.ouLiveTimer) clearInterval(state.ouLiveTimer);
      state.ouTimer = null;
      state.ouLiveTimer = null;
      state.connected = false;
      state.loading = false;
      assets.delete(asset);
    }
  };
}

export function getAssetBuffer(asset: string): CandleBuffer | null {
  return assets.get(asset)?.buf ?? null;
}
