---
kind: page
title: Pageskill：用 Markdown 建立內容網站
description: 用 Markdown、YAML 和可重用 Component 建立清楚的多語言內容網站。
component: home
toc: false
---

:::hero{tone="brand" align="left" media="/assets/hero-telescope.png" mediaAlt="代表清楚網站探索能力的小型望遠鏡" mediaWidth="300" mediaHeight="300"}
*Pageskill · 靜態優先*

# 從內容出發，發布一個用心打磨的網站

用 Markdown 寫內容，用 YAML 保存網站決策，讓可移植 Component 負責呈現。本機 Search 留在靜態網站中；資料庫、模型、密鑰和寫入操作透過命名外部 API 提供。

[開始建立](/zh-tw/posts/start/) [查看原始碼](https://github.com/jsw-teams/pageskill)
:::

Pageskill 把日常編輯的內容與靜態網站不應承擔的基礎設施分開。這樣的網站更容易審閱和遷移，也能如實說明每一項已啟用能力。

## 邊界清楚，不增加額外模式

:::feature-grid{columns="3"}
### 內容保持可讀
頁面、教學、發布說明、導覽和政策文字放在 Markdown 或設定中，而不是藏進 Theme TypeScript。

### Component 保持可移植
Component 負責版面、互動、無障礙和簡短介面文字，不硬編碼本站的介紹、路由或示範資料。

### 服務保持外置
命名 API 透過已設定 URL 連接可選資料或 AI 服務。私密憑證只保存在獨立部署的服務中，絕不進入產生的 JavaScript。
:::

## 沿著真實專案學習

下面每一篇指南都對應本站建置時真正使用的檔案和契約。

:::learning-path
### [開始](/zh-tw/posts/start/)
安裝專案、執行產生器，並修改 `content/pages/` 下的穩定首頁。

### [編寫 Markdown](/zh-tw/posts/markdown/)
使用標題、清單、連結、表格和簡短 Component 指令，不把頁面寫成設定語言。

### [設定網站](/zh-tw/posts/site-settings/)
在可審閱的 YAML 中設定網站識別、語言、路由、導覽、隱私資料和命名 API。

### [建立 Component](/zh-tw/posts/components/)
透過唯一的 `ComponentDefinition` 擴充契約加入可重用呈現或行為。

### [連接探索能力](/zh-tw/posts/agent-discovery/)
產生基於事實的 Agent 中繼資料，讓條件能力始終對應真實實作。

### [開發 Agent Skill](/zh-tw/posts/skill-development/)
向 Agent 描述網站真實的內容、設定、Component 與外部服務邊界。
:::

## 三個指令，三個清楚職責

| 指令 | 職責 |
| --- | --- |
| `page g` | 驗證並把靜態網站產生到 `dist/public`。 |
| `page c` | 執行完整瀏覽器無障礙審查，並把報告留在私有目錄。 |
| `page s` | 開發時監看、重建並預覽同一份靜態輸出。 |

:::cta{href="/zh-tw/updates/1.0.0-beta.0/" label="閱讀 1.0.0 beta 說明"}
## 只保留一套目前契約

1.0.0 beta 移除了歷史執行模式和擴充別名，只保留一套 Component 模型、統一 Client Runtime 和外部 API 邊界。
:::
