---
name: case-uiux-direction
description: 依案型為 JWJProjects 各專案決定並實作「不同」的 UI/UX 方向。新建專案、重做介面、改 style.css/index.html 版面、或使用者說「風格太像」「換個風格」「依案型設計」時使用。先判定案型→選 archetype→寫 DESIGN.md→實作→用 uiux-sameness-audit 驗收。
---

# 依案型決定 UI/UX 方向

JWJProjects 的專案是不同性質的公部門案型（GIS 決策、流程審核、資料品管、無障礙稽核……）。
**組織層只統一「底線」（可及性、誠實揭露、離線可跑），不統一「長相」。** 每個案子的版面骨架、色彩、字體、密度與簽名元素，都要從它的使用者與任務推導出來，而不是套用上一個案子的樣子。

## 工作流程（照順序做，不可跳步）

1. **讀案子**：讀 README、docs/REQUIREMENTS（或 requirements.md）、index.html、app.js、tests。回答三個問題並寫下：
   - 主要使用者是誰？（承辦、審核、主管、民眾、外勤、開發者…）
   - 他在這個畫面上「主要在做什麼動作」？（看地圖找區域、讀文件下決定、掃大量資料列、逐項勾檢查…）
   - 一次工作階段多長、在哪裡用？（辦公桌長時間、會議投影、手機現場…）
2. **判定案型**：用下表選 **一個主 archetype**（最多再借一個次要元素）。讀對應的 `references/archetype-*.md`。

   | 主要任務特徵 | Archetype | 檔案 |
   |---|---|---|
   | 空間資料、地圖是主要判讀對象 | A 製圖台 Cartographic | `references/archetype-a-cartographic.md` |
   | 文件／表單、送審退回核准、需回查原文 | B 卷宗 Case File | `references/archetype-b-casefile.md` |
   | 大量資料列、欄位映射、規則、批次處理 | C 工作台 Workbench | `references/archetype-c-workbench.md` |
   | 民眾端服務、無障礙、檢核清單、法規導向 | D 公共明文 Civic Plain | `references/archetype-d-civicplain.md` |
   | 給主管／評審看的成果、指標、敘事 | E 簡報刊物 Briefing | `references/archetype-e-briefing.md` |
   | 現場、手機、單手、戶外、斷網 | F 外勤 Field | `references/archetype-f-field.md` |

   對不上的新案型：從最近的 archetype 出發，但在 DESIGN.md 寫明改了哪些軸，並確保仍與其他 repo 拉開差距。

3. **讀組織底線**：`references/org-baseline.md`。這些是所有案子必須「一致」的部分；其他都應該不同。
4. **查撞臉**：看 `references/org-registry.md`，確認你選的 archetype、色相家族、字體組合、簽名元素沒有被其他 repo 用掉。若有衝突，換掉（不是微調色碼）。
5. **寫 DESIGN.md**（放 repo 根目錄或 docs/）：用 `references/design-brief-template.md`。先寫完再動 CSS。
6. **實作**：
   - 先改 CSS token（`:root` 變數），再改版面骨架，再改元件，最後改文案語氣。
   - **保留測試掛鉤**：所有 `id`、`data-*`、`name`、ARIA role/label、可及名稱，以及 tests 內用到的 class 名稱都不可改名或刪除。改 HTML 結構前先 `grep` tests/ 確認。需要改結構時，用包一層或 CSS Grid 重排，而不是換掉元素。
   - 不新增套件、CDN、外部字型、地圖瓦片。只用系統字型堆疊。
7. **驗收**：
   - 跑專案原有測試（`npm test`、瀏覽器測試）全部通過。
   - 執行 `uiux-sameness-audit` skill，跨 repo 指紋比對須通過。
   - 重新截圖（桌面＋390px），更新 README 的截圖。
   - 在 `references/org-registry.md` 登記本案的 archetype 與簽名元素（若該檔在組織共用處，也一併更新）。

## 常見錯誤

- 只換主色、不換骨架 → 仍然撞臉。差異必須至少落在 **骨架、字體、密度、簽名元素** 其中三軸。
- 把「漂亮的 dashboard」當預設 → 4 格 KPI 卡＋巨型標題只適合 E 簡報刊物，其他案型不准放在首屏。
- 為了風格犧牲可及性 → 底線優先，風格讓步。
- 把英文 mono 小字當裝飾 → 只有在資料值、ID、代碼上用 mono。
