import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import rateLimit from "express-rate-limit";
import path from "path";
import { existsSync } from "fs";
import { fileURLToPath } from "url";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { onSignalReady, getPipelineStats, getWarmAssets } from "./lib/signalOrchestrator.js";

// Reliable base dir: works regardless of process.cwd()
// In dev:  src/app.ts  → __appDir = artifacts/api-server/src/   → ../../ = artifacts/
// In prod: dist/app.mjs → __appDir = artifacts/api-server/dist/  → ../../ = artifacts/
const __appDir = path.dirname(fileURLToPath(import.meta.url));
const artifactsDir = path.resolve(__appDir, "../../");

const app: Express = express();

// Trust reverse proxy (Replit deployment, Nginx, etc.)
app.set("trust proxy", 1);

// Allowed origins: localhost + qualquer subdomínio *.replit.app (dev e produção)
const allowedOrigins: (string | RegExp)[] = [
  /^http:\/\/localhost(:\d+)?$/,
  /^https:\/\/[\w-]+\.replit\.app$/,  // cobre dev e produção no Replit
  /^https:\/\/[\w-]+\.repl\.co$/,     // domínios legados do Replit
];
// Domínio customizado opcional
const prodDomain = process.env["PRODUCTION_DOMAIN"];
if (prodDomain) allowedOrigins.push(`https://${prodDomain}`);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "wss:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }),
);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      const allowed = allowedOrigins.some((o) =>
        typeof o === "string" ? o === origin : o.test(origin),
      );
      if (allowed) return cb(null, true);
      cb(new Error("CORS: origem não permitida"));
    },
    credentials: true,
  }),
);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Global rate limiter: 200 req / 15min por IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Muitas requisições. Tente novamente em alguns minutos." },
});

// Auth limiter mais restrito: 10 tentativas / 15min por IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: "Muitas tentativas de login. Aguarde 15 minutos." },
});

// OTP limiter: máximo 5 envios de código por IP / 15min
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Muitas solicitações de código. Aguarde 15 minutos." },
});

app.use("/api", limiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/send-otp", otpLimiter);
app.use("/api", router);

// ── Rota de métricas do pipeline do orquestrador ──────────────────────────
app.get("/api/pipeline-stats", (_req: Request, res: Response) => {
  res.json({ stats: getPipelineStats(), warm: getWarmAssets() });
});

// ── Registra handler do orquestrador: loga sinais emitidos ────────────────
onSignalReady((signal) => {
  logger.info({ asset: signal.asset, dir: signal.direction, score: signal.score, quality: signal.quality },
    "[Orchestrator] Sinal emitido");
});

// ── Servir OmniChat em /ai-chat/ ─────────────────────────────────────────
const aiChatDist = path.resolve(artifactsDir, "ai-chat/dist/public");
logger.info({ aiChatDist, exists: existsSync(aiChatDist) }, "OmniChat dist path");
if (existsSync(aiChatDist)) {
  logger.info({ aiChatDist }, "Servindo OmniChat em /ai-chat/");
  app.use("/ai-chat", express.static(aiChatDist, { maxAge: "1d" }));
  app.get("/ai-chat", (_req: Request, res: Response) => {
    res.sendFile(path.join(aiChatDist, "index.html"));
  });
  app.get("/ai-chat/{*path}", (_req: Request, res: Response) => {
    res.sendFile(path.join(aiChatDist, "index.html"));
  });
}

// ── Servir AI Nexus Studio em /ai-nexus-studio/ ───────────────────────────
// Needs permissive CSP: pure client-side app with inline scripts + CDN libs
const aiNexusDist = path.resolve(artifactsDir, "ai-nexus-studio/build");
logger.info({ aiNexusDist, exists: existsSync(aiNexusDist) }, "AI Nexus dist path");
// Remove Helmet's CSP for this path — AI Nexus uses inline scripts + CDN
app.use("/ai-nexus-studio", (_req: Request, res: Response, next: NextFunction) => {
  res.removeHeader("Content-Security-Policy");
  res.removeHeader("X-Content-Security-Policy");
  next();
});
if (existsSync(aiNexusDist)) {
  logger.info({ aiNexusDist }, "Servindo AI Nexus Studio em /ai-nexus-studio/");
  app.use("/ai-nexus-studio", express.static(aiNexusDist, { maxAge: "0" }));
}
app.get("/ai-nexus-studio", (_req: Request, res: Response) => {
  res.removeHeader("Content-Security-Policy");
  const f = path.join(aiNexusDist, "index.html");
  if (existsSync(f)) return res.sendFile(f);
  res.status(503).send("AI Nexus Studio building… please try again in a moment.");
});
app.get("/ai-nexus-studio/{*path}", (_req: Request, res: Response) => {
  res.removeHeader("Content-Security-Policy");
  const f = path.join(aiNexusDist, "index.html");
  if (existsSync(f)) return res.sendFile(f);
  res.status(503).send("AI Nexus Studio building… please try again in a moment.");
});

// ── Servir SignalMaster Pro na raiz ───────────────────────────────────────
const frontendDist = process.env["FRONTEND_DIST"] ||
  path.resolve(artifactsDir, "signalmaster-pro/dist/public");

if (existsSync(frontendDist)) {
  logger.info({ frontendDist }, "Servindo frontend estático");
  app.use(express.static(frontendDist, { maxAge: "1d" }));
  app.use((_req: Request, res: Response) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
} else {
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: "Rota não encontrada" });
  });
}

// Handler global de erros — captura qualquer erro não tratado nas rotas
// Em produção: não vaza stack trace; em dev: inclui detalhes para debug
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const isProd = process.env["NODE_ENV"] === "production";

  if (err instanceof Error) {
    logger.error({ err }, "Unhandled error");
    res.status(500).json({
      error: isProd ? "Erro interno do servidor" : err.message,
      ...(isProd ? {} : { stack: err.stack }),
    });
  } else {
    logger.error({ err }, "Unknown error");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

export default app;
