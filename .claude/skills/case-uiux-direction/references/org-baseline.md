# 組織底線（所有案子一致的部分）

只有這份清單要求一致。清單以外的視覺與互動，各案應依 archetype 走不同路線。

## 1. 可及性（WCAG 2.2 AA 為最低）
- 一般文字對比 ≥ 4.5:1，大字（≥24px 或 ≥18.66px 粗體）與 UI 元件邊界／圖示 ≥ 3:1。用 `uiux-sameness-audit/scripts/uiux_audit.py contrast` 驗算。
- 所有互動元件鍵盤可達，`:focus-visible` 清楚可見（樣式可以各案不同，但必須明顯）。
- 狀態、類別、分數不可只靠顏色，須另有文字、形狀、圖示或圖樣。
- 觸控目標 ≥ 24×24 CSS px（F 外勤 ≥ 48px）。
- 保留 skip link、語意化標題階層、表格 `<th scope>`、表單 `<label>`。
- `prefers-reduced-motion: reduce` 時關閉非必要動畫。

## 2. 響應式
- 390px 寬無水平溢位；只有寬表格可在自己的容器內橫向捲動。
- 手機版要「重新設計資訊順序」，不是單純把桌面欄位堆疊。

## 3. 誠實揭露
- 合成資料、展示限制、不是 AI／不代表準確率等聲明必須在畫面上可見。
  （**呈現方式各案不同**：A 放圖面註記、B 放卷宗浮水印／頁首註、C 放狀態列、D 放頁首橫幅…）
- 不得用視覺手法讓分數、模型提示看起來比實際更權威。

## 4. 技術
- 無套件、無 CDN、無外部字型、無追蹤；`python3 -m http.server` 可直接跑。
- 只用系統字型堆疊，繁中須有 fallback：
  - 無襯線：`"Noto Sans TC","Noto Sans CJK TC","PingFang TC","Microsoft JhengHei",sans-serif`
  - 襯線（明體）：`"Noto Serif TC","Noto Serif CJK TC","Source Han Serif TC","PMingLiU","MingLiU",serif`
  - 楷體：`"BiauKai","DFKai-SB","TW-Kai","Kaiti TC",serif`（只用於少量標籤）
  - 等寬：`ui-monospace,"SFMono-Regular",Consolas,"Noto Sans Mono CJK TC",monospace`
- 數字欄位 `font-variant-numeric: tabular-nums`。
- 不破壞既有測試掛鉤（id、data-*、role、可及名稱、tests 用到的 class）。

## 5. 文案
- 繁體中文、台灣公部門用語。語氣依 archetype 調整（見各 archetype「文案語氣」）。

## 不屬於底線（各案必須自己決定、且應彼此不同）
色彩與色相家族、字體組合、版面骨架、資訊密度、圓角、陰影、品牌標記樣式、頁首樣式、圖表風格、簽名元素、動效、語氣。
