import type { AuthContext } from "../middleware/auth"
import type { Express } from "express"

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext
      file?: Express.Multer.File
    }
  }
}

export {}