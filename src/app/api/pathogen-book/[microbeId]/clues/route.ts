import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ microbeId: string }> }
) {
  const { microbeId } = await params

  let playerId: string | null = null
  try {
    const supabase = await createSupabaseServerClient()
    const { data } = await supabase.auth.getUser()
    if (data.user) {
      const player = await prisma.player.findUnique({ where: { id: data.user.id }, select: { id: true } })
      if (player) playerId = player.id
    }
  } catch {
    // unauthenticated
  }

  if (!playerId) {
    return Response.json({ error: { code: 'unauthorized', message: 'Sign in to view details.' } }, { status: 401 })
  }

  // Verify the microbe is unlocked by this player
  const unlocked = await prisma.playerMicrobeUnlocked.findUnique({
    where: { playerId_microbeId: { playerId, microbeId } },
    select: { playerId: true },
  })

  if (!unlocked) {
    return Response.json({ error: { code: 'locked', message: 'Answer this microbe correctly to unlock its details.' } }, { status: 403 })
  }

  const clues = await prisma.microbeClue.findMany({
    where: { microbeId },
    select: {
      sortOrder: true,
      clueCard: { select: { id: true, category: true, label: true, imageUrl: true } },
    },
    orderBy: [{ sortOrder: 'asc' }],
  })

  return Response.json(clues.map(({ sortOrder, clueCard }) => ({ ...clueCard, sortOrder })))
}
