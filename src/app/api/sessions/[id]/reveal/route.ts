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

    const correctCount = await prisma.score.count({ where: { sessionId: id, correct: true } })
    const currentPosition = correctCount + 1

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

    // Atomic append — guards against a lost-update race. The client fires reveal
    // requests fire-and-forget (see play page handleReveal), so flipping several
    // cards quickly sends concurrent POSTs. A read-modify-write here (read
    // revealedSlots, spread + index in JS, then update) lets each request read the
    // same stale array and overwrite the others, so fewer slots persist than were
    // opened — and the answer route then scores e.g. 2 cards (80 pts) instead of 5
    // (20 pts). `array_append` runs in a single statement that locks the row, and
    // the `NOT (... = ANY ...)` guard makes a duplicate reveal a safe no-op.
    const rows = await prisma.$queryRaw<{ revealedSlots: number[] }[]>`
      UPDATE "SessionMicrobe"
      SET "revealedSlots" = array_append("revealedSlots", ${slotIndex})
      WHERE "sessionId" = ${id}
        AND "roundNumber" = ${currentPosition}
        AND NOT (${slotIndex} = ANY("revealedSlots"))
      RETURNING "revealedSlots"
    `

    // No row updated → another concurrent request already revealed this slot.
    if (rows.length === 0) {
      return Response.json({ error: 'Slot already revealed' }, { status: 409 })
    }

    const newRevealedSlots = rows[0].revealedSlots

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
