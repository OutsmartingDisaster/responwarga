import { NextRequest, NextResponse } from 'next/server'
import { getSessionToken, revokeSession, clearSessionCookie } from '@/lib/auth/session'

export async function POST(request: NextRequest) {
  const token = await getSessionToken(request.cookies)
  const response = NextResponse.json({ success: true })
  clearSessionCookie(response)

  if (token) {
    await revokeSession(token)
  }

  return response
}
