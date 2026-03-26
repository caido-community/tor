import { type ChildProcess, spawn } from "child_process";
import { mkdir, stat, writeFile } from "fs/promises";
import path from "path";

import { getDataPath } from "./binary";
import type { CaidoBackendSDK, TorState, TorStatus } from "./types";

let torProcess: ChildProcess | undefined;
let currentState: TorState = "idle";
let currentError: string | undefined;

function createStatus(
  sdk: CaidoBackendSDK,
  state: TorState,
  extra: Partial<TorStatus> = {},
): TorStatus {
  currentState = state;
  currentError = extra.error;

  const status: TorStatus = {
    state,
    version: extra.version,
    updateAvailable: extra.updateAvailable ?? false,
    latestVersion: extra.latestVersion,
    error: extra.error,
  };

  sdk.api.send("status-changed", status);
  return status;
}

export function getCurrentState(): TorState {
  return currentState;
}

export function getCurrentStatus(extra: Partial<TorStatus> = {}): TorStatus {
  return {
    state: currentState,
    version: extra.version,
    updateAvailable: extra.updateAvailable ?? false,
    latestVersion: extra.latestVersion,
    error: currentError,
  };
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function generateTorrc(
  sdk: CaidoBackendSDK,
  port: number,
): Promise<string> {
  const dataDir = getDataPath(sdk);
  if ((await pathExists(dataDir)) === false) {
    await mkdir(dataDir, { recursive: true });
  }

  const torrcPath = path.join(sdk.meta.path(), "torrc");
  const content = `SocksPort ${port}
DataDirectory ${dataDir}
`;

  await writeFile(torrcPath, content);
  return torrcPath;
}

export async function startTor(
  sdk: CaidoBackendSDK,
  binaryPath: string,
  port: number,
  version: string | undefined,
): Promise<TorStatus> {
  if (torProcess !== undefined) {
    return createStatus(sdk, "running", { version });
  }

  if ((await pathExists(binaryPath)) === false) {
    return createStatus(sdk, "error", {
      version,
      error: "Tor binary not found",
    });
  }

  createStatus(sdk, "starting", { version });

  const torrcPath = await generateTorrc(sdk, port);

  return new Promise((resolve) => {
    torProcess = spawn(binaryPath, ["-f", torrcPath], {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let hasResolved = false;

    const resolveOnce = (status: TorStatus) => {
      if (hasResolved === false) {
        hasResolved = true;
        resolve(status);
      }
    };

    torProcess.stdout?.on("data", (data) => {
      const output = String(data);
      sdk.console.log(`[Tor] ${output}`);

      if (output.includes("Bootstrapped 100%") === true) {
        const status = createStatus(sdk, "running", { version });
        resolveOnce(status);
      }
    });

    torProcess.stderr?.on("data", (data) => {
      const output = String(data);
      sdk.console.error(`[Tor Error] ${output}`);
    });

    torProcess.on("error", (err) => {
      sdk.console.error(`[Tor Process Error] ${err.message}`);
      torProcess = undefined;
      const status = createStatus(sdk, "error", {
        version,
        error: err.message,
      });
      resolveOnce(status);
    });

    torProcess.on("close", (code) => {
      sdk.console.log(`[Tor] Process exited with code ${code}`);
      torProcess = undefined;

      if (currentState !== "stopping") {
        const status = createStatus(sdk, "idle", { version });
        resolveOnce(status);
      }
    });

    setTimeout(() => {
      if (hasResolved === false && currentState === "starting") {
        const status = createStatus(sdk, "running", { version });
        resolveOnce(status);
      }
    }, 30000);
  });
}

export async function stopTor(
  sdk: CaidoBackendSDK,
  version: string | undefined,
): Promise<TorStatus> {
  if (torProcess === undefined) {
    return createStatus(sdk, "idle", { version });
  }

  createStatus(sdk, "stopping", { version });

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      if (torProcess !== undefined) {
        torProcess.kill("SIGKILL");
      }
    }, 5000);

    torProcess?.on("close", () => {
      clearTimeout(timeout);
      torProcess = undefined;
      resolve(createStatus(sdk, "idle", { version }));
    });

    torProcess?.kill("SIGTERM");
  });
}

export async function reloadTor(
  sdk: CaidoBackendSDK,
  binaryPath: string,
  port: number,
  version: string | undefined,
): Promise<TorStatus> {
  await stopTor(sdk, version);
  return startTor(sdk, binaryPath, port, version);
}
