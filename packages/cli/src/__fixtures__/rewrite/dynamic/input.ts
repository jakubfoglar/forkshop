export async function loadLazy() {
  const mod = await import("@fogma/lib/system-layout")
  return mod
}
