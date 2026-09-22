import { fetchFatSecretDailyNutrition } from '../../server/fatsecretDiary.mjs'

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const dateKey = Array.isArray(request.query.date)
      ? request.query.date[0]
      : request.query.date

    if (!dateKey) {
      response.status(400).json({ error: 'Missing date' })
      return
    }

    const nutrition = await fetchFatSecretDailyNutrition({
      dateKey,
      consumerKey: process.env.FATSECRET_CONSUMER_KEY,
      consumerSecret: process.env.FATSECRET_CONSUMER_SECRET,
      accessToken: process.env.FATSECRET_ACCESS_TOKEN,
      accessTokenSecret: process.env.FATSECRET_ACCESS_TOKEN_SECRET,
    })

    response.setHeader('Cache-Control', 'no-store')
    response.status(200).json(nutrition)
  } catch (error) {
    response.status(500).json({
      error: error instanceof Error ? error.message : 'FatSecret sync failed',
    })
  }
}
