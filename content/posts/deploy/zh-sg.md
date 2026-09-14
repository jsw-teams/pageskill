---
title: 把网站放到网上
description: 生成安全的公开快照，再交给负责发布的主机或 Git 工作流。
date: 2026-09-07
category: tutorial
---

# 把网站放到网上

Pageskill 负责生成网站，实际发布由托管商或 Git 集成完成。公开快照位于 `dist/public`；backend 代码、私有运行时文件和 secret 都留在这个静态目录之外。

## 1. 在本地生成和预览

运行 Pageskill 对外提供的两个命令：

```powershell
npm run g
npm run s
```

生成步骤会校验内容并运行无障碍审查；预览步骤可以在交给主机前检查同一份输出。

## 2. 为主机设置静态输出

对于 Cloudflare Pages、GitHub Pages 等基于 Git 的静态主机，在主机控制台设置从仓库构建：

```text
构建命令：npm run g
构建输出目录：dist/public
```

主机会在构建时运行 Pageskill，并且只上传 `dist/public`。不要使用私有的 `dist` 根目录，因为其中还可能有 `_pageskill/`、`server/`、`.pageskill/`、Worker 文件和其他生成的部署资料。

## 3. 保持部署数据只有正式格式

如果主机需要生成 Worker、Pages Function 或 hosting 配置，在 `config.yml` 使用正式 target 和静态目录，让 `npm run g` 生成对应产物：

```yaml
deployment:
  targets:
    - cloudflare-pages
  staticDirectory: public
  backend: true
```

target 只选择要生成的产物，不会让站点配置获得保存 Provider token 的权限。凭证放在主机的 secret store 或环境变量中。静态 Git 集成本身不能把 `backend/handler.ts` 打包成同一个 Worker；需要运行时 API 时，应使用主机支持的 Worker/Functions 工作流。

## 4. 检查生成结果

运行 `npm run g` 后，确认 `dist/public` 里有首页、多语言路由、资源、Feed、sitemap、`robots.txt` 和生成的发现文件。目标需要时，Pageskill 还会在公开快照旁边生成私有运行时资料；不要把它复制到公开目录。

Agent Discovery、Agent Skills、API Catalog、Markdown mirror 和 `llms.txt` 都由渲染器生成。如果要配置 OAuth、MCP、WebMCP 或 DNS-AID，请先阅读[配置条件 Agent 能力](/zh-sg/posts/agent-discovery/)，实现真实服务、浏览器模块或 DNS 记录；生成的元数据不会创建这些服务。

## 5. 发布后验证

使用主机自己的构建日志和预览环境确认构建成功，然后从公开域名打开本地化首页、普通文章、带更新信息的文章和隐私页面。如果启用了 backend，调用文档中声明的同源 API，确认鉴权和错误响应仍是 API 响应，不会变成静态 HTML。

## 常见问题

公开目录是 `dist/public`，不是项目根目录，也不是私有的 `dist` 根目录。不要把 access token、SSH key 或 backend secret 写入 YAML、Markdown 或公开生成文件。如果主机不能运行 `npm run g`，就在 CI 中构建，再通过主机文档规定的方式上传 `dist/public` 产物。

## 下一步

阅读[隐私说明](/zh-sg/privacy/)，把 Cookie、数据收集和联系方法写给访客。
