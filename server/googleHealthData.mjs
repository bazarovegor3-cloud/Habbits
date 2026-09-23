const number = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export const parseGoogleHealthDaily = ({ date, steps, calories, sleep }) => {
  const stepPoints = Array.isArray(steps?.rollupDataPoints)
    ? steps.rollupDataPoints
    : []
  const caloriePoints = Array.isArray(calories?.rollupDataPoints)
    ? calories.rollupDataPoints
    : []
  const sleepPoints = Array.isArray(sleep?.dataPoints) ? sleep.dataPoints : []

  const sleepSessions = sleepPoints
    .map((point) => point?.sleep)
    .filter(Boolean)
  const longestSleep = sleepSessions.reduce((longest, session) => {
    const minutes = number(session?.summary?.minutesAsleep)
    return minutes > number(longest?.summary?.minutesAsleep) ? session : longest
  }, null)
  const sleepMinutes = Math.round(
    sleepSessions.reduce(
      (total, session) => total + number(session?.summary?.minutesAsleep),
      0,
    ),
  )
  const sleepPeriodMinutes = sleepSessions.reduce(
    (total, session) => total + number(session?.summary?.minutesInSleepPeriod),
    0,
  )
  const sleepEfficiency = sleepPeriodMinutes
    ? Math.min(100, Math.round((sleepMinutes / sleepPeriodMinutes) * 100))
    : 0
  const durationScore = Math.min(100, Math.round((sleepMinutes / 480) * 100))
  const sleepScore = Math.round(durationScore * 0.7 + sleepEfficiency * 0.3)

  return {
    date,
    steps: Math.round(
      stepPoints.reduce((total, point) => total + number(point?.steps?.countSum), 0),
    ),
    activeCaloriesKcal: caloriePoints.reduce(
      (total, point) => total + number(point?.activeEnergyBurned?.kcalSum),
      0,
    ),
    sleepMinutes,
    sleepScore,
    readiness: sleepScore,
    sleepStartAt: longestSleep?.interval?.startTime,
    sleepEndAt: longestSleep?.interval?.endTime,
    syncedAt: new Date().toISOString(),
  }
}
