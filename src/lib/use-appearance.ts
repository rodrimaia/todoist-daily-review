import { useEffect, useSyncExternalStore } from 'react'
import { getAppearance, setAppearance, type Appearance } from './storage'

let currentAppearance: Appearance = getAppearance()
const listeners = new Set<() => void>()

function subscribeAppearance(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot(): Appearance {
  return currentAppearance
}

export function updateAppearance(appearance: Appearance) {
  setAppearance(appearance)
  currentAppearance = appearance
  listeners.forEach((l) => l())
}

export function useAppearance(): Appearance {
  const appearance = useSyncExternalStore(subscribeAppearance, getSnapshot)

  useEffect(() => {
    if (appearance === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

      function applySystemTheme() {
        const isDark = mediaQuery.matches
        document.documentElement.classList.toggle('dark', isDark)
        document.documentElement.style.colorScheme = isDark ? 'dark' : 'light'
      }

      applySystemTheme()

      mediaQuery.addEventListener('change', applySystemTheme)
      return () => {
        mediaQuery.removeEventListener('change', applySystemTheme)
      }
    }

    const isDark = appearance === 'dark'
    document.documentElement.classList.toggle('dark', isDark)
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light'

    return () => {
      document.documentElement.classList.remove('dark')
      document.documentElement.style.colorScheme = ''
    }
  }, [appearance])

  return appearance
}
