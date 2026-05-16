import type { Config } from "tailwindcss"
import forkshopPreset from "../../packages/engine/tailwind/forkshop-preset"

const config: Config = {
  presets: [forkshopPreset as Config],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "../../packages/engine/src/**/*.{ts,tsx}",
  ],
}

export default config
