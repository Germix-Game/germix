import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireOwner } from '@/lib/auth'
import { selectSlotClues } from '@/lib/clues'

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
          // Must match getRoundClues' ordering EXACTLY (sortOrder, then clueCardId
          // as a stable tiebreaker) so the clue this route reveals for a slot is the
          // same clue the /cards route showed the player. sortOrder is not unique,
          // so dropping the clueCardId tiebreaker lets the two queries disagree on
          // ties and reveal the wrong card.
          include: { clues: { orderBy: [{ sortOrder: 'asc' }, { clueCardId: 'asc' }], include: { clueCard: true } } },
        },
      },
    })

    if (!sessionMicrobe) {
      return Response.json({ error: 'No active round found' }, { status: 409 })
    }

    if (sessionMicrobe.revealedSlots.includes(slotIndex)) {
      return Response.json({ error: 'Slot already revealed' }, { status: 409 })
    }

    // Map the microbe's clues onto the fixed slot layout with the SAME
    // deterministic logic the /cards route uses, so the card revealed here is the
    // exact card shown to the player in that slot (not a different clue from the
    // same microbe). Indexing the raw, sortOrder-ordered list directly is what
    // previously let the card and the reveal diverge.
    const slotClues = selectSlotClues(sessionMicrobe.microbe.clues)
    const entry = slotClues[slotIndex]

    if (!entry) {
      return Response.json({ error: 'No clue for this slot' }, { status: 422 })
    }

    const { clueCard } = entry

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
      // Label omitted on purpose — the clue is shown via the card image, and
      // the API never exposes the clue text (see /cards route for the rationale).
      card: {
        category: clueCard.category,
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
