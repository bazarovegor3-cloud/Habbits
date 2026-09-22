import {
  createDailyRecord,
  createHabbitsData,
  type DailyRecord,
  type HabbitsData,
} from '../domain/dailyRecord'

export const STORAGE_KEY = 'habbits-data-v1'
export const LEGACY_STORAGE_KEY = 'habbits-react-v2'

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const nonNegativeNumber = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0

const readHabits = (value: unknown): Record<string, boolean> => {
  if (!isObject(value)) return {}

  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, boolean] =>
      typeof entry[1] === 'boolean',
    ),
  )
}

const readDailyRecord = (date: string, value: unknown): DailyRecord => {
  const empty = createDailyRecord(date)
  if (!isObject(value)) return empty

  const hydration = isObject(value.hydration) ? value.hydration : {}
  const stimulants = isObject(value.stimulants) ? value.stimulants : {}

  return {
    ...empty,
    ...value,
    date,
    habits: readHabits(value.habits),
    hydration: {
      waterMl: nonNegativeNumber(hydration.waterMl),
    },
    stimulants: {
      caffeineMg: nonNegativeNumber(stimulants.caffeineMg),
    },
  } as DailyRecord
}

const readCurrentData = (value: unknown): HabbitsData | null => {
  if (!isObject(value) || value.schemaVersion !== 1 || !isObject(value.days)) {
    return null
  }

  return {
    schemaVersion: 1,
    days: Object.fromEntries(
      Object.entries(value.days).map(([date, day]) => [
        date,
        readDailyRecord(date, day),
      ]),
    ),
  }
}

export const migrateLegacyData = (value: unknown): HabbitsData => {
  const result = createHabbitsData()
  if (!isObject(value) || !isObject(value.days)) return result

  for (const [date, legacyDay] of Object.entries(value.days)) {
    if (!isObject(legacyDay)) continue

    result.days[date] = {
      ...createDailyRecord(date),
      habits: readHabits(legacyDay.habits),
      hydration: {
        waterMl: nonNegativeNumber(legacyDay.water),
      },
      stimulants: {
        caffeineMg: nonNegativeNumber(legacyDay.caffeine),
      },
    }
  }

  return result
}

const parseJson = (raw: string | null): unknown => {
  if (!raw) return null

  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export const loadHabbitsData = (
  storage: StorageLike = localStorage,
): HabbitsData => {
  const current = readCurrentData(parseJson(storage.getItem(STORAGE_KEY)))
  if (current) return current

  const legacy = migrateLegacyData(
    parseJson(storage.getItem(LEGACY_STORAGE_KEY)),
  )

  if (Object.keys(legacy.days).length > 0) {
    storage.setItem(STORAGE_KEY, JSON.stringify(legacy))
  }

  return legacy
}

export const saveHabbitsData = (
  data: HabbitsData,
  storage: StorageLike = localStorage,
) => {
  storage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export const clearHabbitsData = (storage: StorageLike = localStorage) => {
  storage.removeItem(STORAGE_KEY)
  storage.removeItem(LEGACY_STORAGE_KEY)
}

export const serializeBackup = (data: HabbitsData) =>
  JSON.stringify(data, null, 2)
