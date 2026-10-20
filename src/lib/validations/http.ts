import { NextResponse } from "next/server";
import { z } from "zod";

export type ParseResult<T> =
  | { data: T; error?: undefined }
  | { data?: undefined; error: NextResponse };

/**
 * 422 response in the shape the transactions routes (and their callers) already use.
 * `error` carries the first field message so callers that only show `data.error` stay readable.
 */
export function validationError(errors: Record<string, string>) {
  const first = Object.values(errors)[0];
  return NextResponse.json({ error: first || "Validation failed", errors }, { status: 422 });
}

/** First message per field path, e.g. `{ amount: "Amount must be a positive number." }`. */
export function issuesToErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.map(String).join(".") : "_root";
    if (!(key in errors)) errors[key] = issue.message;
  }
  return errors;
}

export function parseWith<S extends z.ZodType>(schema: S, input: unknown): ParseResult<z.output<S>> {
  const result = schema.safeParse(input);
  return result.success ? { data: result.data } : { error: validationError(issuesToErrors(result.error)) };
}

/** Reads and validates a JSON body. Malformed JSON → 400, schema failure → 422. */
export async function parseJsonBody<S extends z.ZodType>(request: Request, schema: S): Promise<ParseResult<z.output<S>>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { error: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }) };
  }
  return parseWith(schema, raw);
}

/** Validates query params (each key's last value) against an object schema. */
export function parseSearchParams<S extends z.ZodType>(source: Request | URL | URLSearchParams, schema: S): ParseResult<z.output<S>> {
  const params =
    source instanceof URLSearchParams ? source : source instanceof URL ? source.searchParams : new URL(source.url).searchParams;
  return parseWith(schema, Object.fromEntries(params.entries()));
}

/** Validates route params (e.g. `{ id }`). */
export function parseParams<S extends z.ZodType>(params: unknown, schema: S): ParseResult<z.output<S>> {
  return parseWith(schema, params);
}

/** Rejects JSON values that are not plain objects (arrays, primitives, null). */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
