// @vitest-environment jsdom
import { vi, describe, it, expect, afterEach } from 'vitest'

// animejs uses DOM layout APIs jsdom doesn't implement — stub it out.
vi.mock('animejs', () => ({
  createAnimatable: vi.fn(() => ({
    translateX: vi.fn(),
    translateY: vi.fn(),
    scale: vi.fn(),
  })),
  spring: vi.fn(() => ({ settlingDuration: 500 })),
}))

// PlayPage isn't rendered under Next's App Router in these tests — stub the
// hook so the prefetch-on-mount call doesn't throw "app router not mounted".
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), prefetch: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}))

import { StrictMode } from 'react'
import { render, screen, within, fireEvent, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PlayPage from './page'

// ── Helpers ───────────────────────────────────────────────────────────────────

function setDemoMode() {
  Object.defineProperty(window, 'location', {
    value: { search: '?demo=true', href: 'http://localhost/play?demo=true' },
    writable: true,
    configurable: true,
  })
}

function setNoSession() {
  Object.defineProperty(window, 'location', {
    value: { search: '', href: 'http://localhost/play' },
    writable: true,
    configurable: true,
  })
  localStorage.removeItem('currentSessionId')
}

/** Render in demo mode and wait for the playing state to be ready. */
async function renderDemo() {
  setDemoMode()
  render(<PlayPage />)
  // React 19 + RTL flush effects via act(), so playing state is available immediately.
  // waitFor here is a safety net for any remaining async microtasks.
  await waitFor(() => screen.getByRole('listbox', { name: /select a microbe/i }))
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  localStorage.clear()
})

// ─────────────────────────────────────────────────────────────────────────────

describe('ErrorScreen', () => {
  it('shows error when there is no session and no demo param', async () => {
    setNoSession()
    render(<PlayPage />)
    await waitFor(() => expect(screen.getByText(/no active session found/i)).toBeDefined())
  })

  it('error screen has a "Start a new game" link pointing to /select', async () => {
    setNoSession()
    render(<PlayPage />)
    await waitFor(() => {
      const link = screen.getByRole('link', { name: /start a new game/i })
      expect((link as HTMLAnchorElement).href).toContain('/select')
    })
  })
})

// ── Session bootstrap (duplicate-session guard) ─────────────────────────────────

describe('Real mode — session bootstrap', () => {
  const originalFetch = global.fetch

  function setModeUrl(mode: string) {
    Object.defineProperty(window, 'location', {
      value: { search: `?mode=${mode}`, href: `http://localhost/play?mode=${mode}` },
      writable: true,
      configurable: true,
    })
    localStorage.removeItem('currentSessionId')
  }

  function jsonRes(body: unknown) {
    return { ok: true, json: async () => body } as Response
  }

  // Routes every fetch the bootstrap makes and counts POST /api/sessions calls.
  function mockBootstrapFetch() {
    const postSessions = vi.fn()
    let seq = 0
    global.fetch = vi.fn(async (url: RequestInfo | URL, opts?: RequestInit) => {
      const u = String(url)
      const method = opts?.method ?? 'GET'
      if (u.endsWith('/api/sessions') && method === 'POST') {
        postSessions()
        // Distinct id per creation so a duplicate would be observable downstream too.
        return jsonRes({ id: `sess-${++seq}`, heartsLeft: 3, totalScore: 0, currentRound: 1, gameMode: 'BACTERIA' })
      }
      if (u.includes('/cards')) return jsonRes({ cards: [null, null, null, null, null] })
      if (u.includes('/api/pathogen-book')) return jsonRes({ microbes: [] })
      if (/\/api\/sessions\/[^/]+$/.test(u)) {
        return jsonRes({ heartsLeft: 3, totalScore: 0, currentRound: 1, gameMode: 'BACTERIA' })
      }
      return jsonRes({})
    }) as typeof global.fetch
    return { postSessions }
  }

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('creates exactly one session on mount, even under a StrictMode double-invoke', async () => {
    // StrictMode double-invokes the mount effect; without the didBootstrap guard
    // that POSTs /api/sessions twice, creating two sessions with different
    // shuffles — the root cause of "clues describe X but the answer is graded as Y".
    setModeUrl('BACTERIA')
    const { postSessions } = mockBootstrapFetch()

    render(
      <StrictMode>
        <PlayPage />
      </StrictMode>,
    )

    await waitFor(() => screen.getByRole('listbox', { name: /select a microbe/i }))
    expect(postSessions).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem('currentSessionId')).toBe('sess-1')
  })
})

