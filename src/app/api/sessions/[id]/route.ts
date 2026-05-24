import { prisma } from '@/lib/prisma'
import { requireAuth, requireOwner } from '@/lib/auth'
import { formatSession } from '@/lib/sessions'

export async function GET(_req: Request, ctx: RouteContext<'/api/sessions/[id]'>) {
  try {
    const player = await requireAuth()
    const { id } = await ctx.params

    const session = await prisma.gameSession.findUnique({ where: { id } })
    if (!session) {
      return Response.json({ error: 'Session not found' }, { status: 404 })
    }

    requireOwner(player, session.playerId)

    const totalScores = await prisma.score.count({ where: { sessionId: id } })

    return Response.json(formatSession(session, totalScores))
  } catch (e) {
    if (e instanceof Response) return e
    throw e
  }
}
