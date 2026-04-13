import express from "express";
import { requireAuth } from "../middlewares/auth.js";
import { getLatestSignals } from "../lib/backendSignalEngine.js";

const router = express.Router();

const ANALYST_SYSTEM_PROMPT = `Você é um analista sênior de criptomoedas especializado na corretora **Ebinex** (opções binárias, expiração 1 minuto).

Você analisa exclusivamente os 12 pares cripto/USD da Ebinex:
BTCUSD, ETHUSD, SOLUSD, BNBUSD, XRPUSD, ADAUSD, DOGEUSD, LTCUSD, AVAXUSD, DOTUSD, LINKUSD, MATICUSD

**Sua metodologia de análise (motor SignalMaster Pro v7):**
- Timeframes: M1 (principal) com confirmação M5 e M15
- Indicadores: RSI(7), Stoch(5,3,3), ADX(14), ATR(14), EMA9/21/50, Bandas de Bollinger, MACD, OBV
- Zonas de Suporte/Resistência: detecção automática por toques de 3+ velas
- Regime de mercado: TRENDING / RANGING / CHOPPY
- Score de qualidade: 0–100% → FRACO(<66%), FORTE(66–79%), ELITE(80%+)
- Gates de bloqueio: minuto morto, zona S/R rompida, tendência HTF divergente, ADX<10, ATR baixo, RSI extremo, Entropia>96%

**Contexto dos sinais ativos** será fornecido em cada mensagem.

**Regras de comportamento:**
- Responda sempre em **português brasileiro**
- Seja direto, técnico e objetivo — como um profissional de trading
- Use markdown (negrito, listas, tabelas quando útil)
- Sempre mencione o par, direção (CALL/PUT), score, e por quê o sinal foi gerado ou bloqueado
- Explique os indicadores de forma clara mas sem simplificar demais
- Quando o usuário perguntar sobre um par específico, forneça análise completa dos indicadores
- Sugira configurações de banca (% por operação) baseado no score do sinal
- NÃO invente dados — use apenas o contexto fornecido e seu conhecimento técnico
- NÃO prometa lucros. Sempre enfatize gestão de risco.

**Gestão de risco recomendada por score:**
- FRACO (66-72%): 1% da banca, cautela máxima
- FORTE (73-79%): 2% da banca, operação normal  
- ELITE (80%+): 3% da banca, máxima confiança permitida`;

function buildMarketContext(): string {
  const signals = getLatestSignals();
  const pairs = Object.keys(signals);

  if (pairs.length === 0) {
    return "\n**Contexto de mercado:** Nenhum sinal processado ainda. Engine inicializando.";
  }

  const lines: string[] = ["\n\n**CONTEXTO DE MERCADO ATUAL (SignalMaster Pro v7):**"];
  lines.push("```");
  lines.push("Par          | Dir   | Score | Qualidade | Regime    | RSI   | ADX   | Status");
  lines.push("-------------|-------|-------|-----------|-----------|-------|-------|--------");

  for (const [asset, sig] of Object.entries(signals)) {
    const s = sig as any;
    const dir = s.direction || "—";
    const score = s.score !== undefined ? `${s.score}%` : "—";
    const quality = s.quality || "—";
    const regime = s.marketRegime || "—";
    const rsi = s.indicators?.rsi !== undefined ? s.indicators.rsi.toFixed(1) : "—";
    const adx = s.indicators?.adx !== undefined ? s.indicators.adx.toFixed(1) : "—";
    const blocked = s.blockedBy ? `BLOQ(${s.blockedBy})` : "ATIVO";
    lines.push(
      `${asset.padEnd(12)} | ${dir.padEnd(5)} | ${score.padEnd(5)} | ${quality.padEnd(9)} | ${regime.padEnd(9)} | ${rsi.padEnd(5)} | ${adx.padEnd(5)} | ${blocked}`
    );
  }

  lines.push("```");

  const active = Object.values(signals).filter((s: any) => !s.blockedBy && s.score >= 66);
  const blocked = Object.values(signals).filter((s: any) => s.blockedBy);
  lines.push(`\n*Sinais ativos: ${active.length} | Bloqueados: ${blocked.length} | Total: ${pairs.length}/12 pares*`);
  lines.push(`*Timestamp: ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} (Brasília)*`);

  return lines.join("\n");
}

router.post("/chat", requireAuth, async (req, res) => {
  const { message, history } = req.body as {
    message: string;
    history: Array<{ role: "user" | "assistant"; content: string }>;
  };

  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Mensagem inválida" });
  }

  const baseURL = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;
  const apiKey = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;

  if (!baseURL || !apiKey) {
    return res.status(503).json({ error: "Serviço de IA temporariamente indisponível" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  const marketContext = buildMarketContext();

  const systemPrompt = ANALYST_SYSTEM_PROMPT + marketContext;

  const chatMessages = [
    ...(history || []).slice(-10),
    { role: "user" as const, content: message },
  ];

  try {
    const response = await fetch(`${baseURL}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "messages-2023-12-15",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 8192,
        stream: true,
        system: systemPrompt,
        messages: chatMessages,
      }),
    });

    if (!response.ok || !response.body) {
      const errText = await response.text().catch(() => "");
      console.error("[Analyst] Anthropic error:", response.status, errText);
      res.write(`data: ${JSON.stringify({ error: "Erro ao comunicar com IA" })}\n\n`);
      res.end();
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data);
          if (
            parsed.type === "content_block_delta" &&
            parsed.delta?.type === "text_delta" &&
            parsed.delta?.text
          ) {
            res.write(`data: ${JSON.stringify({ content: parsed.delta.text })}\n\n`);
          }
        } catch {}
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    console.error("[Analyst] Stream error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Erro interno" });
    } else {
      res.write(`data: ${JSON.stringify({ error: "Conexão interrompida" })}\n\n`);
      res.end();
    }
  }
});

export default router;
