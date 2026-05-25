import { NextRequest } from 'next/server'
import { GameMode } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const player = await requireAuth()

    const { searchParams } = request.nextUrl
    const rawMode = searchParams.get('gameMode') ?? 'BACTERIA'

    if (!(rawMode in GameMode)) {
      return Response.json(
        { error: `Invalid gameMode. Must be one of: ${Object.values(GameMode).join(', ')}` },
        { status: 400 },
      )
    }

    const gameMode = rawMode as GameMode

    const microbes = await prisma.microbe.findMany({
      where: { gameMode },
      select: {
        id: true,
        name: true,
        shortName: true,
        gramType: true,
        tags: true,
        starRating: true,
        answerImageUrl: true,
        unlockedBy: {
          where: { playerId: player.id },
          select: { microbeId: true },
        },
      },
      orderBy: { name: 'asc' },
    })

    const result = microbes.map(({ unlockedBy, answerImageUrl, ...rest }) => {
      const unlocked = unlockedBy.length > 0
      return {
        ...rest,
        unlocked,
        imageUrl: unlocked ? answerImageUrl : null,
      }
    })

    return Response.json(result)
  } catch (e) {
    if (e instanceof Response) return e
    throw e
  }
}
