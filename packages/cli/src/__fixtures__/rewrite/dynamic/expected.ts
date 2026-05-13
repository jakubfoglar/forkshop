export async function loadLazy() {
  const mod = await import("@/lib/fogma/system-layout")
  return mod
}
