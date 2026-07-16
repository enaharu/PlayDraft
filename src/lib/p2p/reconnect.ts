export function reconnectDelay(attempt: number): number {
  return Math.min(1000 * 2 ** Math.max(0, attempt), 15_000)
}
