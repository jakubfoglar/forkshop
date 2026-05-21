import {
  MANIFEST_SCHEMA_VERSION,
  SUPPORTED_SCHEMA_VERSIONS,
  type Manifest,
} from "./manifest-schema.js"

export async function fetchManifest(registryUrl: string): Promise<Manifest> {
  const url = registryUrl.endsWith("/") ? `${registryUrl}registry.json` : `${registryUrl}/registry.json`
  let response: Response
  try {
    response = await fetch(url)
  } catch (error) {
    throw new Error(
      `Could not reach the Forkshop registry at ${url} (${(error as Error).message}). ` +
        `Retry, or pass --registry <url> for local development.`
    )
  }
  if (!response.ok) {
    throw new Error(
      `Registry returned HTTP ${response.status} for ${url}. ` +
        `Retry, or pass --registry <url> for local development.`
    )
  }
  const manifest = (await response.json()) as Manifest
  if (!SUPPORTED_SCHEMA_VERSIONS.has(manifest.version)) {
    throw new Error(
      `Your forkshop CLI is incompatible with this registry (CLI: ${MANIFEST_SCHEMA_VERSION}, manifest: ${manifest.version}). ` +
        `Run \`npx forkshop@latest\` to update.`
    )
  }
  if (manifest.version === "2.0.0" && MANIFEST_SCHEMA_VERSION === "2.1.0") {
    console.warn(
      `forkshop: manifest version 2.0.0 detected (current is 2.1.0). ` +
        `The install will still work; re-run \`npx forkshop init\` to upgrade.`
    )
  }
  // Bind binary URLs to the host we just fetched from. The manifest's stored
  // registryBaseUrl is whatever the registry server was configured with at
  // build time — when the user passes `--registry`, they expect binaries to
  // come from that same host, not the embedded production URL.
  const trailing = registryUrl.endsWith("/") ? registryUrl : `${registryUrl}/`
  return { ...manifest, registryBaseUrl: trailing }
}
