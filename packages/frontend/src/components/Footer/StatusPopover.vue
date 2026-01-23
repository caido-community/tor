<script setup lang="ts">
import { storeToRefs } from "pinia";
import Button from "primevue/button";
import { computed } from "vue";

import { useTorStore } from "@/stores";
import type { TorStatus } from "@/types";

const props = defineProps<{
  torStatus: TorStatus;
}>();

const torStore = useTorStore();
const { isLoading } = storeToRefs(torStore);

const isRunning = computed(() => props.torStatus.state === "running");
const isStarting = computed(() => props.torStatus.state === "starting");
const isStopping = computed(() => props.torStatus.state === "stopping");

const statusText = computed(() => {
  switch (props.torStatus.state) {
    case "running":
      return "Running";
    case "starting":
      return "Starting...";
    case "stopping":
      return "Stopping...";
    case "error":
      return "Error";
    default:
      return "Stopped";
  }
});

const statusColor = computed(() => {
  switch (props.torStatus.state) {
    case "running":
      return "text-green-500";
    case "starting":
    case "stopping":
      return "text-yellow-500";
    case "error":
      return "text-red-500";
    default:
      return "text-surface-400";
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
        <span class="text-surface-400">Status:</span>
        <span :class="statusColor">{{ statusText }}</span>
      </div>

      <div v-if="torStatus.version !== undefined" class="flex items-center gap-2">
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
      v-if="torStatus.updateAvailable && torStatus.latestVersion !== undefined"
      class="text-xs text-blue-400"
    >
      Update available: {{ torStatus.latestVersion }}
    </div>
  </div>
</template>