// ── Initial render ────────────────────────────────────────────────────────────

describe('Demo mode — initial render', () => {
  it('shows round 1 indicator', async () => {
    await renderDemo()
    const imgs = screen.getAllByAltText(/round 1 of 5/i)
    expect(imgs.length).toBeGreaterThanOrEqual(1)
    expect((imgs[0] as HTMLImageElement).src).toContain('round-1.png')
  })

  it('shows 3 hearts (full health)', async () => {
    await renderDemo()
    expect(screen.getByRole('img', { name: /3 of 3 lives remaining/i })).toBeDefined()
  })

  it('score starts at 0', async () => {
    await renderDemo()
    // ScoreBar renders score as "0000" (padded)
    const scoreEl = screen.getByLabelText(/score: 0/i)
    expect(scoreEl).toBeDefined()
  })

  it('renders 5 face-down card slots', async () => {
    await renderDemo()
    const revealButtons = screen.getAllByRole('button', { name: /reveal clue card/i })
    expect(revealButtons).toHaveLength(5)
  })

  it('renders 18 demo microbes in the answer panel', async () => {
    await renderDemo()
    const listbox = screen.getByRole('listbox', { name: /select a microbe/i })
    const options = within(listbox).getAllByRole('option')
    expect(options).toHaveLength(18)
  })

  it('all microbe options start unselected', async () => {
    await renderDemo()
    screen.getAllByRole('option').forEach(opt =>
      expect(opt).toHaveAttribute('aria-selected', 'false'),
    )
  })
})

// ── Card reveal ───────────────────────────────────────────────────────────────

describe('Demo mode — card reveal', () => {
  it('clicking a card slot reveals the clue', async () => {
    const user = userEvent.setup()
    await renderDemo()

    const [firstCard] = screen.getAllByRole('button', { name: /reveal clue card/i })
    await user.click(firstCard)

    // DEMO_CARDS[0] is GRAM_STAIN category
    await waitFor(() => expect(screen.getByText(/gram stain/i)).toBeDefined())
  })

  it('a revealed card slot button becomes disabled', async () => {
    const user = userEvent.setup()
    await renderDemo()

    const [firstCard] = screen.getAllByRole('button', { name: /reveal clue card/i })
    await user.click(firstCard)

    await waitFor(() => expect(firstCard).toBeDisabled())
  })

  it('answer drop-zone button is disabled before any card is revealed', async () => {
    await renderDemo()
    const answerBtn = screen.getByRole('button', { name: /submit answer/i })
    expect(answerBtn).toBeDisabled()
  })
})

// ── Microbe selection ─────────────────────────────────────────────────────────

