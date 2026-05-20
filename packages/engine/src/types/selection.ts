export type ForkshopSelection =
  | { kind: "section"; sectionId: string }
  | { kind: "block"; slug: string }
  | { kind: "primitive"; id: string }
  | { kind: "page"; path: string }
  | { kind: "custom"; namespace: string; data: unknown }

export function isSectionSelection(s: ForkshopSelection): s is Extract<ForkshopSelection, { kind: "section" }> {
  return s.kind === "section"
}
export function isPageSelection(s: ForkshopSelection): s is Extract<ForkshopSelection, { kind: "page" }> {
  return s.kind === "page"
}
export function isPrimitiveSelection(s: ForkshopSelection): s is Extract<ForkshopSelection, { kind: "primitive" }> {
  return s.kind === "primitive"
}
export function isBlockSelection(s: ForkshopSelection): s is Extract<ForkshopSelection, { kind: "block" }> {
  return s.kind === "block"
}
export function isCustomSelection(s: ForkshopSelection): s is Extract<ForkshopSelection, { kind: "custom" }> {
  return s.kind === "custom"
}
