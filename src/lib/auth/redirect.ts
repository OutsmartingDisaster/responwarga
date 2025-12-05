/**
 * Auth redirect utilities
 * Handles post-login and post-registration redirects based on user role
 */

import type { AuthUser } from './types'

export interface RedirectResult {
  path: string
  message?: string
  delay?: number
}

/**
 * Get organization slug by ID
 */
export async function getOrgSlug(organizationId: string): Promise<string | null> {
  try {
    const response = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'select',
        table: 'organizations',
        columns: 'slug',
        filters: [{ column: 'id', operator: 'eq', value: organizationId }]
      })
    })

    if (response.ok) {
      const result = await response.json()
      if (result.data?.[0]?.slug) {
        return result.data[0].slug
      }
    }
    return null
  } catch {
    return null
  }
}

/**
 * Determine redirect path after successful registration
 */
export async function getRegistrationRedirect(user: AuthUser): Promise<RedirectResult> {
  const role = user.role || user.profile?.role

  // org_admin without organization -> onboarding
  if (role === 'org_admin') {
    if (!user.profile?.organization_id) {
      return {
        path: '/onboarding/organization',
        message: 'Akun berhasil dibuat! Mengalihkan ke halaman pembuatan organisasi...',
        delay: 1500
      }
    }
    // org_admin with organization -> admin dashboard
    const slug = await getOrgSlug(user.profile.organization_id)
    if (slug) {
      return {
        path: `/${slug}/admin/dashboard`,
        message: 'Akun berhasil dibuat! Mengalihkan ke dashboard...',
        delay: 1500
      }
    }
  }

  // responder with organization -> responder dashboard
  if (user.profile?.organization_id) {
    const slug = await getOrgSlug(user.profile.organization_id)
    if (slug) {
      return {
        path: `/${slug}/responder/dashboard`,
        message: 'Akun berhasil dibuat! Mengalihkan ke dashboard...',
        delay: 1500
      }
    }
  }

  // responder without organization -> waiting page
  return {
    path: '/onboarding/waiting',
    message: 'Akun berhasil dibuat! Silakan hubungi admin organisasi untuk bergabung.',
    delay: 2000
  }
}

/**
 * Determine redirect path after successful login
 */
export async function getLoginRedirect(user: AuthUser): Promise<RedirectResult> {
  const role = user.profile?.role || user.role

  // Super Admin -> mohonijin dashboard
  if (role === 'super_admin' || role === 'admin') {
    return { path: '/mohonijin/dashboard' }
  }

  // Public user -> home
  if (role === 'public') {
    return { path: '/' }
  }

  // org_admin -> /{org}/admin/dashboard
  if (role === 'org_admin') {
    if (!user.profile?.organization_id) {
      return { path: '/onboarding/organization' }
    }
    const slug = await getOrgSlug(user.profile.organization_id)
    return slug ? { path: `/${slug}/admin/dashboard` } : { path: '/onboarding/organization' }
  }

  // responder -> /{org}/responder/dashboard
  if (user.profile?.organization_id) {
    const slug = await getOrgSlug(user.profile.organization_id)
    if (slug) {
      return { path: `/${slug}/responder/dashboard` }
    }
  }

  return { path: '/onboarding/waiting' }
}