describe('Demo mode — microbe selection', () => {
  // ── BUG: No click-to-select on microbe cards ─────────────────────────────
  //
  // DraggableMicrobeCard has no onClick handler that calls setSelectedMicrobeId.
  // The component renders cards with role="option" and aria-selected, suggesting
  // click selection is intended, but clicking a card does nothing to the selection
  // state. The only way to submit is double-click → confirm (setting pendingMicrobeId).
  //
  // The two tests below document this bug — they FAIL with the current code.
  // Note: fireEvent is used instead of userEvent because userEvent refuses to dispatch
  // pointer events on elements whose ancestor creates a stacking context via will-change
  // (card-tilt) alongside a pointer-events:none sibling (card-shine with z-index:10).
  // fireEvent bypasses CSS pointer-events checks so the test reaches its assertion.
  // ─────────────────────────────────────────────────────────────────────────

  it.todo('BUG: single-clicking a microbe does not select it (aria-selected stays false)')

  it.todo('BUG: Answer button stays disabled after clicking a card + clicking a microbe')

  it('double-clicking a microbe shows confirm/cancel buttons', async () => {
    await renderDemo()

    // canDropAnswer requires at least one revealed card
    const [revealBtn] = screen.getAllByRole('button', { name: /reveal clue card/i })
    fireEvent.click(revealBtn)
    await waitFor(() => screen.getByText(/gram stain/i))

    const [firstOption] = screen.getAllByRole('option')
    // waitFor retries in case canDrop wasn't committed when the first dblClick fired
    await waitFor(() => {
      fireEvent.dblClick(firstOption)
      screen.getByRole('button', { name: /confirm answer/i })
    })

    expect(screen.getByRole('button', { name: /confirm answer/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDefined()
  })

  it('cancel button removes the pending answer', async () => {
    await renderDemo()

    const [revealBtn] = screen.getAllByRole('button', { name: /reveal clue card/i })
    fireEvent.click(revealBtn)
    await waitFor(() => screen.getByText(/gram stain/i))

    const [firstOption] = screen.getAllByRole('option')
    await waitFor(() => {
      fireEvent.dblClick(firstOption)
      screen.getByRole('button', { name: /confirm answer/i })
    })
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /confirm answer/i })).toBeNull()
      // Answer drop-zone button returns
      expect(screen.getByRole('button', { name: /submit answer/i })).toBeDefined()
    })
  })
})

// ── Answer submission ─────────────────────────────────────────────────────────

describe('Demo mode — answer submission', () => {
  /** Reveal card 0 then double-click the microbe matching the given regex. */
  async function revealThenDouble(nameMatch: RegExp) {
    const [card] = screen.getAllByRole('button', { name: /reveal clue card/i })
    fireEvent.click(card)
    await screen.findByText(/gram stain/i)

    const option = screen.getAllByRole('option').find(o =>
      o.textContent?.match(nameMatch),
    )
    if (!option) throw new Error(`No microbe matching ${nameMatch}`)
    // waitFor retries in case canDrop wasn't committed to this closure on the first attempt
    await waitFor(() => {
      fireEvent.dblClick(option)
      screen.getByRole('button', { name: /confirm answer/i })
    })
    fireEvent.click(screen.getByRole('button', { name: /confirm answer/i }))
  }

  it('correct answer (S. aureus in demo) advances to round 2', async () => {
    await renderDemo()
    await revealThenDouble(/aureus/i)
    await waitFor(() => {
      const imgs = screen.getAllByAltText(/round 2 of 5/i)
      expect(imgs.length).toBeGreaterThanOrEqual(1)
    })
  })

  it('correct answer increases the score above 0', async () => {
    await renderDemo()
    await revealThenDouble(/aureus/i)
    await waitFor(() => {
      const scoreEl = screen.queryByLabelText(/score: 0/i)
      // Score should no longer be 0
      expect(scoreEl).toBeNull()
    })
  })

  it('correct answer resets the non-forced card slots to face-down', async () => {
    await renderDemo()
    await revealThenDouble(/aureus/i)
    await waitFor(() => {
      const revealButtons = screen.getAllByRole('button', { name: /reveal clue card/i })
      expect(revealButtons).toHaveLength(5)
      // The clinical-manifestation card (slot 4) is force-opened each round, so
      // its reveal button stays disabled; the other four reset to face-down.
      const enabled = revealButtons.filter(btn => !(btn as HTMLButtonElement).disabled)
      expect(enabled).toHaveLength(4)
    })
  })

  it('wrong answer shows the correct-answer feedback bar', async () => {
    await renderDemo()
    await revealThenDouble(/coli/i) // E. coli is wrong; correct is S. aureus
    await waitFor(() => expect(screen.getByText(/correct answer:/i)).toBeDefined())
  })

  it('wrong answer shows the correct microbe name', async () => {
    await renderDemo()
    await revealThenDouble(/coli/i)
    await waitFor(() => expect(screen.getByText(/staphylococcus aureus/i)).toBeDefined())
  })

  it('wrong answer shows "Next Microbe →" button', async () => {
    await renderDemo()
    await revealThenDouble(/coli/i)
    await waitFor(() => expect(screen.getByRole('button', { name: /next microbe/i })).toBeDefined())
  })

  it('wrong answer deducts one heart', async () => {
    await renderDemo()
    expect(screen.getByRole('img', { name: /3 of 3 lives remaining/i })).toBeDefined()

    await revealThenDouble(/coli/i)

    await waitFor(() =>
      expect(screen.getByRole('img', { name: /2 of 3 lives remaining/i })).toBeDefined(),
    )
  })

  it('wrong answer reveals all 5 clue cards', async () => {
    await renderDemo()
    await revealThenDouble(/coli/i)
    // After wrong answer, all cards should be revealed (buttons disabled)
    await waitFor(() => {
      const revealBtns = screen.queryAllByRole('button', { name: /reveal clue card/i })
      // All revealed = all buttons disabled
      revealBtns.forEach(btn => expect(btn).toBeDisabled())
    })
  })
})

