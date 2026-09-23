import assert from 'node:assert/strict'
import test from 'node:test'
import { parseGoogleHealthDaily } from '../server/googleHealthData.mjs'

test('maps Google Health daily totals into Habbits fields', () => {
  const result = parseGoogleHealthDaily({
    date: '2026-09-23',
    steps: { rollupDataPoints: [{ steps: { countSum: '4321' } }] },
    calories: {
      rollupDataPoints: [{ totalCalories: { kcalSum: 2321.5 } }],
    },
    sleep: {
      dataPoints: [
        {
          sleep: {
            interval: { startTime: '2026-09-22T21:00:00Z', endTime: '2026-09-23T05:00:00Z' },
            summary: { minutesAsleep: '420', minutesInSleepPeriod: '450' },
          },
        },
        { sleep: { summary: { minutesAsleep: '30', minutesInSleepPeriod: '30' } } },
      ],
    },
  })

  assert.equal(result.steps, 4321)
  assert.equal(result.caloriesBurnedKcal, 2321.5)
  assert.equal(result.sleepMinutes, 450)
  assert.equal(result.sleepScore, undefined)
  assert.equal(result.readiness, undefined)
  assert.equal(result.sleepStartAt, '2026-09-22T21:00:00Z')
  assert.equal(result.sleepEndAt, '2026-09-23T05:00:00Z')
})

test('returns zero summaries when Google Health has no data', () => {
  const result = parseGoogleHealthDaily({ date: '2026-09-23' })
  assert.equal(result.steps, 0)
  assert.equal(result.caloriesBurnedKcal, 0)
  assert.equal(result.sleepMinutes, 0)
})

test('calculates a personal readiness score from sleep, HRV, and resting heart rate', () => {
  const dailyPoint = (date, field, value) => {
    const [year, month, day] = date.split('-').map(Number)
    return { [field]: { date: { year, month, day }, ...value } }
  }
  const result = parseGoogleHealthDaily({
    date: '2026-09-23',
    sleep: {
      dataPoints: [{ sleep: { summary: { minutesAsleep: 420 } } }],
    },
    heartRateVariability: {
      dataPoints: [
        dailyPoint('2026-09-20', 'dailyHeartRateVariability', {
          averageHeartRateVariabilityMilliseconds: 45,
        }),
        dailyPoint('2026-09-21', 'dailyHeartRateVariability', {
          averageHeartRateVariabilityMilliseconds: 50,
        }),
        dailyPoint('2026-09-22', 'dailyHeartRateVariability', {
          averageHeartRateVariabilityMilliseconds: 55,
        }),
        dailyPoint('2026-09-23', 'dailyHeartRateVariability', {
          averageHeartRateVariabilityMilliseconds: 60,
        }),
      ],
    },
    restingHeartRate: {
      dataPoints: [
        dailyPoint('2026-09-20', 'dailyRestingHeartRate', { beatsPerMinute: 62 }),
        dailyPoint('2026-09-21', 'dailyRestingHeartRate', { beatsPerMinute: 60 }),
        dailyPoint('2026-09-22', 'dailyRestingHeartRate', { beatsPerMinute: 61 }),
        dailyPoint('2026-09-23', 'dailyRestingHeartRate', { beatsPerMinute: 58 }),
      ],
    },
  })

  assert.equal(result.hrvMs, 60)
  assert.equal(result.restingHeartRateBpm, 58)
  assert.equal(result.readiness, 88)
})

test('does not invent readiness before a personal baseline exists', () => {
  const result = parseGoogleHealthDaily({
    date: '2026-09-23',
    sleep: {
      dataPoints: [{ sleep: { summary: { minutesAsleep: 420 } } }],
    },
    heartRateVariability: {
      dataPoints: [
        {
          dailyHeartRateVariability: {
            date: { year: 2026, month: 9, day: 23 },
            averageHeartRateVariabilityMilliseconds: 60,
          },
        },
      ],
    },
  })

  assert.equal(result.hrvMs, 60)
  assert.equal(result.readiness, undefined)
})
