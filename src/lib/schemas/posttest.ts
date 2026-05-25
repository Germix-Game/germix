import { z } from 'zod'
import { PostTestPeriod, AnswerOption } from '@prisma/client'

export const submitPostTestSchema = z.object({
  period: z.nativeEnum(PostTestPeriod),
  answers: z.record(z.string(), z.nativeEnum(AnswerOption)),
})

export type SubmitPostTestInput = z.infer<typeof submitPostTestSchema>