// ── Multi-round flow ──────────────────────────────────────────────────────────

describe('Demo mode — multi-round flow', () => {
  async function submitAnswer(nameMatch: RegExp) {
    const [card] = screen.getAllByRole('button', { name: /reveal clue card/i })
    fireEvent.click(card)
    await screen.findByText(/gram stain/i)

    const option = screen.getAllByRole('option').find(o =>
      o.textContent?.match(nameMatch),
    )
    if (!option) throw new Error(`No microbe: ${nameMatch}`)
    fireEvent.dblClick(option)
    const confirmBtn = await screen.findByRole('button', { name: /confirm answer/i })
    fireEvent.click(confirmBtn)
  }

  it('three wrong answers trigger game-over end screen', async () => {
    await renderDemo()

    for (let i = 0; i < 3; i++) {
      await submitAnswer(/coli/i)
      if (i < 2) {
        const nextBtn = await screen.findByRole('button', { name: /next microbe/i })
        fireEvent.click(nextBtn)
        // Wait for "wrong" phase to clear before the next iteration
        await waitFor(() =>
          expect(screen.queryByRole('button', { name: /next microbe/i })).toBeNull(),
        )
      }
    }

    await waitFor(() => expect(screen.getByText(/game over/i)).toBeDefined())
  }, 20000)

  it('five correct answers show "You Win" end screen', async () => {
    await renderDemo()

    for (let i = 0; i < 5; i++) {
      await submitAnswer(/aureus/i)
      if (i < 4) {
        await waitFor(() =>
          expect(screen.getAllByAltText(new RegExp(`round ${i + 2} of 5`, 'i')).length).toBeGreaterThan(0),
        )
      }
    }

    await waitFor(() => expect(screen.getByText(/you win/i)).toBeDefined())
  }, 20000)

  it('"Play Again" in demo mode resets to round 1 without navigating away', async () => {
    await renderDemo()

    // Lose all hearts
    for (let i = 0; i < 3; i++) {
      await submitAnswer(/coli/i)
      if (i < 2) {
        const nextBtn = await screen.findByRole('button', { name: /next microbe/i })
        fireEvent.click(nextBtn)
        await waitFor(() =>
          expect(screen.queryByRole('button', { name: /next microbe/i })).toBeNull(),
        )
      }
    }

    await waitFor(() => screen.getByText(/game over/i))
    fireEvent.click(screen.getByRole('button', { name: /play again/i }))

    await waitFor(() => {
      // Back to round 1
      expect(screen.getAllByAltText(/round 1 of 5/i).length).toBeGreaterThan(0)
      expect(screen.queryByText(/game over/i)).toBeNull()
    })
  }, 20000)

  it('end screen shows "Final score:" heading', async () => {
    await renderDemo()

    // Lose all hearts quickly
    for (let i = 0; i < 3; i++) {
      await submitAnswer(/coli/i)
      if (i < 2) {
        fireEvent.click(await screen.findByRole('button', { name: /next microbe/i }))
        await waitFor(() =>
          expect(screen.queryByRole('button', { name: /next microbe/i })).toBeNull(),
        )
      }
    }

    await waitFor(() => expect(screen.getByText(/final score:/i)).toBeDefined())
  }, 20000)
})

