import type { Config } from "tailwindcss"

/**
 * Fogma's tailwind preset.
 *
 * Convention: every token added here MUST be namespaced with the `fogma-`
 * prefix so Fogma's chrome utilities never collide with host project values.
 *
 * This preset adds ONLY fogma-* namespaced tokens. It does not redefine
 * stock tailwind keys (spacing, radius, fontSize), so it can be safely
 * applied to any project without disturbing the host design system.
 *
 * Usage in host tailwind.config:
 *   import { fogmaPreset } from "@fogma/registry/tailwind/fogma-preset"
 *   export default { presets: [fogmaPreset], content: [...] }
 *
 * Utilities generated (examples):
 *   p-fogma-3, gap-fogma-2, size-fogma-4, m-fogma-1, inset-fogma-0
 *   rounded-fogma-md, rounded-fogma-full
 *   text-fogma-sm, text-fogma-xl
 *   font-fogma-semibold
 *   tracking-fogma-tight
 */
export const fogmaPreset: Partial<Config> = {
  theme: {
    extend: {
      // -----------------------------------------------------------------------
      // Colors — all CSS variable–based; host can override via var(--fogma-*)
      // -----------------------------------------------------------------------
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
        "fogma-agent-fg": "var(--fogma-agent-fg)",
      },

      // -----------------------------------------------------------------------
      // Font family
      // -----------------------------------------------------------------------
      fontFamily: {
        // Resolves to whatever the host wires into --font-raveo (set by
        // `next/font/local` in the playground's layout.tsx). Falls back to
        // Inter / system-ui when the variable is unset (e.g. SSR before
        // hydration, or hosts that don't load Raveo).
        "fogma-sans": ["var(--font-raveo)", "Inter", "system-ui", "sans-serif"],
      },

      // -----------------------------------------------------------------------
      // Spacing — mirrors Tailwind's full default scale, prefixed with fogma-.
      // Generates p-fogma-*, m-fogma-*, gap-fogma-*, size-fogma-*, w-fogma-*,
      // h-fogma-*, inset-fogma-*, top/bottom/left/right-fogma-*, etc.
      // -----------------------------------------------------------------------
      spacing: {
        "fogma-0": "0",
        "fogma-px": "1px",
        "fogma-0.5": "0.125rem",
        "fogma-1": "0.25rem",
        "fogma-1.5": "0.375rem",
        "fogma-2": "0.5rem",
        "fogma-2.5": "0.625rem",
        "fogma-3": "0.75rem",
        "fogma-3.5": "0.875rem",
        "fogma-4": "1rem",
        "fogma-5": "1.25rem",
        "fogma-6": "1.5rem",
        "fogma-7": "1.75rem",
        "fogma-8": "2rem",
        "fogma-9": "2.25rem",
        "fogma-10": "2.5rem",
        "fogma-11": "2.75rem",
        "fogma-12": "3rem",
        "fogma-14": "3.5rem",
        "fogma-16": "4rem",
        "fogma-20": "5rem",
        "fogma-24": "6rem",
        "fogma-28": "7rem",
        "fogma-32": "8rem",
        "fogma-36": "9rem",
        "fogma-40": "10rem",
        "fogma-44": "11rem",
        "fogma-48": "12rem",
        "fogma-52": "13rem",
        "fogma-56": "14rem",
        "fogma-60": "15rem",
        "fogma-64": "16rem",
        "fogma-72": "18rem",
        "fogma-80": "20rem",
        "fogma-96": "24rem",
      },

      // -----------------------------------------------------------------------
      // Border radius
      // -----------------------------------------------------------------------
      borderRadius: {
        "fogma-xxs": "2px",
        "fogma-xs": "4px",
        "fogma-sm": "4px",
        "fogma-md": "6px",
        "fogma-lg": "8px",
        "fogma-xl": "12px",
        "fogma-2xl": "16px",
        "fogma-3xl": "24px",
        "fogma-full": "9999px",
      },

      // -----------------------------------------------------------------------
      // Font size — stock Tailwind parities, namespaced
      // -----------------------------------------------------------------------
      fontSize: {
        "fogma-5xs": ["0.5625rem", { lineHeight: "1.3", letterSpacing: "0.02em" }],
        "fogma-4xs": ["0.65rem", { lineHeight: "1.3", letterSpacing: "0.02em" }],
        "fogma-3xs": ["0.72rem", { lineHeight: "1.3", letterSpacing: "0.02em" }],
        "fogma-label": ["0.75rem", { lineHeight: "1.3", letterSpacing: "0.02em" }],
        "fogma-xs": ["0.75rem", { lineHeight: "1rem" }],
        "fogma-sm": ["0.875rem", { lineHeight: "1.25rem" }],
        "fogma-base": ["1rem", { lineHeight: "1.5rem" }],
        "fogma-lg": ["1.125rem", { lineHeight: "1.75rem" }],
        "fogma-xl": ["1.25rem", { lineHeight: "1.75rem" }],
        "fogma-2xl": ["1.5rem", { lineHeight: "2rem" }],
        "fogma-3xl": ["1.875rem", { lineHeight: "2.25rem" }],
        "fogma-4xl": ["2.25rem", { lineHeight: "2.5rem" }],
      },

      // -----------------------------------------------------------------------
      // Font weight
      // -----------------------------------------------------------------------
      fontWeight: {
        "fogma-normal": "400",
        "fogma-medium": "500",
        "fogma-semibold": "600",
        "fogma-bold": "700",
      },

      // -----------------------------------------------------------------------
      // Letter spacing
      // -----------------------------------------------------------------------
      letterSpacing: {
        "fogma-tight": "-0.025em",
        "fogma-normal": "0",
        "fogma-wide": "0.025em",
        "fogma-wider": "0.05em",
      },
    },
  },
}

export default fogmaPreset
