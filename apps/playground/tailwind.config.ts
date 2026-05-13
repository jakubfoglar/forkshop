import type { Config } from "tailwindcss"
import fogmaPreset from "../../packages/registry/tailwind/fogma-preset"

const config: Config = {
  presets: [fogmaPreset as Config],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "../../packages/registry/src/**/*.{ts,tsx}",
  ],
}

export default config
