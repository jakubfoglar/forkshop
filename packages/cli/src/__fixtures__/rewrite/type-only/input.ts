import type { TokenEntry, TokenRegistry } from "@fogma/lib/token-registry"
import type { ColorNode } from "@fogma/lib/system-graph"

export type Combined = TokenEntry & ColorNode & TokenRegistry
