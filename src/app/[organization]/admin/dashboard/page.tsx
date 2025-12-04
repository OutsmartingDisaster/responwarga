'use client'

import { useParams } from 'next/navigation'
import OrgAdminDashboard from './OrgAdminDashboard'

export default function OrgAdminDashboardPage() {
  const params = useParams()
  const orgSlug = params.organization as string

  return <OrgAdminDashboard orgSlug={orgSlug} />
}
