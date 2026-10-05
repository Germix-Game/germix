// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { StrictMode } from 'react'
import { render, screen, waitFor, cleanup, fireEvent, act } from '@testing-library/react'
import { PostTestPopup } from './PostTestPopup'

const questions = [
  { id: 'q1', body: 'First?', options: ['a', 'b', 'c', 'd'] },
  { id: 'q2', body: 'Second?', options: ['a', 'b', 'c', 'd'] },
]

const T0 = new Date('2026-10-05T10:00:00Z').getTime()

let resolveGet: () => void
let postBody: Record<string, unknown> | null

beforeEach(() => {
  // Only fake Date so waitFor / promises keep working.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(T0)
  postBody = null

  vi.stubGlobal(
    'fetch',
    vi.fn((_url: string, init?: RequestInit) => {
      if (init?.method === 'POST') {
        postBody = JSON.parse(init.body as string)
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      }
      // GET /api/posttest resolves only when the test says so (simulates load latency).
      return new Promise((resolve) => {
        resolveGet = () => resolve({ ok: true, json: () => Promise.resolve({ questions }) })
      })
    }),
  )
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

async function answerAll() {
  for (const q of ['First?', 'Second?']) {
    const card = screen.getByText(new RegExp(q.replace('?', '\\?'))).closest('div')!.parentElement!
    fireEvent.click(card.querySelector('button')!)
  }
}

describe('PostTestPopup durationSeconds', () => {
  it('starts the timer when questions finish loading, not at mount', async () => {
    render(<PostTestPopup period="MIDTERM" onComplete={vi.fn()} onClose={vi.fn()} />)

    vi.setSystemTime(T0 + 10_000) // 10s of load latency
    await act(async () => resolveGet())
    await waitFor(() => expect(screen.getByText(/Question 1/)).toBeInTheDocument())

    vi.setSystemTime(T0 + 10_000 + 90_000) // 90s answering
    await answerAll()
    fireEvent.click(screen.getByText('Submit Post-test'))

    await waitFor(() => expect(postBody).not.toBeNull())
    expect(postBody!.durationSeconds).toBe(90) // not 100
  })

  it('always sends a non-null integer durationSeconds, even for an instant submit', async () => {
    render(<PostTestPopup period="MIDTERM" onComplete={vi.fn()} onClose={vi.fn()} />)
    await act(async () => resolveGet())
    await waitFor(() => expect(screen.getByText(/Question 1/)).toBeInTheDocument())

    await answerAll()
    fireEvent.click(screen.getByText('Submit Post-test'))

    await waitFor(() => expect(postBody).not.toBeNull())
    expect(postBody).toHaveProperty('durationSeconds')
    expect(Number.isInteger(postBody!.durationSeconds)).toBe(true)
    expect(postBody!.durationSeconds).toBe(0)
  })

  it('clamps to 86400 so the server schema never rejects it', async () => {
    render(<PostTestPopup period="MIDTERM" onComplete={vi.fn()} onClose={vi.fn()} />)
    await act(async () => resolveGet())
    await waitFor(() => expect(screen.getByText(/Question 1/)).toBeInTheDocument())

    vi.setSystemTime(T0 + 3 * 86_400_000) // tab left open for 3 days
    await answerAll()
    fireEvent.click(screen.getByText('Submit Post-test'))

    await waitFor(() => expect(postBody).not.toBeNull())
    expect(postBody!.durationSeconds).toBe(86400)
  })
})

describe('PostTestPopup timer edge cases', () => {
  it('cannot submit (no POST, no duration) when loading fails', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false, json: () => Promise.resolve({}) })))
    render(<PostTestPopup period="MIDTERM" onComplete={vi.fn()} onClose={vi.fn()} />)

    await waitFor(() => expect(screen.getByText('Failed to load posttest questions.')).toBeInTheDocument())
    expect(screen.getByText('Submit Post-test').closest('button')).toBeDisabled()
    expect(vi.mocked(fetch).mock.calls.every(([, init]) => init?.method !== 'POST')).toBe(true)
  })

  it('cannot submit when the server returns no questions', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ enabled: false, questions: [] }) })),
    )
    render(<PostTestPopup period="MIDTERM" onComplete={vi.fn()} onClose={vi.fn()} />)

    await waitFor(() => expect(screen.queryByText('Loading questions...')).not.toBeInTheDocument())
    const submit = screen.queryByText('Submit Post-test')
    if (submit) expect(submit.closest('button')).toBeDisabled()
    expect(vi.mocked(fetch).mock.calls.every(([, init]) => init?.method !== 'POST')).toBe(true)
  })

  it('under StrictMode (double effect) times from the load that actually applied', async () => {
    const resolvers: Array<() => void> = []
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, init?: RequestInit) => {
        if (init?.method === 'POST') {
          postBody = JSON.parse(init.body as string)
          return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
        }
        return new Promise((resolve) => {
          resolvers.push(() => resolve({ ok: true, json: () => Promise.resolve({ questions }) }))
        })
      }),
    )
    render(
      <StrictMode>
        <PostTestPopup period="MIDTERM" onComplete={vi.fn()} onClose={vi.fn()} />
      </StrictMode>,
    )

    vi.setSystemTime(T0 + 5_000)
    await act(async () => resolvers.forEach((r) => r()))
    await waitFor(() => expect(screen.getByText(/Question 1/)).toBeInTheDocument())

    vi.setSystemTime(T0 + 5_000 + 30_000)
    await answerAll()
    fireEvent.click(screen.getByText('Submit Post-test'))

    await waitFor(() => expect(postBody).not.toBeNull())
    expect(postBody!.durationSeconds).toBe(30)
  })

  it('keeps the original start when a submit fails and is retried', async () => {
    render(<PostTestPopup period="MIDTERM" onComplete={vi.fn()} onClose={vi.fn()} />)
    await act(async () => resolveGet())
    await waitFor(() => expect(screen.getByText(/Question 1/)).toBeInTheDocument())
    await answerAll()

    const realFetch = vi.mocked(fetch).getMockImplementation()!
    vi.mocked(fetch).mockImplementationOnce(() =>
      Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'boom' }) }) as never,
    )
    vi.setSystemTime(T0 + 20_000)
    fireEvent.click(screen.getByText('Submit Post-test'))
    await waitFor(() => expect(screen.getByText('boom')).toBeInTheDocument())

    vi.mocked(fetch).mockImplementation(realFetch)
    vi.setSystemTime(T0 + 50_000)
    fireEvent.click(screen.getByText('Submit Post-test'))
    await waitFor(() => expect(postBody).not.toBeNull())
    expect(postBody!.durationSeconds).toBe(50)
  })
})
