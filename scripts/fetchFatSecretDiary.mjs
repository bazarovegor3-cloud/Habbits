import { readFile } from 'node:fs/promises'
import { fetchFatSecretDailyNutrition } from '../server/fatsecretDiary.mjs'

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

const localDateKey = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

const env = await loadLocalEnv()
const consumerKey = env.FATSECRET_CONSUMER_KEY
const consumerSecret = env.FATSECRET_CONSUMER_SECRET
const accessToken = env.FATSECRET_ACCESS_TOKEN
const accessTokenSecret = env.FATSECRET_ACCESS_TOKEN_SECRET

if (!consumerKey || !consumerSecret || !accessToken || !accessTokenSecret) {
  throw new Error('FatSecret diary authorization is incomplete')
}

const dateKey = process.argv[2] || localDateKey()
const totals = await fetchFatSecretDailyNutrition({
  dateKey,
  consumerKey,
  consumerSecret,
  accessToken,
  accessTokenSecret,
})

console.log(`FatSecret diary: ${dateKey}`)
console.log(`Entries: ${totals.entries}`)
console.log(`Calories: ${totals.caloriesKcal} kcal`)
console.log(
  `Macros: P ${totals.proteinG.toFixed(1)} g · F ${totals.fatG.toFixed(1)} g · C ${totals.carbsG.toFixed(1)} g`,
)
