---
kind: post
title: 把网站放到网上
description: 生成安全的公开快照，再交给负责发布的主机或 Git 工作流。
date: 2026-09-07
category: tutorial
---

# 把网站放到网上

Pageskill 负责生成网站，实际发布由托管商或 Git 集成完成。公开快照位于 `dist/public`；backend 代码、私有运行时文件和 secret 都留在这个静态目录之外。

## 1. 在本地生成和预览

运行 Pageskill 对外提供的三个命令：

```powershell
page g
page c
page s
```

生成步骤会校验内容并生成公开快照；在具备浏览器的环境中运行 `page c` 执行完整无障碍审查。预览步骤可以在交给主机前检查同一份输出。

## 2. 为主机设置静态输出

对于 Cloudflare Pages、GitHub Pages 等基于 Git 的静态主机，在主机控制台设置从仓库构建：

```text
构建命令：page g
构建输出目录：dist/public
```

主机会在构建时运行 Pageskill，并且只上传 `dist/public`。Pageskill 不生成 Worker 或 Server bundle。

## 3. 安全连接外部 API

Pageskill 永远是静态构建。先为每项外部服务配置根级命名 `apis` 项，再把这个 id 写入 Component 的可选 `client.api`：

```yaml
apis:
  comments:
    url: https://api.example.com/v1/comments
    token: public-client-token
    auth: bearer
```

```ts
client: { module: 'components/comments/script.js', selector: '[data-comments]', api: 'comments' }
```

API id 用于区分 comments、search、billing 等不同服务。Client Runtime 只允许相对请求留在配置的 origin 和基础路径内，并添加 Bearer 或 `x-api-key` Header。第三方 URL 必须通过 CORS 允许本站来源。静态 JS 会收到 `token`，所以它是公开数据，只能使用受限、可撤销的客户端 Token。若凭据必须私密，就把 `url` 指向独立代理、删除 `token`，把上游 URL 与 secret 放在代理环境中。数据库和模型凭据始终只留在 API 环境。

## 4. 检查生成结果

运行 `page g` 后，确认 `dist/public` 里有首页、多语言路由、资源、Feed、sitemap、`robots.txt` 和发现文件。配置的公开 API URL 与客户端 Token 可能出现在其中；私密凭据、数据库配置、Worker 代码和无障碍报告绝不能出现。

Agent Discovery、Agent Skills、API Catalog、Markdown mirror 和 `llms.txt` 都由渲染器生成。如果要配置 OAuth、MCP、WebMCP 或 DNS-AID，请先阅读[配置条件 Agent 能力](/zh-sg/posts/agent-discovery/)，实现真实服务、浏览器模块或 DNS 记录；生成的元数据不会创建这些服务。

## 5. 发布后验证

使用主机自己的构建日志和预览环境确认构建成功，然后从公开域名打开本地化首页、普通文章、版本更新和隐私页面。逐个检查配置的 API id，验证对应 URL 的 CORS、鉴权、路径边界与 JSON 错误响应。

## 常见问题

公开目录是 `dist/public`，不是项目根目录，也不是私有的 `dist` 根目录。不要把配置中的客户端 Token 误当 secret，任何人都可以读取它。私密 access token、SSH key 或 backend secret 绝不能写入 YAML、Markdown 或公开生成文件。

## 下一步

阅读[隐私说明](/zh-sg/privacy/)，把 Cookie、数据收集和联系方法写给访客。
