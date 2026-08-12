import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { homepageFiles } from "./homepage-config.mjs";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const argumentsFromCli = process.argv.slice(2);
const dryRun = argumentsFromCli.includes("--dry-run");
const sourceArgument = argumentsFromCli.find(
  (argument) => !argument.startsWith("--"),
);

if (!sourceArgument) {
  throw new Error(
    "請提供本機主頁資料夾，例如：npm run homepage:update -- /path/to/local/aidata-portal",
  );
}

function run(command, args, { capture = false } = {}) {
  return execFileSync(command, args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    stdio: capture ? ["ignore", "pipe", "inherit"] : "inherit",
  });
}

function git(args, options) {
  return run("git", args, options);
}

const statusBefore = git(["status", "--porcelain"], { capture: true }).trim();
if (!dryRun && statusBefore) {
  throw new Error(
    "正式更新前 Git 工作目錄必須乾淨。請先提交、暫存或移除既有變更，再重新執行。",
  );
}

const syncArguments = [
  path.join(repositoryRoot, "scripts", "homepage-sync.mjs"),
  sourceArgument,
  "--dry-run",
];

console.log("\n[1/4] 預檢本機來源與同步範圍");
run(process.execPath, syncArguments);

if (dryRun) {
  console.log("\n[2/2] 驗證目前正式主頁");
  run(process.execPath, [
    path.join(repositoryRoot, "scripts", "homepage-check.mjs"),
  ]);
  console.log("\n主頁更新預檢完成；沒有寫入或暫存任何檔案。");
  process.exit(0);
}

console.log("\n[2/4] 同步主頁發布檔案");
run(process.execPath, syncArguments.slice(0, -1));

console.log("\n[3/4] 驗證主頁內容與素材");
run(process.execPath, [
  path.join(repositoryRoot, "scripts", "homepage-check.mjs"),
]);

console.log("\n[4/4] 精準暫存並驗證 Git 範圍");
git(["add", "--", ...homepageFiles]);
run(process.execPath, [
  path.join(repositoryRoot, "scripts", "homepage-check.mjs"),
  "--staged",
]);
git(["diff", "--cached", "--check"]);

const stagedFiles = git(["diff", "--cached", "--name-only"], {
  capture: true,
}).trim();

if (!stagedFiles) {
  console.log("\n同步完成：本機主頁與 Git 版一致，沒有需要提交的變更。");
  process.exit(0);
}

console.log("\n已暫存以下主頁變更：");
console.log(stagedFiles);
git(["diff", "--cached", "--stat"]);
console.log(
  "\n請確認差異後再 commit、push 與建立 PR；本命令不會自動發布。",
);
