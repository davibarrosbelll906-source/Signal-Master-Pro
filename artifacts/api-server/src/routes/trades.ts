import { Router } from "express";
import { db } from "@workspace/db";
import { tradesTable } from "@workspace/db/schema";
import { eq, and, gte, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { z } from "zod";

const router = Router();
router.use(requireAuth);

const createTradeSchema = z.object({
  asset: z.string(),
  category: z.string(),
  direction: z.enum(["CALL", "PUT"]),
  score: z.number().optional(),
  quality: z.string().optional(),
  result: z.enum(["win", "loss"]),
  session: z.string().optional(),
  timeframe: z.string().optional(),
  mode: z.enum(["real", "demo"]).default("demo"),
  broker: z.string().optional(),
  notes: z.string().optional(),
  entryTime: z.string().optional(),
});

router.get("/", async (req, res) => {
  const userId = req.user!.sub;
  const { since } = req.query;

  let rows;
  if (since) {
    rows = await db.select().from(tradesTable)
      .where(and(eq(tradesTable.userId, userId), gte(tradesTable.entryTime, new Date(since as string))))
      .orderBy(desc(tradesTable.entryTime));
  } else {
    rows = await db.select().from(tradesTable)
      .where(eq(tradesTable.userId, userId))
      .orderBy(desc(tradesTable.entryTime));
  }
  res.json(rows);
});

router.post("/", async (req, res) => {
  const parsed = createTradeSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const userId = req.user!.sub;
  const data = parsed.data;

  const [trade] = await db.insert(tradesTable).values({
    userId,
    asset: data.asset,
    category: data.category,
    direction: data.direction,
    score: data.score,
    quality: data.quality,
    result: data.result,
    session: data.session,
    timeframe: data.timeframe,
    mode: data.mode,
    broker: data.broker,
    notes: data.notes,
    entryTime: data.entryTime ? new Date(data.entryTime) : new Date(),
  }).returning();

  res.status(201).json(trade);
});

router.delete("/today", async (req, res) => {
  const userId = req.user!.sub;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await db.delete(tradesTable)
    .where(and(eq(tradesTable.userId, userId), gte(tradesTable.entryTime, today)));

  res.json({ ok: true });
});

router.delete("/all", async (req, res) => {
  const userId = req.user!.sub;
  await db.delete(tradesTable).where(eq(tradesTable.userId, userId));
  res.json({ ok: true });
});

export default router;
