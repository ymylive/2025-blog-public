'use client'

import { useWriteStore } from './stores/write-store'
import { usePreviewStore } from './stores/preview-store'
import { WriteEditor } from './components/editor'
import { WriteSidebar } from './components/sidebar'
import { WriteActions } from './components/actions'
import { WritePreview } from './components/preview'
import { useEffect } from 'react'
import { useAdminAuth } from '@/lib/admin-auth'
import { Lock } from 'lucide-react'

export default function WritePage() {
	const { form, cover, reset } = useWriteStore()
	useEffect(() => reset(), [])
	const { isPreview, closePreview } = usePreviewStore()
	const { isAdmin } = useAdminAuth()

	const coverPreviewUrl = cover ? (cover.type === 'url' ? cover.url : cover.previewUrl) : null

	if (!isAdmin) {
		return (
			<div className='flex h-full flex-col items-center justify-center gap-4'>
				<Lock className='h-12 w-12 text-gray-400' />
				<h2 className='text-xl font-bold text-gray-600'>需要管理员权限</h2>
				<p className='text-secondary text-sm'>请先登录管理员账号后再发布文章</p>
			</div>
		)
	}

	return isPreview ? (
		<WritePreview form={form} coverPreviewUrl={coverPreviewUrl} onClose={closePreview} />
	) : (
		<>
			<div className='flex h-full justify-center gap-6 px-6 pt-24 pb-12'>
				<WriteEditor />
				<WriteSidebar />
			</div>

			<WriteActions />
		</>
	)
}
