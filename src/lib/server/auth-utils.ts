import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import speakeasy from 'speakeasy'
import { cookies } from 'next/headers'

const JWT_SECRET = process.env.JWT_SECRET!
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

export interface JWTPayload {
  username: string
  iat: number
  exp: number
}

/**
 * Verify password against bcrypt hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/**
 * Verify TOTP code from Google Authenticator
 */
export function verifyTOTP(token: string, secret: string): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 2 // Allow 2 time steps before/after (60 seconds tolerance)
  })
}

/**
 * Generate JWT token for authenticated user
 */
export function generateJWT(username: string): string {
  return jwt.sign({ username }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

/**
 * Verify and decode JWT token
 */
export function verifyJWT(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload
  } catch {
    return null
  }
}

/**
 * Get session from HTTP-only cookie
 */
export async function getSessionFromCookie(): Promise<JWTPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value
  if (!token) return null
  return verifyJWT(token)
}

/**
 * Create Set-Cookie header for auth token
 */
export function setAuthCookie(token: string): string {
  const maxAge = 7 * 24 * 60 * 60 // 7 days in seconds
  const secureFlag = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  return `auth_token=${token}; HttpOnly${secureFlag}; SameSite=Strict; Path=/; Max-Age=${maxAge}`
}

/**
 * Create Set-Cookie header to clear auth token
 */
export function clearAuthCookie(): string {
  const secureFlag = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  return `auth_token=; HttpOnly${secureFlag}; SameSite=Strict; Path=/; Max-Age=0`
}
