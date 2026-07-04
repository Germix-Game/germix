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

// One Pathogen Book slot: which fixed slot it is, whether this player has opened
// it, and the card itself — present ONLY when opened, so unopened cards are never
// sent to the client (the book shows only what the player actually revealed).
export type BookSlot = {
  slotIndex: number
  category: CardCategory
  opened: boolean
  card: { id: string; category: CardCategory; label: string; imageUrl: string } | null
}

// Build the per-slot Pathogen Book view for one microbe and one player's opened
// slots. Uses the SAME selectSlotClues mapping the game uses, so a stored slot
// index (0–4) resolves to exactly the card the player saw in that slot. Slots the
// microbe has no clue for are omitted (nothing to discover there).
export async function getBookSlots(microbeId: string, openedSlots: number[]): Promise<BookSlot[]> {
  const all = await prisma.microbeClue.findMany({
    where: { microbeId },
    orderBy: [{ sortOrder: 'asc' }, { clueCardId: 'asc' }],
    include: { clueCard: true },
  })

  const opened = new Set(openedSlots)

  return selectSlotClues(all).flatMap((entry, slotIndex) => {
    if (!entry) return [] // microbe lacks this slot's category — no card exists
    const isOpen = opened.has(slotIndex)
    const { clueCard } = entry
    return [{
      slotIndex,
      category: clueCard.category,
      opened: isOpen,
      card: isOpen
        ? { id: clueCard.id, category: clueCard.category, label: clueCard.label, imageUrl: clueCard.imageUrl }
        : null,
    }]
  })
}
