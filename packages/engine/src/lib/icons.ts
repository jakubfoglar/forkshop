import { IconChevronDownSmall } from "@central-icons-react/square-outlined-radius-0-stroke-2/IconChevronDownSmall"
import { IconChevronTopSmall } from "@central-icons-react/square-outlined-radius-0-stroke-2/IconChevronTopSmall"
import { IconChevronLeftSmall } from "@central-icons-react/square-outlined-radius-0-stroke-2/IconChevronLeftSmall"
import { IconChevronRightSmall } from "@central-icons-react/square-outlined-radius-0-stroke-2/IconChevronRightSmall"
import { IconArrowLeft } from "@central-icons-react/square-outlined-radius-0-stroke-2/IconArrowLeft"
import { IconCheckmark2Medium } from "@central-icons-react/square-outlined-radius-0-stroke-2/IconCheckmark2Medium"
import { IconCrossMedium } from "@central-icons-react/square-outlined-radius-0-stroke-2/IconCrossMedium"
import { IconPlusLarge } from "@central-icons-react/square-outlined-radius-0-stroke-2/IconPlusLarge"
import { IconQuickSearch } from "@central-icons-react/square-outlined-radius-0-stroke-2/IconQuickSearch"
import { IconCircleInfo } from "@central-icons-react/square-outlined-radius-0-stroke-2/IconCircleInfo"
import { IconFileBend } from "@central-icons-react/square-outlined-radius-0-stroke-2/IconFileBend"
import { IconComponents } from "@central-icons-react/square-outlined-radius-0-stroke-2/IconComponents"
import { IconAgent } from "@central-icons-react/square-outlined-radius-0-stroke-2/IconAgent"
import { IconBrowserTabs } from "@central-icons-react/square-outlined-radius-0-stroke-2/IconBrowserTabs"
import { IconAgentNetwork } from "@central-icons-react/square-outlined-radius-0-stroke-2/IconAgentNetwork"
import { IconColorSwatch } from "@central-icons-react/square-outlined-radius-0-stroke-2/IconColorSwatch"

import type { ForkshopIconComponent } from "@forkshop/components/icon"

/**
 * Preselected icons for Forkshop's known concepts.
 *
 * Sourced from @central-icons-react/square-outlined-radius-0-stroke-2 (Central
 * Icon Set, used under license). Bundled at engine-build time; the published
 * @forkshop/engine artifact has no runtime icon dependency.
 */
export const forkshopIcons = {
  // Section / board defaults
  designSystem: IconColorSwatch,
  components:   IconComponents,
  pages:        IconFileBend,
  sitemap:      IconAgent,
  navigation:   IconBrowserTabs,
  flows:        IconAgentNetwork,

  // Entity types
  page:         IconFileBend,
  block:        IconComponents,

  // UI affordances
  info:         IconCircleInfo,
  back:         IconArrowLeft,
  close:        IconCrossMedium,
  check:        IconCheckmark2Medium,
  plus:         IconPlusLarge,
  search:       IconQuickSearch,
  chevronDown:  IconChevronDownSmall,
  chevronUp:    IconChevronTopSmall,
  chevronLeft:  IconChevronLeftSmall,
  chevronRight: IconChevronRightSmall,
} satisfies Record<string, ForkshopIconComponent>

export type ForkshopIconName = keyof typeof forkshopIcons
