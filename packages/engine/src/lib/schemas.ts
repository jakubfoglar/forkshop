import { z } from "zod"

const baseNodeSchema = z.object({
  id: z.string().min(1),
  x: z.number(),
  y: z.number(),
  width: z.number().nonnegative(),
  height: z.number().nonnegative(),
  // AnyNode.label is typed ReactNode; this schema validates the string case only.
  // Non-string labels (e.g., a JSX element) bypass runtime validation harmlessly.
  label: z.string().optional(),
})

const renderFunctionSchema = z.custom<(...args: unknown[]) => unknown>(
  (val) => typeof val === "function",
  { message: "render must be a function" },
)

const inlineReactSchema = baseNodeSchema.extend({
  kind: z.literal("inline-react"),
  render: renderFunctionSchema,
  filePath: z.string().optional(),
})

const iframeRouteSchema = baseNodeSchema.extend({
  kind: z.literal("iframe-route"),
  routePath: z.string().regex(/^\//, "routePath must start with /"),
  sourceFile: z.string().optional(),
})

const iframeComponentSchema = baseNodeSchema.extend({
  kind: z.literal("iframe-component"),
  slug: z.string().min(1),
  previewSrc: z.string().min(1),
  sourceFile: z.string().optional(),
  componentPath: z.string().optional(),
})

export const nodeSchema = z.discriminatedUnion("kind", [
  inlineReactSchema,
  iframeRouteSchema,
  iframeComponentSchema,
])

const sitemapRouteSchema = z.object({
  path: z
    .string()
    .regex(/^\/.+/, "route paths must start with / and be non-empty")
    .or(z.literal("/")),
  sourceFile: z.string().min(1),
})

export const forkshopConfigSchema = z.object({
  mount: z.string().min(1),
  ui: z.record(z.string(), z.unknown()).optional(),
  blocks: z.record(z.string(), z.unknown()).optional(),
  nodeTypes: z.array(z.unknown()).optional(),
  layouts: z.array(z.unknown()).optional(),
  sitemap: z.object({ routes: z.array(sitemapRouteSchema) }),
  reference: z.object({ contentPaths: z.array(z.string()) }).optional(),
  viewportProfile: z.enum(["responsive", "mobile"]).default("responsive"),
})

export type ParsedNode = z.infer<typeof nodeSchema>
export type ParsedForkshopConfig = z.infer<typeof forkshopConfigSchema>
