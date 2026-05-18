import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./content/**/*.{md,mdx}",
    "./node_modules/fumadocs-ui/dist/**/*.js",
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
    },
  },
  plugins: [],
}

export default config
