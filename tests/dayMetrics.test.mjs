import assert from 'node:assert/strict'
import test from 'node:test'
import { getDayMetrics } from '../src/domain/dayMetrics.ts'

const habitIds = ['english', 'chess', 'journal', 'abstinence', 'book', 'video']

const createDay = (completedHabits, waterMl) => ({
  date: '2026-09-22',
  habits: Object.fromEntries(
    habitIds.map((id, index) => [id, index < completedHabits]),
  ),
  hydration: { waterMl },
  stimulants: { caffeineMg: 0 },
})

test('an empty day starts at zero', () => {
  const result = getDayMetrics(createDay(0, 0), habitIds, 3000)

  assert.equal(result.score, 0)
  assert.equal(result.checklistDone, 0)
  assert.equal(result.complete, false)
})

test('all habits without water are worth 84 points', () => {
  const result = getDayMetrics(createDay(6, 0), habitIds, 3000)

  assert.equal(result.score, 84)
  assert.equal(result.checklistDone, 6)
  assert.equal(result.complete, false)
})

test('six habits and the water goal complete the day at 100', () => {
  const result = getDayMetrics(createDay(6, 3000), habitIds, 3000)

  assert.equal(result.score, 100)
  assert.equal(result.checklistDone, 7)
  assert.equal(result.checklistTotal, 7)
  assert.equal(result.complete, true)
})

test('extra water cannot push the score above 100', () => {
  const result = getDayMetrics(createDay(6, 5000), habitIds, 3000)

  assert.equal(result.score, 100)
})
