import type { HabbitsData } from '../src/domain/dailyRecord'

export function sanitizeHabbitsData(value: unknown): HabbitsData
export function mergeHabbitsData(
  cloudValue: unknown,
  deviceValue: unknown,
): HabbitsData
