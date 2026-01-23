<script setup lang="ts">
import { storeToRefs } from "pinia";
import Button from "primevue/button";
import { computed } from "vue";

import { useTorStore } from "@/stores";
import type { TorStatus } from "@/types";

const props = defineProps<{
  status: TorStatus;
}>();

const torStore = useTorStore();
const { isLoading } = storeToRefs(torStore);

const isRunning = computed(() => props.status.state === "running");
const isStarting = computed(() => props.status.state === "starting");
const isStopping = computed(() => props.status.state === "stopping");

const statusText = computed(() => {
  switch (props.status.state) {
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
  switch (props.status.state) {
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

async function handleUpdate() {
  await torStore.update();
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

      <div v-if="status.version !== undefined" class="flex items-center gap-2">
        <span class="text-surface-400">Version:</span>
        <span class="text-surface-300">{{ status.version }}</span>
      </div>

      <div v-if="status.error !== undefined" class="text-xs text-red-400">
        {{ status.error }}
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

      <Button
        v-if="status.updateAvailable"
        :label="`Update to ${status.latestVersion}`"
        icon="fas fa-circle-up"
        size="small"
        severity="info"
        :loading="isLoading"
        @click="handleUpdate"
      />
    </div>
  </div>
</template>
