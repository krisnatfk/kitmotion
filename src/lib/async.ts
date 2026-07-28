/**
 * Resolve an async operation with a safe fallback when an optional data source
 * fails or takes too long. This keeps non-critical dashboard widgets from
 * blocking the whole page.
 */
export async function withTimeoutFallback<T>(
  operation: Promise<T>,
  fallback: T,
  timeoutMs = 4_000,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => resolve(fallback), timeoutMs);
  });

  try {
    return await Promise.race([
      operation.catch(() => fallback),
      timeout,
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
