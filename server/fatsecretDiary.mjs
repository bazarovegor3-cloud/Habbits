import { createHmac, randomBytes } from 'node:crypto'

const API_URL = 'https://platform.fatsecret.com/rest/food-entries/v2'

const encode = (value) =>
  encodeURIComponent(String(value)).replace(
    /[!'()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  )

const dateToEpochDays = (dateKey) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey)
  if (!match) throw new Error('Use date format YYYY-MM-DD')

  return Math.floor(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) /
      86_400_000,
  )
}

const sign = (parameters, consumerSecret, tokenSecret) => {
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

  return createHmac(
    'sha1',
    `${encode(consumerSecret)}&${encode(tokenSecret)}`,
  )
    .update(signatureBase)
    .digest('base64')
}

export const fetchFatSecretDailyNutrition = async ({
  dateKey,
  consumerKey,
  consumerSecret,
  accessToken,
  accessTokenSecret,
}) => {
  if (!consumerKey || !consumerSecret || !accessToken || !accessTokenSecret) {
    throw new Error('FatSecret credentials are incomplete')
  }

  const parameters = {
    date: String(dateToEpochDays(dateKey)),
    format: 'json',
    oauth_consumer_key: consumerKey,
    oauth_nonce: randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_token: accessToken,
    oauth_version: '1.0',
  }

  const signature = sign(parameters, consumerSecret, accessTokenSecret)
  const query = Object.entries({ ...parameters, oauth_signature: signature })
    .map(([key, value]) => `${encode(key)}=${encode(value)}`)
    .join('&')

  const response = await fetch(`${API_URL}?${query}`)
  const payload = await response.json()

  if (!response.ok || payload.error) {
    const message = payload.error?.message ?? `HTTP ${response.status}`
    throw new Error(`FatSecret diary request failed: ${message}`)
  }

  const entries = Array.isArray(payload.food_entries?.food_entry)
    ? payload.food_entries.food_entry
    : payload.food_entries?.food_entry
      ? [payload.food_entries.food_entry]
      : []

  const totals = entries.reduce(
    (sum, entry) => ({
      caloriesKcal: sum.caloriesKcal + Number(entry.calories || 0),
      proteinG: sum.proteinG + Number(entry.protein || 0),
      fatG: sum.fatG + Number(entry.fat || 0),
      carbsG: sum.carbsG + Number(entry.carbohydrate || 0),
    }),
    { caloriesKcal: 0, proteinG: 0, fatG: 0, carbsG: 0 },
  )

  return {
    date: dateKey,
    entries: entries.length,
    caloriesKcal: Math.round(totals.caloriesKcal),
    proteinG: Number(totals.proteinG.toFixed(1)),
    fatG: Number(totals.fatG.toFixed(1)),
    carbsG: Number(totals.carbsG.toFixed(1)),
  }
}
