---
kind: post
title: 配置 Integration 与隐私同意
description: 只加入站点真正使用的第三方服务，由受信任的适配器负责校验、用途和安全加载。
date: 2026-09-07
category: tutorial
---

# 配置 Integration 与隐私同意

Integration 是站点能力，不是主题外观选项。请把它写在根 `config.yml` 或其 `extends` 文件中，再让当前主题的受信任 Provider Adapter 提供字段 schema、隐私用途、同意要求和加载器。

没有配置 Integration 的站点不会显示同意横幅。只有当实际启用的适配器声明资源需要访客选择时，隐私同意 UI 才会出现。这样一个普通静态站不会询问本站根本没有使用的第三方服务。

## 1. 只配置本站真正使用的服务

最小的真实示例是：

```yaml
# config.yml
integrations:
  google-analytics:
    measurementId: G-XXXXXXXXXX
```

这里不需要写 `purpose`、`enabled: true`、Provider Catalog、分类列表、脚本 URL 或 HTML。Provider 节点存在就表示默认启用；如果想保留公开标识但暂时停用，可以写 `enabled: false`。

一个站点使用多个服务时，按注册过的 adapter ID 各写一个节点：

```yaml
integrations:
  google-analytics:
    measurementId: G-XXXXXXXXXX
  cloudflare-web-analytics:
    token: public-beacon-token
  turnstile:
    siteKey: 0x4AAAA...
```

这里只能放公开标识。验证码 secret、签名密钥或服务端校验 token 应该放在部署环境，由 `backend/handler.ts` 读取，不能放进 YAML。

## 2. 让 Adapter 自己拥有契约

默认主题在 `themes/default/components/consent/integrations.ts` 注册 Provider。每个适配器自己负责：

| Adapter 元数据 | 含义 |
| --- | --- |
| `schema` | 必需公开字段和标识格式校验。 |
| `privacy.purpose` | `measurement`、`advertising` 等稳定的机器用途。 |
| `privacy.consent` | 适配器是否等待可选同意。 |
| `privacy.load` | 立即加载、同意后加载，或按需加载。 |
| runtime/resource | 受信任的实现和官方 Provider URL。 |

例如，Google Analytics 是属于 `measurement` 的适配器，其标签会等待访问量测量同意；X for Websites 属于 `social-embedding`，只有页面有嵌入标记且适配器允许时才按需加载。验证码适配器也可以按需加载；这里描述的是技术加载契约，不是法律结论。

站点不能通过另写一个 `purpose` 或脚本 URL 改变这些事实。未知 Provider、未支持字段、格式错误的标识、任意 `secret` 或可执行字段都会在生成前校验失败。

## 3. 同意分类从实际 Integration 推导

Pageskill 会按适配器登记的 purpose 把当前启用的服务分组。如果站点只配置 Google Analytics，对话框就只显示访问量测量；没有实际 Provider 使用时，不会出现广告、反滥用或社交内容分类。`essential` 属于站点自身运行机制，不需要用户在 YAML 中重复声明。

默认行为是：

- 没有需要同意的活动 Integration：没有横幅，也没有同意对话框；
- 有需要同意的 Integration：显示本地化同意 UI，并在选择对应 purpose 前保持资源不加载；
- 按需 Integration：只有页面功能请求它且适配器策略允许时才加载；
- `enabled: false`：不加载该适配器，也不把它列为当前启用服务。

如果确实要改变浏览器保存选择的时间，可以使用范围很小的站点策略覆盖：

```yaml
privacy:
  consent:
    decisionRetentionDays: 180
```

它只控制浏览器记住访客选择多久，不控制 Google、Cloudflare 或其他 Provider 在服务端保留数据多久。Provider 的数据保留政策应以其自身说明和站点审核过的隐私政策为准。

如果配置了需要同意的适配器，却把 `privacy.consent.enabled` 设为 `false`，生成会明确失败。Pageskill 不会把关闭对话框误当成允许无同意加载 Provider。

## 4. 理解浏览器状态

浏览器只保存选择，不保存 Provider 配置：

```json
{
  "version": 1,
  "purposes": {
    "measurement": false
  },
  "updatedAt": "2026-09-12T00:00:00.000Z"
}
```

Provider ID、测量 ID、site key 和 token 不会写入这个状态。站点后来新增 purpose 时，它会从未选择开始；过去的“全部接受”不会静默授权未来新增的分类。全部接受只表示同意当前页面和当前配置声明的所有可选 purpose。

## 5. 把政策和 UI 文案放在正确层级

请把审核过的政策写成 `content/pages/privacy/<locale>.md`。生成的隐私信息可以根据当前配置列出 Provider 和它们登记的用途，但这不是法律意见，也不能替代该页面。同意按钮和用途说明属于主题/组件自己的 `messages.yml`，支持 `zh-sg`、`zh-tw`、`en` 以及现有 locale fallback。普通站点不需要为了使用同意 UI 再写一个私有 `copy` 对象。

不要在站点配置中加入第三方 URL、inline script、`onclick`、HTML 或 secret。Provider 资源由受信任代码固定，撤回同意会阻止之后的加载，但不会假装可以撤销已经发出的请求。

## 6. 启用 Provider 前先验证

```powershell
npm run compile-runtime
npm run compile-theme
npm run compile-backend
page g --profile
page s
```

在全新的浏览器会话中确认：没有 `integrations` 的站点没有横幅；测试站配置真实适配器值后，在同意前看不到它的资源，选择对应 purpose 后才加载，撤回可选用途后不再加载。检查所有启用语言的对话框，并查看生成的 Catalog：它应把代码登记的 Provider Registry 与本站已配置的、去掉 secret 的 Provider 摘要分开列出。

验证码 token 校验继续放在服务端。社交嵌入应使用适配器的安全占位或按需行为，不要自行添加脚本。启用生产 Integration 前先阅读[隐私政策](/zh-sg/privacy/)。

## 预期结果

站点作者只需表达“我要使用 Google Analytics”，并提供一个公开标识。Pageskill 内部负责知道它如何校验、属于哪个用途、何时可以加载，以及怎样显示同意选择，而不会把 YAML 变成编程语言。

## 下一步

当主题还没有你需要的能力时，阅读[开发可复用组件](/zh-sg/posts/components/)，再新增一个受信任的注册模块。
