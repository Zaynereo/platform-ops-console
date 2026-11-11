#!/usr/bin/env node
/**
 * CI audit gate: fail on critical/high in production dependency tree.
 * Dev-only findings are reported but do not fail the build (see SECURITY-AUDIT.md).
 */
import { execSync } from "node:child_process";

function runAudit(omitDev) {
  const flag = omitDev ? "--omit=dev" : "";
  const raw = execSync(`npm audit ${flag} --json`, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
  return JSON.parse(raw);
}

function summarize(label, audit) {
  const v = audit.metadata.vulnerabilities;
  console.log(
    `[audit:${label}] total=${v.total} critical=${v.critical} high=${v.high} moderate=${v.moderate} low=${v.low}`
  );
  return v;
}

let all;
let prod;
try {
  all = runAudit(false);
} catch (err) {
  const stdout = err.stdout?.toString();
  if (!stdout) {
    console.error(err.stderr?.toString() ?? err.message);
    process.exit(1);
  }
  all = JSON.parse(stdout);
}

try {
  prod = runAudit(true);
} catch (err) {
  const stdout = err.stdout?.toString();
  if (!stdout) {
    console.error(err.stderr?.toString() ?? err.message);
    process.exit(1);
  }
  prod = JSON.parse(stdout);
}

const allV = summarize("all", all);
const prodV = summarize("production", prod);

if (prodV.critical > 0) {
  console.error("Failing: production dependency tree has critical advisories.");
  process.exit(1);
}

if (prodV.high > 0) {
  console.error("Failing: production dependency tree has high advisories (see SECURITY-AUDIT.md).");
  process.exit(1);
}

if (allV.critical > 0) {
  console.warn(
    "Warning: dev/test dependency tree still has critical advisories — documented residual risk."
  );
}

process.exit(0);
