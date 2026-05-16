import { IconChevronBottom } from "@central-icons-react/square-outlined-radius-0-stroke-2/IconChevronBottom"
import { IconChevronTop } from "@central-icons-react/square-outlined-radius-0-stroke-2/IconChevronTop"
import { IconChevronLeft } from "@central-icons-react/square-outlined-radius-0-stroke-2/IconChevronLeft"
import { IconChevronRight } from "@central-icons-react/square-outlined-radius-0-stroke-2/IconChevronRight"
import { IconArrowLeft } from "@central-icons-react/square-outlined-radius-0-stroke-2/IconArrowLeft"
import { IconCheckmark1 } from "@central-icons-react/square-outlined-radius-0-stroke-2/IconCheckmark1"
import { IconX } from "@central-icons-react/square-outlined-radius-0-stroke-2/IconX"
import { IconPlusLarge } from "@central-icons-react/square-outlined-radius-0-stroke-2/IconPlusLarge"
import { IconQuickSearch } from "@central-icons-react/square-outlined-radius-0-stroke-2/IconQuickSearch"
import { IconInfoSimple } from "@central-icons-react/square-outlined-radius-0-stroke-2/IconInfoSimple"
import { IconPageEmpty } from "@central-icons-react/square-outlined-radius-0-stroke-2/IconPageEmpty"
import { IconBox2 } from "@central-icons-react/square-outlined-radius-0-stroke-2/IconBox2"
import { IconAgentNetwork } from "@central-icons-react/square-outlined-radius-0-stroke-2/IconAgentNetwork"
import { IconColorSwatch } from "@central-icons-react/square-outlined-radius-0-stroke-2/IconColorSwatch"

import type { ForkshopIconComponent } from "@forkshop/components/icon"

/**
 * Preselected icons for Forkshop's known concepts.
 *
 * Sourced from @central-icons-react/square-outlined-radius-0-stroke-2 (Central
 * Icon Set, used under license). Bundled at engine-build time; the published
 * @forkshop/engine artifact has no runtime icon dependency.
 *
 * Central name substitutions vs the original Lucide names:
 *   lucide ChevronDown  → IconChevronBottom
 *   lucide ChevronUp    → IconChevronTop
 *   lucide Check        → IconCheckmark1
 *   lucide X            → IconX
 *   lucide Plus         → IconPlusLarge
 *   lucide Search       → IconQuickSearch
 *   lucide Info         → IconInfoSimple
 *   lucide File         → IconPageEmpty
 *   lucide Box          → IconBox2
 *   lucide Network      → IconAgentNetwork
 *   lucide SwatchBook   → IconColorSwatch
 */
export const forkshopIcons = {
  // Section / board defaults
  designSystem: IconColorSwatch,
  components:   IconBox2,
  pages:        IconPageEmpty,
  sitemap:      IconAgentNetwork,
  navigation:   IconAgentNetwork,
  flows:        IconAgentNetwork,

  // Entity types
  page:         IconPageEmpty,
  block:        IconBox2,

  // UI affordances
  info:         IconInfoSimple,
  back:         IconArrowLeft,
  close:        IconX,
  check:        IconCheckmark1,
  plus:         IconPlusLarge,
  search:       IconQuickSearch,
  chevronDown:  IconChevronBottom,
  chevronUp:    IconChevronTop,
  chevronLeft:  IconChevronLeft,
  chevronRight: IconChevronRight,
} satisfies Record<string, ForkshopIconComponent>

export type ForkshopIconName = keyof typeof forkshopIcons
