const STORAGE_KEYS = {
  token: 'todoist-api-token',
  preferences: 'todoist-review-preferences',
} as const

export interface Preferences {
  filterQuery: string
  somedayProjectId: string | null
}

const DEFAULT_PREFERENCES: Preferences = {
  filterQuery: '@next_action & (no date | overdue | today)',
  somedayProjectId: null,
}

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
