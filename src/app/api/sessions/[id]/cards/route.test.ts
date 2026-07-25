import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    gameSession: { findUnique: vi.fn() },
    score: { count: vi.fn() },
    sessionMicrobe: { findUnique: vi.fn() },
    microbeClue: { findMany: vi.fn() },
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
const MICROBE_ID = 'microbe-1'

const ctx = { params: Promise.resolve({ id: SESSION_ID }) }
const mockPlayer = { id: PLAYER_ID }

const mockSession = {
  id: SESSION_ID,
  playerId: PLAYER_ID,
}

const mockSessionMicrobe = {
  sessionId: SESSION_ID,
  roundNumber: 1,
  microbeId: MICROBE_ID,
}

const mockClueCards = [
  { sortOrder: 0, clueCard: { category: 'GRAM_STAIN',             label: 'Gram +',    imageUrl: '/g.png' } },
  { sortOrder: 1, clueCard: { category: 'VIRULENCE_FACTOR',       label: 'Capsule',   imageUrl: '/v.png' } },
  { sortOrder: 2, clueCard: { category: 'LAB_CHARACTERISTIC',     label: 'Catalase+', imageUrl: '/l.png' } },
  { sortOrder: 3, clueCard: { category: 'SPECIAL_TRAIT',          label: 'Tumbling',  imageUrl: '/s.png' } },
  { sortOrder: 4, clueCard: { category: 'CLINICAL_MANIFESTATION', label: 'Abscess',   imageUrl: '/c.png' } },
]

describe('GET /api/sessions/:id/cards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuth).mockResolvedValue(mockPlayer as never)
    vi.mocked(prisma.gameSession.findUnique).mockResolvedValue(mockSession as never)
    vi.mocked(prisma.score.count).mockResolvedValue(0)
    vi.mocked(prisma.sessionMicrobe.findUnique).mockResolvedValue(mockSessionMicrobe as never)
    vi.mocked(prisma.microbeClue.findMany).mockResolvedValue(mockClueCards as never)
  })

  it('returns 404 when session does not exist', async () => {
    vi.mocked(prisma.gameSession.findUnique).mockResolvedValue(null)
    const res = await GET(new Request('http://localhost'), ctx)
    expect(res.status).toBe(404)
  })

  it('returns 409 when there is no active round for the computed position', async () => {
    vi.mocked(prisma.sessionMicrobe.findUnique).mockResolvedValue(null)
    const res = await GET(new Request('http://localhost'), ctx)
    expect(res.status).toBe(409)
  })

  it('returns one card per slot in fixed slot order', async () => {
    const res = await GET(new Request('http://localhost'), ctx)
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.cards.map((c: { imageUrl: string } | null) => c?.imageUrl)).toEqual([
      '/g.png',
      '/v.png',
      '/l.png',
      '/s.png',
      '/c.png',
    ])
  })

  it('never includes the clue label in the response', async () => {
    const res = await GET(new Request('http://localhost'), ctx)
    const body = await res.json()
    body.cards.forEach((c: Record<string, unknown> | null) => {
      if (c) expect(c).not.toHaveProperty('label')
    })
  })

  it('returns null for slots whose category the microbe lacks', async () => {
    vi.mocked(prisma.microbeClue.findMany).mockResolvedValue([mockClueCards[0]] as never)
    const res = await GET(new Request('http://localhost'), ctx)
    const body = await res.json()
    expect(body.cards).toEqual([
      { category: 'GRAM_STAIN', imageUrl: '/g.png' },
      null,
      null,
      null,
      null,
    ])
  })

  it('computes round position from correctly-answered scores only', async () => {
    // 2 correct answers so far → on round 3 (1-indexed)
    vi.mocked(prisma.score.count).mockResolvedValue(2)
    await GET(new Request('http://localhost'), ctx)

    expect(prisma.score.count).toHaveBeenCalledWith({ where: { sessionId: SESSION_ID, correct: true } })
    expect(prisma.sessionMicrobe.findUnique).toHaveBeenCalledWith({
      where: { sessionId_roundNumber: { sessionId: SESSION_ID, roundNumber: 3 } },
    })
  })

  it('looks up clues for the microbe of the current round', async () => {
    await GET(new Request('http://localhost'), ctx)
    expect(prisma.microbeClue.findMany).toHaveBeenCalledWith({
      where: { microbeId: MICROBE_ID },
      orderBy: [{ sortOrder: 'asc' }, { clueCardId: 'asc' }],
      include: { clueCard: { select: { id: true, category: true, imageUrl: true } } },
    })
  })
})
