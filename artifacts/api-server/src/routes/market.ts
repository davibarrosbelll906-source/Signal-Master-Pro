import { Router } from "express";
import { getCalendarEvents } from "../lib/newsFilter.js";

const router = Router();

const INDICES_SYMBOLS = ["^GSPC", "^IXIC", "^DJI", "^RUT", "GC=F", "CL=F", "DX-Y.NYB", "BTC-USD"];
const INDICES_LABELS: Record<string, string> = {
  "^GSPC": "S&P 500",
  "^IXIC": "NASDAQ",
  "^DJI": "DOW",
  "^RUT": "Russell",
  "GC=F": "Ouro",
  "CL=F": "Petróleo",
  "DX-Y.NYB": "DXY",
  "BTC-USD": "Bitcoin",
};

let indicesCache: { data: unknown; ts: number } | null = null;
let newsCache: { data: unknown; ts: number } | null = null;

router.get("/market/indices", async (req, res) => {
  try {
    if (indicesCache && Date.now() - indicesCache.ts < 60_000) {
      return res.json(indicesCache.data);
    }
    const symbols = INDICES_SYMBOLS.join(",");
    const url = `https://query1.finance.yahoo.com/v8/finance/spark?symbols=${encodeURIComponent(symbols)}&range=1d&interval=1d`;
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SignalMasterBot/1.0)" },
    });
    if (!response.ok) throw new Error(`YF status ${response.status}`);
    const json = (await response.json()) as Record<string, any>;
    const result = Object.entries(json).map(([sym, data]) => {
      const closes: number[] = data?.close ?? [];
      const close = closes[closes.length - 1] ?? 0;
      const prev = data?.chartPreviousClose ?? data?.previousClose ?? close;
      const change = prev ? ((close - prev) / prev) * 100 : 0;
      return {
        symbol: sym,
        label: INDICES_LABELS[sym] ?? sym,
        price: close,
        change: parseFloat(change.toFixed(2)),
        currency: "USD",
      };
    }).filter(r => r.price > 0);
    indicesCache = { data: result, ts: Date.now() };
    res.json(result);
  } catch (err: any) {
    res.status(502).json({ error: err.message ?? "Fetch failed" });
  }
});

router.get("/market/news", async (req, res) => {
  try {
    if (newsCache && Date.now() - newsCache.ts < 300_000) {
      return res.json(newsCache.data);
    }
    const url = "https://finance.yahoo.com/rss/topstories";
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SignalMasterBot/1.0)" },
    });
    if (!response.ok) throw new Error(`RSS status ${response.status}`);
    const xml = await response.text();
    const items: { title: string; link: string; pubDate: string; source: string }[] = [];
    const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
    for (const m of itemMatches) {
      const block = m[1];
      const title = block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]
        ?? block.match(/<title>(.*?)<\/title>/)?.[1] ?? "";
      const link = block.match(/<link>(.*?)<\/link>/)?.[1]
        ?? block.match(/<guid>(.*?)<\/guid>/)?.[1] ?? "";
      const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ?? "";
      const source = block.match(/<source[^>]*>(.*?)<\/source>/)?.[1] ?? "Yahoo Finance";
      if (title) items.push({ title: title.trim(), link: link.trim(), pubDate: pubDate.trim(), source: source.trim() });
      if (items.length >= 12) break;
    }
    newsCache = { data: items, ts: Date.now() };
    res.json(items);
  } catch (err: any) {
    res.status(502).json({ error: err.message ?? "Fetch failed" });
  }
});

// Calendário econômico — retorna eventos de alta importância desta semana
router.get("/market/calendar", (_req, res) => {
  const now = Date.now();
  const events = getCalendarEvents().map(e => ({
    title: e.title,
    country: e.country,
    impact: e.impact,
    date: e.date.toISOString(),
    minutesUntil: Math.round((e.date.getTime() - now) / 60000),
  }));
  // Ordena por proximidade temporal
  events.sort((a, b) => a.minutesUntil - b.minutesUntil);
  res.json(events);
});

export default router;
