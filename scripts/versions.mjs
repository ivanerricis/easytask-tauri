// Pure helpers shared by bump-version.mjs and check-versions.mjs (no dependencies, no side effects).

const SEMVER =
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/

/** True when `value` is a valid semantic version (x.y.z with optional -prerelease and +build). */
export function isSemver(value) {
    return typeof value === 'string' && SEMVER.test(value)
}

/** Name of the app crate in src-tauri/Cargo.toml / Cargo.lock. */
export const CRATE_NAME = 'app'

/** Replaces the first top-level `"version": "..."` of a JSON text, keeping its formatting. */
export function setJsonVersion(text, version) {
    let done = false
    const out = text.replace(/("version"\s*:\s*)"[^"]*"/, (_match, prefix) => {
        done = true
        return `${prefix}"${version}"`
    })
    if (!done) throw new Error('no "version" field found')
    return out
}

/** Reads the root `version` of a JSON text. */
export function getJsonVersion(text) {
    const parsed = JSON.parse(text)
    if (typeof parsed.version !== 'string') throw new Error('no "version" field found')
    return parsed.version
}

/** Replaces the `version` of the `[package]` table of a Cargo.toml text. */
export function setCargoTomlVersion(text, version) {
    const lines = text.split('\n')
    let inPackage = false
    let done = false
    const out = lines.map((line) => {
        const header = /^\s*\[(.+)\]\s*$/.exec(line)
        if (header) inPackage = header[1] === 'package'
        if (inPackage && !done && /^\s*version\s*=/.test(line)) {
            done = true
            return line.replace(/(version\s*=\s*)"[^"]*"/, `$1"${version}"`)
        }
        return line
    })
    if (!done) throw new Error('no [package] version found in Cargo.toml')
    return out.join('\n')
}

/** Reads the `version` of the `[package]` table of a Cargo.toml text. */
export function getCargoTomlVersion(text) {
    let inPackage = false
    for (const line of text.split('\n')) {
        const header = /^\s*\[(.+)\]\s*$/.exec(line)
        if (header) inPackage = header[1] === 'package'
        const match = inPackage ? /^\s*version\s*=\s*"([^"]*)"/.exec(line) : null
        if (match) return match[1]
    }
    throw new Error('no [package] version found in Cargo.toml')
}

/** Replaces the version of the app crate in a Cargo.lock text (other packages are untouched). */
export function setCargoLockVersion(text, version, crate = CRATE_NAME) {
    const eol = text.includes('\r\n') ? '\r\n' : '\n'
    const lines = text.split(/\r?\n/)
    let done = false
    for (let i = 0; i < lines.length; i++) {
        if (lines[i] === `name = "${crate}"` && /^version\s*=/.test(lines[i + 1] ?? '')) {
            lines[i + 1] = `version = "${version}"`
            done = true
            break
        }
    }
    if (!done) throw new Error(`package "${crate}" not found in Cargo.lock`)
    return lines.join(eol)
}

/** Replaces the root version of a package-lock.json text (`version` and `packages[""].version`). */
export function setPackageLockVersion(text, version) {
    const lock = JSON.parse(text)
    lock.version = version
    if (lock.packages && lock.packages['']) lock.packages[''].version = version
    const eol = text.includes('\r\n') ? '\r\n' : '\n'
    const out = JSON.stringify(lock, null, 2) + '\n'
    return eol === '\r\n' ? out.replace(/\n/g, '\r\n') : out
}

/** Reads the version of the app crate in a Cargo.lock text. */
export function getCargoLockVersion(text, crate = CRATE_NAME) {
    const lines = text.split(/\r?\n/)
    for (let i = 0; i < lines.length; i++) {
        if (lines[i] === `name = "${crate}"`) {
            const match = /^version\s*=\s*"([^"]*)"/.exec(lines[i + 1] ?? '')
            if (match) return match[1]
        }
    }
    throw new Error(`package "${crate}" not found in Cargo.lock`)
}

/** Reads the root version of a package-lock.json text (`packages[""].version`, else the top-level `version`). */
export function getPackageLockVersion(text) {
    const lock = JSON.parse(text)
    const version = lock.packages?.['']?.version ?? lock.version
    if (typeof version !== 'string') throw new Error('no root version found in package-lock.json')
    return version
}

/** Version files: path relative to the repository root, and how to read them. */
export const VERSION_FILES = {
    packageJson: 'package.json',
    packageLock: 'package-lock.json',
    cargoToml: 'src-tauri/Cargo.toml',
    cargoLock: 'src-tauri/Cargo.lock',
    tauriConf: 'src-tauri/tauri.conf.json',
}

/**
 * Compares the release versions (the first entry is the reference).
 * @param {Record<string, string>} versions
 * @returns {string[]} one message per mismatch (empty when all match)
 */
export function findMismatches(versions) {
    const entries = Object.entries(versions)
    const reference = entries[0][1]
    return entries
        .filter(([, value]) => value !== reference)
        .map(([key, value]) => `${key} is ${value} but ${entries[0][0]} is ${reference}`)
}

/** True when a changelog has a "## [version]" section (Keep a Changelog heading). */
export function hasChangelogSection(text, version) {
    return text.split(/\r?\n/).some(line => line.startsWith(`## [${version}]`))
}

/** The changelogs every release needs a section in: the original and the Italian one shown in the app. */
export const CHANGELOG_FILES = ['CHANGELOG.md', 'CHANGELOG.it.md']

