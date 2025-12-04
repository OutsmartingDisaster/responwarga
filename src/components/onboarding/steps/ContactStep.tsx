'use client'

import { Mail, Phone, Globe } from 'lucide-react'

interface ContactStepProps {
  email: string
  phone: string
  website: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export function ContactStep({ email, phone, website, onChange }: ContactStepProps) {
  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          <Mail className="w-4 h-4 inline mr-2" />
          Email Organisasi
        </label>
        <input
          type="email"
          name="email"
          value={email}
          onChange={onChange}
          className="w-full p-3 rounded-lg bg-zinc-900 border border-zinc-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
          placeholder="kontak@organisasi.org"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          <Phone className="w-4 h-4 inline mr-2" />
          Nomor Telepon
        </label>
        <input
          type="tel"
          name="phone"
          value={phone}
          onChange={onChange}
          className="w-full p-3 rounded-lg bg-zinc-900 border border-zinc-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
          placeholder="+62 21 1234567"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          <Globe className="w-4 h-4 inline mr-2" />
          Website
        </label>
        <input
          type="url"
          name="website"
          value={website}
          onChange={onChange}
          className="w-full p-3 rounded-lg bg-zinc-900 border border-zinc-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
          placeholder="https://organisasi.org"
        />
      </div>
    </div>
  )
}
