import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    gameSession: { findUnique: vi.fn() },
    score: { count: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn() },
    sessionMicrobe: { findUnique: vi.fn() },
    $transaction: vi.fn(),
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
const MICROBE_ID = 'microbe-1'

function makeRequest(body: unknown) {
  return new NextRequest(`http://localhost/api/sessions/${SESSION_ID}/answer`, {
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
  totalScore: 0,
  currentRound: 1,
}

const mockSessionMicrobe = {
  sessionId: SESSION_ID,
  roundNumber: 1,
  microbeId: MICROBE_ID,
  revealedSlots: [0],
  microbe: {
    id: MICROBE_ID,
    name: 'E. coli',
    shortName: 'E.c',
    answerImageUrl: '/microbes/ecoli.png',
  },
}

type MockTx = {
  score: { create: ReturnType<typeof vi.fn> }
  gameSession: { update: ReturnType<typeof vi.fn> }
  playerMicrobeUnlocked: { upsert: ReturnType<typeof vi.fn> }
  player: { update: ReturnType<typeof vi.fn> }
}

let capturedTx: MockTx

function setupTransactionMock() {
  vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
    capturedTx = {
      score: { create: vi.fn() },
      gameSession: { update: vi.fn() },
      playerMicrobeUnlocked: { upsert: vi.fn() },
      player: { update: vi.fn() },
    }
    await (fn as (tx: unknown) => Promise<void>)(capturedTx)
  })
}

