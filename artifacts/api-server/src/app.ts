import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import rateLimit from "express-rate-limit";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";

const app: Express = express();

// Trust reverse proxy (Replit deployment, Nginx, etc.)
app.set("trust proxy", 1);

// Allowed origins: Replit dev domain + production domain
const allowedOrigins = (() => {
  const origins: (string | RegExp)[] = [
    /^http:\/\/localhost(:\d+)?$/,
  ];
  const replitDev = process.env["REPLIT_DEV_DOMAIN"];
  if (replitDev) origins.push(`https://${replitDev}`);
  const prodDomain = process.env["PRODUCTION_DOMAIN"];
  if (prodDomain) origins.push(`https://${prodDomain}`);
  return origins;
})();

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

app.use("/api", limiter);
app.use("/api/auth/login", authLimiter);
app.use("/api", router);

export default app;
