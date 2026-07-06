import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PostTestPeriod } from '@prisma/client'
import { getActivePosttestPeriod } from '@/lib/posttest'

export async function GET() {
  try {
    const player = await requireAuth()
    const now = new Date()

    const configs = await prisma.config.findMany()
    const configMap = new Map(configs.map(c => [c.key, c.value]))

    // ── Posttest window check ──────────────────────────────────────────────────
    // Date-driven (spec §10/§16): active only while today is inside an exam
    // window. If active, the player is required to submit before playing.
    const period = getActivePosttestPeriod(configMap, now)

    let posttestRequired = false
    let posttest: {
      period: PostTestPeriod
      submitted: boolean
    } | null = null

    if (period) {
      const submission = await prisma.postTest.findUnique({
        where: { playerId_period: { playerId: player.id, period } },
      })
      const submitted = submission !== null
      posttestRequired = !submitted
      posttest = {
        period,
        submitted,
      }
    }

    // ── Parasite unlock ─────────────────────────────────────────────────────
    const parasiteUnlockValue = configMap.get('parasite_unlock')
    let parasiteUnlocked = true
    let parasiteUnlocksAt: string | null = null

    if (parasiteUnlockValue) {
      const unlockDate = new Date(parasiteUnlockValue)
      parasiteUnlocked = now >= unlockDate
      parasiteUnlocksAt = unlockDate.toISOString()
    }

    return Response.json({
      posttestRequired,
      posttest,
      bacteria: { unlocked: true },
      parasite: { unlocked: parasiteUnlocked, unlocksAt: parasiteUnlocksAt },
      fungi:    { unlocked: false },
      virus:    { unlocked: false },
    })
  } catch (e) {
    if (e instanceof Response) return e
    throw e
  }
}
