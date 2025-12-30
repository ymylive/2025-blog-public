import { NextResponse } from 'next/server'
import { clearAuthCookie } from '@/lib/server/auth-utils'

export async function POST() {
  const response = NextResponse.json({ success: true })
  response.headers.set('Set-Cookie', clearAuthCookie())
  return response
}
