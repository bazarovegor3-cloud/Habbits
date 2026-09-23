const number = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const clamp = (value, min = 0, max = 100) =>
  Math.min(max, Math.max(min, value))

const dateKey = (value) => {
  if (!value?.year || !value?.month || !value?.day) return ''
  return [value.year, value.month, value.day]
    .map((part, index) =>
      index === 0 ? String(part) : String(part).padStart(2, '0'),
    )
    .join('-')
}

const median = (values) => {
  if (!values.length) return undefined
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2
}

const dailySeries = (payload, field, valueField) => {
  const points = Array.isArray(payload?.dataPoints) ? payload.dataPoints : []
  return points
    .map((point) => {
      const record = point?.[field]
      return { date: dateKey(record?.date), value: number(record?.[valueField]) }
    })
    .filter((record) => record.date && record.value > 0)
}

const calculateReadiness = ({
  date,
  sleepMinutes,
  hrvSeries,
  restingHeartRateSeries,
}) => {
  if (!sleepMinutes) return undefined

  const todayHrv = hrvSeries.find((record) => record.date === date)?.value
  const hrvHistory = hrvSeries
    .filter((record) => record.date < date)
    .map((record) => record.value)
  const hrvBaseline = hrvHistory.length >= 3 ? median(hrvHistory) : undefined

  const todayRestingHeartRate = restingHeartRateSeries.find(
    (record) => record.date === date,
  )?.value
  const restingHeartRateHistory = restingHeartRateSeries
    .filter((record) => record.date < date)
    .map((record) => record.value)
  const restingHeartRateBaseline = restingHeartRateHistory.length >= 3
    ? median(restingHeartRateHistory)
    : undefined

  const components = [
    { score: clamp((sleepMinutes - 180) / 3), weight: 0.4 },
  ]

  if (todayHrv && hrvBaseline) {
    components.push({
      score: clamp(75 + ((todayHrv - hrvBaseline) / hrvBaseline) * 100),
      weight: 0.35,
    })
  }

  if (todayRestingHeartRate && restingHeartRateBaseline) {
    components.push({
      score: clamp(
        75 +
          ((restingHeartRateBaseline - todayRestingHeartRate) /
            restingHeartRateBaseline) *
            300,
      ),
      weight: 0.25,
    })
  }

  if (components.length === 1) return undefined
  const weight = components.reduce(
    (total, component) => total + component.weight,
    0,
  )
  return Math.round(
    components.reduce(
      (total, component) => total + component.score * component.weight,
      0,
    ) / weight,
  )
}

export const parseGoogleHealthDaily = ({
  date,
  steps,
  calories,
  sleep,
  heartRateVariability,
  restingHeartRate,
}) => {
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
  const hrvSeries = dailySeries(
    heartRateVariability,
    'dailyHeartRateVariability',
    'averageHeartRateVariabilityMilliseconds',
  )
  const restingHeartRateSeries = dailySeries(
    restingHeartRate,
    'dailyRestingHeartRate',
    'beatsPerMinute',
  )
  const hrvMs = hrvSeries.find((record) => record.date === date)?.value
  const restingHeartRateBpm = restingHeartRateSeries.find(
    (record) => record.date === date,
  )?.value
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
    readiness: calculateReadiness({
      date,
      sleepMinutes,
      hrvSeries,
      restingHeartRateSeries,
    }),
    hrvMs,
    restingHeartRateBpm,
    sleepStartAt: longestSleep?.interval?.startTime,
    sleepEndAt: longestSleep?.interval?.endTime,
    syncedAt: new Date().toISOString(),
  }
}
