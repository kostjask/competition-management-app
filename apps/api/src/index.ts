import "dotenv/config";
import { env, config } from "./config/env";
import { prisma } from "./db/prisma";
import { createApp } from "./app";
import { setStorageProvider } from "./services/storage";
import { LocalStorageService } from "./services/local-storage";
import { startEmailWorker } from "./services/emailQueue";
import { startContentCleanup } from "./services/contentStorage";
import { initializeMusicStorage, startMusicCleanup } from "./services/musicStorage";

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
});

setStorageProvider(new LocalStorageService());
// Validate the private volume before accepting traffic.
void initializeMusicStorage().then(start).catch(() => { console.error("Private music storage initialization failed"); process.exitCode = 1; void prisma.$disconnect(); });
function start() {
const app = createApp(prisma);
const stopEmailWorker = startEmailWorker(prisma);
const stopContentCleanup = startContentCleanup(prisma);
const stopMusicCleanup = startMusicCleanup(prisma);

process.on("SIGTERM", async () => {
  stopEmailWorker();
  stopContentCleanup();
  stopMusicCleanup();
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGINT", async () => {
  stopEmailWorker();
  stopContentCleanup();
  stopMusicCleanup();
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
}
