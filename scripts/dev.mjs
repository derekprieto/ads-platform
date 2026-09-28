// Runs the web app and the worker together for local development.
import { spawn } from "node:child_process";
const procs = [
  spawn("npx", ["next", "dev"], { stdio: "inherit" }),
  spawn("npx", ["tsx", "watch", "--tsconfig", "tsconfig.json", "src/worker/main.ts"], { stdio: "inherit" }),
];
const stop = () => { for (const p of procs) p.kill("SIGTERM"); process.exit(0); };
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
for (const p of procs) p.on("exit", (code) => { if (code) stop(); });