describe('POST /api/sessions/:id/answer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuth).mockResolvedValue(mockPlayer as never)
    vi.mocked(prisma.gameSession.findUnique).mockResolvedValue(mockSession as never)
    vi.mocked(prisma.score.count).mockResolvedValue(0)
    vi.mocked(prisma.score.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.score.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.sessionMicrobe.findUnique).mockResolvedValue(mockSessionMicrobe as never)
    setupTransactionMock()
  })

  describe('input validation', () => {
    it('returns 422 when answeredMicrobeId is missing', async () => {
      const res = await POST(makeRequest({}), ctx)
      expect(res.status).toBe(422)
    })

    it('returns 422 when answeredMicrobeId is empty string', async () => {
      const res = await POST(makeRequest({ answeredMicrobeId: '' }), ctx)
      expect(res.status).toBe(422)
    })

    it('returns 400 for malformed JSON body', async () => {
      const request = new NextRequest(`http://localhost/api/sessions/${SESSION_ID}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{bad',
      })
      const res = await POST(request, ctx)
      expect(res.status).toBe(400)
    })
  })

  describe('session guards', () => {
    it('returns 404 when session does not exist', async () => {
      vi.mocked(prisma.gameSession.findUnique).mockResolvedValue(null)
      const res = await POST(makeRequest({ answeredMicrobeId: MICROBE_ID }), ctx)
      expect(res.status).toBe(404)
    })

    it('returns 409 when session is completed', async () => {
      vi.mocked(prisma.gameSession.findUnique).mockResolvedValue({ ...mockSession, completed: true } as never)
      const res = await POST(makeRequest({ answeredMicrobeId: MICROBE_ID }), ctx)
      expect(res.status).toBe(409)
      const body = await res.json()
      expect(body.error).toMatch(/no longer active/i)
    })

    it('returns 409 when session is abandoned', async () => {
      vi.mocked(prisma.gameSession.findUnique).mockResolvedValue({ ...mockSession, abandoned: true } as never)
      const res = await POST(makeRequest({ answeredMicrobeId: MICROBE_ID }), ctx)
      expect(res.status).toBe(409)
    })

    it('returns 409 for duplicate answer submission (idempotency)', async () => {
      vi.mocked(prisma.score.findFirst).mockResolvedValue({ id: 'score-existing' } as never)
      const res = await POST(makeRequest({ answeredMicrobeId: MICROBE_ID }), ctx)
      expect(res.status).toBe(409)
      const body = await res.json()
      expect(body.error).toMatch(/already submitted/i)
    })

    it('returns 422 when no cards have been revealed yet', async () => {
      vi.mocked(prisma.sessionMicrobe.findUnique).mockResolvedValue({
        ...mockSessionMicrobe,
        revealedSlots: [],
      } as never)
      const res = await POST(makeRequest({ answeredMicrobeId: MICROBE_ID }), ctx)
      expect(res.status).toBe(422)
      const body = await res.json()
      expect(body.error).toMatch(/reveal/i)
    })
  })

  describe('correct answer', () => {
    it('returns correct=true with 100 score when 1 card was opened', async () => {
      const res = await POST(makeRequest({ answeredMicrobeId: MICROBE_ID }), ctx)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.correct).toBe(true)
      expect(body.roundScore).toBe(100)
      expect(body.session.heartsLeft).toBe(3)
    })

    it('returns 60 score when 3 cards were opened before correct answer', async () => {
      vi.mocked(prisma.sessionMicrobe.findUnique).mockResolvedValue({
        ...mockSessionMicrobe,
        revealedSlots: [0, 1, 2],
      } as never)
      const res = await POST(makeRequest({ answeredMicrobeId: MICROBE_ID }), ctx)
      const body = await res.json()
      expect(body.roundScore).toBe(60)
    })

    it('upserts PlayerMicrobeUnlocked on correct answer', async () => {
      await POST(makeRequest({ answeredMicrobeId: MICROBE_ID }), ctx)
      expect(capturedTx.playerMicrobeUnlocked.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { playerId_microbeId: { playerId: PLAYER_ID, microbeId: MICROBE_ID } },
        })
      )
    })

    it('returns the correct microbe info in the response', async () => {
      const res = await POST(makeRequest({ answeredMicrobeId: MICROBE_ID }), ctx)
      const body = await res.json()
      expect(body.correctMicrobe).toEqual({
        id: MICROBE_ID,
        name: 'E. coli',
        shortName: 'E.c',
        imageUrl: '/microbes/ecoli.png',
      })
    })
  })

  describe('wrong answer', () => {
    it('returns correct=false with 0 score and deducts 1 heart', async () => {
      const res = await POST(makeRequest({ answeredMicrobeId: 'wrong-microbe' }), ctx)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.correct).toBe(false)
      expect(body.roundScore).toBe(0)
      expect(body.session.heartsLeft).toBe(2)
    })

    it('does not upsert PlayerMicrobeUnlocked on wrong answer', async () => {
      await POST(makeRequest({ answeredMicrobeId: 'wrong-microbe' }), ctx)
      expect(capturedTx.playerMicrobeUnlocked.upsert).not.toHaveBeenCalled()
    })

    it('marks session abandoned and sets completedAt when last heart is lost', async () => {
      vi.mocked(prisma.gameSession.findUnique).mockResolvedValue({ ...mockSession, heartsLeft: 1 } as never)
      const res = await POST(makeRequest({ answeredMicrobeId: 'wrong-microbe' }), ctx)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.session.heartsLeft).toBe(0)

      expect(capturedTx.gameSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ abandoned: true, completedAt: expect.any(Date) }),
        })
      )
    })
  })

  describe('game completion', () => {
    it('marks session completed when all 15 microbes are answered correctly', async () => {
      // 14 previous scores → this is round 15 (TOTAL_MICROBES = 15)
      vi.mocked(prisma.score.count).mockResolvedValue(14)
      vi.mocked(prisma.sessionMicrobe.findUnique).mockResolvedValue({
        ...mockSessionMicrobe,
        roundNumber: 15,
        revealedSlots: [0],
      } as never)

      const res = await POST(makeRequest({ answeredMicrobeId: MICROBE_ID }), ctx)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.session.completed).toBe(true)
    })

    it('updates Player totalScore and gamesPlayed on game completion', async () => {
      vi.mocked(prisma.score.count).mockResolvedValue(14)
      vi.mocked(prisma.sessionMicrobe.findUnique).mockResolvedValue({
        ...mockSessionMicrobe,
        roundNumber: 15,
        revealedSlots: [0],
      } as never)

      await POST(makeRequest({ answeredMicrobeId: MICROBE_ID }), ctx)

      expect(capturedTx.player.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: PLAYER_ID },
          data: expect.objectContaining({
            totalScore: expect.objectContaining({ increment: expect.any(Number) }),
            gamesPlayed: expect.objectContaining({ increment: 1 }),
          }),
        })
      )
    })

    it('does not update Player stats when game is not yet complete', async () => {
      // Only 2 of 5 microbes done (TOTAL_MICROBES = 5)
      vi.mocked(prisma.score.count).mockResolvedValue(2)
      await POST(makeRequest({ answeredMicrobeId: MICROBE_ID }), ctx)
      expect(capturedTx.player.update).not.toHaveBeenCalled()
    })
  })
})
