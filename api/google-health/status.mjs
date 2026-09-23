import {
  cloudKeyFromRequest,
  hasGoogleHealthConnection,
  sameCloudKey,
} from '../../server/googleHealth.mjs'

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'private, no-store')
  if (!sameCloudKey(cloudKeyFromRequest(request))) {
    response.status(401).json({ error: 'Неверный код облака' })
    return
  }

  try {
    response.status(200).json({ connected: await hasGoogleHealthConnection() })
  } catch (error) {
    response.status(500).json({
      error: error instanceof Error ? error.message : 'Google Health status failed',
    })
  }
}
