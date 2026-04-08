import { type Request, type Response, type NextFunction } from "express";

export const PLAN_ORDER: Record<string, number> = {
  basico: 0,
  pro: 1,
  premium: 2,
};

export function requirePlan(minPlan: "pro" | "premium") {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: "Não autenticado" });
      return;
    }
    if (user.role === "admin") {
      next();
      return;
    }
    const userLevel = PLAN_ORDER[user.plan] ?? 0;
    const required = PLAN_ORDER[minPlan] ?? 1;
    if (userLevel < required) {
      res.status(403).json({
        error: "Plano insuficiente",
        requiredPlan: minPlan,
        currentPlan: user.plan,
        upgradeUrl: "/dashboard/plans",
      });
      return;
    }
    next();
  };
}

export function planLevel(req: Request): number {
  if (!req.user) return -1;
  if (req.user.role === "admin") return 99;
  return PLAN_ORDER[req.user.plan] ?? 0;
}
