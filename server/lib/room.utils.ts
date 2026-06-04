export function getTargetCount(playerCount: number): number {
  return Math.pow(2, Math.ceil(Math.log2(playerCount)));
}

export function generateRoomId(): string {
  return crypto.randomUUID().substring(0, 6).toUpperCase();
}
