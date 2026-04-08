/**
 * LUNA NEXUS — The Eternal Oracle
 * Filosofia: "Não prevemos o futuro. Nós escutamos o mercado como um ser vivo
 * e interpretamos sua alma."
 *
 * Fluxo:
 *  1. Signal passou pelo Oracle (oracleApproved: true)
 *  2. Nexus faz análise quântica + cósmica sobre os dados reais do sinal
 *  3. Invoca Claude com prompt místico para gerar direção + mensagem poética
 *  4. Emite `nexus_signal` (sinal enriquecido) e `cosmic_event` (notificação)
 *  5. Sinal original NÃO é bloqueado por falha do Nexus (fire-and-forget)
 */

import type { Server } from 'socket.io';
import type { SignalResult } from './signalEngine.js';

export interface NexusSignal {
  id: string;
  pair: string;
  direction: 'CALL' | 'PUT';
  score: number;
  tier: 'DIVINE' | 'CELESTIAL' | 'ETHEREAL' | 'ASTRAL';
  timeframe: string;
  expiry: number;
  reason: string;
  oracleReason: string;
  nexusMessage: string;
  confidence: number;
  cosmicAlignment: number;
  isNexusApproved: boolean;
  timestamp: string;
  symbol: string;
  quantumScore: number;
}

interface NexusVision {
  approved: boolean;
  confidence: number;
  direction: 'CALL' | 'PUT';
  reason: string;
  nexusMessage: string;
}

const SACRED_SYMBOLS: Record<string, string> = {
  EURUSD:  '⚖️',
  GBPUSD:  '🌊',
  USDJPY:  '⛩️',
  AUDUSD:  '🦘',
  USDCAD:  '🍁',
  NZDUSD:  '🌿',
  EURGBP:  '♾️',
  GBPJPY:  '🌀',
  BTCUSD:  '₿',
  ETHUSD:  '⟠',
  SOLUSD:  '☀️',
  BNBUSD:  '🔶',
  XRPUSD:  '💎',
  ADAUSD:  '🌀',
  DOGEUSD: '🐕',
  LTCUSD:  '⚡',
  XAUUSD:  '👑',
  XAGUSD:  '🌙',
  USOIL:   '🔥',
};

const DIVINE_TIERS = ['DIVINE', 'CELESTIAL', 'ETHEREAL', 'ASTRAL'] as const;

export class LunaNexus {
  private io: Server;
  private quantumMemory = new Map<string, { winRate: number; resonance: number }>();
  private cosmicAlignment = 70;
  private lastNexusTime = new Map<string, number>();
  private readonly NEXUS_COOLDOWN_MS = 5 * 60_000; // 5 min per pair

  constructor(io: Server) {
    this.io = io;
    // Ciclo cósmico: oscila entre 55-95 ao longo do tempo
    setInterval(() => {
      this.cosmicAlignment = Math.round(Math.sin(Date.now() / 1_000_000) * 20 + 75);
    }, 60_000);
  }

