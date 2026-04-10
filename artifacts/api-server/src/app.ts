import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import rateLimit from "express-rate-limit";
import path from "path";
import { existsSync } from "fs";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";

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

// Servir frontend estático (para VPS sem Nginx)
const frontendDist = process.env["FRONTEND_DIST"] ||
  path.resolve(process.cwd(), "../signalmaster-pro/dist/public");

if (existsSync(frontendDist)) {
  logger.info({ frontendDist }, "Servindo frontend estático");
  app.use(express.static(frontendDist, { maxAge: "1d" }));
  app.get("*", (_req: Request, res: Response) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
} else {
  // 404 — rota não encontrada (sem frontend)
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
