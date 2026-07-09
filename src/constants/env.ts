import { z } from 'zod'

const envSchema = z.object({
  BASE_URL: z.string().default('/'),
  VITE_APP_NAME: z.string().default('Haruki Vite Starter'),
})

export const env = envSchema.parse({
  BASE_URL: import.meta.env.BASE_URL,
  VITE_APP_NAME: import.meta.env.VITE_APP_NAME,
})
