import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, Zap, Crown, Shield } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/apiClient";
import { useLocation } from "wouter";

interface Plan {
  id: string;
  name: string;
  price: number;
  currency?: string;
  features: string[];
}

const PLAN_ICONS: Record<string, React.ReactNode> = {
  basico: <Shield size={24} className="text-gray-400" />,
  pro: <Zap size={24} className="text-[var(--blue)]" />,
  premium: <Crown size={24} className="text-[var(--gold)]" />,
};

const PLAN_COLORS: Record<string, { border: string; bg: string; badge: string; btn: string }> = {
  basico: {
    border: "border-white/10",
    bg: "bg-white/3",
    badge: "bg-gray-500/20 text-gray-400",
    btn: "bg-white/10 hover:bg-white/15 text-white",
  },
  pro: {
    border: "border-[var(--blue)]/30",
    bg: "bg-[var(--blue)]/5",
    badge: "bg-[var(--blue)]/20 text-[var(--blue)]",
    btn: "bg-[var(--blue)] hover:bg-blue-400 text-white",
  },
  premium: {
    border: "border-[var(--gold)]/40",
    bg: "bg-yellow-400/5",
    badge: "bg-[var(--gold)]/20 text-[var(--gold)]",
    btn: "bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-300 hover:to-orange-300 text-black font-black",
  },
};

export default function PlansPage() {
  const currentUser = useAppStore(s => s.currentUser);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    api.get<Plan[]>("/stripe/plans")
      .then(data => setPlans(data))
      .catch(() => setPlans([
        { id: "basico", name: "Básico", price: 0, features: ["10 pares monitorados", "Sinais M1/M5", "Histórico 7 dias"] },
        { id: "pro", name: "PRO 🔥", price: 4990, currency: "brl", features: ["30 pares monitorados", "Sinais M1/M5/M15", "IA Explicativa", "Alertas e-mail"] },
        { id: "premium", name: "PREMIUM 💎", price: 9990, currency: "brl", features: ["Todos os pares", "Histórico ilimitado", "IA Explicativa", "Leaderboard VIP", "Suporte VIP"] },
      ]))
      .finally(() => setLoading(false));
  }, []);

  const handleCheckout = async (planId: string) => {
    if (planId === "basico") return;
    setCheckingOut(planId);
    try {
      const { url } = await api.post<{ url: string }>("/stripe/create-checkout", { planId });
      if (url) window.location.href = url;
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    } finally {
      setCheckingOut(null);
    }
  };

  const currentPlan = currentUser?.plan || "basico";

  const fmtPrice = (p: number, currency?: string) => {
    if (p === 0) return "Grátis";
    if (currency === "brl") return `R$ ${(p / 100).toFixed(2).replace('.', ',')}/mês`;
    return `$${(p / 100).toFixed(2)}/mês`;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-black text-white mb-2">Escolha seu Plano</h1>
        <p className="text-gray-400 text-sm">
          Upgrade para desbloquear mais pares, análises avançadas e suporte prioritário.
          {currentPlan !== "basico" && (
            <span className="ml-2 text-[var(--green)] font-bold">Plano atual: {currentPlan.toUpperCase()}</span>
          )}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-[var(--green)]/30 border-t-[var(--green)] rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan, i) => {
            const colors = PLAN_COLORS[plan.id] || PLAN_COLORS.basico;
            const isCurrent = currentPlan === plan.id;
            const isPopular = plan.id === "pro";
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`relative rounded-2xl border p-6 flex flex-col gap-4 ${colors.border} ${colors.bg} ${isPopular ? 'ring-1 ring-[var(--blue)]/30' : ''}`}
                style={{ backdropFilter: 'blur(20px)' }}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[var(--blue)] text-white text-[10px] font-black px-3 py-1 rounded-full">
                    MAIS POPULAR
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-3 right-4 bg-[var(--green)] text-black text-[10px] font-black px-3 py-1 rounded-full">
                    ATUAL
                  </div>
                )}

                <div className="flex items-center gap-3">
                  {PLAN_ICONS[plan.id]}
                  <div>
                    <div className="font-black text-white text-lg">{plan.name}</div>
                    <div className={`text-xs font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 ${colors.badge}`}>
                      {plan.id.toUpperCase()}
                    </div>
                  </div>
                </div>

                <div className="text-3xl font-black text-white">
                  {fmtPrice(plan.price, plan.currency)}
                  {plan.price > 0 && <span className="text-sm font-normal text-gray-500 ml-1"></span>}
                </div>

                <div className="flex-1 space-y-2.5">
                  {plan.features.map((f, fi) => (
                    <div key={fi} className="flex items-start gap-2.5 text-sm">
                      <Check size={14} className="text-[var(--green)] shrink-0 mt-0.5" />
                      <span className="text-gray-300">{f}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handleCheckout(plan.id)}
                  disabled={isCurrent || checkingOut === plan.id || (plan.id === "basico")}
                  className={`w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${colors.btn}`}
                >
                  {isCurrent
                    ? "✅ Plano Atual"
                    : plan.price === 0
                    ? "Plano Gratuito"
                    : checkingOut === plan.id
                    ? "Redirecionando..."
                    : `Assinar ${plan.name}`}
                </button>
              </motion.div>
            );
          })}
        </div>
      )}

      <div className="glass-card p-5 flex flex-wrap gap-6 justify-center text-center">
        {[
          { icon: "🔒", title: "Pagamento Seguro", desc: "Stripe PCI-DSS Level 1" },
          { icon: "📅", title: "Cancele Quando Quiser", desc: "Sem fidelidade ou multas" },
          { icon: "⚡", title: "Ativação Imediata", desc: "Acesso liberado na hora" },
          { icon: "🤝", title: "Suporte Dedicado", desc: "Time especializado em trading" },
        ].map(({ icon, title, desc }) => (
          <div key={title} className="flex-1 min-w-[120px]">
            <div className="text-2xl mb-1">{icon}</div>
            <div className="text-xs font-bold text-white">{title}</div>
            <div className="text-[10px] text-gray-500">{desc}</div>
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-gray-700">
        Preços em BRL. Cobranças mensais via Stripe. Ao assinar, você concorda com nossos Termos de Uso.
      </p>
    </div>
  );
}
