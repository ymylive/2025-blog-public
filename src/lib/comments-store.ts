'use client'

import { create } from 'zustand'

export interface Comment {
	id: string
	blogSlug: string
	author: string
	content: string
	createdAt: string
	isAdmin: boolean
}

export interface LikeData {
	blogSlug: string
	count: number
	likedBySession: boolean
}

interface CommentsStore {
	comments: Record<string, Comment[]>
	likes: Record<string, LikeData>
	loadComments: (blogSlug: string) => Promise<void>
	addComment: (blogSlug: string, author: string, content: string, isAdmin: boolean) => Promise<void>
	deleteComment: (blogSlug: string, commentId: string) => Promise<void>
	loadLikes: (blogSlug: string) => Promise<void>
	toggleLike: (blogSlug: string) => Promise<void>
}

const COMMENTS_API = '/api/comments'
const LIKES_API = '/api/likes'

// 获取会话ID用于点赞去重
function getSessionId(): string {
	if (typeof sessionStorage === 'undefined') return ''
	let sessionId = sessionStorage.getItem('session_id')
	if (!sessionId) {
		sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36)
		sessionStorage.setItem('session_id', sessionId)
	}
	return sessionId
}

export const useCommentsStore = create<CommentsStore>((set, get) => ({
	comments: {},
	likes: {},

	loadComments: async (blogSlug: string) => {
		try {
			const res = await fetch(`${COMMENTS_API}?slug=${encodeURIComponent(blogSlug)}`)
			if (res.ok) {
				const data = await res.json()
				set(state => ({
					comments: { ...state.comments, [blogSlug]: data.comments || [] }
				}))
			}
		} catch (error) {
			console.error('Failed to load comments:', error)
		}
	},

	addComment: async (blogSlug: string, author: string, content: string, isAdmin: boolean) => {
		const comment: Comment = {
			id: Math.random().toString(36).substring(2) + Date.now().toString(36),
			blogSlug,
			author,
			content,
			createdAt: new Date().toISOString(),
			isAdmin
		}

		try {
			const res = await fetch(COMMENTS_API, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(comment)
			})
			if (res.ok) {
				set(state => ({
					comments: {
						...state.comments,
						[blogSlug]: [...(state.comments[blogSlug] || []), comment]
					}
				}))
			}
		} catch (error) {
			console.error('Failed to add comment:', error)
		}
	},

	deleteComment: async (blogSlug: string, commentId: string) => {
		try {
			const res = await fetch(`${COMMENTS_API}?slug=${encodeURIComponent(blogSlug)}&id=${commentId}`, {
				method: 'DELETE'
			})
			if (res.ok) {
				set(state => ({
					comments: {
						...state.comments,
						[blogSlug]: (state.comments[blogSlug] || []).filter(c => c.id !== commentId)
					}
				}))
			}
		} catch (error) {
			console.error('Failed to delete comment:', error)
		}
	},

	loadLikes: async (blogSlug: string) => {
		try {
			const sessionId = getSessionId()
			const res = await fetch(`${LIKES_API}?slug=${encodeURIComponent(blogSlug)}&session=${sessionId}`)
			if (res.ok) {
				const data = await res.json()
				set(state => ({
					likes: {
						...state.likes,
						[blogSlug]: {
							blogSlug,
							count: data.count || 0,
							likedBySession: data.likedBySession || false
						}
					}
				}))
			}
		} catch (error) {
			console.error('Failed to load likes:', error)
		}
	},

	toggleLike: async (blogSlug: string) => {
		const sessionId = getSessionId()
		const currentLike = get().likes[blogSlug]
		const isLiked = currentLike?.likedBySession || false

		try {
			const res = await fetch(LIKES_API, {
				method: isLiked ? 'DELETE' : 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ slug: blogSlug, session: sessionId })
			})
			if (res.ok) {
				set(state => ({
					likes: {
						...state.likes,
						[blogSlug]: {
							blogSlug,
							count: (currentLike?.count || 0) + (isLiked ? -1 : 1),
							likedBySession: !isLiked
						}
					}
				}))
			}
		} catch (error) {
			console.error('Failed to toggle like:', error)
		}
	}
}))
