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

const reducedMotionImportantFiles = new Set([
  "src/styles/medical-assessment.css",
  "src/styles/personalization.css",
  "src/styles/ux-foundation.css",
]);

function isAllowedImportant(line, lines, index, rel) {
  if (!reducedMotionImportantFiles.has(rel)) return false;
  if (!/(animation(?:-[\w-]+)?|transition(?:-[\w-]+)?|scroll-behavior)\s*:/.test(line)) {
    return false;
  }

  const nearbyContext = lines
    .slice(Math.max(0, index - 12), index + 1)
    .join("\n");

  return /prefers-reduced-motion:\s*reduce|data-motion="reduce"/.test(nearbyContext);
}

function unexpectedImportantLines(content, rel) {
  return content
    .split(/\r?\n/)
    .map((line, index, lines) => ({ line, index, allowed: isAllowedImportant(line, lines, index, rel) }))
    .filter(({ line, allowed }) => line.includes("!important") && !allowed)
    .map(({ index }) => index + 1);
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

  const unexpectedImportant = unexpectedImportantLines(content, rel);
  if (unexpectedImportant.length > 0) {
    errors.push(`${rel} contains unapproved !important declaration(s) on line(s): ${unexpectedImportant.join(", ")}.`);
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

if (!warnings.length) {
  console.log("\nNo CSS structure warnings found.");
}

console.log("No blocking CSS structure errors found.");
