import { toast } from 'sonner'
import { createBlob, createCommit, createTree, getRef, listRepoFilesRecursive, toBase64Utf8, TreeItem, updateRef } from '@/lib/github-client'
import { removeBlogFromIndex } from '@/lib/blog-index'

export async function deleteBlog(slug: string): Promise<void> {
	if (!slug) throw new Error('需要 slug')

	toast.info('正在获取分支信息...')
	const refData = await getRef('heads/main')
	const latestCommitSha = refData.sha

	const basePath = `public/blogs/${slug}`

	toast.info('正在收集文章文件...')
	const files = await listRepoFilesRecursive(basePath, 'main')
	if (files.length === 0) {
		throw new Error('文章不存在或已删除')
	}

	const treeItems: TreeItem[] = files.map(path => ({
		path,
		mode: '100644',
		type: 'blob',
		sha: null
	}))

	toast.info('正在更新索引...')
	const indexJson = await removeBlogFromIndex(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, slug, 'main')
	const indexBlob = await createBlob(toBase64Utf8(indexJson), 'base64')
	treeItems.push({
		path: 'public/blogs/index.json',
		mode: '100644',
		type: 'blob',
		sha: indexBlob.sha
	})

	toast.info('正在创建提交...')
	const treeData = await createTree(treeItems, latestCommitSha)
	const commitData = await createCommit(`删除文章: ${slug}`, treeData.sha, [latestCommitSha])

	toast.info('正在更新分支...')
	await updateRef('heads/main', commitData.sha)

	toast.success('删除成功！请等待页面部署后刷新')
}
