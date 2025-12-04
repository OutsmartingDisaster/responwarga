'use client'

import { Building2, Check } from 'lucide-react'

interface BasicInfoStepProps {
  name: string
  slug: string
  type: string
  shortDescription: string
  slugAvailable: boolean | null
  onNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void
}

const ORG_TYPES = [
  { value: '', label: 'Pilih jenis organisasi' },
  { value: 'NGO', label: 'NGO / LSM' },
  { value: 'Government', label: 'Pemerintah' },
  { value: 'Community', label: 'Komunitas' },
  { value: 'Corporate', label: 'Perusahaan' },
  { value: 'Academic', label: 'Akademik / Universitas' },
  { value: 'Other', label: 'Lainnya' },
]

export function BasicInfoStep({
  name,
  slug,
  type,
  shortDescription,
  slugAvailable,
  onNameChange,
  onChange
}: BasicInfoStepProps) {
  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          <Building2 className="w-4 h-4 inline mr-2" />
          Nama Organisasi *
        </label>
        <input
          type="text"
          name="name"
          required
          value={name}
          onChange={onNameChange}
          className="w-full p-3 rounded-lg bg-zinc-900 border border-zinc-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
          placeholder="Contoh: U-INSPIRE Indonesia"
        />
        {slug && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-zinc-400">
              URL Dashboard: /responder/<span className="font-mono text-blue-400">{slug}</span>/
            </span>
            {slugAvailable === true && (
              <span className="text-xs text-green-400 flex items-center gap-1">
                <Check className="w-3 h-3" /> Tersedia
              </span>
            )}
            {slugAvailable === false && (
              <span className="text-xs text-red-400">Sudah digunakan</span>
            )}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          Jenis Organisasi
        </label>
        <select
          name="type"
          value={type}
          onChange={onChange}
          className="w-full p-3 rounded-lg bg-zinc-900 border border-zinc-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
        >
          {ORG_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          Deskripsi Singkat
        </label>
        <input
          type="text"
          name="short_description"
          value={shortDescription}
          onChange={onChange}
          maxLength={100}
          className="w-full p-3 rounded-lg bg-zinc-900 border border-zinc-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
          placeholder="Deskripsi singkat organisasi (maks 100 karakter)"
        />
        <div className="text-xs text-zinc-500 mt-1 text-right">
          {shortDescription.length}/100
        </div>
      </div>
    </div>
  )
}
