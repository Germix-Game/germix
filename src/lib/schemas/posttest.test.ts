import { describe, it, expect } from 'vitest'
import { AnswerOption, PostTestPeriod } from '@prisma/client'
import { submitPostTestSchema } from './posttest'

const base = {
  period: PostTestPeriod.MIDTERM,
  answers: { q1: AnswerOption.A },
}

describe('submitPostTestSchema durationSeconds', () => {
  it('is optional (older clients)', () => {
    const r = submitPostTestSchema.safeParse(base)
    expect(r.success).toBe(true)
    expect(r.data?.durationSeconds).toBeUndefined()
  })

  it.each([0, 1, 421, 86400])('accepts %i', (durationSeconds) => {
    const r = submitPostTestSchema.safeParse({ ...base, durationSeconds })
    expect(r.success).toBe(true)
    expect(r.data?.durationSeconds).toBe(durationSeconds)
  })

  it.each([-1, 86401, 12.5, NaN, '300', null])('rejects %j', (durationSeconds) => {
    expect(submitPostTestSchema.safeParse({ ...base, durationSeconds }).success).toBe(false)
  })
})
