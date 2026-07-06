import { prisma } from '@/lib/prisma'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function GET() {
  const top5Raw = await prisma.player.findMany({
    orderBy: { totalScore: 'desc' },
    take: 5,
    select: { username: true, totalScore: true, gamesPlayed: true },
  })

  let rank = 1
  const top5 = top5Raw.map((player, i) => {
    if (i > 0 && player.totalScore < top5Raw[i - 1].totalScore) rank++
    return { rank, ...player }
  })

  let currentPlayer: { rank: number; username: string; totalScore: number; gamesPlayed: number } | null = null
  try {
    const supabase = await createSupabaseServerClient()
    const { data } = await supabase.auth.getUser()
    if (data.user) {
      const player = await prisma.player.findUnique({
        where: { id: data.user.id },
        select: { username: true, totalScore: true, gamesPlayed: true },
      })
      if (player) {
        const playersAbove = await prisma.player.count({
          where: { totalScore: { gt: player.totalScore } },
        })
        currentPlayer = { rank: playersAbove + 1, ...player }
      }
    }
  } catch {
    // not authenticated — currentPlayer stays null
  }

  return Response.json({ top5, currentPlayer })
}
