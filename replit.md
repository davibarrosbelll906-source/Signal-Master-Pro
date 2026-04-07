# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## SignalMaster Pro v7 Ultimate

A full-featured, premium trading signals platform for binary options (Forex, Crypto, Commodities). Accessible at `/` preview path.

### Features
- 100% frontend app — all data in localStorage (no backend needed)
- Dark glassmorphism UI (bg #07070d, green accent #00ff88)
- 5 themes: Midnight, Lava, Ocean, Matrix, Gold (Premium)
- 20+ pages/routes with protected dashboard
- Real math signal engine: EMA, RSI, MACD, ADX, ATR, OBV, Bollinger, Stochastic
- Binance WebSocket for crypto (wss://stream.binance.com)
- Ornstein-Uhlenbeck random walk for Forex/Commodities
- DNA de Candle fingerprinting, Market Maker Trap detector, Shannon Entropy
- Multi-Universe Consensus (5 engines, min 4/5)
- ML adaptive weights (smpML7 localStorage)

### Default Users (seeded on first load)
| user | pass | role |
|------|------|------|
| admin | admin123 | admin |
| gerente | ger123 | gerente |
| suporte | sup123 | suporte |
| analista | ana123 | analista |
| financeiro | fin123 | financeiro |
| moderador | mod123 | moderador |

### Pages (all fully functional with real data)
- SignalsPage: real Binance REST+WS for crypto, OU simulation for forex/commodity
- HistoryPage: localStorage history with filters and CSV export
- AnalyticsPage: Recharts charts (session WR, equity curve, asset WR, indicator accuracy)
- SettingsPage: all settings persisted to smpCfg7
- AdminPage: full user CRUD from localStorage + plan management
- AchievementsPage: 12 real achievements with progress tracking
- BankPage: equity curve chart, bankroll simulator (Kelly/Soros/Martingale)
- BacktestingPage: real OU+indicators, equity curve chart
- DiaryPage: full localStorage persistence, mood tracking, expandable entries
- ProfilePage: real stats from history, editable profile, avatar color picker
- ScoreboardPage: real asset rankings from localStorage, session stats, podium
- GoalsPage: create/track custom goals (winRate/ops/streak/wins) per period
- RiskPage: full risk calculator (Kelly criterion, EV, ruin probability, max consecutive losses)
- HeatmapPage: real hour×day heatmap from history, best/worst hour detection
- CalendarPage: day-by-day results calendar with detail modal
- LeaderboardPage: mix of real user stats + mock traders, podium, filters
- NotificationsPage: auto-generated alerts from history + persistent localStorage
- StrategiesPage: educational accordion with 6 strategies, logic/conditions/avoid
- TeamPage: real users from localStorage (staff roles only)
- TelegramPage: full config persistence (localStorage) + preview + toggle filters
- AffiliatesPage: referral link generation, commission table, localStorage persistence
- RevenuePage: real MRR from localStorage user list + plan prices + links/PIX config
- ReportsPage: real CSV/JSON export + AI loss pattern analysis

### localStorage Keys
- smpU7: users array
- smpH7: signal history (ts, result, asset, category, sess, direction, score)
- smpCfg7: config
- smpML7: ML weights per session/category context
- smpDiary7: diary entries
- smpGoals7: goals
- smpNotif7: notifications
- smpAff7: affiliate data
- smpLinks7: checkout links
- smpPix7: PIX config
- smpTelegram7: Telegram config
- smpAvatarColor: avatar color index
- smpAchievements7, smpTickets7, smpCoupons7, smpSnapshots7

### Key Dependencies
- zustand: global state management
- wouter: client-side routing
- framer-motion: animations
- recharts: analytics charts
- lucide-react + react-icons: icons
