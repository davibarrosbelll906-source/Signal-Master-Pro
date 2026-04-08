/**
 * BackendSignalEngine — Orchestrator
 * Runs every second, fires runEngine at :48 for each active asset.
 * Timeframe is synced from the frontend via Socket.io `change_timeframe`.
 * Uses shouldTriggerSignal() to fire only at the correct minutes.
 */

import type { Server as IOServer, Socket } from 'socket.io';
import { getBuffer, onBufferUpdate, initAllAssets } from './assetDataManager.js';
import { runEngine, ASSET_CATEGORIES, type SignalResult } from './signalEngine.js';
import { generateLunaExplanation } from './lunaExplainer.js';
import { initNewsFilter, checkNewsBlackoutSync } from './newsFilter.js';
import { askLunaOracle, ORACLE_MIN_SCORE } from './lunaOracle.js';

const ALL_ASSETS = [
  'BTCUSD', 'ETHUSD', 'SOLUSD', 'BNBUSD', 'XRPUSD', 'ADAUSD', 'DOGEUSD', 'LTCUSD',
  'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD', 'EURGBP', 'GBPJPY',
  'XAUUSD', 'XAGUSD', 'USOIL'
];

// Anti-overtrade: maximum 1 signal per pair every 4 minutes
const lastSignalTime = new Map<string, number>();

// Latest signal per asset (for REST fallback)
const latestSignals = new Map<string, SignalResult>();

// Per-socket timeframe tracking (defaults to M1)
const socketTimeframes = new Map<string, string>();

// Global default timeframe (used when no socket preference is known)
let globalTimeframe: string = 'M1';

// ── Adaptive Performance Memory (Solução 3) ───────────────────────────────
// Chave: "EURUSD-M5" → win rate (0.45–0.92), inicializa em 0.65 (neutro)
const performanceMemory = new Map<string, number>();

function getPerformanceWR(asset: string, timeframe: string): number {
  return performanceMemory.get(`${asset}-${timeframe}`) ?? 0.65;
}

export function updatePerformance(asset: string, timeframe: string, isWin: boolean) {
  const key = `${asset}-${timeframe}`;
  let current = performanceMemory.get(key) ?? 0.65;
  current = isWin ? current + 0.015 : current - 0.012;
  current = Math.max(0.45, Math.min(0.92, current));
  performanceMemory.set(key, current);
}

export function getLatestSignals() {
  return Object.fromEntries(latestSignals);
}

function shouldThrottle(asset: string): boolean {
  const last = lastSignalTime.get(asset) || 0;
  return Date.now() - last < 240_000; // 4 minutes
}

/**
 * Verifica se deve disparar o sinal no minuto atual baseado no timeframe.
 * Alinha com abertura dos candles das corretoras:
 *   M1:  todo minuto (00, 01, 02, ...)
 *   M5:  minutos 00, 05, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55
 *   M15: minutos 00, 15, 30, 45
 */
function shouldTriggerSignal(currentMinute: number, timeframe: string): boolean {
  switch (timeframe) {
    case 'M5':  return currentMinute % 5 === 0;
    case 'M15': return currentMinute % 15 === 0;
    case 'M1':
    default:    return true;
  }
}

/**
 * Sugere expiração em minutos baseado no timeframe
 */
