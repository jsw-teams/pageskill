---
title: 設定網站設定
description: 在 config.yml 中設定網站身分、語言、導覽、collection、schema 和主題。
pattern: docs
---

# 設定網站設定

網站根目錄的 `config.yml` 描述編譯器要建置的網站。它儲存中繼資料、語言、導覽、collection 路由和 schema、隱私、搜尋、圖片與部署目的地。主題標記、CSS、瀏覽器 ESM 和主題 UI 文案放在 `themes/` 下。

## 開啟網站根目錄

進入[從 Pageskill 開始](/zh-tw/guide/start/)建立的網站，用編輯器開啟 `config.yml`：

```bash
cd my-site
```

準備好網域後使用真實的 `siteUrl`，在此之前用於本機檢查的中性網址即可。不要把訪客 query、表單或 URL 內容寫入這個檔案；它是管理員控制的資料，不是程式碼或 HTML 注入入口。

## 一個完整的小型設定

下面的例子適合小型三語網站。每個 active locale 都需要對應頁面檔案；如果還沒有翻譯內容，先只使用 `en`。

```yaml
siteUrl: https://example.com
defaultLocale: en
activeLocales: [en, zh-sg, zh-tw]
siteName:
  en: Example site
  zh-sg: 示例站点
  zh-tw: 範例網站
description:
  en: A small Pageskill site.
  zh-sg: 一个小型 Pageskill 站点。
  zh-tw: 一個小型 Pageskill 網站。
theme:
  name: default
  nav:
    links:
      - key: home
        href: /:locale/
      - key: posts
        href: /:locale/posts/
content:
  collections:
    pages:
      contentType: page
      pattern: document
      route: /:locale/:id/
      schema:
        title:
          type: string
          required: true
        description: string
        pattern: string
    posts:
      contentType: post
      pattern: blog
      route: /:locale/posts/:id/
      feed: true
      archive: true
      orderBy: date:desc
      schema:
        title:
          type: string
          required: true
        description: string
        date:
          type: string
          required: true
        pattern: string
deployment:
  targets: []
```

這個 starter 範例只保留 `home` 和 `posts` 連結，因為中性 starter 沒有 Guide 頁面。建立或複製 Guide 頁面後，再新增 `guide` 連結。

路由中的 `:locale` 和 `:id` 會替換為語言和內容 id。collection 的 `schema` 描述 Frontmatter 資料；它與主題 `theme.ts` 中的 Pattern 或 Block schema 分開。

## 檢查設定

在網站根目錄執行：

```bash
pageskill inspect collection:pages
pageskill inspect collection:posts
pageskill check
```

預期結果是 check 成功並報告設定的路由和必填欄位。如果啟用了三種語言，建置前補齊對應的 `zh-sg` 和 `zh-tw` Markdown 檔案：

```bash
pageskill build
```

## 常見錯誤

- **預設語言不在 activeLocales：** 把 `defaultLocale` 加入 `activeLocales`，或將預設語言改為已啟用的語言。
- **缺少本地化值：** 為每個 active locale 加入相同的網站名稱和描述鍵，並新增對應 Markdown 檔案。
- **頁面路由衝突：** 保持頁面路由和文章路由不同；文章要使用上面帶 `/posts/` 的路徑。
- **starter 找不到 `docs`：** starter 網站使用 `pattern: document`，只有 `catalog` 顯示主題提供 `docs` 後才複製並使用它。
- **把標記或腳本寫進 config：** 將視覺行為移到主題，動態業務移到 `backend/handler.ts`。

## 預期結果與下一步

現在 `config.yml` 已提供 Pageskill 所需的網站身分、多語言路由、collection 驗證和主題選擇。UI 文案放在主題 `i18n.yml`，接著閱讀 [Markdown 入門](/zh-tw/guide/markdown/)或返回 [Guide](/zh-tw/guide/)。

[返回 Guide](/zh-tw/guide/) · [下一步：Markdown 入門](/zh-tw/guide/markdown/)
