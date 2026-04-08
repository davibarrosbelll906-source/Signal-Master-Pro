import { Router } from "express";
import { getUncachableStripeClient, getStripePublishableKey } from "../lib/stripe.js";
import { requireAuth } from "../middlewares/auth.js";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

const PLANS = [
  {
    id: "basico",
    name: "Básico",
    price: 0,
    features: ["10 pares monitorados", "Sinais M1/M5", "Histórico 7 dias", "Sem suporte"],
  },
  {
    id: "pro",
    name: "PRO 🔥",
    priceId: process.env["STRIPE_PRICE_PRO"],
    price: 4990,
    currency: "brl",
    features: ["30 pares monitorados", "Sinais M1/M5/M15", "Histórico 30 dias", "IA Explicativa", "Alertas por e-mail", "Suporte prioritário"],
  },
  {
    id: "premium",
    name: "PREMIUM 💎",
    priceId: process.env["STRIPE_PRICE_PREMIUM"],
    price: 9990,
    currency: "brl",
    features: ["Todos os pares", "Sinais M1/M5/M15", "Histórico ilimitado", "IA Explicativa", "Alertas por e-mail", "Leaderboard destacado", "Relatórios avançados", "Suporte VIP"],
  },
];

router.get("/plans", (_req, res) => {
  res.json(PLANS.map(p => ({ ...p, priceId: undefined })));
});

router.get("/config", async (_req, res) => {
  try {
    const key = await getStripePublishableKey();
    res.json({ publishableKey: key });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/create-checkout", requireAuth, async (req, res) => {
  try {
    const { planId } = req.body as { planId: string };
    const plan = PLANS.find(p => p.id === planId);
    if (!plan || !plan.priceId) {
      res.status(400).json({ error: "Plano inválido ou gratuito" });
      return;
    }

    const stripe = await getUncachableStripeClient();
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.sub));
    if (!user) { res.status(404).json({ error: "Usuário não encontrado" }); return; }

    const origin = req.headers.origin || `http://localhost:${process.env["PORT"] || 8080}`;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: plan.priceId, quantity: 1 }],
      success_url: `${origin}/dashboard?checkout=success&plan=${planId}`,
      cancel_url: `${origin}/dashboard/plans?checkout=cancelled`,
      client_reference_id: String(req.user!.sub),
      metadata: { userId: String(req.user!.sub), planId },
      subscription_data: { metadata: { userId: String(req.user!.sub), planId } },
    });

    res.json({ url: session.url });
  } catch (err: any) {
    console.error("Stripe checkout error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/webhook", async (req, res) => {
  try {
    const stripe = await getUncachableStripeClient();
    const sig = req.headers["stripe-signature"] as string;
    const webhookSecret = process.env["STRIPE_WEBHOOK_SECRET"];

    let event: any;
    if (webhookSecret) {
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } catch {
        res.status(400).json({ error: "Invalid signature" });
        return;
      }
    } else {
      event = req.body;
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const userId = parseInt(session.client_reference_id || session.metadata?.userId);
      const planId = session.metadata?.planId;
      if (userId && planId) {
        await db.update(usersTable).set({ plan: planId, updatedAt: new Date() }).where(eq(usersTable.id, userId));
        console.log(`✅ Plan upgraded: user ${userId} → ${planId}`);
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object;
      const userId = parseInt(sub.metadata?.userId);
      if (userId) {
        await db.update(usersTable).set({ plan: "basico", updatedAt: new Date() }).where(eq(usersTable.id, userId));
        console.log(`⬇️ Plan downgraded: user ${userId} → basico`);
      }
    }

    res.json({ received: true });
  } catch (err: any) {
    console.error("Webhook error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
