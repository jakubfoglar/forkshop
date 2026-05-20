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
        // Demo: WAVECLASH custom type scale (10–280px)
        // Format: [fontSize, { lineHeight, letterSpacing }]
        // Line heights and letter spacings are representative defaults for each size bucket.
        xs:           ["10px",  { lineHeight: "1.0" }],
        sm:           ["11px",  { lineHeight: "1.0" }],
        base:         ["12px",  { lineHeight: "1.0" }],
        md:           ["13px",  { lineHeight: "1.0" }],
        lg:           ["14px",  { lineHeight: "1.4" }],
        xl:           ["15px",  { lineHeight: "1.0" }],
        "2xl":        ["16px",  { lineHeight: "1.4" }],
        "3xl":        ["18px",  { lineHeight: "1.0" }],
        "3-5xl":      ["20px",  { lineHeight: "1.0" }],
        "4xl":        ["22px",  { lineHeight: "1.0" }],
        "5xl":        ["24px",  { lineHeight: "1.0" }],
        "6xl":        ["28px",  { lineHeight: "1.0" }],
        "7xl":        ["32px",  { lineHeight: "1.0" }],
        "8xl":        ["64px",  { lineHeight: "0.9" }],
        "9xl":        ["72px",  { lineHeight: "0.9" }],
        "10xl":       ["80px",  { lineHeight: "0.85" }],
        "11xl":       ["120px", { lineHeight: "0.9" }],
        "display-xs": ["30px",  { lineHeight: "1.4" }],
        "display-sm": ["180px", { lineHeight: "0.88" }],
        "display-md": ["220px", { lineHeight: "0.85" }],
        "display-lg": ["280px", { lineHeight: "0.85" }],
      },
      letterSpacing: {
        // Demo: WAVECLASH named tracking levels
        "display-tight":    "-0.75rem",   // −12px (hero display type)
        "display-snug":     "-0.3125rem", // −5px (about heading 120px)
        "display-normal":   "-0.125rem",  // −2px (stats counters 64px)
        "label-tight":      "-0.0625rem", // −1px (schedule names 32px)
        "label-normal":     "0.03125rem", // +0.5px (info table values)
        "label-wide":       "0.0625rem",  // +1px (CTA buttons, subtitle bar)
        "label-wider":      "0.09375rem", // +1.5px (nav links, ticket CTA)
        "label-widest":     "0.125rem",   // +2px (edition tag, stats labels)
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
    { pattern: /^text-(xs|sm|base|md|lg|xl|2xl|3xl|3-5xl|4xl|5xl|6xl|7xl|8xl|9xl|10xl|11xl|display-xs|display-sm|display-md|display-lg)$/ },
  ],
  plugins: [typography],
}

export default config
