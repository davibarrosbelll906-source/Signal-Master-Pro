import { Router } from "express";
import { db } from "@workspace/db";
import { tradesTable, usersTable } from "@workspace/db/schema";
import { eq, sql, desc, and, gte } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const { period = "30d" } = req.query;
  const days = period === "7d" ? 7 : period === "all" ? 3650 : 30;
  const since = new Date(Date.now() - days * 86400000);

  const rows = await db
    .select({
      userId: tradesTable.userId,
      username: usersTable.username,
      name: usersTable.name,
      plan: usersTable.plan,
      total: sql<number>`count(*)::int`,
      wins: sql<number>`sum(case when ${tradesTable.result} = 'win' then 1 else 0 end)::int`,
    })
    .from(tradesTable)
    .innerJoin(usersTable, eq(tradesTable.userId, usersTable.id))
    .where(gte(tradesTable.entryTime, since))
    .groupBy(tradesTable.userId, usersTable.username, usersTable.name, usersTable.plan)
    .orderBy(desc(sql`wins`))
    .limit(20);

  const leaderboard = rows.map((r, i) => ({
    rank: i + 1,
    userId: r.userId,
    username: r.username,
    name: r.name,
    plan: r.plan,
    wins: Number(r.wins),
    losses: Number(r.total) - Number(r.wins),
    total: Number(r.total),
    winRate: r.total > 0 ? Math.round((Number(r.wins) / Number(r.total)) * 100) : 0,
    isCurrentUser: r.userId === req.user!.sub,
  }));

  res.json(leaderboard);
});

export default router;
