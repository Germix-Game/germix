import { prisma } from '@/lib/prisma'

/**
 * Environment-variable overrides for the Config table.
 *
 * Each entry maps a server-side env-var name to the Config.key it overrides.
 * When the env var is set (non-empty), its value is written into the map,
 * winning over whatever the database had. When unset or empty, the DB value
 * (if any) is kept as-is.
 *
 * Add new overrides here as needed — the rest of the pipeline is automatic.
 */
const ENV_OVERRIDES: ReadonlyArray<{ envVar: string; configKey: string }> = [
  { envVar: 'OVERRIDE_POSTTEST_ENABLED', configKey: 'posttest_enabled' },
  { envVar: 'OVERRIDE_POSTTEST_FORCE_PERIOD', configKey: 'posttest_force_period' },
]

/**
 * Apply environment-variable overrides to a config map.
 * This is a pure function (no DB access) so it's easy to test.
 */
export function applyEnvOverrides(configMap: Map<string, string>): Map<string, string> {
  for (const { envVar, configKey } of ENV_OVERRIDES) {
    const value = process.env[envVar]
    if (value !== undefined && value !== '') {
      configMap.set(configKey, value)
    }
  }
  return configMap
}

/**
 * Load all Config rows from the database and return them as a Map with
 * environment-variable overrides applied.
 *
 * Use this instead of inlining `prisma.config.findMany()` + `new Map(…)` so
 * that env-var overrides are applied consistently across every route.
 */
export async function loadConfigMap(): Promise<Map<string, string>> {
  const configs = await prisma.config.findMany()
  const configMap = new Map(configs.map(c => [c.key, c.value]))
  return applyEnvOverrides(configMap)
}
