import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PostTestPeriod } from '@prisma/client'

function parseBangkok(str: string): Date {
  // str format: "YYYY-MM-DD HH:mm" — treated as Asia/Bangkok (UTC+7)
  return new Date(str.replace(' ', 'T') + ':00+07:00')
}

type PosttestWindow = {
  period: PostTestPeriod
  windowStart: string
  windowEnd: string
}

function resolveActiveWindow(configMap: Map<string, string>, now: Date): PosttestWindow | null {
  const candidates: { period: PostTestPeriod; startKey: string; endKey: string }[] = [
    { period: PostTestPeriod.MIDTERM, startKey: 'posttest_start_midterm', endKey: 'posttest_end_midterm' },
    { period: PostTestPeriod.FINAL,   startKey: 'posttest_start_final',   endKey: 'posttest_end_final' },
  ]

  for (const { period, startKey, endKey } of candidates) {
    const windowStart = configMap.get(startKey)
    const windowEnd   = configMap.get(endKey)
    if (!windowStart || !windowEnd) continue

    const startUTC = parseBangkok(windowStart)
    const endUTC   = parseBangkok(windowEnd)
    if (now >= startUTC && now <= endUTC) {
      return { period, windowStart, windowEnd }
    }
  }

  return null
}

export async function GET() {
  try {
    const player = await requireAuth()
    const now = new Date()

    const configs = await prisma.config.findMany()
    const configMap = new Map(configs.map(c => [c.key, c.value]))

    // ── Posttest window ─────────────────────────────────────────────────────
    const activeWindow = resolveActiveWindow(configMap, now)
    let posttestRequired = false
    let posttest: {
      period: PostTestPeriod
      windowStart: string
      windowEnd: string
      submitted: boolean
    } | null = null

    if (activeWindow) {
      const submission = await prisma.postTest.findUnique({
        where: { playerId_period: { playerId: player.id, period: activeWindow.period } },
      })
      const submitted = submission !== null
      posttestRequired = !submitted
      posttest = {
        period: activeWindow.period,
        windowStart: activeWindow.windowStart,
        windowEnd: activeWindow.windowEnd,
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
