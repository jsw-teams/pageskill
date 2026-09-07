# Pageskill：写文章，搭网站

[English](README.en.md) · [更新日志](CHANGELOG.zh-CN.md) · [English changelog](CHANGELOG.md)

Pageskill 3.0.0 把 Markdown 文章、站点设置和主题样式生成成一个可发布的网站。先写内容，再让主题负责结构和视觉；普通站点不需要为每篇文章手写 HTML。

## 十分钟开始

源码仓库和要发布的新站是两个目录。先安装源码仓库中的 CLI：

```powershell
git clone https://github.com/jsw-teams/pageskill.git
Set-Location pageskill
npm install
npm run g
npm link
```

`npm run g` 会先编译源码再生成仓库站点。接着复制 `starter`，在新站目录工作：

```powershell
Copy-Item -Recurse starter ..\my-site
Set-Location ..\my-site
pageskill g
pageskill s
```

`pageskill g` 会自动校验并生成公开文件，`pageskill s` 会持续预览；按 `Ctrl+C` 停止预览，也可以另开终端继续编辑。准备好发布时，在 `config.yml` 填入目标并运行：

```powershell
pageskill d
```

完整步骤见[十分钟开始你的站点](content/posts/start/zh-sg.md)。

## 学习路径

按顺序阅读这些短文章：

- [改成你的名字和导航](content/posts/site-settings/zh-sg.md)
- [Markdown：像写笔记一样写文章](content/posts/markdown/zh-sg.md)
- [发布第一篇文章](content/posts/first-post/zh-sg.md)
- [Cookie 选择：先问访客再加载](content/posts/cookies/zh-sg.md)
- [换样式，或让 Agent 帮你改](content/posts/customize/zh-sg.md)
- [把网站放到网上](content/posts/deploy/zh-sg.md)
- [关于 Pageskill](content/pages/about/zh-sg.md)
- [隐私说明](content/pages/privacy/zh-sg.md)
- [3.0 更新：更简单的入口](content/posts/version-3-0/zh-sg.md)

英文和繁体中文版本与每篇文章放在同一个目录。

## 内容和源码放在哪里

- `content/pages/<id>/<locale>.md` 保存稳定页面，例如首页、About 和隐私政策；它们不需要 `date`，由 pages collection 提供默认页面样式。新手教程、博客、产品记录和版本文章放在 `content/posts/<id>/<locale>.md`，每篇文章都要有 `date`，路由是 `/:locale/posts/<id>/`。
- `config.yml` 只保存站点名称、语言、导航、路由、隐私和发布目标等设置，不放浏览器脚本或 HTML 代码。
- `themes/<name>/` 负责样式、文章结构和可复用 Block。个人可以直接复制主题并修改；需要新结构时实现一次，后续文章继续使用。
- `backend/handler.ts` 负责动态业务、写入、webhook 和运行时秘密。公开静态快照位于 `dist/public`，同源 API 由服务端处理。
- Cookie 选择复用现成插件；可选类别默认关闭，受信的 `gatedScripts` 只在 `theme.yml` 中登记。访客撤回同意不能撤销已经执行的脚本动作。

高级作者在生成后可以阅读 `dist/.pagekiln/catalog.json` 或 `dist/.well-known/agent.json` 来发现可复用能力；新手先从文章和设置开始即可。

`src/runtime/`、`.pagekiln/` 和 `dist/` 是生成物，不要手工修改。站点来源是 `config.yml`、`content/` 和 `themes/`。Pageskill 使用 MIT License，见 [LICENSE](LICENSE)。
