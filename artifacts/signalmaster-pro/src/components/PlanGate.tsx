import { motion } from "framer-motion";
import { Lock, Zap, Crown } from "lucide-react";
import { usePlanGuard } from "../lib/usePlanGuard";
import { useLocation } from "wouter";

interface PlanGateProps {
  requiredPlan: "pro" | "premium";
  children: React.ReactNode;
  feature?: string;
  mode?: "blur" | "hide" | "inline";
}

const PLAN_LABELS: Record<string, { label: string; color: string; icon: typeof Zap; gradient: string }> = {
  pro: {
    label: "PRO",
    color: "text-orange-400",
    icon: Zap,
    gradient: "from-orange-500/20 to-amber-500/20",
  },
  premium: {
    label: "PREMIUM",
    color: "text-violet-400",
    icon: Crown,
    gradient: "from-violet-500/20 to-purple-500/20",
  },
};

export function PlanGate({ requiredPlan, children, feature, mode = "blur" }: PlanGateProps) {
  const allowed = usePlanGuard(requiredPlan);
  const [, navigate] = useLocation();
  const info = PLAN_LABELS[requiredPlan];
  const Icon = info.icon;

  if (allowed) return <>{children}</>;

  if (mode === "hide") return null;

  if (mode === "inline") {
    return (
      <button
        onClick={() => navigate("/dashboard/plans")}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all opacity-60 hover:opacity-90"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <Lock size={12} className="text-gray-500" />
        <span className="text-gray-500">{feature || "Recurso"}</span>
        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${info.color}`}
          style={{ background: `rgba(255,255,255,0.06)` }}>
          {info.label}
        </span>
      </button>
    );
  }

  return (
    <div className="relative rounded-2xl overflow-hidden">
      <div className="pointer-events-none select-none" style={{ filter: "blur(4px)", opacity: 0.35 }}>
        {children}
      </div>

      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center text-center px-6 py-5 rounded-2xl mx-4 max-w-sm w-full"
          style={{
            background: "rgba(10,10,20,0.92)",
            border: "1px solid rgba(255,255,255,0.1)",
            backdropFilter: "blur(16px)",
          }}
        >
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 bg-gradient-to-br ${info.gradient}`}>
            <Icon size={22} className={info.color} />
          </div>

          <span className={`text-xs font-bold px-2 py-0.5 rounded-full mb-2 ${info.color}`}
            style={{ background: "rgba(255,255,255,0.06)" }}>
            Plano {info.label} necessário
          </span>

          <h3 className="text-white font-semibold text-base mb-1">
            {feature || "Recurso exclusivo"}
          </h3>

          <p className="text-gray-400 text-xs leading-relaxed mb-4">
            {requiredPlan === "pro"
              ? "Disponível a partir do plano PRO por apenas R$49,90/mês"
              : "Disponível exclusivamente no plano PREMIUM por R$99,90/mês"}
          </p>

          <button
            onClick={() => navigate("/dashboard/plans")}
            className="w-full py-2.5 rounded-xl text-sm font-bold text-black transition-all hover:opacity-90"
            style={{
              background: requiredPlan === "pro"
                ? "linear-gradient(135deg, #f97316, #eab308)"
                : "linear-gradient(135deg, #7c3aed, #4f46e5)",
              color: "white",
            }}
          >
            Ver planos →
          </button>
        </motion.div>
      </div>
    </div>
  );
}

export function PlanBadge({ requiredPlan }: { requiredPlan: "pro" | "premium" }) {
  const allowed = usePlanGuard(requiredPlan);
  if (allowed) return null;
  const info = PLAN_LABELS[requiredPlan];
  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${info.color} ml-1`}
      style={{ background: "rgba(255,255,255,0.07)" }}>
      {info.label}
    </span>
  );
}
