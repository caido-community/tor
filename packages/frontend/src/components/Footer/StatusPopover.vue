<script setup lang="ts">
import { storeToRefs } from "pinia";
import Button from "primevue/button";
import { computed } from "vue";

import { useSettingsStore, useTorStore } from "@/stores";
import type { TorStatus } from "@/types";

const props = defineProps<{
  torStatus: TorStatus;
}>();

const torStore = useTorStore();
const settingsStore = useSettingsStore();
const { isLoading } = storeToRefs(torStore);
const { settings } = storeToRefs(settingsStore);

const isInstalled = computed(() => settings.value.binaryPath !== undefined);

const isRunning = computed(() => props.torStatus.state === "running");
const isStarting = computed(() => props.torStatus.state === "starting");
const isStopping = computed(() => props.torStatus.state === "stopping");

const statusText = computed(() => {
  switch (props.torStatus.state) {
    case "running":
      return "Process is running";
    case "starting":
      return "Starting...";
    case "stopping":
      return "Stopping...";
    case "error":
      return `Error: ${props.torStatus.error}`;
    default:
      return "Process is not running";
  }
});

async function handleStart() {
  await torStore.start();
}

async function handleStop() {
  await torStore.stop();
}
</script>

<template>
  <div class="flex flex-col gap-3 p-2 min-w-[200px]">
    <div class="text-sm font-medium text-surface-200">Tor Proxy Status</div>

    <div class="flex flex-col gap-1 text-sm">
      <div class="flex items-center gap-2">
        <i v-if="isRunning" class="fas fa-check-circle text-green-500" />
        <i v-else-if="isStarting" class="fas fa-clock text-yellow-500" />
        <i v-else class="fas fa-times-circle text-red-500" />
        <span class="text-surface-300">{{ statusText }}</span>
      </div>

      <div
        v-if="torStatus.version !== undefined"
        class="flex items-center gap-2"
      >
        <span class="text-surface-400">Version:</span>
        <span class="text-surface-300">{{ torStatus.version }}</span>
      </div>

      <div v-if="torStatus.error !== undefined" class="text-xs text-red-400">
        {{ torStatus.error }}
      </div>
    </div>

    <div class="flex flex-col gap-2">
      <Button
        v-if="!isRunning"
        label="Start"
        icon="fas fa-play"
        size="small"
        :loading="isStarting || isLoading"
        :disabled="isLoading"
        @click="handleStart"
      />
      <Button
        v-else
        label="Stop"
        icon="fas fa-stop"
        size="small"
        severity="danger"
        :loading="isStopping || isLoading"
        :disabled="isLoading"
        @click="handleStop"
      />
    </div>

    <div
      v-if="
        isInstalled &&
        torStatus.updateAvailable &&
        torStatus.latestVersion !== undefined
      "
      class="text-xs text-blue-400"
    >
      Update available: {{ torStatus.latestVersion }}
    </div>
  </div>
</template>
