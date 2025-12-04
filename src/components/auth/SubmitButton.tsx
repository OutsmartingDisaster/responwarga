'use client'

import { LucideIcon } from 'lucide-react'

interface SubmitButtonProps {
  loading: boolean
  loadingText: string
  icon: LucideIcon
  text: string
  disabled?: boolean
}

export function SubmitButton({
  loading,
  loadingText,
  icon: Icon,
  text,
  disabled = false
}: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className="w-full p-3 bg-blue-600 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
    >
      {loading ? (
        <>
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          {loadingText}
        </>
      ) : (
        <>
          <Icon className="w-5 h-5" />
          {text}
        </>
      )}
    </button>
  )
}
