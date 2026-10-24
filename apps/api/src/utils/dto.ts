import type { z } from "zod";
import { InternalServerError } from "../errors";
// Invalid stored output is a server error, never a client validation failure.
export function serializeDto<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) throw new InternalServerError();
  return result.data;
}
