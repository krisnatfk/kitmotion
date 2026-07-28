import { spawn } from "node:child_process";
import { open, readFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const lockPath = path.join(projectRoot, ".kitmotion-dev.lock");
const nextBin = path.join(
  projectRoot,
  "node_modules",
  "next",
  "dist",
  "bin",
  "next",
);

function isProcessRunning(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0) return false;

  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === "EPERM";
  }
}

async function readLock() {
  try {
    return JSON.parse(await readFile(lockPath, "utf8"));
  } catch {
    return null;
  }
}

async function acquireLock() {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const handle = await open(lockPath, "wx");
      await handle.writeFile(
        `${JSON.stringify(
          {
            pid: process.pid,
            startedAt: new Date().toISOString(),
            command: "next dev --turbo",
          },
          null,
          2,
        )}\n`,
      );
      await handle.close();
      return;
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;

      const lock = await readLock();
      if (isProcessRunning(lock?.pid)) {
        throw new Error(
          `Server dev KITMOTION sudah aktif (PID ${lock.pid}). ` +
            "Hentikan terminal tersebut dengan Ctrl+C sebelum menjalankan instance baru.",
        );
      }

      await rm(lockPath, { force: true });
    }
  }

  throw new Error("Gagal memperoleh lock server dev setelah membersihkan lock lama.");
}

async function releaseLock() {
  const lock = await readLock();
  if (lock?.pid === process.pid) {
    await rm(lockPath, { force: true });
  }
}

await acquireLock();

const child = spawn(
  process.execPath,
  [nextBin, "dev", "--turbo", ...process.argv.slice(2)],
  {
    cwd: projectRoot,
    env: process.env,
    stdio: "inherit",
  },
);

let signalForwarded = false;
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    if (signalForwarded) return;
    signalForwarded = true;
    child.kill(signal);
  });
}

const exitCode = await new Promise((resolve, reject) => {
  child.once("error", reject);
  child.once("exit", (code, signal) => {
    resolve(code ?? (signal ? 1 : 0));
  });
}).finally(releaseLock);

process.exitCode = exitCode;
