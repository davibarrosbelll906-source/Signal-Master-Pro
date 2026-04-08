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

const socketOrigins: (string | RegExp)[] = [/^http:\/\/localhost(:\d+)?$/];
const replitDev = process.env["REPLIT_DEV_DOMAIN"];
if (replitDev) socketOrigins.push(`https://${replitDev}`);
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
