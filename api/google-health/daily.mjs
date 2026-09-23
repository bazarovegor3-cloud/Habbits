import {
  cloudKeyFromRequest,
  fetchGoogleHealthDaily,
  sameCloudKey,
} from '../../server/googleHealth.mjs'

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'private, no-store')
  if (!sameCloudKey(cloudKeyFromRequest(request))) {
    response.status(401).json({ error: 'Неверный код облака' })
    return
  }

  const date = request.query?.date
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? '')) {
    response.status(400).json({ error: 'Некорректная дата' })
    return
  }

  try {
    response.status(200).json(await fetchGoogleHealthDaily(date))
  } catch (error) {
    response.status(500).json({
      error: error instanceof Error ? error.message : 'Google Health sync failed',
    })
  }
}
