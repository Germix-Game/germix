import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    gameSession: { findUnique: vi.fn() },
    score: { count: vi.fn() },
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
  gameSession: { findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> }
  score: { count: ReturnType<typeof vi.fn>; findFirst: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> }
  sessionMicrobe: { findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> }
  playerMicrobeUnlocked: { upsert: ReturnType<typeof vi.fn> }
  player: { update: ReturnType<typeof vi.fn> }
}

let capturedTx: MockTx
// `correct: true` look-up vs `correct: false` look-up share one mocked method
// inside the transaction, so route under both based on the where clause.
let existingCorrectScore: unknown = null
let wrongAttemptScore: unknown = null

function setupTransactionMock() {
  vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
    capturedTx = {
      gameSession: {
        findUnique: vi.fn(() => (prisma.gameSession.findUnique as () => unknown)()),
        update: vi.fn(),
      },
      score: {
        count: vi.fn(() => (prisma.score.count as () => unknown)()),
        findFirst: vi.fn(({ where }: { where: { correct: boolean } }) =>
          where.correct ? existingCorrectScore : wrongAttemptScore,
        ),
        create: vi.fn(),
      },
      sessionMicrobe: {
        findUnique: vi.fn(() => (prisma.sessionMicrobe.findUnique as () => unknown)()),
        update: vi.fn(),
      },
      playerMicrobeUnlocked: { upsert: vi.fn() },
      player: { update: vi.fn() },
    }
    return await (fn as (tx: unknown) => Promise<unknown>)(capturedTx)
  })
}

describe('POST /api/sessions/:id/answer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    existingCorrectScore = null
    wrongAttemptScore = null
    vi.mocked(requireAuth).mockResolvedValue(mockPlayer as never)
    vi.mocked(prisma.gameSession.findUnique).mockResolvedValue(mockSession as never)
    vi.mocked(prisma.score.count).mockResolvedValue(0)
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
      existingCorrectScore = { id: 'score-existing' }
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

  describe('merging client-reported reveals', () => {
    it('scores using the union of persisted and client-reported slots, not persisted alone', async () => {
      // Persisted only has slot 0, but the client says it also revealed 1 and 2
      // (the /reveal requests for those are still in flight) — score should
      // reflect all 3, not just the 1 that made it to the DB first.
      const res = await POST(
        makeRequest({ answeredMicrobeId: MICROBE_ID, revealedSlotIndexes: [1, 2] }),
        ctx,
      )
      const body = await res.json()
      expect(body.roundScore).toBe(60) // 3 cards opened
    })

    it('persists the merged slots back onto sessionMicrobe', async () => {
      await POST(
        makeRequest({ answeredMicrobeId: MICROBE_ID, revealedSlotIndexes: [1] }),
        ctx,
      )
      expect(capturedTx.sessionMicrobe.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { revealedSlots: [0, 1] } }),
      )
    })

    it('does not write to sessionMicrobe when the client reports nothing new', async () => {
      await POST(
        makeRequest({ answeredMicrobeId: MICROBE_ID, revealedSlotIndexes: [0] }),
        ctx,
      )
      expect(capturedTx.sessionMicrobe.update).not.toHaveBeenCalled()
    })

    it('does not let an empty client list shrink the persisted reveal count', async () => {
      vi.mocked(prisma.sessionMicrobe.findUnique).mockResolvedValue({
        ...mockSessionMicrobe,
        revealedSlots: [0, 1, 2],
      } as never)
      const res = await POST(makeRequest({ answeredMicrobeId: MICROBE_ID }), ctx)
      const body = await res.json()
      expect(body.roundScore).toBe(60) // still scored on 3 persisted cards, not 0
    })

    it('succeeds when nothing is persisted yet but the client reports a reveal', async () => {
      vi.mocked(prisma.sessionMicrobe.findUnique).mockResolvedValue({
        ...mockSessionMicrobe,
        revealedSlots: [],
      } as never)
      const res = await POST(
        makeRequest({ answeredMicrobeId: MICROBE_ID, revealedSlotIndexes: [0] }),
        ctx,
      )
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.roundScore).toBe(100)
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
    it('marks session completed when all 5 microbes are answered correctly', async () => {
      // 4 previous correct scores → this is round 5 (TOTAL_MICROBES = 5)
      vi.mocked(prisma.score.count).mockResolvedValue(4)
      vi.mocked(prisma.sessionMicrobe.findUnique).mockResolvedValue({
        ...mockSessionMicrobe,
        roundNumber: 5,
        revealedSlots: [0],
      } as never)

      const res = await POST(makeRequest({ answeredMicrobeId: MICROBE_ID }), ctx)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.session.completed).toBe(true)
    })

    it('updates Player totalScore and gamesPlayed on game completion', async () => {
      vi.mocked(prisma.score.count).mockResolvedValue(4)
      vi.mocked(prisma.sessionMicrobe.findUnique).mockResolvedValue({
        ...mockSessionMicrobe,
        roundNumber: 5,
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
      // Only 2 of 5 microbes answered correctly so far (TOTAL_MICROBES = 5)
      vi.mocked(prisma.score.count).mockResolvedValue(2)
      await POST(makeRequest({ answeredMicrobeId: MICROBE_ID }), ctx)
      expect(capturedTx.player.update).not.toHaveBeenCalled()
    })
  })
})
