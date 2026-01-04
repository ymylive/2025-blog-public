import { ProxyAgent } from 'undici'

const GITHUB_CONFIG = {
  OWNER: process.env.GITHUB_OWNER!,
  REPO: process.env.GITHUB_REPO!,
  BRANCH: process.env.GITHUB_BRANCH || 'main',
  TOKEN: process.env.GITHUB_TOKEN!
}

export const GH_API = 'https://api.github.com'

const githubProxyUrl = process.env.GITHUB_PROXY_URL || process.env.HTTPS_PROXY || process.env.HTTP_PROXY || ''
const githubProxyAgent = githubProxyUrl ? new ProxyAgent(githubProxyUrl) : null

type GitHubRequestInit = RequestInit & { dispatcher?: ProxyAgent }

export function withGitHubProxy(init: RequestInit = {}): GitHubRequestInit {
  if (!githubProxyAgent) return init
  return { ...init, dispatcher: githubProxyAgent }
}

/**
 * Get GitHub token - simply return the Personal Access Token
 */
export async function getGitHubToken(): Promise<string> {
  return GITHUB_CONFIG.TOKEN
}

export { GITHUB_CONFIG }
