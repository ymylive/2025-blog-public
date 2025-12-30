'use client'

import { useAuthStore } from '@/hooks/use-auth'
import { toast } from 'sonner'

export const GH_API = 'https://api.github.com'

function handle401Error(): void {
	try {
		useAuthStore.getState().logout()
		toast.error('登录已过期，请重新登录')
	} catch (error) {
		console.error('Failed to handle 401:', error)
	}
}

function handle422Error(): void {
	toast.error('操作太快了，请操作慢一点')
}

async function callGitHubProxy(operation: string, params: any): Promise<any> {
	const res = await fetch('/api/github/operations', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ operation, params })
	})

	if (res.status === 401) {
		handle401Error()
		throw new Error('Unauthorized')
	}
	if (res.status === 422) {
		handle422Error()
		throw new Error('Rate limited')
	}
	if (!res.ok) {
		const data = await res.json().catch(() => ({}))
		throw new Error(data.error || `Operation failed: ${res.status}`)
	}

	return res.json()
}

export function toBase64Utf8(input: string): string {
	return btoa(unescape(encodeURIComponent(input)))
}

export async function getFileSha(path: string, branch: string): Promise<string | undefined> {
	const data = await callGitHubProxy('getFileSha', { path, branch })
	return data.sha
}

export async function putFile(path: string, contentBase64: string, message: string, branch: string) {
	return callGitHubProxy('putFile', { path, contentBase64, message, branch })
}

// Batch commit APIs

export async function getRef(ref: string): Promise<{ sha: string }> {
	return callGitHubProxy('getRef', { ref })
}

export type TreeItem = {
	path: string
	mode: '100644' | '100755' | '040000' | '160000' | '120000'
	type: 'blob' | 'tree' | 'commit'
	content?: string
	sha?: string | null
}

export async function createTree(tree: TreeItem[], baseTree?: string): Promise<{ sha: string }> {
	return callGitHubProxy('createTree', { tree, baseTree })
}

export async function createCommit(message: string, tree: string, parents: string[]): Promise<{ sha: string }> {
	return callGitHubProxy('createCommit', { message, tree, parents })
}

export async function updateRef(ref: string, sha: string, force = false): Promise<void> {
	await callGitHubProxy('updateRef', { ref, sha, force })
}

export async function readTextFileFromRepo(path: string, ref: string): Promise<string | null> {
	const data = await callGitHubProxy('readTextFile', { path, ref })
	return data.content
}

export async function listRepoFilesRecursive(path: string, ref: string): Promise<string[]> {
	const data = await callGitHubProxy('listFiles', { path, ref })
	return data.files
}

export async function createBlob(
	content: string,
	encoding: 'utf-8' | 'base64' = 'base64'
): Promise<{ sha: string }> {
	return callGitHubProxy('createBlob', { content, encoding })
}
