#!/usr/bin/env node

import { main } from "../src/cli.mjs";

try {
  const code = await main(process.argv.slice(2), {
    cwd: process.cwd(),
    env: process.env,
    stdout: process.stdout,
    stderr: process.stderr
  });
  process.exitCode = code;
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
