import { NextRequest, NextResponse } from 'next/server'
import { createUserAccount, findUserByEmail } from '@/lib/auth/user'
import { createSession, setSessionCookie } from '@/lib/auth/session'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { email, password, name, role } = body ?? {}

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })
  }

  const existing = await findUserByEmail(email)
  if (existing) {
    return NextResponse.json({ error: 'Email is already registered.' }, { status: 409 })
  }

  try {
    const user = await createUserAccount({
      email,
      password,
      role,
      name,
    })

    const session = await createSession(user.id)
    const response = NextResponse.json({ data: { user } })
    setSessionCookie(response, session.token, session.expiresAt)
    return response
  } catch (error: any) {
    console.error('[auth/register] failed', error)
    return NextResponse.json({ error: 'Failed to create account.' }, { status: 500 })
  }
}
