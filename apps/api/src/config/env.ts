import { z } from "zod";

/**
 * Environment variable validation schema
 * All required variables must be defined in .env file
 */
const EnvSchema = z.object({
  // Node environment
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  // Server configuration
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().default("0.0.0.0"),

  // Database
  DATABASE_URL: z
    .string()
    .url("DATABASE_URL must be a valid PostgreSQL connection string")
    .refine(
      (url) => url.includes("postgresql://") || url.includes("postgres://"),
      "DATABASE_URL must be a PostgreSQL connection string"
    ),

  // Authentication
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters")
    .describe("Secret key for JWT signing"),
  JWT_EXPIRY: z.templateLiteral([z.number(), z.enum(["ms", "s", "m", "h", "d", "w", "y"])])
    .refine(value => Number.isFinite(Number.parseFloat(value)) && Number.parseFloat(value) > 0, "JWT_EXPIRY must be a positive duration")
    .default("7d"),

  // Storage
  STORAGE_TYPE: z.enum(["local", "s3", "gcs"]).default("local"),
  STORAGE_PATH: z.string().default("./uploads"),

  // AWS S3 (optional, required if STORAGE_TYPE=s3)
  AWS_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),

  // Google Cloud Storage (optional, required if STORAGE_TYPE=gcs)
  GCS_PROJECT_ID: z.string().optional(),
  GCS_BUCKET: z.string().optional(),
  GCS_KEY_FILE: z.string().optional(),

  // Email configuration
  EMAIL_PROVIDER: z.enum(["smtp", "resend", "sendgrid"]).default("smtp"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  SENDGRID_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email("EMAIL_FROM must be a valid email address"),

  // Development/Debug
  DEV_AUTH: z.enum(["true", "false"]).default("false"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),

  // CORS
  CORS_ORIGIN: z.string().default("*"),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000), // 15 min
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),
});

export type Env = z.infer<typeof EnvSchema>;

/**
 * Parse and validate environment variables
 * Throws error with helpful message if validation fails
 */
function parseEnvironment(): Env {
  try {
    return EnvSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues
        .map(
          (issue) =>
            `${issue.path.join(".")}: ${issue.message}`
        )
        .join("\n  ");

      console.error(
        "❌ Environment variable validation failed:\n  " + issues
      );
      process.exit(1);
    }
    throw error;
  }
}

/**
 * Parsed and validated environment variables
 * Safe to use throughout the application with type safety
 */
export const env = parseEnvironment();

/**
 * Environment detection helpers
 */
export const isDevelopment = (): boolean => env.NODE_ENV === "development";
export const isProduction = (): boolean => env.NODE_ENV === "production";
export const isTest = (): boolean => env.NODE_ENV === "test";

/**
 * Configuration derived from environment
 */
export const config = {
  // Server
  server: {
    host: env.HOST,
    port: env.PORT,
    isDev: isDevelopment(),
  },

  // Database
  database: {
    url: env.DATABASE_URL,
  },

  // Authentication
  auth: {
    jwtSecret: env.JWT_SECRET,
    jwtExpiry: env.JWT_EXPIRY,
  },

  // Storage
  storage: {
    type: env.STORAGE_TYPE,
    local: {
      path: env.STORAGE_PATH,
    },
    s3: {
      region: env.AWS_REGION,
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      bucket: env.AWS_S3_BUCKET,
      enabled: env.STORAGE_TYPE === "s3",
    },
    gcs: {
      projectId: env.GCS_PROJECT_ID,
      bucket: env.GCS_BUCKET,
      keyFile: env.GCS_KEY_FILE,
      enabled: env.STORAGE_TYPE === "gcs",
    },
  },

  // Email
  email: {
    provider: env.EMAIL_PROVIDER,
    from: env.EMAIL_FROM,
    smtp: {
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      user: env.SMTP_USER,
      password: env.SMTP_PASSWORD,
      enabled: env.EMAIL_PROVIDER === "smtp",
    },
    resend: {
      apiKey: env.RESEND_API_KEY,
      enabled: env.EMAIL_PROVIDER === "resend",
    },
    sendgrid: {
      apiKey: env.SENDGRID_API_KEY,
      enabled: env.EMAIL_PROVIDER === "sendgrid",
    },
  },

  // Development
  dev: {
    authBypass: env.DEV_AUTH === "true",
    logLevel: env.LOG_LEVEL,
  },

  // Security
  security: {
    corsOrigin: env.CORS_ORIGIN,
    rateLimit: {
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
    },
  },
} as const;