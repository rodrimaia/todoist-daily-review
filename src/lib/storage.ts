const STORAGE_KEYS = {
  token: 'todoist-api-token',
  preferences: 'todoist-review-preferences',
} as const

export const TODOIST_TOKEN_STORAGE_KEY = STORAGE_KEYS.token

export type Appearance = 'system' | 'light' | 'dark'

export interface Preferences {
  filterQuery: string
  somedayProjectId: string | null
  excludeProjectPrefixes: string
  appearance: Appearance
  reviewTrackingTaskId: string | null
}

const DEFAULT_PREFERENCES: Preferences = {
  filterQuery: '@next_action & (no date | overdue | today)',
  somedayProjectId: null,
  excludeProjectPrefixes: '',
  appearance: 'system',
  reviewTrackingTaskId: null,
}

function isValidAppearance(value: unknown): value is Appearance {
  return value === 'system' || value === 'light' || value === 'dark'
}

const APPEARANCE_KEYS = STORAGE_KEYS

export function getToken(): string | null {
  return localStorage.getItem(STORAGE_KEYS.token)
}

export function setToken(token: string): void {
  localStorage.setItem(STORAGE_KEYS.token, token)
}

export function clearToken(): void {
  localStorage.removeItem(STORAGE_KEYS.token)
}

export function getPreferences(): Preferences {
  const raw = localStorage.getItem(STORAGE_KEYS.preferences)
  if (!raw) return DEFAULT_PREFERENCES
  try {
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_PREFERENCES
  }
}

export function setPreferences(prefs: Partial<Preferences>): void {
  const current = getPreferences()
  localStorage.setItem(
    STORAGE_KEYS.preferences,
    JSON.stringify({ ...current, ...prefs }),
  )
}

export function getAppearance(): Appearance {
  const raw = localStorage.getItem(STORAGE_KEYS.preferences)
  if (!raw) return DEFAULT_PREFERENCES.appearance
  try {
    const parsed = JSON.parse(raw)
    if (isValidAppearance(parsed.appearance)) {
      return parsed.appearance
    }
    return DEFAULT_PREFERENCES.appearance
  } catch {
    return DEFAULT_PREFERENCES.appearance
  }
}

export function setAppearance(appearance: Appearance): void {
  setPreferences({ appearance })
}
