---
title: 我们如何构建插件：以 Cookie 选择器为例
description: 从 Cookie 选择器的行为约定和模块文件开始，学习安全渲染、主题配置和部分翻译的处理方式。
date: 2026-09-07
category: tutorial
---

# 我们如何构建插件：以 Cookie 选择器为例

Cookie 选择器是我们构建可复用插件时的参考实现。它把访客界面、浏览器状态、可选脚本、本地化消息和政策链接组合起来，同时不需要每个 post 重复 HTML。

我们借鉴 Cookie 政策生成器的一项透明展示思路：把类别、提供者、保存期限和同意要求放在一起，方便访客查看。选择器仍然只是同意控制，不是法律建议或政策生成器。经过审核的政策继续用 Markdown 维护。

## 1. 先定义行为约定

写模块之前，先明确它要支持的状态：

- 必要功能立即可用；
- 可选类别默认关闭；
- 可选脚本加载前必须得到明确选择；
- 访客可以重新打开选择器并保存“仅必要项”；
- 撤回选择会阻止后续加载，但不能撤销脚本已经完成的工作。

这个约定让插件可以复用。post 只说明能力，不复制它的标记或浏览器逻辑。

## 2. 把模块文件放在一起

默认主题把实现集中在一个目录：

```text
themes/default/plugins/cookies/
  index.ts
  script.js
  style.css
  messages.yml
```

`index.ts` 定义能力和资源；`script.js` 负责同意状态的保存与加载判断；`style.css` 负责选择器外观；`messages.yml` 负责界面翻译。

## 3. 在代码中登记能力

插件定义由代码拥有。它负责登记能力、资源、本地化消息、默认值和实例数据形状，不包含本站的服务 ID 或启用选择。下面是实际定义的精简示例：

```ts
import type { ThemePluginDefinition } from '../../../../src/theme-api.ts';

export const plugin: ThemePluginDefinition = {
  implementation: 'plugins/cookies/index.ts',
  resources: {
    styles: ['plugins/cookies/style.css'],
    scripts: ['plugins/cookies/script.js']
  },
  i18n: 'plugins/cookies/messages.yml',
  defaults: {
    enabled: true,
    categories: [
      { id: 'essential', required: true, default: true },
      { id: 'analytics', required: false, default: false },
      { id: 'security', required: false, default: false },
      { id: 'social', required: false, default: false }
    ],
    integrations: {},
    gatedScripts: []
  },
  schema: {
    enabled: { type: 'boolean' },
    categories: { type: 'array' },
    integrations: { type: 'object', additionalProperties: true },
    gatedScripts: { type: 'array' }
  }
};
```

在 `themes/default/plugins/index.ts` 中只登记一次：

```ts
import { plugin as chrome } from './chrome/index.ts';
import { plugin as cookies } from './cookies/index.ts';
import { plugin as language } from './language/index.ts';
import { plugin as search } from './search/index.ts';
import { plugin as toc } from './toc/index.ts';

export const plugins = { chrome, search, toc, privacyConsent: cookies, language };
```

真实 schema 会描述 Google Analytics、Google Ads、Cloudflare Web Analytics、百度统计、验证码和 X 的内置字段，同时允许未来主题模块增加其他 provider 和 provider 专属字段。未知数据在代码登记对应渲染器之前不会产生作用；配置永远不是可执行代码。

## 4. 分离实例数据和站点数据

活动主题在配置文件中设置插件实例。可选类别只有在明确接入并审核过的服务后才开启：

```yaml
# themes/default/theme.yml
plugins:
  privacyConsent:
    enabled: true
    provider: Pageskill
    storage: cookie
    retentionDays: 365
    categories:
      - id: essential
        required: true
        default: true
        retentionDays: 365
      - id: analytics
        required: false
        default: false
        retentionDays: 0
      - id: security
        required: false
        default: false
        retentionDays: 0
      - id: social
        required: false
        default: false
        retentionDays: 0
    integrations:
      googleAnalytics:
        enabled: false
        measurementId: ''
        category: analytics
      googleAds:
        enabled: false
        conversionId: ''
        category: advertising
      cloudflareWebAnalytics:
        enabled: false
        token: ''
        category: analytics
      captcha:
        - enabled: false
          platform: turnstile
          siteKey: ''
          category: security
      x:
        enabled: false
        category: social
    gatedScripts: []
```

内置映射是明确的：Google Analytics 使用 `analytics`，Google Ads 使用 `advertising`，Cloudflare Web Analytics 使用 `analytics`，验证码使用 `security`，X 嵌入使用 `social`。只有在审核提供者条款、隐私说明、保存期限和 CSP 后，才把 `enabled` 改为 `true`。验证码平台支持 `recaptcha`、`hcaptcha` 和 `turnstile`；脚本会在同意后加载，页面可使用普通的 `.g-recaptcha`、`.h-captcha` 或 `.cf-turnstile` 标记。验证码 site key 是公开标识；secret key 和服务端 token 校验必须留在 `backend/handler.ts` 或其他私有服务中。

