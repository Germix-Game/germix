import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

const CONFIG_KEY = 'how_to_play_video_url'

export async function GET() {
  const config = await prisma.config.findUnique({ where: { key: CONFIG_KEY } })
  return Response.json({ videoUrl: config?.value ?? null })
}

export async function PUT(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const videoUrl = typeof body === 'object' && body !== null && 'videoUrl' in body
    ? String((body as Record<string, unknown>).videoUrl).trim()
    : null

  if (!videoUrl) {
    return Response.json({ error: 'videoUrl is required' }, { status: 400 })
  }

  const config = await prisma.config.upsert({
    where: { key: CONFIG_KEY },
    update: { value: videoUrl },
    create: { key: CONFIG_KEY, value: videoUrl },
  })

  return Response.json({ videoUrl: config.value })
}
