import "dotenv/config";
import { publicServerConfig } from "./config/public";
import { createPublicApp } from "./publicApp";
import { prisma } from "./db/prisma";

// Deliberately opt-in and loopback-bound. This is not production ingress wiring.
const options = publicServerConfig();
const server = createPublicApp(prisma, options).listen(options.port, "127.0.0.1", () => {
  console.log(`Public ${options.surface} renderer listening on loopback port ${options.port}`);
});
async function close() { server.closeAllConnections(); server.close(); await prisma.$disconnect(); }
process.on("SIGTERM", () => { void close(); });
process.on("SIGINT", () => { void close(); });
