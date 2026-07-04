import { prisma } from '@/lib/prisma'
import type { CardCategory } from '@prisma/client'

// Each slot has a `primary` category list and an optional `fallback`.
// We try the primary categories first; only if the microbe has NO clue in any
// primary category do we use the fallback. This keeps bacteria unchanged
// (they have VIRULENCE_FACTOR, so slot 1 stays virulence) while giving
// parasites — which have no virulence factors — a TRANSMISSION card in slot 1
// instead of a blank.
const SLOT_CATEGORIES: { primary: CardCategory[]; fallback?: CardCategory[] }[] = [
  { primary: ['GRAM_STAIN', 'MORPHOLOGY'] },                    // slot 0 — Gram stain / morphology
  { primary: ['VIRULENCE_FACTOR'], fallback: ['TRANSMISSION'] }, // slot 1 — Virulence (bacteria) → Transmission (parasites)
  { primary: ['LAB_CHARACTERISTIC'] },                          // slot 2 — Lab high-yield
  { primary: ['SPECIAL_TRAIT'] },                              // slot 3 — Special features
  { primary: ['CLINICAL_MANIFESTATION'] },                     // slot 4 — Diseases + key clinical clues
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
    const primary = cluesSortedByOrder.filter((mc) => group.primary.includes(mc.clueCard.category))
    if (primary[0]) return primary[0]
    // Only fall back when the microbe has NO clue in any primary category.
    const fallback = group.fallback
      ? cluesSortedByOrder.filter((mc) => group.fallback!.includes(mc.clueCard.category))
      : []
    return fallback[0] ?? null
  })
}

// One clue card per slot, in fixed slot order (length 5). null if microbe lacks
// a group. Shared by the cards route; the reveal route maps its already-joined
// clues with selectSlotClues directly so the two stay in lockstep.
export async function getRoundClues(microbeId: string) {
  const all = await prisma.microbeClue.findMany({
    where: { microbeId },
    // sortOrder is NOT unique, so a stable secondary key (clueCardId) is required:
    // without it Postgres returns sortOrder ties in arbitrary order, and this query
    // could disagree with the /reveal route's separate query about which clue sits
    // in a slot — making the card revealed differ from the card shown. Both routes
    // MUST use this exact ordering to stay in lockstep.
    orderBy: [{ sortOrder: 'asc' }, { clueCardId: 'asc' }],
    include: { clueCard: true },
  })

  return selectSlotClues(all)
}
