import { useAppStore } from "./store";

export type PlanTier = "basico" | "pro" | "premium";

const PLAN_ORDER: Record<string, number> = {
  basico: 0,
  pro: 1,
  premium: 2,
};

export function planLevel(plan: string | undefined): number {
  if (!plan) return 0;
  return PLAN_ORDER[plan] ?? 0;
}

export function usePlanGuard(requiredPlan: "pro" | "premium"): boolean {
  const currentUser = useAppStore((s) => s.currentUser);
  if (!currentUser) return false;
  if (currentUser.role === "admin") return true;
  const userLevel = planLevel(currentUser.plan);
  const required = PLAN_ORDER[requiredPlan] ?? 1;
  return userLevel >= required;
}

export function usePlan(): PlanTier {
  const currentUser = useAppStore((s) => s.currentUser);
  if (!currentUser) return "basico";
  if (currentUser.role === "admin") return "premium";
  return (currentUser.plan as PlanTier) ?? "basico";
}
