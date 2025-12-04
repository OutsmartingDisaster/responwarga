'use client'

import { Check } from 'lucide-react'

export interface Step {
  id: number
  title: string
  description: string
}

interface StepIndicatorProps {
  steps: Step[]
  currentStep: number
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-medium transition-colors ${
                  currentStep > step.id
                    ? 'bg-green-600 text-white'
                    : currentStep === step.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-zinc-700 text-zinc-400'
                }`}
              >
                {currentStep > step.id ? <Check className="w-5 h-5" /> : step.id}
              </div>
              <div className="mt-2 text-center hidden sm:block">
                <div className={`text-sm font-medium ${currentStep >= step.id ? 'text-white' : 'text-zinc-500'}`}>
                  {step.title}
                </div>
                <div className="text-xs text-zinc-500">{step.description}</div>
              </div>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`w-full h-1 mx-2 rounded ${
                  currentStep > step.id ? 'bg-green-600' : 'bg-zinc-700'
                }`}
                style={{ minWidth: '40px' }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
