import { create } from 'zustand'

interface AuthStore {
	// State
	isAuthenticated: boolean
	username: string | null

	// Actions
	login: (username: string, password: string, totpCode: string) => Promise<void>
	logout: () => Promise<void>
	checkSession: () => Promise<void>
}

export const useAuthStore = create<AuthStore>((set, get) => ({
	isAuthenticated: false,
	username: null,

	login: async (username: string, password: string, totpCode: string) => {
		const res = await fetch('/api/auth/login', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ username, password, totpCode })
		})

		if (!res.ok) {
			const data = await res.json()
			throw new Error(data.error || 'Login failed')
		}

		const data = await res.json()
		set({ isAuthenticated: true, username: data.username })
	},

	logout: async () => {
		await fetch('/api/auth/logout', { method: 'POST' })
		set({ isAuthenticated: false, username: null })
	},

	checkSession: async () => {
		try {
			const res = await fetch('/api/auth/session')
			if (res.ok) {
				const data = await res.json()
				if (data.authenticated) {
					set({ isAuthenticated: true, username: data.username })
					return
				}
			}
		} catch (error) {
			console.error('Session check failed:', error)
		}
		set({ isAuthenticated: false, username: null })
	}
}))

// Check session on app load
if (typeof window !== 'undefined') {
	useAuthStore.getState().checkSession()
}
