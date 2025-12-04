import { NextRequest, NextResponse } from 'next/server'
import { verifyCredentials } from '@/lib/auth/user'
import { createSession, setSessionCookie } from '@/lib/auth/session'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body ?? {}

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })
    }

    const user = await verifyCredentials(email, password)
    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
    }

    const session = await createSession(user.id)
    const response = NextResponse.json({ data: { user } })
    setSessionCookie(response, session.token, session.expiresAt)
    return response
  } catch (error: any) {
    console.error('[auth/login] failed', error)
    
    // Handle JSON parsing errors specifically
    if (error instanceof SyntaxError && error.message.includes('JSON')) {
      return NextResponse.json({ error: 'Invalid request body. JSON expected.' }, { status: 400 })
    }
    
    return NextResponse.json({ error: 'Unable to log in.' }, { status: 500 })
  }
}
