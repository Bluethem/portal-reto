import { CREW_COLORS } from "../ui/crew-colors";

const KEY = "cable-rush-color";

export function getProfileColor(): string {
  const stored = localStorage.getItem(KEY);
  if (stored && CREW_COLORS.some((c) => c === stored)) return stored;
  const fallback = CREW_COLORS[Math.floor(Math.random() * CREW_COLORS.length)];
  try {
    localStorage.setItem(KEY, fallback);
  } catch {
    // ignore
  }
  return fallback;
}

export function setProfileColor(hex: string): void {
  localStorage.setItem(KEY, hex.toUpperCase());
}
