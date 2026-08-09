import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import ErrorBoundary from './ErrorBoundary'

function BrokenApp(): ReactNode {
  throw new Error('Supabase connection failed.')
}

describe('ErrorBoundary', () => {
  it('displays a thrown startup error', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    render(
      <ErrorBoundary>
        <BrokenApp />
      </ErrorBoundary>,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Could not load study cards')
    expect(screen.getByRole('alert')).toHaveTextContent('Supabase connection failed.')
  })
})
