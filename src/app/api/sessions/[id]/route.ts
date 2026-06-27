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

    // Position is driven by correctly-answered microbes only — wrong attempts
    // record a Score but keep the player on the same microbe. Counting all scores
    // would load the next microbe's reveal state after a wrong guess, out of sync
    // with the /cards, /reveal and /answer routes.
    const correctCount = await prisma.score.count({ where: { sessionId: id, correct: true } })
    const currentPosition = correctCount + 1
    const sessionMicrobe = await prisma.sessionMicrobe.findUnique({
      where: { sessionId_roundNumber: { sessionId: id, roundNumber: currentPosition } },
      select: { revealedSlots: true },
    })

    return Response.json(formatSession(session, correctCount, sessionMicrobe?.revealedSlots ?? []))
  } catch (e) {
    if (e instanceof Response) return e
    throw e
  }
}
