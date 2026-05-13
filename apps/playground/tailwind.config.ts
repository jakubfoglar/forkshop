import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "../../packages/registry/src/**/*.{ts,tsx}",
  ],
  theme: { extend: {} },
  plugins: [],
}

export default config
