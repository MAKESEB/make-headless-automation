import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadDotEnv } from "./env.mjs";
import { resolveMakeCli, runMakeCli } from "./make-cli.mjs";
import { redact, redactedJson } from "./redact.mjs";
import { findWorkflow, workflowChoices, workflows } from "./workflows.mjs";

const defaultOutDir = "out";

export async function main(argv, context = {}) {
  const cwd = context.cwd ?? process.cwd();
  const stdout = context.stdout ?? process.stdout;
  const stderr = context.stderr ?? process.stderr;
  const env = await loadDotEnv(cwd, context.env ?? process.env);
  const [command, ...rest] = argv;

  switch (command) {
    case "doctor":
      return doctor({ cwd, env, stdout, stderr });
    case "list-workflows":
      return listWorkflows({ stdout });
    case "demo":
      return demo(rest, { cwd, env, stdout, stderr });
    case "run":
      return run(rest, { cwd, env, stdout, stderr });
    case "help":
    case "-h":
    case "--help":
    case undefined:
      stdout.write(helpText());
      return command === undefined ? 1 : 0;
    default:
      stderr.write(`Unknown command: ${command}\n\n${helpText()}`);
      return 1;
  }
}

async function doctor({ env, stdout, stderr }) {
  const missing = [];
  const warnings = [];
  const cli = resolveMakeCli(env);

  if (!env.MAKE_API_KEY) {
    missing.push("MAKE_API_KEY");
  }
  if (!env.MAKE_ZONE) {
    missing.push("MAKE_ZONE");
  }
  if (!cli) {
    missing.push("make-cli or npx");
  } else if (cli.label !== "make-cli") {
    warnings.push(`make-cli binary not found; live commands will use ${cli.label}.`);
  }

  for (const workflow of workflows) {
    if (!env[workflow.scenarioEnvVar]) {
      missing.push(workflow.scenarioEnvVar);
    }
  }

  stdout.write("Make Headless Automation doctor\n");
  stdout.write(`- Make CLI: ${cli ? cli.label : "missing"}\n`);
  stdout.write(`- MAKE_ZONE: ${env.MAKE_ZONE ? "set" : "missing"}\n`);
  stdout.write(`- MAKE_API_KEY: ${env.MAKE_API_KEY ? "set" : "missing"}\n`);
  for (const workflow of workflows) {
    stdout.write(`- ${workflow.scenarioEnvVar}: ${env[workflow.scenarioEnvVar] ? "set" : "missing"}\n`);
  }

  for (const warning of warnings) {
    stderr.write(`Warning: ${warning}\n`);
  }

  if (missing.length > 0) {
    stderr.write(`Missing live configuration: ${missing.join(", ")}\n`);
    stderr.write("Fixture demos still work without live configuration.\n");
    return 1;
  }

  stdout.write("Live configuration looks ready.\n");
  return 0;
}

async function listWorkflows({ stdout }) {
  for (const workflow of workflows) {
    stdout.write(`${workflow.id}\n`);
    stdout.write(`  ${workflow.title}\n`);
    stdout.write(`  Env: ${workflow.scenarioEnvVar}\n`);
    stdout.write(`  Trigger: ${workflow.trigger}\n`);
  }
  return 0;
}

