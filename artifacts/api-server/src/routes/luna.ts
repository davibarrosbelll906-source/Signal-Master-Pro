import express from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { db } from "@workspace/db";
import { conversations, messages, lunaAnalyses } from "@workspace/db";
import { eq, asc, desc, and, gte, count, inArray, isNotNull } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { requirePlan, planLevel } from "../middlewares/plan.js";

const router = express.Router();

const LUNA_SYSTEM_PROMPT = `Você é **Luna** 🌙, a assistente educacional e coach do SignalMaster Pro v7.
Seu tom é: paciente, motivadora, clara e sempre educativa. Responda em português brasileiro.
Use formatação markdown quando relevante (negrito, listas, emojis moderados).

**Papéis principais:**
1. **Professora de Análise Gráfica**: Ensine o usuário a ler gráficos — tendência, suporte/resistência, padrões de velas, força do movimento, sessões de mercado. Sempre explique o "por quê" de cada conceito.
2. **Organizadora do App**: Ajude o usuário a usar melhor o SignalMaster Pro (gestão de banca, quando zerar o diário, ajustar meta, evitar overtrading, configurações, etc.).
3. **Coach de Risco**: Sempre priorize gestão de risco e disciplina. Nunca incentive operação impulsiva ou revanche.
4. **Analista de Gráficos**: Quando o usuário enviar uma imagem de gráfico, analise de forma detalhada e educativa — identifique tendência, suportes, resistências, padrões de velas, e o que o trader pode aprender com aquele momento específico.

**Regras importantes:**
- Nunca dê sinal direto ou prometa lucro. Sempre ensine, explique, analise.
- Quando analisar imagem de gráfico, seja específica: descreva o que está vendo (tendência de alta/baixa, velas específicas, zonas de S/R, divergências, etc.)
- Seja positiva e motivadora, mas honesta. Não faça promessas irreais.
- Use linguagem simples e acessível. Evite jargão sem explicar.
- Mantenha contexto da conversa para dar respostas coesas.
- Quando o usuário tiver histórico de trades, use-o para feedback personalizado.`;

router.get("/conversations", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.sub;
    const convs = await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(conversations.updatedAt);
    res.json(convs);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar conversas" });
  }
});

router.post("/conversations", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.sub;
    const [conv] = await db
      .insert(conversations)
      .values({ userId, title: "Chat com Luna" })
      .returning();
    res.json(conv);
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar conversa" });
  }
});

router.get("/conversations/:id/messages", requireAuth, async (req, res) => {
  try {
    const convId = parseInt(req.params.id);
    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, convId))
      .orderBy(asc(messages.createdAt));
    res.json(msgs);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar mensagens" });
  }
});

router.get("/usage", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.sub;
    const plan = (req as any).user.plan;
    const role = (req as any).user.role;
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);

    const userConvs = await db.select({ id: conversations.id }).from(conversations).where(eq(conversations.userId, userId));
    const convIds = userConvs.map(c => c.id);

    let msgsToday = 0;
    let chartAnalisesToday = 0;
    let totalAnalyses = 0;

    if (convIds.length > 0) {
      const [r] = await db.select({ total: count() }).from(messages).where(
        and(eq(messages.role, "user"), gte(messages.createdAt, startOfDay), inArray(messages.conversationId, convIds))
      );
      msgsToday = Number(r?.total ?? 0);
    }

    const [ca] = await db.select({ total: count() }).from(lunaAnalyses).where(
      and(eq(lunaAnalyses.userId, userId), gte(lunaAnalyses.createdAt, startOfDay), isNotNull(lunaAnalyses.thumbnailBase64))
    );
    chartAnalisesToday = Number(ca?.total ?? 0);

    const [ta] = await db.select({ total: count() }).from(lunaAnalyses).where(eq(lunaAnalyses.userId, userId));
    totalAnalyses = Number(ta?.total ?? 0);

    const isAdmin = role === "admin";
    res.json({
      plan,
      isAdmin,
      msgsToday,
      chartAnalisesToday,
      totalAnalyses,
      limits: {
        msgsPerDay: isAdmin || plan === "pro" || plan === "premium" ? null : 10,
        chartPerDay: isAdmin || plan === "premium" ? null : plan === "pro" ? 5 : 0,
        maxAnalyses: isAdmin || plan === "premium" ? null : plan === "pro" ? 50 : 0,
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar uso" });
  }
});

