import { Router } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { openai as openaiClient } from "@workspace/integrations-openai-ai-server";
import { ai as geminiAI } from "@workspace/integrations-gemini-ai";
import OpenAI from "openai";

const router = Router();

type Provider = "claude" | "chatgpt" | "gemini" | "grok" | "dalle";

interface ChatMessage { role: "user" | "assistant"; content: string; }

// ── OpenRouter (Grok) — uses openai package with different base URL ───────
const openrouterClient = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENROUTER_API_KEY ?? "dummy",
  baseURL: process.env.AI_INTEGRATIONS_OPENROUTER_BASE_URL,
});

// ── SSE helpers ───────────────────────────────────────────────────────────
function setSseHeaders(res: any) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders?.();
}

function send(res: any, data: object) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

// ── Route ─────────────────────────────────────────────────────────────────
router.post("/stream", async (req, res) => {
  const { provider, messages, systemPrompt } = req.body as {
    provider: Provider;
    messages: ChatMessage[];
    systemPrompt?: string;
  };

  if (!provider || !messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "provider e messages são obrigatórios" });
  }

  setSseHeaders(res);

  try {
    // ── Claude ────────────────────────────────────────────────────────────
    if (provider === "claude") {
      const stream = anthropic.messages.stream({
        model: "claude-sonnet-4-6",
        max_tokens: 8192,
        ...(systemPrompt ? { system: systemPrompt } : {}),
        messages: messages.map(m => ({ role: m.role, content: m.content })),
      });

      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          send(res, { content: event.delta.text });
        }
      }

    // ── ChatGPT ───────────────────────────────────────────────────────────
    } else if (provider === "chatgpt") {
      const stream = await openaiClient.chat.completions.create({
        model: "gpt-5.2",
        max_completion_tokens: 8192,
        messages: [
          ...(systemPrompt ? [{ role: "system" as const, content: systemPrompt }] : []),
          ...messages.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
        ],
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) send(res, { content });
      }

    // ── Gemini ────────────────────────────────────────────────────────────
    } else if (provider === "gemini") {
      const geminiMsgs = messages.map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

      const contents = systemPrompt
        ? [
            { role: "user", parts: [{ text: `System instructions: ${systemPrompt}` }] },
            { role: "model", parts: [{ text: "Understood. I will follow these instructions." }] },
            ...geminiMsgs,
          ]
        : geminiMsgs;

      const stream = await geminiAI.models.generateContentStream({
        model: "gemini-3.1-pro-preview",
        contents,
        config: { maxOutputTokens: 8192 },
      });

      for await (const chunk of stream) {
        const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) send(res, { content: text });
      }

    // ── Grok (OpenRouter) ──────────────────────────────────────────────────
    } else if (provider === "grok") {
      const stream = await openrouterClient.chat.completions.create({
        model: "x-ai/grok-3",
        messages: [
          ...(systemPrompt ? [{ role: "system" as const, content: systemPrompt }] : []),
          ...messages.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
        ],
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) send(res, { content });
      }
    } else {
      send(res, { error: "Provedor inválido" });
    }
  } catch (err: any) {
    send(res, { error: err?.message ?? "Erro interno" });
  }

  send(res, { done: true });
  res.end();
});

router.options("/stream", (_req, res) => res.sendStatus(200));

// ── Geração de imagem com DALL-E 3 ────────────────────────────────────────
router.post("/image", async (req, res) => {
  const { prompt, quality = "hd", size = "1024x1024" } = req.body as {
    prompt: string;
    quality?: "standard" | "hd";
    size?: "1024x1024" | "1792x1024" | "1024x1792";
  };

  if (!prompt?.trim()) {
    return res.status(400).json({ error: "prompt é obrigatório" });
  }

  try {
    const response = await openaiClient.images.generate({
      model: "dall-e-3",
      prompt: prompt.trim(),
      n: 1,
      size,
      quality,
      response_format: "url",
    });

    const url = response.data[0]?.url;
    const revised = response.data[0]?.revised_prompt;

    if (!url) return res.status(500).json({ error: "Imagem não gerada" });

    res.json({ url, revised_prompt: revised });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Erro ao gerar imagem" });
  }
});

router.options("/image", (_req, res) => res.sendStatus(200));

export default router;
