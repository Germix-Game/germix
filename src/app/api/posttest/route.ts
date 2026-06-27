import { NextRequest } from 'next/server'
import { Prisma, PostTestPeriod } from '@prisma/client'
import type { AnswerOption } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { submitPostTestSchema } from '@/lib/schemas/posttest'

export async function GET() {
  try {
    const player = await requireAuth()

    const configs = await prisma.config.findMany()
    const configMap = new Map(configs.map(c => [c.key, c.value]))

    const posttestEnabledVal = configMap.get('posttest_enabled')
    const posttestPeriodVal = configMap.get('posttest_period')

    if (posttestEnabledVal !== 'true' || !posttestPeriodVal) {
      return Response.json({ enabled: false, questions: [] })
    }

    const period = posttestPeriodVal.toUpperCase() === 'FINAL'
      ? PostTestPeriod.FINAL
      : PostTestPeriod.MIDTERM

    const submission = await prisma.postTest.findUnique({
      where: { playerId_period: { playerId: player.id, period } },
    })
    const submitted = submission !== null

    if (submitted && submission) {
      const questions = await prisma.postTestQuestion.findMany({
        where: { period },
        orderBy: { sortOrder: 'asc' },
      })
      const questionsWithAnswers = questions.map((q, idx) => ({
        id: q.id,
        body: q.body,
        options: q.options,
        correctOption: q.correctOption,
        submittedAnswer: submission.answers[idx] || null,
      }))

      return Response.json({
        enabled: true,
        period,
        submitted: true,
        score: submission.score,
        questions: questionsWithAnswers,
      })
    } else {
      const questions = await prisma.postTestQuestion.findMany({
        where: { period },
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true,
          body: true,
          options: true,
        },
      })

      return Response.json({
        enabled: true,
        period,
        submitted: false,
        questions: questions.map(q => ({
          id: q.id,
          body: q.body,
          options: q.options,
        })),
      })
    }
  } catch (e) {
    if (e instanceof Response) return e
    throw e
  }
}


export async function POST(request: NextRequest) {
  try {
    const player = await requireAuth()

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return Response.json({ error: 'Request body must be valid JSON' }, { status: 400 })
    }

    const parsed = submitPostTestSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 })
    }

    const { period, answers } = parsed.data

    const questions = await prisma.postTestQuestion.findMany({
      where: { period },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, correctOption: true },
    })

    if (questions.length === 0) {
      return Response.json({ error: 'No questions found for this period' }, { status: 422 })
    }

    let score = 0
    const canonicalAnswers: AnswerOption[] = []

    for (const q of questions) {
      const answer = answers[q.id]
      if (!answer) {
        return Response.json(
          { error: `Missing answer for question ${q.id}` },
          { status: 400 },
        )
      }
      canonicalAnswers.push(answer)
      if (answer === q.correctOption) score++
    }

    try {
      await prisma.postTest.create({
        data: {
          playerId: player.id,
          period,
          answers: canonicalAnswers,
          score,
        },
      })
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        return Response.json(
          { error: 'Already submitted for this period' },
          { status: 409 },
        )
      }
      throw e
    }

    return Response.json({ score, total: questions.length }, { status: 201 })
  } catch (e) {
    if (e instanceof Response) return e
    throw e
  }
}
