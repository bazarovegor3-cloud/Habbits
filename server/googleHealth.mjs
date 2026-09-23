import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { get, put } from '@vercel/blob'
import { parseGoogleHealthDaily } from './googleHealthData.mjs'

const TOKEN_PATH = 'habbits/google-health-tokens.json'
export const GOOGLE_HEALTH_SCOPES = [
  'https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly',
  'https://www.googleapis.com/auth/googlehealth.sleep.readonly',
]

const requiredEnv = (name) => {
  const value = process.env[name]
  if (!value) throw new Error(`Missing ${name}`)
  return value
}

export const sameCloudKey = (provided) => {
  const expected = process.env.HABBITS_SYNC_KEY
  if (!provided || !expected) return false
  const left = Buffer.from(createHmac('sha256', expected).update(provided).digest('hex'))
  const right = Buffer.from(createHmac('sha256', expected).update(expected).digest('hex'))
  return left.length === right.length && timingSafeEqual(left, right)
}

export const cloudKeyFromRequest = (request) => {
  const authorization = request.headers.authorization ?? ''
  return authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
}

export const googleRedirectUri = (request) => {
  if (process.env.GOOGLE_HEALTH_REDIRECT_URI) {
    return process.env.GOOGLE_HEALTH_REDIRECT_URI
  }
  const protocol = request.headers['x-forwarded-proto'] ?? 'https'
  return `${protocol}://${request.headers.host}/api/google-health/callback`
}

const sign = (value) =>
  createHmac('sha256', requiredEnv('HABBITS_SYNC_KEY')).update(value).digest('base64url')

export const createOAuthState = () => {
  const payload = Buffer.from(
    JSON.stringify({
      expiresAt: Date.now() + 10 * 60 * 1000,
      nonce: randomBytes(18).toString('base64url'),
    }),
  ).toString('base64url')
  return `${payload}.${sign(payload)}`
}

export const verifyOAuthState = (state) => {
  const [payload, signature] = String(state ?? '').split('.')
  if (!payload || !signature) return false
  const expected = sign(payload)
  const left = Buffer.from(signature)
  const right = Buffer.from(expected)
  if (left.length !== right.length || !timingSafeEqual(left, right)) return false
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString()).expiresAt > Date.now()
  } catch {
    return false
  }
}

const readTokens = async () => {
  const result = await get(TOKEN_PATH, { access: 'private', useCache: false })
  if (!result || result.statusCode !== 200 || !result.stream) return null
  return JSON.parse(await new Response(result.stream).text())
}

const saveTokens = async (tokens) => {
  await put(TOKEN_PATH, JSON.stringify(tokens), {
    access: 'private',
    allowOverwrite: true,
    cacheControlMaxAge: 60,
    contentType: 'application/json',
  })
}

export const hasGoogleHealthConnection = async () => Boolean(await readTokens())

export const exchangeAuthorizationCode = async ({ code, redirectUri }) => {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: requiredEnv('GOOGLE_HEALTH_CLIENT_ID'),
      client_secret: requiredEnv('GOOGLE_HEALTH_CLIENT_SECRET'),
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
  })
  const payload = await response.json()
  if (!response.ok) throw new Error(payload.error_description ?? payload.error ?? 'OAuth failed')
  await saveTokens({ ...payload, obtainedAt: Date.now() })
}

const accessToken = async () => {
  const current = await readTokens()
  if (!current?.refresh_token) throw new Error('Google Health не подключён')

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: requiredEnv('GOOGLE_HEALTH_CLIENT_ID'),
      client_secret: requiredEnv('GOOGLE_HEALTH_CLIENT_SECRET'),
      refresh_token: current.refresh_token,
      grant_type: 'refresh_token',
    }),
  })
  const payload = await response.json()
  if (!response.ok) throw new Error(payload.error_description ?? payload.error ?? 'Token refresh failed')
  await saveTokens({
    ...current,
    ...payload,
    refresh_token: payload.refresh_token ?? current.refresh_token,
    obtainedAt: Date.now(),
  })
  return payload.access_token
}

const civilDate = (date) => {
  const [year, month, day] = date.split('-').map(Number)
  return { date: { year, month, day }, time: { hours: 0, minutes: 0, seconds: 0, nanos: 0 } }
}

const nextDate = (date) => {
  const value = new Date(`${date}T12:00:00Z`)
  value.setUTCDate(value.getUTCDate() + 1)
  return value.toISOString().slice(0, 10)
}

const googleFetch = async (url, token, init) => {
  const retryableStatuses = new Set([429, 500, 502, 503, 504])

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      },
    })
    const payload = await response.json()
    if (response.ok) return payload

    if (!retryableStatuses.has(response.status) || attempt === 2) {
      throw new Error(payload?.error?.message ?? 'Google Health request failed')
    }

    await new Promise((resolve) => setTimeout(resolve, 300 * 3 ** attempt))
  }
}

export const fetchGoogleHealthDaily = async (date) => {
  const token = await accessToken()
  const endDate = nextDate(date)
  const rollupBody = JSON.stringify({
    range: { start: civilDate(date), end: civilDate(endDate) },
    windowSizeDays: 1,
    dataSourceFamily: 'users/me/dataSourceFamilies/google-wearables',
  })

  const results = await Promise.allSettled([
    googleFetch(
      'https://health.googleapis.com/v4/users/me/dataTypes/steps/dataPoints:dailyRollUp',
      token,
      { method: 'POST', body: rollupBody },
    ),
    googleFetch(
      'https://health.googleapis.com/v4/users/me/dataTypes/total-calories/dataPoints:dailyRollUp',
      token,
      { method: 'POST', body: rollupBody },
    ),
    googleFetch(
      `https://health.googleapis.com/v4/users/me/dataTypes/sleep/dataPoints:reconcile?${new URLSearchParams({
        filter: `sleep.interval.civil_end_time >= "${date}" AND sleep.interval.civil_end_time < "${endDate}"`,
        pageSize: '25',
        dataSourceFamily: 'users/me/dataSourceFamilies/google-wearables',
      })}`,
      token,
    ),
  ])

  if (results.every((result) => result.status === 'rejected')) {
    throw results[0].reason
  }

  const sourceNames = ['steps', 'total-calories', 'sleep']
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.warn(
        `Google Health ${sourceNames[index]} sync failed:`,
        result.reason instanceof Error ? result.reason.message : 'Unknown error',
      )
    }
  })

  const [steps, calories, sleep] = results.map((result) =>
    result.status === 'fulfilled' ? result.value : null,
  )
  return parseGoogleHealthDaily({ date, steps, calories, sleep })
}

export const googleHealthAuthorizationUrl = ({ redirectUri, state }) => {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.search = new URLSearchParams({
    client_id: requiredEnv('GOOGLE_HEALTH_CLIENT_ID'),
    redirect_uri: redirectUri,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    scope: GOOGLE_HEALTH_SCOPES.join(' '),
    state,
  })
  return url.toString()
}
