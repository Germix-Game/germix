// Realistic load test: each virtual user logs in as its own real account and
// plays through the gameplay loop. Use this against staging/production (or
// `next dev` without DEV_AUTH_BYPASS) to measure real auth + gameplay cost.
//
// Requires k6/data/users.json — a JSON array of { username, password } for
// accounts that already exist. Generate it with:
//   node scripts/seed-load-test-accounts.mjs
//
// Login is rate-limited to 10 requests/min per source IP (src/lib/rate-limit.ts),
// and all VUs in a load test share one source IP. Each VU logs in exactly once
// (cached for the life of the VU), so the ramp-up stages below deliberately
// spread 100 logins over ~5 minutes to stay under that limit. Do not shorten
// the ramp without raising the login rate limit for the test target.
//
// Run:
//   $env:BASE_URL="https://staging.example.com"; k6 run k6/scenarios/gameplay-authed.js

import http from 'k6/http'
import { check, sleep } from 'k6'
import { SharedArray } from 'k6/data'
import { Rate, Trend } from 'k6/metrics'

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'
const GAME_MODE = __ENV.GAME_MODE || 'BACTERIA'

const users = new SharedArray('users', function () {
  return JSON.parse(open('../data/users.json'))
})

const loginErrors = new Rate('login_errors')
const gameplayErrors = new Rate('gameplay_errors')
const sessionDuration = new Trend('session_duration_ms')

const JSON_HEADERS = { headers: { 'Content-Type': 'application/json' } }

export const options = {
  scenarios: {
    bots: {
      executor: 'ramping-vus',
      startVUs: 0,
      // Ramp stays under the 10 logins/min/IP limit: ~50 VUs over the first
      // 5 minutes, then holds while remaining users trickle in and log in.
      stages: [
        { duration: '5m', target: Math.min(users.length, 50) },
        { duration: '5m', target: users.length },
        { duration: '5m', target: users.length },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<800'],
    login_errors: ['rate<0.01'],
    gameplay_errors: ['rate<0.01'],
  },
}

function thinkTime() {
  sleep(1 + Math.random() * 2)
}

// Per-VU state: k6 keeps top-level module state isolated per VU and alive
// across that VU's iterations, so this logs in once and reuses the session
// cookie (k6's per-VU cookie jar) for every later iteration.
let loggedIn = false

export default function () {
  const user = users[(__VU - 1) % users.length]

  if (!loggedIn) {
    const res = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify({ username: user.username, password: user.password }),
      JSON_HEADERS,
    )
    const ok = check(res, { 'login 200': (r) => r.status === 200 })
    if (!ok) {
      loginErrors.add(1)
      sleep(2)
      return
    }
    loggedIn = true
  }

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

    const slot = Math.floor(Math.random() * 4)
    res = http.post(`${BASE_URL}/api/sessions/${sessionId}/reveal`, JSON.stringify({ slotIndex: slot }), JSON_HEADERS)
    if (!check(res, { 'reveal ok': (r) => r.status === 200 || r.status === 409 })) gameplayErrors.add(1)
    thinkTime()

    res = http.post(
      `${BASE_URL}/api/sessions/${sessionId}/answer`,
      JSON.stringify({ answeredMicrobeId: `loadtest-guess-${__VU}-${__ITER}-${round}` }),
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
