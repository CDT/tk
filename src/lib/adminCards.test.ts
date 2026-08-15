import { beforeEach, describe, expect, it, vi } from 'vitest'

const invoke = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ functions: { invoke } }),
}))

describe('manageStudyCards', () => {
  beforeEach(() => {
    invoke.mockReset()
    localStorage.clear()
    vi.resetModules()
  })

  it('uses the verified password for writes against a legacy function', async () => {
    invoke
      .mockResolvedValueOnce({ data: { ok: true }, error: null })
      .mockResolvedValueOnce({ data: { card: { id: 'word-016', word: 'lucid', explanation: 'Clear.' } }, error: null })
    const { manageStudyCards } = await import('./adminCards')

    await manageStudyCards('verify', 'correct-password')
    await manageStudyCards('create', '', { id: '', word: 'lucid', explanation: 'Clear.' }, 'word')

    expect(invoke).toHaveBeenLastCalledWith('manage-study-cards', {
      body: expect.objectContaining({
        action: 'create',
        password: 'correct-password',
        token: undefined,
        mode: 'word',
      }),
    })
  })

  it('uses the session token without retaining the password for a current function', async () => {
    const expiresAt = Date.now() + 60_000
    invoke
      .mockResolvedValueOnce({ data: { ok: true, token: 'signed-token', expiresAt }, error: null })
      .mockResolvedValueOnce({ data: { card: { id: 'word-016', word: 'lucid', explanation: 'Clear.' } }, error: null })
    const { manageStudyCards } = await import('./adminCards')

    await manageStudyCards('verify', 'correct-password')
    await manageStudyCards('create', '', { id: '', word: 'lucid', explanation: 'Clear.' }, 'word')

    expect(invoke).toHaveBeenLastCalledWith('manage-study-cards', {
      body: expect.objectContaining({
        action: 'create',
        password: undefined,
        token: 'signed-token',
      }),
    })
  })
})
