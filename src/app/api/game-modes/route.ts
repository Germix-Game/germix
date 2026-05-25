import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { PostTestPeriod } from '@prisma/client'

const POSTTEST_PERIODS: Array<{
  period: PostTestPeriod
  startKey: string
  endKey: string
}> = [
  {
    period: PostTestPeriod.MIDTERM,
    startKey: 'posttest_start_midterm',
    endKey: 'posttest_end_midterm',
  },
  {
    period: PostTestPeriod.FINAL,
    startKey: 'posttest_start_final',
    endKey: 'posttest_end_final',
  },
]

function parseConfigDate(value: string | undefined): Date | null {
  if (!value) return null
  const d = new Date(value)
  return isNaN(d.getTime()) ? null : d
}

function activePeriodFromConfig(
  config: Record<string, string>,
  now: Date,
): PostTestPeriod | null {
  for (const { period, startKey, endKey } of POSTTEST_PERIODS) {
    const start = parseConfigDate(config[startKey])
    const end = parseConfigDate(config[endKey])
    if (start && end && now >= start && now <= end) return period
  }
  return null
}

type ModeStatus =
  | { unlocked: true }
  | { unlocked: false; unlocksAt?: string }

function modeStatus(unlockDate: Date | null, now: Date): ModeStatus {
  if (unlockDate && now >= unlockDate) return { unlocked: true }
  return {
    unlocked: false,
    ...(unlockDate ? { unlocksAt: unlockDate.toISOString() } : {}),
  }
}

export async function GET() {
  try {
    const player = await requireAuth()
    const now = new Date()

    const configRows = await prisma.config.findMany({
      where: {
        key: {
          in: [
            'parasite_unlock',
            'fungi_unlock',
            'virus_unlock',
            'posttest_start_midterm',
            'posttest_end_midterm',
            'posttest_start_final',
            'posttest_end_final',
          ],
        },
      },
    })
    const config = Object.fromEntries(configRows.map((r) => [r.key, r.value]))

    const activePeriod = activePeriodFromConfig(config, now)

    let posttestRequired = false
    if (activePeriod) {
      const submission = await prisma.postTest.findUnique({
        where: { playerId_period: { playerId: player.id, period: activePeriod } },
        select: { id: true },
      })
      posttestRequired = !submission
    }

    return Response.json({
      bacteria: { unlocked: true },
      parasite: modeStatus(parseConfigDate(config['parasite_unlock']), now),
      fungi: modeStatus(parseConfigDate(config['fungi_unlock']), now),
      virus: modeStatus(parseConfigDate(config['virus_unlock']), now),
      posttestRequired,
    })
  } catch (e) {
    if (e instanceof Response) return e
    throw e
  }
}
