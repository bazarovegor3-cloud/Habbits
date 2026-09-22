export type DataProvider =
  | 'manual'
  | 'fatsecret'
  | 'fitbit'
  | 'apple-health'
  | 'health-connect'

export type SourceInfo = {
  provider: DataProvider
  externalId?: string
  syncedAt?: string
}

export type NutritionSummary = {
  caloriesKcal?: number
  proteinG?: number
  fatG?: number
  carbsG?: number
  source?: SourceInfo
}

export type SleepSummary = {
  durationMinutes?: number
  startAt?: string
  endAt?: string
  readiness?: number
  source?: SourceInfo
}

export type ActivitySummary = {
  steps?: number
  activeCaloriesKcal?: number
  workoutMinutes?: number
  source?: SourceInfo
}

export type BodySummary = {
  weightKg?: number
  waistCm?: number
  source?: SourceInfo
}

export type DailyRecord = {
  date: string
  habits: Record<string, boolean>
  hydration: {
    waterMl: number
  }
  stimulants: {
    caffeineMg: number
  }
  nutrition?: NutritionSummary
  sleep?: SleepSummary
  activity?: ActivitySummary
  body?: BodySummary
  journal?: {
    text: string
  }
  updatedAt?: string
}

export type HabbitsData = {
  schemaVersion: 1
  days: Record<string, DailyRecord>
}

export const createDailyRecord = (date: string): DailyRecord => ({
  date,
  habits: {},
  hydration: { waterMl: 0 },
  stimulants: { caffeineMg: 0 },
})

export const createHabbitsData = (): HabbitsData => ({
  schemaVersion: 1,
  days: {},
})
