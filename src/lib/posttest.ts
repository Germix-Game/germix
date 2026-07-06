import { PostTestPeriod } from '@prisma/client'

// Parse a Config datetime string. Per the seed convention, values WITHOUT an
// explicit timezone offset (e.g. "2026-10-05 00:00") are interpreted as
// Asia/Bangkok time (UTC+7). Values that already carry an offset or 'Z'
// (e.g. "2026-10-05T00:00:00+07:00") are parsed as-is. Returns null for
// missing/invalid values.
function parseConfigDate(value: string | undefined): Date | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null

  const hasTz = /(z|[+-]\d{2}:?\d{2})$/i.test(trimmed)
  const iso = trimmed.replace(' ', 'T') + (hasTz ? '' : '+07:00')

  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d
}

// Which post-test period, if any, is active RIGHT NOW based on the exam windows
// stored in Config. The API is date-driven (spec §10, §16): the post-test is
// required only while today falls inside a `posttest_start_*`..`posttest_end_*`
// window. Midterm takes precedence if windows ever overlap. Returns null when no
// window is active — meaning the post-test is disabled and play is unlocked.
//
// `posttest_enabled=true` is a manual override for testing: it forces the
// post-test on for `posttest_force_period` (defaults to midterm) regardless of
// the date window. Whether an individual player is still blocked depends on
// the normal PostTest.playerId_period lookup in the calling route — this
// override only decides which period (if any) is "active", not who has
// already submitted.
export function getActivePosttestPeriod(
  configMap: Map<string, string>,
  now: Date = new Date(),
): PostTestPeriod | null {
  if (configMap.get('posttest_enabled') === 'true') {
    return configMap.get('posttest_force_period')?.trim().toUpperCase() === 'FINAL'
      ? PostTestPeriod.FINAL
      : PostTestPeriod.MIDTERM
  }

  const inWindow = (startKey: string, endKey: string) => {
    const start = parseConfigDate(configMap.get(startKey))
    const end = parseConfigDate(configMap.get(endKey))
    if (!start || !end) return false
    return now >= start && now <= end
  }

  if (inWindow('posttest_start_midterm', 'posttest_end_midterm')) return PostTestPeriod.MIDTERM
  if (inWindow('posttest_start_final', 'posttest_end_final')) return PostTestPeriod.FINAL
  return null
}
