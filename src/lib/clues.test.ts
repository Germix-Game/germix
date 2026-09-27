import { vi, describe, it, expect } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    microbeClue: { findMany: vi.fn() },
  },
}))

import type { CardCategory } from '@prisma/client'
import { selectSlotClues, getRoundClues, getBookSlots, roundSeed } from './clues'
import { prisma } from '@/lib/prisma'

function clue(category: string, label: string, sortOrder: number, id = `card-${label}`) {
  return {
    sortOrder,
    clueCardId: id,
    clueCard: { id, category: category as CardCategory, label, imageUrl: `/${label}.png` },
  }
}

const SEED = roundSeed('session-1', 1)

describe('selectSlotClues', () => {
  it('maps one clue per slot in fixed slot order', () => {
    const clues = [
      clue('GRAM_STAIN', 'Gram +', 0),
      clue('VIRULENCE_FACTOR', 'Capsule', 1),
      clue('LAB_CHARACTERISTIC', 'Catalase+', 2),
      clue('SPECIAL_TRAIT', 'Tumbling', 3),
      clue('CLINICAL_MANIFESTATION', 'Abscess', 4),
    ]

    const slots = selectSlotClues(clues, SEED)

    expect(slots.map((s) => s?.clueCard.label)).toEqual([
      'Gram +',
      'Capsule',
      'Catalase+',
      'Tumbling',
      'Abscess',
    ])
  })

  it('returns null for slots whose category the microbe lacks', () => {
    const clues = [clue('GRAM_STAIN', 'Gram +', 0)]
    const slots = selectSlotClues(clues, SEED)
    expect(slots).toEqual([clues[0], null, null, null, null])
  })

  it('returns five nulls for a microbe with no clues at all', () => {
    expect(selectSlotClues([], SEED)).toEqual([null, null, null, null, null])
  })

  it('picks one of the candidates when a slot has multiple', () => {
    // Slot 0 covers both GRAM_STAIN and MORPHOLOGY — give it two candidates.
    const clues = [
      clue('GRAM_STAIN', 'Gram -', 0),
      clue('MORPHOLOGY', 'Comma-shaped', 5),
    ]
    const slots = selectSlotClues(clues, SEED)
    expect(['Gram -', 'Comma-shaped']).toContain(slots[0]?.clueCard.label)
  })

  it('picks randomly across rounds — every candidate in a category eventually shows up', () => {
    const clues = [
      clue('SPECIAL_TRAIT', 'Tumbling', 0),
      clue('SPECIAL_TRAIT', 'Cold growth', 1),
      clue('SPECIAL_TRAIT', 'Actin rockets', 2),
      clue('CLINICAL_MANIFESTATION', 'Meningitis', 3),
      clue('CLINICAL_MANIFESTATION', 'Abortion', 4),
    ]
    const traits = new Set<string>()
    const clinical = new Set<string>()
    for (let round = 1; round <= 200; round++) {
      const slots = selectSlotClues(clues, roundSeed(`session-${round}`, round))
      traits.add(slots[3]!.clueCard.label)
      clinical.add(slots[4]!.clueCard.label)
    }
    expect(traits).toEqual(new Set(['Tumbling', 'Cold growth', 'Actin rockets']))
    expect(clinical).toEqual(new Set(['Meningitis', 'Abortion']))
  })

  it('randomizes the fallback group too', () => {
    const clues = [
      clue('TRANSMISSION', 'Fecal-oral', 0),
      clue('TRANSMISSION', 'Mosquito', 1),
    ]
    const picks = new Set<string>()
    for (let round = 1; round <= 100; round++) {
      picks.add(selectSlotClues(clues, roundSeed('s', round))[1]!.clueCard.label)
    }
    expect(picks).toEqual(new Set(['Fecal-oral', 'Mosquito']))
  })

  it('is deterministic for a given seed, so /cards and /reveal agree on the card', () => {
    const clues = [
      clue('MORPHOLOGY', 'Comma-shaped', 0),
      clue('GRAM_STAIN', 'Gram -', 1),
      clue('VIRULENCE_FACTOR', 'Flagella', 2),
    ]
    const first = selectSlotClues(clues, SEED).map((s) => s?.clueCard.label)
    for (let i = 0; i < 20; i++) {
      expect(selectSlotClues(clues, SEED).map((s) => s?.clueCard.label)).toEqual(first)
    }
  })

  it('does not mutate the input array', () => {
    const clues = [clue('GRAM_STAIN', 'Gram +', 0), clue('VIRULENCE_FACTOR', 'Capsule', 1)]
    const copy = [...clues]
    selectSlotClues(clues, SEED)
    expect(clues).toEqual(copy)
  })
})

