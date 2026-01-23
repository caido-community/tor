import { defineStore } from "pinia";
import { ref } from "vue";

import type { FrontendSDK, TestConnectionResult, TorStatus } from "@/types";

export const useTorStore = defineStore("tor", () => {
  const sdk = ref<FrontendSDK | undefined>(undefined);
  const status = ref<TorStatus>({
    state: "idle",
    version: undefined,
    updateAvailable: false,
    latestVersion: undefined,
    error: undefined,
  });
  const testResult = ref<TestConnectionResult | undefined>(undefined);
  const isLoading = ref(false);
  const isTestingConnection = ref(false);

  function initialize(frontendSdk: FrontendSDK) {
    sdk.value = frontendSdk;
    frontendSdk.backend.onEvent("status-changed", (newStatus: TorStatus) => {
      status.value = newStatus;
    });
    fetchStatus();
  }

  async function fetchStatus() {
    if (sdk.value === undefined) return;

    isLoading.value = true;
    const result = await sdk.value.backend.getStatus();
    status.value = result;
    isLoading.value = false;
  }

  async function start() {
    if (sdk.value === undefined) return;

    isLoading.value = true;
    const result = await sdk.value.backend.startProxy();
    if (result.kind === "Ok") {
      status.value = result.value;
    } else {
      sdk.value.window.showToast(result.error, { variant: "error" });
    }
    isLoading.value = false;
  }

  async function stop() {
    if (sdk.value === undefined) return;

    isLoading.value = true;
    const result = await sdk.value.backend.stopProxy();
    if (result.kind === "Ok") {
      status.value = result.value;
    } else {
      sdk.value.window.showToast(result.error, { variant: "error" });
    }
    isLoading.value = false;
  }

  async function reload() {
    if (sdk.value === undefined) return;

    isLoading.value = true;
    const result = await sdk.value.backend.reloadProxy();
    if (result.kind === "Ok") {
      status.value = result.value;
    } else {
      sdk.value.window.showToast(result.error, { variant: "error" });
    }
    isLoading.value = false;
  }

  async function testConnection() {
    if (sdk.value === undefined) return;

    isTestingConnection.value = true;
    testResult.value = undefined;
    const result = await sdk.value.backend.testConnection();
    if (result.kind === "Ok") {
      testResult.value = result.value;
      if (result.value.isTor) {
        sdk.value.window.showToast("Connected through Tor!", {
          variant: "success",
        });
      } else {
        sdk.value.window.showToast("Not connected through Tor", {
          variant: "warning",
        });
      }
    } else {
      sdk.value.window.showToast(result.error, { variant: "error" });
    }
    isTestingConnection.value = false;
  }

  return {
    status,
    testResult,
    isLoading,
    isTestingConnection,
    initialize,
    fetchStatus,
    start,
    stop,
    reload,
    testConnection,
  };
});
