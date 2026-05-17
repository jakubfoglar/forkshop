# Polish backlog (post-1.0)

Small, deferrable improvements not blocking 1.0. Filed as they're discovered. Pull from this list when scoping 1.x or later cycles.

---

## Replace `@locator/runtime` + `@locator/webpack-loader` with a homegrown Option-click handler

**Why:** `@locator/runtime@^0.5.1` imports `setStyleProperty` from `solid-js/web`, but solid-js 1.9+ removed that export. The result is a non-fatal `Attempted import error: 'setStyleProperty' is not exported from 'solid-js/web'` warning floods opt-in Locator users' dev terminals on every HMR cycle. No newer upstream release fixes this; pinning solid-js requires lockfile surgery.

**The replacement:** React's dev-mode JSX transform already attaches `__source` (file, line, column) to every JSX element — that's the entire compile-time half of what `@locator/webpack-loader` does. Locator.js's actual value-add is just the runtime click handler. A homegrown `LocatorInit` would:

1. Listen for `mousedown` (or `click`) with `event.altKey === true`
2. Walk up `event.target.parentElement` to find an element with the React internal `__source` (or `_debugSource` in newer React) attached
3. Construct `vscode://file/${absolutePath}:${lineNumber}:${columnNumber}`
4. Navigate the top window to it (`window.top.location.href = ...`)
5. Mount only when `process.env.NODE_ENV === "development"` AND the page is loaded inside Forkshop's iframe (parent path startsWith mountPath) — same conditional `LocatorInit` already uses today

Roughly 50 lines of TSX. Replaces the entire `@locator/*` dep tree. Removes the solid-js peer-dep landmine forever.

**Sequencing:** Land in a 1.x cycle once 1.0 ships. Not a blocker — the warning is cosmetic.

**Until then:** documented as a known cosmetic issue. Opt-in Locator users see the warning; functionality works.

---

## Dedupe `/api/forkshop/edit?path=...` fetches across multi-viewport boards

**Why:** Each iframe mount triggers one `GET /api/forkshop/edit?path=<source>` to load the source file for the editable-set. Multi-viewport boards (e.g., `ResponsiveFrameView` rendering the same page at 1440/768/375 widths) trigger N identical fetches — once per viewport. Same response, different timestamps. Costs nothing in correctness but spams dev logs and burns redundant CPU.

**The fix:** add an in-memory module cache or `Promise` map keyed by `sourcePath` inside `useIframeEditController` so concurrent requests for the same source dedupe to one fetch. Cache invalidation: drop the entry when the `forkshop:source-changed` window event fires (already used for cross-viewport live sync).

**Sequencing:** 1.x polish. Real users will see the chatty logs but operationally this is benign.

---

## Replace `apps/playground/` with a CLI-init smoke fixture

**Why:** The current playground inherits Ravineo-flavored host content from the in-house Fogma extraction — hero blocks named "Acme", `bg-forkshop-accent text-forkshop-accent-fg` mixed into host code, "Ship better software, faster" placeholder copy. None of this represents what a real `npx forkshop init` install looks like. Strategy v2 explicitly says hosts shouldn't use `forkshop-*` tokens in their own code, but the playground does.

**The replacement:** during CLI rework (spec #3), build a minimal host that exercises the real install path — essentially `create-next-app` + Tailwind + whatever `forkshop init` scaffolds. Doubles as: (a) the smoke test for the new init flow, (b) the dev playground for ongoing engine work. Single artifact, two uses.

**Sequencing:** Folds into CLI rework. Should land before 1.0 because the playground is the canonical "does it work?" check and the current shape misrepresents the install experience.

**Until then:** existing playground stays as-is. Visual mismatches (e.g., button text rendering black instead of white in iframe pages because `text-forkshop-accent-fg` isn't generated) are artifacts of the old shape; they don't reflect real-user behavior.

---
