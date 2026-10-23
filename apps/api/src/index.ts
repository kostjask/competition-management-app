import "dotenv/config";
import { env, config } from "./config/env";
import { prisma } from "./db/prisma";
import { createApp } from "./app";
import { setStorageProvider } from "./services/storage";
import { LocalStorageService } from "./services/local-storage";

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
});

setStorageProvider(new LocalStorageService());
const app = createApp(prisma);

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});


const PORT = config.server.port;
const HOST = config.server.host;

app.listen(PORT, HOST, () => {
  console.log(`API running at http://${HOST}:${PORT}`);
  console.log(`Environment: ${env.NODE_ENV}`);
  console.log(`Auth bypass: ${config.dev.authBypass ? "ENABLED" : "disabled"}`);
});
