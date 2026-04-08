import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq, or } from "drizzle-orm";
import { signAccess, signRefresh, verifyRefresh } from "../lib/jwt.js";
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

const registerSchema = z.object({
  username: z.string().min(3).max(32).regex(/^[a-z0-9_]+$/, "Usuário deve conter apenas letras, números e _"),
  name: z.string().min(2).max(80),
  password: z.string().min(6).max(128),
});

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Dados inválidos" });
    return;
  }
  const { username, name, password } = parsed.data;

  // Verificar se username já existe
  const [existing] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(or(eq(usersTable.username, username)))
    .limit(1);

  if (existing) {
    res.status(409).json({ error: "Este nome de usuário já está em uso. Escolha outro." });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const [newUser] = await db
    .insert(usersTable)
    .values({ username, name, role: "user", plan: "basico", passwordHash })
    .returning({ id: usersTable.id, username: usersTable.username, name: usersTable.name, role: usersTable.role, plan: usersTable.plan });

  if (!newUser) {
    res.status(500).json({ error: "Erro ao criar conta. Tente novamente." });
    return;
  }

  const payload = { sub: newUser.id, username: newUser.username, role: newUser.role, plan: newUser.plan };
  res.status(201).json({
    accessToken: signAccess(payload),
    refreshToken: signRefresh(payload),
    user: { id: newUser.id, username: newUser.username, name: newUser.name, role: newUser.role, plan: newUser.plan },
  });
});

router.post("/refresh", (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) { res.status(400).json({ error: "refreshToken obrigatório" }); return; }
  try {
    const payload = verifyRefresh(refreshToken);
    const newPayload = { sub: payload.sub, username: payload.username, role: payload.role, plan: payload.plan };
    res.json({ accessToken: signAccess(newPayload) });
  } catch {
    res.status(401).json({ error: "Refresh token inválido ou expirado" });
  }
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
