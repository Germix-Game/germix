import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const sessions = await prisma.gameSession.findMany({
    where: {
      playerId: 'dev-00000000-0000-0000-0000-000000000001',
      startedAt: {
        gte: new Date('2026-06-28T06:47:00.000Z'),
        lte: new Date('2026-06-28T06:50:00.000Z'),
      },
    },
    orderBy: { startedAt: 'asc' },
  })
  console.log('=== Sessions started around the same time ===')
  for (const s of sessions) {
    console.log(s)
  }

  for (const s of sessions) {
    const round1 = await prisma.sessionMicrobe.findUnique({
      where: { sessionId_roundNumber: { sessionId: s.id, roundNumber: 1 } },
      include: { microbe: { select: { name: true } } },
    })
    console.log(`session ${s.id} round1 microbe = ${round1?.microbe.name}`)
  }
}

main().finally(() => prisma.$disconnect())
