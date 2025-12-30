# 认证系统设置指南

## 已完成的更改

✅ 使用管理员登录 + Google Authenticator 2FA
✅ 使用 GitHub Personal Access Token 进行内容发布
✅ 所有 GitHub 操作通过后端 API 代理
✅ 更新了部署脚本以检查环境变量

## 本地开发设置

### 1. 生成管理员凭据

```bash
cd 2025-blog-public
pnpm tsx scripts/generate-admin-credentials.ts
```

这将生成：
- 密码哈希值
- 2FA 密钥（Base32 格式）
- QR 码（保存在 `scripts/qr-code.png`）
- JWT 密钥

### 2. 扫描 QR 码

使用 Google Authenticator 应用扫描生成的 QR 码

### 3. 生成 GitHub Personal Access Token

1. 访问：https://github.com/settings/tokens
2. 点击 "Generate new token" → "Generate new token (classic)"
3. 设置：
   - Note: `Blog CMS`
   - Expiration: `No expiration` 或自定义
   - 勾选 scopes: **repo** (完整仓库访问权限)
4. 点击 "Generate token"
5. **复制生成的 token**（只显示一次！）

### 4. 创建 .env.local 文件

```bash
cp .env.local.example .env.local
```

编辑 `.env.local` 并填入：

```env
GITHUB_OWNER=yysuni
GITHUB_REPO=2025-blog-public
GITHUB_BRANCH=main
GITHUB_TOKEN=ghp_你的GitHub Token

ADMIN_USERNAME=cornna
ADMIN_PASSWORD_HASH=生成的bcrypt哈希
ADMIN_TOTP_SECRET=生成的Base32密钥

JWT_SECRET=生成的JWT密钥
JWT_EXPIRES_IN=7d
```

### 4. 启动开发服务器

```bash
pnpm dev
```

### 5. 测试登录

1. 访问 http://localhost:2025
2. 点击左下角"登录"按钮
3. 输入：
   - 用户名：cornna
   - 密码：qq159741（或你设置的密码）
   - 2FA 验证码：从 Google Authenticator 获取

## VPS 生产环境设置

### 1. 在 VPS 上创建 .env 文件

```bash
ssh root@8.134.33.19
cd /www/wwwroot/2025-blog-public
nano .env
```

粘贴与本地相同的环境变量配置

### 2. 设置文件权限

```bash
chmod 600 .env
```

### 3. 部署

在本地运行：

```bash
python deploy.py
```

部署脚本将：
1. 构建前端（`pnpm build`）
2. 检查 VPS 上是否存在 .env 文件
3. 上传构建产物到 VPS
4. 安装依赖
5. 重启 PM2 进程

### 4. 验证部署

访问 https://cornna.xyz 并测试登录功能

## 新的认证流程

### 管理员登录
1. 用户输入用户名、密码和 2FA 验证码
2. 后端验证凭据
3. 返回 JWT token（存储在 HTTP-only cookie 中）
4. 前端显示已登录状态

### GitHub 操作
1. 前端调用 `/api/github/operations` 端点
2. 后端验证 JWT token
3. 使用服务器端私钥生成 GitHub token
4. 执行 GitHub API 操作
5. 返回结果给前端

## 安全改进

✅ GitHub 私钥永不暴露给浏览器
✅ 使用 bcrypt 进行密码哈希
✅ Google Authenticator 2FA 保护
✅ JWT token 存储在 HTTP-only cookie 中
✅ 登录速率限制（15分钟内最多5次尝试）
✅ 所有敏感数据存储在环境变量中

## 故障排除

### 2FA 验证码总是失败
- 原因：服务器和手机时间不同步
- 解决：增加 `auth-utils.ts` 中的 `window` 参数到 3-4

### GitHub 操作返回 401
- 原因：GitHub 私钥未正确加载
- 解决：检查 `.env` 中的 `GITHUB_PRIVATE_KEY` 换行符（`\n`）

### 部署脚本失败
- 原因：VPS 上缺少 .env 文件
- 解决：先在 VPS 上手动创建 .env 文件

### PM2 未加载环境变量
- 解决：运行 `pm2 restart 2025-blog --update-env`