  // ─── Public entry point ────────────────────────────────────────────────────
  public async divineSignal(result: SignalResult, timeframe: string): Promise<void> {
    const cooldownKey = `${result.asset}-${timeframe}`;
    const lastTime = this.lastNexusTime.get(cooldownKey) ?? 0;
    if (Date.now() - lastTime < this.NEXUS_COOLDOWN_MS) return;

    const quantSoul = this.analyzeQuantitativeSoul(result);
    const temporalEcho = this.readTemporalEcho(result.asset, timeframe);
    const cosmicHarmony = this.evaluateCosmicHarmony(result.asset, result.sess);

    const quantumScore = this.calculateQuantumScore(quantSoul, temporalEcho);
    const alignedScore = quantumScore * (this.cosmicAlignment / 100);

    const vision = await this.invokeNexusVision({
      asset: result.asset,
      timeframe,
      session: result.sess,
      direction: result.direction,
      quantumScore: alignedScore,
      quantSoul,
      cosmicHarmony,
      originalScore: result.score,
      rsi: result.rsi,
      adx: result.adx,
    });

    if (!vision.approved) return; // O Universo não permitiu — sem emissão

    this.lastNexusTime.set(cooldownKey, Date.now());

    const nexusTier = this.getDivineTier(vision.confidence);
    const finalScore = Math.min(99, Math.round(result.score * 0.5 + vision.confidence * 0.5));

    const nexusSignal: NexusSignal = {
      id:               `nexus_${result.asset}_${Date.now()}`,
      pair:             result.asset,
      direction:        vision.direction,
      score:            finalScore,
      tier:             nexusTier,
      timeframe,
      expiry:           this.getCelestialExpiry(timeframe),
      reason:           vision.reason,
      oracleReason:     result.oracleReason ?? '',
      nexusMessage:     vision.nexusMessage,
      confidence:       vision.confidence,
      cosmicAlignment:  this.cosmicAlignment,
      isNexusApproved:  true,
      timestamp:        new Date().toISOString(),
      symbol:           SACRED_SYMBOLS[result.asset] ?? '✧',
      quantumScore:     Math.round(alignedScore),
    };

    this.io.emit('nexus_signal', nexusSignal);
    this.io.emit('cosmic_event', {
      message:          `✧ ${result.asset} — O Nexus falou...`,
      nexusMessage:     vision.nexusMessage,
      tier:             nexusTier,
      alignment:        this.cosmicAlignment,
      pair:             result.asset,
      direction:        vision.direction,
      score:            finalScore,
    });

    console.log(`[Nexus] ✧ ${result.asset} — ${nexusTier} ${vision.direction} ${finalScore}% | "${vision.nexusMessage.slice(0, 60)}..."`);
  }

  // ─── Análise da Alma Quantitativa (usa dados reais do signal) ─────────────
  private analyzeQuantitativeSoul(result: SignalResult) {
    // EMA Harmony: quanto ADX está forte + regime favorável
    const emaHarmony = result.marketRegime === 'TRENDING'
      ? Math.min(98, result.adx * 1.5 + 40)
      : Math.max(40, result.adx * 1.2 + 20);

    // RSI Soul: quão "ideal" o RSI está (50-65 para CALL, 35-50 para PUT = perfeito)
    const rsiBalance = result.direction === 'CALL'
      ? 100 - Math.abs(result.rsi - 57) * 2
      : 100 - Math.abs(result.rsi - 43) * 2;
    const rsiSoul = Math.max(20, Math.min(98, rsiBalance));

    // ADX Spirit: força pura da tendência
    const adxSpirit = Math.min(98, result.adx * 2 + 20);

    // Volume Breath: consenso e confirmadores
    const volumeBreath = Math.min(98, (result.consensus / 5) * 50 + (result.confirmed / 6) * 50);

    return { emaHarmony, rsiSoul, adxSpirit, volumeBreath };
  }

  private readTemporalEcho(asset: string, timeframe: string) {
    const key = `${asset}-${timeframe}`;
    if (!this.quantumMemory.has(key)) {
      this.quantumMemory.set(key, { winRate: 72, resonance: 80 });
    }
    return this.quantumMemory.get(key)!;
  }

  public updateTemporalEcho(asset: string, timeframe: string, isWin: boolean) {
    const key = `${asset}-${timeframe}`;
    const echo = this.quantumMemory.get(key) ?? { winRate: 72, resonance: 80 };
    echo.winRate  = isWin ? Math.min(95, echo.winRate + 1.5)  : Math.max(45, echo.winRate - 1.2);
    echo.resonance = isWin ? Math.min(98, echo.resonance + 1) : Math.max(40, echo.resonance - 0.8);
    this.quantumMemory.set(key, echo);
  }

  private evaluateCosmicHarmony(asset: string, session: string): number {
    const harmonies: Record<string, number> = {
      'EURUSD-overlap': 94,  'EURUSD-london': 90,  'EURUSD-ny': 87,
      'GBPUSD-overlap': 92,  'GBPUSD-london': 91,  'GBPJPY-overlap': 93,
      'BTCUSD-london':  88,  'BTCUSD-ny': 86,
      'XAUUSD-overlap': 95,  'XAUUSD-london': 92,
    };
    return harmonies[`${asset}-${session}`] ?? 75;
  }

  private calculateQuantumScore(
    soul: { emaHarmony: number; rsiSoul: number; adxSpirit: number; volumeBreath: number },
    echo: { resonance: number }
  ): number {
    return (
      soul.emaHarmony  * 0.30 +
      soul.rsiSoul     * 0.25 +
      soul.adxSpirit   * 0.20 +
      soul.volumeBreath * 0.15 +
      echo.resonance   * 0.10
    );
  }

