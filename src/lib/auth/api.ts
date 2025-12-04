/**
 * Client-side auth API functions
 */

import type { AuthUser } from './types'

export interface AuthResponse {
  success: boolean
  user?: AuthUser
  error?: string
}

export async function registerUser(data: {
  email: string
  password: string
  name: string
  role: string
}): Promise<AuthResponse> {
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    const result = await response.json()

    if (!response.ok) {
      return { success: false, error: result.error || 'Pendaftaran gagal' }
    }

    return { success: true, user: result.data?.user }
  } catch (error: any) {
    return { success: false, error: error.message || 'Pendaftaran gagal' }
  }
}

export async function loginUser(data: {
  email: string
  password: string
}): Promise<AuthResponse> {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include',
    })

    const result = await response.json()

    if (!response.ok) {
      return { success: false, error: result.error || 'Login gagal' }
    }

    return { success: true, user: result.data?.user }
  } catch (error: any) {
    return { success: false, error: error.message || 'Login gagal' }
  }
}

export async function logoutUser(): Promise<void> {
  await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include'
  })
}

export async function getSession(): Promise<AuthUser | null> {
  try {
    const response = await fetch('/api/auth/session', {
      method: 'GET',
      credentials: 'include'
    })
    const result = await response.json()
    return result.data?.user || null
  } catch {
    return null
  }
}
