import { z } from 'zod'
import { PostTestPeriod, AnswerOption } from '@prisma/client'

export const submitPostTestSchema = z.object({
  period: z.nativeEnum(PostTestPeriod),
  answers: z.record(z.string(), z.nativeEnum(AnswerOption)),
  // Seconds spent on the test; optional so older clients still work.
  durationSeconds: z.number().int().min(0).max(86400).optional(),
})

export type SubmitPostTestInput = z.infer<typeof submitPostTestSchema>