X 集成按需加载：同意后，只有页面存在 X/Twitter 嵌入标记时才加载 `platform.x.com/widgets.js`。选择前不会加载社交嵌入。其他 provider 专属字段可以保留在主题配置中供未来代码使用，但不会仅因写入配置就发起网络请求。

稳定的政策入口和控制者资料仍然是站点数据：

```yaml
# config.yml
privacy:
  cookieConsent:
    policyRoute: /:locale/privacy/
```

把审核过的政策放在 `content/pages/privacy/<locale>.md`。不要在 YAML 或 Markdown 中放 HTML、JavaScript、CSS、提供者代码或隐藏的脚本 URL。`config.yml` 只在生成时读取，不会复制到 `dist/public`；生成的 backend 也没有写入它的路由。配置是数据，可执行行为由插件模块负责。

## 5. 以安全边界渲染

`renderCookieConsent` 根据经过校验的 context 生成固定的弹窗和横幅。动态值遵循两条不同规则：

```ts
const label = context.escapeHtml(category.label);
const href = context.safeUrl(privacy.policyHref);
```

标签和元数据作为文字转义；政策链接和受同意控制的脚本 URL 经过 `safeUrl`，不安全协议会被拒绝。内置 provider 的 URL 固定在已登记的浏览器实现中，服务 ID 和 token 只作为数据处理。浏览器脚本使用 DOM API 创建元素，并且只在同意后加载可选资源。插件界面没有 `innerHTML`、`eval`、任意属性或配置注入的标记。

提供者和保存期限会直接显示在选择器中，帮助访客理解类别用途；法律政策仍然是人工审核的页面，而不是悄悄生成的法律文本。

## 6. 用主题配置控制 nav 和 footer 插入

壳层插入点也是结构化的主题选项。主导航链接仍由 `config.yml` 管理；这个功能允许主题在标准链接前后添加安全链接：

```yaml
# themes/default/theme.yml
plugins:
  chrome:
    enabled: true
    navigation:
      enabled: true
      before: []
      after:
        - label: Plugin tutorial
          labels:
            zh-sg: 插件教程
            zh-tw: 外掛教學
          href: /:locale/posts/cookies/
    footer:
      enabled: true
      before: []
      after: []
```

这里只接受 `label`、可选的本地化 `labels` 和 `href`。编译器会解析 `:locale`，限制链接数量和长度，拒绝不安全协议或目录穿越 URL；壳层输出前还会转义最终标签。原始 HTML、脚本、样式、选择器和任意属性都没有配置字段。

## 7. 不要让翻译进度阻塞发布

站点语言放在 `config.yml`，不放在插件设置中：

```yaml
activeLocales:
  - zh-sg
  - zh-tw
  - en
i18n:
  fallbackLocale: en
  contentFallback: true
```

Cookie 界面消息放在插件旁边的 `messages.yml`。如果新增语言只翻译了 50%，缺少的界面 key 会从 `en` 合并；整篇内容文档缺失时使用配置的内容回退。已经存在但只翻译了一部分的 Markdown 会完全按原文显示，不会静默按段落混入机器翻译或回退内容。

## 8. 检查同意状态

```powershell
npm run compile-theme
npm run g
npm run s
```

用全新的浏览器会话确认选择前不会加载可选脚本。分别接受每个已配置类别，确认只有对应的经过审核的 provider 加载：Google Analytics、Google Ads、Cloudflare Web Analytics、验证码，或在存在嵌入标记时的 X。验证码要在服务端校验 token；X 要先确认页面确实有嵌入再观察 widget 请求。重新打开 Cookie 设置，保存“仅必要项”，确认后续加载停止。同时检查政策链接、键盘焦点、语言链接，以及每种启用语言中的 nav/footer 插入效果。

## 成功结果

Cookie 选择器成为一个可复用的主题插件，拥有本地化界面、明确的类别元数据、可扩展的 provider 配置、安全的同意后加载和经过审核的政策链接。post 仍然是 Markdown，主题也可以增加少量壳层链接，而不会获得 HTML 或脚本注入入口。

## 常见坑

不要默认开启分析、广告、验证码或社交嵌入，不要把未知第三方 URL 当成可信，也不要以为撤回同意可以撤销之前的脚本工作。扩展 integration 数据可以保留，但只有代码模块消费它时才会产生作用。不要把 provider secret 放进 `theme.yml`，不要给插件增加 `language` 设置，也不要在每个 post 复制选择器。如果翻译不完整，让配置的 fallback 填补缺少的界面 key，再有计划地完成内容翻译。

## 下一步

阅读[开发可复用插件](/zh-sg/posts/plugins/)，用同样的模块模式构建更小的能力。
