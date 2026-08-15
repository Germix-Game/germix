# Load testing with k6

Two scenarios, pick based on what you're trying to learn:

| Script | Auth | Rate-limit safe? | Use for |
|---|---|---|---|
| `gameplay-bypass.js` | none (`DEV_AUTH_BYPASS`) | yes, skips login entirely | quick DB/API throughput checks against `next dev` |
| `gameplay-authed.js` | real accounts, real login | yes, ramp is paced for it | realistic load against staging/production |

Both simulate a "bot": leaderboard → game-modes → create session → (cards →
reveal → answer) × up to 5 rounds, with 1-3s think-time between calls.
Neither knows the real microbe answer (the API never exposes it), so bots
always guess wrong and the session ends after 3 hearts — that's expected,
it's still exercising the full write path (Score insert, heart deduction,
completion/abandon logic).

## 1. Install k6

```powershell
winget install k6.k6
# or: choco install k6
# or: scoop install k6
```

## 2a. Quick path — bypass mode

In the target server's `.env`, set:

```
NODE_ENV=development
DEV_AUTH_BYPASS=true
```

Restart `npm run dev`, then:

```powershell
$env:BASE_URL="http://localhost:3000"
npm run loadtest:bypass
```

Every request authenticates as the same fixed dev player (see
`getOptionalPlayer` in [src/lib/auth.ts](../src/lib/auth.ts)) — fine for
hammering the DB/API layer, not representative of real per-account cost or
of production (`next dev` is unoptimized and single-process). Set
`DEV_AUTH_BYPASS` back to `false` when you're done.

## 2b. Realistic path — real accounts against staging/production

1. Provision test accounts once (takes ~20 min for 100 users — signup is
   rate-limited to 5/min/IP by design):

   ```powershell
   $env:BASE_URL="https://your-staging-url"
   npm run loadtest:seed
   ```

   This writes credentials to `k6/data/users.json` (gitignored — it holds
   plaintext passwords for throwaway accounts).

2. Run the test. Login is rate-limited to 10/min/IP, and every VU shares one
   source IP, so the script's ramp-up is deliberately spread over ~5 minutes
   to stay under that limit — don't shorten it without raising the limit for
   your test target.

   ```powershell
   $env:BASE_URL="https://your-staging-url"
   npm run loadtest:authed
   ```

## Tuning

- `GAME_MODE` (default `BACTERIA`) — the only mode guaranteed unlocked; see
  `GameMode` in [prisma/schema.prisma](../prisma/schema.prisma).
- `MAX_VUS` (bypass script only, default `100`).
- Edit the `stages` array in each script to change ramp shape/duration.

## Running from GitHub Actions

[.github/workflows/load-test.yml](../.github/workflows/load-test.yml) runs
the realistic (`gameplay-authed.js`) path end-to-end: provisions fresh
accounts against the URL you give it, then load-tests it. It's
**`workflow_dispatch`-only** — it never runs on push/PR/schedule, since it
generates real signup/login traffic and writes real rows.

There's no separate staging deployment for this project, so `base_url` is
meant to point at `https://germix.vercel.app` itself. **Only run this while
that deployment is closed to real users** (pre-launch, or a maintenance
window) — it creates real `ApprovedUsername`/`Player`/`Score` rows and will
pollute the leaderboard once real players are active.

One-time setup on your side:

1. In GitHub, create an **environment** named `load-test` (Settings →
   Environments → New environment). This is where the DB secret lives, and
   lets you optionally require manual approval before a run starts.
2. Add an environment secret `LOADTEST_DATABASE_URL` — get it from Vercel:
   your `germix` project → Settings → Environment Variables → `DATABASE_URL`
   (reveal/copy). That's the exact connection string the live deployment
   uses; the same value should also be in Supabase → Project Settings →
   Database → Connection string (pooled/port 6543). Only `DATABASE_URL` is
   needed, not `DIRECT_URL` — the seed script just inserts rows, it doesn't
   migrate.
3. The target must be reachable from the public internet (GitHub-hosted
   runners aren't on your network/VPN) — `germix.vercel.app` already is.

To run it: Actions tab → "Load test (k6)" → Run workflow → fill in
`base_url` (typed fresh each run, not defaulted, as a safety check against
running it by muscle memory) and optionally `game_mode` / `user_count`.

Nothing needs installing for CI — the workflow installs k6 itself via
`grafana/setup-k6-action`. Note: each run provisions a new batch of
`loadtest-<run-id>-*` accounts that are never cleaned up, so the DB will
accumulate test accounts over repeated runs — plan to clean those out (and
reset the leaderboard) before real launch.

## Reading results

k6 prints a summary at the end (`http_req_duration`, `http_req_failed`,
custom `gameplay_errors`/`login_errors` rates). For live dashboards during
the run:

```powershell
k6 run --out web-dashboard=export=k6/results/report.html k6/scenarios/gameplay-bypass.js
```

Only reach for Grafana (fed by `--out influxdb=...` or `--out
experimental-prometheus-rw`) if you need to correlate these numbers against
server-side metrics (CPU, DB, Supabase) on the same timeline.
