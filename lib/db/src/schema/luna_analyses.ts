import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const lunaAnalyses = pgTable("luna_analyses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  pair: text("pair").notNull().default(""),
  timeframe: text("timeframe").notNull().default(""),
  userQuestion: text("user_question").notNull(),
  lunaResponse: text("luna_response").notNull(),
  keyLessons: text("key_lessons").notNull().default("[]"),
  tags: text("tags").notNull().default("[]"),
  thumbnailBase64: text("thumbnail_base64"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertLunaAnalysisSchema = createInsertSchema(lunaAnalyses).omit({
  id: true,
  createdAt: true,
});

export type LunaAnalysis = typeof lunaAnalyses.$inferSelect;
export type InsertLunaAnalysis = z.infer<typeof insertLunaAnalysisSchema>;
