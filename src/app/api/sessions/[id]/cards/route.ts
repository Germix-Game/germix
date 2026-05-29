import { prisma } from '@/lib/prisma'
import { requireAuth, requireOwner } from '@/lib/auth'

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
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
    })

    if (!sessionMicrobe) {
      return Response.json({ error: 'No active round found' }, { status: 409 })
    }

    const microbeClues = await prisma.microbeClue.findMany({
      where: { microbeId: sessionMicrobe.microbeId },
      orderBy: { sortOrder: 'asc' },
      include: { clueCard: true },
    })

    const cards = microbeClues.map(({ clueCard }) => ({
      category: clueCard.category,
      label: clueCard.label,
      imageUrl: clueCard.imageUrl,
    }))

    return Response.json({ cards })
  } catch (e) {
    if (e instanceof Response) return e
    throw e
  }
}
