---
title: 改成你的名稱和導覽
description: 在 config.yml 設定網站名稱、語言和導覽，讓首頁連到你的文章。
date: 2026-09-07
---

# 改成你的名稱和導覽

`config.yml` 是設定檔：它保存網站資料和開關，不執行程式碼。先修改名稱和導覽，其他設定之後再加入。
文章沒有在 Frontmatter 寫作者時，會使用對應語言的 `author`；發佈前請把 `Site Owner` 換成真實的網站作者。

## 1. 開啟設定檔

在新網站根目錄編輯 `config.yml`，保留下面這組最小設定：

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
  zh-sg: 寫下我的文章。
  zh-tw: 寫下我的文章。
  en: Notes from my work.
author:
  zh-sg: Site Owner
  zh-tw: Site Owner
  en: Site Owner
```

## 2. 修改導覽

在同一個檔案的 `navigation.links` 下放置公開入口：

```yaml
theme:
  name: default
navigation:
  links:
    - key: home
      href: /:locale/
    - key: posts
      href: /:locale/posts/
```

`:locale` 會在產生時換成 `zh-sg`、`zh-tw` 或 `en`。不要把訪客輸入拼進設定檔。

## 3. 產生並預覽

```powershell
npm run g
npm run s
```

開啟三個語言的首頁和文章入口，確認名稱、語言連結和導覽都正確。

## 成功結果

每個啟用的語言都有自己的首頁，頁首顯示新的網站名稱，導覽可以進入該語言的文章列表。

## 常見問題

YAML 縮排必須使用空格；`siteName` 和 `description` 的每個啟用語言都應有值。寫成標籤或混用 Tab 時，產生會在設定附近提示錯誤。

## 下一步

接著閱讀 [Markdown：像寫筆記一樣寫文章](/zh-tw/posts/markdown/)，先做一篇最小文章。
