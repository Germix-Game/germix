import { prisma } from '@/lib/prisma'
import type { CardCategory } from '@prisma/client'

const SLOT_CATEGORIES: CardCategory[][] = [
  ['GRAM_STAIN', 'MORPHOLOGY'], // slot 0 — Gram stain / morphology
  ['VIRULENCE_FACTOR'],         // slot 1 — Virulence factors
  ['LAB_CHARACTERISTIC'],       // slot 2 — Lab high-yield
  ['SPECIAL_TRAIT'],            // slot 3 — Special features
  ['CLINICAL_MANIFESTATION'],   // slot 4 — Diseases + key clinical clues
]

type WithCategory = { clueCard: { category: CardCategory } }

// Map a microbe's clues (sorted by sortOrder) onto the fixed slot layout: one
// clue per slot, in FIXED slot order, picking the first candidate (lowest
// sortOrder) within each category group. Pure and DETERMINISTIC — the same input
// always yields the same slot→clue mapping. This is what guarantees the cards the
// player sees (/cards) match the card that gets revealed/graded (/reveal): both
// routes run this over the same sortOrder-sorted clue list. null if the microbe
// lacks a category group.
export function selectSlotClues<T extends WithCategory>(cluesSortedByOrder: T[]): (T | null)[] {
  return SLOT_CATEGORIES.map((group) => {
    const candidates = cluesSortedByOrder.filter((mc) => group.includes(mc.clueCard.category))
    return candidates[0] ?? null
  })
}

// One clue card per slot, in fixed slot order (length 5). null if microbe lacks
// a group. Shared by the cards route; the reveal route maps its already-joined
// clues with selectSlotClues directly so the two stay in lockstep.
export async function getRoundClues(microbeId: string) {
  const all = await prisma.microbeClue.findMany({
    where: { microbeId },
    orderBy: { sortOrder: 'asc' },
    include: { clueCard: true },
  })

  return selectSlotClues(all)
}
