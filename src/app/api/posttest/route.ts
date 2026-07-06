import { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import type { AnswerOption } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { submitPostTestSchema } from '@/lib/schemas/posttest'
import { getActivePosttestPeriod } from '@/lib/posttest'

export async function GET() {
  try {
    const player = await requireAuth()

    const configs = await prisma.config.findMany()
    const configMap = new Map(configs.map(c => [c.key, c.value]))

    const period = getActivePosttestPeriod(configMap)

    if (!period) {
      return Response.json({ enabled: false, questions: [] })
    }

    const submission = await prisma.postTest.findUnique({
      where: { playerId_period: { playerId: player.id, period } },
    })
    const submitted = submission !== null

    const questions = await prisma.postTestQuestion.findMany({
      where: { period },
      orderBy: { sortOrder: 'asc' },
      include: {
        optionImages: true,
      },
    })

    return Response.json({
      enabled: true,
      period,
      submitted,
      questions: questions.map(q => {
        const optionImagesMap: Record<string, string[]> = {
          A: [], B: [], C: [], D: [], E: []
        }
        q.optionImages.forEach(img => {
          if (optionImagesMap[img.option]) {
            optionImagesMap[img.option].push(img.imageUrl)
          }
        })

        return {
          id: q.id,
          body: q.body,
          bodyImageUrl: q.bodyImageUrl,
          options: q.options,
          optionImages: optionImagesMap,
        }
      }),
    })
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
