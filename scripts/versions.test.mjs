import { describe, expect, it } from 'vitest'
import {
    findMismatches,
    getCargoLockVersion,
    getCargoTomlVersion,
    getJsonVersion,
    getPackageLockVersion,
    isSemver,
    setCargoLockVersion,
    setCargoTomlVersion,
    setJsonVersion,
    setPackageLockVersion,
} from './versions.mjs'

describe('isSemver', () => {
    it('accepts valid versions', () => {
        for (const v of ['0.1.0', '1.2.3', '10.20.30', '1.0.0-rc.1', '1.0.0-beta', '1.0.0+build.5']) {
            expect(isSemver(v)).toBe(true)
        }
    })
    it('rejects invalid versions', () => {
        for (const v of ['1', '1.2', '1.2.3.4', 'v1.2.3', '01.2.3', '1.2.x', '', ' 1.2.3', undefined, 5]) {
            expect(isSemver(v)).toBe(false)
        }
    })
})

describe('json versions', () => {
    const text = '{\n  "name": "x",\n  "version": "0.1.0",\n  "other": { "version": "9" }\n}\n'
    it('replaces only the first version keeping the formatting', () => {
        expect(setJsonVersion(text, '1.0.0')).toBe(text.replace('"0.1.0"', '"1.0.0"'))
    })
    it('reads the root version', () => {
        expect(getJsonVersion(text)).toBe('0.1.0')
    })
    it('throws without a version field', () => {
        expect(() => setJsonVersion('{}', '1.0.0')).toThrow()
        expect(() => getJsonVersion('{}')).toThrow()
    })
})

describe('Cargo.toml', () => {
    const toml = '[package]\nname = "app"\nversion = "0.1.0"\n\n[dependencies]\nserde = { version = "1" }\nlog = "0.4"\n'
    it('replaces only the package version', () => {
        const out = setCargoTomlVersion(toml, '2.0.0')
        expect(out).toContain('version = "2.0.0"')
        expect(out).toContain('serde = { version = "1" }')
        expect(getCargoTomlVersion(out)).toBe('2.0.0')
    })
    it('throws without a package version', () => {
        expect(() => setCargoTomlVersion('[dependencies]\nversion = "1"\n', '1.0.0')).toThrow()
        expect(() => getCargoTomlVersion('[dependencies]\n')).toThrow()
    })
})

describe('Cargo.lock', () => {
    const lock = 'version = 4\n\n[[package]]\nname = "app"\nversion = "0.1.0"\ndependencies = [\n "log",\n]\n\n[[package]]\nname = "log"\nversion = "0.4.0"\n'
    it('updates only the app package', () => {
        const out = setCargoLockVersion(lock, '0.2.0')
        expect(out).toContain('name = "app"\nversion = "0.2.0"')
        expect(out).toContain('name = "log"\nversion = "0.4.0"')
    })
    it('keeps CRLF line endings', () => {
        const out = setCargoLockVersion(lock.replace(/\n/g, '\r\n'), '0.2.0')
        expect(out).toContain('name = "app"\r\nversion = "0.2.0"')
        expect(out).not.toMatch(/[^\r]\n/)
    })
    it('throws when the package is missing', () => {
        expect(() => setCargoLockVersion('[[package]]\nname = "x"\nversion = "1"\n', '1.0.0')).toThrow()
    })
})

describe('package-lock.json', () => {
    it('updates the root version and the root package entry', () => {
        const lock = JSON.stringify({ name: 'x', version: '0.1.0', packages: { '': { version: '0.1.0' }, 'node_modules/a': { version: '5.0.0' } } }, null, 2) + '\n'
        const out = JSON.parse(setPackageLockVersion(lock, '3.0.0'))
        expect(out.version).toBe('3.0.0')
        expect(out.packages[''].version).toBe('3.0.0')
        expect(out.packages['node_modules/a'].version).toBe('5.0.0')
    })
})

describe('lock file readers', () => {
    it('reads the app crate version from Cargo.lock (LF and CRLF)', () => {
        const lock = 'version = 4\n\n[[package]]\nname = "app"\nversion = "0.3.0"\n\n[[package]]\nname = "log"\nversion = "0.4.0"\n'
        expect(getCargoLockVersion(lock)).toBe('0.3.0')
        expect(getCargoLockVersion(lock.replace(/\n/g, '\r\n'))).toBe('0.3.0')
        expect(getCargoLockVersion(lock, 'log')).toBe('0.4.0')
        expect(() => getCargoLockVersion(lock, 'nope')).toThrow()
    })
    it('reads the root version from package-lock.json', () => {
        const lock = JSON.stringify({ version: '0.1.0', packages: { '': { version: '0.2.0' }, 'node_modules/a': { version: '5.0.0' } } })
        expect(getPackageLockVersion(lock)).toBe('0.2.0')
        expect(getPackageLockVersion(JSON.stringify({ version: '1.0.0' }))).toBe('1.0.0')
        expect(() => getPackageLockVersion('{}')).toThrow()
    })
})

describe('findMismatches', () => {
    it('is empty when the versions match', () => {
        expect(findMismatches({ packageJson: '1.0.0', cargoToml: '1.0.0', tauriConf: '1.0.0' })).toEqual([])
    })
    it('lists each file that differs', () => {
        const out = findMismatches({ packageJson: '1.0.0', cargoToml: '1.0.1', tauriConf: '1.0.0' })
        expect(out).toHaveLength(1)
        expect(out[0]).toContain('cargoToml')
    })
})
