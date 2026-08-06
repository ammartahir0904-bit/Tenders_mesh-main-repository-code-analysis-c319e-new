export async function withRetry<T>(operation: () => Promise<T>, options: { retries?: number; delayMs?: number; shouldRetry?: (error: unknown) => boolean } = {}): Promise<T> {
  const retries = options.retries ?? 2;
  const delayMs = options.delayMs ?? 1000;
  const shouldRetry = options.shouldRetry ?? (() => true);

  let attempt = 0;
  let lastError: unknown;

  while (attempt <= retries) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === retries || !shouldRetry(error)) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      attempt += 1;
    }
  }

  throw lastError;
}
