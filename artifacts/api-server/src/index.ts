import app from "./app.js";
import { logger } from "./lib/logger.js";
import { seedUsers } from "./lib/seed.js";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, async (err?: Error) => {
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
});
