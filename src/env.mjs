import { readFile } from "node:fs/promises";
import path from "node:path";

export async function loadDotEnv(cwd, baseEnv = process.env) {
  const merged = { ...baseEnv };
  const envPath = path.join(cwd, ".env");

  let content;
  try {
    content = await readFile(envPath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      return merged;
    }
    throw error;
  }

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key && merged[key] === undefined) {
      merged[key] = value;
    }
  }

  return merged;
}
