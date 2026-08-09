describe('loadStudyCards', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('VITE_SUPABASE_URL', '')
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', '')
  })

  afterEach(() => vi.unstubAllEnvs())

  it('throws when Supabase is not configured', async () => {
    const { loadStudyCards } = await import('./studyCards')

    await expect(loadStudyCards()).rejects.toThrow('Supabase is not configured')
  })
})
