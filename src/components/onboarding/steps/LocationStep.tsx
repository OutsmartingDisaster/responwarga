'use client'

import { MapPin } from 'lucide-react'

interface LocationStepProps {
  address: string
  city: string
  province: string
  country: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export function LocationStep({ address, city, province, country, onChange }: LocationStepProps) {
  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          <MapPin className="w-4 h-4 inline mr-2" />
          Alamat
        </label>
        <input
          type="text"
          name="address"
          value={address}
          onChange={onChange}
          className="w-full p-3 rounded-lg bg-zinc-900 border border-zinc-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
          placeholder="Jl. Contoh No. 123"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">Kota</label>
          <input
            type="text"
            name="city"
            value={city}
            onChange={onChange}
            className="w-full p-3 rounded-lg bg-zinc-900 border border-zinc-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            placeholder="Jakarta"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">Provinsi</label>
          <input
            type="text"
            name="province"
            value={province}
            onChange={onChange}
            className="w-full p-3 rounded-lg bg-zinc-900 border border-zinc-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            placeholder="DKI Jakarta"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">Negara</label>
        <input
          type="text"
          name="country"
          value={country}
          onChange={onChange}
          className="w-full p-3 rounded-lg bg-zinc-900 border border-zinc-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
          placeholder="Indonesia"
        />
      </div>
    </div>
  )
}
