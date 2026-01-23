import { spawn } from "child_process";
import { mkdir, rm } from "fs/promises";
import { default as os } from "os";
import path from "path";

import type { CaidoBackendSDK, Result } from "../types";

export function runCommand(
  sdk: CaidoBackendSDK,
  cmd: string,
  args: string[],
): Promise<Result<void>> {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });

    let stderr = "";

    proc.stderr?.on("data", (data) => {
      stderr += String(data);
    });

    proc.on("error", (err) => {
      sdk.console.error(`Command error: ${err.message}`);
      resolve({ kind: "Error", error: err.message });
    });

    proc.on("close", (code) => {
      if (code !== 0) {
        sdk.console.error(`Command failed with code ${code}: ${stderr}`);
        resolve({ kind: "Error", error: `Command failed: ${stderr}` });
        return;
      }
      resolve({ kind: "Ok", value: undefined });
    });
  });
}

export async function extractArchive(
  sdk: CaidoBackendSDK,
  archivePath: string,
  destPath: string,
): Promise<Result<void>> {
  const platform = os.platform();

  let cmd: string;
  let args: string[];

  if (archivePath.endsWith(".tar.xz") || archivePath.endsWith(".tar.gz")) {
    cmd = "tar";
    args = ["-xf", archivePath, "-C", destPath];
  } else if (archivePath.endsWith(".exe") && platform === "win32") {
    cmd = archivePath;
    args = ["/S", `/D=${destPath}`];
  } else if (archivePath.endsWith(".dmg") && platform === "darwin") {
    const mountPoint = path.join(destPath, "mount");
    await mkdir(mountPoint, { recursive: true });

    const attachResult = await runCommand(sdk, "hdiutil", [
      "attach",
      archivePath,
      "-mountpoint",
      mountPoint,
      "-nobrowse",
    ]);
    if (attachResult.kind === "Error") return attachResult;

    const copyResult = await runCommand(sdk, "cp", [
      "-R",
      `${mountPoint}/.`,
      destPath,
    ]);
    if (copyResult.kind === "Error") {
      await runCommand(sdk, "hdiutil", ["detach", mountPoint]);
      return copyResult;
    }

    await runCommand(sdk, "hdiutil", ["detach", mountPoint]);
    await rm(archivePath, { force: true });
    return { kind: "Ok", value: undefined };
  } else {
    return {
      kind: "Error",
      error: `Unsupported archive format: ${archivePath}`,
    };
  }

  sdk.console.log(`Extracting with: ${cmd} ${args.join(" ")}`);

  const result = await runCommand(sdk, cmd, args);
  if (result.kind === "Error") {
    return result;
  }

  await rm(archivePath, { force: true });
  return { kind: "Ok", value: undefined };
}
