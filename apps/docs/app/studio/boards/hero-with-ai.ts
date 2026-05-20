import type { StudioBoard } from "../types"

export const HERO_WITH_AI: StudioBoard = {
  id: "hero-with-ai",
  title: "Hero block, AI actively editing",
  frames: [
    {
      id: "main",
      x: 0,
      y: 0,
      width: 1200,
      height: 600,
      demoState: {
        selection: { kind: "block", slug: "hero" },
        viewport: "responsive",
        canvas: { zoom: 0.8, pan: { x: -100, y: -50 } },
        agents: [{ kind: "block", slug: "hero" }],
      },
    },
  ],
}
