---
kind: release
title: '3.1.0：3.x 最後的設定版本'
description: '保留作為版本歷史的 3.x 更新說明；新網站應遵循 4.0 Component 契約。'
date: 2026-09-13
---

# 3.1.0：3.x 最後的設定版本

這是 3.x 版本線的歷史更新說明。它保留在 release archive 中以保持版本記錄準確，但不是目前使用指南。新網站應閱讀[4.0.0](/zh-tw/updates/4.0.0/)和[設定結構](/zh-tw/posts/site-settings/)。

3.x 版本線整理了分層設定、網站實例設定、多語言內容、Provider 宣告、生成式 discovery 和無障礙檢查。4.0.0 又重新審查了這些邊界，並有意不把舊寫法作為相容 API 延續下去。

不要把這篇歷史說明中的設定或擴充程式碼複製到 4.0 網站。目前邊界很清楚：Markdown 與 Frontmatter 負責內容，Config 負責網站結構，Component 負責可重用行為與表現，Runtime Adapter 可選。
