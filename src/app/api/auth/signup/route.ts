import { NextRequest } from 'next/server'
import { createErrorResponse, validationDetailsFromIssues } from '@/lib/api-error'
import { createSupabaseServerClient, createSupabaseServiceClient, deriveAuthEmail } from '@/lib/supabase'
import { signupSchema } from '@/lib/schemas/auth'
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

  const parsed = signupSchema.safeParse(body)
  if (!parsed.success) {
    return createErrorResponse({
      status: 422,
      code: 'validation_error',
      message: 'Invalid signup payload.',
      details: validationDetailsFromIssues(parsed.error.issues),
    })
  }

  const { username, password } = parsed.data

  try {
    const approvedUsername = await prisma.approvedUsername.findUnique({
      where: { username },
      select: { username: true },
    })

    if (!approvedUsername) {
      return createErrorResponse({
        status: 403,
        code: 'username_not_whitelisted',
        message: 'Your username is not registered. Please complete the pre-test form first.',
      })
    }

    const existingPlayer = await prisma.player.findUnique({
      where: { username },
      select: { id: true },
    })

    if (existingPlayer) {
      return createErrorResponse({
        status: 409,
        code: 'account_already_exists',
        message: 'An account already exists for this username. Please log in.',
      })
    }

    const email = deriveAuthEmail(username)
    const supabase = await createSupabaseServerClient()
    const { data: createdUser, error: createUserError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
      },
    })

    if (createUserError || !createdUser.user) {
      const message = 'Unable to create account right now.'
      const lowerMessage = createUserError?.message?.toLowerCase() ?? ''
      if (lowerMessage.includes('already') || lowerMessage.includes('duplicate')) {
        return createErrorResponse({
          status: 409,
          code: 'account_already_exists',
          message: 'An account already exists for this username. Please log in.',
        })
      }

      return createErrorResponse({
        status: 500,
        code: 'signup_failed',
        message,
      })
    }

    const createdUserId = createdUser.user.id

    try {
      await prisma.$transaction([
        prisma.player.create({
          data: {
            id: createdUserId,
            username,
          },
        }),
        prisma.approvedUsername.update({
          where: { username },
          data: { registeredAt: new Date() },
        }),
      ])
    } catch (error) {
      const serviceClient = createSupabaseServiceClient()
      await serviceClient.auth.admin.deleteUser(createdUserId)
      throw error
    }

    if (!createdUser.session) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        return createErrorResponse({
          status: 500,
          code: 'signup_failed',
          message: 'Unable to create account right now.',
        })
      }
    }

    return Response.json(
      {
        id: createdUserId,
        username,
      },
      { status: 201 },
    )
  } catch {
    return createErrorResponse({
      status: 500,
      code: 'signup_failed',
      message: 'Unable to create account right now.',
    })
  }
}