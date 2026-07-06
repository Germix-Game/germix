import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    player: { findMany: vi.fn(), findUnique: vi.fn(), count: vi.fn() },
  },
}))

vi.mock('@/lib/supabase', () => ({
  createSupabaseServerClient: vi.fn().mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
  }),
}))

import { GET } from './route'
import { prisma } from '@/lib/prisma'

const mockPlayers = [
  { username: 'alice', totalScore: 1500, gamesPlayed: 10 },
  { username: 'bob', totalScore: 1200, gamesPlayed: 8 },
  { username: 'carol', totalScore: 900, gamesPlayed: 6 },
  { username: 'dave', totalScore: 600, gamesPlayed: 4 },
  { username: 'eve', totalScore: 300, gamesPlayed: 2 },
]

describe('GET /api/leaderboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.player.findMany).mockResolvedValue(mockPlayers as never)
  })

  it('returns 200 without any auth cookie', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
  })

  it('returns top5 array of up to 5 entries', async () => {
    const res = await GET()
    const body = await res.json()
    expect(Array.isArray(body.top5)).toBe(true)
    expect(body.top5.length).toBeLessThanOrEqual(5)
  })

  it('returns null currentPlayer when unauthenticated', async () => {
    const res = await GET()
    const body = await res.json()
    expect(body.currentPlayer).toBeNull()
  })

  it('returns entries with the correct shape', async () => {
    const res = await GET()
    const body = await res.json()
    for (const entry of body.top5) {
      expect(entry).toMatchObject({
        rank: expect.any(Number),
        username: expect.any(String),
        totalScore: expect.any(Number),
        gamesPlayed: expect.any(Number),
      })
    }
  })

  it('assigns sequential ranks for players with distinct scores', async () => {
    const res = await GET()
    const body = await res.json()
    expect(body.top5[0].rank).toBe(1)
    expect(body.top5[1].rank).toBe(2)
    expect(body.top5[2].rank).toBe(3)
    expect(body.top5[3].rank).toBe(4)
    expect(body.top5[4].rank).toBe(5)
  })

  it('assigns the same dense rank to players with equal totalScore', async () => {
    vi.mocked(prisma.player.findMany).mockResolvedValue([
      { username: 'alice', totalScore: 1500, gamesPlayed: 10 },
      { username: 'bob', totalScore: 1500, gamesPlayed: 8 },
      { username: 'carol', totalScore: 900, gamesPlayed: 6 },
      { username: 'dave', totalScore: 600, gamesPlayed: 4 },
      { username: 'eve', totalScore: 300, gamesPlayed: 2 },
    ] as never)

    const res = await GET()
    const body = await res.json()

    expect(body.top5[0].rank).toBe(1)
    expect(body.top5[1].rank).toBe(1) // tied with alice
    expect(body.top5[2].rank).toBe(2) // dense: next rank is 2, not 3
    expect(body.top5[3].rank).toBe(3)
    expect(body.top5[4].rank).toBe(4)
  })

  it('handles three-way tie at the top with correct dense ranks', async () => {
    vi.mocked(prisma.player.findMany).mockResolvedValue([
      { username: 'alice', totalScore: 1500, gamesPlayed: 10 },
      { username: 'bob', totalScore: 1500, gamesPlayed: 8 },
      { username: 'carol', totalScore: 1500, gamesPlayed: 6 },
      { username: 'dave', totalScore: 600, gamesPlayed: 4 },
      { username: 'eve', totalScore: 300, gamesPlayed: 2 },
    ] as never)

    const res = await GET()
    const body = await res.json()

    expect(body.top5[0].rank).toBe(1)
    expect(body.top5[1].rank).toBe(1)
    expect(body.top5[2].rank).toBe(1)
    expect(body.top5[3].rank).toBe(2) // dense rank: 2 not 4
    expect(body.top5[4].rank).toBe(3)
  })

  it('returns empty top5 when no players exist', async () => {
    vi.mocked(prisma.player.findMany).mockResolvedValue([] as never)
    const res = await GET()
    const body = await res.json()
    expect(body.top5).toEqual([])
  })

  it('queries prisma with correct ordering and limit', async () => {
    await GET()
    expect(prisma.player.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { totalScore: 'desc' },
        take: 5,
      })
    )
  })

  it('selects only username, totalScore, and gamesPlayed columns', async () => {
    await GET()
    expect(prisma.player.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: { username: true, totalScore: true, gamesPlayed: true },
      })
    )
  })
})
