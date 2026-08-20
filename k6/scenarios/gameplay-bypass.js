// Load test for the core gameplay loop, running against a `next dev` server
// with DEV_AUTH_BYPASS=true (see src/lib/auth.ts). No login/signup involved,
// so it is NOT gated by the login (10/min/IP) or signup (5/min/IP) rate
// limiters in src/lib/rate-limit.ts — every request is authenticated as the
// same fixed dev player.
//
// Good for: hammering the DB/API layer (sessions, reveal, answer, cards)
// under concurrency without provisioning real accounts.
// Not good for: measuring per-account auth cost, or anything resembling
// real production load (next dev is unoptimized, single-process).
//
// Run:
//   $env:BASE_URL="http://localhost:3000"; k6 run k6/scenarios/gameplay-bypass.js
//
// Target server needs, in its .env:
//   NODE_ENV=development
//   DEV_AUTH_BYPASS=true
//
// Also requires k6/data/microbes.json — a JSON array of real Microbe ids for
// GAME_MODE. answeredMicrobeId is a foreign key to Microbe, so a made-up guess
// string crashes the answer endpoint (FK violation) instead of just being
// wrong. Generate it with:
//   node --env-file=.env scripts/fetch-microbe-ids.mjs

import http from 'k6/http'
import { check, sleep } from 'k6'
import { SharedArray } from 'k6/data'
import { Rate, Trend } from 'k6/metrics'

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'
const GAME_MODE = __ENV.GAME_MODE || 'BACTERIA'
const MAX_VUS = Number(__ENV.MAX_VUS || 100)

const microbes = new SharedArray('microbes', function () {
  return JSON.parse(open('../data/microbes.json'))
})

const gameplayErrors = new Rate('gameplay_errors')
const sessionDuration = new Trend('session_duration_ms')

const JSON_HEADERS = { headers: { 'Content-Type': 'application/json' } }

export const options = {
  scenarios: {
    bots: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: Math.round(MAX_VUS * 0.2) },
        { duration: '1m', target: MAX_VUS },
        { duration: '3m', target: MAX_VUS },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '15s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<800'],
    gameplay_errors: ['rate<0.01'],
  },
}

function thinkTime() {
  sleep(1 + Math.random() * 2)
}

export default function () {
  const start = Date.now()

  let res = http.get(`${BASE_URL}/api/leaderboard`)
  if (!check(res, { 'leaderboard 200': (r) => r.status === 200 })) gameplayErrors.add(1)
  thinkTime()

  res = http.get(`${BASE_URL}/api/game-modes`)
  if (!check(res, { 'game-modes 200': (r) => r.status === 200 })) {
    gameplayErrors.add(1)
    sleep(1)
    return
  }
  thinkTime()

  res = http.post(`${BASE_URL}/api/sessions`, JSON.stringify({ gameMode: GAME_MODE }), JSON_HEADERS)
  if (!check(res, { 'session created': (r) => r.status === 201 })) {
    gameplayErrors.add(1)
    sleep(1)
    return
  }
  const session = res.json()
  const sessionId = session.id
  let heartsLeft = session.heartsLeft
  let completed = false

  for (let round = 0; round < 5 && !completed && heartsLeft > 0; round++) {
    res = http.get(`${BASE_URL}/api/sessions/${sessionId}/cards`)
    if (!check(res, { 'cards 200': (r) => r.status === 200 })) gameplayErrors.add(1)
    thinkTime()

    const slot = Math.floor(Math.random() * 4) // 0-3; slot 4 is force-revealed already
    res = http.post(`${BASE_URL}/api/sessions/${sessionId}/reveal`, JSON.stringify({ slotIndex: slot }), JSON_HEADERS)
    if (!check(res, { 'reveal ok': (r) => r.status === 200 || r.status === 409 })) gameplayErrors.add(1)
    thinkTime()

    // Bots don't know the real answer (the API never exposes it) — a random
    // real microbe id is usually wrong (exercises heart loss) and occasionally
    // right (exercises the correct/completion path). Must be a real id:
    // answeredMicrobeId is a foreign-key column, a made-up string throws
    // instead of just losing.
    const guess = microbes[Math.floor(Math.random() * microbes.length)]
    res = http.post(
      `${BASE_URL}/api/sessions/${sessionId}/answer`,
      JSON.stringify({ answeredMicrobeId: guess }),
      JSON_HEADERS,
    )
    if (!check(res, { 'answer 200': (r) => r.status === 200 })) {
      gameplayErrors.add(1)
      break
    }
    const body = res.json()
    heartsLeft = body.session.heartsLeft
    completed = body.session.completed
    thinkTime()
  }

  sessionDuration.add(Date.now() - start)
}
