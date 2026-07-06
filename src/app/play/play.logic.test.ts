import { describe, it, expect } from 'vitest'
import type { Microbe, GramType, MicrobeTag } from '@/types/game'

// ── Filter logic (mirrors page.tsx filteredMicrobes) ────────────────────────

function applyFilters(
  microbes: Microbe[],
  gramFilter: GramType | null,
  tagFilters: Set<MicrobeTag>,
  searchQuery: string,
): Microbe[] {
  return microbes.filter((m) => {
    if (gramFilter && m.gramType !== gramFilter) return false
    if (tagFilters.size > 0 && ![...tagFilters].every((t) => m.tags.includes(t))) return false
    if (searchQuery && !m.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })
}

// ── Demo mode score formula (mirrors page.tsx handleSubmitAnswer demo branch) ──

function calcDemoScore(revealedCount: number, correct: boolean): number {
  return correct ? Math.max(0, 100 - (revealedCount - 1) * 20) : 0
}

// ── canAnswer logic (mirrors page.tsx) ──────────────────────────────────────

function canAnswer(
  phase: string,
  revealedCount: number,
  selectedMicrobeId: string | null,
  isSubmitting: boolean,
): boolean {
  return phase === 'playing' && revealedCount > 0 && selectedMicrobeId !== null && !isSubmitting
}

// ── Fixtures ─────────────────────────────────────────────────────────────────

const MICROBES: Microbe[] = [
  { id: '1', name: 'Staphylococcus aureus', shortName: 'S. aureus', answerImageUrl: '', gramType: 'POSITIVE', tags: ['AEROBE', 'FACULTATIVE_ANAEROBE'] },
  { id: '2', name: 'Streptococcus pneumoniae', shortName: 'S. pneumoniae', answerImageUrl: '', gramType: 'POSITIVE', tags: ['AEROBE', 'ENCAPSULATED'] },
  { id: '5', name: 'Clostridium difficile', shortName: 'C. difficile', answerImageUrl: '', gramType: 'POSITIVE', tags: ['ANAEROBE', 'SPORE_FORMER'] },
  { id: '9', name: 'Escherichia coli', shortName: 'E. coli', answerImageUrl: '', gramType: 'NEGATIVE', tags: ['AEROBE', 'FACULTATIVE_ANAEROBE'] },
  { id: '16', name: 'Bacteroides fragilis', shortName: 'B. fragilis', answerImageUrl: '', gramType: 'NEGATIVE', tags: ['ANAEROBE', 'ENCAPSULATED'] },
  { id: '17', name: 'Mycobacterium tuberculosis', shortName: 'M. tuberculosis', answerImageUrl: '', gramType: 'ACID_FAST', tags: ['AEROBE', 'INTRACELLULAR'] },
  { id: '18', name: 'Mycobacterium leprae', shortName: 'M. leprae', answerImageUrl: '', gramType: 'ACID_FAST', tags: ['INTRACELLULAR'] },
]

// ─────────────────────────────────────────────────────────────────────────────

describe('Microbe filter — gram type', () => {
  it('returns all microbes when gramFilter is null', () => {
    expect(applyFilters(MICROBES, null, new Set(), '')).toHaveLength(MICROBES.length)
  })

  it('returns only POSITIVE gram microbes', () => {
    const result = applyFilters(MICROBES, 'POSITIVE', new Set(), '')
    expect(result.every(m => m.gramType === 'POSITIVE')).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })

  it('returns only NEGATIVE gram microbes', () => {
    const result = applyFilters(MICROBES, 'NEGATIVE', new Set(), '')
    expect(result.every(m => m.gramType === 'NEGATIVE')).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })

  // The filter LOGIC supports ACID_FAST, but the UI renders no checkbox for it.
  // ACID_FAST microbes become unreachable via the gram-type filter buttons.
  it('returns only ACID_FAST microbes when gramFilter is ACID_FAST (logic works, UI missing)', () => {
    const result = applyFilters(MICROBES, 'ACID_FAST', new Set(), '')
    expect(result).toHaveLength(2)
    expect(result.every(m => m.gramType === 'ACID_FAST')).toBe(true)
  })

  it('excludes ACID_FAST microbes when POSITIVE filter is active', () => {
    const result = applyFilters(MICROBES, 'POSITIVE', new Set(), '')
    expect(result.some(m => m.gramType === 'ACID_FAST')).toBe(false)
  })

  it('excludes ACID_FAST microbes when NEGATIVE filter is active', () => {
    const result = applyFilters(MICROBES, 'NEGATIVE', new Set(), '')
    expect(result.some(m => m.gramType === 'ACID_FAST')).toBe(false)
  })
})

describe('Microbe filter — tags', () => {
  it('returns microbes with the ANAEROBE tag', () => {
    const result = applyFilters(MICROBES, null, new Set<MicrobeTag>(['ANAEROBE']), '')
    expect(result.every(m => m.tags.includes('ANAEROBE'))).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })

  it('returns microbes that have ALL selected tags (AND logic)', () => {
    const result = applyFilters(MICROBES, null, new Set<MicrobeTag>(['ANAEROBE', 'ENCAPSULATED']), '')
    expect(result.every(m => m.tags.includes('ANAEROBE') && m.tags.includes('ENCAPSULATED'))).toBe(true)
  })

  it('returns empty when no microbe has all selected tags', () => {
    const result = applyFilters(MICROBES, null, new Set<MicrobeTag>(['ANAEROBE', 'INTRACELLULAR']), '')
    expect(result).toHaveLength(0)
  })
})

describe('Microbe filter — search', () => {
  it('matches by partial name (case-insensitive)', () => {
    expect(applyFilters(MICROBES, null, new Set(), 'staph')).toHaveLength(1)
    expect(applyFilters(MICROBES, null, new Set(), 'STAPH')).toHaveLength(1)
  })

  it('returns empty for a non-matching query', () => {
    expect(applyFilters(MICROBES, null, new Set(), 'xyzzy')).toHaveLength(0)
  })

  it('empty string returns all microbes', () => {
    expect(applyFilters(MICROBES, null, new Set(), '')).toHaveLength(MICROBES.length)
  })

  it('matches both Mycobacterium species by genus name', () => {
    const result = applyFilters(MICROBES, null, new Set(), 'mycobacterium')
    expect(result).toHaveLength(2)
  })
})

describe('Microbe filter — combined', () => {
  it('applies gram + tag filters together (AND)', () => {
    const result = applyFilters(MICROBES, 'NEGATIVE', new Set<MicrobeTag>(['ANAEROBE']), '')
    expect(result.every(m => m.gramType === 'NEGATIVE' && m.tags.includes('ANAEROBE'))).toBe(true)
  })

  it('applies gram + search filters together', () => {
    const result = applyFilters(MICROBES, 'POSITIVE', new Set(), 'strep')
    expect(result).toHaveLength(1)
    expect(result[0].gramType).toBe('POSITIVE')
  })

  it('contradictory filters return empty', () => {
    // ANAEROBE tag is not on any NEGATIVE gram microbe (in this fixture) — oh wait, B. fragilis is
    // Let's use a truly contradictory combo: ACID_FAST + ANAEROBE
    const result = applyFilters(MICROBES, 'ACID_FAST', new Set<MicrobeTag>(['ANAEROBE']), '')
    expect(result).toHaveLength(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe('Demo mode score calculation', () => {
  it('returns 0 for wrong answer regardless of revealed count', () => {
    expect(calcDemoScore(1, false)).toBe(0)
    expect(calcDemoScore(3, false)).toBe(0)
    expect(calcDemoScore(5, false)).toBe(0)
  })

  it('returns 100 for correct with 1 card revealed', () => {
    expect(calcDemoScore(1, true)).toBe(100)
  })

  it('deducts 20 per additional card (matches backend calculateRoundScore)', () => {
    expect(calcDemoScore(2, true)).toBe(80)
    expect(calcDemoScore(3, true)).toBe(60)
    expect(calcDemoScore(4, true)).toBe(40)
    expect(calcDemoScore(5, true)).toBe(20)
  })

  it('clamps to 0 when penalty exceeds 100', () => {
    expect(calcDemoScore(6, true)).toBe(0)
    expect(calcDemoScore(10, true)).toBe(0)
  })

  // Edge: 0 revealed would mean Math.max(0, 100 - (-1)*20) = 120 — but this
  // cannot happen because canAnswer requires revealedCount > 0 before submitting.
  it('formula gives > 100 for 0 cards — protected by canAnswer gate', () => {
    expect(calcDemoScore(0, true)).toBe(120)
    // This is never reached in practice because canAnswer blocks submission
    // when revealedCount === 0, but it shows the formula is not intrinsically clamped.
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe('canAnswer gate', () => {
  it('false in non-playing phases', () => {
    expect(canAnswer('loading', 1, 'id', false)).toBe(false)
    expect(canAnswer('wrong', 1, 'id', false)).toBe(false)
    expect(canAnswer('end', 1, 'id', false)).toBe(false)
    expect(canAnswer('error', 1, 'id', false)).toBe(false)
  })

  it('false when no cards are revealed', () => {
    expect(canAnswer('playing', 0, 'id', false)).toBe(false)
  })

  it('false when selectedMicrobeId is null', () => {
    expect(canAnswer('playing', 1, null, false)).toBe(false)
  })

  it('false while submitting', () => {
    expect(canAnswer('playing', 1, 'id', true)).toBe(false)
  })

  it('true only when all conditions are met', () => {
    expect(canAnswer('playing', 1, 'id', false)).toBe(true)
    expect(canAnswer('playing', 5, 'id', false)).toBe(true)
  })

  // BUG DOCUMENTATION: DraggableMicrobeCard has no onClick that calls
  // setSelectedMicrobeId. The only click handler is onDoubleClick (which calls
  // onDrop → setPendingMicrobeId). Therefore selectedMicrobeId stays null in
  // normal gameplay, canAnswer is always false, and the "Answer" button is
  // permanently disabled. Submission only works via double-click → confirm.
  it('demonstrates that the "Answer" button path requires selectedMicrobeId to be set externally', () => {
    // selectedMicrobeId === null is the default and only state reachable by clicking
    expect(canAnswer('playing', 3, null, false)).toBe(false)
    // It would be true if a click handler existed to call setSelectedMicrobeId
    expect(canAnswer('playing', 3, 'microbe-1', false)).toBe(true)
  })
})
