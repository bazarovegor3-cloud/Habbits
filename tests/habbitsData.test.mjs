import assert from 'node:assert/strict'
import test from 'node:test'
import { mergeHabbitsData } from '../server/habbitsData.mjs'

const data = (days) => ({ schemaVersion: 1, days })

test('keeps days that only exist on one device', () => {
  const result = mergeHabbitsData(
    data({ '2026-09-20': { date: '2026-09-20', habits: {} } }),
    data({ '2026-09-21': { date: '2026-09-21', habits: {} } }),
  )

  assert.deepEqual(Object.keys(result.days).sort(), ['2026-09-20', '2026-09-21'])
})

test('newer daily record wins', () => {
  const result = mergeHabbitsData(
    data({
      '2026-09-23': {
        date: '2026-09-23',
        habits: { book: true },
        updatedAt: '2026-09-23T08:00:00.000Z',
      },
    }),
    data({
      '2026-09-23': {
        date: '2026-09-23',
        habits: { book: false },
        updatedAt: '2026-09-23T09:00:00.000Z',
      },
    }),
  )

  assert.equal(result.days['2026-09-23'].habits.book, false)
})

test('legacy records merge without dropping tracked values', () => {
  const result = mergeHabbitsData(
    data({
      '2026-09-23': {
        date: '2026-09-23',
        habits: { book: true },
        hydration: { waterMl: 700 },
        stimulants: { caffeineMg: 80 },
      },
    }),
    data({
      '2026-09-23': {
        date: '2026-09-23',
        habits: { chess: true },
        hydration: { waterMl: 1200 },
        stimulants: { caffeineMg: 0 },
      },
    }),
  )

  assert.deepEqual(result.days['2026-09-23'].habits, {
    book: true,
    chess: true,
  })
  assert.equal(result.days['2026-09-23'].hydration.waterMl, 1200)
  assert.equal(result.days['2026-09-23'].stimulants.caffeineMg, 80)
})
