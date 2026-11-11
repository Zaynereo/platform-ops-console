#!/usr/bin/env node
/**
 * CI audit gate: fail if npm audit reports critical or high in any OR production tree.
 * Moderate findings may remain (documented in docs/SECURITY-AUDIT.md).
 */
import { execSync } from "node:child_process";

function runAudit(omitDev) {
  const flag = omitDev ? "--omit=dev" : "";
  try {
    const raw = execSync(`npm audit ${flag} --json`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return JSON.parse(raw);
  } catch (err) {
    const stdout = err.stdout?.toString();
    if (!stdout) throw err;
    return JSON.parse(stdout);
  }
}

function summarize(label, audit) {
  const v = audit.metadata.vulnerabilities;
  console.log(
    `[audit:${label}] total=${v.total} critical=${v.critical} high=${v.high} moderate=${v.moderate} low=${v.low}`
  );
  return v;
}

const all = runAudit(false);
const prod = runAudit(true);
const allV = summarize("all", all);
const prodV = summarize("production", prod);

let failed = false;

if (prodV.critical > 0 || prodV.high > 0) {
  console.error("Failing: production tree has critical/high advisories.");
  failed = true;
}

if (allV.critical > 0 || allV.high > 0) {
  console.error("Failing: full dependency tree has critical/high advisories.");
  failed = true;
}

if (allV.moderate > 0) {
  console.warn(`Note: ${allV.moderate} moderate advisories remain — see docs/SECURITY-AUDIT.md.`);
}

process.exit(failed ? 1 : 0);
