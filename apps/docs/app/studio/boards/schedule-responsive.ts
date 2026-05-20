import type { StudioBoard } from "../types"

export const SCHEDULE_RESPONSIVE: StudioBoard = {
  id: "schedule-responsive",
  title: "Schedule, all viewports",
  frames: [
    {
      id: "main",
      x: 0,
      y: 0,
      width: 1200,
      height: 600,
      demoState: {
        selection: { kind: "section", sectionId: "sitemap" },
        viewport: "responsive",
      },
    },
  ],
}
