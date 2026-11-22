# DESIGN.md 模板

複製到 repo 根目錄為 `DESIGN.md`，全部填完再寫 CSS。

```markdown
# <產品名>｜介面設計準則

## 1. 案型判定
- 主要使用者：
- 主要動作（動詞）：
- 使用情境（裝置／時長／環境）：
- Archetype：<A–F>（次要借用：<無／某元素>）
- 為什麼不是其他 archetype：

## 2. 與組織其他專案的差異
| 軸 | 本案 | 最接近的其他 repo | 差異說明 |
|---|---|---|---|
| 版面骨架 | | | |
| 主色相家族 | | | |
| 字體組合 | | | |
| 密度／圓角 | | | |
| 簽名元素 | | | |
保留的共同指紋（最多 1 項）：

## 3. Design tokens
```css
:root{
  /* color */ --bg: ; --surface: ; --text: ; --text-2: ; --line: ; --accent: ; --focus: ;
  /* semantic */ --ok: ; --warn: ; --bad: ;
  /* type */ --font-ui: ; --font-doc: ; --font-data: ; --fs-base: ;
  /* shape */ --radius: ; --shadow: ;
  /* space */ --s1:4px; --s2:8px; --s3:12px; --s4:16px; --s5:24px; --s6:32px;
}
```
對比驗算結果（uiux_audit.py contrast）：

## 4. 版面骨架
桌面（ASCII 線框）：
手機 390px（資訊順序）：

## 5. 元件語彙
## 6. 互動與動效
## 7. 文案語氣（附 3 個改寫前→改寫後範例）
## 8. 合成資料／限制聲明的呈現方式
## 9. 保留的測試掛鉤清單（id / data-* / class / role）
## 10. 驗收
- [ ] 原有測試全過
- [ ] uiux_audit.py compare 通過
- [ ] 對比、焦點、非僅顏色、390px 無溢位
- [ ] 截圖已更新
- [ ] org-registry 已登記
```
