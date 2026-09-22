import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fetchFatSecretDailyNutrition } from './server/fatsecretDiary.mjs'
import { loadLocalFatSecretCredentials } from './server/localFatSecretEnv.mjs'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'fatsecret-local-api',
      configureServer(server) {
        server.middlewares.use(
          '/api/fatsecret/daily',
          async (request, response) => {
            try {
                const requestUrl = (request as unknown as { url?: string }).url
                const url = new URL(requestUrl ?? '/', 'http://localhost')
                const dateKey = url.searchParams.get('date')

                if (!dateKey) {
                  response.statusCode = 400
                  response.end(JSON.stringify({ error: 'Missing date' }))
                  return
                }

                const credentials = await loadLocalFatSecretCredentials()
                const nutrition = await fetchFatSecretDailyNutrition({
                  dateKey,
                  ...credentials,
                })

                response.statusCode = 200
                response.setHeader('Content-Type', 'application/json')
                response.setHeader('Cache-Control', 'no-store')
                response.end(JSON.stringify(nutrition))
            } catch (error) {
              response.statusCode = 500
              response.setHeader('Content-Type', 'application/json')
              response.end(
                JSON.stringify({
                  error:
                    error instanceof Error
                      ? error.message
                      : 'FatSecret sync failed',
                }),
              )
            }
          },
        )
      },
    },
  ],
})
