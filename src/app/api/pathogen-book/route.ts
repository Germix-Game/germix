import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOptionalPlayer } from '@/lib/auth'
import { getBookSlots } from '@/lib/clues'
import type { GameMode } from '@prisma/client'

// Accept both the DB enum value (PARASITE) and the legacy plural (PARASITES).
const VALID_MODES = new Set<string>(['BACTERIA', 'FUNGI', 'PARASITE', 'PARASITES', 'VIRUS'])

const MODE_MAP: Record<string, string> = { PARASITES: 'PARASITE' }

export async function GET(request: NextRequest) {
  const gameMode = request.nextUrl.searchParams.get('gameMode')

  // Resolve the current player (optional — unauthenticated users see all as
  // locked). Uses the same auth as the game routes so unlocks written under the
  // (dev or real) player are read back under that same id.
  let playerId: string | null = null
  try {
    const player = await getOptionalPlayer()
    if (player) playerId = player.id
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
      orderBy: [{ gramType: 'asc' }, { name: 'asc' }],
    })

    const result = microbes.map(({ unlockedBy, ...m }) => ({
      ...m,
      unlocked: Array.isArray(unlockedBy) && unlockedBy.length > 0,
    }))

    // Optionally include the opened-slot view for the first unlocked microbe to
    // avoid a waterfall fetch. Same shape as the per-microbe /clues route.
    const withFirstClues = request.nextUrl.searchParams.get('withFirstClues') === 'true'
    if (withFirstClues && playerId) {
      const firstUnlocked = result.find((m) => m.unlocked)
      if (firstUnlocked) {
        const unlock = await prisma.playerMicrobeUnlocked.findUnique({
          where: { playerId_microbeId: { playerId, microbeId: firstUnlocked.id } },
          select: { cardSlotsOpened: true },
        })
        const slots = await getBookSlots(firstUnlocked.id, unlock?.cardSlotsOpened ?? [])
        return Response.json({
          microbes: result,
          firstMicrobeId: firstUnlocked.id,
          firstMicrobeSlots: slots,
        })
      }
    }

    return Response.json({ microbes: result, firstMicrobeId: null, firstMicrobeSlots: null })
  } catch (err) {
    console.error('[pathogen-book] DB error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
