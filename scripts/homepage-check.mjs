import { execFileSync } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  homepageFiles,
  homepageWorkflowFiles,
  projectPreviewNames,
} from "./homepage-config.mjs";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const stagedOnly = process.argv.includes("--staged");

const fromRoot = (...parts) => path.join(repositoryRoot, ...parts);

function git(args) {
  return execFileSync("git", args, {
    cwd: repositoryRoot,
    encoding: "utf8",
  }).trim();
}

async function requireFile(relativePath, minimumBytes) {
  const fileStat = await stat(fromRoot(relativePath));
  if (!fileStat.isFile() || fileStat.size < minimumBytes) {
    throw new Error(
      `${relativePath} 不存在或小於 ${minimumBytes} bytes（目前 ${fileStat.size}）。`,
    );
  }
}

const html = await readFile(fromRoot("index.html"), "utf8");
const requiredHomepageText = [
  "Dino Peng｜Learning My New Life",
  'id="entrance"',
  'id="gallery"',
  'id="designer-profile"',
  "https://dinopeng.com/tptrees/",
  "https://dinopeng.com/aidata/",
  "https://dinopeng.com/sporttech/",
  "https://dinopeng.com/48DIRECTORY/",
  "https://dinopeng.com/small-parties/",
  "https://dinopeng.com/taiwan-food-safety/",
  "https://dinopeng.com/ccp-stability-spending/",
  'title: "運動X科技預算小幫手"',
  'title: "為什麼小黨可以攪動社群言論？"',
  'title: "台灣食安管理流程與權責分工"',
  "https://www.googletagmanager.com/gtag/js?id=G-RLCNPY896C",
  'gtag("config", "G-RLCNPY896C")',
];

for (const text of requiredHomepageText) {
  if (!html.includes(text)) {
    throw new Error(`index.html 缺少主頁必要內容：${text}`);
  }
}

const trackingIdOccurrences = html.match(/G-RLCNPY896C/g)?.length ?? 0;
if (trackingIdOccurrences !== 2) {
  throw new Error(
    `Google Analytics Measurement ID 應出現 2 次，目前為 ${trackingIdOccurrences} 次。`,
  );
}

await requireFile("index.html", 20_000);
await requireFile("assets/favicon.png", 1_000);
await requireFile("assets/og.png", 100_000);
for (const previewName of projectPreviewNames) {
  await requireFile(`assets/projects/${previewName}`, 20_000);
}

const trackedPreviewFiles = git(["ls-files", "--", "outputs"]);
if (trackedPreviewFiles) {
  throw new Error(`outputs/ 不應被 Git 追蹤：\n${trackedPreviewFiles}`);
}

if (stagedOnly) {
  const stagedFiles = git([
    "diff",
    "--cached",
    "--name-only",
    "--diff-filter=ACMR",
  ])
    .split("\n")
    .filter(Boolean);
  const unexpectedFiles = stagedFiles.filter(
    (file) => !homepageWorkflowFiles.includes(file),
  );

  if (unexpectedFiles.length > 0) {
    throw new Error(
      `偵測到主頁範圍外的 staged 檔案，已停止：\n${unexpectedFiles.join("\n")}`,
    );
  }
}

console.log(
  `主頁檢查通過：${homepageFiles.length} 個發布檔案、outputs/ 未追蹤${
    stagedOnly ? "、staged 範圍正確" : ""
  }。`,
);
