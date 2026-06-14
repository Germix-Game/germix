import { prisma } from '@/lib/prisma'
import type { CardCategory } from '@prisma/client'

const SLOT_CATEGORIES: CardCategory[][] = [
  ['GRAM_STAIN', 'MORPHOLOGY'], // slot 0 — Gram stain / morphology
  ['VIRULENCE_FACTOR'],         // slot 1 — Virulence factors
  ['LAB_CHARACTERISTIC'],       // slot 2 — Lab high-yield
  ['SPECIAL_TRAIT'],            // slot 3 — Special features
  ['CLINICAL_MANIFESTATION'],   // slot 4 — Diseases + key clinical clues
]

// One clue card per group, in FIXED slot order (length 5) — each category always
// sits in the same slot (e.g. special trait is always slot 3). Within a group,
// which specific clue shows is still picked at random per round.
// null if microbe lacks a group.
export async function getRoundClues(microbeId: string) {
  const all = await prisma.microbeClue.findMany({
    where: { microbeId },
    orderBy: { sortOrder: 'asc' },
    include: { clueCard: true },
  })

  return SLOT_CATEGORIES.map((group) => {
    const candidates = all.filter((mc) => group.includes(mc.clueCard.category))
    if (candidates.length === 0) return null
    return candidates[Math.floor(Math.random() * candidates.length)]
  })
}