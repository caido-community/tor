import { mkdir, readFile, stat, writeFile } from "fs/promises";
import path from "path";

import type { CaidoBackendSDK, TorSettings } from "./types";

const SETTINGS_FILE = "settings.json";

type StoredSettings = Omit<TorSettings, "pluginPath">;

const DEFAULT_SETTINGS: StoredSettings = {
  autoStart: false,
  autoCheckUpdates: true,
  port: 9050,
  installedVersion: undefined,
  binaryPath: undefined,
  upstreamProxyId: undefined,
  includeHosts: ["check.torproject.org"],
  excludeHosts: [],
};

export function getSettingsPath(sdk: CaidoBackendSDK): string {
  return path.join(sdk.meta.path(), SETTINGS_FILE);
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function loadSettings(sdk: CaidoBackendSDK): Promise<TorSettings> {
  const settingsPath = getSettingsPath(sdk);
  const pluginPath = sdk.meta.path();

  if ((await pathExists(settingsPath)) === false) {
    return { ...DEFAULT_SETTINGS, pluginPath };
  }

  const content = await readFile(settingsPath, "utf-8");
  const parsed = JSON.parse(content) as Partial<StoredSettings>;

  return {
    ...DEFAULT_SETTINGS,
    ...parsed,
    includeHosts: parsed.includeHosts ?? DEFAULT_SETTINGS.includeHosts,
    excludeHosts: parsed.excludeHosts ?? DEFAULT_SETTINGS.excludeHosts,
    pluginPath,
  };
}

export async function saveSettings(
  sdk: CaidoBackendSDK,
  settings: TorSettings,
): Promise<void> {
  const settingsPath = getSettingsPath(sdk);
  const dir = path.dirname(settingsPath);

  if ((await pathExists(dir)) === false) {
    await mkdir(dir, { recursive: true });
  }

  const { pluginPath: _, ...storedSettings } = settings;
  const content = JSON.stringify(storedSettings, null, 2);
  await writeFile(settingsPath, content);
}
