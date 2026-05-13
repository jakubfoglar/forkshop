export async function loadLazy() {
  const mod = await import("@forkshop/lib/system-layout")
  return mod
}
