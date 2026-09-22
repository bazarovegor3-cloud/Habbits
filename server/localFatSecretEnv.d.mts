export type LocalFatSecretCredentials = {
  consumerKey?: string
  consumerSecret?: string
  accessToken?: string
  accessTokenSecret?: string
}

export function loadLocalFatSecretCredentials(): Promise<LocalFatSecretCredentials>
