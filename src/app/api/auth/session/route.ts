import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromCookies } from '@/lib/auth/session'

export async function GET(request: NextRequest) {
  const user = await getSessionFromCookies(request.cookies)
  if (!user) {
    return NextResponse.json({ data: { user: null } }, { status: 200 })
  }
  return NextResponse.json({ data: { user } })
}
