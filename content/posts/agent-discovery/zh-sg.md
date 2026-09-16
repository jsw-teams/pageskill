---
kind: post
title: 按真实能力配置 Agent 发现
description: 先实现并验证浏览器能力或外部服务，再发布与事实一致的发现信息。
date: 2026-09-11
updated: 2026-09-16
category: tutorial
---

# 按真实能力配置 Agent 发现

Pageskill 根据源码配置生成发现文档，但不会创建 OAuth 签发方、MCP 服务器、数据库、模型服务、第三方供应商或 DNS 记录。发现信息是实现证据，不是实现本身。

## 1. 使用统一 Client Runtime 契约

Component 始终声明 module 与 selector。只操作 DOM 或生成资源（例如本地搜索索引）时省略 `client.api`；需要数据库、模型、共享状态、由私密凭据支持的操作或写入时，声明一个命名 `client.api`。

```ts
client: {
  module: 'components/agent-tools/script.js',
  selector: '[data-agent-tools]',
  api: 'agent-tools'
}
```

站点通过配置选择服务，不修改 Component 代码：

```yaml
apis:
  agent-tools:
    url: https://api.example.com/v1/agent-tools/
    auth:
      type: bearer
      token: ${PUBLIC_RESTRICTED_AGENT_TOKEN}
```

浏览器模块只通过 `runtime.apiJson('health')` 调用相对路径。URL 可以跨域，但 Runtime 会阻止逃离已配置来源与路径。配置 Token 是公开浏览器数据；私密凭据留在独立部署的服务中。

本地搜索不是 API。它用 `runtime.assetJson` 读取生成的同站索引，不需要外部服务或 Cookie。

## 2. 没有服务就保持关闭

```yaml
agentDiscovery:
  auth: { enabled: false }
  mcp: { enabled: false }
  webmcp: { enabled: false }
  dnsAid: { enabled: false }
```

没有已部署公共服务时，空 API Catalog 才是正确结果。静态站点不能发布示例 `/api/health` 路由。

OAuth 或 MCP 真正上线后才填写真实绝对地址与元数据。MCP 卡片必须与服务实际 `tools/list` 一致；OAuth 的资源、签发方、受众、Scope 与端点必须与 Token 验证一致。只有已加载 Component 确实注册工具时，WebMCP 元数据才成立。DNS-AID 在权威区域验证前仍只是建议。

## 3. 单独管理第三方浏览器供应商

分析标签、CAPTCHA、社交嵌入或供应商 SDK 必须使用根级 `integrations` 下的可信 Provider Adapter，不能把任意 URL 写进 Component 设置。启用前要修订每个 `content/pages/privacy/<locale>.md`：Frontmatter 的 `integrations` 数组必须等于全部已启用 Provider ID，正文还要说明真实供应商、目的、数据类别、留存来源、撤回方式与联系信息。声明缺失或过期时生成会失败。

## 4. 生成并验证

```powershell
page g --profile
page c
page s
```

分别检查 `.well-known/agent.json`、API Catalog、Agent Skills 与外部端点。生成文件由渲染器拥有，应修正源码配置或实现，不要手改 `dist/public`。

新增或修改项目 Skill 前，阅读 [Agent Skill 开发者规范](/zh-sg/posts/skill-development/)。
