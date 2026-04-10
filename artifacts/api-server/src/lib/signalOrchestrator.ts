/**
 * ══════════════════════════════════════════════════════════════════════
 *  SIGNALMASTER PRO — signalOrchestrator.ts
 *  Pipeline de 3 estágios: velocidade + assertividade sem trade-off.
 *
 *  Estágio 1 (tick):   pre-filter barato (<2ms) — zona S/R + OBV
 *  Estágio 2 (parcial): mid-filter no candle aberto (<5ms)
 *  Estágio 3 (close):  engine completo (~10-15ms), só roda ~5% das vezes
 * ══════════════════════════════════════════════════════════════════════
 */

import {
  calcATR, calcEMA, calcRSI, calcOBVTrend,
  detectSRBounce, detectBBSqueeze, detectMarketRegime,
  deriveM5, runEngine,
  type Candle, type SignalResult,
} from './signalEngine.js';

import type { AssetBuffer } from './assetDataManager.js';

// ─────────────────────────────────────────────────────────────────────
//  TIPOS
// ─────────────────────────────────────────────────────────────────────

export type SignalHandler = (result: SignalResult) => void;

interface WarmSignal {
  direction: 'CALL' | 'PUT';
  detectedAt: number;
  candleOpenT: number;
  preScore: number;
}

// ─────────────────────────────────────────────────────────────────────
//  ESTADO INTERNO
// ─────────────────────────────────────────────────────────────────────

const warmMap              = new Map<string, WarmSignal>();
const signalHandlers: SignalHandler[] = [];
const lastProcessedCandle  = new Map<string, number>();

const pipelineStats = {
  stage1_checked: 0,
  stage1_passed:  0,
  stage2_checked: 0,
  stage2_passed:  0,
  stage3_checked: 0,
  stage3_emitted: 0,
};

// ─────────────────────────────────────────────────────────────────────
//  REGISTRO DE HANDLERS
// ─────────────────────────────────────────────────────────────────────

export function onSignalReady(handler: SignalHandler): void {
  signalHandlers.push(handler);
}

function emit(result: SignalResult): void {
  for (const h of signalHandlers) {
    try { h(result); } catch (e) { console.error('[Orchestrator] Handler error:', e); }
  }
}

// ─────────────────────────────────────────────────────────────────────
//  ESTÁGIO 1 — Pre-filter  (<2ms por tick)
//  Descarta 90%+ dos ticks com 2 checks baratos.
// ─────────────────────────────────────────────────────────────────────

function stage1PreFilter(buf: AssetBuffer, asset: string): boolean {
  pipelineStats.stage1_checked++;

  const { m1, price } = buf;
  if (m1.length < 50) return false;

  const slice  = m1.slice(-50);
  const closes = slice.map(c => c.c);
  const highs  = slice.map(c => c.h);
  const lows   = slice.map(c => c.l);
  const vols   = slice.map(c => c.v);

  // Check 1: preço dentro de 2×ATR de uma zona S/R (fractal de 3 barras)
  const atr = calcATR(highs, lows, closes, 14);
  if (atr === 0) return false;

  const proximity = atr * 2.0;
  let nearZone = false;
  for (let i = 3; i < highs.length - 3 && !nearZone; i++) {
    if (highs[i] > highs[i-1] && highs[i] > highs[i-2] &&
        highs[i] > highs[i+1] && highs[i] > highs[i+2]) {
      if (Math.abs(price - highs[i]) <= proximity) nearZone = true;
    }
    if (lows[i] < lows[i-1] && lows[i] < lows[i-2] &&
        lows[i] < lows[i+1] && lows[i] < lows[i+2]) {
      if (Math.abs(price - lows[i]) <= proximity) nearZone = true;
    }
  }
  if (!nearZone) return false;

  // Check 2: OBV com pressão direcional
  const obv = calcOBVTrend(closes, vols, 8);
  if (obv === 'flat') return false;

  pipelineStats.stage1_passed++;
  return true;
}

// ─────────────────────────────────────────────────────────────────────
//  ESTÁGIO 2 — Mid-filter no candle parcial (<5ms)
//  Detecta setup antes do fechamento. Retorna direção + preScore ou null.
// ─────────────────────────────────────────────────────────────────────

