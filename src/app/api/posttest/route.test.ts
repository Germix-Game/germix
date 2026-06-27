import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    postTestQuestion: { findMany: vi.fn() },
    postTest: { create: vi.fn(), findUnique: vi.fn() },
    config: { findMany: vi.fn() },
  },
}))

vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn(),
}))

import { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import { POST, GET } from './route'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { PostTestPeriod, AnswerOption } from '@prisma/client'

const PLAYER_ID = 'player-1'
const mockPlayer = { id: PLAYER_ID }

// 3 questions: Q1 correct=A, Q2 correct=B, Q3 correct=C
const mockQuestions = [
  { id: 'q1', correctOption: AnswerOption.A },
  { id: 'q2', correctOption: AnswerOption.B },
  { id: 'q3', correctOption: AnswerOption.C },
]

const allCorrectAnswers = { q1: AnswerOption.A, q2: AnswerOption.B, q3: AnswerOption.C }
const allWrongAnswers  = { q1: AnswerOption.D, q2: AnswerOption.D, q3: AnswerOption.D }

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/posttest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/posttest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuth).mockResolvedValue(mockPlayer as never)
    vi.mocked(prisma.postTestQuestion.findMany).mockResolvedValue(mockQuestions as never)
    vi.mocked(prisma.postTest.create).mockResolvedValue({} as never)
  })

  describe('auth', () => {
    it('returns 401 when JWT is missing or invalid', async () => {
      vi.mocked(requireAuth).mockRejectedValue(
        new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
      )
      const res = await POST(makeRequest({ period: PostTestPeriod.MIDTERM, answers: allCorrectAnswers }))
      expect(res.status).toBe(401)
    })
  })

  describe('input validation', () => {
    it('returns 400 for malformed JSON', async () => {
      const req = new NextRequest('http://localhost/api/posttest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{bad',
      })
      const res = await POST(req)
      expect(res.status).toBe(400)
    })

    it('returns 400 when period is missing', async () => {
      const res = await POST(makeRequest({ answers: allCorrectAnswers }))
      expect(res.status).toBe(400)
    })

    it('returns 400 when answers is missing', async () => {
      const res = await POST(makeRequest({ period: PostTestPeriod.MIDTERM }))
      expect(res.status).toBe(400)
    })

    it('returns 400 when an answer value is not a valid AnswerOption', async () => {
      const res = await POST(makeRequest({
        period: PostTestPeriod.MIDTERM,
        answers: { q1: 'X', q2: AnswerOption.B, q3: AnswerOption.C },
      }))
      expect(res.status).toBe(400)
    })

    it('returns 400 when a question answer is missing from the payload', async () => {
      const res = await POST(makeRequest({
        period: PostTestPeriod.MIDTERM,
        answers: { q1: AnswerOption.A, q2: AnswerOption.B }, // q3 missing
      }))
      expect(res.status).toBe(400)
    })
  })

  describe('score computation', () => {
    it('returns 201 with correct score and total when all answers are right', async () => {
      const res = await POST(makeRequest({ period: PostTestPeriod.MIDTERM, answers: allCorrectAnswers }))
      expect(res.status).toBe(201)
      const body = await res.json()
      expect(body.score).toBe(3)
      expect(body.total).toBe(3)
    })

    it('returns score 0 when all answers are wrong — player is still unblocked', async () => {
      const res = await POST(makeRequest({ period: PostTestPeriod.MIDTERM, answers: allWrongAnswers }))
      expect(res.status).toBe(201)
      const body = await res.json()
      expect(body.score).toBe(0)
      expect(body.total).toBe(3)
    })

    it('counts only exactly correct answers', async () => {
      // q1 correct (A), q2 wrong (D), q3 correct (C) → score 2
      const res = await POST(makeRequest({
        period: PostTestPeriod.MIDTERM,
        answers: { q1: AnswerOption.A, q2: AnswerOption.D, q3: AnswerOption.C },
      }))
      const body = await res.json()
      expect(body.score).toBe(2)
    })

    it('stores answers in canonical sortOrder and computed score to DB', async () => {
      await POST(makeRequest({ period: PostTestPeriod.MIDTERM, answers: allCorrectAnswers }))
      expect(prisma.postTest.create).toHaveBeenCalledWith({
        data: {
          playerId: PLAYER_ID,
          period: PostTestPeriod.MIDTERM,
          answers: [AnswerOption.A, AnswerOption.B, AnswerOption.C],
          score: 3,
        },
      })
    })

    it('fetches questions ordered by sortOrder ascending', async () => {
      await POST(makeRequest({ period: PostTestPeriod.MIDTERM, answers: allCorrectAnswers }))
      expect(prisma.postTestQuestion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { sortOrder: 'asc' } }),
      )
    })
  })

  describe('duplicate submission', () => {
    it('returns 409 when the player has already submitted for this period', async () => {
      const conflict = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed on the fields: (`playerId`,`period`)',
        { code: 'P2002', clientVersion: '5.0.0', meta: {} },
      )
      vi.mocked(prisma.postTest.create).mockRejectedValue(conflict)

      const res = await POST(makeRequest({ period: PostTestPeriod.MIDTERM, answers: allCorrectAnswers }))
      expect(res.status).toBe(409)
      const body = await res.json()
      expect(body.error).toMatch(/already submitted/i)
    })
  })

  describe('edge cases', () => {
    it('returns 422 when no questions exist for the period', async () => {
      vi.mocked(prisma.postTestQuestion.findMany).mockResolvedValue([] as never)
      const res = await POST(makeRequest({ period: PostTestPeriod.FINAL, answers: {} }))
      expect(res.status).toBe(422)
    })
  })
})

describe('GET /api/posttest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuth).mockResolvedValue(mockPlayer as never)
    vi.mocked(prisma.config.findMany).mockResolvedValue([
      { key: 'posttest_enabled', value: 'true' },
      { key: 'posttest_period', value: 'midterm' },
    ])
    vi.mocked(prisma.postTestQuestion.findMany).mockResolvedValue(mockQuestions as never)
    vi.mocked(prisma.postTest.findUnique).mockResolvedValue(null)
  })

  it('returns disabled when config posttest_enabled is false', async () => {
    vi.mocked(prisma.config.findMany).mockResolvedValue([
      { key: 'posttest_enabled', value: 'false' },
      { key: 'posttest_period', value: 'midterm' },
    ])

    const res = await GET()
    const body = await res.json()
    expect(body.enabled).toBe(false)
    expect(body.questions).toEqual([])
  })

  it('returns questions for active period and submitted status', async () => {
    const res = await GET()
    const body = await res.json()
    expect(body.enabled).toBe(true)
    expect(body.period).toBe(PostTestPeriod.MIDTERM)
    expect(body.submitted).toBe(false)
    expect(body.questions).toHaveLength(3)
  })

  it('sets submitted to true if user has submission', async () => {
    vi.mocked(prisma.postTest.findUnique).mockResolvedValue({
      id: 'submission-1',
      score: 2,
      answers: [AnswerOption.A, AnswerOption.D, AnswerOption.C],
    } as never)
    const res = await GET()
    const body = await res.json()
    expect(body.submitted).toBe(true)
    expect(body.questions).toHaveLength(3)
    expect(body.questions[0]).not.toHaveProperty('correctOption')
  })
})

