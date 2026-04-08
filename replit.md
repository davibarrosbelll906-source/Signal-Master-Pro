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

## Security Architecture (Updated)

### Authentication
- **Backend JWT auth**: `POST /api/auth/login` returns `accessToken` (8h) + `refreshToken` (30d)
- **bcrypt**: All passwords hashed with cost factor 12 (never stored in plaintext)
- **Rate limiting**: 200 req/15min global, 20 req/15min on `/api/auth/login`
- **Auth middleware**: `requireAuth` verifies JWT on all protected routes
- **Frontend**: `apiClient.ts` auto-injects Bearer token + handles refresh + redirects on 401
- **Store**: No more plaintext passwords in localStorage — only JWT tokens

### Database (PostgreSQL + Drizzle)
- Tables: `smp_users`, `smp_trades` (schema in `lib/db/src/schema/`)
- Seed: 6 default users created on server startup via `bcrypt.hash(password, 12)`
- Push schema: `pnpm --filter @workspace/db run push`

### API Routes
- `POST /api/auth/login` — login, returns JWT pair
- `POST /api/auth/refresh` — refresh access token
- `GET /api/auth/me` — get current user (requires auth)
- `GET /api/trades` — list trades for user (requires auth)
- `POST /api/trades` — record a trade (requires auth)
- `DELETE /api/trades/today` — clear today's trades
- `DELETE /api/trades/all` — clear all trades
- `POST /api/email/daily-report` — envia relatório diário por e-mail (Resend)
- `POST /api/email/alert` — envia alerta de meta/stop por e-mail (Resend)
- `GET /api/leaderboard?period=7d|30d|all` — ranking global do banco de dados
- `GET /api/stripe/plans` — lista planos de assinatura
- `GET /api/stripe/config` — publishable key do Stripe
- `POST /api/stripe/create-checkout` — cria sessão de checkout Stripe
- `POST /api/stripe/webhook` — webhook Stripe (atualiza plano do user no DB)

### localStorage (UI-only, non-sensitive)
Keys kept: `smpMode7`, `smpBroker7`, `smpMgmt7`, `smpTheme`, `smpTimeframe`, `smpWatchedPairs`, `smpPin7`, `smpPinEnabled7`, `smpCurrentUser7` (non-sensitive user object), `smpJwt7`, `smpRefresh7`

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
- SignalsPage: real Binance REST+WS for crypto, OU simulation for forex/commodity; ManagementPanel (banca/entrada/meta/stop config + progress bars + full-screen goal/stop notifications); Copy Signal button (copies to clipboard with quality/score/timeframe); PIN lock via usePinLock hook (5-min inactivity)
- HistoryPage: localStorage history with filters and CSV export
- AnalyticsPage: Recharts charts (session WR, equity curve real (banca), asset WR, indicator accuracy, hour-by-hour Win Rate) + métricas profissionais: Profit Factor, Expectância, Índice de Sharpe, Max Drawdown
- SettingsPage: all settings persisted to smpCfg7
- AdminPage: full user CRUD from localStorage + plan management
- AchievementsPage: 21 real achievements with progress tracking (including Primeira Semana, Elite Signal, Morning/Night sessions, Crypto King, Forex Master, Green Month, Iron Discipline, Grand Master)
- BankPage: equity curve chart, bankroll simulator (Kelly/Soros/Martingale)
- BacktestingPage: real OU+indicators, equity curve chart
- DiaryPage: full localStorage persistence, mood tracking, expandable entries
- ProfilePage: real stats from history, editable profile, avatar color picker
- ScoreboardPage: real asset rankings from localStorage, session stats, podium
- GoalsPage: create/track custom goals (winRate/ops/streak/wins) per period
- RiskPage: full risk calculator (Kelly criterion, EV, ruin probability, max consecutive losses)
- HeatmapPage: real hour×day heatmap from history, best/worst hour detection
- CalendarPage: dual-tab — trading calendar (monthly grid, W/L per day) + economic calendar (today's high/medium/low impact events with countdown, upcoming events for the week)
- LeaderboardPage: ranking global real do banco de dados via `/api/leaderboard`, podium, filtro por período, fallback para stats locais
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
- smpMgmt7: management panel config (banca, entrada, payout, metaWins, stopLosses)
- smpPin7: PIN hash, smpPinEnabled7: '1' if PIN active

### v7.1 New Features
- **IA Explicativa**: botão "Por que este sinal?" em cada card — `explainSignal()` em signalEngine.ts gera bullets detalhados por indicador — bloqueado para plano Básico com badge 🔒 PRO
- **PWA**: vite-plugin-pwa configurado, manifest.json, ícones 192/512, Workbox cache para Binance API
- **Analytics Profissionais**: Profit Factor, Expectância, Índice de Sharpe, Max Drawdown, Equity Curve real acumulada — KPIs avançados bloqueados com PlanGate para PRO+
- **Leaderboard Real**: rota `/api/leaderboard` com dados do PostgreSQL, substituindo mock traders
- **E-mail**: Resend daily-report + alertas meta/stop via `/api/email/`
- **Stripe Assinaturas**: 3 planos (Básico grátis, PRO R$49,90, PREMIUM R$99,90), checkout, webhooks; PlansPage em `/dashboard/plans`

### Luna AI + Plan-Based Access Control (v7.2)
- **Luna AI**: Floating 🌙 button; streaming SSE chat com `gpt-5.2`; chart capture via html2canvas + GPT Vision; histórico em DB (conversations + messages)
- **Luna Analyses Library**: DB table `luna_analyses`; auto-save após análise de gráfico; `/dashboard/luna-analyses` — restrito a PRO+
- **Limites por plano (backend + frontend)**:
  - Básico: 10 msgs/dia total, sem análise de gráfico, sem biblioteca de análises
  - PRO: 5 análises de gráfico/dia, 50 análises salvas máximo, sem limite de mensagens
  - PREMIUM: ilimitado
  - Admin: ilimitado (bypassa tudo)
- **Backend**: verificações em `/api/luna/conversations/:id/messages` (count msgs do dia via DB); `/api/luna/usage` (retorna uso atual + limites); `requirePlan("pro")` em GET/POST `/api/luna/analyses`
- **Frontend**: `usePlan()` em LunaChat (botão gráfico bloqueado com 🔒 para Básico); `PlanGate` em LunaAnalysesPage + AnalyticsPage (KPIs profissionais); `PairMonitorIAButton` com lock badge para "Por que este sinal?"

### Stripe Config
- Env vars: `STRIPE_PRICE_PRO`, `STRIPE_PRICE_PREMIUM` (set via shared environment)
- Webhook: configure endpoint `/api/stripe/webhook` no dashboard Stripe
- Env: `STRIPE_WEBHOOK_SECRET` (opcional para prod)
- Connector: Stripe Sandbox via Replit integrations

### Key Dependencies
- zustand: global state management
- wouter: client-side routing
- framer-motion: animations
- recharts: analytics charts
- lucide-react + react-icons: icons
- stripe@20.0.0 + stripe-replit-sync@1.0.0 (api-server)
- @stripe/stripe-js (frontend)
- vite-plugin-pwa (frontend PWA)
- resend (api-server e-mail)
