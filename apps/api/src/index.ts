import "dotenv/config";
import * as express from "express";
import * as cors from "cors";
import { prisma } from "./db/prisma";
import { eventsRouter } from "./routes/events";
import { performancesRouter } from "./routes/performances";
import { studiosRouter } from "./routes/studios";
import { dancersRouter } from "./routes/dancers";
import { authRouter } from "./routes/auth";
import { AuthContext } from "./middleware/auth";
import { authMiddleware } from "./middleware/auth";

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
});

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

// Public routes
app.get("/health", async (req, res) => { 
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.send({ status: "ok" });
  } catch (err) {
    res.status(500).send({ status: "error", error: err });
  }
 });
app.post("/auth/register", authRouter(prisma));
app.post("/auth/login", authRouter(prisma));

// Authenticated routes
app.use(authMiddleware);
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

// Global error handler
interface ErrorResponse {
  error: string;
  statusCode: number;
  details?: unknown;
}

interface CustomError extends Error {
  name: string;
  statusCode?: number;
  details?: unknown;
}

app.use((err: CustomError, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const isValidation =
    err?.name === "ZodError" ||
    err?.statusCode === 400;

  const statusCode = isValidation ? 400 : err?.statusCode ?? 500;

  const body: ErrorResponse = {
    error: err?.message ?? "Unexpected error",
    statusCode,
    ...(err?.details ? { details: err.details } : {}),
  };

  console.error("Unhandled error:", err);
  res.status(statusCode).json(body);
});

const PORT = 4000;
app.listen(PORT, () => console.log(`API running at http://localhost:${PORT}`));

