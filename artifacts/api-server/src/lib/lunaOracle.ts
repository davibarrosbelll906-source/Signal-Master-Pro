/**
 * Claude Analyst Oracle — Camada de inteligência real do SignalMaster Pro v7.
 *
 * Fluxo:
 *  1. Motor quant gera um sinal (passed: true, score >= ORACLE_MIN_SCORE)
 *  2. Oracle envia TODOS os dados brutos dos indicadores para Claude Sonnet
 *  3. Claude analisa independentemente e decide: CONFIRM / REJECT / NEUTRAL
 *  4. Se CONFIRM: score recebe boost (+3 a +8)
 *  5. Se REJECT: score recebe penalidade severa (-10 a -20) ou sinal bloqueado
 *  6. Se NEUTRAL: score mantido, análise é exibida como contexto
 *
 * Claude recebe:
 *  - Todos os indicadores brutos (EMA9/21/50, MACD hist, BB%, OBV, Stoch, etc.)
 *  - Contexto de mercado (regime, sessão, entropia)
 *  - Padrão de vela e zona S/R
 *  - Tendência HTF (M5 e M15)
 *
 * Regras de segurança:
 *  - Timeout de 12 segundos
 *  - Se Claude não responder → aprovação automática sem análise
 *  - Cooldown de 2 minutos por par
 */

import type { SignalResult } from './signalEngine.js';

export const ORACLE_MIN_SCORE = 66; // score mínimo para Oracle consultar Claude

export interface OracleDecision {
  approved: boolean;
  confidence: number;
  scoreBoost: number;
  reason: string;
  claudeAnalysis: string;
  claudeVote: 'CONFIRM' | 'REJECT' | 'NEUTRAL';
}

// ─── Cooldown por par ────────────────────────────────────────────────────────
const oracleCooldown = new Map<string, number>();
const ORACLE_COOLDOWN_MS = 2 * 60_000;

function isOnCooldown(asset: string): boolean {
  const last = oracleCooldown.get(asset) ?? 0;
  return Date.now() - last < ORACLE_COOLDOWN_MS;
}

function markCooldown(asset: string): void {
  oracleCooldown.set(asset, Date.now());
}

const SESSION_LABELS: Record<string, string> = {
  london: 'Londres (8h–12h UTC)',
  overlap: 'Overlap London/NY (12h–17h UTC)',
  ny: 'Nova York (13h–21h UTC)',
  asia: 'Ásia (0h–8h UTC)',
};

const REGIME_LABELS: Record<string, string> = {
  TRENDING: 'TENDÊNCIA — ADX alto, direcional',
  RANGING: 'LATERAL — ADX fraco, sem direção clara',
  CHOPPY: 'CAÓTICO — movimento errático',
};

