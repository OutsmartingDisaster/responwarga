import { NextRequest, NextResponse } from 'next/server'
import type { QueryRequest } from '@/lib/data/types'
import { runQuery } from '@/lib/server/runQuery'
import { getSessionFromCookies } from '@/lib/auth/session'

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as QueryRequest
  const user = await getSessionFromCookies(request.cookies)
  const context = user ? { userId: user.id, role: user.role } : undefined
  const result = await runQuery(payload, context)
  return NextResponse.json(result, { status: result.error ? 400 : 200 })
}
