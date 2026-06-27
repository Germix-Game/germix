import { prisma } from '@/lib/prisma'
import { requireAuth, requireOwner } from '@/lib/auth'
import { getRoundClues } from '@/lib/clues'

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const player = await requireAuth()
    const { id } = await ctx.params

    const session = await prisma.gameSession.findUnique({ where: { id } })
    if (!session) {
      return Response.json({ error: 'Session not found' }, { status: 404 })
    }

    requireOwner(player, session.playerId)

    // Round position is driven by how many microbes were answered CORRECTLY, not
    // by total attempts — a wrong answer records a Score but keeps the player on
    // the same microbe (see the answer route). Counting all scores here would push
    // /cards onto the next microbe after a wrong guess while /reveal and /answer
    // stay on the current one, so the clues shown would no longer match the answer.
    const correctCount = await prisma.score.count({ where: { sessionId: id, correct: true } })
    const currentPosition = correctCount + 1

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
