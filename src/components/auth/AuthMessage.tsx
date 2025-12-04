'use client'

interface AuthMessageProps {
  type: 'error' | 'success'
  message: string
}

export function AuthMessage({ type, message }: AuthMessageProps) {
  if (!message) return null

  const styles = {
    error: 'bg-red-500/20 border-red-500/50 text-red-400',
    success: 'bg-green-500/20 border-green-500/50 text-green-400'
  }

  return (
    <div className={`p-3 border rounded-lg text-sm ${styles[type]}`}>
      {message}
    </div>
  )
}
