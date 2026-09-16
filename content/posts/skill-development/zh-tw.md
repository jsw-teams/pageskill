---
kind: post
title: 開發真實可信的 Agent Skill
description: 讓 Agent 指令與 Pageskill 的內容邊界、本機資源、外部 API、Provider 同意機制和產生探索資訊保持一致。
date: 2026-09-16
category: tutorial
---

# 開發真實可信的 Agent Skill

Pageskill 從探索輸出使用的同一份能力對應產生公開 Agent Skill。原始碼契約見[儲存庫 Skill 開發者規範](https://github.com/jsw-teams/pageskill/blob/main/docs/skill-development.md)；`.well-known/agent-skills/` 下的產生檔案是證據，不是編輯入口。

## 只描述真實原始碼入口

Skill 應把內容修改指向 `content/`，把網站結構指向合併設定，把網站 Component 選項指向 `site/theme.yml`，把可重用行為指向 `ComponentDefinition`。絕不能要求 Agent 編輯 `dist/`、`.pageskill/`、`src/runtime/` 或產生探索檔案。

## 使用統一 Client Runtime 契約

每個瀏覽器 Component 使用同一套生命週期契約。本機 Search 透過 `runtime.assetJson` 讀取產生的靜態索引，不需要 API 宣告。資料庫、共享狀態、模型、由私密憑證支援的操作和寫入只需增加一個綁定 `config.apis` 的命名 `client.api`。第三方瀏覽器資源使用根層 `integrations` 選擇的可信任 Provider Adapter；這套同意與隱私機制不是另一種 Client mode，也不能從網站設定傳入任意腳本 URL。

## 把隱私修訂納入任務

啟用 Provider 後，必須審核每個活動語言的隱私政策。把 Provider ID 加入政策 Frontmatter 的 `integrations` 陣列，並寫清真實用途、資料處理、撤回行為、保存期限來源與聯絡人。若本地化政策沒有宣告已啟用 Provider，產生會失敗。

## 驗證產生指令

執行 `page g --profile`，檢查 `/.well-known/agent.json`、Agent Skill 索引和產生的 `SKILL.md`，再執行 `page c`。中繼資料必須描述目前 Component 與服務，不得虛構 endpoint 或憑證。
