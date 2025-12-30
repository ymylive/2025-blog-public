import bcrypt from 'bcryptjs'
import speakeasy from 'speakeasy'
import qrcode from 'qrcode'
import crypto from 'crypto'

async function generateCredentials() {
  console.log('='.repeat(60))
  console.log('Admin Credentials Generator')
  console.log('='.repeat(60))
  console.log()

  // Generate password hash
  const password = 'qq159741' // Change this to your desired password
  console.log('Password:', password)
  const passwordHash = await bcrypt.hash(password, 10)
  console.log('Password Hash:', passwordHash)
  console.log()

  // Generate TOTP secret
  const secret = speakeasy.generateSecret({
    name: 'Blog Admin (cornna)',
    issuer: 'cornna.xyz',
    length: 32
  })

  console.log('TOTP Secret (Base32):', secret.base32)
  console.log('TOTP URL:', secret.otpauth_url)
  console.log()

  // Generate QR code
  try {
    const qrCodeDataUrl = await qrcode.toDataURL(secret.otpauth_url!)
    console.log('QR Code (Data URL):')
    console.log(qrCodeDataUrl)
    console.log()

    // Save QR code to file
    const fs = await import('fs')
    const qrCodePath = './scripts/qr-code.png'
    const base64Data = qrCodeDataUrl.replace(/^data:image\/png;base64,/, '')
    fs.writeFileSync(qrCodePath, base64Data, 'base64')
    console.log(`QR Code saved to: ${qrCodePath}`)
    console.log('Scan this QR code with Google Authenticator app')
    console.log()
  } catch (error) {
    console.error('Error generating QR code:', error)
  }

  // Generate JWT secret
  const jwtSecret = crypto.randomBytes(32).toString('hex')
  console.log('JWT Secret:', jwtSecret)
  console.log()

  // Output .env format
  console.log('='.repeat(60))
  console.log('Add these to your .env.local file:')
  console.log('='.repeat(60))
  console.log()
  console.log('ADMIN_USERNAME=cornna')
  console.log(`ADMIN_PASSWORD_HASH=${passwordHash}`)
  console.log(`ADMIN_TOTP_SECRET=${secret.base32}`)
  console.log(`JWT_SECRET=${jwtSecret}`)
  console.log('JWT_EXPIRES_IN=7d')
  console.log()
  console.log('='.repeat(60))
  console.log('Next steps:')
  console.log('1. Scan the QR code with Google Authenticator')
  console.log('2. Copy the environment variables above to .env.local')
  console.log('3. Test the 2FA code generation in your app')
  console.log('='.repeat(60))
}

generateCredentials().catch(console.error)
