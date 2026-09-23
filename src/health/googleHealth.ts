import type { ActivitySummary, SleepSummary } from '../domain/dailyRecord'

type GoogleHealthDaily = {
  date: string
  steps: number
  caloriesBurnedKcal: number
  sleepMinutes: number
  sleepScore?: number
  readiness?: number
  hrvMs?: number
  restingHeartRateBpm?: number
  sleepStartAt?: string
  sleepEndAt?: string
  syncedAt: string
}

const request = async <T extends object>(
  path: string,
  cloudKey: string,
  init?: RequestInit,
) => {
  const response = await fetch(path, {
    ...init,
    headers: { Authorization: `Bearer ${cloudKey}`, ...init?.headers },
    cache: 'no-store',
  })
  const payload = (await response.json()) as T | { error?: string }
  if (!response.ok || 'error' in payload) {
    throw new Error(
      'error' in payload && payload.error ? payload.error : 'Ошибка Google Health',
    )
  }
  return payload as T
}

export const getGoogleHealthStatus = (cloudKey: string) =>
  request<{ connected: boolean }>('/api/google-health/status', cloudKey)

export const startGoogleHealthConnection = (cloudKey: string) =>
  request<{ url: string }>('/api/google-health/start', cloudKey)

export const getGoogleHealthDaily = async (
  date: string,
  cloudKey: string,
): Promise<{ sleep: SleepSummary; activity: ActivitySummary }> => {
  const daily = await request<GoogleHealthDaily>(
    `/api/google-health/daily?date=${encodeURIComponent(date)}`,
    cloudKey,
  )
  const source = { provider: 'fitbit' as const, syncedAt: daily.syncedAt }
  const hasSleep = daily.sleepMinutes > 0
  return {
    sleep: {
      durationMinutes: daily.sleepMinutes,
      startAt: daily.sleepStartAt,
      endAt: daily.sleepEndAt,
      score: hasSleep ? daily.sleepScore : undefined,
      readiness: hasSleep ? daily.readiness : undefined,
      hrvMs: daily.hrvMs,
      restingHeartRateBpm: daily.restingHeartRateBpm,
      source,
    },
    activity: {
      steps: daily.steps,
      caloriesBurnedKcal: daily.caloriesBurnedKcal,
      source,
    },
  }
}
