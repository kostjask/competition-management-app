import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { prisma } from "./db/prisma";
import { eventsRouter } from "./routes/events";
import { studiosRouter } from "./routes/studios";
import { dancersRouter } from "./routes/dancers";
import { authRouter } from "./routes/auth";
import { invitationsRouter } from "./routes/invitations";
import { judgesRouter } from "./routes/judges";
import { categoriesRouter } from "./routes/categories";
import { formatsRouter } from "./routes/formats";
import { ageGroupsRouter } from "./routes/age-groups";
import { imagesRouter } from "./routes/images";
import { AuthContext } from "./middleware/auth";
import { authMiddleware } from "./middleware/auth";
import { setStorageProvider } from "./services/storage";
import { LocalStorageService } from "./services/local-storage";

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

// Initialize storage provider
setStorageProvider(new LocalStorageService());

app.use(cors({ origin: "*" }));
app.use(express.json());

// Serve uploaded files
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Public routes
app.get("/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.send({ status: "ok" });
  } catch (err) {
    res.status(500).send({ status: "error", error: err });
  }
});

app.use("/auth", (req, res, next) => {
  const isPublicAuth =
    req.method === "POST" &&
    (req.path === "/register" || 
     req.path === "/login" || 
     req.path === "/verify-email");

  if (isPublicAuth) return next();
  return authMiddleware(req, res, next);
});
app.use("/auth", authRouter(prisma));

// Public invitation acceptance
app.use("/invitations", (req, res, next) => {
  const isPublicInvitation =
    (req.method === "POST" && req.path === "/accept") ||
    (req.method === "GET" && req.path.match(/^\/[^\/]+$/));

  if (isPublicInvitation) return next();
  return authMiddleware(req, res, next);
});
app.use("/invitations", invitationsRouter(prisma));

// Authenticated routes
app.use(authMiddleware);
app.use("/events", eventsRouter(prisma));
app.use("/events", judgesRouter(prisma));
app.use("/events", categoriesRouter(prisma));
app.use("/events", formatsRouter(prisma));
app.use("/events", ageGroupsRouter(prisma));
app.use("/studios", studiosRouter(prisma));
app.use("/dancers", dancersRouter(prisma));
app.use("/images", imagesRouter(prisma));

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

app.use(
  (
    err: CustomError,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    const isValidation = err?.name === "ZodError" || err?.statusCode === 400;

    const statusCode = isValidation ? 400 : (err?.statusCode ?? 500);

    const body: ErrorResponse = {
      error: err?.message ?? "Unexpected error",
      statusCode,
      ...(err?.details ? { details: err.details } : {}),
    };

    console.error("Unhandled error:", err);
    res.status(statusCode).json(body);
  },
);

const PORT = 4000;
app.listen(PORT, () => console.log(`API running at http://localhost:${PORT}`));
