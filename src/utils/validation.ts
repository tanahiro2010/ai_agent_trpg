import type { ZodType } from "zod";
import { log } from "./logger.ts";

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export function validateWithSchema<T>(
  schema: ZodType<T>,
  data: unknown,
  label: string,
): ValidationResult<T> {
  const result = schema.safeParse(data);
  if (result.success) {
    return { ok: true, data: result.data };
  }
  const error = result.error.issues.map((i) => i.message).join("; ");
  log(label, "validation failed", { error, data }, "warn");
  return { ok: false, error };
}
