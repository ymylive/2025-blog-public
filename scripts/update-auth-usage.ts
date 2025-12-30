// Script to update all files using old auth system
// Run with: pnpm tsx scripts/update-auth-usage.ts

import fs from 'fs'
import path from 'path'

const filesToUpdate = [
  'src/app/write/components/actions.tsx',
  'src/app/snippets/page.tsx',
  'src/app/share/page.tsx',
  'src/app/projects/page.tsx',
  'src/app/bloggers/page.tsx',
  'src/app/blog/page.tsx',
  'src/app/about/page.tsx',
  'src/app/(home)/config-dialog/index.tsx',
  'src/hooks/use-blog-index.ts',
  'src/app/write/hooks/use-publish.ts'
]

function updateFile(filePath: string) {
  const fullPath = path.join(process.cwd(), filePath)
  let content = fs.readFileSync(fullPath, 'utf-8')

  // Replace isAuth with isAuthenticated
  content = content.replace(/\bisAuth\b/g, 'isAuthenticated')

  // Remove setPrivateKey from destructuring
  content = content.replace(/const\s*\{\s*isAuthenticated,\s*setPrivateKey\s*\}/g, 'const { isAuthenticated }')
  content = content.replace(/const\s*\{\s*setPrivateKey,\s*isAuthenticated\s*\}/g, 'const { isAuthenticated }')

  // Remove handleChoosePrivateKey function
  content = content.replace(/const\s+handleChoosePrivateKey\s*=\s*async\s*\([^)]*\)\s*=>\s*\{[^}]*\}/gs, '')

  // Update button text
  content = content.replace(/const\s+buttonText\s*=\s*isAuthenticated\s*\?\s*['"]保存['"]\s*:\s*['"]导入密钥['"]/g, "const buttonText = isAuthenticated ? '保存' : '请先登录'")

  // Remove keyInputRef
  content = content.replace(/const\s+keyInputRef\s*=\s*useRef<[^>]+>\([^)]*\)\s*/g, '')

  // Remove hidden input for key file
  content = content.replace(/<input[^>]*ref=\{keyInputRef\}[^>]*\/>/gs, '')

  // Update handleSaveClick to check authentication
  content = content.replace(
    /const\s+handleSaveClick\s*=\s*\(\)\s*=>\s*\{[^}]*if\s*\(!isAuthenticated\)[^}]*keyInputRef[^}]*\}[^}]*\}/gs,
    `const handleSaveClick = () => {
		if (!isAuthenticated) {
			toast.error('请先登录')
			return
		}
		handleSave()
	}`
  )

  fs.writeFileSync(fullPath, content, 'utf-8')
  console.log(`✓ Updated ${filePath}`)
}

console.log('Updating auth usage in files...\n')

for (const file of filesToUpdate) {
  try {
    updateFile(file)
  } catch (error) {
    console.error(`✗ Failed to update ${file}:`, error)
  }
}

console.log('\nDone!')
