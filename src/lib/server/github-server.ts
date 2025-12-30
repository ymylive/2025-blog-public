const GITHUB_CONFIG = {
  OWNER: process.env.GITHUB_OWNER!,
  REPO: process.env.GITHUB_REPO!,
  BRANCH: process.env.GITHUB_BRANCH || 'main',
  TOKEN: process.env.GITHUB_TOKEN!
}

export const GH_API = 'https://api.github.com'

/**
 * Get GitHub token - simply return the Personal Access Token
 */
export async function getGitHubToken(): Promise<string> {
  return GITHUB_CONFIG.TOKEN
}

export { GITHUB_CONFIG }
