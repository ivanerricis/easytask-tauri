#!/usr/bin/env node
// Fails (exit 1) when package.json, package-lock.json, src-tauri/Cargo.toml, src-tauri/Cargo.lock and\n// src-tauri/tauri.conf.json disagree on the version.
// When a tag is given (first argument or GITHUB_REF_NAME like v1.2.3) it must match too.
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
    findMismatches,
    getCargoLockVersion,
    getCargoTomlVersion,
    getJsonVersion,
    getPackageLockVersion,
    VERSION_FILES,
} from './versions.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (file) => readFileSync(path.join(root, file), 'utf8')

const versions = {
    packageJson: getJsonVersion(read(VERSION_FILES.packageJson)),
    packageLock: getPackageLockVersion(read(VERSION_FILES.packageLock)),
    cargoToml: getCargoTomlVersion(read(VERSION_FILES.cargoToml)),
    cargoLock: getCargoLockVersion(read(VERSION_FILES.cargoLock)),
    tauriConf: getJsonVersion(read(VERSION_FILES.tauriConf)),
}

const problems = findMismatches(versions)
const tag = process.argv[2] ?? (/^v\d/.test(process.env.GITHUB_REF_NAME ?? '') ? process.env.GITHUB_REF_NAME : undefined)
if (tag && tag.replace(/^v/, '') !== versions.packageJson) {
    problems.push(`tag ${tag} does not match the version ${versions.packageJson}`)
}

if (problems.length > 0) {
    console.error('Version mismatch:')
    for (const problem of problems) console.error(`  - ${problem}`)
    process.exit(1)
}
console.log(`Versions in sync: ${versions.packageJson}`)
