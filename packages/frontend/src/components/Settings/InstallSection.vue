<script setup lang="ts">
import { storeToRefs } from "pinia";
import Button from "primevue/button";
import { computed } from "vue";

import { useSettingsStore } from "@/stores";
import type { TorSettings, TorStatus } from "@/types";

const props = defineProps<{
  settings: TorSettings;
  torStatus: TorStatus;
}>();

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

async function handleDownload() {
  await settingsStore.download();
}

async function handleUpdate() {
  await settingsStore.update();
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
        <div
          v-if="
            torStatus.updateAvailable && torStatus.latestVersion !== undefined
          "
        >
          Latest version: {{ torStatus.latestVersion }}
        </div>
        <div class="truncate" :title="settings.binaryPath">
          Path: {{ settings.binaryPath }}
        </div>
      </div>
      <Button
        v-if="torStatus.updateAvailable"
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
