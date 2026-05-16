const forkshopPreset = require("../.tmp/forkshop-preset.cjs")

module.exports = {
  presets: [forkshopPreset.default ?? forkshopPreset],
  content: ["./src/**/*.{ts,tsx}"],
}
