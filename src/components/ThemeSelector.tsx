import { useState, useEffect, useRef } from 'react'
import { Palette, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { THEMES, getStoredTheme, applyTheme, type ThemeId } from '@/lib/theme-config'
import { cn } from '@/lib/utils'

export function ThemeSelector() {
  const [isOpen, setIsOpen] = useState(false)
  const [currentTheme, setCurrentTheme] = useState<ThemeId>(getStoredTheme())
  const menuRef = useRef<HTMLDivElement>(null)

  // Apply theme on mount
  useEffect(() => {
    applyTheme(currentTheme)
  }, [])

  // Close menu when clicking outside
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const handleSelectTheme = (themeId: ThemeId, e: React.MouseEvent) => {
    e.stopPropagation()
    setCurrentTheme(themeId)
    applyTheme(themeId)
    setIsOpen(false)
  }

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsOpen(!isOpen)
  }

  // Get preview color for theme swatch
  const getPreviewColor = (colors: { background: string }) => {
    const [h, s, l] = colors.background.split(' ')
    return `hsl(${h}, ${s}, ${l})`
  }

  return (
    <div className="relative" ref={menuRef}>
      <Button
        variant="ghost"
        size="icon"
        className="rounded-lg"
        onClick={handleToggle}
        title="Change theme"
      >
        <Palette className="h-5 w-5" />
      </Button>

      {isOpen && (
        <div
          className="absolute right-0 top-12 z-[100] w-56 bg-card border rounded-lg shadow-xl p-2 animate-in fade-in-0 zoom-in-95"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="px-2 py-1.5 mb-1">
            <span className="text-sm font-medium text-foreground">Theme</span>
          </div>
          <div className="space-y-1">
            {THEMES.map((theme) => (
              <button
                key={theme.id}
                onClick={(e) => handleSelectTheme(theme.id, e)}
                onMouseDown={(e) => e.stopPropagation()}
                className={cn(
                  "w-full flex items-center gap-3 px-2 py-2 rounded-md text-sm transition-colors",
                  "hover:bg-muted/80 text-foreground",
                  currentTheme === theme.id && "bg-muted"
                )}
              >
                <div
                  className="w-5 h-5 rounded-full border border-border/50 flex-shrink-0"
                  style={{ backgroundColor: getPreviewColor(theme.colors) }}
                />
                <span className="flex-1 text-left">{theme.name}</span>
                {currentTheme === theme.id && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