async function demo(argv, context) {
  const parsed = parseOptions(argv);
  const workflowId = parsed.positionals[0];
  const workflow = findWorkflow(workflowId);
  if (!workflow) {
    context.stderr.write(`Unknown workflow. Choose one of: ${workflowChoices()}\n`);
    return 1;
  }

  if (parsed.flags.live) {
    const scenarioId = parsed.values["scenario-id"] ?? context.env[workflow.scenarioEnvVar];
    if (!scenarioId) {
      context.stderr.write(
        `Live demo needs --scenario-id or ${workflow.scenarioEnvVar} in .env.\n`
      );
      return 1;
    }
    return runWorkflow(workflow, scenarioId, parsed, context);
  }

  const payload = await readJson(path.join(context.cwd, workflow.payloadFile));
  const output = await readJson(path.join(context.cwd, workflow.outputFile));
  const evidence = {
    generatedAt: new Date().toISOString(),
    mode: "fixture",
    workflow: describeWorkflow(workflow),
    input: payload,
    result: output,
    commands: [
      `headless-make demo ${workflow.id}`,
      `headless-make demo ${workflow.id} --live`
    ]
  };
  const outputPath = await writeEvidence(evidence, parsed.values.out, context.cwd, workflow.id);
  context.stdout.write(`Fixture evidence written to ${outputPath}\n`);
  context.stdout.write(`${summaryLine(workflow, output)}\n`);
  return 0;
}

async function run(argv, context) {
  const parsed = parseOptions(argv);
  const scenarioId = parsed.values["scenario-id"] ?? parsed.positionals[0];
  const workflow = findWorkflow(parsed.values.workflow);

  if (!scenarioId) {
    context.stderr.write("Run needs --scenario-id <id> or a positional scenario ID.\n");
    return 1;
  }

  if (!parsed.values.data && !parsed.values["data-file"]) {
    context.stderr.write("Run needs --data '<json>' or --data-file <path>.\n");
    return 1;
  }

  return runWorkflow(workflow, scenarioId, parsed, context);
}

async function runWorkflow(workflow, scenarioId, parsed, context) {
  const cli = resolveMakeCli(context.env);
  if (!cli) {
    context.stderr.write("Cannot find make-cli and cannot use npx. Install Make CLI or npm.\n");
    return 1;
  }

  const payload = await resolvePayload(parsed, workflow, context.cwd);
  const interfaceResult = await runMakeCli(cli, ["scenarios", "interface", scenarioId], context);
  if (interfaceResult.status !== 0) {
    context.stderr.write(`Could not inspect scenario interface.\n${interfaceResult.stderr}`);
    return 1;
  }

  const scenarioInterface = parseJsonOutput(interfaceResult.stdout);
  const validation = validatePayloadAgainstInterface(payload, scenarioInterface);
  if (validation.errors.length > 0) {
    context.stderr.write(`Scenario input validation failed: ${validation.errors.join("; ")}\n`);
    return 1;
  }

  const runResult = await runMakeCli(
    cli,
    ["scenarios", "run", scenarioId, "--data", JSON.stringify(payload), "--responsive"],
    context
  );
  if (runResult.status !== 0) {
    context.stderr.write(`Scenario run failed.\n${runResult.stderr}`);
    return 1;
  }

  const parsedRunOutput = parseJsonOutput(runResult.stdout);
  const workflowDescriptor = workflow ? describeWorkflow(workflow) : { id: "custom", title: "Custom" };
  const evidence = {
    generatedAt: new Date().toISOString(),
    mode: "live",
    workflow: workflowDescriptor,
    scenarioId,
    input: payload,
    interfaceValidation: validation,
    result: parsedRunOutput,
    commands: [interfaceResult.commandText, runResult.commandText]
  };
  const outputPath = await writeEvidence(
    evidence,
    parsed.values.out,
    context.cwd,
    workflow?.id ?? `scenario-${scenarioId}`
  );

  context.stdout.write(`Live evidence written to ${outputPath}\n`);
  if (validation.warnings.length > 0) {
    context.stderr.write(`Warnings: ${validation.warnings.join("; ")}\n`);
  }
  return 0;
}

async function resolvePayload(parsed, workflow, cwd) {
  if (parsed.values.data) {
    return parseJson(parsed.values.data, "--data");
  }

  if (parsed.values["data-file"]) {
    return readJson(path.resolve(cwd, parsed.values["data-file"]));
  }

  if (workflow) {
    return readJson(path.join(cwd, workflow.payloadFile));
  }

  throw new Error("No payload source found.");
}

