---
title: 用主題自訂渲染
description: 先發現可重用能力，再複製主題實作共用的 Pattern 和 Block 行為。
pattern: docs
---

# 用主題自訂渲染

人可以直接重用內建 Pattern、Block 和 schema，不需要 Agent。只有 `catalog` 和 `inspect` 顯示缺少可重用能力時才複製主題。主題擴充是共用行為，不是讓每個頁面手寫 HTML 的理由。

## 複製前先發現

在網站根目錄檢查已經涵蓋頁面和產品筆記的能力：

```bash
pageskill catalog
pageskill inspect pattern:document
pageskill inspect pattern:blog
pageskill inspect block:hero
```

如果結果已經足夠，繼續寫 Markdown。如果缺少共用行為，使用檔案管理器或遞迴複製命令把現有主題複製到 `themes/nebula/`，然後在網站根 `config.yml` 中設定：

```yaml
theme:
  name: nebula
```

保留原主題已經匯出的所有 Pattern 和 Block，尤其是 `landing`、`docs` 和 `blog`。只展示 `document` 與 `notice` 的最小範例只是說明；用它取代整個主題會移除首頁、文件和部落格頁面所需的渲染器。

## 把主題契約放在正確檔案

Pattern 和 Block 定義及其 schema 寫在 `theme.ts`。`theme.yml` 登記已匯出的名稱和資源。以下只是合併到複製主題的局部片段，不是完整替換檔案。保留既有的每個 Pattern、Block、外掛和資源映射，再新增或更新 `notice` 條目。共用 CSS 放在 `style.css`，Block 專用 CSS 在 `blockStyles` 中宣告：

```yaml
# 合併到現有 themes/nebula/theme.yml 映射。
blockStyles:
  notice:
    - blocks/notice.css
# 保留既有清單，只有在沒有時才加入這個名稱。
blocks:
  - notice
```

對應的 `theme.ts` 局部映射可以讓頁面和文章分別渲染，同時繼續接受 Markdown 子節點。把這些條目合併到現有的 `defineTheme({...})` 物件，不要替換主題其餘部分：

```ts
// 放在現有 defineTheme({...}) 物件內；保留其他每個條目。
  patterns: {
    document: { name: 'document', contexts: ['page'], render: content => `<article class="document-body">${content}</article>` },
    blog: { name: 'blog', contexts: ['post', 'blog'], render: content => `<article class="post">${content}</article>` }
  },
  blocks: {
    notice: {
      name: 'notice',
      schema: { tone: 'string' },
      render: (node, context) => {
        const tone = context.escapeHtml(node.attrs.tone || 'info');
        return `<aside class="notice notice--${tone}">${context.renderNodes(node.children)}</aside>`;
      }
    }
  }
```

把對應的 `.notice` 規則放在 `themes/nebula/blocks/notice.css`。不要再把同一規則複製進 `style.css`；一個 Block 規則只保留一個所有者。主題 TypeScript 和瀏覽器 ESM 是受信任的應用程式碼，主題不是 sandbox。

預設的 `learning-path` Block 還會讀取 `content/assets/learning/` 中的六張圖片。把這個 Block 移到另一個網站時，也要複製這些網站資源，或把 renderer 改成新網站實際存在的資源。

## 讓作者繼續寫 Markdown

註冊 `document` 和 `blog` Pattern 後，作者使用不同的 collection 路徑和 Frontmatter，但繼續寫同一種 Markdown：

```text
content/pages/overview/zh-tw.md       pattern: document  -> /zh-tw/overview/
content/posts/release/zh-tw.md        pattern: blog      -> /zh-tw/posts/release/
```

頁面寫目前資訊，不要求日期；產品筆記必須有 ISO `date`，並進入按日期排列的封存和 Feed。兩個檔案都不包含逐頁 HTML。

## 驗證擴充

複製或編輯主題後執行發現和建置檢查。`npm run compile-theme` 要在 Pageskill 原始碼儲存庫中執行；複製出來的 starter 網站沒有可執行這個命令的 `package.json` 指令：

```bash
npm run compile-theme
pageskill catalog
pageskill inspect pattern:document
pageskill inspect pattern:blog
pageskill inspect block:notice
pageskill check
pageskill build
```

預期結果是 catalog 列出保留的 Pattern 和 Block，可以看到 `notice` schema，建置的頁面和產品筆記使用各自的渲染器。編譯器會用 Block schema 拒絕未知的 directive 屬性；renderer 仍需安全處理已接受的值。檢查產生 CSS，確認 Block 規則只出現一次。

Agent 也可以按這個受限任務操作：「先執行 `pageskill catalog` 和 `inspect`。只有沒有現成能力涵蓋需求時才複製現有主題，保留每個已匯出的 Pattern 和 Block，在 `theme.ts` 用標量 schema 新增一個經過審查的 Block，在 `theme.yml` 登記名稱和 `blockStyles` 資源，用 `check` 和 `build` 驗證。不要寫逐頁 HTML，也不要在建置期間讀取秘密。」人可以直接執行相同步驟。

## 常見錯誤

- **複製主題只能渲染一種頁面：** 恢復其他已匯出的 Pattern 和 Block，尤其是 `landing`、`docs` 和 `blog`。
- **未知的 `notice` 屬性被拒絕：** 在 `theme.ts` 的 Block schema 中加入對應的標量名稱，並讓登記名稱與 `theme.yml` 保持一致。
- **CSS 沒有載入：** 確認路徑寫在 `blockStyles` 下，檔案位於複製的主題內。
- **同一 CSS 出現兩次：** 從舊所有者刪除重複規則，不要依賴 cascade 順序。
- **starter 無法使用 `docs`：** 在 starter 使用 `document`，或複製 `catalog` 確認提供 `docs` 的主題。

## 預期結果與下一步

現在已有可重用主題擴充，頁面和文章有不同渲染，內容作者仍然只寫 Markdown。更深的契約、CSS 限制和安全邊界見[二次開發](/zh-tw/development/)，也可以返回 [Guide](/zh-tw/guide/)。

[返回 Guide](/zh-tw/guide/) · [下一步：二次開發](/zh-tw/development/)
