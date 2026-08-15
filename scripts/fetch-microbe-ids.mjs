// One-time helper for the k6 gameplay scripts: answeredMicrobeId is a real
// foreign key to Microbe (prisma/schema.prisma), so a synthetic guess string
// crashes POST /api/sessions/[id]/answer with a foreign-key violation. This
// pulls real microbe ids for a game mode so the load test can submit valid
// (if not necessarily correct) guesses instead.
//
// Usage:
//   node --env-file=.env scripts/fetch-microbe-ids.mjs
//   GAME_MODE=PARASITE node --env-file=.env scripts/fetch-microbe-ids.mjs

import { PrismaClient } from '@prisma/client'
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const GAME_MODE = process.env.GAME_MODE || 'BACTERIA'

const prisma = new PrismaClient()

async function main() {
  const microbes = await prisma.microbe.findMany({
    where: { gameMode: GAME_MODE },
    select: { id: true },
  })

  if (microbes.length === 0) {
    throw new Error(`No microbes found for gameMode ${GAME_MODE}`)
  }

  const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'k6', 'data')
  mkdirSync(outDir, { recursive: true })
  const outPath = path.join(outDir, 'microbes.json')
  writeFileSync(outPath, JSON.stringify(microbes.map((m) => m.id), null, 2))
  console.log(`Wrote ${microbes.length} ${GAME_MODE} microbe ids to ${outPath}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
