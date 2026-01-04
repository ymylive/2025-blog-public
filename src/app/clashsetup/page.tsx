'use client'

import { useMemo, useState } from 'react'
import { Fraunces, IBM_Plex_Mono, Spline_Sans } from 'next/font/google'

const display = Fraunces({ subsets: ['latin'], variable: '--font-display' })
const body = Spline_Sans({ subsets: ['latin'], variable: '--font-body' })
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '600'], variable: '--font-mono' })

const DEFAULT_URL =
  process.env.NEXT_PUBLIC_CLASH_DEFAULT_URL ||
  'https://api.v1.mk/sub?target=clash&url=https%3A%2F%2Fnano.nachoneko.cn%2Fapi%2Fv1%2Fclient%2Fsubscribe%3Ftoken%3D0564faff9cfd13442873e71f9a235469&insert=false&config=https%3A%2F%2Fraw.githubusercontent.com%2FACL4SSR%2FACL4SSR%2Fmaster%2FClash%2Fconfig%2FACL4SSR_Online_Full_AdblockPlus.ini&emoji=true&list=false&xudp=false&udp=false&tfo=false&expand=true&scv=false&fdn=false&new_name=true'

const API_PATH = '/api/clash/import'

type Status = 'idle' | 'loading' | 'success' | 'error'

