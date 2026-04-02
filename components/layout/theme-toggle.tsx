"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "./theme-provider"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const handleToggle = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      setTheme(theme === "light" ? "dark" : "light", {
        x: event.clientX,
        y: event.clientY,
      })
    },
    [setTheme, theme],
  )

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      aria-label="切换主题"
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">切换主题</span>
    </Button>
  )
}
