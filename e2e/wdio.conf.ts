import { spawn, spawnSync, type ChildProcess } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import type { Options } from "@wdio/types"

/**
 * WebdriverIO + tauri-driver configuration (https://v2.tauri.app/develop/tests/webdriver/).
 *
 * - onPrepare: creates a unique temporary data directory (EASYTASK_DATA_DIR, read by the backend so the
 *   tests never touch the real Documents/EasyTask) and builds the debug app unless E2E_SKIP_BUILD=1.
 * - beforeSession / afterSession: start and stop tauri-driver (it launches the app for each session).
 * - onComplete: removes the temporary data directory.
 *
 * Environment: E2E_SKIP_BUILD=1 reuses an existing debug binary, E2E_APP=<path> uses a custom binary,
 * E2E_NATIVE_DRIVER=<path> uses a specific msedgedriver / WebKitWebDriver.
 */
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const isWindows = process.platform === "win32"
const binName = isWindows ? "app.exe" : "app"
const application = process.env.E2E_APP ?? path.join(root, "src-tauri", "target", "debug", binName)

let dataDir = ""
let tauriDriver: ChildProcess | undefined
let exiting = false

const stopDriver = () => {
    exiting = true
    tauriDriver?.kill()
}

/** Downloads (once) an msedgedriver that matches the installed Edge / WebView2 on Windows. */
const resolveNativeDriver = async (): Promise<string | undefined> => {
    if (process.env.E2E_NATIVE_DRIVER) return process.env.E2E_NATIVE_DRIVER
    if (!isWindows) return undefined
    const { download } = await import("edgedriver")
    const cacheDir = path.join(os.tmpdir(), "easytask-e2e-edgedriver")
    fs.mkdirSync(cacheDir, { recursive: true })
    return download(undefined, cacheDir)
}

export const config: Options.Testrunner & { capabilities: unknown[] } = {
    runner: "local",
    hostname: "127.0.0.1",
    port: 4444,
    specs: ["./specs/**/*.e2e.ts"],
    maxInstances: 1,
    capabilities: [
        {
            maxInstances: 1,
            "tauri:options": { application },
        },
    ],
    reporters: ["spec"],
    framework: "mocha",
    mochaOpts: { ui: "bdd", timeout: 120_000 },
    waitforTimeout: 10_000,
    connectionRetryTimeout: 120_000,
    connectionRetryCount: 1,
    logLevel: "warn",

    onPrepare: () => {
        dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "easytask-e2e-"))
        // Inherited by tauri-driver and, through it, by the app under test
        process.env.EASYTASK_DATA_DIR = dataDir
        console.log(`[e2e] data dir: ${dataDir}`)

        if (process.env.E2E_SKIP_BUILD === "1") return
        console.log("[e2e] building the debug app (tauri build --debug --no-bundle)...")
        const result = spawnSync("npm", ["run", "tauri", "--", "build", "--debug", "--no-bundle"], {
            cwd: root,
            stdio: "inherit",
            shell: true,
        })
        if (result.status !== 0) throw new Error("tauri build failed")
    },

    beforeSession: async () => {
        const nativeDriver = await resolveNativeDriver()
        exiting = false
        const args = nativeDriver ? ["--native-driver", nativeDriver] : []
        tauriDriver = spawn(path.join(os.homedir(), ".cargo", "bin", "tauri-driver"), args, {
            stdio: [null, process.stdout, process.stderr],
            env: process.env,
        })
        tauriDriver.on("error", (error) => {
            console.error("[e2e] tauri-driver error:", error)
            process.exit(1)
        })
        tauriDriver.on("exit", (code) => {
            if (!exiting) {
                console.error("[e2e] tauri-driver exited with code:", code)
                process.exit(1)
            }
        })
        // Give the driver time to start listening on :4444
        await new Promise((resolve) => setTimeout(resolve, 1500))
    },

    afterSession: () => {
        stopDriver()
    },

    onComplete: () => {
        stopDriver()
        if (dataDir) fs.rmSync(dataDir, { recursive: true, force: true })
    },
}

process.on("exit", stopDriver)
process.on("SIGINT", () => { stopDriver(); process.exit(1) })
process.on("SIGTERM", () => { stopDriver(); process.exit(1) })
