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

    const totalScores = await prisma.score.count({ where: { sessionId: id } })
    const currentPosition = totalScores + 1

    // Idempotency: check if this round was already answered
    const existingScore = await prisma.score.findUnique({
      where: { sessionId_roundNumber: { sessionId: id, roundNumber: currentPosition } },
    })
    if (existingScore) {
      return Response.json({ error: 'Answer already submitted for this round' }, { status: 409 })
    }

    const sessionMicrobe = await prisma.sessionMicrobe.findUnique({
      where: { sessionId_roundNumber: { sessionId: id, roundNumber: currentPosition } },
      include: {
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
    const roundScore = calculateRoundScore(sessionMicrobe.revealedSlots.length, correct)
    const newTotalScore = session.totalScore + roundScore
    const newTotalScores = totalScores + 1
    const completed = correct && newTotalScores >= TOTAL_MICROBES
    const abandoned = newHeartsLeft <= 0
    const newCurrentRound = completed || abandoned
      ? session.currentRound
      : Math.min(TOTAL_ROUNDS, Math.floor(newTotalScores / MICROBES_PER_ROUND) + 1)
    const newCurrentMicrobeInRound = (newTotalScores % MICROBES_PER_ROUND) + 1

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

      if (completed) {
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
