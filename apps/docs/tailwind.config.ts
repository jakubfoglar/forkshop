import type { Config } from "tailwindcss"
import typography from "@tailwindcss/typography"

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx,md,mdx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        raveo: ["var(--font-raveo)", "system-ui", "sans-serif"],
      },
      colors: {
        canvas: "#fafaf7",
        ink: "#1a1a18",
        muted: "#6e6e6a",
        accent: "#3057f0",
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
  plugins: [typography],
}

export default config
