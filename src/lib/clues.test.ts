import { vi, describe, it, expect } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    microbeClue: { findMany: vi.fn() },
  },
}))

import type { CardCategory } from '@prisma/client'
import { selectSlotClues, getRoundClues } from './clues'
import { prisma } from '@/lib/prisma'

function clue(category: string, label: string, sortOrder: number) {
  return { sortOrder, clueCard: { category: category as CardCategory, label, imageUrl: `/${label}.png` } }
}

describe('selectSlotClues', () => {
  it('maps one clue per slot in fixed slot order', () => {
    const clues = [
      clue('GRAM_STAIN', 'Gram +', 0),
      clue('VIRULENCE_FACTOR', 'Capsule', 1),
      clue('LAB_CHARACTERISTIC', 'Catalase+', 2),
      clue('SPECIAL_TRAIT', 'Tumbling', 3),
      clue('CLINICAL_MANIFESTATION', 'Abscess', 4),
    ]

    const slots = selectSlotClues(clues)

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
    const slots = selectSlotClues(clues)
    expect(slots).toEqual([clues[0], null, null, null, null])
  })

  it('returns five nulls for a microbe with no clues at all', () => {
    expect(selectSlotClues([])).toEqual([null, null, null, null, null])
  })

  it('picks the first candidate in the given (sortOrder) order when a slot has multiple candidates', () => {
    // Slot 0 covers both GRAM_STAIN and MORPHOLOGY — give it two candidates,
    // already sorted by sortOrder as the function expects, and confirm the
    // earliest one wins deterministically.
    const clues = [
      clue('GRAM_STAIN', 'Gram -', 0),
      clue('MORPHOLOGY', 'Comma-shaped', 5),
    ]
    const slots = selectSlotClues(clues)
    expect(slots[0]?.clueCard.label).toBe('Gram -')
  })

  it('is deterministic: repeated calls on the same input give the same result', () => {
    const clues = [
      clue('MORPHOLOGY', 'Comma-shaped', 0),
      clue('GRAM_STAIN', 'Gram -', 1),
      clue('VIRULENCE_FACTOR', 'Flagella', 2),
    ]
    const first = selectSlotClues(clues).map((s) => s?.clueCard.label)
    for (let i = 0; i < 20; i++) {
      expect(selectSlotClues(clues).map((s) => s?.clueCard.label)).toEqual(first)
    }
  })

  it('does not mutate the input array', () => {
    const clues = [clue('GRAM_STAIN', 'Gram +', 0), clue('VIRULENCE_FACTOR', 'Capsule', 1)]
    const copy = [...clues]
    selectSlotClues(clues)
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

    const result = await getRoundClues('microbe-1')

    expect(prisma.microbeClue.findMany).toHaveBeenCalledWith({
      where: { microbeId: 'microbe-1' },
      orderBy: [{ sortOrder: 'asc' }, { clueCardId: 'asc' }],
      include: { clueCard: true },
    })
    expect(result[0]?.clueCard.label).toBe('Gram +')
    expect(result[4]?.clueCard.label).toBe('Abscess')
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

    const result = await getRoundClues('microbe-1')

    expect(result[0]?.clueCard.label).toBe('Gram +')
  })
})
