import { Router } from "express";
import { Resend } from "resend";

const router = Router();

const resend = new Resend(process.env["RESEND_API_KEY"]);

const otpStore = new Map<string, { code: string; expires: number; attempts: number }>();

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function cleanupExpired() {
  const now = Date.now();
  for (const [key, val] of otpStore.entries()) {
    if (val.expires < now) otpStore.delete(key);
  }
}

router.post("/send-otp", async (req, res) => {
  const { email, name } = req.body as { email: string; name: string };

  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "E-mail inválido" });
  }

  cleanupExpired();

  const code = generateOTP();
  const expires = Date.now() + 10 * 60 * 1000;
  otpStore.set(email.toLowerCase(), { code, expires, attempts: 0 });

  try {
    await resend.emails.send({
      from: "SignalMaster Pro <onboarding@resend.dev>",
      to: email,
      subject: "Seu código de verificação — SignalMaster Pro",
      html: `
        <!DOCTYPE html>
        <html>
          <head><meta charset="utf-8" /></head>
          <body style="background:#07070d;font-family:Arial,sans-serif;margin:0;padding:0;">
            <div style="max-width:480px;margin:40px auto;background:#0f0f1a;border-radius:16px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">
              <div style="background:linear-gradient(135deg,rgba(0,255,136,0.08),transparent);padding:32px 32px 24px;">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px;">
                  <div style="width:36px;height:36px;background:#00ff88;border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:900;color:#000;font-size:16px;text-align:center;line-height:36px;">S</div>
                  <div>
                    <div style="color:#fff;font-weight:700;font-size:14px;">SignalMaster Pro</div>
                    <div style="color:#00ff88;font-size:10px;font-weight:700;letter-spacing:2px;">v7 ULTIMATE</div>
                  </div>
                </div>
                <h1 style="color:#fff;font-size:22px;font-weight:800;margin:0 0 8px;">Verificação de Segurança</h1>
                <p style="color:#888;font-size:14px;margin:0;">Olá, <strong style="color:#ccc;">${name || "trader"}</strong>! Seu código de acesso:</p>
              </div>
              <div style="padding:24px 32px;">
                <div style="background:rgba(0,255,136,0.06);border:1px solid rgba(0,255,136,0.2);border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
                  <div style="color:#00ff88;font-size:42px;font-weight:900;letter-spacing:12px;font-family:monospace;">${code}</div>
                  <div style="color:#666;font-size:12px;margin-top:8px;">Válido por 10 minutos</div>
                </div>
                <p style="color:#666;font-size:12px;text-align:center;margin:0;">Se você não solicitou este código, ignore este e-mail. Nunca compartilhe este código com ninguém.</p>
              </div>
              <div style="padding:16px 32px;border-top:1px solid rgba(255,255,255,0.05);">
                <p style="color:#444;font-size:11px;text-align:center;margin:0;">⚠️ Trading envolve risco. Sinais não garantem lucro.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    return res.json({ success: true, message: "Código enviado" });
  } catch (err: any) {
    console.error("Resend error:", err);
    return res.status(500).json({ error: "Falha ao enviar e-mail. Tente novamente." });
  }
});

router.post("/verify-otp", (req, res) => {
  const { email, code } = req.body as { email: string; code: string };

  if (!email || !code) {
    return res.status(400).json({ error: "Dados incompletos" });
  }

  cleanupExpired();

  const key = email.toLowerCase();
  const entry = otpStore.get(key);

  if (!entry) {
    return res.status(400).json({ error: "Código expirado ou não encontrado. Solicite um novo." });
  }

  if (entry.expires < Date.now()) {
    otpStore.delete(key);
    return res.status(400).json({ error: "Código expirado. Solicite um novo." });
  }

  entry.attempts++;
  if (entry.attempts > 5) {
    otpStore.delete(key);
    return res.status(429).json({ error: "Muitas tentativas. Solicite um novo código." });
  }

  if (entry.code !== code.trim()) {
    return res.status(400).json({ error: `Código incorreto. ${5 - entry.attempts + 1} tentativa(s) restante(s).` });
  }

  otpStore.delete(key);
  return res.json({ success: true });
});

export default router;
