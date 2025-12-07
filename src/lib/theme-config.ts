// Termius-inspired themes
export type ThemeId =
  | 'termius-dark'
  | 'termius-black'
  | 'gruvbox-dark'
  | 'material-dark'
  | 'cobalt2'
  | 'atom-one-dark'
  | 'catppuccin-mocha'
  | 'nord'

export type Theme = {
  id: ThemeId
  name: string
  colors: {
    background: string
    foreground: string
    card: string
    cardForeground: string
    primary: string
    primaryForeground: string
    secondary: string
    secondaryForeground: string
    muted: string
    mutedForeground: string
    accent: string
    accentForeground: string
    border: string
    ring: string
  }
}

export const THEMES: Theme[] = [
  {
    id: 'termius-dark',
    name: 'Termius Dark',
    colors: {
      background: '220 20% 10%',      // #151922
      foreground: '210 20% 90%',       // #dfe3ea
      card: '220 20% 12%',             // #1a1f2b
      cardForeground: '210 20% 90%',
      primary: '210 100% 60%',         // blue accent
      primaryForeground: '0 0% 100%',
      secondary: '220 15% 18%',
      secondaryForeground: '210 20% 90%',
      muted: '220 15% 18%',
      mutedForeground: '215 15% 55%',
      accent: '210 100% 60%',
      accentForeground: '0 0% 100%',
      border: '220 15% 20%',
      ring: '210 100% 60%',
    },
  },
  {
    id: 'termius-black',
    name: 'Termius Black',
    colors: {
      background: '0 0% 0%',           // pure black
      foreground: '0 0% 95%',
      card: '0 0% 5%',
      cardForeground: '0 0% 95%',
      primary: '210 100% 55%',
      primaryForeground: '0 0% 100%',
      secondary: '0 0% 10%',
      secondaryForeground: '0 0% 95%',
      muted: '0 0% 10%',
      mutedForeground: '0 0% 55%',
      accent: '210 100% 55%',
      accentForeground: '0 0% 100%',
      border: '0 0% 15%',
      ring: '210 100% 55%',
    },
  },
  {
    id: 'gruvbox-dark',
    name: 'Gruvbox Dark',
    colors: {
      background: '0 5% 16%',          // #282828
      foreground: '40 14% 80%',        // #ebdbb2
      card: '0 5% 18%',
      cardForeground: '40 14% 80%',
      primary: '27 70% 55%',           // orange #d65d0e
      primaryForeground: '0 5% 16%',
      secondary: '0 5% 22%',
      secondaryForeground: '40 14% 80%',
      muted: '0 5% 22%',
      mutedForeground: '30 10% 50%',
      accent: '61 66% 44%',            // green #98971a
      accentForeground: '0 5% 16%',
      border: '0 5% 25%',
      ring: '27 70% 55%',
    },
  },
  {
    id: 'material-dark',
    name: 'Material Dark',
    colors: {
      background: '200 18% 13%',       // #1e272e
      foreground: '0 0% 90%',
      card: '200 18% 15%',
      cardForeground: '0 0% 90%',
      primary: '262 52% 56%',          // purple #7c4dff
      primaryForeground: '0 0% 100%',
      secondary: '200 18% 20%',
      secondaryForeground: '0 0% 90%',
      muted: '200 18% 20%',
      mutedForeground: '200 10% 55%',
      accent: '174 62% 47%',           // teal #26a69a
      accentForeground: '0 0% 100%',
      border: '200 18% 22%',
      ring: '262 52% 56%',
    },
  },
  {
    id: 'cobalt2',
    name: 'Cobalt2',
    colors: {
      background: '215 60% 12%',       // #122738
      foreground: '60 100% 95%',       // #ffc600
      card: '215 60% 14%',
      cardForeground: '60 100% 95%',
      primary: '45 100% 50%',          // yellow #ffc600
      primaryForeground: '215 60% 12%',
      secondary: '215 50% 20%',
      secondaryForeground: '60 100% 95%',
      muted: '215 50% 20%',
      mutedForeground: '200 30% 55%',
      accent: '180 70% 50%',           // cyan
      accentForeground: '215 60% 12%',
      border: '215 50% 22%',
      ring: '45 100% 50%',
    },
  },
  {
    id: 'atom-one-dark',
    name: 'Atom One Dark',
    colors: {
      background: '220 13% 18%',       // #282c34
      foreground: '220 14% 71%',       // #abb2bf
      card: '220 13% 20%',
      cardForeground: '220 14% 71%',
      primary: '207 82% 66%',          // blue #61afef
      primaryForeground: '220 13% 18%',
      secondary: '220 13% 24%',
      secondaryForeground: '220 14% 71%',
      muted: '220 13% 24%',
      mutedForeground: '220 10% 50%',
      accent: '95 38% 62%',            // green #98c379
      accentForeground: '220 13% 18%',
      border: '220 13% 26%',
      ring: '207 82% 66%',
    },
  },
  {
    id: 'catppuccin-mocha',
    name: 'Catppuccin Mocha',
    colors: {
      background: '240 21% 15%',       // #1e1e2e
      foreground: '226 64% 88%',       // #cdd6f4
      card: '240 21% 17%',
      cardForeground: '226 64% 88%',
      primary: '267 84% 81%',          // mauve #cba6f7
      primaryForeground: '240 21% 15%',
      secondary: '240 21% 20%',
      secondaryForeground: '226 64% 88%',
      muted: '240 21% 20%',
      mutedForeground: '228 24% 55%',
      accent: '183 74% 68%',           // teal #94e2d5
      accentForeground: '240 21% 15%',
      border: '240 21% 22%',
      ring: '267 84% 81%',
    },
  },
  {
    id: 'nord',
    name: 'Nord',
    colors: {
      background: '220 16% 22%',       // #2e3440
      foreground: '219 28% 88%',       // #eceff4
      card: '220 16% 24%',
      cardForeground: '219 28% 88%',
      primary: '213 32% 52%',          // frost blue #5e81ac
      primaryForeground: '219 28% 88%',
      secondary: '220 16% 28%',
      secondaryForeground: '219 28% 88%',
      muted: '220 16% 28%',
      mutedForeground: '220 16% 55%',
      accent: '179 25% 65%',           // frost cyan #8fbcbb
      accentForeground: '220 16% 22%',
      border: '220 16% 30%',
      ring: '213 32% 52%',
    },
  },
]

const THEME_STORAGE_KEY = 'lecture-translator-theme'

export function getStoredTheme(): ThemeId {
  if (typeof window === 'undefined') return 'termius-dark'
  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  if (stored && THEMES.some(t => t.id === stored)) {
    return stored as ThemeId
  }
  return 'termius-dark'
}

export function saveTheme(themeId: ThemeId): void {
  localStorage.setItem(THEME_STORAGE_KEY, themeId)
}

export function getThemeById(id: ThemeId): Theme {
  return THEMES.find(t => t.id === id) || THEMES[0]
}

export function applyTheme(themeId: ThemeId): void {
  const theme = getThemeById(themeId)
  const root = document.documentElement

  Object.entries(theme.colors).forEach(([key, value]) => {
    // Convert camelCase to kebab-case for CSS variables
    const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase()
    root.style.setProperty(`--${cssKey}`, value)
  })

  saveTheme(themeId)
}
