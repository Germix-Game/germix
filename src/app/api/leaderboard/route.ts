import { prisma } from '@/lib/prisma'

export async function GET() {
  const players = await prisma.player.findMany({
    orderBy: { totalScore: 'desc' },
    take: 7,
    select: {
      username: true,
      totalScore: true,
      gamesPlayed: true,
    },
  })

  return Response.json(players)
}
