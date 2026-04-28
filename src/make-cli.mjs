import { spawn, spawnSync } from "node:child_process";

export function resolveMakeCli(env = process.env) {
  if (env.MAKE_CLI_BIN) {
    return { command: env.MAKE_CLI_BIN, prefix: [], label: env.MAKE_CLI_BIN };
  }

  if (commandWorks("make-cli", ["--version"])) {
    return { command: "make-cli", prefix: [], label: "make-cli" };
  }

  if (commandWorks("npx", ["--version"])) {
    return {
      command: "npx",
      prefix: ["--yes", "@makehq/cli"],
      label: "npx --yes @makehq/cli"
    };
  }

  return undefined;
}

export function makeCliArgs(cli, args) {
  return [...cli.prefix, "--output", "json", ...args];
}

export function commandWorks(command, args) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: "ignore"
  });
  return result.status === 0;
}

export async function runMakeCli(cli, args, options = {}) {
  const fullArgs = makeCliArgs(cli, args);
  const result = await runCommand(cli.command, fullArgs, options);
  return {
    ...result,
    commandText: [cli.label, "--output", "json", ...args].join(" ")
  };
}

export async function runCommand(command, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      shell: false
    });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      resolve({ status: 1, stdout, stderr: error.message });
    });
    child.on("close", (status) => {
      resolve({ status, stdout, stderr });
    });
  });
}
