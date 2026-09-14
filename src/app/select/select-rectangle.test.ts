import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

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
 *
 * The rectangle that matters is the one a player actually SEES — the
 * circular badge inside each webp — not the image's own bounding box.
 * Every one of the 4 assets has extra transparent canvas around the
 * circle to make room for a curved label ("Bacteria" / "Fungi" / ...)
 * that pokes out in a different direction per asset, so the circle sits
 * off-center within its bounding box by a different amount for every
 * card. This test measures each circle's real position via the webp's
 * alpha channel (see `circleOffsetFraction` below) and checks that those
 * circle centers — not the raw CSS box centers — land on a rectangle.
 */

const dirname = path.dirname(fileURLToPath(import.meta.url))
const pageTsx = readFileSync(path.join(dirname, 'page.tsx'), 'utf8')
const globalsCss = readFileSync(path.join(dirname, '../globals.css'), 'utf8')
const assetsDir = path.join(dirname, '../../../public/assets/game-selection')

type Card = 'bacteria' | 'parasite' | 'fungi' | 'virus'
type Style = Partial<Record<'top' | 'left' | 'right' | 'bottom' | 'width', string>>

const CARDS: Card[] = ['bacteria', 'parasite', 'fungi', 'virus']
const ASSET_FILE: Record<Card, string> = {
  bacteria: 'bateria_level.webp',
  parasite: 'parasite_level.webp',
  fungi: 'fungi_select.webp',
  virus: 'virus_select.webp',
}
const CLASS_NAME: Record<Card, string> = {
  bacteria: 'select-bacteria-card',
  parasite: 'select-parasite-card',
  fungi: 'select-fungi-card',
  virus: 'select-virus-card',
}
// fungi/virus are horizontally centered on their `left` via Tailwind's -translate-x-1/2
const CENTERED_X: Record<Card, boolean> = {
  bacteria: false,
  parasite: false,
  fungi: true,
  virus: true,
}

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

// --- find the visible circle badge's bounding box via the alpha channel, and return
// how far its center sits from the *image's own* bounding-box center, as a fraction
// of the image's width/height (so the correction scales with however big the card is
// rendered). The circle produces a much longer contiguous opaque run per row than the
// thin curved label text does, which is what separates "circle row" from "label row".
async function circleOffsetFraction(file: string): Promise<{ x: number; y: number }> {
  const { data, info } = await sharp(path.join(assetsDir, file))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const { width, height, channels } = info

  const rows = new Array<{ start: number; len: number }>(height)
  let maxRunLen = 0
  for (let y = 0; y < height; y++) {
    let runStart = -1
    let bestStart = 0
    let bestLen = 0
    for (let x = 0; x <= width; x++) {
      const opaque = x < width && data[(y * width + x) * channels + 3] > 128
      if (opaque) {
        if (runStart === -1) runStart = x
      } else if (runStart !== -1) {
        const len = x - runStart
        if (len > bestLen) { bestLen = len; bestStart = runStart }
        runStart = -1
      }
    }
    rows[y] = { start: bestStart, len: bestLen }
    if (bestLen > maxRunLen) maxRunLen = bestLen
  }

  const threshold = maxRunLen * 0.5
  let minX = width, maxX = 0, minY = height, maxY = 0
  for (let y = 0; y < height; y++) {
    const row = rows[y]
    if (row.len < threshold) continue
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)
    minX = Math.min(minX, row.start)
    maxX = Math.max(maxX, row.start + row.len)
  }

  const circleCx = (minX + maxX) / 2
  const circleCy = (minY + maxY) / 2
  return { x: circleCx / width - 0.5, y: circleCy / height - 0.5 }
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
    const m = rawDecl.match(/(top|left|right|bottom|width)\s*:\s*"?(-?[\w.%]+)"?/)
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

// Every declaration on this page (base styles + every breakpoint override) is
// vw-only on both axes — see the comments in page.tsx / globals.css for why.
function vwToPx(raw: string, viewportW: number): number {
  const m = raw.match(/^(-?[\d.]+)vw$/)
  if (!m) throw new Error(`Expected a vw length, got: "${raw}"`)
  return (parseFloat(m[1]) / 100) * viewportW
}

