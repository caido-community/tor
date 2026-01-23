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
      return "Process is running";
    case "starting":
      return "Starting...";
    case "stopping":
      return "Stopping...";
    case "error":
      return `Error: ${props.status.error}`;
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

async function handleReload() {
  await torStore.reload();
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="text-lg font-semibold">Process Control</div>

    <div class="flex items-center gap-2">
      <i v-if="isRunning" class="fas fa-check-circle text-green-500" />
      <i v-else-if="isStarting" class="fas fa-clock text-yellow-500" />
      <i v-else class="fas fa-times-circle text-red-500" />
      <span class="text-surface-300">{{ statusText }}</span>
    </div>

    <div class="flex gap-2">
      <Button
        v-if="!isRunning"
        label="Start"
        icon="fas fa-play"
        :loading="isStarting || isLoading"
        :disabled="isLoading"
        @click="handleStart"
      />
      <Button
        v-else
        label="Stop"
        icon="fas fa-stop"
        severity="danger"
        :loading="isStopping || isLoading"
        :disabled="isLoading"
        @click="handleStop"
      />
      <Button
        label="Reload"
        icon="fas fa-sync"
        severity="secondary"
        :disabled="!isRunning || isLoading"
        @click="handleReload"
      />
    </div>
  </div>
</template>
