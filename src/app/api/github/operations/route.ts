import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/server/auth-middleware'
import { getGitHubToken, GITHUB_CONFIG, GH_API, withGitHubProxy } from '@/lib/server/github-server'
import type { TreeItem } from '@/lib/github-client'

export const runtime = 'nodejs'

const fetchGitHub = (url: string, init?: RequestInit) => fetch(url, withGitHubProxy(init))

export async function POST(request: NextRequest) {
  // Check authentication
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const { operation, params } = await request.json()

    // Get GitHub token
    const token = await getGitHubToken()

    // Route to appropriate operation
    switch (operation) {
      case 'getRef':
        return await handleGetRef(token, params)
      case 'createTree':
        return await handleCreateTree(token, params)
      case 'createCommit':
        return await handleCreateCommit(token, params)
      case 'updateRef':
        return await handleUpdateRef(token, params)
      case 'createBlob':
        return await handleCreateBlob(token, params)
      case 'getFileSha':
        return await handleGetFileSha(token, params)
      case 'putFile':
        return await handlePutFile(token, params)
      case 'readTextFile':
        return await handleReadTextFile(token, params)
      case 'listFiles':
        return await handleListFiles(token, params)
      default:
        return NextResponse.json({ error: 'Unknown operation' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('GitHub operation error:', error)
    return NextResponse.json(
      { error: error.message || 'Operation failed' },
      { status: 500 }
    )
  }
}

async function handleGetRef(token: string, params: any) {
  const { ref } = params
  const res = await fetchGitHub(
    `${GH_API}/repos/${GITHUB_CONFIG.OWNER}/${GITHUB_CONFIG.REPO}/git/ref/${encodeURIComponent(ref)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    }
  )
  if (!res.ok) throw new Error(`Get ref failed: ${res.status}`)
  const data = await res.json()
  return NextResponse.json({ sha: data.object.sha })
}

async function handleCreateTree(token: string, params: any) {
  const { tree, baseTree } = params
  const res = await fetchGitHub(`${GH_API}/repos/${GITHUB_CONFIG.OWNER}/${GITHUB_CONFIG.REPO}/git/trees`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ tree, base_tree: baseTree })
  })
  if (!res.ok) throw new Error(`Create tree failed: ${res.status}`)
  const data = await res.json()
  return NextResponse.json({ sha: data.sha })
}

async function handleCreateCommit(token: string, params: any) {
  const { message, tree, parents } = params
  const res = await fetchGitHub(`${GH_API}/repos/${GITHUB_CONFIG.OWNER}/${GITHUB_CONFIG.REPO}/git/commits`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ message, tree, parents })
  })
  if (!res.ok) throw new Error(`Create commit failed: ${res.status}`)
  const data = await res.json()
  return NextResponse.json({ sha: data.sha })
}

async function handleUpdateRef(token: string, params: any) {
  const { ref, sha, force = false } = params
  const res = await fetchGitHub(
    `${GH_API}/repos/${GITHUB_CONFIG.OWNER}/${GITHUB_CONFIG.REPO}/git/refs/${encodeURIComponent(ref)}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sha, force })
    }
  )
  if (!res.ok) throw new Error(`Update ref failed: ${res.status}`)
  return NextResponse.json({ success: true })
}

async function handleCreateBlob(token: string, params: any) {
  const { content, encoding = 'base64' } = params
  const res = await fetchGitHub(`${GH_API}/repos/${GITHUB_CONFIG.OWNER}/${GITHUB_CONFIG.REPO}/git/blobs`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ content, encoding })
  })
  if (!res.ok) throw new Error(`Create blob failed: ${res.status}`)
  const data = await res.json()
  return NextResponse.json({ sha: data.sha })
}

async function handleGetFileSha(token: string, params: any) {
  const { path, branch } = params
  const res = await fetchGitHub(
    `${GH_API}/repos/${GITHUB_CONFIG.OWNER}/${GITHUB_CONFIG.REPO}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    }
  )
  if (res.status === 404) return NextResponse.json({ sha: undefined })
  if (!res.ok) throw new Error(`Get file sha failed: ${res.status}`)
  const data = await res.json()
  return NextResponse.json({ sha: data?.sha || undefined })
}

async function handlePutFile(token: string, params: any) {
  const { path, contentBase64, message, branch } = params

  // Get existing file SHA if it exists
  const shaRes = await fetchGitHub(
    `${GH_API}/repos/${GITHUB_CONFIG.OWNER}/${GITHUB_CONFIG.REPO}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    }
  )
  const sha = shaRes.status === 404 ? undefined : (await shaRes.json()).sha

  const res = await fetchGitHub(
    `${GH_API}/repos/${GITHUB_CONFIG.OWNER}/${GITHUB_CONFIG.REPO}/contents/${encodeURIComponent(path)}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message, content: contentBase64, branch, ...(sha ? { sha } : {}) })
    }
  )
  if (!res.ok) throw new Error(`Put file failed: ${res.status}`)
  const data = await res.json()
  return NextResponse.json(data)
}

async function handleReadTextFile(token: string, params: any) {
  const { path, ref } = params
  const res = await fetchGitHub(
    `${GH_API}/repos/${GITHUB_CONFIG.OWNER}/${GITHUB_CONFIG.REPO}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(ref)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    }
  )
  if (res.status === 404) return NextResponse.json({ content: null })
  if (!res.ok) throw new Error(`Read file failed: ${res.status}`)
  const data: any = await res.json()
  if (Array.isArray(data) || !data.content) return NextResponse.json({ content: null })

  try {
    const decoded = decodeURIComponent(escape(Buffer.from(data.content, 'base64').toString('binary')))
    return NextResponse.json({ content: decoded })
  } catch {
    const decoded = Buffer.from(data.content, 'base64').toString('utf-8')
    return NextResponse.json({ content: decoded })
  }
}

async function handleListFiles(token: string, params: any) {
  const { path, ref } = params

  async function fetchPath(targetPath: string): Promise<string[]> {
    const res = await fetchGitHub(
      `${GH_API}/repos/${GITHUB_CONFIG.OWNER}/${GITHUB_CONFIG.REPO}/contents/${encodeURIComponent(targetPath)}?ref=${encodeURIComponent(ref)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28'
        }
      }
    )
    if (res.status === 404) return []
    if (!res.ok) throw new Error(`Read directory failed: ${res.status}`)
    const data: any = await res.json()

    if (Array.isArray(data)) {
      const files: string[] = []
      for (const item of data) {
        if (item.type === 'file') {
          files.push(item.path)
        } else if (item.type === 'dir') {
          const nested = await fetchPath(item.path)
          files.push(...nested)
        }
      }
      return files
    }
    if (data?.type === 'file') return [data.path]
    if (data?.type === 'dir') return fetchPath(data.path)
    return []
  }

  const files = await fetchPath(path)
  return NextResponse.json({ files })
}

