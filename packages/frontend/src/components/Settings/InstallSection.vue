<script setup lang="ts">
import { storeToRefs } from "pinia";
import Button from "primevue/button";
import { computed } from "vue";

import { useSettingsStore } from "@/stores";
import type { TorSettings } from "@/types";

const props = defineProps<{
  settings: TorSettings;
}>();

const settingsStore = useSettingsStore();
const { isDownloading } = storeToRefs(settingsStore);

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
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="text-lg font-semibold">Installation</div>
    <div class="text-surface-500">Download and install the Tor binary</div>

    <div v-if="isInstalled" class="flex flex-col gap-2">
      <div class="flex items-center gap-2">
        <i class="fas fa-check-circle text-green-500" />
        <span class="text-surface-300">Tor is installed</span>
      </div>
      <div class="text-xs text-surface-400">
        <div>Version: {{ settings.installedVersion ?? "Unknown" }}</div>
        <div class="truncate" :title="settings.binaryPath">
          Path: {{ settings.binaryPath }}
        </div>
      </div>
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
