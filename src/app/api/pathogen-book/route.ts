import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { GameMode } from '@prisma/client'

const VALID_MODES = new Set<string>(['BACTERIA', 'FUNGI', 'PARASITE', 'VIRUS'])

export async function GET(request: NextRequest) {
  const gameMode = request.nextUrl.searchParams.get('gameMode')

  const microbes = await prisma.microbe.findMany({
    where: gameMode && VALID_MODES.has(gameMode)
      ? { gameMode: gameMode as GameMode }
      : undefined,
    select: {
      id: true,
      name: true,
      shortName: true,
      answerImageUrl: true,
      gameMode: true,
      gramType: true,
      tags: true,
    },
    orderBy: { name: 'asc' },
  })

  return Response.json(microbes)
}
