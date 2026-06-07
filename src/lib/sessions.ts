import type { GameSession } from '@prisma/client'
import type { SessionShape } from '@/lib/schemas/sessions'

export const MICROBES_PER_ROUND = 1
export const TOTAL_ROUNDS = 5
export const TOTAL_MICROBES = TOTAL_ROUNDS * MICROBES_PER_ROUND

export function formatSession(
  session: GameSession,
  totalScores: number,
  revealedSlots: number[] = [],
): SessionShape {
  const currentMicrobeInRound = (totalScores % MICROBES_PER_ROUND) + 1
  return {
    id: session.id,
    gameMode: session.gameMode,
    heartsLeft: session.heartsLeft,
    totalScore: session.totalScore,
    currentRound: session.currentRound,
    currentMicrobeInRound,
    slots: Array.from({ length: 5 }, (_, i) => ({
      index: i,
      revealed: revealedSlots.includes(i),
    })),
  }
}
