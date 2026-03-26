import { chmod, mkdir, readdir, stat, writeFile } from "fs/promises";
import { default as os } from "os";
import path from "path";

import { fetch } from "caido:http";

import type { CaidoBackendSDK, Result, TorVersionInfo } from "../types";

import { signMacOSBinaries } from "./signature";
import { extractArchive } from "./spawn";

function getBinariesPath(sdk: CaidoBackendSDK): string {
  return path.join(sdk.meta.path(), "binaries");
}

export function getDataPath(sdk: CaidoBackendSDK): string {
  return path.join(sdk.meta.path(), "data");
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function findTorExecutable(dir: string): Promise<string | undefined> {
  const platform = os.platform();
  const torName = platform === "win32" ? "tor.exe" : "tor";

  async function searchDir(currentDir: string): Promise<string | undefined> {
    const entries = await readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory() === true) {
        if (entry.name === "debug") continue;
        const found = await searchDir(fullPath);
        if (found !== undefined) return found;
      } else if (entry.name === torName) {
        return fullPath;
      }
    }
    return undefined;
  }

  return searchDir(dir);
}

export async function downloadBinary(
  sdk: CaidoBackendSDK,
  versionInfo: TorVersionInfo,
): Promise<Result<string>> {
  const binariesPath = getBinariesPath(sdk);

  if ((await pathExists(binariesPath)) === false) {
    await mkdir(binariesPath, { recursive: true });
  }

  const url = versionInfo.binary;
  const fileName = path.basename(url);
  const downloadPath = path.join(binariesPath, fileName);

  sdk.console.log(`Downloading Tor from: ${url}`);

  const response = await fetch(url);
  if (response.ok === false) {
    return {
      kind: "Error",
      error: `Failed to download: ${response.status} ${response.statusText}`,
    };
  }

  const arrayBuffer = await response.arrayBuffer();
  await writeFile(downloadPath, arrayBuffer);

  sdk.console.log(`Downloaded to: ${downloadPath}`);

  const extractResult = await extractArchive(sdk, downloadPath, binariesPath);
  if (extractResult.kind === "Error") {
    return extractResult;
  }

  const torPath = await findTorExecutable(binariesPath);
  if (torPath === undefined) {
    return {
      kind: "Error",
      error: "Could not find tor executable after extraction",
    };
  }

  if (os.platform() !== "win32") {
    await chmod(torPath, 0o755);
  }

  const signResult = await signMacOSBinaries(sdk, torPath, binariesPath);
  if (signResult.kind === "Error") {
    return signResult;
  }

  sdk.console.log(`Tor executable found at: ${torPath}`);
  return { kind: "Ok", value: torPath };
}
