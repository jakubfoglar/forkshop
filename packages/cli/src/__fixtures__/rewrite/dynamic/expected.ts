export async function loadLazy() {
  const mod = await import("@/lib/forkshop/system-layout")
  return mod
}
