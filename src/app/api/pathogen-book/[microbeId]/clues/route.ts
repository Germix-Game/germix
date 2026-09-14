import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOptionalPlayer } from '@/lib/auth'
import { getBookSlots } from '@/lib/clues'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ microbeId: string }> }
) {
  const { microbeId } = await params

  // Same auth as the game routes, so the unlock written under the (dev or real)
  // player is read back under that same id.
  let playerId: string | null = null
  try {
    const player = await getOptionalPlayer()
    if (player) playerId = player.id
  } catch {
    // unauthenticated
  }

  if (!playerId) {
    return Response.json({ error: { code: 'unauthorized', message: 'Sign in to view details.' } }, { status: 401 })
  }

  // Verify the microbe is unlocked by this player — once unlocked, the book
  // reveals all of its clue cards.
  const unlocked = await prisma.playerMicrobeUnlocked.findUnique({
    where: { playerId_microbeId: { playerId, microbeId } },
    select: { playerId: true },
  })

  if (!unlocked) {
    return Response.json({ error: { code: 'locked', message: 'Answer this microbe correctly to unlock its details.' } }, { status: 403 })
  }

  const slots = await getBookSlots(microbeId)

  return Response.json({ slots })
}
