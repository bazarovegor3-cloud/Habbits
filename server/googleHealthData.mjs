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
  return {
    date,
    steps: Math.round(
      stepPoints.reduce((total, point) => total + number(point?.steps?.countSum), 0),
    ),
    caloriesBurnedKcal: caloriePoints.reduce(
      (total, point) => total + number(point?.totalCalories?.kcalSum),
      0,
    ),
    sleepMinutes,
    sleepStartAt: longestSleep?.interval?.startTime,
    sleepEndAt: longestSleep?.interval?.endTime,
    syncedAt: new Date().toISOString(),
  }
}
