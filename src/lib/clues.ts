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

// FNV-1a 32-bit string hash plus a murmur3 finalizer — a tiny, dependency-free
// way to turn a seed string into a stable pseudo-random number. The finalizer
// matters: raw FNV-1a has weak low bits, so `% 2` alone picks the same card
// almost every time.
function hashSeed(seed: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  h ^= h >>> 16
  h = Math.imul(h, 0x85ebca6b)
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35)
  h ^= h >>> 16
  return h >>> 0
}

// Seed for one round's card picks. Every session/round combo gets its own
// random-looking selection, but the same round always resolves the same way.
export function roundSeed(sessionId: string, roundNumber: number): string {
  return `${sessionId}:${roundNumber}`
}

// Map a microbe's clues (sorted by sortOrder) onto the fixed slot layout: one
// clue per slot, in FIXED slot order. When a category group has several
// candidates, one is picked pseudo-randomly from `seed` (hashed per slot), so
// different rounds/sessions show different cards of the same category. Pure and
// DETERMINISTIC for a given (clues, seed) — this is what guarantees the cards the
// player sees (/cards) match the card that gets revealed (/reveal): both routes
// run this over the same sortOrder-sorted clue list with the same roundSeed.
// null if the microbe lacks a category group.
export function selectSlotClues<T extends WithCategory>(cluesSortedByOrder: T[], seed: string): (T | null)[] {
  return SLOT_CATEGORIES.map((group, slotIndex) => {
    const primary = cluesSortedByOrder.filter((mc) => group.primary.includes(mc.clueCard.category))
    // Only fall back when the microbe has NO clue in any primary category.
    const candidates = primary.length > 0 || !group.fallback
      ? primary
      : cluesSortedByOrder.filter((mc) => group.fallback!.includes(mc.clueCard.category))
    if (candidates.length === 0) return null
    return candidates[hashSeed(`${seed}:${slotIndex}`) % candidates.length]
  })
}

// One clue card per slot, in fixed slot order (length 5). null if microbe lacks
// a group. Shared by the cards route; the reveal route maps its already-joined
// clues with selectSlotClues directly — both MUST pass the same seed
// (roundSeed(sessionId, roundNumber)) so the two stay in lockstep.
export async function getRoundClues(microbeId: string, seed: string) {
  const all = await prisma.microbeClue.findMany({
    where: { microbeId },
    // sortOrder is NOT unique, so a stable secondary key (clueCardId) is required:
    // without it Postgres returns sortOrder ties in arbitrary order, and this query
    // could disagree with the /reveal route's separate query about which clue sits
    // in a slot — making the card revealed differ from the card shown. Both routes
    // MUST use this exact ordering to stay in lockstep.
    orderBy: [{ sortOrder: 'asc' }, { clueCardId: 'asc' }],
    include: { clueCard: { select: { id: true, category: true, imageUrl: true } } },
  })

  return selectSlotClues(all, seed)
}

// One Pathogen Book slot: which fixed slot it is, and every card the microbe
// has in that slot's category — unlike the round view (one clue per slot),
// the book is a collection screen, so a category with several clue cards
// (e.g. multiple LAB_CHARACTERISTIC cards) shows all of them, not just the
// one the game would have picked for a round. `opened` is always true here —
// once a microbe is unlocked (the player has seen it), the book reveals all
// of its clue cards, not just the ones flipped in the round that unlocked it.
export type BookSlot = {
  slotIndex: number
  category: CardCategory
  opened: boolean
  cards: { id: string; category: CardCategory; label: string; imageUrl: string }[]
}

// Build the per-slot Pathogen Book view for one microbe. Groups clues by the
// SAME SLOT_CATEGORIES layout the game uses (so a slot index still lines up
// with the category the player is used to), but — unlike selectSlotClues —
// keeps every matching clue in that group instead of only the first. Slots
// the microbe has no clue for are omitted (nothing to discover there).
// Callers must only invoke this for a microbe the player has unlocked —
// every returned slot is fully opened.
export async function getBookSlots(microbeId: string): Promise<BookSlot[]> {
  const all = await prisma.microbeClue.findMany({
    where: { microbeId },
    orderBy: [{ sortOrder: 'asc' }, { clueCardId: 'asc' }],
    include: { clueCard: { select: { id: true, category: true, label: true, imageUrl: true } } },
  })

  return SLOT_CATEGORIES.flatMap((group, slotIndex) => {
    const primary = all.filter((mc) => group.primary.includes(mc.clueCard.category))
    const matches = primary.length > 0
      ? primary
      : group.fallback
        ? all.filter((mc) => group.fallback!.includes(mc.clueCard.category))
        : []

    if (matches.length === 0) return [] // microbe lacks this slot's category — no card exists

    return [{
      slotIndex,
      category: matches[0].clueCard.category,
      opened: true,
      cards: matches.map(({ clueCard }) => ({
        id: clueCard.id,
        category: clueCard.category,
        label: clueCard.label,
        imageUrl: clueCard.imageUrl,
      })),
    }]
  })
}
