import type { GameSession } from '@prisma/client'
import type { SessionShape } from '@/lib/schemas/sessions'

export const MICROBES_PER_ROUND = 1
export const TOTAL_ROUNDS = 5
export const TOTAL_MICROBES = TOTAL_ROUNDS * MICROBES_PER_ROUND

// The clue slot that is force-opened at the start of every round. Slot 4 is the
// CLINICAL_MANIFESTATION card (see SLOT_CATEGORIES in lib/clues.ts) — the
// strongest single clue — so every game begins with it already revealed. Kept
// here as one shared constant so the server (seeds revealedSlots) and the client
// (mirrors the reveal) can never drift apart.
export const FORCED_CLUE_SLOT = 4

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
