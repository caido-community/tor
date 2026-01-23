import { mkdir, readFile, stat, writeFile } from "fs/promises";
import path from "path";

import type { CaidoBackendSDK, TorSettings } from "./types";

const SETTINGS_FILE = "settings.json";

const DEFAULT_SETTINGS: TorSettings = {
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

  if ((await pathExists(settingsPath)) === false) {
    return { ...DEFAULT_SETTINGS };
  }

  const content = await readFile(settingsPath, "utf-8");
  const parsed = JSON.parse(content) as Partial<TorSettings>;

  return {
    ...DEFAULT_SETTINGS,
    ...parsed,
    includeHosts: parsed.includeHosts ?? DEFAULT_SETTINGS.includeHosts,
    excludeHosts: parsed.excludeHosts ?? DEFAULT_SETTINGS.excludeHosts,
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

  const content = JSON.stringify(settings, null, 2);
  await writeFile(settingsPath, content);
}
