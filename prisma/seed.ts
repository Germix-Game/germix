import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // ── Posttest windows ────────────────────────────────────────────────────────
  // Values without a timezone offset are treated as Asia/Bangkok (UTC+7)
  // by the API. Update these dates before each exam period.
  const configEntries = [
    { key: 'posttest_start_midterm', value: '2026-10-05 00:00' },
    { key: 'posttest_end_midterm',   value: '2026-10-07 23:59' },
    { key: 'posttest_start_final',   value: '2026-10-27 00:00' },
    { key: 'posttest_end_final',     value: '2026-10-29 23:59' },
  ]

  for (const entry of configEntries) {
    await prisma.config.upsert({
      where:  { key: entry.key },
      update: { value: entry.value },
      create: entry,
    })
    console.log(`config: ${entry.key} = ${entry.value}`)
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
