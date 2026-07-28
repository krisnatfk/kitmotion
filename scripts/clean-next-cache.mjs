import { readFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const lockPath = path.join(projectRoot, ".kitmotion-dev.lock");
const cleanAll = process.argv.includes("--all");
const targets = [
  ".next-dev",
  ".next-dev-turbo",
  ".next-dev-webpack",
  ...(cleanAll ? [".next"] : []),
];

function isProcessRunning(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0) return false;

  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === "EPERM";
  }
}

let lock = null;
try {
  lock = JSON.parse(await readFile(lockPath, "utf8"));
} catch {
  // A missing or malformed lock is stale and safe to replace.
}

if (isProcessRunning(lock?.pid)) {
  throw new Error(
    `Server dev KITMOTION masih aktif (PID ${lock.pid}). ` +
      "Hentikan dengan Ctrl+C sebelum membersihkan cache.",
  );
}

await rm(lockPath, { force: true });

for (const target of targets) {
  const targetPath = path.resolve(projectRoot, target);
  if (path.dirname(targetPath) !== path.resolve(projectRoot)) {
    throw new Error(`Menolak membersihkan path di luar root proyek: ${targetPath}`);
  }

  await rm(targetPath, { recursive: true, force: true });
  console.log(`Cache dibersihkan: ${target}`);
}
