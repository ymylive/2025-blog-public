'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Heart, Trash2, MessageCircle } from 'lucide-react'
import { useCommentsStore, type Comment } from '@/lib/comments-store'
import { useAdminAuth } from '@/lib/admin-auth'
import dayjs from 'dayjs'

interface BlogCommentsProps {
	blogSlug: string
}

export default function BlogComments({ blogSlug }: BlogCommentsProps) {
	const [author, setAuthor] = useState('')
	const [content, setContent] = useState('')
	const { comments, likes, loadComments, addComment, deleteComment, loadLikes, toggleLike } = useCommentsStore()
	const { isAdmin } = useAdminAuth()

	const blogComments = comments[blogSlug] || []
	const blogLikes = likes[blogSlug] || { count: 0, likedBySession: false }

	useEffect(() => {
		loadComments(blogSlug)
		loadLikes(blogSlug)
	}, [blogSlug, loadComments, loadLikes])

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!author.trim()) {
			toast.error('请输入昵称')
			return
		}
		if (!content.trim()) {
			toast.error('请输入评论内容')
			return
		}

		await addComment(blogSlug, author.trim(), content.trim(), isAdmin)
		toast.success('评论成功')
		setContent('')
	}

	const handleDelete = async (commentId: string) => {
		if (!isAdmin) return
		await deleteComment(blogSlug, commentId)
		toast.success('评论已删除')
	}

	const handleLike = async () => {
		await toggleLike(blogSlug)
	}

	return (
		<div className='mt-12 border-t pt-8'>
			<div className='mb-6 flex items-center justify-between'>
				<h3 className='flex items-center gap-2 text-lg font-bold'>
					<MessageCircle className='h-5 w-5' />
					评论 ({blogComments.length})
				</h3>
				<button
					onClick={handleLike}
					className={`flex items-center gap-1.5 rounded-full px-4 py-2 transition-all ${
						blogLikes.likedBySession
							? 'bg-red-100 text-red-500'
							: 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-400'
					}`}>
					<Heart className={`h-4 w-4 ${blogLikes.likedBySession ? 'fill-current' : ''}`} />
					<span className='text-sm font-medium'>{blogLikes.count}</span>
				</button>
			</div>

			<form onSubmit={handleSubmit} className='mb-8 space-y-4'>
				<div className='flex gap-4'>
					<input
						type='text'
						value={author}
						onChange={e => setAuthor(e.target.value)}
						placeholder='昵称'
						className='w-32 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-brand focus:outline-none'
					/>
					<input
						type='text'
						value={content}
						onChange={e => setContent(e.target.value)}
						placeholder='写下你的评论...'
						className='flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm focus:ring-2 focus:ring-brand focus:outline-none'
					/>
					<button type='submit' className='brand-btn rounded-lg px-4 py-2 text-sm'>
						发表
					</button>
				</div>
			</form>

			<div className='space-y-4'>
				{blogComments.length === 0 ? (
					<p className='text-secondary py-8 text-center text-sm'>暂无评论，来写第一条评论吧~</p>
				) : (
					blogComments.map((comment: Comment) => (
						<div key={comment.id} className='rounded-lg bg-white/60 p-4'>
							<div className='mb-2 flex items-center justify-between'>
								<div className='flex items-center gap-2'>
									<span className='font-medium'>{comment.author}</span>
									{comment.isAdmin && (
										<span className='rounded bg-brand/10 px-1.5 py-0.5 text-xs text-brand'>管理员</span>
									)}
								</div>
								<div className='flex items-center gap-2'>
									<span className='text-secondary text-xs'>{dayjs(comment.createdAt).format('YYYY/MM/DD HH:mm')}</span>
									{isAdmin && (
										<button
											onClick={() => handleDelete(comment.id)}
											className='text-secondary hover:text-red-500 transition-colors'>
											<Trash2 className='h-4 w-4' />
										</button>
									)}
								</div>
							</div>
							<p className='text-sm leading-relaxed'>{comment.content}</p>
						</div>
					))
				)}
			</div>
		</div>
	)
}