const ASPECT: Record<Card, number> = {
  bacteria: webpAspectRatio(ASSET_FILE.bacteria),
  parasite: webpAspectRatio(ASSET_FILE.parasite),
  fungi: webpAspectRatio(ASSET_FILE.fungi),
  virus: webpAspectRatio(ASSET_FILE.virus),
}

const BASE_STYLE: Record<Card, Style> = {
  bacteria: extractBaseStyle('bacteria'),
  parasite: extractBaseStyle('parasite'),
  fungi: extractBaseStyle('fungi'),
  virus: extractBaseStyle('virus'),
}

const IPAD_MARKER = 'min-width: 768px) and (max-width: 1366px)'
const SHORT_TABLET_MARKER = 'max-height: 650px'
const IPHONE_MARKER = 'max-height: 500px'

function resolvedStyle(card: Card, viewportW: number, viewportH: number, coarsePointer: boolean) {
  let style = BASE_STYLE[card]
  const landscape = viewportW > viewportH
  if (coarsePointer && landscape && viewportW >= 768 && viewportW <= 1366) {
    style = mergeStyle(style, extractOverrideStyle(IPAD_MARKER, card))
  }
  // shorter than a real iPad but still tablet-width (e.g. 1242x602-1364x602,
  // reported as overlapping) — see globals.css comment above that block.
  if (coarsePointer && landscape && viewportW >= 768 && viewportW <= 1366 && viewportH <= 650) {
    style = mergeStyle(style, extractOverrideStyle(SHORT_TABLET_MARKER, card))
  }
  if (coarsePointer && landscape && viewportH <= 500) {
    style = mergeStyle(style, extractOverrideStyle(IPHONE_MARKER, card))
  }
  return style
}

