import type { DefineAPI, SDK } from "caido:plugin";
import { RequestSpec } from "caido:utils";

import {
  checkForUpdates as checkForUpdatesInternal,
  downloadBinary as downloadBinaryInternal,
  fetchLatestVersion,
} from "./binary";
import {
  getCurrentState,
  getCurrentStatus,
  reloadTor,
  startTor,
  stopTor,
} from "./process";
import { loadSettings, saveSettings as saveSettingsInternal } from "./settings";
import type {
  BackendEvents,
  Result,
  TestConnectionResult,
  TorSettings,
  TorStatus,
} from "./types";
import {
  disableUpstreamProxy,
  ensureUpstreamProxy,
  getUpstreamProxy,
} from "./upstream";

type BackendSDK = SDK<API, BackendEvents>;

async function getSettings(sdk: BackendSDK): Promise<TorSettings> {
  return loadSettings(sdk);
}

async function updateSettings(
  sdk: BackendSDK,
  settings: Partial<TorSettings>,
): Promise<Result<TorSettings>> {
  const current = await loadSettings(sdk);
  const updated = { ...current, ...settings };
  await saveSettingsInternal(sdk, updated);
  return { kind: "Ok", value: updated };
}

async function getStatus(sdk: BackendSDK): Promise<TorStatus> {
  const settings = await loadSettings(sdk);
  const updateResult = await checkForUpdatesInternal(
    sdk,
    settings.installedVersion,
  );

  return getCurrentStatus({
    version: settings.installedVersion,
    updateAvailable:
      updateResult.kind === "Ok" ? updateResult.value.updateAvailable : false,
    latestVersion:
      updateResult.kind === "Ok" ? updateResult.value.latestVersion : undefined,
  });
}

async function startProxy(sdk: BackendSDK): Promise<Result<TorStatus>> {
  const settings = await loadSettings(sdk);

  if (settings.binaryPath === undefined) {
    return { kind: "Error", error: "Tor binary not installed" };
  }

  const proxyResult = await ensureUpstreamProxy(sdk, settings);
  if (proxyResult.kind === "Error") {
    return proxyResult;
  }

  if (proxyResult.value !== settings.upstreamProxyId) {
    settings.upstreamProxyId = proxyResult.value;
    await saveSettingsInternal(sdk, settings);
  }

  const status = await startTor(
    sdk,
    settings.binaryPath,
    settings.port,
    settings.installedVersion,
  );

  return { kind: "Ok", value: status };
}

async function stopProxy(sdk: BackendSDK): Promise<Result<TorStatus>> {
  const settings = await loadSettings(sdk);

  if (settings.upstreamProxyId !== undefined) {
    await disableUpstreamProxy(sdk, settings.upstreamProxyId);
  }

  const status = await stopTor(sdk, settings.installedVersion);
  return { kind: "Ok", value: status };
}

async function reloadProxy(sdk: BackendSDK): Promise<Result<TorStatus>> {
  const settings = await loadSettings(sdk);

  if (settings.binaryPath === undefined) {
    return { kind: "Error", error: "Tor binary not installed" };
  }

  const status = await reloadTor(
    sdk,
    settings.binaryPath,
    settings.port,
    settings.installedVersion,
  );

  return { kind: "Ok", value: status };
}

async function downloadBinary(sdk: BackendSDK): Promise<Result<TorSettings>> {
  const versionResult = await fetchLatestVersion(sdk);
  if (versionResult.kind === "Error") {
    return versionResult;
  }

  const downloadResult = await downloadBinaryInternal(sdk, versionResult.value);
  if (downloadResult.kind === "Error") {
    return downloadResult;
  }

  const settings = await loadSettings(sdk);
  settings.binaryPath = downloadResult.value;
  settings.installedVersion = versionResult.value.version;
  await saveSettingsInternal(sdk, settings);

  return { kind: "Ok", value: settings };
}

async function checkForUpdates(
  sdk: BackendSDK,
): Promise<Result<{ updateAvailable: boolean; latestVersion: string }>> {
  const settings = await loadSettings(sdk);
  return checkForUpdatesInternal(sdk, settings.installedVersion);
}

