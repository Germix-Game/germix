import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    gameSession: { findUnique: vi.fn() },
    sessionMicrobe: { findUnique: vi.fn() },
    $queryRaw: vi.fn(),
  },
}))

vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn(),
  requireOwner: vi.fn(),
}))

import { NextRequest } from 'next/server'
import { POST } from './route'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

const SESSION_ID = 'session-1'
const PLAYER_ID = 'player-1'

function makeRequest(body: unknown) {
  return new NextRequest(`http://localhost/api/sessions/${SESSION_ID}/reveal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const ctx = { params: Promise.resolve({ id: SESSION_ID }) }

const mockPlayer = { id: PLAYER_ID }

// One clue per slot category, in sortOrder. selectSlotClues maps these onto the
// fixed slot layout: slot 0 → Gram stain / morphology, 1 → virulence,
// 2 → lab, 3 → special trait, 4 → clinical.
const mockClueCards = [
  { sortOrder: 0, clueCard: { category: 'GRAM_STAIN',             label: 'Gram +',    imageUrl: '/g.png' } },
  { sortOrder: 1, clueCard: { category: 'VIRULENCE_FACTOR',       label: 'Capsule',   imageUrl: '/v.png' } },
  { sortOrder: 2, clueCard: { category: 'LAB_CHARACTERISTIC',     label: 'Catalase+', imageUrl: '/l.png' } },
  { sortOrder: 3, clueCard: { category: 'SPECIAL_TRAIT',          label: 'Tumbling',  imageUrl: '/s.png' } },
  { sortOrder: 4, clueCard: { category: 'CLINICAL_MANIFESTATION', label: 'Abscess',   imageUrl: '/c.png' } },
]

const mockSession = {
  id: SESSION_ID,
  playerId: PLAYER_ID,
  completed: false,
  abandoned: false,
  heartsLeft: 3,
  _count: { scores: 0 },
}

const mockSessionMicrobe = {
  sessionId: SESSION_ID,
  roundNumber: 1,
  microbeId: 'microbe-1',
  revealedSlots: [] as number[],
  microbe: { clues: mockClueCards },
}

describe('POST /api/sessions/:id/reveal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuth).mockResolvedValue(mockPlayer as never)
    vi.mocked(prisma.gameSession.findUnique).mockResolvedValue(mockSession as never)
    vi.mocked(prisma.sessionMicrobe.findUnique).mockResolvedValue(mockSessionMicrobe as never)
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ revealedSlots: [0] }] as never)
  })

  describe('input validation', () => {
    it('returns 422 for slotIndex below 0', async () => {
      const res = await POST(makeRequest({ slotIndex: -1 }), ctx)
      expect(res.status).toBe(422)
    })

    it('returns 422 for slotIndex above 4', async () => {
      const res = await POST(makeRequest({ slotIndex: 5 }), ctx)
      expect(res.status).toBe(422)
    })

    it('returns 422 for non-integer slotIndex', async () => {
      const res = await POST(makeRequest({ slotIndex: 1.5 }), ctx)
      expect(res.status).toBe(422)
    })

    it('returns 422 for missing slotIndex', async () => {
      const res = await POST(makeRequest({}), ctx)
      expect(res.status).toBe(422)
    })

    it('returns 400 for malformed JSON body', async () => {
      const request = new NextRequest(`http://localhost/api/sessions/${SESSION_ID}/reveal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{bad json',
      })
      const res = await POST(request, ctx)
      expect(res.status).toBe(400)
    })
  })

  describe('session guards', () => {
    it('returns 404 when session does not exist', async () => {
      vi.mocked(prisma.gameSession.findUnique).mockResolvedValue(null)
      const res = await POST(makeRequest({ slotIndex: 0 }), ctx)
      expect(res.status).toBe(404)
    })

    it('returns 409 when session is completed', async () => {
      vi.mocked(prisma.gameSession.findUnique).mockResolvedValue({ ...mockSession, completed: true } as never)
      const res = await POST(makeRequest({ slotIndex: 0 }), ctx)
      expect(res.status).toBe(409)
      const body = await res.json()
      expect(body.error).toMatch(/no longer active/i)
    })

    it('returns 409 when session is abandoned', async () => {
      vi.mocked(prisma.gameSession.findUnique).mockResolvedValue({ ...mockSession, abandoned: true } as never)
      const res = await POST(makeRequest({ slotIndex: 0 }), ctx)
      expect(res.status).toBe(409)
    })
  })

  describe('slot guards', () => {
    it('returns 409 when slot is already revealed', async () => {
      vi.mocked(prisma.sessionMicrobe.findUnique).mockResolvedValue({
        ...mockSessionMicrobe,
        revealedSlots: [0],
      } as never)
      const res = await POST(makeRequest({ slotIndex: 0 }), ctx)
      expect(res.status).toBe(409)
      const body = await res.json()
      expect(body.error).toMatch(/already revealed/i)
    })

    it('returns 422 when the slot has no clue', async () => {
      // Microbe with no clues → every slot maps to null
      vi.mocked(prisma.sessionMicrobe.findUnique).mockResolvedValue({
        ...mockSessionMicrobe,
        microbe: { clues: [] },
      } as never)
      const res = await POST(makeRequest({ slotIndex: 0 }), ctx)
      expect(res.status).toBe(422)
      const body = await res.json()
      expect(body.error).toMatch(/no clue/i)
    })
  })

  describe('happy path', () => {
    it('reveals the exact card mapped to the requested slot', async () => {
      // Slot 0 → Gram stain / morphology group → first candidate = 'Gram +'.
      const res = await POST(makeRequest({ slotIndex: 0 }), ctx)
      expect(res.status).toBe(200)

      const body = await res.json()
      // Label is never sent — the response is category + image only.
      expect(body.card).toEqual({ category: 'GRAM_STAIN', imageUrl: '/g.png' })
      expect(body.card).not.toHaveProperty('label')
      expect(body.session.cardsOpened).toBe(1)
      expect(body.session.heartsLeft).toBe(3)
    })

    it('maps each slot to the same card the cards route would show', async () => {
      // slot index → expected clue image, per selectSlotClues' fixed layout.
      // (Identity checked via imageUrl since the label is no longer returned.)
      const expected = ['/g.png', '/v.png', '/l.png', '/s.png', '/c.png']
      for (let slotIndex = 0; slotIndex < expected.length; slotIndex++) {
        vi.mocked(prisma.$queryRaw).mockResolvedValue([{ revealedSlots: [slotIndex] }] as never)
        const res = await POST(makeRequest({ slotIndex }), ctx)
        const body = await res.json()
        expect(body.card.imageUrl).toBe(expected[slotIndex])
      }
    })

    it('persists the revealed slot index via an atomic conditional update', async () => {
      await POST(makeRequest({ slotIndex: 1 }), ctx)
      // Tagged-template call: [strings, slotIndex, sessionId, roundNumber, slotIndex]
      const [, slotArg, sessionArg, roundArg] = vi.mocked(prisma.$queryRaw).mock.calls[0]
      expect(slotArg).toBe(1)
      expect(sessionArg).toBe(SESSION_ID)
      expect(roundArg).toBe(1)
    })

    it('returns 409 when the atomic update finds the slot already revealed (race)', async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValue([] as never)
      const res = await POST(makeRequest({ slotIndex: 1 }), ctx)
      expect(res.status).toBe(409)
    })

    it('reflects the cards-opened count returned by the database', async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValue([{ revealedSlots: [0, 1] }] as never)
      const res = await POST(makeRequest({ slotIndex: 1 }), ctx)
      const body = await res.json()
      expect(body.session.cardsOpened).toBe(2)
    })
  })

  // Regression guard for the "revealed card ≠ shown card" bug: /reveal and /cards
  // run two SEPARATE queries and must order clues identically. sortOrder is not
  // unique, so both must break ties on clueCardId or Postgres can return tied rows
  // in different orders and the two routes disagree about which clue is in a slot.
  describe('stays in lockstep with the /cards route (sortOrder tie-break)', () => {
    it('loads clues ordered by sortOrder THEN clueCardId — the same ordering /cards uses', async () => {
      await POST(makeRequest({ slotIndex: 0 }), ctx)

      const findUniqueArg = vi.mocked(prisma.sessionMicrobe.findUnique).mock.calls[0][0] as {
        include: { microbe: { include: { clues: { orderBy: unknown } } } }
      }
      expect(findUniqueArg.include.microbe.include.clues.orderBy).toEqual([
        { sortOrder: 'asc' },
        { clueCardId: 'asc' },
      ])
    })

    it('reveals the tie-winner in slot 0 that /cards would show when two clues share a sortOrder', async () => {
      // Slot 0 spans GRAM_STAIN + MORPHOLOGY. Both candidates share sortOrder 0, so
      // only the clueCardId tiebreaker decides the winner. The clues arrive already
      // ordered by [sortOrder, clueCardId] (as the query now guarantees), so the
      // route must reveal the first one — exactly what /cards renders for that slot.
      vi.mocked(prisma.sessionMicrobe.findUnique).mockResolvedValue({
        ...mockSessionMicrobe,
        microbe: {
          clues: [
            { sortOrder: 0, clueCardId: 'card-a', clueCard: { category: 'GRAM_STAIN', label: 'Gram +', imageUrl: '/g.png' } },
            { sortOrder: 0, clueCardId: 'card-b', clueCard: { category: 'MORPHOLOGY', label: 'Cocci', imageUrl: '/m.png' } },
          ],
        },
      } as never)

      const res = await POST(makeRequest({ slotIndex: 0 }), ctx)
      const body = await res.json()
      expect(body.card.imageUrl).toBe('/g.png')
    })
  })
})
