const isObject = (value) =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const emptyData = () => ({ schemaVersion: 1, days: {} })

export const sanitizeHabbitsData = (value) => {
  if (!isObject(value) || value.schemaVersion !== 1 || !isObject(value.days)) {
    return emptyData()
  }

  const days = Object.fromEntries(
    Object.entries(value.days)
      .filter(([date, day]) => /^\d{4}-\d{2}-\d{2}$/.test(date) && isObject(day))
      .map(([date, day]) => [date, { ...day, date }]),
  )

  return { schemaVersion: 1, days }
}

const timestamp = (day) => {
  const value = Date.parse(day?.updatedAt ?? '')
  return Number.isFinite(value) ? value : 0
}

const mergeLegacyDay = (left, right, date) => ({
  ...left,
  ...right,
  date,
  habits: { ...(left.habits ?? {}), ...(right.habits ?? {}) },
  hydration: {
    waterMl: Math.max(
      Number(left.hydration?.waterMl ?? 0),
      Number(right.hydration?.waterMl ?? 0),
    ),
  },
  stimulants: {
    caffeineMg: Math.max(
      Number(left.stimulants?.caffeineMg ?? 0),
      Number(right.stimulants?.caffeineMg ?? 0),
    ),
  },
  nutrition: right.nutrition ?? left.nutrition,
  sleep: right.sleep ?? left.sleep,
  activity: right.activity ?? left.activity,
  body: right.body ?? left.body,
  journal: right.journal ?? left.journal,
})

export const mergeHabbitsData = (cloudValue, deviceValue) => {
  const cloud = sanitizeHabbitsData(cloudValue)
  const device = sanitizeHabbitsData(deviceValue)
  const dates = new Set([...Object.keys(cloud.days), ...Object.keys(device.days)])
  const days = {}

  for (const date of dates) {
    const cloudDay = cloud.days[date]
    const deviceDay = device.days[date]

    if (!cloudDay) {
      days[date] = deviceDay
      continue
    }
    if (!deviceDay) {
      days[date] = cloudDay
      continue
    }

    const cloudTime = timestamp(cloudDay)
    const deviceTime = timestamp(deviceDay)

    if (cloudTime || deviceTime) {
      days[date] = deviceTime >= cloudTime ? deviceDay : cloudDay
    } else {
      days[date] = mergeLegacyDay(cloudDay, deviceDay, date)
    }
  }

  return { schemaVersion: 1, days }
}
