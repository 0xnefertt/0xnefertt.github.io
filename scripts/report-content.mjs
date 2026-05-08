#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const result = spawnSync(process.execPath, ["scripts/check-posts.mjs", "--report", "reports/content-check.md"], {
  stdio: "inherit",
  cwd: process.cwd(),
});

process.exit(result.status ?? 1);
