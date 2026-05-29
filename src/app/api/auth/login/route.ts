import { NextRequest } from 'next/server'
import { createErrorResponse, validationDetailsFromIssues } from '@/lib/api-error'
import { createSupabaseServerClient, deriveAuthEmail } from '@/lib/supabase'
import { loginSchema } from '@/lib/schemas/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return createErrorResponse({
      status: 400,
      code: 'invalid_json',
      message: 'Request body must be valid JSON.',
    })
  }

  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    return createErrorResponse({
      status: 422,
      code: 'validation_error',
      message: 'Invalid login payload.',
      details: validationDetailsFromIssues(parsed.error.issues),
    })
  }

  const { username, password } = parsed.data

  try {
    const player = await prisma.player.findUnique({
      where: { username },
      select: { id: true, username: true },
    })

    if (!player) {
      return createErrorResponse({
        status: 401,
        code: 'invalid_credentials',
        message: 'Invalid username or password.',
      })
    }

    const supabase = await createSupabaseServerClient()
    const email = deriveAuthEmail(username)
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return createErrorResponse({
        status: 401,
        code: 'invalid_credentials',
        message: 'Invalid username or password.',
      })
    }

    return Response.json(
      {
        id: player.id,
        username: player.username,
      },
      { status: 200 },
    )
  } catch {
    return createErrorResponse({
      status: 500,
      code: 'login_failed',
      message: 'Unable to sign in right now.',
    })
  }
}