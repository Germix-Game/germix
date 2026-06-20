import { NextRequest } from 'next/server'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireOwner } from '@/lib/auth'
import { calculateRoundScore } from '@/lib/scoring'
import { TOTAL_MICROBES, TOTAL_ROUNDS, MICROBES_PER_ROUND } from '@/lib/sessions'

const answerSchema = z.object({
  answeredMicrobeId: z.string().min(1),
  // Client-tracked slot indices revealed this round. Merged with whatever the
  // /reveal endpoint already persisted, so answering never has to wait on that
  // request landing first — see the comment above the merge below.
  revealedSlotIndexes: z.array(z.number().int().min(0).max(4)).max(5).optional().default([]),
})

// Concurrent submissions for the same session (e.g. double-clicks, retried
// requests) can otherwise race past the "already answered" / heart-deduction
// checks before either write lands, letting a player bank duplicate correct
// answers or avoid losing hearts. Running the whole read-check-write sequence
// in one Serializable transaction makes Postgres abort the loser instead.
const MAX_RETRIES = 3

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

    const parsed = answerSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 422 })
    }

    const { answeredMicrobeId, revealedSlotIndexes } = parsed.data

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        return await prisma.$transaction(
          async (tx) => {
            const session = await tx.gameSession.findUnique({ where: { id } })
            if (!session) {
              throw Response.json({ error: 'Session not found' }, { status: 404 })
            }

            requireOwner(player, session.playerId)

            if (session.completed || session.abandoned) {
              throw Response.json({ error: 'Session is no longer active' }, { status: 409 })
            }

            // Position is determined by how many microbes have been correctly answered so far.
            // Wrong attempts do not advance position — the player retries the same microbe.
            const correctCount = await tx.score.count({ where: { sessionId: id, correct: true } })
            const currentPosition = correctCount + 1

            const [existingCorrect, sessionMicrobe, hadWrongAttempt] = await Promise.all([
              // Idempotency: prevent re-submitting a microbe that was already answered correctly
              tx.score.findFirst({
                where: { sessionId: id, roundNumber: currentPosition, correct: true },
              }),
              tx.sessionMicrobe.findUnique({
                where: { sessionId_roundNumber: { sessionId: id, roundNumber: currentPosition } },
                select: {
                  microbeId: true,
                  revealedSlots: true,
                  microbe: { select: { id: true, name: true, shortName: true, answerImageUrl: true } },
                },
              }),
              // Any previous wrong attempt on this question means 0 pts even if now correct
              tx.score.findFirst({
                where: { sessionId: id, roundNumber: currentPosition, correct: false },
              }),
            ])

            if (existingCorrect) {
              throw Response.json({ error: 'Answer already submitted for this round' }, { status: 409 })
            }

            if (!sessionMicrobe) {
              throw Response.json({ error: 'No active round found' }, { status: 409 })
            }

            // Merge in whatever the client has revealed locally but the /reveal
            // endpoint hasn't necessarily persisted yet — this is what lets the
            // answer button stop waiting on that request to land first. Already
            // persisted slots are kept regardless of what the client reports, so
            // a stale/empty client list can't claim fewer reveals than really happened.
            const revealedSlots = revealedSlotIndexes.length === 0
              ? sessionMicrobe.revealedSlots
              : Array.from(new Set([...sessionMicrobe.revealedSlots, ...revealedSlotIndexes])).sort((a, b) => a - b)

            if (revealedSlots.length === 0) {
              throw Response.json({ error: 'Reveal at least one card before answering' }, { status: 422 })
            }

            if (revealedSlots.length !== sessionMicrobe.revealedSlots.length) {
              await tx.sessionMicrobe.update({
                where: { sessionId_roundNumber: { sessionId: id, roundNumber: currentPosition } },
                data: { revealedSlots },
              })
            }

            const correct = answeredMicrobeId === sessionMicrobe.microbeId
            const newHeartsLeft = correct ? session.heartsLeft : session.heartsLeft - 1

            const roundScore = correct && !hadWrongAttempt
              ? calculateRoundScore(revealedSlots.length, true)
              : 0

            const newTotalScore = session.totalScore + roundScore
            const newTotalCorrect = correctCount + (correct ? 1 : 0)
            const completed = correct && newTotalCorrect >= TOTAL_MICROBES
            const abandoned = newHeartsLeft <= 0
            const newCurrentRound = completed || abandoned
              ? session.currentRound
              : Math.min(TOTAL_ROUNDS, Math.floor(newTotalCorrect / MICROBES_PER_ROUND) + 1)
            const newCurrentMicrobeInRound = (newTotalCorrect % MICROBES_PER_ROUND) + 1

            await tx.score.create({
              data: {
                sessionId: id,
                playerId: player.id,
                microbeId: sessionMicrobe.microbeId,
                answeredMicrobeId,
                roundNumber: currentPosition,
                correct,
                cardSlotsOpened: revealedSlots,
                heartsLeft: newHeartsLeft,
                roundScore,
                timeTaken: 0,
              },
            })

            await tx.gameSession.update({
              where: { id },
              data: {
                heartsLeft: newHeartsLeft,
                totalScore: newTotalScore,
                currentRound: newCurrentRound,
                completed,
                abandoned,
                ...(completed || abandoned ? { completedAt: new Date() } : {}),
              },
            })

            if (correct) {
              await tx.playerMicrobeUnlocked.upsert({
                where: {
                  playerId_microbeId: { playerId: player.id, microbeId: sessionMicrobe.microbeId },
                },
                create: {
                  playerId: player.id,
                  microbeId: sessionMicrobe.microbeId,
                  cardSlotsOpened: revealedSlots,
                },
                update: {},
              })
            }

            if (completed || abandoned) {
              await tx.player.update({
                where: { id: player.id },
                data: {
                  totalScore: { increment: newTotalScore },
                  gamesPlayed: { increment: 1 },
                },
              })
            }

            const { microbe: correctMicrobe } = sessionMicrobe

            return Response.json({
              correct,
              correctMicrobe: {
                id: correctMicrobe.id,
                name: correctMicrobe.name,
                shortName: correctMicrobe.shortName,
                imageUrl: correctMicrobe.answerImageUrl,
              },
              roundScore,
              session: {
                heartsLeft: newHeartsLeft,
                totalScore: newTotalScore,
                completed,
                currentRound: newCurrentRound,
                currentMicrobeInRound: newCurrentMicrobeInRound,
              },
            })
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        )
      } catch (e) {
        if (e instanceof Response) return e
        // Postgres aborts the losing transaction of a conflicting concurrent
        // pair with a serialization failure — retry it from scratch.
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2034') {
          continue
        }
        throw e
      }
    }

    return Response.json({ error: 'Conflict, please retry' }, { status: 409 })
  } catch (e) {
    if (e instanceof Response) return e
    throw e
  }
}
