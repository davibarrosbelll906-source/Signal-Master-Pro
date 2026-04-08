import { Router } from "express";
import { Resend } from "resend";
import { requireAuth } from "../middlewares/auth.js";
import { z } from "zod";

const router = Router();
const resend = new Resend(process.env["RESEND_API_KEY"]);

const FROM = "SignalMaster Pro <onboarding@resend.dev>";

function badge(wr: number) {
  if (wr >= 75) return { emoji: "🏆", label: "Excelente", color: "#00ff88" };
  if (wr >= 65) return { emoji: "✅", label: "Bom", color: "#44aaff" };
  if (wr >= 50) return { emoji: "⚠️", label: "Regular", color: "#f97316" };
  return { emoji: "❌", label: "Abaixo do esperado", color: "#ff4466" };
}

function emailBase(content: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/></head>
<body style="background:#07070d;font-family:Arial,sans-serif;margin:0;padding:0;">
<div style="max-width:520px;margin:40px auto;background:#0f0f1a;border-radius:16px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">
  <div style="background:linear-gradient(135deg,rgba(0,255,136,0.08),transparent);padding:28px 32px 20px;">
    <div style="display:flex;align-items:center;gap:10px;">
      <div style="width:36px;height:36px;background:#00ff88;border-radius:8px;font-weight:900;color:#000;font-size:16px;text-align:center;line-height:36px;">S</div>
      <div>
        <div style="color:#fff;font-weight:700;font-size:14px;">SignalMaster Pro</div>
        <div style="color:#00ff88;font-size:10px;font-weight:700;letter-spacing:2px;">v7 ULTIMATE</div>
      </div>
    </div>
  </div>
  <div style="padding:24px 32px;">${content}</div>
  <div style="padding:16px 32px;border-top:1px solid rgba(255,255,255,0.05);">
    <p style="color:#444;font-size:11px;text-align:center;margin:0;">⚠️ Trading envolve risco. Sinais não garantem lucro. Opere com responsabilidade.</p>
  </div>
</div></body></html>`;
}

const dailyReportSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  wins: z.number(),
  losses: z.number(),
  winRate: z.number(),
  banca: z.number().optional(),
  drawdown: z.number().optional(),
  bestAsset: z.string().optional(),
  date: z.string().optional(),
});

router.post("/daily-report", requireAuth, async (req, res) => {
  const parsed = dailyReportSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const { email, name, wins, losses, winRate, banca, drawdown, bestAsset, date } = parsed.data;
  const total = wins + losses;
  const b = badge(winRate);
  const dateStr = date || new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  const content = `
    <h1 style="color:#fff;font-size:20px;font-weight:800;margin:0 0 4px;">Relatório Diário ${b.emoji}</h1>
    <p style="color:#888;font-size:13px;margin:0 0 24px;">${dateStr} · Olá, <strong style="color:#ccc;">${name || "trader"}</strong>!</p>

    <div style="background:rgba(255,255,255,0.03);border-radius:12px;padding:20px;margin-bottom:20px;">
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;text-align:center;">
        <div>
          <div style="color:#666;font-size:11px;margin-bottom:4px;">WIN RATE</div>
          <div style="color:${b.color};font-size:28px;font-weight:900;">${winRate}%</div>
          <div style="color:${b.color};font-size:10px;font-weight:700;">${b.label}</div>
        </div>
        <div>
          <div style="color:#666;font-size:11px;margin-bottom:4px;">OPERAÇÕES</div>
          <div style="color:#fff;font-size:28px;font-weight:900;">${total}</div>
          <div style="color:#888;font-size:10px;">${wins}W / ${losses}L</div>
        </div>
        <div>
          <div style="color:#666;font-size:11px;margin-bottom:4px;">RESULTADO</div>
          <div style="color:${wins >= losses ? "#00ff88" : "#ff4466"};font-size:28px;font-weight:900;">
            ${wins >= losses ? "+" : ""}${wins - losses}
          </div>
          <div style="color:#888;font-size:10px;">saldo de ops</div>
        </div>
      </div>
    </div>

    ${banca ? `<div style="margin-bottom:16px;padding:14px;background:rgba(68,136,255,0.06);border:1px solid rgba(68,136,255,0.15);border-radius:10px;">
      <span style="color:#888;font-size:12px;">Banca atual: </span>
      <span style="color:#4488ff;font-weight:700;font-size:14px;">R$ ${banca.toFixed(2)}</span>
      ${drawdown ? `<span style="color:#888;font-size:12px;margin-left:12px;">Drawdown: </span><span style="color:#ff4466;font-weight:700;font-size:14px;">${drawdown.toFixed(1)}%</span>` : ""}
    </div>` : ""}

    ${bestAsset ? `<p style="color:#888;font-size:12px;">🏅 Melhor ativo do dia: <strong style="color:#ffd700;">${bestAsset}</strong></p>` : ""}

    <div style="text-align:center;margin-top:24px;">
      <div style="display:inline-block;padding:10px 24px;background:#00ff88;color:#000;font-weight:900;font-size:13px;border-radius:8px;">
        Acesse sua plataforma →
      </div>
    </div>
  `;

  try {
    await resend.emails.send({ from: FROM, to: email, subject: `📊 Relatório do dia — ${winRate}% WR · SignalMaster Pro`, html: emailBase(content) });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

const alertSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  type: z.enum(["meta", "stop"]),
  value: z.number(),
  wins: z.number(),
  losses: z.number(),
});

router.post("/alert", requireAuth, async (req, res) => {
  const parsed = alertSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const { email, name, type, value, wins, losses } = parsed.data;
  const isMeta = type === "meta";
  const color = isMeta ? "#00ff88" : "#ff4466";
  const emoji = isMeta ? "🎯" : "🛑";

  const content = `
    <h1 style="color:${color};font-size:22px;font-weight:900;margin:0 0 8px;">${emoji} ${isMeta ? "Meta Diária Atingida!" : "Stop-Loss Atingido!"}</h1>
    <p style="color:#888;font-size:13px;margin:0 0 24px;">
      Olá, <strong style="color:#ccc;">${name || "trader"}</strong>! 
      ${isMeta ? `Você atingiu sua meta de <strong style="color:#00ff88;">${value} WIN${value > 1 ? "s" : ""}</strong> hoje.` 
               : `Você atingiu seu stop-loss de <strong style="color:#ff4466;">${value} LOSS${value > 1 ? "es" : ""}</strong> hoje.`}
    </p>
    <div style="background:rgba(255,255,255,0.03);border-radius:12px;padding:20px;margin-bottom:20px;text-align:center;">
      <div style="color:${color};font-size:42px;font-weight:900;">${wins}W / ${losses}L</div>
      <div style="color:#888;font-size:12px;margin-top:4px;">Resultado de hoje</div>
    </div>
    <div style="background:${isMeta ? "rgba(0,255,136,0.06)" : "rgba(255,68,102,0.06)"};border:1px solid ${isMeta ? "rgba(0,255,136,0.2)" : "rgba(255,68,102,0.2)"};border-radius:10px;padding:16px;">
      <p style="color:${isMeta ? "#00ff88" : "#ff4466"};font-size:13px;font-weight:700;margin:0 0 6px;">
        ${isMeta ? "✅ Recomendação: Encerre as operações e proteja seu lucro!" : "🚫 Recomendação: Pare de operar por hoje. Descanse e volte amanhã."}
      </p>
      <p style="color:#666;font-size:12px;margin:0;">
        ${isMeta ? "Ganância é o maior inimigo do trader. Você bateu a meta — isso já é vitória!" : "Dias ruins fazem parte. O que define um trader profissional é saber parar."}
      </p>
    </div>
  `;

  try {
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: `${emoji} ${isMeta ? "Meta atingida" : "Stop-loss atingido"} — SignalMaster Pro`,
      html: emailBase(content),
    });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
