---
title: 安全配置 Cookie 同意
description: 让可选类别在同意前关闭，只加载管理员审查过的 HTTP(S) 脚本。
pattern: docs
---

# 安全配置 Cookie 同意

Pageskill 的 `privacyConsent` 主题插件提供本地化 Cookie 选择器。必要的同意存储仍然可用，可选类别默认关闭，gated script 只有在访客选择对应类别后才插入。现有偏好键是 `pagekiln-consent`；更换主题时保留它，已有选择才能继续兼容。

## 启用功能的两侧

站点配置启用功能，当前主题插件提供浏览器代码和呈现。在站点根配置中保留两个开关：

```yaml
plugins:
  privacyConsent:
    enabled: true
privacy:
  cookieConsent:
    enabled: true
    storage: cookie
    retentionDays: 365
```

默认主题已经声明受信任的 `privacyConsent` 插件脚本。复制主题时要保留这个插件声明和经过审查的浏览器模块。中性 starter 不含完整 Cookie 插件；请使用仓库的默认主题，或复制 `catalog` 显示提供 `privacyConsent` 的主题。

## 在站点配置中定义类别

在站点根目录 `config.yml` 中添加 `default: false` 的可选类别：

```yaml
privacy:
  cookieConsent:
    categories:
      - id: essential
        required: true
        default: true
      - id: analytics
        required: false
        default: false
```

## 在当前主题中登记一个 gated script

编辑 `themes/<active>/theme.yml`，不要把它和上面的 `privacy.cookieConsent` 配置块混在一起。把以下片段合并到现有映射中的受信任主题插件：

```yaml
plugins:
  privacyConsent:
    enabled: true
    script: scripts/cookie-consent.js
    gatedScripts:
      - source: https://analytics.example.test/script.js
        category: analytics
```

只使用管理员或主题作者审查过的 HTTP(S) 来源。协议校验会阻止 `javascript:` 和 `data:` 注入，但不能证明第三方脚本本身安全。不要把 query、表单或 URL 内容拼进 `gatedScripts`，也不要让访客决定 `src`。

## 在同意前后验证

运行源码检查并构建：

```bash
pageskill check
pageskill build
```

预期 HTML 会包含 gated script 的数据模板，但可选外部脚本不会在同意前加载。使用 `pageskill s` 打开构建结果，清除旧的 `pagekiln-consent` 选择，并用浏览器 Network 面板检查：

1. 作出选择前，不应出现对 `analytics.example.test` 的请求。
2. 选择 `analytics` 类别并保存后，浏览器才可能请求配置的 HTTP(S) 脚本。
3. 拒绝可选类别或撤回选择后，未来的 gated load 会遵循新状态，但撤回无法撤销已经运行的第三方 JavaScript 或已经发送的数据。自定义脚本必须监听 `pagekiln:consent` 并自行清理，或要求刷新页面；不要承诺所有服务会立即停止。

框架负责呈现选择器和门控配置来源；HTTP(S) 校验只验证协议，并不会让脚本自动可信。站点所有者仍需负责服务商隐私声明、数据处理、保存期限和法律依据。

## 常见错误

- **看不到横幅：** 同时检查 `plugins.privacyConsent.enabled` 和 `privacy.cookieConsent.enabled`，再确认主题插件已启用。
- **同意后脚本仍不加载：** 确认 `gatedScripts` 的类别 id 与可选类别完全一致，并查看浏览器 Network 面板。
- **`javascript:` 或 `data:` URL 被忽略：** 使用经过审查的 `http://` 或 `https://` 来源；协议校验本来就很保守。
- **访客可以改来源：** 删除这条输入路径。`src` 必须来自受信任的站点或主题配置。
- **以为撤回能撤销脚本：** 自定义代码监听 `pagekiln:consent` 并定义清理或刷新路径；已经运行的代码和已经发送的数据无法收回。
- **改版后原有同意消失：** 保留 `pagekiln-consent` 键和兼容的值结构。

## 预期结果与下一步

可选脚本现在会等待明确的类别同意，受信任的来源也与访客数据分开。继续阅读[自定义渲染](/zh-sg/guide/customize/)审查主题扩展，或返回 [Guide](/zh-sg/guide/)。

[返回 Guide](/zh-sg/guide/) · [下一步：自定义渲染](/zh-sg/guide/customize/)
