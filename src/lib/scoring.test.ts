import { describe, it, expect } from 'vitest'
import { calculateRoundScore } from './scoring'

describe('calculateRoundScore', () => {
  it('returns 0 when incorrect regardless of cards opened', () => {
    expect(calculateRoundScore(1, false)).toBe(0)
    expect(calculateRoundScore(3, false)).toBe(0)
    expect(calculateRoundScore(5, false)).toBe(0)
  })

  it('gives the full 100 for the first two opened cards', () => {
    expect(calculateRoundScore(1, true)).toBe(100)
    expect(calculateRoundScore(2, true)).toBe(100)
  })

  it('deducts 25 for each card opened beyond the 2nd', () => {
    expect(calculateRoundScore(3, true)).toBe(75)
    expect(calculateRoundScore(4, true)).toBe(50)
    expect(calculateRoundScore(5, true)).toBe(25)
  })

  it('clamps to 0 when the penalty would go negative', () => {
    expect(calculateRoundScore(6, true)).toBe(0)
    expect(calculateRoundScore(10, true)).toBe(0)
  })
})
