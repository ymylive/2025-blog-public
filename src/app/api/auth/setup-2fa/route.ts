import { NextResponse } from 'next/server'
import speakeasy from 'speakeasy'
import qrcode from 'qrcode'

// This endpoint should be disabled in production or protected
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Disabled in production' }, { status: 403 })
  }

  const secret = speakeasy.generateSecret({
    name: 'Blog Admin (cornna)',
    issuer: 'cornna.xyz',
    length: 32
  })

  const qrCodeDataUrl = await qrcode.toDataURL(secret.otpauth_url!)

  return NextResponse.json({
    secret: secret.base32,
    qrCode: qrCodeDataUrl
  })
}
