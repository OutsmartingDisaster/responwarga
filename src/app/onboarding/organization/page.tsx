'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Building2 } from 'lucide-react'
import { StepIndicator, StepNavigation, type Step } from '@/components/onboarding'
import { BasicInfoStep, ContactStep, LocationStep, DetailsStep } from '@/components/onboarding/steps'
import { AuthMessage } from '@/components/auth'
import { getSession } from '@/lib/auth/api'
import {
  INITIAL_FORM,
  slugify,
  checkSlugAvailability,
  createOrganization,
  linkUserToOrganization,
  type OrganizationForm
} from '@/lib/onboarding/organization'

const STEPS: Step[] = [
  { id: 1, title: 'Informasi Dasar', description: 'Nama dan jenis organisasi' },
  { id: 2, title: 'Kontak', description: 'Email, telepon, website' },
  { id: 3, title: 'Lokasi', description: 'Alamat dan wilayah' },
  { id: 4, title: 'Detail', description: 'Deskripsi organisasi' },
]

export default function OrganizationOnboarding() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [userId, setUserId] = useState<string | null>(null)
  const [form, setForm] = useState<OrganizationForm>(INITIAL_FORM)
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null)

  useEffect(() => {
    const init = async () => {
      const user = await getSession()
      if (!user) {
        router.push('/masuk')
        return
      }
      setUserId(user.id)
      if (user.profile?.name) {
        setForm(prev => ({
          ...prev,
          primary_contact_name: user.profile?.name || '',
          primary_contact_email: user.email,
        }))
      }
      setCheckingSession(false)
    }
    init()
  }, [router])

  const handleNameChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value
    const autoSlug = slugify(name)
    setForm({ ...form, name, slug: autoSlug })

    if (autoSlug) {
      const available = await checkSlugAvailability(autoSlug)
      setSlugAvailable(available)
      setError(available ? null : `Nama "${name}" sudah digunakan. Silakan pilih nama lain.`)
    } else {
      setSlugAvailable(null)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const canProceed = () => {
    if (currentStep === 1) return form.name.trim() !== '' && slugAvailable !== false
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId || !form.slug) return

    setLoading(true)
    setError(null)

    try {
      const org = await createOrganization(form)
      await linkUserToOrganization(userId, org.id)
      router.push(`/${org.slug}/admin/dashboard`)
    } catch (err: any) {
      setError(err.message || 'Gagal membuat organisasi')
    } finally {
      setLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-900">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 text-white py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <Building2 className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Buat Organisasi</h1>
          <p className="text-zinc-400">Lengkapi informasi organisasi Anda untuk memulai</p>
        </div>

        <StepIndicator steps={STEPS} currentStep={currentStep} />

        <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-xl p-6 shadow-xl">
          <form onSubmit={handleSubmit}>
            {currentStep === 1 && (
              <BasicInfoStep
                name={form.name}
                slug={form.slug}
                type={form.type}
                shortDescription={form.short_description}
                slugAvailable={slugAvailable}
                onNameChange={handleNameChange}
                onChange={handleChange}
              />
            )}
            {currentStep === 2 && (
              <ContactStep
                email={form.email}
                phone={form.phone}
                website={form.website}
                onChange={handleChange}
              />
            )}
            {currentStep === 3 && (
              <LocationStep
                address={form.address}
                city={form.city}
                province={form.province}
                country={form.country}
                onChange={handleChange}
              />
            )}
            {currentStep === 4 && (
              <DetailsStep
                description={form.description}
                logoUrl={form.logo_url}
                primaryContactName={form.primary_contact_name}
                primaryContactEmail={form.primary_contact_email}
                primaryContactPhone={form.primary_contact_phone}
                onChange={handleChange}
              />
            )}

            {error && <div className="mt-5"><AuthMessage type="error" message={error} /></div>}

            <StepNavigation
              currentStep={currentStep}
              totalSteps={4}
              canProceed={canProceed()}
              loading={loading}
              onPrev={() => setCurrentStep(s => Math.max(1, s - 1))}
              onNext={() => setCurrentStep(s => Math.min(4, s + 1))}
            />
          </form>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/onboarding/waiting')}
            className="text-zinc-500 hover:text-zinc-400 text-sm transition-colors"
          >
            Lewati untuk saat ini
          </button>
        </div>
      </div>
    </div>
  )
}
