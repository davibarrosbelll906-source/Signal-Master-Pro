import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { signAccess, signRefresh, verifyToken } from "../lib/jwt.js";
import { requireAuth } from "../middlewares/auth.js";
import { z } from "zod";

const router = Router();

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "username e password são obrigatórios" });
    return;
  }
  const { username, password } = parsed.data;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);
  if (!user) {
    res.status(401).json({ error: "Usuário ou senha inválidos" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Usuário ou senha inválidos" });
    return;
  }

  const payload = { sub: user.id, username: user.username, role: user.role, plan: user.plan };
  res.json({
    accessToken: signAccess(payload),
    refreshToken: signRefresh(payload),
    user: { id: user.id, username: user.username, name: user.name, role: user.role, plan: user.plan },
  });
});

router.post("/refresh", (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) { res.status(400).json({ error: "refreshToken obrigatório" }); return; }
  try {
    const payload = verifyToken(refreshToken);
    const newPayload = { sub: payload.sub, username: payload.username, role: payload.role, plan: payload.plan };
    res.json({ accessToken: signAccess(newPayload) });
  } catch {
    res.status(401).json({ error: "Refresh token inválido" });
  }
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
