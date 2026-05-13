import type { TokenEntry, TokenRegistry } from "@/lib/fogma/token-registry"
import type { ColorNode } from "@/lib/fogma/system-graph"

export type Combined = TokenEntry & ColorNode & TokenRegistry
