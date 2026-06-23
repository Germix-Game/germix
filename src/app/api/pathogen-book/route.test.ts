import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    microbe: { findMany: vi.fn() },
    microbeClue: { findMany: vi.fn() },
    player: { findUnique: vi.fn() },
  },
}))

vi.mock('@/lib/supabase', () => ({
  createSupabaseServerClient: vi.fn().mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
  }),
}))

import { NextRequest } from 'next/server'
import { GET } from './route'
import { prisma } from '@/lib/prisma'

function makeRequest(query: string) {
  return new NextRequest(`http://localhost/api/pathogen-book${query}`)
}

describe('GET /api/pathogen-book', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.microbe.findMany).mockResolvedValue([] as never)
  })

  it('filters by gameMode=PARASITE (the real session/GameMode enum value)', async () => {
    await GET(makeRequest('?gameMode=PARASITE'))
    expect(prisma.microbe.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { gameMode: 'PARASITE' } }),
    )
  })

  it('filters by gameMode=PARASITES (the pathogen-book tab UI alias) the same way', async () => {
    await GET(makeRequest('?gameMode=PARASITES'))
    expect(prisma.microbe.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { gameMode: 'PARASITE' } }),
    )
  })

  it('filters by gameMode=BACTERIA', async () => {
    await GET(makeRequest('?gameMode=BACTERIA'))
    expect(prisma.microbe.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { gameMode: 'BACTERIA' } }),
    )
  })

  it('does not filter (fetches all microbes) when gameMode is missing', async () => {
    await GET(makeRequest(''))
    expect(prisma.microbe.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: undefined }),
    )
  })

  it('does not filter when gameMode is an unrecognized value', async () => {
    await GET(makeRequest('?gameMode=NOT_A_MODE'))
    expect(prisma.microbe.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: undefined }),
    )
  })
})