export default function ClashSetupPage() {
  const [subscriptionUrl, setSubscriptionUrl] = useState(DEFAULT_URL)
  const [token, setToken] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')

  const statusLabel = useMemo(() => {
    switch (status) {
      case 'loading':
        return 'Importing'
      case 'success':
        return 'Imported'
      case 'error':
        return 'Failed'
      default:
        return 'Ready'
    }
  }, [status])

  const statusTone = useMemo(() => {
    switch (status) {
      case 'success':
        return 'bg-emerald-500/20 text-emerald-900 border-emerald-500/40'
      case 'error':
        return 'bg-rose-500/15 text-rose-900 border-rose-500/40'
      case 'loading':
        return 'bg-amber-500/15 text-amber-900 border-amber-500/40'
      default:
        return 'bg-slate-800/5 text-slate-700 border-slate-300/80'
    }
  }, [status])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('loading')
    setMessage('Pulling subscription and restarting mihomo...')

    try {
      const res = await fetch(API_PATH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionUrl, token })
      })

      const data = await res.json()
      if (!res.ok) {
        setStatus('error')
        setMessage(data?.error || 'Import failed. Check token or URL.')
        return
      }

      setStatus('success')
      setMessage('Subscription applied. Clash core restarted successfully.')
    } catch (error: any) {
      setStatus('error')
      setMessage(error?.message || 'Import failed. Network error.')
    }
  }

  return (
    <div
      className={`${display.variable} ${body.variable} ${mono.variable} relative min-h-screen overflow-hidden`}
      style={{
        background:
          'radial-gradient(circle at top, rgba(255, 197, 90, 0.18), transparent 45%), linear-gradient(135deg, #f6f3ea 0%, #f2f7fb 40%, #f8f3f0 100%)'
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            'linear-gradient(120deg, rgba(16, 35, 54, 0.08), transparent 40%), linear-gradient(0deg, rgba(16, 35, 54, 0.04) 1px, transparent 1px)',
          backgroundSize: '100% 100%, 32px 32px'
        }}
      />
      <div className="pointer-events-none absolute -left-32 top-12 h-72 w-72 rounded-full bg-[#102336]/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-40 h-64 w-64 rounded-full bg-[#f6b74a]/20 blur-3xl" />

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-16">
        <header className="flex flex-col gap-4">
          <div className="flex items-center gap-4 text-xs uppercase tracking-[0.35em] text-slate-600">
            <span className="h-[1px] w-10 bg-slate-400/60" />
            Clash Control
          </div>
          <h1
            className="text-balance text-4xl font-semibold text-slate-900 md:text-5xl"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Subscription Import Console
          </h1>
          <p className="max-w-2xl text-base text-slate-700 md:text-lg" style={{ fontFamily: 'var(--font-body)' }}>
            Apply a new Clash subscription in one shot. The server will download the YAML, reinsert controller settings,
            and restart mihomo instantly.
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <form
            onSubmit={handleSubmit}
            className="relative overflow-hidden rounded-[32px] border border-slate-200/80 bg-white/70 p-8 shadow-[0_30px_60px_-40px_rgba(15,23,42,0.25)] backdrop-blur"
          >
            <div className="absolute right-0 top-0 h-24 w-24 -translate-y-1/3 translate-x-1/3 rounded-full border border-dashed border-slate-300/60" />
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900" style={{ fontFamily: 'var(--font-display)' }}>
                  Import Settings
                </h2>
                <p className="text-sm text-slate-600">Target: mihomo on this VPS</p>
              </div>
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] ${statusTone}`}>
                {statusLabel}
              </span>
            </div>

            <div className="mt-8 flex flex-col gap-6">
              <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                Subscription URL
                <textarea
                  value={subscriptionUrl}
                  onChange={(event) => setSubscriptionUrl(event.target.value)}
                  rows={3}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-800 shadow-inner focus:border-slate-400"
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                Import Token (optional if logged in)
                <div className="flex items-center gap-2">
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={token}
                    onChange={(event) => setToken(event.target.value)}
                    placeholder="qq159741"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-inner focus:border-slate-400"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken((prev) => !prev)}
                    className="rounded-2xl border border-slate-200 px-3 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 transition hover:border-slate-400"
                  >
                    {showToken ? 'Hide' : 'Show'}
                  </button>
                </div>
              </label>

              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-600">
                <p className="font-semibold text-slate-800">Operation summary</p>
                <ul className="mt-2 space-y-1 text-sm">
                  <li>1. Download subscription YAML</li>
                  <li>2. Inject controller + UI settings</li>
                  <li>3. Restart mihomo service</li>
                </ul>
              </div>

              <button
                type="submit"
                disabled={status === 'loading'}
                className="group relative flex items-center justify-between overflow-hidden rounded-2xl border border-slate-900/10 bg-slate-900 px-6 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-white shadow-[0_18px_50px_-20px_rgba(15,23,42,0.5)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-slate-600"
              >
                <span>Apply Subscription</span>
                <span className="text-xs text-slate-300">{status === 'loading' ? 'Working...' : 'Run'}</span>
                <span className="pointer-events-none absolute inset-0 translate-y-full bg-gradient-to-r from-amber-400/20 via-transparent to-white/10 transition group-hover:translate-y-0" />
              </button>

              {message && (
                <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-700">
                  {message}
                </div>
              )}
            </div>
          </form>

          <aside className="flex flex-col gap-6">
            <div className="rounded-[28px] border border-slate-200/80 bg-white/70 p-6 backdrop-blur">
              <h3 className="text-lg font-semibold text-slate-900" style={{ fontFamily: 'var(--font-display)' }}>
                Quick Links
              </h3>
              <div className="mt-4 flex flex-col gap-3 text-sm text-slate-700" style={{ fontFamily: 'var(--font-mono)' }}>
                <a className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 transition hover:border-slate-400" href="/clash">
                  MetaCubeXD UI -> /clash
                </a>
                <a className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 transition hover:border-slate-400" href="/clash-api" target="_blank">
                  Clash API -> /clash-api
                </a>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200/80 bg-slate-900 p-6 text-slate-100 shadow-[0_24px_50px_-30px_rgba(15,23,42,0.6)]">
              <h3 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
                Current Endpoint
              </h3>
              <p className="mt-3 text-sm text-slate-200" style={{ fontFamily: 'var(--font-mono)' }}>
                WebSockets: wss://cornna.xyz/clash-api/traffic
              </p>
              <p className="mt-2 text-xs text-slate-400">
                If the UI shows WebSocket errors, refresh after import or double-check the token.
              </p>
            </div>

            <div className="rounded-[28px] border border-slate-200/80 bg-white/70 p-6 text-sm text-slate-700">
              <h3 className="text-lg font-semibold text-slate-900" style={{ fontFamily: 'var(--font-display)' }}>
                Notes
              </h3>
              <ul className="mt-3 space-y-2 text-sm">
                <li>Imports require HTTPS subscription URLs.</li>
                <li>Use the same token as the Clash controller secret.</li>
                <li>Server-side restart typically takes 1-2 seconds.</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
