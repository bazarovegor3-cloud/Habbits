import {
  cloudKeyFromRequest,
  createOAuthState,
  googleHealthAuthorizationUrl,
  googleRedirectUri,
  sameCloudKey,
} from '../../server/googleHealth.mjs'

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'private, no-store')
  if (!sameCloudKey(cloudKeyFromRequest(request))) {
    response.status(401).json({ error: 'Неверный код облака' })
    return
  }

  try {
    const redirectUri = googleRedirectUri(request)
    response.status(200).json({
      url: googleHealthAuthorizationUrl({
        redirectUri,
        state: createOAuthState(),
      }),
    })
  } catch (error) {
    response.status(500).json({
      error: error instanceof Error ? error.message : 'Google Health OAuth failed',
    })
  }
}
