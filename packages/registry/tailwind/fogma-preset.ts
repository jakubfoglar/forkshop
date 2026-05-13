import type { Config } from "tailwindcss"

/**
 * Fogma's tailwind preset.
 *
 * This preset adds ONLY fogma-* namespaced tokens. It does not redefine
 * stock tailwind keys (spacing, radius, fontSize), so it can be safely
 * applied to any project without disturbing the host design system.
 *
 * Fogma's own UI uses stock tailwind sizes (e.g. `size-4`, `gap-2`) and
 * its fogma-* tokens where it needs special values.
 */
export const fogmaPreset: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        "fogma-canvas": "var(--fogma-canvas)",
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
      fontSize: {
        "fogma-4xs": ["0.65rem", { lineHeight: "1.3", letterSpacing: "0.02em" }],
        "fogma-3xs": ["0.72rem", { lineHeight: "1.3", letterSpacing: "0.02em" }],
        "fogma-label": ["0.75rem", { lineHeight: "1.3", letterSpacing: "0.02em" }],
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
