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

    const currentPosition = totalScores + 1
    const sessionMicrobe = await prisma.sessionMicrobe.findUnique({
      where: { sessionId_roundNumber: { sessionId: id, roundNumber: currentPosition } },
      select: { revealedSlots: true },
    })

    return Response.json(formatSession(session, totalScores, sessionMicrobe?.revealedSlots ?? []))
  } catch (e) {
    if (e instanceof Response) return e
    throw e
  }
}
