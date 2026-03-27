import { spawn } from "node:child_process";

const commands = [
  ["api", ["run", "dev", "--workspace", "@otty/api"]],
  ["web", ["run", "dev", "--workspace", "@otty/web"]]
];

const children = commands.map(([name, args]) => {
  const child = spawn("npm", args, {
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
