const STORAGE_KEYS = {
  token: 'todoist-api-token',
  preferences: 'todoist-review-preferences',
} as const

export const TODOIST_TOKEN_STORAGE_KEY = STORAGE_KEYS.token

export type TodoistTokenPersistence = 'temporary' | 'remembered'

interface StoredTodoistToken {
  token: string
  persistence: TodoistTokenPersistence
}

export type Appearance = 'system' | 'light' | 'dark'

export interface Preferences {
  filterQuery: string
  somedayProjectId: string | null
  excludeProjectPrefixes: string
  appearance: Appearance
  reviewTrackingTaskId: string | null
}

export const DEFAULT_FILTER_QUERY = '@next_action & (no date | overdue | today)'

const DEFAULT_PREFERENCES: Preferences = {
  filterQuery: DEFAULT_FILTER_QUERY,
  somedayProjectId: null,
  excludeProjectPrefixes: '',
  appearance: 'system',
  reviewTrackingTaskId: null,
}

function isValidAppearance(value: unknown): value is Appearance {
  return value === 'system' || value === 'light' || value === 'dark'
}

const APPEARANCE_KEYS = STORAGE_KEYS

function getStoredToken(): StoredTodoistToken | null {
  const rememberedToken = localStorage.getItem(STORAGE_KEYS.token)
  if (rememberedToken !== null) {
    // A remembered token is authoritative if a prior transition or another tab
    // left both scopes populated. Reading also repairs the stale temporary copy.
    sessionStorage.removeItem(STORAGE_KEYS.token)
    return { token: rememberedToken, persistence: 'remembered' }
  }

  const temporaryToken = sessionStorage.getItem(STORAGE_KEYS.token)
  if (temporaryToken !== null) {
    return { token: temporaryToken, persistence: 'temporary' }
  }

  return null
}

export function getToken(): string | null {
  return getStoredToken()?.token ?? null
}

export function getTokenPersistence(): TodoistTokenPersistence | null {
  return getStoredToken()?.persistence ?? null
}

export function setToken(
  token: string,
  persistence: TodoistTokenPersistence = 'temporary',
): void {
  if (persistence === 'remembered') {
    sessionStorage.removeItem(STORAGE_KEYS.token)
    localStorage.setItem(STORAGE_KEYS.token, token)
    return
  }

  localStorage.removeItem(STORAGE_KEYS.token)
  sessionStorage.setItem(STORAGE_KEYS.token, token)
}

export function clearToken(): void {
  sessionStorage.removeItem(STORAGE_KEYS.token)
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
