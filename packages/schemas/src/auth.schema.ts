import { z } from "zod";
import { EmailSchema } from "./common.schema.js";

export const RegisterSchema = z.object({
  email: EmailSchema,
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required").min(2, "Name must be at least 2 characters"),
});

export const LoginSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1, "Password is required"),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;