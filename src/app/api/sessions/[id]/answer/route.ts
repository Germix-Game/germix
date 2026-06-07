import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireOwner } from '@/lib/auth'
import { calculateRoundScore } from '@/lib/scoring'
import { TOTAL_MICROBES, TOTAL_ROUNDS, MICROBES_PER_ROUND } from '@/lib/sessions'

const answerSchema = z.object({
  answeredMicrobeId: z.string().min(1),
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

    const parsed = answerSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 422 })
    }

    const { answeredMicrobeId } = parsed.data

    const session = await prisma.gameSession.findUnique({ where: { id } })
    if (!session) {
      return Response.json({ error: 'Session not found' }, { status: 404 })
    }

    requireOwner(player, session.playerId)

    if (session.completed || session.abandoned) {
      return Response.json({ error: 'Session is no longer active' }, { status: 409 })
    }

    // Position is determined by how many microbes have been correctly answered so far.
    // Wrong attempts do not advance position — the player retries the same microbe.
    const correctCount = await prisma.score.count({ where: { sessionId: id, correct: true } })
    const currentPosition = correctCount + 1

    // Idempotency: prevent re-submitting a microbe that was already answered correctly
    const existingCorrect = await prisma.score.findFirst({
      where: { sessionId: id, roundNumber: currentPosition, correct: true },
    })
    if (existingCorrect) {
      return Response.json({ error: 'Answer already submitted for this round' }, { status: 409 })
    }

    const sessionMicrobe = await prisma.sessionMicrobe.findUnique({
      where: { sessionId_roundNumber: { sessionId: id, roundNumber: currentPosition } },
      select: {
        microbeId: true,
        revealedSlots: true,
        microbe: { select: { id: true, name: true, shortName: true, answerImageUrl: true } },
      },
    })

    if (!sessionMicrobe) {
      return Response.json({ error: 'No active round found' }, { status: 409 })
    }

    if (sessionMicrobe.revealedSlots.length === 0) {
      return Response.json({ error: 'Reveal at least one card before answering' }, { status: 422 })
    }

    const correct = answeredMicrobeId === sessionMicrobe.microbeId
    const newHeartsLeft = correct ? session.heartsLeft : session.heartsLeft - 1

    // Any previous wrong attempt on this question means 0 pts even if now correct
    const hadWrongAttempt = await prisma.score.findFirst({
      where: { sessionId: id, roundNumber: currentPosition, correct: false },
    })
    const roundScore = correct && !hadWrongAttempt
      ? calculateRoundScore(sessionMicrobe.revealedSlots.length, true)
      : 0

    const newTotalScore = session.totalScore + roundScore
    const newTotalCorrect = correctCount + (correct ? 1 : 0)
    const completed = correct && newTotalCorrect >= TOTAL_MICROBES
    const abandoned = newHeartsLeft <= 0
    const newCurrentRound = completed || abandoned
      ? session.currentRound
      : Math.min(TOTAL_ROUNDS, Math.floor(newTotalCorrect / MICROBES_PER_ROUND) + 1)
    const newCurrentMicrobeInRound = (newTotalCorrect % MICROBES_PER_ROUND) + 1

    await prisma.$transaction(async (tx) => {
      await tx.score.create({
        data: {
          sessionId: id,
          playerId: player.id,
          microbeId: sessionMicrobe.microbeId,
          answeredMicrobeId,
          roundNumber: currentPosition,
          correct,
          cardSlotsOpened: sessionMicrobe.revealedSlots,
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
            cardSlotsOpened: sessionMicrobe.revealedSlots,
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
    })

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
  } catch (e) {
    if (e instanceof Response) return e
    throw e
  }
}
