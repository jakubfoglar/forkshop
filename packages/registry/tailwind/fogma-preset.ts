/**
 * Fogma Tailwind preset.
 *
 * SPACING CONVENTION: This preset overrides Tailwind's default spacing scale
 * so that integer keys (1, 2, 3, …) map to rem values (1rem, 2rem, 3rem, …)
 * instead of the stock 0.25rem multiples. This matches the Ravineo design-system
 * convention used throughout the ported registry code. Users who apply this
 * preset are opting into this convention.
 */
import type { Config } from "tailwindcss"

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
      spacing: {
        // Sub-unit values missing from stock Tailwind
        "0.125": "0.125rem",
        "0.25": "0.25rem",
        "0.375": "0.375rem",
        "0.625": "0.625rem",
        "0.75": "0.75rem",
        "0.875": "0.875rem",
        "1.25": "1.25rem",
        "1.75": "1.75rem",
        "2.25": "2.25rem",
        "2.75": "2.75rem",
        "4.5": "4.5rem",
        "13": "13rem",
        "15": "15rem",
        "18": "18rem",
        "26": "26rem",
        "30": "30rem",
        "38": "38rem",
        // Override stock 1, 2, 3, … to be rem-based (1 = 1rem) to match
        // the ported Ravineo code's assumptions. See convention note above.
        "1": "1rem",
        "2": "2rem",
        "3": "3rem",
        "4": "4rem",
        "5": "5rem",
        "6": "6rem",
        "7": "7rem",
        "8": "8rem",
        "9": "9rem",
        "10": "10rem",
        "11": "11rem",
        "12": "12rem",
        "14": "14rem",
        "16": "16rem",
        "20": "20rem",
        "24": "24rem",
        "32": "32rem",
        "40": "40rem",
        "48": "48rem",
      },
      borderRadius: {
        xxs: "0.25rem",
        xs: "0.375rem",
        sm: "0.5rem",
        md: "0.75rem",
        lg: "1rem",
        xl: "1.25rem",
        "2xl": "2.5rem",
        "fogma-sm": "4px",
        "fogma-md": "6px",
        "fogma-lg": "8px",
      },
      fontSize: {
        "4xs": ["0.65rem", { lineHeight: "1.3", letterSpacing: "0.02em" }],
        "3xs": ["0.72rem", { lineHeight: "1.3", letterSpacing: "0.02em" }],
        "2xs": ["0.75rem", { lineHeight: "1.3", letterSpacing: "0.02em" }],
        label: ["0.75rem", { lineHeight: "1.3", letterSpacing: "0.02em" }],
        xs: ["0.8125rem", { lineHeight: "1.3", letterSpacing: "0em" }],
        sm: ["0.875rem", { lineHeight: "1.3", letterSpacing: "0em" }],
      },
      fontFamily: {
        "fogma-sans": ["Raveo", "Inter", "system-ui", "sans-serif"],
      },
    },
  },
}

export default fogmaPreset
