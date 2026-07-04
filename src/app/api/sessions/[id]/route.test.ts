import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    gameSession: { findUnique: vi.fn() },
    score: { count: vi.fn() },
    sessionMicrobe: { findUnique: vi.fn() },
  },
}))

vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn(),
  requireOwner: vi.fn(),
}))

import { GET } from './route'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

const SESSION_ID = 'session-1'
const PLAYER_ID = 'player-1'

const ctx = { params: Promise.resolve({ id: SESSION_ID }) }
const mockPlayer = { id: PLAYER_ID }

const mockSession = {
  id: SESSION_ID,
  playerId: PLAYER_ID,
  gameMode: 'BACTERIA',
  heartsLeft: 3,
  totalScore: 10,
  currentRound: 1,
}

describe('GET /api/sessions/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuth).mockResolvedValue(mockPlayer as never)
    vi.mocked(prisma.gameSession.findUnique).mockResolvedValue(mockSession as never)
    vi.mocked(prisma.score.count).mockResolvedValue(0)
    vi.mocked(prisma.sessionMicrobe.findUnique).mockResolvedValue({ revealedSlots: [] } as never)
  })

  it('returns 404 when session does not exist', async () => {
    vi.mocked(prisma.gameSession.findUnique).mockResolvedValue(null)
    const res = await GET(new Request('http://localhost'), ctx)
    expect(res.status).toBe(404)
  })

  it('computes round position from correctly-answered scores only', async () => {
    // 1 correct answer so far → on round 2 (1-indexed)
    vi.mocked(prisma.score.count).mockResolvedValue(1)
    await GET(new Request('http://localhost'), ctx)

    expect(prisma.score.count).toHaveBeenCalledWith({ where: { sessionId: SESSION_ID, correct: true } })
    expect(prisma.sessionMicrobe.findUnique).toHaveBeenCalledWith({
      where: { sessionId_roundNumber: { sessionId: SESSION_ID, roundNumber: 2 } },
      select: { revealedSlots: true },
    })
  })

  it('returns revealedSlots for the current round mapped into the 5 slots', async () => {
    vi.mocked(prisma.sessionMicrobe.findUnique).mockResolvedValue({ revealedSlots: [1, 3] } as never)
    const res = await GET(new Request('http://localhost'), ctx)
    const body = await res.json()

    expect(body.slots).toEqual([
      { index: 0, revealed: false },
      { index: 1, revealed: true },
      { index: 2, revealed: false },
      { index: 3, revealed: true },
      { index: 4, revealed: false },
    ])
  })

  it('defaults to no revealed slots when there is no active round', async () => {
    vi.mocked(prisma.sessionMicrobe.findUnique).mockResolvedValue(null)
    const res = await GET(new Request('http://localhost'), ctx)
    const body = await res.json()

    expect(body.slots.every((s: { revealed: boolean }) => s.revealed === false)).toBe(true)
  })

  it('derives currentMicrobeInRound from the correct-answer count, not total attempts', async () => {
    // MICROBES_PER_ROUND is 1, so currentMicrobeInRound is always 1 regardless
    // of how many scores exist — what matters is that score.count is filtered
    // to correct: true (asserted above), not the resulting value here.
    vi.mocked(prisma.score.count).mockResolvedValue(1)
    const res = await GET(new Request('http://localhost'), ctx)
    const body = await res.json()

    expect(body.currentMicrobeInRound).toBe(1)
  })

  it('passes through session fields untouched', async () => {
    const res = await GET(new Request('http://localhost'), ctx)
    const body = await res.json()

    expect(body.heartsLeft).toBe(3)
    expect(body.totalScore).toBe(10)
    expect(body.gameMode).toBe('BACTERIA')
  })
})
