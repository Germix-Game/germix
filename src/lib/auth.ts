import { jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import type { Player } from '@prisma/client'
import { prisma } from '@/lib/prisma'

const getSecret = () =>
  new TextEncoder().encode(process.env.JWT_SECRET ?? '')

function unauthorized(): never {
  throw new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  })
}

function forbidden(): never {
  throw new Response(JSON.stringify({ error: 'Forbidden' }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Reads the `token` cookie, verifies it against JWT_SECRET, loads the
 * matching Player from the database, and returns it.
 *
 * Throws a 401 Response on missing cookie, invalid/expired JWT, or unknown player.
 *
 * Route handlers should catch thrown Responses:
 *   try { const player = await requireAuth() }
 *   catch (e) { if (e instanceof Response) return e; throw e }
 */

// bypassing authen for dev --remove this in production
export async function requireAuth(): Promise<Player> {
  if (process.env.NODE_ENV === 'development') {
    const devId = process.env.DEV_PLAYER_ID ?? 'dev-00000000-0000-0000-0000-000000000001'
    return prisma.player.upsert({
      where: { id: devId },
      update: {},
      create: { id: devId, username: `dev-${devId.slice(-8)}` },
    })
  }

  const token = (await cookies()).get('token')?.value
  if (!token) unauthorized()

  let playerId: string
  try {
    const { payload } = await jwtVerify(token, getSecret())
    if (!payload.sub) unauthorized()
    playerId = payload.sub
  } catch {
    unauthorized()
  }

  const player = await prisma.player.findUnique({ where: { id: playerId! } })
  if (!player) unauthorized()

  return player
}

/**
 * Asserts that `player` owns the resource identified by `resourcePlayerId`.
 * Throws a 403 Response if they differ.
 */
export function requireOwner(
  player: Pick<Player, 'id'>,
  resourcePlayerId: string,
): void {
  if (player.id !== resourcePlayerId) forbidden()
}

/**
 * Validates the `Authorization: Bearer <ADMIN_SECRET>` header.
 * Throws a 403 Response when the header is absent or wrong.
 *
 * Intended for use in /api/admin/* route handlers.
 */
export function requireAdmin(request: Request): void {
  const adminSecret = process.env.ADMIN_SECRET
  const authHeader = request.headers.get('Authorization')
  if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) forbidden()
}
