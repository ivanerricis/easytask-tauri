import path from "node:path"
import { fileURLToPath } from "node:url"
import { config as base } from "../wdio.conf"

/**
 * WebdriverIO configuration of the documentation screenshots (`npm run docs:screenshots`): same setup as the e2e
 * (temporary EASYTASK_DATA_DIR, tauri-driver, optional build), only the docs-shots spec.
 */
const here = path.dirname(fileURLToPath(import.meta.url))

export const config: typeof base = {
    ...base,
    specs: [path.join(here, "docs-shots.e2e.ts")],
    mochaOpts: { ...base.mochaOpts, timeout: 3_600_000 },
}
