import { pgTable, text, serial, integer, timestamp, varchar, real } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { usersTable } from "./users";

export const tradesTable = pgTable("smp_trades", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  asset: varchar("asset", { length: 16 }).notNull(),
  category: varchar("category", { length: 16 }).notNull(),
  direction: varchar("direction", { length: 8 }).notNull(),
  score: real("score"),
  quality: varchar("quality", { length: 16 }),
  result: varchar("result", { length: 8 }).notNull(),
  session: varchar("session", { length: 16 }),
  timeframe: varchar("timeframe", { length: 4 }),
  mode: varchar("mode", { length: 8 }).notNull().default("demo"),
  broker: varchar("broker", { length: 64 }),
  notes: text("notes"),
  entryTime: timestamp("entry_time").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTradeSchema = createInsertSchema(tradesTable).omit({ id: true, createdAt: true });
export const selectTradeSchema = createSelectSchema(tradesTable);

export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type Trade = z.infer<typeof selectTradeSchema>;
