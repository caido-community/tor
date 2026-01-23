import { spawn } from "child_process";
import { chmod, mkdir, readdir, rm, stat, writeFile } from "fs/promises";
import { default as os } from "os";
import path from "path";

import { fetch } from "caido:http";

import type { CaidoBackendSDK, Result, TorVersionInfo } from "./types";

const METADATA_BASE_URL =
  "https://aus1.torproject.org/torbrowser/update_3/release";
const ARCHIVE_BASE_URL =
  "https://archive.torproject.org/tor-package-archive/torbrowser";

type PlatformIdentifier = {
  os: string;
  arch: string;
};

function getPlatformIdentifier(): Result<PlatformIdentifier> {
  const platform = os.platform();
  const arch = os.arch();

  if (platform === "darwin" && arch === "arm64") {
    return { kind: "Ok", value: { os: "macos", arch: "aarch64" } };
  }

  if (platform === "darwin" && arch === "x64") {
    return { kind: "Ok", value: { os: "macos", arch: "x86_64" } };
  }

  if (platform === "linux" && arch === "x64") {
    return { kind: "Ok", value: { os: "linux", arch: "x86_64" } };
  }

  if (platform === "win32" && arch === "x64") {
    return { kind: "Ok", value: { os: "windows", arch: "x86_64" } };
  }

  return {
    kind: "Error",
    error: `Unsupported platform: ${platform} ${arch}`,
  };
}

function buildMetadataUrl(platform: PlatformIdentifier): string {
  if (platform.os === "macos") {
    return `${METADATA_BASE_URL}/download-${platform.os}.json`;
  }
  return `${METADATA_BASE_URL}/download-${platform.os}-${platform.arch}.json`;
}

function buildBinaryUrl(version: string, platform: PlatformIdentifier): string {
  return `${ARCHIVE_BASE_URL}/${version}/tor-expert-bundle-${platform.os}-${platform.arch}-${version}.tar.gz`;
}

export async function fetchLatestVersion(
  sdk: CaidoBackendSDK,
): Promise<Result<TorVersionInfo>> {
  const platformResult = getPlatformIdentifier();
  if (platformResult.kind === "Error") {
    return platformResult;
  }

  const url = buildMetadataUrl(platformResult.value);
  sdk.console.log(`Fetching version info from: ${url}`);

  const response = await fetch(url);
  if (response.ok === false) {
    return {
      kind: "Error",
      error: `Failed to fetch version info: ${response.status} ${response.statusText}`,
    };
  }

  const data = (await response.json()) as { version: string };
  const binaryUrl = buildBinaryUrl(data.version, platformResult.value);

  return {
    kind: "Ok",
    value: {
      version: data.version,
      binary: binaryUrl,
    },
  };
}

export function getBinariesPath(sdk: CaidoBackendSDK): string {
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

  sdk.console.log(`Tor executable found at: ${torPath}`);
  return { kind: "Ok", value: torPath };
}

async function extractArchive(
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

function runCommand(
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

export async function checkForUpdates(
  sdk: CaidoBackendSDK,
  currentVersion: string | undefined,
): Promise<Result<{ updateAvailable: boolean; latestVersion: string }>> {
  const versionResult = await fetchLatestVersion(sdk);
  if (versionResult.kind === "Error") {
    return versionResult;
  }

  const latestVersion = versionResult.value.version;
  const updateAvailable = currentVersion !== latestVersion;

  return {
    kind: "Ok",
    value: { updateAvailable, latestVersion },
  };
}
