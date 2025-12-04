/**
 * Organization onboarding utilities
 */

export interface OrganizationForm {
  name: string
  slug: string
  type: string
  email: string
  phone: string
  website: string
  address: string
  city: string
  province: string
  country: string
  map_location: string
  short_description: string
  description: string
  logo_url: string
  primary_contact_name: string
  primary_contact_email: string
  primary_contact_phone: string
}

export const INITIAL_FORM: OrganizationForm = {
  name: '',
  slug: '',
  type: '',
  email: '',
  phone: '',
  website: '',
  address: '',
  city: '',
  province: '',
  country: 'Indonesia',
  map_location: '',
  short_description: '',
  description: '',
  logo_url: '',
  primary_contact_name: '',
  primary_contact_email: '',
  primary_contact_phone: '',
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/--+/g, '-')
}

export async function checkSlugAvailability(slug: string): Promise<boolean> {
  try {
    const response = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'select',
        table: 'organizations',
        columns: 'id',
        filters: [{ column: 'slug', operator: 'eq', value: slug }]
      })
    })
    const result = await response.json()
    return !(result.data && result.data.length > 0)
  } catch {
    return true // Assume available on error
  }
}

export async function createOrganization(form: OrganizationForm): Promise<{ id: string; slug: string }> {
  const response = await fetch('/api/data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'insert',
      table: 'organizations',
      values: { ...form, onboarding_complete: true },
    })
  })

  const result = await response.json()
  if (!response.ok) {
    throw new Error(result.error || 'Failed to create organization')
  }

  return result.data[0]
}

export async function linkUserToOrganization(userId: string, organizationId: string): Promise<void> {
  const response = await fetch('/api/data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'update',
      table: 'profiles',
      values: { organization_id: organizationId },
      filters: [{ column: 'user_id', operator: 'eq', value: userId }]
    })
  })

  if (!response.ok) {
    const result = await response.json()
    throw new Error(result.error || 'Failed to link user to organization')
  }
}