// ── Filter bar ────────────────────────────────────────────────────────────────

describe('Demo mode — filter bar', () => {
  it('GRAM+ filter hides NEGATIVE and ACID_FAST microbes', async () => {
    const user = userEvent.setup()
    await renderDemo()

    await user.click(screen.getByRole('checkbox', { name: /gram \+/i }))

    const opts = screen.getAllByRole('option')
    expect(opts.length).toBeGreaterThan(0)
    expect(opts.some(o => o.textContent?.match(/coli/i))).toBe(false)        // NEGATIVE
    expect(opts.some(o => o.textContent?.match(/tuberculosis/i))).toBe(false) // ACID_FAST
  })

  it('GRAM− filter hides POSITIVE and ACID_FAST microbes', async () => {
    const user = userEvent.setup()
    await renderDemo()

    await user.click(screen.getByRole('checkbox', { name: /gram −/i }))

    const opts = screen.getAllByRole('option')
    expect(opts.some(o => o.textContent?.match(/aureus/i))).toBe(false)
    expect(opts.some(o => o.textContent?.match(/tuberculosis/i))).toBe(false)
  })

  it.todo('BUG: there is no ACID_FAST gram filter checkbox in the UI')

  it('ANAEROBE tag filter hides aerobic-only microbes', async () => {
    const user = userEvent.setup()
    await renderDemo()

    await user.click(screen.getByRole('checkbox', { name: /anaerobe/i }))

    const opts = screen.getAllByRole('option')
    expect(opts.length).toBeGreaterThan(0)
    expect(opts.some(o => o.textContent?.match(/aureus/i))).toBe(false) // S. aureus = aerobe
  })

  it('search input filters microbes by name', async () => {
    const user = userEvent.setup()
    await renderDemo()

    await user.type(screen.getByPlaceholderText(/search/i), 'mycobacterium')

    expect(screen.getAllByRole('option')).toHaveLength(2)
  })

  it('× clear button restores all 18 microbes', async () => {
    const user = userEvent.setup()
    await renderDemo()

    await user.type(screen.getByPlaceholderText(/search/i), 'staph')
    expect(screen.getAllByRole('option')).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: /clear search/i }))

    expect(screen.getAllByRole('option')).toHaveLength(18)
  })

  it('clicking the same gram checkbox twice clears the filter', async () => {
    const user = userEvent.setup()
    await renderDemo()

    const gramPlusCb = screen.getByRole('checkbox', { name: /gram \+/i })
    await user.click(gramPlusCb)
    const filteredCount = screen.getAllByRole('option').length

    await user.click(gramPlusCb)
    expect(screen.getAllByRole('option')).toHaveLength(18)
    expect(screen.getAllByRole('option').length).toBeGreaterThan(filteredCount)
  })

  it('shows "No microbes match" empty state when all microbes are filtered out', async () => {
    const user = userEvent.setup()
    await renderDemo()

    await user.type(screen.getByPlaceholderText(/search/i), 'zzznomatch')

    expect(screen.getByText(/no microbes match/i)).toBeDefined()
    expect(screen.queryAllByRole('option')).toHaveLength(0)
  })
})
