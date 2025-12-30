// Script to update all GitHub operation callers to remove token parameters
// Run with: pnpm tsx scripts/update-github-callers.ts

import fs from 'fs'
import path from 'path'

const filesToUpdate = [
  'src/app/write/services/delete-blog.ts',
  'src/app/blog/services/save-blog-edits.ts',
  'src/app/blog/services/batch-delete-blogs.ts',
  'src/app/pictures/services/push-pictures.ts',
  'src/app/snippets/services/push-snippets.ts',
  'src/app/share/services/push-shares.ts',
  'src/app/projects/services/push-projects.ts',
  'src/app/bloggers/services/push-bloggers.ts',
  'src/app/about/services/push-about.ts',
  'src/app/(home)/services/push-site-content.ts',
  'src/lib/blog-index.ts'
]

function updateFile(filePath: string) {
  const fullPath = path.join(process.cwd(), filePath)
  let content = fs.readFileSync(fullPath, 'utf-8')

  // Remove imports
  content = content.replace(/import\s+\{\s*getAuthToken\s*\}\s+from\s+['"]@\/lib\/auth['"]\s*\n?/g, '')
  content = content.replace(/import\s+\{\s*GITHUB_CONFIG\s*\}\s+from\s+['"]@\/consts['"]\s*\n?/g, '')

  // Remove token retrieval
  content = content.replace(/const\s+token\s*=\s*await\s+getAuthToken\(\)\s*\n?/g, '')
  content = content.replace(/\/\/\s*获取认证.*\n/g, '')

  // Update function calls - remove token, owner, repo parameters
  content = content.replace(/await\s+getRef\(token,\s*GITHUB_CONFIG\.OWNER,\s*GITHUB_CONFIG\.REPO,\s*([^)]+)\)/g, 'await getRef($1)')
  content = content.replace(/await\s+createTree\(token,\s*GITHUB_CONFIG\.OWNER,\s*GITHUB_CONFIG\.REPO,\s*([^)]+)\)/g, 'await createTree($1)')
  content = content.replace(/await\s+createCommit\(token,\s*GITHUB_CONFIG\.OWNER,\s*GITHUB_CONFIG\.REPO,\s*([^)]+)\)/g, 'await createCommit($1)')
  content = content.replace(/await\s+updateRef\(token,\s*GITHUB_CONFIG\.OWNER,\s*GITHUB_CONFIG\.REPO,\s*([^)]+)\)/g, 'await updateRef($1)')
  content = content.replace(/await\s+createBlob\(token,\s*GITHUB_CONFIG\.OWNER,\s*GITHUB_CONFIG\.REPO,\s*([^)]+)\)/g, 'await createBlob($1)')
  content = content.replace(/await\s+getFileSha\(token,\s*GITHUB_CONFIG\.OWNER,\s*GITHUB_CONFIG\.REPO,\s*([^)]+)\)/g, 'await getFileSha($1)')
  content = content.replace(/await\s+putFile\(token,\s*GITHUB_CONFIG\.OWNER,\s*GITHUB_CONFIG\.REPO,\s*([^)]+)\)/g, 'await putFile($1)')
  content = content.replace(/await\s+readTextFileFromRepo\(token,\s*GITHUB_CONFIG\.OWNER,\s*GITHUB_CONFIG\.REPO,\s*([^)]+)\)/g, 'await readTextFileFromRepo($1)')
  content = content.replace(/await\s+listRepoFilesRecursive\(token,\s*GITHUB_CONFIG\.OWNER,\s*GITHUB_CONFIG\.REPO,\s*([^)]+)\)/g, 'await listRepoFilesRecursive($1)')

  // Replace GITHUB_CONFIG.BRANCH with 'main'
  content = content.replace(/GITHUB_CONFIG\.BRANCH/g, "'main'")
  content = content.replace(/`heads\/\$\{GITHUB_CONFIG\.BRANCH\}`/g, "'heads/main'")
  content = content.replace(/`heads\/\$\{'main'\}`/g, "'heads/main'")

  fs.writeFileSync(fullPath, content, 'utf-8')
  console.log(`✓ Updated ${filePath}`)
}

console.log('Updating GitHub operation callers...\n')

for (const file of filesToUpdate) {
  try {
    updateFile(file)
  } catch (error) {
    console.error(`✗ Failed to update ${file}:`, error)
  }
}

console.log('\nDone!')
