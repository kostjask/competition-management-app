import "dotenv/config";
import express from "express";
import cors from "cors";
import { prisma } from "./db/prisma";
import { eventsRouter } from "./routes/events";
import { performancesRouter } from "./routes/performances";
import { studiosRouter } from "./routes/studios";
import { dancersRouter } from "./routes/dancers";
import { AuthContext } from "./middleware/auth";

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

app.use((req, _res, next) => {
  if (process.env.DEV_AUTH === "true") {
    const permissions = new Set([
      "event.manage",
      "studio.manage",
      "dancer.manage",
      "performance.manage",
      "event.register",
      "score.submit",
    ]);

    const auth: AuthContext = {
      userId: "dev-admin",
      isAdmin: true,
      permissionsByEvent: new Map([[null, permissions]]),
    };

    req.auth = auth;
  }
  next();
});

app.get("/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.send({ status: "ok" });
  } catch (err) {
    res.status(500).send({ status: "error", error: err });
  }
});

app.use("/events", eventsRouter(prisma));
app.use("/performances", performancesRouter(prisma));
app.use("/studios", studiosRouter(prisma));
app.use("/dancers", dancersRouter(prisma));

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

const PORT = 4000;
app.listen(PORT, () => console.log(`API running at http://localhost:${PORT}`));

