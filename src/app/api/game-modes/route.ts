import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { PostTestPeriod } from '@prisma/client'

export async function GET() {
  try {
    const player = await requireAuth()

    // ── Posttest gate ───────────────────────────────────────────────────────
    const activePeriodConfig = await prisma.config.findUnique({
      where: { key: 'posttest.activePeriod' },
    })
    let posttestRequired = false
    if (activePeriodConfig?.value) {
      const period = activePeriodConfig.value as PostTestPeriod
      const submitted = await prisma.postTest.findUnique({
        where: { playerId_period: { playerId: player.id, period } },
      })
      posttestRequired = !submitted
    }

    // ── Parasite unlock ─────────────────────────────────────────────────────
    const parasiteConfig = await prisma.config.findUnique({
      where: { key: 'parasite.unlocksAt' },
    })
    let parasiteLocked = true
    let parasiteUnlocksAt: string | null = null
    if (parasiteConfig?.value) {
      parasiteUnlocksAt = parasiteConfig.value
      parasiteLocked = new Date(parasiteConfig.value) > new Date()
    }

    return Response.json({
      posttestRequired,
      modes: [
        { mode: 'BACTERIA', locked: false },
        { mode: 'PARASITE', locked: parasiteLocked, unlocksAt: parasiteUnlocksAt },
        { mode: 'FUNGI', locked: true },
        { mode: 'VIRUS', locked: true },
      ],
    })
  } catch (e) {
    if (e instanceof Response) return e
    throw e
  }
}
