'use client'

import { useAuthStore } from '@/hooks/use-auth'

export function useAdminAuth() {
	const { isAuthenticated, username } = useAuthStore()

	return {
		isAdmin: isAuthenticated,
		username
	}
}
