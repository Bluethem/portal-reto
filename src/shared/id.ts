export function randomRoomId(): string {
  return `pub-${randomRoomCode()}`;
}

export function randomRoomCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}
