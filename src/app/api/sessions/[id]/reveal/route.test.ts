import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    gameSession: { findUnique: vi.fn() },
    score: { count: vi.fn() },
    sessionMicrobe: { findUnique: vi.fn(), update: vi.fn() },
    microbeClue: { findMany: vi.fn() },
    $queryRaw: vi.fn(),
  },
}))

vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn(),
  requireOwner: vi.fn(),
}))

import { NextRequest } from 'next/server'
import { POST } from './route'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

const SESSION_ID = 'session-1'
const PLAYER_ID = 'player-1'

function makeRequest(body: unknown) {
  return new NextRequest(`http://localhost/api/sessions/${SESSION_ID}/reveal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const ctx = { params: Promise.resolve({ id: SESSION_ID }) }

const mockPlayer = { id: PLAYER_ID }

const mockSession = {
  id: SESSION_ID,
  playerId: PLAYER_ID,
  completed: false,
  abandoned: false,
  heartsLeft: 3,
}

const mockSessionMicrobe = {
  sessionId: SESSION_ID,
  roundNumber: 1,
  microbeId: 'microbe-1',
  revealedSlots: [] as number[],
}

const mockClueCards = [
  { sortOrder: 0, clueCard: { category: 'Shape', label: 'Round', imageUrl: '/images/round.png' } },
  { sortOrder: 1, clueCard: { category: 'Color', label: 'Purple', imageUrl: '/images/purple.png' } },
]

describe('POST /api/sessions/:id/reveal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuth).mockResolvedValue(mockPlayer as never)
    vi.mocked(prisma.gameSession.findUnique).mockResolvedValue(mockSession as never)
    vi.mocked(prisma.score.count).mockResolvedValue(0)
    vi.mocked(prisma.sessionMicrobe.findUnique).mockResolvedValue(mockSessionMicrobe as never)
    vi.mocked(prisma.microbeClue.findMany).mockResolvedValue(mockClueCards as never)
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ revealedSlots: [0] }] as never)
  })

  describe('input validation', () => {
    it('returns 422 for slotIndex below 0', async () => {
      const res = await POST(makeRequest({ slotIndex: -1 }), ctx)
      expect(res.status).toBe(422)
    })

    it('returns 422 for slotIndex above 4', async () => {
      const res = await POST(makeRequest({ slotIndex: 5 }), ctx)
      expect(res.status).toBe(422)
    })

    it('returns 422 for non-integer slotIndex', async () => {
      const res = await POST(makeRequest({ slotIndex: 1.5 }), ctx)
      expect(res.status).toBe(422)
    })

    it('returns 422 for missing slotIndex', async () => {
      const res = await POST(makeRequest({}), ctx)
      expect(res.status).toBe(422)
    })

    it('returns 400 for malformed JSON body', async () => {
      const request = new NextRequest(`http://localhost/api/sessions/${SESSION_ID}/reveal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{bad json',
      })
      const res = await POST(request, ctx)
      expect(res.status).toBe(400)
    })
  })

  describe('session guards', () => {
    it('returns 404 when session does not exist', async () => {
      vi.mocked(prisma.gameSession.findUnique).mockResolvedValue(null)
      const res = await POST(makeRequest({ slotIndex: 0 }), ctx)
      expect(res.status).toBe(404)
    })

    it('returns 409 when session is completed', async () => {
      vi.mocked(prisma.gameSession.findUnique).mockResolvedValue({ ...mockSession, completed: true } as never)
      const res = await POST(makeRequest({ slotIndex: 0 }), ctx)
      expect(res.status).toBe(409)
      const body = await res.json()
      expect(body.error).toMatch(/no longer active/i)
    })

    it('returns 409 when session is abandoned', async () => {
      vi.mocked(prisma.gameSession.findUnique).mockResolvedValue({ ...mockSession, abandoned: true } as never)
      const res = await POST(makeRequest({ slotIndex: 0 }), ctx)
      expect(res.status).toBe(409)
    })
  })

  describe('slot guards', () => {
    it('returns 409 when slot is already revealed', async () => {
      vi.mocked(prisma.sessionMicrobe.findUnique).mockResolvedValue({
        ...mockSessionMicrobe,
        revealedSlots: [0],
      } as never)
      const res = await POST(makeRequest({ slotIndex: 0 }), ctx)
      expect(res.status).toBe(409)
      const body = await res.json()
      expect(body.error).toMatch(/already revealed/i)
    })

    it('returns 422 when slotIndex exceeds actual clue card count', async () => {
      // mockClueCards only has indices 0 and 1; requesting slot 2 is out of range
      const res = await POST(makeRequest({ slotIndex: 2 }), ctx)
      expect(res.status).toBe(422)
      const body = await res.json()
      expect(body.error).toMatch(/out of range/i)
    })
  })

  describe('happy path', () => {
    it('returns 200 with card data and updated session state', async () => {
      const res = await POST(makeRequest({ slotIndex: 0 }), ctx)
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.card).toEqual({
        category: 'Shape',
        label: 'Round',
        imageUrl: '/images/round.png',
      })
      expect(body.session.cardsOpened).toBe(1)
      expect(body.session.heartsLeft).toBe(3)
    })

    it('persists the revealed slot via an atomic append', async () => {
      await POST(makeRequest({ slotIndex: 1 }), ctx)
      expect(vi.mocked(prisma.$queryRaw)).toHaveBeenCalledTimes(1)
      // Tagged-template call: [strings, ...values]. The slotIndex is interpolated
      // into both array_append(...) and the ANY(...) guard, so it appears twice.
      const values = vi.mocked(prisma.$queryRaw).mock.calls[0].slice(1)
      expect(values).toContain(1)
    })

    // Regression: the scoring bug. Concurrent reveals used to clobber each other
    // via a read-modify-write, persisting fewer slots than opened (e.g. 5 cards
    // recorded as 2 → 80 pts instead of 20). The atomic append is the source of
    // truth, so cardsOpened must reflect the full DB array, not a stale snapshot.
    it('reports the full revealed-slot count returned by the database', async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValue([
        { revealedSlots: [0, 1, 2, 3, 4] },
      ] as never)
      const res = await POST(makeRequest({ slotIndex: 1 }), ctx)
      const body = await res.json()
      expect(body.session.cardsOpened).toBe(5)
    })

    it('returns 409 when the atomic append finds the slot already revealed', async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValue([] as never)
      const res = await POST(makeRequest({ slotIndex: 1 }), ctx)
      expect(res.status).toBe(409)
      const body = await res.json()
      expect(body.error).toMatch(/already revealed/i)
    })
  })
})
