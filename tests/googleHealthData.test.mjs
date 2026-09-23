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
