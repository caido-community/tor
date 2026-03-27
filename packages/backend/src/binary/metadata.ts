import { default as os } from "os";

import { fetch } from "caido:http";

import type { CaidoBackendSDK, Result, TorVersionInfo } from "../types";

const METADATA_BASE_URL =
  "https://aus1.torproject.org/torbrowser/update_3/release";
const METADATA_ALPHA_BASE_URL =
  "https://aus1.torproject.org/torbrowser/update_3/alpha";
const ARCHIVE_BASE_URL =
  "https://archive.torproject.org/tor-package-archive/torbrowser";

type PlatformIdentifier = {
  os: string;
  arch: string;
};

const PLATFORM_MAP = new Map<string, PlatformIdentifier>([
  ["darwin/arm64", { os: "macos", arch: "aarch64" }],
  ["darwin/x64", { os: "macos", arch: "x86_64" }],
  ["linux/arm64", { os: "linux", arch: "aarch64" }],
  ["linux/x64", { os: "linux", arch: "x86_64" }],
  ["win32/x64", { os: "windows", arch: "x86_64" }],
]);

function getPlatformIdentifier(): Result<PlatformIdentifier> {
  const key = `${os.platform()}/${os.arch()}`;
  const identifier = PLATFORM_MAP.get(key);

  if (identifier === undefined) {
    return {
      kind: "Error",
      error: `Unsupported platform: ${key}`,
    };
  }

  return { kind: "Ok", value: identifier };
}

function buildMetadataUrl(platform: PlatformIdentifier): string {
  if (platform.os === "macos") {
    return `${METADATA_BASE_URL}/download-${platform.os}.json`;
  }

  // Linux aarch64 is only available in the alpha channel.
  if (platform.os === "linux" && platform.arch === "aarch64") {
    return `${METADATA_ALPHA_BASE_URL}/download-${platform.os}-${platform.arch}.json`;
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
