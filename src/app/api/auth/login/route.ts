import { NextRequest, NextResponse } from 'next/server'
import { verifyPassword, verifyTOTP, generateJWT, setAuthCookie } from '@/lib/server/auth-utils'

const ADMIN_USERNAME = process.env.ADMIN_USERNAME!
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH!
const ADMIN_TOTP_SECRET = process.env.ADMIN_TOTP_SECRET!

// Simple in-memory rate limiting (use Redis in production for multi-instance)
const loginAttempts = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const attempt = loginAttempts.get(ip)

  if (!attempt || now > attempt.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 })
    return true
  }

  if (attempt.count >= 5) {
    return false
  }

  attempt.count++
  return true
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      )
    }

    const { username, password, totpCode } = await request.json()

    if (!username || !password || !totpCode) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify username
    if (username !== ADMIN_USERNAME) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Verify password
    const passwordValid = await verifyPassword(password, ADMIN_PASSWORD_HASH)
    if (!passwordValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Verify TOTP
    const totpValid = verifyTOTP(totpCode, ADMIN_TOTP_SECRET)
    if (!totpValid) {
      return NextResponse.json(
        { error: 'Invalid 2FA code' },
        { status: 401 }
      )
    }

    // Generate JWT
    const token = generateJWT(username)

    // Set HTTP-only cookie
    const response = NextResponse.json({ success: true, username })
    response.headers.set('Set-Cookie', setAuthCookie(token))

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
