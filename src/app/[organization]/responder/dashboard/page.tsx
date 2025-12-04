'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getSession } from '@/lib/auth/api'
import DisasterResponseDashboard from '@/app/responder/dashboard/DisasterResponseDashboard'

export default function ResponderDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const params = useParams()
  const orgSlug = params.organization as string

  useEffect(() => {
    async function init() {
      try {
        // Check session
        const user = await getSession()
        if (!user) {
          router.push('/masuk')
          return
        }

        // Redirect org_admin to admin dashboard
        const role = user.profile?.role || user.role
        if (role === 'org_admin') {
          router.replace(`/${orgSlug}/admin/dashboard`)
          return
        }

        // Verify organization exists and user has access
        const response = await fetch('/api/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'select',
            table: 'organizations',
            filters: [{ column: 'slug', operator: 'eq', value: orgSlug }],
            single: true
          })
        })

        const result = await response.json()
        if (!response.ok || !result.data) {
          throw new Error('Organization not found')
        }

        setLoading(false)
      } catch (err: any) {
        setError(err.message || 'An error occurred')
        setLoading(false)
      }
    }

    init()
  }, [router, orgSlug])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-900">
        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-6 max-w-md">
          <p className="text-red-400">{error}</p>
          <button
            onClick={() => router.push('/masuk')}
            className="mt-4 px-4 py-2 bg-zinc-700 rounded hover:bg-zinc-600 text-white"
          >
            Kembali ke Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100">
      <DisasterResponseDashboard />
    </div>
  )
}
