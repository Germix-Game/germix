import { z } from 'zod'
import { GameMode } from '@prisma/client'

export const createSessionSchema = z.object({
  gameMode: z.nativeEnum(GameMode),
})

export type CreateSessionInput = z.infer<typeof createSessionSchema>

export interface SlotShape {
  index: number
  revealed: boolean
}

export interface SessionShape {
  id: string
  gameMode: GameMode
  heartsLeft: number
  currentRound: number
  currentMicrobeInRound: number
  slots: SlotShape[]
}