router.post("/conversations/:id/messages", requireAuth, async (req, res) => {
  const convId = parseInt(req.params.id);
  const { message, imageBase64, tradeContext } = req.body;

  if (!message && !imageBase64) {
    return res.status(400).json({ error: "Mensagem ou imagem obrigatória" });
  }

  try {
    const userId = (req as any).user.sub;
    const userPlan = (req as any).user.plan;
    const userRole = (req as any).user.role;
    const isAdmin = userRole === "admin";
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);

    if (!isAdmin) {
      const userConvs = await db.select({ id: conversations.id }).from(conversations).where(eq(conversations.userId, userId));
      const convIds = userConvs.map(c => c.id);

      if (userPlan === "basico" && convIds.length > 0) {
        const [r] = await db.select({ total: count() }).from(messages).where(
          and(eq(messages.role, "user"), gte(messages.createdAt, startOfDay), inArray(messages.conversationId, convIds))
        );
        if (Number(r?.total ?? 0) >= 10) {
          return res.status(403).json({ error: "Limite diário atingido", limitReached: true, requiredPlan: "pro" });
        }
      }

      if (imageBase64 && userPlan === "basico") {
        return res.status(403).json({ error: "Análise de gráfico requer plano PRO", requiredPlan: "pro" });
      }

      if (imageBase64 && userPlan === "pro") {
        const [ca] = await db.select({ total: count() }).from(lunaAnalyses).where(
          and(eq(lunaAnalyses.userId, userId), gte(lunaAnalyses.createdAt, startOfDay), isNotNull(lunaAnalyses.thumbnailBase64))
        );
        if (Number(ca?.total ?? 0) >= 5) {
          return res.status(403).json({ error: "Limite de 5 análises de gráfico por dia atingido (PRO)", limitReached: true });
        }
      }
    }
    const history = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, convId))
      .orderBy(asc(messages.createdAt))
      .limit(20);

    const chatMessages: any[] = [
      { role: "system", content: LUNA_SYSTEM_PROMPT },
    ];

    for (const m of history) {
      chatMessages.push({ role: m.role as "user" | "assistant", content: m.content });
    }

    const userContent: any[] = [];
    if (tradeContext) {
      userContent.push({ type: "text", text: `[Contexto do trader: ${tradeContext}]\n\n${message || "Analise o gráfico abaixo."}` });
    } else {
      userContent.push({ type: "text", text: message || "Analise o gráfico abaixo." });
    }

    if (imageBase64) {
      userContent.push({
        type: "image_url",
        image_url: { url: imageBase64, detail: "high" },
      });
    }

    const userText = message || "Análise de gráfico";
    await db.insert(messages).values({
      conversationId: convId,
      role: "user",
      content: userText,
    });

    chatMessages.push({ role: "user", content: userContent });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const stream = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 8192,
      messages: chatMessages,
      stream: true,
    });

    let fullResponse = "";

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullResponse += content;
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    await db.insert(messages).values({
      conversationId: convId,
      role: "assistant",
      content: fullResponse,
    });

    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, convId));

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    console.error("Luna error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Erro ao falar com a Luna" });
    } else {
      res.write(`data: ${JSON.stringify({ error: "Erro ao gerar resposta" })}\n\n`);
      res.end();
    }
  }
});

router.get("/analyses", requireAuth, requirePlan("pro"), async (req, res) => {
  try {
    const userId = (req as any).user.sub;
    const rows = await db
      .select()
      .from(lunaAnalyses)
      .where(eq(lunaAnalyses.userId, userId))
      .orderBy(desc(lunaAnalyses.createdAt))
      .limit(200);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar análises" });
  }
});

router.post("/analyses", requireAuth, requirePlan("pro"), async (req, res) => {
  try {
    const userId = (req as any).user.sub;
    const userPlan = (req as any).user.plan;
    const userRole = (req as any).user.role;
    const isAdmin = userRole === "admin";

    if (!isAdmin && userPlan === "pro") {
      const [ta] = await db.select({ total: count() }).from(lunaAnalyses).where(eq(lunaAnalyses.userId, userId));
      if (Number(ta?.total ?? 0) >= 50) {
        res.status(403).json({ error: "Limite de 50 análises atingido. Faça upgrade para PREMIUM.", requiredPlan: "premium" });
        return;
      }
    }

    const { pair, timeframe, userQuestion, lunaResponse, keyLessons, tags, thumbnailBase64 } = req.body;
    const [row] = await db
      .insert(lunaAnalyses)
      .values({
        userId,
        pair: pair || "",
        timeframe: timeframe || "",
        userQuestion: userQuestion || "",
        lunaResponse: lunaResponse || "",
        keyLessons: JSON.stringify(keyLessons || []),
        tags: JSON.stringify(tags || []),
        thumbnailBase64: thumbnailBase64 || null,
      })
      .returning();
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: "Erro ao salvar análise" });
  }
});

router.delete("/analyses/:id", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.sub;
    const id = parseInt(req.params.id);
    await db.delete(lunaAnalyses).where(eq(lunaAnalyses.id, id));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Erro ao deletar análise" });
  }
});

export default router;
