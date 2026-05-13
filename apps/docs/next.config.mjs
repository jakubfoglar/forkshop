/** @type {import('next').NextConfig} */
const config = {
  async headers() {
    return [
      {
        source: "/r/fonts/:all*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ]
  },
}

export default config