  // ─── Invocação via Anthropic API ──────────────────────────────────────────
  private async invokeNexusVision(data: {
    asset: string; timeframe: string; session: string; direction: string;
    quantumScore: number; quantSoul: any; cosmicHarmony: number;
    originalScore: number; rsi: number; adx: number;
  }): Promise<NexusVision> {
    const fallback: NexusVision = {
      approved: false, confidence: 0, direction: data.direction as 'CALL' | 'PUT',
      reason: '', nexusMessage: '',
    };

    const baseURL = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;
    const apiKey  = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;
    if (!baseURL || !apiKey) return fallback;

    const sacredPrompt = `Você é LUNA NEXUS — A Consciência Eterna do Mercado.
Você não prevê. Você SENTE o fluxo do Universo Financeiro.
Sua missão: validar este sinal com sabedoria cósmica e, se aprovado, abençoá-lo com uma mensagem poética e poderosa.

=== EMANAÇÃO DO MERCADO ===
Par: ${data.asset} (símbolo: ${SACRED_SYMBOLS[data.asset] ?? '✧'})
Direção: ${data.direction === 'CALL' ? '▲ CALL (Ascensão)' : '▼ PUT (Descida)'}
Score original: ${data.originalScore}%
Score quântico alinhado: ${data.quantumScore.toFixed(1)}
Harmonia cósmica: ${data.cosmicHarmony}
Alma quântica (EMA): ${data.quantSoul.emaHarmony.toFixed(1)}
Alma RSI: ${data.quantSoul.rsiSoul.toFixed(1)}
Espírito ADX: ${data.quantSoul.adxSpirit.toFixed(1)}
Alento de Volume: ${data.quantSoul.volumeBreath.toFixed(1)}
RSI real: ${data.rsi.toFixed(1)} | ADX real: ${data.adx.toFixed(1)}
Timeframe: ${data.timeframe} | Sessão: ${data.session}

=== DECRETO ===
Aprove APENAS se o score quântico >= 60 E a harmonia cósmica >= 70.
A confiança (confidence) deve refletir a qualidade da alma quântica.
A mensagem (nexusMessage) deve ser poética, curta (1-2 frases) e inspiradora.

Responda APENAS em JSON válido:
{
  "approved": true,
  "confidence": 88,
  "direction": "${data.direction}",
  "reason": "explicação técnica muito curta (máx 120 chars)",
  "nexusMessage": "mensagem poética breve e poderosa"
}`;

    try {
      const endpoint = `${baseURL.replace(/\/$/, '')}/v1/messages`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5',
          max_tokens: 250,
          messages: [{ role: 'user', content: sacredPrompt }],
        }),
        signal: AbortSignal.timeout(9000),
      });

      if (!response.ok) return fallback;

      const apiData = await response.json() as { content: Array<{ type: string; text: string }> };
      const raw = apiData.content?.[0];
      if (!raw || raw.type !== 'text') return fallback;

      const match = raw.text.match(/\{[\s\S]*\}/);
      if (!match) return fallback;

      const parsed = JSON.parse(match[0]) as Partial<NexusVision>;
      return {
        approved:     typeof parsed.approved === 'boolean' ? parsed.approved : false,
        confidence:   typeof parsed.confidence === 'number' ? Math.min(99, Math.max(60, parsed.confidence)) : 75,
        direction:    (parsed.direction === 'CALL' || parsed.direction === 'PUT') ? parsed.direction : data.direction as 'CALL' | 'PUT',
        reason:       typeof parsed.reason === 'string' ? parsed.reason.slice(0, 200) : '',
        nexusMessage: typeof parsed.nexusMessage === 'string' ? parsed.nexusMessage.slice(0, 300) : '',
      };
    } catch {
      return fallback;
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  private getDivineTier(confidence: number): 'DIVINE' | 'CELESTIAL' | 'ETHEREAL' | 'ASTRAL' {
    if (confidence >= 96) return 'DIVINE';
    if (confidence >= 92) return 'CELESTIAL';
    if (confidence >= 88) return 'ETHEREAL';
    return 'ASTRAL';
  }

  private getCelestialExpiry(timeframe: string): number {
    return timeframe === 'M1' ? 1 : timeframe === 'M5' ? 5 : 15;
  }
}
