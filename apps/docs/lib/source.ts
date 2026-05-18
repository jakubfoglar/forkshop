import { docs } from "@/.source"
import { loader } from "fumadocs-core/source"

// fumadocs-mdx@11 returns { files: () => VirtualFile[] } but fumadocs-core@15
// loader expects { files: VirtualFile[] } — call the function to resolve it.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mdxSource = docs.toFumadocsSource() as any
const resolvedFiles = typeof mdxSource.files === "function" ? mdxSource.files() : mdxSource.files

export const source = loader({
  baseUrl: "/docs",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  source: { files: resolvedFiles } as any,
})
