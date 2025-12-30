import { toast } from 'sonner'
import { createBlob, createCommit, createTree, getRef, listRepoFilesRecursive, toBase64Utf8, type TreeItem, updateRef } from '@/lib/github-client'
import type { BlogIndexItem } from '@/lib/blog-index'

export async function saveBlogEdits(originalItems: BlogIndexItem[], nextItems: BlogIndexItem[], categories: string[]): Promise<void> {
	const removedSlugs = originalItems.filter(item => !nextItems.some(next => next.slug === item.slug)).map(item => item.slug)
	const uniqueRemoved = Array.from(new Set(removedSlugs.filter(Boolean)))

	toast.info('正在获取分支信息...')
	const refData = await getRef('heads/main')
	const latestCommitSha = refData.sha

	const treeItems: TreeItem[] = []

	for (const slug of uniqueRemoved) {
		toast.info(`正在收集 ${slug} 文件...`)
		const basePath = `public/blogs/${slug}`
		const files = await listRepoFilesRecursive(basePath, 'main')

		for (const path of files) {
			treeItems.push({
				path,
				mode: '100644',
				type: 'blob',
				sha: null
			})
		}
	}

	toast.info('正在更新索引...')
	const sortedItems = [...nextItems].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
	const indexJson = JSON.stringify(sortedItems, null, 2)
	const indexBlob = await createBlob(toBase64Utf8(indexJson), 'base64')
	treeItems.push({
		path: 'public/blogs/index.json',
		mode: '100644',
		type: 'blob',
		sha: indexBlob.sha
	})

	toast.info('正在更新分类...')
	const uniqueCategories = Array.from(new Set(categories.map(c => c.trim()).filter(Boolean)))
	const categoriesJson = JSON.stringify({ categories: uniqueCategories }, null, 2)
	const categoriesBlob = await createBlob(toBase64Utf8(categoriesJson), 'base64')
	treeItems.push({
		path: 'public/blogs/categories.json',
		mode: '100644',
		type: 'blob',
		sha: categoriesBlob.sha
	})

	toast.info('正在创建提交...')
	const treeData = await createTree(treeItems, latestCommitSha)
	const actionLabels: string[] = []
	if (uniqueRemoved.length > 0) {
		actionLabels.push(`删除:${uniqueRemoved.join(',')}`)
	}
	actionLabels.push('更新索引')
	if (uniqueCategories.length > 0) {
		actionLabels.push('更新分类')
	}
	const commitLabel = actionLabels.join(' | ')
	const commitData = await createCommit(commitLabel, treeData.sha, [latestCommitSha])

	toast.info('正在更新分支...')
	await updateRef('heads/main', commitData.sha)

	toast.success('保存成功！请等待页面部署后刷新')
}

