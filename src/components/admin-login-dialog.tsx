'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useAuthStore } from '@/hooks/use-auth'
import { DialogModal } from '@/components/dialog-modal'

interface AdminLoginDialogProps {
	open: boolean
	onClose: () => void
}

export default function AdminLoginDialog({ open, onClose }: AdminLoginDialogProps) {
	const [username, setUsername] = useState('')
	const [password, setPassword] = useState('')
	const [totpCode, setTotpCode] = useState('')
	const [isLoading, setIsLoading] = useState(false)
	const { login } = useAuthStore()

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setIsLoading(true)

		try {
			await login(username, password, totpCode)
			toast.success('登录成功')
			onClose()
			setUsername('')
			setPassword('')
			setTotpCode('')
		} catch (error: any) {
			toast.error(error.message || '登录失败')
		} finally {
			setIsLoading(false)
		}
	}

	if (!open) return null

	return (
		<DialogModal open={open} onClose={onClose} className='card w-sm'>
			<h2 className='mb-4 text-xl font-bold'>管理员登录</h2>
			<form onSubmit={handleSubmit} className='space-y-4'>
				<div>
					<label className='text-secondary mb-2 block text-sm font-medium'>用户名</label>
					<input
						type='text'
						value={username}
						onChange={e => setUsername(e.target.value)}
						placeholder='请输入用户名'
						className='w-full rounded-lg border border-gray-300 bg-gray-100 px-4 py-2 focus:ring-2 focus:ring-brand focus:outline-none'
						autoComplete='username'
					/>
				</div>
				<div>
					<label className='text-secondary mb-2 block text-sm font-medium'>密码</label>
					<input
						type='password'
						value={password}
						onChange={e => setPassword(e.target.value)}
						placeholder='请输入密码'
						className='w-full rounded-lg border border-gray-300 bg-gray-100 px-4 py-2 focus:ring-2 focus:ring-brand focus:outline-none'
						autoComplete='current-password'
					/>
				</div>
				<div>
					<label className='text-secondary mb-2 block text-sm font-medium'>2FA 验证码</label>
					<input
						type='text'
						value={totpCode}
						onChange={e => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
						placeholder='请输入 6 位验证码'
						className='w-full rounded-lg border border-gray-300 bg-gray-100 px-4 py-2 focus:ring-2 focus:ring-brand focus:outline-none'
						autoComplete='one-time-code'
						maxLength={6}
					/>
				</div>
				<div className='flex gap-3 pt-2'>
					<button
						type='submit'
						className='brand-btn flex-1 justify-center rounded-lg px-6 py-2.5'
						disabled={isLoading}
					>
						{isLoading ? '登录中...' : '登录'}
					</button>
					<button
						type='button'
						onClick={onClose}
						className='flex-1 rounded-lg border border-gray-300 bg-white px-6 py-2.5 transition-colors hover:bg-gray-50'>
						取消
					</button>
				</div>
			</form>
		</DialogModal>
	)
}
