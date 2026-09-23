import {
  exchangeAuthorizationCode,
  googleRedirectUri,
  verifyOAuthState,
} from '../../server/googleHealth.mjs'

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'private, no-store')
  const code = request.query?.code
  const state = request.query?.state

  if (!code || !verifyOAuthState(state)) {
    response.status(400).send('Не удалось проверить ответ Google Health.')
    return
  }

  try {
    await exchangeAuthorizationCode({ code, redirectUri: googleRedirectUri(request) })
    response.redirect(302, '/?googleHealth=connected')
  } catch (error) {
    response.status(500).send(
      error instanceof Error ? error.message : 'Google Health connection failed',
    )
  }
}
