'use client'

import { Building2, User } from 'lucide-react'

export type UserRole = 'responder' | 'org_admin'

interface RoleSelectorProps {
  value: UserRole
  onChange: (role: UserRole) => void
}

const roles = [
  {
    id: 'org_admin' as const,
    icon: Building2,
    title: 'Admin Organisasi',
    description: 'Buat & kelola organisasi'
  },
  {
    id: 'responder' as const,
    icon: User,
    title: 'Responder',
    description: 'Bergabung ke organisasi'
  }
]

export function RoleSelector({ value, onChange }: RoleSelectorProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-300 mb-3">
        Daftar sebagai:
      </label>
      <div className="grid grid-cols-2 gap-3">
        {roles.map((role) => {
          const Icon = role.icon
          const isSelected = value === role.id
          return (
            <button
              key={role.id}
              type="button"
              onClick={() => onChange(role.id)}
              className={`p-4 rounded-lg border-2 transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                  : 'border-zinc-600 bg-zinc-900 hover:border-zinc-500'
              }`}
            >
              <Icon className="w-6 h-6 mx-auto mb-2" />
              <div className="font-medium">{role.title}</div>
              <div className="text-xs text-zinc-400 mt-1">{role.description}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
