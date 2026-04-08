/**
 * News Filter — Economic Calendar Blackout
 * Pauses signals 15 minutes before and after high-impact economic news events.
 * Uses ForexFactory calendar JSON API with 1-hour cache.
 * Graceful fallback: if fetch fails, signals flow normally.
 */

const BLACKOUT_MINUTES = 15;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Currency pairs → currencies involved
const PAIR_CURRENCIES: Record<string, string[]> = {
  EURUSD: ['EUR', 'USD'], GBPUSD: ['GBP', 'USD'], USDJPY: ['USD', 'JPY'],
  AUDUSD: ['AUD', 'USD'], USDCAD: ['USD', 'CAD'], NZDUSD: ['NZD', 'USD'],
  EURGBP: ['EUR', 'GBP'], GBPJPY: ['GBP', 'JPY'],
  XAUUSD: ['USD'],        XAGUSD: ['USD'],         USOIL: ['USD'],
  // Crypto: not directly affected by forex news
  BTCUSD: [], ETHUSD: [], SOLUSD: [], BNBUSD: [],
  XRPUSD: [], ADAUSD: [], DOGEUSD: [], LTCUSD: [],
};

interface NewsEvent {
  title: string;
  country: string;
  date: Date;
  impact: string;
}

let cachedEvents: NewsEvent[] = [];
let cacheTime = 0;

async function fetchCalendar(): Promise<NewsEvent[]> {
  const now = Date.now();
  if (now - cacheTime < CACHE_TTL_MS && cachedEvents.length > 0) {
    return cachedEvents;
  }

  try {
    const res = await fetch('https://nfs.faireconomy.media/ff_calendar_thisweek.json', {
      signal: AbortSignal.timeout(5000),
      headers: { 'Accept': 'application/json' },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const raw = await res.json() as Array<{
      title?: string; country?: string; date?: string; impact?: string;
    }>;

    cachedEvents = raw
      .filter(e => e.impact === 'High' && e.date)
      .map(e => ({
        title: e.title || 'Unknown',
        country: (e.country || '').toUpperCase(),
        date: new Date(e.date!),
        impact: 'High',
      }));

    cacheTime = now;
    console.log(`[NewsFilter] Loaded ${cachedEvents.length} high-impact events`);
    return cachedEvents;
  } catch (err: any) {
    console.warn('[NewsFilter] Calendar fetch failed, signals unrestricted:', err?.message);
    return cachedEvents; // return stale cache or empty
  }
}

export interface NewsBlackout {
  active: boolean;
  eventTitle?: string;
  eventTime?: Date;
  minutesUntil?: number; // negative = event already started (post-news)
}

export async function checkNewsBlackout(asset: string): Promise<NewsBlackout> {
  const currencies = PAIR_CURRENCIES[asset] ?? [];
  if (currencies.length === 0) {
    return { active: false }; // crypto — not affected
  }

  let events: NewsEvent[];
  try {
    events = await fetchCalendar();
  } catch {
    return { active: false };
  }

  const now = Date.now();

  for (const ev of events) {
    // Check if this event affects any currency in the pair
    if (!currencies.includes(ev.country)) continue;

    const evMs = ev.date.getTime();
    const diffMs = evMs - now;
    const diffMin = diffMs / 60000;

    // Blackout window: -15min to +15min around event
    if (diffMin >= -BLACKOUT_MINUTES && diffMin <= BLACKOUT_MINUTES) {
      return {
        active: true,
        eventTitle: ev.title,
        eventTime: ev.date,
        minutesUntil: Math.round(diffMin),
      };
    }
  }

  return { active: false };
}

// Also export a sync version using the last cached data (for high-frequency path)
export function checkNewsBlackoutSync(asset: string): NewsBlackout {
  const currencies = PAIR_CURRENCIES[asset] ?? [];
  if (currencies.length === 0) return { active: false };
  if (cachedEvents.length === 0) return { active: false };

  const now = Date.now();

  for (const ev of cachedEvents) {
    if (!currencies.includes(ev.country)) continue;
    const diffMin = (ev.date.getTime() - now) / 60000;
    if (diffMin >= -BLACKOUT_MINUTES && diffMin <= BLACKOUT_MINUTES) {
      return {
        active: true,
        eventTitle: ev.title,
        eventTime: ev.date,
        minutesUntil: Math.round(diffMin),
      };
    }
  }

  return { active: false };
}

// Pre-warm cache on startup (non-blocking)
export function initNewsFilter() {
  fetchCalendar().catch(() => {});

  // Refresh every hour
  setInterval(() => fetchCalendar().catch(() => {}), CACHE_TTL_MS);
  console.log('[NewsFilter] Economic calendar filter initialized');
}
