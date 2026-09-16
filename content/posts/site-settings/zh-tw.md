---
kind: post
title: 設定結構：網站設定只有一個清楚來源
description: 理解 config.yml、可選設定分層、site/theme.yml、content，以及網站資料和主題程式碼的邊界。
date: 2026-09-07
category: tutorial
---

# 設定結構：網站設定只有一個清楚來源

Pageskill 把網站作者會修改的檔案，與主題實作程式碼分開。可以這樣理解：

```text
config.yml
├─ 網站身份、語言、導覽、頁尾
├─ 內容 collection 和 view
├─ integrations、隱私政策、發現、部署
└─ 可選 extends：./config/*.yml

site/theme.yml
└─ 少量、經過 schema 驗證的主題/元件外觀覆寫

content/
└─ Markdown 頁面、文章、資源和 Frontmatter

themes/default/
└─ 可重用實作、資源、元件和參考範例
```

普通網站工作只需要前三層。`themes/default/` 不是另一套網站設定目錄。

## 1. 保持根設定可讀

先寫網站身份和主題實例：

```yaml
siteUrl: https://example.com
defaultLocale: zh-tw
activeLocales:
  - zh-sg
  - zh-tw
  - en
siteName:
  zh-sg: 我的文章站
  zh-tw: 我的文章站
  en: My article site
description:
  zh-sg: 用 Markdown 寫下我的文章。
  zh-tw: 用 Markdown 寫下我的文章。
  en: Notes from my work.

theme:
  name: default
  config: ./site/theme.yml
```

Navigation 和 Footer 也放在這個根設定或相關的設定分層中：

```yaml
navigation:
  links:
    - key: home
      href: /:locale/
    - key: posts
      href: /:locale/posts/
    - label: GitHub
      href: https://github.com/example/example
      target: _blank

footer:
  links:
    - key: privacy
      href: /:locale/privacy/
    - label: 專案原始碼
      href: https://github.com/example/example
      target: _blank
```

內部連結可以使用 `:locale`，外部連結只允許 HTTP(S)。新視窗連結會自動帶 `rel="noopener noreferrer"`。標籤可以用 `labels.<locale>`，並按目前語言、設定的 fallback、English、翻譯鍵、最後是 link key 依次回退。

## 2. 只拆分真正相關的設定

設定變大時，再從根檔案引用專案內 YAML：

```yaml
extends:
  - ./config/content.yml
  - ./config/discovery.yml
```

載入順序是：Pageskill 內建預設值、按順序讀取的這些檔案、最後的 `config.yml`。物件遞迴合併，陣列整體替換，純量（包括顯式 `null`）覆蓋前值。YAML 不會執行程式碼、隨意 include 路徑或自動追加陣列。每個檔案都必須留在專案根內，循環或缺失檔案會顯示來源路徑並失敗。

不要為了證明 `extends` 而製造很多小檔案。Demo 把 content policy 和 discovery policy 分開，是因為它們是有意義的分組；小站完全可以只使用一個 `config.yml`。

## 3. 在 `config.yml` 表達 Provider 意圖

第三方服務屬於網站能力，不是主題外觀。只設定本站實際使用的服務：

```yaml
integrations:
  google-analytics:
    measurementId: G-XXXXXXXXXX
```

受信任的 adapter registry 會提供 Provider schema、隱私用途、同意要求和安全資源載入器。Provider 節點預設啟用，也可以寫 `enabled: false` 暫停。不要再新增 `purpose`、腳本 URL、inline code、分類列表或一堆 false Provider。公開識別會被驗證；secret 應放在部署環境和 backend 中。

如果設定的 adapter 需要同意，Consent UI 只會生成它實際使用的 purpose；沒有這樣的 adapter 就沒有橫幅。只有確有需要時，才設定瀏覽器選擇策略：

```yaml
privacy:
  consent:
    decisionRetentionDays: 180
```

它表示瀏覽器保存選擇的時間，不是 Provider 服務端的資料保留期限。完整說明請看[設定 Integration 與隱私同意](/zh-tw/posts/cookies/)。

## 4. `site/theme.yml` 只放外觀覆寫

網站實例檔案可以是空的：

```yaml
# site/theme.yml
components: {}
```

省略 `theme.config` 也會得到同樣的空覆寫物件。元件預設值和 schema 在程式碼中維護，因此不要把每個 `enabled: true` 都複製進來。只有網站與主題預設值不同才寫，例如：

```yaml
components:
  search:
    maxResults: 12
```

進階主題仍可以使用 `components.shell.navigation.before/after` 和 `components.shell.footer.before/after` 插槽插入可重用連結；它們共用同一套安全連結模型，但普通 Navigation 和 Footer link 屬於網站級設定。

## 5. 用 Markdown 管理內容

穩定頁面位於 `content/pages/<id>/<locale>.md`。教學、部落格、產品記錄和普通文章位於 `content/posts/<id>/<locale>.md`，版本說明位於獨立的 `content/updates/<id>/<locale>.md`。每篇 post 都需要 `date`；可選的 `updated` 記錄後續修改，不改變發佈日期。`content/updates/` 是真正的版本說明 collection，不是篩選 view，也不是 `updated` 時戳。

## 預期結果

網站作者第一次打開設定檔，就能看懂身份、語言、連結、內容模型和部署，不會先面對一整面主題預設值。主題程式碼保持可重用，產生檔案只作為輸出檢查，而不是作者編輯入口。

## 下一步

繼續閱讀 [Markdown：像寫筆記一樣寫文章](/zh-tw/posts/markdown/)，建立第一個頁面或文章。