async function updateBinary(sdk: BackendSDK): Promise<Result<TorSettings>> {
  await stopProxy(sdk);
  return downloadBinary(sdk);
}

async function testConnection(
  sdk: BackendSDK,
): Promise<Result<TestConnectionResult>> {
  if (getCurrentState() !== "running") {
    return { kind: "Error", error: "Tor is not running" };
  }

  try {
    const spec = new RequestSpec("https://check.torproject.org/api/ip");
    spec.setMethod("GET");

    const result = await sdk.requests.send(spec);
    const body = result.response.getBody()?.toText();

    if (body === undefined) {
      return { kind: "Error", error: "No response body" };
    }

    const data = JSON.parse(body) as { IsTor: boolean; IP: string };
    return {
      kind: "Ok",
      value: {
        isTor: data.IsTor,
        ip: data.IP,
      },
    };
  } catch {
    return {
      kind: "Error",
      error: "Failed to connect to check.torproject.org",
    };
  }
}

async function getUpstreamProxyInfo(sdk: BackendSDK): Promise<
  Result<
    | {
        id: string;
        allowlist: string[];
        denylist: string[];
        enabled: boolean;
      }
    | undefined
  >
> {
  const settings = await loadSettings(sdk);

  if (settings.upstreamProxyId === undefined) {
    return { kind: "Ok", value: undefined };
  }

  const proxy = await getUpstreamProxy(sdk, settings.upstreamProxyId);
  if (proxy === undefined) {
    return { kind: "Ok", value: undefined };
  }

  return {
    kind: "Ok",
    value: {
      id: proxy.id,
      allowlist: proxy.allowlist,
      denylist: proxy.denylist,
      enabled: proxy.enabled,
    },
  };
}

async function updateUpstreamScope(
  sdk: BackendSDK,
  includeHosts: string[],
  excludeHosts: string[],
): Promise<Result<TorSettings>> {
  const settings = await loadSettings(sdk);
  settings.includeHosts = [
    ...new Set([...includeHosts, "check.torproject.org"]),
  ];
  settings.excludeHosts = excludeHosts;
  await saveSettingsInternal(sdk, settings);

  if (settings.upstreamProxyId !== undefined) {
    await ensureUpstreamProxy(sdk, settings);
  }

  return { kind: "Ok", value: settings };
}

export type API = DefineAPI<{
  getSettings: typeof getSettings;
  updateSettings: typeof updateSettings;
  getStatus: typeof getStatus;
  startProxy: typeof startProxy;
  stopProxy: typeof stopProxy;
  reloadProxy: typeof reloadProxy;
  downloadBinary: typeof downloadBinary;
  checkForUpdates: typeof checkForUpdates;
  updateBinary: typeof updateBinary;
  testConnection: typeof testConnection;
  getUpstreamProxyInfo: typeof getUpstreamProxyInfo;
  updateUpstreamScope: typeof updateUpstreamScope;
}>;

export type { BackendEvents } from "./types";

export async function init(sdk: BackendSDK) {
  sdk.api.register("getSettings", getSettings);
  sdk.api.register("updateSettings", updateSettings);
  sdk.api.register("getStatus", getStatus);
  sdk.api.register("startProxy", startProxy);
  sdk.api.register("stopProxy", stopProxy);
  sdk.api.register("reloadProxy", reloadProxy);
  sdk.api.register("downloadBinary", downloadBinary);
  sdk.api.register("checkForUpdates", checkForUpdates);
  sdk.api.register("updateBinary", updateBinary);
  sdk.api.register("testConnection", testConnection);
  sdk.api.register("getUpstreamProxyInfo", getUpstreamProxyInfo);
  sdk.api.register("updateUpstreamScope", updateUpstreamScope);

  const settings = await loadSettings(sdk);
  if (settings.autoStart === true && settings.binaryPath !== undefined) {
    sdk.console.log("Auto-starting Tor proxy...");
    startProxy(sdk);
  }

  if (settings.autoCheckUpdates === true) {
    checkForUpdates(sdk).then((result) => {
      if (result.kind === "Ok" && result.value.updateAvailable === true) {
        sdk.console.log(`Tor update available: ${result.value.latestVersion}`);
      }
    });
  }
}
