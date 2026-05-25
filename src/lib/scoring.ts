export function calculateRoundScore(cardsOpened: number, correct: boolean): number {
  if (!correct) return 0
  return Math.max(0, 100 - (cardsOpened - 1) * 20)
}
