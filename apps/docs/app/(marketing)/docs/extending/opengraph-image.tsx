import { ogContentType, ogSize, renderDocsOg } from "@/lib/og-template"

export const runtime = "edge"

export const alt = "Forkshop docs — Extending Forkshop"
export const size = ogSize
export const contentType = ogContentType

export default async function Image() {
  return renderDocsOg("Extending Forkshop")
}
