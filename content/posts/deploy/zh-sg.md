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

## 2. 先生成公开文件

```powershell
pageskill g
```

查看 `dist/public`，确认首页、文章、资源和站点地图都在里面。需要 API 的站点还要准备同一个服务的后端运行时。

## 3. 发布

```powershell
pageskill d
```

Pageskill 会按 `deployment.targets` 执行目标。发布后从目标域名打开首页和一篇文章，再调用你自己的同源 API 路径确认服务端边界。

## 成功结果

托管平台接收了 `dist/public`，公开 URL 能打开生成页面；私有的 Worker、server 文件和秘密没有进入静态快照。

## 常见坑

`targets: []` 或 remote、branch 不匹配时，发布没有目标可执行。先检查 `config.yml`，也不要把完整项目根目录直接当成静态网站根目录。

## 下一步

阅读[隐私说明](/zh-sg/privacy/)，把 Cookie、数据收集和联系方法写给访客。
