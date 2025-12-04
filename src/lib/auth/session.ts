import crypto from 'crypto'
import { cookies as nextCookies } from 'next/headers'
import type { NextResponse } from 'next/server'
import { query } from '@/lib/db/pool'
import type { AuthUser, ProfileRecord } from '@/lib/auth/types'

const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'rw_session'
const SESSION_MAX_AGE_DAYS = Number(process.env.SESSION_MAX_AGE_DAYS || '7')
const SESSION_MAX_AGE_MS = SESSION_MAX_AGE_DAYS * 24 * 60 * 60 * 1000

interface CookieReader {
  get(name: string): { value: string } | undefined
}

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function getExpiryDate() {
  return new Date(Date.now() + SESSION_MAX_AGE_MS)
}

export async function createSession(userId: string) {
  const token = crypto.randomBytes(48).toString('hex')
  const tokenHash = hashToken(token)
  const expiresAt = getExpiryDate()

  await query(
    'INSERT INTO auth.sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)',
    [tokenHash, userId, expiresAt.toISOString()]
  )

  return { token, expiresAt }
}

export async function revokeSession(token: string) {
  const tokenHash = hashToken(token)
  await query('UPDATE auth.sessions SET revoked_at = NOW() WHERE token_hash = ', [tokenHash])
}

export function setSessionCookie(response: NextResponse, token: string, expiresAt: Date) {
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  })
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(0),
  })
}

async function fetchSessionUser(token: string) {
  const tokenHash = hashToken(token)
  const { rows } = await query<{
    user_id: string
    email: string
    role: string
    created_at: string
    profile_id: string | null
    profile_name: string | null
    profile_username: string | null
    profile_role: string | null
    profile_org_id: string | null
    profile_org_name: string | null
    profile_phone: string | null
    profile_status: string | null
  }>(
    `SELECT s.user_id,
            u.email,
            u.role,
            u.created_at,
            p.id                as profile_id,
            p.name              as profile_name,
            p.username          as profile_username,
            p.role              as profile_role,
            p.organization_id   as profile_org_id,
            p.organization      as profile_org_name,
            p.phone             as profile_phone,
            p.status            as profile_status
       FROM auth.sessions s
       JOIN auth.users u ON u.id = s.user_id
  LEFT JOIN profiles p ON p.user_id = s.user_id
      WHERE s.token_hash = $1
        AND s.expires_at > NOW()
        AND s.revoked_at IS NULL
      LIMIT 1`,
    [tokenHash]
  )

  if (!rows.length) {
    return null
  }

  const row = rows[0]
  const profile: ProfileRecord | null = row.profile_id
    ? {
      id: row.profile_id,
      user_id: row.user_id,
      name: row.profile_name,
      username: row.profile_username,
      role: row.profile_role || 'responder',
      organization_id: row.profile_org_id,
      organization: row.profile_org_name,
      phone: row.profile_phone,
      status: row.profile_status,
    }
    : null

  const user: AuthUser = {
    id: row.user_id,
    email: row.email,
    role: row.role,
    created_at: row.created_at,
    profile,
  }

  return user
}

export async function getSessionFromCookies(cookieSource?: CookieReader) {
  const jar = cookieSource ?? await nextCookies()
  const token = jar.get(SESSION_COOKIE_NAME)?.value
  if (!token) {
    return null
  }
  return fetchSessionUser(token)
}

export async function getSessionToken(cookieSource?: CookieReader) {
  const jar = cookieSource ?? await nextCookies();
  return jar.get(SESSION_COOKIE_NAME)?.value ?? null;
}
