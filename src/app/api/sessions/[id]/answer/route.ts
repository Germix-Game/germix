import { NextRequest } from 'next/server'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireOwner } from '@/lib/auth'
import { calculateRoundScore } from '@/lib/scoring'
import { TOTAL_MICROBES, TOTAL_ROUNDS, MICROBES_PER_ROUND } from '@/lib/sessions'

const answerSchema = z.object({
  answeredMicrobeId: z.string().min(1),
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

    const { answeredMicrobeId } = parsed.data

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

            const [existingCorrect, sessionMicrobe] = await Promise.all([
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
            ])

            if (existingCorrect) {
              throw Response.json({ error: 'Answer already submitted for this round' }, { status: 409 })
            }

            if (!sessionMicrobe) {
              throw Response.json({ error: 'No active round found' }, { status: 409 })
            }

            // Server-authoritative reveal state: the slots opened this round are
            // read straight from SessionMicrobe (persisted by /reveal), never from
            // the client payload. The UI blocks answering until /reveal has landed,
            // so the DB is the single source of truth for scoring and unlocks.
            const revealedSlots = sessionMicrobe.revealedSlots

            if (revealedSlots.length === 0) {
              throw Response.json({ error: 'Reveal at least one card before answering' }, { status: 422 })
            }

            const correct = answeredMicrobeId === sessionMicrobe.microbeId
            const newHeartsLeft = correct ? session.heartsLeft : session.heartsLeft - 1

            // A wrong attempt no longer zeroes the round: the player keeps the
            // card-count-based score whenever they eventually answer correctly.
            // Only an outright wrong answer (correct === false) scores 0.
            const roundScore = correct
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
              // The Pathogen Book shows only the cards a player has actually
              // opened for this microbe. Accumulate across replays: union the
              // slots opened this run with whatever was recorded before, so the
              // entry grows toward the full set as the player re-identifies it.
              const existingUnlock = await tx.playerMicrobeUnlocked.findUnique({
                where: {
                  playerId_microbeId: { playerId: player.id, microbeId: sessionMicrobe.microbeId },
                },
                select: { cardSlotsOpened: true },
              })
              const mergedSlots = Array.from(
                new Set([...(existingUnlock?.cardSlotsOpened ?? []), ...revealedSlots]),
              ).sort((a, b) => a - b)

              await tx.playerMicrobeUnlocked.upsert({
                where: {
                  playerId_microbeId: { playerId: player.id, microbeId: sessionMicrobe.microbeId },
                },
                create: {
                  playerId: player.id,
                  microbeId: sessionMicrobe.microbeId,
                  cardSlotsOpened: mergedSlots,
                },
                update: {
                  cardSlotsOpened: mergedSlots,
                },
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
