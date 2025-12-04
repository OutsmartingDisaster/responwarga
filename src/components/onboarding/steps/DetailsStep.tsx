'use client'

import { FileText, User } from 'lucide-react'

interface DetailsStepProps {
  description: string
  logoUrl: string
  primaryContactName: string
  primaryContactEmail: string
  primaryContactPhone: string
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
}

export function DetailsStep({
  description,
  logoUrl,
  primaryContactName,
  primaryContactEmail,
  primaryContactPhone,
  onChange
}: DetailsStepProps) {
  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          <FileText className="w-4 h-4 inline mr-2" />
          Deskripsi Lengkap
        </label>
        <textarea
          name="description"
          value={description}
          onChange={onChange}
          rows={4}
          className="w-full p-3 rounded-lg bg-zinc-900 border border-zinc-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors resize-none"
          placeholder="Jelaskan tentang organisasi Anda, misi, dan kegiatan utama..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          URL Logo
        </label>
        <input
          type="url"
          name="logo_url"
          value={logoUrl}
          onChange={onChange}
          className="w-full p-3 rounded-lg bg-zinc-900 border border-zinc-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
          placeholder="https://example.com/logo.png"
        />
      </div>

      <div className="border-t border-zinc-700 pt-5 mt-5">
        <h3 className="text-sm font-medium text-zinc-300 mb-4 flex items-center gap-2">
          <User className="w-4 h-4" />
          Kontak Utama
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Nama</label>
            <input
              type="text"
              name="primary_contact_name"
              value={primaryContactName}
              onChange={onChange}
              className="w-full p-3 rounded-lg bg-zinc-900 border border-zinc-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Email</label>
              <input
                type="email"
                name="primary_contact_email"
                value={primaryContactEmail}
                onChange={onChange}
                className="w-full p-3 rounded-lg bg-zinc-900 border border-zinc-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Telepon</label>
              <input
                type="tel"
                name="primary_contact_phone"
                value={primaryContactPhone}
                onChange={onChange}
                className="w-full p-3 rounded-lg bg-zinc-900 border border-zinc-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
