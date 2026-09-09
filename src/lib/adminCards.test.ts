import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const invoke = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ functions: { invoke } }),
}))

describe('manageStudyCards', () => {
  beforeEach(() => {
    invoke.mockReset()
    localStorage.clear()
    vi.resetModules()
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'test-key')
  })

  afterEach(() => vi.unstubAllEnvs())

  it('uses the verified password for writes against a legacy function', async () => {
    invoke
      .mockResolvedValueOnce({ data: { ok: true }, error: null })
      .mockResolvedValueOnce({ data: { card: { id: 'word-016', title: 'lucid', content: 'Clear.' } }, error: null })
    const { manageStudyCards } = await import('./adminCards')

    await manageStudyCards('verify', 'correct-password')
    await manageStudyCards('create', '', { id: '', title: 'lucid', content: 'Clear.' })

    expect(invoke).toHaveBeenLastCalledWith('manage-study-cards', {
      body: expect.objectContaining({
        action: 'create',
        password: 'correct-password',
        token: undefined,
        card: { id: '', title: 'lucid', content: 'Clear.' },
      }),
    })
  })

  it('uses the session token without retaining the password for a current function', async () => {
    const expiresAt = Date.now() + 60_000
    invoke
      .mockResolvedValueOnce({ data: { ok: true, token: 'signed-token', expiresAt }, error: null })
      .mockResolvedValueOnce({ data: { card: { id: 'word-016', title: 'lucid', content: 'Clear.' } }, error: null })
    const { manageStudyCards } = await import('./adminCards')

    await manageStudyCards('verify', 'correct-password')
    await manageStudyCards('create', '', { id: '', title: 'lucid', content: 'Clear.' })

    expect(invoke).toHaveBeenLastCalledWith('manage-study-cards', {
      body: expect.objectContaining({
        action: 'create',
        password: undefined,
        token: 'signed-token',
      }),
    })
  })
  it('updates an entry using only its ID, title and content', async () => {
    const card = { id: 'translation:0', title: 'Edited title', content: 'English\n\n日本語' }
    invoke.mockResolvedValueOnce({ data: { card }, error: null })
    const { manageStudyCards } = await import('./adminCards')
    expect(await manageStudyCards('update', '', card)).toEqual(card)
    expect(invoke).toHaveBeenCalledWith('manage-study-cards', {
      body: expect.objectContaining({ card }),
    })
    expect(invoke.mock.calls[0][1].body).not.toHaveProperty('mode')
  })
})
