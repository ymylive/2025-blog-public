> blog 前端网站（yysuni.com）已链接到 public 仓库

This project uses admin login + Google 2FA; the GitHub Personal Access Token is stored only in server environment variables.

## 0. Fork 项目

请先 fork 我的项目到你自己的仓库中。后续我的更新，可以直接同步最新功能。

![](/blogs/readme/f8fb1af7c34a8cf8.webp)

## 1. 安装

使用该项目可以先不做本地开发，直接部署然后配置环境变量。具体变量名请看下列大写变量

```ts
export const GITHUB_CONFIG = {
	OWNER: process.env.NEXT_PUBLIC_GITHUB_OWNER || 'yysuni',
	REPO: process.env.NEXT_PUBLIC_GITHUB_REPO || '2025-blog-public',
	BRANCH: process.env.NEXT_PUBLIC_GITHUB_BRANCH || 'main',
	APP_ID: process.env.NEXT_PUBLIC_GITHUB_APP_ID || '-'
} as const
```

也可以自己手动先调整安装，可自行 `pnpm i`

## 2. 部署

我这里熟悉 Vercel 部署，就以 Vercel 部署为例子。创建 Project => Import 这个项目

![](/blogs/readme/730266f17fab9717.png)

无需配置，直接点部署

![](/blogs/readme/95dee9a69154d0d0.png)

大约 60 秒会部署完成，有一个直接 vercel 域名，如：https://2025-blog-public.vercel.app/

Deployment is done. Next configure a GitHub Personal Access Token.

## 3. Configure GitHub Personal Access Token

1. Visit: https://github.com/settings/tokens
2. Click "Generate new token" -> "Generate new token (classic)"
3. Set:
   - Note: Blog CMS
   - Expiration: No expiration
   - Scopes: repo
4. Copy the token (shown once)
5. Set `GITHUB_TOKEN` in your deployment environment

## 4. 完成

现在，部署的这个网站就可以开始使用前端改内容了。比如更改一个分享内容。

**提示**，网站前端页面删改完提示成功之后，你需要等待后台的部署完成，再刷新页面才能完成服务器内容的更新哦。

## 5. 删除

使用这个项目应该第一件事需要删除我的 blog，单独删除，批量删除已完成。

## 6. 配置

大部分页面右上角都会有一个编辑按钮，意味着你可以使用 **private key** 进行配置部署。

### 6.1 网站配置

首页有一个不显眼的配置按钮，点击就能看到现在可以配置的内容。

![](/blogs/readme/cddb4710e08a5069.png)

## 7. 写 blog

写 blog 的图片管理，可能会有疑惑。图片管理推荐逻辑是先点击 **+ 号** 添加图片，（推荐先压缩好，尺寸推荐宽度不超过 1200）。然后将上传好的图片直接拖入文案编辑区，这就已经添加好了，点击右上角预览就可以看到效果。

## 8. 写给非前端

非前端配置内容，还是需要一个文件指引。下面写一些更细致的代码配置。

### 8.1 移除 Liquid Grass

> 已移动至相关文章中显示，图例已过时

![](/blogs/readme/f70ff3fe3a77f193.png)

### 8.2 配置首页内容

首页的内容现在只能前端配置一部分，所以代码更改在 `src/app/(home)` 目录，这个目录代表首页所有文件。首页的具体文件为  `src/app/(home)/page.tsx`

 ![](/blogs/readme/011679cd9bf73602.png)

这里可以看到有很多 `Card` 文件，需要改那个首页 Card 内容就可以点入那个具体文件修改。

比如中间的内容，为 `HiCard`，点击 `hi-card.tsx` 文件，即可更改其内容。

![](/blogs/readme/20b0791d012163ee.png)

#### 特殊的导航 Card

因为这个 Card 是全局都在的，所以放在了 `src/components` 目录

![](/blogs/readme/9780c38f886322fd.png)

### 8.3 移除 blog 列表的更多按钮

`src/app/blog/page.tsx` 文件，下图位置，删除这部分代码。

![](/blogs/readme/a190410a273b2bea.png)

## 9. 互助群

对于完全不是**程序员**的用户，确实会对于更新代码后，如何同步，如何**合并代码**手足无措。我创建了一个 **QQ群**（加群会简单点），或者 vx 群还是 tg 群会好一点可以 issue 里面说下就行。

QQ 群：[https://qm.qq.com/q/spdpenr4k2](https://qm.qq.com/q/spdpenr4k2)
> 不好意思，之前的那个qq群ID 不知道为啥搜不到😂

微信群：刚建好了一个微信群，没有 qq 的可以用这个微信群
![](/blogs/readme/1e38ea817ede4f75.webp)

应该主要是我自己亲自帮助你们遇到问题怎么办。（后续看看有没有好心人）

希望多多的非程序员加入 blogger 行列，web blog 还是很好玩的，属于自己的 blog 世界。

游戏资产不一定属于你的，你只有**使用权**，但这个 blog **网站、内容、仓库一定是属于你的**

## 友链

既然你已经看到这了，应该创建好，或者有你自己的 blog 了，那就提一个友链 pr 吧。我会主观评价你的 blog 打分。😁 