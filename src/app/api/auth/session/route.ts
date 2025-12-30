import { NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/server/auth-utils'

export async function GET() {
  try {
    const session = await getSessionFromCookie()

    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }

    return NextResponse.json({
      authenticated: true,
      username: session.username
    })
  } catch (error) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }
}
