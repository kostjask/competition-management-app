import "dotenv/config";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { publicServerConfig } from "./config/public";
import { createPublicApp } from "./publicApp";
import { prisma } from "./db/prisma";

// Explicit loopback rehearsal; the ordinary API/public entry points stay separate.
const options = publicServerConfig();
if (options.surface !== "festival") throw new Error("Workspace rehearsal requires PUBLIC_SURFACE=festival");
const directory = resolve(__dirname, "../../web/dist");
if (!["index.html", "identity-link.js"].every(file => existsSync(resolve(directory, file)))) throw new Error("Build the web workspace before starting the rehearsal");
const server = createPublicApp(prisma, options, directory).listen(options.port, "127.0.0.1", () => {
  console.log(`Festival workspace rehearsal listening on loopback port ${options.port}`);
});
async function close() { server.closeAllConnections(); server.close(); await prisma.$disconnect(); }
process.on("SIGTERM", () => { void close(); });
process.on("SIGINT", () => { void close(); });
