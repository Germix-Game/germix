import { z } from 'zod'

const usernameSchema = z
  .string()
  .min(1, 'Username is required')
  .max(50, 'Username must be 1-50 characters')
  .regex(/^\S+$/, 'Username cannot contain whitespace')

const passwordSchema = z
  .string()
  .min(6, 'Password must be at least 6 characters')
  .max(72, 'Password must be at most 72 characters')
  .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'Password is too long')

export const signupSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
})

export const loginSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
})

export type AuthCredentials = z.infer<typeof signupSchema>