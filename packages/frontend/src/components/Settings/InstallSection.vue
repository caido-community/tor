<script setup lang="ts">
import { storeToRefs } from "pinia";
import Button from "primevue/button";
import { computed } from "vue";

import { useSDK } from "@/plugins/sdk";
import { useSettingsStore } from "@/stores";
import type { TorSettings, TorStatus } from "@/types";

const props = defineProps<{
  settings: TorSettings;
  torStatus: TorStatus;
}>();

const sdk = useSDK();
const settingsStore = useSettingsStore();
const { isDownloading, isUpdating } = storeToRefs(settingsStore);

const isInstalled = computed(() => props.settings.binaryPath !== undefined);
const platformName = computed(() => {
  const platform = navigator.platform.toLowerCase();
  if (platform.includes("mac")) return "macOS";
  if (platform.includes("win")) return "Windows";
  if (platform.includes("linux")) return "Linux";
  return "Unknown";
});

const canUpdate = computed(() => {
  return (
    props.torStatus.updateAvailable &&
    props.torStatus.latestVersion !== undefined &&
    props.settings.installedVersion !== props.torStatus.latestVersion
  );
});

const relativePath = computed(() => {
  const binaryPath = props.settings.binaryPath;
  if (binaryPath === undefined) return undefined;
  const basePath = props.settings.pluginPath;
  if (binaryPath.startsWith(basePath)) {
    return `${binaryPath.slice(basePath.length)}`;
  }
  return binaryPath;
});

async function handleDownload() {
  await settingsStore.download();
}

async function handleUpdate() {
  await settingsStore.update();
}

async function handleCopyPath() {
  const fullPath = props.settings.binaryPath;
  if (fullPath === undefined) return;
  await navigator.clipboard.writeText(fullPath);
  sdk.window.showToast("Path copied to clipboard", { variant: "success" });
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="text-lg font-semibold">Installation</div>

    <div v-if="isInstalled" class="flex flex-col gap-2">
      <div class="flex items-center gap-2">
        <i class="fas fa-check-circle text-green-500" />
        <span class="text-surface-300">Tor is installed</span>
      </div>
      <div class="text-xs text-surface-400">
        <div>Version: {{ settings.installedVersion ?? "Unknown" }}</div>
        <div v-if="canUpdate">
          Latest version: {{ torStatus.latestVersion }}
        </div>
        <div class="flex items-center gap-1">
          <span class="truncate" :title="settings.binaryPath">
            Path: {{ relativePath }}
          </span>
          <Button
            icon="fas fa-copy"
            severity="contrast"
            text
            size="small"
            title="Copy full path"
            @click="handleCopyPath"
          />
        </div>
      </div>
      <Button
        v-if="canUpdate"
        label="Update Tor"
        icon="fas fa-arrow-up"
        :loading="isUpdating"
        @click="handleUpdate"
      />
    </div>

    <div v-else class="flex flex-col gap-3">
      <div class="flex items-center gap-2">
        <i class="fas fa-times-circle text-red-500" />
        <span class="text-surface-300">Tor is not installed</span>
      </div>
      <Button
        :label="`Download Tor for ${platformName}`"
        icon="fas fa-download"
        :loading="isDownloading"
        @click="handleDownload"
      />
    </div>
  </div>
</template>
