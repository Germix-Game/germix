import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * The 4 level-select cards (bacteria/parasite = playable corners,
 * fungi/virus = locked corners) are meant to form a rectangle: each pair
 * that shares a top/bottom edge should have matching center-y, and each
 * pair that shares a left/right edge should have matching center-x —
 * see AGENTS.md-linked PRs for the bacteria(TL)/virus(TR)/fungi(BL)/
 * parasite(BR) layout. This reads the real CSS (page.tsx inline styles +
 * the device-specific globals.css overrides) rather than duplicating the
 * numbers here, so a future edit that nudges one card's position without
 * mirroring its counterpart fails this test instead of silently drifting
 * (this caught a real bug: fungi/virus `left` values on the iPad/iPhone
 * breakpoints weren't actually under bacteria/parasite's columns).
 */

const dirname = path.dirname(fileURLToPath(import.meta.url))
const pageTsx = readFileSync(path.join(dirname, 'page.tsx'), 'utf8')
const globalsCss = readFileSync(path.join(dirname, '../globals.css'), 'utf8')
const assetsDir = path.join(dirname, '../../../public/assets/game-selection')

type Card = 'bacteria' | 'parasite' | 'fungi' | 'virus'
type Style = Partial<Record<'top' | 'left' | 'right' | 'bottom' | 'width', string>>

// --- read each card's real intrinsic aspect ratio straight from its webp header,
// so the test tracks reality if an asset is ever swapped for a differently-shaped one.
function webpAspectRatio(file: string): number {
  const buf = readFileSync(path.join(assetsDir, file))
  const fourcc = buf.toString('ascii', 12, 16)
  let w: number, h: number
  if (fourcc === 'VP8X') {
    w = 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16))
    h = 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16))
  } else if (fourcc === 'VP8L') {
    const b0 = buf[21], b1 = buf[22], b2 = buf[23], b3 = buf[24]
    w = 1 + (((b1 & 0x3f) << 8) | b0)
    h = 1 + (((b3 & 0xf) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6))
  } else if (fourcc === 'VP8 ') {
    w = buf.readUInt16LE(26) & 0x3fff
    h = buf.readUInt16LE(28) & 0x3fff
  } else {
    throw new Error(`Unrecognized webp chunk "${fourcc}" in ${file}`)
  }
  return h / w
}

const ASPECT: Record<Card, number> = {
  bacteria: webpAspectRatio('bateria_level.webp'),
  parasite: webpAspectRatio('parasite_level.webp'),
  fungi: webpAspectRatio('fungi_select.webp'),
  virus: webpAspectRatio('virus_select.webp'),
}

// fungi/virus are horizontally centered on their `left` via Tailwind's -translate-x-1/2
const CENTERED_X: Record<Card, boolean> = {
  bacteria: false,
  parasite: false,
  fungi: true,
  virus: true,
}

const CLASS_NAME: Record<Card, string> = {
  bacteria: 'select-bacteria-card',
  parasite: 'select-parasite-card',
  fungi: 'select-fungi-card',
  virus: 'select-virus-card',
}

// --- extract the literal `style={{ ... }}` that follows a card's className in page.tsx
function extractBaseStyle(card: Card): Style {
  const marker = CLASS_NAME[card]
  const markerIndex = pageTsx.indexOf(marker)
  if (markerIndex === -1) throw new Error(`"${marker}" not found in page.tsx`)
  const styleMatch = pageTsx.slice(markerIndex, markerIndex + 400).match(/style=\{\{([^}]*)\}\}/)
  if (!styleMatch) throw new Error(`No style={{...}} found near "${marker}" in page.tsx`)
  return parseDeclarations(styleMatch[1], ',')
}

// --- extract one `.select-x-card { ... }` rule body from a specific @media block in globals.css
function extractOverrideStyle(mediaMarker: string, card: Card): Style {
  const mediaIndex = globalsCss.indexOf(mediaMarker)
  if (mediaIndex === -1) throw new Error(`Media query containing "${mediaMarker}" not found in globals.css`)
  const blockStart = globalsCss.indexOf('{', mediaIndex)
  let depth = 0
  let blockEnd = blockStart
  for (let i = blockStart; i < globalsCss.length; i++) {
    if (globalsCss[i] === '{') depth++
    if (globalsCss[i] === '}') depth--
    if (depth === 0) { blockEnd = i; break }
  }
  const blockText = globalsCss.slice(blockStart, blockEnd + 1)

  const selector = `.${CLASS_NAME[card]}`
  const ruleIndex = blockText.indexOf(selector)
  if (ruleIndex === -1) throw new Error(`"${selector}" not found in media block "${mediaMarker}"`)
  const ruleStart = blockText.indexOf('{', ruleIndex)
  const ruleEnd = blockText.indexOf('}', ruleStart)
  return parseDeclarations(blockText.slice(ruleStart + 1, ruleEnd), ';')
}

function parseDeclarations(text: string, separator: ',' | ';'): Style {
  const style: Style = {}
  for (const rawDecl of text.split(separator)) {
    const m = rawDecl.match(/(top|left|right|bottom|width)\s*:\s*"?([\w.%]+)"?/)
    if (m) style[m[1] as keyof Style] = m[2]
  }
  return style
}

// --- merge an override on top of a base style, the way `!important` rules do;
// an explicit `auto` clears that side rather than being treated as a value.
function mergeStyle(base: Style, override?: Style): Style {
  if (!override) return base
  const merged = { ...base }
  for (const [key, value] of Object.entries(override)) {
    if (value === 'auto') delete merged[key as keyof Style]
    else merged[key as keyof Style] = value
  }
  return merged
}

