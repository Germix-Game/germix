import { describe, it, expect } from 'vitest'
import { PostTestPeriod } from '@prisma/client'
import { getActivePosttestPeriod } from './posttest'

const cfg = (entries: Record<string, string>) => new Map(Object.entries(entries))

const MIDTERM = {
  posttest_start_midterm: '2026-10-05 00:00',
  posttest_end_midterm: '2026-10-07 23:59',
}
const FINAL = {
  posttest_start_final: '2026-10-27 00:00',
  posttest_end_final: '2026-10-29 23:59',
}

describe('getActivePosttestPeriod', () => {
  it('returns null when no windows are configured', () => {
    expect(getActivePosttestPeriod(cfg({}), new Date('2026-10-06T00:00:00+07:00'))).toBeNull()
  })

  it('returns MIDTERM when now is inside the midterm window', () => {
    const now = new Date('2026-10-06T12:00:00+07:00')
    expect(getActivePosttestPeriod(cfg(MIDTERM), now)).toBe(PostTestPeriod.MIDTERM)
  })

  it('returns FINAL when now is inside the final window', () => {
    const now = new Date('2026-10-28T12:00:00+07:00')
    expect(getActivePosttestPeriod(cfg(FINAL), now)).toBe(PostTestPeriod.FINAL)
  })

  it('returns null before the window opens', () => {
    const now = new Date('2026-10-04T23:59:00+07:00')
    expect(getActivePosttestPeriod(cfg(MIDTERM), now)).toBeNull()
  })

  it('returns null after the window closes', () => {
    const now = new Date('2026-10-08T00:00:00+07:00')
    expect(getActivePosttestPeriod(cfg(MIDTERM), now)).toBeNull()
  })

  it('is inclusive of the window boundaries', () => {
    const start = new Date('2026-10-05T00:00:00+07:00')
    const end = new Date('2026-10-07T23:59:00+07:00')
    expect(getActivePosttestPeriod(cfg(MIDTERM), start)).toBe(PostTestPeriod.MIDTERM)
    expect(getActivePosttestPeriod(cfg(MIDTERM), end)).toBe(PostTestPeriod.MIDTERM)
  })

  it('treats offset-less config times as Asia/Bangkok (UTC+7)', () => {
    // 2026-10-05 00:00 Bangkok == 2026-10-04 17:00 UTC. One minute earlier in
    // UTC is still before the window opens.
    const justBefore = new Date('2026-10-04T16:59:00Z')
    const justAfterOpen = new Date('2026-10-04T17:01:00Z')
    expect(getActivePosttestPeriod(cfg(MIDTERM), justBefore)).toBeNull()
    expect(getActivePosttestPeriod(cfg(MIDTERM), justAfterOpen)).toBe(PostTestPeriod.MIDTERM)
  })

  it('honors an explicit offset in the config value', () => {
    const config = cfg({
      posttest_start_midterm: '2026-10-05T00:00:00+07:00',
      posttest_end_midterm: '2026-10-07T23:59:59+07:00',
    })
    expect(getActivePosttestPeriod(config, new Date('2026-10-06T00:00:00+07:00'))).toBe(
      PostTestPeriod.MIDTERM,
    )
  })

  describe('posttest_enabled manual override', () => {
    const OUTSIDE_ANY_WINDOW = new Date('2027-01-01T00:00:00+07:00')

    it('forces MIDTERM when posttest_enabled=true and no force period is set, ignoring dates', () => {
      const config = cfg({ ...MIDTERM, ...FINAL, posttest_enabled: 'true' })
      expect(getActivePosttestPeriod(config, OUTSIDE_ANY_WINDOW)).toBe(PostTestPeriod.MIDTERM)
    })

    it('forces FINAL when posttest_enabled=true and posttest_force_period=final', () => {
      const config = cfg({
        ...MIDTERM,
        ...FINAL,
        posttest_enabled: 'true',
        posttest_force_period: 'final',
      })
      expect(getActivePosttestPeriod(config, OUTSIDE_ANY_WINDOW)).toBe(PostTestPeriod.FINAL)
    })

    it('falls back to the date window when posttest_enabled is absent or false', () => {
      const config = cfg({ ...MIDTERM, posttest_enabled: 'false' })
      expect(getActivePosttestPeriod(config, OUTSIDE_ANY_WINDOW)).toBeNull()
      expect(
        getActivePosttestPeriod(config, new Date('2026-10-06T00:00:00+07:00')),
      ).toBe(PostTestPeriod.MIDTERM)
    })
  })
})
