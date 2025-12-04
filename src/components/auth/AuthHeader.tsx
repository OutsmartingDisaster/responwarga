'use client'

import { LucideIcon } from 'lucide-react'

interface AuthHeaderProps {
  icon: LucideIcon
  title: string
  subtitle: string
}

export function AuthHeader({ icon: Icon, title, subtitle }: AuthHeaderProps) {
  return (
    <div className="text-center mb-8">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
        <Icon className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-bold mb-2">{title}</h1>
      <p className="text-zinc-400">{subtitle}</p>
    </div>
  )
}
