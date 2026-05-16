import {
  ArrowLeft,
  Box,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Check,
  File,
  Info,
  Network,
  Plus,
  Search,
  SwatchBook,
  X,
  type LucideIcon,
} from "lucide-react"

/**
 * Preselected icons for Forkshop's known concepts.
 *
 * Use these instead of importing from `lucide-react` directly so the visual
 * identity stays consistent across boards and kits. Pass directly to a
 * sidebar section's `icon` prop or to `<ForkshopIcon icon={forkshopIcons.X} />`.
 */
export const forkshopIcons = {
  // Section / board defaults
  designSystem: SwatchBook,
  components: Box,
  pages: File,
  sitemap: Network,
  navigation: Network,
  flows: Network,

  // Entity types
  page: File,
  block: Box,

  // UI affordances
  info: Info,
  back: ArrowLeft,
  close: X,
  check: Check,
  plus: Plus,
  search: Search,
  chevronDown: ChevronDown,
  chevronUp: ChevronUp,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
} satisfies Record<string, LucideIcon>

export type ForkshopIconName = keyof typeof forkshopIcons
