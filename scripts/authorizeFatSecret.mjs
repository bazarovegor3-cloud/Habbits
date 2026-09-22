import { createHmac, randomBytes } from 'node:crypto'
import { createServer } from 'node:http'
import { readFile, writeFile } from 'node:fs/promises'

const REQUEST_TOKEN_URL = 'https://authentication.fatsecret.com/oauth/request_token'
const AUTHORIZE_URL = 'https://authentication.fatsecret.com/oauth/authorize'
const ACCESS_TOKEN_URL = 'https://authentication.fatsecret.com/oauth/access_token'
const CALLBACK_URL = 'http://127.0.0.1:8787/callback'
const ENV_URL = new URL('../.env.local', import.meta.url)

const encode = (value) =>
  encodeURIComponent(String(value)).replace(
    /[!'()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  )

const parseEnv = (contents) => {
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

const oauthParameters = (consumerKey, extra = {}) => ({
  oauth_consumer_key: consumerKey,
  oauth_nonce: randomBytes(16).toString('hex'),
  oauth_signature_method: 'HMAC-SHA1',
  oauth_timestamp: String(Math.floor(Date.now() / 1000)),
  oauth_version: '1.0',
  ...extra,
})

const sign = ({ method, url, parameters, consumerSecret, tokenSecret = '' }) => {
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
    method.toUpperCase(),
    encode(url),
    encode(normalizedParameters),
  ].join('&')

  return createHmac(
    'sha1',
    `${encode(consumerSecret)}&${encode(tokenSecret)}`,
  )
    .update(signatureBase)
    .digest('base64')
}

const signedRequest = async ({
  method,
  url,
  parameters,
  consumerSecret,
  tokenSecret,
}) => {
  const signature = sign({
    method,
    url,
    parameters,
    consumerSecret,
    tokenSecret,
  })
  const query = Object.entries({ ...parameters, oauth_signature: signature })
    .map(([key, value]) => `${encode(key)}=${encode(value)}`)
    .join('&')

  const response = await fetch(method === 'POST' ? url : `${url}?${query}`, {
    method,
    headers:
      method === 'POST'
        ? { 'Content-Type': 'application/x-www-form-urlencoded' }
        : undefined,
    body: method === 'POST' ? query : undefined,
  })
  const body = await response.text()

  if (!response.ok) {
    const safeDetails = body.slice(0, 200).replace(/[\r\n]+/g, ' ')
    throw new Error(
      `FatSecret OAuth request failed: HTTP ${response.status}${safeDetails ? ` (${safeDetails})` : ''}`,
    )
  }

  return new URLSearchParams(body)
}

const updateEnv = (contents, entries) => {
  let result = contents.trimEnd()

  for (const [key, value] of Object.entries(entries)) {
    const replacement = `${key}=${value}`
    const pattern = new RegExp(`^${key}=.*$`, 'm')
    result = pattern.test(result)
      ? result.replace(pattern, replacement)
      : `${result}\n${replacement}`
  }

  return `${result}\n`
}

const envContents = await readFile(ENV_URL, 'utf8')
const env = parseEnv(envContents)
const consumerKey = env.FATSECRET_CONSUMER_KEY
const consumerSecret = env.FATSECRET_CONSUMER_SECRET

if (!consumerKey || !consumerSecret) {
  throw new Error('Fill FATSECRET_CONSUMER_KEY and FATSECRET_CONSUMER_SECRET in .env.local')
}

const server = createServer()
await new Promise((resolve, reject) => {
  server.once('error', reject)
  server.listen(8787, '127.0.0.1', resolve)
})

const requestTokenResponse = await signedRequest({
  method: 'POST',
  url: REQUEST_TOKEN_URL,
  parameters: oauthParameters(consumerKey, {
    oauth_callback: CALLBACK_URL,
  }),
  consumerSecret,
})

const requestToken = requestTokenResponse.get('oauth_token')
const requestTokenSecret = requestTokenResponse.get('oauth_token_secret')

if (!requestToken || !requestTokenSecret) {
  server.close()
  throw new Error('FatSecret did not return a request token')
}

console.log('\nOpen this URL in your usual browser and approve Habbits:\n')
console.log(`${AUTHORIZE_URL}?oauth_token=${encode(requestToken)}\n`)
console.log('Waiting for FatSecret authorization...')

await new Promise((resolve, reject) => {
  const timeout = setTimeout(() => {
    server.close()
    reject(new Error('Authorization timed out. Run the command again.'))
  }, 10 * 60 * 1000)

  server.on('request', async (request, response) => {
    try {
      const callback = new URL(request.url, CALLBACK_URL)
      if (callback.pathname !== '/callback') {
        response.writeHead(404).end('Not found')
        return
      }

      const returnedToken = callback.searchParams.get('oauth_token')
      const verifier = callback.searchParams.get('oauth_verifier')

      if (returnedToken !== requestToken || !verifier) {
        response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' })
        response.end('Authorization was not completed. Return to the terminal and try again.')
        return
      }

      const accessTokenResponse = await signedRequest({
        method: 'GET',
        url: ACCESS_TOKEN_URL,
        parameters: oauthParameters(consumerKey, {
          oauth_token: requestToken,
          oauth_verifier: verifier,
        }),
        consumerSecret,
        tokenSecret: requestTokenSecret,
      })

      const accessToken = accessTokenResponse.get('oauth_token')
      const accessTokenSecret = accessTokenResponse.get('oauth_token_secret')

      if (!accessToken || !accessTokenSecret) {
        throw new Error('FatSecret did not return an access token')
      }

      const updatedEnv = updateEnv(envContents, {
        FATSECRET_ACCESS_TOKEN: accessToken,
        FATSECRET_ACCESS_TOKEN_SECRET: accessTokenSecret,
      })
      await writeFile(ENV_URL, updatedEnv, { mode: 0o600 })

      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      response.end(`
        <!doctype html>
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <title>Habbits connected</title>
        <body style="font-family:system-ui;background:#070b14;color:#fff;padding:40px">
          <h1>FatSecret подключён ✓</h1>
          <p>Токены сохранены локально. Эту вкладку можно закрыть.</p>
        </body>
      `)

      console.log('\nFatSecret diary authorization: OK')
      console.log('Access tokens saved to .env.local (not printed).')
      clearTimeout(timeout)
      server.close()
      resolve()
    } catch (error) {
      response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
      response.end('Could not finish authorization. Check the terminal.')
      clearTimeout(timeout)
      server.close()
      reject(error)
    }
  })
})
