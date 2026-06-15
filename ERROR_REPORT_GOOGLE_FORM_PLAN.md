# Google Form 錯誤回報整合規劃

## 實作狀態

- 狀態：已完成方案 A 串接、表單內容優化與發布驗證。
- 表單網址：<https://docs.google.com/forms/d/e/1FAIpQLScYr_-_MGfh0lV8Mps7tuvWMi7wX_qfDs1CVm7b51aRTRUY1w/viewform?usp=header>
- 網頁行為：點擊 footer 的「開啟錯誤回報表單」後，在新分頁開啟 Google Form。
- 備援方式：若表單網址未設定或無法使用，保留原有 Email 回報彈窗與 `doublemore.art@gmail.com` 聯絡方式。

## 目標

將目前 footer 的「錯誤回報」從 `mailto:` 草稿模式，升級為 Google Form 收件與 Google Sheet 彙整。使用者仍從頁面 footer 點擊「回報錯誤」，但回報資料會進入表單後台，方便追蹤、整理與後續修正。

## 建議表單欄位

- 問題位置：短文字，例如「各產業 AI 滲透率」「公開報告來源池」。
- 問題類型：下拉選單，沿用目前頁面分類。
  - 資料或引用錯誤
  - 圖表或互動異常
  - 文字敘事需修正
  - 版面或閱讀性問題
  - 其他
- 問題描述：長文字，必填。
- 回覆聯絡方式：短文字，選填。
- 頁面網址：短文字，可由頁面預填。
- 版本日期：短文字，可由頁面預填。
- 版號：短文字，可由頁面預填。

## 整合方式

### 方案 A：外部開啟 Google Form

footer 按鈕點擊後，開啟 Google Form 新分頁。

優點：
- 實作最穩定。
- 不需要處理跨域送出。
- Google Form 自帶驗證、通知與 Google Sheet 彙整。

缺點：
- 使用者會離開目前頁面。
- 視覺整合度較低。

### 方案 B：彈窗內嵌 Google Form

保留目前彈窗，但內容改為 Google Form iframe。

優點：
- 使用者留在頁面內。
- 體驗較接近目前的錯誤回報彈窗。

缺點：
- iframe 高度與手機體驗需測試。
- Google Form 樣式無法完全跟頁面一致。

### 方案 C：保留目前彈窗，送出到 Google Form

目前彈窗仍使用自訂 UI，送出時 POST 到 Google Form 的 `formResponse` endpoint。

優點：
- 視覺整合最好。
- 使用者體驗最順。

缺點：
- 需要取得每個欄位的 `entry.xxxxx` ID。
- Google Form 跨域與提交成功狀態不易完整控制。
- 維護成本最高。

## 建議採用

目前採用 **方案 A**，之後若外部讀者增加，再評估升級到 **方案 B**。

目前靜態網頁不需要後端，Google Form 可以穩定收件、寄通知並彙整到 Google Sheet；若未來要做狀態追蹤或管理後台，再考慮自建 API。

## 實作步驟

1. 建立 Google Form，使用上方建議欄位。
2. 在 Google Form 設定中開啟 email 通知，或連動 Google Sheet。
3. 取得公開表單連結。
4. 將 `index.html` 中的錯誤回報模式改為 Google Form：
   - 新增 `const googleFormUrl = '表單連結';`
   - footer 的「回報錯誤」按鈕改為開啟 Google Form。
   - 若需要預填頁面網址、版本日期與版號，使用 Google Form 的 prefilled link。
5. 保留目前 `mailto:` 作為備援。

## 驗收標準

- 點擊 footer「回報錯誤」後可開啟 Google Form。
- Google Form 欄位與目前回報需求一致。
- 送出後資料會進入 Google Form 回覆或 Google Sheet。
- Google Form 可收到頁面網址、版本日期與版號。
- 若表單連結未設定，頁面仍可使用目前 `mailto:` 回報機制。
