/**
 * Seed script — cria usuários padrão no banco se não existirem.
 * Chamado automaticamente ao subir o servidor.
 */
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "./logger.js";

const DEFAULT_USERS = [
  { username: "admin",      name: "Administrador",  role: "admin",      plan: "premium", password: "admin123" },
  { username: "gerente",    name: "Gerente",        role: "gerente",    plan: "premium", password: "ger123" },
  { username: "suporte",    name: "Suporte",        role: "suporte",    plan: "pro",     password: "sup123" },
  { username: "analista",   name: "Analista",       role: "analista",   plan: "pro",     password: "ana123" },
  { username: "financeiro", name: "Financeiro",     role: "financeiro", plan: "premium", password: "fin123" },
  { username: "moderador",  name: "Moderador",      role: "moderador",  plan: "pro",     password: "mod123" },
];

export async function seedUsers() {
  for (const u of DEFAULT_USERS) {
    const [existing] = await db.select().from(usersTable).where(eq(usersTable.username, u.username)).limit(1);
    if (!existing) {
      const passwordHash = await bcrypt.hash(u.password, 12);
      await db.insert(usersTable).values({ username: u.username, name: u.name, role: u.role, plan: u.plan, passwordHash });
      logger.info({ username: u.username }, "Usuário padrão criado");
    }
  }
}
