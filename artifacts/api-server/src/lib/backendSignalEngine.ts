/**
 * BackendSignalEngine — Orchestrator
 * Runs every second, fires runEngine at :48 for all active assets,
 * emits signals via Socket.io.
 */

import type { Server as IOServer } from 'socket.io';
import { getBuffer, onBufferUpdate, initAllAssets } from './assetDataManager.js';
import { runEngine, ASSET_CATEGORIES, type SignalResult } from './signalEngine.js';
import { generateLunaExplanation } from './lunaExplainer.js';
import { initNewsFilter, checkNewsBlackoutSync } from './newsFilter.js';

const ALL_ASSETS = [
  'BTCUSD', 'ETHUSD', 'SOLUSD', 'BNBUSD', 'XRPUSD', 'ADAUSD', 'DOGEUSD', 'LTCUSD',
  'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD', 'EURGBP', 'GBPJPY',
  'XAUUSD', 'XAGUSD', 'USOIL'
];

// Anti-overtrade: maximum 1 signal per pair every 4 minutes
const lastSignalTime = new Map<string, number>();

// Latest signal per asset (for REST fallback)
const latestSignals = new Map<string, SignalResult>();

export function getLatestSignals() {
  return Object.fromEntries(latestSignals);
}

function shouldThrottle(asset: string): boolean {
  const last = lastSignalTime.get(asset) || 0;
  return Date.now() - last < 240_000; // 4 minutes
}

export function initSignalEngine(io: IOServer) {
  // Start data feeds
  initAllAssets(ALL_ASSETS);

  // Initialize economic news calendar filter
  initNewsFilter();

  // Broadcast price ticks to connected clients
  onBufferUpdate((asset, buf) => {
    io.emit('price_update', {
      asset,
      price: buf.price,
      connected: buf.connected,
      bufSize: buf.m1.length
    });
  });

  // Run signal engine every second
  setInterval(() => {
    const now = new Date();
    const second = now.getSeconds();
    if (second !== 48) return;

    for (const asset of ALL_ASSETS) {
      const buf = getBuffer(asset);
      if (!buf || buf.m1.length < 30) continue;
      if (shouldThrottle(asset)) continue;

      // News blackout: skip if within 15 min of high-impact event
      const newsCheck = checkNewsBlackoutSync(asset);
      if (newsCheck.active) {
        const dir = newsCheck.minutesUntil && newsCheck.minutesUntil > 0 ? 'em' : 'há';
        const mins = Math.abs(newsCheck.minutesUntil ?? 0);
        console.log(`[NewsFilter] ${asset} bloqueado — ${newsCheck.eventTitle} ${dir} ${mins}min`);
        io.emit('news_blackout', { asset, event: newsCheck.eventTitle, minutesUntil: newsCheck.minutesUntil });
        continue;
      }

      try {
        const result = runEngine(buf.m1, asset);
        if (!result) continue;

        // Always broadcast the result (frontend applies user-specific filters)
        latestSignals.set(asset, result);
        io.emit('new_signal', result);

        if (result.passed) {
          lastSignalTime.set(asset, Date.now());
          console.log(`[SignalEngine] ${asset} → ${result.direction} ${result.score}% (${result.quality})`);

          // Fire Luna explanation async — does NOT block signal delivery
          generateLunaExplanation({
            asset: result.asset,
            direction: result.direction,
            score: result.score,
            quality: result.quality,
            adx: result.adx,
            rsi: result.rsi,
            entropy: result.entropy,
            consensus: result.consensus,
            marketRegime: result.marketRegime,
            sess: result.sess,
            category: result.category,
            ts: result.ts,
          }, io).catch(() => {});
        }
      } catch (e) {
        // Swallow individual asset errors
      }
    }
  }, 1000);

  // REST endpoint helper: send current signals on client connect
  io.on('connection', (socket) => {
    // Send all current signals to newly connected client
    for (const [asset, signal] of latestSignals) {
      socket.emit('new_signal', signal);
    }
    // Send current price snapshots
    for (const asset of ALL_ASSETS) {
      const buf = getBuffer(asset);
      if (buf) {
        socket.emit('price_update', { asset, price: buf.price, connected: buf.connected, bufSize: buf.m1.length });
      }
    }
  });

  console.log('[SignalEngine] Backend signal engine started');
}
