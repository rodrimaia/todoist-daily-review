(function () {
  try {
    var raw = localStorage.getItem('todoist-review-preferences')
    if (raw) {
      var prefs = JSON.parse(raw)
      var appearance = prefs.appearance
      if (
        appearance === 'dark' ||
        (appearance !== 'light' &&
          window.matchMedia('(prefers-color-scheme: dark)').matches)
      ) {
        document.documentElement.classList.add('dark')
        document.documentElement.style.colorScheme = 'dark'
      }
    } else if (
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    ) {
      document.documentElement.classList.add('dark')
      document.documentElement.style.colorScheme = 'dark'
    }
  } catch (_) {}
})()
