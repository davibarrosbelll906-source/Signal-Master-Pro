import { Router } from "express";
import { db } from "@workspace/db";
import { tradesTable } from "@workspace/db/schema";
import { eq, and, gte, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();
router.use(requireAuth);

interface PairStat {
  asset: string;
  total: number;
  wins: number;
  losses: number;
  winRate: number;
  avgScore: number;
  lastTrade: string | null;
}

interface GroupStat {
  key: string;
  total: number;
  wins: number;
  winRate: number;
}

router.get("/ranking", async (req, res) => {
  const userId = req.user!.sub;
  const days = parseInt((req.query.days as string) || "30");
  const mode = (req.query.mode as string) || "all";

  const since = new Date();
  since.setDate(since.getDate() - days);

  const conditions = [
    eq(tradesTable.userId, userId),
    gte(tradesTable.entryTime, since),
  ];
  if (mode === "real") conditions.push(eq(tradesTable.mode, "real"));
  if (mode === "demo") conditions.push(eq(tradesTable.mode, "demo"));

  const rows = await db
    .select()
    .from(tradesTable)
    .where(and(...conditions))
    .orderBy(desc(tradesTable.entryTime));

  if (rows.length === 0) {
    res.json({
      totalTrades: 0,
      days,
      byPair: [],
      byTimeframe: [],
      bySession: [],
      byDirection: [],
      overall: { wins: 0, losses: 0, winRate: 0, avgScore: 0 },
    });
    return;
  }

  const pairMap = new Map<string, { wins: number; losses: number; scores: number[]; lastTrade: Date }>();
  const tfMap = new Map<string, { wins: number; losses: number }>();
  const sessMap = new Map<string, { wins: number; losses: number }>();
  const dirMap = new Map<string, { wins: number; losses: number }>();

  let totalWins = 0;
  let totalLosses = 0;
  let totalScore = 0;
  let scoreCount = 0;

  for (const row of rows) {
    const isWin = row.result === "win";
    const asset = row.asset || "N/A";
    const tf = row.timeframe || "N/A";
    const sess = row.session || "N/A";
    const dir = row.direction || "N/A";

    if (isWin) totalWins++; else totalLosses++;
    if (row.score) { totalScore += row.score; scoreCount++; }

    // by pair
    const p = pairMap.get(asset) || { wins: 0, losses: 0, scores: [], lastTrade: row.entryTime ?? new Date() };
    if (isWin) p.wins++; else p.losses++;
    if (row.score) p.scores.push(row.score);
    if (row.entryTime && row.entryTime > p.lastTrade) p.lastTrade = row.entryTime;
    pairMap.set(asset, p);

    // by timeframe
    const t = tfMap.get(tf) || { wins: 0, losses: 0 };
    if (isWin) t.wins++; else t.losses++;
    tfMap.set(tf, t);

    // by session
    const s = sessMap.get(sess) || { wins: 0, losses: 0 };
    if (isWin) s.wins++; else s.losses++;
    sessMap.set(sess, s);

    // by direction
    const d = dirMap.get(dir) || { wins: 0, losses: 0 };
    if (isWin) d.wins++; else d.losses++;
    dirMap.set(dir, d);
  }

  const byPair: PairStat[] = Array.from(pairMap.entries())
    .map(([asset, stat]) => ({
      asset,
      total: stat.wins + stat.losses,
      wins: stat.wins,
      losses: stat.losses,
      winRate: parseFloat(((stat.wins / (stat.wins + stat.losses)) * 100).toFixed(1)),
      avgScore: stat.scores.length > 0
        ? parseFloat((stat.scores.reduce((a, b) => a + b, 0) / stat.scores.length).toFixed(1))
        : 0,
      lastTrade: stat.lastTrade ? stat.lastTrade.toISOString() : null,
    }))
    .sort((a, b) => {
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      return b.total - a.total;
    });

  const toGroupStats = (map: Map<string, { wins: number; losses: number }>): GroupStat[] =>
    Array.from(map.entries())
      .map(([key, s]) => ({
        key,
        total: s.wins + s.losses,
        wins: s.wins,
        winRate: parseFloat(((s.wins / (s.wins + s.losses)) * 100).toFixed(1)),
      }))
      .sort((a, b) => b.winRate - a.winRate);

  res.json({
    totalTrades: rows.length,
    days,
    byPair,
    byTimeframe: toGroupStats(tfMap),
    bySession: toGroupStats(sessMap),
    byDirection: toGroupStats(dirMap),
    overall: {
      wins: totalWins,
      losses: totalLosses,
      winRate: parseFloat(((totalWins / rows.length) * 100).toFixed(1)),
      avgScore: scoreCount > 0 ? parseFloat((totalScore / scoreCount).toFixed(1)) : 0,
    },
  });
});

export default router;
