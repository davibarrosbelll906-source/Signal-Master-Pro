/**
 * Luna Oracle Engine — Camada final de inteligência sobre sinais quantitativos.
 *
 * Fluxo:
 *  1. Motor quant gera um sinal (passed: true, score >= ORACLE_MIN_SCORE)
 *  2. Oracle consulta Claude Haiku com todos os dados do sinal
 *  3. Oracle retorna: { approved, confidence, scoreBoost, reason }
 *  4. Se aprovado: sinal emitido com badge oracleApproved + boost opcional de score
 *  5. Se rejeitado: sinal BLOQUEADO (não emitido como passed)
 *
 * Regras de segurança:
 *  - Timeout de 9 segundos (sinais disparam em :48, próximo candle em :00)
 *  - Se Claude não responder, Oracle aprova automaticamente (não bloqueia por falha)
 *  - Oracle só é chamado se score >= ORACLE_MIN_SCORE (evita desperdício de API)
 *  - Cooldown por par: não consulta Oracle duas vezes em < 3 minutos
 */

import type { SignalResult } from './signalEngine.js';

export const ORACLE_MIN_SCORE = 74; // score mínimo para Oracle ser consultado

export interface OracleDecision {
  approved: boolean;
  confidence: number;     // 0-100: confiança da Luna nesta decisão
  scoreBoost: number;     // -8 a +6: ajuste final no score pelo Oracle
  reason: string;         // explicação curta
}

// ─── Cooldown per pair (evita chamar Oracle 2x seguidas no mesmo par) ──────
const oracleCooldown = new Map<string, number>();
const ORACLE_COOLDOWN_MS = 3 * 60_000; // 3 minutos

function isOnCooldown(asset: string): boolean {
  const last = oracleCooldown.get(asset) ?? 0;
  return Date.now() - last < ORACLE_COOLDOWN_MS;
}

function markCooldown(asset: string): void {
  oracleCooldown.set(asset, Date.now());
}

// ─── Session labels ─────────────────────────────────────────────────────────
const SESSION_LABELS: Record<string, string> = {
  london:  'Londres',
  overlap: 'Overlap London/NY',
  ny:      'Nova York',
  asia:    'Ásia',
};

const REGIME_LABELS: Record<string, string> = {
  TRENDING: 'TENDÊNCIA (ADX forte)',
  RANGING:  'LATERAL (ADX fraco)',
  CHOPPY:   'CAÓTICO (volátil)',
};

// ─── Main Oracle function ────────────────────────────────────────────────────
export async function askLunaOracle(result: SignalResult): Promise<OracleDecision> {
  // Fallback (Oracle down or cooldown) — approve without penalty
  const fallback: OracleDecision = {
    approved: true, confidence: 0, scoreBoost: 0,
    reason: 'Oracle indisponível — aprovação automática pelo quant',
  };

  if (isOnCooldown(result.asset)) return fallback;

  const baseURL = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;
  const apiKey  = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;
  if (!baseURL || !apiKey) return fallback;

  const categoryLabel =
    result.category === 'crypto'    ? 'Criptomoeda' :
    result.category === 'forex'     ? 'Forex' :
    result.category === 'commodity' ? 'Commodity' : result.category;

  const prompt = `Você é **Luna Oracle** — a camada de inteligência suprema do SignalMaster Pro v7.
Sua missão: analisar os dados quantitativos de um sinal de trading e decidir se ele deve ser APROVADO ou BLOQUEADO.

Seja CONSERVADORA. Prefira bloquear um sinal duvidoso a deixar passar um ruim.

=== DADOS DO SINAL ===
Par: ${result.asset} (${categoryLabel})
Direção: ${result.direction === 'CALL' ? '▲ CALL (Alta)' : '▼ PUT (Baixa)'}
Score quantitativo: ${result.score}%
Qualidade: ${result.quality}
ADX (força tendência): ${result.adx.toFixed(1)}
RSI: ${result.rsi.toFixed(1)}
Entropia Shannon (0.0=ordenado, 1.0=aleatório): ${result.entropy.toFixed(3)} equivale a ${Math.round(result.entropy * 100)}% de ruído
Consenso de universos: ${result.consensus}/5
Confirmadores: ${result.confirmed}/6
Regime de mercado: ${REGIME_LABELS[result.marketRegime] || result.marketRegime}
Sessão: ${SESSION_LABELS[result.sess] || result.sess}
Votos: ${JSON.stringify(result.votes)}

=== CRITÉRIOS PARA APROVAÇÃO ===
BLOQUEAR se qualquer condição:
- RSI > 75 (CALL) ou RSI < 25 (PUT) — extremo perigoso para binária
- Entropia > 78% — mercado muito aleatório
- Consenso < 3/5 — divergência entre universos
- ADX < 20 E Regime != TRENDING — tendência fraca demais
- Score < 76% — margem de segurança insuficiente

APROVAR se todas as condições:
- Score >= 76%
- Consenso >= 3/5
- Regime TRENDING ou score >= 85%

BOOST (+scoreBoost positivo até +6): quando RSI ideal, ADX > 30, alta confluência
PENALIDADE (scoreBoost negativo até -8): quando RSI borderline, ADX 20-25, entropia 70-78%

Responda SOMENTE em JSON válido, sem markdown, sem texto fora:
{
  "approved": true,
  "confidence": 82,
  "scoreBoost": 3,
  "reason": "ADX em 34 confirma tendência forte. RSI em 58 ideal para CALL. Confluência alta entre universos."
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
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(9000),
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

    const parsed = JSON.parse(jsonMatch[0]) as Partial<OracleDecision>;

    const decision: OracleDecision = {
      approved:    typeof parsed.approved === 'boolean' ? parsed.approved : true,
      confidence:  typeof parsed.confidence === 'number' ? Math.min(100, Math.max(0, parsed.confidence)) : 70,
      scoreBoost:  typeof parsed.scoreBoost === 'number' ? Math.min(6, Math.max(-8, parsed.scoreBoost)) : 0,
      reason:      typeof parsed.reason === 'string' ? parsed.reason.slice(0, 200) : '',
    };

    markCooldown(result.asset);
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
