import { createServer } from 'http';
import { Server as IOServer } from 'socket.io';
import app from "./app.js";
import { logger } from "./lib/logger.js";
import { seedUsers } from "./lib/seed.js";
import { initSignalEngine } from "./lib/backendSignalEngine.js";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const httpServer = createServer(app);

const socketOrigins: (string | RegExp)[] = [
  /^http:\/\/localhost(:\d+)?$/,
  /^https:\/\/[\w-]+\.replit\.app$/,
  /^https:\/\/[\w-]+\.repl\.co$/,
];
const prodDomain = process.env["PRODUCTION_DOMAIN"];
if (prodDomain) socketOrigins.push(`https://${prodDomain}`);

const io = new IOServer(httpServer, {
  cors: { origin: socketOrigins, credentials: true },
  transports: ['websocket', 'polling'],
});

httpServer.listen(port, async (err?: Error) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
  try {
    await seedUsers();
    logger.info("Seed de usuários concluído");
  } catch (e) {
    logger.error({ err: e }, "Erro no seed de usuários");
  }
  initSignalEngine(io);
});

// Graceful shutdown — fecha conexões limpas ao receber SIGTERM (deploy, restart)
function shutdown(signal: string) {
  logger.info({ signal }, "Sinal recebido, encerrando servidor...");
  io.close(() => {
    httpServer.close(() => {
      logger.info("Servidor encerrado com sucesso");
      process.exit(0);
    });
  });
  // Força saída após 10s se as conexões não fecharem
  setTimeout(() => {
    logger.warn("Timeout no shutdown, forçando saída");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
