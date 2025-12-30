import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromCookie } from './auth-utils'

/**
 * Middleware to require authentication for API routes
 * Returns null if authenticated, or error response if not
 */
export async function requireAuth(request: NextRequest): Promise<NextResponse | null> {
  const session = await getSessionFromCookie()

  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  return null // Auth passed
}
