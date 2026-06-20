import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireOwner } from '@/lib/auth'
import { getRoundClues } from '@/lib/clues'

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

    // Single round trip: the session row plus its correct-answer count, via a
    // filtered relation count, instead of two separate queries run in parallel.
    const session = await prisma.gameSession.findUnique({
      where: { id },
      include: { _count: { select: { scores: { where: { correct: true } } } } },
    })
    if (!session) {
      return Response.json({ error: 'Session not found' }, { status: 404 })
    }

    requireOwner(player, session.playerId)

    if (session.completed || session.abandoned) {
      return Response.json({ error: 'Session is no longer active' }, { status: 409 })
    }

    const currentPosition = session._count.scores + 1

    // Single round trip: sessionMicrobe plus its clue cards, joined, instead of
    // a separate microbeClue.findMany after this.
    const sessionMicrobe = await prisma.sessionMicrobe.findUnique({
      where: { sessionId_roundNumber: { sessionId: id, roundNumber: currentPosition } },
      include: {
        microbe: {
          include: { clues: { orderBy: { sortOrder: 'asc' }, include: { clueCard: true } } },
        },
      },
    })

    if (!sessionMicrobe) {
      return Response.json({ error: 'No active round found' }, { status: 409 })
    }

    if (sessionMicrobe.revealedSlots.includes(slotIndex)) {
      return Response.json({ error: 'Slot already revealed' }, { status: 409 })
    }

    const microbeClues = sessionMicrobe.microbe.clues

    if (slotIndex >= microbeClues.length) {
      return Response.json({ error: 'Slot index out of range' }, { status: 422 })
    }

    const { clueCard } = microbeClues[slotIndex]

    // Single round trip: atomic conditional append (with RETURNING) instead of
    // a separate read-then-write. The NOT (... = ANY(...)) guard makes this safe
    // against a concurrent duplicate reveal request for the same slot.
    const updated = await prisma.$queryRaw<{ revealedSlots: number[] }[]>`
      UPDATE "SessionMicrobe"
      SET "revealedSlots" = array_append("revealedSlots", ${slotIndex})
      WHERE "sessionId" = ${id} AND "roundNumber" = ${currentPosition}
        AND NOT (${slotIndex} = ANY("revealedSlots"))
      RETURNING "revealedSlots"
    `

    if (updated.length === 0) {
      return Response.json({ error: 'Slot already revealed' }, { status: 409 })
    }

    return Response.json({
      card: {
        category: clueCard.category,
        label: clueCard.label,
        imageUrl: clueCard.imageUrl,
      },
      session: {
        cardsOpened: updated[0].revealedSlots.length,
        heartsLeft: session.heartsLeft,
      },
    })
  } catch (e) {
    if (e instanceof Response) return e
    throw e
  }
}
