import { describe, it, expect } from 'vitest'
import { calculateRoundScore } from './scoring'

describe('calculateRoundScore', () => {
  it('returns 0 when incorrect regardless of cards opened', () => {
    expect(calculateRoundScore(1, false)).toBe(0)
    expect(calculateRoundScore(3, false)).toBe(0)
    expect(calculateRoundScore(5, false)).toBe(0)
  })

  it('returns 100 for correct with 1 card opened', () => {
    expect(calculateRoundScore(1, true)).toBe(100)
  })

  it('returns 80 for correct with 2 cards opened', () => {
    expect(calculateRoundScore(2, true)).toBe(80)
  })

  it('returns 60 for correct with 3 cards opened', () => {
    expect(calculateRoundScore(3, true)).toBe(60)
  })

  it('returns 40 for correct with 4 cards opened', () => {
    expect(calculateRoundScore(4, true)).toBe(40)
  })

  it('returns 20 for correct with 5 cards opened', () => {
    expect(calculateRoundScore(5, true)).toBe(20)
  })

  it('clamps to 0 when penalty exceeds 100', () => {
    expect(calculateRoundScore(6, true)).toBe(0)
    expect(calculateRoundScore(10, true)).toBe(0)
  })
})
