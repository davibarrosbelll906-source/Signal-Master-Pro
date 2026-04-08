/**
 * Luna Educational Explainer
 * Generates a short, educational explanation for a trading signal using Claude.
 * Called ASYNC (fire-and-forget) AFTER the signal is already emitted — Luna never blocks.
 * Uses fetch directly to avoid esbuild bundling issues with @anthropic-ai/sdk.
 */

export interface LunaExplanation {
  signalId: string;
  asset: string;
  explanation: string;
  keyPoints: string[];
  riskNote: string;
}

export interface SignalContext {
  asset: string;
  direction: 'CALL' | 'PUT';
  score: number;
  quality: string;
  adx: number;
  rsi: number;
  entropy: number;
  consensus: number;
  marketRegime: string;
  sess: string;
  category: string;
  ts: number;
}

const SESSION_LABELS: Record<string, string> = {
  london: 'sessão de Londres',
  overlap: 'Overlap London/NY',
  ny: 'sessão de Nova York',
  asia: 'sessão Asiática',
};

const REGIME_LABELS: Record<string, string> = {
  TRENDING: 'mercado em tendência clara',
  RANGING: 'mercado lateral',
  CHOPPY: 'mercado volátil',
};

export async function generateLunaExplanation(
  ctx: SignalContext,
  io: import('socket.io').Server
): Promise<void> {
  const baseURL = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;
  const apiKey = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;

  if (!baseURL || !apiKey) {
    console.warn('[Luna] Anthropic env vars not configured, skipping explanation');
    return;
  }

  const categoryLabel =
    ctx.category === 'crypto' ? 'Criptomoeda' :
    ctx.category === 'forex' ? 'Forex' : 'Commodities';

  const prompt = `Você é Luna, assistente educacional de trading da plataforma SignalMaster Pro.

Um sinal foi gerado pelo motor matemático. Explique-o de forma educativa e acessível para um trader iniciante ou intermediário.

=== DADOS DO SINAL ===
Par: ${ctx.asset} (${categoryLabel})
Direção: ${ctx.direction === 'CALL' ? '▲ CALL (Alta)' : '▼ PUT (Baixa)'}
Score do motor: ${ctx.score}%
Qualidade: ${ctx.quality}
ADX (força da tendência): ${ctx.adx}
RSI: ${ctx.rsi}
Entropia (ruído): ${ctx.entropy}
Consenso universos: ${ctx.consensus}/5
Regime de mercado: ${REGIME_LABELS[ctx.marketRegime] || ctx.marketRegime}
Sessão: ${SESSION_LABELS[ctx.sess] || ctx.sess}

=== INSTRUÇÕES ===
Responda APENAS em JSON válido, sem markdown, sem texto fora do JSON:
{
  "explanation": "2-3 frases explicando o que está acontecendo no mercado e por que este sinal foi gerado. Use linguagem simples em português.",
  "keyPoints": ["ponto 1 curto", "ponto 2 curto", "ponto 3 curto"],
  "riskNote": "Uma frase curta sobre o principal risco deste sinal específico."
}

Regras:
- Tom educativo, nunca prometa lucro
- Mencione os indicadores mais relevantes (ADX, RSI) de forma natural
- keyPoints: máximo 3, cada um com menos de 60 caracteres
- riskNote: 1 frase, mencione algo específico deste sinal
- Sempre em português brasileiro`;

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
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(12000),
    });

    if (!response.ok) {
      console.error(`[Luna] API error: ${response.status}`);
      return;
    }

    const data = await response.json() as {
      content: Array<{ type: string; text: string }>;
    };

    const raw = data.content?.[0];
    if (!raw || raw.type !== 'text') return;

    let parsed: { explanation: string; keyPoints: string[]; riskNote: string };
    try {
      const jsonMatch = raw.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return;
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      return;
    }

    const result: LunaExplanation = {
      signalId: `${ctx.asset}-${ctx.ts}`,
      asset: ctx.asset,
      explanation: parsed.explanation || '',
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints.slice(0, 3) : [],
      riskNote: parsed.riskNote || '',
    };

    io.emit('luna_signal_explanation', result);
    console.log(`[Luna] ✓ Explanation sent for ${ctx.asset} ${ctx.direction} (${ctx.quality})`);
  } catch (err: any) {
    if (err?.name === 'TimeoutError') {
      console.warn('[Luna] Explanation timed out');
    } else {
      console.error('[Luna] Failed:', err?.message || err);
    }
  }
}
