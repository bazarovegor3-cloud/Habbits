import type { HabbitsData } from '../domain/dailyRecord'

export const CLOUD_KEY_STORAGE = 'habbits-cloud-key-v1'

export const loadCloudKey = () => localStorage.getItem(CLOUD_KEY_STORAGE) ?? ''

export const saveCloudKey = (key: string) => {
  if (key) localStorage.setItem(CLOUD_KEY_STORAGE, key)
  else localStorage.removeItem(CLOUD_KEY_STORAGE)
}

export const syncCloudData = async (
  data: HabbitsData,
  key: string,
): Promise<HabbitsData> => {
  const response = await fetch('/api/sync', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
    body: JSON.stringify(data),
  })
  const payload = (await response.json()) as HabbitsData | { error?: string }

  if (!response.ok || 'error' in payload) {
    throw new Error(
      'error' in payload && payload.error
        ? payload.error
        : 'Не удалось синхронизировать данные',
    )
  }

  return payload as HabbitsData
}