export function suggestExpiry(timeframe: string): number {
  switch (timeframe) {
    case 'M5':  return 5;
    case 'M15': return 15;
    case 'M1':
    default:    return 1;
  }
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

  // Handle socket connections
  io.on('connection', (socket: Socket) => {
    // Set default timeframe for this socket
    socketTimeframes.set(socket.id, globalTimeframe);

    // Send current snapshots to newly connected client
    for (const [asset, signal] of latestSignals) {
      socket.emit('new_signal', signal);
    }
    for (const asset of ALL_ASSETS) {
      const buf = getBuffer(asset);
      if (buf) {
        socket.emit('price_update', { asset, price: buf.price, connected: buf.connected, bufSize: buf.m1.length });
      }
    }

    // Frontend → Backend: timeframe change
    socket.on('change_timeframe', (timeframe: string) => {
      if (['M1', 'M5', 'M15'].includes(timeframe)) {
        socketTimeframes.set(socket.id, timeframe);
        globalTimeframe = timeframe; // update global for single-user simplicity
        console.log(`[SignalEngine] ⏱️ Timeframe atualizado → ${timeframe} (socket: ${socket.id})`);
        // Confirm back to the client
        socket.emit('timeframe_changed', { timeframe });
      }
    });

    // Recebe resultado WIN/LOSS do frontend → atualiza memória adaptativa
    socket.on('signal_result', (data: { asset: string; timeframe: string; isWin: boolean }) => {
      if (data?.asset && data?.timeframe && typeof data.isWin === 'boolean') {
        updatePerformance(data.asset, data.timeframe, data.isWin);
        const wr = Math.round(getPerformanceWR(data.asset, data.timeframe) * 100);
        console.log(`[Memory] ${data.asset}/${data.timeframe} ${data.isWin ? '✅ WIN' : '❌ LOSS'} → WR: ${wr}%`);
      }
    });

    socket.on('disconnect', () => {
      socketTimeframes.delete(socket.id);
    });
  });

  // ── Async processor: quant + Oracle (parallel per asset) ─────────────────
  async function processAsset(asset: string, tf: string): Promise<void> {
    const buf = getBuffer(asset);
    if (!buf || buf.m1.length < 30) return;
    if (shouldThrottle(asset)) return;

    const newsCheck = checkNewsBlackoutSync(asset);
    if (newsCheck.active) {
      const dir = newsCheck.minutesUntil && newsCheck.minutesUntil > 0 ? 'em' : 'há';
      const mins = Math.abs(newsCheck.minutesUntil ?? 0);
      console.log(`[NewsFilter] ${asset} bloqueado — ${newsCheck.eventTitle} ${dir} ${mins}min`);
      io.emit('news_blackout', { asset, event: newsCheck.eventTitle, minutesUntil: newsCheck.minutesUntil });
      return;
    }

    const pairWR = getPerformanceWR(asset, tf);
    const result = runEngine(buf.m1, asset, pairWR);
    if (!result) return;

    // ── Signals that didn't pass quant — broadcast as blocked (no Oracle) ──
    if (!result.passed) {
      const tagged = { ...result, timeframe: tf, oracleApproved: false };
      latestSignals.set(asset, tagged);
      io.emit('new_signal', tagged);
      if (result.blockedBy) {
        console.log(`[SignalEngine] ${asset} ✗ ${result.score}% | ${result.blockedBy}`);
      }
      return;
    }

    // ── Signal passed quant filter ─────────────────────────────────────────
    lastSignalTime.set(asset, Date.now());

    // Emit immediately so UI shows FORTE/PREMIUM instantly (before Oracle)
    const preOracle = { ...result, timeframe: tf, oracleApproved: false, oraclePending: true };
    latestSignals.set(asset, preOracle);
    io.emit('new_signal', preOracle);

    console.log(`[SignalEngine] ${asset} → ${result.direction} ${result.score}% (${result.quality}) [${tf}] — enviando para Oracle...`);

    // ── Luna Oracle: approval gate (only if score >= ORACLE_MIN_SCORE) ──────
    if (result.score >= ORACLE_MIN_SCORE) {
      try {
        const oracle = await askLunaOracle(result);

        if (!oracle.approved) {
          // Oracle BLOQUEOU — atualiza sinal para rejected
          const rejected: SignalResult = {
            ...result,
            timeframe: tf,
            passed: false,
            oracleApproved: false,
            oracleConfidence: oracle.confidence,
            oracleReason: oracle.reason,
            blockedBy: `Luna Oracle bloqueou: ${oracle.reason}`,
          } as SignalResult & { timeframe: string };

          latestSignals.set(asset, rejected as any);
          io.emit('new_signal', rejected);
          console.log(`[Oracle] 🚫 ${asset} BLOQUEADO — ${oracle.reason}`);
          return;
        }

        // Oracle APROVOU — calcula score final com boost
        const rawFinal = result.score + oracle.scoreBoost;
        const finalScore = Math.min(99, Math.max(result.score, rawFinal)); // boost só aumenta
        const approved: SignalResult = {
          ...result,
          score: Math.round(finalScore),
          timeframe: tf,
          oracleApproved: true,
          oracleConfidence: oracle.confidence,
          oracleReason: oracle.reason,
          oracleScore: Math.round(finalScore),
        } as SignalResult & { timeframe: string };

        latestSignals.set(asset, approved as any);
        io.emit('new_signal', approved);
        console.log(`[Oracle] ✅ ${asset} APROVADO — ${oracle.reason} | Oracle: ${oracle.confidence}% | Score final: ${Math.round(finalScore)}%`);

        // Explicação da Luna (fire-and-forget, não bloqueia)
        generateLunaExplanation({
          asset: approved.asset,
          direction: approved.direction,
          score: approved.score,
          quality: approved.quality,
          adx: approved.adx,
          rsi: approved.rsi,
          entropy: approved.entropy,
          consensus: approved.consensus,
          marketRegime: approved.marketRegime,
          sess: approved.sess,
          category: approved.category,
          ts: approved.ts,
        }, io).catch(() => {});

      } catch {
        // Oracle falhou completamente — mantém sinal sem oracle stamp
        console.warn(`[Oracle] Erro crítico para ${asset} — mantendo sinal original`);
      }
    } else {
      // Score abaixo do mínimo Oracle — emite sem badge oracle
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
  }

  // Run signal engine every second
  setInterval(() => {
    const now = new Date();
    const second = now.getSeconds();
    const minute = now.getMinutes();

    if (second !== 48) return;

    if (!shouldTriggerSignal(minute, globalTimeframe)) return;

    const tf = globalTimeframe;
    console.log(`[SignalEngine] 🕐 Disparo ${tf} — minuto :${String(minute).padStart(2,'0')}`);

    // Processa todos os assets em PARALELO (Oracle calls concorrentes)
    Promise.allSettled(
      ALL_ASSETS.map(asset => processAsset(asset, tf))
    ).catch(() => {});
  }, 1000);

  console.log('[SignalEngine] Backend signal engine started');
}
