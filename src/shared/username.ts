const KEY = "cable-rush-username";

export function getUsername(): string | null {
  return localStorage.getItem(KEY);
}

export function setUsername(name: string): void {
  localStorage.setItem(KEY, name);
}
