import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const srcDir = path.join(rootDir, "src");
const cssFiles = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (entry.isFile() && entry.name.endsWith(".css")) {
      cssFiles.push(fullPath);
    }
  }
}

function relative(filePath) {
  return path.relative(rootDir, filePath).replaceAll(path.sep, "/");
}

function countLines(content) {
  return content.split(/\r?\n/).length;
}

function selectorDepth(selector) {
  return selector
    .replace(/:where\([^)]*\)/g, "")
    .replace(/:is\([^)]*\)/g, "")
    .split(/\s+|>|\+|~/)
    .filter(Boolean)
    .length;
}

function extractSelectors(content) {
  const withoutComments = content.replace(/\/\*[\s\S]*?\*\//g, "");
  const selectors = [];
  const rulePattern = /([^{}@][^{}]*)\{/g;
  let match;

  while ((match = rulePattern.exec(withoutComments))) {
    const raw = match[1].trim();
    if (!raw || raw.includes(";")) continue;
    for (const selector of raw.split(",")) {
      selectors.push(selector.trim());
    }
  }

  return selectors;
}

walk(srcDir);

const errors = [];
const warnings = [];

const mainCssPath = path.join(srcDir, "index.css");
const mainCss = fs.existsSync(mainCssPath) ? fs.readFileSync(mainCssPath, "utf8").trim() : "";
if (mainCss !== '@import "./styles/index.css";') {
  errors.push("src/index.css should stay a compatibility shim that only imports ./styles/index.css.");
}

const mainJsPath = path.join(srcDir, "main.jsx");
const mainJs = fs.existsSync(mainJsPath) ? fs.readFileSync(mainJsPath, "utf8") : "";
if (!mainJs.includes("import './styles/index.css'")) {
  errors.push("src/main.jsx should import the canonical CSS entry at ./styles/index.css.");
}

const canonicalEntry = path.join(srcDir, "styles", "index.css");
if (!fs.existsSync(canonicalEntry)) {
  errors.push("Missing canonical CSS entry: src/styles/index.css.");
}

const globalCssPath = path.join(srcDir, "styles", "global.css");
if (fs.existsSync(globalCssPath)) {
  const globalCss = fs.readFileSync(globalCssPath, "utf8");
  if (/:root\s*\{[\s\S]*--[a-z0-9-]+:/i.test(globalCss)) {
    errors.push("src/styles/global.css must not declare design tokens in :root; keep tokens in src/styles/tokens.css.");
  }
}

for (const file of cssFiles) {
  const content = fs.readFileSync(file, "utf8");
  const rel = relative(file);
  const lines = countLines(content);

  if (lines > 1500) {
    warnings.push(`${rel} is ${lines} lines; consider splitting by feature or component boundary.`);
  }

  const importantCount = (content.match(/!important/g) ?? []).length;
  if (importantCount > 0) {
    warnings.push(`${rel} contains ${importantCount} !important declaration(s).`);
  }

  const longSelectors = extractSelectors(content)
    .filter((selector) => selectorDepth(selector) > 5)
    .slice(0, 5);

  if (longSelectors.length) {
    warnings.push(`${rel} has deep selectors, for example: ${longSelectors.join(" | ")}`);
  }
}

console.log(`CSS structure audit scanned ${cssFiles.length} CSS files.`);

if (warnings.length) {
  console.log("\nWarnings:");
  for (const warning of warnings) {
    console.log(`- ${warning}`);
  }
}

if (errors.length) {
  console.error("\nErrors:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("\nNo blocking CSS structure errors found.");
