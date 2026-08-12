import { execFileSync } from "node:child_process";
import { copyFile, mkdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { homepageFiles, homepageWorkflowFiles } from "./homepage-config.mjs";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const commandArguments = process.argv.slice(2);
const dryRun = commandArguments.includes("--dry-run");
const sourceArgument = commandArguments.find((argument) => !argument.startsWith("--"));

if (!sourceArgument) {
  throw new Error(
    "請提供本機主頁資料夾，例如：npm run homepage:sync -- /path/to/local/aidata-portal",
  );
}

const sourceRoot = path.resolve(sourceArgument);

function git(args, { trim = true } = {}) {
  const output = execFileSync("git", args, {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
  return trim ? output.trim() : output;
}

const branch = git(["branch", "--show-current"]);
if (!branch || branch === "main" || branch === "master") {
  throw new Error("請先建立主頁功能分支；homepage:sync 不允許直接修改 main。 ");
}

const changedFiles = git(["status", "--porcelain"], { trim: false })
  .split("\n")
  .filter(Boolean)
  .map((line) => line.slice(3));
const unexpectedChanges = changedFiles.filter(
  (file) => !homepageWorkflowFiles.includes(file),
);
if (unexpectedChanges.length > 0) {
  throw new Error(
    `工作目錄包含主頁範圍外的變更，已停止：\n${unexpectedChanges.join("\n")}`,
  );
}

const localIndex = await readFile(path.join(sourceRoot, "index.html"));
const localPreview = await readFile(
  path.join(sourceRoot, "outputs", "index.html"),
);
if (!localIndex.equals(localPreview)) {
  throw new Error("本機 index.html 與 outputs/index.html 不一致，請先同步預覽版。 ");
}

for (const relativePath of homepageFiles) {
  const sourcePath = path.join(sourceRoot, relativePath);
  const destinationPath = path.join(repositoryRoot, relativePath);
  const sourceStat = await stat(sourcePath);
  if (!sourceStat.isFile()) {
    throw new Error(`來源不是檔案：${sourcePath}`);
  }
  if (!dryRun) {
    await mkdir(path.dirname(destinationPath), { recursive: true });
    await copyFile(sourcePath, destinationPath);
  }
}

console.log(
  `${dryRun ? "預檢通過" : "完成"}：僅${
    dryRun ? "會" : ""
  }同步 ${homepageFiles.length} 個主頁發布檔案；未接觸任何專案子路徑。`,
);
