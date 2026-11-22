---
name: uiux-sameness-audit
description: 檢查 JWJProjects 各 repo 的介面是否「撞臉」，並驗算色彩對比。改完 style.css/index.html 後、開 PR 前、或使用者問「會不會跟其他專案太像」時使用。搭配 case-uiux-direction 使用。
---

# UI/UX 撞臉檢查

目的：確保各案依案型走出不同的介面，同時守住組織可及性底線。檢查分三層：機器指紋、對比驗算、人眼比對。三層都過才算通過。

## 1. 準備
把組織內要比對的 repo 都 clone 到同一層目錄（唯讀即可）：
```bash
for r in public-facility-access-map report-evidence-ai public-data-quality-ai accessible-service-qa; do
  [ -d "$r" ] || git clone --depth 1 https://github.com/JWJProjects/$r.git
done
```
比對時，**自己正在改的 repo 用工作目錄的版本**，其他 repo 用 main 最新版（或對方改版中的分支）。

## 2. 機器指紋比對
```bash
python3 -I <skill_dir>/scripts/uiux_audit.py compare <本案> <其他 repo...>
```
- 讀 CSS／HTML 產生指紋：主色相分布、字族組合（sans/serif/mono/kai）、圓角中位數、基準字級、改版前的 7 項共同指紋。
- **通過條件**：每案共同指紋 ≤ 1 項；任兩案相似度 ≤ 0.55。exit code 0 = 通過。
- 不通過時看輸出的分項（色相／指紋／字族／圓角），回到 `case-uiux-direction` 對應 archetype 調整「骨架或簽名元素」，不要只微調色碼來騙過分數。
- 指紋是啟發式；若你確信是誤判，在 PR 說明寫出原因與人眼比對截圖。

## 3. 對比驗算
把 DESIGN.md 的每組前景／背景都驗：
```bash
python3 -I <skill_dir>/scripts/uiux_audit.py contrast "#文字" "#背景" "#次要文字" "#背景" "#按鈕字" "#按鈕底" ...
```
任一組 FAIL（<3:1）即不通過；一般文字須 ≥ 4.5:1（輸出標 AA 或 AAA）。

## 4. 人眼比對
1. 依各 repo 既有方式啟動並截圖（桌面 1440×900 首屏＋390px 手機首屏）。可用專案內的 Playwright 測試腳本或手動截圖。
2. 拼貼：
   ```bash
   python3 <skill_dir>/scripts/uiux_audit.py grid /tmp/compare.jpg a.png b.png c.png d.png   # 需 Pillow
   ```
3. **遮住產品名稱**問自己：
   - 只看縮圖，能分辨這是哪一個案子嗎？
   - 能從畫面看出它的主要任務（看圖／讀文件／掃資料／逐項檢核）嗎？
   - 是否有兩張圖的頁首、標題區、卡片樣式看起來像同一套模板？
   任一題答「不能／是」→ 不通過。

## 5. 底線回歸（不可因改風格而退步）
- 原有測試全過（`npm test`、瀏覽器測試）。
- 鍵盤走一遍主流程，焦點每步可見。
- 390px 無水平溢位。
- 狀態不只靠顏色。
- 合成資料／限制聲明仍在畫面上可見。

## 6. 回報格式（貼在 PR 說明）
```
### UI/UX 撞臉檢查
- Archetype：
- compare 結果：（貼輸出）
- contrast 結果：（貼輸出）
- 人眼比對：（附拼貼圖）三題皆通過／說明
- 底線回歸：測試 X/X、鍵盤 ✓、390px ✓、非僅顏色 ✓、聲明 ✓
```
