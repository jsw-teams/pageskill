---
title: 把网站放到网上
description: 配置一个发布目标，生成公开快照，并保持同源 API 与私有代码隔离。
date: 2026-09-07
---

# 把网站放到网上

发布前先确认站点在本地可打开。Pageskill 的公开快照位于 `dist/public`；`backend/handler.ts` 和运行时秘密留在服务端，动态请求由同源 API 处理。

## 1. 写入发布目标

在站点根目录的 `config.yml` 填入你实际使用的目标。下面以已有 Git remote 发布为例：

```yaml
deployment:
  targets:
    - github
  github:
    remote: origin
    branch: gh-pages
```

令牌或 SSH 密钥放在本机环境和密钥文件里，不要写进 `config.yml`、文章或公开目录。

## 2. 配置 Cloudflare Pages Git 集成（仅静态）

如果 Cloudflare Pages 从 Git 构建这个仓库，在仓库根目录的控制台使用以下值：

```text
构建命令：npm run g
构建输出目录：dist/public
```

`npm run build` 不是 Pageskill 命令，不要为了兼容控制台而添加别名。`dist/public` 是公开快照，里面只有生成页面、资源、Feed 和站点地图。不要把输出目录设为 `dist`；私有构建根还可能包含 `_pagekiln/`、`server/`、`.pagekiln/`、`_worker.js` 和其他部署文件，直接发布整个 `dist/` 可能暴露 backend 代码或私有运行时文件。

这条 Git 集成路径只发布静态内容，不会自动把 `backend/handler.ts` 打包成同一个 Pages Worker。如果站点不需要运行时 API，可以按需设置 `deployment.backend: false`；输出目录仍必须是 `dist/public`。

## 3. 先生成公开文件

```powershell
npm run g
```

查看 `dist/public`，确认首页、文章、资源和站点地图都在里面。需要 API 的站点还要准备同一个服务的后端运行时。

## 4. 先查看发布计划

先运行安全检查：

```powershell
npm run d -- --dry-run
```

查看目标和源文件路径；这个命令不会上传文件。

## 5. 准备好后发布

```powershell
npm run d
```

只有目标准备好时才运行 `npm run d`。Pageskill 会按 `deployment.targets` 执行目标。发布后从目标域名打开首页和一篇文章，再调用你自己的同源 API 路径确认服务端边界。

如果 Pages 项目必须在同一次部署中包含 backend，不要把 Git 集成的输出目录改成 `dist`。请配置 CLI 目标，让 `npm run d` 负责打包：

```yaml
deployment:
  targets:
    - cloudflare-pages
  backend: true
  cloudflare:
    apiTokenEnv: CLOUDFLARE_API_TOKEN
    pages:
      project: your-pages-project
```

把 `CLOUDFLARE_API_TOKEN` 放在部署环境中，然后先运行 `npm run d -- --dry-run`，确认结果后再运行 `npm run d`。CLI 会生成 `dist`，把公开目录复制到临时的 `.pagekiln/pages-upload-*`，再把生成的 `_worker.js` 和私有 `_pagekiln` 运行时放进这个上传目录。Pages 上传的是这个临时目录，而不是私有的 `dist/` 根目录，因此 backend 和公开资源可以一起工作，又不会把私有构建文件当成静态资源。现有 Git 集成不会自动执行这一步；把控制台输出目录改成 `dist` 不是安全的解决办法。

## 成功结果

静态 Git 集成接收 `dist/public` 并打开生成页面；CLI Pages 目标接收上面所述的过滤后 Worker 包，私有 Worker、server 文件和秘密不会进入公开快照。

## 常见坑

`targets: []` 或 remote、branch 不匹配时，发布没有目标可执行。先检查 `config.yml`，也不要把完整项目根目录直接当成静态网站根目录。

## 下一步

阅读[隐私说明](/zh-sg/privacy/)，把 Cookie、数据收集和联系方法写给访客。
