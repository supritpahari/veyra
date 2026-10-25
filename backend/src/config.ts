import 'dotenv/config'
import { z } from 'zod'

const environmentSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().url().default('mysql://root@127.0.0.1:3306/veyra'),
  AUTH_JWT_SECRET: z.string().min(32),
  GOOGLE_CLIENT_ID: z.string().default(''),
  GOOGLE_CLIENT_SECRET: z.string().default(''),
  GOOGLE_REDIRECT_URI: z
    .string()
    .url()
    .default('http://localhost:3000/api/v1/auth/google/callback'),
  AUTH_SUCCESS_REDIRECT_URL: z.string().url().default('http://localhost:5173/'),
  AUTH_COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
})

export const config = environmentSchema.parse(process.env)
export const corsOrigins = config.CORS_ORIGIN.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
