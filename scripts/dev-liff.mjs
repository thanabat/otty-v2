import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const webEnvLocalPath = path.join(repoRoot, "apps/web/.env.local");
const webUrl = process.env.LIFF_TARGET_URL ?? "http://localhost:3000/";

const liffId =
  process.env.LIFF_ID ??
  readEnvValue(webEnvLocalPath, "NEXT_PUBLIC_LIFF_ID");

if (!liffId) {
  console.error(
    `NEXT_PUBLIC_LIFF_ID was not found in ${webEnvLocalPath}. ` +
      "Set it in apps/web/.env.local or pass LIFF_ID=... when running dev:liff."
  );
  process.exit(1);
}

const commands = [
  ["app", ["run", "dev"]],
  ["liff", ["serve", "--liff-id", liffId, "--url", webUrl], "liff-cli"]
];

const children = commands.map(([name, args, command = "npm"]) => {
  const child = spawn(command, args, {
    cwd: repoRoot,
    stdio: "inherit",
    shell: process.platform === "win32"
  });

  child.on("exit", (code) => {
    if (code === 0) {
      return;
    }

    console.error(`[${name}] exited with code ${code ?? "unknown"}`);
    shutdown(code ?? 1);
  });

  child.on("error", (error) => {
    console.error(`[${name}] failed to start: ${error.message}`);
    shutdown(1);
  });

  return child;
});

function shutdown(exitCode) {
  for (const child of children) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }

  process.exit(exitCode);
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => shutdown(0));
}

function readEnvValue(filePath, key) {
  if (!fs.existsSync(filePath)) {
    return "";
  }

  const content = fs.readFileSync(filePath, "utf8");

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const currentKey = line.slice(0, separatorIndex).trim();

    if (currentKey !== key) {
      continue;
    }

    return line.slice(separatorIndex + 1).trim();
  }

  return "";
}
