import { ogContentType, ogSize, renderDocsOg } from "@/lib/og-template"

export const runtime = "edge"

export const alt = "Forkshop docs — Introduction"
export const size = ogSize
export const contentType = ogContentType

export default async function Image() {
  return renderDocsOg("Introduction")
}
