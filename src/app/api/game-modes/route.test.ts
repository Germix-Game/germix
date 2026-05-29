import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    config: { findMany: vi.fn() },
    postTest: { findUnique: vi.fn() },
  },
}))

vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn(),
}))

import { GET } from './route'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { PostTestPeriod } from '@prisma/client'

const PLAYER_ID = 'player-1'
const mockPlayer = { id: PLAYER_ID }

// Bangkok = UTC+7. "2026-09-01 00:00" Bangkok = 2026-08-31T17:00:00Z
// "2026-09-03 23:59" Bangkok = 2026-09-03T16:59:00Z
const MIDTERM_START = '2026-09-01 00:00' // no timezone → treated as Bangkok
const MIDTERM_END   = '2026-09-03 23:59'

function makeMidtermConfig() {
  return [
    { key: 'posttest_start_midterm', value: MIDTERM_START },
    { key: 'posttest_end_midterm',   value: MIDTERM_END },
  ]
}

describe('GET /api/game-modes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuth).mockResolvedValue(mockPlayer as never)
    vi.mocked(prisma.config.findMany).mockResolvedValue([])
    vi.mocked(prisma.postTest.findUnique).mockResolvedValue(null)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('auth', () => {
    it('returns 401 when JWT is missing or invalid', async () => {
      vi.mocked(requireAuth).mockRejectedValue(
        new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
      )
      const res = await GET()
      expect(res.status).toBe(401)
    })
  })

  describe('game mode unlock status', () => {
    it('bacteria is always unlocked', async () => {
      const res = await GET()
      const body = await res.json()
      expect(body.bacteria).toEqual({ unlocked: true })
    })

    it('parasite is locked with unlocksAt when unlock date is in the future', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
      vi.mocked(prisma.config.findMany).mockResolvedValue([
        { key: 'parasite_unlock', value: '2026-06-01T00:00:00Z' },
      ] as never)

      const res = await GET()
      const body = await res.json()
      expect(body.parasite.unlocked).toBe(false)
      expect(body.parasite.unlocksAt).toBe('2026-06-01T00:00:00.000Z')
    })

    it('parasite is unlocked when past the unlock date', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2027-01-01T00:00:00Z'))
      vi.mocked(prisma.config.findMany).mockResolvedValue([
        { key: 'parasite_unlock', value: '2026-06-01T00:00:00Z' },
      ] as never)

      const res = await GET()
      const body = await res.json()
      expect(body.parasite.unlocked).toBe(true)
    })
  })

  describe('posttest window check — Asia/Bangkok timezone', () => {
    it('window is NOT active 1 second before Bangkok start (UTC 2026-08-31T16:59:59Z)', async () => {
      vi.useFakeTimers()
      // Bangkok "2026-09-01 00:00" = UTC 2026-08-31T17:00:00Z
      // Set clock to 1s before that
      vi.setSystemTime(new Date('2026-08-31T16:59:59Z'))
      vi.mocked(prisma.config.findMany).mockResolvedValue(makeMidtermConfig() as never)

      const res = await GET()
      const body = await res.json()
      expect(body.posttestRequired).toBe(false)
      expect(body.posttest).toBeNull()
    })

    it('window IS active at Bangkok midnight (UTC 2026-08-31T17:00:00Z)', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-08-31T17:00:00Z'))
      vi.mocked(prisma.config.findMany).mockResolvedValue(makeMidtermConfig() as never)

      const res = await GET()
      const body = await res.json()
      expect(body.posttestRequired).toBe(true)
      expect(body.posttest).not.toBeNull()
      expect(body.posttest.period).toBe(PostTestPeriod.MIDTERM)
    })

    it('window IS active mid-period (UTC 2026-09-02T10:00:00Z = Bangkok 2026-09-02 17:00)', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-09-02T10:00:00Z'))
      vi.mocked(prisma.config.findMany).mockResolvedValue(makeMidtermConfig() as never)

      const res = await GET()
      const body = await res.json()
      expect(body.posttestRequired).toBe(true)
    })

    it('window is NOT active after Bangkok end (UTC 2026-09-03T17:00:00Z = Bangkok 2026-09-04 00:00)', async () => {
      vi.useFakeTimers()
      // Bangkok "2026-09-03 23:59" = UTC 2026-09-03T16:59:00Z; so 17:00Z is after
      vi.setSystemTime(new Date('2026-09-03T17:00:00Z'))
      vi.mocked(prisma.config.findMany).mockResolvedValue(makeMidtermConfig() as never)

      const res = await GET()
      const body = await res.json()
      expect(body.posttestRequired).toBe(false)
      expect(body.posttest).toBeNull()
    })
  })

  describe('posttestRequired logic', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      // Set time inside Bangkok midterm window
      vi.setSystemTime(new Date('2026-09-02T10:00:00Z'))
      vi.mocked(prisma.config.findMany).mockResolvedValue(makeMidtermConfig() as never)
    })

    it('posttestRequired is true when inside window and player has NOT submitted', async () => {
      vi.mocked(prisma.postTest.findUnique).mockResolvedValue(null)

      const res = await GET()
      const body = await res.json()
      expect(body.posttestRequired).toBe(true)
    })

    it('posttestRequired is false when inside window and player HAS submitted', async () => {
      vi.mocked(prisma.postTest.findUnique).mockResolvedValue({ id: 'pt-1' } as never)

      const res = await GET()
      const body = await res.json()
      expect(body.posttestRequired).toBe(false)
    })

    it('posttestRequired is false outside window regardless of submission', async () => {
      vi.setSystemTime(new Date('2025-01-01T00:00:00Z')) // outside any window
      vi.mocked(prisma.postTest.findUnique).mockResolvedValue(null)

      const res = await GET()
      const body = await res.json()
      expect(body.posttestRequired).toBe(false)
    })

    it('does NOT query postTest when outside the window (no unnecessary DB call)', async () => {
      vi.setSystemTime(new Date('2025-01-01T00:00:00Z'))

      await GET()
      expect(prisma.postTest.findUnique).not.toHaveBeenCalled()
    })
  })

  describe('posttest response field for frontend linking', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-09-02T10:00:00Z'))
      vi.mocked(prisma.config.findMany).mockResolvedValue(makeMidtermConfig() as never)
    })

    it('includes posttest.windowStart and windowEnd as raw admin-entered strings', async () => {
      const res = await GET()
      const body = await res.json()
      expect(body.posttest.windowStart).toBe(MIDTERM_START)
      expect(body.posttest.windowEnd).toBe(MIDTERM_END)
    })

    it('posttest.submitted is false when player has not submitted', async () => {
      vi.mocked(prisma.postTest.findUnique).mockResolvedValue(null)
      const res = await GET()
      const body = await res.json()
      expect(body.posttest.submitted).toBe(false)
    })

    it('posttest.submitted is true when player has already submitted', async () => {
      vi.mocked(prisma.postTest.findUnique).mockResolvedValue({ id: 'pt-1' } as never)
      const res = await GET()
      const body = await res.json()
      expect(body.posttest.submitted).toBe(true)
    })

    it('posttest is null when outside window', async () => {
      vi.setSystemTime(new Date('2025-01-01T00:00:00Z'))
      const res = await GET()
      const body = await res.json()
      expect(body.posttest).toBeNull()
    })
  })

  describe('player unblocked after submission', () => {
    it('posttestRequired is false after submission even with score 0', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-09-02T10:00:00Z'))
      vi.mocked(prisma.config.findMany).mockResolvedValue(makeMidtermConfig() as never)
      // Simulate submitted row (score 0 player)
      vi.mocked(prisma.postTest.findUnique).mockResolvedValue({ id: 'pt-zero-score' } as never)

      const res = await GET()
      const body = await res.json()
      expect(body.posttestRequired).toBe(false)
    })
  })
})
