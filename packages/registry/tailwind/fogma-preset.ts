import type { Config } from "tailwindcss"

export const fogmaPreset: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        "fogma-surface": "var(--fogma-surface)",
        "fogma-surface-2": "var(--fogma-surface-2)",
        "fogma-fg": "var(--fogma-fg)",
        "fogma-fg-muted": "var(--fogma-fg-muted)",
        "fogma-border": "var(--fogma-border)",
        "fogma-border-strong": "var(--fogma-border-strong)",
        "fogma-accent": "var(--fogma-accent)",
        "fogma-accent-fg": "var(--fogma-accent-fg)",
        "fogma-agent": "var(--fogma-agent)",
      },
      fontFamily: {
        "fogma-sans": ["Raveo", "Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "fogma-sm": "4px",
        "fogma-md": "6px",
        "fogma-lg": "8px",
      },
    },
  },
}

export default fogmaPreset
