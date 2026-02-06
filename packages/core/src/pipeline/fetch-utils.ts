const DEFAULT_TIMEOUT = 15_000;
const DEFAULT_MAX_RETRIES = 2;
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503]);

export interface RetryOptions {
  timeout?: number;
  maxRetries?: number;
  signal?: AbortSignal;
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("econnreset") ||
      msg.includes("etimedout") ||
      msg.includes("fetch failed") ||
      msg.includes("network") ||
      msg.includes("aborted")
    );
  }
  return false;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchWithRetry(url: string, options?: RetryOptions): Promise<Response> {
  const timeout = options?.timeout ?? DEFAULT_TIMEOUT;
  const maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const timeoutSignal = AbortSignal.timeout(timeout);
      const signals: AbortSignal[] = [timeoutSignal];
      if (options?.signal) signals.push(options.signal);

      const combinedSignal = signals.length === 1 ? signals[0] : AbortSignal.any(signals);

      const response = await fetch(url, { signal: combinedSignal });

      if (RETRYABLE_STATUS_CODES.has(response.status) && attempt < maxRetries) {
        const backoffMs = 1000 * Math.pow(2, attempt);
        await delay(backoffMs);
        continue;
      }

      return response;
    } catch (error: unknown) {
      if (attempt < maxRetries && isRetryableError(error)) {
        const backoffMs = 1000 * Math.pow(2, attempt);
        await delay(backoffMs);
        continue;
      }
      throw error;
    }
  }

  // Unreachable, but satisfies TypeScript
  throw new Error(`fetchWithRetry: exhausted ${maxRetries} retries for ${url}`);
}

export async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number,
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < tasks.length) {
      const idx = nextIndex++;
      results[idx] = await tasks[idx]();
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}
