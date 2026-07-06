type ErrorDetail = {
  field: string
  message: string
  code: string
}

type ErrorOptions = {
  status: number
  code: string
  message: string
  details?: ErrorDetail[]
}

export function createErrorResponse({ status, code, message, details }: ErrorOptions): Response {
  return Response.json(
    {
      error: {
        code,
        message,
        ...(details?.length ? { details } : {}),
      },
    },
    { status },
  )
}

export function validationDetailsFromIssues(
  issues: Array<{ path: PropertyKey[]; message: string; code: string }>,
): ErrorDetail[] {
  return issues.map((issue) => ({
    field: issue.path.length ? issue.path.map((part) => String(part)).join('.') : 'body',
    message: issue.message,
    code: issue.code,
  }))
}