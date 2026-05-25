import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { createSessionSchema } from '@/lib/schemas/sessions'
import { TOTAL_MICROBES, formatSession } from '@/lib/sessions'

function shuffle<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
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
    const parsed = createSessionSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 })
    }

    const { gameMode } = parsed.data

    const microbes = await prisma.microbe.findMany({
      where: { gameMode },
      select: { id: true },
    })

    if (microbes.length < TOTAL_MICROBES) {
      return Response.json(
        { error: `Not enough microbes for ${gameMode}: need ${TOTAL_MICROBES}, have ${microbes.length}` },
        { status: 422 },
      )
    }

    const selected = shuffle(microbes).slice(0, TOTAL_MICROBES)

    const session = await prisma.gameSession.create({
      data: {
        playerId: player.id,
        gameMode,
        microbes: {
          create: selected.map((microbe, i) => ({
            roundNumber: i + 1,
            microbeId: microbe.id,
          })),
        },
      },
    })

    return Response.json(formatSession(session, 0), { status: 201 })
  } catch (e) {
    if (e instanceof Response) return e
    throw e
  }
}
