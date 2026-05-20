import type { Config } from "tailwindcss"
import typography from "@tailwindcss/typography"

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx,md,mdx}",
    "./components/**/*.{ts,tsx}",
    "./app/demo/**/*.{ts,tsx}",
    "./app/studio/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        raveo: ["var(--font-raveo)", "system-ui", "sans-serif"],
        // Demo: WAVECLASH brand fonts (resolved via CSS vars set by next/font/google)
        display: ["var(--font-archivo-black)", "Arial Black", "system-ui", "sans-serif"],
        "demo-mono": ["var(--font-jetbrains-mono)", "Fira Code", "Courier New", "monospace"],
        body: ["var(--font-inter)", "system-ui", "-apple-system", "sans-serif"],
      },
      colors: {
        canvas: "#fafaf7",
        ink: "#1a1a18",
        muted: "#6e6e6a",
        accent: "#3057f0",
        // Demo: WAVECLASH brand primitives (CSS-var driven — only resolve inside .demo-scope)
        "waveclash-black": "var(--waveclash-black)",
        "waveclash-graphite": "var(--waveclash-graphite)",
        "waveclash-cream": "var(--waveclash-cream)",
        "waveclash-red": "var(--waveclash-red)",
        "waveclash-yellow": "var(--waveclash-yellow)",
        "waveclash-sand": "var(--waveclash-sand)",
        "waveclash-navy": "var(--waveclash-navy)",
        // Demo: semantic aliases (also CSS-var driven)
        "demo-background": "var(--demo-background)",
        "demo-foreground": "var(--demo-foreground)",
        "demo-surface": "var(--demo-surface)",
        "demo-surface-card": "var(--demo-surface-card)",
        "demo-surface-invert": "var(--demo-surface-invert)",
        "demo-accent": "var(--demo-accent)",
        "demo-accent-secondary": "var(--demo-accent-secondary)",
        "demo-accent-deep": "var(--demo-accent-deep)",
        "demo-border": "var(--demo-border)",
        "demo-border-invert": "var(--demo-border-invert)",
        "demo-muted-foreground": "var(--demo-muted-foreground)",
      },
      fontSize: {
        // Demo: WAVECLASH custom type scale (10–280px), namespaced with wc- prefix
        // to avoid overriding Tailwind defaults on marketing/docs routes.
        // Format: [fontSize, { lineHeight }]
        "wc-xs":           ["10px",  { lineHeight: "1.0" }],
        "wc-sm":           ["11px",  { lineHeight: "1.0" }],
        "wc-base":         ["12px",  { lineHeight: "1.0" }],
        "wc-md":           ["13px",  { lineHeight: "1.0" }],
        "wc-lg":           ["14px",  { lineHeight: "1.4" }],
        "wc-xl":           ["15px",  { lineHeight: "1.0" }],
        "wc-2xl":          ["16px",  { lineHeight: "1.4" }],
        "wc-3xl":          ["18px",  { lineHeight: "1.0" }],
        "wc-3-5xl":        ["20px",  { lineHeight: "1.0" }],
        "wc-4xl":          ["22px",  { lineHeight: "1.0" }],
        "wc-5xl":          ["24px",  { lineHeight: "1.0" }],
        "wc-6xl":          ["28px",  { lineHeight: "1.0" }],
        "wc-7xl":          ["32px",  { lineHeight: "1.0" }],
        "wc-8xl":          ["64px",  { lineHeight: "0.9" }],
        "wc-9xl":          ["72px",  { lineHeight: "0.9" }],
        "wc-10xl":         ["80px",  { lineHeight: "0.85" }],
        "wc-11xl":         ["120px", { lineHeight: "0.87" }],
        "wc-display-xs":   ["30px",  { lineHeight: "1.4" }],
        "wc-display-sm":   ["180px", { lineHeight: "0.85" }],
        "wc-display-md":   ["220px", { lineHeight: "0.82" }],
        "wc-display-lg":   ["280px", { lineHeight: "0.82" }],
      },
      letterSpacing: {
        // Demo: WAVECLASH named tracking levels
        // Values are em (relative to element font size) computed from px-at-size design pairs:
        //   em = tracking_px / font_size_px
        "display-tight":    "-0.05em",     // −12px @ 280px, tightened slightly (was -0.04286em)
        "display-snug":     "-0.047em",   // −5px @ 120px, tightened slightly (was -0.04167em)
        "display-normal":   "-0.036em",   // −2px @ 64px, tightened slightly (was -0.03125em)
        "label-tight":      "-0.03125em", // −1px @ 32px (schedule event names)
        "label-normal":     "0.03125em",  // +0.5px @ 16px (info table values — no explicit size in tokens; anchored to 2xl=16px)
        "label-wide":       "0.05556em",  // +1px @ 18px (event subtitle bar — explicit size in tokens)
        "label-wider":      "0.125em",    // +1.5px @ 12px (nav links base size)
        "label-widest":     "0.1818em",   // +2px @ 11px (edition tag sm size)
      },
      lineHeight: {
        // Demo: WAVECLASH named line heights (sub-1.0 intentional for display type)
        tight:   "0.85",
        dense:   "0.88",
        snug:    "0.9",
        normal:  "1.0",
        relaxed: "1.4",
        loose:   "1.45",
      },
      typography: ({ theme }: { theme: (key: string) => string }) => ({
        DEFAULT: {
          css: {
            "--tw-prose-body": theme("colors.ink"),
            "--tw-prose-headings": theme("colors.ink"),
            "--tw-prose-lead": theme("colors.muted"),
            "--tw-prose-links": theme("colors.accent"),
            "--tw-prose-bold": theme("colors.ink"),
            "--tw-prose-bullets": theme("colors.muted"),
            "--tw-prose-quotes": theme("colors.muted"),
            "--tw-prose-code": theme("colors.ink"),
            "--tw-prose-pre-bg": "#f1f1ec",
            "--tw-prose-pre-code": theme("colors.ink"),
            "--tw-prose-th-borders": theme("colors.ink"),
            "--tw-prose-td-borders": theme("colors.muted"),
            "--tw-prose-hr": theme("colors.ink"),
            maxWidth: "none",
            code: {
              fontWeight: "500",
              padding: "0.125rem 0.375rem",
              borderRadius: "0.25rem",
              backgroundColor: "#f1f1ec",
            },
            "code::before": { content: "none" },
            "code::after": { content: "none" },
            "pre code": {
              backgroundColor: "transparent",
              padding: "0",
            },
            a: {
              textDecoration: "none",
              "&:hover": { textDecoration: "underline" },
            },
          },
        },
      }),
    },
  },
  safelist: [
    { pattern: /^bg-waveclash-/ },
    { pattern: /^bg-demo-/ },
    { pattern: /^text-wc-(xs|sm|base|md|lg|xl|2xl|3xl|3-5xl|4xl|5xl|6xl|7xl|8xl|9xl|10xl|11xl|display-xs|display-sm|display-md|display-lg)$/ },
  ],
  plugins: [typography],
}

export default config
