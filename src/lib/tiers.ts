export const TIERS = {
  FREE: 'free',
  PRO: 'pro',
} as const

export type Tier = (typeof TIERS)[keyof typeof TIERS]

export const FREE_ANIMAL_LIMIT = 5
