import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSupabaseServerClient } from '@/lib/supabase'
import type { GameMode } from '@prisma/client'

const VALID_MODES = new Set<string>(['BACTERIA', 'FUNGI', 'PARASITES', 'VIRUS'])

const MODE_MAP: Record<string, string> = { PARASITES: 'PARASITE' }

export async function GET(request: NextRequest) {
  const gameMode = request.nextUrl.searchParams.get('gameMode')

  // Resolve the current player (optional — unauthenticated users see all as locked)
  let playerId: string | null = null
  try {
    const supabase = await createSupabaseServerClient()
    const { data } = await supabase.auth.getUser()
    if (data.user) {
      const player = await prisma.player.findUnique({ where: { id: data.user.id }, select: { id: true } })
      if (player) playerId = player.id
    }
  } catch {
    // not authenticated — all microbes will be locked
  }

  try {
    const microbes = await prisma.microbe.findMany({
      where: gameMode && VALID_MODES.has(gameMode)
        ? { gameMode: (MODE_MAP[gameMode] ?? gameMode) as GameMode }
        : undefined,
      select: {
        id: true,
        name: true,
        shortName: true,
        answerImageUrl: true,
        gameMode: true,
        gramType: true,
        starRating: true,
        tags: true,
        unlockedBy: playerId
          ? { where: { playerId }, select: { playerId: true } }
          : false,
      },
      orderBy: { name: 'asc' },
    })

    const result = microbes.map(({ unlockedBy, ...m }) => ({
      ...m,
      unlocked: Array.isArray(unlockedBy) && unlockedBy.length > 0,
    }))

    return Response.json(result)
  } catch (err) {
    console.error('[pathogen-book] DB error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
