---
title: Cookie 选择：先问访客再加载
description: 启用 Cookie 插件，让可选类别默认关闭，并检查撤回同意的行为。
date: 2026-09-07
---

# Cookie 选择：先问访客再加载

Cookie 同意是访客的选择。Pageskill 可以让可选服务默认关闭，访客同意后才加载；撤回选择后不再加载后续脚本。

## 1. 启用现成插件

把插件选项放在 `themes/default/theme.yml`，把稳定政策入口留在 `config.yml`：

```yaml
# themes/default/theme.yml
plugins:
  privacyConsent:
    enabled: true

# config.yml
privacy:
  cookieConsent:
    policyRoute: /:locale/privacy/
```

在每个启用语言的 `content/pages/privacy/` 下准备政策页面。

默认实现是 `themes/default/plugins/cookies/` 模块；它的 `index.ts`、CSS、脚本和 messages 放在一起。

## 2. 让可选类别保持关闭

在 `themes/default/theme.yml` 中让必要存储使用 `essential`，可选类别设置 `default: false`：

```yaml
plugins:
  privacyConsent:
    categories:
      - id: essential
        required: true
        default: true
      - id: analytics
        required: false
        default: false
      - id: advertising
        required: false
        default: false
```

站点服务的 ID 等实例数据放在 `config.yml`。不要把服务 ID 写进文章，也不要默认打开可选类别。

选择器会明确显示每个类别的提供者和保存期限，借鉴政策生成器的透明信息展示；它仍然只是访客同意控制，不会悄悄生成法律文本。经过审核的政策请继续维护在 `content/pages/privacy/<locale>.md`。

## 3. 登记受信脚本

需要在同意后才加载的脚本，放在主题插件中，不要放进站点配置。在 `themes/default/plugins/cookies/index.ts` 的现有 `plugin` 导出中加入：

```ts
// 在现有 plugin 导出中加入这个属性。
defaults: {
  gatedScripts: [{ src: 'plugins/cookies/analytics.js', category: 'analytics' }]
}
```

`gatedScripts` 要留在主题拥有的 `defaults` 中；政策/控制者资料放在 `config.yml`，插件选项放在 `theme.yml`。

在 `themes/default/plugins/cookies/analytics.js` 创建并审查这个文件。相对 `src` 从主题根目录解析，生成后位于带指纹的 `/assets/theme/default/` 下。

类别必须是可选类别。加入前先检查脚本来源和用途；同意检查不会让未知的第三方脚本自动安全。

## 4. 检查三种状态

```powershell
npm run g
npm run s
```

用全新的浏览器会话确认访客未选择前不会加载可选脚本。接受分析类别后确认脚本加载，再打开 Cookie 设置，保存“仅必要项”，确认后续加载会停止。

## 成功结果

必要功能立即工作；可选类别默认关闭，只有明确同意后才加载，页脚仍可打开政策页和 Cookie 设置。

## 常见坑

撤回同意会阻止后续加载，但不能撤销脚本已经完成的工作。不要把脚本 URL 藏在 Markdown 中，不要用必要类别承载分析，也不要在每篇文章重复配置插件。

## 下一步

Cookie 流程稳定后，阅读[让访客搜到页面和文章](/zh-sg/posts/search/)。