describe('getRoundClues', () => {
  it('queries clues for the given microbe ordered by sortOrder, then maps to slots', async () => {
    const clues = [
      clue('CLINICAL_MANIFESTATION', 'Abscess', 4),
      clue('GRAM_STAIN', 'Gram +', 0),
    ]
    vi.mocked(prisma.microbeClue.findMany).mockResolvedValue(clues as never)

    const result = await getRoundClues('microbe-1', SEED)

    expect(prisma.microbeClue.findMany).toHaveBeenCalledWith({
      where: { microbeId: 'microbe-1' },
      orderBy: [{ sortOrder: 'asc' }, { clueCardId: 'asc' }],
      include: { clueCard: { select: { id: true, category: true, imageUrl: true } } },
    })
    expect(result[0]?.clueCard.imageUrl).toBe('/Gram +.png')
    expect(result[4]?.clueCard.imageUrl).toBe('/Abscess.png')
  })

  it('breaks sortOrder ties using clueCardId, so duplicate sortOrders still resolve deterministically', async () => {
    // Two GRAM_STAIN-group candidates sharing sortOrder 0 — only the DB-level
    // [{sortOrder},{clueCardId}] orderBy decides which sorts first; this just
    // documents that getRoundClues passes that ordering through to the query
    // rather than re-sorting client-side (it can't — it only sees what the
    // DB already returned in that order).
    const clues = [
      { sortOrder: 0, clueCardId: 'card-a', clueCard: { category: 'GRAM_STAIN', label: 'Gram +', imageUrl: '' } },
      { sortOrder: 0, clueCardId: 'card-b', clueCard: { category: 'MORPHOLOGY', label: 'Comma-shaped', imageUrl: '' } },
    ]
    vi.mocked(prisma.microbeClue.findMany).mockResolvedValue(clues as never)

    const result = await getRoundClues('microbe-1', SEED)

    // The seeded pick indexes into this DB order, so /reveal (same order, same
    // seed) lands on the identical card.
    expect(result[0]).toBe(selectSlotClues(clues as never, SEED)[0])
  })
})

describe('getBookSlots', () => {
  const fullClues = [
    clue('GRAM_STAIN', 'Gram +', 0),
    clue('VIRULENCE_FACTOR', 'Capsule', 1),
    clue('LAB_CHARACTERISTIC', 'Catalase+', 2),
    clue('SPECIAL_TRAIT', 'Tumbling', 3),
    clue('CLINICAL_MANIFESTATION', 'Abscess', 4),
  ]

  it('reveals card data for every slot the microbe has — an unlocked microbe shows all its clues', async () => {
    vi.mocked(prisma.microbeClue.findMany).mockResolvedValue(fullClues as never)

    const slots = await getBookSlots('microbe-1')

    const byIndex = Object.fromEntries(slots.map((s) => [s.slotIndex, s]))
    expect(byIndex[0].opened).toBe(true)
    expect(byIndex[0].cards.map((c) => c.imageUrl)).toEqual(['/Gram +.png'])
    expect(byIndex[1].opened).toBe(true)
    expect(byIndex[1].cards.map((c) => c.imageUrl)).toEqual(['/Capsule.png'])
    expect(byIndex[2].opened).toBe(true)
    expect(byIndex[2].cards.map((c) => c.imageUrl)).toEqual(['/Catalase+.png'])
    expect(byIndex[3].opened).toBe(true)
    expect(byIndex[3].cards.map((c) => c.imageUrl)).toEqual(['/Tumbling.png'])
    expect(byIndex[4].opened).toBe(true)
    expect(byIndex[4].cards.map((c) => c.imageUrl)).toEqual(['/Abscess.png'])
  })

  it('maps a slot index to the same category the game showed in that slot', async () => {
    // Slot 2 is the lab slot → 'Catalase+', proving the book uses the fixed
    // slot layout, not raw clue order.
    vi.mocked(prisma.microbeClue.findMany).mockResolvedValue(fullClues as never)
    const slots = await getBookSlots('microbe-1')
    const lab = slots.find((s) => s.slotIndex === 2)
    expect(lab?.cards[0]?.imageUrl).toBe('/Catalase+.png')
    expect(lab?.category).toBe('LAB_CHARACTERISTIC')
  })

  it('includes every clue card in a category, not just the first — a slot can hold more than one card', async () => {
    // Two LAB_CHARACTERISTIC clues for the same microbe: the round game would
    // only ever show one, but the book is a collection screen and must show both.
    const clues = [
      clue('GRAM_STAIN', 'Gram +', 0),
      clue('LAB_CHARACTERISTIC', 'Catalase+', 1),
      clue('LAB_CHARACTERISTIC', 'Oxidase+', 2),
    ]
    vi.mocked(prisma.microbeClue.findMany).mockResolvedValue(clues as never)
    const slots = await getBookSlots('microbe-1')
    const lab = slots.find((s) => s.slotIndex === 2)
    expect(lab?.cards.map((c) => c.imageUrl)).toEqual(['/Catalase+.png', '/Oxidase+.png'])
  })

  it('omits slots the microbe has no clue for', async () => {
    // Only a Gram-stain clue exists → slots 1–4 have no card and are omitted.
    vi.mocked(prisma.microbeClue.findMany).mockResolvedValue([clue('GRAM_STAIN', 'Gram +', 0)] as never)
    const slots = await getBookSlots('microbe-1')
    expect(slots).toHaveLength(1)
    expect(slots[0].slotIndex).toBe(0)
    expect(slots[0].opened).toBe(true)
  })

  it('queries clues with the stable [sortOrder, clueCardId] ordering', async () => {
    vi.mocked(prisma.microbeClue.findMany).mockResolvedValue(fullClues as never)
    await getBookSlots('microbe-1')
    expect(prisma.microbeClue.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ sortOrder: 'asc' }, { clueCardId: 'asc' }] }),
    )
  })
})
