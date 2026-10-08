import path from "node:path"
import { fileURLToPath } from "node:url"
import { config as base } from "../wdio.conf"

/** Layout audit: reuses the e2e configuration (data dir, tauri-driver, optional build) but runs only its own spec. */
const here = path.dirname(fileURLToPath(import.meta.url))

export const config: typeof base = {
    ...base,
    specs: [path.join(here, "layout-audit.e2e.ts")],
    mochaOpts: { ...base.mochaOpts, timeout: 7_200_000 },
}
