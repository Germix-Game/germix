// One-time provisioning for k6/scenarios/gameplay-authed.js: whitelists N
// usernames, then signs them up through the real POST /api/auth/signup route
// so accounts exist exactly like a real player's would (Supabase auth user +
// Player row). Writes the resulting { username, password } pairs to
// k6/data/users.json.
//
// Signup is rate-limited to 5 requests/min per source IP (src/lib/rate-limit.ts),
// so this deliberately paces itself in batches of 5 with a ~1min wait between
// batches. Provisioning 100 accounts takes roughly 20 minutes — run it once,
// well before the load test.
//
// Usage:
//   BASE_URL=http://localhost:3000 LOAD_TEST_USER_COUNT=100 node scripts/seed-load-test-accounts.mjs

import { PrismaClient } from '@prisma/client'
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'
import path from 'node:path'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const COUNT = Number(process.env.LOAD_TEST_USER_COUNT || 100)
const PREFIX = process.env.LOAD_TEST_USER_PREFIX || 'loadtest'
const SIGNUP_BATCH_SIZE = 5
const SIGNUP_WINDOW_MS = 61_000

const prisma = new PrismaClient()

function makeCandidates(count) {
  return Array.from({ length: count }, (_, i) => ({
    username: `${PREFIX}_${String(i + 1).padStart(4, '0')}`,
    password: randomBytes(9).toString('base64url'),
  }))
}

async function main() {
  const candidates = makeCandidates(COUNT)

  console.log(`Whitelisting ${candidates.length} usernames in ApprovedUsername...`)
  await prisma.approvedUsername.createMany({
    data: candidates.map((u) => ({ username: u.username })),
    skipDuplicates: true,
  })

  console.log(
    `Signing up ${candidates.length} accounts against ${BASE_URL} ` +
      `(rate-limited to ${SIGNUP_BATCH_SIZE}/min, ~${Math.ceil((candidates.length / SIGNUP_BATCH_SIZE) * (SIGNUP_WINDOW_MS / 60000))}min total)...`,
  )

  const created = []
  for (let i = 0; i < candidates.length; i += SIGNUP_BATCH_SIZE) {
    const batch = candidates.slice(i, i + SIGNUP_BATCH_SIZE)
    for (const u of batch) {
      const res = await fetch(`${BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u.username, password: u.password }),
      })
      if (res.status === 201) {
        created.push(u)
        console.log(`  ${u.username}: created`)
      } else if (res.status === 409) {
        // Account already exists from a previous run — we don't know its
        // real password, so it can't be reused here. Re-run with a fresh
        // LOAD_TEST_USER_PREFIX, or drop it from ApprovedUsername/Player first.
        console.warn(`  ${u.username}: already exists, skipping (unknown password)`)
      } else {
        console.error(`  ${u.username}: FAILED (${res.status}) ${await res.text()}`)
      }
    }
    const done = Math.min(i + SIGNUP_BATCH_SIZE, candidates.length)
    console.log(`  ${done}/${candidates.length} processed`)
    if (done < candidates.length) {
      console.log(`  waiting ${SIGNUP_WINDOW_MS / 1000}s for the signup rate limit to reset...`)
      await new Promise((r) => setTimeout(r, SIGNUP_WINDOW_MS))
    }
  }

  const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'k6', 'data')
  mkdirSync(outDir, { recursive: true })
  const outPath = path.join(outDir, 'users.json')
  writeFileSync(outPath, JSON.stringify(created, null, 2))
  console.log(`Wrote ${created.length}/${candidates.length} credentials to ${outPath}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
