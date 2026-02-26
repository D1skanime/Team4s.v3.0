import { useCallback, useState } from 'react'

interface AdminMessages {
  error: string | null
  success: string | null
  setError: (msg: string | null) => void
  setSuccess: (msg: string | null) => void
  clear: () => void
}

export function useAdminMessages(): AdminMessages {
  const [error, setErrorState] = useState<string | null>(null)
  const [success, setSuccessState] = useState<string | null>(null)

  const setError = useCallback((msg: string | null) => {
    setErrorState(msg)
  }, [])

  const setSuccess = useCallback((msg: string | null) => {
    setSuccessState(msg)
  }, [])

  const clear = useCallback(() => {
    setErrorState(null)
    setSuccessState(null)
  }, [])

  return {
    error,
    success,
    setError,
    setSuccess,
    clear,
  }
}
