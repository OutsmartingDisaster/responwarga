'use client'

import { LucideIcon } from 'lucide-react'

interface FormInputProps {
  label: string
  type: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  minLength?: number
  icon?: LucideIcon
  disabled?: boolean
}

export function FormInput({
  label,
  type,
  placeholder,
  value,
  onChange,
  required = false,
  minLength,
  icon: Icon,
  disabled = false
}: FormInputProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-300 mb-2">
        {Icon && <Icon className="w-4 h-4 inline mr-2" />}
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        minLength={minLength}
        disabled={disabled}
        className="w-full p-3 rounded-lg bg-zinc-900 border border-zinc-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors disabled:opacity-50"
      />
    </div>
  )
}
