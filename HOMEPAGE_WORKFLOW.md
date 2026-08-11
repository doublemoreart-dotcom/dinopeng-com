# dinopeng-com 主頁：本機、Git 發布與回復流程

## 責任邊界

- 本機主頁資料夾只負責編輯與 `file://` 預覽。
- 本機 `outputs/` 只保留比較稿與預覽，不得進入 Git。
- 正式 Git 工作副本只負責 `dinopeng.com` 根首頁的版本、PR 與部署。
- 專案子路徑是獨立發布快照，不屬於主頁更新範圍。

主頁允許同步的發布檔案只有：

- `index.html`
- `assets/favicon.png`
- `assets/og.png`
- `assets/projects/*.png` 中列入 `scripts/homepage-config.mjs` 的六張預覽圖

## 每次主頁更新

從最新 `origin/main` 建立隔離工作目錄與分支：

```bash
git fetch --prune origin
git worktree add -b codex/homepage-<change> ../dinopeng-com-homepage-<change> origin/main
```

在新工作目錄執行一次主頁更新：

```bash
npm run homepage:update -- /absolute/path/to/local/dinopeng-com --dry-run
npm run homepage:update -- /absolute/path/to/local/dinopeng-com
```

`--dry-run` 只驗證，不寫入檔案。正式執行會依序預檢、同步、驗證及精準暫存白名單內的主頁檔案；任何一步失敗就停止，而且不會自動 commit 或 push。

確認輸出的 staged 差異只包含主頁後，再提交、推送及建立 PR。PR 合併後等待 GitHub Pages 完成，最後檢查正式首頁。

若需要分步除錯，仍可個別使用：

```bash
npm run homepage:sync -- /absolute/path/to/local/dinopeng-com --dry-run
npm run homepage:sync -- /absolute/path/to/local/dinopeng-com
npm run homepage:check
git add index.html assets/favicon.png assets/og.png assets/projects
npm run homepage:check:staged
```

## 推送錯誤

Git push 失敗不代表正式網站已改變。先查詢遠端分支 SHA：

```bash
git ls-remote origin refs/heads/<branch>
```

- 遠端沒有該分支：修正傳輸問題後重推。
- 遠端 SHA 等於本機 `HEAD`：推送其實完成，不要重複改寫歷史。
- 分支已推但 PR 尚未合併：`main` 與正式網站都不受影響。

## 已上線後回復

不要使用 `git reset --hard` 或強制推送 `main`。從最新 `origin/main` 建立回復分支，再反向提交造成問題的主頁 merge commit：

```bash
git fetch --prune origin
git worktree add -b codex/revert-homepage ../dinopeng-com-revert-homepage origin/main
cd ../dinopeng-com-revert-homepage
git revert <homepage-merge-commit>
npm run homepage:check
npm run release:check
git push -u origin codex/revert-homepage
```

接著建立 PR、合併並等待 Pages 部署。這種方式保留完整歷史，也不會回寫專案子路徑。

目前可辨識的主頁節點：

- `f638036`：展覽首頁與 Google Analytics。
- `07e61c5`：展覽首頁、尚未加入 Analytics。
- `2dbeb70`：展覽首頁發布前的舊入口。

若要退回多次主頁更新，必須由新到舊依序 `git revert`。
