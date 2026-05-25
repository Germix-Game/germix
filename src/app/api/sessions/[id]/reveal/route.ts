import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireOwner } from '@/lib/auth'

const revealSchema = z.object({
  slotIndex: z.number().int().min(0).max(4),
})

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const player = await requireAuth()
    const { id } = await ctx.params

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return Response.json({ error: 'Request body must be valid JSON' }, { status: 400 })
    }

    const parsed = revealSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 422 })
    }

    const { slotIndex } = parsed.data

    const session = await prisma.gameSession.findUnique({ where: { id } })
    if (!session) {
      return Response.json({ error: 'Session not found' }, { status: 404 })
    }

    requireOwner(player, session.playerId)

    if (session.completed || session.abandoned) {
      return Response.json({ error: 'Session is no longer active' }, { status: 409 })
    }

    const totalScores = await prisma.score.count({ where: { sessionId: id } })
    const currentPosition = totalScores + 1

    const sessionMicrobe = await prisma.sessionMicrobe.findUnique({
      where: { sessionId_roundNumber: { sessionId: id, roundNumber: currentPosition } },
    })

    if (!sessionMicrobe) {
      return Response.json({ error: 'No active round found' }, { status: 409 })
    }

    if (sessionMicrobe.revealedSlots.includes(slotIndex)) {
      return Response.json({ error: 'Slot already revealed' }, { status: 409 })
    }

    const microbeClues = await prisma.microbeClue.findMany({
      where: { microbeId: sessionMicrobe.microbeId },
      orderBy: { sortOrder: 'asc' },
      include: { clueCard: true },
    })

    if (slotIndex >= microbeClues.length) {
      return Response.json({ error: 'Slot index out of range' }, { status: 422 })
    }

    const { clueCard } = microbeClues[slotIndex]
    const newRevealedSlots = [...sessionMicrobe.revealedSlots, slotIndex]

    await prisma.sessionMicrobe.update({
      where: { sessionId_roundNumber: { sessionId: id, roundNumber: currentPosition } },
      data: { revealedSlots: newRevealedSlots },
    })

    return Response.json({
      card: {
        category: clueCard.category,
        label: clueCard.label,
        imageUrl: clueCard.imageUrl,
      },
      session: {
        cardsOpened: newRevealedSlots.length,
        heartsLeft: session.heartsLeft,
      },
    })
  } catch (e) {
    if (e instanceof Response) return e
    throw e
  }
}
