import { vi, describe, it, expect, beforeEach } from 'vitest'

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

function makeMidtermConfig(enabled = 'true') {
  return [
    { key: 'posttest_enabled', value: enabled },
    { key: 'posttest_period',  value: 'midterm' },
  ]
}

function makeFinalConfig(enabled = 'true') {
  return [
    { key: 'posttest_enabled', value: enabled },
    { key: 'posttest_period',  value: 'final' },
  ]
}

describe('GET /api/game-modes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuth).mockResolvedValue(mockPlayer as never)
    vi.mocked(prisma.config.findMany).mockResolvedValue([])
    vi.mocked(prisma.postTest.findUnique).mockResolvedValue(null)
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
      const now = new Date('2026-01-01T00:00:00Z')
      vi.useFakeTimers()
      vi.setSystemTime(now)
      vi.mocked(prisma.config.findMany).mockResolvedValue([
        { key: 'parasite_unlock', value: '2026-06-01T00:00:00Z' },
      ] as never)

      const res = await GET()
      const body = await res.json()
      expect(body.parasite.unlocked).toBe(false)
      expect(body.parasite.unlocksAt).toBe('2026-06-01T00:00:00.000Z')
      vi.useRealTimers()
    })

    it('parasite is unlocked when past the unlock date', async () => {
      const now = new Date('2027-01-01T00:00:00Z')
      vi.useFakeTimers()
      vi.setSystemTime(now)
      vi.mocked(prisma.config.findMany).mockResolvedValue([
        { key: 'parasite_unlock', value: '2026-06-01T00:00:00Z' },
      ] as never)

      const res = await GET()
      const body = await res.json()
      expect(body.parasite.unlocked).toBe(true)
      vi.useRealTimers()
    })
  })

  describe('posttest config-based check', () => {
    it('posttest is NOT active when posttest_enabled is false', async () => {
      vi.mocked(prisma.config.findMany).mockResolvedValue(makeMidtermConfig('false') as never)

      const res = await GET()
      const body = await res.json()
      expect(body.posttestRequired).toBe(false)
      expect(body.posttest).toBeNull()
    })

    it('posttest IS active when posttest_enabled is true (MIDTERM)', async () => {
      vi.mocked(prisma.config.findMany).mockResolvedValue(makeMidtermConfig('true') as never)

      const res = await GET()
      const body = await res.json()
      expect(body.posttestRequired).toBe(true)
      expect(body.posttest).not.toBeNull()
      expect(body.posttest.period).toBe(PostTestPeriod.MIDTERM)
    })

    it('posttest IS active when posttest_enabled is true (FINAL)', async () => {
      vi.mocked(prisma.config.findMany).mockResolvedValue(makeFinalConfig('true') as never)

      const res = await GET()
      const body = await res.json()
      expect(body.posttestRequired).toBe(true)
      expect(body.posttest).not.toBeNull()
      expect(body.posttest.period).toBe(PostTestPeriod.FINAL)
    })
  })

  describe('posttestRequired logic', () => {
    it('posttestRequired is true when enabled and player has NOT submitted', async () => {
      vi.mocked(prisma.config.findMany).mockResolvedValue(makeMidtermConfig('true') as never)
      vi.mocked(prisma.postTest.findUnique).mockResolvedValue(null)

      const res = await GET()
      const body = await res.json()
      expect(body.posttestRequired).toBe(true)
    })

    it('posttestRequired is false when enabled and player HAS submitted', async () => {
      vi.mocked(prisma.config.findMany).mockResolvedValue(makeMidtermConfig('true') as never)
      vi.mocked(prisma.postTest.findUnique).mockResolvedValue({ id: 'pt-1' } as never)

      const res = await GET()
      const body = await res.json()
      expect(body.posttestRequired).toBe(false)
    })

    it('posttestRequired is false when disabled regardless of submission', async () => {
      vi.mocked(prisma.config.findMany).mockResolvedValue(makeMidtermConfig('false') as never)
      vi.mocked(prisma.postTest.findUnique).mockResolvedValue(null)

      const res = await GET()
      const body = await res.json()
      expect(body.posttestRequired).toBe(false)
    })

    it('does NOT query postTest when disabled (no unnecessary DB call)', async () => {
      vi.mocked(prisma.config.findMany).mockResolvedValue(makeMidtermConfig('false') as never)

      await GET()
      expect(prisma.postTest.findUnique).not.toHaveBeenCalled()
    })
  })

  describe('posttest response field for frontend linking', () => {
    it('posttest.submitted is false when player has not submitted', async () => {
      vi.mocked(prisma.config.findMany).mockResolvedValue(makeMidtermConfig('true') as never)
      vi.mocked(prisma.postTest.findUnique).mockResolvedValue(null)
      const res = await GET()
      const body = await res.json()
      expect(body.posttest.submitted).toBe(false)
    })

    it('posttest.submitted is true when player has already submitted', async () => {
      vi.mocked(prisma.config.findMany).mockResolvedValue(makeMidtermConfig('true') as never)
      vi.mocked(prisma.postTest.findUnique).mockResolvedValue({ id: 'pt-1' } as never)
      const res = await GET()
      const body = await res.json()
      expect(body.posttest.submitted).toBe(true)
    })

    it('posttest is null when disabled', async () => {
      vi.mocked(prisma.config.findMany).mockResolvedValue(makeMidtermConfig('false') as never)
      const res = await GET()
      const body = await res.json()
      expect(body.posttest).toBeNull()
    })
  })

  describe('player unblocked after submission', () => {
    it('posttestRequired is false after submission even with score 0', async () => {
      vi.mocked(prisma.config.findMany).mockResolvedValue(makeMidtermConfig('true') as never)
      vi.mocked(prisma.postTest.findUnique).mockResolvedValue({ id: 'pt-zero-score' } as never)

      const res = await GET()
      const body = await res.json()
      expect(body.posttestRequired).toBe(false)
    })
  })
})
