import { createHmac, randomBytes } from 'node:crypto'
import { readFile } from 'node:fs/promises'

const API_URL = 'https://platform.fatsecret.com/rest/server.api'

const encode = (value) =>
  encodeURIComponent(String(value)).replace(
    /[!'()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  )

const loadLocalEnv = async () => {
  const contents = await readFile(new URL('../.env.local', import.meta.url), 'utf8')
  const values = {}

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const separator = trimmed.indexOf('=')
    if (separator < 1) continue

    const key = trimmed.slice(0, separator).trim()
    const value = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '')
    values[key] = value
  }

  return values
}

const sign = (parameters, consumerSecret) => {
  const normalizedParameters = Object.entries(parameters)
    .map(([key, value]) => [encode(key), encode(value)])
    .sort(([leftKey, leftValue], [rightKey, rightValue]) =>
      leftKey === rightKey
        ? leftValue.localeCompare(rightValue)
        : leftKey.localeCompare(rightKey),
    )
    .map(([key, value]) => `${key}=${value}`)
    .join('&')

  const signatureBase = [
    'GET',
    encode(API_URL),
    encode(normalizedParameters),
  ].join('&')

  return createHmac('sha1', `${encode(consumerSecret)}&`)
    .update(signatureBase)
    .digest('base64')
}

const env = await loadLocalEnv()
const consumerKey = env.FATSECRET_CONSUMER_KEY
const consumerSecret = env.FATSECRET_CONSUMER_SECRET

if (!consumerKey || !consumerSecret) {
  throw new Error('Fill FATSECRET_CONSUMER_KEY and FATSECRET_CONSUMER_SECRET in .env.local')
}

const parameters = {
  method: 'foods.search',
  search_expression: 'apple',
  max_results: '1',
  format: 'json',
  oauth_consumer_key: consumerKey,
  oauth_nonce: randomBytes(16).toString('hex'),
  oauth_signature_method: 'HMAC-SHA1',
  oauth_timestamp: String(Math.floor(Date.now() / 1000)),
  oauth_version: '1.0',
}

const signature = sign(parameters, consumerSecret)
const query = Object.entries({ ...parameters, oauth_signature: signature })
  .map(([key, value]) => `${encode(key)}=${encode(value)}`)
  .join('&')

const response = await fetch(`${API_URL}?${query}`)
const payload = await response.json()

if (!response.ok || payload.error) {
  const message = payload.error?.message ?? `HTTP ${response.status}`
  throw new Error(`FatSecret rejected the request: ${message}`)
}

const firstFood = Array.isArray(payload.foods?.food)
  ? payload.foods.food[0]
  : payload.foods?.food

console.log('FatSecret connection: OK')
console.log(`Test result: ${firstFood?.food_name ?? 'response received'}`)
