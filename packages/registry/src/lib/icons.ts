import {
  ArrowLeft,
  Box,
  Boxes,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Check,
  File,
  Files,
  Info,
  LayoutGrid,
  Palette,
  Plus,
  Search,
  Workflow,
  X,
  type LucideIcon,
} from "lucide-react"

/**
 * Preselected icons for Fogma's known concepts.
 *
 * Use these instead of importing from `lucide-react` directly so the visual
 * identity stays consistent across boards and kits. Pass directly to a
 * sidebar section's `icon` prop or to `<FogmaIcon icon={fogmaIcons.X} />`.
 */
export const fogmaIcons = {
  // Section / board defaults
  designSystem: Palette,
  components: Boxes,
  pages: Files,
  navigation: LayoutGrid,
  flows: Workflow,

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

export type FogmaIconName = keyof typeof fogmaIcons
