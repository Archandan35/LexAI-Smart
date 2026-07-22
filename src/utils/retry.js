export async function withRetry(fn, { maxRetries = 3, baseDelay = 500, onRetry } = {}) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxRetries) throw err;
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 100;
      if (onRetry) onRetry(err, attempt, delay);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}
