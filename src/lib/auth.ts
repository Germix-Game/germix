import { createSupabaseServerClient } from '@/lib/supabase'
import type { Player } from '@prisma/client'
import { prisma } from '@/lib/prisma'

function unauthorized(): never {
  throw new Response(JSON.stringify({ error: { code: 'unauthorized', message: 'Unauthorized' } }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  })
}

function forbidden(): never {
  throw new Response(JSON.stringify({ error: { code: 'forbidden', message: 'Forbidden' } }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Reads the Supabase auth session, loads the matching Player from the
 * database, and returns it.
 *
 * Throws a 401 Response on missing session or unknown player.
 *
 * Route handlers should catch thrown Responses:
 *   try { const player = await requireAuth() }
 *   catch (e) { if (e instanceof Response) return e; throw e }
 */

/**
 * Resolves the current Player without throwing — returns null when there is no
 * authenticated user. Honours the dev auth bypass so that EVERY route resolves
 * the same player id: routes that write (via requireAuth) and routes that only
 * read (e.g. the Pathogen Book) must agree on who the player is, otherwise
 * data written under the dev player is invisible to a route that reads via a
 * different (or missing) Supabase identity.
 */
export async function getOptionalPlayer(): Promise<Player | null> {
  if (process.env.NODE_ENV === 'development' && process.env.DEV_AUTH_BYPASS === 'true') {
    const devId = process.env.DEV_PLAYER_ID ?? 'dev-00000000-0000-0000-0000-000000000001'
    const devUsername = `dev-${devId.slice(-8)}`
    await prisma.approvedUsername.upsert({
      where: { username: devUsername },
      update: {},
      create: { username: devUsername },
    })
    return prisma.player.upsert({
      where: { id: devId },
      update: {},
      create: { id: devId, username: devUsername },
    })
  }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return null

  return prisma.player.findUnique({ where: { id: data.user.id } })
}

export async function requireAuth(): Promise<Player> {
  const player = await getOptionalPlayer()
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
