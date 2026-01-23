import { readdir } from "fs/promises";
import { default as os } from "os";
import path from "path";

import type { CaidoBackendSDK, Result } from "../types";

import { runCommand } from "./spawn";

async function findDylibs(dir: string): Promise<string[]> {
  const dylibs: string[] = [];

  async function searchDir(currentDir: string): Promise<void> {
    const entries = await readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory() === true) {
        await searchDir(fullPath);
      } else if (entry.name.endsWith(".dylib")) {
        dylibs.push(fullPath);
      }
    }
  }

  await searchDir(dir);
  return dylibs;
}

export async function signMacOSBinaries(
  sdk: CaidoBackendSDK,
  torPath: string,
  binariesPath: string,
): Promise<Result<void>> {
  if (os.platform() !== "darwin") {
    return { kind: "Ok", value: undefined };
  }

  sdk.console.log("Signing macOS binaries with ad-hoc signature...");

  const dylibs = await findDylibs(binariesPath);
  for (const dylib of dylibs) {
    sdk.console.log(`Signing dylib: ${dylib}`);
    const result = await runCommand(sdk, "codesign", [
      "--force",
      "--deep",
      "-s",
      "-",
      dylib,
    ]);
    if (result.kind === "Error") {
      return result;
    }
  }

  sdk.console.log(`Signing tor executable: ${torPath}`);
  const torResult = await runCommand(sdk, "codesign", [
    "--force",
    "--deep",
    "-s",
    "-",
    torPath,
  ]);
  if (torResult.kind === "Error") {
    return torResult;
  }

  sdk.console.log("All binaries signed successfully");
  return { kind: "Ok", value: undefined };
}
