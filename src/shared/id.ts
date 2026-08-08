export function randomRoomId(): string {
  return `pub-${Math.random().toString(36).slice(2, 10)}`;
}

export function randomRoomCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}
