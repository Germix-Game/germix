import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const players = await prisma.player.findMany({
      select: { username: true, totalScore: true, gamesPlayed: true },
      orderBy: { totalScore: 'desc' },
      take: 5,
    })

    let currentRank = 1
    let prevScore: number | null = null

    const leaderboard = players.map((player) => {
      if (prevScore !== null && player.totalScore < prevScore) {
        currentRank++
      }
      prevScore = player.totalScore
      return {
        rank: currentRank,
        username: player.username,
        totalScore: player.totalScore,
        gamesPlayed: player.gamesPlayed,
      }
    })

    return Response.json(leaderboard)
  } catch (e) {
    if (e instanceof Response) return e
    throw e
  }
}