function validatePayloadAgainstInterface(payload, scenarioInterface) {
  const inputSpec = scenarioInterface?.interface?.input;
  const warnings = [];
  const errors = [];

  if (!Array.isArray(inputSpec) || inputSpec.length === 0) {
    warnings.push("scenario interface has no declared inputs");
    return { ok: true, warnings, errors, requiredInputs: [], providedInputs: Object.keys(payload) };
  }

  const provided = new Set(Object.keys(payload));
  const required = inputSpec.filter((input) => input.required).map((input) => input.name);
  const declared = new Set(inputSpec.map((input) => input.name));

  for (const inputName of required) {
    if (!provided.has(inputName)) {
      errors.push(`missing required input '${inputName}'`);
    }
  }

  const unknownInputs = [...provided].filter((inputName) => !declared.has(inputName));
  if (unknownInputs.length > 0) {
    warnings.push(`payload includes inputs not declared by scenario interface: ${unknownInputs.join(", ")}`);
  }

  return {
    ok: errors.length === 0,
    warnings,
    errors,
    requiredInputs: required,
    providedInputs: [...provided]
  };
}

function describeWorkflow(workflow) {
  return {
    id: workflow.id,
    title: workflow.title,
    scenarioEnvVar: workflow.scenarioEnvVar,
    trigger: workflow.trigger,
    inputKeys: workflow.inputKeys,
    outputKeys: workflow.outputKeys,
    approvedWrites: workflow.approvedWrites
  };
}

function summaryLine(workflow, output) {
  const primary = workflow.outputKeys
    .filter((key) => Object.hasOwn(output, key))
    .slice(0, 3)
    .map((key) => `${key}=${output[key]}`)
    .join(", ");
  return primary ? `${workflow.title}: ${primary}` : workflow.title;
}

async function writeEvidence(evidence, outDir, cwd, name) {
  const targetDir = path.resolve(cwd, outDir ?? defaultOutDir);
  await mkdir(targetDir, { recursive: true });
  const outputPath = path.join(targetDir, `${name}.evidence.json`);
  await writeFile(outputPath, redactedJson(evidence), "utf8");
  return path.relative(cwd, outputPath);
}

async function readJson(filePath) {
  return parseJson(await readFile(filePath, "utf8"), filePath);
}

function parseJson(raw, label) {
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Could not parse JSON from ${label}: ${error.message}`);
  }
}

function parseJsonOutput(stdout) {
  const trimmed = stdout.trim();
  if (!trimmed) {
    return {};
  }
  return parseJson(trimmed, "make-cli output");
}

function parseOptions(argv) {
  const flags = {};
  const values = {};
  const positionals = [];

  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith("--")) {
      positionals.push(item);
      continue;
    }

    const withoutPrefix = item.slice(2);
    const equalsIndex = withoutPrefix.indexOf("=");
    if (equalsIndex !== -1) {
      values[withoutPrefix.slice(0, equalsIndex)] = withoutPrefix.slice(equalsIndex + 1);
      continue;
    }

    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      values[withoutPrefix] = next;
      index += 1;
    } else {
      flags[withoutPrefix] = true;
    }
  }

  return { flags, values, positionals };
}

function helpText() {
  return `Make Headless Automation

Usage:
  headless-make doctor
  headless-make list-workflows
  headless-make demo <workflow> [--live] [--out <dir>]
  headless-make run <scenario-id> --data '<json>' [--workflow <workflow>] [--out <dir>]
  headless-make run --scenario-id <id> --data-file <path> [--workflow <workflow>]

Workflows:
  ${workflowChoices()}

Examples:
  headless-make demo deal-desk-approval
  headless-make demo deal-desk-approval --live
  headless-make run 925 --workflow deal-desk-approval --data-file examples/payloads/deal-desk-approval.json
`;
}

export const internals = {
  parseOptions,
  validatePayloadAgainstInterface,
  redact
};