function lengthToPx(raw: string, viewportW: number, viewportH: number, axis: 'x' | 'y'): number {
  const m = raw.match(/^(-?[\d.]+)(vw|%)$/)
  if (!m) throw new Error(`Unparsable CSS length: "${raw}"`)
  const value = parseFloat(m[1])
  const unit = m[2]
  // `vw` is always a fraction of viewport WIDTH regardless of which axis it's
  // applied to; `%` on top/bottom is relative to height, left/right/width to width.
  if (unit === 'vw') return (value / 100) * viewportW
  return (value / 100) * (axis === 'x' ? viewportW : viewportH)
}

function centerOf(card: Card, style: Style, viewportW: number, viewportH: number) {
  if (!style.width) throw new Error(`${card}: no width resolved`)
  const width = lengthToPx(style.width, viewportW, viewportH, 'x')
  const height = width * ASPECT[card]

  let cx: number
  if (style.left !== undefined) {
    const leftPx = lengthToPx(style.left, viewportW, viewportH, 'x')
    cx = CENTERED_X[card] ? leftPx : leftPx + width / 2
  } else if (style.right !== undefined) {
    const rightPx = lengthToPx(style.right, viewportW, viewportH, 'x')
    cx = viewportW - rightPx - width / 2
  } else {
    throw new Error(`${card}: neither left nor right resolved`)
  }

  let cy: number
  if (style.top !== undefined) {
    cy = lengthToPx(style.top, viewportW, viewportH, 'y') + height / 2
  } else if (style.bottom !== undefined) {
    cy = viewportH - lengthToPx(style.bottom, viewportW, viewportH, 'y') - height / 2
  } else {
    throw new Error(`${card}: neither top nor bottom resolved`)
  }

  return { cx, cy }
}

const BASE_STYLE: Record<Card, Style> = {
  bacteria: extractBaseStyle('bacteria'),
  parasite: extractBaseStyle('parasite'),
  fungi: extractBaseStyle('fungi'),
  virus: extractBaseStyle('virus'),
}

const IPAD_MARKER = 'min-width: 768px) and (max-width: 1366px)'
const IPHONE_MARKER = 'max-height: 500px'

function resolvedStyle(card: Card, viewportW: number, viewportH: number, coarsePointer: boolean) {
  let style = BASE_STYLE[card]
  const landscape = viewportW > viewportH
  if (coarsePointer && landscape && viewportW >= 768 && viewportW <= 1366) {
    style = mergeStyle(style, extractOverrideStyle(IPAD_MARKER, card))
  }
  if (coarsePointer && landscape && viewportH <= 500) {
    style = mergeStyle(style, extractOverrideStyle(IPHONE_MARKER, card))
  }
  return style
}

function centersFor(viewportW: number, viewportH: number, coarsePointer: boolean) {
  const cards: Card[] = ['bacteria', 'parasite', 'fungi', 'virus']
  const centers = {} as Record<Card, { cx: number; cy: number }>
  for (const card of cards) {
    centers[card] = centerOf(card, resolvedStyle(card, viewportW, viewportH, coarsePointer), viewportW, viewportH)
  }
  return centers
}

function expectRectangle(viewportW: number, viewportH: number, coarsePointer: boolean, tolerancePx: number) {
  const { bacteria, virus, fungi, parasite } = centersFor(viewportW, viewportH, coarsePointer)
  // top row: bacteria (TL) / virus (TR) share center-y
  expect(Math.abs(bacteria.cy - virus.cy)).toBeLessThanOrEqual(tolerancePx)
  // bottom row: fungi (BL) / parasite (BR) share center-y
  expect(Math.abs(fungi.cy - parasite.cy)).toBeLessThanOrEqual(tolerancePx)
  // left column: bacteria (TL) / fungi (BL) share center-x
  expect(Math.abs(bacteria.cx - fungi.cx)).toBeLessThanOrEqual(tolerancePx)
  // right column: virus (TR) / parasite (BR) share center-x
  expect(Math.abs(virus.cx - parasite.cx)).toBeLessThanOrEqual(tolerancePx)
}

describe('/select page — 4-card rectangle alignment', () => {
  describe('desktop (mouse, base styles only)', () => {
    // Base styles mix `%` (height-relative on top/bottom) with viewport width,
    // so exact row alignment is inherently aspect-ratio dependent — columns are
    // exact (both axes resolve from width only), rows get a generous tolerance.
    it.each([
      ['1440x900', 1440, 900],
      ['1920x1080', 1920, 1080],
      ['1280x800', 1280, 800],
    ])('%s', (_label, w, h) => {
      expectRectangle(w, h, false, 15)
    })
  })

  describe('iPad landscape (touch, 768-1366px wide)', () => {
    // Every override here is vw-only on both axes, so alignment is exact
    // regardless of the device's actual aspect ratio — tight tolerance.
    it.each([
      ['iPad mini', 1024, 768],
      ['iPad Air', 1180, 820],
      ['iPad Pro', 1366, 1024],
    ])('%s (%dx%d)', (_label, w, h) => {
      expectRectangle(w, h, true, 1)
    })
  })

  describe('iPhone landscape (touch, <=500px tall)', () => {
    it.each([
      ['iPhone 12', 844, 390],
      ['iPhone 16 Pro Max', 956, 440],
      ['iPhone 15 Pro Max', 932, 430],
    ])('%s (%dx%d)', (_label, w, h) => {
      expectRectangle(w, h, true, 1)
    })
  })
})
