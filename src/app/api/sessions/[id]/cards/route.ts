import { prisma } from '@/lib/prisma'
import { requireAuth, requireOwner } from '@/lib/auth'
import { getRoundClues } from '@/lib/clues'

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const player = await requireAuth()
    const { id } = await ctx.params

    const [session, totalScores] = await Promise.all([
      prisma.gameSession.findUnique({ where: { id } }),
      prisma.score.count({ where: { sessionId: id } }),
    ])
    if (!session) {
      return Response.json({ error: 'Session not found' }, { status: 404 })
    }

    requireOwner(player, session.playerId)

    const currentPosition = totalScores + 1

    const sessionMicrobe = await prisma.sessionMicrobe.findUnique({
      where: { sessionId_roundNumber: { sessionId: id, roundNumber: currentPosition } },
    })

    if (!sessionMicrobe) {
      return Response.json({ error: 'No active round found' }, { status: 409 })
    }

    const roundClues = await getRoundClues(sessionMicrobe.microbeId)

    const cards = roundClues.map((mc) =>
      mc
        ? { category: mc.clueCard.category, 
          label: mc.clueCard.label, 
          imageUrl: mc.clueCard.imageUrl }
        : null,
    )

    return Response.json({ cards })
  } catch (e) {
    if (e instanceof Response) return e
    throw e
  }
}
