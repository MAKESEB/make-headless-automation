import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { promisify } from "node:util";
import { redact } from "../src/redact.mjs";
import { workflows } from "../src/workflows.mjs";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = path.join(repoRoot, "bin/headless-make.mjs");

test("all fixture demos write redacted evidence without live credentials", async () => {
  for (const workflow of workflows) {
    const outDir = await mkdtemp(path.join(os.tmpdir(), `headless-make-${workflow.id}-`));
    const { stdout } = await execFileAsync(
      process.execPath,
      [cliPath, "demo", workflow.id, "--out", outDir],
      {
        cwd: repoRoot,
        env: fixtureEnv()
      }
    );

    assert.match(stdout, /Fixture evidence written/);
    const evidencePath = path.join(outDir, `${workflow.id}.evidence.json`);
    const evidence = JSON.parse(await readFile(evidencePath, "utf8"));
    assert.equal(evidence.mode, "fixture");
    assert.equal(evidence.workflow.id, workflow.id);
    assert.deepEqual(Object.keys(evidence.input).sort(), workflow.inputKeys.toSorted());
  }
});

test("doctor fails clearly when live configuration is missing", async () => {
  await assert.rejects(
    execFileAsync(process.execPath, [cliPath, "doctor"], {
      cwd: repoRoot,
      env: fixtureEnv()
    }),
    (error) => {
      assert.equal(error.code, 1);
      assert.match(error.stderr, /Missing live configuration/);
      assert.match(error.stderr, /MAKE_API_KEY/);
      assert.match(error.stderr, /MAKE_ZONE/);
      assert.match(error.stderr, /MAKE_DEAL_DESK_SCENARIO_ID/);
      return true;
    }
  );
});

test("redaction removes secrets, authorization headers, emails, UUIDs, and Make zone URLs", () => {
  const redacted = redact({
    apiKey: "mk_live_secret",
    authorization: "Token abc123",
    ownerEmail: "person@example.com",
    executionId: "9f7f7e8d-2a8e-4e91-bb31-0ca497f3d1d9",
    link: "https://eu2.make.com/api/v2/scenarios/123/run"
  });

  assert.equal(redacted.apiKey, "[REDACTED]");
  assert.equal(redacted.authorization, "[REDACTED]");
  assert.equal(redacted.ownerEmail, "[redacted-email]");
  assert.equal(redacted.executionId, "[redacted-id]");
  assert.equal(redacted.link, "https://[make-zone]/api/v2/scenarios/123/run");
});

test("public docs stay English-only and avoid competitor SDK framing", async () => {
  const publicDocs = [
    "README.md",
    "docs/talk.md",
    "package.json"
  ];
  const forbiddenFraming = /\b(?:talk package|Talk package|Zapier|zapier|zapier-sdk|@zapier|Kernthese|fuer|Szenario|Ausfuehrung|zurueck|nicht|oder|waehrend)\b/;

  for (const relativePath of publicDocs) {
    const content = await readFile(path.join(repoRoot, relativePath), "utf8");
    assert.doesNotMatch(content, forbiddenFraming, relativePath);
  }

  await assert.rejects(
    readFile(path.join(repoRoot, "docs/talk-de.md"), "utf8"),
    { code: "ENOENT" }
  );
});

test("README embeds the core visual story", async () => {
  const readme = await readFile(path.join(repoRoot, "README.md"), "utf8");

  assert.match(readme, /!\[Enterprise automation layer\]\(docs\/diagrams\/enterprise-automation-layer\.jpg\)/);
  assert.match(readme, /!\[One contract, many interfaces\]\(docs\/diagrams\/one-contract-many-interfaces\.jpg\)/);
  assert.match(readme, /!\[Safety model\]\(docs\/diagrams\/safety-model\.jpg\)/);
  assert.match(readme, /!\[API shell pattern\]\(docs\/diagrams\/api-shell-pattern\.jpg\)/);
});

function fixtureEnv() {
  return {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    USERPROFILE: process.env.USERPROFILE,
    npm_config_cache: process.env.npm_config_cache
  };
}
