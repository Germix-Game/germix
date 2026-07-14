export function calculateRoundScore(cardsOpened: number, correct: boolean): number {
  if (!correct) return 0
  // The first 2 opened cards keep the full 100 points; every card beyond the
  // 2nd costs 25. (The clinical-manifestation card is force-opened each round,
  // so it counts as the 1st of those 2 "free" cards.) Clamped so it never
  // drops below 0.
  return Math.max(0, 100 - Math.max(0, cardsOpened - 2) * 25)
}
