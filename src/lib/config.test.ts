import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { applyEnvOverrides } from './config'

describe('applyEnvOverrides', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    // Clean slate — remove any override env vars
    delete process.env.OVERRIDE_POSTTEST_ENABLED
    delete process.env.OVERRIDE_POSTTEST_FORCE_PERIOD
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('does not modify the map when no override env vars are set', () => {
    const map = new Map([['posttest_enabled', 'false']])
    applyEnvOverrides(map)
    expect(map.get('posttest_enabled')).toBe('false')
    expect(map.has('posttest_force_period')).toBe(false)
  })

  it('overrides posttest_enabled when OVERRIDE_POSTTEST_ENABLED is set', () => {
    process.env.OVERRIDE_POSTTEST_ENABLED = 'true'
    const map = new Map([['posttest_enabled', 'false']])
    applyEnvOverrides(map)
    expect(map.get('posttest_enabled')).toBe('true')
  })

  it('inserts posttest_enabled when the key is absent in the db map', () => {
    process.env.OVERRIDE_POSTTEST_ENABLED = 'true'
    const map = new Map<string, string>()
    applyEnvOverrides(map)
    expect(map.get('posttest_enabled')).toBe('true')
  })

  it('overrides posttest_force_period when OVERRIDE_POSTTEST_FORCE_PERIOD is set', () => {
    process.env.OVERRIDE_POSTTEST_FORCE_PERIOD = 'final'
    const map = new Map([['posttest_force_period', 'midterm']])
    applyEnvOverrides(map)
    expect(map.get('posttest_force_period')).toBe('final')
  })

  it('ignores empty string env vars (treats them as unset)', () => {
    process.env.OVERRIDE_POSTTEST_ENABLED = ''
    const map = new Map([['posttest_enabled', 'false']])
    applyEnvOverrides(map)
    expect(map.get('posttest_enabled')).toBe('false')
  })

  it('applies multiple overrides at once', () => {
    process.env.OVERRIDE_POSTTEST_ENABLED = 'true'
    process.env.OVERRIDE_POSTTEST_FORCE_PERIOD = 'final'
    const map = new Map<string, string>()
    applyEnvOverrides(map)
    expect(map.get('posttest_enabled')).toBe('true')
    expect(map.get('posttest_force_period')).toBe('final')
  })

  it('preserves other config keys untouched', () => {
    process.env.OVERRIDE_POSTTEST_ENABLED = 'true'
    const map = new Map([
      ['posttest_enabled', 'false'],
      ['parasite_unlock', '2026-12-01'],
    ])
    applyEnvOverrides(map)
    expect(map.get('posttest_enabled')).toBe('true')
    expect(map.get('parasite_unlock')).toBe('2026-12-01')
  })
})
