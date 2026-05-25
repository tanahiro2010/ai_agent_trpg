export type RetryOptions = {
  maxAttempts: number;
  delayMs?: number;
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  const { maxAttempts, delayMs = 0 } = options;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts && delayMs > 0) {
        await Bun.sleep(delayMs);
      }
    }
  }

  throw lastError;
}
