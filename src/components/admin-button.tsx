'use client'

import { useState } from 'react'
import { LogIn, LogOut } from 'lucide-react'
import { useAuthStore } from '@/hooks/use-auth'
import AdminLoginDialog from './admin-login-dialog'

export default function AdminButton() {
	const { isAuthenticated, username, logout } = useAuthStore()
	const [showLoginDialog, setShowLoginDialog] = useState(false)

	if (isAuthenticated) {
		return (
			<button
				onClick={logout}
				className='fixed bottom-8 left-6 z-50 flex items-center gap-2 rounded-xl border bg-white/60 px-4 py-2 text-sm backdrop-blur-sm transition-colors hover:bg-white/80'
				title='退出登录'>
				<LogOut className='h-4 w-4' />
				<span className='max-sm:hidden'>{username || '退出'}</span>
			</button>
		)
	}

	return (
		<>
			<button
				onClick={() => setShowLoginDialog(true)}
				className='fixed bottom-8 left-6 z-50 flex items-center gap-2 rounded-xl border bg-white/60 px-4 py-2 text-sm backdrop-blur-sm transition-colors hover:bg-white/80'
				title='管理员登录'>
				<LogIn className='h-4 w-4' />
				<span className='max-sm:hidden'>登录</span>
			</button>
			<AdminLoginDialog open={showLoginDialog} onClose={() => setShowLoginDialog(false)} />
		</>
	)
}
