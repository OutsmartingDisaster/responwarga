'use client'

import { ChevronLeft, ChevronRight, Check, Loader2 } from 'lucide-react'

interface StepNavigationProps {
  currentStep: number
  totalSteps: number
  canProceed: boolean
  loading: boolean
  onPrev: () => void
  onNext: () => void
}

export function StepNavigation({
  currentStep,
  totalSteps,
  canProceed,
  loading,
  onPrev,
  onNext
}: StepNavigationProps) {
  const isLastStep = currentStep === totalSteps

  return (
    <div className="flex justify-between mt-8 pt-6 border-t border-zinc-700">
      <button
        type="button"
        onClick={onPrev}
        disabled={currentStep === 1}
        className="px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-zinc-700 hover:bg-zinc-600"
      >
        <ChevronLeft className="w-5 h-5" />
        Sebelumnya
      </button>

      {!isLastStep ? (
        <button
          type="button"
          onClick={onNext}
          disabled={!canProceed}
          className="px-6 py-3 bg-blue-600 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          Selanjutnya
          <ChevronRight className="w-5 h-5" />
        </button>
      ) : (
        <button
          type="submit"
          disabled={loading || !canProceed}
          className="px-6 py-3 bg-green-600 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Menyimpan...
            </>
          ) : (
            <>
              <Check className="w-5 h-5" />
              Buat Organisasi
            </>
          )}
        </button>
      )}
    </div>
  )
}
