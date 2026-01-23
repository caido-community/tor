import { defineStore } from "pinia";
import { ref, watch } from "vue";

import type { FrontendSDK, TorSettings } from "@/types";

const DEFAULT_SETTINGS: TorSettings = {
  autoStart: false,
  autoCheckUpdates: true,
  port: 9050,
  installedVersion: undefined,
  binaryPath: undefined,
  upstreamProxyId: undefined,
  includeHosts: ["check.torproject.org"],
  excludeHosts: [],
  pluginPath: "",
};

export const useSettingsStore = defineStore("settings", () => {
  const sdk = ref<FrontendSDK | undefined>(undefined);
  const settings = ref<TorSettings>({ ...DEFAULT_SETTINGS });
  const isLoading = ref(false);
  const isDownloading = ref(false);
  const isUpdating = ref(false);
  const isSaving = ref(false);

  let saveTimeout: ReturnType<typeof setTimeout> | undefined;

  function initialize(frontendSdk: FrontendSDK) {
    sdk.value = frontendSdk;
    load();
  }

  async function load() {
    if (sdk.value === undefined) return;

    isLoading.value = true;
    const result = await sdk.value.backend.getSettings();
    settings.value = result;
    isLoading.value = false;

    watch(
      () => ({
        autoStart: settings.value.autoStart,
        autoCheckUpdates: settings.value.autoCheckUpdates,
        port: settings.value.port,
      }),
      () => {
        debouncedSave();
      },
      { deep: true },
    );
  }

  function debouncedSave() {
    if (saveTimeout !== undefined) {
      clearTimeout(saveTimeout);
    }
    saveTimeout = setTimeout(() => {
      save();
    }, 500);
  }

  async function save() {
    if (sdk.value === undefined) return;

    isSaving.value = true;
    const result = await sdk.value.backend.updateSettings({
      autoStart: settings.value.autoStart,
      autoCheckUpdates: settings.value.autoCheckUpdates,
      port: settings.value.port,
    });
    if (result.kind === "Ok") {
      settings.value = result.value;
    }
    isSaving.value = false;
  }

  async function download() {
    if (sdk.value === undefined) return;

    isDownloading.value = true;
    const result = await sdk.value.backend.downloadBinary();
    if (result.kind === "Ok") {
      settings.value = result.value;
      sdk.value.window.showToast("Tor downloaded successfully!", {
        variant: "success",
      });
    } else {
      sdk.value.window.showToast(result.error, { variant: "error" });
    }
    isDownloading.value = false;
  }

  async function update() {
    if (sdk.value === undefined) return;

    isUpdating.value = true;
    const result = await sdk.value.backend.updateBinary();
    if (result.kind === "Ok") {
      settings.value = result.value;
      sdk.value.window.showToast("Tor updated successfully!", {
        variant: "success",
      });
    } else {
      sdk.value.window.showToast(result.error, { variant: "error" });
    }
    isUpdating.value = false;
  }

  async function updateUpstreamScope(
    includeHosts: string[],
    excludeHosts: string[],
  ) {
    if (sdk.value === undefined) return;

    const result = await sdk.value.backend.updateUpstreamScope(
      includeHosts,
      excludeHosts,
    );
    if (result.kind === "Ok") {
      settings.value = result.value;
      sdk.value.window.showToast("Upstream scope updated!", {
        variant: "success",
      });
    } else {
      sdk.value.window.showToast(result.error, { variant: "error" });
    }
  }

  return {
    settings,
    isLoading,
    isDownloading,
    isUpdating,
    isSaving,
    initialize,
    load,
    save,
    download,
    update,
    updateUpstreamScope,
  };
});
