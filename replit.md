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

### localStorage Keys
- smpU7: users array
- smpH7: signal history
- smpCfg7: config
- smpML7: ML weights per session/category context
- smpAchievements7, smpDiary7, smpNotif7, smpGoals7, smpAff7, smpTickets7, smpCoupons7, smpSnapshots7, smpPix7

### Key Dependencies
- zustand: global state management
- wouter: client-side routing
- framer-motion: animations
- recharts: analytics charts
- lucide-react + react-icons: icons
