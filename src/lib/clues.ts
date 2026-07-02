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

// One clue card per slot, in FIXED slot order (length 5) — each category always
// sits in the same slot (e.g. special trait is always slot 3). Within a slot,
// which specific clue shows is still picked at random per round.
// null if microbe has no clue for the slot's primary OR fallback categories.
export async function getRoundClues(microbeId: string) {
  const all = await prisma.microbeClue.findMany({
    where: { microbeId },
    orderBy: { sortOrder: 'asc' },
    include: { clueCard: true },
  })

  return SLOT_CATEGORIES.map((slot) => {
    // Prefer the primary categories for this slot.
    let candidates = all.filter((mc) => slot.primary.includes(mc.clueCard.category))
    // Only if the microbe has nothing in the primary do we try the fallback.
    if (candidates.length === 0 && slot.fallback) {
      candidates = all.filter((mc) => slot.fallback!.includes(mc.clueCard.category))
    }
    if (candidates.length === 0) return null
    return candidates[Math.floor(Math.random() * candidates.length)]
  })
}