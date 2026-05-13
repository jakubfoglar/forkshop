import type { TokenEntry, TokenRegistry } from "@/lib/forkshop/token-registry"
import type { ColorNode } from "@/lib/forkshop/system-graph"

export type Combined = TokenEntry & ColorNode & TokenRegistry
