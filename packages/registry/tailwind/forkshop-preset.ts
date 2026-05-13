import type { Config } from "tailwindcss"

/**
 * Forkshop's tailwind preset.
 *
 * Convention: every token added here MUST be namespaced with the `forkshop-`
 * prefix so Forkshop's chrome utilities never collide with host project values.
 *
 * This preset adds ONLY forkshop-* namespaced tokens. It does not redefine
 * stock tailwind keys (spacing, radius, fontSize), so it can be safely
 * applied to any project without disturbing the host design system.
 *
 * Usage in host tailwind.config:
 *   import { forkshopPreset } from "@forkshop/registry/tailwind/forkshop-preset"
 *   export default { presets: [forkshopPreset], content: [...] }
 *
 * Utilities generated (examples):
 *   p-forkshop-3, gap-forkshop-2, size-forkshop-4, m-forkshop-1, inset-forkshop-0
 *   rounded-forkshop-md, rounded-forkshop-full
 *   text-forkshop-sm, text-forkshop-xl
 *   font-forkshop-semibold
 *   tracking-forkshop-tight
 */
export const forkshopPreset: Partial<Config> = {
  theme: {
    extend: {
      // -----------------------------------------------------------------------
      // Colors — all CSS variable–based; host can override via var(--forkshop-*)
      // -----------------------------------------------------------------------
      colors: {
        "forkshop-canvas": "var(--forkshop-canvas)",
        "forkshop-surface": "var(--forkshop-surface)",
        "forkshop-surface-2": "var(--forkshop-surface-2)",
        "forkshop-fg": "var(--forkshop-fg)",
        "forkshop-fg-muted": "var(--forkshop-fg-muted)",
        "forkshop-border": "var(--forkshop-border)",
        "forkshop-border-strong": "var(--forkshop-border-strong)",
        "forkshop-accent": "var(--forkshop-accent)",
        "forkshop-accent-fg": "var(--forkshop-accent-fg)",
        "forkshop-agent": "var(--forkshop-agent)",
        "forkshop-agent-fg": "var(--forkshop-agent-fg)",
      },

      // -----------------------------------------------------------------------
      // Font family
      // -----------------------------------------------------------------------
      fontFamily: {
        // Resolves to whatever the host wires into --font-raveo (set by
        // `next/font/local` in the playground's layout.tsx). Falls back to
        // Inter / system-ui when the variable is unset (e.g. SSR before
        // hydration, or hosts that don't load Raveo).
        "forkshop-sans": ["var(--font-raveo)", "Inter", "system-ui", "sans-serif"],
      },

      // -----------------------------------------------------------------------
      // Spacing — mirrors Tailwind's full default scale, prefixed with forkshop-.
      // Generates p-forkshop-*, m-forkshop-*, gap-forkshop-*, size-forkshop-*, w-forkshop-*,
      // h-forkshop-*, inset-forkshop-*, top/bottom/left/right-forkshop-*, etc.
      // -----------------------------------------------------------------------
      spacing: {
        "forkshop-0": "0",
        "forkshop-px": "1px",
        "forkshop-0.5": "0.125rem",
        "forkshop-1": "0.25rem",
        "forkshop-1.5": "0.375rem",
        "forkshop-2": "0.5rem",
        "forkshop-2.5": "0.625rem",
        "forkshop-3": "0.75rem",
        "forkshop-3.5": "0.875rem",
        "forkshop-4": "1rem",
        "forkshop-5": "1.25rem",
        "forkshop-6": "1.5rem",
        "forkshop-7": "1.75rem",
        "forkshop-8": "2rem",
        "forkshop-9": "2.25rem",
        "forkshop-10": "2.5rem",
        "forkshop-11": "2.75rem",
        "forkshop-12": "3rem",
        "forkshop-14": "3.5rem",
        "forkshop-16": "4rem",
        "forkshop-20": "5rem",
        "forkshop-24": "6rem",
        "forkshop-28": "7rem",
        "forkshop-32": "8rem",
        "forkshop-36": "9rem",
        "forkshop-40": "10rem",
        "forkshop-44": "11rem",
        "forkshop-48": "12rem",
        "forkshop-52": "13rem",
        "forkshop-56": "14rem",
        "forkshop-60": "15rem",
        "forkshop-64": "16rem",
        "forkshop-72": "18rem",
        "forkshop-80": "20rem",
        "forkshop-96": "24rem",
      },

      // -----------------------------------------------------------------------
      // Border radius
      // -----------------------------------------------------------------------
      borderRadius: {
        "forkshop-xxs": "2px",
        "forkshop-xs": "4px",
        "forkshop-sm": "4px",
        "forkshop-md": "6px",
        "forkshop-lg": "8px",
        "forkshop-xl": "12px",
        "forkshop-2xl": "16px",
        "forkshop-3xl": "24px",
        "forkshop-full": "9999px",
      },

      // -----------------------------------------------------------------------
      // Font size — stock Tailwind parities, namespaced
      // -----------------------------------------------------------------------
      fontSize: {
        "forkshop-5xs": ["0.5625rem", { lineHeight: "1.3", letterSpacing: "0.02em" }],
        "forkshop-4xs": ["0.65rem", { lineHeight: "1.3", letterSpacing: "0.02em" }],
        "forkshop-3xs": ["0.72rem", { lineHeight: "1.3", letterSpacing: "0.02em" }],
        "forkshop-label": ["0.75rem", { lineHeight: "1.3", letterSpacing: "0.02em" }],
        "forkshop-xs": ["0.75rem", { lineHeight: "1rem" }],
        "forkshop-sm": ["0.875rem", { lineHeight: "1.25rem" }],
        "forkshop-base": ["1rem", { lineHeight: "1.5rem" }],
        "forkshop-lg": ["1.125rem", { lineHeight: "1.75rem" }],
        "forkshop-xl": ["1.25rem", { lineHeight: "1.75rem" }],
        "forkshop-2xl": ["1.5rem", { lineHeight: "2rem" }],
        "forkshop-3xl": ["1.875rem", { lineHeight: "2.25rem" }],
        "forkshop-4xl": ["2.25rem", { lineHeight: "2.5rem" }],
      },

      // -----------------------------------------------------------------------
      // Font weight
      // -----------------------------------------------------------------------
      fontWeight: {
        "forkshop-normal": "400",
        "forkshop-medium": "500",
        "forkshop-semibold": "600",
        "forkshop-bold": "700",
      },

      // -----------------------------------------------------------------------
      // Letter spacing
      // -----------------------------------------------------------------------
      letterSpacing: {
        "forkshop-tight": "-0.025em",
        "forkshop-normal": "0",
        "forkshop-wide": "0.025em",
        "forkshop-wider": "0.05em",
      },
    },
  },
}

export default forkshopPreset
