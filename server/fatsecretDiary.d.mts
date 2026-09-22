export type FatSecretCredentials = {
  dateKey: string
  consumerKey?: string
  consumerSecret?: string
  accessToken?: string
  accessTokenSecret?: string
}

export type FatSecretDailyNutrition = {
  date: string
  entries: number
  caloriesKcal: number
  proteinG: number
  fatG: number
  carbsG: number
}

export function fetchFatSecretDailyNutrition(
  credentials: FatSecretCredentials,
): Promise<FatSecretDailyNutrition>
