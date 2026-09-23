import { createHash, timingSafeEqual } from 'node:crypto'
import { get, put } from '@vercel/blob'
import { mergeHabbitsData } from '../server/habbitsData.mjs'

const PATHNAME = 'habbits/data-v1.json'

const sameSecret = (provided, expected) => {
  if (!provided || !expected) return false
  const left = createHash('sha256').update(provided).digest()
  const right = createHash('sha256').update(expected).digest()
  return timingSafeEqual(left, right)
}

const readCloudData = async () => {
  const result = await get(PATHNAME, { access: 'private' })
  if (!result || result.statusCode !== 200 || !result.stream) return null

  const text = await new Response(result.stream).text()
  return JSON.parse(text)
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'private, no-store')

  const authorization = request.headers.authorization ?? ''
  const providedKey = authorization.startsWith('Bearer ')
    ? authorization.slice(7)
    : ''

  if (!sameSecret(providedKey, process.env.HABBITS_SYNC_KEY)) {
    response.status(401).json({ error: 'Неверный код облака' })
    return
  }

  try {
    if (request.method === 'GET') {
      response.status(200).json(mergeHabbitsData(await readCloudData(), null))
      return
    }

    if (request.method !== 'POST') {
      response.setHeader('Allow', 'GET, POST')
      response.status(405).json({ error: 'Method not allowed' })
      return
    }

    const body =
      typeof request.body === 'string' ? JSON.parse(request.body) : request.body
    const merged = mergeHabbitsData(await readCloudData(), body)

    await put(PATHNAME, JSON.stringify(merged), {
      access: 'private',
      allowOverwrite: true,
      cacheControlMaxAge: 60,
      contentType: 'application/json',
    })

    response.status(200).json(merged)
  } catch (error) {
    response.status(500).json({
      error: error instanceof Error ? error.message : 'Cloud sync failed',
    })
  }
}
