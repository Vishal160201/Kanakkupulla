export class FetchError extends Error {
  status: number;
  info: unknown;

  constructor(message: string, status: number, info?: unknown) {
    super(message);
    this.name = "FetchError";
    this.status = status;
    this.info = info;
  }
}

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Shared SWR fetcher. Throws a FetchError (with HTTP status and the API's
 * `error` message, when present) for non-2xx responses so SWR exposes it via
 * `error` instead of handing the error payload to consumers as `data`.
 */
// Returns `any` (like the previous inline fetchers) so SWR consumers keep their
// loose typing; pass a generic to useSWR<T>() where a typed response is wanted.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetcher(url: string, init?: RequestInit): Promise<any> {
  const res = await fetch(url, init);

  if (!res.ok) {
    const body = await parseBody(res);
    const message =
      (body && typeof body === "object" && "error" in body && typeof (body as { error: unknown }).error === "string"
        ? (body as { error: string }).error
        : null) || `Request failed with status ${res.status}`;
    throw new FetchError(message, res.status, body);
  }

  return res.json();
}

export default fetcher;
