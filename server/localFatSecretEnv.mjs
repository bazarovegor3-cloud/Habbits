import { readFile } from 'node:fs/promises'

export const loadLocalFatSecretCredentials = async () => {
  const contents = await readFile(new URL('../.env.local', import.meta.url), 'utf8')
  const values = {}

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const separator = trimmed.indexOf('=')
    if (separator < 1) continue

    const key = trimmed.slice(0, separator).trim()
    const value = trimmed
      .slice(separator + 1)
      .trim()
      .replace(/^['"]|['"]$/g, '')
    values[key] = value
  }

  return {
    consumerKey: values.FATSECRET_CONSUMER_KEY,
    consumerSecret: values.FATSECRET_CONSUMER_SECRET,
    accessToken: values.FATSECRET_ACCESS_TOKEN,
    accessTokenSecret: values.FATSECRET_ACCESS_TOKEN_SECRET,
  }
}
