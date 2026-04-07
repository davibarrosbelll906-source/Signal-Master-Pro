/**
 * AssetDataManager — Singleton that maintains ONE WebSocket per crypto asset
 * and ONE OU simulator per forex/commodity asset.
 * All components (SignalsPage, PairMonitorCard) subscribe to the SAME buffer,
 * so the signal engine always sees identical data regardless of which component
 * calls it.
 */

import {
  ASSET_CATEGORIES, CRYPTO_SYMBOLS, BASE_PRICES,
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

function connectCrypto(asset: string) {
  const state = assets.get(asset)!;
  if (state.loading || state.connected) return;
  state.loading = true;

  const binanceSym = CRYPTO_SYMBOLS[asset];
  if (!binanceSym) { state.loading = false; return; }

  fetch(`https://api.binance.com/api/v3/klines?symbol=${binanceSym.toUpperCase()}&interval=1m&limit=200`)
    .then(r => r.json())
    .then((data: any[]) => {
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

      // Open WebSocket stream
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

          if (k.x) {
            state.buf.m1.push(candle);
            if (state.buf.m1.length > 200) state.buf.m1.shift();
          } else if (state.buf.m1.length > 0) {
            state.buf.m1[state.buf.m1.length - 1] = candle;
          }
          notify(asset);
        } catch {}
      };

      ws.onclose = () => {
        state.connected = false;
        state.ws = null;
        notify(asset);
        // Auto-reconnect after 3s if still has subscribers
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
      state.loading = false;
      state.connected = false;
      notify(asset);
    });
}

function connectOU(asset: string) {
  const state = assets.get(asset)!;
  if (state.connected) return;

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

  state.buf.m1 = history;
  state.ouPrice = p;
  state.price = p;
  state.connected = true;
  notify(asset);

  state.ouTimer = setInterval(() => {
    const c = generateOUCandle(state.ouPrice, asset);
    const newP = c.c;
    state.priceDir = newP >= state.ouPrice ? 'up' : 'down';
    state.ouPrice = newP;
    state.price = newP;
    state.buf.m1.push(c);
    if (state.buf.m1.length > 200) state.buf.m1.shift();
    notify(asset);
  }, 60000);
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Subscribe to an asset's data stream.
 * Returns an unsubscribe function.
 */
export function subscribeAsset(
  asset: string,
  id: string,
  cb: Subscriber
): () => void {
  const state = getOrCreate(asset);
  state.subscribers.set(id, cb);
  state.refCount++;

  const category = ASSET_CATEGORIES[asset] || 'forex';

  // Emit current state immediately if we already have data
  if (state.price !== null) {
    cb(state.buf, state.price, state.priceDir, state.connected, state.buf.m1.length);
  }

  // Connect if not yet connected
  if (!state.connected && !state.loading) {
    if (category === 'crypto') connectCrypto(asset);
    else connectOU(asset);
  }

  return () => {
    state.subscribers.delete(id);
    state.refCount--;
    if (state.refCount <= 0) {
      // Tear down connection when no more subscribers
      state.ws?.close();
      state.ws = null;
      if (state.ouTimer) clearInterval(state.ouTimer);
      state.ouTimer = null;
      state.connected = false;
      state.loading = false;
      assets.delete(asset);
    }
  };
}

/**
 * Get the current buffer snapshot for an asset (for one-shot reads).
 */
export function getAssetBuffer(asset: string): CandleBuffer | null {
  return assets.get(asset)?.buf ?? null;
}
