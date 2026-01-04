import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/server/auth-middleware'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import fs from 'node:fs/promises'

export const runtime = 'nodejs'

const execFileAsync = promisify(execFile)
const CONFIG_PATH = process.env.CLASH_CONFIG_PATH || '/etc/mihomo/config.yaml'
const CONFIG_SECRET = process.env.CLASH_SECRET || 'qq159741'
const IMPORT_TOKEN = process.env.CLASH_IMPORT_TOKEN || CONFIG_SECRET

function normalizeConfig(raw: string, secret: string) {
  const normalized = raw.replace(/\r\n/g, '\n')
  const filtered = normalized
    .split('\n')
    .filter((line) => !/^\s*(external-controller|external-ui|secret):/.test(line))

  const insert = [
    'external-controller: 127.0.0.1:9090',
    'external-ui: metacubexd',
    `secret: "${secret}"`
  ]

  const output: string[] = []
  let inserted = false
  for (const line of filtered) {
    output.push(line)
    if (!inserted && /^\s*log-level:/.test(line)) {
      output.push(...insert)
      inserted = true
    }
  }

  if (!inserted) {
    output.unshift(...insert)
  }

  return output.join('\n').trimEnd() + '\n'
}

function isValidSubscriptionUrl(value: string) {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' && parsed.hostname.length > 0
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAuth(request)

  let body: { subscriptionUrl?: string; token?: string } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const token = typeof body.token === 'string' ? body.token : ''
  const tokenOk = IMPORT_TOKEN && token === IMPORT_TOKEN
  if (authError && !tokenOk) return authError

  const subscriptionUrl = typeof body.subscriptionUrl === 'string' ? body.subscriptionUrl.trim() : ''
  if (!subscriptionUrl) {
    return NextResponse.json({ error: 'Subscription URL is required' }, { status: 400 })
  }

  if (!isValidSubscriptionUrl(subscriptionUrl)) {
    return NextResponse.json({ error: 'Subscription URL must be https://' }, { status: 400 })
  }

  const res = await fetch(subscriptionUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  })

  if (!res.ok) {
    return NextResponse.json(
      { error: 'Failed to download subscription', status: res.status },
      { status: 502 }
    )
  }

  const rawConfig = await res.text()
  if (!rawConfig.trim()) {
    return NextResponse.json({ error: 'Subscription returned empty config' }, { status: 400 })
  }

  const updatedConfig = normalizeConfig(rawConfig, CONFIG_SECRET || token || 'qq159741')

  try {
    await fs.writeFile(CONFIG_PATH, updatedConfig, 'utf-8')
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to write config', detail: error?.message }, { status: 500 })
  }

  try {
    await execFileAsync('systemctl', ['restart', 'mihomo'])
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to restart mihomo', detail: error?.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, length: updatedConfig.length })
}
