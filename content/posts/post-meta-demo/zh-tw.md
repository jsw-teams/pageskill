---
kind: post
title: 一篇誠實顯示文章中繼資料的文章
description: 用一篇真實的中英混合文章展示發佈日期、修改日期、字數和閱讀時間。
date: 2026-09-01
updated: 2026-09-12
---

# 一篇誠實顯示文章中繼資料的文章

這篇文章特意寫得足夠長，讓文章頁首的中繼資料真正有用。Pageskill 會讀取 Markdown 正文，統計可見的 CJK 字元和拉丁文字詞元，並估算閱讀時間，不要求作者另外維護一組容易過期的數字。

發佈日期是 `2026-09-01`，`updated` 欄位記錄後來在 `2026-09-12` 做過修改；它不會改變文章原本的發佈日期，也不會把這篇教學變成版本說明。版本說明放在 `content/updates/<id>/<locale>.md` 並使用 `kind: release`，出現在獨立的[專案發布彙整](/zh-tw/updates/)中。

## 讀者會看到什麼

預設的 `postMeta` 元件會在緊湊的文章頁首顯示發佈日期、修改日期、約略字數、閱讀時間和作者。因為本文填寫了 `updated`，正文前還會出現更新提示。提示文案來自主題 messages，不是 renderer 裡根據語言寫一串條件分支。

一般文章可以省略 `updated`。發佈日期、字數和閱讀時間仍然顯示，但修改日期和更新提示會完全消失，不留下空位。可以和[沒有 `updated` 的第一篇文章示例](/zh-tw/posts/first-post/)比較這一點。

## 一個小型 Markdown 實驗

這句話同時包含中文、简体中文和 English words，說明中英混合文章可以自然地寫在一起，不必把每種語言拆成不同頁面。像[設定說明](/zh-tw/posts/site-settings/)這樣的連結，會把讀者看得到的連結文字計入 reading units，但不會把 URL 本身算進去。

像 `page g` 這樣的 inline code 對讀者有幫助，但不會計入字數。fenced code sample 也不會計入，因為實作程式碼不應該讓一段簡短說明看起來像巨長文章：

```yaml
theme:
  name: default
  config: ./site/theme.yml

post:
  date: 2026-09-01
  updated: 2026-09-12
```

更長的程式碼示例也遵循相同規則：

```ts
const visibleText = markdownBody;
const metrics = calculateMetrics(visibleText);
console.log(metrics.readingMinutes);
```

## 為什麼要自動計算

作者擅長寫作和編輯，但手動維護字數很容易忘記。確定性的 metrics 讓頁面在每次修改後仍然誠實。拉丁文字按詞元統計，漢字、平假名、片假名和韓文字符逐字統計。合併後的 reading units 足夠支援主題顯示「約 1,240 字」或英文 “1,240 words” 這樣的緊湊標籤。

閱讀時間使用拉丁文字和 CJK 字元各自的預設速度。短文章仍然至少顯示 1 分鐘，較長文章則隨正文長度增加。Frontmatter、Markdown 標記、程式碼和連結目的地都不會被當成普通正文。

## 安全地製作類似文章

要製作類似文章，在 `content/posts/` 下建立一個目錄，並在裡面為每個啟用的語言放一個檔案。翻譯版本使用同一個 ID 和發佈日期。主題元件覆寫放在 `site/theme.yml`，網站身份和連結放在 `config.yml` 或專案內的 `extends` 檔案中。

編輯後執行 `page g`，再在 preview 中開啟產生的頁面。如果 update 早於 date，或者不是嚴格的 ISO 日期/時間，build 會指出來源檔案位置並失敗，讓錯誤在發佈前被修正。

這是一篇 Demo，但同樣的模型也適合真實的日誌、教學和產品說明，不需要作者手寫 HTML。
