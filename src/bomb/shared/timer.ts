export function formatMs(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatPercent(ratio: number): string {
  return `${Math.round(Math.min(1, Math.max(0, ratio)) * 100)}%`;
}
