export const projectPreviewNames = [
  "tptrees.png",
  "aidata.png",
  "sporttech.png",
  "small-parties.png",
  "taiwan-food-safety.png",
  "ccp-stability-spending.png",
];

export const homepageFiles = [
  "index.html",
  "assets/favicon.png",
  "assets/og.png",
  ...projectPreviewNames.map((name) => `assets/projects/${name}`),
];

export const homepageWorkflowFiles = [
  ...homepageFiles,
  ".gitignore",
  "HOMEPAGE_WORKFLOW.md",
  "package.json",
  "scripts/homepage-check.mjs",
  "scripts/homepage-config.mjs",
  "scripts/homepage-sync.mjs",
  "scripts/homepage-update.mjs",
  "tests/aidata_route_test.mjs",
];