function stage2MidFilter(
  m1: Candle[],
  asset: string
): { direction: 'CALL' | 'PUT'; preScore: number } | null {
  pipelineStats.stage2_checked++;

  const live   = m1[m1.length - 1];
  const prev   = m1.slice(0, -1);
  const closes = prev.map(c => c.c);
  const highs  = prev.map(c => c.h);
  const lows   = prev.map(c => c.l);

  if (closes.length < 30) return null;

  const rsi = calcRSI(closes, 14);
  if (rsi > 75 || rsi < 25) return null;

  const m5c   = deriveM5(m1).map(c => c.c);
  const m5e9  = calcEMA(m5c, 9);
  const m5e21 = calcEMA(m5c, 21);
  if (m5e9.length === 0 || m5e21.length === 0) return null;
  const htfBull = m5e9[m5e9.length - 1] > m5e21[m5e21.length - 1];

  const body      = Math.abs(live.c - live.o) || 0.001;
  const lowerWick = Math.min(live.o, live.c) - live.l;
  const upperWick = live.h - Math.max(live.o, live.c);
  const hasLowerWick = lowerWick > body * 1.5;
  const hasUpperWick = upperWick > body * 1.5;

  const sr = detectSRBounce(
    [...highs, live.h],
    [...lows,  live.l],
    [...closes, live.c]
  );

  let direction: 'CALL' | 'PUT' | null = null;
  let preScore = 0;

  if (sr.nearSupport && hasLowerWick && htfBull && rsi < 60) {
    direction = 'CALL';
    preScore  = 0.55
      + (sr.supportStrength >= 5 ? 0.15 : sr.supportStrength >= 3 ? 0.08 : 0)
      + (rsi < 40 ? 0.10 : rsi < 50 ? 0.05 : 0)
      + (lowerWick > body * 2.5 ? 0.08 : 0);
  } else if (sr.nearResistance && hasUpperWick && !htfBull && rsi > 40) {
    direction = 'PUT';
    preScore  = 0.55
      + (sr.resistanceStrength >= 5 ? 0.15 : sr.resistanceStrength >= 3 ? 0.08 : 0)
      + (rsi > 60 ? 0.10 : rsi > 50 ? 0.05 : 0)
      + (upperWick > body * 2.5 ? 0.08 : 0);
  }

  if (!direction) return null;

  const regime = detectMarketRegime(
    [...highs, live.h],
    [...lows,  live.l],
    [...closes, live.c]
  );
  if (regime === 'CHOPPY') return null;

  pipelineStats.stage2_passed++;
  return { direction, preScore: Math.min(0.97, preScore) };
}

// ─────────────────────────────────────────────────────────────────────
//  ESTÁGIO 3 — Engine completo no fechamento (~10-15ms)
//  Só roda quando o par está "quente" no warmMap.
// ─────────────────────────────────────────────────────────────────────

function stage3OnClose(
  buf: AssetBuffer,
  asset: string,
  warm: WarmSignal,
  pairWR?: number
): void {
  pipelineStats.stage3_checked++;

  const result = runEngine(buf.m1, asset, pairWR);
  if (!result) {
    console.log(`[Orchestrator] ${asset}: bloqueado no Stage3`);
    return;
  }

  if (result.direction !== warm.direction) {
    console.log(`[Orchestrator] ${asset}: direção mudou no close (${warm.direction}→${result.direction}) — descartando`);
    return;
  }

  pipelineStats.stage3_emitted++;
  console.log(`[Orchestrator] ✅ SINAL ${asset} ${result.direction} | ${result.quality} | score:${result.score}`);
  emit(result);
}

// ─────────────────────────────────────────────────────────────────────
//  PONTOS DE ENTRADA — chame a partir do assetDataManager
// ─────────────────────────────────────────────────────────────────────

/**
 * Chame a cada tick (atualização de preço).
 * Roda Estágio 1 e, se passar, atualiza o Estágio 2 (máx 1×/15s).
 * Custo: <2ms.
 */
export function orchestratorOnTick(buf: AssetBuffer, asset: string): void {
  if (!stage1PreFilter(buf, asset)) {
    warmMap.delete(asset);
    return;
  }

  const existing = warmMap.get(asset);
  const now = Date.now();
  const shouldRunStage2 = !existing || (now - existing.detectedAt) > 15_000;
  if (!shouldRunStage2) return;

  const mid = stage2MidFilter(buf.m1, asset);
  if (!mid) {
    warmMap.delete(asset);
    return;
  }

  const currentCandleT = buf.m1[buf.m1.length - 1]?.t ?? now;
  warmMap.set(asset, {
    direction:   mid.direction,
    detectedAt:  now,
    candleOpenT: currentCandleT,
    preScore:    mid.preScore,
  });

  console.log(`[Orchestrator] 🔥 ${asset} QUENTE — ${mid.direction} | preScore:${Math.round(mid.preScore * 100)}%`);
}

/**
 * Chame quando um candle M1 fecha (isClosed === true).
 * Roda o engine completo apenas se o par estiver quente.
 * Custo: ~10-15ms, mas só roda ~5% das vezes.
 */
export function orchestratorOnClose(
  buf: AssetBuffer,
  asset: string,
  pairWR?: number
): void {
  const warm = warmMap.get(asset);
  if (!warm) return;

  const closedCandleT = buf.m1[buf.m1.length - 1]?.t ?? 0;
  if (closedCandleT < warm.candleOpenT) return;

  const lastT = lastProcessedCandle.get(asset) ?? 0;
  if (closedCandleT <= lastT) return;
  lastProcessedCandle.set(asset, closedCandleT);

  stage3OnClose(buf, asset, warm, pairWR);
  warmMap.delete(asset);
}

// ─────────────────────────────────────────────────────────────────────
//  UTILITÁRIOS
// ─────────────────────────────────────────────────────────────────────

export function getPipelineStats() {
  return {
    ...pipelineStats,
    stage1_pass_rate: pipelineStats.stage1_checked > 0
      ? `${Math.round(pipelineStats.stage1_passed / pipelineStats.stage1_checked * 100)}%`
      : '—',
    stage2_pass_rate: pipelineStats.stage2_checked > 0
      ? `${Math.round(pipelineStats.stage2_passed / pipelineStats.stage2_checked * 100)}%`
      : '—',
    stage3_pass_rate: pipelineStats.stage3_checked > 0
      ? `${Math.round(pipelineStats.stage3_emitted / pipelineStats.stage3_checked * 100)}%`
      : '—',
  };
}

export function getWarmAssets(): string[] {
  return Array.from(warmMap.keys());
}
