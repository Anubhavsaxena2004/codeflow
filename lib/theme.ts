// Light and dark mode. The choice is a class on <html> ("light" or "dark"), so Tailwind's dark:
// variant and the CSS variables in globals.css follow it. Without a saved choice the system
// setting decides.

export type Theme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'codeflow-theme'

/** Runs in <head> before the first paint, so the page never flashes the other theme. */
export const themeScript = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t!=='light'&&t!=='dark')t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';var r=document.documentElement;r.classList.remove('light','dark');r.classList.add(t);r.style.colorScheme=t}catch(e){}})()`

export function currentTheme(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

export function applyTheme(theme: Theme, remember = true) {
  const root = document.documentElement
  root.classList.remove('light', 'dark')
  root.classList.add(theme)
  root.style.colorScheme = theme
  if (!remember) return
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // storage unavailable (private mode): the choice lasts for this visit
  }
}
