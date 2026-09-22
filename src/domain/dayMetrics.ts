import type { DailyRecord } from './dailyRecord'

const HABITS_SCORE_WEIGHT = 84
const HYDRATION_SCORE_WEIGHT = 16

export type DayMetrics = {
  completedHabits: number
  checklistDone: number
  checklistTotal: number
  checklistPercent: number
  score: number
  complete: boolean
}

export const getDayMetrics = (
  day: DailyRecord,
  habitIds: string[],
  waterGoalMl: number,
): DayMetrics => {
  const completedHabits = habitIds.filter((id) => day.habits[id]).length
  const waterComplete = day.hydration.waterMl >= waterGoalMl
  const checklistDone = completedHabits + (waterComplete ? 1 : 0)
  const checklistTotal = habitIds.length + 1

  const habitsRatio = habitIds.length
    ? completedHabits / habitIds.length
    : 0
  const waterRatio = waterGoalMl
    ? Math.min(1, day.hydration.waterMl / waterGoalMl)
    : 0

  return {
    completedHabits,
    checklistDone,
    checklistTotal,
    checklistPercent: Math.round((checklistDone / checklistTotal) * 100),
    score: Math.round(
      habitsRatio * HABITS_SCORE_WEIGHT +
        waterRatio * HYDRATION_SCORE_WEIGHT,
    ),
    complete: checklistDone === checklistTotal,
  }
}
