import { default as os } from "os";

import { fetch } from "caido:http";

import type { CaidoBackendSDK, Result, TorVersionInfo } from "../types";

const METADATA_BASE_URL =
  "https://aus1.torproject.org/torbrowser/update_3/release";
const ARCHIVE_BASE_URL =
  "https://archive.torproject.org/tor-package-archive/torbrowser";

export type PlatformIdentifier = {
  os: string;
  arch: string;
};

export function getPlatformIdentifier(): Result<PlatformIdentifier> {
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