// ─── Main Oracle function ────────────────────────────────────────────────────
export async function askLunaOracle(result: SignalResult): Promise<OracleDecision> {
  const fallback: OracleDecision = {
    approved: true,
    confidence: 0,
    scoreBoost: 0,
    reason: 'Analista indisponível — aprovação automática pelo quant',
    claudeAnalysis: '',
    claudeVote: 'NEUTRAL',
  };

  if (isOnCooldown(result.asset)) return fallback;

  const baseURL = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;
  const apiKey = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;
  if (!baseURL || !apiKey) return fallback;

  const ind = result.indicators;
  const dir = result.direction === 'CALL' ? '▲ CALL (Alta)' : '▼ PUT (Baixa)';

  // ─── Build indicator analysis block ───────────────────────────────────────
  const indBlock = ind ? `
=== INDICADORES BRUTOS ===
Preço atual: ${ind.lastClose}
EMA9: ${ind.ema9} | EMA21: ${ind.ema21} | EMA50: ${ind.ema50}
  → Preço vs EMA9: ${ind.lastClose > ind.ema9 ? 'ACIMA' : 'ABAIXO'} | Preço vs EMA50: ${ind.lastClose > ind.ema50 ? 'ACIMA' : 'ABAIXO'}
  → EMA9 vs EMA21: ${ind.ema9 > ind.ema21 ? 'EMA9 > EMA21 (bull)' : 'EMA9 < EMA21 (bear)'}
  → EMA21 vs EMA50: ${ind.ema21 > ind.ema50 ? 'EMA21 > EMA50 (bull)' : 'EMA21 < EMA50 (bear)'}
MACD Histograma: ${ind.macdHist > 0 ? '+' : ''}${ind.macdHist.toFixed(6)} | Sinal: ${ind.macdSignal.toFixed(6)}
  → MACD: ${ind.macdHist > 0 ? 'POSITIVO (momentum alta)' : 'NEGATIVO (momentum baixa)'}
Bollinger %B: ${(ind.bbPct * 100).toFixed(1)}%
  → ${ind.bbPct > 0.8 ? 'PERTO DA BANDA SUPERIOR (resistência, PUT favor)' : ind.bbPct < 0.2 ? 'PERTO DA BANDA INFERIOR (suporte, CALL favor)' : 'ZONA MÉDIA (neutro)'}
OBV Tendência: ${ind.obvTrend.toUpperCase()}
  → ${ind.obvTrend === 'up' ? 'Volume confirma ALTA (CALL favor)' : ind.obvTrend === 'down' ? 'Volume confirma BAIXA (PUT favor)' : 'Volume neutro/lateral'}
Padrão de vela: ${ind.candlePattern || 'nenhum detectado'}
Força da zona S/R: ${ind.zoneStrength} toques (${ind.zoneStrength >= 5 ? 'MUITO FORTE' : ind.zoneStrength >= 3 ? 'FORTE' : 'FRACA'})
ATR%: ${(ind.atrPct * 100).toFixed(3)}% (${ind.atrPct > 0.008 ? 'volatilidade ALTA' : ind.atrPct < 0.003 ? 'volatilidade BAIXA' : 'volatilidade normal'})
Confirmação M5: ${ind.m5Bull ? 'BULLISH' : 'BEARISH'}
Confirmação M15: ${ind.m15Bull ? 'BULLISH' : 'BEARISH'}
  → HTF Confluência: ${(dir.includes('CALL') && ind.m5Bull && ind.m15Bull) || (dir.includes('PUT') && !ind.m5Bull && !ind.m15Bull) ? 'CONFIRMA a direção' : 'DIVERGE da direção'}` : '(Indicadores não disponíveis)';

  const prompt = `Você é um **analista sênior de criptomoedas** com 15 anos de experiência em análise técnica de opções binárias. Especializado na corretora Ebinex (expiração 1 minuto, pares cripto/USD).

Analise este sinal de trading e dê seu veredito independente baseado nos dados brutos dos indicadores.

=== DADOS DO SINAL ===
Par: ${result.asset} (Criptomoeda - Ebinex)
Direção proposta: ${dir}
Score quantitativo do engine: ${result.score}%
Qualidade: ${result.quality}
RSI(14): ${result.rsi}
ADX(14): ${result.adx}
Entropia Shannon: ${Math.round(result.entropy * 100)}% (>80% = mercado aleatório)
Consenso votos: ${JSON.stringify(result.votes)}
Regime de mercado: ${REGIME_LABELS[result.marketRegime] || result.marketRegime}
Sessão: ${SESSION_LABELS[result.sess] || result.sess}
${indBlock}

=== SUA ANÁLISE INDEPENDENTE ===
Com base em TODOS os dados acima, responda:

1. **Confluência dos indicadores**: Quantos indicadores confirmam a direção? (EMA, MACD, OBV, BB%, RSI, padrão de vela, HTF M5/M15)
2. **Qualidade do setup**: É um setup técnico de alta probabilidade para binária de 1 minuto?
3. **Risco identificado**: Existe algum sinal de alerta que o engine pode ter ignorado?

=== REGRAS PARA ANÁLISE EM BINÁRIA 1 MINUTO ===
- CONFIRMAR quando: ≥5 indicadores alinhados + zona S/R sólida (3+ toques) + HTF confirmando
- REJEITAR quando: indicadores divergentes + RSI extremo + OBV contra + padrão de vela fraco/ausente  
- NEUTRAL quando: setup ambíguo mas não arriscado, deixar engine decidir

Responda SOMENTE em JSON válido, sem texto fora do JSON:
{
  "vote": "CONFIRM",
  "confidence": 85,
  "scoreBoost": 5,
  "claudeAnalysis": "Confluência forte: EMA9>EMA21>EMA50 alinhadas bullish, MACD histograma positivo crescente, OBV em alta confirmando volume comprador. Zona S/R com 5 toques — resistência sólida. M5 e M15 ambos bullish. RSI 42 em zona neutra-baixa, ideal para entrada CALL. Padrão hammer confirma reversão. 6/7 indicadores alinhados.",
  "reason": "6 de 7 indicadores confirmam CALL. Confluência técnica forte.",
  "approved": true
}

Onde:
- vote: "CONFIRM" (≥4 indicadores alinhados), "REJECT" (sinal fraco/contraditório), "NEUTRAL" (ambíguo)
- confidence: 0-100 (sua confiança no veredito)
- scoreBoost: CONFIRM: +3 a +8 | NEUTRAL: -2 a 0 | REJECT: -12 a -20 (ou approved: false)
- claudeAnalysis: análise técnica completa em 2-3 frases, mencionando os indicadores específicos
- approved: false apenas se encontrar sinal claro de reversão contrária ou risco extremo`;

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
        model: 'claude-sonnet-4-6',
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(12000),
    });

    if (!response.ok) {
      console.warn(`[Oracle] API error ${response.status}, auto-approving`);
      return fallback;
    }

    const data = await response.json() as { content: Array<{ type: string; text: string }> };
    const raw = data.content?.[0];
    if (!raw || raw.type !== 'text') return fallback;

    const jsonMatch = raw.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return fallback;

    const parsed = JSON.parse(jsonMatch[0]) as {
      vote?: string;
      confidence?: number;
      scoreBoost?: number;
      claudeAnalysis?: string;
      reason?: string;
      approved?: boolean;
    };

    const vote = (parsed.vote === 'CONFIRM' || parsed.vote === 'REJECT' || parsed.vote === 'NEUTRAL')
      ? parsed.vote as 'CONFIRM' | 'REJECT' | 'NEUTRAL'
      : 'NEUTRAL';

    // Clamp scoreBoost based on vote
    let boost = typeof parsed.scoreBoost === 'number' ? parsed.scoreBoost : 0;
    if (vote === 'CONFIRM') boost = Math.min(8, Math.max(0, boost));
    else if (vote === 'NEUTRAL') boost = Math.min(0, Math.max(-4, boost));
    else boost = Math.min(-8, Math.max(-20, boost));

    const approved = vote === 'REJECT' && (typeof parsed.approved === 'boolean' ? !parsed.approved : true)
      ? false
      : true;

    const decision: OracleDecision = {
      approved,
      confidence: typeof parsed.confidence === 'number' ? Math.min(100, Math.max(0, parsed.confidence)) : 70,
      scoreBoost: boost,
      reason: typeof parsed.reason === 'string' ? parsed.reason.slice(0, 200) : `Claude ${vote}`,
      claudeAnalysis: typeof parsed.claudeAnalysis === 'string' ? parsed.claudeAnalysis.slice(0, 400) : '',
      claudeVote: vote,
    };

    markCooldown(result.asset);

    const voteEmoji = vote === 'CONFIRM' ? '✅' : vote === 'REJECT' ? '🚫' : '➖';
    console.log(`[Claude Analyst] ${voteEmoji} ${result.asset} ${vote} | Score ${result.score}% → ${result.score + boost}% | "${decision.claudeAnalysis.slice(0, 80)}..."`);

    return decision;

  } catch (err: any) {
    if (err?.name === 'TimeoutError') {
      console.warn(`[Oracle] Timeout para ${result.asset} — aprovação automática`);
    } else {
      console.warn(`[Oracle] Erro para ${result.asset}: ${err?.message || err}`);
    }
    return fallback;
  }
}