describe('/select page — 4-card rectangle alignment', () => {
  let CIRCLE_OFFSET: Record<Card, { x: number; y: number }>

  beforeAll(async () => {
    const entries = await Promise.all(CARDS.map(async (card) => [card, await circleOffsetFraction(ASSET_FILE[card])] as const))
    CIRCLE_OFFSET = Object.fromEntries(entries) as Record<Card, { x: number; y: number }>
  })

  it("every card's circle badge is measurably off-center in its own canvas", () => {
    // sanity check on the measurement itself: if this ever starts failing because
    // an asset was re-exported cropped tight to the circle, the hand-tuned CSS
    // offsets in page.tsx / globals.css need to be re-derived for the new art.
    for (const card of CARDS) {
      expect(Math.abs(CIRCLE_OFFSET[card].x) + Math.abs(CIRCLE_OFFSET[card].y)).toBeGreaterThan(0.01)
    }
  })

  // The *visible circle's* center, in px, for a card resolved at a given viewport —
  // this is the CSS box center shifted by that card's measured circle offset.
  function circleCenterOf(card: Card, style: Style, viewportW: number, viewportH: number) {
    if (!style.width) throw new Error(`${card}: no width resolved`)
    const width = vwToPx(style.width, viewportW)
    const height = width * ASPECT[card]

    let boxCx: number
    if (style.left !== undefined) {
      const leftPx = vwToPx(style.left, viewportW)
      boxCx = CENTERED_X[card] ? leftPx : leftPx + width / 2
    } else if (style.right !== undefined) {
      boxCx = viewportW - vwToPx(style.right, viewportW) - width / 2
    } else {
      throw new Error(`${card}: neither left nor right resolved`)
    }

    let boxCy: number
    if (style.top !== undefined) {
      boxCy = vwToPx(style.top, viewportW) + height / 2
    } else if (style.bottom !== undefined) {
      boxCy = viewportH - vwToPx(style.bottom, viewportW) - height / 2
    } else {
      throw new Error(`${card}: neither top nor bottom resolved`)
    }

    const offset = CIRCLE_OFFSET[card]
    return { cx: boxCx + offset.x * width, cy: boxCy + offset.y * height }
  }

  // Top/bottom pixel edges of a card's CSS box (not the circle) — used only to
  // catch the two rows physically overlapping, independent of whether their
  // circle centers happen to be aligned.
  function verticalBoxEdges(style: Style, viewportW: number, viewportH: number, aspect: number) {
    if (!style.width) throw new Error('no width resolved')
    const width = vwToPx(style.width, viewportW)
    const height = width * aspect
    const top = style.top !== undefined
      ? vwToPx(style.top, viewportW)
      : viewportH - vwToPx(style.bottom!, viewportW) - height
    return { top, bottom: top + height }
  }

  function circleCentersFor(viewportW: number, viewportH: number, coarsePointer: boolean) {
    const centers = {} as Record<Card, { cx: number; cy: number }>
    for (const card of CARDS) {
      centers[card] = circleCenterOf(card, resolvedStyle(card, viewportW, viewportH, coarsePointer), viewportW, viewportH)
    }
    return centers
  }

  function expectRectangle(viewportW: number, viewportH: number, coarsePointer: boolean, tolerancePx: number) {
    const { bacteria, virus, fungi, parasite } = circleCentersFor(viewportW, viewportH, coarsePointer)
    // top row: bacteria (TL) / virus (TR) share center-y
    expect(Math.abs(bacteria.cy - virus.cy)).toBeLessThanOrEqual(tolerancePx)
    // bottom row: fungi (BL) / parasite (BR) share center-y
    expect(Math.abs(fungi.cy - parasite.cy)).toBeLessThanOrEqual(tolerancePx)
    // left column: bacteria (TL) / fungi (BL) share center-x
    expect(Math.abs(bacteria.cx - fungi.cx)).toBeLessThanOrEqual(tolerancePx)
    // right column: virus (TR) / parasite (BR) share center-x
    expect(Math.abs(virus.cx - parasite.cx)).toBeLessThanOrEqual(tolerancePx)

    // rows must not physically collide, regardless of how well-aligned their
    // circle centers are (this is what "1242x602 through 1364x602 overlap"
    // actually reported: the boxes touching, not a rectangle-shape mismatch).
    const bacteriaBox = verticalBoxEdges(resolvedStyle('bacteria', viewportW, viewportH, coarsePointer), viewportW, viewportH, ASPECT.bacteria)
    const parasiteBox = verticalBoxEdges(resolvedStyle('parasite', viewportW, viewportH, coarsePointer), viewportW, viewportH, ASPECT.parasite)
    expect(bacteriaBox.bottom).toBeLessThanOrEqual(parasiteBox.top)
  }

  // Every breakpoint is vw-only on both axes with the circle-offset correction baked
  // in (see page.tsx / globals.css comments), so all of them get the same tight,
  // sub-pixel tolerance — including desktop, which previously only got a loose 15px
  // tolerance because its `top`/`bottom` were `%` (height-relative) before this fix.
  describe('desktop (mouse)', () => {
    it.each([
      ['1440x900', 1440, 900],
      ['1920x1080', 1920, 1080],
      ['1280x800', 1280, 800],
    ])('%s', (_label, w, h) => {
      expectRectangle(w, h, false, 2)
    })
  })

  describe('iPad landscape (touch, 768-1366px wide)', () => {
    it.each([
      ['iPad mini', 1024, 768],
      ['iPad Air', 1180, 820],
      ['iPad Pro', 1366, 1024],
    ])('%s (%dx%d)', (_label, w, h) => {
      expectRectangle(w, h, true, 2)
    })
  })

  describe('short tablet-width landscape (touch, 768-1366px wide, <=650px tall)', () => {
    // regression case: reported as overlapping (bacteria/parasite rows colliding)
    // when the iPad block's taller-aspect-ratio margins applied to a much
    // shorter tablet-width viewport.
    it.each([
      ['reported overlap, narrow end', 1242, 602],
      ['reported overlap, wide end', 1364, 602],
      ['shortest supported height', 1366, 590],
    ])('%s (%dx%d)', (_label, w, h) => {
      expectRectangle(w, h, true, 2)
    })
  })

  describe('iPhone landscape (touch, <=500px tall)', () => {
    it.each([
      ['iPhone 12', 844, 390],
      ['iPhone 16 Pro Max', 956, 440],
      ['iPhone 15 Pro Max', 932, 430],
    ])('%s (%dx%d)', (_label, w, h) => {
      expectRectangle(w, h, true, 2)
    })
  })
})
