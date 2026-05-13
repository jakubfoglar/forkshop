import type { TokenEntry, TokenRegistry } from "@forkshop/lib/token-registry"
import type { ColorNode } from "@forkshop/lib/system-graph"

export type Combined = TokenEntry & ColorNode & TokenRegistry
